// js/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.vvAuth;

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl  = document.getElementById("message");
const signupBtn = document.getElementById("signupBtn");
const signinBtn = document.getElementById("signinBtn");
const resendBtn = document.getElementById("resendBtn");

function say(t){ if(msgEl) msgEl.textContent = t; }

signupBtn?.addEventListener("click", async () => {
  try{
    const email = emailEl.value.trim();
    const pass  = passEl.value;

    if(!email || !pass) return say("Enter email + password.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await sendEmailVerification(cred.user);
    say("Account created. Verify your email, then sign in.");
  }catch(e){
    say(e?.message || String(e));
  }
});

signinBtn?.addEventListener("click", async () => {
  try{
    const email = emailEl.value.trim();
    const pass  = passEl.value;

    if(!email || !pass) return say("Enter email + password.");
    const cred = await signInWithEmailAndPassword(auth, email, pass);

    if(!cred.user.emailVerified){
      say("Verify your email first. (Click Resend if needed.)");
      return;
    }
    location.href = "members.html";
  }catch(e){
    say(e?.message || String(e));
  }
});

resendBtn?.addEventListener("click", async () => {
  try{
    const u = auth.currentUser;
    if(!u) return say("Sign in first, then resend verification.");
    await sendEmailVerification(u);
    say("Verification email sent.");
  }catch(e){
    say(e?.message || String(e));
  }
});

// If already signed in + verified, skip login page
onAuthStateChanged(auth, (user) => {
  if(user && user.emailVerified){
    location.href = "members.html";
  }
});

// Optional helper if you add a logout button on login page
window.vvLogout = async () => { await signOut(auth); };
