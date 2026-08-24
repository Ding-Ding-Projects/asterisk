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
  signal?: { readonly aborted: boolean };
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
  | { item: T; status: 'failed'; code: string; reason: string; retryable: boolean };

export interface BulkProgress {
  completed: number;
  total: number;
  counts: Readonly<Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'failed', number>>;
}

export interface BulkUndoPlan<T> {
  actionId: string;
  items: ReadonlyArray<{ item: T; receipt: BulkMutationReceipt }>;
  source: 'inverse-handler' | 'history-revision';
}

export interface BulkRunResult<T> {
  actionId: string;
  outcomes: ReadonlyArray<BulkItemOutcome<T>>;
  counts: Readonly<Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'failed', number>>;
  undo?: BulkUndoPlan<T>;
}

export interface RunBulkOptions {
  concurrency?: number;
  signal?: { readonly aborted: boolean };
  onProgress?: (progress: BulkProgress) => void;
}

const ALL_OUTCOME_STATUSES: ReadonlyArray<BulkSuccessStatus | 'skipped' | 'cancelled' | 'failed'> = [
  'converted', 'saved', 'exported', 'deleted', 'moved', 'copied', 'duplicated', 'renamed',
  'tagged', 'untagged', 'enabled', 'disabled', 'retried', 'changed', 'skipped', 'cancelled', 'failed',
];

function outcomeCounts<T>(outcomes: ReadonlyArray<BulkItemOutcome<T>>): Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'failed', number> {
  const counts = Object.fromEntries(ALL_OUTCOME_STATUSES.map((status) => [status, 0])) as Record<BulkSuccessStatus | 'skipped' | 'cancelled' | 'failed', number>;
  outcomes.forEach((outcome) => { counts[outcome.status] += 1; });
  return counts;
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
      try {
        outcomes[index] = mapMutation(item, plan.action.successStatus, await plan.action.execute(item, { signal: options.signal }));
      } catch (error) {
        outcomes[index] = {
          item,
          status: 'failed',
          code: 'handler-threw',
          reason: error instanceof Error ? error.message : String(error),
          retryable: false,
        };
      }
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
  const outcomes: Array<BulkItemOutcome<T>> = [];
  for (const { item, receipt } of [...undo.items].reverse()) {
    if (options.signal?.aborted) {
      outcomes.push({ item, status: 'cancelled', reason: 'Undo was cancelled before this item started.' });
      continue;
    }
    try {
      outcomes.push(mapMutation(item, 'changed', await action.revert(item, receipt, { signal: options.signal })));
    } catch (error) {
      outcomes.push({
        item,
        status: 'failed',
        code: 'inverse-handler-threw',
        reason: error instanceof Error ? error.message : String(error),
        retryable: false,
      });
    }
    options.onProgress?.({ completed: outcomes.length, total: undo.items.length, counts: outcomeCounts(outcomes) });
  }
  return { status: 'complete', outcomes };
}
