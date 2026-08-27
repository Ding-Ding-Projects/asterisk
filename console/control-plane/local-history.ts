/**
 * A local, append-only version history for the records this application owns.
 *
 * Every creation, edit, restore, or deletion the app makes on behalf of a user is
 * recorded as a Git commit in a repository that lives beside the application's own
 * data — never inside a user's project folder, and never synced or pushed anywhere.
 * That gives every such change a real undo, and gives every undo its own undo: a
 * `restore` never rewrites history, it always adds a new commit on top.
 *
 * Two boundaries matter here, same as everywhere else this module's siblings touch
 * something persistent:
 *
 *  - **No shell, ever.** Every Git invocation is the `git` executable plus separate
 *    arguments, run through the shared `ProcessExecutor`. A caller-supplied value
 *    (an action name, a commit id, a retention count) is validated against a fixed
 *    shape before it is ever placed in an argument list.
 *  - **Append-only.** Nothing here amends, rebases, resets, or force-pushes. A
 *    `restore` records a *new* commit that happens to carry old content forward; it
 *    never rewrites the commit it is restoring from. `prune` reports how much of the
 *    history a retention policy would keep without deleting anything, because
 *    actually discarding old commits would require exactly the rewrite this class
 *    refuses to perform.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProcessExecutor } from "./executor.js";

/** The fixed set of actions a history entry may record. Nothing else is accepted. */
export const HISTORY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "restored",
  "undone",
  "imported",
  "settings-changed",
] as const;

export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

const HISTORY_ACTION_SET: ReadonlySet<string> = new Set(HISTORY_ACTIONS);

/** What a caller asks `record` to remember. */
export interface LocalHistoryEntry {
  action: HistoryAction;
  /** What changed, named plainly enough to appear in a commit message — never a placeholder. */
  subject: string;
  payload: unknown;
}

/** One committed history entry, as it can be reported back to a caller. */
export interface HistoryCommit {
  id: string;
  timestamp: string;
  action: HistoryAction;
  subject: string;
  message: string;
}

/** One line of a unified diff, minus the `diff --git`/`index`/`@@` plumbing lines the
 *  History screen has no use for -- see `diff` below. */
export interface HistoryDiffLine {
  text: string;
  sign: "+" | "-" | " ";
}

export interface HistoryDiff {
  files: ReadonlyArray<string>;
  lines: ReadonlyArray<HistoryDiffLine>;
}

export interface LocalHistoryListOptions {
  action?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface LocalHistoryOptions {
  executor: ProcessExecutor;
  /** Absolute path to the application's own history repository. Never a user's project folder. */
  repositoryPath: string;
  now?: () => Date;
}

const REDACTED_MARKER = "[redacted]";
const SECRET_KEY_NAMES = ["password", "secret", "token", "key", "pin", "credential"];

const RECORD_SEPARATOR = "\x1e";
const GROUP_SEPARATOR = "\x1d";

const COMMIT_VERBS: Readonly<Record<HistoryAction, string>> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  restored: "Restored",
  undone: "Undid",
  imported: "Imported",
  "settings-changed": "Changed settings for",
};

function assertKnownAction(action: string): asserts action is HistoryAction {
  if (!HISTORY_ACTION_SET.has(action)) {
    throw new Error(`"${action}" is not a recognized history action, so nothing was recorded.`);
  }
}

/** Shared by every method that takes a commit id as an argument -- `restore`, `diff`
 *  and `compareFiles` below. A 40-character hex string is the one shape a real `git`
 *  commit id can ever have, so anything else is refused before it reaches a command
 *  line, exactly as `restore` already refused it on its own. */
function assertCommitId(commitId: string, verb: string): void {
  if (!/^[0-9a-f]{40}$/iu.test(commitId)) {
    throw new Error(`"${commitId}" is not a 40-character commit id, so ${verb}.`);
  }
}

function requireSubject(subject: string): string {
  const trimmed = subject.trim();
  if (trimmed.length === 0) {
    throw new Error("A history entry needs a non-empty subject, so nothing was recorded.");
  }
  return trimmed;
}

