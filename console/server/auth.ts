/**
 * Hosted authentication for one local administrator account. Storage and memory
 * limits are deliberate security boundaries because every call is reachable from a
 * network-facing process.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SESSIONS = 1_024;
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_LIMIT_SOURCES = 4_096;
const MAX_ACCOUNT_FILE_BYTES = 16 * 1024;
const MAX_USERNAME_CHARS = 128;
const MAX_PASSWORD_CHARS = 1_024;
const ACCOUNT_SCHEMA_VERSION = 1 as const;

export interface AdminAccountRecord {
  schemaVersion: typeof ACCOUNT_SCHEMA_VERSION;
  username: string;
  /** `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`, never the plaintext password. */
  passwordHash: string;
  createdAt: string;
}

export type AccountReadResult =
  | { state: 'missing' }
  | { state: 'valid'; record: AdminAccountRecord }
  | { state: 'corrupt'; reason: string };

export interface AccountStore {
  readState(): AccountReadResult;
  write(record: AdminAccountRecord): void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isExactIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 32) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function parseStoredHash(stored: string): { salt: Buffer; expected: Buffer } | undefined {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return undefined;
  const [, nString, rString, pString, saltHex, hashHex] = parts;
  if (nString !== String(SCRYPT_N) || rString !== String(SCRYPT_R) || pString !== String(SCRYPT_P)) return undefined;
  if (!new RegExp(`^[0-9a-f]{${SALT_LENGTH * 2}}$`, 'u').test(saltHex)) return undefined;
  if (!new RegExp(`^[0-9a-f]{${KEY_LENGTH * 2}}$`, 'u').test(hashHex)) return undefined;
  return { salt: Buffer.from(saltHex, 'hex'), expected: Buffer.from(hashHex, 'hex') };
}

function validateAccountRecord(value: unknown): AdminAccountRecord | undefined {
  if (!isPlainObject(value)) return undefined;
  const keys = Object.keys(value).sort();
  const versionedKeys = ['createdAt', 'passwordHash', 'schemaVersion', 'username'];
  const legacyKeys = ['createdAt', 'passwordHash', 'username'];
  const isVersioned = keys.length === versionedKeys.length && keys.every((key, index) => key === versionedKeys[index]);
  const isLegacy = keys.length === legacyKeys.length && keys.every((key, index) => key === legacyKeys[index]);
  if (!isVersioned && !isLegacy) return undefined;
  if (isVersioned && value.schemaVersion !== ACCOUNT_SCHEMA_VERSION) return undefined;
  if (typeof value.username !== 'string' || value.username.length < 1 || value.username.length > MAX_USERNAME_CHARS) return undefined;
  if (value.username !== value.username.trim() || /[\u0000-\u001f\u007f]/u.test(value.username)) return undefined;
  if (typeof value.passwordHash !== 'string' || !parseStoredHash(value.passwordHash)) return undefined;
  if (!isExactIsoDate(value.createdAt)) return undefined;
  return {
    schemaVersion: ACCOUNT_SCHEMA_VERSION,
    username: value.username,
    passwordHash: value.passwordHash,
    createdAt: value.createdAt,
  };
}

function ensurePrivateDirectory(path: string): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { chmodSync(directory, 0o700); } catch { /* Windows does not implement POSIX modes. */ }
}

