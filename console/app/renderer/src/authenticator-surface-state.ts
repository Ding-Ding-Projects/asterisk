import type {
  AuthenticatorEntry,
  AuthenticatorParameters,
  AuthenticatorRegistration,
  AuthenticatorResult,
} from '../../../shared/authenticator';
import { generateCode, pairingUri, secondsRemaining, type TotpAlgorithm } from './totp';

export const AUTH_UI_DEADLINE_MS = 8_000;

export interface SecretReader {
  readSecret(entryId: string): Promise<{ ok: true; value: string } | { ok: false; message: string }>;
}

export interface AuthenticatorClient {
  list(): Promise<AuthenticatorResult<ReadonlyArray<AuthenticatorEntry>>>;
  register(input: AuthenticatorRegistration): Promise<AuthenticatorResult<AuthenticatorEntry>>;
  confirmAndArm(id: string, code: string, atMs: number, skewSteps?: number): Promise<AuthenticatorResult<AuthenticatorEntry>>;
  remove(id: string): Promise<AuthenticatorResult<undefined>>;
}

export interface AuthenticatorHistoryClient {
  record(entry: { action: 'created' | 'updated' | 'deleted'; subject: string; stableRecordId: string }): Promise<unknown>;
}

export type AuthenticatorCodeSnapshot = {
  current: string;
  next: string;
  secondsRemaining: number;
  clockWarning?: string;
};

export type PairingDescriptor = {
  uri: string;
  issuer: string;
  account: string;
  manualSecret: string;
  parameters: AuthenticatorParameters;
  /** The URI is passed to a local QR renderer by the host surface. */
  qrValue: string;
  qrAccessibleLabel: string;
};

export type AuthenticatorExportRow = Omit<AuthenticatorEntry, 'id'> & { id: string };

export function withDeadline<T>(promise: Promise<T>, timeoutMs = AUTH_UI_DEADLINE_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('The local authenticator request timed out.')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

export function buildPairingDescriptor(input: AuthenticatorRegistration): PairingDescriptor {
  const parameters: AuthenticatorParameters = {
    algorithm: (input.algorithm ?? 'SHA-1') as TotpAlgorithm,
    digits: (input.digits ?? 6) as 6 | 7 | 8,
    period: input.period ?? 30,
  };
  const uri = pairingUri({ issuer: input.issuer, account: input.account, parameters: { ...parameters, secret: input.secret } });
  return {
    uri,
    issuer: input.issuer.trim(),
    account: input.account.trim(),
    manualSecret: input.secret.replace(/\s+/gu, '').replace(/=+$/u, '').toUpperCase(),
    parameters,
    qrValue: uri,
    qrAccessibleLabel: `Local QR pairing for ${input.issuer.trim()} and ${input.account.trim()}. The same pairing value is available as a manual code.`,
  };
}

export function searchAuthenticatorEntries(
  entries: ReadonlyArray<AuthenticatorEntry>,
  query: string,
  regex: boolean,
  flags = 'iu',
): ReadonlyArray<AuthenticatorEntry> {
  const trimmed = query.trim();
  if (!trimmed) return entries;
  let matcher: RegExp | undefined;
  if (regex) {
    try { matcher = new RegExp(trimmed.slice(0, 512), flags.replace(/[^dgimsuvy]/gu, '')); } catch { return []; }
  }
  const needle = trimmed.toLocaleLowerCase();
  return entries.filter((entry) => {
    const haystack = `${entry.issuer} ${entry.account} ${entry.id}`;
    return matcher ? matcher.test(haystack) : haystack.toLocaleLowerCase().includes(needle);
  });
}

export function exportAuthenticatorEntries(entries: ReadonlyArray<AuthenticatorEntry>): {
  schemaVersion: 1;
  secretMaterial: 'omitted';
  entries: ReadonlyArray<AuthenticatorExportRow>;
  disclosure: string;
} {
  return {
    schemaVersion: 1,
    secretMaterial: 'omitted',
    entries: entries.map((entry) => ({ ...entry, parameters: { ...entry.parameters } })),
    disclosure: 'Secret material and vault references are omitted from ordinary exports.',
  };
}

export async function readCodeSnapshot(
  reader: SecretReader,
  entry: AuthenticatorEntry,
  atMs: number,
  clockOffsetMs = 0,
): Promise<AuthenticatorCodeSnapshot> {
  const secretResult = await withDeadline(reader.readSecret(entry.id));
  if (!secretResult.ok) throw new Error(secretResult.message);
  const parameters = { ...entry.parameters, secret: secretResult.value };
  const current = await withDeadline(generateCode(parameters, atMs));
  const next = await withDeadline(generateCode(parameters, atMs + entry.parameters.period * 1_000));
  const remaining = secondsRemaining(entry.parameters.period, atMs);
  const tolerance = entry.parameters.period * 1_000;
  const clockWarning = Math.abs(clockOffsetMs) > tolerance
    ? `This computer clock is about ${Math.round(Math.abs(clockOffsetMs) / 1_000)} seconds ${clockOffsetMs > 0 ? 'ahead of' : 'behind'} real time.`
    : undefined;
  return { current, next, secondsRemaining: remaining, clockWarning };
}

export async function recordAuthHistory(
  history: AuthenticatorHistoryClient | undefined,
  entry: { action: 'created' | 'updated' | 'deleted'; subject: string; stableRecordId: string },
): Promise<void> {
  if (!history) return;
  await withDeadline(history.record(entry)).catch(() => undefined);
}
