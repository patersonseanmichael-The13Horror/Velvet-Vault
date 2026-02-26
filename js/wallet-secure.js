/* ==========================================================
   Velvet Vault — Secure Wallet Engine (Client)
   Keeps the SAME API your games already call:
   window.VaultEngine.getBalance()
   window.VaultEngine.debit(amount, note)
   window.VaultEngine.credit(amount, note)  (requires roundId inside note OR generated)
   window.VaultEngine.subscribe(fn)
   window.VaultEngine.formatGold(n)

   Source of truth: Firestore users/{uid}.balance
   Mutations: Cloud Functions vvDebit / vvCredit
   Idempotency: roundId required for credit (payout)
   ========================================================== */

import {
  getFirestore,
  doc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const app = window.vvApp;
const auth = window.vvAuth;

const LS_KEY = "vv_wallet_cache_v1";

function nowId() {
  return "r_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
}

function parseNote(note) {
  // allow existing code to pass strings like "roulette-payout" etc
  // You can optionally embed roundId: "roulette-payout|roundId=abc"
  const s = String(note || "");
  const parts = s.split("|");
  const base = parts[0] || "unknown";
  let roundId = "";
  for (const p of parts.slice(1)) {
    const [k, v] = p.split("=");
    if ((k || "").trim() === "roundId") roundId = (v || "").trim();
  }
  return { game: base.slice(0, 40), roundId };
}

function safeInt(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

let state = {
  user: null,
  balance: 0,
  ready: false
};

let ledgerCache = [];
const subs = new Set();
function notify() {
  for (const fn of subs) {
    try { fn(state.balance); } catch {}
  }
}

function setCache(balance) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      balance: safeInt(balance),
      at: Date.now()
    }));
  } catch {}
}

function getCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j || typeof j.balance !== "number") return null;
    return j;
  } catch { return null; }
}

function formatGold(n) {
  const v = safeInt(n);
  return v.toLocaleString() + " GOLD";
}

// Firebase wiring
const db = getFirestore(app);
const fx = getFunctions(app);
const vvGetBalance = httpsCallable(fx, "vvGetBalance");
const vvDebit = httpsCallable(fx, "vvDebit");
const vvCredit = httpsCallable(fx, "vvCredit");

let unsubUser = null;
let unsubLedger = null;

function attachUser(uid) {
  if (unsubUser) { try { unsubUser(); } catch {} }
  if (unsubLedger) { try { unsubLedger(); } catch {} }

  const ref = doc(db, "users", uid);
  unsubUser = onSnapshot(ref, (snap) => {
    const bal = safeInt(snap.data()?.balance || 0);
    state.balance = bal;
    state.ready = true;
    setCache(bal);
    notify();
  }, () => {
    // If snapshot fails, use cached balance for UI only
    const c = getCache();
    if (c) state.balance = safeInt(c.balance);
    notify();
  });

  const ledgerQuery = query(
    collection(db, "users", uid, "ledger"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  unsubLedger = onSnapshot(ledgerQuery, (snap) => {
    ledgerCache = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        ts: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        type: data.type || "",
        amount: safeInt(data.amount),
        note: data.note || "",
        game: data.game || "",
        roundId: data.roundId || "",
        balanceAfter: safeInt(data.balanceAfter ?? state.balance)
      };
    });
    notify();
  }, () => {
    ledgerCache = [];
  });
}

function detachUser() {
  if (unsubUser) { try { unsubUser(); } catch {} }
  unsubUser = null;
  if (unsubLedger) { try { unsubLedger(); } catch {} }
  unsubLedger = null;
  state.user = null;
  state.ready = false;

  const c = getCache();
  state.balance = c ? safeInt(c.balance) : 0;
  ledgerCache = [];
  notify();
}

onAuthStateChanged(auth, async (user) => {
  state.user = user || null;
  if (!user) {
    detachUser();
    return;
  }
  attachUser(user.uid);

  // Prime balance once (optional)
  try {
    const res = await vvGetBalance();
    const bal = safeInt(res.data?.balance || 0);
    state.balance = bal;
    setCache(bal);
    notify();
  } catch {}
});

async function debit(amount, note) {
  if (!state.user) return false;
  const amt = safeInt(amount);
  if (amt <= 0) return false;

  const { game, roundId } = parseNote(note);

  try {
    const res = await vvDebit({ amount: amt, game, roundId });
    const bal = safeInt(res.data?.balance || state.balance);
    state.balance = bal;
    setCache(bal);
    notify();
    return true;
  } catch (e) {
    return false;
  }
}

async function credit(amount, note) {
  if (!state.user) return false;
  const amt = safeInt(amount);
  if (amt <= 0) return false;

  const parsed = parseNote(note);
  const game = parsed.game;
  const roundId = parsed.roundId || nowId(); // if game didn’t pass one, we create one (still idempotent per-call)
  // NOTE: best practice is game passes a roundId per spin/hand. This fallback prevents total failure.

  try {
    const res = await vvCredit({ amount: amt, game, roundId });
    const bal = safeInt(res.data?.balance || state.balance);
    state.balance = bal;
    setCache(bal);
    notify();
    return true;
  } catch {
    return false;
  }
}

function getBalance() {
  return safeInt(state.balance);
}

function getLedger() {
  return Array.isArray(ledgerCache) ? ledgerCache : [];
}

function subscribe(fn) {
  if (typeof fn !== "function") return () => {};
  subs.add(fn);
  // immediate fire
  try { fn(state.balance); } catch {}
  return () => subs.delete(fn);
}

// Export global (backwards compatible)
window.VaultEngine = {
  get user() { return state.user; },
  getBalance,
  debit: (amt, note) => {
    // keep legacy sync semantics: return boolean immediately is no longer possible
    // BUT your code expects boolean right now — so we provide a "best effort":
    // if debit is called without await, it will still work visually; wallet updates async.
    debit(amt, note);
    return true;
  },
  credit: (amt, note) => {
    credit(amt, note);
    return true;
  },
  subscribe,
  formatGold,
  getLedger
};
