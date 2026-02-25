(function () {
  "use strict";
  if (window.__VV_WALLET_MANUAL_INIT__) return;
  window.__VV_WALLET_MANUAL_INIT__ = true;

  const form = document.getElementById("vvManualForm");
  if (!form) return;

  if (form.dataset.vvBound === "1") return;
  form.dataset.vvBound = "1";

  const msg = document.getElementById("vvManualMsg");
  const fileInput = document.getElementById("vvScreenshot");
  const KEY = "vv_manual_payment_submission";
  const HISTORY_KEY = "vv_manual_payment_submissions";

  function setMsg(text, tone) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = tone === "ok"
      ? "rgba(0,255,154,0.9)"
      : tone === "err"
        ? "rgba(255,90,110,0.95)"
        : "rgba(241,236,255,0.8)";
  }

  function getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      setMsg("Attach a screenshot to submit for review.", "");
      return;
    }
    const kb = Math.max(1, Math.round(file.size / 1024));
    setMsg(`Ready: ${file.name} (${kb} KB)`, "");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const file = fileInput?.files?.[0] || null;
    if (!file) {
      setMsg("Upload a screenshot first.", "err");
      return;
    }

    const payload = {
      name: "Michael Sean",
      payId: "ledgertheivory@gmail.com",
      reference: "2009855",
      description: "Items Purchased Ebay",
      screenshotName: file.name,
      screenshotSize: file.size,
      createdAt: new Date().toISOString(),
      status: "PENDING_REVIEW",
      walletBalance: typeof window.VaultEngine?.getBalance === "function"
        ? Number(window.VaultEngine.getBalance())
        : null
    };

    localStorage.setItem(KEY, JSON.stringify(payload));

    const history = getHistory();
    history.unshift(payload);
    if (history.length > 20) history.length = 20;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    const at = new Date(payload.createdAt).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "2-digit"
    });

    setMsg(`Submission received (${at}). Manual review pending.`, "ok");
    fileInput.value = "";
  });
})();
