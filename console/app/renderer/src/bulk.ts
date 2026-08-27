import {
  sameSelectionContext,
  type SelectionContext,
  type SelectionItem,
  type SelectionState,
} from './selection-model';

export type BulkSuccessStatus =
  | 'converted'
  | 'saved'
  | 'exported'
  | 'deleted'
  | 'moved'
  | 'copied'
  | 'duplicated'
  | 'renamed'
  | 'tagged'
  | 'untagged'
  | 'enabled'
  | 'disabled'
  | 'retried'
  | 'changed';

export interface BulkMutationReceipt {
  operationId: string;
  completedAt: string;
  inverseToken?: string;
  historyRevision?: string;
}

export type BulkMutationResult =
  | { status: 'confirmed'; receipt: BulkMutationReceipt }
  | { status: 'skipped'; reason: string }
  | { status: 'cancelled'; reason: string }
  | { status: 'failed'; code: string; reason: string; retryable: boolean };

export type BulkCapability = { status: 'enabled' } | { status: 'disabled'; reason: string };

export interface BulkExecutionContext {
  signal: AbortSignal;
  itemDeadlineMs: number;
}

export interface ExecutableBulkAction<T extends SelectionItem> {
  availability: 'enabled';
  id: string;
  label: string;
  successStatus: BulkSuccessStatus;
  destructive: boolean;
  capability(item: T): BulkCapability;
  execute(item: T, context: BulkExecutionContext): Promise<BulkMutationResult>;
  revert?: (
    item: T,
    receipt: BulkMutationReceipt,
    context: BulkExecutionContext,
  ) => Promise<BulkMutationResult>;
}

export interface DisabledBulkAction {
  availability: 'disabled';
  id: string;
  label: string;
  reason: string;
  destructive: boolean;
}

export type BulkAction<T extends SelectionItem> = ExecutableBulkAction<T> | DisabledBulkAction;

export function unsupportedBulkAction(
  id: string,
  label: string,
  reason: string,
  destructive = false,
): DisabledBulkAction {
  const exactReason = reason.trim();
  if (!exactReason) throw new Error(`Disabled bulk action ${id} requires an exact reason.`);
  return { availability: 'disabled', id, label, reason: exactReason, destructive };
}

export interface BulkPlanExclusion<T> {
  item: T;
  reason: string;
}

export interface BulkPreview<T extends SelectionItem> {
  status: 'ready';
  action: ExecutableBulkAction<T>;
  selectedCount: number;
  affectedCount: number;
  excludedCount: number;
  affected: ReadonlyArray<T>;
  excluded: ReadonlyArray<BulkPlanExclusion<T>>;
  destructive: boolean;
}

export interface DisabledBulkPreview {
  status: 'disabled';
  actionId: string;
  reason: string;
  selectedCount: number;
}

export type BulkPlan<T extends SelectionItem> = BulkPreview<T> | DisabledBulkPreview;

export interface BulkPlanOptions {
  includePinned?: boolean;
  includeProtected?: boolean;
}

export interface BulkCollectionSnapshot<T extends SelectionItem> {
  context: SelectionContext;
  items: ReadonlyArray<T>;
}

export function planBulkAction<T extends SelectionItem>(
  action: BulkAction<T>,
  collection: BulkCollectionSnapshot<T>,
  selection: SelectionState,
  options: BulkPlanOptions = {},
): BulkPlan<T> {
  if (!sameSelectionContext(collection.context, selection.context)) {
    return {
      status: 'disabled',
      actionId: action.id,
      reason: 'The selection belongs to a different collection or query. Refresh the selection before continuing.',
      selectedCount: 0,
    };
  }
  const duplicateIds = collection.items
    .map((item) => item.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    return {
      status: 'disabled',
      actionId: action.id,
      reason: `The collection contains duplicate item identifiers: ${[...new Set(duplicateIds)].join(', ')}.`,
      selectedCount: selection.selectedIds.size,
    };
  }
  const availableIds = new Set(collection.items.map((item) => item.id));
  const missingIds = [...selection.selectedIds].filter((id) => !availableIds.has(id));
  if (missingIds.length > 0) {
    return {
      status: 'disabled',
      actionId: action.id,
      reason: `${missingIds.length} selected item(s) are no longer in this collection result. Refresh the selection before continuing.`,
      selectedCount: selection.selectedIds.size,
    };
  }
  const selected = collection.items.filter((item) => selection.selectedIds.has(item.id));
  if (action.availability === 'disabled') {
    return { status: 'disabled', actionId: action.id, reason: action.reason, selectedCount: selected.length };
  }

  const affected: T[] = [];
  const excluded: Array<BulkPlanExclusion<T>> = [];
  selected.forEach((item) => {
    if (item.protectedReason && !options.includeProtected) {
      excluded.push({ item, reason: item.protectedReason });
      return;
    }
    if (item.pinned && !options.includePinned) {
      excluded.push({ item, reason: 'Pinned items are excluded unless they are explicitly included.' });
      return;
    }
    const capability = action.capability(item);
    if (capability.status === 'disabled') {
      excluded.push({ item, reason: capability.reason });
      return;
    }
    affected.push(item);
  });

  return {
    status: 'ready',
    action,
    selectedCount: selected.length,
    affectedCount: affected.length,
    excludedCount: excluded.length,
    affected,
    excluded,
    destructive: action.destructive,
  };
}

