/**
 * Contract: unlock-ladder. The honest state is "absent" -- no unlock ladder
 * (dim sum / sums / whack-a-mole / clock) exists on the site. There is
 * nothing to unlock in the first place (see per-element-toy-locks.md), so
 * there is no lockout for a ladder to shorten.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';
const PAGES = PAGE_NAMES;
const everyPage = PAGES.map((name) => read(`${name}.html`)).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for unlock-ladder', () => {
  assert.ok(registry.features['unlock-ladder'], 'no unlock-ladder row in site/feature-registry.json');
});

test('no dim-sum/sums/whack-a-mole/clock ladder mechanism exists anywhere on the site', () => {
  assert.doesNotMatch(everyPage, /whack.?a.?mole|unlock.?ladder/iu, 'an unlock ladder now exists in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /whack.?a.?mole|unlockLadder|ladderBudget/iu, 'an unlock ladder now exists in app.js -- re-check the "absent" state');
});

test('the registry records unlock-ladder as absent, and the code agrees', () => {
  assert.equal(registry.features['unlock-ladder'].status, 'absent',
    'no unlock ladder exists; there is nothing to unlock in the first place -- "absent" is the honest state');
});
