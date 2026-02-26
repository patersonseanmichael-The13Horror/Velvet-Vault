// ================================
// Velvet Vault — Interactions
// ================================
(function(){
  const $ = (s) => document.querySelector(s);
  const requiredIds = [
    "year","ambient","toggleAudioBtn","startExperienceBtn","skipIntroBtn",
    "enterBtn","exploreBtn","backTop","sendBtn","msg","chat",
    "trailRoot","doorFrame","doorOverlay"
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.warn("[Home] Missing elements, skipping init:", missing.join(", "));
    return;
  }

  const yearEl = $("#year");
  const ambient = $("#ambient");
  const toggleAudioBtn = $("#toggleAudioBtn");
  const startExperienceBtn = $("#startExperienceBtn");
  const skipIntroBtn = $("#skipIntroBtn");
  const enterBtn = $("#enterBtn");
  const exploreBtn = $("#exploreBtn");
  const backTop = $("#backTop");
  const sendBtn = $("#sendBtn");
  const msg = $("#msg");
  const chat = $("#chat");
  const navEnter = $("#navEnter");
  const doorFrame = $("#doorFrame");
  const doorOverlay = $("#doorOverlay");
  const trailRoot = $("#trailRoot");

  // ---- Footer year ----
  yearEl.textContent = new Date().getFullYear();

  // ---- Ambient audio ----
  let audioOn = false;

      async function enableAudio(){
        if(!ambient || !ambient.querySelector("source")){
          audioOn = false;
          toggleAudioBtn.textContent = "Audio: Unavailable";
          return;
        }
        try{
          await ambient.play();
          audioOn = true;
          toggleAudioBtn.textContent = "Audio: On";
        }catch(e){
          // Autoplay policy — user gesture needed. We'll keep it off until a click.
          audioOn = false;
          toggleAudioBtn.textContent = "Audio: Off";
        }
      }

      function disableAudio(){
        audioOn = false;
        ambient.pause();
        ambient.currentTime = 0;
        toggleAudioBtn.textContent = "Audio: Off";
      }

      toggleAudioBtn.addEventListener("click", async () => {
        if(audioOn) disableAudio();
        else await enableAudio();
      });

      // ---- Vault Door Intro ----
      const overlay = doorOverlay;
      const frame = doorFrame;
      const startBtn = startExperienceBtn;
      const skipBtn  = skipIntroBtn;

      function closeOverlay(){
        sessionStorage.setItem("vv_entered","1");
        overlay.style.display = "none";
      }

      if(sessionStorage.getItem("vv_entered")==="1"){
        overlay.style.display = "none";
      }

      async function openDoorsThenClose(){
        // start audio if possible (user clicked)
        if(!audioOn) await enableAudio();

        frame.classList.add("open");
        // give time for animation, then close overlay
        setTimeout(closeOverlay, 1250);
      }

      startBtn.addEventListener("click", openDoorsThenClose);
      skipBtn.addEventListener("click", async () => {
        if(!audioOn) await enableAudio();
        closeOverlay();
      });

      // Also allow clicking the big overlay to start (but not if clicking buttons)
      overlay.addEventListener("click", (e) => {
        const isButton = e.target.closest("button");
        if(isButton) return;
        openDoorsThenClose();
      });

      // Nav enter triggers overlay door again (for vibe)
      navEnter && navEnter.addEventListener("click", (e) => {
        e.preventDefault();
        overlay.style.display = "flex";
        frame.classList.remove("open");
      });

      // ---- Neon mouse trail (red + green alternating) ----
      const trailCount = 18;
      const trail = [];
      let last = { x: window.innerWidth/2, y: window.innerHeight/2 };
      let pointerActive = false;

      for(let i=0;i<trailCount;i++){
        const d = document.createElement("div");
        d.className = "trail";
        // alternate color vibe
        d.style.boxShadow = (i % 2 === 0)
          ? "0 0 18px rgba(255,35,61,0.55), 0 0 34px rgba(255,35,61,0.22)"
          : "0 0 18px rgba(0,255,154,0.55), 0 0 34px rgba(0,255,154,0.22)";
        d.style.background = (i % 2 === 0) ? "rgba(255,35,61,0.85)" : "rgba(0,255,154,0.85)";
        d.style.width = (10 - i*0.25) + "px";
        d.style.height = (10 - i*0.25) + "px";
        trailRoot.appendChild(d);
        trail.push({ el: d, x: last.x, y: last.y, a: 0 });
      }

      function setPointer(x,y){
        last.x = x; last.y = y;
        pointerActive = true;
      }

      window.addEventListener("mousemove", (e)=> setPointer(e.clientX, e.clientY), { passive:true });
      window.addEventListener("touchmove", (e)=>{
        if(!e.touches || !e.touches[0]) return;
        setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive:true });

      function animateTrail(){
        // If no pointer activity yet, keep hidden to avoid weird dot in center
        if(!pointerActive){
          requestAnimationFrame(animateTrail);
          return;
        }

        let x = last.x, y = last.y;
        for(let i=0;i<trail.length;i++){
          const p = trail[i];
          // Smooth follow
          p.x += (x - p.x) * 0.28;
          p.y += (y - p.y) * 0.28;

          // Fade
          p.a += (1 - p.a) * 0.08;
          const fade = Math.max(0, 1 - i / trail.length);
          p.el.style.opacity = (0.85 * fade).toFixed(3);
          p.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%)`;

          x = p.x; y = p.y;
        }
        requestAnimationFrame(animateTrail);
      }
      requestAnimationFrame(animateTrail);

      // ---- AI Greeter (front-end scripted) ----
      function addBubble(text, who){
        const d = document.createElement("div");
        d.className = "bubble " + (who || "ai");
        d.innerHTML = text;
        chat.appendChild(d);
        chat.scrollTop = chat.scrollHeight;
      }

      function greeterReply(raw){
        const t = (raw || "").trim().toLowerCase();

        // Punchy, intriguing but not too revealing:
        if(!t) return "Speak. The door prefers certainty.";

        if(t.includes("dress") || t.includes("code") || t.includes("wear")){
          return "Dress code: <b>black</b> with a <b>signal</b> (red or green). <br/>No daylight energy. No loud logos. <br/><i>Look expensive. Move quiet.</i>";
        }
        if(t.includes("member")){
          return "Members enter through the <b>red door</b>. <br/>If you don’t have a key yet—start at <b>Dare To Explore</b> and earn it.";
        }
        if(t.includes("music") || t.includes("dj") || t.includes("sound")){
          return "Tonight’s soundtrack: <b>industrial velvet</b> + <b>neon bass</b>. <br/>Slow burn, hard drop, no apologies.";
        }
        if(t.includes("rules")){
          return "Rules are simple: <br/>1) Don’t film. <br/>2) Don’t name names. <br/>3) If the lights turn green—<b>follow</b>.";
        }
        if(t.includes("what") && (t.includes("velvet") || t.includes("vault"))){
          return "Velvet Vault is a private nightclub experience. <br/><b>Gothic shadow.</b> <b>Cyber neon.</b> <br/>If you’re here, the night already chose you.";
        }
        if(t.includes("where") || t.includes("location") || t.includes("address")){
          return "Location stays off-record. <br/>If you’re meant to find it, you’ll be given a <b>signal</b>.";
        }
        if(t.includes("enter") || t.includes("join") || t.includes("invite")){
          return "To enter: click <b>Enter</b>. <br/>To be invited: click <b>Dare To Explore</b> and follow the trail.";
        }

        // default:
        const variants = [
          "Interesting. Say it again—without the fear.",
          "The vault heard you. Now be specific: <b>dress code</b>, <b>members</b>, or <b>rules</b>?",
          "Careful. Curiosity is how the door opens.",
          "You’re close. Ask for <b>entry</b> or ask for <b>the rules</b>."
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      }

      function send(){
        const text = msg.value;
        if(!text.trim()) return;
        addBubble(text.replaceAll("<","&lt;").replaceAll(">","&gt;"), "me");
        msg.value = "";
        const reply = greeterReply(text);
        setTimeout(()=> addBubble(reply, "ai"), 220);
      }

      sendBtn.addEventListener("click", send);
      msg.addEventListener("keydown", (e) => {
        if(e.key === "Enter") send();
      });

      document.querySelectorAll(".qbtn").forEach(btn => {
        btn.addEventListener("click", () => {
          msg.value = btn.getAttribute("data-q") || "";
          send();
        });
      });

      // ---- Ensure audio starts if user clicks main CTAs ----
      enterBtn.addEventListener("click", async () => { if(!audioOn) await enableAudio(); });
      exploreBtn.addEventListener("click", async () => { if(!audioOn) await enableAudio(); });

      // ---- Back to top ----
      backTop.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

    })();
