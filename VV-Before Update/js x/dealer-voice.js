/* =========================================
   VELVET VAULT — Dealer Voice Lines (Safe)
   - No autoplay: arms after first user click
   - Uses <audio> files if present
   - Falls back to tiny WebAudio beeps if missing
   - One global API: window.VVDealerVoice
   ========================================= */

(function () {
  "use strict";
  if (window.__VV_DEALER_VOICE_INIT__) return;
  window.__VV_DEALER_VOICE_INIT__ = true;

  const BASE = "audio/dealer/";
  const MAP = {
    welcome: "welcome.mp3",
    placeBet: "place-bets.mp3",
    noMore: "no-more-bets.mp3",
    spin: "spin.mp3",
    winSmall: "win-small.mp3",
    winBig: "win-big.mp3",
    lose: "lose.mp3",
    bjShuffle: "bj-shuffle.mp3",
    bjHit: "bj-hit.mp3",
    bjStand: "bj-stand.mp3",
    bjBust: "bj-bust.mp3",
    bjBlackjack: "bj-blackjack.mp3",
    pokerDeal: "poker-deal.mp3",
    pokerRaise: "poker-raise.mp3",
    pokerFold: "poker-fold.mp3",
    pokerShow: "poker-showdown.mp3",
    slotsSpin: "slots-spin.mp3",
    slotsWin: "slots-win.mp3"
  };
  const ENABLE_FILE_AUDIO = localStorage.getItem("vv_enable_dealer_audio_files") === "1";

  let armed = false;
  let welcomed = false;
  let volume = 0.55;
  let cooldownMs = 450;
  let lastPlayAt = 0;
  let lineTimer = 0;

  let AC = null;
  function ensureAC() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume().catch(() => {});
  }

  function beep(freq = 440, ms = 70, type = "sine", gain = 0.05) {
    if (!armed) return;
    try {
      ensureAC();
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain * volume;
      o.connect(g);
      g.connect(AC.destination);
      o.start();
      setTimeout(() => o.stop(), ms);
    } catch {}
  }

  function fx(tag) {
    switch (tag) {
      case "welcome": beep(520, 70, "sine", 0.05); setTimeout(() => beep(660, 90, "sine", 0.06), 90); break;
      case "placeBet": beep(480, 60, "triangle", 0.05); break;
      case "noMore": beep(210, 80, "square", 0.04); break;
      case "spin": beep(600, 40, "sine", 0.04); setTimeout(() => beep(720, 40, "sine", 0.04), 60); break;
      case "winBig": beep(740, 80, "sine", 0.06); setTimeout(() => beep(990, 110, "sine", 0.07), 90); break;
      case "winSmall": beep(660, 70, "sine", 0.05); break;
      case "lose": beep(160, 110, "triangle", 0.05); break;
      case "bjHit": beep(520, 45, "square", 0.03); break;
      case "bjStand": beep(420, 70, "triangle", 0.04); break;
      case "bjBust": beep(140, 120, "triangle", 0.06); break;
      case "bjBlackjack": beep(820, 70, "sine", 0.06); setTimeout(() => beep(1040, 100, "sine", 0.07), 85); break;
      case "pokerDeal": beep(500, 40, "square", 0.025); break;
      case "pokerRaise": beep(620, 60, "sine", 0.04); break;
      case "pokerFold": beep(240, 70, "triangle", 0.035); break;
      case "pokerShow": beep(680, 70, "sine", 0.05); break;
      case "slotsSpin": beep(560, 35, "square", 0.025); break;
      case "slotsWin": beep(720, 60, "sine", 0.05); setTimeout(() => beep(880, 80, "sine", 0.06), 70); break;
      default: beep(440, 60, "sine", 0.04);
    }
  }

  const pool = new Map();
  const broken = new Set();

  function getAudio(key) {
    if (!ENABLE_FILE_AUDIO) return null;
    const filename = MAP[key];
    if (!filename || broken.has(key)) return null;

    if (pool.has(key)) return pool.get(key);

    const a = new Audio(BASE + filename);
    a.preload = "auto";
    a.volume = volume;
    a.addEventListener("error", () => broken.add(key), { once: true });
    pool.set(key, a);
    return a;
  }

  async function play(key, opts = {}) {
    if (!armed) return;
    const now = Date.now();
    if (now - lastPlayAt < (opts.cooldownMs ?? cooldownMs)) return;
    lastPlayAt = now;

    const a = getAudio(key);
    if (!a) {
      fx(key);
      return;
    }

    try {
      a.pause();
      a.currentTime = 0;
      a.volume = opts.volume ?? volume;
      await a.play();
    } catch {
      fx(key);
    }
  }

  function arm() {
    if (armed) return;
    armed = true;
    try { ensureAC(); } catch {}
  }

  window.addEventListener("pointerdown", arm, { once: true, passive: true });
  window.addEventListener("keydown", arm, { once: true });

  function ensureLineNode() {
    let line = document.getElementById("vvDealerLine");
    if (line) return line;
    line = document.createElement("div");
    line.id = "vvDealerLine";
    line.className = "vvDealerLine";
    document.body.appendChild(line);
    return line;
  }

  function showLine(text, tone = "") {
    const line = ensureLineNode();
    line.textContent = text;
    line.classList.remove("tone-win", "tone-alert");
    if (tone === "win") line.classList.add("tone-win");
    if (tone === "alert") line.classList.add("tone-alert");
    line.classList.add("is-visible");
    clearTimeout(lineTimer);
    lineTimer = setTimeout(() => line.classList.remove("is-visible"), 1700);
  }

  window.VVDealerVoice = {
    arm,
    play,
    showLine,
    setVolume(v) {
      volume = Math.max(0, Math.min(1, Number(v)));
      for (const a of pool.values()) a.volume = volume;
    },
    getVolume() { return volume; },
    setCooldown(ms) { cooldownMs = Math.max(0, Number(ms) || 0); },
    isArmed() { return armed; }
  };

  function playWelcomeOnce() {
    if (welcomed) return;
    welcomed = true;
    showLine("Dealer online. Place your bets.");
    play("welcome", { cooldownMs: 0 });
  }

  function watchText(node, onChange) {
    if (!node) return;
    let last = "";
    const run = () => {
      const next = (node.textContent || "").trim();
      if (!next || next === last) return;
      last = next;
      onChange(next);
    };
    run();
    const obs = new MutationObserver(run);
    obs.observe(node, { childList: true, subtree: true, characterData: true });
  }

  function bindRoulette() {
    const spinBtn = document.getElementById("spinBtn");
    const wheel = document.getElementById("wheelRing");
    if (!spinBtn || !wheel) return;

    spinBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("No more bets.", "alert");
      play("noMore", { cooldownMs: 120 });
      setTimeout(() => play("spin", { cooldownMs: 120 }), 120);
    });

    const clearBtn = document.getElementById("clearBtn");
    clearBtn?.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Place your bets.");
      play("placeBet", { cooldownMs: 120 });
    });

    const log = document.getElementById("log");
    watchText(log, (text) => {
      const t = text.toLowerCase();
      if (t.includes("you win")) {
        const m = text.replace(/,/g, "").match(/(\d+)\s+GOLD/i);
        const amount = m ? Number(m[1]) : 0;
        showLine(amount >= 1800 ? "Big winner." : "Winning spin.", "win");
        play(amount >= 1800 ? "winBig" : "winSmall", { cooldownMs: 180 });
      } else if (t.includes("dealer takes it")) {
        showLine("House wins this round.", "alert");
        play("lose", { cooldownMs: 180 });
      } else if (t.includes("no more bets")) {
        showLine("No more bets.", "alert");
        play("noMore", { cooldownMs: 180 });
      }
    });
  }

  function bindBlackjack() {
    const dealBtn = document.getElementById("dealBtn");
    const hitBtn = document.getElementById("hitBtn");
    if (!dealBtn || !hitBtn) return;

    dealBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Shuffling and dealing.");
      play("bjShuffle", { cooldownMs: 140 });
    });

    hitBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Hit me.");
      play("bjHit", { cooldownMs: 120 });
    });

    document.getElementById("standBtn")?.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Player stands.");
      play("bjStand", { cooldownMs: 120 });
    });

    document.getElementById("doubleBtn")?.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Double down.", "alert");
      play("placeBet", { cooldownMs: 120 });
    });

    document.getElementById("foldBtn")?.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Surrender.", "alert");
      play("lose", { cooldownMs: 120 });
    });

    const log = document.getElementById("log");
    watchText(log, (text) => {
      const t = text.toLowerCase();
      if (t.includes("blackjack")) {
        showLine("Blackjack.", "win");
        play("bjBlackjack", { cooldownMs: 200 });
      } else if (t.includes("bust")) {
        showLine("Bust.", "alert");
        play("bjBust", { cooldownMs: 200 });
      } else if (t.includes("result: win") || t.includes("result: blackjack")) {
        showLine("Player wins.", "win");
        play("winSmall", { cooldownMs: 180 });
      } else if (t.includes("result: lose")) {
        showLine("Dealer takes it.", "alert");
        play("lose", { cooldownMs: 180 });
      }
    });
  }

  function bindPoker() {
    const dealBtn = document.getElementById("dealBtn");
    const raiseBtn = document.getElementById("raiseBtn");
    const foldBtn = document.getElementById("foldBtn");
    const board = document.getElementById("board");
    if (!dealBtn || !raiseBtn || !foldBtn || !board) return;

    dealBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Cards in the air.");
      play("pokerDeal", { cooldownMs: 120 });
    });

    raiseBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Raise accepted.");
      play("pokerRaise", { cooldownMs: 120 });
    });

    foldBtn.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Fold.", "alert");
      play("pokerFold", { cooldownMs: 120 });
    });

    document.getElementById("callBtn")?.addEventListener("click", () => {
      playWelcomeOnce();
      showLine("Call.");
      play("placeBet", { cooldownMs: 120 });
    });

    const log = document.getElementById("log");
    watchText(log, (text) => {
      const t = text.toLowerCase();
      if (t.includes("wins")) {
        const youWon = /\byou\b/i.test(text);
        showLine(youWon ? "You win the hand." : "Showdown complete.", youWon ? "win" : "alert");
        play("pokerShow", { cooldownMs: 180 });
        setTimeout(() => play(youWon ? "winBig" : "lose", { cooldownMs: 0 }), 130);
      }
    });
  }

  function wirePageVoices() {
    bindRoulette();
    bindBlackjack();
    bindPoker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wirePageVoices, { once: true });
  } else {
    wirePageVoices();
  }
})();
