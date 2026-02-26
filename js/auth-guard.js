import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.vvAuth;
const LOGIN_PATH = "login.html";

function goToLogin() {
  if (!location.pathname.endsWith(LOGIN_PATH)) {
    location.replace(LOGIN_PATH);
  }
}

if (!auth) {
  goToLogin();
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user || !user.emailVerified) {
      goToLogin();
    }
  });
}
