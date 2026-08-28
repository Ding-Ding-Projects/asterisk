/**
 * Every pages-site registry status, pinned once, by hand.
 *
 * Six site rows drifted before anyone noticed: `responsive-sizing`,
 * `built-in-authenticator`, `guided-forms`, `context-menu-shortcuts`,
 * `long-operation-progress` and `in-context-recovery` all shipped, the registry was
 * updated, and `scripts/generate-completeness-matrix.mjs` -- which owns both the registry
 * and the canonical completeness matrix -- was not. So the matrix went on recording all
 * six as `absent` across all six site surfaces, thirty-six rows understating what the site
 * really had, and nothing anywhere objected.
 *
 * The reason nothing objected is measurable rather than a guess: those six were, exactly,
 * the rows whose own contract file made no assertion about the registry status. Thirty-
 * eight rows were pinned somewhere and did not drift; the six that were not, did. Adding
 * six more assertions to six more files would fix those six and leave the next unpinned
 * row just as free to drift, so the backstop is here instead, and it is a hand-written
 * list rather than a rule.
 *
 * That distinction matters and is the reason this file looks redundant. A rule-shaped
 * check ("every status is one of the four legal values", "every row that claims
 * implemented names a file") passes on a row that has quietly changed from `partial` to
 * `absent`, because the new value is legal too. Only a hand-written expectation catches a
 * status that moved without anyone deciding it should. The per-feature contract files keep
 * their own status assertions, which carry the reasoning for that one feature; this file
 * carries no reasoning and only the fact, for all forty-four.
 *
 * Changing a status is therefore a two-file edit on purpose. That is the cost of making it
 * a deliberate act rather than something a regenerate can do on its own.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = JSON.parse(readFileSync(resolve(siteRoot, 'feature-registry.json'), 'utf8').replaceAll('\r\n', '\n'));

/** Hand-written. Every canonical feature id, and the status the pages site really has. */
const EXPECTED_STATUS = {
  'language-modes': 'partial',
  'funny-levels': 'partial',
  'dialog-emojis': 'implemented-unverified',
  'school-mode': 'implemented-unverified',
  narration: 'implemented-unverified',
  'scheduled-settings': 'partial',
  'external-settings-sources': 'absent',
  'dim-sum-surprise': 'absent',
  'regex-builder': 'implemented-unverified',
  'non-blocking-notifications': 'implemented-unverified',
  'status-hub': 'absent',
  'material-appearance': 'partial',
  'app-logo-customization': 'partial',
  'local-file-converter': 'implemented-unverified',
  'ollama-suite-manager': 'absent',
  'browser-style-tabs': 'absent',
  'tab-groups-and-searches': 'absent',
  'command-palette': 'partial',
  'destructive-action-confirmation': 'partial',
  'local-version-history': 'implemented-unverified',
  'changelog-viewer': 'implemented-unverified',
  'external-editor-handoff': 'absent',
  'complete-exports': 'implemented-unverified',
  'bulk-actions': 'implemented-unverified',
  accessibility: 'partial',
  'responsive-sizing': 'partial',
  'personal-vocabulary-upload': 'implemented-unverified',
  'per-element-toy-locks': 'implemented-unverified',
  'support-tickets': 'implemented-unverified',
  'unlock-ladder': 'absent',
  'built-in-authenticator': 'implemented-unverified',
  'attention-modes': 'implemented-unverified',
  'browser-extension-download-surfaces': 'absent',
  'offline-documentation-browser': 'partial',
  'app-display-name': 'implemented-unverified',
  'guided-forms': 'partial',
  'bounded-overlays': 'implemented-unverified',
  'context-menu-shortcuts': 'implemented-unverified',
  'long-operation-progress': 'implemented-unverified',
  'in-context-recovery': 'implemented-unverified',
  'provider-markup-rendering': 'implemented-unverified',
  'forge-publishing': 'absent',
  'collapsible-filters': 'implemented-unverified',
  'automatic-updates': 'implemented-unverified',
};

test('the registry holds exactly the canonical feature ids this list names -- no row added or lost silently', () => {
  assert.deepEqual(Object.keys(registry.features).sort(), Object.keys(EXPECTED_STATUS).sort(),
    'a feature id was added to or removed from site/feature-registry.json without being added to or removed from this hand-written list');
});

test('every one of the forty-four site statuses is the one recorded here by hand', () => {
  const ids = Object.keys(EXPECTED_STATUS);
  assert.equal(ids.length, 44, `this list should name all forty-four canonical features and names ${ids.length}`);
  const drifted = ids
    .filter((id) => registry.features[id]?.status !== EXPECTED_STATUS[id])
    .map((id) => `${id}: registry says ${JSON.stringify(registry.features[id]?.status)}, this list says ${JSON.stringify(EXPECTED_STATUS[id])}`);
  assert.deepEqual(drifted, [],
    'a site feature status changed without this hand-written list being changed with it -- decide the status, then record it in both places');
});

test('no site row claims verified: not one of them has a built-artifact interaction record or a capture', () => {
  const claimed = Object.keys(registry.features).filter((id) => registry.features[id].status === 'verified');
  assert.deepEqual(claimed, [],
    'a pages-site row claims "verified", which requires a built-artifact interaction record and a current-commit capture -- no site row has either');
});

test('the site registry is on the schema the canonical validator and the completeness matrix both read', () => {
  /* The whole reason this file exists. The registry sat on schema v1 with a `state` key
   * while `scripts/inventory-validation.mjs` required v2 with a `status` key, so
   * `verify-inventories.mjs` refused it outright and thirty-three site contract
   * assertions read a key that was not there. Both halves are pinned. */
  assert.equal(registry.schemaVersion, 2, 'the site registry left schema v2, which the canonical validator requires');
  assert.equal(registry.surface, 'pages-site');
  assert.equal(registry.canonicalMatrix, 'console/inventories/surface-completeness.json');
  for (const [id, row] of Object.entries(registry.features)) {
    assert.equal(typeof row.status, 'string', `${id} has no status string; a v1 \`state\` key would read as undefined here`);
    assert.equal(row.state, undefined, `${id} carries a v1 \`state\` key beside its v2 \`status\`, so two keys can disagree about one row`);
    assert.ok(Array.isArray(row.implementation?.paths), `${id}.implementation.paths is not an array`);
  }
});
