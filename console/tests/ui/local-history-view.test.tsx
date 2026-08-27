import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HISTORY_ACTION_DOT,
  blameRows,
  commitCountLabel,
  commitHeadline,
  commitRows,
  compareLabel,
  diffFileLabel,
  diffLineViews,
  filterChips,
  filteredEntries,
  toggleCompare,
} from '../../app/renderer/src/local-history-view.ts';
import type { HistoryCommit, HistoryDiff } from '../../app/renderer/src/local-history-view.ts';

function commit(overrides: Partial<HistoryCommit> = {}): HistoryCommit {
  return {
    id: '0'.repeat(40),
    timestamp: '2026-08-25T00:00:00.000Z',
    action: 'created',
    subject: 'a record',
    message: 'Created a record\n\nHistory-Action: created\nHistory-Subject: a record\n',
    ...overrides,
  };
}

// ---------------------------------------------------------------- commitCountLabel / commitHeadline

test('commitCountLabel pluralises correctly at 0, 1 and many', () => {
  assert.equal(commitCountLabel([]), '0 commits');
  assert.equal(commitCountLabel([commit()]), '1 commit');
  assert.equal(commitCountLabel([commit(), commit()]), '2 commits');
});

test('commitHeadline reads the real first line of the commit message, not the raw subject', () => {
  const deleted = commit({ action: 'deleted', subject: 'the endpoint 1001', message: 'Deleted the endpoint 1001\n\nHistory-Action: deleted\nHistory-Subject: the endpoint 1001\n' });
  assert.equal(commitHeadline(deleted), 'Deleted the endpoint 1001');
});

test('commitHeadline falls back to the subject when the message has no usable first line', () => {
  const bare = commit({ subject: 'a bare record', message: '' });
  assert.equal(commitHeadline(bare), 'a bare record');
});

// ---------------------------------------------------------------- commitRows

test('commitRows marks the selected commit and every commit being compared', () => {
  const a = commit({ id: 'a'.repeat(40), action: 'created' });
  const b = commit({ id: 'b'.repeat(40), action: 'deleted' });
  const rows = commitRows([a, b], a.id, [b.id]);
  assert.equal(rows[0].selected, true);
  assert.equal(rows[0].comparing, false);
  assert.equal(rows[1].selected, false);
  assert.equal(rows[1].comparing, true);
});

test('commitRows never invents a tag', () => {
  const rows = commitRows([commit()], '', []);
  assert.equal(rows[0].hasTag, false);
  assert.equal(rows[0].tag, '');
});

test('commitRows colours the dot from the real action, never a guess', () => {
  for (const action of Object.keys(HISTORY_ACTION_DOT)) {
    const rows = commitRows([commit({ action })], '', []);
    assert.equal(rows[0].dot, HISTORY_ACTION_DOT[action]);
  }
});

test('commitRows falls back to a neutral dot for an action outside the known set', () => {
  const rows = commitRows([commit({ action: 'not-a-real-action' })], '', []);
  assert.equal(rows[0].dot, '#9AA39B');
});

test('commitRows keeps entries in whatever order they were given -- it never re-sorts', () => {
  const newest = commit({ id: 'n'.repeat(40), timestamp: '2026-08-25T02:00:00.000Z' });
  const oldest = commit({ id: 'o'.repeat(40), timestamp: '2026-08-25T00:00:00.000Z' });
  const rows = commitRows([newest, oldest], '', []);
  assert.deepEqual(rows.map((row) => row.id), [newest.id, oldest.id]);
});

// ---------------------------------------------------------------- filterChips / filteredEntries

test('filterChips always shows All with the real total', () => {
  const chips = filterChips({ created: 2, updated: 0, deleted: 1 }, '');
  assert.equal(chips[0].label, 'All (3)');
  assert.equal(chips[0].on, true);
});

test('filterChips omits an action with zero commits -- there is nothing real to filter to', () => {
  const chips = filterChips({ created: 2, updated: 0, deleted: 0 }, '');
  assert.deepEqual(chips.map((chip) => chip.action), ['', 'created']);
});

test('filterChips marks the active filter, and only the active one', () => {
  const chips = filterChips({ created: 1, deleted: 1 }, 'deleted');
  const on = chips.filter((chip) => chip.on).map((chip) => chip.action);
  assert.deepEqual(on, ['deleted']);
});

test('filteredEntries with no active filter returns every entry, unfiltered', () => {
  const entries = [commit({ action: 'created' }), commit({ action: 'deleted' })];
  assert.equal(filteredEntries(entries, '').length, 2);
});

