/**
 * Creates and manages the deployer's own local VirtualBox VM.
 *
 * Modeled deliberately on `console/control-plane/wsl-provisioning.ts`: same state
 * machine shape, same "verify by asking the guest, never by trusting an exit code"
 * discipline, same refusal to touch anything the deployer did not create itself.
 *
 * Everything here goes through the allowlisted executor (`VBoxManage` only). There is
 * no shell, no concatenated command string, and every destructive operation is scoped
 * to one fixed VM name owned by this application.
 */
import type { ProcessExecutor } from "./executor.js";

/** The one VM this deployer creates, owns, and is allowed to remove. */
export const MANAGED_VM_NAME = "ding-pbx-deployer";

export type HypervisorVmState =
  | "ready"
  | "notProvisioned"
  | "hypervisorUnavailable"
  | "applianceMissing"
  | "provisioning"
  /** Registered with VirtualBox but the guest did not answer. See `unusable` in
   * `wsl-provisioning.ts` for why this is distinct from `failed`: nothing was being
   * created, so nothing failed — the VM is simply not usable as found. */
  | "unusable"
  | "failed";

export interface HypervisorVmStatus {
  state: HypervisorVmState;
  vmName: string;
  reason?: string;
  guestAddress?: string;
  observedAt: string;
}

export interface HypervisorStep {
  name: string;
  ok: boolean;
  detail: string;
}

export interface HypervisorOutcome {
  status: HypervisorVmStatus;
  steps: ReadonlyArray<HypervisorStep>;
}

export interface HypervisorVmOptions {
  executor: ProcessExecutor;
  /** Absolute path to the bundled OVA appliance carrying Debian/Ubuntu + Asterisk. */
  appliancePath: string;
  now?: () => Date;
  /** How many times to poll the guest for a DHCP-assigned address before giving up. */
  addressPollAttempts?: number;
}

const stripNulls = (text: string) => text.replaceAll("\0", "");

export class HypervisorVmProvisioning {
  readonly #executor: ProcessExecutor;
  readonly #appliancePath: string;
  readonly #now: () => Date;
  readonly #addressPollAttempts: number;

  constructor(options: HypervisorVmOptions) {
    this.#executor = options.executor;
    this.#appliancePath = options.appliancePath;
    this.#now = options.now ?? (() => new Date());
    this.#addressPollAttempts = options.addressPollAttempts ?? 1;
  }

