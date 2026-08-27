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

export interface EncryptedHistorySnapshot {
  version: 1;
  algorithm: "AES-256-GCM";
  /** Stable OS-vault reference to the encryption key, never the key itself. */
  keyReference: string;
  stableRecordId: string;
  ivBase64: string;
  ciphertextBase64: string;
  authenticationTagBase64: string;
  aadVersion: 1;
}

export interface HistorySnapshotProtector {
  readonly available: boolean;
  seal(stableRecordId: string, snapshot: unknown): Promise<EncryptedHistorySnapshot>;
  open(envelope: EncryptedHistorySnapshot): Promise<unknown>;
}

export interface RedactedHistoryMetadata {
  labels?: ReadonlyArray<string>;
  changedFields?: ReadonlyArray<string>;
  source?: string;
}

export interface HistoryEntryDraft {
  action: HistoryAction;
  stableRecordId: string;
  subject: string;
  metadata?: RedactedHistoryMetadata;
  /** Passed directly to the protector. It must never be written before encryption succeeds. */
  snapshot: unknown;
}

export interface HistoryRevision {
  commitId: string;
  entryId: string;
  entryPath: string;
  timestamp: string;
  action: HistoryAction;
  stableRecordId: string;
  subject: string;
  metadata?: RedactedHistoryMetadata;
}

export interface RestoredHistoryRevision {
  revision: HistoryRevision;
  /** Returned in memory for the live store to apply. It is never written in plaintext. */
  snapshot: unknown;
  restoredFromCommitId: string;
}

export type HistoryFailureCode =
  | "git-unavailable"
  | "history-unavailable"
  | "invalid-request"
  | "snapshot-protector-unavailable"
  | "snapshot-protection-failed"
  | "snapshot-recovery-failed"
  | "revision-not-found"
  | "commit-failed";

export type HistoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: HistoryFailureCode; message: string; recoverable: boolean };

export function historyFailure(
  code: HistoryFailureCode,
  message: string,
  recoverable = true,
): HistoryResult<never> {
  return { ok: false, code, message, recoverable };
}

export function isHistoryAction(value: string): value is HistoryAction {
  return (HISTORY_ACTIONS as readonly string[]).includes(value);
}
