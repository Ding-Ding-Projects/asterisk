import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const globalSource = await readFile(join(root, 'global-settings.js'), 'utf8');
const appSource = await readFile(join(root, 'app.js'), 'utf8');
const registry = JSON.parse(await readFile(join(root, 'feature-registry.json'), 'utf8'));

function requireSource(source, needle) {
  assert.ok(source.includes(needle), `missing exact source boundary: ${needle}`);
}

function expectRedThenGreen(source, needle) {
  assert.doesNotThrow(() => requireSource(source, needle));
  const broken = source.replaceAll(needle, 'REMOVED_SOURCE_BOUNDARY');
  assert.throws(() => requireSource(broken, needle));
  assert.doesNotThrow(() => requireSource(source, needle));
}

test('canonical state migrates theme and density and owns the shared write', () => {
  expectRedThenGreen(globalSource, "saved.theme = legacy.theme");
  expectRedThenGreen(globalSource, "saved.density = legacy.density");
  expectRedThenGreen(appSource, "localStorage.getItem('ding-pbx-site-global-settings-v1')");
  assert.match(globalSource, /function purgeOwnedState/);
});

test('effective tuple and repair metadata are source-backed', () => {
  expectRedThenGreen(globalSource, 'function effectiveTupleAt');
  expectRedThenGreen(globalSource, 'return JSON.stringify({ tuple: result.tuple');
  expectRedThenGreen(globalSource, 'function ruleValidationReasons');
  expectRedThenGreen(globalSource, 'const IANA_TIMEZONES');
});

test('cache boundaries and terminal statuses are explicit', () => {
  expectRedThenGreen(globalSource, 'function detectImageMime');
  expectRedThenGreen(globalSource, 'cache-oversize');
  expectRedThenGreen(globalSource, 'mime-or-magic-mismatch');
  expectRedThenGreen(globalSource, 'const candidates = fisherYates(DISHES).slice(0, 5)');
  expectRedThenGreen(globalSource, 'dimSumCacheReason');
});

test('copy and notification sources retain independent language tracks', () => {
  expectRedThenGreen(globalSource, 'function localizedInline');
  expectRedThenGreen(globalSource, 'const PANEL_LITERAL_COPY');
  expectRedThenGreen(appSource, 'function notificationView');
  expectRedThenGreen(appSource, 'legacyPresentation');
});

test('dropdown builders and School metadata have owned boundaries', () => {
  expectRedThenGreen(globalSource, 'function createDropdownRegexOverlay');
  expectRedThenGreen(globalSource, 'data-school-name');
  expectRedThenGreen(globalSource, "applyLiteralCopy($('global-settings-panel'))");
});

test('registry stays partial for the still-bounded contracts', () => {
  assert.equal(registry.features['language-modes'].state, 'partial');
  assert.equal(registry.features['funny-levels'].state, 'partial');
  assert.equal(registry.features['scheduled-settings'].state, 'partial');
  assert.equal(registry.features['dim-sum-surprise'].state, 'partial');
});
