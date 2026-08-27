// Local, offline TOTP (RFC 6238) over HOTP (RFC 4226), plus base32 and
// otpauth:// pairing-URI helpers. No network, no dependency: only Web Crypto.

export interface TotpParameters {
  secret: string;
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  digits?: number;
  period?: number;
}

export const TOTP_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-512'] as const;
export type TotpAlgorithm = (typeof TOTP_ALGORITHMS)[number];

export const MAX_BASE32_LENGTH = 512;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeAlgorithm(algorithm: TotpParameters['algorithm']): TotpAlgorithm {
  const value = algorithm ?? 'SHA-1';
  if (!TOTP_ALGORITHMS.includes(value)) throw new Error(`unsupported TOTP algorithm: ${value}`);
  return value;
}

function normalizeDigits(digits: number | undefined): number {
  const value = digits ?? 6;
  if (!Number.isInteger(value) || value < 6 || value > 8) {
    throw new Error(`digits must be an integer between 6 and 8, got ${String(digits)}`);
  }
  return value;
}

function normalizePeriod(period: number | undefined): number {
  const value = period ?? 30;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`period must be a positive integer number of seconds, got ${String(period)}`);
  }
  return value;
}

function requireSecret(secret: string): string {
  if (!secret || secret.trim().length === 0) {
    throw new Error('secret must not be empty');
  }
  if (secret.length > MAX_BASE32_LENGTH) throw new Error(`secret exceeds ${MAX_BASE32_LENGTH} characters`);
  return secret.trim();
}

// -------------------------------------------------------------- base32 (RFC 4648)

