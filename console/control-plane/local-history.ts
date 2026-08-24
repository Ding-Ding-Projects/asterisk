/**
 * Compatibility facade for the console's append-only local history.
 *
 * This facade deliberately has no plaintext fallback. The currently mounted dispatcher does not
 * allowlist `git` and does not provide an OS-vault-backed snapshot protector, so write and restore
 * requests return explicit unavailable results until those two integration seams are connected.
 */
import { randomUUID } from "node:crypto";
import type { ProcessExecutor } from "./executor.js";
import {
  AppendOnlyHistoryStore,
  type HistoryListOptions,
} from "./history-store.js";
import {
  HISTORY_ACTIONS,
  type HistoryAction,
  type HistoryResult,
  type HistoryRevision,
  type HistorySnapshotProtector,
  type RedactedHistoryMetadata,
  type RestoredHistoryRevision,
} from "../shared/history.js";

export { HISTORY_ACTIONS } from "../shared/history.js";
export type { HistoryAction, HistoryResult, HistoryRevision } from "../shared/history.js";

export interface LocalHistoryEntry {
  action: HistoryAction;
  /** Stable identity that survives delete and restore. A display label is not sufficient. */
  stableRecordId: string;
  subject: string;
  metadata?: RedactedHistoryMetadata;
  /** Sent directly to the protector and never serialized before encryption succeeds. */
  snapshot: unknown;
}

export interface LocalHistoryOptions {
  executor: ProcessExecutor;
  repositoryPath: string;
  protector?: HistorySnapshotProtector;
  createEntryId?: () => string;
}

export class LocalHistory {
  readonly #store: AppendOnlyHistoryStore;

  constructor(options: LocalHistoryOptions) {
    this.#store = new AppendOnlyHistoryStore({
      executor: options.executor,
      repositoryPath: options.repositoryPath,
      protector: options.protector,
      createEntryId: options.createEntryId ?? (() => randomUUID().replaceAll("-", "")),
    });
  }

  async initialize(): Promise<HistoryResult<{ created: boolean }>> {
    return await this.#store.initialize();
  }

  async record(entry: LocalHistoryEntry): Promise<HistoryResult<HistoryRevision>> {
    return await this.#store.append(entry);
  }

  async list(options?: HistoryListOptions): Promise<HistoryResult<ReadonlyArray<HistoryRevision>>> {
    return await this.#store.list(options);
  }

  async actionCounts(): Promise<HistoryResult<Readonly<Record<HistoryAction, number>>>> {
    return await this.#store.actionCounts();
  }

  async restore(commitId: string): Promise<HistoryResult<RestoredHistoryRevision>> {
    return await this.#store.restore(commitId);
  }

  /**
   * Append-only history never rewrites old commits. This returns a retention preview only.
   * A separately authorized archival operation may later consume that preview.
   */
  async prune(keep: number): Promise<HistoryResult<{ kept: number; total: number }>> {
    return await this.#store.retentionPreview(keep);
  }
}

/** Kept as a named export for callers that build filter controls from the actual action list. */
export const LOCAL_HISTORY_ACTIONS: ReadonlyArray<HistoryAction> = HISTORY_ACTIONS;
