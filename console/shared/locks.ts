export const TOY_LOCK_SCHEMA_VERSION = 1 as const;

export type ToyLockMethod = "password" | "totp";

export type ToyLockUnlockDuration =
  | { kind: "surface" }
  | { kind: "minutes"; minutes: number }
  | { kind: "until-application-closes" };

export interface ToyLockCredentialReference {
  /** Stable account name in the operating-system credential vault. */
  vaultAccount: string;
  method: ToyLockMethod;
}

export interface ToyLockRecord {
  schemaVersion: typeof TOY_LOCK_SCHEMA_VERSION;
  id: string;
  /** Stable identity of exactly one rendered element. */
  targetId: string;
  credential: ToyLockCredentialReference;
  unlockDuration: ToyLockUnlockDuration;
  createdAt: string;
  updatedAt: string;
  unlockedUntil?: string;
  unlockedForSurfaceId?: string;
  unlockedUntilApplicationCloses?: boolean;
}

export interface ToyLockRecoveryMetadata {
  /** Runtime-resolved path shown to the user. It is never part of a lock export. */
  applicationDataPath: string;
  supportTicketRoute: string;
  deletesAutomatically: false;
  disclosure: string;
}
export type ToyLockFailureCode =
  | 'duplicate-lock'
  | 'invalid-record'
  | 'lock-not-found'
  | 'persistence-unavailable'
  | 'vault-unavailable'
  | 'vault-reference-missing'
  | 'verification-failed';
export type ToyLockReconciliationReceipt =
  | { status: 'reconciled'; affectedIds: ReadonlyArray<string> }
  | { status: 'pending-vault-unavailable'; affectedIds: ReadonlyArray<string>; warning: string }
  | { status: 'pending-removal-failed'; affectedIds: ReadonlyArray<string>; warning: string }
  | { status: 'unresolved-legacy'; affectedIds: ReadonlyArray<string>; warning: string };
export type ToyLockUnlockReceipt<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'verification-failed'; message: string; waitCreated: boolean }
  | { ok: false; code: Exclude<ToyLockFailureCode, 'verification-failed'>; message: string; waitCreated: false; reconciliation?: ToyLockReconciliationReceipt };
export type ToyLockCreateReceipt =
  | { ok: true; value: ToyLockRecord }
  | { ok: false; code: Exclude<ToyLockFailureCode, 'verification-failed'>; message: string; recoverable: boolean; reconciliation?: ToyLockReconciliationReceipt };
export type ToyLockRelockReceipt =
  | { ok: true; value: ToyLockRecord }
  | { ok: false; code: Exclude<ToyLockFailureCode, 'verification-failed'>; message: string; recoverable: boolean; reconciliation?: ToyLockReconciliationReceipt };
export type ToyLockRemovalReceipt =
  | { status: 'removed'; value: { removed: true } }
  | { status: 'blocked'; message: string; recoverable: true; reconciliation: ToyLockReconciliationReceipt }
  | { status: 'pending'; message: string; recoverable: true }
  | { status: 'rolledBack'; message: string; recoverable: true }
  | { status: 'recoverable'; message: string; recoverable: true };

export interface CreateToyLockInput {
  id: string;
  targetId: string;
  credential: ToyLockCredentialReference;
  unlockDuration: ToyLockUnlockDuration;
  at: Date;
}

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const VAULT_ACCOUNT = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;

export function assertStableLockId(value: string, field: "id" | "targetId"): string {
  if (!STABLE_ID.test(value)) {
    throw new Error(`${field} must be a stable identifier between 1 and 128 characters.`);
  }
  return value;
}

export function assertToyLockCredentialReference(
  value: ToyLockCredentialReference,
): ToyLockCredentialReference {
  if (!VAULT_ACCOUNT.test(value.vaultAccount)) {
    throw new Error("The vault account reference is malformed.");
  }
  if (value.method !== "password" && value.method !== "totp") {
    throw new Error("The lock method is not supported.");
  }
  return { vaultAccount: value.vaultAccount, method: value.method };
}

export function assertToyLockUnlockDuration(
  value: ToyLockUnlockDuration,
): ToyLockUnlockDuration {
  if (value.kind === "minutes") {
    if (!Number.isSafeInteger(value.minutes) || value.minutes < 1 || value.minutes > 24 * 60) {
      throw new Error("A timed unlock must be between 1 minute and 24 hours.");
    }
    return { kind: "minutes", minutes: value.minutes };
  }
  if (value.kind === "surface" || value.kind === "until-application-closes") return value;
  throw new Error("The unlock duration is not supported.");
}

export function createToyLockRecord(input: CreateToyLockInput): ToyLockRecord {
  const timestamp = input.at.toISOString();
  return {
    schemaVersion: TOY_LOCK_SCHEMA_VERSION,
    id: assertStableLockId(input.id, "id"),
    targetId: assertStableLockId(input.targetId, "targetId"),
    credential: assertToyLockCredentialReference(input.credential),
    unlockDuration: assertToyLockUnlockDuration(input.unlockDuration),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isToyLockOpen(
  record: ToyLockRecord,
  context: { at: Date; surfaceId?: string; applicationSessionOpen: boolean },
): boolean {
  if (record.unlockedUntilApplicationCloses) return context.applicationSessionOpen;
  if (record.unlockedForSurfaceId !== undefined) {
    return record.unlockedForSurfaceId === context.surfaceId;
  }
  if (record.unlockedUntil !== undefined) {
    return Date.parse(record.unlockedUntil) > context.at.getTime();
  }
  return false;
}

export function grantToyLockUnlock(
  record: ToyLockRecord,
  context: { at: Date; surfaceId?: string },
): ToyLockRecord {
  const updated: ToyLockRecord = {
    ...record,
    updatedAt: context.at.toISOString(),
    unlockedUntil: undefined,
    unlockedForSurfaceId: undefined,
    unlockedUntilApplicationCloses: undefined,
  };

  if (record.unlockDuration.kind === "minutes") {
    updated.unlockedUntil = new Date(
      context.at.getTime() + record.unlockDuration.minutes * 60_000,
    ).toISOString();
  } else if (record.unlockDuration.kind === "surface") {
    if (context.surfaceId === undefined) {
      throw new Error("A surface-scoped unlock requires the active surface identity.");
    }
    updated.unlockedForSurfaceId = context.surfaceId;
  } else {
    updated.unlockedUntilApplicationCloses = true;
  }
  return updated;
}

export function relockToyLock(record: ToyLockRecord, at: Date): ToyLockRecord {
  return {
    ...record,
    updatedAt: at.toISOString(),
    unlockedUntil: undefined,
    unlockedForSurfaceId: undefined,
    unlockedUntilApplicationCloses: undefined,
  };
}

export function createToyLockRecoveryMetadata(
  applicationDataPath: string,
  supportTicketRoute: string,
): ToyLockRecoveryMetadata {
  if (applicationDataPath.trim().length === 0 || supportTicketRoute.trim().length === 0) {
    throw new Error("Recovery metadata requires a runtime path and a support route.");
  }
  return {
    applicationDataPath,
    supportTicketRoute,
    deletesAutomatically: false,
    disclosure:
      "This is a personal speed bump, not encryption or an access-control boundary. " +
      "The recovery flow opens the application-data folder and never deletes it for you.",
  };
}
