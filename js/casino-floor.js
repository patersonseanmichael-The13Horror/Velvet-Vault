// Casino floor: jackpot + recent wins feed
(function(){
  const jackpotEl = document.getElementById("vvJackpot");
  const feedEl = document.getElementById("vvWinFeed");
  if(!jackpotEl || !feedEl) return;

  function fmt(n){
    return Number(n||0).toLocaleString("en-US") + " GOLD";
  }

  // jackpot stored in localStorage
  const KEY = "vv_jackpot";
  let jackpot = Number(localStorage.getItem(KEY) || 1245900);

  function bumpJackpot(){
    const add = Math.floor(40 + Math.random()*180);
    jackpot += add;
    localStorage.setItem(KEY, String(jackpot));
    jackpotEl.textContent = fmt(jackpot);
  }

  // Fake live wins (6 rows max)
  function maskId(){
    const a = String(Math.floor(Math.random()*99)).padStart(2,"0");
    const b = String(Math.floor(Math.random()*999)).padStart(3,"0");
    const c = String(Math.floor(Math.random()*999)).padStart(3,"0");
    return `${a}*****${b}${c}`.slice(0,10);
  }
  function randGold(){
    return Math.floor(120 + Math.random()*5200);
  }
  function addWin(){
    const row = document.createElement("div");
    row.className = "winItem";
    const who = maskId();
    const amt = randGold();
    row.innerHTML = `<div><b>${who}</b> <small>just won</small> <b>${amt} GOLD</b></div>
                     <small>${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</small>`;
    feedEl.prepend(row);
    while(feedEl.children.length > 6) feedEl.removeChild(feedEl.lastChild);
    bumpJackpot();
  }

  jackpotEl.textContent = fmt(jackpot);
  for(let i=0;i<4;i++) addWin();
  setInterval(addWin, 30000);
})();
