import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AuthenticatorEntry,
  AuthenticatorRegistration,
  AuthenticatorResult,
  AuthenticatorReconciliationReceipt,
  AuthenticatorCodeSnapshot,
  CredentialVault,
  VaultResult,
} from "../shared/authenticator.js";
import type { HistorySnapshotProtector } from "../shared/history.js";
import type {
  CreateToyLockInput,
  ToyLockCredentialReference,
  ToyLockRecord,
  ToyLockRecoveryMetadata,
  ToyLockReconciliationReceipt,
} from "../shared/locks.js";
import { AuthenticatorStore, type AuthenticatorMetadataStore, type AuthenticatorMetadataResult, type TotpCodeVerifier } from "./authenticator-store.js";
import { FileLockRecordPersistence, ToyLockStore, type LockRecordPersistence, type ToyLockCredentialVault, type LockStoreResult } from "./lock-store.js";
import { LocalHistory } from "./local-history.js";
import type { ProcessExecutor } from "./executor.js";
import { atomicWriteFileSync } from "./atomic-file.js";
import { UnlockLadder, type UnlockLadderAnswer, type UnlockLadderGradeResult, type UnlockLadderIssueResult, type UnlockLadderLockoutState, type UnlockLadderStateStore, type MoleHitReceipt } from "../app/renderer/src/unlock-ladder.js";
import { nextSupportTicketStatus, SUPPORT_TICKET_CATEGORIES, SUPPORT_TICKET_DISCLOSURE, SUPPORT_TICKET_SEVERITIES, type SupportTicket, type SupportTicketCategory, type SupportTicketSeverity, type SupportTicketStatus } from "../shared/support-tickets.js";

export interface AuthLockVault extends CredentialVault, ToyLockCredentialVault {
  setSecret(key: string, secret: string, kind?: "reversible" | "password-hash" | "totp"): Promise<VaultResult<undefined>>;
}

