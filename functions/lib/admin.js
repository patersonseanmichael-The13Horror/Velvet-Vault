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
exports.adminGetUserLedger = exports.adminFreeze = exports.adminSetBalance = exports.adminDebit = exports.adminCredit = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const utils_1 = require("./utils");
exports.adminCredit = functions.https.onCall(async (data, context) => {
    const actorUid = (0, utils_1.requireAdmin)(context);
    (0, utils_1.assertString)("uid", data?.uid);
    (0, utils_1.assertInt)("amount", data?.amount, { min: 1 });
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${data.uid}`);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        const user = snap.data();
        const balance = Number(user.balance ?? 0);
        tx.update(userRef, {
            balance: balance + data.amount,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "admin_credit",
            amount: data.amount,
            actorUid,
            reason: data.reason ?? null,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true };
    });
});
exports.adminDebit = functions.https.onCall(async (data, context) => {
    const actorUid = (0, utils_1.requireAdmin)(context);
    (0, utils_1.assertString)("uid", data?.uid);
    (0, utils_1.assertInt)("amount", data?.amount, { min: 1 });
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${data.uid}`);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        const user = snap.data();
        const balance = Number(user.balance ?? 0);
        if (balance < data.amount) {
            throw new functions.https.HttpsError("failed-precondition", "insufficient funds");
        }
        tx.update(userRef, {
            balance: balance - data.amount,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "admin_debit",
            amount: data.amount,
            actorUid,
            reason: data.reason ?? null,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true };
    });
});
exports.adminSetBalance = functions.https.onCall(async (data, context) => {
    const actorUid = (0, utils_1.requireAdmin)(context);
    (0, utils_1.assertString)("uid", data?.uid);
    (0, utils_1.assertInt)("newBalance", data?.newBalance, { min: 0, allowZero: true });
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${data.uid}`);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        tx.update(userRef, {
            balance: data.newBalance,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "admin_set_balance",
            newBalance: data.newBalance,
            actorUid,
            reason: data.reason ?? null,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true };
    });
});
exports.adminFreeze = functions.https.onCall(async (data, context) => {
    const actorUid = (0, utils_1.requireAdmin)(context);
    (0, utils_1.assertString)("uid", data?.uid);
    (0, utils_1.assertBool)("frozen", data?.frozen);
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.doc(`users/${data.uid}`);
    const ledgerCol = userRef.collection("ledger");
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new functions.https.HttpsError("not-found", "user not found");
        }
        tx.update(userRef, {
            frozen: data.frozen,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        tx.create(ledgerCol.doc(), {
            type: "admin_freeze",
            frozen: data.frozen,
            actorUid,
            reason: data.reason ?? null,
            ts: firestore_1.FieldValue.serverTimestamp()
        });
        return { ok: true };
    });
});
exports.adminGetUserLedger = functions.https.onCall(async (data, context) => {
    (0, utils_1.requireAdmin)(context);
    (0, utils_1.assertString)("uid", data?.uid);
    const limit = Number.isInteger(data?.limit) ? data?.limit : 50;
    const capped = Math.max(1, Math.min(limit, 200));
    const db = (0, firestore_1.getFirestore)();
    const snap = await db
        .collection(`users/${data.uid}/ledger`)
        .orderBy("ts", "desc")
        .limit(capped)
        .get();
    return {
        ok: true,
        entries: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    };
});
