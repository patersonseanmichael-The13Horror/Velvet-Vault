// js/wallet.js
export function readWallet() {
  try {
    return JSON.parse(localStorage.getItem("vv_wallet") ?? "{}");
  } catch { return {}; }
}

export function writeWallet(data) {
  localStorage.setItem("vv_wallet", JSON.stringify(data));
}

export function updateWalletUI(selector = "[data-wallet-balance]") {
  const bal = readWallet().balance ?? 0;
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = `${bal.toFixed(2)} GOLD`;
  });
}
