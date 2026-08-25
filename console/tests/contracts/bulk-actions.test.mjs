/**
 * Contract: bulk-actions.
 *
 * The implementation-registry note ("app/renderer/src/bulk.ts ... is never
 * imported by App.tsx or any mounted component") is STALE. `bulk.ts` -- 336
 * lines, `planBulk`/`bulkSummarise`/`click`/`clearSelection`/`invert`/
 * `selectAll` -- is imported at the top of App.tsx, and App.tsx's own `bulk()`
 * method (overriding the compiled design's trivial one-liner via the same
 * `App extends ConsoleShell` mechanism used elsewhere in this console) genuinely
 * calls `planBulk`/`bulkSummarise` on every invocation.
 *
 * Reading exactly which verbs reach that method narrows the honest state
 * further than either "wired" or "dead" alone would say:
 *
 *   - The compiled UI's own bulk-action-bar buttons call `this.bulk(...)` with
 *     only three verbs: 'Enabled', 'Disabled', 'Duplicated'. Its Export button
 *     calls `hostAction('export-json', ...)` instead (see complete-exports.md),
 *     and its Delete button calls `ceremony(...)` directly -- so the 'Exported'
 *     and 'Deleted' branches inside bulk() are unreachable from a real click,
 *     even though the code for both exists and is syntactically correct.
 *   - Of the three verbs that DO reach bulk(), the method's own trailing
 *     comment states the honest limit plainly: "Every other bulk verb
 *     (Enable/Disable/Duplicate/...) has no write path in this console yet --
 *     the plan and its honest count are real, but nothing is applied." So even
 *     the reachable path computes a real, honestly-skip-reported plan and fires
 *     a real message, and then applies no actual state change.
 *
 * This file pins both halves: bulk.ts is genuinely imported and its planning
 * logic genuinely runs, and no bulk verb -- reachable or not -- ever performs a
 * real write against server state.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const GENERATED = 'app/renderer/src/generated/console.tsx';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['bulk-actions'];
  assert.ok(row, 'the implementation registry has no row for bulk-actions');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('bulk.ts IS imported by App.tsx -- the registry note claiming it never is has gone stale', () => {
  const app = read(APP);
  assert.match(
    app,
    /import \{\s*click as bulkClick, clearSelection as bulkClearSelection, invert as bulkInvert, planBulk, selectAll as bulkSelectAll,\s*summarise as bulkSummarise, type SelectionState,\s*\} from '\.\/bulk';/,
    'bulk.ts is no longer imported the expected way by App.tsx -- the note may have become accurate again',
  );
});

test("App.tsx's own bulk() method genuinely calls planBulk()/bulkSummarise() on every invocation", () => {
  const app = read(APP);
  const bulkFn = app.match(/bulk = \(verb: string, sel: string\[\]\): void => \{[\s\S]*?\n  \};/);
  assert.ok(bulkFn, 'expected to find the App.tsx bulk() method body');
  const body = bulkFn[0];
  assert.match(body, /const plan = planBulk\(verb, sel, \(id\) => \(known\.has\(id\) \? true : 'no longer in this table'\), \{/u,
    'planBulk(...) is no longer called with an honest per-row skip reason');
  assert.match(body, /const message = bulkSummarise\(plan\);/u, 'bulkSummarise(...) is no longer called from bulk()');
});

test("every real call site of this.bulk(...) in the compiled design sends 'Enabled', 'Disabled', or 'Duplicated' -- never 'Exported' or 'Deleted'", () => {
  const generated = read(GENERATED);
  const calls = [...generated.matchAll(/this\.bulk\('([^']+)'/gu)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'expected at least one this.bulk(...) call site in the compiled design');
  assert.deepEqual([...new Set(calls)].sort(), ['Disabled', 'Duplicated', 'Enabled'],
    "the set of verbs the compiled UI actually sends to bulk() changed -- a newly reachable verb changes what this row can honestly claim");
});

test("bulk() itself documents that no verb it can reach performs a real write -- the plan is real, the application of it is not", () => {
  const app = read(APP);
  assert.match(app,
    /\/\/ Every other bulk verb \(Enable\/Disable\/Duplicate\/\.\.\.\) has no write path in this\s*\n\s*\/\/ console yet -- the plan and its honest count are real, but nothing is applied\./u,
    'the "no write path" comment no longer matches -- bulk actions may now genuinely apply, which would change this row');
  const bulkFn = app.match(/bulk = \(verb: string, sel: string\[\]\): void => \{[\s\S]*?\n  \};/)[0];
  const tail = bulkFn.slice(bulkFn.indexOf("if (verb === 'Exported')"));
  const afterExportBranch = tail.slice(tail.indexOf('return;\n    }') + 'return;\n    }'.length);
  assert.match(afterExportBranch, /this\.set\('selected', \[\]\);\s*\n\s*this\.fire\(verb, message\);/u,
    'the fallback path for Enabled/Disabled/Duplicated no longer matches -- it may now apply a real change');
});

test('one real bulk action does exist in the compiled design, narrower than the bulk.ts contract: canvas-node selection only', () => {
  const generated = read(GENERATED);
  assert.match(generated, /bulk = \(verb, sel\) => \{ this\.setState\(\{ selected:\[\] \}\); this\.fire\(verb, sel\.length \+ ' objects in one action\.'\); \};/u,
    "the generated console's own trivial bulk() -- which App.tsx overrides -- no longer matches");
});
