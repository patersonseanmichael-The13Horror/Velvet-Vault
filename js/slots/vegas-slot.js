// js/slots/vegas-slot.js
import { updateWalletUI, readWallet, writeWallet } from "../wallet.js";

/** Machine library ------------------------------------------------------- */
const MACHINE_LIBRARY = {
  "5-dragons":{
    symbols:[
      "green-dragon","red-dragon","black-dragon","gold-coin",
      "k","q","j","10","9"
    ],
    payouts:{
      "green-dragon":[100,40,10],
      "red-dragon":[90,35,9],
      "black-dragon":[80,30,8],
      "gold-coin":[50,18,5]
    },
    freeSpinTrigger:"gold-coin",
    holdAndWinTrigger:"green-dragon"
  },
  "velvet-pearl":{
    symbols:[
      "velvet-pearl","ruby-heart","emerald-ring","gold-bar",
      "a","k","q","j","10"
    ],
    payouts:{
      "velvet-pearl":[120,50,12],
      "ruby-heart":[90,35,9],
      "emerald-ring":[80,30,8],
      "gold-bar":[60,22,6]
    },
    freeSpinTrigger:"gold-bar",
    holdAndWinTrigger:"velvet-pearl"
  }
};
/** ----------------------------------------------------------------------- */

export class VegasSlot{
  constructor(root){
    this.root=root;
    this.machineName=root.dataset.machine||"5-dragons";
    this.config=MACHINE_LIBRARY[this.machineName];
    if(!this.config) throw new Error("Unknown machine");
    this.reels=[[],[],[],[],[]];
    this.initDOM();
  }
  initDOM(){
    this.ensureScaffold();
    this.reelsEl=this.root.querySelector(".reels");
    this.spinBtn=this.root.querySelector("[data-spin]");
    this.spinBtn.addEventListener("click",()=>this.spin());
    this.populateReels();
  }
  ensureScaffold(){
    if(!this.root.querySelector(".reels")){
      const reels = document.createElement("div");
      reels.className = "reels";
      this.root.appendChild(reels);
    }
    if(!this.root.querySelector(".slot-controls")){
      const controls = document.createElement("div");
      controls.className = "slot-controls";
      controls.innerHTML = `<button data-spin>SPIN</button>`;
      this.root.appendChild(controls);
    }
    if(!this.root.querySelector("[data-wallet-balance]")){
      const wallet = document.createElement("p");
      wallet.className = "wallet-display";
      wallet.innerHTML = `Balance: <span data-wallet-balance>—</span>`;
      this.root.appendChild(wallet);
    }
  }
  populateReels(){
    this.reelsEl.innerHTML="";
    for(let col=0;col<5;col++){
      const reelCell=document.createElement("div");
      reelCell.className="reel";
      this.reels[col]=[];
      for(let row=0;row<8;row++){ // 8 items to allow scrolling
        const sym=this.randomSym();
        const cell=document.createElement("div");
        cell.className="symbol";
        cell.style.backgroundImage=`url('/images/symbols/${this.machineName}/${sym}.png')`;
        cell.style.top=`${row*120}px`;
        reelCell.appendChild(cell);
        this.reels[col].push(cell);
      }
      this.reelsEl.appendChild(reelCell);
    }
  }
  randomSym(){
    return this.config.symbols[Math.floor(Math.random()*this.config.symbols.length)];
  }
  spin(){
    if(this.spinning) return;
    this.spinning=true;
    const promises=[];
    for(const reel of this.reels){
      const delay=Math.random()*300;
      promises.push(this.animateReel(reel,delay));
    }
    Promise.all(promises).then(()=>{this.evaluate();this.spinning=false;});
  }
  animateReel(reel,delay){
    return new Promise(res=>{
      setTimeout(()=>{
        reel.forEach((cell,i)=>{
          cell.classList.add("spin");
          cell.addEventListener("animationend",()=>{
            cell.classList.remove("spin");
            const sym=this.randomSym();
            cell.style.backgroundImage=`url('/images/symbols/${this.machineName}/${sym}.png')`;
            cell.style.transform="translateY(0)";
            if(i===reel.length-1) res();
          },{once:true});
        });
      },delay);
    });
  }
  evaluate(){
    // Simple straight-line middle row evaluation
    const middleSyms=this.reels.map(r=>r[3].style.backgroundImage);
    const key=img=>img.split("/").pop().replace(".png","");

    const symName=key(middleSyms[0]);
    if(middleSyms.every(s=>key(s)===symName)){
      const payout=this.config.payouts[symName]?.[0]??0;
      this.credit(payout);
    }
    if(symName===this.config.freeSpinTrigger){
      // quick free-spin demo (auto 5 spins)
      let spins=5;
      const loop=()=>{
        if(spins--<=0) return;
        this.spin();setTimeout(loop,1200);
      };
      loop();
    }
    if(symName===this.config.holdAndWinTrigger){
      alert("Hold & Win feature coming soon!");
    }
  }
  credit(amount){
    const wallet=readWallet();
    wallet.balance=(wallet.balance||0)+amount;
    writeWallet(wallet);
    updateWalletUI();
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".slot-container").forEach((el)=>{
    if(!el.dataset.machine){
      el.dataset.machine = "5-dragons";
    }
    new VegasSlot(el);
  });
});
