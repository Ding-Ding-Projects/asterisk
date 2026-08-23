/**
 * Creates and manages the console's own WSL distribution.
 *
 * The installer already carries a complete Ubuntu 24.04 root filesystem with Asterisk
 * built into it, and target discovery already reports whether that payload is present.
 * Nothing ever imported it, so the application could see its own runtime sitting in its
 * resources directory and had no way to run it — the user was expected to go and
 * produce a distribution by hand, which is exactly the kind of "install X and try
 * again" step the product is not allowed to have.
 *
 * Everything here goes through the allowlisted executor. There is no shell, no
 * concatenated command string, and no argument built from unvalidated input: the
 * distribution name is fixed by the application and every path is resolved by the
 * caller, so a request can only ever name the distribution this console owns.
 *
 * The distribution name is deliberately distinct from anything a user would create by
 * hand, because every destructive operation here is scoped to that exact name. The
 * console will not stop, unregister, or overwrite a distribution it did not create.
 */
import type { ProcessExecutor } from "./executor.js";

/** The one distribution this console creates, owns, and is allowed to remove. */
export const MANAGED_DISTRIBUTION = "ding-pbx-console";

export type ProvisionState =
  | "ready"
  | "notProvisioned"
  | "wslUnavailable"
  | "payloadMissing"
  | "provisioning"
  | "failed";

export interface ProvisionStatus {
  state: ProvisionState;
  distribution: string;
  reason?: string;
  asteriskVersion?: string;
  observedAt: string;
}

export interface ProvisionStep {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ProvisionOutcome {
  status: ProvisionStatus;
  steps: ReadonlyArray<ProvisionStep>;
}

export interface WslProvisioningOptions {
  executor: ProcessExecutor;
  /** Absolute path to the packaged root filesystem archive. */
  rootfsPath: string;
  /** Absolute directory the distribution's virtual disk is created in. */
  installDirectory: string;
  now?: () => Date;
}

const stripNulls = (text: string) => text.replaceAll("\0", "");

export class WslProvisioning {
  readonly #executor: ProcessExecutor;
  readonly #rootfs: string;
  readonly #installDirectory: string;
  readonly #now: () => Date;

  constructor(options: WslProvisioningOptions) {
    this.#executor = options.executor;
    this.#rootfs = options.rootfsPath;
    this.#installDirectory = options.installDirectory;
    this.#now = options.now ?? (() => new Date());
  }

  #stamp() {
    return this.#now().toISOString();
  }

