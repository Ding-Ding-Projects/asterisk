import { existsSync, readFileSync } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  isExtensionDownloadHandoff,
  type DownloadCommand,
  type DownloadTransferClient,
  type DownloadTransferReceipt,
  type DownloadTransferSnapshot,
  type ExtensionDownloadHandoff,
} from '../shared/download-transfer.js';
import { atomicWriteFileSync } from './atomic-file.js';

const SCHEMA_VERSION = 1;
const MAX_SNAPSHOTS = 200;
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024 * 1024;

type SnapshotListener = (snapshot: DownloadTransferSnapshot) => void;

interface PersistedState {
  schemaVersion: number;
  snapshots: DownloadTransferSnapshot[];
  handoffs: ExtensionDownloadHandoff[];
}

/**
 * Privileged, durable transfer boundary used by the browser-extension capture
 * surfaces. It owns network and file I/O, writes observed snapshots to disk, and
 * never fabricates progress or completion.
 */
export class DownloadTransferManager implements DownloadTransferClient {
  private readonly statePath: string;
  private readonly snapshots = new Map<string, DownloadTransferSnapshot>();
  private readonly handoffs = new Map<string, ExtensionDownloadHandoff>();
  private readonly listeners = new Set<SnapshotListener>();
  private readonly tasks = new Map<string, { controller: AbortController; handoff: ExtensionDownloadHandoff }>();
  private initialized = false;

  constructor(userDataPath: string) {
    this.statePath = join(userDataPath, 'download-transfers.json');
    this.load();
  }

