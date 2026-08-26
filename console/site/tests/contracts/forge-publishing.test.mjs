/**
 * Contract: forge-publishing. The honest state is "absent" -- no
 * GitHub/forge publishing flow exists; this is a documentation/marketing
 * site with no repository-publishing feature.
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

test('the site feature registry carries a row for forge-publishing', () => {
  assert.ok(registry.features['forge-publishing'], 'no forge-publishing row in site/feature-registry.json');
});

test('no forge/GitHub publishing flow, account list, or fork/copy logic exists anywhere in app.js', () => {
  assert.doesNotMatch(app, /octokit|api\.github\.com|activeAccount|forkOrCopy/iu,
    'a forge-publishing flow now exists -- the "absent" state needs re-checking');
});

test('the registry records forge-publishing as absent, and the code agrees', () => {
  assert.equal(registry.features['forge-publishing'].state, 'absent',
    'no GitHub/forge publishing flow exists; this is a documentation/marketing site -- "absent" is the honest state');
});
