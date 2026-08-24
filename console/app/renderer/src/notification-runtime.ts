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
    try { return JSON.parse(raw) as NotificationSnapshot; } catch { return undefined; }
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

let initialization: Promise<void> | undefined;

export function initializeMountedNotificationStore(): Promise<void> {
  if (!initialization) {
    initialization = notificationStorage.bootstrap()
      .then(() => mountedNotificationStore.initialize())
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }
  return initialization;
}
