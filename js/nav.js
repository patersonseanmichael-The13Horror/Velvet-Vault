(function vvNavInit(){
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.mobile-drawer');

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => drawer.classList.remove('open'));
    });
  }

  const currentPath = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const markActive = (selector) => {
    document.querySelectorAll(selector).forEach((link) => {
      const href = (link.getAttribute('href') || '').split('#')[0].split('?')[0].toLowerCase();
      if (!href) return;
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  };

  markActive('.chipLink');
  markActive('.mobile-drawer a');
})();
