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
exports.vvSettleBet = exports.vvReserveBet = exports.vvCancelBet = exports.adminSetBalance = exports.adminGetUserLedger = exports.adminFreeze = exports.adminDebit = exports.adminCredit = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
var admin_1 = require("./admin");
Object.defineProperty(exports, "adminCredit", { enumerable: true, get: function () { return admin_1.adminCredit; } });
Object.defineProperty(exports, "adminDebit", { enumerable: true, get: function () { return admin_1.adminDebit; } });
Object.defineProperty(exports, "adminFreeze", { enumerable: true, get: function () { return admin_1.adminFreeze; } });
Object.defineProperty(exports, "adminGetUserLedger", { enumerable: true, get: function () { return admin_1.adminGetUserLedger; } });
Object.defineProperty(exports, "adminSetBalance", { enumerable: true, get: function () { return admin_1.adminSetBalance; } });
var walletAtomic_1 = require("./walletAtomic");
Object.defineProperty(exports, "vvCancelBet", { enumerable: true, get: function () { return walletAtomic_1.vvCancelBet; } });
Object.defineProperty(exports, "vvReserveBet", { enumerable: true, get: function () { return walletAtomic_1.vvReserveBet; } });
Object.defineProperty(exports, "vvSettleBet", { enumerable: true, get: function () { return walletAtomic_1.vvSettleBet; } });
