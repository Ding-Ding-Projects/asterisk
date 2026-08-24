import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import {
  assertStableLockId,
  assertToyLockCredentialReference,
  assertToyLockUnlockDuration,
  createToyLockRecord,
  grantToyLockUnlock,
  relockToyLock,
  type CreateToyLockInput,
  type ToyLockCredentialReference,
  type ToyLockFailureCode,
  type ToyLockRecord,
  type ToyLockRemovalReceipt,
  type ToyLockReconciliationReceipt,
  type ToyLockRecoveryMetadata,
} from "../shared/locks.js";

export type LockStoreFailureCode = ToyLockFailureCode;

export type LockStoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: LockStoreFailureCode; message: string; recoverable: boolean };

/**
 * The vault owns credential material and verification. The lock store receives only
 * short-lived bytes from the caller and never serializes, logs, or returns them.
 */
export interface ToyLockCredentialVault {
  readonly available: boolean;
  has(reference: ToyLockCredentialReference): Promise<boolean>;
  verify(reference: ToyLockCredentialReference, candidate: Uint8Array): Promise<boolean>;
  remove(reference: ToyLockCredentialReference): Promise<boolean>;
}

export interface LockRecordPersistence {
  load(): Promise<ReadonlyArray<ToyLockRecord>>;
  save(records: ReadonlyArray<ToyLockRecord>): Promise<void>;
  beginRemoval?(id: string, credential: ToyLockCredentialReference): Promise<void>;
  completeRemoval?(id: string): Promise<void>;
  rollbackRemoval?(id: string): Promise<void>;
  reconcileReceipt(vault: ToyLockCredentialVault): Promise<ToyLockReconciliationReceipt>;
}

interface LockStoreOptions {
  persistence: LockRecordPersistence;
  vault: ToyLockCredentialVault;
  recovery: ToyLockRecoveryMetadata;
  now?: () => Date;
}

interface StoredLockDocument {
  version: 1;
  records: ReadonlyArray<ToyLockRecord>;
  pendingRemovals?: ReadonlyArray<{ id: string; credential: ToyLockCredentialReference } | string>;
  tombstones?: ReadonlyArray<string>;
}

function persistentLockRecord(record: ToyLockRecord): ToyLockRecord {
  return {
    ...record,
    credential: { ...record.credential },
    unlockDuration: { ...record.unlockDuration },
    unlockedForSurfaceId: undefined,
    unlockedUntilApplicationCloses: undefined,
  };
}

const TRANSIENT_RENAME_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

function failure<T>(
  code: LockStoreFailureCode,
  message: string,
  recoverable = true,
): LockStoreResult<T> {
  return { ok: false, code, message, recoverable };
}

function validateLoadedRecord(value: unknown): ToyLockRecord {
  if (value === null || typeof value !== "object") throw new Error("Lock record is not an object.");
  const record = value as Partial<ToyLockRecord>;
  if (
    record.schemaVersion !== 1 ||
    typeof record.id !== "string" ||
    typeof record.targetId !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string" ||
    record.credential === undefined ||
    record.unlockDuration === undefined
  ) {
    throw new Error("Lock record is missing required fields.");
  }
  assertStableLockId(record.id, "id");
  assertStableLockId(record.targetId, "targetId");
  assertToyLockCredentialReference(record.credential);
  assertToyLockUnlockDuration(record.unlockDuration);
  if (
    !Number.isFinite(Date.parse(record.createdAt)) ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    (record.unlockedUntil !== undefined && !Number.isFinite(Date.parse(record.unlockedUntil))) ||
    (record.unlockedForSurfaceId !== undefined && typeof record.unlockedForSurfaceId !== "string") ||
    (record.unlockedUntilApplicationCloses !== undefined &&
      typeof record.unlockedUntilApplicationCloses !== "boolean")
  ) {
    throw new Error("Lock timestamps or unlock state are malformed.");
  }
  return {
    ...record,
    credential: { ...record.credential },
    unlockDuration: { ...record.unlockDuration },
  } as ToyLockRecord;
}

export class FileLockRecordPersistence implements LockRecordPersistence {
  readonly #path: string;
  readonly #createTemporaryId: () => string;
  #mutation: Promise<void> = Promise.resolve();

