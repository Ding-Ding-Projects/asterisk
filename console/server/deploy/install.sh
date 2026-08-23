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

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root (it installs a system service and a service user)." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH. Install Node.js 22 or newer, then re-run this script." >&2
  exit 1
fi

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

mkdir -p "$INSTALL_DIR" "$DATA_DIR"
rsync -a --delete \
  --exclude node_modules --exclude .git \
  "$SOURCE_DIR/dist/" "$INSTALL_DIR/dist/"
rsync -a --delete "$SOURCE_DIR/dist-electron/" "$INSTALL_DIR/dist-electron/"
if [[ -d "$SOURCE_DIR/resources" ]]; then
  rsync -a --delete "$SOURCE_DIR/resources/" "$INSTALL_DIR/resources/"
fi

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR" "$DATA_DIR"
chmod 700 "$DATA_DIR"

install -m 644 "$SOURCE_DIR/server/deploy/ding-pbx-console.service" /etc/systemd/system/ding-pbx-console.service
systemctl daemon-reload
systemctl enable ding-pbx-console
systemctl restart ding-pbx-console

echo "Installed. Check status with: systemctl status ding-pbx-console"
echo "Default bind address is loopback only (127.0.0.1:8443)."
echo "Edit /etc/systemd/system/ding-pbx-console.service to change the bind address, port, or add TLS,"
echo "then: systemctl daemon-reload && systemctl restart ding-pbx-console"
