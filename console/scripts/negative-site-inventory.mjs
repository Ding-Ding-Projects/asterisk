#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the two checks that speak for the pages-site
 * inventory:
 *
 *   site/tests/contracts/feature-registry-schema.test.mjs
 *   site/tests/contracts/published-pages.test.mjs
 *
 * Both exist because of the same failure, found on 2026-08-27: an artifact and the checks
 * that read it had drifted apart, and nothing anywhere was watching the seam. The registry
 * was schemaVersion 1 with a `state` field while its validator, thirty-three of its own
 * contract assertions and its own generator all spoke schemaVersion 2 with a `status`
 * field -- so every one of those thirty-three assertions compared `undefined` against a
 * string literal and could never once have passed, and `verify-inventories.mjs` threw on
 * the schemaVersion before any of the thirty-seven gates behind it ran.
 *
 * A check written to notice that is worth exactly as much as the proof that it fires. So
 * every case below plants one lie of the kind that produced the original mess -- a field
 * renamed back, a status the vocabulary does not contain, a path that names nothing, a
 * page whose controls stop being reachable -- and requires the contract test to go red for
 * it and green again when it is put back.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a guard
 *     that held, and this repository has been caught by that more than once.
 *
 * Usage:  node scripts/negative-site-inventory.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');

const SCHEMA_TEST = 'site/tests/contracts/feature-registry-schema.test.mjs';
const PAGES_TEST = 'site/tests/contracts/published-pages.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const REGISTRY = file('site/feature-registry.json');
const GENERATOR = file('scripts/generate-completeness-matrix.mjs');
const PAGES_GUARD = file(PAGES_TEST);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const HISTORY = file('site/history.html');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses.
 * Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file matches
 * nothing at all -- which, without the exactly-once check, reads as a guard that held
 * rather than as a break that never happened.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const anchor = from.split('\n').join(eol);
  const replacement = to.split('\n').join(eol);
  const occurrences = before.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(anchor.slice(0, 70))}`);
  }
  return { path, before, after: before.split(anchor).join(replacement) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the thing
 * that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  /* ---------------------------------------------------------------- *
   * The registry schema.
   * ---------------------------------------------------------------- */

  // The exact state master was in: the file goes back to the schema its validator refuses,
  // and every gate behind verify-inventories.mjs stops running.
  [SCHEMA_TEST, 'the registry declares schemaVersion 1 again',
    swap(REGISTRY, '"schemaVersion": 2,', '"schemaVersion": 1,')],

  // The canonical matrix reference drifts, so the registry stops pointing at the inventory
  // it is supposed to be a face of.
  [SCHEMA_TEST, 'the registry stops naming the canonical matrix',
    swap(REGISTRY, '"canonicalMatrix": "console/inventories/surface-completeness.json",', '"canonicalMatrix": "console/inventories/nowhere.json",')],

  // The old field name comes back beside the new one. This is the shape that started it:
  // two names for one fact, with different readers believing different ones.
  ['both', 'a schema-1 state field is back beside status',
    swap(REGISTRY, '"support-tickets": {\n      "status": "absent",', '"support-tickets": {\n      "state": "absent",\n      "status": "absent",')],

  // A status outside the validator's own vocabulary. `implemented` is the value the
  // schema-1 file used, and it is exactly the one that must not silently return.
  [SCHEMA_TEST, 'a row carries a status the validator vocabulary does not contain',
    swap(REGISTRY, '"context-menu-shortcuts": {\n      "status": "implemented-unverified",', '"context-menu-shortcuts": {\n      "status": "implemented",')],

  // A registry row claims verified. The whole point of this surface is that no pages-site
  // row has built-artifact evidence, so a verified claim here is a claim with nothing
  // behind it.
  [SCHEMA_TEST, 'a row claims verified with no evidence row behind it',
    swap(REGISTRY, '"regex-builder": {\n      "status": "implemented-unverified",', '"regex-builder": {\n      "status": "verified",')],

  // The row names a file that is not in the tree, which is how a reader is sent looking
  // for a feature in a place it has never been.
  [SCHEMA_TEST, 'a row names a path that does not exist',
    swap(REGISTRY, '"site/app.js",\n          "site/build.mjs",\n          "site/downloads.html",', '"site/app.js",\n          "site/nowhere.js",\n          "site/downloads.html",')],

  /* An absent row names an implementation symbol. Absent means nothing implements it, so a
   * symbol here is the row disagreeing with its own status.
   *
   * The first version of this case inserted an unrelated extra key and stayed GREEN,
   * because it never touched the symbols array the assertion actually reads -- an inert
   * break, which reads exactly like an assertion that held. It plants a real, resolvable
   * symbol now: `notify` genuinely exists in site/app.js, so the validator's own
   * symbol-resolution check is satisfied and the only thing left to object is the rule
   * this case is written for. The path is planted with it so the row stays internally
   * consistent and one lie trips one rule. */
  [SCHEMA_TEST, 'an absent row names an implementation symbol',
    swap(REGISTRY,
      '"support-tickets": {\n      "status": "absent",\n      "note": "No Support Tickets surface exists on the site.",\n      "implementation": {\n        "paths": [],\n        "symbols": []\n      },',
      '"support-tickets": {\n      "status": "absent",\n      "note": "No Support Tickets surface exists on the site.",\n      "implementation": {\n        "paths": [\n          "site/app.js"\n        ],\n        "symbols": [\n          {\n            "path": "site/app.js",\n            "name": "notify",\n            "kind": "function"\n          }\n        ]\n      },')],

  // A status with no reason beside it. A one-word note is how a row stops being evidence
  // and becomes an opinion.
  [SCHEMA_TEST, 'a row keeps its status but loses the reason for it',
    swap(REGISTRY, '"dim-sum-surprise": {\n      "status": "absent",\n      "note": "No startup dim-sum surprise or bundled dish assets were found.",', '"dim-sum-surprise": {\n      "status": "absent",\n      "note": "None.",')],

  /* ---------------------------------------------------------------- *
   * The generator that writes the registry.
   * ---------------------------------------------------------------- */

  // The stale-table defect itself: the generator's copy of a status drifts from the
  // audited registry, so re-running it would silently revert that row.
  [SCHEMA_TEST, 'the generator status table drifts from the audited registry',
    swap(GENERATOR, "'in-context-recovery': 'implemented-unverified', 'provider-markup-rendering'", "'in-context-recovery': 'absent', 'provider-markup-rendering'")],

  // The reader that lifts the table out of the generator stops matching, so the comparison
  // above would run over an empty table and agree with anything. The non-vacuity check is
  // the only thing standing between that and a green.
  [SCHEMA_TEST, 'the generator status table can no longer be read back at all',
    swap(GENERATOR, 'const siteStatus = {', 'const siteStatusTable = {')],

  /* ---------------------------------------------------------------- *
   * The published pages.
   * ---------------------------------------------------------------- */

  // A page that publishes controls nothing reaches, without that being declared. This is
  // the state converter.html and ollama.html are in, and the reason the check exists.
  [PAGES_TEST, 'an inert page stops being declared, so its dead controls go unrecorded',
    swap(PAGES_GUARD, "  converter: 'converter.html ships", "  converterX: 'converter.html ships")],

  // The declaration outlives the state it describes: the page gets wired and the record
  // still says nobody reaches it.
  [PAGES_TEST, 'a declared-inert page is wired while the declaration stays',
    swap(APP, "  function applyLogo(", "  const wiredNow='converter-files';\n  function applyLogo(")],

  // The census of what those two pages actually carry goes stale, which is the number the
  // two absent registry rows point at.
  [PAGES_TEST, 'the recorded control census for the inert pages drifts',
    swap(PAGES_GUARD, "assert.equal(ownControls('ollama').length, 11);", "assert.equal(ownControls('ollama').length, 12);")],

  // A shipped script nobody loads stops being declared, so a dead module goes unrecorded.
  [PAGES_TEST, 'a shipped script that no page loads stops being declared',
    swap(PAGES_GUARD, "  'full-builder.js': 'A second regular-expression", "  'full-builder-x.js': 'A second regular-expression")],

  // A page stops loading any script at all, which no amount of correct markup rescues.
  [PAGES_TEST, 'a page stops loading any script',
    swap(SETTINGS, '<script src="app.js" defer></script>', '')],

  // The empty mount point on history.html is renamed, so the record describes a page that
  // no longer exists in that shape.
  [PAGES_TEST, 'the history mount point is renamed out from under its record',
    swap(HISTORY, '<div id="history-delivery-page"></div>', '<div id="history-delivery-panel"></div>')],
];

const runTest = (test) => {
  try {
    execFileSync(process.execPath, ['--test', test], { cwd: consoleRoot, stdio: 'pipe' });
    return 'green';
  } catch {
    return 'red';
  }
};

/** A case may name one test or, for a break that ought to trip both, the string 'both'. */
const testsFor = (which) => (which === 'both' ? [SCHEMA_TEST, PAGES_TEST] : [which]);
const runAll = (which) => {
  const verdicts = testsFor(which).map(runTest);
  return verdicts.includes('red') ? 'red' : 'green';
};

for (const test of [SCHEMA_TEST, PAGES_TEST]) {
  if (runTest(test) !== 'green') {
    console.error(`FAIL: ${test} is already red before anything was planted, so nothing below would mean anything.`);
    process.exit(1);
  }
}

let failures = 0;
for (const [which, name, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${name}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    console.error(`FAILED CASE  ${name}: the replacement changed no bytes, so nothing was broken`);
    failures += 1;
    continue;
  }

  let broken;
  try {
    writeFileSync(planted.path, planted.after);
    broken = runAll(which);
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runAll(which);
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn their contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning its contract test red and then green again on restore.`);
