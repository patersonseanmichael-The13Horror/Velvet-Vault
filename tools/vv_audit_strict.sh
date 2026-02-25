#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null || { echo "Node missing"; exit 1; }
command -v python3 >/dev/null || { echo "python3 missing"; exit 1; }

PORT="${1:-4173}"
LOG="/tmp/vv_http.log"

cleanup() {
  if [[ -n "${HPID:-}" ]]; then
    kill "$HPID" >/dev/null 2>&1 || true
    wait "$HPID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "[VV] Starting local server on :$PORT"
python3 -m http.server "$PORT" >/tmp/vv_http.log 2>&1 &
HPID=$!
sleep 1

echo "[VV] Running strict audit (Playwright via npx)…"
npx -y -p playwright node tools/vv_audit_strict.mjs
