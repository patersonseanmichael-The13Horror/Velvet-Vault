#!/usr/bin/env bash
set -euo pipefail

PORT=4173
LOG=/tmp/vv_http.log

python3 -m http.server "$PORT" >"$LOG" 2>&1 &
HPID=$!

cleanup() {
  kill "$HPID" 2>/dev/null || true
  wait "$HPID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1

# Run Playwright via npx
npx -y -p playwright node tools/vv_audit.mjs
