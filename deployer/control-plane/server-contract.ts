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
 *   - Installs Asterisk if not already present.
 *   - Installs and enables a systemd unit named `SERVICE_UNIT_NAME` that runs the
 *     server-mode HTTP admin surface.
 *   - Prints a single line `DING_PBX_INSTALL_OK <version>` on standard output when it
 *     finishes successfully, and a non-zero exit code otherwise.
 */
export const INSTALL_SCRIPT_REMOTE_PATH = "/tmp/ding-pbx-install.sh";

/** The systemd unit name the install script is expected to install and enable. */
export const SERVICE_UNIT_NAME = "ding-pbx-server";

/** Default TCP port the server-mode HTTP admin surface listens on. */
export const DEFAULT_SERVER_PORT = 8088;

/**
 * The health endpoint the server-mode HTTP admin surface is expected to expose,
 * unauthenticated, so the deployer can verify a deployment without needing credentials
 * it was never given. Relative to `http://<host>:<port>`.
 */
export const HEALTH_PATH = "/api/v1/health";

/** What GET `HEALTH_PATH` is expected to return as JSON. Target readiness is a separate authenticated route. */
export interface ServerHealth {
  status: "ok";
  service: "ding-pbx-control-plane";
  targetReadiness: "authenticated";
  /** The hosted liveness route never claims that the target is ready. */
  asteriskVersion?: string;
  /** Whether the admin surface requires sign-in before any mutating action. */
  authRequired: boolean;
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
    return { ok: false, reason: "The health endpoint did not return valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "The health endpoint did not return a JSON object." };
  }
  const record = parsed as Record<string, unknown>;
  if (record.status !== "ok") {
    return { ok: false, reason: `The health endpoint reported status ${JSON.stringify(record.status)}.` };
  }
  if (record.service !== "ding-pbx-control-plane") {
    return { ok: false, reason: "The health endpoint did not identify the hosted control plane." };
  }
  if (record.targetReadiness !== "authenticated") {
    return { ok: false, reason: "The health endpoint incorrectly claimed unauthenticated target readiness." };
  }
  if (typeof record.authRequired !== "boolean") {
    return { ok: false, reason: "The health endpoint did not report whether sign-in is required." };
  }
  return {
    ok: true,
    value: { status: "ok", service: "ding-pbx-control-plane", targetReadiness: "authenticated", authRequired: record.authRequired },
  };
}
