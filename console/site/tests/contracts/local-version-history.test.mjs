/**
 * Contract: local-version-history. The honest state is "absent". The
 * documentation catalogue lists a "History" article (`app/history`,
 * describing the CONSOLE PRODUCT's append-only local configuration
 * revisions) as one of its 32 documented destinations -- but that is
 * documentation content describing a feature of the console app, not an
 * implemented history/versions panel on the site itself. There is no diff
 * view, no restore action, and no history repository anywhere in the site.
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

test('the site feature registry carries a row for local-version-history', () => {
  assert.ok(registry.features['local-version-history'], 'no local-version-history row in site/feature-registry.json');
});

test('the DESTINATIONS catalogue lists an "app/history" article as documentation content, so the absence claim is about implementation, not about the topic never being mentioned', () => {
  assert.match(app, /article:'app\/history'/u, 'the app/history documentation entry no longer matches -- confirm the catalogue still names this topic before trusting the negative test below');
});

test('there is no real history panel, diff view, or restore action implemented on the site itself', () => {
  assert.doesNotMatch(app, /historyPanel|historyDiff|restoreRevision|versionHistory/iu,
    'a real history panel, diff view, or restore action now exists on the site -- the "absent" state needs re-checking');
});

test('the registry records local-version-history as absent, and the code agrees', () => {
  assert.equal(registry.features['local-version-history'].state, 'absent',
    'the "History" catalogue entry describes a feature of the console product; no history/versions panel, diff view, or restore action is implemented on the site itself -- "absent" is the honest state');
});
