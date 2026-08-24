import type {
  OperationProgress,
  OperationReceiptId,
  OperationRetryReference,
  OperationUndoReference,
} from './operations.js';

export type NotificationId = string;
export type NotificationSeverity = 'info' | 'progress' | 'success' | 'warning' | 'error';
export type NotificationState = 'active' | 'dismissed';

export interface NotificationCommandAction {
  readonly kind: 'command' | 'open';
  readonly actionId: string;
  readonly label: string;
  readonly actionRef: string;
}

export interface NotificationRetryAction {
  readonly kind: 'retry';
  readonly actionId: string;
  readonly label: string;
  readonly retry: OperationRetryReference;
}

export interface NotificationUndoAction {
  readonly kind: 'undo';
  readonly actionId: string;
  readonly label: string;
  readonly undo: OperationUndoReference;
}

/** Every action is explicit. Undo cannot exist without a concrete inverse reference. */
export type NotificationAction =
  | NotificationCommandAction
  | NotificationRetryAction
  | NotificationUndoAction;

export interface NotificationInput {
  /** Stable identity supplied by the producer. */
  readonly id: NotificationId;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly body: string;
  readonly source: string;
  readonly actions?: ReadonlyArray<NotificationAction>;
  readonly progress?: OperationProgress;
  readonly operationReceiptId?: OperationReceiptId;
  /** Ignored for warning and error records, which always persist until dismissed. */
  readonly autoDismissAfterMs?: number;
}

export interface NotificationRecord extends NotificationInput {
  readonly version: number;
  readonly stackOrder: number;
  readonly state: NotificationState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly readAt?: string;
  readonly dismissedAt?: string;
  readonly toastSuppressedReason?: string;
}

export interface NotificationSnapshot {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly nextStackOrder: number;
  readonly records: ReadonlyArray<NotificationRecord>;
}

export interface NotificationPersistenceReceipt {
  readonly receiptId: string;
  readonly snapshotRevision: number;
  readonly storedCount: number;
  readonly observedAt: string;
  readonly observationRef: string;
}

export interface NotificationPersistenceAdapter {
  load(): Promise<NotificationSnapshot | undefined>;
  /** Resolve only after the adapter has read back or otherwise observed the write. */
  save(snapshot: NotificationSnapshot): Promise<NotificationPersistenceReceipt>;
}

export type NotificationBulkCommand = 'dismiss' | 'delete' | 'mark-read';

export interface NotificationMutationSkip {
  readonly id: NotificationId;
  readonly reason: string;
}

interface NotificationMutationReceiptBase {
  readonly mutationId: string;
  readonly command: 'publish' | NotificationBulkCommand;
  readonly changedIds: ReadonlyArray<NotificationId>;
  readonly skipped: ReadonlyArray<NotificationMutationSkip>;
  readonly completedAt: string;
}

export interface SuccessfulNotificationMutationReceipt extends NotificationMutationReceiptBase {
  readonly outcome: 'succeeded';
  readonly persistenceReceipt: NotificationPersistenceReceipt;
}

export interface PartialNotificationMutationReceipt extends NotificationMutationReceiptBase {
  readonly outcome: 'partial';
  readonly persistenceReceipt?: NotificationPersistenceReceipt;
  readonly reason: string;
}

export interface FailedNotificationMutationReceipt extends NotificationMutationReceiptBase {
  readonly outcome: 'failed';
  readonly reason: string;
}

/** A successful mutation is not representable without an observed persistence receipt. */
export type NotificationMutationReceipt =
  | SuccessfulNotificationMutationReceipt
  | PartialNotificationMutationReceipt
  | FailedNotificationMutationReceipt;

export interface QuietHoursWindow {
  /** JavaScript weekday numbers, Sunday 0 through Saturday 6. */
  readonly weekdays: ReadonlyArray<number>;
  /** Local wall-clock time in HH:mm form. */
  readonly start: string;
  readonly end: string;
}

export interface NotificationQuietHoursPolicy {
  readonly enabled: boolean;
  readonly timeZone: string;
  readonly windows: ReadonlyArray<QuietHoursWindow>;
  readonly mode: 'suppress-info-success-progress' | 'suppress-all-toasts';
}

export interface NotificationSearchQuery {
  readonly text?: string;
  readonly severities?: ReadonlyArray<NotificationSeverity>;
  readonly states?: ReadonlyArray<NotificationState>;
  readonly sources?: ReadonlyArray<string>;
}

export interface NotificationExportRow {
  readonly id: NotificationId;
  readonly severity: NotificationSeverity;
  readonly state: NotificationState;
  readonly title: string;
  readonly body: string;
  readonly source: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly readAt: string;
  readonly dismissedAt: string;
  readonly operationReceiptId: string;
  readonly actionLabels: ReadonlyArray<string>;
}
