import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.vvAuth;
const LOGIN_PATH = "login.html";
let guardResolved = false;

function goToLogin() {
  if (!location.pathname.endsWith(LOGIN_PATH)) {
    location.replace(LOGIN_PATH);
  }
}

if (!auth) {
  console.warn("[VelvetVault] Auth unavailable");
  goToLogin();
} else {
  (async () => {
    try {
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }

      guardResolved = true;

      if (!auth.currentUser || !auth.currentUser.emailVerified) {
        goToLogin();
      }
    } catch {
      goToLogin();
    }
  })();

  setTimeout(() => {
    if (!guardResolved) {
      goToLogin();
    }
  }, 3000);

  onAuthStateChanged(auth, (user) => {
    guardResolved = true;
    if (!user || !user.emailVerified) {
      goToLogin();
    }
  });
}

function bindLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn || logoutBtn.dataset.vvLogoutBound === "1") return;
  logoutBtn.dataset.vvLogoutBound = "1";

  logoutBtn.addEventListener("click", async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.warn("[VelvetVault] Sign out failed:", error);
      }
    }
    goToLogin();
  });
}

bindLogoutButton();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindLogoutButton, { once: true });
}
