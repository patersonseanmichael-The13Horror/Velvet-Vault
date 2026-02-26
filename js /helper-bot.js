(function () {
  "use strict";
  if (window.__VV_HELPER_BOT_INIT__) return;
  window.__VV_HELPER_BOT_INIT__ = true;

  const ACTIVATE_MS = 1200;
  const LONG_PRESS_MS = 680;

  const faq = [
    {
      test: /wallet|balance|gold|fund/i,
      reply: "Wallet updates after each game action and persists via localStorage. Check Ledger for entry history."
    },
    {
      test: /login|auth|kick|redirect/i,
      reply: "Protected pages require active login. If redirected, sign in on login.html and return to Lobby."
    },
    {
      test: /slots|machine|auto/i,
      reply: "Use Slots Lobby cards to pick a machine profile. Auto-spin stops when funds are below bet."
    },
    {
      test: /roulette|blackjack|poker/i,
      reply: "Table games are in the Lobby quick links. Wallet debits on bet, credits on wins."
    },
    {
      test: /ledger|history|statement/i,
      reply: "Ledger lists recent debit/credit entries with timestamps and post-transaction balance."
    },
    {
      test: /logout|sign out/i,
      reply: "Use Logout in the top navigation or the helper shortcut button."
    }
  ];

  function ensureLauncher() {
    let btn = document.getElementById("vvHelperOpen");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "vvHelperOpen";
    btn.className = "vvHelperLauncher";
    btn.type = "button";
    btn.hidden = true;
    btn.textContent = "Help";
    document.body.appendChild(btn);
    return btn;
  }

  function ensureWidget() {
    let widget = document.getElementById("vvHelper");
    if (widget) return widget;

    widget = document.createElement("aside");
    widget.id = "vvHelper";
    widget.className = "vvHelperBot";
    widget.innerHTML = `
      <div class="vvHelperHead">
        <b>Helper</b>
        <button id="vvHelperClose" class="vvHelperClose" type="button" aria-label="Close">×</button>
      </div>
      <div id="vvHelperBody" class="vvHelperBody"></div>
    `;
    document.body.appendChild(widget);
    return widget;
  }

  const launcher = ensureLauncher();
  const widget = ensureWidget();
  const closeBtn = document.getElementById("vvHelperClose");
  const body = document.getElementById("vvHelperBody");

  if (!launcher || !widget || !closeBtn || !body) return;

  function revealLauncher() {
    launcher.hidden = false;
    if (launcher.style && launcher.style.display === "none") {
      launcher.style.display = "inline-flex";
    }
  }

  function logoutNow() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.click();
    } else {
      window.location.href = "login.html";
    }
  }

  function render() {
    body.innerHTML = `
      <div>Use quick links or ask a short question.</div>
      <div class="vvHelperLinks">
        <a class="vvHelperChip" href="members.html">Lobby</a>
        <a class="vvHelperChip" href="slots.html?m=machine-01">Slots</a>
        <a class="vvHelperChip" href="roulette.html">Roulette</a>
        <a class="vvHelperChip" href="blackjack.html">Blackjack</a>
        <a class="vvHelperChip" href="poker.html">Poker</a>
        <a class="vvHelperChip" href="ledger.html">Ledger</a>
        <button class="vvHelperChip" id="vvHelperLogout" type="button">Logout</button>
      </div>
      <div class="vvHelperFaq">
        <div>FAQ</div>
        <div class="vvHelperInputRow">
          <input id="vvHelperQ" type="text" placeholder="Ask about wallet, login, games..." />
          <button id="vvHelperAsk" type="button">Ask</button>
        </div>
        <p id="vvHelperReply" class="vvHelperReply">Tip: press V twice quickly to open this panel.</p>
      </div>
    `;

    document.getElementById("vvHelperLogout")?.addEventListener("click", logoutNow);

    const askBtn = document.getElementById("vvHelperAsk");
    const qInput = document.getElementById("vvHelperQ");
    const reply = document.getElementById("vvHelperReply");

    function respond() {
      const q = (qInput?.value || "").trim();
      if (!reply) return;
      if (!q) {
        reply.textContent = "Try: wallet, login, slots, roulette, blackjack, poker, ledger, logout.";
        return;
      }
      const hit = faq.find((f) => f.test.test(q));
      reply.textContent = hit
        ? hit.reply
        : "Navigate with the chips above. For account access issues, return to login and re-enter Lobby.";
    }

    askBtn?.addEventListener("click", respond);
    qInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        respond();
      }
    });
  }

  function open() {
    render();
    revealLauncher();
    widget.classList.add("is-open");
    widget.style.display = "block";
  }

  function close() {
    widget.classList.remove("is-open");
    widget.style.display = "none";
  }

  launcher.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  let lastV = 0;
  document.addEventListener("keydown", (e) => {
    if (String(e.key).toLowerCase() !== "v") return;
    const now = Date.now();
    if (now - lastV <= ACTIVATE_MS) open();
    lastV = now;
  });

  const pressTarget = document.getElementById("vvFooterLogo") || document.querySelector(".sigil") || document.querySelector(".brand");
  if (pressTarget) {
    let pressTimer = 0;
    const begin = () => {
      clearTimeout(pressTimer);
      pressTimer = window.setTimeout(open, LONG_PRESS_MS);
    };
    const end = () => {
      clearTimeout(pressTimer);
      pressTimer = 0;
    };

    pressTarget.addEventListener("touchstart", begin, { passive: true });
    pressTarget.addEventListener("touchend", end, { passive: true });
    pressTarget.addEventListener("touchcancel", end, { passive: true });
    pressTarget.addEventListener("mousedown", begin);
    pressTarget.addEventListener("mouseup", end);
    pressTarget.addEventListener("mouseleave", end);
  }
})();
