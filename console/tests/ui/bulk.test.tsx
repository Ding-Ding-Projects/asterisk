import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_SELECTION,
  bulkSucceeded,
  click,
  clearSelection,
  invert,
  isSelected,
  planBulk,
  runBulk,
  selectAll,
  selectionCount,
  summarise,
} from '../../app/renderer/src/bulk.ts';
import type { BulkPlan, BulkProgress, SelectionState } from '../../app/renderer/src/bulk.ts';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

// ------------------------------------------------------------------ click

test('plain click replaces the selection and sets the anchor', () => {
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  assert.deepEqual([...s1.selected], ['b']);
  assert.equal(s1.anchor, 'b');

  const s2 = click(s1, 'd', {}, ORDER);
  assert.deepEqual([...s2.selected], ['d']);
  assert.equal(s2.anchor, 'd');
});

test('ctrl-click toggles membership and moves the anchor', () => {
  const s1 = click(EMPTY_SELECTION, 'b', { ctrl: true }, ORDER);
  assert.deepEqual([...s1.selected].sort(), ['b']);
  assert.equal(s1.anchor, 'b');

  const s2 = click(s1, 'd', { ctrl: true }, ORDER);
  assert.deepEqual([...s2.selected].sort(), ['b', 'd']);
  assert.equal(s2.anchor, 'd');

  const s3 = click(s2, 'b', { ctrl: true }, ORDER);
  assert.deepEqual([...s3.selected].sort(), ['d']);
  assert.equal(s3.anchor, 'b');
});

test('shift-click selects a forward range in visible order', () => {
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  const s2 = click(s1, 'd', { shift: true }, ORDER);
  assert.deepEqual([...s2.selected], ['b', 'c', 'd']);
  assert.equal(s2.anchor, 'b');
});

test('shift-click selects a backward range in visible order', () => {
  const s1 = click(EMPTY_SELECTION, 'd', {}, ORDER);
  const s2 = click(s1, 'b', { shift: true }, ORDER);
  assert.deepEqual([...s2.selected], ['b', 'c', 'd']);
  assert.equal(s2.anchor, 'd');
});

test('shift-click with no anchor behaves like a plain click', () => {
  const s1 = click(EMPTY_SELECTION, 'c', { shift: true }, ORDER);
  assert.deepEqual([...s1.selected], ['c']);
  assert.equal(s1.anchor, 'c');
});

test('shift-click uses the LIST’S CURRENT order, not insertion order', () => {
  // Anchor set while order was ORDER; then the list re-sorts.
  const reordered = ['e', 'd', 'c', 'b', 'a'];
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  const s2 = click(s1, 'd', { shift: true }, reordered);
  // In reordered, b is at index 3, d is at index 1 -> range [1..3] = d,c,b
  assert.deepEqual([...s2.selected], ['d', 'c', 'b']);
});

test('shift-click range is inclusive of a single-item range', () => {
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  const s2 = click(s1, 'b', { shift: true }, ORDER);
  assert.deepEqual([...s2.selected], ['b']);
});

test('shift-click falls back to plain click when anchor is no longer in order', () => {
  const s1 = click(EMPTY_SELECTION, 'z', {}, ORDER); // anchor not in ORDER
  const s2 = click(s1, 'c', { shift: true }, ORDER);
  assert.deepEqual([...s2.selected], ['c']);
});

// -------------------------------------------------------------- select-all

test('select-all page and matches are distinguishable', () => {
  const page = ['a', 'b'];
  const matches = ['a', 'b', 'c', 'd', 'e'];

  const pageResult = selectAll(EMPTY_SELECTION, 'page', page, matches);
  assert.equal(pageResult.scope, 'page');
  assert.equal(pageResult.count, 2);
  assert.deepEqual([...pageResult.state.selected].sort(), ['a', 'b']);

  const matchResult = selectAll(EMPTY_SELECTION, 'matches', page, matches);
  assert.equal(matchResult.scope, 'matches');
  assert.equal(matchResult.count, 5);
  assert.deepEqual([...matchResult.state.selected].sort(), ['a', 'b', 'c', 'd', 'e']);
});

test('select-all page is empty when the page is empty', () => {
  const result = selectAll(EMPTY_SELECTION, 'page', [], ['a', 'b']);
  assert.equal(result.count, 0);
});

// ------------------------------------------------------------------ invert

test('invert flips the selection against the visible order', () => {
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  const s2 = click(s1, 'd', { ctrl: true }, ORDER);
  const inverted = invert(s2, ORDER);
  assert.deepEqual([...inverted.selected].sort(), ['a', 'c', 'e']);
});