  private load(): void {
    if (!existsSync(this.statePath)) {
      this.initialized = true;
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as PersistedState;
      if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.snapshots) || !Array.isArray(parsed.handoffs)) {
        this.initialized = true;
        return;
      }
      for (const snapshot of parsed.snapshots.slice(-MAX_SNAPSHOTS)) {
        if (this.validSnapshot(snapshot)) this.snapshots.set(snapshot.transferId, snapshot);
      }
      for (const handoff of parsed.handoffs.slice(-MAX_SNAPSHOTS)) {
        if (isExtensionDownloadHandoff(handoff)) this.handoffs.set(handoff.handoffId, handoff);
      }
    } catch {
      // Corrupt state is discarded in memory. No success state is invented.
    }
    this.initialized = true;
  }

  private validSnapshot(value: unknown): value is DownloadTransferSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<DownloadTransferSnapshot>;
    return typeof snapshot.transferId === 'string'
      && typeof snapshot.handoffId === 'string'
      && typeof snapshot.fileName === 'string'
      && typeof snapshot.sourceUrl === 'string'
      && typeof snapshot.destinationPath === 'string'
      && typeof snapshot.status === 'string'
      && Number.isSafeInteger(snapshot.bytesTransferred)
      && snapshot.bytesTransferred >= 0
      && typeof snapshot.observedAt === 'string';
  }

  private persist(): void {
    const state: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      snapshots: [...this.snapshots.values()].slice(-MAX_SNAPSHOTS),
      handoffs: [...this.handoffs.values()].slice(-MAX_SNAPSHOTS),
    };
    atomicWriteFileSync(this.statePath, `${JSON.stringify(state, null, 2)}\n`);
  }

  private emit(snapshot: DownloadTransferSnapshot): void {
    this.snapshots.set(snapshot.transferId, snapshot);
    this.persist();
    for (const listener of this.listeners) listener(snapshot);
  }

  subscribeGlobal(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<void> {
    if (!this.initialized) this.load();
  }

  listHandoffs(): ExtensionDownloadHandoff[] {
    return [...this.handoffs.values()];
  }

  registerHandoff(handoff: ExtensionDownloadHandoff): { accepted: boolean; detail: string } {
    if (!isExtensionDownloadHandoff(handoff)) return { accepted: false, detail: 'The extension handoff failed its bounded validation.' };
    if (this.snapshotsForHandoff(handoff.handoffId).some(snapshot => snapshot.status === 'downloading' || snapshot.status === 'completed')) {
      return { accepted: false, detail: 'This extension handoff already has an active or completed transfer.' };
    }
    this.handoffs.set(handoff.handoffId, handoff);
    this.persist();
    return { accepted: true, detail: 'The extension handoff was recorded and is waiting for user confirmation.' };
  }

  getSnapshot(transferId: string): DownloadTransferSnapshot | undefined {
    return this.snapshots.get(transferId);
  }

  getLatestSnapshot(handoffId: string): DownloadTransferSnapshot | undefined {
    return [...this.snapshots.values()].filter(snapshot => snapshot.handoffId === handoffId).at(-1);
  }

  async start(handoff: ExtensionDownloadHandoff): Promise<DownloadTransferReceipt> {
    const observedAt = new Date().toISOString();
    if (!isExtensionDownloadHandoff(handoff)) return this.receipt('start', handoff?.handoffId ?? '', false, observedAt, 'rejected', 'The extension handoff failed its bounded validation.');
    const recorded = this.handoffs.get(handoff.handoffId);
    if (!recorded) return this.receipt('start', handoff.handoffId, false, observedAt, 'rejected', 'The extension handoff was not recorded by the privileged boundary.');
    const existing = this.getLatestSnapshot(handoff.handoffId);
    if (existing && ['queued', 'downloading', 'paused'].includes(existing.status)) {
      return this.receipt('start', handoff.handoffId, true, observedAt, existing.status, 'The existing transfer is already active.', existing.transferId);
    }
    const transferId = `transfer-${randomUUID()}`;
    const snapshot: DownloadTransferSnapshot = {
      transferId,
      handoffId: handoff.handoffId,
      fileName: handoff.fileName,
      sourceUrl: handoff.sourceUrl,
      destinationPath: this.destinationFor(handoff),
      status: 'queued',
      bytesTransferred: 0,
      totalBytes: handoff.totalBytes,
      observedAt,
      canPause: false,
      canResume: false,
      canCancel: true,
      canRetry: false,
    };
    this.emit(snapshot);
    const controller = new AbortController();
    this.tasks.set(transferId, { controller, handoff });
    void this.runTransfer(snapshot, handoff, controller).finally(() => this.tasks.delete(transferId));
    return this.receipt('start', handoff.handoffId, true, observedAt, 'queued', 'The transfer was accepted and queued.', transferId);
  }

  async cancelHandoff(handoffId: string): Promise<DownloadTransferReceipt> {
    const snapshot = this.getLatestSnapshot(handoffId);
    if (!snapshot) return this.receipt('cancel', handoffId, false, new Date().toISOString(), 'rejected', 'No transfer exists for this handoff.');
    return this.command(snapshot.transferId, 'cancel');
  }

  async command(transferId: string, command: Exclude<DownloadCommand, 'start'>): Promise<DownloadTransferReceipt> {
    const snapshot = this.snapshots.get(transferId);
    const observedAt = new Date().toISOString();
    if (!snapshot) return this.receipt(command, '', false, observedAt, 'rejected', 'No transfer snapshot exists for this id.');
    if (command === 'cancel') {
      const task = this.tasks.get(transferId);
      if (task) task.controller.abort();
      if (snapshot.status === 'completed' || snapshot.status === 'failed' || snapshot.status === 'cancelled') {
        return this.receipt(command, snapshot.handoffId, false, observedAt, 'rejected', 'The transfer is no longer cancellable.', transferId);
      }
      this.emit({ ...snapshot, status: 'cancelled', canCancel: false, canRetry: snapshot.bytesTransferred > 0, observedAt });
      return this.receipt(command, snapshot.handoffId, true, observedAt, 'cancelled', 'Cancellation was recorded; the transfer boundary will stop the active read.', transferId);
    }
    if (command === 'retry' && (snapshot.status === 'failed' || snapshot.status === 'partial' || snapshot.status === 'cancelled')) {
      const handoff = this.handoffs.get(snapshot.handoffId);
      if (!handoff) return this.receipt(command, snapshot.handoffId, false, observedAt, 'rejected', 'The original extension handoff is no longer available.', transferId);
      return this.start(handoff);
    }
    return this.receipt(command, snapshot.handoffId, false, observedAt, 'rejected', `The ${command} command is unavailable for the observed transfer state.`, transferId);
  }

  private snapshotsForHandoff(handoffId: string): DownloadTransferSnapshot[] {
    return [...this.snapshots.values()].filter(snapshot => snapshot.handoffId === handoffId);
  }

  private destinationFor(handoff: ExtensionDownloadHandoff): string {
    return handoff.destinationKind === 'folder' ? join(handoff.destinationPath, basename(handoff.fileName)) : handoff.destinationPath;
  }

  private receipt(command: DownloadCommand, handoffId: string, accepted: boolean, observedAt: string, status: DownloadTransferReceipt['status'], detail: string, transferId?: string): DownloadTransferReceipt {
    return { command, handoffId, transferId, accepted, observedAt, status, detail };
  }

  private async runTransfer(initial: DownloadTransferSnapshot, handoff: ExtensionDownloadHandoff, controller: AbortController): Promise<void> {
    let snapshot = initial;
    try {
      const response = await fetch(handoff.sourceUrl, { redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error(`The source returned HTTP ${response.status}.`);
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      const totalBytes = handoff.totalBytes ?? (Number.isSafeInteger(contentLength) && contentLength > 0 ? contentLength : undefined);
      if (totalBytes !== undefined && totalBytes > MAX_DOWNLOAD_BYTES) throw new Error('The source exceeds the bounded transfer size.');
      if (!response.body) throw new Error('The source did not provide a readable transfer body.');
      await mkdir(dirname(snapshot.destinationPath), { recursive: true });
      const handle = await open(snapshot.destinationPath, 'wx');
      const reader = response.body.getReader();
      const started = Date.now();
      snapshot = { ...snapshot, status: 'downloading', totalBytes, observedAt: new Date().toISOString(), canPause: false, canResume: false };
      this.emit(snapshot);
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          if (part.value.byteLength + snapshot.bytesTransferred > MAX_DOWNLOAD_BYTES) throw new Error('The transfer exceeded the bounded size.');
          await handle.write(part.value);
          const bytesTransferred = snapshot.bytesTransferred + part.value.byteLength;
          const elapsedSeconds = Math.max((Date.now() - started) / 1000, 0.001);
          const rateBytesPerSecond = bytesTransferred / elapsedSeconds;
          const etaSeconds = totalBytes && rateBytesPerSecond > 0 ? Math.max(0, (totalBytes - bytesTransferred) / rateBytesPerSecond) : undefined;
          snapshot = { ...snapshot, bytesTransferred, rateBytesPerSecond, etaSeconds, observedAt: new Date().toISOString() };
          this.emit(snapshot);
          if (this.snapshots.get(snapshot.transferId)?.status === 'cancelled') throw new DOMException('Cancelled', 'AbortError');
        }
      } finally {
        reader.releaseLock();
        await handle.close();
      }
      const latest = this.snapshots.get(snapshot.transferId);
      if (latest?.status === 'cancelled') return;
      if (snapshot.totalBytes !== undefined && snapshot.bytesTransferred !== snapshot.totalBytes) {
        this.emit({ ...snapshot, status: 'partial', partial: { bytesTransferred: snapshot.bytesTransferred, reason: 'The source ended before its declared byte total.', canResume: false }, canCancel: false, canRetry: true, observedAt: new Date().toISOString() });
        return;
      }
      this.emit({ ...snapshot, status: 'completed', canCancel: false, canRetry: false, observedAt: new Date().toISOString() });
    } catch (error) {
      const latest = this.snapshots.get(snapshot.transferId) ?? snapshot;
      if (latest.status === 'cancelled' || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.emit({ ...latest, status: latest.bytesTransferred > 0 ? 'partial' : 'failed', canCancel: false, canRetry: true, error: { code: 'TRANSFER_FAILED', message: error instanceof Error ? error.message : 'The transfer failed.', retryable: true, observedAt: new Date().toISOString() }, partial: latest.bytesTransferred > 0 ? { bytesTransferred: latest.bytesTransferred, reason: 'The transfer stopped before completion.', canResume: false } : undefined, observedAt: new Date().toISOString() });
    }
  }
}
