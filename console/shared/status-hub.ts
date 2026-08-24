/**
 * Public, renderer-safe Status Hub contracts.
 *
 * Credential values never cross this boundary. The only credential shape exposed
 * here is an opaque reference that a privileged host resolves from its vault.
 * Every payload is bounded so a malformed Hub response cannot become an
 * unbounded renderer object or a durable local record.
 */

export const STATUS_HUB_SCHEMA_VERSION = 1 as const;

export const STATUS_HUB_BOUNDS = {
  projectId: 128,
  projectName: 160,
  branch: 128,
  commit: 64,
  runId: 128,
  runUrl: 2048,
  evidenceUrl: 2048,
  stableUrl: 2048,
  sessionId: 160,
  sessionName: 160,
  questionId: 160,
  cursor: 512,
  message: 1000,
  responseBytes: 512 * 1024,
  questionAnswer: 4000,
  listEntries: 500,
} as const;

export type StatusHubAvailability =
  | 'ready'
  | 'loading'
  | 'unavailable'
  | 'offline'
  | 'authRequired'
  | 'refused'
  | 'stale'
  | 'partial'
  | 'error';

export type StatusHubSessionState =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'failed'
  | 'verified'
  | 'completed'
  | 'cancelled'
  | 'unknown';

export type StatusHubEvidenceKind = 'commit' | 'run' | 'capture' | 'artifact' | 'document' | 'other';

export interface StatusHubEvidenceLink {
  kind: StatusHubEvidenceKind;
  label: string;
  url: string;
  commit?: string;
}

export interface StatusHubCheck {
  id: string;
  label: string;
  state: 'unrun' | 'running' | 'failed' | 'passed' | 'unknown';
  runUrl?: string;
  commit?: string;
  detail?: string;
}

export interface StatusHubProjectRegistration {
  projectId: string;
  projectName: string;
  defaultBranch: string;
  releaseChannel: string;
  stableUrl: string;
  registeredAt: string;
  commit?: string;
  checks: readonly StatusHubCheck[];
  evidence: readonly StatusHubEvidenceLink[];
}

export interface StatusHubProjectRegistrationRequest {
  projectId: string;
  projectName: string;
  defaultBranch: string;
  releaseChannel: string;
  stableUrl: string;
  commit?: string;
}

export interface StatusHubSession {
  id: string;
  projectId: string;
  name: string;
  state: StatusHubSessionState;
  commit?: string;
  runId?: string;
  runUrl?: string;
  evidence: readonly StatusHubEvidenceLink[];
  startedAt?: string;
  updatedAt: string;
  detail?: string;
}

export interface StatusHubReply {
  id: string;
  sessionId: string;
  body: string;
  createdAt: string;
  source: 'hub' | 'discord' | 'owner' | 'unknown';
}

export interface StatusHubReplyInbox {
  sessionId: string;
  replies: readonly StatusHubReply[];
  nextCursor?: string;
  observedAt: string;
}

export type StatusHubQuestionReceiptState = 'accepted' | 'duplicate' | 'refused' | 'unauthorized' | 'unknown';

export interface StatusHubQuestionDeliveryReceipt {
  questionId: string;
  sessionId: string;
  receiptId: string;
  state: StatusHubQuestionReceiptState;
  acceptedAt?: string;
  detail?: string;
}

export interface StatusHubQuestion {
  id: string;
  sessionId: string;
  prompt: string;
  options: readonly string[];
  freeTextAllowed: boolean;
  answered: boolean;
  receipt?: StatusHubQuestionDeliveryReceipt;
}

export interface StatusHubSessionSnapshot {
  session: StatusHubSession;
  questions: readonly StatusHubQuestion[];
  inbox: StatusHubReplyInbox;
}

/** A vault locator, never the credential value itself. */
export type StatusHubVaultReference = string & { readonly __statusHubVaultReference: unique symbol };

export interface StatusHubCredentialReferences {
  enrollment?: StatusHubVaultReference;
  reply?: StatusHubVaultReference;
}

export interface StatusHubErrorShape {
  state: Exclude<StatusHubAvailability, 'ready' | 'loading'>;
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
}

export interface StatusHubClientState {
  availability: StatusHubAvailability;
  project?: StatusHubProjectRegistration;
  sessions: readonly StatusHubSession[];
  snapshots: Readonly<Record<string, StatusHubSessionSnapshot>>;
  receipts: Readonly<Record<string, StatusHubQuestionDeliveryReceipt>>;
  nextCursor?: string;
  observedAt?: string;
  error?: StatusHubErrorShape;
  persistenceWarning?: StatusHubErrorShape;
  generation: number;
}

export function isStatusHubSessionState(value: unknown): value is StatusHubSessionState {
  return typeof value === 'string' && new Set<StatusHubSessionState>([
    'queued', 'running', 'waiting', 'blocked', 'failed', 'verified', 'completed', 'cancelled', 'unknown',
  ]).has(value as StatusHubSessionState);
}

export function isStatusHubReceiptState(value: unknown): value is StatusHubQuestionReceiptState {
  return value === 'accepted' || value === 'duplicate' || value === 'refused' || value === 'unauthorized' || value === 'unknown';
}
