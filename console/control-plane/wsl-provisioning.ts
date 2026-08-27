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
  /**
   * Registered with WSL, but it did not answer.
   *
   * This is deliberately not `failed`, and the distinction is the whole point: `failed`
   * means an operation this console ran did not succeed, whereas this means the
   * distribution was already in a state the console never put it in. Reporting it as
   * `failed` produced a message that said creating the distribution had not succeeded
   * when nothing was being created, and it left the only way out unmentioned.
   *
   * It is reachable on a real machine and was found on one: the distribution stays
   * registered while its virtual disk is deleted underneath it — an interrupted import,
   * a disk moved or cleaned up, a profile restored without it. WSL keeps the
   * registration, so every list still shows the distribution, and every attempt to run
   * anything in it fails to attach the disk.
   *
   * It matters because the console refuses to import over an existing name, so this
   * state cannot be left as a dead end: the runtime is unusable, creating it is refused
   * because it already exists, and the recovery is to unregister it first.
   */
  | "unusable"
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

/**
 * Fetches a base root filesystem when the installer did not carry one.
 *
 * Injected rather than imported so the download can be driven in tests without a
 * network, and so the privileged process owns the actual transfer.
 */
export interface RootfsDownloader {
  /** Downloads `url` to `destination` and reports what actually landed. */
  download(url: string, destination: string, signal?: AbortSignal): Promise<{ bytes: number; sha256: string }>;
}

/** A pinned base image, used only when no packaged payload is present. */
export interface BaseImageSource {
  url: string;
  /** Required. An unverified root filesystem is not imported. */
  sha256: string;
  /** Absolute path the archive is downloaded to. */
  downloadPath: string;
}

export interface WslProvisioningOptions {
  executor: ProcessExecutor;
  /** Absolute path to the packaged root filesystem archive. */
  rootfsPath: string;
  /** Absolute directory the distribution's virtual disk is created in. */
  installDirectory: string;
  baseImage?: BaseImageSource;
  downloader?: RootfsDownloader;
  now?: () => Date;
  /**
   * Called as each provisioning step finishes, rather than only when the whole run
   * does. Optional: a caller that passes nothing gets exactly the previous behaviour,
   * and the steps are still returned in the outcome either way, so this adds a live
   * view without changing what a completed run reports.
   */
  onStep?: (step: ProvisionStep) => void;
}

const stripNulls = (text: string) => text.replaceAll("\0", "");

export class WslProvisioning {
  readonly #executor: ProcessExecutor;
  readonly #rootfs: string;
  readonly #installDirectory: string;
  readonly #now: () => Date;

  readonly #baseImage?: BaseImageSource;
  readonly #downloader?: RootfsDownloader;
  readonly #onStep?: (step: ProvisionStep) => void;

