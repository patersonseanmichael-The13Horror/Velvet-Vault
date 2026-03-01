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
exports.requireAuthed = requireAuthed;
exports.requireAdmin = requireAdmin;
exports.assertInt = assertInt;
exports.assertString = assertString;
exports.assertBool = assertBool;
const functions = __importStar(require("firebase-functions"));
function requireAuthed(context) {
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    return uid;
}
function requireAdmin(context) {
    const uid = requireAuthed(context);
    const isAdmin = Boolean(context.auth?.token?.admin);
    if (!isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Admin only");
    }
    return uid;
}
function assertInt(name, value, opts) {
    const allowZero = opts?.allowZero ?? false;
    const min = opts?.min ?? (allowZero ? 0 : 1);
    if (!Number.isInteger(value)) {
        throw new functions.https.HttpsError("invalid-argument", `${name} must be an integer`);
    }
    if (value < min) {
        throw new functions.https.HttpsError("invalid-argument", `${name} must be >= ${min}`);
    }
}
function assertString(name, value) {
    if (typeof value !== "string" || value.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", `${name} required (string)`);
    }
}
function assertBool(name, value) {
    if (typeof value !== "boolean") {
        throw new functions.https.HttpsError("invalid-argument", `${name} must be boolean`);
    }
}