/** Publish a fully flushed private file without replacing an existing record. */
function writePrivateFileOnce(path: string, contents: string): void {
  ensurePrivateDirectory(path);
  const temporaryPath = `${path}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(descriptor, contents, { encoding: 'utf8' });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporaryPath, path);
    try { chmodSync(path, 0o600); } catch { /* Windows does not implement POSIX modes. */ }
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* Preserve the original failure. */ }
    }
    try { unlinkSync(temporaryPath); } catch { /* The temporary path may not exist. */ }
  }
}

export class FileAccountStore implements AccountStore {
  constructor(private readonly path: string) {}

  readState(): AccountReadResult {
    try {
      if (!existsSync(this.path)) return { state: 'missing' };
      const metadata = statSync(this.path);
      if (!metadata.isFile() || metadata.size < 2 || metadata.size > MAX_ACCOUNT_FILE_BYTES) {
        return { state: 'corrupt', reason: 'The administrator account record has an invalid size or file type.' };
      }
      const record = validateAccountRecord(JSON.parse(readFileSync(this.path, 'utf8')));
      if (!record) return { state: 'corrupt', reason: 'The administrator account record does not match the supported schema.' };
      return { state: 'valid', record };
    } catch (error) {
      if (isPlainObject(error) && error.code === 'ENOENT') return { state: 'missing' };
      return { state: 'corrupt', reason: 'The administrator account record could not be read safely.' };
    }
  }

  write(record: AdminAccountRecord): void {
    if (!validateAccountRecord(record)) throw new Error('The administrator account record is invalid.');
    writePrivateFileOnce(this.path, `${JSON.stringify(record, null, 2)}\n`);
  }
}

export function hashPassword(password: string): string {
  const violation = passwordPolicyViolation(password);
  if (violation) throw new Error(violation);
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** A malformed or unsupported stored hash always fails closed. */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_CHARS) return false;
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  try {
    const derived = scryptSync(password, parsed.salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    return timingSafeEqual(derived, parsed.expected);
  } catch {
    return false;
  }
}

export function passwordPolicyViolation(password: string): string | undefined {
  if (typeof password !== 'string' || password.length < 12) return 'The password must be at least 12 characters.';
  if (password.length > MAX_PASSWORD_CHARS) return `The password must be no longer than ${MAX_PASSWORD_CHARS} characters.`;
  return undefined;
}

interface SessionRecord {
  id: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionStoreOptions {
  signingKey: Buffer;
  ttlMs?: number;
  maxSessions?: number;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly key: Buffer;
  private readonly ttlMs: number;
  private readonly maxSessions: number;

  constructor(options: SessionStoreOptions) {
    if (options.signingKey.length !== 32) throw new Error('The session signing key is invalid.');
    this.key = options.signingKey;
    this.ttlMs = Math.max(60_000, Math.min(options.ttlMs ?? SESSION_TTL_MS, SESSION_TTL_MS));
    this.maxSessions = Math.max(1, Math.min(options.maxSessions ?? MAX_SESSIONS, MAX_SESSIONS));
  }

  create(username: string): { cookieValue: string; expiresAt: Date } {
    this.pruneExpired();
    while (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (!oldest) break;
      this.sessions.delete(oldest);
    }
    const id = randomBytes(32).toString('base64url');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    this.sessions.set(id, { id, username, createdAt: now, expiresAt });
    return { cookieValue: this.sign(id), expiresAt: new Date(expiresAt) };
  }

  verify(cookieValue: string | undefined): { username: string } | undefined {
    this.pruneExpired();
    if (!cookieValue || cookieValue.length > 256) return undefined;
    const id = this.unsign(cookieValue);
    const record = id ? this.sessions.get(id) : undefined;
    return record ? { username: record.username } : undefined;
  }

  revoke(cookieValue: string | undefined): void {
    const id = cookieValue ? this.unsign(cookieValue) : undefined;
    if (id) this.sessions.delete(id);
  }

  revokeAll(username: string): number {
    let revoked = 0;
    for (const [id, record] of this.sessions) {
      if (record.username === username) {
        this.sessions.delete(id);
        revoked += 1;
      }
    }
    return revoked;
  }

  activeCount(): number {
    this.pruneExpired();
    return this.sessions.size;
  }

  private pruneExpired(now = Date.now()): void {
    for (const [id, record] of this.sessions) if (record.expiresAt <= now) this.sessions.delete(id);
  }

  private sign(id: string): string {
    return `${id}.${createHmac('sha256', this.key).update(id).digest('base64url')}`;
  }

  private unsign(cookieValue: string): string | undefined {
    const dot = cookieValue.lastIndexOf('.');
    if (dot <= 0) return undefined;
    const id = cookieValue.slice(0, dot);
    const mac = cookieValue.slice(dot + 1);
    if (!/^[A-Za-z0-9_-]{43}$/u.test(id) || !/^[A-Za-z0-9_-]{43}$/u.test(mac)) return undefined;
    const expectedMac = createHmac('sha256', this.key).update(id).digest('base64url');
    const supplied = Buffer.from(mac, 'ascii');
    const expected = Buffer.from(expectedMac, 'ascii');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? id : undefined;
  }
}

interface AttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptRecord>();

  constructor(
    private readonly maxAttempts = MAX_ATTEMPTS,
    private readonly windowMs = LOCKOUT_WINDOW_MS,
    private readonly maxSources = MAX_RATE_LIMIT_SOURCES,
  ) {}

  check(sourceKey: string): { message: string; retryAfterSeconds: number } | undefined {
    const now = Date.now();
    this.prune(now);
    const record = this.attempts.get(sourceKey.slice(0, 128));
    if (!record?.lockedUntil || now >= record.lockedUntil) return undefined;
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      message: `Too many failed attempts. Try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
      retryAfterSeconds,
    };
  }

  recordFailure(sourceKey: string): void {
    const now = Date.now();
    this.prune(now);
    const key = sourceKey.slice(0, 128);
    const existing = this.attempts.get(key);
    if (!existing || now - existing.windowStart >= this.windowMs) {
      this.ensureCapacity();
      this.attempts.set(key, { count: 1, windowStart: now });
      return;
    }
    existing.count += 1;
    if (existing.count >= this.maxAttempts) existing.lockedUntil = now + this.windowMs;
  }

  recordSuccess(sourceKey: string): void {
    this.attempts.delete(sourceKey.slice(0, 128));
  }

  private prune(now: number): void {
    for (const [key, record] of this.attempts) {
      const lockExpired = !record.lockedUntil || record.lockedUntil <= now;
      if (lockExpired && now - record.windowStart >= this.windowMs) this.attempts.delete(key);
    }
  }

  private ensureCapacity(): void {
    while (this.attempts.size >= Math.max(1, this.maxSources)) {
      const oldest = this.attempts.keys().next().value as string | undefined;
      if (!oldest) return;
      this.attempts.delete(oldest);
    }
  }
}

