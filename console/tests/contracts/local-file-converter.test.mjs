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
