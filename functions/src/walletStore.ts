import { FieldValue, getFirestore } from "firebase-admin/firestore";

export function getUserRef(uid: string) {
  return getFirestore().doc(`users/${uid}`);
}

export async function ensureUserDoc(uid: string) {
  const userRef = getUserRef(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    await userRef.set(
      {
        uid,
        balance: 0,
        locked: 0,
        frozen: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
  return userRef;
}

export function optionalString(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