export type BulkItemOutcome<T> =
  | { item: T; status: BulkSuccessStatus; receipt: BulkMutationReceipt }
  | { item: T; status: 'skipped'; reason: string }
  | { item: T; status: 'cancelled'; reason: string }
  | { item: T; status: 'timed-out'; code: 'deadline-exceeded'; reason: string; retryable: false }
  | { item: T; status: 'failed'; code: string; reason: string; retryable: boolean };

export interface BulkProgress {
  completed: number;
  total: number;
  counts: Readonly<Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'timed-out' | 'failed', number>>;
}

export interface BulkUndoPlan<T> {
  actionId: string;
  items: ReadonlyArray<{ item: T; receipt: BulkMutationReceipt }>;
  source: 'inverse-handler' | 'history-revision';
}

export interface BulkRunResult<T> {
  actionId: string;
  outcomes: ReadonlyArray<BulkItemOutcome<T>>;
  counts: Readonly<Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'timed-out' | 'failed', number>>;
  undo?: BulkUndoPlan<T>;
}

export const DEFAULT_BULK_ITEM_DEADLINE_MS = 30_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export interface RunBulkOptions {
  concurrency?: number;
  signal?: AbortSignal;
  itemDeadlineMs?: number;
  onProgress?: (progress: BulkProgress) => void;
}

type BulkOutcomeStatus = BulkSuccessStatus | 'skipped' | 'cancelled' | 'timed-out' | 'failed';

const ALL_OUTCOME_STATUSES: ReadonlyArray<BulkOutcomeStatus> = [
  'converted', 'saved', 'exported', 'deleted', 'moved', 'copied', 'duplicated', 'renamed',
  'tagged', 'untagged', 'enabled', 'disabled', 'retried', 'changed', 'skipped', 'cancelled',
  'timed-out', 'failed',
];

function outcomeCounts<T>(outcomes: ReadonlyArray<BulkItemOutcome<T>>): Record<BulkOutcomeStatus, number> {
  const counts = Object.fromEntries(ALL_OUTCOME_STATUSES.map((status) => [status, 0])) as Record<BulkOutcomeStatus, number>;
  outcomes.forEach((outcome) => { counts[outcome.status] += 1; });
  return counts;
}

function resolveItemDeadline(value: number | undefined): number {
  const deadline = value ?? DEFAULT_BULK_ITEM_DEADLINE_MS;
  if (!Number.isSafeInteger(deadline) || deadline <= 0 || deadline > MAX_TIMER_DELAY_MS) {
    throw new RangeError(`itemDeadlineMs must be a positive safe integer from 1 through ${MAX_TIMER_DELAY_MS}.`);
  }
  return deadline;
}

type BoundedOperationResult<T> =
  | { status: 'completed'; value: T }
  | { status: 'cancelled' }
  | { status: 'timed-out' }
  | { status: 'rejected' };

