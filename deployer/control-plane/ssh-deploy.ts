/**
 * Deploys the complete Ding PBX server payload to a remote SSH target.
 *
 * Reuses the console's own `SshPolicyAdapter` (`console/control-plane/ssh.ts`) for host
 * validation, the approved-identity allowlist, and trust-on-first-use host key
 * handling, rather than reimplementing any of it. This module only adds the one
 * capability that adapter does not have: copying the renderer, compiled server,
 * resources, service unit, and installer together before running the installer.
 */
import { join } from "node:path";
import type { CommandResult, ProcessExecutor } from "./executor.js";
import type { ApprovedSshIdentity, SshTarget } from "./ssh.js";
import { HostKeyMismatchError, SshPolicyAdapter } from "./ssh.js";
import {
  INSTALL_SCRIPT_REMOTE_PATH,
  INSTALL_SUCCESS_MARKER,
  REMOTE_PAYLOAD_ROOT,
  SERVICE_UNIT_NAME,
} from "./server-contract.js";

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

  async #run(target: SshTarget, remoteCommand: ReadonlyArray<string>, input?: string, timeoutMs = 30_000, signal?: AbortSignal): Promise<CommandResult> {
    const result = await this.#executor.execute({
      executable: "ssh",
      args: [...this.#baseArgs(target), ...remoteCommand],
      input,
      signal,
      timeoutMs,
      maxOutputBytes: 4 * 1024 * 1024,
    });
    if (/REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/iu.test(result.stderr)) {
      throw new HostKeyMismatchError(target.host, target.port);
    }
    return result;
  }

  async #copy(target: SshTarget, source: string, destination: string, timeoutMs = 5 * 60_000, signal?: AbortSignal): Promise<CommandResult> {
    const result = await this.#executor.execute({
      executable: "scp",
      args: [
        "-P", String(target.port),
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "UpdateHostKeys=no",
        "-o", `UserKnownHostsFile=${target.knownHostsPath}`,
        "-o", "ConnectTimeout=10",
        "-r",
        source,
        `${target.user}@${target.host}:${destination}`,
      ],
      timeoutMs,
      signal,
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

  /** Copies every required sibling resource, runs the installer, and removes staging. */
  async deployPayload(
    target: SshTarget,
    payloadRoot: string | undefined,
    signal?: AbortSignal,
  ): Promise<SshDeployOutcome> {
    const steps: SshDeployStep[] = [];

    const reachable = await this.probeReachable(target, signal);
    steps.push(reachable);
    if (!reachable.ok) return { ok: false, steps };
    if (!payloadRoot) {
      steps.push({ name: "complete server payload", ok: false, detail: "This build does not contain the complete server payload." });
      return { ok: false, steps };
    }

    let outcome: SshDeployOutcome = { ok: false, steps };
    try {
      outcome = await this.#installStagedPayload(target, payloadRoot, steps, signal);
    } finally {
      const cleanup = await this.#run(target, ["rm", "-rf", REMOTE_PAYLOAD_ROOT], undefined, 30_000);
      steps.push({
        name: "remove temporary payload",
        ok: cleanup.status === "succeeded",
        detail: cleanup.status === "succeeded" ? REMOTE_PAYLOAD_ROOT : stripNulls(cleanup.stderr).trim() || "temporary payload cleanup failed",
      });
      if (cleanup.status !== "succeeded") outcome = { ok: false, steps };
    }
    return outcome;
  }

  async #installStagedPayload(
    target: SshTarget,
    payloadRoot: string,
    steps: SshDeployStep[],
    signal?: AbortSignal,
  ): Promise<SshDeployOutcome> {
      const prepared = await this.#run(target, ["mkdir", "-p", `${REMOTE_PAYLOAD_ROOT}/server`], undefined, 30_000, signal);
      steps.push({
        name: "prepare remote payload",
        ok: prepared.status === "succeeded",
        detail: prepared.status === "succeeded" ? REMOTE_PAYLOAD_ROOT : stripNulls(prepared.stderr).trim() || "remote directory creation failed",
      });
      if (prepared.status !== "succeeded") return { ok: false, steps };

      const payloadParts = [
        { name: "renderer", source: join(payloadRoot, "dist"), destination: `${REMOTE_PAYLOAD_ROOT}/dist` },
        { name: "server", source: join(payloadRoot, "dist-electron"), destination: `${REMOTE_PAYLOAD_ROOT}/dist-electron` },
        { name: "resources", source: join(payloadRoot, "resources"), destination: `${REMOTE_PAYLOAD_ROOT}/resources` },
        { name: "service installer", source: join(payloadRoot, "server", "deploy"), destination: `${REMOTE_PAYLOAD_ROOT}/server/deploy` },
      ];
      for (const part of payloadParts) {
        const copy = await this.#copy(target, part.source, part.destination, 5 * 60_000, signal);
        steps.push({
          name: `copy ${part.name}`,
          ok: copy.status === "succeeded",
          detail: copy.status === "succeeded" ? part.destination : stripNulls(copy.stderr).trim() || "copy failed",
        });
        if (copy.status !== "succeeded") return { ok: false, steps };
      }

      const run = await this.#run(
        target,
        ["sudo", "-n", "sh", INSTALL_SCRIPT_REMOTE_PATH],
        undefined,
        15 * 60_000,
        signal,
      );
      const runOut = stripNulls(run.stdout);
      const markerObserved = runOut.split(/\r?\n/u).includes(INSTALL_SUCCESS_MARKER);
      steps.push({
        name: "run install script",
        ok: run.status === "succeeded" && markerObserved,
        detail: markerObserved
          ? "installer observed the server readiness route"
          : stripNulls(run.stderr).trim() || `install exited with ${run.exitCode} without the readiness marker`,
      });
      if (run.status !== "succeeded" || !markerObserved) return { ok: false, steps };

      const active = await this.#run(target, ["systemctl", "is-active", SERVICE_UNIT_NAME], undefined, 15_000, signal);
      steps.push({
        name: "verify service active",
        ok: stripNulls(active.stdout).trim() === "active",
        detail: stripNulls(active.stdout).trim() || stripNulls(active.stderr).trim() || "systemctl did not answer",
      });
      if (stripNulls(active.stdout).trim() !== "active") return { ok: false, steps };

      return { ok: true, steps };
  }

  /**
   * A script by itself is not a deployable server. This compatibility entry point
   * refuses the incomplete request so older callers receive an explicit result while
   * production uses deployPayload with renderer, server, resources, and service files.
   */
  async deployInstallScript(
    target: SshTarget,
    _scriptText: string,
    signal?: AbortSignal,
  ): Promise<SshDeployOutcome> {
    const reachable = await this.probeReachable(target, signal);
    return {
      ok: false,
      steps: [
        reachable,
        ...(reachable.ok ? [{
          name: "complete server payload",
          ok: false,
          detail: "An install script alone is incomplete. Use deployPayload with every required sibling resource.",
        }] : []),
      ],
    };
  }
}
