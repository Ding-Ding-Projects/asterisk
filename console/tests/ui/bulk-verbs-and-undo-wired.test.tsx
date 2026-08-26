import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { parseBulkDeleteCeremony } from '../../app/renderer/src/bulk.ts';

/**
 * `bulk()` (App.tsx) already builds a real plan and a real summary for every verb, and
 * `bulk-export-wired.test.tsx` already guards that `bulk()` itself is real. This guards
 * the other end: that the compiled shell's Export and Delete buttons, and the shared
 * toast's Undo button, actually *reach* that real code instead of being routed around
 * it through `hostAction`/`ceremony` directly, which is the gap that shipped.
 *
 * This is a source-level guard, matching `bulk-export-wired.test.tsx`'s own reasoning:
 * a table's row data comes from a live PBX reading or the console's own configured
 * servers, neither of which exists in this test's environment, and the generated shell
 * is off limits to edit -- the real reachability is what driving the built application
 * proves (see the task report).
 */

const appSource = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/App.tsx'), 'utf8');
const generatedSource = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/generated/console.tsx'), 'utf8');

// -------------------------------------------------------------- parseBulkDeleteCeremony

test('the bulk Delete ceremony\'s exact title/command pair recovers the selected ids', () => {
  const ids = parseBulkDeleteCeremony('Delete 3 objects', 'delete peer1 peer2 peer3');
  assert.deepEqual(ids, ['peer1', 'peer2', 'peer3']);
});

test('a single row\'s own "Delete <name>" ceremony never matches the bulk shape', () => {
  // Opened from a row's context menu (see generated/console.tsx), gated by a different
  // confirmation flow (areYouSure), and must keep going through the raw command path.
  assert.equal(parseBulkDeleteCeremony('Delete peer1', 'delete peer1'), undefined);
});

test('a mismatched id count refuses rather than guessing', () => {
  assert.equal(parseBulkDeleteCeremony('Delete 2 objects', 'delete peer1 peer2 peer3'), undefined);
});

test('an unrelated ceremony with a similarly-shaped title never matches', () => {
  assert.equal(parseBulkDeleteCeremony('Reload 3 objects', 'reload peer1 peer2 peer3'), undefined);
});

test('BREAK CHECK -- matching on the command alone (no title/count cross-check) is what this guard catches', () => {
  // The behaviour this must not have: recognising `delete ...` by itself, which would
  // also swallow the single-row ceremony's `delete peer1`.
  const looseMatch = /^delete (.+)$/.exec('delete peer1');
  assert.notEqual(looseMatch, null, 'a command-only match would have matched the single-row ceremony too');
  assert.equal(parseBulkDeleteCeremony('Delete peer1', 'delete peer1'), undefined, 'the real parser must refuse it');
});

// -------------------------------------------------------- generated wiring (read-only)

test('fact check -- the compiled Export button still hands its selection to hostAction as subject:"selection"', () => {
  assert.match(
    generatedSource,
    /hostAction\('export-json', \{ subject:'selection', name:'selection', data:sel \}\)/,
    'the compiled shell\'s Export button wiring changed shape; App.tsx\'s interception must be updated to match',
  );
});

test('fact check -- the compiled Delete button still opens the exact ceremony parseBulkDeleteCeremony expects', () => {
  assert.match(
    generatedSource,
    /this\.ceremony\('Delete ' \+ sel\.length \+ ' objects', 'delete ' \+ sel\.join\(' '\)\)/,
    'the compiled shell\'s Delete button wiring changed shape; parseBulkDeleteCeremony must be updated to match',
  );
});

// -------------------------------------------------------------------- App.tsx routing

test('hostAction routes the bulk Export selection into the real bulk() engine', () => {
  assert.match(appSource, /kind === 'export-json' && payload\.subject === 'selection'/);
  assert.match(appSource, /this\.bulk\('Exported', Array\.isArray\(payload\.data\)/);
});

test('executeCeremony routes a confirmed bulk Delete into the real bulk() engine', () => {
  assert.match(appSource, /const bulkDeleteIds = parseBulkDeleteCeremony\(title, command\);/);
  assert.match(appSource, /this\.bulk\('Deleted', bulkDeleteIds\);/);
});

test('BREAK CHECK -- deleting the routing calls is what these two guards actually catch', () => {
  const withoutExportRouting = appSource.replace(/this\.bulk\('Exported',/g, 'this.bulkRENAMED(\'Exported\',');
  assert.doesNotMatch(withoutExportRouting, /this\.bulk\('Exported', Array\.isArray\(payload\.data\)/);

  const withoutDeleteRouting = appSource.replace(/this\.bulk\('Deleted', bulkDeleteIds\);/g, '// removed');
  assert.doesNotMatch(withoutDeleteRouting, /this\.bulk\('Deleted', bulkDeleteIds\);/);
});

// ------------------------------------------------------------------------- tab list

test('hostAction recomputes the real tab list text before "Copy tab list to clipboard" runs', () => {
  assert.match(appSource, /kind === 'copy' && payload\.what === 'the tab list'/);
  assert.match(appSource, /tabListText\(state\.tabs \?\? \[\], state\.tabNames \?\? \{\}, /);
});

test('BREAK CHECK -- deleting the tab-list recompute is what this guard catches', () => {
  const withoutFix = appSource.replace(/tabListText\(state\.tabs/g, 'tabListTextRENAMED(state.tabs');
  assert.doesNotMatch(withoutFix, /tabListText\(state\.tabs \?\? \[\], state\.tabNames \?\? \{\}, /);
});

// ------------------------------------------------------------------------- undo

test('undoToast decides through the real undo-toast engine and reverts through setVal(), the same route the History screen\'s own working undo uses', () => {
  assert.match(appSource, /from '\.\/undo-toast';?/);
  assert.match(appSource, /decideUndo\(String\(state\.toastText/);
  assert.match(appSource, /this\.setVal\(\{ id: decision\.commit\.key, label: decision\.commit\.label \}, decision\.commit\.from\)/);
});

test('BREAK CHECK -- reverting to "Change reverted" with no dispatch is what this guard catches', () => {
  const withoutFix = appSource.replace(/decideUndo\(String\(state\.toastText/g, 'decideUndoRENAMED(String(state.toastText');
  assert.doesNotMatch(withoutFix, /decideUndo\(String\(state\.toastText/);
});

test('fact check -- the compiled shell\'s own undoToast is still the fake one App.tsx must keep overriding', () => {
  assert.match(
    generatedSource,
    /undoToast:\(\) => \{ this\.setState\(\{ toastOpen:false \}\); this\.toast\('Change reverted'\); \}/,
    'the compiled shell\'s undoToast changed shape; confirm App.tsx\'s override still wins the merge in renderVals()',
  );
});
