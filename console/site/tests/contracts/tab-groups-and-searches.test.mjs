/**
 * Contract: tab-groups-and-searches. The honest state is "absent" -- the site
 * has no tabs at all (see browser-style-tabs.md: the only tab-shaped markup
 * is a plain `class="local-tabs"` in-page anchor nav, not a real tab strip),
 * so there is nothing to group and nothing to search within a group. There is
 * no group-name search and no master cross-window search either.
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

test('the site feature registry carries a row for tab-groups-and-searches', () => {
  assert.ok(registry.features['tab-groups-and-searches'], 'no tab-groups-and-searches row in site/feature-registry.json');
});

test('there is no group model or group-search of any kind in app.js', () => {
  assert.doesNotMatch(app, /tabGroup|groupSearch|masterTabSearch/iu,
    'a tab-group or group-search mechanism now exists -- browser-style-tabs.md needs re-checking first, since this depends on real tabs existing at all');
});

test('the registry records tab-groups-and-searches as absent, and the code agrees', () => {
  assert.equal(registry.features['tab-groups-and-searches'].state, 'absent',
    'no tabs exist on the site at all, so there are no tab groups or tab searches -- "absent" is the honest state');
});
