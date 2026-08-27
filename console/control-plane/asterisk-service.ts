/**
 * Starts, stops, and reports on the Asterisk daemon inside the console's own managed
 * WSL distribution.
 *
 * `wsl-provisioning.ts` proves the distribution can run Asterisk at all — it imports the
 * packaged root filesystem and checks `asterisk -V`, which only proves the binary
 * exists. Every actual reading the console performs (`asterisk-readings.ts`) connects
 * to a *running* daemon over `/var/run/asterisk/asterisk.ctl`, and nothing anywhere
 * ever started that daemon. A freshly provisioned, perfectly healthy distribution was
 * therefore unusable until someone ran `asterisk -F` by hand inside it — verified on a
 * real machine, not theorised.
 *
 * Everything here goes through the allowlisted executor, exactly as `wsl-provisioning.ts`
 * does: no shell, no concatenated command string, every command is `wsl.exe` with
 * separate arguments, and every operation is scoped to the selected distribution.
 *
 * The one rule that matters most in this file: **a start, a stop, or a restart is never
 * reported as having worked because a command's exit code said so.** An `asterisk`
 * launch that forks to the background exits successfully whether or not the daemon it
 * spawned actually comes up, and `core stop gracefully` can be accepted by the CLI
 * while the daemon takes its time (or never) actually going away. Every one of those
 * is verified by *asking the daemon itself* — `asterisk -rx "core show version"` — and
 * polled with a bounded timeout rather than trusted on the first try.
 */
import type { ProcessExecutor } from "./executor.js";
import { MANAGED_DISTRIBUTION } from "./wsl-provisioning.js";

export type DaemonState =
  /** The distribution itself is not currently running. Asterisk cannot be either. */
  | "distributionNotRunning"
  /**
   * The distribution is running, and the daemon is not — either the process is not
   * present, or it is present but the WSL layer itself could not be asked (its own
   * failure is carried in `reason` either way).
   */
  | "daemonNotRunning"
  /** The daemon answered `core show version` over its control socket. */
  | "daemonAnswering"
  /**
   * The daemon's process may be present, or the target probe was inconclusive, and the
   * control socket did not provide a valid daemon identity.
   *
   * Deliberately distinct from `daemonNotRunning`: a process that exists and is not
   * answering (still starting up, wedged, its socket not yet listening) is a different
   * situation from no process existing at all, and conflating the two would tell a user
   * "start it" when starting it again is exactly the wrong next step.
   */
  | "daemonUnresponsive";

export interface DaemonStatus {
  state: DaemonState;
  distribution: string;
  reason?: string;
  asteriskVersion?: string;
  observedAt: string;
}

export interface DaemonStep {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DaemonOutcome {
  status: DaemonStatus;
  steps: ReadonlyArray<DaemonStep>;
}

export interface AsteriskServiceOptions {
  executor: ProcessExecutor;
  /** Exact WSL distribution selected by the caller. */
  distribution?: string;
  now?: () => Date;
  /** How often a start or stop polls the daemon while waiting. Default 1000ms. */
  pollIntervalMs?: number;
  /** How long a start waits for the daemon to start answering. Default 30s. */
  startTimeoutMs?: number;
  /** How long a stop waits for the daemon to stop answering. Default 15s. */
  stopTimeoutMs?: number;
  /** Injected so tests can poll instantly instead of on the wall clock. */
  sleep?: (ms: number) => Promise<void>;
}

const stripNulls = (text: string) => text.replaceAll("\0", "");
const firstLine = (text: string) => text.split(/\r?\n/u)[0]?.trim() ?? "";

export class AsteriskService {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;
  readonly #now: () => Date;
  readonly #pollIntervalMs: number;
  readonly #startTimeoutMs: number;
  readonly #stopTimeoutMs: number;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(options: AsteriskServiceOptions) {
    this.#executor = options.executor;
    this.#distribution = (options.distribution ?? MANAGED_DISTRIBUTION).trim();
    if (!this.#distribution) throw new Error("Asterisk daemon operations require a target distribution.");
    this.#now = options.now ?? (() => new Date());
    this.#pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.#startTimeoutMs = options.startTimeoutMs ?? 30_000;
    this.#stopTimeoutMs = options.stopTimeoutMs ?? 15_000;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  #stamp() {
    return this.#now().toISOString();
  }

