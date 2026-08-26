/**
 * Contract: in-context-recovery. The honest state is "absent" -- no
 * surface-level recovery route (for example, re-authentication offered
 * directly beside a refused action) was found anywhere on the site. There is
 * no failure surface on this static site that a recovery route would even
 * attach to.
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

test('the site feature registry carries a row for in-context-recovery', () => {
  assert.ok(registry.features['in-context-recovery'], 'no in-context-recovery row in site/feature-registry.json');
});

test('there is no recovery-classification mechanism, forbidden-remedy list, or re-authentication route anywhere', () => {
  assert.doesNotMatch(app, /recoveryFor|classifyFailure|forbiddenRemed/iu,
    'a recovery-classification mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records in-context-recovery as absent, and the code agrees', () => {
  assert.equal(registry.features['in-context-recovery'].state, 'absent',
    'no surface-level recovery route was found -- "absent" is the honest state');
});
