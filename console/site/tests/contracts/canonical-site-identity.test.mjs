/**
 * Contract: every current site identity source agrees on the maintained repository
 * and published Pages path. Historical records may mention the former path elsewhere,
 * but executable current sources and registry routes must not.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleRoot = resolve(siteRoot, '..');
const read = relative => readFileSync(resolve(consoleRoot, relative), 'utf8').replaceAll('\r\n', '\n');
const build = read('site/build.mjs');
const history = read('site/history-delivery.js');
const resolver = read('scripts/resolve-site-download-manifest.mjs');
const registry = JSON.parse(read('site/feature-registry.json'));
const SITE_ORIGIN = 'https://ding-ding-projects.github.io/material-asterisk/';
const REPOSITORY_URL = 'https://github.com/Ding-Ding-Projects/material-asterisk';

test('build, history delivery, and resolver carry the maintained identity', () => {
  assert.match(build, /const PUBLIC_REPOSITORY = 'Ding-Ding-Projects\/material-asterisk';/u);
  assert.match(build, /const PUBLIC_SITE_ORIGIN = 'https:\/\/ding-ding-projects\.github\.io\/material-asterisk\//u);
  assert.match(history, /const PUBLIC_REPOSITORY_URL = 'https:\/\/github\.com\/Ding-Ding-Projects\/material-asterisk';/u);
  assert.match(resolver, /const API_ROOT = 'repos\/Ding-Ding-Projects\/material-asterisk';/u);
  assert.doesNotMatch(build + history + resolver, /github\.io\/asterisk|github\.com\/Ding-Ding-Projects\/asterisk/iu,
    'a current executable source still carries the retired identity');
});

test('every registry route is current and uses the canonical Pages origin', () => {
  const rows = Object.values(registry.features || {});
  assert.ok(rows.length > 0, 'the site registry is empty');
  for (const row of rows) {
    assert.equal(row.route, SITE_ORIGIN, 'a feature route does not use the maintained Pages origin');
    if (row.designParity?.builtRoute) assert.equal(row.designParity.builtRoute, SITE_ORIGIN, 'a built route does not use the maintained Pages origin');
  }
  assert.equal(REPOSITORY_URL, 'https://github.com/Ding-Ding-Projects/material-asterisk');
});
