/* © 2026 Velvet Vault — Sean Michael Paterson. All rights reserved. */
/**
 * Velvet Vault — Global Topbar
 * Renders a sticky header with brand mark (left) + hamburger button (right).
 * The hamburger opens a slide-out drawer containing the main navigation links.
 */

const MAIN_NAV = [
  { href: "index.html",        label: "Home" },
  { href: "login.html",        label: "Login" },
  { href: "members.html",      label: "Members" },
  { href: "slots-lobby.html",  label: "Slots" },
  { href: "slots.html",        label: "Play" },
  { href: "promotions.html",   label: "Promotions" },
  { href: "ledger.html",       label: "Ledger" },
];

function currentPage() {
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function injectDrawerCSS() {
  if (document.getElementById("vvNavDrawerCSS")) return;
  const link = document.createElement("link");
  link.id = "vvNavDrawerCSS";
  link.rel = "stylesheet";
  link.href = "css/vv-nav-drawer.css";
  document.head.appendChild(link);
}

function buildDrawer() {
  if (document.getElementById("vvNavDrawer")) return;

  const cur = currentPage();

  const overlay = document.createElement("div");
  overlay.id = "vvNavOverlay";
  overlay.className = "vvNavOverlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("nav");
  drawer.id = "vvNavDrawer";
  drawer.className = "vvNavDrawer";
  drawer.setAttribute("aria-label", "Site navigation");
  drawer.setAttribute("aria-hidden", "true");

  const items = MAIN_NAV.map(function(l) {
    var active = cur === l.href ? ' style="color:#d4af37"' : "";
    return '<li><a class="vvDrawerItem" href="' + l.href + '"' + active + '>' + l.label + '</a></li>';
  }).join("");

  drawer.innerHTML =
    '<div class="vvDrawerHeader">' +
      '<span class="vvDrawerTitle">VELVET VAULT</span>' +
      '<button id="vvDrawerClose" class="vvIconBtn" type="button" aria-label="Close menu" ' +
        'style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:1.2rem;cursor:pointer;padding:4px 8px;">' +
        '\u2715</button>' +
    '</div>' +
    '<ul class="vvDrawerList">' + items + '</ul>';

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  function openDrawer() {
    overlay.classList.add("vv-open");
    drawer.classList.add("vv-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    var h = document.getElementById("vvHamburgerGlobal");
    if (h) h.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    overlay.classList.remove("vv-open");
    drawer.classList.remove("vv-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    var h = document.getElementById("vvHamburgerGlobal");
    if (h) h.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  overlay.addEventListener("click", closeDrawer);
  document.getElementById("vvDrawerClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeDrawer(); });

  window.__vvOpenDrawer = openDrawer;
  window.__vvCloseDrawer = closeDrawer;
}

export function renderTopbar() {
  var host = document.getElementById("vv-topbar");
  if (!host) return;

  injectDrawerCSS();

  host.innerHTML =
    '<div class="vv-topbar">' +
      '<div class="vv-container" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">' +
        '<a href="index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;">' +
          '<div style="width:36px;height:36px;border-radius:12px;flex-shrink:0;' +
            'background:radial-gradient(circle at 30% 30%,rgba(0,255,154,0.35),transparent 55%),' +
            'radial-gradient(circle at 70% 70%,rgba(255,35,61,0.35),transparent 55%),' +
            'linear-gradient(135deg,rgba(255,35,61,0.20),rgba(0,255,154,0.20));' +
            'border:1px solid rgba(255,255,255,0.16);position:relative;overflow:hidden;">' +
            '<span style="position:absolute;inset:-30%;background:conic-gradient(from 180deg,transparent,rgba(255,35,61,0.25),transparent,rgba(0,255,154,0.25),transparent);animation:sigilSpin 8s linear infinite;opacity:.85;"></span>' +
          '</div>' +
          '<div>' +
            '<div style="font-family:var(--vv-font-display,serif);letter-spacing:0.10em;font-weight:700;color:var(--vv-text,#fff);font-size:0.95rem;">Velvet Vault</div>' +
            '<small style="color:var(--vv-muted,rgba(255,255,255,0.45));letter-spacing:0.06em;font-size:0.68rem;">VIP Noir Slots Club</small>' +
          '</div>' +
        '</a>' +
        '<button id="vvHamburgerGlobal" class="vvHamburger" type="button" ' +
          'aria-label="Open navigation menu" aria-expanded="false" aria-controls="vvNavDrawer">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
    '</div>';

  buildDrawer();

  var btn = document.getElementById("vvHamburgerGlobal");
  if (btn) {
    btn.addEventListener("click", function() {
      if (window.__vvOpenDrawer) window.__vvOpenDrawer();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderTopbar, { once: true });
} else {
  renderTopbar();
}
