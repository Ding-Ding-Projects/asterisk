import type {
  NotificationBulkCommand,
  NotificationExportRow,
  NotificationInput,
  NotificationMutationReceipt,
  NotificationPersistenceAdapter,
  NotificationPersistenceReceipt,
  NotificationQuietHoursPolicy,
  NotificationRecord,
  NotificationSearchQuery,
  NotificationSnapshot,
} from '../../../shared/notifications';
import type { OperationReceipt } from '../../../shared/operations';
import {
  applyNotificationBulkCommand,
  createNotificationRecord,
  decideNotificationDelivery,
  notificationHistory,
  notificationInputFromReceipt,
  notificationStack,
  projectNotificationForExport,
  searchNotifications,
  validateNotificationInput,
  validateQuietHoursPolicy,
} from './notification-model';

export interface NotificationStoreOptions {
  readonly persistence: NotificationPersistenceAdapter;
  readonly now?: () => Date;
  readonly idFactory?: () => string;
  readonly quietHours?: NotificationQuietHoursPolicy;
}

export type NotificationStoreListener = (snapshot: NotificationSnapshot) => void;
export type NotificationAvailabilityState = 'loading' | 'ready-empty' | 'ready' | 'unavailable';
export interface NotificationAvailability {
  readonly state: NotificationAvailabilityState;
  readonly reason?: string;
}

const NO_QUIET_HOURS: NotificationQuietHoursPolicy = {
  enabled: false,
  timeZone: 'UTC',
  windows: [],
  mode: 'suppress-info-success-progress',
};

/**
 * Durable notification history and toast projection.
 *
 * Dismissal keeps a record in history. Deletion removes it from the snapshot.
 * Every write returns a mutation receipt, and `succeeded` is impossible unless
 * the persistence adapter supplied a matching observation receipt.
 */
export class NotificationStore {
  private snapshot: NotificationSnapshot = {
    schemaVersion: 1,
    revision: 0,
    nextStackOrder: 1,
    records: [],
  };
  private initialized = false;
  private quietHours: NotificationQuietHoursPolicy;
  private readonly listeners = new Set<NotificationStoreListener>();
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private persistenceTail: Promise<void> = Promise.resolve();
  private initialization: Promise<void> | undefined;
  private availability: NotificationAvailability = { state: 'loading' };

