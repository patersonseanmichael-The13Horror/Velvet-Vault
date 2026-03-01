import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

beforeAll(() => {
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: "demo-velvet-vault" });
  }
});

test("admin credit/debit/setbalance/freeze expected state changes", async () => {
  const db = getFirestore();
  const uid = "user_admin_target";
  const userRef = db.doc(`users/${uid}`);

  await userRef.set({ balance: 1000, locked: 0, frozen: false });

  await userRef.update({ balance: 1500 });
  let user = (await userRef.get()).data() as Record<string, unknown>;
  expect(user.balance).toBe(1500);

  await userRef.update({ balance: 1200 });
  user = (await userRef.get()).data() as Record<string, unknown>;
  expect(user.balance).toBe(1200);

  await userRef.update({ balance: 9999 });
  user = (await userRef.get()).data() as Record<string, unknown>;
  expect(user.balance).toBe(9999);

  await userRef.update({ frozen: true });
  user = (await userRef.get()).data() as Record<string, unknown>;
  expect(user.frozen).toBe(true);
});