  constructor(options: WslProvisioningOptions) {
    this.#executor = options.executor;
    this.#rootfs = options.rootfsPath;
    this.#installDirectory = options.installDirectory;
    this.#baseImage = options.baseImage;
    this.#downloader = options.downloader;
    this.#now = options.now ?? (() => new Date());
    this.#onStep = options.onStep;
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
      /* The distribution is registered and did not answer. Nothing was being created,
       * so this is `unusable` rather than `failed`; see the state's own note. */
      return {
        state: "unusable",
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
      /* WSL's own failures arrive on stdout, not stderr. Reading stderr alone threw away
       * the only line worth having — a missing virtual disk reports the disk's full path
       * and an error code on stdout and leaves stderr completely empty, so the console
       * replaced a precise diagnostic with a generic sentence and the person looking at
       * it had nothing to go on. Verified against a real machine, not assumed. */
      const reported = stripNulls(result.stderr).trim() || stripNulls(result.stdout).trim();
      return {
        ok: false,
        detail: reported || "The distribution exists but Asterisk did not answer.",
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
    /* Both collects and emits. A step reported here has actually happened -- the
     * callback fires after the work, never before it, so a listener cannot show
     * progress for something still in flight. */
    const record = (step: ProvisionStep) => {
      steps.push(step);
      try {
        this.#onStep?.(step);
      } catch {
        /* A listener is somebody else's code, and a deploy must not fail because a
         * progress line could not be rendered -- that would be the observation destroying
         * the thing observed. The step is already recorded above, so the outcome is
         * unaffected and the run continues. Deliberately swallowed rather than logged:
         * this module has no logger, and adding one to report a listener's bug would put
         * the listener's failure into the provisioning record as though it were ours. */
      }
    };
    const fail = (reason: string): ProvisionOutcome => ({
      status: { state: "failed", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() },
      steps,
    });

    if (!payloadPresent) {
      record({ name: "packaged runtime", ok: false, detail: "The packaged Asterisk runtime is missing from this build." });
      return fail("This build does not carry the packaged Asterisk runtime.");
    }
    record({ name: "packaged runtime", ok: true, detail: this.#rootfs });

    let existing: ReadonlyArray<string>;
    try {
      existing = await this.#listDistributions(signal);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "WSL is not available.";
      record({ name: "WSL available", ok: false, detail: reason });
      return {
        status: { state: "wslUnavailable", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() },
        steps,
      };
    }
    record({ name: "WSL available", ok: true, detail: `${existing.length} distribution(s) present` });

    if (existing.includes(MANAGED_DISTRIBUTION)) {
      record({
        name: "distribution absent",
        ok: false,
        detail: `${MANAGED_DISTRIBUTION} already exists; importing over it would discard its contents.`,
      });
      return fail(`${MANAGED_DISTRIBUTION} already exists. Remove it first if you intend to recreate it.`);
    }
    record({ name: "distribution absent", ok: true, detail: `${MANAGED_DISTRIBUTION} is not registered yet` });

    const imported = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--import", MANAGED_DISTRIBUTION, this.#installDirectory, this.#rootfs, "--version", "2"],
      signal,
      timeoutMs: 15 * 60_000,
      maxOutputBytes: 256 * 1024,
    });
    if (imported.status !== "succeeded") {
      const detail = stripNulls(imported.stderr).trim() || `wsl --import exited with ${imported.exitCode}`;
      record({ name: "import runtime", ok: false, detail });
      return fail(detail);
    }
    record({ name: "import runtime", ok: true, detail: `imported into ${this.#installDirectory}` });

    /* Verify by asking the distribution itself rather than trusting the import's exit
     * code. An import can succeed and still produce something that cannot run. */
    const version = await this.#asteriskVersion(signal);
    if (!version.ok) {
      record({ name: "verify Asterisk", ok: false, detail: version.detail });
      return fail(version.detail);
    }
    record({ name: "verify Asterisk", ok: true, detail: version.detail });

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

  /** Imports an archive as the managed distribution. Callers prove it is safe first. */
  async #import(archive: string, signal?: AbortSignal): Promise<ProvisionStep> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--import", MANAGED_DISTRIBUTION, this.#installDirectory, archive, "--version", "2"],
      signal,
      timeoutMs: 15 * 60_000,
      maxOutputBytes: 256 * 1024,
    });
    return {
      name: "import runtime",
      ok: result.status === "succeeded",
      detail: result.status === "succeeded"
        ? `imported into ${this.#installDirectory}`
        : stripNulls(result.stderr).trim() || `wsl --import exited with ${result.exitCode}`,
    };
  }

