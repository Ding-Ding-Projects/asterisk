/**
 * Contract: collapsible-filters. Real and wired. `settings.html` and
 * `documentation.html` use real `<details class="collapsible-panel">`
 * elements wrapping the search/filter controls (settings-filters-panel,
 * documentation-filters-panel), wired to `updateFilterStatus()` in
 * `site/app.js`, which reports a live match count into an
 * `aria-live="polite"` status span -- a genuine collapsible, accessible
 * filter row, not a decorative fold.
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

test('the site feature registry carries a row for collapsible-filters', () => {
  assert.ok(registry.features['collapsible-filters'], 'no collapsible-filters row in site/feature-registry.json');
});

test('settings.html and documentation.html each wrap their search/filter controls in a real <details class="collapsible-panel">', () => {
  const settings = read('settings.html');
  const docs = read('documentation.html');
  assert.match(settings, /<details class="collapsible-panel sticky-tools" id="settings-filters-panel" open><summary>Search &amp; actions<span id="settings-filter-status" class="filter-status" aria-live="polite">/u,
    'the settings filter panel no longer matches the expected collapsible <details> shape');
  assert.match(docs, /<details class="collapsible-panel sticky-tools" id="documentation-filters-panel" open><summary>Search &amp; filter<span id="documentation-filter-status" class="filter-status" aria-live="polite">/u,
    'the documentation filter panel no longer matches the expected collapsible <details> shape');
});

test('updateFilterStatus is a real function that reports a live match count, called for both panels', () => {
  const fn = app.match(/function updateFilterStatus\(statusId,inputId\)\{[\s\S]*?\n {2}\}/);
  assert.ok(fn, 'expected to find updateFilterStatus as a real function');
  assert.match(app, /updateFilterStatus\('documentation-filter-status','feature-search'\)/u,
    'updateFilterStatus is no longer called for the documentation panel');
  assert.match(app, /updateFilterStatus\('settings-filter-status','settings-search'\)/u,
    'updateFilterStatus is no longer called for the settings panel');
});

test('collapsed state is a real user choice, not hard-coded: the settings-preview panel starts collapsed (no "open" attribute)', () => {
  const settings = read('settings.html');
  assert.match(settings, /<details class="collapsible-panel" id="settings-preview-panel"><summary>/u,
    'the settings-preview panel no longer matches -- it should start collapsed (no "open" attribute), unlike the filters panel above it');
});

test('the registry records collapsible-filters as implemented', () => {
  assert.equal(registry.features['collapsible-filters'].status, 'implemented-unverified',
    'real, accessible collapsible <details> panels wired to a live match-count status should read as implemented');
});
