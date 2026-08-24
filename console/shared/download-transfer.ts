/**
 * Typed handoff and transfer contracts for the browser-extension download
 * capture surfaces. The extension owns the handoff; the desktop boundary owns
 * the transfer and emits observed snapshots. Renderer surfaces never invent
 * progress, rates, ETAs, or completion states.
 */

export type DownloadSurfaceKind = 'start' | 'progress' | 'complete';

export type DownloadTransferStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

export type DownloadCommand = 'start' | 'cancel' | 'pause' | 'resume' | 'retry' | 'discard';

export type UnsavedWorkState = 'none' | 'preserved' | 'pending';

export interface DownloadUnsavedWork {
  state: UnsavedWorkState;
  /** Human-readable scope, not a path or document body. */
  detail?: string;
}

/** The only payload a browser extension may use to request a download surface. */
export interface ExtensionDownloadHandoff {
  kind: 'browser-extension-download';
  handoffId: string;
  fileName: string;
  sourceUrl: string;
  destinationPath: string;
  destinationKind: 'file' | 'folder';
  totalBytes?: number;
  createdAt: string;
  unsavedWork: DownloadUnsavedWork;
}

export interface TransferError {
  code: string;
  message: string;
  retryable: boolean;
  observedAt: string;
}

export type TransferTimeoutKind = 'header' | 'body-idle' | 'total';

export interface DownloadResumeSupport {
  acceptRanges: boolean;
  etag?: string;
  lastModified?: string;
}

export interface PartialTransferOutcome {
  bytesTransferred: number;
  reason: string;
  canResume: boolean;
}

/** A server/client observation. All numeric progress values originate here. */
export interface DownloadTransferSnapshot {
  transferId: string;
  handoffId: string;
  fileName: string;
  sourceUrl: string;
  destinationPath: string;
  status: DownloadTransferStatus;
  bytesTransferred: number;
  totalBytes?: number;
  rateBytesPerSecond?: number;
  etaSeconds?: number;
  deadlineAt?: string;
  observedAt: string;
  error?: TransferError;
  timeoutKind?: TransferTimeoutKind;
  bodyComplete?: boolean;
  publicationPending?: boolean;
  publicationSize?: number;
  publicationSha256?: string;
  cleanupCompleted?: boolean;
  cleanupError?: TransferError;
  partial?: PartialTransferOutcome;
  resume?: DownloadResumeSupport;
  resumeDisabledReason?: string;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canRetry: boolean;
}

export interface DownloadTransferReceipt {
  command: DownloadCommand;
  handoffId: string;
  transferId?: string;
  accepted: boolean;
  observedAt: string;
  status: DownloadTransferStatus | 'rejected';
  code?: string;
  detail?: string;
}

export interface DownloadTransferClient {
  start(handoff: ExtensionDownloadHandoff): Promise<DownloadTransferReceipt>;
  cancelHandoff(handoffId: string): Promise<DownloadTransferReceipt>;
  command(transferId: string, command: Exclude<DownloadCommand, 'start'>): Promise<DownloadTransferReceipt>;
  subscribe(transferId: string, listener: (snapshot: DownloadTransferSnapshot) => void): () => void;
}

export interface DownloadWindowIntent {
  alwaysOnTop: boolean;
  presentation: 'blocking-decision' | 'non-blocking-progress' | 'non-blocking-completion';
  returnFocus: 'originating-control' | 'surface';
  respectsReducedMotion: boolean;
}

export interface DownloadSurfaceRegistration {
  kind: DownloadSurfaceKind;
  route: string;
  intent: DownloadWindowIntent;
  requires: 'extension-handoff' | 'transfer-snapshot';
}

export const DOWNLOAD_WINDOW_INTENTS: Readonly<Record<DownloadSurfaceKind, DownloadWindowIntent>> = {
  start: {
    alwaysOnTop: true,
    presentation: 'blocking-decision',
    returnFocus: 'originating-control',
    respectsReducedMotion: true,
  },
  progress: {
    alwaysOnTop: true,
    presentation: 'non-blocking-progress',
    returnFocus: 'originating-control',
    respectsReducedMotion: true,
  },
  complete: {
    alwaysOnTop: true,
    presentation: 'non-blocking-completion',
    returnFocus: 'surface',
    respectsReducedMotion: true,
  },
};

export const DOWNLOAD_SURFACE_REGISTRATIONS: ReadonlyArray<DownloadSurfaceRegistration> = [
  { kind: 'start', route: 'download/start', intent: DOWNLOAD_WINDOW_INTENTS.start, requires: 'extension-handoff' },
  { kind: 'progress', route: 'download/progress', intent: DOWNLOAD_WINDOW_INTENTS.progress, requires: 'transfer-snapshot' },
  { kind: 'complete', route: 'download/complete', intent: DOWNLOAD_WINDOW_INTENTS.complete, requires: 'transfer-snapshot' },
];

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function validIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Runtime boundary check for extension messages before a client sees them. */
export function isExtensionDownloadHandoff(value: unknown): value is ExtensionDownloadHandoff {
  if (!value || typeof value !== 'object') return false;
  const handoff = value as Partial<ExtensionDownloadHandoff>;
  if (handoff.kind !== 'browser-extension-download') return false;
  if (!boundedText(handoff.handoffId, 160) || !boundedText(handoff.fileName, 255)) return false;
  if (!boundedText(handoff.sourceUrl, 4096) || !boundedText(handoff.destinationPath, 4096)) return false;
  try {
    if (new URL(handoff.sourceUrl).protocol !== 'https:') return false;
  } catch {
    return false;
  }
  if (handoff.destinationKind !== 'file' && handoff.destinationKind !== 'folder') return false;
  if (!validIso(handoff.createdAt)) return false;
  if (handoff.totalBytes !== undefined && (!Number.isSafeInteger(handoff.totalBytes) || handoff.totalBytes < 0)) return false;
  const unsaved = handoff.unsavedWork;
  if (!unsaved || typeof unsaved !== 'object') return false;
  if (unsaved.state !== 'none' && unsaved.state !== 'preserved' && unsaved.state !== 'pending') return false;
  return unsaved.detail === undefined || boundedText(unsaved.detail, 512);
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return 'Unknown';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let index = -1;
  do {
    value /= 1024;
    index += 1;
  } while (value >= 1024 && index < units.length - 1);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

export function formatRate(bytesPerSecond: number | undefined): string {
  return bytesPerSecond === undefined ? 'Unknown' : `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return 'Unknown';
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return minutes > 0 ? `${minutes}m ${String(remaining).padStart(2, '0')}s` : `${remaining}s`;
}
