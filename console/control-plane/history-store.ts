import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProcessExecutor } from "./executor.js";
import {
  HISTORY_ACTIONS,
  historyFailure,
  isHistoryAction,
  type EncryptedHistorySnapshot,
  type HistoryAction,
  type HistoryEntryDraft,
  type HistoryResult,
  type HistoryRevision,
  type HistorySnapshotProtector,
  type RedactedHistoryMetadata,
  type RestoredHistoryRevision,
} from "../shared/history.js";

export interface AppendOnlyHistoryStoreOptions {
  executor: ProcessExecutor;
  repositoryPath: string;
  protector?: HistorySnapshotProtector;
  createEntryId: () => string;
}

export interface HistoryListOptions {
  action?: string;
  since?: string;
  until?: string;
  limit?: number;
}

interface StoredHistoryEntry {
  version: 1;
  entryId: string;
  action: HistoryAction;
  stableRecordId: string;
  subject: string;
  metadata: RedactedHistoryMetadata;
  encryptedSnapshot: EncryptedHistorySnapshot;
  restoredFromCommitId?: string;
}

const RECORD_SEPARATOR = "\x1e";
const GROUP_SEPARATOR = "\x1d";
const ENTRY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/u;
const STABLE_RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const VAULT_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const COMMIT_ID = /^[0-9a-f]{40,64}$/iu;
const SAFE_LABEL = /^[^\u0000-\u001f\u007f]{1,128}$/u;
const SENSITIVE_METADATA_KEY = /(authorization|credential|password|passwd|secret|token|private.?key|pin)/iu;
const METADATA_KEYS = new Set(["labels", "changedFields", "source"]);
const SENSITIVE_METADATA_VALUE = /(bearer\s+\S+|password\s*[=:]|passwd\s*[=:]|secret\s*[=:]|token\s*[=:])/iu;

const COMMIT_VERBS: Readonly<Record<HistoryAction, string>> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  restored: "Restored",
  undone: "Undid",
  imported: "Imported",
  "settings-changed": "Changed settings for",
};

function assertDraft(draft: HistoryEntryDraft): void {
  if (!isHistoryAction(draft.action)) throw new Error("The history action is not supported.");
  if (!STABLE_RECORD_ID.test(draft.stableRecordId)) {
    throw new Error("The history record identity is malformed.");
  }
  if (!SAFE_LABEL.test(draft.subject.trim()) || draft.subject.length > 256) {
    throw new Error("The history subject must be a bounded, printable label.");
  }
  if (draft.snapshot === undefined) throw new Error("A history snapshot is required.");
  assertMetadata(draft.metadata ?? {});
}

function assertMetadata(metadata: RedactedHistoryMetadata): void {
  for (const key of Object.keys(metadata)) {
    if (!METADATA_KEYS.has(key)) throw new Error("Unexpected history metadata field.");
    if (SENSITIVE_METADATA_KEY.test(key)) {
      throw new Error("Sensitive fields are not permitted in redacted history metadata.");
    }
  }
  for (const value of [...(metadata.labels ?? []), ...(metadata.changedFields ?? [])]) {
    if (!SAFE_LABEL.test(value) || SENSITIVE_METADATA_VALUE.test(value)) {
      throw new Error("History metadata contains an invalid or sensitive-looking label.");
    }
  }
  if ((metadata.labels?.length ?? 0) > 100 || (metadata.changedFields?.length ?? 0) > 100) {
    throw new Error("History metadata exceeds its item bound.");
  }
  if (
    metadata.source !== undefined &&
    (!SAFE_LABEL.test(metadata.source) || SENSITIVE_METADATA_VALUE.test(metadata.source))
  ) {
    throw new Error("The history metadata source is malformed.");
  }
}

function validateEnvelope(value: unknown, stableRecordId: string): EncryptedHistorySnapshot {
  if (value === null || typeof value !== "object") throw new Error("Encrypted snapshot is missing.");
  const envelope = value as Partial<EncryptedHistorySnapshot>;
  const base64 = /^[A-Za-z0-9+/]+={0,2}$/u;
  if (
    envelope.version !== 1 ||
    envelope.algorithm !== "AES-256-GCM" ||
    envelope.aadVersion !== 1 ||
    envelope.stableRecordId !== stableRecordId ||
    typeof envelope.keyReference !== "string" ||
    !VAULT_REFERENCE.test(envelope.keyReference) ||
    typeof envelope.ivBase64 !== "string" ||
    typeof envelope.ciphertextBase64 !== "string" ||
    typeof envelope.authenticationTagBase64 !== "string" ||
    !base64.test(envelope.ivBase64) ||
    !base64.test(envelope.ciphertextBase64) ||
    !base64.test(envelope.authenticationTagBase64) ||
    envelope.ivBase64.length > 128 ||
    envelope.authenticationTagBase64.length > 128 ||
    envelope.ciphertextBase64.length > 16 * 1024 * 1024
  ) {
    throw new Error("The encrypted snapshot envelope is malformed or unbounded.");
  }
  return envelope as EncryptedHistorySnapshot;
}

