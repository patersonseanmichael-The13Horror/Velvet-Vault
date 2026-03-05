/* © 2026 Velvet Vault — Sean Michael Paterson. All rights reserved. */
/**
 * Velvet Vault — Shared Nav Drawer (for vvShell pages)
 * Injects the global hamburger drawer with main navigation links.
 * Works on pages that use the vvShell/vvTopbar pattern (not topbar.js).
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

function initNavDrawer() {
  injectDrawerCSS();

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
    const active = cur === l.href ? ' style="color:#d4af37"' : "";
    return `<li><a class="vvDrawerItem" href="${l.href}"${active}>${l.label}</a></li>`;
  }).join("");

  drawer.innerHTML = `
    <div class="vvDrawerHeader">
      <span class="vvDrawerTitle">VELVET VAULT</span>
      <button id="vvDrawerClose" class="vvIconBtn" type="button" aria-label="Close menu"
        style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:1.2rem;cursor:pointer;padding:4px 8px;">&#x2715;</button>
    </div>
    <ul class="vvDrawerList">${items}</ul>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  function openDrawer() {
    overlay.classList.add("vv-open");
    drawer.classList.add("vv-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    document.querySelectorAll("[data-vv-hamburger]").forEach(function(h) {
      h.setAttribute("aria-expanded", "true");
    });
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    overlay.classList.remove("vv-open");
    drawer.classList.remove("vv-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    document.querySelectorAll("[data-vv-hamburger]").forEach(function(h) {
      h.setAttribute("aria-expanded", "false");
    });
    document.body.style.overflow = "";
  }

  overlay.addEventListener("click", closeDrawer);
  document.getElementById("vvDrawerClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeDrawer(); });

  window.__vvOpenDrawer = openDrawer;
  window.__vvCloseDrawer = closeDrawer;

  // Wire up any hamburger buttons already in the DOM
  document.querySelectorAll("[data-vv-hamburger]").forEach(function(btn) {
    btn.addEventListener("click", openDrawer);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavDrawer, { once: true });
} else {
  initNavDrawer();
}
