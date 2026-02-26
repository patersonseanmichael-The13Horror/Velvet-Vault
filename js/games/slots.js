(function slotsInit(){
  const requiredIds = [
    "balance","result","betLabel","lineBetLabel","multLabel","autoLabel",
    "spinBtn","betUp","betDown","maxBtn","autoBtn","stopBtn","autoCount",
    "col1","col2","col3","lineTop","lineMid","lineBot",
    "c1r1","c1r2","c1r3","c2r1","c2r2","c2r3","c3r1","c3r2","c3r3",
    "bonusModal","bonusCards","bonusClose","bonusLineName","bonusLineBet","bonusResult"
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.warn("[Slots] Missing elements, skipping init:", missing.join(", "));
    return;
  }

// --- UI hooks ---
  const balanceEl = document.getElementById("balance");
  const resultEl  = document.getElementById("result");
  const betLabel  = document.getElementById("betLabel");
  const lineBetLabel = document.getElementById("lineBetLabel");
  const multLabel = document.getElementById("multLabel");
  const autoLabel = document.getElementById("autoLabel");

  const spinBtn = document.getElementById("spinBtn");
  const betUp   = document.getElementById("betUp");
  const betDown = document.getElementById("betDown");
  const maxBtn  = document.getElementById("maxBtn");

  const autoBtn = document.getElementById("autoBtn");
  const stopBtn = document.getElementById("stopBtn");
  const autoCount = document.getElementById("autoCount");

  const col1 = document.getElementById("col1");
  const col2 = document.getElementById("col2");
  const col3 = document.getElementById("col3");

  const lineTop = document.getElementById("lineTop");
  const lineMid = document.getElementById("lineMid");
  const lineBot = document.getElementById("lineBot");

  // cells (3x3)
  const cells = {
    top: [document.getElementById("c1r1"), document.getElementById("c2r1"), document.getElementById("c3r1")],
    mid: [document.getElementById("c1r2"), document.getElementById("c2r2"), document.getElementById("c3r2")],
    bot: [document.getElementById("c1r3"), document.getElementById("c2r3"), document.getElementById("c3r3")]
  };

  // Bonus modal hooks
  const bonusModal = document.getElementById("bonusModal");
  const bonusCards = document.getElementById("bonusCards");
  const bonusClose = document.getElementById("bonusClose");
  const bonusLineName = document.getElementById("bonusLineName");
  const bonusLineBet = document.getElementById("bonusLineBet");
  const bonusResult = document.getElementById("bonusResult");

  // --- Game config ---
  const SYMBOLS = ["◆","♛","★","✦","✶","✷"];
  let BET = 150;
  const MIN_BET = 150;    // multiples of 3 so line bet is clean
  const MAX_BET = 1500;

  let spinning = false;
  let autoTimer = null;
  let autoLeft = 0;

  function lineBet(){
    return Math.floor(BET / 3);
  }

  function renderWallet(){
    if(!window.VaultEngine?.user) return;
    balanceEl.textContent = window.VaultEngine.formatGold(window.VaultEngine.getBalance());
  }

  function setBet(n){
    // keep bet divisible by 3 for line-bet clarity
    n = Math.max(MIN_BET, Math.min(MAX_BET, n));
    n = n - (n % 3);
    BET = n;
    betLabel.textContent = BET;
    lineBetLabel.textContent = lineBet();
  }

  function randSym(){
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function setPaylineWins(which){
    // reset
    [lineTop,lineMid,lineBot].forEach(l => l.classList.remove("win"));
    if(which === "top") lineTop.classList.add("win");
    if(which === "mid") lineMid.classList.add("win");
    if(which === "bot") lineBot.classList.add("win");
    if(!which) return;
    // fade highlight
    setTimeout(() => [lineTop,lineMid,lineBot].forEach(l => l.classList.remove("win")), 1200);
  }

  // Multipliers per line
  function multiplierForLine(a,b,c){
    if(a==="★" && b==="★" && c==="★") return 25;
    if(a==="♛" && b==="♛" && c==="♛") return 15;
    if(a===b && b===c) return 8;
    if(a===b || a===c || b===c) return 2;
    return 0;
  }

  // Bonus trigger: exactly two stars on a line (and not 3)
  function isTwoStarBonus(a,b,c){
    const stars = [a,b,c].filter(x => x==="★").length;
    return stars === 2;
  }

  function startSpinAnim(){
    [col1,col2,col3].forEach(c => c.classList.add("spinning"));
  }
  function stopSpinAnim(){
    [col1,col2,col3].forEach(c => c.classList.remove("spinning"));
  }

  function flickerOnce(){
    // flicker all cells
    for(const row of ["top","mid","bot"]){
      for(let i=0;i<3;i++){
        cells[row][i].textContent = randSym();
      }
    }
  }

  function setFinalGrid(grid){
    // grid: { top:[a,b,c], mid:[a,b,c], bot:[a,b,c] }
    for(const row of ["top","mid","bot"]){
      for(let i=0;i<3;i++){
        cells[row][i].textContent = grid[row][i];
      }
    }
  }

  function randomGrid(){
    return {
      top: [randSym(), randSym(), randSym()],
      mid: [randSym(), randSym(), randSym()],
      bot: [randSym(), randSym(), randSym()]
    };
  }

  function disableControls(disabled){
    spinBtn.disabled = disabled;
    betUp.disabled = disabled;
    betDown.disabled = disabled;
    maxBtn.disabled = disabled;
    autoBtn.disabled = disabled;
  }

  function disableBetControls(disabled){
    betUp.disabled = disabled;
    betDown.disabled = disabled;
    maxBtn.disabled = disabled;
  }

  // BONUS ROUND
  function openBonus(lineName, lb, applyBonus){
    bonusLineName.textContent = lineName.toUpperCase();
    bonusLineBet.textContent = lb;
    bonusResult.textContent = "Pick a card…";
    bonusCards.innerHTML = "";

    // multipliers to hide
    const mults = [2,3,5,8];
    // shuffle and pick 3 hidden values (still fair enough for vibe)
    mults.sort(() => Math.random() - 0.5);
    const hidden = [mults[0], mults[1], mults[2]];

    let picked = false;

    hidden.forEach((m, idx) => {
      const el = document.createElement("div");
      el.className = "pick";
      el.innerHTML = `<b>Card ${idx+1}</b><span>?</span>`;
      el.addEventListener("click", () => {
        if(picked) return;
        picked = true;
        el.innerHTML = `<b>Revealed</b><span>×${m}</span>`;
        const win = lb * m;
        applyBonus(win, m);
        // reveal others
        [...bonusCards.children].forEach((cEl, i) => {
          if(i !== idx){
            cEl.innerHTML = `<b>Hidden</b><span>×${hidden[i]}</span>`;
            cEl.style.opacity = "0.7";
          }
        });
      });
      bonusCards.appendChild(el);
    });

    bonusModal.classList.add("show");
    bonusModal.setAttribute("aria-hidden","false");
  }

  function closeBonus(){
    bonusModal.classList.remove("show");
    bonusModal.setAttribute("aria-hidden","true");
  }
  bonusClose.addEventListener("click", closeBonus);
  bonusModal.addEventListener("click", (e) => { if(e.target === bonusModal) closeBonus(); });

  async function spinOnce(){
    if(spinning) return;

    if(!window.VaultEngine?.user){
      resultEl.textContent = "Connecting to the vault…";
      return;
    }

    const bal = window.VaultEngine.getBalance();
    if(bal < BET){
      resultEl.innerHTML = `Insufficient funds. Wallet: <b>${window.VaultEngine.formatGold(bal)}</b>`;
      stopAuto("Low funds");
      return;
    }

    // Debit once per spin
    const ok = window.VaultEngine.debit(BET, "slots-bet");
    if(!ok){
      resultEl.textContent = "Debit failed.";
      stopAuto("Debit failed");
      return;
    }

    spinning = true;
    disableControls(true);
    stopBtn.disabled = false;
    disableBetControls(true);

    resultEl.textContent = "Spinning…";
    multLabel.textContent = "—";
    setPaylineWins(null);

    startSpinAnim();

    const flicker = setInterval(flickerOnce, 70);
    await new Promise(res => setTimeout(res, 1300));
    clearInterval(flicker);

    const grid = randomGrid();
    setFinalGrid(grid);

    stopSpinAnim();

    // Evaluate paylines
    const lb = lineBet();
    let totalWin = 0;
    let bestMult = 0;
    let bestLine = null;

    const lines = [
      { name:"top",  vals: grid.top,  el:"top" },
      { name:"mid",  vals: grid.mid,  el:"mid" },
      { name:"bot",  vals: grid.bot,  el:"bot" }
    ];

    // check wins + bonus triggers
    const bonuses = [];

    for(const ln of lines){
      const [a,b,c] = ln.vals;
      const mult = multiplierForLine(a,b,c);
      if(mult > 0){
        const win = lb * mult;
        totalWin += win;
        if(mult > bestMult){
          bestMult = mult;
          bestLine = ln.name;
        }
      }
      if(isTwoStarBonus(a,b,c)){
        bonuses.push({ line: ln.name, lb });
      }
    }

    if(bestLine) setPaylineWins(bestLine);

    multLabel.textContent = bestMult ? `×${bestMult}` : "0";

    if(totalWin > 0){
      window.VaultEngine.credit(totalWin, "slots-win");
      resultEl.innerHTML = `WIN: <b>${totalWin} GOLD</b> — paylines paid out.`;
    }else{
      resultEl.textContent = "No hit. The night stays hungry.";
    }

    spinning = false;
    disableControls(false);
    stopBtn.disabled = autoLeft <= 0; // stop button only useful in auto mode
    disableBetControls(false);

    // BONUS ROUND (if any line has exactly 2 stars)
    // If multiple bonuses, do one bonus per spin: choose one at random for vibe.
    if(bonuses.length){
      const pick = bonuses[Math.floor(Math.random() * bonuses.length)];
      openBonus(pick.line, pick.lb, (bonusWin, bonusMult) => {
        window.VaultEngine.credit(bonusWin, `slots-bonus-${pick.line}-x${bonusMult}`);
        bonusResult.innerHTML = `BONUS WIN: <b>${bonusWin} GOLD</b> (×${bonusMult}) — credited to wallet.`;
        resultEl.innerHTML = `BONUS TRIGGERED on <b>${pick.line.toUpperCase()}</b> line — check payout.`;
        // auto close after a moment (keeps flow)
        setTimeout(closeBonus, 1600);
      });
    }

    // Auto loop
    if(autoLeft > 0){
      autoLeft--;
      autoLabel.textContent = `${autoLeft} LEFT`;
      if(autoLeft <= 0){
        stopAuto("Auto complete");
      }else{
        // small pacing pause
        autoTimer = setTimeout(spinOnce, 650);
      }
    }
  }

  function startAuto(){
    if(spinning) return;
    autoLeft = Number(autoCount.value || 10);
    if(!autoLeft || autoLeft < 1) autoLeft = 10;
    autoLabel.textContent = `${autoLeft} LEFT`;
    stopBtn.disabled = false;
    // kick first spin
    spinOnce();
  }

  function stopAuto(reason){
    if(autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    autoLeft = 0;
    autoLabel.textContent = "OFF";
    stopBtn.disabled = true;
    if(reason){
      // keep it subtle
      // resultEl.textContent = `Auto stopped: ${reason}`;
    }
  }

  // Controls
  betUp.onclick = () => setBet(BET + 150);
  betDown.onclick = () => setBet(BET - 150);
  maxBtn.onclick = () => setBet(MAX_BET);
  spinBtn.onclick = () => spinOnce();

  autoBtn.onclick = () => startAuto();
  stopBtn.onclick = () => stopAuto("Stopped");

  // Subscribe to wallet updates
  const wait = setInterval(() => {
    if(window.VaultEngine){
      clearInterval(wait);
      window.VaultEngine.subscribe(renderWallet);
      renderWallet();
      setBet(BET);
    }
  }, 100);
})();
