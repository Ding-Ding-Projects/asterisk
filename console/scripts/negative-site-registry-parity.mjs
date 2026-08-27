#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for tests/contracts/site-registry-matrix-parity.test.mjs.
 *
 * The in-process break fixtures inside that test mutate a `structuredClone`, which proves the
 * assertions fire but proves nothing about the committed bytes on disk or about the generator
 * that writes them. This file breaks the real files, one at a time, and watches the guard go
 * red and then green again on restore.
 *
 * That distinction is not academic here. The drift this guard was written for lived on disk --
 * a schemaVersion-1 registry, a stale table inside the generator -- and every in-memory fixture
 * in the world would have been green while it did.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail proves
 * only that something among them is watched.
 *
 * Two properties keep editing real files safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather than
 *     assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE rather
 *     than counted as a pass. An edit that never landed reads exactly like a guard that held,
 *     and it is the commonest way to fake a green. Ten anchors in this repository's sibling
 *     scripts went stale in one afternoon when the registry changed shape, and every one was
 *     caught by this check rather than by anybody reading them.
 *
 * Usage:  node scripts/negative-site-registry-parity.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const consoleRoot = resolve(import.meta.dirname, '..');
const TEST = 'tests/contracts/site-registry-matrix-parity.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const REGISTRY = file('site/feature-registry.json');
const MATRIX = file('inventories/surface-completeness.json');
const GENERATOR = file('scripts/generate-completeness-matrix.mjs');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses,
 * because parts of this checkout are CRLF and a newline-only anchor against a CRLF file matches
 * nothing at all.
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

/** Each case is one lie, and the comment beside it is the defect it stands for. */
const cases = [
  // The exact state this pass found: a registry in the old schema, which the validator refuses
  // outright and thirty-three contract tests silently read `undefined` out of.
  ['the site registry is rolled back to schema v1',
    swap(REGISTRY, '  "schemaVersion": 2,', '  "schemaVersion": 1,')],

  // The old vocabulary comes back for one row. `implemented` is not one of the four canonical
  // statuses, and twenty rows carried it without anything objecting.
  ['one row goes back to the non-canonical "implemented" status',
    swap(REGISTRY, '"narration": {\n      "status": "implemented-unverified",',
      '"narration": {\n      "status": "implemented",')],

  // Both keys at once, which is how a half-finished migration actually looks: readers that want
  // `status` are satisfied, readers that want `state` are satisfied, and the two can now disagree.
  ['the schema-v1 "state" key comes back beside "status"',
    swap(REGISTRY, '"narration": {\n      "status": "implemented-unverified",',
      '"narration": {\n      "state": "implemented",\n      "status": "implemented-unverified",')],

  // A real regression in the honest position, of exactly the kind the stale generator table
  // would have produced on its next run.
  ['a feature the site really built is recorded absent again',
    swap(REGISTRY, '"in-context-recovery": {\n      "status": "implemented-unverified",',
      '"in-context-recovery": {\n      "status": "absent",')],

  // The registry stops naming the matrix it is meant to agree with, so the two are no longer
  // even claiming to be about the same thing.
  ['the registry stops naming the canonical matrix',
    swap(REGISTRY, '  "canonicalMatrix": "console/inventories/surface-completeness.json",\n  "features": {\n    "language-modes"',
      '  "canonicalMatrix": "console/inventories/somewhere-else.json",\n  "features": {\n    "language-modes"')],

  // The registry claims a verified row on its own authority, with no evidence row behind it.
  // This is the one status a registry may never award itself.
  ['a registry row awards itself "verified"',
    swap(REGISTRY, '"regex-builder": {\n      "status": "implemented-unverified",',
      '"regex-builder": {\n      "status": "verified",')],

  // The generator's table goes stale again, exactly as it had. Nothing about the committed
  // artifacts changes; only a future run of the generator would revert them -- which is the
  // whole reason `--check` exists.
  ['the generator table goes stale, so a re-run would revert a built feature',
    swap(GENERATOR, "'in-context-recovery': 'implemented-unverified', 'provider-markup-rendering'",
      "'in-context-recovery': 'absent', 'provider-markup-rendering'")],

  // `--check` is turned into a no-op that always agrees. A check that cannot fail is worse than
  // no check, because the green tick is read as evidence.
  ['the generator --check stops comparing and always agrees',
    swap(GENERATOR, '  if (committed !== normalise(text)) drifted.push(relativePath);',
      '  if (false) drifted.push(relativePath);')],

  // `--check` finds drift and reports success anyway.
  ['the generator --check finds drift and passes anyway',
    swap(GENERATOR, '  if (drifted.length > 0) {', '  if (false) {')],
];

const runTest = () => {
  try {
    execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
    return 'green';
  } catch {
    return 'red';
  }
};

const baseline = runTest();
if (baseline !== 'green') {
  console.error('FAIL: the untouched guard is already red, so nothing below would mean anything.');
  process.exit(1);
}

let failures = 0;
for (const [name, plant] of cases) {
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
    broken = runTest();
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runTest();
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn the guard red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning ${TEST} red and then green again on restore.`);
