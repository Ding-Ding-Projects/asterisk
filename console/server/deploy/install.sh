#!/usr/bin/env bash
# Installs Ding PBX Console server mode on a Linux VM, alongside an already-installed
# Asterisk the console will connect to as a target. Run as root.
#
# This script only ever touches paths it creates itself
# (/opt/ding-pbx-console, /var/lib/ding-pbx-console, the ding-pbx-console system user
# and the systemd unit it installs) and never touches Asterisk's own configuration or
# service — the console reaches Asterisk entirely through its own bounded control
# plane at runtime, the same allowlisted executor used everywhere else in this project.
set -euo pipefail

INSTALL_DIR=/opt/ding-pbx-console
DATA_DIR=/var/lib/ding-pbx-console
SERVICE_USER=ding-pbx-console
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_UNIT=ding-pbx-console.service
SERVICE_PORT=8443
HEALTH_PATH=/api/setup

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root (it installs a system service and a service user)." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH. Install Node.js 22 or newer, then re-run this script." >&2
  exit 1
fi

for required in \
  "$SOURCE_DIR/dist" \
  "$SOURCE_DIR/dist-electron/server/bin/ding-pbx-server.js" \
  "$SOURCE_DIR/resources" \
  "$SOURCE_DIR/server/deploy/ding-pbx-console.service"; do
  if [[ ! -e "$required" ]]; then
    echo "Deployment payload is incomplete: missing $required" >&2
    exit 1
  fi
done

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

mkdir -p "$INSTALL_DIR" "$DATA_DIR"
rm -rf "$INSTALL_DIR/dist" "$INSTALL_DIR/dist-electron" "$INSTALL_DIR/resources"
cp -a "$SOURCE_DIR/dist" "$INSTALL_DIR/dist"
cp -a "$SOURCE_DIR/dist-electron" "$INSTALL_DIR/dist-electron"
cp -a "$SOURCE_DIR/resources" "$INSTALL_DIR/resources"

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR" "$DATA_DIR"
chmod 700 "$DATA_DIR"

install -m 644 "$SOURCE_DIR/server/deploy/ding-pbx-console.service" "/etc/systemd/system/$SERVICE_UNIT"
systemctl daemon-reload
systemctl enable "$SERVICE_UNIT"
systemctl restart "$SERVICE_UNIT"

health_url="http://127.0.0.1:${SERVICE_PORT}${HEALTH_PATH}"
health_observed=0
for _attempt in $(seq 1 30); do
  if node - "$health_url" <<'NODE'
const url = process.argv[2];
(async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) process.exit(1);
  const body = await response.json();
  if (typeof body !== 'object' || body === null) process.exit(1);
  if (typeof body.needsSetup !== 'boolean' || typeof body.tlsEnabled !== 'boolean') process.exit(1);
})().catch(() => process.exit(1));
NODE
  then
    health_observed=1
    break
  fi
  sleep 1
done

if [[ "$health_observed" -ne 1 ]]; then
  echo "The service did not answer $health_url with valid readiness metadata." >&2
  systemctl status "$SERVICE_UNIT" --no-pager >&2 || true
  exit 1
fi

echo "Installed. Check status with: systemctl status $SERVICE_UNIT"
echo "The admin surface is listening on port $SERVICE_PORT and readiness was observed at $HEALTH_PATH."
echo "DING_PBX_INSTALL_OK $SERVICE_UNIT $SERVICE_PORT $HEALTH_PATH"
