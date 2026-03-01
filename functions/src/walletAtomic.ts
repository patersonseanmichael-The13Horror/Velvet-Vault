import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { assertInt, assertString, requireAuthed } from "./utils";

type ReserveReq = { roundId: string; amount: number; meta?: unknown };
type SettleReq = { roundId: string; payout: number; meta?: unknown };
type CancelReq = { roundId: string; reason?: string };

export const vvReserveBet = functions.https.onCall(async (data: ReserveReq, context) => {
  const uid = requireAuthed(context);
  assertString("roundId", data?.roundId);
  assertInt("amount", data?.amount, { min: 1 });

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(data.roundId);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(
    async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "user not found");
      }
      const user = userSnap.data() as Record<string, unknown>;

      if (user.frozen) {
        throw new functions.https.HttpsError("failed-precondition", "Account frozen");
      }

      const roundSnap = await tx.get(roundRef);
      if (roundSnap.exists) {
        const round = roundSnap.data() as Record<string, unknown>;
        return {
          ok: true,
          status: round.status ?? "reserved",
          existing: true,
          amount: round.amount ?? 0
        };
      }

      const balance = Number(user.balance ?? 0);
      const locked = Number(user.locked ?? 0);
      if (balance < data.amount) {
        throw new functions.https.HttpsError("failed-precondition", "insufficient funds");
      }

      tx.update(userRef, {
        balance: balance - data.amount,
        locked: locked + data.amount,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.set(roundRef, {
        amount: data.amount,
        status: "reserved",
        meta: data.meta ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.create(ledgerCol.doc(), {
        type: "reserve",
        amount: data.amount,
        roundId: data.roundId,
        meta: data.meta ?? null,
        actorUid: uid,
        ts: FieldValue.serverTimestamp()
      });

      return { ok: true, status: "reserved" };
    },
    { maxAttempts: 3 }
  );
});

export const vvSettleBet = functions.https.onCall(async (data: SettleReq, context) => {
  const uid = requireAuthed(context);
  assertString("roundId", data?.roundId);
  assertInt("payout", data?.payout, { min: 0, allowZero: true });

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(data.roundId);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(
    async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "user not found");
      }
      const user = userSnap.data() as Record<string, unknown>;

      const balance = Number(user.balance ?? 0);
      const locked = Number(user.locked ?? 0);

      const roundSnap = await tx.get(roundRef);
      if (!roundSnap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "round not reserved");
      }

      const round = roundSnap.data() as Record<string, unknown>;
      if (round.status === "settled") {
        return { ok: true, status: "settled", existing: true };
      }
      if (round.status !== "reserved") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `round status ${String(round.status)}`
        );
      }

      const amount = Number(round.amount ?? 0);
      if (locked < amount) {
        throw new functions.https.HttpsError("failed-precondition", "locked underflow");
      }

      tx.update(userRef, {
        locked: locked - amount,
        balance: balance + data.payout,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.update(roundRef, {
        status: "settled",
        payout: data.payout,
        meta: data.meta ?? round.meta ?? null,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.create(ledgerCol.doc(), {
        type: "settle",
        amount,
        payout: data.payout,
        roundId: data.roundId,
        meta: data.meta ?? null,
        actorUid: uid,
        ts: FieldValue.serverTimestamp()
      });

      if (data.payout > 0) {
        tx.create(ledgerCol.doc(), {
          type: "payout",
          amount: data.payout,
          roundId: data.roundId,
          meta: data.meta ?? null,
          actorUid: uid,
          ts: FieldValue.serverTimestamp()
        });
      }

      return { ok: true, status: "settled" };
    },
    { maxAttempts: 3 }
  );
});

export const vvCancelBet = functions.https.onCall(async (data: CancelReq, context) => {
  const uid = requireAuthed(context);
  assertString("roundId", data?.roundId);

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const roundRef = userRef.collection("rounds").doc(data.roundId);
  const ledgerCol = userRef.collection("ledger");

  return db.runTransaction(
    async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        return { ok: true, status: "noop" };
      }
      const user = userSnap.data() as Record<string, unknown>;

      const balance = Number(user.balance ?? 0);
      const locked = Number(user.locked ?? 0);

      const roundSnap = await tx.get(roundRef);
      if (!roundSnap.exists) {
        return { ok: true, status: "noop" };
      }

      const round = roundSnap.data() as Record<string, unknown>;
      if (round.status === "cancelled") {
        return { ok: true, status: "cancelled", existing: true };
      }
      if (round.status === "settled") {
        return { ok: true, status: "settled", existing: true };
      }
      if (round.status !== "reserved") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `round status ${String(round.status)}`
        );
      }

      const amount = Number(round.amount ?? 0);
      if (locked < amount) {
        throw new functions.https.HttpsError("failed-precondition", "locked underflow");
      }

      tx.update(userRef, {
        locked: locked - amount,
        balance: balance + amount,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.update(roundRef, {
        status: "cancelled",
        cancelReason: data.reason ?? null,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.create(ledgerCol.doc(), {
        type: "cancel",
        amount,
        roundId: data.roundId,
        reason: data.reason ?? null,
        actorUid: uid,
        ts: FieldValue.serverTimestamp()
      });

      return { ok: true, status: "cancelled" };
    },
    { maxAttempts: 3 }
  );
});
