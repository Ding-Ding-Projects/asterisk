#!/usr/bin/env bash
# Runs once, inside the target chroot, as an autoinstall late-command
# (see console/scripts/iso/user-data). Installs the payload placed at
# /opt/ding-pbx-install by build-iso.ps1's late-commands step onto the
# machine that is about to become the Ding PBX server.
#
# No secret of any kind is created, read, or written here. The console's own
# first-run flow (console/server/auth.ts createAdminAccount) is what forces
# credential creation, on the operator's first visit to the admin surface —
# never a fixed or ISO-embedded password.
set -euo pipefail

PAYLOAD=/opt/ding-pbx-install
[[ -d "$PAYLOAD" ]] || { echo "install-target.sh: $PAYLOAD is missing; the ISO payload was not staged." >&2; exit 1; }

echo "[install-target] Installing bundled Node.js runtime."
install -d /usr/local/lib/ding-pbx-node
cp -a "$PAYLOAD/runtime/node/." /usr/local/lib/ding-pbx-node/
ln -sf /usr/local/lib/ding-pbx-node/bin/node /usr/local/bin/node
ln -sf /usr/local/lib/ding-pbx-node/bin/npm /usr/local/bin/npm

echo "[install-target] Installing bundled Asterisk."
cp -a "$PAYLOAD/asterisk-root/." /
install -m 644 "$PAYLOAD/asterisk.service" /etc/systemd/system/asterisk.service
id -u asterisk >/dev/null 2>&1 || useradd --system --home-dir /var/lib/asterisk --shell /usr/sbin/nologin asterisk
install -d -o asterisk -g asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk /run/asterisk
chown -R asterisk:asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk
ldconfig
systemctl enable asterisk.service

echo "[install-target] Installing Ding PBX Console (server mode)."
mkdir -p /opt/ding-pbx-console-src/dist /opt/ding-pbx-console-src/dist-electron /opt/ding-pbx-console-src/resources /opt/ding-pbx-console-src/server/deploy
cp -a "$PAYLOAD/console/dist/." /opt/ding-pbx-console-src/dist/
cp -a "$PAYLOAD/console/dist-electron/." /opt/ding-pbx-console-src/dist-electron/
if [[ -d "$PAYLOAD/console/resources" ]]; then cp -a "$PAYLOAD/console/resources/." /opt/ding-pbx-console-src/resources/; fi
cp -a "$PAYLOAD/console/server/deploy/." /opt/ding-pbx-console-src/server/deploy/
bash /opt/ding-pbx-console-src/server/deploy/install.sh

echo "[install-target] Reachable on the LAN so a browser can complete first-run setup."
mkdir -p /etc/systemd/system/ding-pbx-console.service.d
printf '[Service]\nEnvironment=DING_HOST=0.0.0.0\n' > /etc/systemd/system/ding-pbx-console.service.d/10-lan-bind.conf
systemctl daemon-reload
systemctl enable ding-pbx-console.service

echo "[install-target] Installing the first-boot LAN-address banner."
install -m 755 "$PAYLOAD/dingpbx-firstboot-banner.sh" /usr/local/sbin/dingpbx-firstboot-banner.sh
install -m 644 "$PAYLOAD/dingpbx-firstboot-banner.service" /etc/systemd/system/dingpbx-firstboot-banner.service
systemctl enable dingpbx-firstboot-banner.service

if [[ -f "$PAYLOAD/provenance.json" ]]; then
  install -d /etc/ding-pbx
  install -m 644 "$PAYLOAD/provenance.json" /etc/ding-pbx/iso-provenance.json
fi

rm -rf "$PAYLOAD"
echo "[install-target] Done."