  constructor(path: string, createTemporaryId: () => string) {
    if (!isAbsolute(path)) throw new Error("Lock persistence requires an absolute file path.");
    this.#path = path;
    this.#createTemporaryId = createTemporaryId;
  }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  async load(): Promise<ReadonlyArray<ToyLockRecord>> {
    let raw: string;
    try {
      raw = await readFile(this.#path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    if (Buffer.byteLength(raw, "utf8") > 2 * 1024 * 1024) {
      throw new Error("The lock record file exceeds its 2 MiB safety bound.");
    }
    const parsed = JSON.parse(raw) as Partial<StoredLockDocument>;
    if (parsed.version !== 1 || !Array.isArray(parsed.records) || parsed.records.length > 10_000) {
      throw new Error("The lock record file has an unsupported or unbounded shape.");
    }
    return parsed.records.map(validateLoadedRecord);
  }

  async save(records: ReadonlyArray<ToyLockRecord>): Promise<void> { await this.#serialize(() => this.#save(records)); }
  async #save(records: ReadonlyArray<ToyLockRecord>): Promise<void> {
    if (records.length > 10_000) throw new Error("The lock record limit is 10,000 elements.");
    await mkdir(dirname(this.#path), { recursive: true });
    const temporaryPath = `${this.#path}.${this.#createTemporaryId()}.tmp`;
    const previous = await this.#readDocument();
    const bytes = `${JSON.stringify(
      { ...previous, version: 1, records: records.map(persistentLockRecord) },
      null,
      2,
    )}\n`;
    await writeFile(temporaryPath, bytes, { encoding: "utf8", flag: "wx" });
    try {
      await renameWithTransientRetry(temporaryPath, this.#path);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
  async beginRemoval(id: string, credential: ToyLockCredentialReference): Promise<void> { await this.#serialize(async () => { const document = await this.#readDocument(); await this.#writeDocument({ ...document, pendingRemovals: [...(document.pendingRemovals ?? []).filter((candidate) => candidate.id !== id), { id, credential }] }); }); }
  async completeRemoval(id: string): Promise<void> { await this.#serialize(async () => { const document = await this.#readDocument(); await this.#writeDocument({ ...document, pendingRemovals: (document.pendingRemovals ?? []).filter((candidate) => candidate.id !== id), tombstones: [...(document.tombstones ?? []), id].slice(-10_000) }); }); }
  async rollbackRemoval(id: string): Promise<void> { await this.#serialize(async () => { const document = await this.#readDocument(); await this.#writeDocument({ ...document, pendingRemovals: (document.pendingRemovals ?? []).filter((candidate) => candidate.id !== id) }); }); }
  async reconcileReceipt(vault: ToyLockCredentialVault): Promise<ToyLockReconciliationReceipt> {
    return await this.#serialize(async () => {
      const document = await this.#readDocument();
      const records = [...document.records];
      const pending: Array<{ id: string; credential: ToyLockCredentialReference } | string> = [];
      const affectedIds: string[] = [];
      let removalFailed = false;
      for (const raw of document.pendingRemovals ?? []) {
        const item = typeof raw === 'string' ? undefined : raw;
        const id = typeof raw === 'string' ? raw : raw.id;
        const record = records.find((candidate) => candidate.id === id);
        const credential = record?.credential ?? item?.credential;
        if (!credential) {
          // A legacy id has no safe vault reference. Keep it visible and retryable.
          pending.push(id);
          affectedIds.push(id);
          continue;
        }
        if (!vault.available) {
          pending.push({ id, credential });
          affectedIds.push(id);
          continue;
        }
        let present = false;
        try {
          present = await vault.has(credential);
        } catch {
          removalFailed = true;
          pending.push({ id, credential });
          affectedIds.push(id);
          continue;
        }
        if (present) {
          let removed = false;
          try {
            removed = await vault.remove(credential);
          } catch {
            removed = false;
          }
          if (!removed) {
            removalFailed = true;
            pending.push({ id, credential });
            affectedIds.push(id);
            continue;
          }
        }
        const index = records.findIndex((candidate) => candidate.id === id);
        if (index >= 0) records.splice(index, 1);
        document.tombstones = [...(document.tombstones ?? []), id].slice(-10_000);
        affectedIds.push(id);
      }
      await this.#writeDocument({ ...document, records, pendingRemovals: pending });
      const unresolved = pending.filter((item): item is string => typeof item === 'string');
      if (unresolved.length > 0) return { status: 'unresolved-legacy', affectedIds, warning: 'Some legacy lock removals have no surviving vault reference.' };
      if (!vault.available && pending.length > 0) return { status: 'pending-vault-unavailable', affectedIds, warning: 'Pending lock removals remain until the credential vault is available.' };
      if (removalFailed) return { status: 'pending-removal-failed', affectedIds, warning: 'One or more available-vault lock credentials could not be removed. Mutations remain blocked until reconciliation succeeds.' };
      return { status: 'reconciled', affectedIds };
    });
  }
  async #readDocument(): Promise<StoredLockDocument> { try { const raw = await readFile(this.#path, "utf8"); return JSON.parse(raw) as StoredLockDocument; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, records: [] }; throw error; } }
  async #writeDocument(document: StoredLockDocument): Promise<void> { await mkdir(dirname(this.#path), { recursive: true }); const temporaryPath = `${this.#path}.${this.#createTemporaryId()}.tmp`; await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" }); try { await renameWithTransientRetry(temporaryPath, this.#path); } catch (error) { await unlink(temporaryPath).catch(() => undefined); throw error; } }
}

async function renameWithTransientRetry(source: string, destination: string): Promise<void> {
  const delays = [0, 20, 40, 80, 160] as const;
  for (let index = 0; index < delays.length; index += 1) {
    if (delays[index]! > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[index]));
    }
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!TRANSIENT_RENAME_CODES.has(code ?? "") || index === delays.length - 1) throw error;
    }
  }
}

export class ToyLockStore {
  readonly #persistence: LockRecordPersistence;
  readonly #vault: ToyLockCredentialVault;
  readonly #recovery: ToyLockRecoveryMetadata;
  readonly #now: () => Date;
  #records = new Map<string, ToyLockRecord>();
  #ready = false;
  #mutation: Promise<void> = Promise.resolve();

  constructor(options: LockStoreOptions) {
    this.#persistence = options.persistence;
    this.#vault = options.vault;
    this.#recovery = options.recovery;
    this.#now = options.now ?? (() => new Date());
  }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  get recovery(): ToyLockRecoveryMetadata {
    return this.#recovery;
  }

  async initialize(): Promise<LockStoreResult<{ count: number }>> {
    try {
      const loaded = await this.#persistence.load();
      const next = new Map<string, ToyLockRecord>();
      const targets = new Set<string>();
      for (const record of loaded) {
        if (next.has(record.id) || targets.has(record.targetId)) {
          return failure("invalid-record", "The lock record file contains duplicate identities.");
        }
        next.set(record.id, record);
        targets.add(record.targetId);
      }
      this.#records = next;
      this.#ready = true;
      return { ok: true, value: { count: next.size } };
    } catch {
      return failure(
        "persistence-unavailable",
        "Lock records could not be read. No lock state was assumed or changed.",
      );
    }
  }

  list(): LockStoreResult<ReadonlyArray<ToyLockRecord>> {
    if (!this.#ready) {
      return failure("persistence-unavailable", "The lock store has not been initialized.");
    }
    return {
      ok: true,
      value: [...this.#records.values()].map((record) => ({
        ...record,
        credential: { ...record.credential },
        unlockDuration: { ...record.unlockDuration },
      })),
    };
  }

  async create(input: Omit<CreateToyLockInput, "at">): Promise<LockStoreResult<ToyLockRecord>> { return await this.#serialize(() => this.#create(input)); }
  async #create(input: Omit<CreateToyLockInput, "at">): Promise<LockStoreResult<ToyLockRecord>> {
    if (!this.#ready) return failure("persistence-unavailable", "The lock store is unavailable.");
    if (!this.#vault.available) {
      return failure("vault-unavailable", "The operating-system credential vault is unavailable.");
    }
    let record: ToyLockRecord;
    try {
      record = createToyLockRecord({ ...input, at: this.#now() });
    } catch {
      return failure("invalid-record", "The lock request is malformed.", false);
    }
    if ([...this.#records.values()].some((existing) => existing.targetId === record.targetId)) {
      return failure("duplicate-lock", "That element already has its own lock record.");
    }
    if (
      [...this.#records.values()].some(
        (existing) => existing.credential.vaultAccount === record.credential.vaultAccount,
      )
    ) {
      return failure(
        "duplicate-lock",
        "Each element requires its own independently managed credential reference.",
      );
    }
    try {
      if (!(await this.#vault.has(record.credential))) {
        return failure(
          "vault-reference-missing",
          "The independent credential was not found in the operating-system vault.",
        );
      }
    } catch {
      return failure("vault-unavailable", "The credential vault could not confirm this lock reference.");
    }
    const next = new Map(this.#records).set(record.id, record);
    const persisted = await this.#persist(next);
    if (!persisted.ok) return persisted;
    this.#records = next;
    return { ok: true, value: record };
  }

  async unlock(id: string, candidate: Uint8Array, surfaceId?: string): Promise<LockStoreResult<ToyLockRecord>> { return await this.#serialize(() => this.#unlock(id, candidate, surfaceId)); }
  async #unlock(
    id: string,
    candidate: Uint8Array,
    surfaceId?: string,
  ): Promise<LockStoreResult<ToyLockRecord>> {
    if (!this.#ready) return failure("persistence-unavailable", "The lock store is unavailable.");
    const record = this.#records.get(id);
    if (!record) return failure("lock-not-found", "The requested lock does not exist.", false);
    if (!this.#vault.available) {
      return failure("vault-unavailable", "The operating-system credential vault is unavailable.");
    }

    let matched = false;
    try {
      matched = await this.#vault.verify(record.credential, candidate);
    } catch {
      return failure("vault-unavailable", "The credential vault could not verify this lock.");
    } finally {
      candidate.fill(0);
    }
    if (!matched) return failure("verification-failed", "The supplied value did not match.");

    let unlocked: ToyLockRecord;
    try {
      unlocked = grantToyLockUnlock(record, { at: this.#now(), surfaceId });
    } catch {
      return failure("invalid-record", "The requested unlock scope is incomplete.", false);
    }
    const next = new Map(this.#records).set(id, unlocked);
    const persisted = await this.#persist(next);
    if (!persisted.ok) return persisted;
    this.#records = next;
    return { ok: true, value: unlocked };
  }

  async relock(id: string): Promise<LockStoreResult<ToyLockRecord>> { return await this.#serialize(() => this.#relock(id)); }
  async #relock(id: string): Promise<LockStoreResult<ToyLockRecord>> {
    if (!this.#ready) return failure("persistence-unavailable", "The lock store is unavailable.");
    const record = this.#records.get(id);
    if (!record) return failure("lock-not-found", "The requested lock does not exist.", false);
    const locked = relockToyLock(record, this.#now());
    const next = new Map(this.#records).set(id, locked);
    const persisted = await this.#persist(next);
    if (!persisted.ok) return persisted;
    this.#records = next;
    return { ok: true, value: locked };
  }

  async remove(id: string): Promise<ToyLockRemovalReceipt> { return await this.#serialize(() => this.#remove(id)); }
  async #remove(id: string): Promise<ToyLockRemovalReceipt> {
    const recoverable = (message: string): ToyLockRemovalReceipt => ({ status: "recoverable", message, recoverable: true });
    const pending = (message: string): ToyLockRemovalReceipt => ({ status: "pending", message, recoverable: true });
    const rolledBack = (message: string): ToyLockRemovalReceipt => ({ status: "rolledBack", message, recoverable: true });
    if (!this.#ready) return recoverable("The lock store is unavailable.");
    const record = this.#records.get(id);
    if (!record) return recoverable("The requested lock does not exist.");
    if (!this.#vault.available) return recoverable("The operating-system credential vault is unavailable.");

    try {
      await this.#persistence.beginRemoval?.(id, record.credential);
    } catch {
      return recoverable("The removal journal could not be started; the lock record was kept.");
    }
    const next = new Map(this.#records);
    next.delete(id);
    const persisted = await this.#persist(next);
    if (!persisted.ok) {
      try {
        await this.#persistence.rollbackRemoval?.(id);
        return rolledBack("The lock record could not be staged for removal, so the previous state was restored.");
      } catch {
        return pending("The lock removal is pending recovery because its previous state could not be restored.");
      }
    }

    let removed = false;
    try {
      removed = await this.#vault.remove(record.credential);
    } catch {
      removed = false;
    }
    if (!removed) {
      let restored = false;
      try {
        await this.#persistence.save([...this.#records.values()]);
        restored = true;
      } catch {
        restored = false;
      }
      try {
        await this.#persistence.rollbackRemoval?.(id);
        if (restored) return rolledBack("The credential could not be removed, so the previous lock state was restored.");
      } catch {
        // Keep the pending journal for the next reconciliation attempt.
      }
      return pending("The credential could not be removed. The lock removal remains pending and recoverable.");
    }

    this.#records = next;
    try {
      await this.#persistence.completeRemoval?.(id);
    } catch {
      return pending("The credential was removed, but the removal receipt remains pending recovery.");
    }
    return { status: "removed", value: { removed: true } };
  }

  async #persist(next: ReadonlyMap<string, ToyLockRecord>): Promise<LockStoreResult<true>> {
    try {
      await this.#persistence.save([...next.values()]);
      return { ok: true, value: true };
    } catch {
      return failure(
        "persistence-unavailable",
        "Lock records could not be saved. The previous in-memory state remains active.",
      );
    }
  }
}
