/**
 * Contract: destructive-action-confirmation. "Reset settings" now carries the
 * canonical mechanism: two independently operated key controls that must
 * both be active before a full-range slider is even enabled, and only
 * sliding it all the way to the end runs the reset. "Dismiss selected"
 * notifications keeps its own, separately real, plain confirm/cancel gate --
 * a genuine gate, but not this mechanism -- so the row stays "partial": one
 * destructive action on this site now has the full ceremony, the other does
 * not.
 *
 * "Dismiss selected" notifications genuinely shows a real confirmation
 * surface before acting: `planBulk(..., {destructive:true})` marks the plan,
 * and a plain `role="alertdialog"` box (`#notif-confirm`) states the count
 * and requires a real click on "Confirm dismiss" before
 * `notif-confirm-yes`'s handler runs.
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

test('the notification-dismiss gate is still the lighter plain confirm/cancel pair, not the two-key-plus-slider ceremony -- the two destructive actions are not held to the same mechanism', () => {
  assert.match(settingsHtml, /<button type="button" id="notif-confirm-yes" class="danger-button">Confirm dismiss<\/button><button type="button" id="notif-confirm-cancel" class="text-button">Cancel<\/button>/u,
    'the confirm/cancel button pair no longer matches the expected plain shape');
});

test('"Reset settings" now opens a real two-key-plus-slider super-confirmation gate, named action and exact loss, never running immediately', () => {
  assert.match(settingsHtml, /<button id="settings-reset" type="button" class="danger-button">Reset settings<\/button>/u,
    'the settings-reset button no longer matches');
  assert.doesNotMatch(app, /\$\('settings-reset'\)\.onclick=\(\)=>\{Object\.assign\(state,DEFAULTS\)/u,
    'settings-reset resets immediately again with no gate -- the improvement regressed');
  assert.match(app, /\$\('settings-reset'\)\.onclick=\(\)=>\{const dialog=\$\('reset-confirm-dialog'\);if\(!dialog\)return;resetConfirmFields\(\);dialog\.showModal\(\)\};/u,
    'settings-reset no longer opens the reset-confirm-dialog gate');
  assert.match(settingsHtml, /<dialog id="reset-confirm-dialog" class="overlay-card" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-text">/u,
    'the reset-confirm-dialog element no longer matches');
  assert.match(settingsHtml, /<p id="reset-confirm-text">This clears every local setting on this page[^<]*It cannot be undone\.<\/p>/u,
    'the dialog no longer names the exact action and loss in plain text');
});

test('the gate really is two independently operated keys plus a slider, and the reset only actually runs once the slider completes with both keys active', () => {
  assert.match(settingsHtml, /<input type="checkbox" id="reset-key-1">/u, 'key 1 checkbox no longer matches');
  assert.match(settingsHtml, /<input type="checkbox" id="reset-key-2">/u, 'key 2 checkbox no longer matches');
  assert.match(settingsHtml, /<input id="reset-confirm-slider" type="range" min="0" max="100" value="0" step="1" disabled/u,
    'the slider no longer matches -- it should ship disabled until both keys are active');
  assert.match(app, /function resetConfirmReady\(\)\{return Boolean\(\$\('reset-key-1'\)\?\.checked&&\$\('reset-key-2'\)\?\.checked\)\}/u,
    'resetConfirmReady() no longer requires both keys');
  assert.match(app, /slider\.disabled=!ready;/u, 'the slider is no longer disabled until both keys are active');
  assert.match(app, /if\(value>=100&&resetConfirmReady\(\)\)\{performSettingsReset\(\);dialog\.close\(\)\}/u,
    'the reset no longer requires the slider to reach 100 while both keys are active');
});

test('cancel is always available -- a Cancel button, the dialog\'s x, and native Escape -- and every close path resets the gate and returns focus to the control that opened it', () => {
  assert.match(settingsHtml, /<button class="icon-button" value="cancel" aria-label="Cancel reset">×<\/button>/u,
    'the dialog\'s accessible × cancel control no longer matches');
  assert.match(settingsHtml, /<button type="button" id="reset-confirm-cancel" class="text-button">Cancel<\/button>/u,
    'the explicit Cancel button no longer matches');
  assert.match(app, /\$\('reset-confirm-cancel'\)\?\.addEventListener\('click',\(\)=>dialog\.close\('cancel'\)\);/u,
    'the Cancel button no longer closes the dialog');
  assert.match(app, /dialog\.addEventListener\('close',\(\)=>\{resetConfirmFields\(\);\$\('settings-reset'\)\?\.focus\(\)\}\);/u,
    'the dialog no longer resets its fields and returns focus to settings-reset on every close path (cancel, x, or Escape all fire "close" on a native <dialog>)');
});

test('performing the reset also records a local-history entry, so the reset itself is not a silent state change', () => {
  assert.match(app, /function performSettingsReset\(\)\{[\s\S]*?recordHistory\('reset',/u,
    'performSettingsReset() no longer records a local-history entry for the reset');
});

test('the registry records destructive-action-confirmation as partial, and the code agrees', () => {
  assert.equal(registry.features['destructive-action-confirmation'].state, 'partial',
    'the canonical two-key-plus-slider ceremony now exists for "Reset settings," but "Dismiss selected" notifications still uses its own lighter plain confirm/cancel gate -- the two destructive actions on this site are not held to one mechanism, so "partial" (not "implemented") is the honest state');
});
