window.VV_SLOT_SERVER_URL = window.VV_SLOT_SERVER_URL || "";

if (window.VV_SLOT_SERVER_URL) {
  fetch(`${window.VV_SLOT_SERVER_URL}/health`).catch(() => {});
}
