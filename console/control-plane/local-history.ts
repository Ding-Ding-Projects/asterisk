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
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProcessExecutor } from "./executor.js";
import { normalizeLocalDateInterval } from "../shared/date-range.js";

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
  /** Stable target/resource/kind/object identity, never a display label. */
  identity: string;
  eventId: string;
  payload: unknown;
}

/** One committed history entry, as it can be reported back to a caller. */
export interface HistoryCommit {
  id: string;
  timestamp: string;
  action: HistoryAction;
  subject: string;
  message: string;
  eventId?: string;
}

export interface LocalHistoryListOptions {
  action?: string;
  since?: string;
  until?: string;
  query?: string;
  cursor?: string;
  limit?: number;
}

export interface LocalHistoryPage {
  entries: ReadonlyArray<HistoryCommit>;
  total: number;
  nextCursor?: string;
  counts: Readonly<Record<string, number>>;
}

export interface HistoryTreeInspection {
  commit: HistoryCommit;
  files: ReadonlyArray<string>;
  diff: string;
}

export interface LocalHistoryOptions {
  executor: ProcessExecutor;
  /** Absolute path to the application's own history repository. Never a user's project folder. */
  repositoryPath: string;
  now?: () => Date;
}

const REDACTED_MARKER = "[redacted]";
const SECRET_KEY_NAMES = ["password", "passwd", "passphrase", "secret", "token", "bearer", "authorization", "authheader", "apikey", "api_key", "key", "pin", "credential", "privatekey", "accesskey"];
const MAX_PAYLOAD_BYTES = 1_048_576;
const MAX_PAYLOAD_DEPTH = 32;
const MAX_PAYLOAD_ENTRIES = 10_000;
const MAX_PAYLOAD_KEY_LENGTH = 256;
const MAX_PAYLOAD_VALUE_LENGTH = 8_192;
const MAX_RETRY_ENTRIES = 1_000;
const MAX_RETRY_BYTES = 8 * 1024 * 1024;

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

function requireSubject(subject: string): string {
  const trimmed = subject.trim();
  if (trimmed.length === 0) {
    throw new Error("A history entry needs a non-empty subject, so nothing was recorded.");
  }
  if (trimmed.length > 256 || /[\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new Error("A history subject must be at most 256 characters and contain no control characters.");
  }
  return trimmed;
}

function isSecretKeyName(key: string): boolean {
  const lower = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
  return SECRET_KEY_NAMES.some((name) => lower === name || lower.endsWith(name));
}

/** Walks a bounded payload and replaces credential-shaped values without looping on cycles. */
export function redactSecretValues(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > 32) return "[redacted:depth]";
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[redacted:cycle]";
    seen.add(value);
    return value.map((entry) => redactSecretValues(entry, seen, depth + 1));
  }
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return "[redacted:cycle]";
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (/[\u0000-\u001f\u007f]/u.test(key)) {
        result["[redacted-control-key]"] = REDACTED_MARKER;
      } else {
        result[key] = isSecretKeyName(key) ? REDACTED_MARKER : redactSecretValues(val, seen, depth + 1);
      }
    }
    return result;
  }
  return value;
}

/** Turns a subject into a stable opaque filename under the repository root. */
function subjectId(subject: string): string {
  return createHash("sha256").update(subject, "utf8").digest("hex").slice(0, 32);
}

function validatePayload(value: unknown, depth = 0, counts = { entries: 0 }, seen = new WeakSet<object>()): void {
  if (depth > MAX_PAYLOAD_DEPTH) throw new Error(`A history payload exceeds the maximum depth of ${MAX_PAYLOAD_DEPTH}.`);
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') throw new Error('A history payload contains a value that cannot be serialized safely.');
  if (typeof value === 'string' && value.length > MAX_PAYLOAD_VALUE_LENGTH) throw new Error(`A history value exceeds ${MAX_PAYLOAD_VALUE_LENGTH} characters.`);
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    counts.entries += value.length;
    if (counts.entries > MAX_PAYLOAD_ENTRIES) throw new Error(`A history payload exceeds ${MAX_PAYLOAD_ENTRIES} entries.`);
    for (const child of value) validatePayload(child, depth + 1, counts, seen);
    return;
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      counts.entries += 1;
      if (counts.entries > MAX_PAYLOAD_ENTRIES) throw new Error(`A history payload exceeds ${MAX_PAYLOAD_ENTRIES} entries.`);
      if (key.length > MAX_PAYLOAD_KEY_LENGTH || /[\u0000-\u001f\u007f]/u.test(key)) throw new Error('A history payload key is too long or contains a control character.');
      validatePayload(child, depth + 1, counts, seen);
    }
  }
}

