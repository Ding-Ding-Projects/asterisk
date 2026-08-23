// Local, offline TOTP (RFC 6238) over HOTP (RFC 4226), plus base32 and
// otpauth:// pairing-URI helpers. No network, no dependency: only Web Crypto.

export interface TotpParameters {
  secret: string;
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  digits?: number;
  period?: number;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeAlgorithm(algorithm: TotpParameters['algorithm']): 'SHA-1' | 'SHA-256' | 'SHA-512' {
  return algorithm ?? 'SHA-1';
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
  return secret;
}

// -------------------------------------------------------------- base32 (RFC 4648)

export function decodeBase32(value: string): Uint8Array {
  const cleaned = value.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase();
  if (cleaned.length === 0) {
    throw new Error('base32 value must not be empty');
  }
  let bits = '';
  for (const ch of cleaned) {
    const index = BASE32_ALPHABET.indexOf(ch);
    if (index === -1) {
      throw new Error(`invalid base32 character: ${ch}`);
    }
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

function counterBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return bytes;
}

async function hotp(
  secretBytes: Uint8Array,
  counter: number,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512',
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
    const candidateMs = step * period * 1000;
    // eslint-disable-next-line no-await-in-loop
    const candidate = await generateCode(parameters, candidateMs);
    if (candidate === code) {
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

export function pairingUri(request: PairingRequest): string {
  const { issuer, account, parameters } = request;
  const secret = requireSecret(parameters.secret);
  const algorithm = normalizeAlgorithm(parameters.algorithm);
  const digits = normalizeDigits(parameters.digits);
  const period = normalizePeriod(parameters.period);

  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm,
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function parsePairingUri(uri: string): PairingRequest {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(`invalid pairing URI: ${uri}`);
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
  const algorithmRaw = (parsed.searchParams.get('algorithm') ?? 'SHA1').toUpperCase().replace('-', '');
  const algorithm = (algorithmRaw === 'SHA1' ? 'SHA-1' : `SHA-${algorithmRaw.slice(3)}`) as
    | 'SHA-1'
    | 'SHA-256'
    | 'SHA-512';
  const digitsRaw = parsed.searchParams.get('digits');
  const periodRaw = parsed.searchParams.get('period');

  return {
    issuer,
    account,
    parameters: {
      secret,
      algorithm,
      digits: digitsRaw ? Number(digitsRaw) : 6,
      period: periodRaw ? Number(periodRaw) : 30,
    },
  };
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
