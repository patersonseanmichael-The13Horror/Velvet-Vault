// js/firebase-config.js
// Small helper to read Firebase keys at build-time.
// During local dev create `.env.local`.
// On Vercel add the same vars in Project -> Settings -> Environment.
const env = import.meta?.env ?? globalThis.process?.env ?? {};

export const firebaseConfig = {
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
