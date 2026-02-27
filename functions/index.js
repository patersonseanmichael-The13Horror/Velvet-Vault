/* ==========================================================
   Velvet Vault — Secure Wallet (Server Authoritative)
   - Callable functions (Auth required)
   - Firestore balance as source of truth
   - Ledger entries for every move
   - Idempotent credit via payoutLocks/{uid_roundId}
   ========================================================== */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Login required.");
  }
  return request.auth.uid;
}

function nAmount(x) {
  const a = Number(x);
  if (!Number.isFinite(a) || a <= 0) return null;
  // hard limits to prevent abuse
  if (a > 1_000_000) return null;
  return Math.floor(a);
}

function safeStr(s, max = 200) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

async function ensureUserDoc(uid) {
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      {
        balance: 0,
        displayName: "",
        createdAt: TS(),
        updatedAt: TS()
      },
      { merge: true }
    );
  }
  return ref;
}

async function readBalance(uid) {
  const ref = await ensureUserDoc(uid);
  const snap = await ref.get();
  return Number(snap.data()?.balance || 0);
}

// ---- Callable: Get balance ----
exports.vvGetBalance = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const bal = await readBalance(uid);
  return { balance: bal };
});

// ---- HTTP: Get balance (CORS + Bearer token) ----
exports.vvGetBalanceHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const authHeader = String(req.headers.authorization || "");
      if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing bearer token" });
        return;
      }

      const idToken = authHeader.slice("Bearer ".length).trim();
      const decoded = await admin.auth().verifyIdToken(idToken);
      const bal = await readBalance(decoded.uid);
      res.status(200).json({ ok: true, balance: bal });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  });
});

// ---- Callable: Debit ----
exports.vvDebit = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const amount = nAmount(request.data?.amount);
  const game = safeStr(request.data?.game || "unknown", 40);
  const roundId = safeStr(request.data?.roundId || "", 80);

  if (!amount) throw new HttpsError("invalid-argument", "Invalid amount.");

  const userRef = await ensureUserDoc(uid);
  const ledgerRef = userRef.collection("ledger").doc();
  const lockKey = roundId ? `${uid}_${roundId}` : null;

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const cur = Number(userSnap.data()?.balance || 0);

    if (cur < amount) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }

    // Optional anti-replay lock for debits too (if roundId provided)
    if (lockKey) {
      const debitLockRef = db.doc(`debitLocks/${lockKey}`);
      const lockSnap = await tx.get(debitLockRef);
      if (lockSnap.exists) {
        // If user replays the same debit, do not double debit
        return;
      }
      tx.set(debitLockRef, { uid, roundId, amount, game, createdAt: TS() }, { merge: true });
    }

    tx.update(userRef, { balance: cur - amount, updatedAt: TS() });
    tx.set(ledgerRef, {
      type: "debit",
      amount,
      game,
      roundId,
      createdAt: TS()
    });
  });

  const finalSnap = await userRef.get();
  return { ok: true, balance: Number(finalSnap.data()?.balance || 0) };
});

// ---- Callable: Credit (IDEMPOTENT) ----
exports.vvCredit = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const amount = nAmount(request.data?.amount);
  const game = safeStr(request.data?.game || "unknown", 40);
  const roundId = safeStr(request.data?.roundId || "", 80);

  if (!amount) throw new HttpsError("invalid-argument", "Invalid amount.");
  if (!roundId) throw new HttpsError("invalid-argument", "roundId required for payout idempotency.");

  const userRef = await ensureUserDoc(uid);
  const ledgerRef = userRef.collection("ledger").doc();
  const lockRef = db.doc(`payoutLocks/${uid}_${roundId}`);

  let alreadyPaid = false;

  await db.runTransaction(async (tx) => {
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      alreadyPaid = true;
      return;
    }

    const userSnap = await tx.get(userRef);
    const cur = Number(userSnap.data()?.balance || 0);

    tx.set(lockRef, { uid, roundId, amount, game, createdAt: TS() }, { merge: true });
    tx.update(userRef, { balance: cur + amount, updatedAt: TS() });

    tx.set(ledgerRef, {
      type: "credit",
      amount,
      game,
      roundId,
      createdAt: TS()
    });
  });

  const finalSnap = await userRef.get();
  return { ok: true, alreadyPaid, balance: Number(finalSnap.data()?.balance || 0) };
});

// ---- Callable: Manual review request (metadata record) ----
// Upload itself happens to Storage from client (locked to uid path by rules).
exports.vvCreateManualReview = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);

  const payid = safeStr(request.data?.payid || "", 120);
  const reference = safeStr(request.data?.reference || "", 60);
  const description = safeStr(request.data?.description || "", 500);
  const filePath = safeStr(request.data?.filePath || "", 300);

  if (!filePath.startsWith(`uploads/${uid}/`)) {
    throw new HttpsError("permission-denied", "Invalid upload path.");
  }

  const ref = db.collection("manualReviews").doc();
  await ref.set({
    uid,
    payid,
    reference,
    description,
    filePath,
    status: "pending",
    createdAt: TS()
  });

  return { ok: true, id: ref.id };
});
