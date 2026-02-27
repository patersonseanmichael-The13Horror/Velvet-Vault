/* Velvet Vault - Phase 6 Effects
   - Parallax depth (mouse + subtle scroll)
   - Gold particle shimmer (canvas)
   - Curtain reveal on load
   - Respects prefers-reduced-motion
*/
(function(){
  const reduce = (()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
  const isMobile = (()=>{ try{ return matchMedia('(max-width: 640px)').matches; }catch(e){ return (window.innerWidth||9999) <= 640; } })();
  const bg = document.querySelector('.vv-bg');
  if (!bg) return;

  // ----------------------------
  // 4) Curtain reveal
  // ----------------------------
  if (!reduce){
    const curtain = document.createElement('div');
    curtain.className = 'vvCurtain';
    curtain.innerHTML = `<div class="vvCurtain__panel left"></div><div class="vvCurtain__panel right"></div>`;
    document.body.appendChild(curtain);
    // Start opening after a short beat
    requestAnimationFrame(()=> {
      curtain.classList.add('open');
      setTimeout(()=>{ curtain.classList.add('done'); }, 1200);
    });
  }

  // ----------------------------
  // 2) Gold particle shimmer
  // ----------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'vvParticles';
  bg.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  let W=0,H=0,dpr=1;
  function resize(){
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.floor(bg.clientWidth);
    H = Math.floor(bg.clientHeight);
    canvas.width = Math.floor(W*dpr);
    canvas.height = Math.floor(H*dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize, { passive:true });

  // Mobile throttle:
  // - fewer particles
  // - lower FPS (we skip frames)
  const MAX_PARTICLES = reduce
    ? 18
    : (isMobile ? 22 : (W < 720 ? 40 : 70));
  const particles = [];
  function rand(a,b){ return a + Math.random()*(b-a); }

  function spawn(){
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x: rand(0,W),
      y: rand(0,H),
      r: rand(0.6, 2.0),
      vx: rand(-0.08, 0.10),
      vy: rand(-0.12, 0.08),
      a: rand(0.12, 0.55),
      tw: rand(0.006, 0.02),
      t: rand(0, 1000),
    });
  }
  for (let i=0;i<MAX_PARTICLES;i++) spawn();

  function drawParticles(){
    ctx.clearRect(0,0,W,H);
    // Gold shimmer gradient "ink"
    const g = ctx.createRadialGradient(W*0.6, H*0.3, 0, W*0.6, H*0.3, Math.max(W,H));
    g.addColorStop(0, 'rgba(255,210,122,0.22)');
    g.addColorStop(0.4, 'rgba(255,35,64,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    for (const p of particles){
      p.t += 1;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W+10;
      if (p.x > W+10) p.x = -10;
      if (p.y < -10) p.y = H+10;
      if (p.y > H+10) p.y = -10;

      const tw = 0.5 + Math.sin(p.t * p.tw) * 0.5;
      const alpha = p.a * (0.35 + 0.65*tw);

      // Particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,210,122,${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  let rafId = 0;
  let frame = 0;
  const SKIP = isMobile ? 1 : 0; // mobile: render every other frame
  function loop(){
    frame++;
    if (SKIP && (frame % 2 === 0)) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    drawParticles();
    rafId = requestAnimationFrame(loop);
  }
  if (!reduce) loop();
  else { drawParticles(); } // render once for reduced-motion

  // ----------------------------
  // 1) Parallax depth
  // ----------------------------
  // Mobile throttle: keep parallax but reduce intensity
  if (!reduce){
    const layerA = bg.querySelector('.vv-bg__layer.layer-a');
    const layerB = bg.querySelector('.vv-bg__layer.layer-b');
    const streaks = bg.querySelector('.vv-bg__streaks');
    const tint = bg.querySelector('.vv-bg__tint');
    const vignette = bg.querySelector('.vv-bg__vignette');
    const grain = bg.querySelector('.vv-grain');

    let mx = 0, my = 0;
    let tx = 0, ty = 0;
    let scrollY = 0;

    window.addEventListener('mousemove', (e)=>{
      const cx = W/2, cy = H/2;
      mx = (e.clientX - cx) / cx; // -1..1
      my = (e.clientY - cy) / cy; // -1..1
    }, { passive:true });

    window.addEventListener('scroll', ()=>{
      scrollY = window.scrollY || 0;
    }, { passive:true });

    function parallaxTick(){
      // Smooth follow
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;

      const s = Math.min(18, scrollY * 0.02); // tiny scroll drift
      const scale = isMobile ? 0.55 : 1.0;
      const dx = tx * 10 * scale;
      const dy = (ty * 8 + s) * scale;

      if (layerA) layerA.style.transform = `translate3d(${dx*0.55}px, ${dy*0.55}px, 0) scale(1.02)`;
      if (layerB) layerB.style.transform = `translate3d(${dx*0.85}px, ${dy*0.85}px, 0) scale(1.03)`;
      if (streaks) streaks.style.transform = `translate3d(${dx*1.2}px, ${dy*1.2}px, 0)`;
      if (tint) tint.style.transform = `translate3d(${dx*0.20}px, ${dy*0.20}px, 0)`;
      if (vignette) vignette.style.transform = `translate3d(${dx*0.10}px, ${dy*0.10}px, 0)`;
      if (grain) grain.style.transform = `translate3d(${dx*0.06}px, ${dy*0.06}px, 0)`;

      requestAnimationFrame(parallaxTick);
    }
    requestAnimationFrame(parallaxTick);
  }
})();
