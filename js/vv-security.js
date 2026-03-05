/* © 2026 Velvet Vault — Sean Michael Paterson. All rights reserved. */
/**
 * vv-security.js
 * Client-side security hardening layer.
 * - Clickjacking self-framing guard
 * - Console warning for unauthorised inspection
 * - Disables right-click context menu on game pages
 * - Disables text selection on game pages
 */
(function vvSecurity() {
  "use strict";

  // ── 1. Clickjacking guard ──────────────────────────────────────────────────
  // If this page is loaded inside an iframe on a different origin, redirect.
  try {
    if (window.self !== window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch (_) {
    // Cross-origin frame access throws; redirect to be safe
    window.location.href = "/index.html";
  }

  // ── 2. Console warning ────────────────────────────────────────────────────
  const WARNING = [
    "%c⚠ STOP — Velvet Vault Security Warning",
    "color:#c9a84c;font-size:20px;font-weight:bold;",
    "\n%cThis browser console is intended for developers only.\n" +
    "Entering or pasting code here could compromise your account.\n" +
    "© 2026 Velvet Vault — Sean Michael Paterson. All rights reserved.\n" +
    "Unauthorised access or reproduction is strictly prohibited.",
    "color:#f2ede6;font-size:13px;"
  ];
  try {
    console.log(WARNING[0], WARNING[1], WARNING[2], WARNING[3]);
  } catch (_) {}

  // ── 3. Game page protections ──────────────────────────────────────────────
  const GAME_PAGES = ["/slots.html", "/slots-hub.html", "/slots-lobby.html"];
  const isGamePage = GAME_PAGES.some(p => window.location.pathname.endsWith(p));

  if (isGamePage) {
    // Disable right-click context menu
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Disable drag on images (prevents symbol theft)
    document.addEventListener("dragstart", (e) => {
      if (e.target.tagName === "IMG") e.preventDefault();
    });
  }
})();
