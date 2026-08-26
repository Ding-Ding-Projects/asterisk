/**
 * Lists what is actually on disk in a target's AGI scripts directory, so the
 * "Dialplan scripting visibility" screen can say which of the scripts `extensions.conf`
 * calls through `AGI()`/`EAGI()`/`DeadAGI()` genuinely exist on the target -- and which
 * of the files sitting in that directory nothing in the dialplan ever references.
 *
 * The directory itself is not a fixed constant the way `MEDIA_ROOTS` or
 * `CONFIGURABLE_RESOURCES` are: it is `astagidir` out of the target's own
 * `asterisk.conf` (the Directories & identity screen's own `as_diragi` field), which an
 * operator can point anywhere. Asterisk's own shipped default is
 * `/var/lib/asterisk/agi-bin`, used here only as a fallback when the field has not been
 * read or is empty -- never invented as though it were the target's real setting.
 *
 * This is read-only (`ls`, `stat`, `test`) and reaches only a directory the operator is
 * already administering through their own already-connected target; there is nothing
 * here for a caller to write. The same two boundaries the rest of this codebase's
 * target-reaching code keeps still apply:
 *
 *  - **Every command is an allowlisted executable with separate arguments.** No shell,
 *    no interpolation of the directory into a command string.
 *  - **The directory is validated before it reaches a command.** It must be a non-empty
 *    absolute POSIX path with no NUL byte and no `..` segment -- defence in depth
 *    rather than a real injection defence, since separate arguments already rule that
 *    out, but a `..` segment in a *directory listing* is still worth refusing outright
 *    rather than silently listing something the field's author did not intend.
 */
import type { ProcessExecutor } from "./executor.js";

export const DEFAULT_AGI_DIRECTORY = "/var/lib/asterisk/agi-bin";

export interface AgiScriptFile {
  name: string;
  bytes: number;
  executable: boolean;
}

export interface AgiLibraryOptions {
  executor: ProcessExecutor;
  distribution: string;
}

/** A directory this is willing to list: absolute, no NUL, no `..` segment. `undefined`
 *  input falls back to Asterisk's own shipped default rather than refusing outright --
 *  a console that has not read asterisk.conf yet still has somewhere sensible to look. */
export function usableAgiDirectory(directory: string | undefined): string | undefined {
  const value = (directory ?? "").trim() || DEFAULT_AGI_DIRECTORY;
  if (!value.startsWith("/")) return undefined;
  if (value.includes("\0")) return undefined;
  if (value.split("/").some((segment) => segment === "..")) return undefined;
  return value;
}

export class AgiLibrary {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;

  constructor(options: AgiLibraryOptions) {
    this.#executor = options.executor;
    this.#distribution = options.distribution;
  }

  async #run(args: ReadonlyArray<string>, timeoutMs = 20_000): Promise<string> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", ...args],
      timeoutMs,
      maxOutputBytes: 2 * 1024 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `${args[0]} exited with ${result.exitCode}`);
    }
    return result.stdout;
  }

  /**
   * Every file directly inside `directory` (falling back to
   * `DEFAULT_AGI_DIRECTORY` for an empty or missing value), each with its size and
   * whether the executable bit is set -- the one fact that actually distinguishes a
   * runnable AGI script from a stray text file left in the same place. A missing or
   * unreadable directory is an empty list, not an error: the directory naming a place
   * nothing has been deployed to yet is a real and common state, not a failure.
   */
  async list(directory: string | undefined): Promise<ReadonlyArray<AgiScriptFile>> {
    const usable = usableAgiDirectory(directory);
    if (!usable) return [];

    let names: string[];
    try {
      const stdout = await this.#run(["ls", "-1", "-A", "--", usable]);
      names = stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch {
      return [];
    }

    const files: AgiScriptFile[] = [];
    for (const name of names) {
      const path = `${usable.replace(/\/+$/u, "")}/${name}`;
      try {
        // `%s` reports the entry type (`regular file`, `directory`, ...); only real
        // files are listed here -- a subdirectory under astagidir is not a script.
        const kind = (await this.#run(["stat", "-c", "%F", "--", path])).trim();
        if (kind !== "regular file") continue;
        const size = Number.parseInt((await this.#run(["stat", "-c", "%s", "--", path])).trim(), 10);
        const executableCheck = await this.#executor.execute({
          executable: "wsl.exe",
          args: ["-d", this.#distribution, "--", "test", "-x", path],
          timeoutMs: 15_000,
          maxOutputBytes: 4096,
        });
        files.push({
          name,
          bytes: Number.isFinite(size) ? size : 0,
          executable: executableCheck.status === "succeeded",
        });
      } catch {
        /* A file that disappeared or refused stat between the listing and this loop is
         * dropped rather than reported with an invented size. */
      }
    }
    return files;
  }
}
