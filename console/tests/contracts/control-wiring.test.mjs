/**
 * Contract: a control the design renders is a control something acts on.
 *
 * This session found a dozen instances of the same defect -- a surface wired at one end
 * and consumed at neither -- and the settings added here are the easiest kind to get
 * wrong, because a switch that stores nothing looks identical to one that works. The
 * design compiling a control proves the control exists; only this proves it does
 * anything.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

/** Control id, and the module call that must act on it. */
const WIRED = [
  { id: 'lang_mode', acts: 'setLanguageMode(' },
  { id: 'id_name', acts: 'setDisplayName(' },
  { id: 'id_name_reset', acts: 'resetDisplayName(' },
  { id: 'dlg_emoji', acts: 'setEmojisEnabled(' },
  { id: 'att_focus', acts: 'setModeEnabled(' },
  { id: 'att_momentum', acts: 'setModeEnabled(' },
  { id: 'sup_open', acts: 'openTicket(' },
  { id: 'ed_choice', acts: 'chooseEditor(' },
  { id: 'ed_clear', acts: 'clearEditorChoice(' },
  { id: 'school_mode', acts: 'activateSchoolMode(' },
  { id: 'school_unlock', acts: 'deactivateSchoolMode(' },
  { id: 'school_set_credential', acts: 'setCredential(' },
  { id: 'school_credential', acts: 'consumeCredential(' },
  { id: 'fun_level', acts: 'setFunnyLevel(' },
  { id: 'fun_level_yue', acts: 'setFunnyLevel(' },
  { id: 'src_add', acts: 'buildSource(' },
  { id: 'src_clear', acts: 'saveSources(' },
  { id: 'nar_enabled', acts: 'applyNarrationControl(' },
  { id: 'nar_voice_en', acts: 'resolveVoiceStatus(' },
  { id: 'logo_preset', acts: 'choosePreset(' },
  { id: 'logo_pick', acts: 'acceptLogo(' },
];

test('every wired control exists in the compiled design', () => {
  const compiled = read('app/renderer/src/generated/console.tsx');
  for (const { id } of WIRED) {
    assert.ok(compiled.includes(`'${id}'`), `${id} is claimed as wired but the design does not render it`);
  }
});

test('every wired control is acted on by App, not merely stored as a value', () => {
  const app = read('app/renderer/src/App.tsx');
  for (const { id, acts } of WIRED) {
    assert.ok(app.includes(`'${id}'`), `App never mentions ${id}, so changing it does nothing`);
    assert.ok(app.includes(acts), `App mentions ${id} but never calls ${acts}`);
  }
});

test('the interception the controls ride on is still installed', () => {
  /* All four are noticed inside one overridden setVal. If that override stops being
   * assigned, every one of them silently becomes a value nobody reads, and the two
   * assertions above would still pass. */
  const app = read('app/renderer/src/App.tsx');
  assert.match(app, /^\s*this\.setVal = this\.languageAwareSetVal;/mu,
    'the setVal override is no longer installed, so no control change is intercepted at all');
  assert.match(app, /^\s*this\.baseSetVal\(control, value\);/mu,
    'the override no longer delegates, so every other control has stopped working');
});

test('the palette can actually reach the control it names', () => {
  /* The palette teleports by finding a control row in the document. That row is emitted by
   * the compiled design, so the selector and the markup are written in two different files
   * and nothing but this check keeps them agreeing. Without it the palette would open the
   * right screen, find nothing, and report every setting as not on display -- which looks
   * exactly like a feature that half works rather than a selector that matches nothing. */
  const control = readFileSync(new URL('../../app/renderer/src/generated/m3-control.tsx', import.meta.url), 'utf8');
  /* Anchored to the whole attribute and its value, not the substring: data-ctlX contains
   * data-ctl, so a renamed attribute would satisfy a looser needle while the palette found
   * nothing -- which is the exact way this check was written wrong the first time. */
  assert.match(control, /"data-ctl": v\.ctl\.rawKey/, 'the compiled control row emits no addressable hook');
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /\[data-ctl="\$\{id\}"\]/, 'App looks for a hook the compiled row does not emit');
  /* And the palette is genuinely mounted rather than merely imported. */
  assert.match(app, /^\s*render\(\): ReactNode \{/m, 'App does not wrap the shell render');
  assert.match(app, /this\.paletteOverlay\(\)/, 'the overlay is never rendered');
  assert.match(app, /^\s*window\.addEventListener\('keydown', handler, true\);/m, 'no global chord listener');
});
