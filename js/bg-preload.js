/* Velvet Vault — Phase 5: Background preloader + crossfade swap
   How it works:
   - story.css defines per-chapter URLs in CSS variables (vv-url-arrival, etc.)
   - We preload them once and add a class to enable full image mode
   - We also support crossfade by toggling between layer-a and layer-b
*/
(function () {
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}

  var root = document.documentElement;
  var bg = document.querySelector('.vv-bg');
  if (!bg) return;

  var a = bg.querySelector('.vv-bg__layer.layer-a');
  var b = bg.querySelector('.vv-bg__layer.layer-b');
  var hasB = !!b;

  // Collect URLs from CSS custom props
  function getVar(name) {
    var v = getComputedStyle(root).getPropertyValue(name);
    return (v || '').trim();
  }

  // Extract url("...") value into a plain URL if possible
  function extractUrl(cssVal) {
    // Accept: url("...") or url('...') or url(...)
    var m = cssVal.match(/url\((\"|')?(.*?)(\1)?\)/i);
    return m ? m[2] : '';
  }

  var keys = ['arrival','initiation','vip','games','terms'];
  var urls = keys.map(function (k) { return extractUrl(getVar('--vv-url-' + k)); })
                .filter(Boolean);

  if (!urls.length) {
    // No real images configured; gradients will remain
    return;
  }

  // Preload all images
  var loaded = 0;
  var done = false;
  function finish() {
    if (done) return;
    done = true;
    root.classList.add('vv-bg-ready');
  }

  urls.forEach(function (u) {
    var img = new Image();
    img.onload = function () {
      loaded++;
      if (loaded >= urls.length) finish();
    };
    img.onerror = function () {
      // Even if one fails, still proceed so the rest can work
      loaded++;
      if (loaded >= urls.length) finish();
    };
    img.src = u;
  });

  // Crossfade swap on chapter changes (only if layer-b exists)
  // story-engine doesn’t “navigate” chapters within a single page; but this helps if you later add dynamic chapter swaps.
  if (!hasB || reduce) return;
  var showingA = true;

  window.VVBG = window.VVBG || {};
  window.VVBG.swapTo = function (cssImageValue) {
    if (!a || !b) return;
    if (showingA) {
      b.style.backgroundImage = cssImageValue;
      b.style.opacity = '1';
      a.style.opacity = '0';
    } else {
      a.style.backgroundImage = cssImageValue;
      a.style.opacity = '1';
      b.style.opacity = '0';
    }
    showingA = !showingA;
  };
})();

