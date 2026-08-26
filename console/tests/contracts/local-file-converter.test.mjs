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
