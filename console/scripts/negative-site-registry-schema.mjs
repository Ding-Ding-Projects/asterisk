#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/feature-registry-schema.test.mjs.
 *
 * The failure that test exists to catch is a quiet one: an integration merge took an older
 * copy of `site/feature-registry.json` and put schema v1 back, with `state` and `files`
 * where `status` and `implementation.paths` belong. The file stayed valid JSON, still named
 * all 44 canonical features, and still recorded an honest-looking judgement for each -- so
 * the diff read as a routine file update, while 33 assertions elsewhere went red and the
 * whole inventory gate stopped at its first check.
 *
 * A schema guard is unusually easy to write toothlessly, because most of what it looks at
 * is present in both the good and the bad file. So each break here removes exactly one
 * property the test claims to hold, and the test has to go red for that one alone.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched.
 *
 * Two properties keep editing real files on disk safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break that did not actually change the file is reported as a FAILED CASE rather
 *     than counted as a pass. An edit that never landed reads exactly like a guard that
 *     held, and it is the commonest way to fake a green.
 *
 * Usage:  node scripts/negative-site-registry-schema.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/feature-registry-schema.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const REGISTRY = file('site/feature-registry.json');
const MATRIX = file('inventories/surface-completeness.json');

/**
 * Rewrites a JSON file through a mutation function.
 *
 * The mutation must report that it changed something. Reserializing the whole document
 * changes the bytes whatever the mutation did, so "the file is different" proves nothing
 * here -- only the mutation's own report does, and a mutation that reports nothing is a
 * break that never happened.
 */
const mutate = (path, apply) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const document = JSON.parse(before);
  const changed = apply(document);
  if (!changed) throw new Error('the mutation reported no change, so the break never landed');
  const after = `${JSON.stringify(document, null, 2)}\n`.split('\n').join(eol);
  if (after === before) throw new Error('the mutation changed no bytes, so the break never landed');
  return { path, before, after };
};

/** A row that is `absent` everywhere, so breaking it cannot collide with a claim. */
const ABSENT_ROW = 'dim-sum-surprise';
/** A row that claims an implementation, so its paths and note are load-bearing. */
const CLAIMED_ROW = 'collapsible-filters';

const CASES = [
  ['the registry goes back to schema v1',
    mutate(REGISTRY, (d) => { d.schemaVersion = 1; return true; })],

  ['the registry stops naming the canonical matrix it answers to',
    mutate(REGISTRY, (d) => { delete d.canonicalMatrix; return true; })],

  ['the registry names a matrix that is not the canonical one',
    mutate(REGISTRY, (d) => { d.canonicalMatrix = 'console/inventories/surface-completeness.backup.json'; return true; })],

  ['the registry claims to be the desktop surface',
    mutate(REGISTRY, (d) => { d.surface = 'windows-console'; return true; })],

  // The exact regression: one row reverts to the v1 spelling while every other row stays
  // on v2, which is what a hand-resolved merge conflict actually produces.
  ['one row reverts to the legacy state field',
    mutate(REGISTRY, (d) => {
      const row = d.features[ABSENT_ROW];
      row.state = row.status;
      delete row.status;
      return true;
    })],

  // Worse than the line above, because it reads as migrated in every grep: the row carries
  // both spellings, so a search for `status` finds it and the stale value is still there.
  ['a row carries both the v2 status and the legacy state beside it',
    mutate(REGISTRY, (d) => { d.features[ABSENT_ROW].state = 'absent'; return true; })],

  ['a row keeps its legacy files list beside implementation.paths',
    mutate(REGISTRY, (d) => { d.features[ABSENT_ROW].files = []; return true; })],

  ['a row records a status the canonical matrix does not allow',
    mutate(REGISTRY, (d) => { d.features[ABSENT_ROW].status = 'shipped'; return true; })],

  ['a canonical feature disappears from the registry',
    mutate(REGISTRY, (d) => { delete d.features[ABSENT_ROW]; return true; })],

  ['the registry grows a feature the canonical matrix has never heard of',
    mutate(REGISTRY, (d) => { d.features['telepathy-mode'] = { ...d.features[ABSENT_ROW] }; return true; })],

  ['a row records where the feature lives under a third key nobody validates',
    mutate(REGISTRY, (d) => { d.features[CLAIMED_ROW].implementation.notes = []; return true; })],

  ['a row loses the symbols half of its implementation record',
    mutate(REGISTRY, (d) => { delete d.features[CLAIMED_ROW].implementation.symbols; return true; })],

  ['a row loses the paths half of its registration record',
    mutate(REGISTRY, (d) => { delete d.features[CLAIMED_ROW].registration.paths; return true; })],

  ['a row records a status with no note explaining it',
    mutate(REGISTRY, (d) => { d.features[CLAIMED_ROW].note = ''; return true; })],

  ['a row claims an implementation and names no file it lives in',
    mutate(REGISTRY, (d) => { d.features[CLAIMED_ROW].implementation.paths = []; return true; })],

  // The two files that hold this judgement drift apart, in each direction. This is the
  // pair that had genuinely drifted on six of the 44 with nothing comparing them.
  ['the matrix and the registry disagree, with the matrix moving',
    mutate(MATRIX, (d) => {
      const surface = d.surfaces.find((s) => s.registry === 'site');
      const row = surface.rows.find((r) => r.featureId === CLAIMED_ROW);
      row.status = 'absent';
      return true;
    })],

  ['the matrix and the registry disagree, with the registry moving',
    mutate(REGISTRY, (d) => { d.features[CLAIMED_ROW].status = 'partial'; return true; })],

  // The guard's own non-vacuity assertions. A scan that silently finds nothing reports
  // clean forever, so emptying each source it reads has to be noticed rather than ignored.
  ['the canonical feature list the guard reads is emptied',
    mutate(MATRIX, (d) => { d.features = []; return true; })],

  ['the matrix stops declaring any legal status value',
    mutate(MATRIX, (d) => { d.statusValues = []; return true; })],

  ['no surface in the matrix admits to belonging to the site',
    mutate(MATRIX, (d) => {
      let moved = false;
      for (const surface of d.surfaces) if (surface.registry === 'site') { surface.registry = 'desktop'; moved = true; }
      return moved;
    })],

  ['a site surface stops carrying every canonical feature',
    mutate(MATRIX, (d) => {
      const surface = d.surfaces.find((s) => s.registry === 'site');
      surface.rows = surface.rows.filter((row) => row.featureId !== ABSENT_ROW);
      return true;
    })],
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
  console.error(`FAIL: the untouched contract test is already ${baseline}, so nothing below would mean anything.`);
  process.exit(1);
}

let failures = 0;
for (const [label, plant] of CASES) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${label}: ${error.message}`);
    failures += 1;
    continue;
  }
  let broke;
  try {
    writeFileSync(planted.path, planted.after, 'utf8');
    broke = runTest();
  } finally {
    writeFileSync(planted.path, planted.before, 'utf8');
    const restored = readFileSync(planted.path, 'utf8');
    if (restored !== planted.before) {
      console.error(`FATAL: ${planted.path} was not restored; fix it by hand before continuing.`);
      process.exit(2);
    }
  }
  const after = runTest();
  const ok = broke === 'red' && after === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broke.padEnd(5)} restored=${after.padEnd(5)}  ${label}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${CASES.length} planted break(s) did not turn the contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${CASES.length} planted break(s), each alone, each turning ${TEST} red and then green again on restore.`);
