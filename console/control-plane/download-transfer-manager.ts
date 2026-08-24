import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { mkdir, open, stat, unlink } from 'node:fs/promises';
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

type SnapshotListener = (snapshot: DownloadTransferSnapshot) => void;
interface PersistedState { schemaVersion: number; snapshots: DownloadTransferSnapshot[]; handoffs: ExtensionDownloadHandoff[]; approvedRoots: string[]; }
interface TransferTask { controller: AbortController; handoff: ExtensionDownloadHandoff; tempPath: string; pauseRequested: boolean; timeoutKind?: TransferTimeoutKind; }

class TransferTimeoutError extends Error {
  constructor(readonly kind: TransferTimeoutKind) { super(`The transfer exceeded its ${kind} deadline.`); this.name = 'TransferTimeoutError'; }
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
  private readonly listeners = new Set<SnapshotListener>();
  private readonly tasks = new Map<string, TransferTask>();
  private initialized = false;

  constructor(userDataPath: string) { this.statePath = join(userDataPath, 'download-transfers.json'); this.load(); }

  private load(): void {
    if (!existsSync(this.statePath)) { this.initialized = true; return; }
    try {
      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as PersistedState;
      if (![1, SCHEMA_VERSION].includes(parsed.schemaVersion) || !Array.isArray(parsed.snapshots) || !Array.isArray(parsed.handoffs)) { this.initialized = true; return; }
      for (const snapshot of parsed.snapshots.slice(-MAX_SNAPSHOTS)) if (this.validSnapshot(snapshot)) this.snapshots.set(snapshot.transferId, snapshot);
      for (const handoff of parsed.handoffs.slice(-MAX_SNAPSHOTS)) if (isExtensionDownloadHandoff(handoff)) this.handoffs.set(handoff.handoffId, handoff);
      for (const root of Array.isArray(parsed.approvedRoots) ? parsed.approvedRoots : []) if (typeof root === 'string' && isAbsolute(root)) this.approvedRoots.add(this.lexical(root));
    } catch { /* Corrupt state fails closed to unavailable records. */ }
    this.initialized = true;
  }

