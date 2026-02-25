// js/auth-guard.js
// Redirects unauthenticated visitors to /login.html
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { vvAuth } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(vvAuth, (user) => {
    if (!user || !user.emailVerified) {
      window.location.replace("/login.html?next=" + encodeURIComponent(location.pathname));
    }
  });
});