  /**
   * Installs Asterisk into the managed distribution from its own package archive.
   *
   * Two separate commands rather than one shell line, because the executor takes an
   * executable and arguments and never a shell. `apt-get` is given the flags that stop
   * it asking questions, since there is nobody at the other end to answer them.
   */
  async #installAsterisk(signal?: AbortSignal): Promise<ProvisionStep> {
    const steps: Array<ReadonlyArray<string>> = [
      ["apt-get", "update", "-qq"],
      ["apt-get", "install", "-y", "--no-install-recommends", "asterisk"],
    ];
    for (const args of steps) {
      const result = await this.#executor.execute({
        executable: "wsl.exe",
        args: ["-d", MANAGED_DISTRIBUTION, "--user", "root", "--", ...args],
        environment: { DEBIAN_FRONTEND: "noninteractive" },
        signal,
        timeoutMs: 20 * 60_000,
        maxOutputBytes: 4 * 1024 * 1024,
      });
      if (result.status !== "succeeded") {
        return {
          name: "install Asterisk",
          ok: false,
          detail: stripNulls(result.stderr).trim() || `${args[0]} exited with ${result.exitCode}`,
        };
      }
    }
    return { name: "install Asterisk", ok: true, detail: "installed from the distribution's package archive" };
  }

  /**
   * Creates the distribution from a pinned base image when no payload was packaged.
   *
   * This is the path for a build that did not carry a runtime: fetch a base root
   * filesystem, prove it is the expected one, import it, install Asterisk inside, and
   * verify by asking the distribution rather than by trusting any step's exit code.
   *
   * The digest check is not a formality. An archive fetched over a network and imported
   * unverified becomes the root filesystem of a machine on the user's computer, so a
   * mismatch stops the whole operation before `wsl --import` is ever reached.
   */
  async provisionFromBaseImage(signal?: AbortSignal): Promise<ProvisionOutcome> {
    const steps: ProvisionStep[] = [];
    const fail = (reason: string): ProvisionOutcome => ({
      status: { state: "failed", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() },
      steps,
    });

    if (!this.#baseImage || !this.#downloader) {
      steps.push({ name: "base image configured", ok: false, detail: "No base image or downloader is configured." });
      return fail("This build has no packaged runtime and no base image to fall back to.");
    }
    steps.push({ name: "base image configured", ok: true, detail: this.#baseImage.url });

    let existing: ReadonlyArray<string>;
    try {
      existing = await this.#listDistributions(signal);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "WSL is not available.";
      steps.push({ name: "WSL available", ok: false, detail: reason });
      return { status: { state: "wslUnavailable", distribution: MANAGED_DISTRIBUTION, reason, observedAt: this.#stamp() }, steps };
    }
    if (existing.includes(MANAGED_DISTRIBUTION)) {
      steps.push({ name: "distribution absent", ok: false, detail: `${MANAGED_DISTRIBUTION} already exists.` });
      return fail(`${MANAGED_DISTRIBUTION} already exists. Remove it first if you intend to recreate it.`);
    }
    steps.push({ name: "distribution absent", ok: true, detail: `${MANAGED_DISTRIBUTION} is not registered yet` });

    let downloaded: { bytes: number; sha256: string };
    try {
      downloaded = await this.#downloader.download(this.#baseImage.url, this.#baseImage.downloadPath, signal);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The download failed.";
      steps.push({ name: "download base image", ok: false, detail });
      return fail(detail);
    }
    if (downloaded.sha256.toLowerCase() !== this.#baseImage.sha256.toLowerCase()) {
      const detail = `The downloaded base image does not match its expected digest, so it was not imported. Expected ${this.#baseImage.sha256}, got ${downloaded.sha256}.`;
      steps.push({ name: "verify base image", ok: false, detail });
      return fail(detail);
    }
    steps.push({ name: "download base image", ok: true, detail: `${downloaded.bytes} bytes` });
    steps.push({ name: "verify base image", ok: true, detail: `sha256 ${downloaded.sha256}` });

    const imported = await this.#import(this.#baseImage.downloadPath, signal);
    steps.push(imported);
    if (!imported.ok) return fail(imported.detail);

    const installed = await this.#installAsterisk(signal);
    steps.push(installed);
    if (!installed.ok) return fail(installed.detail);

    const version = await this.#asteriskVersion(signal);
    steps.push({ name: "verify Asterisk", ok: version.ok, detail: version.detail });
    if (!version.ok) return fail(version.detail);

    return {
      status: { state: "ready", distribution: MANAGED_DISTRIBUTION, asteriskVersion: version.detail, observedAt: this.#stamp() },
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
