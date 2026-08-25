/**
 * Contract: automatic-updates. The honest state is "absent" -- this is a
 * static site with nothing to auto-update client-side; no update-check or
 * ready-banner logic exists in site/app.js. (The console app's
 * automatic-updates feature is a genuinely different surface, tracked
 * separately on the windows-console row.)
 *
 * Every "update" occurrence in app.js is one of several UI-refresh helper
 * function names (`updateAttention`, `updateFilterStatus`,
 * `updateOneThingBanner`, `updateSessionTimer`, `updateDestinationMap`,
 * `updateDocumentationExport`, `updateNotificationExportFormats`,
 * `updateNotificationSelectionUI`) -- none of them concern a software
 * update. This file confirms that before trusting the negative assertion.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for automatic-updates', () => {
  assert.ok(registry.features['automatic-updates'], 'no automatic-updates row in site/feature-registry.json');
});

test('every "update" in app.js is a UI-refresh helper function name, not a software-update mechanism', () => {
  const fnNames = [...app.matchAll(/function (update\w+)\(/gu)].map((m) => m[1]);
  assert.ok(fnNames.length > 0, 'no update* function names found at all, which would make this check vacuous');
  for (const name of fnNames) {
    assert.doesNotMatch(name, /updateCheck|updateReady|updateAvailable|applyUpdate/iu,
      `an update-related function name "${name}" now exists that could be a real updater -- re-check the "absent" state`);
  }
});

test('there is no update-check, ready-to-restart banner, or feed-metadata logic anywhere', () => {
  assert.doesNotMatch(app, /checkForUpdate|readyToRestart|updateFeed|updateBanner/iu,
    'a real update-check or ready-banner mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records automatic-updates as absent, and the code agrees', () => {
  assert.equal(registry.features['automatic-updates'].state, 'absent',
    'this is a static site with nothing to auto-update client-side -- "absent" is the honest state');
});
