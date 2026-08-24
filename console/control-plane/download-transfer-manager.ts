import { createHash } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readFileSync } from 'node:fs';
import { mkdir, open, stat, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  isExtensionDownloadHandoff,
  type DownloadCommand,
  type DownloadResumeSupport,
  type DownloadTransferClient,
  type DownloadTransferReceipt,
  type DownloadTransferSnapshot,
  type ExtensionDownloadHandoff,
  type TransferTimeoutKind,
} from '../shared/download-transfer.js';
import { atomicWriteFileSync, renameWithRetrySync } from './atomic-file.js';

const SCHEMA_VERSION = 2;
const MAX_SNAPSHOTS = 200;
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024 * 1024;
const HEADER_DEADLINE_MS = 15_000;
const BODY_IDLE_DEADLINE_MS = 30_000;
const TOTAL_DEADLINE_MS = 2 * 60 * 60 * 1000;
const MAX_DESTINATION_COMPONENTS = 64;
const REPARSE_INSPECTION_DEADLINE_MS = 10_000;
const INTEGRITY_READ_DEADLINE_MS = 30_000;
const SNAPSHOT_STATUSES = new Set(['queued', 'downloading', 'paused', 'completed', 'failed', 'cancelled', 'partial']);
const TIMEOUT_KINDS = new Set(['header', 'body-idle', 'total']);
const execFileAsync = promisify(execFile);

type SnapshotListener = (snapshot: DownloadTransferSnapshot) => void;
interface PersistedState { schemaVersion: number; snapshots: DownloadTransferSnapshot[]; handoffs: ExtensionDownloadHandoff[]; pendingQueue?: string[]; approvedRoots: string[]; }
interface TransferTask { controller: AbortController; handoff: ExtensionDownloadHandoff; tempPath: string; pauseRequested: boolean; timeoutKind?: TransferTimeoutKind; }

class TransferTimeoutError extends Error {
  constructor(readonly kind: TransferTimeoutKind) { super(`The transfer exceeded its ${kind} deadline.`); this.name = 'TransferTimeoutError'; }
}
class IntegrityReadError extends Error {
  constructor(readonly code: 'PUBLISH_INTEGRITY_TIMEOUT' | 'PUBLISH_INTEGRITY_FILESYSTEM', message: string) { super(message); this.name = 'IntegrityReadError'; }
}

function observedAt(): string { return new Date().toISOString(); }
function sameHandoff(a: ExtensionDownloadHandoff, b: ExtensionDownloadHandoff): boolean {
  return a.kind === b.kind && a.handoffId === b.handoffId && a.fileName === b.fileName && a.sourceUrl === b.sourceUrl
    && a.destinationPath === b.destinationPath && a.destinationKind === b.destinationKind && a.totalBytes === b.totalBytes
    && a.createdAt === b.createdAt && a.unsavedWork.state === b.unsavedWork.state && a.unsavedWork.detail === b.unsavedWork.detail;
}

/** Privileged, durable transfer boundary for browser-extension handoffs. */
export class DownloadTransferManager implements DownloadTransferClient {
  private readonly statePath: string;
  private readonly snapshots = new Map<string, DownloadTransferSnapshot>();
  private readonly handoffs = new Map<string, ExtensionDownloadHandoff>();
  private readonly approvedRoots = new Set<string>();
  private readonly pendingQueue: string[] = [];
  private readonly listeners = new Set<SnapshotListener>();
  private readonly tasks = new Map<string, TransferTask>();
  private initialized = false;

  constructor(userDataPath: string) { this.statePath = join(userDataPath, 'download-transfers.json'); this.load(); }

  private load(): void {
    if (!existsSync(this.statePath)) { this.initialized = true; return; }
    try {
      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as PersistedState;
      if (![1, SCHEMA_VERSION].includes(parsed.schemaVersion) || !Array.isArray(parsed.snapshots) || !Array.isArray(parsed.handoffs)) { this.initialized = true; return; }
      for (const root of (Array.isArray(parsed.approvedRoots) ? parsed.approvedRoots : []).slice(-MAX_SNAPSHOTS)) if (typeof root === 'string' && root.length <= 4096 && isAbsolute(root)) this.approvedRoots.add(this.lexical(root));
      for (const handoff of parsed.handoffs.slice(-MAX_SNAPSHOTS)) if (isExtensionDownloadHandoff(handoff) && this.validPersistedHandoff(handoff)) this.handoffs.set(handoff.handoffId, handoff);
      for (const snapshot of parsed.snapshots.slice(-MAX_SNAPSHOTS)) if (this.validSnapshot(snapshot) && this.handoffs.has(snapshot.handoffId)) this.snapshots.set(snapshot.transferId, snapshot);
      const persistedQueue = Array.isArray(parsed.pendingQueue) ? parsed.pendingQueue : parsed.handoffs.map((handoff) => handoff.handoffId);
      for (const handoffId of persistedQueue) {
        const latest = this.getLatestSnapshot(handoffId);
        if (typeof handoffId === 'string' && this.handoffs.has(handoffId) && (!latest || ['queued', 'downloading', 'paused', 'partial'].includes(latest.status)) && !this.pendingQueue.includes(handoffId)) this.pendingQueue.push(handoffId);
      }
    } catch { /* Corrupt state fails closed to unavailable records. */ }
    this.initialized = true;
  }

