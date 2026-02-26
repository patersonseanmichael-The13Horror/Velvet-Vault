// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// Velvet Vault Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC3qIWUSeO5r9uGBV7NrwdHNVKZ2BbQ2B8",
  authDomain: "the-velvet-vault-11bd2.firebaseapp.com",
  projectId: "the-velvet-vault-11bd2",
  storageBucket: "the-velvet-vault-11bd2.firebasestorage.app",
  messagingSenderId: "929853784997",
  appId: "1:929853784997:web:c8588d30bc4c0489629e4c",
  measurementId: "G-8HHEKDPGVY"
};

let auth = null;
let app = null;
let initError = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  initError = error;
  console.error("[VelvetVault] Firebase init failed:", error);
}

window.vvApp = app;
window.vvAuth = auth;
window.vvFirebaseInitError = initError;
