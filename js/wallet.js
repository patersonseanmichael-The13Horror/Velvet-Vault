// js/wallet.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.vvAuth;

const DEFAULT_USER = {
  id: "",
  name: "Vault Member",
  balance: 1000,     // starter balance
  tier: 1,
  ledger: []         // { ts, type, amount, note, balanceAfter }
};

function keyFor(uid){
  return `vv_user_${uid}`;
}

function loadUser(uid){
  const key = keyFor(uid);
  const raw = localStorage.getItem(key);
  if(raw){
    try { return JSON.parse(raw); } catch {}
  }
  const u = { ...DEFAULT_USER, id: uid };
  localStorage.setItem(key, JSON.stringify(u));
  return u;
}

function saveUser(user){
  localStorage.setItem(keyFor(user.id), JSON.stringify(user));
}

function nowISO(){
  return new Date().toISOString();
}

function pushLedger(user, type, amount, note){
  const entry = {
    ts: nowISO(),
    type,                  // "credit" | "debit"
    amount: Number(amount),
    note: String(note || ""),
    balanceAfter: Number(user.balance)
  };
  user.ledger.unshift(entry);
  // keep last 200
  if(user.ledger.length > 200) user.ledger.length = 200;
}

function formatGold(n){
  const v = Number(n || 0);
  return `${v.toFixed(0)} GOLD`;
}

// Public engine used by all pages/games
window.VaultEngine = {
  user: null,

  initFor(uid){
    this.user = loadUser(uid);
    return this.user;
  },

  getBalance(){
    return Number(this.user?.balance || 0);
  },

  credit(amount, note="credit"){
    amount = Number(amount);
    if(!this.user || !Number.isFinite(amount) || amount <= 0) return false;

    this.user.balance = Number(this.user.balance) + amount;
    pushLedger(this.user, "credit", amount, note);
    saveUser(this.user);
    this.emit();
    return true;
  },

  debit(amount, note="debit"){
    amount = Number(amount);
    if(!this.user || !Number.isFinite(amount) || amount <= 0) return false;

    if(this.user.balance < amount) return false;
    this.user.balance = Number(this.user.balance) - amount;
    pushLedger(this.user, "debit", amount, note);
    saveUser(this.user);
    this.emit();
    return true;
  },

  getLedger(){
    return Array.isArray(this.user?.ledger) ? this.user.ledger : [];
  },

  setName(name){
    if(!this.user) return;
    this.user.name = String(name || "Vault Member").slice(0, 40);
    saveUser(this.user);
    this.emit();
  },

  // tiny event system so pages can update UI
  _subs: [],
  subscribe(fn){
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter(x => x !== fn); };
  },
  emit(){
    for(const fn of this._subs){
      try{ fn(this.user); }catch{}
    }
  },

  // helpers for UI pages
  formatGold
};

// Auto-init after Firebase auth is ready
onAuthStateChanged(auth, (user) => {
  if(!user) return; // guard.js will redirect if needed
  window.VaultEngine.initFor(user.uid);
  window.VaultEngine.emit();
});