  /** Lists distributions exactly as WSL reports them, including ones we do not own. */
  async #listDistributions(signal?: AbortSignal): Promise<ReadonlyArray<string>> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--list", "--quiet"],
      signal,
      timeoutMs: 15_000,
      maxOutputBytes: 64 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || "WSL is not available on this machine.");
    }
    return stripNulls(result.stdout)
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Reports what the console can see right now, without changing anything.
   *
   * `payloadMissing` is reported before `notProvisioned` on purpose: a user whose
   * installer did not carry the runtime needs to know that, not be offered a provision
   * action that cannot possibly succeed.
   */
  async status(payloadPresent: boolean, signal?: AbortSignal): Promise<ProvisionStatus> {
    let distributions: ReadonlyArray<string>;
    try {
      distributions = await this.#listDistributions(signal);
    } catch (error) {
      return {
        state: "wslUnavailable",
        distribution: MANAGED_DISTRIBUTION,
        reason: error instanceof Error ? error.message : "WSL is not available.",
        observedAt: this.#stamp(),
      };
    }

    if (!distributions.includes(MANAGED_DISTRIBUTION)) {
      return payloadPresent
        ? { state: "notProvisioned", distribution: MANAGED_DISTRIBUTION, observedAt: this.#stamp() }
        : {
            state: "payloadMissing",
            distribution: MANAGED_DISTRIBUTION,
            reason: "This build does not carry the packaged Asterisk runtime, so it cannot create the distribution.",
            observedAt: this.#stamp(),
          };
    }

    const version = await this.#asteriskVersion(signal);
    if (!version.ok) {
      return {
        state: "failed",
        distribution: MANAGED_DISTRIBUTION,
        reason: version.detail,
        observedAt: this.#stamp(),
      };
    }
    return {
      state: "ready",
      distribution: MANAGED_DISTRIBUTION,
      asteriskVersion: version.detail,
      observedAt: this.#stamp(),
    };
  }

  async #asteriskVersion(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", MANAGED_DISTRIBUTION, "--", "asterisk", "-V"],
      signal,
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    if (result.status !== "succeeded") {
      return {
        ok: false,
        detail: stripNulls(result.stderr).trim() || "The distribution exists but Asterisk did not answer.",
      };
    }
    return { ok: true, detail: stripNulls(result.stdout).trim() };
  }

  /**
   * Creates the distribution from the packaged payload and verifies it end to end.
   *
   * Refuses rather than overwrites when the distribution already exists. Importing over
   * a live distribution would discard whatever is in it, and this is the one operation
   * in the module that could destroy a user's configuration by accident.
   */
  async provision(payloadPresent: boolean, signal?: AbortSignal): Promise<ProvisionOutcome> {
    const steps: ProvisionStep[] = [];
    const fail = (reason: string): ProvisionOutcome => ({
      status: { state: "failed", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() },
      steps,
    });

    if (!payloadPresent) {
      steps.push({ name: "packaged runtime", ok: false, detail: "The packaged Asterisk runtime is missing from this build." });
      return fail("This build does not carry the packaged Asterisk runtime.");
    }
    steps.push({ name: "packaged runtime", ok: true, detail: this.#rootfs });

    let existing: ReadonlyArray<string>;
    try {
      existing = await this.#listDistributions(signal);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "WSL is not available.";
      steps.push({ name: "WSL available", ok: false, detail: reason });
      return {
        status: { state: "wslUnavailable", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() },
        steps,
      };
    }
    steps.push({ name: "WSL available", ok: true, detail: `${existing.length} distribution(s) present` });

    if (existing.includes(MANAGED_DISTRIBUTION)) {
      steps.push({
        name: "distribution absent",
        ok: false,
        detail: `${MANAGED_DISTRIBUTION} already exists; importing over it would discard its contents.`,
      });
      return fail(`${MANAGED_DISTRIBUTION} already exists. Remove it first if you intend to recreate it.`);
    }
    steps.push({ name: "distribution absent", ok: true, detail: `${MANAGED_DISTRIBUTION} is not registered yet` });

    const imported = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--import", MANAGED_DISTRIBUTION, this.#installDirectory, this.#rootfs, "--version", "2"],
      signal,
      timeoutMs: 15 * 60_000,
      maxOutputBytes: 256 * 1024,
    });
    if (imported.status !== "succeeded") {
      const detail = stripNulls(imported.stderr).trim() || `wsl --import exited with ${imported.exitCode}`;
      steps.push({ name: "import runtime", ok: false, detail });
      return fail(detail);
    }
    steps.push({ name: "import runtime", ok: true, detail: `imported into ${this.#installDirectory}` });

    /* Verify by asking the distribution itself rather than trusting the import's exit
     * code. An import can succeed and still produce something that cannot run. */
    const version = await this.#asteriskVersion(signal);
    if (!version.ok) {
      steps.push({ name: "verify Asterisk", ok: false, detail: version.detail });
      return fail(version.detail);
    }
    steps.push({ name: "verify Asterisk", ok: true, detail: version.detail });

    return {
      status: {
        state: "ready",
        distribution: MANAGED_DISTRIBUTION,
        asteriskVersion: version.detail,
        observedAt: this.#stamp(),
      },
      steps,
    };
  }

  /** Stops the managed distribution. Never touches one the console did not create. */
  async stop(signal?: AbortSignal): Promise<ProvisionStep> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--terminate", MANAGED_DISTRIBUTION],
      signal,
      timeoutMs: 60_000,
      maxOutputBytes: 64 * 1024,
    });
    return {
      name: "stop",
      ok: result.status === "succeeded",
      detail: result.status === "succeeded"
        ? `${MANAGED_DISTRIBUTION} terminated`
        : stripNulls(result.stderr).trim() || `wsl --terminate exited with ${result.exitCode}`,
    };
  }

  /**
   * Unregisters the managed distribution, discarding everything inside it.
   *
   * Irreversible, and the caller is responsible for putting it behind the product's
   * destructive-action confirmation. It is scoped to the console's own distribution
   * name and will refuse anything else, so it cannot be pointed at a user's own
   * distribution by a mistaken argument.
   */
  async remove(confirmedDistribution: string, signal?: AbortSignal): Promise<ProvisionStep> {
    if (confirmedDistribution !== MANAGED_DISTRIBUTION) {
      return {
        name: "remove",
        ok: false,
        detail: `This console only removes ${MANAGED_DISTRIBUTION}; it will not unregister ${confirmedDistribution}.`,
      };
    }
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--unregister", MANAGED_DISTRIBUTION],
      signal,
      timeoutMs: 5 * 60_000,
      maxOutputBytes: 64 * 1024,
    });
    return {
      name: "remove",
      ok: result.status === "succeeded",
      detail: result.status === "succeeded"
        ? `${MANAGED_DISTRIBUTION} unregistered`
        : stripNulls(result.stderr).trim() || `wsl --unregister exited with ${result.exitCode}`,
    };
  }
}
