# Render Slot Server

This folder is the deploy target for the compute-only slot server.

## Local

```bash
npm install
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
ALLOWED_ORIGINS='http://localhost:8000' \
node slotServer.js
```

To inspect the env var locally, use:

```bash
echo "$FIREBASE_SERVICE_ACCOUNT_JSON"
```

Health check:

```bash
curl http://127.0.0.1:3000/health
```

## Render

Use a Render Web Service with:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node slotServer.js`

Environment variables:

- `PORT=3000`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<single-line service account JSON>`
- `ALLOWED_ORIGINS=https://patersonseanmichael-the13horror.github.io`

After Render gives you the service URL, set it in [js/runtime-config.js](/home/patersonseanmichael/Velvet-Vault/js/runtime-config.js) as `window.VV_SLOT_SERVER_URL`.