  #stamp(): string {
    return this.#now().toISOString();
  }

  async #vboxManage(args: ReadonlyArray<string>, signal?: AbortSignal, timeoutMs = 30_000) {
    return this.#executor.execute({
      executable: "VBoxManage",
      args,
      signal,
      timeoutMs,
      maxOutputBytes: 1024 * 1024,
    });
  }

  async #listVms(signal?: AbortSignal): Promise<ReadonlyArray<string>> {
    const result = await this.#vboxManage(["list", "vms"], signal, 15_000);
    if (result.status !== "succeeded") {
      throw new Error(stripNulls(result.stderr).trim() || "VirtualBox is not available on this machine.");
    }
    // Each line looks like: "vm-name" {uuid}
    return stripNulls(result.stdout)
      .split(/\r?\n/u)
      .map((line) => line.match(/^"([^"]+)"/u)?.[1])
      .filter((name): name is string => Boolean(name));
  }

  /** Reports what the deployer can see right now, without changing anything. */
  async status(appliancePresent: boolean, signal?: AbortSignal): Promise<HypervisorVmStatus> {
    let vms: ReadonlyArray<string>;
    try {
      vms = await this.#listVms(signal);
    } catch (error) {
      return {
        state: "hypervisorUnavailable",
        vmName: MANAGED_VM_NAME,
        reason: error instanceof Error ? error.message : "VirtualBox is not available.",
        observedAt: this.#stamp(),
      };
    }

    if (!vms.includes(MANAGED_VM_NAME)) {
      return appliancePresent
        ? { state: "notProvisioned", vmName: MANAGED_VM_NAME, observedAt: this.#stamp() }
        : {
            state: "applianceMissing",
            vmName: MANAGED_VM_NAME,
            reason: "This build does not carry the bundled PBX appliance, so it cannot create the VM.",
            observedAt: this.#stamp(),
          };
    }

    const address = await this.#guestAddress(signal);
    if (!address.ok) {
      return { state: "unusable", vmName: MANAGED_VM_NAME, reason: address.detail, observedAt: this.#stamp() };
    }
    return {
      state: "ready",
      vmName: MANAGED_VM_NAME,
      guestAddress: address.detail,
      observedAt: this.#stamp(),
    };
  }

  async #guestAddress(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }> {
    for (let attempt = 0; attempt < this.#addressPollAttempts; attempt += 1) {
      const result = await this.#vboxManage(
        ["guestproperty", "get", MANAGED_VM_NAME, "/VirtualBox/GuestInfo/Net/0/V4/IP"],
        signal,
        15_000,
      );
      const stdout = stripNulls(result.stdout).trim();
      const match = stdout.match(/^Value:\s*(\S+)/u);
      if (result.status === "succeeded" && match) {
        return { ok: true, detail: match[1] };
      }
    }
    return { ok: false, detail: "The VM is registered but has not reported a guest IP address yet." };
  }

  /**
   * Imports the bundled appliance and starts it headless. Refuses to import over an
   * existing VM of the same name, exactly as WSL provisioning refuses to import over an
   * existing distribution — importing would discard whatever is already in it.
   */
  async provision(appliancePresent: boolean, signal?: AbortSignal): Promise<HypervisorOutcome> {
    const steps: HypervisorStep[] = [];
    const fail = (reason: string): HypervisorOutcome => ({
      status: { state: "failed", vmName: MANAGED_VM_NAME, reason, observedAt: this.#stamp() },
      steps,
    });

    if (!appliancePresent) {
      steps.push({ name: "bundled appliance", ok: false, detail: "The bundled PBX appliance is missing from this build." });
      return fail("This build does not carry the bundled PBX appliance.");
    }
    steps.push({ name: "bundled appliance", ok: true, detail: this.#appliancePath });

    let existing: ReadonlyArray<string>;
    try {
      existing = await this.#listVms(signal);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "VirtualBox is not available.";
      steps.push({ name: "VirtualBox available", ok: false, detail: reason });
      return { status: { state: "hypervisorUnavailable", vmName: MANAGED_VM_NAME, reason, observedAt: this.#stamp() }, steps };
    }
    steps.push({ name: "VirtualBox available", ok: true, detail: `${existing.length} VM(s) registered` });

    if (existing.includes(MANAGED_VM_NAME)) {
      steps.push({
        name: "VM absent",
        ok: false,
        detail: `${MANAGED_VM_NAME} already exists; importing over it would discard its disk.`,
      });
      return fail(`${MANAGED_VM_NAME} already exists. Remove it first if you intend to recreate it.`);
    }
    steps.push({ name: "VM absent", ok: true, detail: `${MANAGED_VM_NAME} is not registered yet` });

    const imported = await this.#vboxManage(
      ["import", this.#appliancePath, "--vsys", "0", "--vmname", MANAGED_VM_NAME],
      signal,
      15 * 60_000,
    );
    if (imported.status !== "succeeded") {
      const detail = stripNulls(imported.stderr).trim() || `VBoxManage import exited with ${imported.exitCode}`;
      steps.push({ name: "import appliance", ok: false, detail });
      return fail(detail);
    }
    steps.push({ name: "import appliance", ok: true, detail: `imported as ${MANAGED_VM_NAME}` });

    const started = await this.#vboxManage(["startvm", MANAGED_VM_NAME, "--type", "headless"], signal, 60_000);
    if (started.status !== "succeeded") {
      const detail = stripNulls(started.stderr).trim() || `VBoxManage startvm exited with ${started.exitCode}`;
      steps.push({ name: "start VM", ok: false, detail });
      return fail(detail);
    }
    steps.push({ name: "start VM", ok: true, detail: `${MANAGED_VM_NAME} started headless` });

    const address = await this.#guestAddress(signal);
    steps.push({ name: "verify guest network", ok: address.ok, detail: address.detail });
    if (!address.ok) return fail(address.detail);

    return {
      status: { state: "ready", vmName: MANAGED_VM_NAME, guestAddress: address.detail, observedAt: this.#stamp() },
      steps,
    };
  }

  /** Powers off the managed VM. Never touches one this deployer did not create. */
  async stop(confirmedVmName: string, signal?: AbortSignal): Promise<HypervisorStep> {
    if (confirmedVmName !== MANAGED_VM_NAME) {
      return { name: "stop", ok: false, detail: `This deployer only stops ${MANAGED_VM_NAME}; it will not stop ${confirmedVmName}.` };
    }
    const result = await this.#vboxManage(["controlvm", MANAGED_VM_NAME, "poweroff"], signal, 60_000);
    return {
      name: "stop",
      ok: result.status === "succeeded",
      detail: result.status === "succeeded"
        ? `${MANAGED_VM_NAME} powered off`
        : stripNulls(result.stderr).trim() || `VBoxManage controlvm exited with ${result.exitCode}`,
    };
  }

  /**
   * Unregisters the managed VM and deletes its disks, discarding everything inside it.
   *
   * Irreversible, and the caller is responsible for putting it behind the product's
   * destructive-action confirmation. It refuses anything other than the exact managed
   * name, so it can never be pointed at a VM the user created themselves.
   */
  async remove(confirmedVmName: string, signal?: AbortSignal): Promise<HypervisorStep> {
    if (confirmedVmName !== MANAGED_VM_NAME) {
      return { name: "remove", ok: false, detail: `This deployer only removes ${MANAGED_VM_NAME}; it will not unregister ${confirmedVmName}.` };
    }
    const result = await this.#vboxManage(["unregistervm", MANAGED_VM_NAME, "--delete"], signal, 5 * 60_000);
    return {
      name: "remove",
      ok: result.status === "succeeded",
      detail: result.status === "succeeded"
        ? `${MANAGED_VM_NAME} unregistered and its disks deleted`
        : stripNulls(result.stderr).trim() || `VBoxManage unregistervm exited with ${result.exitCode}`,
    };
  }
}

/** Detects whether VirtualBox is present on this machine at all, without side effects. */
export async function detectHypervisor(
  executor: ProcessExecutor,
  signal?: AbortSignal,
): Promise<{ available: boolean; version?: string; reason?: string }> {
  const result = await executor.execute({
    executable: "VBoxManage",
    args: ["--version"],
    signal,
    timeoutMs: 10_000,
    maxOutputBytes: 4096,
  });
  if (result.status !== "succeeded") {
    return { available: false, reason: stripNulls(result.stderr).trim() || "VBoxManage did not respond." };
  }
  return { available: true, version: stripNulls(result.stdout).trim() };
}
