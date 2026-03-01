// Set this to your Render slot server URL before frontend deploy.
// Example:
// window.VV_SLOT_SERVER_URL = "https://velvet-vault-slot-server.onrender.com";
// Frontend origin for Render CORS:
// ALLOWED_ORIGINS=https://patersonseanmichael-the13horror.github.io
window.VV_SLOT_SERVER_URL = "https://velvet-vault.onrender.com";

if (window.VV_SLOT_SERVER_URL) {
  fetch(`${window.VV_SLOT_SERVER_URL}/health`).catch(() => {});
}
