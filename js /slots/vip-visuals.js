/* ======================================================
   VELVET VAULT — VIP SLOT MACHINE VISUAL ENGINE
   Works with slots.html + machines.js
   Safe for mobile + low GPU
   ====================================================== */

(function(){
"use strict";
if (window.__VV_SLOTS_VIP_VISUALS_INIT__) return;
window.__VV_SLOTS_VIP_VISUALS_INIT__ = true;

/* ===============================
   Helpers
================================ */

const $$ = (s) => document.querySelectorAll(s);
const rand = (a,b) => Math.random()*(b-a)+a;
const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pickMachines(){
  const byLegacy = $$(".slotMachine");
  if (byLegacy.length) return byLegacy;
  return $$(".machine-panel");
}

function pickReels(){
  const byLegacy = $$(".reel");
  if (byLegacy.length) return byLegacy;
  return $$(".reel-col");
}

function ensureKeyframes(){
  if (document.getElementById("vvSlotsVipFx")) return;
  const style = document.createElement("style");
  style.id = "vvSlotsVipFx";
  style.textContent = `
    @keyframes vvReelShimmer {
      0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
      14% { opacity: .38; }
      40% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
      100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
    }

    @keyframes vvJackpotBeam {
      0% { transform: rotate(0deg) scale(1); opacity: .60; }
      50% { transform: rotate(180deg) scale(1.06); opacity: .78; }
      100% { transform: rotate(360deg) scale(1); opacity: .60; }
    }
  `;
  document.head.appendChild(style);
}

/* ===============================
   Idle Neon Pulse
================================ */

function neonPulse(){
  pickMachines().forEach((m)=>{
    if(m.dataset.neonReady) return;
    m.dataset.neonReady = "1";

    if (reducedMotion) return;

    const pulse = () => {
      m.style.boxShadow =
        "0 0 26px rgba(255,35,61,.25), 0 0 26px rgba(0,255,154,.22)";
      setTimeout(()=> { m.style.boxShadow = ""; }, 600);
      setTimeout(pulse, rand(4000,9000));
    };

    setTimeout(pulse, rand(1200,2200));
  });
}

/* ===============================
   Reel Shimmer Effect
================================ */

function reelShimmer(){
  pickReels().forEach((r)=>{
    if(r.dataset.shimmerReady) return;
    r.dataset.shimmerReady = "1";

    const glow = document.createElement("div");
    glow.style.position = "absolute";
    glow.style.inset = "-40%";
    glow.style.background = "linear-gradient(120deg, transparent, rgba(255,255,255,.15), transparent)";
    glow.style.animation = reducedMotion ? "none" : "vvReelShimmer 4s linear infinite";
    glow.style.pointerEvents = "none";

    if (getComputedStyle(r).position === "static") {
      r.style.position = "relative";
    }
    r.style.overflow = "hidden";
    r.appendChild(glow);
  });
}

/* ===============================
   Jackpot Beam Spotlight
================================ */

function jackpotBeam(){
  const machines = pickMachines();
  machines.forEach((m)=>{
    if (!m.classList.contains("vip") && m !== machines[0]) return;
    if (m.dataset.beamReady === "1") return;
    m.dataset.beamReady = "1";

    const beam = document.createElement("div");
    beam.style.position = "absolute";
    beam.style.inset = "-40%";
    beam.style.background =
      "radial-gradient(circle at 50% 0%, rgba(0,255,154,.25), transparent 60%),"+
      "radial-gradient(circle at 50% 100%, rgba(255,35,61,.22), transparent 60%)";
    beam.style.animation = reducedMotion ? "none" : "vvJackpotBeam 6s linear infinite";
    beam.style.pointerEvents = "none";
    beam.style.filter = "blur(18px)";

    if (getComputedStyle(m).position === "static") {
      m.style.position = "relative";
    }
    m.appendChild(beam);
  });
}

/* ===============================
   Hover Hologram FX
================================ */

function hoverFX(){
  pickMachines().forEach((m)=>{
    if(m.dataset.hoverReady) return;
    m.dataset.hoverReady = "1";

    m.addEventListener("mouseenter", ()=>{
      if (reducedMotion) return;
      m.style.transform = "translateY(-3px) scale(1.01)";
      m.style.boxShadow =
        "0 0 32px rgba(255,35,61,.30), 0 0 32px rgba(0,255,154,.25)";
    });

    m.addEventListener("mouseleave", ()=>{
      m.style.transform = "";
      m.style.boxShadow = "";
    });
  });
}

/* ===============================
   Optional Machine Sound
================================ */

function clickSound(){
  try{
    window.VVDealerVoice?.play("slot-ready");
  }catch{}
}

/* ===============================
   INIT
================================ */

function init(){
  ensureKeyframes();
  neonPulse();
  reelShimmer();
  jackpotBeam();
  hoverFX();
  setTimeout(clickSound, 900);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

})();
