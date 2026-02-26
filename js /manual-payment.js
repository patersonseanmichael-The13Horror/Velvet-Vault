(function(){
  const form = document.getElementById("vvManualForm");
  if(!form) return;

  const msg = document.getElementById("vvManualMsg");
  const fileInput = document.getElementById("vvScreenshot");

  function setMsg(t){ if(msg) msg.textContent = t; }

  form.addEventListener("submit", (e)=>{
    e.preventDefault();

    const file = fileInput?.files?.[0] || null;
    if(!file){
      setMsg("Upload a screenshot first.");
      return;
    }

    const payload = {
      name: "Michael Sean",
      payId: "ledgertheivory@gmail.com",
      reference: "2009855",
      description: "Items Purchased Ebay",
      screenshotName: file.name,
      screenshotSize: file.size,
      createdAt: new Date().toISOString(),
      status: "PENDING_REVIEW"
    };

    // store for manual review (client-side only)
    localStorage.setItem("vv_manual_payment_submission", JSON.stringify(payload));

    setMsg("Submission received. Manual review pending.");
    // reset file input only (keep prefills)
    fileInput.value = "";
  });
})();