test('filteredEntries with an active filter keeps only matching entries', () => {
  const created = commit({ id: 'c'.repeat(40), action: 'created' });
  const deleted = commit({ id: 'd'.repeat(40), action: 'deleted' });
  const filtered = filteredEntries([created, deleted], 'deleted');
  assert.deepEqual(filtered.map((entry) => entry.id), [deleted.id]);
});

// ---------------------------------------------------------------- diffLineViews / diffFileLabel

test('diffLineViews colours additions green and deletions red, from the real sign', () => {
  const diff: HistoryDiff = { files: ['records/x.json'], lines: [{ text: 'a', sign: '+' }, { text: 'b', sign: '-' }, { text: 'c', sign: ' ' }] };
  const lines = diffLineViews(diff);
  assert.equal(lines[0].color, '#82D9A5');
  assert.equal(lines[1].color, '#FFB4AB');
  assert.equal(lines[2].color, '#9AA39B');
});

test('diffLineViews is empty when there is no diff yet', () => {
  assert.deepEqual(diffLineViews(undefined), []);
});

test('diffFileLabel says no commit selected before anything is picked', () => {
  assert.equal(diffFileLabel('', undefined, false), 'no commit selected');
});

test('diffFileLabel says reading while the fetch is in flight', () => {
  assert.equal(diffFileLabel('a'.repeat(40), undefined, true), 'reading…');
});

test('diffFileLabel names the real file once the diff has resolved', () => {
  const diff: HistoryDiff = { files: ['records/queue-support.json'], lines: [] };
  assert.equal(diffFileLabel('a'.repeat(40), diff, false), 'records/queue-support.json');
});

test('diffFileLabel says honestly when a commit recorded no file', () => {
  const diff: HistoryDiff = { files: [], lines: [] };
  assert.equal(diffFileLabel('a'.repeat(40), diff, false), 'no file recorded for this commit');
});

// ---------------------------------------------------------------- blameRows

test('blameRows is empty when nothing is selected', () => {
  assert.deepEqual(blameRows([commit()], '', undefined), []);
});

test('blameRows names the one real author LocalHistory ever writes as', () => {
  const target = commit({ id: 'a'.repeat(40) });
  const diff: HistoryDiff = { files: ['records/a-record.json'], lines: [] };
  const rows = blameRows([target], target.id, diff);
  assert.equal(rows[0].who, 'Asterisk Local History');
  assert.equal(rows[0].what, 'records/a-record.json');
});

test('blameRows falls back to the commit headline when the diff has no files', () => {
  const target = commit({ id: 'a'.repeat(40), action: 'deleted', subject: 'the endpoint 1001', message: 'Deleted the endpoint 1001\n\nHistory-Action: deleted\nHistory-Subject: the endpoint 1001\n' });
  const rows = blameRows([target], target.id, { files: [], lines: [] });
  assert.equal(rows[0].what, 'Deleted the endpoint 1001');
});

// ---------------------------------------------------------------- compareLabel / toggleCompare

test('compareLabel with nothing picked invites the first pick', () => {
  assert.match(compareLabel([], [], undefined, false), /compare icon/u);
});

test('compareLabel with one picked names it and asks for a second', () => {
  const a = commit({ id: 'a'.repeat(40) });
  assert.match(compareLabel([a], [a.id], undefined, false), /selected\. Pick a second/u);
});

test('compareLabel with two picked and a pending fetch says so honestly rather than guessing the result', () => {
  const a = commit({ id: 'a'.repeat(40) });
  const b = commit({ id: 'b'.repeat(40) });
  assert.match(compareLabel([a, b], [a.id, b.id], undefined, true), /…$/u);
});

test('compareLabel with two picked and a resolved empty diff says no files differ', () => {
  const a = commit({ id: 'a'.repeat(40) });
  const b = commit({ id: 'b'.repeat(40) });
  assert.match(compareLabel([a, b], [a.id, b.id], [], false), /no files differ/u);
});

test('compareLabel with two picked names the real differing files', () => {
  const a = commit({ id: 'a'.repeat(40) });
  const b = commit({ id: 'b'.repeat(40) });
  const label = compareLabel([a, b], [a.id, b.id], ['records/x.json'], false);
  assert.match(label, /1 file differ/u);
  assert.match(label, /records\/x\.json/u);
});

test('toggleCompare adds up to two ids', () => {
  assert.deepEqual(toggleCompare([], 'a'), ['a']);
  assert.deepEqual(toggleCompare(['a'], 'b'), ['a', 'b']);
});

test('toggleCompare removes an id that is already selected', () => {
  assert.deepEqual(toggleCompare(['a', 'b'], 'a'), ['b']);
});

test('toggleCompare replaces the oldest pick once a third commit is chosen', () => {
  assert.deepEqual(toggleCompare(['a', 'b'], 'c'), ['b', 'c']);
});