  /**
   * Whether the managed distribution is currently running, without starting it.
   *
   * `wsl --list --running` is a read: unlike `wsl -d <name> -- <anything>`, it does not
   * auto-start the distribution it is asked about, so this is safe to call from a plain
   * status check.
   */
  async #distributionState(signal?: AbortSignal): Promise<{ state: "running" | "notRunning" | "unknown"; reason?: string }> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["--list", "--running", "--quiet"],
      signal,
      timeoutMs: 15_000,
      maxOutputBytes: 64 * 1024,
    });
    if (result.status !== "succeeded") {
      return { state: "unknown", reason: stripNulls(result.stderr).trim() || `Distribution discovery ended with ${result.status}.` };
    }
    const running = stripNulls(result.stdout)
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .includes(this.#distribution);
    return { state: running ? "running" : "notRunning" };
  }

  /** Process liveness is tri-state: an executor failure is not proof that no process exists. */
  async #daemonProcessState(signal?: AbortSignal): Promise<{ state: "alive" | "absent" | "unknown"; reason?: string }> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--user", "root", "--", "pgrep", "-x", "asterisk"],
      signal,
      timeoutMs: 15_000,
      maxOutputBytes: 4 * 1024,
    });
    /* pgrep exits 0 with matching pids on stdout when found, and exits 1 with nothing
     * printed when it finds none — the exit code alone is enough, and stdout confirms it. */
    if (result.status === "succeeded" && stripNulls(result.stdout).trim().length > 0) return { state: "alive" };
    if (result.status === "failed" && result.exitCode === 1) return { state: "absent" };
    return {
      state: "unknown",
      reason: stripNulls(result.stderr).trim() || `The process probe ended with ${result.status}.`,
    };
  }

  /** Asks the daemon directly rather than trusting anything about the process around it. */
  async #version(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", "asterisk", "-rx", "core show version"],
      signal,
      timeoutMs: 15_000,
      maxOutputBytes: 64 * 1024,
    });
    if (result.status !== "succeeded") {
      const reported = stripNulls(result.stderr).trim() || stripNulls(result.stdout).trim();
      return { ok: false, detail: reported || "Asterisk did not answer." };
    }
    const stdout = stripNulls(result.stdout).trim();
    /* `asterisk -rx` exits 0 even when it could not reach the daemon — the failure is
     * reported as text on stdout, not as an exit code. Read it, exactly as
     * `asterisk-readings.ts` already has to. */
    if (/Unable to connect to remote asterisk/iu.test(stdout) || stdout.length === 0) {
      return { ok: false, detail: firstLine(stdout) || "Asterisk did not answer." };
    }
    if (!/^Asterisk\s+\d+(?:\.\d+)+/imu.test(stdout)) {
      return { ok: false, detail: firstLine(stdout) || "The daemon returned an invalid identity response." };
    }
    return { ok: true, detail: stdout };
  }

  /**
   * Reports what the daemon is doing right now, without starting or stopping anything.
   *
   * Distinguishes the four states the task requires, each with the real reason: the
   * distribution not running at all, the distribution running with no daemon, the
   * daemon answering, and the daemon's process present but not answering.
   */
  async status(signal?: AbortSignal): Promise<DaemonStatus> {
    const distribution = await this.#distributionState(signal);
    if (distribution.state !== "running") {
      return {
        state: distribution.state === "notRunning" ? "distributionNotRunning" : "daemonUnresponsive",
        distribution: this.#distribution,
        reason: distribution.state === "notRunning" ? "The selected distribution is not currently running." : distribution.reason,
        observedAt: this.#stamp(),
      };
    }
    const version = await this.#version(signal);
    if (version.ok) {
      return {
        state: "daemonAnswering",
        distribution: this.#distribution,
        asteriskVersion: version.detail,
        observedAt: this.#stamp(),
      };
    }
    const process = await this.#daemonProcessState(signal);
    return {
      state: process.state === "absent" ? "daemonNotRunning" : "daemonUnresponsive",
      distribution: this.#distribution,
      reason: process.state === "unknown" ? `${version.detail} Process state is unknown: ${process.reason}` : version.detail,
      observedAt: this.#stamp(),
    };
  }

  /** Polls `#version` until it succeeds or the start timeout is used up. */
  async #pollUntilAnswering(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }> {
    const maxAttempts = Math.max(1, Math.ceil(this.#startTimeoutMs / this.#pollIntervalMs));
    let last: { ok: boolean; detail: string } = { ok: false, detail: "Asterisk did not answer before the timeout." };
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (signal?.aborted) return { ok: false, detail: "The operation was cancelled." };
      last = await this.#version(signal);
      if (last.ok) return last;
      if (attempt < maxAttempts - 1) await this.#sleep(this.#pollIntervalMs);
    }
    return last;
  }

  /** Polls `#version` until it fails (the daemon stopped answering) or the timeout is used up. */
  async #pollUntilStopped(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }> {
    const maxAttempts = Math.max(1, Math.ceil(this.#stopTimeoutMs / this.#pollIntervalMs));
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (signal?.aborted) return { ok: false, detail: "The operation was cancelled." };
      const version = await this.#version(signal);
      if (!version.ok) {
        const process = await this.#daemonProcessState(signal);
        if (process.state === "absent") return { ok: true, detail: "Asterisk is no longer running." };
      }
      if (attempt < maxAttempts - 1) await this.#sleep(this.#pollIntervalMs);
    }
    return { ok: false, detail: "Asterisk did not stop answering before the timeout." };
  }

  /**
   * Starts Asterisk inside the managed distribution and waits until it actually
   * answers.
   *
   * The launch command's own exit code is not evidence of anything: `asterisk -F`
   * forks to the background (this is the exact invocation verified by hand against a
   * real machine — see the module comment) and the `wsl.exe` call returns as soon as
   * that fork happens, whether or not the daemon behind it ever finishes starting.
   * Every claim of success here comes from polling `core show version` instead.
   */
  async start(signal?: AbortSignal): Promise<DaemonOutcome> {
    const steps: DaemonStep[] = [];

    const already = await this.#version(signal);
    if (already.ok) {
      steps.push({ name: "already answering", ok: true, detail: already.detail });
      return {
        status: {
          state: "daemonAnswering",
          distribution: this.#distribution,
          asteriskVersion: already.detail,
          observedAt: this.#stamp(),
        },
        steps,
      };
    }

    const launch = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--user", "root", "--", "asterisk", "-F"],
      signal,
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    steps.push({
      name: "launch",
      ok: launch.status === "succeeded",
      detail:
        launch.status === "succeeded"
          ? "asterisk was launched"
          : stripNulls(launch.stderr).trim() || `asterisk exited with ${launch.exitCode}`,
    });

    const verified = await this.#pollUntilAnswering(signal);
    steps.push({ name: "verify Asterisk is answering", ok: verified.ok, detail: verified.detail });

    if (!verified.ok) {
      const process = await this.#daemonProcessState(signal).catch(() => ({ state: "unknown" as const }));
      return {
        status: {
          state: process.state === "absent" ? "daemonNotRunning" : "daemonUnresponsive",
          distribution: this.#distribution,
          reason: verified.detail,
          observedAt: this.#stamp(),
        },
        steps,
      };
    }
    return {
      status: {
        state: "daemonAnswering",
        distribution: this.#distribution,
        asteriskVersion: verified.detail,
        observedAt: this.#stamp(),
      },
      steps,
    };
  }

  /**
   * Stops the daemon and verifies it actually stopped answering.
   *
   * Prefers `core stop gracefully`; pass `{ force: true }` for `core stop now`. Says
   * plainly, in the returned step, which one was actually used.
   */
  async stop(options?: { force?: boolean }, signal?: AbortSignal): Promise<DaemonOutcome> {
    const steps: DaemonStep[] = [];
    const force = options?.force ?? false;

    const before = await this.#version(signal);
    if (!before.ok) {
      const process = await this.#daemonProcessState(signal).catch(() => ({ state: "unknown" as const }));
      steps.push({
        name: "already stopped",
        ok: true,
        detail: process.state !== "absent"
          ? "Asterisk's process is present or could not be proved absent, and it was already not answering."
          : "Asterisk was already not running.",
      });
      return {
        status: {
          state: process.state === "absent" ? "daemonNotRunning" : "daemonUnresponsive",
          distribution: this.#distribution,
          reason: before.detail,
          observedAt: this.#stamp(),
        },
        steps,
      };
    }

    const command = force ? "core stop now" : "core stop gracefully";
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", "asterisk", "-rx", command],
      signal,
      timeoutMs: 15_000,
      maxOutputBytes: 64 * 1024,
    });
    steps.push({
      name: force ? "stop now" : "stop gracefully",
      ok: result.status === "succeeded",
      detail:
        result.status === "succeeded"
          ? `issued \`asterisk -rx "${command}"\``
          : stripNulls(result.stderr).trim() || `asterisk -rx exited with ${result.exitCode}`,
    });

    const verified = await this.#pollUntilStopped(signal);
    steps.push({ name: "verify Asterisk stopped", ok: verified.ok, detail: verified.detail });

    if (!verified.ok) {
      /* The stop command was accepted (or not) but the daemon is still answering when
       * the timeout ran out: report what is actually true right now rather than what
       * was requested. */
      const still = await this.#version(signal);
      return {
        status: still.ok
          ? {
              state: "daemonAnswering",
              distribution: this.#distribution,
              asteriskVersion: still.detail,
              reason: verified.detail,
              observedAt: this.#stamp(),
            }
          : {
              state: "daemonUnresponsive",
              distribution: this.#distribution,
              reason: verified.detail,
              observedAt: this.#stamp(),
            },
        steps,
      };
    }
    return {
      status: {
        state: "daemonNotRunning",
        distribution: this.#distribution,
        reason: `stopped (${force ? "core stop now" : "core stop gracefully"})`,
        observedAt: this.#stamp(),
      },
      steps,
    };
  }

  /**
   * Stops then starts the daemon, each half verified exactly as `stop` and `start`
   * verify it alone. If the stop half never actually took effect, `restart` reports
   * that and does not go on to attempt a start on top of a daemon that may still be
   * running.
   */
  async restart(options?: { force?: boolean }, signal?: AbortSignal): Promise<DaemonOutcome> {
    const stopped = await this.stop(options, signal);
    if (stopped.status.state !== "daemonNotRunning") {
      return stopped;
    }
    const started = await this.start(signal);
    return { status: started.status, steps: [...stopped.steps, ...started.steps] };
  }
}
