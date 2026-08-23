#!/usr/bin/env bash
# Runs on every boot (cheap and idempotent — it only reads the current network
# state and writes /etc/issue), so the address printed at the login console is
# never stale. Writes no credential; the console itself refuses every request
# until an operator visits it and creates the first admin account.
set -euo pipefail

PORT="${DING_PORT:-8443}"
ADDR="$(hostname -I 2>/dev/null | awk '{print $1}')"
{
  echo "Ding PBX"
  echo "========"
  if [[ -n "$ADDR" ]]; then
    echo "Console admin setup: http://${ADDR}:${PORT}/"
  else
    echo "Console admin setup: http://<this-machine-ip>:${PORT}/ (no network address detected yet)"
  fi
  echo "No admin account exists yet. Visit the address above from a browser on this"
  echo "network to create one. Nobody can sign in until you do."
  echo
} > /etc/issue
