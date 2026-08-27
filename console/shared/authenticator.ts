/**
 * Data-only authenticator contracts shared by the renderer and control plane.
 *
 * Secret material is intentionally absent from every record returned by this module.
 * A caller receives a secret only at registration time, passes it to a vault adapter,
 * and receives a redacted result. The adapter is the only persistence boundary.
 */

export const AUTHENTICATOR_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-512'] as const;
export type AuthenticatorAlgorithm = (typeof AUTHENTICATOR_ALGORITHMS)[number];

export interface AuthenticatorParameters {
  algorithm: AuthenticatorAlgorithm;
  digits: 6 | 7 | 8;
  period: number;
}

export interface AuthenticatorEntry {
  id: string;
  issuer: string;
  account: string;
  parameters: AuthenticatorParameters;
  armed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatorEntryRecord extends AuthenticatorEntry {
  /** Stable account reference in the operating-system credential vault. */
  credentialReference: string;
}

export interface AuthenticatorRegistration {
  issuer: string;
  account: string;
  secret: string;
  algorithm?: AuthenticatorAlgorithm;
  digits?: number;
  period?: number;
}

export interface CredentialVault {
  readonly available: boolean;
  setSecret(key: string, secret: string): Promise<VaultResult<undefined>>;
  getSecret(key: string): Promise<VaultResult<string>>;
  deleteSecret(key: string): Promise<VaultResult<undefined>>;
}

export type VaultResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'vault-unavailable' | 'vault-error'; message: string };

export type AuthenticatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: AuthenticatorErrorCode; message: string };

export type AuthenticatorErrorCode =
  | 'invalid-input'
  | 'invalid-secret'
  | 'vault-unavailable'
  | 'vault-error'
  | 'confirmation-required'
  | 'confirmation-failed'
  | 'metadata-unavailable'
  | 'metadata-error'
  | 'duplicate-entry'
  | 'not-found';

const MAX_TEXT = 256;
const MAX_SECRET = 512;

function text(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_TEXT) throw new Error(`${field} must be 1-${MAX_TEXT} characters`);
  return normalized;
}

function parameters(input: AuthenticatorRegistration): AuthenticatorParameters {
  const algorithm = input.algorithm ?? 'SHA-1';
  if (!AUTHENTICATOR_ALGORITHMS.includes(algorithm)) throw new Error('unsupported algorithm');
  const digits = input.digits ?? 6;
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) throw new Error('digits must be an integer from 6 to 8');
  const period = input.period ?? 30;
  if (!Number.isInteger(period) || period < 1 || period > 86400) throw new Error('period must be a positive integer up to 86400 seconds');
  return { algorithm, digits: digits as 6 | 7 | 8, period };
}

function validateSecret(secret: string): string {
  const normalized = secret.replace(/\s+/gu, '').replace(/=+$/u, '').toUpperCase();
  if (
    !normalized ||
    normalized.length > MAX_SECRET ||
    !/^[A-Z2-7]+$/u.test(normalized) ||
    [1, 3, 6].includes(normalized.length % 8)
  ) {
    throw new Error('secret is not a bounded RFC 4648 base32 value');
  }
  return normalized;
}

const ENTRY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;

export function normalizeRegistration(input: AuthenticatorRegistration, id: string): AuthenticatorResult<{
  id: string;
  issuer: string;
  account: string;
  secret: string;
  parameters: AuthenticatorParameters;
}> {
  try {
    if (!input || typeof input !== 'object') throw new Error('registration is required');
    const issuer = text(input.issuer, 'issuer');
    const account = text(input.account, 'account');
    const secret = validateSecret(input.secret);
    const normalizedParameters = parameters(input);
    if (!ENTRY_ID.test(id)) throw new Error('entry identity source returned an invalid value');
    return { ok: true, value: { id, issuer, account, secret, parameters: normalizedParameters } };
  } catch (error) {
    return { ok: false, code: 'invalid-input', message: error instanceof Error ? error.message : 'invalid registration' };
  }
}

export function redactAuthenticatorEntry(entry: AuthenticatorEntryRecord): AuthenticatorEntry {
  const { credentialReference: _credentialReference, ...safe } = entry;
  return { ...safe, parameters: { ...safe.parameters } };
}