function commitMessage(entry: StoredHistoryEntry): string {
  const lines = [
    `${COMMIT_VERBS[entry.action]} ${entry.subject}`,
    "",
    `History-Action: ${entry.action}`,
    `History-Subject: ${entry.subject}`,
    `History-Record: ${entry.stableRecordId}`,
    `History-Entry: ${entry.entryId}`,
  ];
  if (entry.restoredFromCommitId) lines.push(`History-Restored-From: ${entry.restoredFromCommitId}`);
  return `${lines.join("\n")}\n`;
}

export class AppendOnlyHistoryStore {
  readonly #executor: ProcessExecutor;
  readonly #repositoryPath: string;
  readonly #protector?: HistorySnapshotProtector;
  readonly #createEntryId: () => string;
  #writeChain: Promise<void> = Promise.resolve();

  constructor(options: AppendOnlyHistoryStoreOptions) {
    this.#executor = options.executor;
    this.#repositoryPath = options.repositoryPath;
    this.#protector = options.protector;
    this.#createEntryId = options.createEntryId;
  }

  async initialize(): Promise<HistoryResult<{ created: boolean }>> {
    try {
      await mkdir(this.#repositoryPath, { recursive: true });
      const probe = await this.#git(["rev-parse", "--git-dir"]);
      let created = false;
      if (probe.status !== "succeeded") {
        const initialized = await this.#git(["init", "--quiet"]);
        if (initialized.status !== "succeeded") return this.#gitFailure(initialized.status);
        created = true;
      }
      const name = await this.#git(["config", "user.name", "Ding PBX Local History"]);
      if (name.status !== "succeeded") return this.#gitFailure(name.status);
      const email = await this.#git(["config", "user.email", "local-history@localhost.invalid"]);
      if (email.status !== "succeeded") return this.#gitFailure(email.status);
      return { ok: true, value: { created } };
    } catch {
      return historyFailure(
        "git-unavailable",
        "Local history cannot run because its isolated Git executor is unavailable.",
      );
    }
  }

  async append(draft: HistoryEntryDraft): Promise<HistoryResult<HistoryRevision>> {
    return await this.#serial(async () => {
      try {
        assertDraft(draft);
      } catch {
        return historyFailure("invalid-request", "The history entry is malformed.", false);
      }
      if (!this.#protector?.available) {
        return historyFailure(
          "snapshot-protector-unavailable",
          "The OS-vault-backed snapshot protector is unavailable. The live change can continue, but no history entry was recorded.",
        );
      }

      let encryptedSnapshot: EncryptedHistorySnapshot;
      try {
        encryptedSnapshot = validateEnvelope(
          await this.#protector.seal(draft.stableRecordId, draft.snapshot),
          draft.stableRecordId,
        );
      } catch {
        return historyFailure(
          "snapshot-protection-failed",
          "The snapshot could not be encrypted, so no plaintext history entry was written.",
        );
      }

      return await this.#appendEncrypted({
        action: draft.action,
        stableRecordId: draft.stableRecordId,
        subject: draft.subject.trim(),
        metadata: draft.metadata ?? {},
        encryptedSnapshot,
      });
    });
  }

  async list(options: HistoryListOptions = {}): Promise<HistoryResult<ReadonlyArray<HistoryRevision>>> {
    if (options.action !== undefined && !isHistoryAction(options.action)) {
      return historyFailure("invalid-request", "The history action filter is not supported.", false);
    }
    if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 10_000)) {
      return historyFailure("invalid-request", "The history result limit must be between 1 and 10,000.", false);
    }
    const since = parseOptionalDate(options.since);
    const until = parseOptionalDate(options.until);
    if (since === null || until === null) {
      return historyFailure("invalid-request", "A history date filter is invalid.", false);
    }

    try {
      const result = await this.#git([
        "log",
        `--format=%H${RECORD_SEPARATOR}%cI${RECORD_SEPARATOR}%B${GROUP_SEPARATOR}`,
      ]);
      if (result.status !== "succeeded") {
        if (/does not have any commits yet|unknown revision|bad default revision/iu.test(result.stderr)) {
          return { ok: true, value: [] };
        }
        return this.#gitFailure(result.status);
      }
      let revisions = result.stdout
        .split(GROUP_SEPARATOR)
        .map((record) => record.trim())
        .filter(Boolean)
        .map(parseLogRecord);
      if (options.action) revisions = revisions.filter((revision) => revision.action === options.action);
      if (since) revisions = revisions.filter((revision) => Date.parse(revision.timestamp) >= since.getTime());
      if (until) revisions = revisions.filter((revision) => Date.parse(revision.timestamp) <= until.getTime());
      if (options.limit) revisions = revisions.slice(0, options.limit);
      return { ok: true, value: revisions };
    } catch {
      return historyFailure("history-unavailable", "Local history could not be read.");
    }
  }

  async restore(commitId: string): Promise<HistoryResult<RestoredHistoryRevision>> {
    return await this.#serial(async () => {
      if (!COMMIT_ID.test(commitId)) {
        return historyFailure("invalid-request", "The requested revision identity is malformed.", false);
      }
      if (!this.#protector?.available) {
        return historyFailure(
          "snapshot-protector-unavailable",
          "The OS-vault-backed snapshot protector is unavailable, so this revision cannot be restored.",
        );
      }
      let originalResult: HistoryResult<StoredHistoryEntry>;
      try {
        originalResult = await this.#readStoredEntry(commitId);
      } catch {
        return historyFailure(
          "git-unavailable",
          "The isolated local-history Git executor is unavailable, so this revision was not restored.",
        );
      }
      if (!originalResult.ok) return originalResult;

      let snapshot: unknown;
      let resealed: EncryptedHistorySnapshot;
      try {
        snapshot = await this.#protector.open(originalResult.value.encryptedSnapshot);
        resealed = validateEnvelope(
          await this.#protector.seal(originalResult.value.stableRecordId, snapshot),
          originalResult.value.stableRecordId,
        );
      } catch {
        return historyFailure(
          "snapshot-recovery-failed",
          "The encrypted snapshot could not be opened or resealed. The live record was not changed.",
        );
      }

      const appended = await this.#appendEncrypted({
        action: "restored",
        stableRecordId: originalResult.value.stableRecordId,
        subject: originalResult.value.subject,
        metadata: originalResult.value.metadata,
        encryptedSnapshot: resealed,
        restoredFromCommitId: commitId,
      });
      if (!appended.ok) return appended;
      return {
        ok: true,
        value: { revision: appended.value, snapshot, restoredFromCommitId: commitId },
      };
    });
  }

  async actionCounts(): Promise<HistoryResult<Readonly<Record<HistoryAction, number>>>> {
    const listed = await this.list();
    if (!listed.ok) return listed;
    const counts = Object.fromEntries(HISTORY_ACTIONS.map((action) => [action, 0])) as Record<HistoryAction, number>;
    for (const revision of listed.value) counts[revision.action] += 1;
    return { ok: true, value: counts };
  }

  async retentionPreview(keep: number): Promise<HistoryResult<{ kept: number; total: number }>> {
    if (!Number.isSafeInteger(keep) || keep < 1) {
      return historyFailure("invalid-request", "The retention count must be at least one.", false);
    }
    const listed = await this.list();
    if (!listed.ok) return listed;
    return { ok: true, value: { kept: Math.min(keep, listed.value.length), total: listed.value.length } };
  }

  async #appendEncrypted(
    input: Omit<StoredHistoryEntry, "version" | "entryId">,
  ): Promise<HistoryResult<HistoryRevision>> {
    const entryId = this.#createEntryId();
    if (!ENTRY_ID.test(entryId)) {
      return historyFailure("invalid-request", "The history entry identity source returned an invalid value.");
    }
    const entry: StoredHistoryEntry = { version: 1, entryId, ...input };
    const entryPath = `entries/${entryId}.json`;
    const absolutePath = join(this.#repositoryPath, entryPath);
    try {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `${JSON.stringify(entry, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      const added = await this.#git(["add", "--", entryPath]);
      if (added.status !== "succeeded") {
        await this.#rollbackPendingEntry(entryPath, absolutePath);
        return this.#gitFailure(added.status);
      }
      const committed = await this.#git(["commit", "--quiet", "--file", "-"], commitMessage(entry));
      if (committed.status !== "succeeded") {
        await this.#rollbackPendingEntry(entryPath, absolutePath);
        return historyFailure("commit-failed", "The encrypted history entry could not be committed.");
      }
      const commitIdResult = await this.#git(["rev-parse", "HEAD"]);
      const timestampResult = await this.#git(["show", "-s", "--format=%cI", "HEAD"]);
      if (commitIdResult.status !== "succeeded" || timestampResult.status !== "succeeded") {
        return historyFailure("history-unavailable", "The history commit landed but its identity could not be read.");
      }
      return {
        ok: true,
        value: {
          commitId: commitIdResult.stdout.trim(),
          entryId,
          entryPath,
          timestamp: timestampResult.stdout.trim(),
          action: entry.action,
          stableRecordId: entry.stableRecordId,
          subject: entry.subject,
          metadata: entry.metadata,
        },
      };
    } catch {
      await this.#rollbackPendingEntry(entryPath, absolutePath);
      return historyFailure("history-unavailable", "The encrypted history entry could not be written.");
    }
  }

  async #readStoredEntry(commitId: string): Promise<HistoryResult<StoredHistoryEntry>> {
    const log = await this.#git(["log", "-1", "--format=%B", commitId]);
    if (log.status !== "succeeded") {
      return historyFailure("revision-not-found", "The requested history revision does not exist.", false);
    }
    const entryId = /^History-Entry: ([A-Za-z0-9_-]+)$/mu.exec(log.stdout)?.[1];
    if (!entryId || !ENTRY_ID.test(entryId)) {
      return historyFailure("revision-not-found", "The requested commit is not a managed history revision.", false);
    }
    const entryPath = `entries/${entryId}.json`;
    const shown = await this.#git(["show", `${commitId}:${entryPath}`]);
    if (shown.status !== "succeeded") {
      return historyFailure("revision-not-found", "The encrypted snapshot record is missing.", false);
    }
    try {
      if (Buffer.byteLength(shown.stdout, "utf8") > 24 * 1024 * 1024) throw new Error("Entry is too large.");
      const parsed = JSON.parse(shown.stdout) as StoredHistoryEntry;
      if (
        parsed.version !== 1 ||
        parsed.entryId !== entryId ||
        !isHistoryAction(parsed.action) ||
        !STABLE_RECORD_ID.test(parsed.stableRecordId) ||
        !SAFE_LABEL.test(parsed.subject) ||
        (parsed.restoredFromCommitId !== undefined && !COMMIT_ID.test(parsed.restoredFromCommitId))
      ) {
        throw new Error("Entry is malformed.");
      }
      assertMetadata(parsed.metadata);
      parsed.encryptedSnapshot = validateEnvelope(parsed.encryptedSnapshot, parsed.stableRecordId);
      return { ok: true, value: parsed };
    } catch {
      return historyFailure("revision-not-found", "The encrypted snapshot record is invalid.", false);
    }
  }

  async #rollbackPendingEntry(entryPath: string, absolutePath: string): Promise<void> {
    await this.#git(["rm", "--cached", "--ignore-unmatch", "--", entryPath]).catch(() => undefined);
    await unlink(absolutePath).catch(() => undefined);
  }

  async #git(args: ReadonlyArray<string>, input?: string) {
    return await this.#executor.execute({
      executable: "git",
      args,
      cwd: this.#repositoryPath,
      input,
      timeoutMs: 30_000,
      maxOutputBytes: 24 * 1024 * 1024,
    });
  }

  #gitFailure(status: string): HistoryResult<never> {
    return historyFailure(
      status === "failed" ? "git-unavailable" : "history-unavailable",
      "The isolated local-history Git operation did not complete. The live record was not changed by this store.",
    );
  }

  async #serial<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#writeChain;
    let release!: () => void;
    this.#writeChain = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function parseOptionalDate(value: string | undefined): Date | undefined | null {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLogRecord(record: string): HistoryRevision {
  const [commitId, timestamp, ...bodyParts] = record.split(RECORD_SEPARATOR);
  const body = bodyParts.join(RECORD_SEPARATOR);
  const action = /^History-Action: (.+)$/mu.exec(body)?.[1]?.trim();
  const subject = /^History-Subject: (.+)$/mu.exec(body)?.[1]?.trim();
  const stableRecordId = /^History-Record: (.+)$/mu.exec(body)?.[1]?.trim();
  const entryId = /^History-Entry: (.+)$/mu.exec(body)?.[1]?.trim();
  if (
    !commitId ||
    !COMMIT_ID.test(commitId) ||
    !timestamp ||
    !action ||
    !isHistoryAction(action) ||
    !subject ||
    !stableRecordId ||
    !STABLE_RECORD_ID.test(stableRecordId) ||
    !entryId ||
    !ENTRY_ID.test(entryId)
  ) {
    throw new Error("A Git commit is not a managed history revision.");
  }
  return {
    commitId,
    entryId,
    entryPath: `entries/${entryId}.json`,
    timestamp,
    action,
    stableRecordId,
    subject,
  };
}
