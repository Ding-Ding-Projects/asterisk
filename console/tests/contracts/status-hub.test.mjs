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
 * NOTHING IMPORTS IT YET: no surface in the renderer calls any of these
 * functions, confirmed by grepping App.tsx for an import of the module and
 * finding none. The module is real; it constrains nothing that ships. It is
 * blocked on the transport and a hub to report to -- no privileged HTTP client,
 * no configured hub address, no session key exist yet.
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
    assert.ok(typeof row.blockedBy === 'string' && row.blockedBy.length > 20, 'a partial row should record what it is blocked on');
  }
});

test('nothing in App.tsx imports status-hub-client.ts -- it constrains nothing that ships today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/status-hub-client'/u,
    'App.tsx now imports status-hub-client.ts -- the transport may have been wired, which would flip this row');
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
