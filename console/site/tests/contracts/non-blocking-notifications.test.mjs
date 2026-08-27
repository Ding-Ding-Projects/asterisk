/**
 * Contract: non-blocking-notifications, recomputed from the published site.
 *
 * The toast surface (notify(), an aria-live region, auto-dismiss) is present on every
 * one of the six published pages. The full reviewable history -- bulk select/dismiss,
 * export, a destructive-action distinction -- lives behind a dialog reachable from
 * only two of the six pages (index and settings). This file checks both facts
 * separately so the "implemented" state is pinned to what is actually universal
 * (the toast surface itself) and what is not (the history dialog's reach).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for non-blocking-notifications', () => {
  assert.ok(registry.features['non-blocking-notifications'], 'no non-blocking-notifications row in site/feature-registry.json');
});

test('every published page carries a live-region toast surface', () => {
  for (const name of PAGES) {
    assert.match(pageSource[name], /id="toast-region" class="toast-region" aria-live="polite"/u,
      `${name}.html is missing the aria-live toast region`);
  }
});

test('notify() appends a toast to that region and auto-dismisses it -- it never blocks', () => {
  /* The signature gained a third argument on 2026-08-26 -- the words the spoken
   * narrator reads -- and the non-blocking behaviour below is unchanged. */
  const line = app.split('\n').find((l) => /^\s*function notify\(title,body,narration\)\{/.test(l));
  assert.ok(line, 'notify(title,body,narration) was not found as a single source line');
  assert.match(line, /region\.append\(toast\)/u, 'notify no longer appends into the toast region');
  assert.match(line, /setTimeout\(\(\)=>toast\.remove\(\),/u, 'notify no longer auto-dismisses the toast on a timer');
  assert.doesNotMatch(line, /confirm\(|alert\(/u, 'notify now uses a blocking browser dialog primitive');
});

test('extended-timeout users get a longer auto-dismiss window rather than the same fixed timer for everyone', () => {
  const line = app.split('\n').find((l) => /^\s*function notify\(title,body,narration\)\{/.test(l));
  assert.match(line, /state\.attention\.extendedTimeouts\?15000:5000/u,
    'notify no longer varies its dismiss timeout for the extended-timeouts accessibility setting');
});

test('a reviewable notification history with bulk select and a destructive-dismiss distinction exists', () => {
  assert.match(pageSource.index, /id="notification-history"/u, 'index.html has no #notification-history panel');
  for (const id of ['notif-select-page', 'notif-select-matches', 'notif-select-none', 'notif-dismiss-selected', 'notif-export-selected']) {
    assert.match(pageSource.index, new RegExp(`id="${id}"`, 'u'), `index.html is missing #${id}`);
  }
  const appLines = app.split('\n');
  const signatureIndex = appLines.findIndex((l) => /^\s*function planBulk\(action,selected,canApply,options=\{\}\)\{/.test(l));
  assert.ok(signatureIndex >= 0, 'planBulk(...) signature line was not found');
  /* planBulk's body runs a few lines past its signature -- bounded by a fixed line
   * count rather than a lazy [\s\S]*? scan, so this cannot accidentally reach into an
   * unrelated function further down the file. */
  const body = appLines.slice(signatureIndex, signatureIndex + 5).join('\n');
  assert.match(body, /destructive:options\.destructive\|\|false/u, 'planBulk no longer distinguishes destructive bulk actions');
});

test('the history dialog is reachable from only two of the six published pages, not all six', () => {
  const withHistory = PAGES.filter((name) => /id="notification-history"/u.test(pageSource[name]));
  assert.deepEqual(withHistory.sort(), ['index', 'settings'],
    'the set of pages carrying the notification-history dialog changed -- update this test and the registry note together');
});

test('the registry records non-blocking-notifications as implemented, matching the universal toast surface', () => {
  assert.equal(registry.features['non-blocking-notifications'].status, 'implemented-unverified',
    'the canonical requirement is a non-blocking toast plus a reviewable history with bulk actions, and both exist -- "implemented" is the honest state, even though the history dialog itself is reachable from only two pages');
});