  private validSnapshot(value: unknown): value is DownloadTransferSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<DownloadTransferSnapshot>;
    return typeof snapshot.transferId === 'string' && typeof snapshot.handoffId === 'string' && typeof snapshot.fileName === 'string'
      && typeof snapshot.sourceUrl === 'string' && typeof snapshot.destinationPath === 'string' && typeof snapshot.status === 'string'
      && Number.isSafeInteger(snapshot.bytesTransferred) && snapshot.bytesTransferred >= 0 && typeof snapshot.observedAt === 'string';
  }

  private lexical(path: string): string { return resolve(path).replace(/[\\/]+$/u, ''); }
  private persist(): void { atomicWriteFileSync(this.statePath, `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, snapshots: [...this.snapshots.values()].slice(-MAX_SNAPSHOTS), handoffs: [...this.handoffs.values()].slice(-MAX_SNAPSHOTS), approvedRoots: [...this.approvedRoots].slice(-MAX_SNAPSHOTS) }, null, 2)}\n`); }
  private emit(snapshot: DownloadTransferSnapshot): void { this.snapshots.set(snapshot.transferId, snapshot); this.persist(); for (const listener of this.listeners) listener(snapshot); }

  async initialize(): Promise<void> {
    if (!this.initialized) this.load();
    for (const snapshot of [...this.snapshots.values()]) {
      if (!['queued', 'downloading', 'paused'].includes(snapshot.status)) continue;
      const resumable = Boolean(snapshot.resume?.acceptRanges && (snapshot.resume.etag || snapshot.resume.lastModified));
      this.emit({ ...snapshot, status: resumable ? 'partial' : 'failed', canPause: false, canResume: resumable, canCancel: false, canRetry: true, resumeDisabledReason: resumable ? undefined : 'The previous process ended before a resumable server validator was recorded.', observedAt: observedAt(), error: resumable ? undefined : { code: 'STARTUP_INTERRUPTED', message: 'The transfer stopped when the previous process ended.', retryable: true, observedAt: observedAt() }, partial: resumable ? { bytesTransferred: snapshot.bytesTransferred, reason: 'The previous process ended before completion.', canResume: true } : undefined });
    }
  }

  subscribeGlobal(listener: SnapshotListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  listHandoffs(): ExtensionDownloadHandoff[] { return [...this.handoffs.values()]; }
  listPendingHandoffs(): ExtensionDownloadHandoff[] { return [...this.handoffs.values()].filter((handoff) => { const snapshot = this.getLatestSnapshot(handoff.handoffId); return !snapshot || ['queued', 'downloading', 'paused', 'partial'].includes(snapshot.status); }); }
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
    const parsed = parse(path); let current = parsed.root;
    for (const part of path.slice(parsed.root.length).split(/[\\/]+/u).filter(Boolean)) {
      current = join(current, part);
      try {
        const info = await stat(current, { throwIfNoEntry: false });
        if (!info) continue;
        if (lstatSync(current).isSymbolicLink()) throw new Error('DOWNLOAD_DESTINATION_REPARSE: A symbolic-link or reparse component is not allowed.');
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('DOWNLOAD_DESTINATION_REPARSE')) throw error;
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
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
    this.handoffs.set(normalized.handoffId, normalized); this.persist();
    return { accepted: true, detail: 'The extension handoff was recorded and is waiting for user confirmation.', handoff: normalized };
  }

  cancelPendingHandoff(handoffId: string): DownloadTransferReceipt {
    const at = observedAt();
    if (!this.handoffs.delete(handoffId)) return this.receipt('cancel', handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'No pending extension handoff exists.');
    this.persist(); return this.receipt('cancel', handoffId, true, at, undefined, 'The pending extension handoff was cancelled before transfer start.');
  }

  async start(handoff: ExtensionDownloadHandoff): Promise<DownloadTransferReceipt> {
    const at = observedAt();
    if (!isExtensionDownloadHandoff(handoff)) return this.receipt('start', handoff?.handoffId ?? '', false, at, 'DOWNLOAD_HANDOFF_INVALID', 'The extension handoff failed its bounded validation.');
    const recorded = this.handoffs.get(handoff.handoffId);
    if (!recorded) return this.receipt('start', handoff.handoffId, false, at, 'DOWNLOAD_HANDOFF_NOT_FOUND', 'The extension handoff was not recorded by the privileged boundary.');
    if (!sameHandoff(recorded, handoff)) return this.receipt('start', handoff.handoffId, false, at, 'DOWNLOAD_HANDOFF_MISMATCH', 'The transfer request does not match the originally recorded extension handoff.');
    const existing = this.getLatestSnapshot(handoff.handoffId);
    if (existing && ['queued', 'downloading', 'paused'].includes(existing.status)) return this.receipt('start', handoff.handoffId, true, at, undefined, 'The existing transfer is already active.', existing.transferId);
    if (existing?.status === 'partial' && existing.resume?.acceptRanges && (existing.resume.etag || existing.resume.lastModified)) return this.command(existing.transferId, 'resume');
    const transferId = `transfer-${randomUUID()}`;
    const snapshot: DownloadTransferSnapshot = { transferId, handoffId: handoff.handoffId, fileName: handoff.fileName, sourceUrl: handoff.sourceUrl, destinationPath: this.destinationFor(handoff), status: 'queued', bytesTransferred: 0, totalBytes: handoff.totalBytes, observedAt: at, deadlineAt: new Date(Date.now() + TOTAL_DEADLINE_MS).toISOString(), canPause: false, canResume: false, canCancel: true, canRetry: false, resumeDisabledReason: 'The server has not yet supplied range and validator headers.' };
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
      if (['completed', 'failed', 'cancelled'].includes(snapshot.status)) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_CANCEL_UNAVAILABLE', 'The transfer is no longer cancellable.', transferId);
      if (task) task.controller.abort(); else await this.cleanTemp(`${snapshot.destinationPath}.${transferId}.part`);
      this.emit({ ...snapshot, status: 'cancelled', canPause: false, canResume: false, canCancel: false, canRetry: false, observedAt: at });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'Cancellation was recorded and the temporary file was removed.', transferId);
    }
    if (command === 'pause') {
      if (!task || snapshot.status !== 'downloading' || !snapshot.canPause) return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_PAUSE_UNAVAILABLE', snapshot.resumeDisabledReason ?? 'Pause is unavailable because the source does not support resumable ranges.', transferId);
      task.pauseRequested = true; task.controller.abort(); this.emit({ ...snapshot, status: 'paused', canPause: false, canResume: true, canCancel: true, canRetry: false, observedAt: at });
      return this.receipt(command, snapshot.handoffId, true, at, undefined, 'Pause was recorded and the resumable temporary file is retained.', transferId);
    }
    if (command === 'resume') {
      if (snapshot.status !== 'paused' && snapshot.status !== 'partial') return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_RESUME_UNAVAILABLE', 'Resume is available only for a paused or partial transfer.', transferId);
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
      if (snapshot.status === 'partial' && snapshot.resume?.acceptRanges && (snapshot.resume.etag || snapshot.resume.lastModified)) return this.command(transferId, 'resume');
      await this.cleanTemp(`${snapshot.destinationPath}.${transferId}.part`); return this.start(handoff);
    }
    return this.receipt(command, snapshot.handoffId, false, at, 'DOWNLOAD_COMMAND_UNAVAILABLE', `The ${command} command is unavailable for the observed transfer state.`, transferId);
  }

  private snapshotsForHandoff(handoffId: string): DownloadTransferSnapshot[] { return [...this.snapshots.values()].filter(snapshot => snapshot.handoffId === handoffId); }
  private destinationFor(handoff: ExtensionDownloadHandoff): string { return handoff.destinationKind === 'folder' ? join(handoff.destinationPath, basename(handoff.fileName)) : handoff.destinationPath; }
  private receipt(command: DownloadCommand, handoffId: string, accepted: boolean, at: string, code?: string, detail?: string, transferId?: string): DownloadTransferReceipt { return { command, handoffId, transferId, accepted, observedAt: at, status: accepted ? (command === 'cancel' ? 'cancelled' : 'queued') : 'rejected', code, detail }; }
  private async cleanTemp(path: string | undefined): Promise<void> { if (!path) return; try { await unlink(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }

  private async runTransfer(initial: DownloadTransferSnapshot, handoff: ExtensionDownloadHandoff, controller: AbortController, resume: boolean): Promise<void> {
    const task = this.tasks.get(initial.transferId); if (!task) return; let snapshot = initial; let timeoutKind: TransferTimeoutKind | undefined;
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
      await mkdir(dirname(snapshot.destinationPath), { recursive: true }); const handle = await open(task.tempPath, resume ? 'a' : 'wx'); const reader = response.body.getReader(); const started = Date.now(); const resumeSupport: DownloadResumeSupport = { acceptRanges, etag, lastModified };
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
      if (latest?.status === 'cancelled') { await this.cleanTemp(task.tempPath); return; }
      if (snapshot.totalBytes !== undefined && snapshot.bytesTransferred !== snapshot.totalBytes) {
        if (!supportsResume) { await this.cleanTemp(task.tempPath); this.emit({ ...snapshot, status: 'failed', canPause: false, canResume: false, canCancel: false, canRetry: true, error: { code: 'TRANSFER_SHORT_BODY', message: 'The source ended before its declared byte total and cannot resume.', retryable: true, observedAt: observedAt() }, resumeDisabledReason: 'The source did not provide both byte ranges and an ETag or Last-Modified validator.', observedAt: observedAt() }); return; }
        this.emit({ ...snapshot, status: 'partial', canPause: false, canResume: true, canCancel: false, canRetry: true, partial: { bytesTransferred: snapshot.bytesTransferred, reason: 'The source ended before its declared byte total.', canResume: true }, observedAt: observedAt() }); return;
      }
      await this.assertNoReparseComponents(dirname(snapshot.destinationPath)); if (existsSync(snapshot.destinationPath)) throw new Error('DOWNLOAD_DESTINATION_EXISTS: The destination appeared before atomic publication.');
      renameWithRetrySync(task.tempPath, snapshot.destinationPath); this.emit({ ...snapshot, status: 'completed', canPause: false, canResume: false, canCancel: false, canRetry: false, observedAt: observedAt() });
    } catch (error) {
      const latest = this.snapshots.get(snapshot.transferId) ?? snapshot; if (latest.status === 'cancelled') { await this.cleanTemp(task.tempPath); return; } if (task.pauseRequested) return;
      const timeout = error instanceof TransferTimeoutError ? error.kind : undefined; const canResume = Boolean(latest.resume?.acceptRanges && (latest.resume.etag || latest.resume.lastModified)); if (!canResume) await this.cleanTemp(task.tempPath);
      this.emit({ ...latest, status: canResume && latest.bytesTransferred > 0 ? 'partial' : 'failed', canPause: false, canResume, canCancel: false, canRetry: true, timeoutKind: timeout, error: { code: timeout ? `TRANSFER_TIMEOUT_${String(timeout).toUpperCase()}` : 'TRANSFER_FAILED', message: error instanceof Error ? error.message : 'The transfer failed.', retryable: true, observedAt: observedAt() }, partial: canResume && latest.bytesTransferred > 0 ? { bytesTransferred: latest.bytesTransferred, reason: timeout ? `The transfer exceeded its ${timeout} deadline.` : 'The transfer stopped before completion.', canResume: true } : undefined, observedAt: observedAt() });
    } finally { clearTimeout(totalTimer); }
  }
}
