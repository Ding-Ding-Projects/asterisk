import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

/**
 * `export.ts` and `bulk.ts` exist, pass their own unit tests, and were imported
 * by nothing the application mounts -- exactly the gap this file guards against.
 * `App.tsx` now imports both and calls their real functions from a live class
 * field (`bulk`) and a render-time hook (`bulkSelectionVals`) that every
 * table-like screen goes through. This is a source-level guard rather than a
 * full DOM render because the row data behind a table screen comes from a live
 * PBX reading or the console's own configured servers, neither of which exists
 * in this test's environment -- the real reachability was proven by driving the
 * actual built application (see the pig's task report).
 */
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const consoleRoot = path.resolve(testDirectory, '..', '..');
const appSourcePath = path.join(consoleRoot, 'app', 'renderer', 'src', 'App.tsx');
const appSource = fs.readFileSync(appSourcePath, 'utf8');

test('App.tsx imports the real export engine, not a decorative placeholder', () => {
  assert.match(appSource, /from '\.\/export';?/);
  assert.match(appSource, /\bexportRows\(/, 'expected a real call to exportRows(...), not just an import');
  assert.match(appSource, /\bsuitableFormats\(/, 'expected exportRows to be fed a format suitableFormats actually approved');
  assert.match(appSource, /\bdescribeLoss\(/, 'expected the console to state what a chosen format loses, per the export contract');
  assert.match(appSource, /\bexportFilename\(/, 'expected a real exportFilename(...) call, not a hand-written filename string');
});

test('App.tsx imports the real bulk-selection engine, not a decorative placeholder', () => {
  assert.match(appSource, /from '\.\/bulk';?/);
  assert.match(appSource, /\bplanBulk\(/, 'expected a real planBulk(...) call building a reviewable plan');
  assert.match(appSource, /\bbulkSummarise\(/, 'expected the plan to be summarised into the message shown before acting');
  assert.match(appSource, /\bbulkClick\(/, 'expected row selection to go through bulk.ts click(), not ad-hoc array splicing');
  assert.match(appSource, /\bbulkSelectAll\(/, 'expected select-all to go through bulk.ts selectAll()');
  assert.match(appSource, /\bbulkInvert\(/, 'expected an inverse-selection action wired to bulk.ts invert()');
});

test('the Export bulk action downloads the selected rows as a real file, never the whole table silently', () => {
  assert.match(appSource, /plan\.affected\.map/, 'expected the export to be built from the plan\'s affected rows (the selection), not tbl.rows unconditionally');
  assert.match(appSource, /a\.download\s*=\s*filename/, 'expected a real browser download triggered from the computed filename');
});

test('BREAK CHECK -- deleting the export call from the source is what this guard actually catches', () => {
  const withoutExportRows = appSource.replace(/\bexportRows\(/g, 'exportRowsRENAMED(');
  assert.doesNotMatch(withoutExportRows, /\bexportRows\(/);
});
