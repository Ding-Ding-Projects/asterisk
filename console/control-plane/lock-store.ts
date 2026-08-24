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
  type ToyLockRecord,
  type ToyLockRecoveryMetadata,
} from "../shared/locks.js";

export type LockStoreFailureCode =
  | "duplicate-lock"
  | "invalid-record"
  | "lock-not-found"
  | "persistence-unavailable"
  | "vault-unavailable"
  | "vault-reference-missing"
  | "verification-failed";

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

  constructor(path: string, createTemporaryId: () => string) {
    if (!isAbsolute(path)) throw new Error("Lock persistence requires an absolute file path.");
    this.#path = path;
    this.#createTemporaryId = createTemporaryId;
  }

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

  async save(records: ReadonlyArray<ToyLockRecord>): Promise<void> {
    if (records.length > 10_000) throw new Error("The lock record limit is 10,000 elements.");
    await mkdir(dirname(this.#path), { recursive: true });
    const temporaryPath = `${this.#path}.${this.#createTemporaryId()}.tmp`;
    const bytes = `${JSON.stringify(
      { version: 1, records: records.map(persistentLockRecord) },
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

  constructor(options: LockStoreOptions) {
    this.#persistence = options.persistence;
    this.#vault = options.vault;
    this.#recovery = options.recovery;
    this.#now = options.now ?? (() => new Date());
  }

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

  async create(input: Omit<CreateToyLockInput, "at">): Promise<LockStoreResult<ToyLockRecord>> {
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

  async unlock(
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

  async relock(id: string): Promise<LockStoreResult<ToyLockRecord>> {
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

  async remove(id: string): Promise<LockStoreResult<{ removed: true }>> {
    if (!this.#ready) return failure("persistence-unavailable", "The lock store is unavailable.");
    const record = this.#records.get(id);
    if (!record) return failure("lock-not-found", "The requested lock does not exist.", false);
    if (!this.#vault.available) {
      return failure("vault-unavailable", "The operating-system credential vault is unavailable.");
    }
    try {
      if (!(await this.#vault.remove(record.credential))) {
        return failure(
          "vault-reference-missing",
          "The credential could not be removed, so the lock record was kept.",
        );
      }
    } catch {
      return failure("vault-unavailable", "The credential vault could not remove this lock.");
    }
    const next = new Map(this.#records);
    next.delete(id);
    const persisted = await this.#persist(next);
    if (!persisted.ok) return persisted;
    this.#records = next;
    return { ok: true, value: { removed: true } };
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
