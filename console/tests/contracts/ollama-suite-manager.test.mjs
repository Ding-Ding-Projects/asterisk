/**
 * Contract: ollama-suite-manager. The honest state is "absent" -- no local Ollama
 * HTTP client, model store, chat surface, or harness launcher exists anywhere in
 * the renderer or the control plane. This file pins that from the real sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const rendererSrcDir = resolve(root, 'app/renderer/src');
const rendererFiles = readdirSync(rendererSrcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
const rendererSource = rendererFiles.map((f) => read(`app/renderer/src/${f}`)).join('\n');
const controlPlaneDir = resolve(root, 'control-plane');
const controlPlaneSource = readdirSync(controlPlaneDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => read(`control-plane/${f}`))
  .join('\n');

test('the implementation registry carries a row for ollama-suite-manager, marked absent', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['ollama-suite-manager'];
  assert.ok(row, 'no ollama-suite-manager row in app/feature-registry.json');
  assert.equal(row.state, 'absent', 'an Ollama integration may have landed -- re-check this test, not just the registry');
  assert.deepEqual(row.files, [], 'an absent row should name no implementation files');
});

test('no Ollama local-API client, model store, chat surface, or harness launcher exists in the renderer', () => {
  assert.doesNotMatch(rendererSource, /\bollama\b/iu, 'an Ollama integration now appears in the renderer -- the "absent" state needs re-checking');
});

test('no Ollama loopback request or process orchestration exists in the control plane', () => {
  assert.doesNotMatch(controlPlaneSource, /\bollama\b/iu, 'an Ollama integration now appears in the control plane -- re-check the "absent" state');
  assert.doesNotMatch(controlPlaneSource, /11434/u, "Ollama's default local port now appears in the control plane -- a loopback client may have landed");
});

test('no documentation article exists for a feature that was never built', () => {
  const docs = readdirSync(resolve(root, 'docs/platform'));
  assert.ok(!docs.includes('ollama-suite-manager.md'),
    'a documentation article now exists for ollama-suite-manager -- the implementation may have landed too');
});
