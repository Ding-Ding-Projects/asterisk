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

/** One line of a `ConfigDiff`: unchanged (` `), only in the backup (`-`), or only in
 *  the file currently on the target (`+`) -- the same three-way shape `HistoryDiffLine`
 *  in `local-history.ts` already uses for the git-backed screen, so a renderer that
 *  knows how to draw one already knows how to draw the other. */
export interface ConfigDiffLine {
  text: string;
  sign: "+" | "-" | " ";
}

export interface ConfigDiff {
  resource: string;
  handle: string;
  /** Whether the resource currently exists on the target at all -- false for a file a
   *  transaction created and this compare is now being run against after it was removed
   *  by hand, which is a real state and not an error. */
  currentExists: boolean;
  identical: boolean;
  added: number;
  removed: number;
  /** Omitted, with `truncated: true`, when the two sides are too large to diff line by
   *  line -- see `MAX_DIFF_TOTAL_LINES`. `added`/`removed` still count real lines in
   *  that case; only the rendered line list is skipped. */
  lines: ReadonlyArray<ConfigDiffLine>;
  truncated: boolean;
}

/** Above this combined line count, `diff` reports the identical/added/removed facts
 *  without materialising the aligned line list. The backtracking table below is built
 *  from the edit distance between the two files, not their raw size, so a small
 *  one-line change on an enormous file stays cheap either way -- this bound exists for
 *  the pathological case of two files that share almost nothing, where the edit
 *  distance approaches the combined size and the trace would otherwise grow without a
 *  ceiling. Real Asterisk configuration files are nowhere near this in practice. */
const MAX_DIFF_TOTAL_LINES = 4000;

/** Splits on any real line ending and drops one single trailing empty element -- the
 *  artefact of a file that (as almost every text file does) ends in a newline, which
 *  would otherwise show up as a phantom trailing blank line in every comparison. */
function toLines(content: string): string[] {
  const lines = content.split(/\r\n|\n|\r/u);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * The Myers diff algorithm (Eugene Myers, "An O(ND) Difference Algorithm and Its
 * Variations", 1986), backtracked into an aligned list of context/added/removed lines.
 * Used instead of shelling out to the `diff` command: every other read in this file
 * relies only on coreutils (`ls`, `stat`, `cat`, `cp`, `rm`), which the packaged WSL
 * runtime installs and every registered target is expected to have, while `diff` comes
 * from the separate `diffutils` package that nothing here guarantees is present -- a
 * registered target can be any WSL distribution a user pointed this console at, not
 * only the bundled one.
 *
 * Its cost is driven by the edit distance `D` between the two inputs, not their length:
 * a backup and the file currently on the target are almost always near-identical (one
 * write changed a handful of keys), so `D` is small in the overwhelmingly common case
 * even when the files themselves are long. `MAX_DIFF_TOTAL_LINES` above bounds the
 * pathological case where `D` approaches the combined size.
 */
export function diffLines(a: ReadonlyArray<string>, b: ReadonlyArray<string>): ConfigDiffLine[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];

  const max = n + m;
  let v: Record<number, number> = { 1: 0 };
  const trace: Array<Record<number, number>> = [];
  let solved = false;

  for (let d = 0; d <= max && !solved; d++) {
    trace.push(v);
    const next: Record<number, number> = { ...v };
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      next[k] = x;
      if (x >= n && y >= m) solved = true;
    }
    v = next;
  }

  const lines: ConfigDiffLine[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vv = trace[d];
    const k = x - y;
    const prevK = (k === -d || (k !== d && vv[k - 1] < vv[k + 1])) ? k + 1 : k - 1;
    const prevX = vv[prevK] ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      lines.push({ text: a[x - 1], sign: " " });
      x--; y--;
    }
    if (d > 0) {
      if (x === prevX) { lines.push({ text: b[y - 1], sign: "+" }); y--; }
      else { lines.push({ text: a[x - 1], sign: "-" }); x--; }
    }
  }
  return lines.reverse();
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
   * The resource `handle` was taken from, once it has been confirmed to be a handle
   * `list` would actually return -- shared by `restore` and `diff`, which both act on
   * a caller-supplied handle and both need the same two checks before they touch
   * anything: it names one of `CONFIGURABLE_RESOURCES`, and it is a listing the bounded
   * directory read actually produced (prefix matching alone is not enough --
   * `/etc/asterisk/pjsip.conf.backup-../../x` still begins with a valid resource).
   */
  async #resolveKnownHandle(handle: string, verb: string): Promise<string> {
    const resource = CONFIGURABLE_RESOURCES.find((candidate) => handle.startsWith(`${candidate}.backup-`));
    if (!resource) {
      throw new Error(`"${handle}" is not a configurable resource's backup, so it was not ${verb}.`);
    }
    const known = (await this.list(resource)).some((entry) => entry.handle === handle);
    if (!known || !(await this.#exists(handle))) {
      throw new Error(`"${handle}" is not a recovery point currently listed on the target, so it was not ${verb}.`);
    }
    return resource;
  }

  /**
   * Restores a listed backup over the resource it was taken from, then reads the
   * resource back and confirms it matches. An `-absent` marker restores absence by
   * removing the file and verifying it no longer exists.
   */
  async restore(handle: string): Promise<{ ok: boolean; resource: string; detail: string }> {
    const resource = await this.#resolveKnownHandle(handle, "restored");

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

  /**
   * Compares a listed backup against whatever is on the target right now, at the
   * resource it was taken from -- never against another backup, because the question
   * this answers is always "what would restoring this change", and the only correct
   * baseline for that is the current live file. An `-absent` marker's "backup content"
   * is empty, exactly as its own restore treats it: an absent marker records that the
   * resource did not exist, not that it was empty.
   */
  async diff(handle: string): Promise<ConfigDiff> {
    const resource = await this.#resolveKnownHandle(handle, "compared");

    const backupContent = handle.endsWith("-absent") ? "" : await this.#run(["cat", handle]);
    const currentExists = await this.#exists(resource);
    const currentContent = currentExists ? await this.#run(["cat", resource]) : "";

    if (backupContent === currentContent) {
      return { resource, handle, currentExists, identical: true, added: 0, removed: 0, lines: [], truncated: false };
    }

    const before = toLines(backupContent);
    const after = toLines(currentContent);

    if (before.length + after.length > MAX_DIFF_TOTAL_LINES) {
      /* Still reports real counts -- just not the aligned line-by-line list -- by
       * treating every line on each side as a set member. Cruder than the real
       * alignment (a moved-but-unchanged block counts as both an add and a remove
       * here), but honest about what it is: a size estimate, not the diff. */
      const beforeCounts = new Map<string, number>();
      for (const line of before) beforeCounts.set(line, (beforeCounts.get(line) ?? 0) + 1);
      const afterCounts = new Map<string, number>();
      for (const line of after) afterCounts.set(line, (afterCounts.get(line) ?? 0) + 1);
      let removed = 0;
      for (const [line, count] of beforeCounts) removed += Math.max(0, count - (afterCounts.get(line) ?? 0));
      let added = 0;
      for (const [line, count] of afterCounts) added += Math.max(0, count - (beforeCounts.get(line) ?? 0));
      return { resource, handle, currentExists, identical: false, added, removed, lines: [], truncated: true };
    }

    const lines = diffLines(before, after);
    const added = lines.filter((line) => line.sign === "+").length;
    const removed = lines.filter((line) => line.sign === "-").length;
    return { resource, handle, currentExists, identical: false, added, removed, lines, truncated: false };
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
