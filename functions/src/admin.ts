import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { assertBool, assertInt, assertString, requireAdmin } from "./utils";

type AdminCreditReq = { uid: string; amount: number; reason?: string };
type AdminDebitReq = { uid: string; amount: number; reason?: string };
type AdminSetBalanceReq = { uid: string; newBalance: number; reason?: string };
type AdminFreezeReq = { uid: string; frozen: boolean; reason?: string };
type AdminGetLedgerReq = { uid: string; limit?: number };

export const adminCredit = functions.https.onCall(async (data: AdminCreditReq, context) => {
  const actorUid = requireAdmin(context);
  assertString("uid", data?.uid);
  assertInt("amount", data?.amount, { min: 1 });

  const db = getFirestore();
  const userRef = db.doc(`users/${data.uid}`);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "user not found");
    }
    const user = snap.data() as Record<string, unknown>;
    const balance = Number(user.balance ?? 0);

    tx.update(userRef, {
      balance: balance + data.amount,
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.create(ledgerCol.doc(), {
      type: "admin_credit",
      amount: data.amount,
      actorUid,
      reason: data.reason ?? null,
      ts: FieldValue.serverTimestamp()
    });

    return { ok: true };
  });
});

export const adminDebit = functions.https.onCall(async (data: AdminDebitReq, context) => {
  const actorUid = requireAdmin(context);
  assertString("uid", data?.uid);
  assertInt("amount", data?.amount, { min: 1 });

  const db = getFirestore();
  const userRef = db.doc(`users/${data.uid}`);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "user not found");
    }
    const user = snap.data() as Record<string, unknown>;
    const balance = Number(user.balance ?? 0);

    if (balance < data.amount) {
      throw new functions.https.HttpsError("failed-precondition", "insufficient funds");
    }

    tx.update(userRef, {
      balance: balance - data.amount,
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.create(ledgerCol.doc(), {
      type: "admin_debit",
      amount: data.amount,
      actorUid,
      reason: data.reason ?? null,
      ts: FieldValue.serverTimestamp()
    });

    return { ok: true };
  });
});

export const adminSetBalance = functions.https.onCall(
  async (data: AdminSetBalanceReq, context) => {
    const actorUid = requireAdmin(context);
    assertString("uid", data?.uid);
    assertInt("newBalance", data?.newBalance, { min: 0, allowZero: true });

    const db = getFirestore();
    const userRef = db.doc(`users/${data.uid}`);
    const ledgerCol = userRef.collection("ledger");

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "user not found");
      }

      tx.update(userRef, {
        balance: data.newBalance,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.create(ledgerCol.doc(), {
        type: "admin_set_balance",
        newBalance: data.newBalance,
        actorUid,
        reason: data.reason ?? null,
        ts: FieldValue.serverTimestamp()
      });

      return { ok: true };
    });
  }
);

export const adminFreeze = functions.https.onCall(async (data: AdminFreezeReq, context) => {
  const actorUid = requireAdmin(context);
  assertString("uid", data?.uid);
  assertBool("frozen", data?.frozen);

  const db = getFirestore();
  const userRef = db.doc(`users/${data.uid}`);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "user not found");
    }

    tx.update(userRef, {
      frozen: data.frozen,
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.create(ledgerCol.doc(), {
      type: "admin_freeze",
      frozen: data.frozen,
      actorUid,
      reason: data.reason ?? null,
      ts: FieldValue.serverTimestamp()
    });

    return { ok: true };
  });
});

export const adminGetUserLedger = functions.https.onCall(
  async (data: AdminGetLedgerReq, context) => {
    requireAdmin(context);
    assertString("uid", data?.uid);

    const limit = Number.isInteger(data?.limit) ? (data?.limit as number) : 50;
    const capped = Math.max(1, Math.min(limit, 200));

    const db = getFirestore();
    const snap = await db
      .collection(`users/${data.uid}/ledger`)
      .orderBy("ts", "desc")
      .limit(capped)
      .get();

    return {
      ok: true,
      entries: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    };
  }
);
