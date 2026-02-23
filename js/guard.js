// js/guard.js
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.vvAuth;

onAuthStateChanged(auth, (user) => {
  if(!user || !user.emailVerified){
    location.href = "login.html";
  }
});

// Optional: hook up a logout button if it exists
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "login.html";
});
