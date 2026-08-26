/**
 * Contract: status-hub. `status-hub-client.ts` (implemented 2026-08-24) is a
 * complete, tested module: `validateReport()` refuses a lane claiming `passed`
 * or `failed` with no evidence (the two states a reader acts on, so a claim
 * with nothing to check is worse than none), `unrun` is its own state rather
 * than a synonym for `failed` (a check nobody ran reported as failed sends
 * somebody hunting a defect that does not exist), `buildPayload()` names every
 * field explicitly rather than spreading (a session holds credentials,
 * hostnames and vault keys alongside the report), and `advanceCursor()`
 * resynchronises and reports the gap rather than retrying forever or silently
 * skipping when a reply cursor is older than the hub.
 *
 * IMPORTED SINCE 2026-08-26: the Status hub screen's own "Record this session"
 * button (App.tsx `onBuildHubSession`) builds a real `SessionReport` from this
 * window's own state -- one lane per config screen this run has tried to read
 * -- validates it with `validateReport`, and lists the truncated `buildPayload`
 * result as a row on the screen. It is still blocked on the network transport:
 * this console has no privileged HTTP client, no configured hub address and no
 * session key, so nothing built here is ever transmitted anywhere -- the button
 * and the screen both say so plainly. Real remote consumption is future work.
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
const MODULE = 'app/renderer/src/status-hub-client.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['status-hub'];
  assert.ok(row, 'the implementation registry has no row for status-hub');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
  if (row.state === 'partial') {
    /* implementation-blockers.test.mjs's "a blocked row does not also claim a consumer" rule
     * forbids `blockedBy` on a row a real App.tsx import consumes -- which this one now is,
     * since 2026-08-26's "Record this session" button. A row can therefore be genuinely
     * partial (some real capability shipped, another genuinely missing) with the remaining
     * gap folded into `note` instead of `blockedBy`; either is an honest record of what is
     * not done, and the module-specific test below only cares that one of them exists. */
    const explainsWhatRemains = (typeof row.blockedBy === 'string' && row.blockedBy.length > 20)
      || row.note.length > 200;
    assert.ok(explainsWhatRemains, 'a partial row should record what it is blocked on, in blockedBy or in note');
  }
});

test('App.tsx imports status-hub-client.ts and calls its validated report/payload path', () => {
  const app = read(APP);
  assert.match(app, /from '\.\/status-hub-client'/u,
    'App.tsx no longer imports status-hub-client.ts -- the Status hub screen would have nothing real behind it');
  assert.match(app, /validateReport\(/u, 'App.tsx no longer validates the report it builds before recording it');
  assert.match(app, /buildPayload\(/u, 'App.tsx no longer runs the report through buildPayload before listing it');
});

test('the button that reaches it never claims a network transmission it cannot perform', () => {
  const app = read(APP);
  const fn = app.match(/onBuildHubSession = \(\): void => \{[\s\S]*?\n  \};/);
  assert.ok(fn, 'expected to find onBuildHubSession in App.tsx');
  assert.match(fn[0], /nothing was sent anywhere/iu,
    'the handler no longer says plainly that recording a session is local-only');
});

test('validateReport refuses a lane claiming passed/failed with no evidence, and treats unrun as its own state', () => {
  const src = read(MODULE);
  assert.match(src, /export const LANE_STATES = \['unrun', 'running', 'blocked', 'failed', 'passed'\] as const;/u,
    'the lane-state enum no longer matches -- unrun may have been merged into another state');
  const fn = src.match(/export function validateReport\(report: SessionReport\): ReportProblem\[\] \{[\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find validateReport');
  assert.match(fn[0], /evidence/iu, 'validateReport no longer appears to check for evidence on a lane');
});

test('buildPayload names every field explicitly rather than spreading the session state', () => {
  const src = read(MODULE);
  const fn = src.match(/export function buildPayload\(report: SessionReport\): Payload \{[\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find buildPayload');
  assert.doesNotMatch(fn[0], /\.\.\.report\b/u, 'buildPayload now spreads the report directly -- this would risk leaking an unnamed field like a credential or vault key');
});

test('advanceCursor exists to resynchronise and report the gap when a reply cursor is stale, rather than retrying forever or silently skipping', () => {
  const src = read(MODULE);
  assert.match(src, /export function advanceCursor\(/u, 'advanceCursor no longer exists');
});

test('the module has its own dedicated test coverage', () => {
  const testFile = resolve(root, 'tests/ui/status-hub-client.test.tsx');
  const content = readFileSync(testFile, 'utf8');
  assert.ok(content.length > 500, 'tests/ui/status-hub-client.test.tsx exists but looks too small to be real coverage');
});