async function runBoundedOperation<T>(
  callerSignal: AbortSignal | undefined,
  itemDeadlineMs: number,
  invoke: (signal: AbortSignal) => Promise<T>,
): Promise<BoundedOperationResult<T>> {
  const controller = new AbortController();
  let termination: 'cancelled' | 'timed-out' | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let resolveTermination: ((result: BoundedOperationResult<T>) => void) | undefined;

  const terminate = (status: 'cancelled' | 'timed-out'): void => {
    if (termination) return;
    termination = status;
    controller.abort();
    resolveTermination?.({ status });
  };
  const onCallerAbort = (): void => terminate('cancelled');

  if (callerSignal?.aborted) {
    terminate('cancelled');
    return { status: 'cancelled' };
  }

  const terminationPromise = new Promise<BoundedOperationResult<T>>((resolve) => {
    resolveTermination = resolve;
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    timeoutId = setTimeout(() => terminate('timed-out'), itemDeadlineMs);
  });

  const operationPromise = Promise.resolve()
    .then(() => invoke(controller.signal))
    .then(
      (value): BoundedOperationResult<T> => termination ? { status: termination } : { status: 'completed', value },
      (): BoundedOperationResult<T> => termination ? { status: termination } : { status: 'rejected' },
    );

  try {
    return await Promise.race([operationPromise, terminationPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', onCallerAbort);
    resolveTermination = undefined;
  }
}

function mapMutation<T>(item: T, successStatus: BulkSuccessStatus, result: BulkMutationResult): BulkItemOutcome<T> {
  if (result.status === 'confirmed') {
    if (!result.receipt.operationId.trim() || !result.receipt.completedAt.trim() || !Number.isFinite(Date.parse(result.receipt.completedAt))) {
      return {
        item,
        status: 'failed',
        code: 'invalid-confirmation',
        reason: 'The action handler returned a confirmation without a valid operation identifier and completion time.',
        retryable: false,
      };
    }
    return { item, status: successStatus, receipt: result.receipt };
  }
  if (result.status === 'skipped') return { item, status: 'skipped', reason: result.reason };
  if (result.status === 'cancelled') return { item, status: 'cancelled', reason: result.reason };
  return { item, status: 'failed', code: result.code, reason: result.reason, retryable: result.retryable };
}

function mapBoundedMutation<T>(
  item: T,
  successStatus: BulkSuccessStatus,
  result: BoundedOperationResult<BulkMutationResult>,
): BulkItemOutcome<T> {
  if (result.status === 'completed') return mapMutation(item, successStatus, result.value);
  if (result.status === 'cancelled') {
    return { item, status: 'cancelled', reason: 'The operation was cancelled before the item completed.' };
  }
  if (result.status === 'timed-out') {
    return {
      item,
      status: 'timed-out',
      code: 'deadline-exceeded',
      reason: 'The item operation did not complete within its configured deadline.',
      retryable: false,
    };
  }
  return {
    item,
    status: 'failed',
    code: 'handler-rejected',
    reason: 'The item handler rejected without a typed failure result. Untyped details were not exposed.',
    retryable: false,
  };
}

function buildUndoPlan<T extends SelectionItem>(
  action: ExecutableBulkAction<T>,
  outcomes: ReadonlyArray<BulkItemOutcome<T>>,
): BulkUndoPlan<T> | undefined {
  if (!action.revert) return undefined;
  const confirmed: Array<{ item: T; receipt: BulkMutationReceipt }> = [];
  outcomes.forEach((outcome) => {
    if ('receipt' in outcome) confirmed.push({ item: outcome.item, receipt: outcome.receipt });
  });
  if (confirmed.length === 0 || confirmed.some(({ receipt }) => !receipt.inverseToken && !receipt.historyRevision)) return undefined;
  return {
    actionId: action.id,
    items: confirmed,
    source: confirmed.every(({ receipt }) => Boolean(receipt.historyRevision)) ? 'history-revision' : 'inverse-handler',
  };
}

export async function runBulkAction<T extends SelectionItem>(
  plan: BulkPlan<T>,
  options: RunBulkOptions = {},
): Promise<BulkRunResult<T>> {
  if (plan.status === 'disabled') throw new Error(`${plan.actionId} is disabled: ${plan.reason}`);

  const outcomes: Array<BulkItemOutcome<T> | undefined> = new Array(plan.affected.length).fill(undefined);
  let nextIndex = 0;
  let completed = 0;
  const concurrency = Math.min(Math.max(1, options.concurrency ?? 1), Math.max(1, plan.affected.length));
  const itemDeadlineMs = resolveItemDeadline(options.itemDeadlineMs);

  const report = (): void => {
    if (!options.onProgress) return;
    const settled = outcomes.filter((outcome): outcome is BulkItemOutcome<T> => Boolean(outcome));
    options.onProgress({ completed, total: plan.affected.length, counts: outcomeCounts(settled) });
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      if (options.signal?.aborted) return;
      const index = nextIndex;
      if (index >= plan.affected.length) return;
      nextIndex += 1;
      const item = plan.affected[index];
      const result = await runBoundedOperation(
        options.signal,
        itemDeadlineMs,
        (signal) => plan.action.execute(item, { signal, itemDeadlineMs }),
      );
      outcomes[index] = mapBoundedMutation(item, plan.action.successStatus, result);
      completed += 1;
      report();
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  outcomes.forEach((outcome, index) => {
    if (!outcome) outcomes[index] = { item: plan.affected[index], status: 'cancelled', reason: 'The batch was cancelled before this item started.' };
  });
  const settled = outcomes as Array<BulkItemOutcome<T>>;
  options.onProgress?.({ completed: settled.length, total: plan.affected.length, counts: outcomeCounts(settled) });
  const excludedOutcomes: Array<BulkItemOutcome<T>> = plan.excluded.map(({ item, reason }) => ({ item, status: 'skipped', reason }));
  const allOutcomes = [...settled, ...excludedOutcomes];
  return {
    actionId: plan.action.id,
    outcomes: allOutcomes,
    counts: outcomeCounts(allOutcomes),
    undo: buildUndoPlan(plan.action, settled),
  };
}

export type BulkUndoResult<T> =
  | { status: 'disabled'; reason: string }
  | { status: 'complete'; outcomes: ReadonlyArray<BulkItemOutcome<T>> };

export async function undoBulkAction<T extends SelectionItem>(
  action: ExecutableBulkAction<T>,
  undo: BulkUndoPlan<T> | undefined,
  options: RunBulkOptions = {},
): Promise<BulkUndoResult<T>> {
  if (!undo) return { status: 'disabled', reason: 'No confirmed inverse operation or history revision is available.' };
  if (!action.revert) {
    return { status: 'disabled', reason: 'This action has history evidence but no registered inverse handler in this surface.' };
  }
  const revert = action.revert;
  const itemDeadlineMs = resolveItemDeadline(options.itemDeadlineMs);
  const outcomes: Array<BulkItemOutcome<T>> = [];
  for (const { item, receipt } of [...undo.items].reverse()) {
    if (options.signal?.aborted) {
      outcomes.push({ item, status: 'cancelled', reason: 'Undo was cancelled before this item started.' });
      continue;
    }
    const result = await runBoundedOperation(
      options.signal,
      itemDeadlineMs,
      (signal) => revert(item, receipt, { signal, itemDeadlineMs }),
    );
    outcomes.push(mapBoundedMutation(item, 'changed', result));
    options.onProgress?.({ completed: outcomes.length, total: undo.items.length, counts: outcomeCounts(outcomes) });
  }
  return { status: 'complete', outcomes };
}

// --------------------------------------------------------------- bulk delete ceremony

/**
 * Recovers the selected ids from the confirmation ceremony the bulk "Delete" action
 * opens, so a confirmed delete can be routed back into `planBulk`/`summarise` instead
 * of sending a raw command straight to the target.
 *
 * The bulk Delete button (see App.tsx's `bulkActions`) opens its ceremony with an exact
 * title/command pair -- `Delete ${sel.length} objects` / `delete ${sel.join(' ')}` -- so
 * this recognises that exact shape and nothing else. A single row's own "Delete <name>"
 * ceremony (opened from a row's context menu, gated by `areYouSure` instead) uses a
 * title with no " objects" suffix and must never match here: the two go through
 * separate confirmation gates and this must not blur them together. Requiring the id
 * count parsed from the command to equal the count parsed from the title is the extra
 * check that keeps a coincidental "Delete <n> objects" title from a completely
 * unrelated ceremony from being treated as a bulk delete.
 */
export function parseBulkDeleteCeremony(title: string, command: string): string[] | undefined {
  const titleMatch = /^Delete (\d+) objects$/.exec(title);
  if (!titleMatch) return undefined;
  const expectedCount = Number(titleMatch[1]);

  const commandMatch = /^delete (.+)$/.exec(command);
  if (!commandMatch) return undefined;
  const ids = commandMatch[1].split(' ').filter((id) => id.length > 0);

  if (ids.length !== expectedCount) return undefined;
  return ids;
}
