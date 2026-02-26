/* =====================================================
   VELVET VAULT — Casino Floor Animations Engine
   Works with css/casino-floor.css
   Safe for mobile + low CPU
   ===================================================== */

(function(){
"use strict";

/* =========================================
   Helpers
========================================= */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function rand(min,max){ return Math.random()*(max-min)+min; }
function randInt(min,max){ return Math.floor(rand(min,max+1)); }

/* =========================================
   JACKPOT COUNTER
========================================= */

function startJackpot(){
  const el = document.getElementById("jackpotAmount") || document.getElementById("vvJackpot");
  if(!el || el.dataset.vvJackpotBound === "1") return;
  el.dataset.vvJackpotBound = "1";

  const storageKey = "vv_jackpot";
  let val = Number(localStorage.getItem(storageKey) || el.dataset.start || 150000);

  el.textContent = `${val.toLocaleString()} GOLD`;

  setInterval(()=>{
    val += randInt(4,28);
    localStorage.setItem(storageKey, String(val));
    el.textContent = `${val.toLocaleString()} GOLD`;
  }, 1400);
}

/* =========================================
   NEON SWEEP
========================================= */

function neonSweep(){
  $$(".floorCard").forEach((card)=>{
    if(card.dataset.neonReady) return;
    card.dataset.neonReady = "1";

    if(card.querySelector(".cardGlow")) return;
    const glow = document.createElement("div");
    glow.className = "cardGlow";
    card.appendChild(glow);
  });
}

/* =========================================
   LIVE WIN FEED
========================================= */

const FEED_NAMES = [
  "Ava","Leo","Noah","Mia","Luca",
  "Zara","Kai","Ivy","Ezra","Aria"
];

function randomGame(){
  return ["Slots","Roulette","Poker","Blackjack"][randInt(0,3)];
}

function addWin(){
  const feed = document.getElementById("winFeed") || document.getElementById("vvWinFeed");
  if(!feed) return;

  const row = document.createElement("div");
  row.className = "winItem";

  const name = FEED_NAMES[randInt(0,FEED_NAMES.length-1)];
  const amt = randInt(80,4200);

  row.innerHTML =
    `<div><b>${name}</b> won <b>${amt} GOLD</b> on ${randomGame()}</div>
     <small>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>`;

  feed.prepend(row);
  while(feed.children.length > 6) feed.removeChild(feed.lastChild);
}

function startFeed(){
  const feed = document.getElementById("winFeed") || document.getElementById("vvWinFeed");
  if(!feed || feed.dataset.vvFeedBound === "1") return;
  feed.dataset.vvFeedBound = "1";

  for(let i=0;i<3;i++) addWin();
  setInterval(addWin, 9000);
}

/* =========================================
   FLOOR CARD HOVER FX
========================================= */

function cardHoverFX(){
  $$(".floorCard").forEach((card)=>{
    if(card.dataset.vvHoverBound === "1") return;
    card.dataset.vvHoverBound = "1";

    card.addEventListener("mouseenter", ()=>{
      card.style.boxShadow =
        "0 0 28px rgba(255,35,61,.25), 0 0 28px rgba(0,255,154,.22), 0 22px 70px rgba(0,0,0,0.55)";
    });
    card.addEventListener("mouseleave", ()=>{
      card.style.boxShadow = "";
    });
  });
}

/* =========================================
   HELPER BOT
========================================= */

function helperBot(){
  const widget = document.getElementById("vvHelper");
  const openBtn = document.getElementById("vvHelperOpen");
  const closeBtn = document.getElementById("vvHelperClose");

  if(!widget || !openBtn || openBtn.dataset.vvHelperFloorBound === "1") return;
  openBtn.dataset.vvHelperFloorBound = "1";

  openBtn.addEventListener("click", ()=>{
    widget.style.display = "block";
  });

  if(closeBtn && closeBtn.dataset.vvHelperFloorBound !== "1"){
    closeBtn.dataset.vvHelperFloorBound = "1";
    closeBtn.addEventListener("click", ()=>{
      widget.style.display = "none";
    });
  }

  $$("#vvHelper a").forEach((link)=>{
    if(link.dataset.vvHelperFloorBound === "1") return;
    link.dataset.vvHelperFloorBound = "1";
    link.addEventListener("click", ()=>{
      widget.style.display = "none";
    });
  });
}

/* =========================================
   MANUAL PAYMENT FORM
========================================= */

function manualPanel(){
  const formBtn = document.getElementById("manualSubmit") || document.querySelector("#vvManualForm button[type='submit']");
  const msg  = document.getElementById("manualMsg") || document.getElementById("vvManualMsg");

  if(!formBtn || !msg || formBtn.dataset.vvManualFloorBound === "1") return;
  formBtn.dataset.vvManualFloorBound = "1";

  formBtn.addEventListener("click", ()=>{
    msg.textContent = "Submission received. Our vault team will review shortly.";
  });
}

/* =========================================
   OPTIONAL DEALER VOICE
========================================= */

function welcomeVoice(){
  try{
    window.VVDealerVoice?.play("welcome");
  }catch{}
}

/* =========================================
   INIT
========================================= */

function init(){
  neonSweep();
  startJackpot();
  startFeed();
  cardHoverFX();
  helperBot();
  manualPanel();
  setTimeout(welcomeVoice, 900);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init, { once:true });
}else{
  init();
}

})();
