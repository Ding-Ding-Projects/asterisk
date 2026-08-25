/**
 * Contract: changelog-viewer. The honest state here is "absent" -- there is no
 * changelog surface, no version/date filter, and no commit-link rendering anywhere
 * in the published site. This file pins that fact from the real sources, and also
 * checks the one place a changelog would most plausibly be found (the status page,
 * which already narrates a factual timeline of the site's own build) to confirm it
 * really is a status timeline and not a mislabeled changelog.
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
const everyPage = Object.values(pageSource).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for changelog-viewer', () => {
  assert.ok(registry.features['changelog-viewer'], 'no changelog-viewer row in site/feature-registry.json');
});

test('the word "changelog" never appears in any published page or in app.js', () => {
  assert.doesNotMatch(everyPage, /changelog/iu, 'a changelog surface now appears in the markup -- the "absent" state needs re-checking, not this test');
  assert.doesNotMatch(app, /changelog/iu, 'a changelog surface now appears in app.js -- the "absent" state needs re-checking, not this test');
});

test('no commit-SHA link rendering exists in app.js', () => {
  /* A real changelog entry links a full commit SHA (per the canonical contract,
   * "the full commit SHA with each entry"). Nothing in app.js builds that kind of
   * link, so this checks for the shape rather than the literal word. */
  assert.doesNotMatch(app, /commit\/\$\{|commit\/\[0-9a-f\]\{40\}/u,
    'app.js now builds a commit-link URL -- a changelog viewer may have actually landed');
});

test('there is no date-range filter control anywhere in the published site', () => {
  assert.doesNotMatch(everyPage, /id="[a-z-]*changelog[a-z-]*"/iu, 'a changelog-named control id now exists -- re-check the "absent" state');
});

test('the status page is a factual build timeline, not a changelog: entries carry no version number and no commit link', () => {
  const timeline = pageSource.status.match(/<ol class="status-timeline"[^>]*>([\s\S]*?)<\/ol>/u);
  assert.ok(timeline, 'status.html no longer carries its status-timeline list');
  assert.doesNotMatch(timeline[1], /v\d+\.\d+\.\d+/u, 'the status timeline now carries version numbers -- it may have grown into a changelog');
  assert.doesNotMatch(timeline[1], /[0-9a-f]{40}/u, 'the status timeline now carries a full commit SHA -- it may have grown into a changelog');
});

test('the registry records changelog-viewer as absent, and the source agrees', () => {
  assert.equal(registry.features['changelog-viewer'].state, 'absent',
    'no version history, date filter, search, export, or commit-linked entry exists anywhere in the published site -- "absent" is the honest state');
});
