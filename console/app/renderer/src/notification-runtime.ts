import type {
  NotificationPersistenceAdapter,
  NotificationPersistenceReceipt,
  NotificationSnapshot,
} from '../../../shared/notifications';
import { NotificationStore } from './notification-store';
import { createDurableStorage } from './durable-storage';

const notificationStorage = createDurableStorage(typeof window === 'undefined' ? undefined : window.dingDesktop);
const notificationPersistence: NotificationPersistenceAdapter = {
  async load() {
    await notificationStorage.bootstrap();
    const raw = notificationStorage.storage.getItem('notification.center');
    if (!raw) return undefined;
    try { return JSON.parse(raw) as NotificationSnapshot; } catch { throw new Error('Notification history is malformed.'); }
  },
  async save(snapshot: NotificationSnapshot): Promise<NotificationPersistenceReceipt> {
    notificationStorage.storage.setItem('notification.center', JSON.stringify(snapshot));
    return {
      receiptId: `notification-${snapshot.revision}`,
      snapshotRevision: snapshot.revision,
      storedCount: snapshot.records.length,
      observedAt: new Date().toISOString(),
      observationRef: 'durable-settings-store',
    };
  },
};

/** One mounted store feeds both the generated product center and mounted feature surfaces. */
export const mountedNotificationStore = new NotificationStore({ persistence: notificationPersistence });

export interface NotificationDeleteRequest {
  readonly ids: ReadonlyArray<string>;
  readonly preview: string;
  readonly resolve: (confirmed: boolean) => void;
}

let deleteRequest: NotificationDeleteRequest | undefined;
const deleteRequestListeners = new Set<() => void>();

export function getNotificationDeleteRequest(): NotificationDeleteRequest | undefined {
  return deleteRequest;
}

export function subscribeNotificationDeleteRequest(listener: () => void): () => void {
  deleteRequestListeners.add(listener);
  return () => deleteRequestListeners.delete(listener);
}

function emitDeleteRequest(): void {
  for (const listener of deleteRequestListeners) listener();
}

export function requestNotificationDelete(ids: ReadonlyArray<string>, preview: string): Promise<boolean> {
  if (ids.length === 0 || deleteRequest) return Promise.resolve(false);
  return new Promise((resolve) => {
    deleteRequest = { ids: [...ids], preview, resolve };
    emitDeleteRequest();
  });
}

export function settleNotificationDelete(confirmed: boolean): void {
  const current = deleteRequest;
  deleteRequest = undefined;
  current?.resolve(confirmed);
  emitDeleteRequest();
}

let initialization: Promise<void> | undefined;

export function initializeMountedNotificationStore(): Promise<void> {
  if (!initialization) {
    initialization = mountedNotificationStore.initialize()
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }
  return initialization;
}

export function retryMountedNotificationStore(): Promise<void> {
  initialization = mountedNotificationStore.reload()
    .catch((error) => {
      initialization = undefined;
      throw error;
    });
  return initialization;
}