test('invert of an empty selection selects everything visible', () => {
  const inverted = invert(EMPTY_SELECTION, ORDER);
  assert.deepEqual([...inverted.selected].sort(), ORDER);
});

test('invert of a full selection is empty', () => {
  let state: SelectionState = EMPTY_SELECTION;
  for (const id of ORDER) state = click(state, id, { ctrl: true }, ORDER);
  const inverted = invert(state, ORDER);
  assert.equal(inverted.selected.size, 0);
});

// ------------------------------------------------------------- misc selection

test('clearSelection empties without touching order', () => {
  const s1 = click(EMPTY_SELECTION, 'b', {}, ORDER);
  const cleared = clearSelection(s1);
  assert.equal(selectionCount(cleared), 0);
});

test('isSelected and selectionCount read the state', () => {
  const s1 = click(EMPTY_SELECTION, 'b', { ctrl: true }, ORDER);
  const s2 = click(s1, 'd', { ctrl: true }, ORDER);
  assert.equal(isSelected(s2, 'b'), true);
  assert.equal(isSelected(s2, 'c'), false);
  assert.equal(selectionCount(s2), 2);
});

// -------------------------------------------------------------------- planBulk

interface Row {
  id: string;
  locked: boolean;
}

function rows(ids: string[], lockedIds: string[] = []): Row[] {
  return ids.map((id) => ({ id, locked: lockedIds.includes(id) }));
}

test('planBulk separates affected from skipped with a reason', () => {
  const selected = rows(['a', 'b', 'c'], ['b']);
  const plan = planBulk('Delete', selected, (r) => (r.locked ? 'locked' : true));
  assert.equal(plan.affected.length, 2);
  assert.equal(plan.skipped.length, 1);
  assert.equal(plan.skipped[0].item.id, 'b');
  assert.equal(plan.skipped[0].reason, 'locked');
});

test('planBulk with nothing applicable has empty affected and full skipped', () => {
  const selected = rows(['a', 'b'], ['a', 'b']);
  const plan = planBulk('Delete', selected, (r) => (r.locked ? 'locked' : true));
  assert.equal(plan.affected.length, 0);
  assert.equal(plan.skipped.length, 2);
});

test('planBulk with an empty selection has nothing affected or skipped', () => {
  const plan = planBulk('Delete', [] as Row[], () => true);
  assert.equal(plan.affected.length, 0);
  assert.equal(plan.skipped.length, 0);
  assert.equal(plan.selected.length, 0);
});

test('planBulk records the destructive flag', () => {
  const plan = planBulk('Delete', rows(['a']), () => true, { destructive: true });
  assert.equal(plan.destructive, true);
  const plan2 = planBulk('Export', rows(['a']), () => true);
  assert.equal(plan2.destructive, false);
});

// -------------------------------------------------------------------- summarise

test('summarise names both the affected count and the total selected', () => {
  const plan = planBulk('Delete', rows(['a', 'b', 'c']), () => true);
  const text = summarise(plan);
  assert.match(text, /3 of 3/);
});

test('summarise reports skipped items with their shared reason', () => {
  const plan = planBulk('Delete', rows(['a', 'b'], ['b']), (r) => (r.locked ? 'locked' : true));
  const text = summarise(plan);
  assert.match(text, /1 of 2/);
  assert.match(text, /1 skipped/);
  assert.match(text, /locked/);
});

test('summarise on an empty selection says so plainly', () => {
  const plan = planBulk('Delete', [] as Row[], () => true);
  assert.match(summarise(plan), /nothing selected/i);
});

test('summarise mentions irreversibility for a destructive plan', () => {
  const plan = planBulk('Delete', rows(['a']), () => true, { destructive: true });
  assert.match(summarise(plan), /cannot be undone/i);
});

// ---------------------------------------------------------------------- runBulk

function makePlan(ids: string[]): BulkPlan<Row> {
  return planBulk('Op', rows(ids), () => true);
}

test('runBulk reports progress as items complete', async () => {
  const plan = makePlan(['a', 'b', 'c']);
  const snapshots: BulkProgress[] = [];
  const result = await runBulk(plan, async () => '', {
    onProgress: (p) => snapshots.push(p),
    concurrency: 1,
  });
  assert.equal(result.succeeded.length, 3);
  assert.ok(snapshots.length >= 3);
  assert.equal(snapshots[snapshots.length - 1].done, 3);
  assert.equal(snapshots[snapshots.length - 1].total, 3);
});

test('one item failing does not stop the rest', async () => {
  const plan = makePlan(['a', 'b', 'c']);
  const result = await runBulk(plan, async (item) => (item.id === 'b' ? 'boom' : ''));
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].id, 'b');
  assert.equal(result.failed[0].reason, 'boom');
});

