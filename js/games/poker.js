(function pokerInit(){
/* ============================================
   💎 VELVET VAULT — COMPLETE POKER ENGINE
   ============================================ */

  const requiredIds = [
    "walletBal","log","dealBtn","resetBtn","foldBtn","callBtn","raiseBtn","pot","seat1","potZone"
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.warn("[Poker] Missing elements, skipping init:", missing.join(", "));
    return;
  }

/* ========= WALLET UI ========= */

  const walletBal = document.getElementById("walletBal");

  function renderWallet(){
    if(!window.VaultEngine?.user) return;
    walletBal.textContent =
      window.VaultEngine.formatGold(
        window.VaultEngine.getBalance()
      );
  }

  const wWait = setInterval(()=>{
    if(window.VaultEngine){
      clearInterval(wWait);
      window.VaultEngine.subscribe(renderWallet);
      renderWallet();
    }
  },100);


/* ========= UI ELEMENTS ========= */

  const logEl      = document.getElementById("log");
  const dealBtn    = document.getElementById("dealBtn");
  const resetBtn   = document.getElementById("resetBtn");
  const foldBtn    = document.getElementById("foldBtn");
  const callBtn    = document.getElementById("callBtn");
  const raiseBtn   = document.getElementById("raiseBtn");
  const potEl      = document.getElementById("pot");
  const seat1      = document.getElementById("seat1");
  const potZone    = document.getElementById("potZone");


/* ========= GAME STATE ========= */

let pot = 0;
let board = [];
let players = [];


/* ========= CARD SYSTEM ========= */

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const VALUES = Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));

function draw(){
  return {
    r: RANKS[Math.floor(Math.random()*13)],
    s: SUITS[Math.floor(Math.random()*4)]
  };
}


/* ========= VEGAS HAND EVALUATOR ========= */

function evaluate(cards){
  const r = cards.map(c=>VALUES[c.r]).sort((a,b)=>b-a);
  const counts = {};
  r.forEach(v=>counts[v]=(counts[v]||0)+1);
  const groups = Object.values(counts).sort((a,b)=>b-a);

  if(groups[0]==4) return 7;
  if(groups[0]==3 && groups[1]>=2) return 6;
  if(groups[0]==3) return 3;
  if(groups[0]==2 && groups[1]==2) return 2;
  if(groups[0]==2) return 1;
  return 0;
}


/* ========= VEGAS AI PLAYERS ========= */

const vegasNames = [
  "Mr Blackjack",
  "Lady Mirage",
  "Red Jack",
  "Silk Dealer",
  "Ghost Ace"
];

function createPlayers(){
  players = [
    {name:"You", ai:false, folded:false, hole:[draw(),draw()]},
    ...vegasNames.map(n=>({
      name:n,
      ai:true,
      folded:false,
      hole:[draw(),draw()]
    }))
  ];
}


function aiDecision(p){

  const strength = evaluate([...p.hole,...board]);
  const bluff = Math.random()<0.15;

  if(strength>=3){
    bet(200 + Math.random()*200);
    say(p,"raises aggressively.");
  }
  else if(strength>=1){
    bet(100);
    say(p,"calls coolly.");
  }
  else if(bluff){
    bet(200);
    say(p,"bluffs.");
  }
  else{
    p.folded=true;
    say(p,"folds.");
  }
}


function say(p,msg){
  logEl.innerHTML += `<br><b>${p.name}</b> ${msg}`;
}


/* ========= BETTING ========= */

function bet(amount){
  pot += Math.floor(amount);
  potEl.textContent = pot;
}


/* ========= CHIP ANIMATION ========= */

function chipBurst(){
  if(!seat1 || !potZone) return;

  const stage = document.querySelector(".stage");
  const chip = document.createElement("div");
  chip.className = "chipFly";
  stage.appendChild(chip);
  setTimeout(()=>chip.remove(),600);
}


/* ========= HAND FLOW ========= */

function startHand(){

  pot = 0;
  board = [];
  createPlayers();

  logEl.textContent = "Shuffling cards…";

  setTimeout(()=>{
    board=[draw(),draw(),draw()];
    logEl.innerHTML="Flop dealt.";
    aiRound();
  },1000);

  setTimeout(()=>{
    board.push(draw());
    logEl.innerHTML+="<br>Turn.";
    aiRound();
  },2000);

  setTimeout(()=>{
    board.push(draw());
    logEl.innerHTML+="<br>River.";
    aiRound();
    showdown();
  },3000);
}


function aiRound(){
  players.forEach(p=>{
    if(p.ai && !p.folded) aiDecision(p);
  });
}


/* ========= SHOWDOWN ========= */

function showdown(){

  let best=-1;
  let winner=null;

  players.forEach(p=>{
    if(p.folded) return;
    const score=evaluate([...p.hole,...board]);
    if(score>best){
      best=score;
      winner=p;
    }
  });

  if(!winner){
    logEl.innerHTML+="<br>No winner.";
    return;
  }

  logEl.innerHTML+=`<br><b>${winner.name}</b> wins ${pot} GOLD`;

  if(winner.name=="You" && window.VaultEngine){
    window.VaultEngine.credit(pot,"poker-win");
  }
}


/* ========= PLAYER BUTTONS ========= */

dealBtn.onclick=startHand;

callBtn.onclick=()=>{
  if(window.VaultEngine?.debit(100,"poker-call")){
    bet(100);
    chipBurst();
    logEl.innerHTML+="<br>You call.";
  }
};

raiseBtn.onclick=()=>{
  if(window.VaultEngine?.debit(200,"poker-raise")){
    bet(200);
    chipBurst();
    logEl.innerHTML+="<br>You raise.";
  }
};

foldBtn.onclick=()=>{
  logEl.innerHTML+="<br>You fold.";
};

resetBtn.onclick=()=>{
  pot=0;
  potEl.textContent=0;
  logEl.textContent="Table reset.";
};

})();