export function decodeBase32(value: string): Uint8Array {
  const cleaned = value.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase();
  if (cleaned.length === 0) {
    throw new Error('base32 value must not be empty');
  }
  if (cleaned.length > MAX_BASE32_LENGTH) throw new Error(`base32 value exceeds ${MAX_BASE32_LENGTH} characters`);
  // Reject lexical corruption before evaluating the encoded shape.  A value such
  // as `JBSWY3DP1` has both a bad length and a bad character, but naming the
  // character gives the caller the actionable fact without weakening the
  // RFC 4648 length check that follows.
  for (const ch of cleaned) {
    if (BASE32_ALPHABET.indexOf(ch) === -1) {
      throw new Error(`invalid base32 character: ${ch}`);
    }
  }
  if ([1, 3, 6].includes(cleaned.length % 8)) throw new Error('base32 value has an invalid encoded length');
  let bits = '';
  for (const ch of cleaned) {
    const index = BASE32_ALPHABET.indexOf(ch);
    bits += index.toString(2).padStart(5, '0');
  }
  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

export function encodeBase32(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return out;
}

// -------------------------------------------------------------- HOTP/TOTP core

function counterBytes(counter: number | bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  if (typeof counter === 'number' && (!Number.isSafeInteger(counter) || counter < 0)) {
    throw new Error('counter must be a non-negative safe integer');
  }
  let value = typeof counter === 'bigint' ? counter : BigInt(counter);
  if (value < 0n || value > 0xffffffffffffffffn) throw new Error('counter is outside the unsigned 64-bit range');
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

async function hotp(
  secretBytes: Uint8Array,
  counter: number | bigint,
  algorithm: TotpAlgorithm,
  digits: number,
): Promise<string> {
  const rawKey = secretBytes.buffer.slice(
    secretBytes.byteOffset,
    secretBytes.byteOffset + secretBytes.byteLength,
  ) as ArrayBuffer;
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const counter8 = counterBytes(counter);
  const counterBuffer = counter8.buffer.slice(counter8.byteOffset, counter8.byteOffset + counter8.byteLength) as ArrayBuffer;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binCode =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  const modulus = 10 ** digits;
  return String(binCode % modulus).padStart(digits, '0');
}

function stepFor(atMs: number, period: number): number {
  if (!Number.isFinite(atMs) || atMs < 0) throw new Error('timestamp must be finite and non-negative');
  return Math.floor(atMs / 1000 / period);
}

export async function generateCode(parameters: TotpParameters, atMs: number): Promise<string> {
  const secret = requireSecret(parameters.secret);
  const algorithm = normalizeAlgorithm(parameters.algorithm);
  const digits = normalizeDigits(parameters.digits);
  const period = normalizePeriod(parameters.period);
  const secretBytes = decodeBase32(secret);
  return hotp(secretBytes, stepFor(atMs, period), algorithm, digits);
}

export async function verifyCode(parameters: TotpParameters, code: string, atMs: number, skewSteps = 0): Promise<boolean> {
  const digits = normalizeDigits(parameters.digits);
  if (typeof code !== 'string' || code.length !== digits || !/^\d+$/.test(code)) {
    return false;
  }
  const period = normalizePeriod(parameters.period);
  const currentStep = stepFor(atMs, period);
  const bound = Math.max(0, Math.floor(skewSteps));
  for (let delta = -bound; delta <= bound; delta++) {
    const step = currentStep + delta;
    if (step < 0) continue;
    const candidateMs = step * period * 1000;
    // eslint-disable-next-line no-await-in-loop
    const candidate = await generateCode(parameters, candidateMs);
    let difference = candidate.length ^ code.length;
    for (let index = 0; index < candidate.length; index += 1) {
      difference |= candidate.charCodeAt(index) ^ code.charCodeAt(index);
    }
    if (difference === 0) {
      return true;
    }
  }
  return false;
}

export function secondsRemaining(period: number, atMs: number): number {
  const normalizedPeriod = normalizePeriod(period);
  const elapsedInStep = (atMs / 1000) % normalizedPeriod;
  const remaining = normalizedPeriod - elapsedInStep;
  return remaining === normalizedPeriod ? normalizedPeriod : Math.ceil(remaining);
}

// -------------------------------------------------------------- pairing (otpauth://)

export interface PairingRequest {
  issuer: string;
  account: string;
  parameters: TotpParameters;
}

function requirePairingLabel(value: string, name: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 256 || /[\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new Error(`${name} must be a printable value between 1 and 256 characters`);
  }
  return trimmed;
}

export function pairingUri(request: PairingRequest): string {
  const issuer = requirePairingLabel(request.issuer, 'issuer');
  const account = requirePairingLabel(request.account, 'account');
  const { parameters } = request;
  const secret = requireSecret(parameters.secret);
  const algorithm = normalizeAlgorithm(parameters.algorithm);
  const digits = normalizeDigits(parameters.digits);
  const period = normalizePeriod(parameters.period);

  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: algorithm.replace('-', ''),
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function parsePairingUri(uri: string): PairingRequest {
  if (uri.length > 4096) throw new Error('pairing URI exceeds 4096 characters');
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('invalid pairing URI');
  }
  if (parsed.protocol !== 'otpauth:') {
    throw new Error(`pairing URI must use the otpauth scheme, got ${parsed.protocol}`);
  }
  if (parsed.host !== 'totp') {
    throw new Error(`pairing URI must be a totp URI, got host ${parsed.host}`);
  }

  const label = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const colonIndex = label.indexOf(':');
  let issuerFromLabel = '';
  let account = label;
  if (colonIndex !== -1) {
    issuerFromLabel = label.slice(0, colonIndex);
    account = label.slice(colonIndex + 1);
  }

  const secret = parsed.searchParams.get('secret');
  if (!secret) {
    throw new Error('pairing URI is missing a secret parameter');
  }
  const issuer = parsed.searchParams.get('issuer') ?? issuerFromLabel;
  if (issuerFromLabel && parsed.searchParams.has('issuer') && issuer !== issuerFromLabel) {
    throw new Error('pairing URI issuer does not match its label');
  }
  const algorithmRaw = (parsed.searchParams.get('algorithm') ?? 'SHA1').toUpperCase().replace('-', '');
  const algorithmCandidate = algorithmRaw === 'SHA1' ? 'SHA-1' : `SHA-${algorithmRaw.slice(3)}`;
  const algorithm = normalizeAlgorithm(algorithmCandidate as TotpParameters['algorithm']);
  const digitsRaw = parsed.searchParams.get('digits');
  const periodRaw = parsed.searchParams.get('period');

  const request = {
    issuer: requirePairingLabel(issuer, 'issuer'),
    account: requirePairingLabel(account, 'account'),
    parameters: {
      secret,
      algorithm,
      digits: digitsRaw ? Number(digitsRaw) : 6,
      period: periodRaw ? Number(periodRaw) : 30,
    },
  };
  requireSecret(request.parameters.secret);
  normalizeDigits(request.parameters.digits);
  normalizePeriod(request.parameters.period);
  return request;
}

// -------------------------------------------------------------- clock honesty

export function clockWarning(offsetMs: number, period: number): string | undefined {
  const normalizedPeriod = normalizePeriod(period);
  const toleranceMs = normalizedPeriod * 1000;
  if (Math.abs(offsetMs) <= toleranceMs) {
    return undefined;
  }
  const offsetSeconds = Math.round(Math.abs(offsetMs) / 1000);
  const direction = offsetMs > 0 ? 'ahead of' : 'behind';
  return `This computer clock appears to be about ${offsetSeconds}s ${direction} real time, which may cause authenticator codes to be rejected.`;
}
