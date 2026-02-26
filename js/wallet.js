const LS_KEY = "vv_wallet_balance_v1";
const LEDGER_KEY = "vv_wallet_ledger_v1";
const DEFAULT_BALANCE = 10000;
const subscribers = new Set();

function toInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export function formatGold(value) {
  return `${toInt(value).toLocaleString()} GOLD`;
}

export function readWallet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw == null) {
      localStorage.setItem(LS_KEY, String(DEFAULT_BALANCE));
      return DEFAULT_BALANCE;
    }
    return toInt(raw);
  } catch {
    return DEFAULT_BALANCE;
  }
}

function readLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLedger(entries) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, 250)));
  } catch {}
}

function appendLedger(type, amount, note, balanceAfter) {
  const next = [{
    ts: Date.now(),
    type,
    amount: toInt(amount),
    note: String(note || ""),
    balanceAfter: toInt(balanceAfter)
  }, ...readLedger()];
  writeLedger(next);
}

export function writeWallet(nextBalance) {
  const safeBalance = toInt(nextBalance);
  try {
    localStorage.setItem(LS_KEY, String(safeBalance));
  } catch {}
  updateWalletUI();
  notify();
  return safeBalance;
}

export function updateWalletUI() {
  const balance = readWallet();
  const text = formatGold(balance);
  const targets = [
    ...document.querySelectorAll("#walletBal"),
    ...document.querySelectorAll("[data-wallet-balance]")
  ];
  for (const el of targets) {
    el.textContent = text;
  }
}

function notify() {
  const balance = readWallet();
  for (const fn of subscribers) {
    try {
      fn(balance);
    } catch {}
  }
}

function getBalance() {
  return readWallet();
}

function debit(amount) {
  const spend = toInt(amount);
  if (spend <= 0) return false;
  const current = readWallet();
  if (spend > current) return false;
  const next = writeWallet(current - spend);
  appendLedger("debit", spend, "", next);
  return true;
}

function credit(amount, note) {
  const win = toInt(amount);
  if (win <= 0) return false;
  const next = writeWallet(readWallet() + win);
  appendLedger("credit", win, note, next);
  return true;
}

function subscribe(handler) {
  if (typeof handler !== "function") {
    return () => {};
  }
  subscribers.add(handler);
  try {
    handler(readWallet());
  } catch {}
  return () => subscribers.delete(handler);
}

if (!window.VaultEngine) {
  window.VaultEngine = {
    get user() {
      return window.vvAuth?.currentUser || { uid: "local-user" };
    },
    getBalance,
    debit: (amount, note) => {
      const spend = toInt(amount);
      if (spend <= 0) return false;
      const current = readWallet();
      if (spend > current) return false;
      const next = writeWallet(current - spend);
      appendLedger("debit", spend, note, next);
      return true;
    },
    credit,
    subscribe,
    formatGold,
    getLedger: () => readLedger()
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateWalletUI();
  }, { once: true });
} else {
  updateWalletUI();
}