  constructor(private readonly options: NotificationStoreOptions) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.quietHours = options.quietHours ?? NO_QUIET_HOURS;
    const quietHoursProblem = validateQuietHoursPolicy(this.quietHours);
    if (quietHoursProblem) throw new Error(quietHoursProblem);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initialization) return await this.initialization;
    this.availability = { state: 'loading' };
    this.emit();
    this.initialization = (async () => {
      const loaded = await this.options.persistence.load();
      if (loaded) this.snapshot = validateSnapshot(loaded);
      this.initialized = true;
      this.availability = { state: this.snapshot.records.length === 0 ? 'ready-empty' : 'ready' };
      this.emit();
    })();
    try {
      await this.initialization;
    } catch (error) {
      this.availability = { state: 'unavailable', reason: errorMessage(error) };
      this.emit();
      this.initialization = undefined;
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAvailability(): NotificationAvailability {
    return { ...this.availability };
  }

  subscribe(listener: NotificationStoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): NotificationSnapshot {
    return {
      ...this.snapshot,
      records: this.snapshot.records.map((record) => ({
        ...record,
        actions: record.actions ? [...record.actions] : undefined,
      })),
    };
  }

  setQuietHoursPolicy(policy: NotificationQuietHoursPolicy): void {
    const problem = validateQuietHoursPolicy(policy);
    if (problem) throw new Error(problem);
    this.quietHours = policy;
  }

  stack(): NotificationRecord[] {
    return notificationStack(this.snapshot.records);
  }

  history(): NotificationRecord[] {
    return notificationHistory(this.snapshot.records);
  }

  search(query: NotificationSearchQuery): NotificationRecord[] {
    return searchNotifications(this.snapshot.records, query);
  }

  export(query: NotificationSearchQuery = {}): NotificationExportRow[] {
    return this.search(query).map(projectNotificationForExport);
  }

  async publish(input: NotificationInput): Promise<NotificationMutationReceipt> {
    this.requireInitialized();
    const validationError = validateNotificationInput(input);
    if (validationError) return this.failedMutation('publish', validationError);

    const nowDate = this.now();
    const now = nowDate.toISOString();
    const decision = decideNotificationDelivery(input, this.quietHours, nowDate);
    const existing = this.snapshot.records.find((record) => record.id === input.id);
    const record = createNotificationRecord(
      input,
      now,
      this.snapshot.nextStackOrder,
      existing,
      decision.showToast ? undefined : decision.reason,
    );
    const records = existing
      ? this.snapshot.records.map((candidate) => candidate.id === input.id ? record : candidate)
      : [...this.snapshot.records, record];
    this.snapshot = {
      schemaVersion: 1,
      revision: this.snapshot.revision + 1,
      nextStackOrder: existing ? this.snapshot.nextStackOrder : this.snapshot.nextStackOrder + 1,
      records,
    };
    this.availability = { state: this.snapshot.records.length === 0 ? 'ready-empty' : 'ready' };
    this.emit();
    return this.persistMutation('publish', [record.id], []);
  }

  async publishOperationReceipt(receipt: OperationReceipt<unknown>): Promise<NotificationMutationReceipt> {
    return this.publish(notificationInputFromReceipt(receipt));
  }

  async dismiss(id: string): Promise<NotificationMutationReceipt> {
    return this.bulk('dismiss', [id]);
  }

  async delete(id: string): Promise<NotificationMutationReceipt> {
    return this.bulk('delete', [id]);
  }

  async markRead(id: string): Promise<NotificationMutationReceipt> {
    return this.bulk('mark-read', [id]);
  }

  async bulk(command: NotificationBulkCommand, selectedIds: ReadonlyArray<string>): Promise<NotificationMutationReceipt> {
    this.requireInitialized();
    const uniqueIds = [...new Set(selectedIds)];
    if (uniqueIds.length === 0) return this.failedMutation(command, 'No notifications were selected.');

    const result = applyNotificationBulkCommand(
      this.snapshot.records,
      uniqueIds,
      command,
      this.now().toISOString(),
    );
    if (result.changedIds.length === 0) {
      return {
        mutationId: this.idFactory(),
        command,
        outcome: 'failed',
        changedIds: [],
        skipped: result.skipped,
        completedAt: this.now().toISOString(),
        reason: result.skipped.map((skip) => `${skip.id}: ${skip.reason}`).join('; ') || 'Nothing changed.',
      };
    }

    this.snapshot = {
      ...this.snapshot,
      revision: this.snapshot.revision + 1,
      records: result.records,
    };
    this.availability = { state: this.snapshot.records.length === 0 ? 'ready-empty' : 'ready' };
    this.emit();
    return this.persistMutation(command, result.changedIds, result.skipped);
  }

  private async persistMutation(
    command: 'publish' | NotificationBulkCommand,
    changedIds: ReadonlyArray<string>,
    skipped: ReadonlyArray<{ readonly id: string; readonly reason: string }>,
  ): Promise<NotificationMutationReceipt> {
    const mutationId = this.idFactory();
    const snapshot = this.getSnapshot();
    try {
      const persistenceReceipt = await this.enqueuePersistence(snapshot);
      const invalid = persistenceReceiptProblem(persistenceReceipt, snapshot);
      if (invalid) {
        this.availability = { state: 'unavailable', reason: invalid };
        this.emit();
        return {
          mutationId,
          command,
          outcome: 'partial',
          changedIds,
          skipped,
          completedAt: this.now().toISOString(),
          reason: invalid,
        };
      }
      if (skipped.length > 0) {
        return {
          mutationId,
          command,
          outcome: 'partial',
          changedIds,
          skipped,
          completedAt: this.now().toISOString(),
          persistenceReceipt,
          reason: 'Some selected notifications were not changed.',
        };
      }
      return {
        mutationId,
        command,
        outcome: 'succeeded',
        changedIds,
        skipped,
        completedAt: this.now().toISOString(),
        persistenceReceipt,
      };
    } catch (error) {
      this.availability = { state: 'unavailable', reason: errorMessage(error) };
      this.emit();
      return {
        mutationId,
        command,
        outcome: 'partial',
        changedIds,
        skipped,
        completedAt: this.now().toISOString(),
        reason: `The in-memory change landed, but notification history was not persisted: ${errorMessage(error)}`,
      };
    }
  }

  private failedMutation(
    command: 'publish' | NotificationBulkCommand,
    reason: string,
  ): NotificationMutationReceipt {
    return {
      mutationId: this.idFactory(),
      command,
      outcome: 'failed',
      changedIds: [],
      skipped: [],
      completedAt: this.now().toISOString(),
      reason,
    };
  }

  private enqueuePersistence(snapshot: NotificationSnapshot): Promise<NotificationPersistenceReceipt> {
    const write = this.persistenceTail.then(() => this.options.persistence.save(snapshot));
    this.persistenceTail = write.then(() => undefined, () => undefined);
    return write;
  }

  private requireInitialized(): void {
    if (!this.initialized) throw new Error('NotificationStore.initialize() must complete before use.');
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

function validateSnapshot(snapshot: NotificationSnapshot): NotificationSnapshot {
  if (snapshot.schemaVersion !== 1) throw new Error(`Unsupported notification snapshot schema ${snapshot.schemaVersion}.`);
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) throw new Error('Invalid notification revision.');
  if (!Number.isSafeInteger(snapshot.nextStackOrder) || snapshot.nextStackOrder < 1) {
    throw new Error('Invalid notification stacking order.');
  }
  const ids = new Set<string>();
  for (const record of snapshot.records) {
    const problem = validateNotificationInput(record);
    if (problem) throw new Error(`Invalid stored notification ${record.id}: ${problem}`);
    if (ids.has(record.id)) throw new Error(`Duplicate stored notification id ${record.id}.`);
    if (record.state !== 'active' && record.state !== 'dismissed') throw new Error(`Invalid notification state ${record.state}.`);
    if (!Number.isSafeInteger(record.version) || record.version < 1) throw new Error(`Invalid version for notification ${record.id}.`);
    if (!Number.isSafeInteger(record.stackOrder) || record.stackOrder < 1) {
      throw new Error(`Invalid stacking order for notification ${record.id}.`);
    }
    if (!Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))) {
      throw new Error(`Invalid timestamps for notification ${record.id}.`);
    }
    ids.add(record.id);
  }
  const highestStackOrder = snapshot.records.reduce((highest, record) => Math.max(highest, record.stackOrder), 0);
  if (snapshot.nextStackOrder <= highestStackOrder) throw new Error('Notification stacking sequence would reuse an existing value.');
  return {
    ...snapshot,
    records: snapshot.records.map((record) => ({ ...record, actions: [...(record.actions ?? [])] })),
  };
}

function persistenceReceiptProblem(
  receipt: NotificationPersistenceReceipt,
  snapshot: NotificationSnapshot,
): string | undefined {
  if (!receipt.receiptId.trim()) return 'Persistence returned no receipt id.';
  if (!receipt.observationRef.trim()) return 'Persistence returned no observation reference.';
  if (!Number.isFinite(Date.parse(receipt.observedAt))) return 'Persistence returned an invalid observation time.';
  if (receipt.snapshotRevision !== snapshot.revision) return 'Persistence observed a different snapshot revision.';
  if (receipt.storedCount !== snapshot.records.length) return 'Persistence observed a different notification count.';
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
