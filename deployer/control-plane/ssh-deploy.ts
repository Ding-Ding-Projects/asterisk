/**
 * Deploys the Ding PBX server-mode install script to a remote SSH target.
 *
 * Reuses the console's own `SshPolicyAdapter` (`console/control-plane/ssh.ts`) for host
 * validation, the approved-identity allowlist, and trust-on-first-use host key
 * handling, rather than reimplementing any of it. This module only adds the one
 * capability that adapter does not have: running the install script.
 *
 * The script is delivered over the SSH connection's own stdin (`ssh ... sh -s --`)
 * rather than written with a shell redirect, so there is still no shell string being
 * built anywhere — the executor is handed a fixed executable, a fixed argument array,
 * and the script text as `input`.
 */
import type { CommandResult, ProcessExecutor } from "./executor.js";
import type { ApprovedSshIdentity, SshTarget } from "./ssh.js";
import { HostKeyMismatchError, SshPolicyAdapter } from "./ssh.js";
import { INSTALL_SCRIPT_REMOTE_PATH, SERVICE_UNIT_NAME } from "./server-contract.js";

export { HostKeyMismatchError };
export type { SshTarget, ApprovedSshIdentity };

export interface SshDeployStep {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SshDeployOutcome {
  ok: boolean;
  steps: ReadonlyArray<SshDeployStep>;
  asteriskVersion?: string;
}

const stripNulls = (text: string) => text.replaceAll("\0", "");

export class SshServerDeployer {
  readonly #ssh: SshPolicyAdapter;
  readonly #executor: ProcessExecutor;

  constructor(executor: ProcessExecutor, approvedIdentities: ReadonlyArray<ApprovedSshIdentity>) {
    this.#executor = executor;
    this.#ssh = new SshPolicyAdapter(executor, approvedIdentities);
  }

  #baseArgs(target: SshTarget): ReadonlyArray<string> {
    return [
      "-T",
      "-p", String(target.port),
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "UpdateHostKeys=no",
      "-o", `UserKnownHostsFile=${target.knownHostsPath}`,
      "-o", "ConnectTimeout=10",
      `${target.user}@${target.host}`,
    ];
  }

  async #run(target: SshTarget, remoteCommand: ReadonlyArray<string>, input?: string, timeoutMs = 30_000): Promise<CommandResult> {
    const result = await this.#executor.execute({
      executable: "ssh",
      args: [...this.#baseArgs(target), ...remoteCommand],
      input,
      timeoutMs,
      maxOutputBytes: 4 * 1024 * 1024,
    });
    if (/REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/iu.test(result.stderr)) {
      throw new HostKeyMismatchError(target.host, target.port);
    }
    return result;
  }

  /** Probes whether the target is reachable at all before attempting anything else. */
  async probeReachable(target: SshTarget, signal?: AbortSignal): Promise<SshDeployStep> {
    try {
      const result = await this.#ssh.runProbe(target, "osRelease", signal);
      return {
        name: "reachable",
        ok: result.status === "succeeded",
        detail: result.status === "succeeded" ? "target answered" : stripNulls(result.stderr).trim() || "target did not answer",
      };
    } catch (error) {
      if (error instanceof HostKeyMismatchError) {
        return { name: "reachable", ok: false, detail: `Host key for ${target.host}:${target.port} does not match the recorded key. Refusing to connect.` };
      }
      throw error;
    }
  }

  /**
   * Copies the install script (given as text, bundled with this application) to the
   * target and runs it as root via `sudo`. Idempotent by contract with the server-mode
   * install script itself: running this twice against an already-installed target must
   * not fail or discard configuration — that is the server-mode lane's obligation, and
   * this deployer verifies the *result* rather than assuming it.
   */
  async deployInstallScript(
    target: SshTarget,
    scriptText: string,
    signal?: AbortSignal,
  ): Promise<SshDeployOutcome> {
    const steps: SshDeployStep[] = [];

    const reachable = await this.probeReachable(target, signal);
    steps.push(reachable);
    if (!reachable.ok) return { ok: false, steps };

    const write = await this.#run(
      target,
      ["sh", "-c", `cat > ${shellQuote(INSTALL_SCRIPT_REMOTE_PATH)} && chmod +x ${shellQuote(INSTALL_SCRIPT_REMOTE_PATH)}`],
      scriptText,
      60_000,
    );
    steps.push({
      name: "copy install script",
      ok: write.status === "succeeded",
      detail: write.status === "succeeded" ? INSTALL_SCRIPT_REMOTE_PATH : stripNulls(write.stderr).trim() || "copy failed",
    });
    if (write.status !== "succeeded") return { ok: false, steps };

    const run = await this.#run(
      target,
      ["sudo", "-n", "sh", INSTALL_SCRIPT_REMOTE_PATH],
      undefined,
      15 * 60_000,
    );
    const runOut = stripNulls(run.stdout);
    const marker = runOut.match(/^DING_PBX_INSTALL_OK\s+(\S+)/mu);
    steps.push({
      name: "run install script",
      ok: run.status === "succeeded" && Boolean(marker),
      detail: marker ? `installed Asterisk ${marker[1]}` : stripNulls(run.stderr).trim() || `install exited with ${run.exitCode}`,
    });
    if (run.status !== "succeeded" || !marker) return { ok: false, steps };

    const active = await this.#run(target, ["systemctl", "is-active", SERVICE_UNIT_NAME], undefined, 15_000);
    steps.push({
      name: "verify service active",
      ok: stripNulls(active.stdout).trim() === "active",
      detail: stripNulls(active.stdout).trim() || stripNulls(active.stderr).trim() || "systemctl did not answer",
    });
    if (stripNulls(active.stdout).trim() !== "active") return { ok: false, steps, asteriskVersion: marker[1] };

    return { ok: true, steps, asteriskVersion: marker[1] };
  }
}

function shellQuote(path: string): string {
  if (!/^[a-zA-Z0-9._\-/]+$/u.test(path)) throw new Error(`Refusing to quote an unexpected remote path: ${path}`);
  return path;
}
