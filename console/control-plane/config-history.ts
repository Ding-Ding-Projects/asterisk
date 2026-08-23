/**
 * Lists and restores the timestamped backups `WslConfigTransport#backup` already writes.
 *
 * This does not invent a second backup mechanism. It reads the same
 * `<resource>.backup-<stamp>` files the transaction engine creates before every apply,
 * so a user can see what recovery points exist and restore one without reaching into
 * WSL by hand.
 *
 * The same two boundaries from `wsl-config-transport.ts` apply here, because this is
 * also code that reaches into the target and can overwrite a live configuration file:
 *
 *  - **A resource is one of `CONFIGURABLE_RESOURCES` and nothing else.** `list` and
 *    `prune` refuse an unlisted resource by name before running any command. `restore`
 *    only accepts an exact handle returned by `list`, so a caller cannot manufacture a
 *    path merely by giving it a valid resource prefix.
 *  - **Every command is an allowlisted executable with separate arguments.** No shell,
 *    no interpolation of a caller-supplied value into a command string.
 */
import type { ProcessExecutor } from "./executor.js";
import { CONFIGURABLE_RESOURCES, assertConfigurable, type ConfigurableResource } from "./wsl-config-transport.js";

/** The directory every configurable resource lives in, derived from the allowlist itself. */
const CONFIG_DIRECTORY = CONFIGURABLE_RESOURCES[0].slice(0, CONFIGURABLE_RESOURCES[0].lastIndexOf("/"));

export interface HistoryEntry {
  /** The absolute configuration path this backup was taken from. */
  resource: ConfigurableResource;
  /** The absolute path of the backup file itself; pass this to `restore`. */
  handle: string;
  /** The moment the backup was taken, parsed back out of its filename, when parseable. */
  takenAt: string | undefined;
  /** The backup file's size in bytes. An absent marker is normally zero bytes. */
  bytes: number;
}

export interface ConfigHistoryOptions {
  executor: ProcessExecutor;
  distribution: string;
}

/** Turns `queues.conf.backup-2026-08-23T01-19-03-627Z` back into an ISO timestamp. */
function parseBackupStamp(stamp: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/u.exec(stamp);
  if (!match) return undefined;
  const [, date, hh, mm, ss, ms] = match;
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

export class ConfigHistory {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;

  constructor(options: ConfigHistoryOptions) {
    this.#executor = options.executor;
    this.#distribution = options.distribution;
  }

  async #run(args: ReadonlyArray<string>, input?: string, timeoutMs = 30_000): Promise<string> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", ...args],
      input,
      timeoutMs,
      maxOutputBytes: 4 * 1024 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `${args[0]} exited with ${result.exitCode}`);
    }
    return result.stdout;
  }

  async #exists(path: string): Promise<boolean> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", "test", "-e", path],
      timeoutMs: 15_000,
      maxOutputBytes: 4096,
    });
    return result.status === "succeeded";
  }

  /** Names of every entry in the backup directory, or an empty list if it cannot be read. */
  async #directoryEntries(): Promise<ReadonlyArray<string>> {
    try {
      const stdout = await this.#run(["ls", "-1", "--", CONFIG_DIRECTORY]);
      return stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch {
      /* An absent or unreadable backup directory is an empty history, not an error. */
      return [];
    }
  }

  async #sizeOf(handle: string): Promise<number> {
    try {
      const stdout = await this.#run(["stat", "-c", "%s", "--", handle]);
      const bytes = Number.parseInt(stdout.trim(), 10);
      return Number.isFinite(bytes) ? bytes : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Lists backups for one allowlisted resource, or for every configurable resource
   * when none is given. Newest first. `-absent` markers participate in the same list:
   * they record that a transaction created a resource which did not exist beforehand.
   */
  async list(resource?: string): Promise<ReadonlyArray<HistoryEntry>> {
    const targets = resource === undefined ? CONFIGURABLE_RESOURCES : [assertConfigurable(resource)];
    const filenames = await this.#directoryEntries();
    const entries: HistoryEntry[] = [];

    for (const target of targets) {
      const base = target.slice(target.lastIndexOf("/") + 1);
      const prefix = `${base}.backup-`;
      for (const filename of filenames) {
        if (!filename.startsWith(prefix)) continue;
        const handle = `${CONFIG_DIRECTORY}/${filename}`;
        const suffix = filename.slice(prefix.length);
        const stamp = suffix.endsWith("-absent") ? suffix.slice(0, -"-absent".length) : suffix;
        const takenAt = parseBackupStamp(stamp);
        const bytes = await this.#sizeOf(handle);
        entries.push({ resource: target, handle, takenAt, bytes });
      }
    }

    entries.sort((a, b) => {
      if (a.takenAt !== undefined && b.takenAt !== undefined) {
        if (a.takenAt === b.takenAt) return 0;
        return a.takenAt < b.takenAt ? 1 : -1;
      }
      if (a.takenAt !== undefined) return -1;
      if (b.takenAt !== undefined) return 1;
      return 0;
    });

    return entries;
  }

  /**
   * Restores a listed backup over the resource it was taken from, then reads the
   * resource back and confirms it matches. An `-absent` marker restores absence by
   * removing the file and verifying it no longer exists.
   */
  async restore(handle: string): Promise<{ ok: boolean; resource: string; detail: string }> {
    const resource = CONFIGURABLE_RESOURCES.find((candidate) => handle.startsWith(`${candidate}.backup-`));
    if (!resource) {
      throw new Error(`"${handle}" is not a configurable resource's backup, so it was not restored.`);
    }

    /* Prefix matching alone is not enough: `/etc/asterisk/pjsip.conf.backup-../../x`
     * still begins with a valid resource. Only a handle the bounded directory listing
     * actually returned can reach a copy/remove command. */
    const known = (await this.list(resource)).some((entry) => entry.handle === handle);
    if (!known || !(await this.#exists(handle))) {
      throw new Error(`"${handle}" is not a recovery point currently listed on the target, so it was not restored.`);
    }

    if (handle.endsWith("-absent")) {
      await this.#run(["rm", "-f", resource]);
      if (await this.#exists(resource)) {
        return { ok: false, resource, detail: `${resource} still exists after restoring its absent recovery point.` };
      }
      return { ok: true, resource, detail: `${resource} was removed, restoring the target state in which it did not exist.` };
    }

    const backupContent = await this.#run(["cat", handle]);
    await this.#run(["cp", handle, resource]);
    const restoredContent = await this.#run(["cat", resource]);

    if (restoredContent !== backupContent) {
      return {
        ok: false,
        resource,
        detail: `${resource} does not match ${handle} after restoring; the write may not have landed.`,
      };
    }
    return { ok: true, resource, detail: `${resource} was restored from ${handle}.` };
  }

  /** Keeps the `keep` newest backups for `resource` and deletes the rest. */
  async prune(resource: string, keep: number): Promise<{ removed: number; kept: number }> {
    const allowed = assertConfigurable(resource);
    if (!Number.isInteger(keep) || keep < 1) {
      throw new Error(`keep must be a positive integer; refusing to prune with keep=${keep}.`);
    }

    const entries = await this.list(allowed); // newest first
    const toRemove = entries.slice(keep);
    for (const entry of toRemove) {
      await this.#run(["rm", "--", entry.handle]);
    }
    return { removed: toRemove.length, kept: entries.length - toRemove.length };
  }
}
