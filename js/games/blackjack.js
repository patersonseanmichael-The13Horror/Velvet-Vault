(function blackjackInit(){
  const requiredIds = [
    "walletBal","dealerHand","playerHand","dealerScore","playerScore",
    "betHud","toCallHud","statusHud","pot","dealBtn","hitBtn","standBtn",
    "doubleBtn","foldBtn","resetBtn","betSlider","betAmt","log","chipRack",
    "s1","handL","handR"
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.warn("[Blackjack] Missing elements, skipping init:", missing.join(", "));
    return;
  }

  /* =========================
     🔊 SOUND (WebAudio)
     ========================= */
  let AC = null;
  function audioOn(){
    if(!AC){
      AC = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(AC.state === "suspended") AC.resume();
  }
  function beep(freq=440, ms=70, type="sine", gain=0.06){
    if(!AC) return;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(AC.destination);
    o.start();
    setTimeout(()=>{ o.stop(); }, ms);
  }
  function chime(){
    beep(660,70,"sine",0.05);
    setTimeout(()=>beep(880,80,"sine",0.05), 80);
  }
  function thud(){
    beep(140,90,"triangle",0.06);
  }
  function swipe(){
    beep(320,45,"square",0.02);
    setTimeout(()=>beep(240,55,"square",0.02), 55);
  }

  /* =========================
     💳 WALLET UI
     ========================= */
  const walletBalEl = document.getElementById("walletBal");
  function renderWallet(){
    if(!window.VaultEngine?.user) return;
    walletBalEl.textContent = window.VaultEngine.formatGold(window.VaultEngine.getBalance());
  }
  const wWait = setInterval(() => {
    if(window.VaultEngine){
      clearInterval(wWait);
      window.VaultEngine.subscribe(renderWallet);
      renderWallet();
    }
  }, 100);

  /* =========================
     🎛 ELEMENTS
     ========================= */
  const dealerHandEl = document.getElementById("dealerHand");
  const playerHandEl = document.getElementById("playerHand");
  const dealerScoreEl = document.getElementById("dealerScore");
  const playerScoreEl = document.getElementById("playerScore");

  const betHud = document.getElementById("betHud");
  const toCallHud = document.getElementById("toCallHud");
  const statusHud = document.getElementById("statusHud");
  const potEl = document.getElementById("pot");

  const dealBtn = document.getElementById("dealBtn");
  const hitBtn = document.getElementById("hitBtn");
  const standBtn = document.getElementById("standBtn");
  const doubleBtn = document.getElementById("doubleBtn");
  const foldBtn = document.getElementById("foldBtn");
  const resetBtn = document.getElementById("resetBtn");

  const betSlider = document.getElementById("betSlider");
  const betAmtEl = document.getElementById("betAmt");
  const logEl = document.getElementById("log");

  const chipRack = document.getElementById("chipRack");
  const seatYou = document.getElementById("s1");

  const handL = document.getElementById("handL");
  const handR = document.getElementById("handR");

/* =========================
   🃏 CARDS
   ========================= */
const SUITS = [
  { sym:"♦", cls:"redC" },
  { sym:"♥", cls:"redC" },
  { sym:"♠", cls:"blkC" },
  { sym:"♣", cls:"blkC" }
];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function cardValue(rank){
  if(rank === "A") return 11;
  if(rank === "K" || rank === "Q" || rank === "J") return 10;
  return Number(rank);
}
function drawCard(){
  const suit = SUITS[Math.floor(Math.random()*SUITS.length)];
  const rank = RANKS[Math.floor(Math.random()*RANKS.length)];
  return { rank, suitSym: suit.sym, cls: suit.cls };
}
function scoreHand(hand){
  let total = 0, aces = 0;
  for(const c of hand){
    total += cardValue(c.rank);
    if(c.rank === "A") aces++;
  }
  while(total > 21 && aces > 0){
    total -= 10; // count one Ace as 1
    aces--;
  }
  return total;
}
function isBlackjack(hand){
  return hand.length === 2 && scoreHand(hand) === 21;
}
function isSoft(hand){
  // soft if contains Ace and total <=21 before reduction
  let total = 0, aces = 0;
  for(const c of hand){ total += cardValue(c.rank); if(c.rank==="A") aces++; }
  return aces > 0 && total <= 21;
}

/* =========================
   🎴 RENDER
   ========================= */
function renderCard(el, card, faceDown=false){
  const div = document.createElement("div");
  div.className = "card" + (faceDown ? " back" : "");
  if(!faceDown){
    div.innerHTML = `
      <div class="corner ${card.cls}">${card.rank}<span class="suit">${card.suitSym}</span></div>
      <div class="pip ${card.cls}">${card.suitSym}</div>
    `;
  }
  el.appendChild(div);
}
function clearHandsUI(){
  dealerHandEl.innerHTML = "";
  playerHandEl.innerHTML = "";
  dealerScoreEl.textContent = "—";
  playerScoreEl.textContent = "—";
}
function setStatus(s){ statusHud.textContent = s; }
function uiNumbers(){
  betHud.textContent = bet;
  betAmtEl.textContent = bet;
  toCallHud.textContent = toCall;
  potEl.textContent = pot;
}

/* =========================
   🪙 CHIPS
   ========================= */
function chipBurst(fromEl, toEl, count=8){
  const stage = document.querySelector(".stage");
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const startX = (a.left + a.width/2) - s.left;
  const startY = (a.top + a.height/2) - s.top;
  const endX   = (b.left + b.width/2) - s.left;
  const endY   = (b.top + b.height/2) - s.top;

  for(let i=0;i<count;i++){
    const chip = document.createElement("div");
    chip.className = "chipFly " + (Math.random() > 0.5 ? "g" : "");
    chip.style.left = (startX + (Math.random()*20 - 10)) + "px";
    chip.style.top  = (startY + (Math.random()*20 - 10)) + "px";
    const dx = (endX - startX) + (Math.random()*20 - 10);
    const dy = (endY - startY) + (Math.random()*20 - 10);
    chip.style.setProperty("--dx", dx + "px");
    chip.style.setProperty("--dy", dy + "px");
    stage.appendChild(chip);
    setTimeout(()=>chip.remove(), 720);
  }
}

/* =========================
   🧠 AI TABLE (visual only)
   Vegas-style: aggressive betting vibes.
   They don't affect your hand outcomes,
   but they animate chips + talk in log.
   ========================= */
const aiNames = ["VIP-1", "VIP-2", "VIP-3", "VIP-4"];
function aiRoundVibe(stageName){
  // 0-2 AIs "bet" for vibe
  const n = Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){
    const who = aiNames[Math.floor(Math.random()*aiNames.length)];
    const amt = Math.floor(50 + Math.random()*450);
    setTimeout(()=>{
      logEl.innerHTML += `<br><b>${who}</b> ${stageName}: bet <b>${amt}</b>.`;
      // send chips from random seat to pot
      const seatEl = document.getElementById(["s2","s3","s5","s6"][Math.floor(Math.random()*4)]);
      chipBurst(seatEl, chipRack, 6);
      beep(220 + Math.random()*60, 55, "triangle", 0.03);
    }, 140*i);
  }
}

/* =========================
   🤵 DEALER ANIMATION
   ========================= */
function dealerSweep(){
  handL.classList.remove("dealSweep");
  handR.classList.remove("dealSweep");
  // force reflow
  void handL.offsetWidth;
  handL.classList.add("dealSweep");
  handR.classList.add("dealSweep");
  swipe();
}

/* =========================
   💰 WALLET HELPERS
   ========================= */
function requireWallet(){
  if(!window.VaultEngine?.user){
    logEl.textContent = "Connecting to the vault…";
    return false;
  }
  return true;
}
function debit(amount, note){
  if(!requireWallet()) return false;
  const ok = window.VaultEngine.debit(amount, note);
  if(!ok){
    const bal = window.VaultEngine.getBalance?.() ?? 0;
    logEl.innerHTML = `Insufficient funds. Wallet: <b>${window.VaultEngine.formatGold(bal)}</b>`;
    thud();
    return false;
  }
  return true;
}
function credit(amount, note){
  if(!window.VaultEngine?.user) return;
  window.VaultEngine.credit(amount, note);
}

/* =========================
   🎰 GAME STATE
   ========================= */
let bet = 100;
let toCall = 0;       // in blackjack: used as "current bet" for UI
let pot = 0;          // table pot (your bet + vibe chips)
let inRound = false;

let dealerHand = [];
let playerHand = [];
let dealerHoleHidden = true;
let surrendered = false;

function setButtons(){
  hitBtn.disabled = !inRound;
  standBtn.disabled = !inRound;
  doubleBtn.disabled = !inRound || playerHand.length !== 2;
  foldBtn.disabled = !inRound; // surrender
}
function updateScores(){
  playerScoreEl.textContent = String(scoreHand(playerHand));
  if(dealerHoleHidden) dealerScoreEl.textContent = "—";
  else dealerScoreEl.textContent = String(scoreHand(dealerHand));
}

/* =========================
   🏁 ROUND LOGIC
   Dealer stands on soft 17 (S17)
   ========================= */
async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function dealerPlay(){
  dealerHoleHidden = false;
  // re-render dealer to reveal
  dealerHandEl.innerHTML = "";
  dealerHand.forEach(c => renderCard(dealerHandEl, c, false));
  updateScores();
  chime();
  await sleep(380);

  while(true){
    const d = scoreHand(dealerHand);
    const soft = isSoft(dealerHand);

    // S17: stand on soft 17
    if(d > 17) break;
    if(d === 17 && soft) break;
    if(d === 17 && !soft) break;

    dealerSweep();
    await sleep(240);

    dealerHand.push(drawCard());
    renderCard(dealerHandEl, dealerHand[dealerHand.length-1], false);
    updateScores();
    beep(180 + Math.random()*40, 55, "sine", 0.03);
    await sleep(420);

    if(scoreHand(dealerHand) > 21) break;
  }
}

function settlePayout(){
  const p = scoreHand(playerHand);
  const d = scoreHand(dealerHand);

  // surrender: return half bet
  if(surrendered){
    const refund = Math.floor(bet / 2);
    credit(refund, "blackjack-surrender-refund");
    logEl.innerHTML = `You surrendered. Refund: <b>${refund}</b> GOLD.`;
    setStatus("WAITING");
    return;
  }

  const pBJ = isBlackjack(playerHand);
  const dBJ = isBlackjack(dealerHand);

  // payout model:
  // - bet already debited at deal
  // - win pays 2x bet (return bet + winnings)
  // - blackjack pays 2.5x bet (3:2)
  // - push pays 1x bet (return bet)
  let payout = 0;
  let result = "LOSE";

  if(pBJ && dBJ){ payout = bet; result = "PUSH"; }
  else if(pBJ){ payout = Math.floor(bet * 2.5); result = "BLACKJACK"; }
  else if(dBJ){ payout = 0; result = "LOSE"; }
  else if(p > 21){ payout = 0; result = "BUST"; }
  else if(d > 21){ payout = bet * 2; result = "WIN"; }
  else if(p > d){ payout = bet * 2; result = "WIN"; }
  else if(p < d){ payout = 0; result = "LOSE"; }
  else { payout = bet; result = "PUSH"; }

  if(payout > 0) credit(payout, "blackjack-payout");

  if(result === "WIN" || result === "BLACKJACK") chime();
  else thud();

  logEl.innerHTML = `Result: <b>${result}</b>. Payout: <b>${payout}</b> GOLD.`;
  setStatus("WAITING");
}

async function finishRound(){
  setButtons();
  setStatus("DEALER");
  await dealerPlay();
  inRound = false;
  updateScores();
  setButtons();
  settlePayout();
  renderWallet();
}

/* =========================
   🕹 ACTIONS
   ========================= */
function resetAll(){
  inRound = false;
  surrendered = false;
  dealerHand = [];
  playerHand = [];
  dealerHoleHidden = true;
  pot = 0;
  toCall = 0;
  clearHandsUI();
  uiNumbers();
  setButtons();
  setStatus("WAITING");
  logEl.textContent = "Place your bet. The dealer is watching.";
}

async function deal(){
  audioOn(); // unlock audio on first click
  if(inRound) return;

  bet = Number(betSlider.value || 100);
  surrendered = false;

  // debit bet
  if(!debit(bet, "blackjack-bet")) return;

  pot = bet;
  toCall = bet;
  uiNumbers();

  inRound = true;
  setStatus("IN PLAY");
  setButtons();
  clearHandsUI();
  dealerHand = [];
  playerHand = [];
  dealerHoleHidden = true;

  // vibe: ai chips in
  aiRoundVibe("pre-flop"); // keeping your style language
  chipBurst(seatYou, chipRack, 10);

  // deal cadence
  logEl.textContent = "Dealing…";
  dealerSweep();

  await sleep(200);
  playerHand.push(drawCard());
  renderCard(playerHandEl, playerHand[0], false);
  beep(420, 45, "sine", 0.03);

  await sleep(220);
  dealerHand.push(drawCard());
  renderCard(dealerHandEl, dealerHand[0], false);
  beep(360, 45, "sine", 0.03);

  await sleep(220);
  playerHand.push(drawCard());
  renderCard(playerHandEl, playerHand[1], false);
  beep(420, 45, "sine", 0.03);

  await sleep(220);
  dealerHand.push(drawCard());
  renderCard(dealerHandEl, dealerHand[1], true); // hole hidden
  beep(360, 45, "sine", 0.03);

  updateScores();

  // check instant blackjack
  if(isBlackjack(playerHand) || isBlackjack(dealerHand)){
    logEl.textContent = "Blackjack check…";
    await sleep(420);
    await finishRound();
    return;
  }

  logEl.innerHTML = "Your move. <b>Hit</b> or <b>Stand</b>.";
  setButtons();
}

async function hit(){
  audioOn();
  if(!inRound || surrendered) return;

  dealerSweep();
  await sleep(150);

  playerHand.push(drawCard());
  renderCard(playerHandEl, playerHand[playerHand.length-1], false);
  beep(520, 45, "sine", 0.03);
  updateScores();

  const p = scoreHand(playerHand);
  if(p > 21){
    logEl.innerHTML = `Bust. <b>${p}</b> — dealer smiles.`;
    inRound = false;
    setButtons();
    await sleep(420);
    await finishRound(); // reveal dealer hole and settle as bust
  }else{
    logEl.innerHTML = `You drew. Total: <b>${p}</b>.`;
  }
}

async function stand(){
  audioOn();
  if(!inRound || surrendered) return;
  logEl.textContent = "Stand. Dealer plays…";
  inRound = false; // lock actions immediately
  setButtons();
  await sleep(240);
  await finishRound();
}

async function doubleDown(){
  audioOn();
  if(!inRound || surrendered) return;
  if(playerHand.length !== 2) return;

  // debit extra bet
  if(!debit(bet, "blackjack-double")) return;

  bet *= 2;
  pot += (bet/2);
  toCall = bet;
  uiNumbers();
  chipBurst(seatYou, chipRack, 12);
  logEl.innerHTML = `Double down. Bet is now <b>${bet}</b>. One card only…`;
  await sleep(240);

  // one card then stand
  await hit();
  if(scoreHand(playerHand) <= 21){
    await sleep(180);
    await stand();
  }
}

function foldSurrender(){
  audioOn();
  if(!inRound || surrendered) return;
  // typical surrender rules vary; we allow surrender before dealer reveal / before hitting
  surrendered = true;
  inRound = false;
  setButtons();
  logEl.innerHTML = `Fold (Surrender). Dealer collects half.`;
  chipBurst(chipRack, seatYou, 6); // visual refund vibe (actual refund in settle)
  finishRound();
}

/* =========================
   🎛 BET SLIDER (Raise Bet)
   ========================= */
betSlider.addEventListener("input", () => {
  bet = Number(betSlider.value || 100);
  betAmtEl.textContent = bet;
  betHud.textContent = bet;
});

/* =========================
   🔌 BUTTONS
   ========================= */
dealBtn.addEventListener("click", deal);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
doubleBtn.addEventListener("click", doubleDown);
foldBtn.addEventListener("click", foldSurrender);
resetBtn.addEventListener("click", resetAll);

/* init */
betAmtEl.textContent = betSlider.value;
betHud.textContent = betSlider.value;
setStatus("WAITING");
setButtons();
uiNumbers();
})();
