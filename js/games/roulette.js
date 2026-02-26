(() => {
  const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

  const spinBtn = document.getElementById("spinBtn");
  const clearBtn = document.getElementById("clearBtn");
  const chipSlider = document.getElementById("chipSlider");
  const layout = document.getElementById("layout");
  const dozens = document.getElementById("dozens");
  const evens = document.getElementById("evens");
  const wheelRing = document.getElementById("wheelRing");
  const ball = document.getElementById("ball");
  const walletBal = document.getElementById("walletBal");
  const log = document.getElementById("log");
  const statusEl = document.getElementById("status");
  const lastResult = document.getElementById("lastResult");
  const totalBetEl = document.getElementById("totalBet");
  const chipAmt = document.getElementById("chipAmt");

  const neighborsBtn = document.getElementById("neighborsBtn");
  const voisinsBtn = document.getElementById("voisinsBtn");
  const tiersBtn = document.getElementById("tiersBtn");
  const orphelinsBtn = document.getElementById("orphelinsBtn");
  const neighborSelect = document.getElementById("neighborSelect");
  const raceOrder = document.getElementById("raceOrder");

  if (!spinBtn || !clearBtn || !chipSlider || !layout || !dozens || !evens || !wheelRing || !ball || !walletBal || !log || !statusEl || !lastResult) {
    return;
  }

  const fallbackSubs = new Set();
  const fallbackEngine = {
    getBalance() {
      const n = Number(localStorage.getItem("vv_wallet_balance_v1"));
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 10000;
    },
    debit(amount) {
      const spend = Math.max(0, Math.floor(Number(amount) || 0));
      const cur = this.getBalance();
      if (spend <= 0 || spend > cur) return false;
      localStorage.setItem("vv_wallet_balance_v1", String(cur - spend));
      for (const fn of fallbackSubs) fn(cur - spend);
      return true;
    },
    credit(amount) {
      const win = Math.max(0, Math.floor(Number(amount) || 0));
      if (win <= 0) return false;
      const next = this.getBalance() + win;
      localStorage.setItem("vv_wallet_balance_v1", String(next));
      for (const fn of fallbackSubs) fn(next);
      return true;
    },
    subscribe(fn) {
      if (typeof fn !== "function") return () => {};
      fallbackSubs.add(fn);
      fn(this.getBalance());
      return () => fallbackSubs.delete(fn);
    },
    formatGold(n) {
      return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString()} GOLD`;
    }
  };

  const engine = window.VaultEngine && typeof window.VaultEngine.debit === "function" && typeof window.VaultEngine.credit === "function"
    ? window.VaultEngine
    : fallbackEngine;

  const bets = new Map();
  let spinning = false;
  let wheelRot = 0;
  let ballRot = 0;

  function numColor(n) {
    if (n === 0) return "green";
    return redNumbers.has(n) ? "red" : "black";
  }

  function updateWallet(balance = engine.getBalance()) {
    const formatter = typeof engine.formatGold === "function" ? engine.formatGold : fallbackEngine.formatGold;
    walletBal.textContent = formatter(balance);
  }

  function totalBet() {
    let sum = 0;
    for (const bet of bets.values()) sum += bet.amount;
    return sum;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function writeLog(text) {
    log.textContent = text;
  }

  function renderBetStacks() {
    for (const el of document.querySelectorAll(".chipStack")) el.remove();
    for (const bet of bets.values()) {
      const target = document.querySelector(`[data-bet-key="${CSS.escape(bet.key)}"]`);
      if (!target) continue;
      const stack = document.createElement("span");
      stack.className = "chipStack";
      const chips = Math.min(6, Math.max(1, Math.ceil(bet.amount / 100)));
      for (let i = 0; i < chips; i += 1) {
        const chip = document.createElement("span");
        chip.className = `chip${i % 2 === 0 ? "" : " g"}`;
        stack.appendChild(chip);
      }
      target.appendChild(stack);
    }
    if (totalBetEl) {
      totalBetEl.textContent = String(totalBet());
    }
  }

  async function placeBet(key, label, numbers, payout) {
    if (spinning) return;
    const amount = Math.max(10, Math.floor(Number(chipSlider.value) || 10));
    const debitOk = await Promise.resolve(engine.debit(amount, `roulette-bet|roundId=${Date.now()}`));
    if (!debitOk) {
      writeLog("Insufficient balance for that chip.");
      setStatus("INSUFFICIENT");
      return;
    }

    const current = bets.get(key);
    if (current) {
      current.amount += amount;
    } else {
      bets.set(key, { key, label, numbers, payout, amount });
    }

    renderBetStacks();
    updateWallet();
    setStatus("READY");
    writeLog(`Placed ${amount} on ${label}.`);
  }

  function clearBets(logMessage = true) {
    bets.clear();
    renderBetStacks();
    if (logMessage) writeLog("Bets cleared.");
  }

  function makeCell(label, cls, key, numbers, payout) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cls;
    btn.textContent = label;
    btn.dataset.betKey = key;
    btn.addEventListener("click", () => placeBet(key, label, numbers, payout));
    return btn;
  }

  function buildLayout() {
    layout.innerHTML = "";

    const zero = makeCell("0", "cell nGreen", "n-0", [0], 35);
    zero.style.gridRow = "1 / span 3";
    zero.style.gridColumn = "1";
    layout.appendChild(zero);

    for (let col = 0; col < 12; col += 1) {
      const n3 = col * 3 + 3;
      const n2 = col * 3 + 2;
      const n1 = col * 3 + 1;

      const c1 = makeCell(String(n3), `cell ${redNumbers.has(n3) ? "nRed" : "nBlack"}`, `n-${n3}`, [n3], 35);
      c1.style.gridRow = "1";
      c1.style.gridColumn = String(2 + col);
      layout.appendChild(c1);

      const c2 = makeCell(String(n2), `cell ${redNumbers.has(n2) ? "nRed" : "nBlack"}`, `n-${n2}`, [n2], 35);
      c2.style.gridRow = "2";
      c2.style.gridColumn = String(2 + col);
      layout.appendChild(c2);

      const c3 = makeCell(String(n1), `cell ${redNumbers.has(n1) ? "nRed" : "nBlack"}`, `n-${n1}`, [n1], 35);
      c3.style.gridRow = "3";
      c3.style.gridColumn = String(2 + col);
      layout.appendChild(c3);
    }

    dozens.innerHTML = "";
    dozens.appendChild(makeCell("1st 12", "cell", "dz-1", Array.from({ length: 12 }, (_, i) => i + 1), 2));
    dozens.appendChild(makeCell("2nd 12", "cell", "dz-2", Array.from({ length: 12 }, (_, i) => i + 13), 2));
    dozens.appendChild(makeCell("3rd 12", "cell", "dz-3", Array.from({ length: 12 }, (_, i) => i + 25), 2));

    evens.innerHTML = "";
    evens.appendChild(makeCell("1-18", "cell", "half-low", Array.from({ length: 18 }, (_, i) => i + 1), 1));
    evens.appendChild(makeCell("Even", "cell", "even", Array.from({ length: 18 }, (_, i) => (i + 1) * 2), 1));
    evens.appendChild(makeCell("Red", "cell nRed", "red", [...redNumbers], 1));
    evens.appendChild(makeCell("Black", "cell nBlack", "black", Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !redNumbers.has(n)), 1));
    evens.appendChild(makeCell("Odd", "cell", "odd", Array.from({ length: 18 }, (_, i) => i * 2 + 1), 1));
    evens.appendChild(makeCell("19-36", "cell", "half-high", Array.from({ length: 18 }, (_, i) => i + 19), 1));
  }

  function buildRaceTrack() {
    if (raceOrder) {
      raceOrder.innerHTML = "";
      for (const n of wheelOrder) {
        const token = document.createElement("span");
        token.className = `num ${n === 0 ? "g" : redNumbers.has(n) ? "r" : "b"}`;
        token.textContent = String(n);
        raceOrder.appendChild(token);
      }
    }

    if (neighborSelect) {
      neighborSelect.innerHTML = "";
      for (const n of wheelOrder) {
        const opt = document.createElement("option");
        opt.value = String(n);
        opt.textContent = String(n);
        neighborSelect.appendChild(opt);
      }
      neighborSelect.value = "0";
    }

    voisinsBtn?.addEventListener("click", () => {
      placeBet("rt-voisins", "Voisins", [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25], 2);
    });

    tiersBtn?.addEventListener("click", () => {
      placeBet("rt-tiers", "Tiers", [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33], 2);
    });

    orphelinsBtn?.addEventListener("click", () => {
      placeBet("rt-orphelins", "Orphelins", [1, 20, 14, 31, 9, 17, 34, 6], 2);
    });

    neighborsBtn?.addEventListener("click", () => {
      if (!neighborSelect) return;
      const center = Number(neighborSelect.value);
      const idx = wheelOrder.indexOf(center);
      if (idx < 0) return;
      const picks = [];
      for (let i = -2; i <= 2; i += 1) {
        picks.push(wheelOrder[(idx + i + wheelOrder.length) % wheelOrder.length]);
      }
      placeBet(`rt-neighbors-${center}`, `Neighbours ${center}`, picks, 5);
    });
  }

  function animateSpin(winNumber) {
    const index = wheelOrder.indexOf(winNumber);
    const pocket = index < 0 ? 0 : index;
    const anglePerPocket = 360 / wheelOrder.length;
    const targetAngle = 360 - pocket * anglePerPocket;

    wheelRot += 2160 + Math.random() * 160 + targetAngle;
    ballRot -= 2520 + Math.random() * 180 + targetAngle;

    wheelRing.style.setProperty("--wheelDur", "4600ms");
    ball.style.setProperty("--ballDur", "4600ms");
    wheelRing.style.setProperty("--wheelRot", `${wheelRot}deg`);
    ball.style.setProperty("--a", `${ballRot}deg`);
  }

  function evaluate(winNumber) {
    let payout = 0;
    for (const bet of bets.values()) {
      if (bet.numbers.includes(winNumber)) {
        payout += bet.amount * (bet.payout + 1);
      }
    }
    return payout;
  }

  async function spin() {
    if (spinning) return;
    if (bets.size === 0) {
      setStatus("NO BETS");
      writeLog("Place at least one bet before spinning.");
      return;
    }

    spinning = true;
    spinBtn.disabled = true;
    clearBtn.disabled = true;
    setStatus("SPINNING");

    const winNumber = Math.floor(Math.random() * 37);
    animateSpin(winNumber);

    window.setTimeout(async () => {
      const payout = evaluate(winNumber);
      const roundId = `round_${Date.now()}`;

      if (payout > 0) {
        await Promise.resolve(engine.credit(payout, `roulette-payout|roundId=${roundId}`));
      }

      const color = numColor(winNumber);
      lastResult.textContent = `${winNumber} (${color.toUpperCase()})`;
      setStatus(payout > 0 ? "WIN" : "LOSS");
      writeLog(payout > 0 ? `Number ${winNumber} hit. Payout: ${payout}.` : `Number ${winNumber} hit. No win this spin.`);
      clearBets(false);
      updateWallet();

      spinning = false;
      spinBtn.disabled = false;
      clearBtn.disabled = false;
      if (statusEl.textContent !== "READY") {
        window.setTimeout(() => setStatus("READY"), 1000);
      }
    }, 4700);
  }

  chipSlider.addEventListener("input", () => {
    const amount = Math.max(10, Math.floor(Number(chipSlider.value) || 10));
    if (chipAmt) chipAmt.textContent = String(amount);
  });

  spinBtn.addEventListener("click", spin);
  clearBtn.addEventListener("click", () => clearBets(true));

  buildLayout();
  buildRaceTrack();
  renderBetStacks();
  updateWallet();

  if (typeof engine.subscribe === "function") {
    engine.subscribe((balance) => updateWallet(balance));
  }
})();