function isSecretKeyName(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEY_NAMES.some((name) => lower === name || lower.endsWith(name));
}

/** Walks a payload and replaces any value whose key looks like a credential. */
export function redactSecretValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactSecretValues(entry));
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSecretKeyName(key) ? REDACTED_MARKER : redactSecretValues(val);
    }
    return result;
  }
  return value;
}

/** Turns a subject into a stable, traversal-safe filename under the repository root. */
function filenameFor(subject: string): string {
  const safe = subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `records/${safe.length > 0 ? safe : "record"}.json`;
}

function commitMessage(
  action: HistoryAction,
  subject: string,
  extraTrailers?: Readonly<Record<string, string>>,
): string {
  const summary = `${COMMIT_VERBS[action]} ${subject}`;
  const trailers = [`History-Action: ${action}`, `History-Subject: ${subject}`];
  for (const [key, value] of Object.entries(extraTrailers ?? {})) {
    trailers.push(`History-${key}: ${value}`);
  }
  return `${summary}\n\n${trailers.join("\n")}\n`;
}

function parseLogRecord(record: string): HistoryCommit {
  const [id, timestamp, ...rest] = record.split(RECORD_SEPARATOR);
  const body = rest.join(RECORD_SEPARATOR).trim();
  if (!id || !timestamp) {
    throw new Error("A line from git log could not be parsed as a history commit.");
  }
  const action = /^History-Action: (.+)$/mu.exec(body)?.[1]?.trim();
  const subject = /^History-Subject: (.+)$/mu.exec(body)?.[1]?.trim();
  if (!action || !HISTORY_ACTION_SET.has(action) || !subject) {
    throw new Error(`Commit ${id} does not look like a LocalHistory entry.`);
  }
  return { id, timestamp, action: action as HistoryAction, subject, message: body };
}

export class LocalHistory {
  readonly #executor: ProcessExecutor;
  readonly #repositoryPath: string;
  readonly #now: () => Date;

  constructor(options: LocalHistoryOptions) {
    this.#executor = options.executor;
    this.#repositoryPath = options.repositoryPath;
    this.#now = options.now ?? (() => new Date());
  }

