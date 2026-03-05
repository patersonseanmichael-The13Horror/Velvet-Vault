/**
 * js/vaultgate.js
 * Vault Gate entrance animation for index.html
 *
 * Sequence:
 *  1. User clicks "Enter Velvet Vault" button (or anywhere on overlay)
 *  2. Handle rotates 360deg (0.85s)
 *  3. Doors split open (1.1s, starts 0.3s after handle)
 *  4. After animation completes (~1800ms total), redirect to login.html
 *
 * Defensive:
 *  - Prevents double-click
 *  - ESC skips animation and routes immediately
 *  - prefers-reduced-motion: skips animation and routes immediately
 *  - sessionStorage flag prevents re-showing on back-navigation
 */
(function () {
  "use strict";

  const GATE_ID      = "vaultGate";
  const DEST         = "login.html";
  const ANIM_DELAY   = 1800; // ms after .vg-opening added before redirect

  const gate = document.getElementById(GATE_ID);
  if (!gate) return;

  // If already entered this session, skip gate
  if (sessionStorage.getItem("vv_gate_passed") === "1") {
    gate.classList.add("vg-hidden");
    return;
  }

  let triggered = false;

  // ── Check reduced motion preference ──────────────────────────
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function navigate() {
    sessionStorage.setItem("vv_gate_passed", "1");
    window.location.href = DEST;
  }

  function triggerOpen() {
    if (triggered) return;
    triggered = true;

    if (prefersReduced) {
      // Skip animation entirely
      navigate();
      return;
    }

    gate.classList.add("vg-opening");
    setTimeout(navigate, ANIM_DELAY);
  }

  // ── Enter button ──────────────────────────────────────────────
  const enterBtn = gate.querySelector(".vg-enter-btn");
  if (enterBtn) {
    enterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerOpen();
    });
  }

  // ── Click anywhere on overlay ─────────────────────────────────
  gate.addEventListener("click", (e) => {
    // Don't double-fire if button was clicked
    if (e.target === enterBtn) return;
    triggerOpen();
  });

  // ── ESC key skips animation ───────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      navigate();
    }
  });

})();
