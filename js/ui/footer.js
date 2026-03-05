/* © 2026 Velvet Vault — Sean Michael Paterson. All rights reserved. */
function renderFooter(){
  const host = document.getElementById("vv-footer");
  if(!host) return;
  const year = new Date().getFullYear();

  // Inject Tawk.to live chat if not already loaded
  if (!window.__VV_TAWK_LOADED__ && !window.VV_TAWK_DISABLED) {
    window.__VV_TAWK_LOADED__ = true;
    const tawkScript = document.createElement('script');
    tawkScript.src = 'js/tawk.js';
    tawkScript.defer = true;
    document.body.appendChild(tawkScript);
  }

  host.innerHTML = `
    <div class="vv-container vv-footer">
      <nav class="vv-footerLinks" aria-label="Footer navigation">
        <a href="about.html">About</a>
        <a href="privacy.html">Privacy</a>
        <a href="terms.html">Terms</a>
        <a href="responsible-gambling.html">Responsible Play</a>
        <a href="contact.html">Contact Us</a>
      </nav>
      <div class="vv-footerMeta">© ${year} Velvet Vault — Keep the lights low. Follow the green signal.</div>
    </div>
  `;
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", renderFooter, {once:true});
}else{
  renderFooter();
}
