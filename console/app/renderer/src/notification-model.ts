import type {
  NotificationAction,
  NotificationBulkCommand,
  NotificationExportRow,
  NotificationInput,
  NotificationQuietHoursPolicy,
  NotificationRecord,
  NotificationSearchQuery,
  NotificationSeverity,
  NotificationState,
} from '../../../shared/notifications';
import type { OperationReceipt } from '../../../shared/operations';
import { isObservedSuccess } from '../../../shared/operations';

export interface NotificationDeliveryDecision {
  readonly record: true;
  readonly showToast: boolean;
  readonly reason?: string;
}

export interface NotificationBulkResult {
  readonly records: ReadonlyArray<NotificationRecord>;
  readonly changedIds: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<{ readonly id: string; readonly reason: string }>;
}

export function validateNotificationInput(input: NotificationInput): string | undefined {
  if (!input.id.trim()) return 'Notification id is required.';
  if (!input.title.trim()) return 'Notification title is required.';
  if (!input.body.trim()) return 'Notification body is required.';
  if (!input.source.trim()) return 'Notification source is required.';
  if (input.progress) {
    if (input.progress.total < 0 || input.progress.completed < 0) return 'Progress cannot be negative.';
    if (input.progress.completed > input.progress.total) return 'Progress cannot exceed its total.';
  }
  if (input.autoDismissAfterMs !== undefined && (!Number.isFinite(input.autoDismissAfterMs) || input.autoDismissAfterMs <= 0)) {
    return 'Auto-dismiss duration must be a positive finite number.';
  }
  const actionIds = new Set<string>();
  for (const action of input.actions ?? []) {
    if (!action.actionId.trim() || !action.label.trim()) return 'Notification actions require an id and label.';
    if (actionIds.has(action.actionId)) return `Notification action ${action.actionId} is duplicated.`;
    actionIds.add(action.actionId);
    if (action.kind === 'command' || action.kind === 'open') {
      if (!action.actionRef.trim()) return `Notification action ${action.actionId} has no destination.`;
    } else if (action.kind === 'retry') {
      if (!action.retry.priorOperationId.trim() || !action.retry.operationType.trim() || !action.retry.idempotencyKey.trim()) {
        return `Retry action ${action.actionId} has an incomplete operation reference.`;
      }
    } else if (action.kind === 'undo') {
      if (!action.undo.target.targetType.trim() || !action.undo.target.targetId.trim()) {
        return `Undo action ${action.actionId} has an incomplete target reference.`;
      }
      if (action.undo.kind === 'inverse-operation' && (!action.undo.operationType.trim() || !action.undo.idempotencyKey.trim())) {
        return `Undo action ${action.actionId} has an incomplete inverse-operation reference.`;
      }
      if (action.undo.kind === 'history-revision' && (
        !action.undo.historyId.trim() ||
        !action.undo.revision.trim() ||
        !action.undo.restoreOperationType.trim() ||
        !action.undo.idempotencyKey.trim()
      )) {
        return `Undo action ${action.actionId} has an incomplete history revision reference.`;
      }
    }
  }
  return undefined;
}

export function createNotificationRecord(
  input: NotificationInput,
  now: string,
  stackOrder: number,
  existing?: NotificationRecord,
  toastSuppressedReason?: string,
): NotificationRecord {
  const validationError = validateNotificationInput(input);
  if (validationError) throw new Error(validationError);

  const persistentSeverity = input.severity === 'warning' || input.severity === 'error';
  return {
    ...input,
    actions: [...(input.actions ?? [])],
    autoDismissAfterMs: persistentSeverity ? undefined : input.autoDismissAfterMs,
    version: (existing?.version ?? 0) + 1,
    stackOrder: existing?.stackOrder ?? stackOrder,
    state: 'active',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    readAt: existing?.readAt,
    dismissedAt: undefined,
    toastSuppressedReason,
  };
}

export function dismissNotification(record: NotificationRecord, now: string): NotificationRecord {
  if (record.state === 'dismissed') return record;
  return { ...record, state: 'dismissed', dismissedAt: now, updatedAt: now, version: record.version + 1 };
}

