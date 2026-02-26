(function ledgerInit(){
  const requiredIds = ["bal","rows","testCredit","testDebit"];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.warn("[Ledger] Missing elements, skipping init:", missing.join(", "));
    return;
  }

  const bal = document.getElementById("bal");
  const rows = document.getElementById("rows");

  function render(){
    if(!window.VaultEngine?.user) return;
    bal.textContent = window.VaultEngine.formatGold(window.VaultEngine.getBalance());

    const led = window.VaultEngine.getLedger();
    rows.innerHTML = led.slice(0, 50).map(e => {
      const t = new Date(e.ts).toLocaleString();
      const type = e.type === "credit" ? "CREDIT" : "DEBIT";
      const amt = (e.type === "credit" ? "+" : "-") + Number(e.amount).toFixed(0);
      const note = (e.note || "").replaceAll("<","&lt;").replaceAll(">","&gt;");
      return `<tr>
        <td>${t}</td>
        <td>${type}</td>
        <td>${amt}</td>
        <td>${note}</td>
        <td>${Number(e.balanceAfter).toFixed(0)}</td>
      </tr>`;
    }).join("");
  }

  const wait = setInterval(() => {
    if(window.VaultEngine){
      clearInterval(wait);
      window.VaultEngine.subscribe(render);
      render();
    }
  }, 100);

  document.getElementById("testCredit").onclick = () => window.VaultEngine.credit(500, "ledger-test-credit");
  document.getElementById("testDebit").onclick  = () => window.VaultEngine.debit(200, "ledger-test-debit");
})();
