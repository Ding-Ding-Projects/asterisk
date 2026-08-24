import type {
  AuthenticatorEntry,
  AuthenticatorEntryRecord,
  AuthenticatorParameters,
  AuthenticatorRegistration,
  AuthenticatorResult,
  AuthenticatorRemovalReceipt,
  CredentialVault,
} from "../shared/authenticator.js";
import {
  normalizeRegistration,
  redactAuthenticatorEntry,
} from "../shared/authenticator.js";

export type AuthenticatorMetadataResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "metadata-unavailable" | "metadata-error" };

export interface AuthenticatorMetadataStore {
  readonly available: boolean;
  read(): Promise<AuthenticatorMetadataResult<ReadonlyArray<AuthenticatorEntryRecord>>>;
  write(entries: ReadonlyArray<AuthenticatorEntryRecord>): Promise<AuthenticatorMetadataResult<undefined>>;
  beginRemoval?(id: string, credential: { vaultAccount: string; method: 'password' | 'totp' }): Promise<AuthenticatorMetadataResult<undefined>>;
  completeRemoval?(id: string): Promise<AuthenticatorMetadataResult<undefined>>;
  rollbackRemoval?(id: string): Promise<AuthenticatorMetadataResult<undefined>>;
}

export interface TotpCodeVerifier {
  verify(
    secret: string,
    parameters: AuthenticatorParameters,
    code: string,
    atMs: number,
    skewSteps?: number,
  ): Promise<boolean>;
}

export interface AuthenticatorStoreOptions {
  vault: CredentialVault;
  metadata: AuthenticatorMetadataStore;
  createEntryId: () => string;
  now?: () => string;
  verifyCode: TotpCodeVerifier;
}

const ENTRY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;
const CREDENTIAL_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const PRINTABLE_TEXT = /^[^\u0000-\u001f\u007f]{1,256}$/u;
const RECORD_KEYS = new Set([
  "id",
  "issuer",
  "account",
  "parameters",
  "credentialReference",
  "armed",
  "createdAt",
  "updatedAt",
]);

function validatedRecord(value: AuthenticatorEntryRecord): AuthenticatorEntryRecord {
  if (value === null || typeof value !== "object") throw new Error("invalid record");
  if (Object.keys(value).some((key) => !RECORD_KEYS.has(key))) throw new Error("unexpected record field");
  if (
    !ENTRY_ID.test(value.id) ||
    !PRINTABLE_TEXT.test(value.issuer) ||
    !PRINTABLE_TEXT.test(value.account) ||
    !CREDENTIAL_REFERENCE.test(value.credentialReference) ||
    typeof value.armed !== "boolean" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !["SHA-1", "SHA-256", "SHA-512"].includes(value.parameters.algorithm) ||
    !Number.isSafeInteger(value.parameters.digits) ||
    value.parameters.digits < 6 ||
    value.parameters.digits > 8 ||
    !Number.isSafeInteger(value.parameters.period) ||
    value.parameters.period < 1 ||
    value.parameters.period > 86_400
  ) {
    throw new Error("invalid record shape");
  }
  return {
    ...value,
    parameters: { ...value.parameters },
  };
}

function metadataFailure<T>(
  result: Extract<AuthenticatorMetadataResult<unknown>, { ok: false }>,
): AuthenticatorResult<T> {
  return {
    ok: false,
    code: result.code,
    message: result.code === "metadata-unavailable"
      ? "Authenticator metadata storage is unavailable."
      : "Authenticator metadata could not be saved.",
  };
}

function vaultFailure<T>(code: "vault-unavailable" | "vault-error"): AuthenticatorResult<T> {
  return {
    ok: false,
    code,
    message: code === "vault-unavailable"
      ? "The operating-system credential vault is unavailable."
      : "The operating-system credential vault could not complete the request.",
  };
}

/**
 * Vault-only authenticator registry. No metadata fallback is created by this class. Registration
 * first creates an unarmed entry and requires a fresh code confirmation before the entry is armed.
 */
export class AuthenticatorStore {
  readonly #vault: CredentialVault;
  readonly #metadata: AuthenticatorMetadataStore;
  readonly #createEntryId: () => string;
  readonly #now: () => string;
  readonly #verifyCode: TotpCodeVerifier;
  #mutation: Promise<void> = Promise.resolve();

  constructor(options: AuthenticatorStoreOptions) {
    this.#vault = options.vault;
    this.#metadata = options.metadata;
    this.#createEntryId = options.createEntryId;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#verifyCode = options.verifyCode;
  }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  async list(): Promise<AuthenticatorResult<ReadonlyArray<AuthenticatorEntry>>> {
    const read = await this.#readRecords();
    if (!read.ok) return metadataFailure(read);
    return { ok: true, value: read.value.map(redactAuthenticatorEntry) };
  }

  async get(id: string): Promise<AuthenticatorResult<AuthenticatorEntry>> {
    const record = await this.#findRecord(id);
    if (!record.ok) return record;
    return { ok: true, value: redactAuthenticatorEntry(record.value) };
  }

