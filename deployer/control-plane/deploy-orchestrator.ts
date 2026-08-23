/**
 * Ties the deployer's pieces together into the one-click flow: pick a target, deploy
 * to it, verify by asking, hand back the reachable address.
 *
 * Idempotency: a local-VM deployment that finds the managed VM already `ready` skips
 * straight to installing/verifying the server on it rather than re-importing — the
 * hypervisor module already refuses to re-import over an existing VM, so "run again"
 * naturally becomes "finish or confirm" rather than "fail" or "destroy and redo". An
 * SSH deployment is idempotent because the install script is itself required to be
 * (see `server-contract.ts`), and this module never deletes anything on a re-run.
 *
 * Destruction: this module exposes no path that can remove a VM or touch an SSH host
 * beyond running the install script. The only destructive operations in this
 * deployer — `HypervisorVmProvisioning.remove` and `.stop` — are scoped to the exact
 * managed VM name and are invoked only from the UI's explicit "remove the deployer's
 * VM" action, gated by the product's destructive-action confirmation.
 */
import type { ProcessExecutor } from "./executor.js";
import { detectHypervisor, HypervisorVmProvisioning, MANAGED_VM_NAME } from "./hypervisor-vm.js";
import { SshServerDeployer, type SshTarget, type ApprovedSshIdentity, HostKeyMismatchError } from "./ssh-deploy.js";
import { waitForServerHealth, type HttpGetter } from "./health-check.js";
import { DEFAULT_SERVER_PORT } from "./server-contract.js";

export type DeployTarget =
  | { kind: "localVm" }
  | { kind: "ssh"; host: string; port: number; user: string; knownHostsPath: string };

export interface DeployStepReport {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DeployResult {
  ok: boolean;
  steps: ReadonlyArray<DeployStepReport>;
  address?: string;
  adminUrl?: string;
  asteriskVersion?: string;
  authRequired?: boolean;
}

export interface DeployOrchestratorOptions {
  executor: ProcessExecutor;
  /** Absolute path to the bundled VirtualBox appliance, or undefined if not carried. */
  appliancePath?: string;
  /** The install script text bundled with this application, for SSH targets. */
  installScriptText: string;
  approvedSshIdentities: ReadonlyArray<ApprovedSshIdentity>;
  serverPort?: number;
  healthGetter?: HttpGetter;
  healthPollAttempts?: number;
  healthPollDelayMs?: number;
}

export type ProgressCallback = (step: DeployStepReport) => void;

export class DeployOrchestrator {
  readonly #executor: ProcessExecutor;
  readonly #appliancePath?: string;
  readonly #installScriptText: string;
  readonly #approvedSshIdentities: ReadonlyArray<ApprovedSshIdentity>;
  readonly #serverPort: number;
  readonly #healthGetter?: HttpGetter;
  readonly #healthPollAttempts: number;
  readonly #healthPollDelayMs: number;

  constructor(options: DeployOrchestratorOptions) {
    this.#executor = options.executor;
    this.#appliancePath = options.appliancePath;
    this.#installScriptText = options.installScriptText;
    this.#approvedSshIdentities = options.approvedSshIdentities;
    this.#serverPort = options.serverPort ?? DEFAULT_SERVER_PORT;
    this.#healthGetter = options.healthGetter;
    this.#healthPollAttempts = options.healthPollAttempts ?? 1;
    this.#healthPollDelayMs = options.healthPollDelayMs ?? 0;
  }

