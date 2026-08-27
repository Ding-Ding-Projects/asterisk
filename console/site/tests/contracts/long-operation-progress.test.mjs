/**
 * Contract: long-operation-progress. The honest state is "absent". The only
 * progress-shaped code in the whole file is a decorative counter-animation
 * easing function (a `step(now)` closure computing `progress` to animate a
 * number counting up on the page) -- not a real operation-progress report
 * inside a Start-download-style dialog. This file proves both halves: the
 * counter animation is real (so the absence claim is not vacuous), and it is
 * confirmed decorative rather than a report of any real asynchronous work.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for long-operation-progress', () => {
  assert.ok(registry.features['long-operation-progress'], 'no long-operation-progress row in site/feature-registry.json');
});

test('the only "progress" in app.js is a decorative counter-animation easing function, real but not a task report', () => {
  assert.match(app, /function step\(now\)\{const progress=Math\.min\(1,\(now-start\)\/durati/u,
    'the counter-animation easing function no longer matches -- confirm what "progress" now refers to before trusting the negative test below');
  assert.match(app, /requestAnimationFrame\(step\)/u, 'the counter animation no longer uses requestAnimationFrame -- re-check what it is');
});

test('there is no real operation-progress report, plan, or start dialog anywhere', () => {
  assert.doesNotMatch(app, /planOperation|operationPlan|reEntryGuard|alreadyRunning/iu,
    'a real long-operation-progress mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records long-operation-progress as absent, and the code agrees', () => {
  assert.equal(registry.features['long-operation-progress'].status, 'absent',
    'the only progress-shaped code is a decorative counter-animation easing function, not a real operation-progress report inside a start dialog -- "absent" is the honest state');
});