export function markNotificationRead(record: NotificationRecord, now: string): NotificationRecord {
  if (record.readAt) return record;
  return { ...record, readAt: now, updatedAt: now, version: record.version + 1 };
}

export function notificationStack(records: ReadonlyArray<NotificationRecord>): NotificationRecord[] {
  return records
    .filter((record) => record.state === 'active' && !record.toastSuppressedReason)
    .slice()
    .sort((left, right) => right.stackOrder - left.stackOrder);
}

export function notificationHistory(records: ReadonlyArray<NotificationRecord>): NotificationRecord[] {
  return records.slice().sort((left, right) => {
    const byTime = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    return byTime || right.stackOrder - left.stackOrder;
  });
}

export function decideNotificationDelivery(
  input: NotificationInput,
  policy: NotificationQuietHoursPolicy,
  now: Date,
): NotificationDeliveryDecision {
  if (!isQuietHoursActive(policy, now)) return { record: true, showToast: true };

  if (policy.mode === 'suppress-all-toasts') {
    return { record: true, showToast: false, reason: 'Quiet hours suppress all toasts.' };
  }
  if (input.severity === 'info' || input.severity === 'success' || input.severity === 'progress') {
    return { record: true, showToast: false, reason: 'Quiet hours suppress non-warning toasts.' };
  }
  return { record: true, showToast: true };
}

export function isQuietHoursActive(policy: NotificationQuietHoursPolicy, now: Date): boolean {
  if (!policy.enabled || policy.windows.length === 0) return false;
  const clock = localClock(now, policy.timeZone);
  if (!clock) return false;

  return policy.windows.some((window) => {
    const start = minutesOfDay(window.start);
    const end = minutesOfDay(window.end);
    if (start === undefined || end === undefined || window.weekdays.length === 0) return false;
    if (start === end) return window.weekdays.includes(clock.weekday);
    if (start < end) {
      return window.weekdays.includes(clock.weekday) && clock.minutes >= start && clock.minutes < end;
    }
    const previousWeekday = (clock.weekday + 6) % 7;
    return (
      (window.weekdays.includes(clock.weekday) && clock.minutes >= start) ||
      (window.weekdays.includes(previousWeekday) && clock.minutes < end)
    );
  });
}

export function validateQuietHoursPolicy(policy: NotificationQuietHoursPolicy): string | undefined {
  if (!policy.timeZone.trim()) return 'Quiet-hours time zone is required.';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: policy.timeZone }).format(new Date(0));
  } catch {
    return `Quiet-hours time zone ${policy.timeZone} is invalid.`;
  }
  for (const window of policy.windows) {
    if (minutesOfDay(window.start) === undefined || minutesOfDay(window.end) === undefined) {
      return 'Quiet-hours windows require valid HH:mm start and end times.';
    }
    if (window.weekdays.length === 0 || window.weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
      return 'Quiet-hours windows require weekdays numbered zero through six.';
    }
  }
  return undefined;
}

export function applyNotificationBulkCommand(
  records: ReadonlyArray<NotificationRecord>,
  selectedIds: ReadonlyArray<string>,
  command: NotificationBulkCommand,
  now: string,
): NotificationBulkResult {
  const selected = new Set(selectedIds);
  const found = new Set<string>();
  const changedIds: string[] = [];
  const next: NotificationRecord[] = [];

  for (const record of records) {
    if (!selected.has(record.id)) {
      next.push(record);
      continue;
    }
    found.add(record.id);
    if (command === 'delete') {
      changedIds.push(record.id);
      continue;
    }
    const changed = command === 'dismiss'
      ? dismissNotification(record, now)
      : markNotificationRead(record, now);
    next.push(changed);
    if (changed !== record) changedIds.push(record.id);
  }

  const skipped = selectedIds
    .filter((id) => !found.has(id))
    .map((id) => ({ id, reason: 'Notification does not exist.' }));
  for (const id of selectedIds) {
    if (found.has(id) && !changedIds.includes(id) && command !== 'delete') {
      skipped.push({ id, reason: command === 'dismiss' ? 'Already dismissed.' : 'Already read.' });
    }
  }
  return { records: next, changedIds, skipped };
}