  /** Detects what real targets this machine actually has, so the UI never offers a
   * route that cannot work. */
  async detectAvailableTargets(signal?: AbortSignal): Promise<{
    localVm: { available: boolean; version?: string; reason?: string; appliancePresent: boolean };
  }> {
    const hypervisor = await detectHypervisor(this.#executor, signal);
    return {
      localVm: { ...hypervisor, appliancePresent: Boolean(this.#appliancePath) },
    };
  }

  async deploy(target: DeployTarget, onProgress?: ProgressCallback, signal?: AbortSignal): Promise<DeployResult> {
    if (target.kind === "localVm") return this.#deployLocalVm(onProgress, signal);
    return this.#deploySsh(target, onProgress, signal);
  }

  async #deployLocalVm(onProgress: ProgressCallback | undefined, signal?: AbortSignal): Promise<DeployResult> {
    const steps: DeployStepReport[] = [];
    const report = (step: DeployStepReport): void => { steps.push(step); onProgress?.(step); };

    const detect = await detectHypervisor(this.#executor, signal);
    report({ name: "detect hypervisor", ok: detect.available, detail: detect.available ? (detect.version ?? "VirtualBox present") : (detect.reason ?? "VirtualBox is not installed") });
    if (!detect.available) {
      return { ok: false, steps };
    }

    const provisioning = new HypervisorVmProvisioning({ executor: this.#executor, appliancePath: this.#appliancePath ?? "" });
    const appliancePresent = Boolean(this.#appliancePath);

    // Idempotent path: if the managed VM already exists and answers, do not re-import.
    const existingStatus = await provisioning.status(appliancePresent, signal);
    let ready = existingStatus;
    if (existingStatus.state === "notProvisioned") {
      const outcome = await provisioning.provision(appliancePresent, signal);
      for (const step of outcome.steps) report(step);
      ready = outcome.status;
    } else {
      report({
        name: "existing VM",
        ok: existingStatus.state === "ready" || existingStatus.state === "unusable",
        detail: `${MANAGED_VM_NAME} is already ${existingStatus.state}; skipping import`,
      });
    }

    if (ready.state !== "ready" || !ready.guestAddress) {
      report({ name: "VM ready", ok: false, detail: ready.reason ?? `VM state is ${ready.state}` });
      return { ok: false, steps };
    }
    report({ name: "VM ready", ok: true, detail: ready.guestAddress });

    /* The VM's address is discovered through VBoxManage guest properties, a
     * management-channel read of a VM this deployer just created itself — not user
     * input received over a network — so it is trusted for exactly this one session
     * without needing to appear in the user's approved-LAN-target inventory. */
    return this.#installAndVerifySsh(
      { host: ready.guestAddress, port: 22, user: "root", knownHostsPath: localVmKnownHosts() },
      [...this.#approvedSshIdentities, { host: ready.guestAddress, port: 22 }],
      steps,
      report,
      signal,
    );
  }

  async #deploySsh(target: SshTarget, onProgress: ProgressCallback | undefined, signal?: AbortSignal): Promise<DeployResult> {
    const steps: DeployStepReport[] = [];
    const report = (step: DeployStepReport): void => { steps.push(step); onProgress?.(step); };
    return this.#installAndVerifySsh(target, this.#approvedSshIdentities, steps, report, signal);
  }

  async #installAndVerifySsh(
    target: SshTarget,
    approvedIdentities: ReadonlyArray<ApprovedSshIdentity>,
    steps: DeployStepReport[],
    report: (step: DeployStepReport) => void,
    signal?: AbortSignal,
  ): Promise<DeployResult> {
    const ssh = new SshServerDeployer(this.#executor, approvedIdentities);
    let outcome;
    try {
      outcome = await ssh.deployInstallScript(target, this.#installScriptText, signal);
    } catch (error) {
      if (error instanceof HostKeyMismatchError) {
        report({ name: "host key", ok: false, detail: `Host key for ${target.host}:${target.port} changed since it was last trusted. Deployment stopped to protect against a compromised or spoofed target.` });
        return { ok: false, steps };
      }
      throw error;
    }
    for (const step of outcome.steps) report(step);
    if (!outcome.ok) return { ok: false, steps };

    const health = await waitForServerHealth(target.host, this.#serverPort, {
      attempts: this.#healthPollAttempts,
      delayMs: this.#healthPollDelayMs,
      getter: this.#healthGetter,
      signal,
    });
    report({
      name: "verify server responds",
      ok: health.ok,
      detail: health.ok
        ? `server answered: Asterisk ${health.health?.asteriskVersion}`
        : (health.reason ?? "The server did not answer."),
    });
    if (!health.ok) return { ok: false, steps, address: target.host };

    return {
      ok: true,
      steps,
      address: target.host,
      adminUrl: `http://${target.host}:${this.#serverPort}`,
      asteriskVersion: health.health?.asteriskVersion,
      authRequired: health.health?.authRequired,
    };
  }
}

function localVmKnownHosts(): string {
  const base = process.env.LOCALAPPDATA ?? process.env.HOME ?? ".";
  return `${base}/ding-pbx-deployer/known_hosts`;
}
