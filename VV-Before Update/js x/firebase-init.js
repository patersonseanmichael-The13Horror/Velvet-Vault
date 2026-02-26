// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export let vvAuth = null;
export let vvApp = null;
export let vvFirebaseInitError = null;

const hasFirebaseConfig =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId) &&
  !String(firebaseConfig.apiKey).includes("xxxx");

if (!hasFirebaseConfig) {
  vvFirebaseInitError = new Error("Missing Firebase env config.");
  console.warn("[VelvetVault] Firebase config missing; auth features disabled.");
} else {
  try {
    vvApp = initializeApp(firebaseConfig);
    vvAuth = getAuth(vvApp);
  } catch (error) {
    vvFirebaseInitError = error;
    console.warn("[VelvetVault] Firebase init failed:", error);
  }
}

window.vvApp = vvApp;
window.vvAuth = vvAuth;
window.vvFirebaseInitError = vvFirebaseInitError;
