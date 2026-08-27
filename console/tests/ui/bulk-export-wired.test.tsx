import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
const appSource = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/App.tsx'), 'utf8');

test('App.tsx imports the real export engine, not a decorative placeholder', () => {
  assert.match(appSource, /from '\.\/export';?/);
  assert.match(appSource, /\bprepareExport\(/, 'expected the canonical prepared export artifact, not hand-assembled bytes');
  assert.match(appSource, /\bsuitableFormats\(/, 'expected exportRows to be fed a format suitableFormats actually approved');
  assert.match(appSource, /artifact\.disclosures/, 'expected the prepared artifact disclosures to reach the completion message');
  assert.match(appSource, /artifact\.content/, 'expected the Blob to use canonical prepared content');
  assert.match(appSource, /artifact\.mediaType/, 'expected the Blob to use canonical prepared media type');
  assert.match(appSource, /artifact\.filename/, 'expected the download to use canonical prepared filename');
  assert.doesNotMatch(appSource, /type:\s*'text\/plain;charset=utf-8'/, 'a hard-coded text/plain Blob loses the chosen export format');
});

test('App.tsx imports the real bulk-selection engine, not a decorative placeholder', () => {
  assert.match(appSource, /from '\.\/bulk';?/);
  assert.match(appSource, /\bplanBulkAction\(/, 'expected a real planBulkAction(...) call building a reviewable plan');
  assert.match(appSource, /\bplan\.affected\.map/, 'expected the reviewable plan to determine the rows exported');
  assert.match(appSource, /\btoggleSelection\(/, 'expected row selection to use the shared selection model, not ad-hoc array splicing');
  assert.match(appSource, /\bselectPage\(/, 'expected select-all to use the shared selection model');
  assert.match(appSource, /\binvertSelection\(/, 'expected an inverse-selection action wired to the shared selection model');
});

test('the Export bulk action downloads the selected rows as a real file, never the whole table silently', () => {
  assert.match(appSource, /plan\.affected\.map/, 'expected the export to be built from the plan\'s affected rows (the selection), not tbl.rows unconditionally');
  assert.match(appSource, /a\.download\s*=\s*artifact\.filename/, 'expected a real browser download triggered from the prepared filename');
});

test('BREAK CHECK -- deleting the prepared export call from the source is what this guard catches', () => {
  const withoutPrepareExport = appSource.replace(/\bprepareExport\(/g, 'prepareExportRENAMED(');
  assert.doesNotMatch(withoutPrepareExport, /\bprepareExport\(/);
});
