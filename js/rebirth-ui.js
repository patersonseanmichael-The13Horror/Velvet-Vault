/* Velvet Vault — Rebirth UI helpers
   - Mobile drawer open/close
   - ESC to close
   - Click outside to close
*/
(function () {
  function qs(sel) { return document.querySelector(sel); }
  function on(el, evt, fn) { if (el) el.addEventListener(evt, fn); }

  var btn = qs('[data-drawer-btn]');
  var drawer = qs('[data-drawer]');
  var backdrop = qs('[data-drawer-backdrop]');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.documentElement.style.overflow = '';
  }
  function toggleDrawer() {
    if (!drawer) return;
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  }

  on(btn, 'click', toggleDrawer);
  on(backdrop, 'click', closeDrawer);
  on(document, 'keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  // Close drawer after navigation
  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });
  }
})();

