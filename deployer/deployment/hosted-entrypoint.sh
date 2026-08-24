#!/bin/sh
set -eu

if [ "${DING_ASTERISK_TRANSPORT:-}" != "local" ]; then
  echo 'DING_ASTERISK_TRANSPORT must be local for the hosted image; refusing an implicit target.' >&2
  exit 64
fi

asterisk -f -U ding-pbx -G ding-pbx &
asterisk_pid=$!
node /opt/ding-pbx-console/dist-electron/server/bin/ding-pbx-server.js &
server_pid=$!

term() {
  kill -TERM "$server_pid" "$asterisk_pid" 2>/dev/null || true
}
trap term INT TERM

while kill -0 "$server_pid" 2>/dev/null; do
  sleep 1
done
status=0
wait "$server_pid" || status=$?
kill -TERM "$asterisk_pid" 2>/dev/null || true
wait "$asterisk_pid" 2>/dev/null || true
exit "$status"
