/**
 * Contract: ollama-suite-manager. This verifies implemented source seams while
 * retaining the honest absence of packaged, live-runtime, and capture evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const registry = JSON.parse(read('app/feature-registry.json'));
const dispatch = read('control-plane/dispatch.ts');
const client = read('control-plane/ollama-client.ts');
const catalog = read('control-plane/ollama-catalog.ts');
const pulls = read('control-plane/ollama-pulls.ts');
const chat = read('control-plane/ollama-chat.ts');
const harness = read('control-plane/ollama-harness.ts');
const fit = read('control-plane/ollama-fit.ts');
const model = read('app/renderer/src/ollama-suite-model.ts');
const surface = read('app/renderer/src/ollama-suite.tsx');
const mounts = read('app/renderer/src/surface-mounts.tsx');
const docs = read('docs/platform/ollama-suite-manager.md');

test('registry records the implemented but unverified Ollama boundary', () => {
  const row = registry.features['ollama-suite-manager'];
  assert.ok(row, 'ollama-suite-manager must have a registry row');
  assert.equal(row.status, 'implemented-unverified');
  assert.match(row.route, /#surface=ollama/u);
  assert.equal(row.documentation.state, 'present');
  assert.equal(row.focusedChecks.state, 'not-run');
  assert.equal(row.builtInteraction.state, 'not-run');
  assert.equal(row.captures.state, 'not-run');
});

test('the desktop surface is mounted with a typed local suite client', () => {
  assert.match(model, /interface OllamaSuiteClient/u);
  assert.match(model, /OLLAMA_SUITE_REGISTRATION/u);
  assert.match(surface, /OllamaSuite/u);
  assert.match(mounts, /ollama\.snapshot/u);
  assert.match(mounts, /OllamaSuite/u);
});

test('the local client constrains loopback transport, payloads, deadlines, and streams', () => {
  assert.match(client, /127\.0\.0\.1|localhost|::1/u);
  assert.match(client, /11434/u);
  assert.match(client, /maxResponseBytes|MAX_RESPONSE/u);
  assert.match(client, /AbortController|deadline/u);
  assert.match(client, /api\/pull/u);
  assert.match(client, /api\/chat/u);
});

test('dispatcher wires runtime, catalog, fit, pull, chat, and optional harness seams', () => {
  for (const symbol of ['OllamaClient', 'OllamaStore', 'OllamaPullQueue', 'OllamaChat']) {
    assert.match(dispatch, new RegExp(symbol, 'u'));
  }
  for (const factory of ['createOllamaRuntimeHandlers', 'createOllamaPullHandlers', 'createOllamaChatHandlers', 'createOllamaCatalogHandlers', 'createOllamaFitHandlers', 'createOllamaHarnessHandlers']) {
    assert.match(dispatch, new RegExp(factory, 'u'));
  }
  for (const action of ['ollama.catalog.get', 'ollama.catalog.refresh', 'ollama.catalog.reconcile', 'ollama.fit.evaluate', 'ollama.harness.profiles', 'ollama.harness.register', 'ollama.harness.preflight', 'ollama.harness.launch', 'ollama.harness.restore']) {
    assert.match(dispatch, new RegExp(action.replaceAll('.', '\\.'), 'u'));
  }
  assert.match(dispatch, /No verified official Ollama catalogue transport is configured/u);
  assert.match(mounts, /OLLAMA_ACTION_UNAVAILABLE|unavailable/u);
});

test('catalog, pull, chat, fit, and harness source seams retain their explicit evidence contracts', () => {
  assert.match(catalog, /page|cursor|complete|partial/u);
  assert.match(pulls, /concurrency|cancel|retry|resume/u);
  assert.match(chat, /stream|attachment|session/u);
  assert.match(fit, /runs-well|runs-with-limits|unlikely|unknown/u);
  assert.match(harness, /allowlist|preflight|snapshot|rollback/u);
});

test('documentation states local-only behavior and the unverified boundary', () => {
  assert.match(docs, /local Ollama/u);
  assert.match(docs, /Verification boundary/u);
  assert.match(docs, /implemented but unverified/u);
});

const EXEMPT_SURFACE = "windows-console";
const EXEMPT_ROOT = resolve(root, '..');

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
