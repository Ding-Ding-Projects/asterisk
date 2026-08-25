/**
 * Contract: destructive-action-confirmation. Real for one action, absent for
 * the canonical mechanism, and absent entirely for a second action styled the
 * same way.
 *
 * "Dismiss selected" notifications genuinely shows a real confirmation
 * surface before acting: `planBulk(..., {destructive:true})` marks the plan,
 * and a plain `role="alertdialog"` box (`#notif-confirm`) states the count
 * and requires a real click on "Confirm dismiss" before
 * `notif-confirm-yes`'s handler runs. That is a real gate, not styling alone
 * -- but it is a single confirm/cancel pair, not the canonical contract's
 * two-key-plus-slider super-confirmation ceremony.
 *
 * "Reset settings" is styled identically (`class="danger-button"`) but has NO
 * confirmation of any kind: its `onclick` handler runs `Object.assign(state,
 * DEFAULTS)` immediately, with no dialog, no plan, and no destructive flag.
 * A user who misclicks it loses every local setting with zero warning.
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

test('the site feature registry carries a row for destructive-action-confirmation', () => {
  assert.ok(registry.features['destructive-action-confirmation'], 'no destructive-action-confirmation row in site/feature-registry.json');
});

test('dismissing selected notifications genuinely shows a real confirmation surface first, marked destructive in the plan', () => {
  assert.match(app, /const plan=planBulk\('Dismiss',\[\.\.\.notifSelection\.selected\],\(\)=>true,\{destructive:true\}\);/u,
    'the notification-dismiss plan no longer marks itself destructive');
  assert.match(app, /confirmBox\.hidden=false;/u, 'the confirm box is no longer revealed before dismissing');
  assert.match(settingsHtml, /<div id="notif-confirm" class="notif-confirm" role="alertdialog" aria-label="Confirm dismissal" hidden>/u,
    'the notif-confirm alertdialog no longer matches -- re-check whether the real gate still exists');
});

test('the notification-dismiss gate is a plain confirm/cancel pair, NOT the two-key-plus-slider super-confirmation ceremony', () => {
  assert.doesNotMatch(app, /twoKey|superConfirm|confirmSlider/iu,
    'a two-key/slider super-confirmation mechanism now exists -- update this row toward the canonical contract');
  assert.match(settingsHtml, /<button type="button" id="notif-confirm-yes" class="danger-button">Confirm dismiss<\/button><button type="button" id="notif-confirm-cancel" class="text-button">Cancel<\/button>/u,
    'the confirm/cancel button pair no longer matches the expected plain shape');
});

test('"Reset settings" is styled the same danger colour but has NO confirmation of any kind -- a real, separate gap', () => {
  assert.match(settingsHtml, /<button id="settings-reset" type="button" class="danger-button">Reset settings<\/button>/u,
    'the settings-reset button no longer matches -- re-check whether a confirmation was added');
  assert.match(app, /\$\('settings-reset'\)\.onclick=\(\)=>\{Object\.assign\(state,DEFAULTS\);save\(\);applyState\(\);/u,
    'settings-reset no longer resets immediately with no confirmation -- a gate may have been added, which would improve this row');
});

test('the registry records destructive-action-confirmation as partial', () => {
  assert.equal(registry.features['destructive-action-confirmation'].state, 'partial',
    'one real confirm/cancel gate exists for one action; a second, equally destructive action has none at all, and neither is the canonical two-key ceremony');
});