export function createAdminAccount(store: AccountStore, username: string, password: string): AdminAccountRecord {
  const current = store.readState();
  if (current.state === 'valid') throw new Error('An administrator account already exists.');
  if (current.state === 'corrupt') throw new Error('The existing administrator account record must be recovered before setup can continue.');
  const trimmedUsername = username.trim();
  if (!trimmedUsername) throw new Error('A username is required.');
  if (trimmedUsername.length > MAX_USERNAME_CHARS) throw new Error(`The username must be no longer than ${MAX_USERNAME_CHARS} characters.`);
  if (/[\u0000-\u001f\u007f]/u.test(trimmedUsername)) throw new Error('The username contains unsupported control characters.');
  const violation = passwordPolicyViolation(password);
  if (violation) throw new Error(violation);
  const record: AdminAccountRecord = {
    schemaVersion: ACCOUNT_SCHEMA_VERSION,
    username: trimmedUsername,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  store.write(record);
  return record;
}

export function hasAdminAccount(store: AccountStore): boolean {
  return store.readState().state === 'valid';
}

export function loadOrCreateSigningKey(path: string): Buffer {
  if (existsSync(path)) {
    const metadata = statSync(path);
    if (!metadata.isFile() || metadata.size > 128) throw new Error('The session signing key file is invalid.');
    const encoded = readFileSync(path, 'utf8').trim();
    if (!/^[0-9a-f]{64}$/u.test(encoded)) throw new Error('The session signing key file is corrupt.');
    return Buffer.from(encoded, 'hex');
  }
  const key = randomBytes(32);
  writePrivateFileOnce(path, `${key.toString('hex')}\n`);
  return key;
}

