const admin = require("firebase-admin");
const { randomUUID } = require("crypto");

function loadServiceAccountFromEnv() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccountFromEnv())
  });
}

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

function assertPositiveInt(name, value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertNonNegativeInt(name, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function assertString(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

async function reserveBet(uid, roundId, amount, meta = null) {
  assertString("uid", uid);
  assertString("roundId", roundId);
  assertPositiveInt("amount", amount);

  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(roundId);
  const ledgerRef = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("User not found");

    const user = userSnap.data() || {};
    if (user.frozen) throw new Error("Account frozen");

    const roundSnap = await tx.get(roundRef);
    if (roundSnap.exists) {
      return { status: "already_exists" };
    }

    const balance = Number(user.balance || 0);
    const locked = Number(user.locked || 0);
    if (balance < amount) throw new Error("Insufficient funds");

    tx.update(userRef, {
      balance: balance - amount,
      locked: locked + amount,
      updatedAt: TS()
    });

    tx.set(roundRef, {
      amount,
      status: "reserved",
      meta,
      createdAt: TS(),
      updatedAt: TS()
    });

    tx.create(ledgerRef.doc(), {
      type: "reserve",
      amount,
      roundId,
      meta,
      ts: TS()
    });

    return { status: "reserved" };
  });
}

async function settleBet(uid, roundId, payout, meta = null) {
  assertString("uid", uid);
  assertString("roundId", roundId);
  assertNonNegativeInt("payout", payout);

  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(roundId);
  const ledgerRef = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const roundSnap = await tx.get(roundRef);

    if (!userSnap.exists || !roundSnap.exists) {
      throw new Error("Invalid state");
    }

    const user = userSnap.data() || {};
    const round = roundSnap.data() || {};

    if (round.status !== "reserved") {
      return { status: "noop" };
    }

    const balance = Number(user.balance || 0);
    const locked = Number(user.locked || 0);
    const amount = Number(round.amount || 0);
    if (locked < amount) throw new Error("Locked balance underflow");

    tx.update(userRef, {
      locked: locked - amount,
      balance: balance + payout,
      updatedAt: TS()
    });

    tx.update(roundRef, {
      status: "settled",
      payout,
      meta: meta ?? round.meta ?? null,
      updatedAt: TS()
    });

    tx.create(ledgerRef.doc(), {
      type: "settle",
      amount,
      payout,
      roundId,
      meta,
      ts: TS()
    });

    return { status: "settled" };
  });
}

async function cancelBet(uid, roundId, reason = null) {
  assertString("uid", uid);
  assertString("roundId", roundId);

  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(roundId);
  const ledgerRef = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const roundSnap = await tx.get(roundRef);

    if (!userSnap.exists || !roundSnap.exists) {
      return { status: "noop" };
    }

    const user = userSnap.data() || {};
    const round = roundSnap.data() || {};

    if (round.status !== "reserved") {
      return { status: "noop" };
    }

    const balance = Number(user.balance || 0);
    const locked = Number(user.locked || 0);
    const amount = Number(round.amount || 0);
    if (locked < amount) throw new Error("Locked balance underflow");

    tx.update(userRef, {
      locked: locked - amount,
      balance: balance + amount,
      updatedAt: TS()
    });

    tx.update(roundRef, {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: TS()
    });

    tx.create(ledgerRef.doc(), {
      type: "cancel",
      amount,
      roundId,
      reason,
      ts: TS()
    });

    return { status: "cancelled" };
  });
}

async function runExample() {
  const uid = process.env.VV_UID;
  if (!uid) {
    throw new Error("Set VV_UID to run the example flow.");
  }

  const roundId = process.env.VV_ROUND_ID || randomUUID();
  const reserveAmount = Number.parseInt(process.env.VV_RESERVE_AMOUNT || "1000", 10);
  const payout = Number.parseInt(process.env.VV_PAYOUT || "1500", 10);

  console.log("Reserving", { uid, roundId, reserveAmount });
  console.log(await reserveBet(uid, roundId, reserveAmount, { game: "slots" }));

  console.log("Settling", { uid, roundId, payout });
  console.log(await settleBet(uid, roundId, payout, { game: "slots" }));

  console.log("Done");
}

module.exports = {
  db,
  reserveBet,
  settleBet,
  cancelBet
};

if (require.main === module) {
  runExample().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