function filenameFor(identity: string): string {
  return `records/${subjectId(identity)}.json`;
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
  const eventId = /^History-Event-?Id: ([0-9a-f-]+)$/mi.exec(body)?.[1]?.trim();
  if (!action || !HISTORY_ACTION_SET.has(action) || !subject) {
    throw new Error(`Commit ${id} does not look like a LocalHistory entry.`);
  }
  return { id, timestamp, action: action as HistoryAction, subject, message: body, eventId };
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
    if (!/^[0-9a-f-]{16,128}$/iu.test(entry.eventId)) throw new Error('A history mutation needs a stable event id for retry idempotency.');
    const subject = requireSubject(entry.subject);
    validatePayload(entry.payload);
    const redactedPayload = redactSecretValues(entry.payload);
    const identity = entry.identity.trim();
    if (!identity) throw new Error('A history mutation needs a stable target/resource/kind/object identity.');
    const identityParts = identity.split('|');
    if (identityParts.length !== 4 || identityParts.some((part) => part.length === 0 || part.length > 128 || /[\u0000-\u001f\u007f]/u.test(part))) throw new Error("A history identity must contain four parts of 1 to 128 characters with no control characters.");
    const existing = (await this.#logAll()).find((commit) => commit.eventId === entry.eventId);
    if (existing) return existing;
    const relativePath = filenameFor(identity);
    const absolutePath = join(this.#repositoryPath, relativePath);
    await mkdir(join(this.#repositoryPath, 'records'), { recursive: true });
    const serialized = `${JSON.stringify({ schemaVersion: 1, identity, eventId: entry.eventId, omitted: ['original payload snapshot', 'credential-shaped payload values'], payload: redactedPayload }, null, 2)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) throw new Error(`A history payload exceeds the ${MAX_PAYLOAD_BYTES}-byte limit after UTF-8 serialization.`);
    if (entry.action === "deleted") {
      await unlink(absolutePath).catch(() => undefined);
    } else {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, serialized, "utf8");
    }
    /* Stage the entire records tree so a delete is a real tree deletion and every
     * commit carries the complete selected snapshot, not only the changed file. */
    await this.#run(["add", "-A", "--", "records"]);
    return await this.#commit(entry.action, subject, { SubjectId: subjectId(identity), EventId: entry.eventId }, { allowEmpty: true });
  }

  private async readRetryQueue(): Promise<LocalHistoryEntry[]> {
    try {
      const raw = await readFile(join(this.#repositoryPath, '..', 'history-retry.json'), 'utf8');
      if (Buffer.byteLength(raw, 'utf8') > MAX_RETRY_BYTES) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || (parsed as { schemaVersion?: unknown }).schemaVersion !== 1) return [];
      const entries = (parsed as { entries?: unknown }).entries;
      if (!Array.isArray(entries)) return [];
      return entries.slice(0, MAX_RETRY_ENTRIES).filter((entry): entry is LocalHistoryEntry => {
        if (!entry || typeof entry !== 'object' || typeof (entry as LocalHistoryEntry).identity !== 'string' || typeof (entry as LocalHistoryEntry).eventId !== 'string' || typeof (entry as LocalHistoryEntry).subject !== 'string' || typeof (entry as LocalHistoryEntry).action !== 'string' || !HISTORY_ACTION_SET.has((entry as LocalHistoryEntry).action)) return false;
        if (!/^[0-9a-f-]{16,128}$/iu.test((entry as LocalHistoryEntry).eventId)) return false;
        try { validatePayload((entry as LocalHistoryEntry).payload); return true; } catch { return false; }
      });
    } catch { return []; }
  }

  private async writeRetryQueue(entries: readonly LocalHistoryEntry[]): Promise<void> {
    const bounded = entries.slice(0, MAX_RETRY_ENTRIES).map((entry) => ({ ...entry, payload: redactSecretValues(entry.payload) }));
    const raw = `${JSON.stringify({ schemaVersion: 1, entries: bounded })}\n`;
    if (Buffer.byteLength(raw, 'utf8') > MAX_RETRY_BYTES) throw new Error('The durable history retry queue exceeded its byte limit.');
    const path = join(this.#repositoryPath, '..', 'history-retry.json');
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, raw, 'utf8');
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try { await rename(temporary, path); lastError = undefined; break; }
      catch (error) {
        lastError = error;
        if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    if (lastError) {
      await unlink(temporary).catch(() => undefined);
      const detail = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`The durable history retry queue could not be replaced after 5 attempts; temporary file was removed. ${detail}`);
    }
  }

  async enqueueRetry(entry: LocalHistoryEntry): Promise<void> {
    const safe = { ...entry, payload: redactSecretValues(entry.payload) };
    const queue = await this.readRetryQueue();
    if (!queue.some((queued) => queued.eventId === safe.eventId)) queue.push(safe);
    await mkdir(dirname(join(this.#repositoryPath, '..', 'history-retry.json')), { recursive: true });
    await this.writeRetryQueue(queue);
  }

  async retryQueueCount(): Promise<number> { return (await this.readRetryQueue()).length; }

  async retryQueued(): Promise<{ attempted: number; recorded: number; remaining: number }> {
    const queue = await this.readRetryQueue();
    const remaining: LocalHistoryEntry[] = [];
    let recorded = 0;
    for (const entry of queue) {
      try { await this.record(entry); recorded += 1; } catch { remaining.push(entry); }
    }
    await this.writeRetryQueue(remaining);
    return { attempted: queue.length, recorded, remaining: remaining.length };
  }

  /** Compatibility list for callers that need the complete bounded result. */
  async list(options?: LocalHistoryListOptions): Promise<ReadonlyArray<HistoryCommit>> {
    return (await this.listPage(options)).entries;
  }

  /** Newest first. Filters compose and cursor pagination is stable by commit id. */
  async listPage(options?: LocalHistoryListOptions): Promise<LocalHistoryPage> {
    if (options?.action !== undefined) assertKnownAction(options.action);
    const interval = normalizeLocalDateInterval(options?.since ?? '', options?.until ?? '');

    let commits = await this.#logAll();
    if (options?.action !== undefined) {
      commits = commits.filter((commit) => commit.action === options.action);
    }
    if (interval.fromMs !== undefined) {
      commits = commits.filter((commit) => new Date(commit.timestamp).getTime() >= interval.fromMs!);
    }
    if (interval.toMs !== undefined) {
      commits = commits.filter((commit) => new Date(commit.timestamp).getTime() <= interval.toMs!);
    }
    if (options?.query) {
      const query = options.query.slice(0, 256);
      let matcher: (value: string) => boolean;
      try {
        const pattern = new RegExp(query, "iu");
        matcher = (value) => pattern.test(value);
      } catch {
        matcher = (value) => value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
      }
      commits = commits.filter((commit) => matcher(`${commit.subject} ${commit.action} ${commit.message}`));
    }
    const total = commits.length;
    const cursor = options?.cursor ? commits.findIndex((commit) => commit.id === options.cursor) + 1 : 0;
    const start = cursor > 0 ? cursor : 0;
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
    const entries = commits.slice(start, start + limit);
    const last = entries.at(-1);
    const counts = await this.actionCounts();
    return { entries, total, counts, ...(last && start + entries.length < total ? { nextCursor: last.id } : {}) };
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

  private async treeFiles(commitId: string): Promise<string[]> {
    const output = await this.#run(["ls-tree", "-r", "--name-only", commitId, "--", "records"]);
    return output.split(/\r?\n/u).map((line) => line.trim()).filter((line) => /^records\/[0-9a-f]{32}\.json$/u.test(line));
  }

  async inspect(commitId: string): Promise<HistoryTreeInspection> {
    const commit = (await this.#logAll()).find((entry) => entry.id === commitId);
    if (!commit) throw new Error(`Commit ${commitId} is not in the local history.`);
    const files = await this.treeFiles(commitId);
    const diff = await this.#run(["show", "--format=", "--no-ext-diff", "--unified=80", commitId, "--", "records"]);
    return { commit, files, diff: diff.slice(0, 512 * 1024) };
  }

  async restorePlan(commitId: string): Promise<{ commitId: string; targetFiles: ReadonlyArray<string>; currentFiles: ReadonlyArray<string>; removals: ReadonlyArray<string>; checkoutOrder: ReadonlyArray<string> }> {
    if (!/^[0-9a-f]{40}$/iu.test(commitId)) throw new Error('History restore requires a full commit id.');
    const commit = (await this.#logAll()).find((entry) => entry.id === commitId);
    if (!commit) throw new Error(`Commit ${commitId} is not in the local history.`);
    const targetFiles = await this.treeFiles(commitId);
    const currentFiles = (await this.#run(['ls-files', '--', 'records'])).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    return { commitId, targetFiles, currentFiles, removals: currentFiles.filter((file) => !targetFiles.includes(file)), checkoutOrder: targetFiles };
  }

  async compare(first: string, second: string): Promise<{ first: string; second: string; files: ReadonlyArray<string>; diff: string }> {
    if (!/^[0-9a-f]{40}$/iu.test(first) || !/^[0-9a-f]{40}$/iu.test(second)) {
      throw new Error("History comparison requires two full commit ids.");
    }
    const diff = await this.#run(["diff", "--no-ext-diff", "--unified=80", first, second, "--", "records"]);
    const files = (await this.#run(["diff", "--name-only", first, second, "--", "records"]))
      .split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    return { first, second, files, diff: diff.slice(0, 512 * 1024) };
  }

  /**
   * Restores the state recorded by `commitId` by writing its files back into the
   * working tree and recording that as a brand-new commit. This never touches the
   * commit being restored from, so the restore itself can always be undone in turn.
   */
  async restore(commitId: string): Promise<HistoryCommit> {
    if (!/^[0-9a-f]{40}$/iu.test(commitId)) {
      throw new Error(`"${commitId}" is not a 40-character commit id, so nothing was restored.`);
    }

    // Resolve only from the bounded, parsed local-history listing. A syntactically
    // valid Git object may be reachable in this repository without being a history
    // record, and must never be allowed to supply a checkout tree.
    const original = (await this.#logAll()).find((entry) => entry.id === commitId);
    if (!original) throw new Error(`Commit ${commitId} is not in the local history, so nothing was restored.`);

    const targetFiles = await this.treeFiles(commitId);
    const currentFiles = await this.#run(["ls-files", "--", "records"]);
    for (const current of currentFiles.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      if (!targetFiles.includes(current)) await unlink(join(this.#repositoryPath, current)).catch(() => undefined);
    }
    if (targetFiles.length > 0) await this.#run(["checkout", commitId, "--", "records"]);
    await this.#run(["add", "-A", "--", "records"]);
    return await this.#commit("restored", original.subject, { RestoredFrom: commitId }, { allowEmpty: true });
  }

  /**
   * Reports how many commits a retention policy of `keep` would retain. This never
   * deletes a commit: doing that would require the exact history-rewriting operation
   * (`reset`, a rebase) this class refuses to perform, so pruning is reporting rather
   * than destruction. A caller that genuinely wants old snapshots gone needs a
   * separate, explicitly authorized operation outside this append-only store.
   */
  async prune(keep: number): Promise<{ kept: number; removed: number; policy: string; available: boolean; reason: string }> {
    if (!Number.isInteger(keep) || keep < 1) {
      throw new Error(`Retention count must be at least 1, got ${keep}.`);
    }
    const commits = await this.#logAll();
    return { kept: Math.min(keep, commits.length), removed: 0, policy: "immutable-append-only", available: false, reason: "History rotation is unavailable because deleting old commits would rewrite the append-only store." };
  }
}
