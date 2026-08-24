import type { NotificationInput, NotificationPersistenceAdapter, NotificationPersistenceReceipt, NotificationSnapshot } from '../../../shared/notifications';
import { NotificationStore } from './notification-store';
import { createDurableStorage } from './durable-storage';

const storage = createDurableStorage(typeof window === 'undefined' ? undefined : window.dingDesktop);
const persistence: NotificationPersistenceAdapter = {
  async load() { await storage.bootstrap(); const raw = storage.storage.getItem('notification.center.auth-lock'); if (!raw) return undefined; try { return JSON.parse(raw) as NotificationSnapshot; } catch { return undefined; } },
  async save(snapshot: NotificationSnapshot): Promise<NotificationPersistenceReceipt> { storage.storage.setItem('notification.center.auth-lock', JSON.stringify(snapshot)); return { receiptId: `auth-notification-${snapshot.revision}`, snapshotRevision: snapshot.revision, storedCount: snapshot.records.length, observedAt: new Date().toISOString(), observationRef: 'durable-settings-store' }; },
};
const store = new NotificationStore({ persistence });
let ready: Promise<void> | undefined;
function initialize(): Promise<void> { if (!ready) ready = storage.bootstrap().then(() => store.initialize()); return ready; }
export async function publishAuthHistoryWarning(body: string): Promise<void> { await initialize(); await store.publish({ id: `auth-history-warning-${Date.now()}`, severity: 'warning', title: 'Authenticator history unavailable', body, source: 'auth-lock' }); }
export { store as authNotificationStore };
