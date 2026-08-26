/**
 * Contract: complete-exports.
 *
 * The implementation-registry note ("app/renderer/src/export.ts ... is never
 * imported by App.tsx or any mounted component") is STALE. `export.ts` -- 547
 * lines, `describeLoss`/`exportFilename`/`exportRows`/`suitableFormats` -- is
 * imported at the top of App.tsx and called from App.tsx's own `bulk()` method,
 * inside an `if (verb === 'Exported')` branch that picks a faithful format,
 * states the loss, builds a real filename, and triggers a real browser download.
 * That much is genuinely wired.
 *
 * What the note gets right in substance, even though it names the wrong reason,
 * is that this branch never actually runs against real user interaction. Every
 * call site of `this.bulk(...)` in the compiled design -- the only caller of
 * App.tsx's overridden `bulk()` -- sends the verb 'Enabled', 'Disabled', or
 * 'Duplicated'. The compiled UI's own bulk-action-bar "Export" button does NOT
 * call `this.bulk('Exported', sel)`; it calls `this.hostAction('export-json',
 * ...)` instead, a completely separate, narrower code path (`host-actions.ts`
 * `exportFile()`) that writes plain JSON only, with no format choice and no loss
 * disclosure. So export.ts's rich multi-format engine is imported, referenced,
 * and even sits inside a live class method -- and is still unreachable dead code
 * from a real click, because nothing ever hands `bulk()` the verb 'Exported'.
 * "Wired at one end, consumed at neither" usually means an unimported module;
 * here it is subtler -- imported, called from within a live method, and still
 * never reached, because the one caller of that method never sends the value
 * that would take that branch.
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
const HOST_ACTIONS = 'app/renderer/src/host-actions.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['complete-exports'];
  assert.ok(row, 'the implementation registry has no row for complete-exports');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('export.ts IS imported by App.tsx -- the registry note claiming it never is has gone stale', () => {
  const app = read(APP);
  assert.match(app, /import \{ describeLoss, exportFilename, exportRows, suitableFormats, type ExportFormat \} from '\.\/export';/,
    'export.ts is no longer imported by App.tsx -- the note may have become accurate again');
});

test("all four export.ts symbols are called inside App.tsx's own bulk() method, on the 'Exported' verb", () => {
  const app = read(APP);
  const bulkFn = app.match(/bulk = \(verb: string, sel: string\[\]\): void => \{[\s\S]*?\n  \};/);
  assert.ok(bulkFn, 'expected to find the App.tsx bulk() method body');
  const body = bulkFn[0];
  assert.match(body, /if \(verb === 'Exported'\) \{/u, "the 'Exported' branch no longer exists in bulk()");
  assert.match(body, /const formats = suitableFormats\(records\);/u, 'suitableFormats(...) is no longer called from bulk()');
  assert.match(body, /const text = exportRows\(\{ rows: records, format, table: screen \}\);/u, 'exportRows(...) is no longer called from bulk()');
  assert.match(body, /const loss = describeLoss\(records, format\);/u, 'describeLoss(...) is no longer called from bulk()');
  assert.match(body, /const filename = exportFilename\(screen, format\);/u, 'exportFilename(...) is no longer called from bulk()');
});

test("every real call site of this.bulk(...) in the compiled design sends 'Enabled', 'Disabled', or 'Duplicated' -- never 'Exported'", () => {
  const generated = read(GENERATED);
  const calls = [...generated.matchAll(/this\.bulk\('([^']+)'/gu)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'expected at least one this.bulk(...) call site in the compiled design');
  assert.deepEqual([...new Set(calls)].sort(), ['Disabled', 'Duplicated', 'Enabled'],
    "the set of verbs the compiled UI actually sends to bulk() changed -- if 'Exported' now appears, the multi-format export path may have become reachable");
});

test("the compiled UI's own bulk-action-bar Export button routes through hostAction('export-json', ...), not through bulk('Exported', ...)", () => {
  const generated = read(GENERATED);
  assert.match(generated, /\{ icon:'download', label:'Export', run:\(\) => \{ this\.setState\(\{ selected:\[\] \}\); this\.hostAction\('export-json', \{ subject:'selection', name:'selection', data:sel \}\); \} \}/u,
    "the compiled Export bulk-action button no longer matches the expected hostAction('export-json', ...) call -- it may now call bulk('Exported', ...) instead");
});

test("hostAction('export-json', ...) is a narrower, separate path (host-actions.ts exportFile) with no format choice and no loss disclosure", () => {
  const hostActions = read(HOST_ACTIONS);
  assert.match(hostActions, /case 'export-config':\s*\n\s*case 'export-json':\s*\n\s*return exportFile\(request, effects\);/u,
    'host-actions.ts no longer routes export-json through exportFile -- re-check the split between the two export paths');
  assert.doesNotMatch(hostActions, /suitableFormats|describeLoss/u,
    'host-actions.ts now references export.ts\'s format-selection/loss-disclosure helpers -- the two export paths may have merged');
});

test("the compiled UI's Delete bulk-action button also bypasses bulk('Deleted', ...): it calls ceremony() directly, so the destructive-flag branch is equally unreached", () => {
  const generated = read(GENERATED);
  assert.match(generated, /\{ icon:'delete', label:'Delete', run:\(\) => this\.ceremony\('Delete ' \+ sel\.length \+ ' objects', 'delete ' \+ sel\.join\(' '\)\) \}/u,
    "the compiled Delete bulk-action button no longer matches the expected ceremony(...) call -- it may now call bulk('Deleted', ...) instead");
});
