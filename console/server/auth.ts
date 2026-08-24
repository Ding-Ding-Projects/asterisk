/**
 * Server-mode authentication: a single local admin account, a memory-hard password
 * hash, and signed session cookies. No dependency beyond Node's own standard library —
 * `node:crypto` ships scrypt, a CSPRNG and constant-time comparison, which is everything
 * this needs.
 *
 * Threat model: this guards a PBX administration surface reachable over a network. It is
 * deliberately conservative — bounded login attempts, no password ever logged or
 * returned, sessions that expire and can be revoked — but it is not a general-purpose
 * identity system. One admin account is the whole model, matching what a single
 * appliance-style install actually needs.
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

const SCRYPT_N = 16384; // CPU/memory cost — Node's documented interactive default.
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export interface AdminAccountRecord {
  username: string;
  /** `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>` — never the plaintext password. */
  passwordHash: string;
  createdAt: string;
}

export interface AccountStore {
  read(): AdminAccountRecord | undefined;
  write(record: AdminAccountRecord): void;
}

export class FileAccountStore implements AccountStore {
  constructor(private readonly path: string) {}
  read() {
    if (!existsSync(this.path)) return undefined;
    try {
      return JSON.parse(readFileSync(this.path, 'utf8')) as AdminAccountRecord;
    } catch {
      return undefined;
    }
  }
  write(record: AdminAccountRecord) {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(record, null, 2), { mode: 0o600 });
    renameSync(temporary, this.path);
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Never throws on a malformed stored hash — a corrupt record must fail closed as "wrong
 *  password", never as a crash that could be mistaken for something else. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = scryptSync(password, salt, expected.length, { N: n, r, p });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** A password the account never gets to have. Kept intentionally small and stated
 *  plainly in the failure message rather than hidden as a bare rejection. */
export function passwordPolicyViolation(password: string): string | undefined {
  if (typeof password !== 'string' || password.length < 12) return 'The password must be at least 12 characters.';
  return undefined;
}

// ---------------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------------

interface SessionRecord {
  id: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionStoreOptions {
  /** HMAC signing key for the session cookie, generated fresh on first run and kept in
   *  the same account file's directory. Rotating it invalidates every existing session,
   *  which is the correct behaviour for a compromised key. */
  signingKey: Buffer;
  ttlMs?: number;
}

/**
 * In-memory session table plus HMAC-signed cookie values. The cookie carries only a
 * random session id — never any user data — so a stolen cookie is exactly as powerful
 * as, and no more than, a stolen session id, and revocation is a single map delete.
 */
export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly key: Buffer;
  private readonly ttlMs: number;

  constructor(options: SessionStoreOptions) {
    this.key = options.signingKey;
    this.ttlMs = options.ttlMs ?? SESSION_TTL_MS;
  }

  create(username: string): { cookieValue: string; expiresAt: Date } {
    const id = randomBytes(32).toString('base64url');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    this.sessions.set(id, { id, username, createdAt: now, expiresAt });
    return { cookieValue: this.sign(id), expiresAt: new Date(expiresAt) };
  }

  /** Verifies the HMAC, then the session's own expiry. Returns the username on success. */
  verify(cookieValue: string | undefined): { username: string } | undefined {
    if (!cookieValue) return undefined;
    const id = this.unsign(cookieValue);
    if (!id) return undefined;
    const record = this.sessions.get(id);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      this.sessions.delete(id);
      return undefined;
    }
    return { username: record.username };
  }

  revoke(cookieValue: string | undefined) {
    const id = cookieValue ? this.unsign(cookieValue) : undefined;
    if (id) this.sessions.delete(id);
  }

  /** Test/ops hook: number of live (unexpired) sessions. */
  activeCount(): number {
    const now = Date.now();
    let count = 0;
    for (const record of this.sessions.values()) if (record.expiresAt > now) count++;
    return count;
  }

  private sign(id: string): string {
    const mac = createHmac('sha256', this.key).update(id).digest('base64url');
    return `${id}.${mac}`;
  }

  private unsign(cookieValue: string): string | undefined {
    const dot = cookieValue.lastIndexOf('.');
    if (dot < 0) return undefined;
    const id = cookieValue.slice(0, dot);
    const mac = cookieValue.slice(dot + 1);
    const expectedMac = createHmac('sha256', this.key).update(id).digest('base64url');
    const macBuf = Buffer.from(mac);
    const expectedBuf = Buffer.from(expectedMac);
    if (macBuf.length !== expectedBuf.length) return undefined;
    if (!timingSafeEqual(macBuf, expectedBuf)) return undefined;
    return id;
  }
}

// ---------------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------------

interface AttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

/**
 * Bounded login attempts per source address. Deliberately per-IP rather than
 * per-username, so an attacker cannot lock the real admin out by repeatedly failing
 * with the correct username from elsewhere — they only ever exhaust their own budget.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptRecord>();
  constructor(private readonly maxAttempts = MAX_ATTEMPTS, private readonly windowMs = LOCKOUT_WINDOW_MS) {}

  /** Returns the exact reason a login must be refused before it is even attempted, or
   *  `undefined` when the source may proceed. */
  check(sourceKey: string): string | undefined {
    const record = this.attempts.get(sourceKey);
    if (!record) return undefined;
    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const seconds = Math.ceil((record.lockedUntil - now) / 1000);
      return `Too many failed attempts. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
    }
    if (record.lockedUntil && now >= record.lockedUntil) {
      this.attempts.delete(sourceKey);
    }
    return undefined;
  }

  recordFailure(sourceKey: string) {
    const now = Date.now();
    const existing = this.attempts.get(sourceKey);
    if (!existing || now - existing.windowStart > this.windowMs) {
      this.attempts.set(sourceKey, { count: 1, windowStart: now });
      return;
    }
    existing.count += 1;
    if (existing.count >= this.maxAttempts) existing.lockedUntil = now + this.windowMs;
  }

  recordSuccess(sourceKey: string) {
    this.attempts.delete(sourceKey);
  }
}

// ---------------------------------------------------------------------------------
// Account bootstrap
// ---------------------------------------------------------------------------------

/** True until the very first admin account is created — this is what gates the
 *  first-run setup screen instead of the ordinary login form. */
export function hasAdminAccount(store: AccountStore): boolean {
  return store.read() !== undefined;
}

export function createAdminAccount(store: AccountStore, username: string, password: string): AdminAccountRecord {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) throw new Error('A username is required.');
  const violation = passwordPolicyViolation(password);
  if (violation) throw new Error(violation);
  const record: AdminAccountRecord = { username: trimmedUsername, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  store.write(record);
  return record;
}

export function loadOrCreateSigningKey(path: string): Buffer {
  if (existsSync(path)) return Buffer.from(readFileSync(path, 'utf8').trim(), 'hex');
  const key = randomBytes(32);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, key.toString('hex'), { mode: 0o600 });
  return key;
}