const UNAVAILABLE_VAULT: AuthLockVault = {
  available: false,
  async setSecret() { return { ok: false, code: "vault-unavailable", message: "The operating-system credential vault is unavailable." }; },
  async getSecret() { return { ok: false, code: "vault-unavailable", message: "The operating-system credential vault is unavailable." }; },
  async deleteSecret() { return { ok: false, code: "vault-unavailable", message: "The operating-system credential vault is unavailable." }; },
  async has() { return false; },
  async verify() { return false; },
  async remove() { return false; },
};

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    if (Buffer.byteLength(raw, "utf8") > 4 * 1024 * 1024) throw new Error("stored data exceeds its safety bound");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  atomicWriteFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export class FileAuthenticatorMetadataStore implements AuthenticatorMetadataStore {
  readonly #path: string;
  readonly available = true;
  #mutation: Promise<void> = Promise.resolve();

  constructor(path: string) { this.#path = path; }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  async read(): Promise<AuthenticatorMetadataResult<ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>>> {
    try {
      const value = await readJson<{ version: 1; entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord> }>(this.#path, { version: 1, entries: [] });
      if (value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 10_000) return { ok: false, code: "metadata-error" };
      return { ok: true, value: value.entries };
    } catch {
      return { ok: false, code: "metadata-error" };
    }
  }

  async write(entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>): Promise<AuthenticatorMetadataResult<undefined>> { return await this.#serialize(() => this.#write(entries)); }
  async #write(entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>): Promise<AuthenticatorMetadataResult<undefined>> {
    try {
      if (entries.length > 10_000) return { ok: false, code: "metadata-error" };
      const previous = await readJson<{ version: 1; pendingRemovals?: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string>; tombstones?: string[] }>(this.#path, { version: 1 });
      await writeJson(this.#path, { version: 1, entries, pendingRemovals: previous.pendingRemovals ?? [], tombstones: previous.tombstones ?? [] });
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, code: "metadata-error" };
    }
  }
  async beginRemoval(id: string, credential: { vaultAccount: string; method: 'password' | 'totp' }): Promise<AuthenticatorMetadataResult<undefined>> { return await this.#serialize(async () => { try { const value = await readJson<{ version: 1; entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>; pendingRemovals?: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string>; unresolvedRemovals?: string[] }>(this.#path, { version: 1, entries: [], pendingRemovals: [] }); const pending = [...(value.pendingRemovals ?? []).filter((item) => typeof item === 'string' ? item !== id : item.id !== id), { id, credential }]; await writeJson(this.#path, { ...value, pendingRemovals: pending, unresolvedRemovals: (value.unresolvedRemovals ?? []).filter((candidate) => candidate !== id) }); return { ok: true, value: undefined }; } catch { return { ok: false, code: "metadata-error" }; } }); }
  async completeRemoval(id: string): Promise<AuthenticatorMetadataResult<undefined>> { return await this.#serialize(async () => { try { const value = await readJson<{ version: 1; entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>; pendingRemovals?: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string>; tombstones?: string[] }>(this.#path, { version: 1, entries: [], pendingRemovals: [] }); await writeJson(this.#path, { ...value, pendingRemovals: (value.pendingRemovals ?? []).filter((candidate) => typeof candidate === 'string' ? candidate !== id : candidate.id !== id), tombstones: [...(value.tombstones ?? []), id].slice(-10_000) }); return { ok: true, value: undefined }; } catch { return { ok: false, code: "metadata-error" }; } }); }
  async rollbackRemoval(id: string): Promise<AuthenticatorMetadataResult<undefined>> { return await this.#serialize(async () => { try { const value = await readJson<{ version: 1; entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>; pendingRemovals?: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string> }>(this.#path, { version: 1, entries: [], pendingRemovals: [] }); await writeJson(this.#path, { ...value, pendingRemovals: (value.pendingRemovals ?? []).filter((candidate) => typeof candidate === 'string' ? candidate !== id : candidate.id !== id) }); return { ok: true, value: undefined }; } catch { return { ok: false, code: "metadata-error" }; } }); }
  async reconcile(vault: AuthLockVault): Promise<AuthenticatorReconciliationReceipt> {
    return await this.#serialize(async () => {
      const value = await readJson<{ version: 1; entries: ReadonlyArray<import("../shared/authenticator.js").AuthenticatorEntryRecord>; pendingRemovals?: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string>; tombstones?: string[]; unresolvedRemovals?: string[] }>(this.#path, { version: 1, entries: [], pendingRemovals: [], tombstones: [], unresolvedRemovals: [] });
      const entries = [...value.entries];
      const pending: Array<{ id: string; credential: { vaultAccount: string; method: 'password' | 'totp' } } | string> = [];
      const unresolved = [...(value.unresolvedRemovals ?? [])];
      const affected: string[] = [];
      let removalFailed = false;
      for (const raw of value.pendingRemovals ?? []) {
        const id = typeof raw === 'string' ? raw : raw.id;
        const entry = entries.find((candidate) => candidate.id === id);
        const credential = entry ? { vaultAccount: entry.credentialReference, method: typeof raw === 'string' ? 'totp' as const : raw.credential.method } : typeof raw === 'string' ? undefined : raw.credential;
        if (!credential) {
          if (!unresolved.includes(id)) unresolved.push(id);
          pending.push(id);
          affected.push(id);
          continue;
        }
        if (!vault.available) {
          pending.push({ id, credential });
          affected.push(id);
          continue;
        }
        let present = false;
        try {
          present = await vault.has(credential);
        } catch {
          removalFailed = true;
          pending.push({ id, credential });
          affected.push(id);
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
            affected.push(id);
            continue;
          }
        }
        const index = entries.findIndex((candidate) => candidate.id === id);
        if (index >= 0) entries.splice(index, 1);
        value.tombstones = [...(value.tombstones ?? []), id].slice(-10_000);
        affected.push(id);
      }
      const allAffected = [...new Set([...affected, ...unresolved])];
      await writeJson(this.#path, { ...value, entries, pendingRemovals: pending, tombstones: value.tombstones ?? [], unresolvedRemovals: unresolved });
      if (removalFailed) return { status: 'pending-removal-failed', affectedIds: allAffected, warning: 'One or more available-vault authenticator credentials could not be removed. Mutations remain blocked until reconciliation succeeds.' };
      if (unresolved.length > 0) return { status: 'unresolved-legacy', affectedIds: allAffected, warning: 'Some legacy removal identifiers have no surviving vault reference.' };
      if (!vault.available && pending.length > 0) return { status: 'pending-vault-unavailable', affectedIds: allAffected, warning: 'Pending removals remain until the credential vault is available.' };
      return { status: 'reconciled', affectedIds: allAffected };
    });
  }
}

class FileSupportTicketStore {
  readonly #path: string;
  #mutation: Promise<void> = Promise.resolve();
  constructor(path: string) { this.#path = path; }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  async list(): Promise<ReadonlyArray<SupportTicket>> {
    const value = await readJson<{ version: 1; tickets: ReadonlyArray<SupportTicket> }>(this.#path, { version: 1, tickets: [] });
    if (value.version !== 1 || !Array.isArray(value.tickets) || value.tickets.length > 10_000) throw new Error("Support Ticket storage is malformed.");
    return value.tickets.map((ticket) => {
      const legacy = ticket as SupportTicket & { createdAt?: string; status: SupportTicketStatus | 'received' | 'reviewed' | 'resolution-ready' };
      const status = legacy.status === 'received' ? 'Open' : legacy.status === 'reviewed' ? 'Triaged' : legacy.status === 'resolution-ready' ? 'Resolved' : legacy.status;
      return { ...legacy, status, openedAt: legacy.openedAt ?? legacy.createdAt ?? new Date(0).toISOString(), firstResponse: legacy.firstResponse ?? 'This local desk has no human reader.' } as SupportTicket;
    });
  }

  async create(input: { category: string; description: string; severity: string }): Promise<SupportTicket> { return await this.#serialize(() => this.#create(input)); }
  async #create(input: { category: string; description: string; severity: string }): Promise<SupportTicket> {
    if (!SUPPORT_TICKET_CATEGORIES.includes(input.category as SupportTicketCategory)) throw new Error("Pick a supported ticket category.");
    if (input.description.trim().length < 1 || input.description.length > 2_000) throw new Error("A bounded ticket description is required.");
    if (!SUPPORT_TICKET_SEVERITIES.includes(input.severity as SupportTicketSeverity)) throw new Error("Pick a supported ticket severity.");
    const tickets = [...await this.list()];
    if (tickets.length >= 10_000) throw new Error("The local ticket list is full.");
    const openedAt = new Date().toISOString();
    const ticket: SupportTicket = { id: `DING-${randomBytes(6).toString("hex").toUpperCase()}`, category: input.category as SupportTicketCategory, description: input.description.trim(), severity: input.severity as SupportTicketSeverity, status: "Open", openedAt, firstResponse: "Thank you for contacting support. This local desk has read the manual once and nobody is coming." };
    await writeJson(this.#path, { version: 1, tickets: [...tickets, ticket] });
    return ticket;
  }

  async advance(id: string): Promise<SupportTicket> { return await this.#serialize(() => this.#advance(id)); }
  async #advance(id: string): Promise<SupportTicket> {
    const tickets = [...await this.list()];
    const index = tickets.findIndex((ticket) => ticket.id === id);
    if (index < 0) throw new Error("The local ticket was not found.");
    const current = tickets[index]!;
    const next = { ...current, status: nextSupportTicketStatus(current.status) };
    tickets[index] = next;
    await writeJson(this.#path, { version: 1, tickets });
    return next;
  }
}

interface LadderDocument {
  version: 1;
  lockouts: Record<string, UnlockLadderLockoutState>;
  budgets: Record<string, number[]>;
  waits: Record<string, { expiresAt: number }>;
}

class FileUnlockLadderStateStore implements UnlockLadderStateStore {
  readonly #path: string;
  readonly available = true;
  #writeChain: Promise<void> = Promise.resolve();
  constructor(path: string) { this.#path = path; }

  async #read(): Promise<LadderDocument> {
    const value = await readJson<LadderDocument>(this.#path, { version: 1, lockouts: {}, budgets: {}, waits: {} });
    if (value.version !== 1 || !value.lockouts || !value.budgets) throw new Error("Unlock ladder state is malformed.");
    if (!value.waits) value.waits = {};
    return value;
  }

  async #write(value: LadderDocument): Promise<void> { await writeJson(this.#path, value); }
  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const previous = this.#writeChain; let release!: () => void; this.#writeChain = new Promise<void>((resolve) => { release = resolve; }); await previous; try { return await operation(); } finally { release(); } }
  async readLockout(lockoutId: string): Promise<UnlockLadderLockoutState | undefined> { return (await this.#read()).lockouts[lockoutId]; }
  async writeLockout(lockoutId: string, state: UnlockLadderLockoutState | undefined): Promise<void> {
    await this.#serialize(async () => { const document = await this.#read(); if (state) document.lockouts[lockoutId] = state; else delete document.lockouts[lockoutId]; await this.#write(document); });
  }
  async readClearedWaits(budgetScopeId: string): Promise<ReadonlyArray<number>> { return (await this.#read()).budgets[budgetScopeId] ?? []; }
  async writeClearedWaits(budgetScopeId: string, timestamps: ReadonlyArray<number>): Promise<void> {
    await this.#serialize(async () => { const document = await this.#read(); document.budgets[budgetScopeId] = [...timestamps]; await this.#write(document); });
  }
  async hasWait(lockoutId: string): Promise<boolean> { const wait = (await this.#read()).waits[lockoutId]; return Boolean(wait && wait.expiresAt > Date.now()); }
  async createWait(lockoutId: string, durationMs = 30_000): Promise<void> { await this.#serialize(async () => { const document = await this.#read(); document.waits[lockoutId] = { expiresAt: Date.now() + Math.min(Math.max(durationMs, 1_000), 24 * 60 * 60 * 1_000) }; await this.#write(document); }); }
  async clearWait(lockoutId: string): Promise<boolean> { return await this.#serialize(async () => { const document = await this.#read(); if (!document.waits[lockoutId]) return false; delete document.waits[lockoutId]; await this.#write(document); return true; }); }
}

function randomUnit(): number { return randomBytes(4).readUInt32BE(0) / 0x1_0000_0000; }
function createNonce(): string { return randomBytes(32).toString("base64url"); }

function decodeBase32(value: string): Buffer | undefined {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = value.replace(/\s+/gu, "").replace(/=+$/u, "").toUpperCase();
  if (!cleaned || [1, 3, 6].includes(cleaned.length % 8)) return undefined;
  let bits = "";
  for (const character of cleaned) { const index = alphabet.indexOf(character); if (index < 0) return undefined; bits += index.toString(2).padStart(5, "0"); }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  return bytes;
}

function generateCode(secret: string, parameters: { algorithm: string; digits: number; period: number }, atMs: number): string {
  const bytes = decodeBase32(secret);
  if (!bytes) throw new Error("The authenticator secret could not be decoded.");
  const counter = Math.floor(atMs / 1_000 / parameters.period);
  const counterBytes = Buffer.alloc(8); counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac(parameters.algorithm.replace("-", ""), bytes).update(counterBytes).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24) | ((digest[offset + 1]! & 0xff) << 16) | ((digest[offset + 2]! & 0xff) << 8) | (digest[offset + 3]! & 0xff);
  return String(binary % (10 ** parameters.digits)).padStart(parameters.digits, "0");
}

export interface AuthLockRuntimeOptions {
  userDataPath: string;
  vault?: AuthLockVault;
  executor: ProcessExecutor;
  historyProtector?: HistorySnapshotProtector;
  recovery: ToyLockRecoveryMetadata;
  trustedTime?: () => Promise<number | undefined>;
}

export interface AuthLockReconciliationReceipt {
  readonly authenticator: AuthenticatorReconciliationReceipt;
  readonly locks: ToyLockReconciliationReceipt;
}

export function createAuthLockRuntime(options: AuthLockRuntimeOptions) {
  const vault = options.vault ?? UNAVAILABLE_VAULT;
  const metadata = new FileAuthenticatorMetadataStore(join(options.userDataPath, "authenticator-records.json"));
  const verifyCode: TotpCodeVerifier = {
    verify: async (secret, parameters, code, atMs, skewSteps = 1) => {
      const { createHmac } = await import("node:crypto");
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      const cleaned = secret.replace(/=+$/u, "").toUpperCase();
      let bits = "";
      for (const character of cleaned) { const index = alphabet.indexOf(character); if (index < 0) return false; bits += index.toString(2).padStart(5, "0"); }
      const bytes = Buffer.alloc(Math.floor(bits.length / 8));
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
      const hash = parameters.algorithm.replace("-", "");
      for (let delta = -skewSteps; delta <= skewSteps; delta += 1) {
        const counter = Math.floor(atMs / 1_000 / parameters.period) + delta;
        if (counter < 0) continue;
        const counterBytes = Buffer.alloc(8); counterBytes.writeBigUInt64BE(BigInt(counter));
        const digest = createHmac(hash, bytes).update(counterBytes).digest();
        const offset = digest[digest.length - 1]! & 0x0f;
        const binary = ((digest[offset]! & 0x7f) << 24) | ((digest[offset + 1]! & 0xff) << 16) | ((digest[offset + 2]! & 0xff) << 8) | (digest[offset + 3]! & 0xff);
        if (String(binary % (10 ** parameters.digits)).padStart(parameters.digits, "0") === code) return true;
      }
      return false;
    },
  };
  const authenticator = new AuthenticatorStore({ vault, metadata, verifyCode, createEntryId: () => `${Date.now().toString(36)}-${randomBytes(12).toString("hex")}` });
  const persistence: LockRecordPersistence = new FileLockRecordPersistence(join(options.userDataPath, "toy-locks.json"), () => randomUUID().replaceAll("-", ""));
  const locks = new ToyLockStore({ persistence, vault, recovery: options.recovery });
  let authenticatorReconciliation: AuthenticatorReconciliationReceipt = { status: 'reconciled', affectedIds: [] };
  let lockReconciliation: ToyLockReconciliationReceipt = { status: 'reconciled', affectedIds: [] };
  let reconciliationQueue: Promise<void> = Promise.resolve();
  const refreshReconciliation = async (): Promise<AuthLockReconciliationReceipt> => {
    const prior = reconciliationQueue;
    let release!: () => void;
    reconciliationQueue = new Promise<void>((resolve) => { release = resolve; });
    await prior;
    try {
      // Keep the last complete pair together. A retry must never expose one new receipt and one stale receipt.
      const nextAuthenticator = await metadata.reconcile(vault);
      const nextLocks = await persistence.reconcileReceipt(vault);
      authenticatorReconciliation = nextAuthenticator;
      lockReconciliation = nextLocks;
      return { authenticator: nextAuthenticator, locks: nextLocks };
    } finally {
      release();
    }
  };
  const locksReady = (async () => { await refreshReconciliation(); return await locks.initialize(); })();
  const tickets = new FileSupportTicketStore(join(options.userDataPath, "support-tickets.json"));
  const ladderState = new FileUnlockLadderStateStore(join(options.userDataPath, "unlock-ladder-state.json"));
  const ladder = new UnlockLadder({ now: () => Date.now(), random: randomUnit, createNonce, stateStore: ladderState, hasAuthoritativeWait: (lockoutId) => ladderState.hasWait(lockoutId), clearAuthoritativeWait: (lockoutId) => ladderState.clearWait(lockoutId) });
  const history = new LocalHistory({ executor: options.executor, repositoryPath: join(options.userDataPath, "history"), protector: options.historyProtector });

  return {
    vault,
    authenticator,
    locks,
    locksReady,
    tickets,
    ladder,
    history,
    async codeSnapshot(id: string): Promise<AuthenticatorResult<AuthenticatorCodeSnapshot>> {
      const result = await authenticator.get(id);
      if (!result.ok) return result;
      const records = await metadata.read();
      if (!records.ok) return { ok: false, code: records.code, message: "Authenticator metadata could not be read." };
      const record = records.value.find((entry) => entry.id === id);
      if (!record) return { ok: false, code: "not-found", message: "Authenticator entry was not found." };
      const secret = await vault.getSecret(record.credentialReference);
      if (!secret.ok) return { ok: false, code: secret.code, message: secret.message };
        const localMs = Date.now();
        const trustedMs = options.trustedTime ? await options.trustedTime() : undefined;
        const atMs = trustedMs ?? localMs;
      try {
        const offset = trustedMs === undefined ? undefined : trustedMs - localMs;
        return { ok: true, value: { current: generateCode(secret.value, record.parameters, atMs), next: generateCode(secret.value, record.parameters, atMs + record.parameters.period * 1_000), secondsRemaining: record.parameters.period - (Math.floor(atMs / 1_000) % record.parameters.period), clockOffsetMs: offset, clockWarning: trustedMs === undefined ? "Trusted HTTPS time is unavailable offline. Code timing uses the privileged system clock." : (Math.abs(offset) > record.parameters.period * 1_000 ? `The local clock differs from trusted HTTPS time by about ${Math.round(Math.abs(offset) / 1_000)} seconds.` : undefined), observedAt: new Date(atMs).toISOString() } };
      } catch { return { ok: false, code: "vault-error", message: "The authenticator code could not be generated." }; }
    },
    async initializeHistory() { return await history.initialize(); },
    async issueLadder(request: { lockoutId: string; budgetScopeId: string; schoolMode: boolean }): Promise<UnlockLadderIssueResult> { return await ladder.issue(request); },
    async hitLadder(nonce: string, spawnId: number, cell: number): Promise<{ ok: true; value: MoleHitReceipt } | { ok: false; reason: string }> { return await ladder.recordMoleHit(nonce, spawnId, cell); },
    async createLadderWait(lockoutId: string, durationMs?: number): Promise<void> { await ladderState.createWait(lockoutId, durationMs); },
    async awaitReconciliation(): Promise<AuthLockReconciliationReceipt> {
      await locksReady;
      return await refreshReconciliation();
    },
    async gradeLadder(nonce: string, answer: UnlockLadderAnswer): Promise<UnlockLadderGradeResult> { return await ladder.grade(nonce, answer); },
  };
}

export type AuthLockRuntime = ReturnType<typeof createAuthLockRuntime>;
