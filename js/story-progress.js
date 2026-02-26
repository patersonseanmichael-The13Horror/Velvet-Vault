/* Velvet Vault — Phase 4: Progress + HUD
   - Stores visited chapters in localStorage
   - Updates HUD badge and progress bar
   - Marks “unlocked” links/buttons if they have data-unlock-key
*/
(function () {
  var KEY = 'vv_story_progress_v1';
  var order = ['arrival', 'initiation', 'vip', 'games', 'terms'];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { seen: {} };
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return { seen: {} };
      if (!obj.seen) obj.seen = {};
      return obj;
    } catch (e) {
      return { seen: {} };
    }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function pct(state) {
    var count = 0;
    order.forEach(function (k) { if (state.seen[k]) count++; });
    return Math.round((count / order.length) * 100);
  }

  var body = document.body;
  if (!body) return;
  var chapter = body.getAttribute('data-chapter') || 'arrival';

  var state = load();
  state.seen[chapter] = true;
  save(state);

  // Update HUD if present
  var pctEl = document.querySelector('[data-vv-pct]');
  var barEl = document.querySelector('[data-vv-bar]');
  if (pctEl) pctEl.textContent = pct(state) + '%';
  if (barEl) barEl.style.width = pct(state) + '%';

  // Mark unlocked elements
  var nodes = document.querySelectorAll('[data-unlock-key]');
  nodes.forEach(function (n) {
    var k = n.getAttribute('data-unlock-key');
    if (k && state.seen[k]) n.classList.add('vv-unlocked');
  });

  // Tiny helper: expose reset (optional)
  window.VVStory = window.VVStory || {};
  window.VVStory.resetProgress = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };
})();

