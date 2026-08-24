import { useSyncExternalStore } from 'react';
import { DestructiveActionGate } from './destructive-action-gate';
import {
  getNotificationDeleteRequest,
  initializeMountedNotificationStore,
  mountedNotificationStore,
  settleNotificationDelete,
  subscribeNotificationDeleteRequest,
} from './notification-runtime';

export function NotificationDeleteGate() {
  const request = useSyncExternalStore(
    subscribeNotificationDeleteRequest,
    getNotificationDeleteRequest,
    getNotificationDeleteRequest,
  );
  if (!request) return null;
  return <DestructiveActionGate
    actionLabel={`delete ${request.ids.length} notification${request.ids.length === 1 ? '' : 's'}`}
    preview={request.preview}
    onCancel={() => settleNotificationDelete(false)}
    onComplete={() => settleNotificationDelete(true)}
    onConfirm={async () => {
      await initializeMountedNotificationStore();
      const receipt = await mountedNotificationStore.bulk('delete', request.ids);
      if (receipt.outcome !== 'succeeded') throw new Error(receipt.reason ?? 'The selected notifications could not be deleted.');
    }}
  />;
}
