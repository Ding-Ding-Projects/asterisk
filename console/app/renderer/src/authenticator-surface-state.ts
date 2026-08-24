import type {
  AuthenticatorEntry,
  AuthenticatorParameters,
  AuthenticatorRegistration,
  AuthenticatorResult,
  AuthenticatorCodeSnapshot,
  AuthenticatorReconciliationReceipt,
  AuthenticatorRemovalReceipt,
} from '../../../shared/authenticator';
import { MAX_AUTHENTICATOR_PAIRING_BYTES } from '../../../shared/authenticator';
import type { HistoryRestoreReceipt } from '../../../shared/history';
import { pairingUri, type TotpAlgorithm } from './totp';
import { qrMatrix } from './qr';

export type { AuthenticatorCodeSnapshot } from '../../../shared/authenticator';

export const AUTH_UI_DEADLINE_MS = 8_000;

export interface AuthenticatorClient {
  list(): Promise<AuthenticatorResult<ReadonlyArray<AuthenticatorEntry>>>;
  register(input: AuthenticatorRegistration): Promise<AuthenticatorResult<AuthenticatorEntry>>;
  confirmAndArm(id: string, code: string): Promise<AuthenticatorResult<AuthenticatorEntry>>;
  remove(id: string): Promise<AuthenticatorRemovalReceipt>;
  codeSnapshot(id: string): Promise<AuthenticatorResult<AuthenticatorCodeSnapshot>>;
  reconciliation?(): Promise<AuthenticatorReconciliationReceipt>;
}

export interface AuthenticatorHistoryClient {
  record(entry: { action: 'created' | 'updated' | 'deleted'; subject: string; stableRecordId: string; snapshot?: unknown }): Promise<{ ok: boolean; warning?: string }>;
  list?(): Promise<{ status: 'verified-empty' | 'verified' | 'unavailable' | 'malformed'; entries: ReadonlyArray<{ commitId: string; timestamp: string; action: string; subject: string }>; warning?: string }>;
  restore?(commitId: string): Promise<HistoryRestoreReceipt>;
}

export type PairingDescriptor = {
  uri: string;
  issuer: string;
  account: string;
  manualSecret: string;
  parameters: AuthenticatorParameters;
  /** The URI is passed to a local QR renderer by the host surface. */
  qrValue: string;
  qrAccessibleLabel: string;
  qrMatrix: boolean[][];
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
  if (new TextEncoder().encode(uri).byteLength > MAX_AUTHENTICATOR_PAIRING_BYTES) throw new Error(`The pairing value exceeds the bundled QR capacity of ${MAX_AUTHENTICATOR_PAIRING_BYTES} bytes.`);
  return {
    uri,
    issuer: input.issuer.trim(),
    account: input.account.trim(),
    manualSecret: input.secret.replace(/\s+/gu, '').replace(/=+$/u, '').toUpperCase(),
    parameters,
    qrValue: uri,
    qrAccessibleLabel: `Local QR pairing for ${input.issuer.trim()} and ${input.account.trim()}. The same pairing value is available as a manual code.`,
    qrMatrix: qrMatrix(uri),
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


export async function recordAuthHistory(
  history: AuthenticatorHistoryClient | undefined,
  entry: { action: 'created' | 'updated' | 'deleted'; subject: string; stableRecordId: string; snapshot?: unknown },
): Promise<{ ok: boolean; warning?: string }> {
  if (!history) return { ok: true };
  try {
    const result = await withDeadline(history.record(entry));
    return result;
  } catch { return { ok: false, warning: 'The live change succeeded, but its local history receipt is unavailable.' }; }
}
