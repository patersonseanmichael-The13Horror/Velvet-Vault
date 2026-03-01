import * as functions from "firebase-functions";

export function requireAuthed(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }
  return uid;
}

export function requireAdmin(context: functions.https.CallableContext): string {
  const uid = requireAuthed(context);
  const isAdmin = Boolean(context.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }
  return uid;
}

export function assertInt(
  name: string,
  value: unknown,
  opts?: { min?: number; allowZero?: boolean }
): void {
  const allowZero = opts?.allowZero ?? false;
  const min = opts?.min ?? (allowZero ? 0 : 1);
  if (!Number.isInteger(value)) {
    throw new functions.https.HttpsError("invalid-argument", `${name} must be an integer`);
  }
  if ((value as number) < min) {
    throw new functions.https.HttpsError("invalid-argument", `${name} must be >= ${min}`);
  }
}

export function assertString(name: string, value: unknown): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", `${name} required (string)`);
  }
}

export function assertBool(name: string, value: unknown): void {
  if (typeof value !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", `${name} must be boolean`);
  }
}
