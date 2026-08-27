/**
 * Contract: local-file-converter. This verifies the implemented-but-unverified
 * source boundary. It must not upgrade source wiring into packaged or runtime proof.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const registry = JSON.parse(read('app/feature-registry.json'));

const shared = read('shared/converter.ts');
const converterRegistry = read('control-plane/converter-registry.ts');
const runner = read('control-plane/converter-runner.ts');
const queue = read('control-plane/converter-queue.ts');
const pdf = read('control-plane/converter-pdf.ts');
const surface = read('app/renderer/src/converter-surface.tsx');
const mounts = read('app/renderer/src/surface-mounts.tsx');
const docs = read('docs/platform/local-file-converter.md');

test('registry records the implemented but unverified converter boundary', () => {
  const row = registry.features['local-file-converter'];
  assert.ok(row, 'local-file-converter must have a registry row');
  assert.equal(row.status, 'implemented-unverified');
  assert.match(row.route, /#surface=converter/u);
  assert.equal(row.documentation.state, 'present');
  assert.equal(row.builtInteraction.state, 'not-run');
  assert.equal(row.captures.state, 'not-run');
});

test('converter supplies all required categories, a typed catalog, and an actual mounted surface', () => {
  for (const category of [
    'documents-pdf', 'images', 'audio', 'video', 'archives',
    'structured-data-spreadsheets', 'code-text', 'binary-encodings',
  ]) assert.match(shared, new RegExp(`['\"]${category}['\"]`, 'u'));
  assert.match(converterRegistry, /CONVERTER_CATEGORY_CATALOG/u);
  assert.match(converterRegistry, /assertCatalogComplete/u);
  assert.match(surface, /ConverterSurface/u);
  assert.match(mounts, /ConverterSurface/u);
});

test('availability stays fail-closed until a packaged adapter proof validates', () => {
  assert.match(shared, /packagedArtifact: true/u);
  assert.match(converterRegistry, /verifiedProof/u);
  assert.match(converterRegistry, /artifactSha256/u);
  assert.match(converterRegistry, /No verified .* runtime is bundled/u);
  assert.doesNotMatch(converterRegistry, /process\.env\.PATH|which\(/u);
});

test('queue and runner preserve local bounded conversion behavior', () => {
  assert.match(queue, /AsyncIterable/u);
  assert.match(queue, /maxConcurrency/u);
  assert.match(runner, /symbolic|Symbolic|symlink|SymbolicLink/u);
  assert.match(runner, /atomic|rename|temporary/u);
  assert.match(runner, /cancel/u);
});

test('PDF capability is explicit and disabled without packaged evidence', () => {
  assert.match(pdf, /pdfCapabilities|PdfCapability/u);
  assert.match(converterRegistry, /pdf-toolkit/u);
  assert.match(converterRegistry, /unavailable/u);
});

test('documentation states present source behavior and the unverified boundary', () => {
  /* The heading gained the canonical `## Behavior:` prefix every feature article carries,
   * so the pin is on the phrase rather than on the whole line. */
  assert.match(docs, /desktop backend contract/iu);
  assert.match(docs, /Verification boundary/u);
  assert.match(docs, /implemented but unverified/u);
});
