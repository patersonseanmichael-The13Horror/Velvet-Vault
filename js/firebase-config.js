// Velvet Vault Firebase config
// - Uses runtime override window.VELVET_VAULT_FIREBASE_CONFIG when provided (for static hosting)
// - Falls back to the bundled demo config

const fallbackConfig = {
  apiKey: "AIzaSyC3qIWUSeO5r9uGBV7NrwdHNVKZ2BbQ2B8",
  authDomain: "the-velvet-vault-11bd2.firebaseapp.com",
  projectId: "the-velvet-vault-11bd2",
  storageBucket: "the-velvet-vault-11bd2.firebasestorage.app",
  messagingSenderId: "929853784997",
  appId: "1:929853784997:web:c8588d30bc4c0489629e4c",
  measurementId: "G-8HHEKDPGVY"
};

export const firebaseConfig = window.VELVET_VAULT_FIREBASE_CONFIG || fallbackConfig;