  private validSnapshot(value: unknown): value is DownloadTransferSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<DownloadTransferSnapshot>;
    if (!this.boundedId(snapshot.transferId, 160) || !this.boundedId(snapshot.handoffId, 160) || !this.boundedText(snapshot.fileName, 255)
      || !this.validHttpsUrl(snapshot.sourceUrl, 4096) || !this.boundedAbsolutePath(snapshot.destinationPath, 4096)
      || typeof snapshot.status !== 'string' || !SNAPSHOT_STATUSES.has(snapshot.status)
      || !this.safeNumber(snapshot.bytesTransferred) || !this.validIso(snapshot.observedAt)) return false;
    if (snapshot.totalBytes !== undefined && !this.safeNumber(snapshot.totalBytes)) return false;
    if (snapshot.rateBytesPerSecond !== undefined && (!Number.isFinite(snapshot.rateBytesPerSecond) || snapshot.rateBytesPerSecond < 0)) return false;
    if (snapshot.etaSeconds !== undefined && (!Number.isFinite(snapshot.etaSeconds) || snapshot.etaSeconds < 0)) return false;
    if (snapshot.deadlineAt !== undefined && !this.validIso(snapshot.deadlineAt)) return false;
    if (snapshot.timeoutKind !== undefined && (typeof snapshot.timeoutKind !== 'string' || !TIMEOUT_KINDS.has(snapshot.timeoutKind))) return false;
    if (snapshot.bodyComplete !== undefined && typeof snapshot.bodyComplete !== 'boolean') return false;
    if (snapshot.publicationPending !== undefined && typeof snapshot.publicationPending !== 'boolean') return false;
    if (snapshot.publicationSize !== undefined && !this.safeNumber(snapshot.publicationSize)) return false;
    if (snapshot.publicationSha256 !== undefined && (typeof snapshot.publicationSha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(snapshot.publicationSha256))) return false;
    if (snapshot.cleanupCompleted !== undefined && typeof snapshot.cleanupCompleted !== 'boolean') return false;
    if (snapshot.cleanupError !== undefined && !this.validError(snapshot.cleanupError)) return false;
    if (typeof snapshot.canPause !== 'boolean' || typeof snapshot.canResume !== 'boolean' || typeof snapshot.canCancel !== 'boolean' || typeof snapshot.canRetry !== 'boolean') return false;
    if (snapshot.resume !== undefined && !this.validResume(snapshot.resume)) return false;
    if (snapshot.error !== undefined && !this.validError(snapshot.error)) return false;
    if (snapshot.partial !== undefined && !this.validPartial(snapshot.partial)) return false;
    return snapshot.resumeDisabledReason === undefined || this.boundedText(snapshot.resumeDisabledReason, 1000);
  }

  private boundedText(value: unknown, max: number): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max; }
  private boundedId(value: unknown, max: number): value is string { return this.boundedText(value, max) && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value); }
  private safeNumber(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_DOWNLOAD_BYTES; }
  private validIso(value: unknown): value is string { return typeof value === 'string' && value.length <= 64 && !Number.isNaN(Date.parse(value)); }
  private validHttpsUrl(value: unknown, max: number): value is string { if (typeof value !== 'string' || value.length === 0 || value.length > max) return false; try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash; } catch { return false; } }
  private boundedAbsolutePath(value: unknown, max: number): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max && isAbsolute(value); }
  private validResume(value: unknown): value is DownloadResumeSupport { if (!value || typeof value !== 'object') return false; const resume = value as Partial<DownloadResumeSupport>; return typeof resume.acceptRanges === 'boolean' && (resume.etag === undefined || this.boundedText(resume.etag, 512)) && (resume.lastModified === undefined || this.boundedText(resume.lastModified, 128)) && Boolean(resume.etag || resume.lastModified); }
  private validError(value: unknown): boolean { if (!value || typeof value !== 'object') return false; const error = value as { code?: unknown; message?: unknown; retryable?: unknown; observedAt?: unknown }; return this.boundedId(error.code, 160) && this.boundedText(error.message, 1000) && typeof error.retryable === 'boolean' && this.validIso(error.observedAt); }
  private validPartial(value: unknown): boolean { if (!value || typeof value !== 'object') return false; const partial = value as { bytesTransferred?: unknown; reason?: unknown; canResume?: unknown }; return this.safeNumber(partial.bytesTransferred) && this.boundedText(partial.reason, 1000) && typeof partial.canResume === 'boolean'; }
  private validPersistedHandoff(value: ExtensionDownloadHandoff): boolean { return this.boundedAbsolutePath(value.destinationPath, 4096) && this.isApproved(value.destinationPath) && this.validHttpsUrl(value.sourceUrl, 4096); }

  private lexical(path: string): string { return resolve(path).replace(/[\\/]+$/u, ''); }
  private persist(): void { atomicWriteFileSync(this.statePath, `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, snapshots: [...this.snapshots.values()].slice(-MAX_SNAPSHOTS), handoffs: [...this.handoffs.values()].slice(-MAX_SNAPSHOTS), pendingQueue: this.pendingQueue.slice(-MAX_SNAPSHOTS), approvedRoots: [...this.approvedRoots].slice(-MAX_SNAPSHOTS) }, null, 2)}\n`); }
  private emit(snapshot: DownloadTransferSnapshot): void { this.snapshots.set(snapshot.transferId, snapshot); this.persist(); for (const listener of this.listeners) listener(snapshot); }

  async initialize(): Promise<void> {
    if (!this.initialized) this.load();
    const changed: DownloadTransferSnapshot[] = [];
    for (const snapshot of [...this.snapshots.values()]) {
      if (!['queued', 'downloading', 'paused'].includes(snapshot.status)) continue;
      const resumable = Boolean(snapshot.resume?.acceptRanges && (snapshot.resume.etag || snapshot.resume.lastModified));
      const reconciled = { ...snapshot, status: resumable ? 'partial' as const : 'failed' as const, canPause: false, canResume: resumable, canCancel: false, canRetry: true, resumeDisabledReason: resumable ? undefined : 'The previous process ended before a resumable server validator was recorded.', observedAt: observedAt(), error: resumable ? undefined : { code: 'STARTUP_INTERRUPTED', message: 'The transfer stopped when the previous process ended.', retryable: true, observedAt: observedAt() }, partial: resumable ? { bytesTransferred: snapshot.bytesTransferred, reason: 'The previous process ended before completion.', canResume: true } : undefined };
      this.snapshots.set(snapshot.transferId, reconciled); changed.push(reconciled);
    }
    const nextQueue = this.pendingQueue.filter((handoffId) => !this.getLatestSnapshot(handoffId));
    const queueChanged = nextQueue.length !== this.pendingQueue.length || nextQueue.some((id, index) => id !== this.pendingQueue[index]);
    this.pendingQueue.splice(0, this.pendingQueue.length, ...nextQueue);
    if (changed.length || queueChanged) this.persist();
    for (const snapshot of changed) for (const listener of this.listeners) listener(snapshot);
  }

  subscribeGlobal(listener: SnapshotListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  listHandoffs(): ExtensionDownloadHandoff[] { return [...this.handoffs.values()]; }
  listPendingHandoffs(): ExtensionDownloadHandoff[] { return this.pendingQueue.map((handoffId) => this.handoffs.get(handoffId)).filter((handoff): handoff is ExtensionDownloadHandoff => Boolean(handoff) && !this.getLatestSnapshot(handoff.handoffId)); }
  nextPendingHandoff(): ExtensionDownloadHandoff | undefined { return this.listPendingHandoffs()[0]; }
  getSnapshot(transferId: string): DownloadTransferSnapshot | undefined { return this.snapshots.get(transferId); }
  getLatestSnapshot(handoffId?: string): DownloadTransferSnapshot | undefined { return [...this.snapshots.values()].filter(snapshot => !handoffId || snapshot.handoffId === handoffId).at(-1); }

  approveDestinationRoot(path: string): { accepted: boolean; detail: string; path?: string } {
    if (!isAbsolute(path)) return { accepted: false, detail: 'The approved destination must be an absolute path.' };
    const normalized = this.lexical(path); this.approvedRoots.add(normalized); this.persist();
    return { accepted: true, detail: 'The destination root was approved by the native picker.', path: normalized };
  }

  isDestinationApproved(path: string): boolean { return isAbsolute(path) && this.isApproved(this.lexical(path)); }

  private isApproved(path: string): boolean {
    const target = this.lexical(path);
    return [...this.approvedRoots].some(root => { const child = relative(root, target); return target === root || (child !== '' && !child.startsWith(`..${sep}`) && !isAbsolute(child)); });
  }

  private async assertNoReparseComponents(path: string): Promise<void> {
    const parsed = parse(path); let current = parsed.root; const parts = path.slice(parsed.root.length).split(/[\\/]+/u).filter(Boolean);
    if (parts.length > MAX_DESTINATION_COMPONENTS) throw new Error('DOWNLOAD_DESTINATION_TOO_DEEP: The destination path has too many components.');
    const deadline = Date.now() + REPARSE_INSPECTION_DEADLINE_MS;
    for (const part of parts) {
      if (Date.now() >= deadline) throw new Error('DOWNLOAD_DESTINATION_REPARSE_TIMEOUT: Destination reparse inspection exceeded its aggregate deadline.');
      current = join(current, part);
      try {
        const info = await stat(current, { throwIfNoEntry: false });
        if (!info) continue;
        if (lstatSync(current).isSymbolicLink()) throw new Error('DOWNLOAD_DESTINATION_REPARSE: A symbolic-link or reparse component is not allowed.');
        if (process.platform === 'win32') await this.assertWindowsReparseFree(current, Math.max(1, deadline - Date.now()));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('DOWNLOAD_DESTINATION_REPARSE')) throw error;
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  private async assertWindowsReparseFree(path: string, timeout: number): Promise<void> {
    try {
      const result = await execFileAsync('fsutil.exe', ['reparsepoint', 'query', path], { windowsHide: true, timeout: Math.min(3000, timeout), maxBuffer: 16 * 1024 });
      if (String(result.stdout).trim().length > 0) throw new Error('DOWNLOAD_DESTINATION_REPARSE: A Windows reparse tag was found in the destination path.');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const message = error instanceof Error ? error.message : String(error);
      if (code === 'ENOENT') throw new Error('DOWNLOAD_DESTINATION_REPARSE_CHECK_UNAVAILABLE: Windows reparse inspection is unavailable.');
      if (/reparse point data could not be found|not a reparse point|error: 4390/iu.test(message)) return;
      if (message.includes('DOWNLOAD_DESTINATION_REPARSE')) throw error;
      throw new Error('DOWNLOAD_DESTINATION_REPARSE_CHECK_FAILED: Windows reparse inspection did not complete safely.');
    }
  }

  private async assertSafeDestination(path: string): Promise<void> {
    if (!isAbsolute(path)) throw new Error('DOWNLOAD_DESTINATION_NOT_ABSOLUTE: The destination must be an absolute path.');
    const normalized = this.lexical(path);
    if (!this.isApproved(normalized)) throw new Error('DOWNLOAD_DESTINATION_NOT_APPROVED: Choose the destination through the native picker first.');
    if (existsSync(normalized)) throw new Error('DOWNLOAD_DESTINATION_EXISTS: The destination already exists; choose another path through the native picker.');
    await this.assertNoReparseComponents(dirname(normalized));
  }

  registerHandoff(handoff: ExtensionDownloadHandoff): { accepted: boolean; detail: string; handoff?: ExtensionDownloadHandoff } {
    if (!isExtensionDownloadHandoff(handoff)) return { accepted: false, detail: 'The extension handoff failed its bounded validation.' };
    const normalized = { ...handoff, destinationPath: this.lexical(handoff.destinationPath) };
    if (!isAbsolute(normalized.destinationPath) || !this.isApproved(normalized.destinationPath)) return { accepted: false, detail: 'DOWNLOAD_DESTINATION_NOT_APPROVED: Choose the destination through the native picker first.' };
    if (this.snapshotsForHandoff(normalized.handoffId).some(snapshot => ['queued', 'downloading', 'paused', 'completed'].includes(snapshot.status))) return { accepted: false, detail: 'This extension handoff already has an active or completed transfer.' };
    this.handoffs.set(normalized.handoffId, normalized); if (!this.pendingQueue.includes(normalized.handoffId)) this.pendingQueue.push(normalized.handoffId); this.persist();
    return { accepted: true, detail: 'The extension handoff was recorded and is waiting for user confirmation.', handoff: normalized };
  }

  cancelPendingHandoff(handoffId: string): DownloadTransferReceipt {
    const at = observedAt();
    if (!this.handoffs.delete(handoffId)) return this.receipt('cancel', handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'No pending extension handoff exists.');
    const index = this.pendingQueue.indexOf(handoffId); if (index >= 0) this.pendingQueue.splice(index, 1);
    this.persist(); return this.receipt('cancel', handoffId, true, at, undefined, 'The pending extension handoff was cancelled before transfer start.');
  }

  async start(handoff: ExtensionDownloadHandoff): Promise<DownloadTransferReceipt> {
    const at = observedAt();
    if (!isExtensionDownloadHandoff(handoff)) return this.receipt('start', handoff?.handoffId ?? '', false, at, 'DOWNLOAD_HANDOFF_INVALID', 'The extension handoff failed its bounded validation.');
    const recorded = this.handoffs.get(handoff.handoffId);
    if (!recorded) return this.receipt('start', handoff.handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'The extension handoff was not recorded by the privileged boundary.');
    if (!sameHandoff(recorded, handoff)) return this.receipt('start', handoff.handoffId, false, at, 'DOWNLOAD_HANDOFF_MISMATCH', 'The transfer request does not match the originally recorded extension handoff.');
    const active = [...this.snapshots.values()].find((candidate) => ['queued', 'downloading', 'paused'].includes(candidate.status));
    if (active && active.handoffId !== handoff.handoffId) return this.receipt('start', handoff.handoffId, false, at, 'DOWNLOAD_ACTIVE_TRANSFER', 'Another transfer is active. The durable queue will open this handoff after it reaches a terminal state.');
    const existing = this.getLatestSnapshot(handoff.handoffId);
    if (existing && ['queued', 'downloading', 'paused'].includes(existing.status)) return this.receipt('start', handoff.handoffId, true, at, undefined, 'The existing transfer is already active.', existing.transferId);
    if (existing?.status === 'partial' && existing.resume?.acceptRanges && (existing.resume.etag || existing.resume.lastModified)) return this.command(existing.transferId, 'resume');
    const transferId = `transfer-${randomUUID()}`;
    const snapshot: DownloadTransferSnapshot = { transferId, handoffId: handoff.handoffId, fileName: handoff.fileName, sourceUrl: handoff.sourceUrl, destinationPath: this.destinationFor(handoff), status: 'queued', bytesTransferred: 0, totalBytes: handoff.totalBytes, observedAt: at, deadlineAt: new Date(Date.now() + TOTAL_DEADLINE_MS).toISOString(), canPause: false, canResume: false, canCancel: true, canRetry: false, resumeDisabledReason: 'The server has not yet supplied range and validator headers.' };
    const queueIndex = this.pendingQueue.indexOf(handoff.handoffId); if (queueIndex >= 0) this.pendingQueue.splice(queueIndex, 1);
    this.emit(snapshot);
    const controller = new AbortController(); const tempPath = `${snapshot.destinationPath}.${transferId}.part`;
    const task: TransferTask = { controller, handoff: recorded, tempPath, pauseRequested: false };
    this.tasks.set(transferId, task);
    void this.runTransfer(snapshot, recorded, controller, false).finally(() => { if (this.tasks.get(transferId) === task) this.tasks.delete(transferId); });
    return this.receipt('start', handoff.handoffId, true, at, undefined, 'The transfer was accepted and queued.', transferId);
  }

  async cancelHandoff(handoffId: string): Promise<DownloadTransferReceipt> { const snapshot = this.getLatestSnapshot(handoffId); return snapshot ? this.command(snapshot.transferId, 'cancel') : this.cancelPendingHandoff(handoffId); }

  async command(transferId: string, command: Exclude<DownloadCommand, 'start'>): Promise<DownloadTransferReceipt> {
    const snapshot = this.snapshots.get(transferId); const at = observedAt();
    if (!snapshot) return this.receipt(command, '', false, at, 'DOWNLOAD_TRANSFER_NOT_FOUND', 'No transfer snapshot exists for this id.');
    const task = this.tasks.get(transferId);
    if (command === 'cancel') {
      if (['completed'].includes(snapshot.status)) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_CANCEL_UNAVAILABLE', 'The transfer is no longer cancellable.', transferId);
      if (task) task.controller.abort();
      const cleanup = task ? { cleanupCompleted: false } : await this.cleanTemp(`${snapshot.destinationPath}.${transferId}.part`);
      this.emit({ ...snapshot, ...cleanup, status: 'cancelled', canPause: false, canResume: false, canCancel: false, canRetry: !cleanup.cleanupCompleted, observedAt: at });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'Cancellation was recorded and the temporary file was removed.', transferId);
    }
    if (command === 'discard') {
      if (!['failed', 'partial', 'cancelled'].includes(snapshot.status)) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_DISCARD_UNAVAILABLE', 'Discard is available only for a failed, partial, or cancelled transfer.', transferId);
      if (task) task.controller.abort();
      const cleanup = await this.cleanTemp(task?.tempPath ?? `${snapshot.destinationPath}.${transferId}.part`);
      this.emit({ ...snapshot, ...cleanup, status: 'cancelled', bodyComplete: false, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: !cleanup.cleanupCompleted, observedAt: at, error: undefined, partial: undefined });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'The transfer and its temporary file were discarded.', transferId);
    }
    if (command === 'pause') {
      if (!task || snapshot.status !== 'downloading' || !snapshot.canPause) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_PAUSE_UNAVAILABLE', snapshot.resumeDisabledReason ?? 'Pause is unavailable because the source does not support resumable ranges.', transferId);
      task.pauseRequested = true; task.controller.abort(); this.emit({ ...snapshot, status: 'paused', canPause: false, canResume: true, canCancel: true, canRetry: false, observedAt: at });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'Pause was recorded and the resumable temporary file is retained.', transferId);
    }
    if (command === 'resume') {
      if (snapshot.status !== 'paused' && snapshot.status !== 'partial') return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_RESUME_UNAVAILABLE', 'Resume is available only for a paused or partial transfer.', transferId);
      if (snapshot.publicationPending || snapshot.bodyComplete) return this.retryPublication(transferId, snapshot, at);
      if (snapshot.totalBytes !== undefined && snapshot.bytesTransferred >= snapshot.totalBytes) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_RESUME_AT_EOF', 'The transfer already has its complete byte total, so Range was not requested. Retry publication or discard the temporary file.', transferId);
      if (!snapshot.resume?.acceptRanges || !(snapshot.resume.etag || snapshot.resume.lastModified)) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_RESUME_UNAVAILABLE', snapshot.resumeDisabledReason ?? 'The source did not provide a range validator.', transferId);
      const handoff = this.handoffs.get(snapshot.handoffId); if (!handoff) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'The original extension handoff is no longer available.', transferId);
      const controller = new AbortController(); const tempPath = task?.tempPath ?? `${snapshot.destinationPath}.${transferId}.part`;
      const resumedTask: TransferTask = { controller, handoff, tempPath, pauseRequested: false };
      this.tasks.set(transferId, resumedTask); this.emit({ ...snapshot, status: 'downloading', canPause: true, canResume: false, canCancel: true, observedAt: at });
      void this.runTransfer({ ...snapshot, status: 'downloading' }, handoff, controller, true).finally(() => { if (this.tasks.get(transferId) === resumedTask) this.tasks.delete(transferId); });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'Resume was accepted using the recorded range validator.', transferId);
    }
    if (command === 'retry' && ['failed', 'partial', 'cancelled'].includes(snapshot.status)) {
      const handoff = this.handoffs.get(snapshot.handoffId); if (!handoff) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'The original extension handoff is no longer available.', transferId);
      if (snapshot.publicationPending || snapshot.bodyComplete) return this.retryPublication(transferId, snapshot, at);
      if (snapshot.status === 'partial' && snapshot.resume?.acceptRanges && (snapshot.resume.etag || snapshot.resume.lastModified)) return this.command(transferId, 'resume');
      const cleanup = await this.cleanTemp(`${snapshot.destinationPath}.${transferId}.part`);
      if (!cleanup.cleanupCompleted) {
        this.emit({ ...snapshot, ...cleanup, canRetry: true, observedAt: at });
        return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_CLEANUP_FAILED', cleanup.cleanupError?.message ?? 'The previous temporary file could not be removed.', transferId);
      }
      return this.start(handoff);
    }
    return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_COMMAND_UNAVAILABLE', `The ${command} command is unavailable for the observed transfer state.`, transferId);
  }

  private snapshotsForHandoff(handoffId: string): DownloadTransferSnapshot[] { return [...this.snapshots.values()].filter(snapshot => snapshot.handoffId === handoffId); }
  private destinationFor(handoff: ExtensionDownloadHandoff): string { return handoff.destinationKind === 'folder' ? join(handoff.destinationPath, basename(handoff.fileName)) : handoff.destinationPath; }
  private receipt(command: DownloadCommand, handoffId: string, accepted: boolean, at: string, code?: string, detail?: string, transferId?: string): DownloadTransferReceipt { return { command, handoffId, transferId, accepted, observedAt: at, status: accepted ? (command === 'cancel' ? 'cancelled' : 'queued') : 'rejected', code, detail }; }
  private async cleanTemp(path: string | undefined): Promise<{ cleanupCompleted: boolean; cleanupError?: DownloadTransferSnapshot['error'] }> {
    if (!path) return { cleanupCompleted: true };
    try { await unlink(path); return { cleanupCompleted: true }; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { cleanupCompleted: true };
      return { cleanupCompleted: false, cleanupError: { code: 'CLEANUP_FAILED', message: error instanceof Error ? error.message : 'The temporary file could not be removed.', retryable: true, observedAt: observedAt() } };
    }
  }
  private async inspectCompleteTemp(path: string, expectedSize: number, signal?: AbortSignal): Promise<{ size: number; sha256: string }> {
    const stream = createReadStream(path);
    let timeout = false;
    const timer = setTimeout(() => { timeout = true; stream.destroy(new IntegrityReadError('PUBLISH_INTEGRITY_TIMEOUT', 'The temporary-file integrity read exceeded its bounded deadline.')); }, INTEGRITY_READ_DEADLINE_MS);
    const abort = () => stream.destroy(new IntegrityReadError('PUBLISH_INTEGRITY_TIMEOUT', 'The temporary-file integrity read was cancelled.'));
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const info = await stat(path, { throwIfNoEntry: true });
      if (info.size !== expectedSize) throw new Error(`PUBLISH_INTEGRITY_FAILED: The temporary file size ${info.size} does not match the recorded complete size ${expectedSize}.`);
      const hash = createHash('sha256');
      for await (const chunk of stream) hash.update(chunk);
      return { size: info.size, sha256: hash.digest('hex') };
    } catch (error) {
      if (timeout || error instanceof IntegrityReadError) throw error;
      if (error instanceof Error && error.message.startsWith('PUBLISH_INTEGRITY_FAILED')) throw error;
      throw new IntegrityReadError('PUBLISH_INTEGRITY_FILESYSTEM', `The complete temporary file could not be inspected: ${error instanceof Error ? error.message : String(error)}`);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); stream.destroy(); }
  }
  private async retryPublication(transferId: string, snapshot: DownloadTransferSnapshot, at: string): Promise<DownloadTransferReceipt> {
    const tempPath = `${snapshot.destinationPath}.${transferId}.part`;
    const existingTask = this.tasks.get(transferId);
    const integrityTask = existingTask ?? { controller: new AbortController(), handoff: this.handoffs.get(snapshot.handoffId)!, tempPath, pauseRequested: false };
    if (!existingTask) this.tasks.set(transferId, integrityTask);
    try {
      if (snapshot.publicationSize === undefined || !snapshot.publicationSha256) throw new Error('PUBLISH_INTEGRITY_FAILED: The complete temporary file has no recorded size and digest.');
      const inspected = await this.inspectCompleteTemp(tempPath, snapshot.publicationSize, integrityTask.controller.signal);
      if (inspected.sha256.toLowerCase() !== snapshot.publicationSha256.toLowerCase()) throw new Error('PUBLISH_INTEGRITY_FAILED: The complete temporary file digest changed before publication.');
      await this.assertSafeDestination(snapshot.destinationPath);
      await this.assertNoReparseComponents(dirname(snapshot.destinationPath));
      if (existsSync(snapshot.destinationPath)) throw new Error('DOWNLOAD_DESTINATION_EXISTS: The destination appeared before retry publication.');
      renameWithRetrySync(tempPath, snapshot.destinationPath);
      this.emit({ ...snapshot, status: 'completed', bodyComplete: true, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: false, observedAt: at, error: undefined, partial: undefined });
      return this.receipt('retry', snapshot.handoffId, true, at, undefined, 'The complete temporary file was published after destination revalidation.', transferId);
    } catch (error) {
      const latest = this.snapshots.get(transferId);
      if (latest?.status === 'cancelled') return this.receipt('retry', snapshot.handoffId, false, at, 'DOWNLOAD_CANCELLED', 'Publication retry was cancelled.', transferId);
      const integrity = error instanceof Error && error.message.startsWith('PUBLISH_INTEGRITY_FAILED');
      const integrityRead = error instanceof IntegrityReadError;
      const cleanup: { cleanupCompleted?: boolean; cleanupError?: DownloadTransferSnapshot['error'] } = integrity ? await this.cleanTemp(tempPath) : {};
      const resultCode = integrityRead ? error.code : integrity ? 'PUBLISH_INTEGRITY_FAILED' : 'PUBLISH_FAILED';
      this.emit({ ...snapshot, ...cleanup, status: 'failed', bodyComplete: true, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: true, observedAt: at, error: cleanup.cleanupError ?? { code: resultCode, message: error instanceof Error ? error.message : 'The complete temporary file could not be published.', retryable: true, observedAt: at } });
      return this.receipt('retry', snapshot.handoffId, false, at, `DOWNLOAD_${resultCode}`, error instanceof Error ? error.message : 'The complete temporary file could not be published.', transferId);
    } finally {
      if (!existingTask && this.tasks.get(transferId) === integrityTask) this.tasks.delete(transferId);
    }
  }

  private async runTransfer(initial: DownloadTransferSnapshot, handoff: ExtensionDownloadHandoff, controller: AbortController, resume: boolean): Promise<void> {
    const task = this.tasks.get(initial.transferId); if (!task) return; let snapshot = initial; let timeoutKind: TransferTimeoutKind | undefined; let bodyComplete = Boolean(initial.bodyComplete);
    const deadlineAtMs = snapshot.deadlineAt && Number.isFinite(Date.parse(snapshot.deadlineAt)) ? Date.parse(snapshot.deadlineAt) : Date.now() + TOTAL_DEADLINE_MS;
    const totalTimer = setTimeout(() => { timeoutKind = 'total'; controller.abort(); }, Math.max(1, deadlineAtMs - Date.now()));
    try {
      await this.assertSafeDestination(snapshot.destinationPath);
      const headers: Record<string, string> = {};
      if (resume && snapshot.bytesTransferred > 0) { headers.Range = `bytes=${snapshot.bytesTransferred}-`; if (snapshot.resume?.etag) headers['If-Range'] = snapshot.resume.etag; else if (snapshot.resume?.lastModified) headers['If-Range'] = snapshot.resume.lastModified; }
      const headerTimer = setTimeout(() => { timeoutKind = 'header'; controller.abort(); }, HEADER_DEADLINE_MS);
      let response: Response;
      try { response = await fetch(handoff.sourceUrl, { redirect: 'error', signal: controller.signal, headers }); } catch (error) { if (timeoutKind) throw new TransferTimeoutError(timeoutKind); throw error; } finally { clearTimeout(headerTimer); }
      if (!response.ok) throw new Error(`The source returned HTTP ${response.status}.`);
      const acceptRanges = response.headers.get('accept-ranges')?.toLowerCase() === 'bytes'; const etag = response.headers.get('etag') ?? undefined; const lastModified = response.headers.get('last-modified') ?? undefined; const supportsResume = acceptRanges && Boolean(etag || lastModified);
      if (resume && (response.status !== 206 || !supportsResume)) throw new Error('DOWNLOAD_RESUME_REFUSED: The source did not honour the recorded range validator.');
      if (resume && ((snapshot.resume?.etag && etag !== snapshot.resume.etag) || (snapshot.resume?.lastModified && lastModified !== snapshot.resume.lastModified))) throw new Error('DOWNLOAD_RESUME_VALIDATOR_MISMATCH: The source validator changed since the transfer was paused.');
      const contentLength = Number(response.headers.get('content-length') ?? 0); const totalBytes = handoff.totalBytes ?? (resume && snapshot.totalBytes ? snapshot.totalBytes : Number.isSafeInteger(contentLength) && contentLength > 0 ? contentLength : undefined);
      if (totalBytes !== undefined && totalBytes > MAX_DOWNLOAD_BYTES) throw new Error('The source exceeds the bounded transfer size.');
      if (handoff.totalBytes !== undefined && contentLength > 0 && !resume && contentLength !== handoff.totalBytes) throw new Error('DOWNLOAD_HANDOFF_SIZE_MISMATCH: The source byte total differs from the originally recorded handoff.');
      if (!response.body) throw new Error('The source did not provide a readable transfer body.');
      await mkdir(dirname(snapshot.destinationPath), { recursive: true });
      await this.assertNoReparseComponents(dirname(snapshot.destinationPath));
      const handle = await open(task.tempPath, resume ? 'a' : 'wx'); const reader = response.body.getReader(); const started = Date.now(); const resumeSupport: DownloadResumeSupport = { acceptRanges, etag, lastModified };
      snapshot = { ...snapshot, status: 'downloading', totalBytes, resume: resumeSupport, canPause: supportsResume, canResume: false, canCancel: true, resumeDisabledReason: supportsResume ? undefined : 'The source did not provide both byte ranges and an ETag or Last-Modified validator.', deadlineAt: new Date(deadlineAtMs).toISOString(), observedAt: observedAt() }; this.emit(snapshot);
      try {
        while (true) {
          const idleTimer = setTimeout(() => { timeoutKind = 'body-idle'; controller.abort(); }, BODY_IDLE_DEADLINE_MS); let part: ReadableStreamReadResult<Uint8Array>;
          try { part = await reader.read(); } catch (error) { if (timeoutKind) throw new TransferTimeoutError(timeoutKind); throw error; } finally { clearTimeout(idleTimer); }
          if (part.done) break; if (part.value.byteLength + snapshot.bytesTransferred > MAX_DOWNLOAD_BYTES) throw new Error('The transfer exceeded the bounded size.');
          await handle.write(part.value); const bytesTransferred = snapshot.bytesTransferred + part.value.byteLength; const elapsedSeconds = Math.max((Date.now() - started) / 1000, 0.001); const rateBytesPerSecond = bytesTransferred / elapsedSeconds; const etaSeconds = totalBytes && rateBytesPerSecond > 0 ? Math.max(0, (totalBytes - bytesTransferred) / rateBytesPerSecond) : undefined;
          snapshot = { ...snapshot, bytesTransferred, rateBytesPerSecond, etaSeconds, observedAt: observedAt() }; this.emit(snapshot);
        }
      } finally { reader.releaseLock(); await handle.close(); }
      const latest = this.snapshots.get(snapshot.transferId);
      if (task.pauseRequested || latest?.status === 'paused') { this.emit({ ...snapshot, status: 'paused', canPause: false, canResume: supportsResume, canCancel: true, canRetry: false, partial: { bytesTransferred: snapshot.bytesTransferred, reason: 'Paused by the user with the resumable temporary file retained.', canResume: supportsResume }, observedAt: observedAt() }); return; }
      if (latest?.status === 'cancelled') { const cleanup = await this.cleanTemp(task.tempPath); this.emit({ ...latest, ...cleanup, canRetry: !cleanup.cleanupCompleted, observedAt: observedAt() }); return; }
      if (snapshot.totalBytes !== undefined && snapshot.bytesTransferred !== snapshot.totalBytes) {
        if (!supportsResume) { const cleanup = await this.cleanTemp(task.tempPath); this.emit({ ...snapshot, ...cleanup, status: 'failed', canPause: false, canResume: false, canCancel: false, canRetry: true, error: cleanup.cleanupError ?? { code: 'TRANSFER_SHORT_BODY', message: 'The source ended before its declared byte total and cannot resume.', retryable: true, observedAt: observedAt() }, resumeDisabledReason: 'The source did not provide both byte ranges and an ETag or Last-Modified validator.', observedAt: observedAt() }); return; }
        this.emit({ ...snapshot, status: 'partial', canPause: false, canResume: true, canCancel: false, canRetry: true, partial: { bytesTransferred: snapshot.bytesTransferred, reason: 'The source ended before its declared byte total.', canResume: true }, observedAt: observedAt() }); return;
      }
      bodyComplete = true;
      const completeSize = snapshot.totalBytes ?? snapshot.bytesTransferred;
      const completeDigest = await this.inspectCompleteTemp(task.tempPath, completeSize, controller.signal);
      snapshot = { ...snapshot, bodyComplete: true, publicationPending: true, publicationSize: completeDigest.size, publicationSha256: completeDigest.sha256, observedAt: observedAt() };
      this.emit(snapshot);
      await this.assertNoReparseComponents(dirname(snapshot.destinationPath)); if (existsSync(snapshot.destinationPath)) throw new Error('DOWNLOAD_DESTINATION_EXISTS: The destination appeared before atomic publication.');
      renameWithRetrySync(task.tempPath, snapshot.destinationPath); this.emit({ ...snapshot, status: 'completed', bodyComplete: true, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: false, observedAt: observedAt() });
    } catch (error) {
      const latest = this.snapshots.get(snapshot.transferId) ?? snapshot; if (latest.status === 'cancelled') { await this.cleanTemp(task.tempPath); return; } if (task.pauseRequested) return;
      if (error instanceof IntegrityReadError) {
        this.emit({ ...latest, status: 'failed', bodyComplete: true, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: true, observedAt: observedAt(), error: { code: error.code, message: error.message, retryable: true, observedAt: observedAt() } });
        return;
      }
      if (error instanceof Error && error.message.startsWith('PUBLISH_INTEGRITY_FAILED')) {
        const cleanup = await this.cleanTemp(task.tempPath);
        this.emit({ ...latest, ...cleanup, status: 'failed', bodyComplete: false, publicationPending: false, canPause: false, canResume: false, canCancel: false, canRetry: true, observedAt: observedAt(), error: cleanup.cleanupError ?? { code: 'PUBLISH_INTEGRITY_FAILED', message: error.message, retryable: true, observedAt: observedAt() } });
        return;
      }
      if (bodyComplete || latest.bodyComplete || latest.publicationPending) {
        this.emit({ ...latest, status: 'failed', bodyComplete: true, publicationPending: true, canPause: false, canResume: false, canCancel: false, canRetry: true, observedAt: observedAt(), error: { code: 'PUBLISH_FAILED', message: error instanceof Error ? error.message : 'The complete temporary file could not be published.', retryable: true, observedAt: observedAt() } });
        return;
      }
      const timeout = error instanceof TransferTimeoutError ? error.kind : undefined; const canResume = Boolean(latest.resume?.acceptRanges && (latest.resume.etag || latest.resume.lastModified)); const cleanup: { cleanupCompleted?: boolean; cleanupError?: DownloadTransferSnapshot['error'] } = canResume ? {} : await this.cleanTemp(task.tempPath);
      this.emit({ ...latest, ...cleanup, status: canResume && latest.bytesTransferred > 0 ? 'partial' : 'failed', canPause: false, canResume, canCancel: false, canRetry: true, timeoutKind: timeout, error: cleanup.cleanupError ?? { code: timeout ? `TRANSFER_TIMEOUT_${String(timeout).toUpperCase()}` : 'TRANSFER_FAILED', message: error instanceof Error ? error.message : 'The transfer failed.', retryable: true, observedAt: observedAt() }, partial: canResume && latest.bytesTransferred > 0 ? { bytesTransferred: latest.bytesTransferred, reason: timeout ? `The transfer exceeded its ${timeout} deadline.` : 'The transfer stopped before completion.', canResume: true } : undefined, observedAt: observedAt() });
    } finally { clearTimeout(totalTimer); }
  }
}