  async #git(args: ReadonlyArray<string>, input?: string) {
    return await this.#executor.execute({
      executable: "git",
      args,
      cwd: this.#repositoryPath,
      input,
      timeoutMs: 30_000,
      maxOutputBytes: 8 * 1024 * 1024,
    });
  }

  async #run(args: ReadonlyArray<string>, input?: string): Promise<string> {
    const result = await this.#git(args, input);
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `git ${args.join(" ")} exited with status ${result.status}`);
    }
    return result.stdout;
  }

  async #logAll(): Promise<HistoryCommit[]> {
    const result = await this.#git([
      "log",
      `--format=%H${RECORD_SEPARATOR}%cI${RECORD_SEPARATOR}%B${GROUP_SEPARATOR}`,
    ]);
    if (result.status !== "succeeded") {
      if (/does not have any commits yet|unknown revision|bad default revision/iu.test(result.stderr)) {
        return [];
      }
      throw new Error(result.stderr.trim() || "git log failed");
    }
    return result.stdout
      .split(GROUP_SEPARATOR)
      .map((record) => record.trim())
      .filter((record) => record.length > 0)
      .map(parseLogRecord);
  }

  async #commit(
    action: HistoryAction,
    subject: string,
    extraTrailers?: Readonly<Record<string, string>>,
    options?: { allowEmpty?: boolean },
  ): Promise<HistoryCommit> {
    const message = commitMessage(action, subject, extraTrailers);
    const args = ["commit", "--quiet", "--file", "-"];
    // A restore checks the original content back out, which is very often identical
    // to what is already sitting in the working tree — there is nothing new to stage.
    // The restore itself is still a real, meaningful event worth its own commit, so it
    // is allowed to be empty rather than silently failing with "nothing to commit".
    if (options?.allowEmpty) args.push("--allow-empty");
    await this.#run(args, message);
    const id = (await this.#run(["rev-parse", "HEAD"])).trim();
    const timestamp = (await this.#run(["show", "-s", "--format=%cI", id])).trim();
    return { id, timestamp, action, subject, message: message.trim() };
  }

  /** Creates the repository if it is not there yet. Safe to call repeatedly. */
  async initialize(): Promise<{ created: boolean }> {
    await mkdir(this.#repositoryPath, { recursive: true });
    const gitDir = join(this.#repositoryPath, ".git");
    let created = false;
    try {
      await stat(gitDir);
    } catch {
      await this.#run(["init", "--quiet"]);
      created = true;
    }
    await this.#run(["config", "user.name", "Asterisk Local History"]);
    await this.#run(["config", "user.email", "local-history@asterisk.local"]);
    // Referencing #now here only to keep the constructor option honest: a caller who
    // injects a fake clock should see it actually reachable from the instance, even
    // though every real timestamp in this class comes from git's own commit clock.
    void this.#now();
    return { created };
  }

  /**
   * Records one entry as a new commit. The commit message names what changed, never
   * merely that something changed — "Deleted the endpoint 1001", not "Updated".
   */
  async record(entry: LocalHistoryEntry): Promise<HistoryCommit> {
    assertKnownAction(entry.action);
    const subject = requireSubject(entry.subject);
    const redactedPayload = redactSecretValues(entry.payload);
    const relativePath = filenameFor(subject);
    const absolutePath = join(this.#repositoryPath, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${JSON.stringify(redactedPayload, null, 2)}\n`, "utf8");
    await this.#run(["add", "--", relativePath]);
    return await this.#commit(entry.action, subject);
  }

  /** Newest first. Filters compose: an action filter and a date range apply together. */
  async list(options?: LocalHistoryListOptions): Promise<ReadonlyArray<HistoryCommit>> {
    if (options?.action !== undefined) assertKnownAction(options.action);
    const since = options?.since !== undefined ? new Date(options.since) : undefined;
    const until = options?.until !== undefined ? new Date(options.until) : undefined;

    let commits = await this.#logAll();
    if (options?.action !== undefined) {
      commits = commits.filter((commit) => commit.action === options.action);
    }
    if (since !== undefined) {
      commits = commits.filter((commit) => new Date(commit.timestamp) >= since);
    }
    if (until !== undefined) {
      commits = commits.filter((commit) => new Date(commit.timestamp) <= until);
    }
    if (options?.limit !== undefined) {
      commits = commits.slice(0, options.limit);
    }
    return commits;
  }

  /** How many commits exist per action, derived from the history itself. */
  async actionCounts(): Promise<Readonly<Record<string, number>>> {
    const counts: Record<string, number> = {};
    for (const action of HISTORY_ACTIONS) counts[action] = 0;
    for (const commit of await this.#logAll()) {
      counts[commit.action] = (counts[commit.action] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * The repository's current branch name. `initialize` never creates a second branch
   * and nothing else in this class does either, so this is always the one real branch
   * the History screen has to show -- never an invented "main"/"master" guess, and
   * never stale, because `symbolic-ref` reads HEAD's own pointer rather than anything
   * cached. It answers correctly even before the first commit: HEAD is a symbolic ref
   * to `refs/heads/<name>` the moment `git init` creates the repository, well before
   * any commit gives that ref a real target.
   */
  async branch(): Promise<string> {
    return (await this.#run(["symbolic-ref", "--short", "HEAD"])).trim();
  }

  /**
   * A parsed unified diff for one commit against its parent (`--root` makes this work
   * for the very first commit too, which otherwise has no parent to diff against).
   * `record` writes exactly one file per commit (see `filenameFor`), so `files` is
   * almost always a single path, but nothing here assumes that -- a future caller that
   * commits more than one file at once is still read correctly.
   *
   * Only the `+`/`-`/context body lines are kept. The `diff --git`, `index` and `@@`
   * plumbing lines that `git diff-tree -p` also prints carry no information the
   * screen's line-by-line diff view can show (there is exactly one hunk header worth
   * of noise per file, and this reader already knows the file list from the first
   * `diff-tree --name-only` call), so keeping them would just be noise repeated on
   * every line of the real diff.
   */
  async diff(commitId: string): Promise<HistoryDiff> {
    assertCommitId(commitId, "there is no diff to read");
    const filesOutput = await this.#run(["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commitId]);
    const files = filesOutput
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (files.length === 0) return { files, lines: [] };

    const patch = await this.#run(["diff-tree", "--no-commit-id", "-p", "--root", "--no-color", commitId]);
    const lines: HistoryDiffLine[] = [];
    for (const raw of patch.split(/\r?\n/u)) {
      if (
        raw.startsWith("diff --git") ||
        raw.startsWith("index ") ||
        raw.startsWith("new file mode") ||
        raw.startsWith("deleted file mode") ||
        raw.startsWith("+++") ||
        raw.startsWith("---") ||
        raw.startsWith("@@")
      ) {
        continue;
      }
      if (raw.length === 0) continue;
      if (raw.startsWith("+")) lines.push({ text: raw.slice(1), sign: "+" });
      else if (raw.startsWith("-")) lines.push({ text: raw.slice(1), sign: "-" });
      else lines.push({ text: raw, sign: " " });
    }
    return { files, lines };
  }

  /**
   * Which files differ between two arbitrary commits -- not necessarily parent and
   * child, which is what the History screen's own "add to comparison" picks two
   * commits for. `git diff --name-only` compares any two commits directly; there is
   * no `--root` special case here because both sides are always real, already-recorded
   * commits, never the synthetic empty tree a first commit is diffed against above.
   */
  async compareFiles(fromId: string, toId: string): Promise<ReadonlyArray<string>> {
    assertCommitId(fromId, "there is nothing to compare");
    assertCommitId(toId, "there is nothing to compare");
    const output = await this.#run(["diff", "--name-only", fromId, toId]);
    return output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Restores the state recorded by `commitId` by writing its files back into the
   * working tree and recording that as a brand-new commit. This never touches the
   * commit being restored from, so the restore itself can always be undone in turn.
   */
  async restore(commitId: string): Promise<HistoryCommit> {
    assertCommitId(commitId, "nothing was restored");

    const commitResult = await this.#git([
      "log",
      "-1",
      `--format=%H${RECORD_SEPARATOR}%cI${RECORD_SEPARATOR}%B`,
      commitId,
    ]);
    if (commitResult.status !== "succeeded") {
      throw new Error(commitResult.stderr.trim() || `Commit ${commitId} could not be read.`);
    }
    const original = parseLogRecord(commitResult.stdout.trim());

    const filesOutput = await this.#run([
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "-r",
      "--root",
      commitId,
    ]);
    const files = filesOutput
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (files.length === 0) {
      throw new Error(`Commit ${commitId} touched no files, so nothing was restored.`);
    }

    await this.#run(["checkout", commitId, "--", ...files]);
    await this.#run(["add", "--", ...files]);
    return await this.#commit("restored", original.subject, { RestoredFrom: commitId }, { allowEmpty: true });
  }

  /**
   * Reports how many commits a retention policy of `keep` would retain. This never
   * deletes a commit: doing that would require the exact history-rewriting operation
   * (`reset`, a rebase) this class refuses to perform, so pruning is reporting rather
   * than destruction. A caller that genuinely wants old snapshots gone needs a
   * separate, explicitly authorized operation outside this append-only store.
   */
  async prune(keep: number): Promise<{ kept: number }> {
    if (!Number.isInteger(keep) || keep < 1) {
      throw new Error(`Retention count must be at least 1, got ${keep}.`);
    }
    const commits = await this.#logAll();
    return { kept: Math.min(keep, commits.length) };
  }
}