export function searchNotifications(
  records: ReadonlyArray<NotificationRecord>,
  query: NotificationSearchQuery,
): NotificationRecord[] {
  const text = query.text?.trim().toLocaleLowerCase();
  return notificationHistory(records).filter((record) => {
    if (query.severities?.length && !query.severities.includes(record.severity)) return false;
    if (query.states?.length && !query.states.includes(record.state)) return false;
    if (query.sources?.length && !query.sources.includes(record.source)) return false;
    if (!text) return true;
    const haystack = [record.title, record.body, record.source, ...(record.actions ?? []).map((action) => action.label)]
      .join('\n')
      .toLocaleLowerCase();
    return haystack.includes(text);
  });
}

export function projectNotificationForExport(record: NotificationRecord): NotificationExportRow {
  return {
    id: record.id,
    severity: record.severity,
    state: record.state,
    title: record.title,
    body: record.body,
    source: record.source,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    readAt: record.readAt ?? '',
    dismissedAt: record.dismissedAt ?? '',
    operationReceiptId: record.operationReceiptId ?? '',
    actionLabels: (record.actions ?? []).map((action) => action.label),
  };
}

export function notificationInputFromReceipt(receipt: OperationReceipt<unknown>): NotificationInput {
  const severity = severityForReceipt(receipt);
  const invalidSuccessClaim =
    (receipt.outcome === 'succeeded' || receipt.outcome === 'partial') && !isObservedSuccess(receipt);
  const actions: NotificationAction[] = [];
  if (receipt.retry) {
    actions.push({ kind: 'retry', actionId: `retry:${receipt.receiptId}`, label: 'Retry', retry: receipt.retry });
  }
  if (receipt.undo && !invalidSuccessClaim) {
    actions.push({ kind: 'undo', actionId: `undo:${receipt.receiptId}`, label: 'Undo', undo: receipt.undo });
  }
  if (receipt.outcome === 'unavailable' && receipt.recoveryAction) {
    actions.push({
      kind: 'open',
      actionId: receipt.recoveryAction.actionId,
      label: receipt.recoveryAction.label,
      actionRef: receipt.recoveryAction.destination,
    });
  }
  if (receipt.outcome === 'disabled' && receipt.enableAction) {
    actions.push({
      kind: 'command',
      actionId: receipt.enableAction.actionId,
      label: receipt.enableAction.label,
      actionRef: receipt.enableAction.destination,
    });
  }
  const title = invalidSuccessClaim
    ? 'The operation returned an invalid success receipt'
    : receipt.outcome === 'succeeded'
      ? `${receipt.target.label} completed`
      : receipt.outcome === 'partial'
        ? `${receipt.target.label} partially completed`
        : `${receipt.target.label} ${receipt.outcome}`;

  return {
    id: `operation:${receipt.operationId}`,
    severity,
    title,
    body: invalidSuccessClaim ? 'The operation claimed success without an observed effect.' : receipt.message,
    source: receipt.operationType,
    actions,
    operationReceiptId: receipt.receiptId,
    progress: receipt.progress,
    autoDismissAfterMs: severity === 'info' || severity === 'success' ? 6_000 : undefined,
  };
}

export function severityForReceipt(receipt: OperationReceipt<unknown>): NotificationSeverity {
  if (receipt.outcome === 'succeeded') return isObservedSuccess(receipt) ? 'success' : 'error';
  if (receipt.outcome === 'partial') return isObservedSuccess(receipt) ? 'warning' : 'error';
  if (receipt.outcome === 'cancelled') return 'info';
  if (receipt.outcome === 'unavailable' || receipt.outcome === 'disabled' || receipt.outcome === 'refused') {
    return 'warning';
  }
  return 'error';
}

function minutesOfDay(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function localClock(date: Date, timeZone: string): { weekday: number; minutes: number } | undefined {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes): string | undefined =>
      parts.find((part) => part.type === type)?.value;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday') ?? '');
    const hours = Number(value('hour'));
    const minutes = Number(value('minute'));
    if (weekday < 0 || !Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
    return { weekday, minutes: hours * 60 + minutes };
  } catch {
    return undefined;
  }
}

export function isNotificationState(value: string): value is NotificationState {
  return value === 'active' || value === 'dismissed';
}
