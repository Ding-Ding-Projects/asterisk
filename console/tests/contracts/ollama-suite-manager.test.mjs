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
