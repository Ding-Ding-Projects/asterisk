/**
 * Contract: the pages-site feature registry keeps its evidence schema.
 *
 * This exists because it did not. An integration merge replaced the schema-v2 registry --
 * `status` plus eleven evidence blocks per row, including the implementation paths and the
 * exact symbols each row claims -- with a flat `{state, note, files}` file carrying two.
 * Every structured field the roadmap's largest item exists to accumulate was dropped in
 * one commit, and the loss showed up as 33 unrelated-looking assertion failures scattered
 * across 26 other contract files, each comparing `undefined` to a string.
 *
 * Two things were missing, and this file is both of them.
 *
 * One: nothing in THIS group said what shape the registry has, so a downgrade was reported
 * everywhere except at the registry. `scripts/verify-inventories.mjs` did refuse it -- and
 * said so, in a group that was already red for an unrelated reason, which is a good way for
 * a correct refusal to go unread for a day.
 *
 * Two, and this is the one worth having: a row names exact symbols, and until those names
 * are checked against the files they name, a row can go on describing an implementation
 * that has been deleted. That is not hypothetical here either. The registry's converter and
 * Ollama rows named `initConverter` and `initOllama` in `site/app.js`; the merge carried the
 * two HTML pages forward and not the code, so both functions vanished, both pages shipped
 * with every control inert, and the rows went on claiming an implementation. The symbol
 * check below is what turns that into a failing test rather than a paragraph nobody reads.
 *
 * The validator is imported rather than restated. A restated copy would go on checking the
 * old rules while the real one moved, which is the same defect one level up.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { validateFeatureRegistry } from '../../../scripts/inventory-validation.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleRoot = resolve(siteRoot, '..');
const repoRoot = resolve(consoleRoot, '..');
const read = (path) => readFileSync(resolve(siteRoot, path), 'utf8').replaceAll('\r\n', '\n');
const registry = JSON.parse(read('feature-registry.json'));

const clone = () => JSON.parse(JSON.stringify(registry));
const validate = (data) => validateFeatureRegistry(data, { surface: 'pages-site', root: repoRoot });
/** A planted break must throw. A break that does not is a check that is not checking. */
const refuses = (data, why) => assert.throws(() => validate(data), why);

const ids = Object.keys(registry.features);

test('the committed registry passes the same validator the inventory check runs', () => {
  assert.ok(ids.length > 0, 'the registry has no rows, so everything below would pass by finding nothing');
  validate(clone());
});

test('the registry is schema v2 and no row keeps the flat shape it briefly regressed to', () => {
  assert.equal(registry.schemaVersion, 2);
  assert.equal(registry.surface, 'pages-site');
  assert.equal(registry.canonicalMatrix, 'console/inventories/surface-completeness.json');
  for (const id of ids) {
    const row = registry.features[id];
    assert.equal(Object.hasOwn(row, 'state'), false, `${id} still carries the legacy state field`);
    assert.equal(Object.hasOwn(row, 'files'), false, `${id} still carries the legacy files field`);
    for (const field of ['status', 'note', 'implementation', 'registration', 'route', 'documentation',
      'localization', 'persistence', 'focusedChecks', 'negativeEvidence', 'builtInteraction', 'captures', 'designParity']) {
      assert.ok(Object.hasOwn(row, field), `${id} has no ${field} evidence field`);
    }
  }
});

test('every path and every document a row names exists on disk', () => {
  /* The imported validator checks the path of every named SYMBOL and stops there; the
   * `paths` arrays and the documentation article are its blind spot, so they are checked
   * here rather than assumed. */
  for (const id of ids) {
    const row = registry.features[id];
    for (const kind of ['implementation', 'registration']) {
      for (const path of row[kind].paths) {
        assert.ok(existsSync(resolve(consoleRoot, path)), `${id}.${kind} names a file that is not there: ${path}`);
      }
    }
    const documentation = row.documentation?.path;
    if (documentation) {
      assert.ok(existsSync(resolve(repoRoot, documentation)), `${id} names a document that is not there: ${documentation}`);
    }
  }
});

test('a row that claims an implementation names one, and a row that claims none names no symbol', () => {
  for (const id of ids) {
    const row = registry.features[id];
    if (row.status === 'absent') {
      assert.deepEqual(row.implementation.symbols, [],
        `${id} is recorded absent and still names an implementation symbol, which is the state the converter row was in`);
    } else {
      assert.ok(row.implementation.paths.length > 0,
        `${id} is recorded ${row.status} and names no file it lives in`);
    }
  }
});

test('the four statuses are the only ones used, and no row claims verified without an evidence row', () => {
  const allowed = ['absent', 'partial', 'implemented-unverified'];
  for (const id of ids) {
    assert.ok(allowed.includes(registry.features[id].status), `${id} has status ${registry.features[id].status}`);
  }
});

/* ------------------------------------------------------------------ *
 * Deliberate breaks. Each is planted alone against a fresh copy, because two at once
 * proves only that something among them is watched.
 * ------------------------------------------------------------------ */

test('a schema downgrade is refused', () => {
  const broken = clone();
  broken.schemaVersion = 1;
  refuses(broken, /schemaVersion 2 required/u);
});

test('a renamed surface is refused', () => {
  const broken = clone();
  broken.surface = 'pages-site-v2';
  refuses(broken, /surface identifier drift/u);
});

test('a moved canonical matrix reference is refused', () => {
  const broken = clone();
  broken.canonicalMatrix = 'console/inventories/other.json';
  refuses(broken, /canonical matrix reference drift/u);
});

test('a row dropped from the canonical set is refused', () => {
  const broken = clone();
  delete broken.features['regex-builder'];
  refuses(broken, /feature registry identifiers/u);
});

test('a row invented outside the canonical set is refused', () => {
  const broken = clone();
  broken.features['imaginary-feature'] = clone().features['regex-builder'];
  refuses(broken, /feature registry identifiers/u);
});

test('an unknown status is refused', () => {
  const broken = clone();
  broken.features['regex-builder'].status = 'shipped';
  refuses(broken, /invalid status/u);
});

test('a registry row claiming verified is refused, because a registry is not evidence', () => {
  const broken = clone();
  broken.features['regex-builder'].status = 'verified';
  refuses(broken, /verified registry claim is not permitted/u);
});

test('the flat shape is refused rather than silently accepted alongside the new one', () => {
  const broken = clone();
  const row = broken.features['regex-builder'];
  row.files = row.implementation.paths;
  delete row.implementation;
  refuses(broken, /implementation/u);
});

test('a symbol whose declaration is gone is refused -- the exact case the converter row was in', () => {
  const broken = clone();
  broken.features['regex-builder'].implementation.symbols[0].name = 'initConverter';
  refuses(broken, /exact declaration or registration is absent/u);
});

test('a renamed symbol is refused, so a rename cannot leave the row describing the old name', () => {
  const broken = clone();
  broken.features['regex-builder'].implementation.symbols[0].name = 'openRegexDialog';
  refuses(broken, /exact declaration or registration is absent/u);
});

test('a symbol pointing at a file that is not there is refused', () => {
  const broken = clone();
  broken.features['regex-builder'].implementation.symbols[0].path = 'site/regex.js';
  refuses(broken, /source path is absent/u);
});

test('an unknown symbol kind is refused', () => {
  const broken = clone();
  broken.features['regex-builder'].implementation.symbols[0].kind = 'thing';
  refuses(broken, /invalid symbol kind/u);
});
