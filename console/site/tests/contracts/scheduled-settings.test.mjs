/**
 * Contract: scheduled-settings. Real for exactly one boolean, nothing behind
 * it. `site/app.js` wires a single `schedule-enabled` checkbox to
 * `state.scheduleEnabled` (persisted, restored on load), and that is the
 * entire feature: `scheduleEnabled` appears in only three places in the whole
 * file -- its `DEFAULTS` entry, `applyState()`'s readback into the checkbox,
 * and `initSettings()`'s `onchange` handler. There is no date/time rule
 * editor, no weekday selection, no start/end time, and no external-source
 * integration anywhere -- the checkbox exists with no scheduling surface
 * behind it.
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
const settingsHtml = read('settings.html');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for scheduled-settings', () => {
  assert.ok(registry.features['scheduled-settings'], 'no scheduled-settings row in site/feature-registry.json');
});

test('the settings page has exactly one scheduling control: a plain checkbox with no rule editor beside it', () => {
  assert.match(settingsHtml, /<input id="schedule-enabled" aria-label="Enable scheduling" type="checkbox">/u,
    'the schedule-enabled checkbox no longer matches the expected plain shape');
  assert.doesNotMatch(settingsHtml, /schedule-weekday|schedule-start-time|schedule-end-time|schedule-rule/iu,
    'a real scheduling rule editor now exists -- the "checkbox with nothing behind it" state needs re-checking');
});

test('scheduleEnabled appears only in DEFAULTS, applyState, and initSettings -- there is no fourth consumer', () => {
  const occurrences = [...app.matchAll(/scheduleEnabled/gu)];
  assert.equal(occurrences.length, 3,
    `expected exactly 3 occurrences of scheduleEnabled (default, readback, handler), found ${occurrences.length} -- a new consumer may have been added, which would change this row`);
});

test('the checkbox persists through the ordinary update()/save() path, and nothing else', () => {
  assert.match(app, /\$\('schedule-enabled'\)\.onchange=event=>update\('scheduleEnabled',event\.target\.checked\);/u,
    'the schedule-enabled checkbox no longer routes through the ordinary update() path');
});

test('there is no Home Assistant or external HTTPS source integration for scheduling', () => {
  assert.doesNotMatch(app, /home.?assistant|binary_sensor|input_boolean/iu,
    'a Home Assistant integration now exists -- update this row and external-settings-sources together');
});

test('the registry records scheduled-settings as partial', () => {
  assert.equal(registry.features['scheduled-settings'].state, 'partial',
    'a real, persisted, off-by-default checkbox exists, but no scheduling surface exists behind it -- "partial" is the honest state');
});
