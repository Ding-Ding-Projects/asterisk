import type { TargetProfile } from "./contracts.js";
import type { CommandResult, ProcessExecutor } from "./executor.js";

export type ConfigInventoryState = "available" | "unavailable" | "unknown";

export interface ConfigInventoryResult {
  state: ConfigInventoryState;
  observedAt: string;
  files?: ReadonlyArray<string>;
  complete: boolean;
  reason?: string;
  status?: CommandResult["status"];
}

/** Reads only the target's /etc/asterisk filenames, never their contents. */
export class AsteriskConfigInventory {
  readonly #executor: ProcessExecutor;
  readonly #now: () => Date;

  constructor(executor: ProcessExecutor, now: () => Date = () => new Date()) {
    this.#executor = executor;
    this.#now = now;
  }

  async list(target: TargetProfile, signal?: AbortSignal): Promise<ConfigInventoryResult> {
    const observedAt = this.#now().toISOString();
    const invocation = this.#invocation(target);
    if (!invocation) return { state: "unknown", observedAt, complete: false, reason: `Configuration inventory is not implemented for ${target.connectionKind}.` };
    try {
      const result = await this.#executor.execute({ ...invocation, signal, timeoutMs: 15_000, maxOutputBytes: 256 * 1024 });
      if (result.status !== "succeeded") return {
        state: "unavailable",
        observedAt,
        complete: false,
        status: result.status,
        reason: result.stderr.trim() || result.stdout.trim() || `Configuration inventory ended with ${result.status}.`,
      };
      const files = result.stdout.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0 && /^[A-Za-z0-9._-]+$/u.test(line));
      return { state: "available", observedAt, files, complete: true, status: result.status };
    } catch (error) {
      return { state: "unavailable", observedAt, complete: false, reason: error instanceof Error ? error.message : "Configuration inventory failed." };
    }
  }

  #invocation(target: TargetProfile): { executable: string; args: ReadonlyArray<string> } | undefined {
    const finderArgs = ["find", "/etc/asterisk", "-maxdepth", "1", "-type", "f", "-printf", "%f\\n"];
    if (target.connectionKind === "wsl") {
      if (!target.wslDistribution) return undefined;
      return { executable: "wsl.exe", args: ["-d", target.wslDistribution, "--", ...finderArgs] };
    }
    if (target.connectionKind === "localDocker") {
      if (!target.dockerContext) return undefined;
      return { executable: "docker", args: ["exec", target.dockerContext, ...finderArgs] };
    }
    return undefined;
  }
}
