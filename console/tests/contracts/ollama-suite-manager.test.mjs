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
