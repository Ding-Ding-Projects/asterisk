/**
 * Contract: local-file-converter. The honest state is "absent" -- there is no file
 * converter surface, no adapter registry, no category catalogue, and no bundled
 * adapter proof anywhere in the renderer or the control plane. This file pins that
 * from the real sources rather than the registry's prose, and checks the one place
 * a converter would plausibly hide (the export module, which does produce several
 * text formats) to confirm it is export formatting and not a general-purpose
 * converter with a category catalogue and bundled offline adapters.
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

test('the implementation registry carries a row for local-file-converter, marked absent', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['local-file-converter'];
  assert.ok(row, 'no local-file-converter row in app/feature-registry.json');
  assert.equal(row.state, 'absent', 'a converter surface may have landed -- re-check this test, not just the registry');
  assert.deepEqual(row.files, [], 'an absent row should name no implementation files');
});

test('no adapter registry, category catalogue, or converter surface exists in the renderer sources', () => {
  assert.doesNotMatch(rendererSource, /adapter.?registry/iu, 'an adapter registry now exists -- the "absent" state needs re-checking');
  assert.doesNotMatch(rendererSource, /category.?catalogue|category.?catalog/iu, 'a category catalogue now exists -- re-check the "absent" state');
});

test('the export module produces text formats but names none of them a "converter"', () => {
  const exportSrc = read('app/renderer/src/export.ts');
  assert.doesNotMatch(exportSrc, /adapter|bundled.?adapter/iu,
    'export.ts now mentions adapters -- it may have grown into a real converter, which would change this row');
  assert.doesNotMatch(exportSrc, /\bconverter\b/iu, 'export.ts now calls itself a converter -- re-check the "absent" state');
});

test('no documentation article exists for a feature that was never built', () => {
  const docs = readdirSync(resolve(root, 'docs/platform'));
  assert.ok(!docs.includes('local-file-converter.md'),
    'a documentation article now exists for local-file-converter -- the implementation may have landed too');
});

const EXEMPT_SURFACE = "windows-console";
const EXEMPT_ROOT = resolve(root, '..');

/* ------------------------------------------------------------------ *
 * Read this before deleting anything above.
 *
 * The absence below is a DECISION, not a gap. If you are here because a
 * registry row said `absent` and you took that as work waiting to be done,
 * stop: local-file-converter was excluded by the owner, for both surfaces, and the
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
test('local-file-converter is excluded by owner decision, so its absence is not a gap to fill', () => {
  const inventoryRoot = resolve(EXEMPT_ROOT, 'console/inventories');
  const inventory = JSON.parse(readFileSync(resolve(inventoryRoot, 'surface-completeness.json'), 'utf8'));
  const exemptions = JSON.parse(readFileSync(resolve(inventoryRoot, 'exemptions.json'), 'utf8'));
  const surface = inventory.surfaces.find((entry) => entry.id === EXEMPT_SURFACE);
  assert.ok(surface, `${EXEMPT_SURFACE} is no longer a surface in the completeness inventory`);
  const row = surface.features.find((entry) => entry.id === 'local-file-converter');
  assert.equal(row?.status, 'exempt',
    'local-file-converter is no longer marked exempt for this surface -- if the owner reversed the exclusion, this whole file needs rewriting rather than this one line');
  const decision = exemptions.exemptions.find((entry) => entry.feature === 'local-file-converter');
  assert.ok(decision?.surfaces.includes(EXEMPT_SURFACE),
    'the exemption record no longer covers this surface');
  assert.equal(decision.decidedBy, 'owner', 'the exclusion is no longer recorded as the owner\'s decision');
  assert.ok(decision.reason.length > 40, 'the exclusion no longer carries a reason worth disagreeing with');
});