  async register(input: AuthenticatorRegistration): Promise<AuthenticatorResult<AuthenticatorEntry>> { return await this.#serialize(() => this.#register(input)); }
  async #register(input: AuthenticatorRegistration): Promise<AuthenticatorResult<AuthenticatorEntry>> {
    if (!this.#vault.available) return vaultFailure("vault-unavailable");
    if (!this.#metadata.available) {
      return { ok: false, code: "metadata-unavailable", message: "Authenticator metadata storage is unavailable." };
    }
    let now: string;
    let entryId: string;
    try {
      now = this.#now();
      if (!Number.isFinite(Date.parse(now))) throw new Error("invalid clock");
      entryId = this.#createEntryId();
    } catch {
      return { ok: false, code: "invalid-input", message: "Authenticator identity or clock source is unavailable." };
    }
    const normalized = normalizeRegistration(input, entryId);
    if (!normalized.ok) return normalized;

    const current = await this.#readRecords();
    if (!current.ok) return metadataFailure(current);
    if (current.value.some((entry) => entry.id === normalized.value.id)) {
      return { ok: false, code: "duplicate-entry", message: "That authenticator entry identity already exists." };
    }

    const credentialReference = `authenticator/${normalized.value.id}`;
    let saved;
    try {
      saved = await this.#vault.setSecret(credentialReference, normalized.value.secret);
    } catch {
      return vaultFailure("vault-error");
    }
    if (!saved.ok) return vaultFailure(saved.code);

    const record: AuthenticatorEntryRecord = {
      id: normalized.value.id,
      issuer: normalized.value.issuer,
      account: normalized.value.account,
      parameters: normalized.value.parameters,
      credentialReference,
      armed: false,
      createdAt: now,
      updatedAt: now,
    };
    const written = await this.#writeRecords([...current.value, record]);
    if (!written.ok) {
      try {
        const cleanup = await this.#vault.deleteSecret(credentialReference);
        if (!cleanup.ok) return vaultFailure(cleanup.code);
      } catch {
        return vaultFailure("vault-error");
      }
      return metadataFailure(written);
    }
    return { ok: true, value: redactAuthenticatorEntry(record) };
  }

  async confirmAndArm(id: string, code: string, atMs: number, skewSteps = 1): Promise<AuthenticatorResult<AuthenticatorEntry>> { return await this.#serialize(() => this.#confirmAndArm(id, code, atMs, skewSteps)); }
  async #confirmAndArm(
    id: string,
    code: string,
    atMs: number,
    skewSteps = 1,
  ): Promise<AuthenticatorResult<AuthenticatorEntry>> {
    if (!this.#vault.available) return vaultFailure("vault-unavailable");
    if (!Number.isSafeInteger(atMs) || atMs < 0 || !Number.isSafeInteger(skewSteps) || skewSteps < 0 || skewSteps > 2) {
      return { ok: false, code: "invalid-input", message: "Confirmation timing is outside its accepted bounds." };
    }
    if (typeof code !== "string" || !/^\d{6,8}$/u.test(code)) {
      return { ok: false, code: "confirmation-failed", message: "Confirmation code did not match." };
    }
    const current = await this.#readRecords();
    if (!current.ok) return metadataFailure(current);
    const existing = current.value.find((entry) => entry.id === id);
    if (!existing) return { ok: false, code: "not-found", message: "Authenticator entry was not found." };

    let secretResult;
    try {
      secretResult = await this.#vault.getSecret(existing.credentialReference);
    } catch {
      return vaultFailure("vault-error");
    }
    if (!secretResult.ok) return vaultFailure(secretResult.code);

    let valid = false;
    try {
      valid = await this.#verifyCode.verify(secretResult.value, existing.parameters, code, atMs, skewSteps);
    } catch {
      return { ok: false, code: "confirmation-failed", message: "Confirmation code could not be verified." };
    }
    if (!valid) return { ok: false, code: "confirmation-failed", message: "Confirmation code did not match." };

    let updatedAt: string;
    try {
      updatedAt = this.#now();
      if (!Number.isFinite(Date.parse(updatedAt))) throw new Error("invalid clock");
    } catch {
      return { ok: false, code: "invalid-input", message: "Authenticator clock source is unavailable." };
    }
    const updated: AuthenticatorEntryRecord = { ...existing, armed: true, updatedAt };
    const written = await this.#writeRecords(
      current.value.map((entry) => entry.id === id ? updated : entry),
    );
    if (!written.ok) return metadataFailure(written);
    return { ok: true, value: redactAuthenticatorEntry(updated) };
  }

  async remove(id: string): Promise<AuthenticatorRemovalReceipt> { return await this.#serialize(() => this.#remove(id)); }
  async #remove(id: string): Promise<AuthenticatorRemovalReceipt> {
    const recoverable = (message: string): AuthenticatorRemovalReceipt => ({ status: 'recoverable', message, recoverable: true });
    const pending = (message: string): AuthenticatorRemovalReceipt => ({ status: 'pending', message, recoverable: true });
    const rolledBack = (message: string): AuthenticatorRemovalReceipt => ({ status: 'rolledBack', message, recoverable: true });
    if (!this.#vault.available) return recoverable("The operating-system credential vault is unavailable.");
    const current = await this.#readRecords();
    if (!current.ok) return recoverable("Authenticator metadata could not be read.");
    const existing = current.value.find((entry) => entry.id === id);
    if (!existing) return recoverable("Authenticator entry was not found.");

    if (this.#metadata.beginRemoval) {
      const tombstone = await this.#metadata.beginRemoval(id, { vaultAccount: existing.credentialReference, method: 'totp' });
      if (!tombstone.ok) return recoverable("The removal journal could not be started.");
    }
    let secretResult;
    try {
      secretResult = await this.#vault.getSecret(existing.credentialReference);
    } catch {
      await this.#metadata.rollbackRemoval?.(id);
      return recoverable("The credential vault could not be read.");
    }
    if (!secretResult.ok) { await this.#metadata.rollbackRemoval?.(id); return recoverable(secretResult.message); }

    let deleted;
    try { deleted = await this.#vault.deleteSecret(existing.credentialReference); }
    catch { await this.#metadata.rollbackRemoval?.(id); return recoverable("The credential vault could not remove the credential."); }
    if (!deleted.ok) { await this.#metadata.rollbackRemoval?.(id); return recoverable(deleted.message); }

    const written = await this.#writeRecords(current.value.filter((entry) => entry.id !== id));
    if (!written.ok) {
      try { await this.#vault.setSecret(existing.credentialReference, secretResult.value); }
      catch { return pending("The credential was removed, but the previous metadata could not be restored."); }
      const rollback = await this.#metadata.rollbackRemoval?.(id);
      if (rollback && !rollback.ok) return pending("The credential was restored, but the removal journal remains pending recovery.");
      return rolledBack("The credential was restored, but metadata removal failed and the previous state was restored.");
    }
    const completed = await this.#metadata.completeRemoval?.(id);
    if (completed && !completed.ok) return pending("The credential was removed, but the removal receipt remains pending recovery.");
    return { status: 'removed', value: undefined };
  }

  async restoreRedacted(snapshot: unknown): Promise<AuthenticatorResult<AuthenticatorEntry>> { return await this.#serialize(() => this.#restoreRedacted(snapshot)); }
  async #restoreRedacted(snapshot: unknown): Promise<AuthenticatorResult<AuthenticatorEntry>> {
    if (!snapshot || typeof snapshot !== "object") return { ok: false, code: "invalid-input", message: "The authenticator restore snapshot is malformed." };
    const entry = (snapshot as { entry?: AuthenticatorEntry }).entry;
    if (!entry || typeof entry.id !== "string") return { ok: false, code: "invalid-input", message: "The authenticator restore snapshot has no entry." };
    const current = await this.#readRecords();
    if (!current.ok) return metadataFailure(current);
    const existing = current.value.find((candidate) => candidate.id === entry.id);
    if (!existing) return { ok: false, code: "not-found", message: "The credential for this authenticator entry is no longer in the vault." };
    const restored: AuthenticatorEntryRecord = { ...existing, issuer: entry.issuer, account: entry.account, parameters: { ...entry.parameters }, armed: entry.armed, updatedAt: this.#now() };
    const written = await this.#writeRecords(current.value.map((candidate) => candidate.id === entry.id ? restored : candidate));
    if (!written.ok) return metadataFailure(written);
    return { ok: true, value: redactAuthenticatorEntry(restored) };
  }

  async #findRecord(id: string): Promise<AuthenticatorResult<AuthenticatorEntryRecord>> {
    if (!this.#metadata.available) {
      return { ok: false, code: "metadata-unavailable", message: "Authenticator metadata storage is unavailable." };
    }
    const current = await this.#readRecords();
    if (!current.ok) return metadataFailure(current);
    const existing = current.value.find((entry) => entry.id === id);
    return existing
      ? { ok: true, value: existing }
      : { ok: false, code: "not-found", message: "Authenticator entry was not found." };
  }

  async #readRecords(): Promise<AuthenticatorMetadataResult<ReadonlyArray<AuthenticatorEntryRecord>>> {
    if (!this.#metadata.available) return { ok: false, code: "metadata-unavailable" };
    try {
      const result = await this.#metadata.read();
      if (!result.ok) return result;
      if (result.value.length > 10_000) return { ok: false, code: "metadata-error" };
      return { ok: true, value: result.value.map(validatedRecord) };
    } catch {
      return { ok: false, code: "metadata-error" };
    }
  }

  async #writeRecords(
    records: ReadonlyArray<AuthenticatorEntryRecord>,
  ): Promise<AuthenticatorMetadataResult<undefined>> {
    if (!this.#metadata.available) return { ok: false, code: "metadata-unavailable" };
    try {
      return await this.#metadata.write(records);
    } catch {
      return { ok: false, code: "metadata-error" };
    }
  }
}
