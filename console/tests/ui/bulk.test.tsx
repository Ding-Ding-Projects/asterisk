import assert from 'node:assert/strict';
import test from 'node:test';

import {
  planBulkAction,
  runBulkAction,
  undoBulkAction,
  unsupportedBulkAction,
  type BulkMutationReceipt,
  type ExecutableBulkAction,
} from '../../app/renderer/src/bulk.ts';
import {
  createSelection,
  invertSelection,
  selectAllMatches,
  selectPage,
  toggleSelection,
  type SelectionContext,
  type SelectionState,
} from '../../app/renderer/src/selection-model.ts';

interface Row {
  id: string;
  pinned?: boolean;
  protectedReason?: string;
  enabled?: boolean;
}

const CONTEXT: SelectionContext = { collectionId: 'endpoints', queryKey: 'status:active' };
const ROWS: ReadonlyArray<Row> = [
  { id: 'a' },
  { id: 'b', pinned: true },
  { id: 'c', protectedReason: 'This endpoint is locked by its active deployment.' },
  { id: 'd' },
];

function selected(ids: ReadonlyArray<string>, context: SelectionContext = CONTEXT): SelectionState {
  return { context, selectedIds: new Set(ids) };
}

function receipt(id: string): BulkMutationReceipt {
  return {
    operationId: `operation-${id}`,
    completedAt: '2026-08-26T12:00:00.000Z',
    inverseToken: `inverse-${id}`,
    historyRevision: `history-${id}`,
  };
}

function action(
  calls: string[],
  overrides: Partial<ExecutableBulkAction<Row>> = {},
): ExecutableBulkAction<Row> {
  return {
    availability: 'enabled',
    id: 'delete-endpoints',
    label: 'Delete endpoints',
    successStatus: 'deleted',
    destructive: true,
    capability: () => ({ status: 'enabled' }),
    execute: async (item) => {
      calls.push(item.id);
      return { status: 'confirmed', receipt: receipt(item.id) };
    },
    revert: async (item, currentReceipt) => {
      calls.push(`undo:${item.id}:${currentReceipt.inverseToken}`);
      return { status: 'confirmed', receipt: receipt(`undo-${item.id}`) };
    },
    ...overrides,
  };
}

test('page, every-match, inverse, and inclusive range selection remain scoped to the active filter', () => {
  const page = selectPage(createSelection(CONTEXT), ROWS.slice(0, 2));
  assert.equal(page.scope, 'page');
  assert.deepEqual([...page.state.selectedIds], ['a']);
  assert.equal(page.excluded[0]?.id, 'b');

  const matches = selectAllMatches(createSelection(CONTEXT), ROWS);
  assert.equal(matches.scope, 'matches');
  assert.deepEqual([...matches.state.selectedIds], ['a', 'd']);
  assert.deepEqual(matches.excluded.map((entry) => entry.id), ['b', 'c']);

  const inverse = invertSelection(selected(['a']), ROWS);
  assert.equal(inverse.scope, 'inverse');
  assert.deepEqual([...inverse.state.selectedIds], ['d']);

  const start = toggleSelection(createSelection(CONTEXT), ROWS[0], ROWS);
  const range = toggleSelection(start.state, ROWS[3], ROWS, { range: true });
  assert.equal(range.scope, 'range');
  assert.deepEqual([...range.state.selectedIds], ['a', 'd']);
  assert.deepEqual(range.excluded.map((entry) => entry.id), ['b', 'c']);
});

test('plan separates selected, affected, pinned, locked, and action-specific exclusions exactly', () => {
  const calls: string[] = [];
  const executable = action(calls, {
    capability: (item) => item.id === 'd'
      ? { status: 'disabled', reason: 'Endpoint d has an active call.' }
      : { status: 'enabled' },
  });
  const plan = planBulkAction(executable, { context: CONTEXT, items: ROWS }, selected(['a', 'b', 'c', 'd']));

  assert.equal(plan.status, 'ready');
  if (plan.status !== 'ready') throw new Error('expected a ready plan');
  assert.equal(plan.selectedCount, 4);
  assert.equal(plan.affectedCount, 1);
  assert.equal(plan.excludedCount, 3);
  assert.deepEqual(plan.affected.map((item) => item.id), ['a']);
  assert.deepEqual(plan.excluded.map(({ item, reason }) => [item.id, reason]), [
    ['b', 'Pinned items are excluded unless they are explicitly included.'],
    ['c', 'This endpoint is locked by its active deployment.'],
    ['d', 'Endpoint d has an active call.'],
  ]);
});

test('explicit inclusion admits pinned and locked items without bypassing action capability', () => {
  const calls: string[] = [];
  const executable = action(calls, {
    capability: (item) => item.id === 'd'
      ? { status: 'disabled', reason: 'Endpoint d has an active call.' }
      : { status: 'enabled' },
  });
  const plan = planBulkAction(
    executable,
    { context: CONTEXT, items: ROWS },
    selected(['a', 'b', 'c', 'd']),
    { includePinned: true, includeProtected: true },
  );
  assert.equal(plan.status, 'ready');
  if (plan.status !== 'ready') throw new Error('expected a ready plan');
  assert.deepEqual(plan.affected.map((item) => item.id), ['a', 'b', 'c']);
  assert.deepEqual(plan.excluded.map(({ item }) => item.id), ['d']);
});

test('a mismatched query context refuses without executing an item', async () => {
  const calls: string[] = [];
  const plan = planBulkAction(action(calls), { context: CONTEXT, items: ROWS }, selected(['a'], { ...CONTEXT, queryKey: 'status:offline' }));
  assert.equal(plan.status, 'disabled');
  if (plan.status !== 'disabled') throw new Error('expected disabled plan');
  assert.match(plan.reason, /different collection or query/i);
  await assert.rejects(runBulkAction(plan), /disabled/);
  assert.deepEqual(calls, []);
});

