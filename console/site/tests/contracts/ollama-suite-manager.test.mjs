/**
 * Contract: ollama-suite-manager. The honest state is "absent" -- no Ollama
 * integration of any kind exists in the site.
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
const everyPage = PAGES.map((name) => read(`${name}.html`)).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for ollama-suite-manager', () => {
  assert.ok(registry.features['ollama-suite-manager'], 'no ollama-suite-manager row in site/feature-registry.json');
});

test('the word "ollama" never appears anywhere in the published site or in app.js', () => {
  assert.doesNotMatch(everyPage, /ollama/iu, 'an Ollama integration now appears in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /ollama/iu, 'an Ollama integration now appears in app.js -- re-check the "absent" state');
  assert.doesNotMatch(app, /11434/u, "Ollama's default local port now appears in app.js -- a loopback client may have landed");
});

test('the registry records ollama-suite-manager as absent, and the code agrees', () => {
  assert.equal(registry.features['ollama-suite-manager'].state, 'absent',
    'no Ollama integration of any kind exists in the site -- "absent" is the honest state');
});

const EXEMPT_SURFACE = "pages-site";
const EXEMPT_ROOT = resolve(siteRoot, '..', '..');

/* ------------------------------------------------------------------ *
 * Read this before deleting anything above.
 *
 * The absence below is a DECISION, not a gap. If you are here because a
 * registry row said `absent` and you took that as work waiting to be done,
 * stop: ollama-suite-manager was excluded by the owner, for both surfaces, and the
 * reason is in `console/inventories/exemptions.json`. Only the owner can
 * reverse that.
 *
 * This block is here rather than only in the inventory because this is the
 * file somebody has to edit to make a newly built feature pass, so it is the
 * last place the decision can still be met before an afternoon is spent. On
 * 2026-08-27 one was: the site converter was built in full, with 57 contract
 * tests and 48 planted breaks behind it, before anything said the exclusion
 * existed.
 * ------------------------------------------------------------------ */
test('ollama-suite-manager is excluded by owner decision, so its absence is not a gap to fill', () => {
  const inventoryRoot = resolve(EXEMPT_ROOT, 'console/inventories');
  const inventory = JSON.parse(readFileSync(resolve(inventoryRoot, 'surface-completeness.json'), 'utf8'));
  const exemptions = JSON.parse(readFileSync(resolve(inventoryRoot, 'exemptions.json'), 'utf8'));
  const surface = inventory.surfaces.find((entry) => entry.id === EXEMPT_SURFACE);
  assert.ok(surface, `${EXEMPT_SURFACE} is no longer a surface in the completeness inventory`);
  const row = surface.features.find((entry) => entry.id === 'ollama-suite-manager');
  assert.equal(row?.status, 'exempt',
    'ollama-suite-manager is no longer marked exempt for this surface -- if the owner reversed the exclusion, this whole file needs rewriting rather than this one line');
  const decision = exemptions.exemptions.find((entry) => entry.feature === 'ollama-suite-manager');
  assert.ok(decision?.surfaces.includes(EXEMPT_SURFACE),
    'the exemption record no longer covers this surface');
  assert.equal(decision.decidedBy, 'owner', 'the exclusion is no longer recorded as the owner\'s decision');
  assert.ok(decision.reason.length > 40, 'the exclusion no longer carries a reason worth disagreeing with');
});
