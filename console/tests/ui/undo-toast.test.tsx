import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NOT_A_VALUE_CHANGE,
  NO_COMMIT_YET,
  decideUndo,
  toastTextForCommit,
  type CommitEntry,
} from '../../app/renderer/src/undo-toast.ts';

const commit = (over: Partial<CommitEntry> = {}): CommitEntry => ({
  key: 'fun_level', label: 'Fun level (English)', from: 3, to: 5, ...over,
});

test('the exact toast text setVal() would have raised for a commit', () => {
  assert.equal(toastTextForCommit(commit({ label: 'Fun level (English)', to: 5 })), 'Fun level (English) set to 5');
});

test('an array value joins the way setVal() joins it, including the empty case', () => {
  assert.equal(toastTextForCommit(commit({ to: ['a', 'b'] })), 'Fun level (English) set to a, b');
  assert.equal(toastTextForCommit(commit({ to: [] })), 'Fun level (English) set to nothing');
});

test('the toast on screen matching the most recent commit reverts it', () => {
  const c = commit({ from: 3, to: 5 });
  const decision = decideUndo('Fun level (English) set to 5', [c]);
  assert.equal(decision.kind, 'revert');
  assert.deepEqual(decision.kind === 'revert' ? decision.commit : undefined, c);
});

test('no commit ever recorded this session refuses honestly, never fakes a revert', () => {
  const decision = decideUndo('Reverted', []);
  assert.equal(decision.kind, 'refuse');
  assert.equal(decision.kind === 'refuse' ? decision.reason : '', NO_COMMIT_YET);
});

test('a toast that is not the latest commit\'s own toast refuses instead of reverting a stranger', () => {
  const c = commit({ label: 'Fun level (English)', to: 5 });
  // The toast currently on screen is from an unrelated action -- a bulk summary, a
  // reroll, "Running core show version..." -- none of which touch `commits`.
  const decision = decideUndo('3 objects: 3 of 3 selected will change.', [c]);
  assert.equal(decision.kind, 'refuse');
  assert.equal(decision.kind === 'refuse' ? decision.reason : '', NOT_A_VALUE_CHANGE);
});

test('a stale toast from an older commit than the most recent one also refuses', () => {
  const older = commit({ label: 'Density', to: 'Comfortable' });
  const newer = commit({ label: 'Fun level (English)', to: 5 });
  // `commits` is newest-first, exactly as generated/console.tsx's `commit()` prepends.
  const decision = decideUndo(toastTextForCommit(older), [newer, older]);
  assert.equal(decision.kind, 'refuse');
});

test('BREAK CHECK -- a decideUndo that always reverts the latest commit is what this guard catches', () => {
  // The behaviour being guarded against: reverting `commits[0]` unconditionally,
  // whatever toast happens to be on screen. Simulating it here proves the "stranger
  // toast" test above would actually notice.
  const alwaysRevert = (commits: ReadonlyArray<CommitEntry>) => commits[0];
  const c = commit();
  const wronglyChosen = alwaysRevert([c]);
  assert.notEqual(wronglyChosen, undefined, 'the naive implementation would always find something to revert');
  const decision = decideUndo('totally unrelated toast text', [c]);
  assert.equal(decision.kind, 'refuse', 'the real decideUndo must refuse where the naive one would revert');
});
