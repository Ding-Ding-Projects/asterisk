/**
 * The interface this deployer needs from the Ding PBX server-mode lane.
 *
 * The server-mode work (an HTTP-hosted admin surface with authentication, a systemd
 * unit, and an install script) is being built concurrently by a different lane in this
 * same repository. This deployer does not read that lane's files or guess at its
 * internals; it is written against the contract below, which is deliberately explicit
 * so the two lanes can integrate without either one depending on the other's source.
 *
 * If the real server-mode lane ships something different, only this one file needs to
 * change — every other module in `deployer/control-plane` consumes these constants and
 * the `ServerHealth` shape, never a hard-coded path or URL of its own.
 */

/**
 * Absolute path, on the target machine, of the install script the server-mode lane
 * ships. The deployer copies its own bundled copy of this script to the target (local
 * VM or remote SSH host) and runs it as `root`/`sudo`. The script is expected to be
 * idempotent: running it twice on a machine that already has the server installed must
 * not fail and must not discard existing configuration.
 *
 * Expected script behavior (documented here because the deployer's tests assert
 * against it):
 *   - Requires the target's existing Asterisk installation to remain available.
 *   - Installs and enables a systemd unit named `SERVICE_UNIT_NAME` that runs the
 *     server-mode HTTP admin surface.
 *   - Prints the exact success marker only after the installed server answers its
 *     readiness route, and exits non-zero otherwise.
 */
export const REMOTE_PAYLOAD_ROOT = "/tmp/ding-pbx-console-payload";
export const INSTALL_SCRIPT_REMOTE_PATH = `${REMOTE_PAYLOAD_ROOT}/server/deploy/install.sh`;

/** The systemd unit name the install script is expected to install and enable. */
export const SERVICE_UNIT_NAME = "ding-pbx-console.service";

/** Default TCP port the server-mode HTTP admin surface listens on. */
export const DEFAULT_SERVER_PORT = 8443;

/**
 * The readiness route the server-mode HTTP admin surface exposes,
 * unauthenticated, so the deployer can verify a deployment without needing credentials
 * it was never given. Relative to `http://<host>:<port>`.
 */
export const HEALTH_PATH = "/api/setup";
export const INSTALL_SUCCESS_MARKER = `DING_PBX_INSTALL_OK ${SERVICE_UNIT_NAME} ${DEFAULT_SERVER_PORT} ${HEALTH_PATH}`;

/** What GET `HEALTH_PATH` returns as JSON. */
export interface ServerHealth {
  needsSetup: boolean;
  tlsEnabled: boolean;
}

export function healthUrl(host: string, port: number): string {
  return `http://${host}:${port}${HEALTH_PATH}`;
}

/**
 * Validates a response body against the documented `ServerHealth` shape without
 * trusting an untyped `JSON.parse` result. Returns the narrowed value or a reason the
 * response did not match the contract.
 */
export function parseServerHealth(body: string): { ok: true; value: ServerHealth } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, reason: "The readiness route did not return valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "The readiness route did not return a JSON object." };
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.needsSetup !== "boolean") {
    return { ok: false, reason: "The readiness route did not report whether first-run setup is required." };
  }
  if (typeof record.tlsEnabled !== "boolean") {
    return { ok: false, reason: "The readiness route did not report whether TLS is enabled." };
  }
  return {
    ok: true,
    value: { needsSetup: record.needsSetup, tlsEnabled: record.tlsEnabled },
  };
}
