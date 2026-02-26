/* ==========================================================
   Velvet Vault — Manual Review Upload
   - Uploads image to Storage uploads/{uid}/...
   - Creates manual review doc via callable vvCreateManualReview
   - Requires logged in user
   ========================================================== */

import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";

const app = window.vvApp;
const auth = window.vvAuth;

const storage = getStorage(app);
const fx = getFunctions(app);
const vvCreateManualReview = httpsCallable(fx, "vvCreateManualReview");

function $(id){ return document.getElementById(id); }

export function initManualUpload() {
  const fileInput = $("manualFile");
  const msg = $("manualMsg");
  const submitBtn = $("manualSubmit");
  const uploadBtn = $("manualUpload");

  const payidEl = $("manualPayId");
  const refEl = $("manualReference");
  const descEl = $("manualDescription");

  if (!fileInput || !submitBtn || !uploadBtn) return;

  let uploadedPath = "";

  uploadBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) { msg.textContent = "Please login first."; return; }

    const f = fileInput.files?.[0];
    if (!f) { msg.textContent = "Choose a screenshot to upload."; return; }
    if (!f.type.startsWith("image/")) { msg.textContent = "Only image files allowed."; return; }
    if (f.size > 5 * 1024 * 1024) { msg.textContent = "Max file size is 5MB."; return; }

    msg.textContent = "Uploading…";
    const safeName = (f.name || "screenshot").replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);
    uploadedPath = `uploads/${user.uid}/${Date.now()}_${safeName}`;

    try {
      const r = ref(storage, uploadedPath);
      await uploadBytes(r, f, { contentType: f.type });
      msg.textContent = "Uploaded. Ready to submit for review.";
    } catch (e) {
      uploadedPath = "";
      msg.textContent = "Upload failed. Try again.";
    }
  });

  submitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) { msg.textContent = "Please login first."; return; }
    if (!uploadedPath) { msg.textContent = "Upload a screenshot first."; return; }

    const payload = {
      payid: String(payidEl?.value || "").trim(),
      reference: String(refEl?.value || "").trim(),
      description: String(descEl?.value || "").trim(),
      filePath: uploadedPath
    };

    msg.textContent = "Submitting…";
    try {
      await vvCreateManualReview(payload);
      msg.textContent = "Submitted. Vault team will review shortly.";
      // reset
      fileInput.value = "";
    } catch {
      msg.textContent = "Submit failed. Try again.";
    }
  });
}

// Optional auto-init if elements exist
document.addEventListener("DOMContentLoaded", () => {
  initManualUpload();
});
