import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { adminCredit, adminDebit, adminFreeze, adminGetUserLedger, adminSetBalance } from "./admin";
export { vvCancelBet, vvReserveBet, vvSettleBet } from "./walletAtomic";
