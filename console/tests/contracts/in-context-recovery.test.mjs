/**
 * Contract: in-context-recovery. Real and wired, but scoped to exactly one
 * surface: a failing provisioning step. `in-context-recovery.ts`'s
 * `recoveryFor()` is imported by App.tsx and called from `onProvisionStep()`
 * the moment a step reports `ok: false`, classified by
 * `App.classifyStepFailure(step)` (on the reported detail, not the step name --
 * the name says what was attempted, the detail says why it failed). The
 * resulting summary, detail, and offered actions are shown together with the
 * real error, never a cheerful generic retry.
 *
 * The property this module is built around is what it refuses: every recovery
 * kind names a `forbidden` list of remedies that look fast and destroy work
 * (force-push, reset, dropping a branch, widening permissions, retrying a
 * refused action unchanged), so a caller handing the situation to a coding
 * agent passes the prohibition on rather than only the goal.
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
const MODULE = 'app/renderer/src/in-context-recovery.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['in-context-recovery'];
  assert.ok(row, 'the implementation registry has no row for in-context-recovery');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('recoveryFor() IS imported and called on the deploy-failure path', () => {
  const app = read(APP);
  assert.match(app, /import \{ recoveryFor, type FailureKind \} from '\.\/in-context-recovery';/,
    'in-context-recovery.ts is no longer imported the expected way');
  assert.match(app, /const recovery = recoveryFor\(App\.classifyStepFailure\(step\), step\.detail, \{ target: step\.name \}\);/u,
    'recoveryFor(...) is no longer called from onProvisionStep');
});

test('the real error detail is carried through, never replaced by only the summary', () => {
  const app = read(APP);
  assert.match(app, /\$\{recovery\.summary\}\s*\n\s*\n\$\{recovery\.detail\}/u,
    'the fired message no longer includes both recovery.summary and recovery.detail');
});

test('classification reads the reported detail, not the step name', () => {
  const app = read(APP);
  const fn = app.match(/private static classifyStepFailure\(step: \{ name: string; detail: string \}\): FailureKind \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'expected to find classifyStepFailure');
  assert.match(fn[0], /step\.detail/u, 'classifyStepFailure no longer reads step.detail');
});

test('every recovery kind names a forbidden list -- the refusal is explicit, not merely an omission', () => {
  const src = read(MODULE);
  const forbiddenLists = [...src.matchAll(/forbidden:\s*(\[[^\]]*\]|NEVER_FOR_GIT)/gu)];
  assert.ok(forbiddenLists.length >= 5, `expected several recovery kinds to declare a forbidden list, found ${forbiddenLists.length}`);
});

test('a shared NEVER_FOR_GIT list exists and is reused rather than retyped per kind', () => {
  const src = read(MODULE);
  assert.match(src, /NEVER_FOR_GIT/u, 'the shared forbidden-remedies list no longer exists');
  const reuseCount = [...src.matchAll(/forbidden:\s*NEVER_FOR_GIT/gu)].length;
  assert.ok(reuseCount >= 2, `expected NEVER_FOR_GIT reused by at least two recovery kinds, found ${reuseCount}`);
});
