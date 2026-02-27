// Velvet Vault - Slots Hub list
// Click a machine => opens slots.html with that machine selected.
import { MACHINE_CONFIGS } from "../slots/machines.js";

const grid = document.getElementById("slotsGrid");

function setLastMachine(key) {
  try {
    localStorage.setItem("vv_last_machine", key);
  } catch (_) {
    // Ignore storage failures in private mode / restricted contexts.
  }
}

function slotsHref(key, extraHash = "") {
  const base = `slots.html?m=${encodeURIComponent(key)}`;
  return `${base}#machine=${encodeURIComponent(key)}${extraHash}`;
}

function card(m) {
  const el = document.createElement("article");
  el.className = "machineCard";
  el.innerHTML = `
    <div class="machineCardHead">
      <div>
        <div class="machineTitle">${escapeHtml(m.name)}</div>
        <div class="machineKey">${escapeHtml(m.id.replaceAll("-", " "))}</div>
      </div>
      <button class="btn" type="button" data-open="${escapeHtml(m.id)}">Open</button>
    </div>
    <div class="machineCardBody">
      <p class="machineDesc">${escapeHtml(m.description)}</p>
      <div class="machineBadges">
        <span class="badge">5x3</span>
        <span class="badge">10 Lines</span>
        <span class="badge">${m.vip ? "VIP" : "Classic"}</span>
        <span class="badge">Free Spins</span>
      </div>
      <div class="machineActions">
        <a class="btn primary" href="${slotsHref(m.id)}" data-openlink="${escapeHtml(m.id)}">Play</a>
        <a class="btn" href="${slotsHref(m.id, "&paytable=1")}" data-openlink="${escapeHtml(m.id)}">Paytable</a>
      </div>
    </div>
  `;
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}

if (grid) {
  grid.innerHTML = "";
  MACHINE_CONFIGS.forEach((m) => grid.appendChild(card(m)));

  // Save selection so slots page can recover it.
  grid.addEventListener("click", (e) => {
    const openButton = e.target.closest("[data-open]");
    if (openButton) {
      const key = openButton.getAttribute("data-open");
      if (!key) return;
      setLastMachine(key);
      location.href = slotsHref(key);
      return;
    }

    const openLink = e.target.closest("[data-openlink]");
    if (openLink) {
      const key = openLink.getAttribute("data-openlink");
      if (key) setLastMachine(key);
    }
  });
}

