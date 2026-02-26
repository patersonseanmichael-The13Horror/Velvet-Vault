(function(){
  const widget = document.getElementById("vvHelper");
  const openBtn = document.getElementById("vvHelperOpen");
  const closeBtn = document.getElementById("vvHelperClose");
  const body = document.getElementById("vvHelperBody");

  if(!widget || !openBtn || !closeBtn || !body) return;

  function open(){
    widget.style.display = "block";
    body.innerHTML =
      `Need a hand? Use the quick links below.<div class="vvHelperLinks">
        <a class="vvLinkChip" href="members.html">Lobby</a>
        <a class="vvLinkChip" href="slots.html?m=machine-01">Slots</a>
        <a class="vvLinkChip" href="roulette.html">Roulette</a>
        <a class="vvLinkChip" href="blackjack.html">Blackjack</a>
        <a class="vvLinkChip" href="poker.html">Poker</a>
        <a class="vvLinkChip" href="ledger.html">Ledger</a>
      </div>
      <div style="margin-top:10px; color:rgba(241,236,255,0.75); font-size:12px;">
        Tip: If a page kicks you out, log in again and return to Lobby.
      </div>`;
  }

  function close(){ widget.style.display = "none"; }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  // Hidden activation: double "v" within 1200ms
  let lastV = 0;
  document.addEventListener("keydown", (e)=>{
    if(String(e.key).toLowerCase() !== "v") return;
    const now = Date.now();
    if(now - lastV < 1200){
      openBtn.style.display = "inline-flex";
      open();
    }
    lastV = now;
  });

  // Mobile long-press footer logo (if exists)
  const footerLogo = document.getElementById("vvFooterLogo");
  if(footerLogo){
    let t = null;
    footerLogo.addEventListener("touchstart", ()=>{
      t = setTimeout(()=>{
        openBtn.style.display = "inline-flex";
        open();
      }, 650);
    }, {passive:true});
    footerLogo.addEventListener("touchend", ()=>{ if(t) clearTimeout(t); t=null; }, {passive:true});
  }
})();