test('a batch with any failure is never reported as succeeded', async () => {
  const plan = makePlan(['a', 'b']);
  const result = await runBulk(plan, async (item) => (item.id === 'a' ? 'nope' : ''));
  assert.equal(bulkSucceeded(result), false);
});

test('a batch with zero failures and no cancellation is reported as succeeded', async () => {
  const plan = makePlan(['a', 'b']);
  const result = await runBulk(plan, async () => '');
  assert.equal(bulkSucceeded(result), true);
});

test('a thrown error is captured as a failure with its message', async () => {
  const plan = makePlan(['a']);
  const result = await runBulk(plan, async () => {
    throw new Error('kaboom');
  });
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].reason, 'kaboom');
});

test('cancellation mid-run reports what completed and marks cancelled', async () => {
  const plan = makePlan(['a', 'b', 'c', 'd', 'e']);
  const signal = { aborted: false };
  let calls = 0;
  const result = await runBulk(
    plan,
    async () => {
      calls += 1;
      if (calls === 2) {
        signal.aborted = true;
      }
      return '';
    },
    { signal, concurrency: 1 },
  );
  assert.equal(result.cancelled, true);
  assert.ok(result.succeeded.length < 5);
  assert.equal(bulkSucceeded(result), false);
});

test('empty plan runs cleanly with no items attempted', async () => {
  const plan = makePlan([]);
  const result = await runBulk(plan, async () => '');
  assert.equal(result.total, 0);
  assert.equal(result.succeeded.length, 0);
  assert.equal(result.failed.length, 0);
  assert.equal(bulkSucceeded(result), true);
});

test('nothing-applicable plan (all skipped) runs zero items without throwing', async () => {
  const selected = rows(['a', 'b'], ['a', 'b']);
  const plan = planBulk('Delete', selected, (r) => (r.locked ? 'locked' : true));
  const result = await runBulk(plan, async () => '');
  assert.equal(result.total, 0);
  assert.equal(plan.skipped.length, 2);
});

test('result order is deterministic under concurrency greater than one', async () => {
  const ids = Array.from({ length: 20 }, (_, i) => `id-${i}`);
  const plan = makePlan(ids);
  // Deliberately make later items resolve first, by delaying earlier ones more,
  // so completion order is the reverse of index order.
  const result = await runBulk(
    plan,
    async (item, index) => {
      await new Promise((resolve) => setTimeout(resolve, (plan.affected.length - index) % 5));
      return '';
    },
    { concurrency: 6 },
  );
  const resultOrder = result.succeeded.map((s) => s.item.id);
  assert.deepEqual(resultOrder, ids);
});

test('result order stays index-based even with mixed success and failure under concurrency', async () => {
  const ids = Array.from({ length: 10 }, (_, i) => `id-${i}`);
  const plan = makePlan(ids);
  const result = await runBulk(
    plan,
    async (item, index) => {
      await new Promise((resolve) => setTimeout(resolve, (10 - index) % 4));
      return index % 3 === 0 ? 'skip-ish' : '';
    },
    { concurrency: 4 },
  );
  // Reassemble expected order by index parity of the applied rule.
  const expectedSucceeded = ids.filter((_, i) => i % 3 !== 0);
  const expectedFailed = ids.filter((_, i) => i % 3 === 0);
  assert.deepEqual(result.succeeded.map((s) => s.item.id), expectedSucceeded);
  assert.deepEqual(result.failed.map((f) => f.id), expectedFailed);
});

test('runBulk defaults to concurrency 1 when unspecified', async () => {
  const plan = makePlan(['a', 'b', 'c']);
  let concurrentCount = 0;
  let maxConcurrent = 0;
  const result = await runBulk(plan, async () => {
    concurrentCount += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrentCount);
    await new Promise((resolve) => setTimeout(resolve, 5));
    concurrentCount -= 1;
    return '';
  });
  assert.equal(maxConcurrent, 1);
  assert.equal(result.succeeded.length, 3);
});

test('runBulk honours a higher concurrency bound', async () => {
  const plan = makePlan(['a', 'b', 'c', 'd']);
  let concurrentCount = 0;
  let maxConcurrent = 0;
  await runBulk(
    plan,
    async () => {
      concurrentCount += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount -= 1;
      return '';
    },
    { concurrency: 3 },
  );
  assert.ok(maxConcurrent > 1, `expected concurrency > 1, got ${maxConcurrent}`);
  assert.ok(maxConcurrent <= 3);
});
