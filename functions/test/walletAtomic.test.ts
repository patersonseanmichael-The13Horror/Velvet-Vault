import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

beforeAll(() => {
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: "demo-velvet-vault" });
  }
});

test("reserve/settle/cancel flow changes only balance+locked as expected", async () => {
  const db = getFirestore();
  const uid = "user_test_1";
  const userRef = db.doc(`users/${uid}`);

  await userRef.set({ balance: 10_000, locked: 0, frozen: false });

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const user = snap.data() as Record<string, number>;
    tx.update(userRef, { balance: user.balance - 1000, locked: user.locked + 1000 });
    tx.set(userRef.collection("rounds").doc("r1"), { amount: 1000, status: "reserved" });
  });

  let user = (await userRef.get()).data() as Record<string, number>;
  expect(user.balance).toBe(9000);
  expect(user.locked).toBe(1000);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const round = await tx.get(userRef.collection("rounds").doc("r1"));
    const currentUser = snap.data() as Record<string, number>;
    const currentRound = round.data() as Record<string, number>;
    tx.update(userRef, {
      locked: currentUser.locked - currentRound.amount,
      balance: currentUser.balance + 1500
    });
    tx.update(userRef.collection("rounds").doc("r1"), { status: "settled", payout: 1500 });
  });

  user = (await userRef.get()).data() as Record<string, number>;
  expect(user.balance).toBe(10500);
  expect(user.locked).toBe(0);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const currentUser = snap.data() as Record<string, number>;
    tx.update(userRef, { balance: currentUser.balance - 2000, locked: currentUser.locked + 2000 });
    tx.set(userRef.collection("rounds").doc("r2"), { amount: 2000, status: "reserved" });
  });

  user = (await userRef.get()).data() as Record<string, number>;
  expect(user.balance).toBe(8500);
  expect(user.locked).toBe(2000);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const round = await tx.get(userRef.collection("rounds").doc("r2"));
    const currentUser = snap.data() as Record<string, number>;
    const currentRound = round.data() as Record<string, number>;
    tx.update(userRef, {
      locked: currentUser.locked - currentRound.amount,
      balance: currentUser.balance + currentRound.amount
    });
    tx.update(userRef.collection("rounds").doc("r2"), { status: "cancelled" });
  });

  user = (await userRef.get()).data() as Record<string, number>;
  expect(user.balance).toBe(10500);
  expect(user.locked).toBe(0);
});