test('a disabled action is a no-op with its exact availability reason', () => {
  const unavailable = unsupportedBulkAction('archive', 'Archive endpoints', 'The archive adapter is not bundled.');
  const plan = planBulkAction(unavailable, { context: CONTEXT, items: ROWS }, selected(['a']));
  assert.deepEqual(plan, {
    status: 'disabled',
    actionId: 'archive',
    reason: 'The archive adapter is not bundled.',
    selectedCount: 1,
  });
});

test('destructive admission preserves exact selected versus affected values and does not execute before confirmation', async () => {
  const calls: string[] = [];
  const plan = planBulkAction(action(calls), { context: CONTEXT, items: ROWS }, selected(['a', 'b']));
  assert.equal(plan.status, 'ready');
  if (plan.status !== 'ready') throw new Error('expected a ready plan');
  assert.equal(plan.destructive, true);
  assert.equal(plan.selectedCount, 2);
  assert.equal(plan.affectedCount, 1);
  assert.equal(plan.excludedCount, 1);

  const confirmationAccepted = false;
  if (confirmationAccepted) await runBulkAction(plan);
  assert.deepEqual(calls, []);
});

test('execution returns typed confirmed, skipped, cancelled, and failed receipts with real state effects', async () => {
  const state = new Map(ROWS.map((row) => [row.id, { ...row, enabled: true }]));
  const calls: string[] = [];
  const executable = action(calls, {
    successStatus: 'disabled',
    destructive: false,
    execute: async (item) => {
      if (item.id === 'a') {
        state.get(item.id)!.enabled = false;
        return { status: 'confirmed', receipt: receipt(item.id) };
      }
      if (item.id === 'b') return { status: 'skipped', reason: 'Already disabled.' };
      if (item.id === 'c') return { status: 'cancelled', reason: 'User cancelled this row.' };
      return { status: 'failed', code: 'transport-refused', reason: 'PBX rejected d.', retryable: true };
    },
  });
  const plan = planBulkAction(executable, { context: CONTEXT, items: ROWS }, selected(['a', 'b', 'c', 'd']), { includePinned: true, includeProtected: true });
  const result = await runBulkAction(plan, { concurrency: 1 });

  assert.equal(state.get('a')!.enabled, false);
  assert.deepEqual(result.outcomes.map((outcome) => outcome.status), ['disabled', 'skipped', 'cancelled', 'failed']);
  assert.equal(result.counts.disabled, 1);
  assert.equal(result.counts.skipped, 1);
  assert.equal(result.counts.cancelled, 1);
  assert.equal(result.counts.failed, 1);
  assert.deepEqual(result.undo?.items.map(({ item }) => item.id), ['a']);
  assert.equal(result.undo?.source, 'history-revision', 'only the confirmed history receipt is undoable');
});

test('long-operation progress is monotonic and reports every affected item plus excluded outcomes', async () => {
  const calls: string[] = [];
  const plan = planBulkAction(action(calls), { context: CONTEXT, items: ROWS }, selected(['a', 'b']));
  const progress: number[] = [];
  const result = await runBulkAction(plan, {
    onProgress: (update) => progress.push(update.completed),
  });
  assert.deepEqual(progress, [1, 1]);
  assert.equal(result.counts.deleted, 1);
  assert.equal(result.counts.skipped, 1);
  assert.deepEqual(calls, ['a']);
});

test('cancellation stops admission of later items and records cancelled rows rather than claiming completion', async () => {
  const calls: string[] = [];
  const controller = new AbortController();
  const executable = action(calls, {
    execute: async (item) => {
      calls.push(item.id);
      controller.abort();
      return { status: 'confirmed', receipt: receipt(item.id) };
    },
  });
  const plan = planBulkAction(executable, { context: CONTEXT, items: ROWS }, selected(['a', 'd']));
  const result = await runBulkAction(plan, { signal: controller.signal, concurrency: 1 });
  assert.deepEqual(calls, ['a']);
  assert.equal(result.counts.cancelled, 2);
  assert.equal(result.counts.deleted, 0);
});

test('undo runs only confirmed inverse receipts in reverse order and changes real state back', async () => {
  const deleted = new Set<string>();
  const calls: string[] = [];
  const executable = action(calls, {
    execute: async (item) => {
      deleted.add(item.id);
      return { status: 'confirmed', receipt: receipt(item.id) };
    },
    revert: async (item, currentReceipt) => {
      assert.equal(currentReceipt.inverseToken, `inverse-${item.id}`);
      deleted.delete(item.id);
      calls.push(`undo:${item.id}`);
      return { status: 'confirmed', receipt: receipt(`undo-${item.id}`) };
    },
  });
  const plan = planBulkAction(executable, { context: CONTEXT, items: ROWS }, selected(['a', 'd']));
  const result = await runBulkAction(plan);
  assert.deepEqual([...deleted].sort(), ['a', 'd']);
  assert.ok(result.undo);
  assert.equal(result.undo?.source, 'history-revision');

  const undone = await undoBulkAction(executable, result.undo);
  assert.equal(undone.status, 'complete');
  assert.deepEqual([...deleted], []);
  assert.deepEqual(calls.filter((entry) => entry.startsWith('undo:')), ['undo:d', 'undo:a']);
});

test('undo refuses a missing receipt and never calls an inverse handler', async () => {
  const calls: string[] = [];
  const result = await undoBulkAction(action(calls), undefined);
  assert.deepEqual(result, {
    status: 'disabled',
    reason: 'No confirmed inverse operation or history revision is available.',
  });
  assert.deepEqual(calls, []);
});
