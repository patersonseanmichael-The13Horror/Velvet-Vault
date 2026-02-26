/* Velvet Vault — Story Engine
   - Sets chapter per page using <body data-chapter="...">
   - Animated background parallax (mouse + scroll)
   - Index timeline active step highlight (IntersectionObserver)
*/
(function () {
  var body = document.body;
  if (!body) return;

  // Ensure a chapter exists
  if (!body.getAttribute('data-chapter')) {
    body.setAttribute('data-chapter', 'arrival');
  }

  // Turn on background layers
  var bg = document.querySelector('.vv-bg');
  if (bg) {
    bg.querySelectorAll('.vv-bg__layer').forEach(function (el) {
      el.classList.add('is-on');
    });
  }

  // Respect reduced motion
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // Scroll drift
  function onScroll() {
    if (!bg || reduce) return;
    var y = window.scrollY || 0;
    var driftY = Math.max(-18, Math.min(18, (y / 28) * -1));
    document.documentElement.style.setProperty('--vv-bg-shift-y', driftY + 'px');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mouse parallax
  function onMove(e) {
    if (!bg || reduce) return;
    var w = window.innerWidth || 1;
    var h = window.innerHeight || 1;
    var x = (e.clientX / w) - 0.5;
    var y = (e.clientY / h) - 0.5;
    var px = Math.round(x * 10);
    var py = Math.round(y * 8);
    document.documentElement.style.setProperty('--vv-bg-shift-x', px + 'px');
    document.documentElement.style.setProperty('--vv-bg-shift-y', py + 'px');
  }
  window.addEventListener('mousemove', onMove, { passive: true });

  // Timeline activation (index only)
  var steps = document.querySelectorAll('[data-vv-step]');
  if (steps && steps.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        steps.forEach(function (s) { s.classList.remove('is-active'); });
        entry.target.classList.add('is-active');
      });
    }, { root: null, threshold: 0.55 });

    steps.forEach(function (s) { io.observe(s); });
  }
})();

