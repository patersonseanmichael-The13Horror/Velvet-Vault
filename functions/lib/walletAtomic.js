"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.vvCancelBet = exports.vvSettleBet = exports.vvReserveBet = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const utils_1 = require("./utils");
exports.vvReserveBet = functions.https.onCall(async (data, context) => {
    const uid = (0, utils_1.requireAuthed)(context);
    (0, utils_1.assertString)("roundId", data?.roundId);
    (0, utils_1.assertInt)("amount", data?.amount, { min: 1 });
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${uid}`);
    const roundRef = userRef.collection("rounds").doc(data.roundId);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        const user = userSnap.data();
        if (user.frozen) {
            throw new functions.https.HttpsError("failed-precondition", "Account frozen");
        }
        const roundSnap = await tx.get(roundRef);
        if (roundSnap.exists) {
            const round = roundSnap.data();
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
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.set(roundRef, {
            amount: data.amount,
            status: "reserved",
            meta: data.meta ?? null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "reserve",
            amount: data.amount,
            roundId: data.roundId,
            meta: data.meta ?? null,
            actorUid: uid,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true, status: "reserved" };
    }, { maxAttempts: 3 });
});
exports.vvSettleBet = functions.https.onCall(async (data, context) => {
    const uid = (0, utils_1.requireAuthed)(context);
    (0, utils_1.assertString)("roundId", data?.roundId);
    (0, utils_1.assertInt)("payout", data?.payout, { min: 0, allowZero: true });
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${uid}`);
    const roundRef = userRef.collection("rounds").doc(data.roundId);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        const user = userSnap.data();
        const balance = Number(user.balance ?? 0);
        const locked = Number(user.locked ?? 0);
        const roundSnap = await tx.get(roundRef);
        if (!roundSnap.exists) {
            throw new functions.https.HttpsError("failed-precondition", "round not reserved");
        }
        const round = roundSnap.data();
        if (round.status === "settled") {
            return { ok: true, status: "settled", existing: true };
        }
        if (round.status !== "reserved") {
            throw new functions.https.HttpsError("failed-precondition", `round status ${String(round.status)}`);
        }
        const amount = Number(round.amount ?? 0);
        if (locked < amount) {
            throw new functions.https.HttpsError("failed-precondition", "locked underflow");
        }
        tx.update(userRef, {
            locked: locked - amount,
            balance: balance + data.payout,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.update(roundRef, {
            status: "settled",
            payout: data.payout,
            meta: data.meta ?? round.meta ?? null,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "settle",
            amount,
            payout: data.payout,
            roundId: data.roundId,
            meta: data.meta ?? null,
            actorUid: uid,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        if (data.payout > 0) {
            tx.create(ledgerCol.doc(), {
                type: "payout",
                amount: data.payout,
                roundId: data.roundId,
                meta: data.meta ?? null,
                actorUid: uid,
                ts: firestore_1.FieldValue.serverTimestamp()
            });
        }
        return { ok: true, status: "settled" };
    }, { maxAttempts: 3 });
});
exports.vvCancelBet = functions.https.onCall(async (data, context) => {
    const uid = (0, utils_1.requireAuthed)(context);
    (0, utils_1.assertString)("roundId", data?.roundId);
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${uid}`);
    const roundRef = userRef.collection("rounds").doc(data.roundId);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            return { ok: true, status: "noop" };
        }
        const user = userSnap.data();
        const balance = Number(user.balance ?? 0);
        const locked = Number(user.locked ?? 0);
        const roundSnap = await tx.get(roundRef);
        if (!roundSnap.exists) {
            return { ok: true, status: "noop" };
        }
        const round = roundSnap.data();
        if (round.status === "cancelled") {
            return { ok: true, status: "cancelled", existing: true };
        }
        if (round.status === "settled") {
            return { ok: true, status: "settled", existing: true };
        }
        if (round.status !== "reserved") {
            throw new functions.https.HttpsError("failed-precondition", `round status ${String(round.status)}`);
        }
        const amount = Number(round.amount ?? 0);
        if (locked < amount) {
            throw new functions.https.HttpsError("failed-precondition", "locked underflow");
        }
        tx.update(userRef, {
            locked: locked - amount,
            balance: balance + amount,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.update(roundRef, {
            status: "cancelled",
            cancelReason: data.reason ?? null,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "cancel",
            amount,
            roundId: data.roundId,
            reason: data.reason ?? null,
            actorUid: uid,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true, status: "cancelled" };
    }, { maxAttempts: 3 });
});
