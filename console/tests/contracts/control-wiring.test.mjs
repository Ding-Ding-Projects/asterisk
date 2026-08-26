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
  { id: 'nar_en_voice', acts: 'resolveVoiceStatus(' },
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

test('a control that carries a value still records it, so the picker moves', () => {
  /* languageAwareSetVal ends by calling baseSetVal, which is what puts the chosen value into
   * the shell's state and therefore what makes a switch look switched. A branch that returns
   * early applies its side effect and leaves the control showing the OLD value -- you click
   * it, something happens underneath, and the control visibly does not move. That reads as
   * broken however correct the code beneath it is, and nothing else catches it: the type
   * checks pass, the handler runs, and only a human looking at the screen would ever know.
   *
   * The action-style switches are the deliberate exception. Their value is a press rather
   * than a state, so not persisting is what makes them behave like buttons. They are listed
   * by name rather than detected, so adding one is a decision somebody writes down. */
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  const start = app.indexOf('languageAwareSetVal');
  assert.ok(start > 0, 'languageAwareSetVal has been renamed');
  /* The LAST occurrence, not the first: the display-name rename/reset branches call
   * `this.baseSetVal(control, value);` explicitly themselves (each followed by its own
   * early `return`, exactly the shape this test is checking every other branch for) so
   * that their own control-change history entry is recorded before the rename or reset
   * toast is shown -- see the comment beside those two calls in App.tsx. That means the
   * exact call text this test anchors on now appears three times, and the first two are
   * mid-body, not the shared tail every other branch falls through to. */
  const end = app.lastIndexOf('this.baseSetVal(control, value);');
  assert.ok(end > start, 'the shared closing baseSetVal call was not found after languageAwareSetVal');
  const body = app.slice(start, end);
  assert.ok(body.length > 0, 'languageAwareSetVal no longer ends at baseSetVal');

  const PRESS_NOT_STATE = ['logo_reset', 'src_add', 'src_clear'];
  const VALUE_CONTROLS = ['logo_preset', 'nar_'];

  for (const id of VALUE_CONTROLS) {
    const at = body.indexOf(`'${id}'`);
    assert.ok(at > 0, `no branch handles ${id}`);
    /* Only as far as the end of that branch: a return further down belongs to another
     * control and would make this pass or fail for the wrong reason. */
    const branch = body.slice(at, at + body.slice(at).indexOf('\n    }') + 6);
    assert.doesNotMatch(branch, /^\s*return;/m,
      `the ${id} branch returns before baseSetVal, so its control will never show the value chosen`);
  }
  for (const id of PRESS_NOT_STATE) {
    const at = body.indexOf(`'${id}'`);
    assert.ok(at > 0, `no branch handles ${id}`);
    const branch = body.slice(at, at + body.slice(at).indexOf('\n    }') + 6);
    assert.match(branch, /^\s*return;/m,
      `${id} is listed as a press rather than a state, but its branch falls through and would leave the switch stuck on`);
  }
});

test('no control id is defined twice on one screen', () => {
  /* Two controls sharing an id both render and both write the same value, with whatever
   * labels each was given -- so the screen shows one setting twice, disagreeing with itself,
   * and whichever the person did not touch looks stuck. It happens when somebody adds a
   * group without checking whether the thing already exists, which is how a settings screen
   * turns into a catalogue of near-duplicates rather than one integrated surface.
   *
   * The server ids are the deliberate exception, and that was checked rather than assumed:
   * one occurrence sits on the servers screen and the other inside the WIZARDS block, so it
   * is one connection described twice, sharing a single value on purpose. They are named
   * here so adding another shared id is a decision somebody writes down.
   *
   * ap_contrast used to be on this list and should not have been. It was two different
   * settings -- a slider the appearance preview reads, and a text readout of a measured
   * ratio -- wearing one key. An exemption nobody verified is just a defect with permission,
   * so each name here is checked in both directions below. */
  const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');
  const counts = new Map();
  for (const match of design.matchAll(/ctl\('([a-z0-9_]+)'/g)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const SHARED_ON_PURPOSE = new Set([
    'sv_amiport', 'sv_container', 'sv_forward', 'sv_host', 'sv_hostkey', 'sv_iface',
    'sv_kind', 'sv_readonly', 'sv_sshport', 'sv_tls', 'sv_user', 'sv_watch',
  ]);
  const unexpected = [...counts].filter(([id, n]) => n > 1 && !SHARED_ON_PURPOSE.has(id));
  assert.deepEqual(unexpected, [],
    `these ids are defined more than once and are not recorded as deliberately shared: ${unexpected.map(([id]) => id).join(', ')}`);
  /* And the exception list stays honest: an id that stops being duplicated should leave it,
   * or the list becomes a place stale names accumulate unchallenged. */
  for (const id of SHARED_ON_PURPOSE) {
    assert.ok((counts.get(id) ?? 0) > 1, `${id} is listed as deliberately shared but is no longer duplicated`);
  }
});

test('the trunk-authentication settings are kept, since no file holds them', () => {
  /* These looked like configuration and were counted as unbound for it. They are not
   * Asterisk settings at all -- there is no pjsip.conf key for "auto-approve a low-risk
   * partner request" -- so they belong where the console's other preferences live. The
   * screen's own file field admits it: "trunk partner requests", which is not a filename
   * at all -- see resource-for-file.test.tsx. */
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  for (const id of ['ta_auto', 'ta_expire', 'ta_notify', 'ta_mutual', 'ta_sign', 'ta_log']) {
    assert.ok(app.includes(`'${id}'`), `${id} is not named in App, so nothing keeps it`);
  }
  assert.match(app, /CONSOLE_SETTING_PREFIX/, 'nothing writes them');
  /* And the two security settings, which are the same kind of thing: neither failban nor
   * bantime appears in any Asterisk sample file, because banning a repeat offender is this
   * console behaviour and not Asterisk configuration. */
  for (const id of ['s_failban', 's_bantime']) {
    assert.ok(app.includes(String.fromCharCode(39) + id + String.fromCharCode(39)), id + ' is not named in App');
  }
  /* One registry rather than a list per subject, so a third group is an entry and not
   * another branch. */
  assert.match(app, /CONSOLE_SETTINGS: Readonly<Record<string, readonly string\[\]>>/, 'the groups are not a registry');
  assert.match(app, /private restorePartnerSettings\(\)/, 'nothing reads them back');
  assert.match(app, /this\.restorePartnerSettings\(\);/, 'the restore is never called');
  /* Falling through rather than returning, so the control shows what was chosen -- the same
   * defect that made the narration switch look stuck. */
  const branch = app.slice(app.indexOf('App.PARTNER_CONTROLS.includes'), app.indexOf("if (control?.id === 'dp_go'"));
  assert.doesNotMatch(branch, /^\s*return;/m, 'the branch returns, so the control will not move');
});

test('every IVR control reaches the dialplan generator', () => {
  /* These six were counted as unbound settings and were never going to bind: extensions.conf
   * has no key called "retries". They describe an IVR, which is a shape made out of exten
   * lines, so each one now changes the dialplan the screen shows -- and the screen shows it
   * before anything writes it, because a form that silently writes call routing is a form
   * nobody should trust. */
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  for (const id of ['i_timeout', 'i_retries', 'i_invalid', 'i_direct', 'i_lang', 'i_barge']) {
    assert.ok(app.includes(`'${id}'`), `${id} does not reach the generator`);
  }
  assert.match(app, /generateIvr\(definition\)/, 'nothing generates a dialplan');
  assert.match(app, /if \(action === 'ivr-dialplan'\)/, 'nothing answers the preview');
  const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');
  assert.match(design, /action:'ivr-dialplan'/, 'the screen has no preview to read');
});

test('the IVR prompt field and key map reach real objects, not just the preview text', () => {
  /* The table's own "Keys" column always claimed a count of routed digits, and until this
   * pass the generator routed none of them -- the only way out of the menu besides the
   * invalid-entry fallback was direct-dialling an arbitrary extension. And the prompt was a
   * bare name in the table with no field anywhere that could set or verify it. */
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  for (const id of ['i_prompt', 'i_keydigit', 'i_keydest', 'i_keytarget']) {
    assert.ok(app.includes(`'${id}'`), `${id} does not reach the generator`);
  }
  assert.match(app, /keys: this\.ivrKeys/, 'the key map never reaches the generated definition');
  assert.match(app, /promptFile: /, 'the prompt field never reaches the generated definition');
  for (const action of ['ivr-key-add', 'ivr-key-remove', 'ivr-audition', 'ivr-keys-status']) {
    assert.ok(app.includes(`'${action}'`), `onControlAction should handle '${action}'`);
  }
  /* Auditioning a prompt plays a real file off the target, the same path the Sounds
   * screen's own rows already use -- never a second, parallel playback mechanism. */
  assert.match(app, /await this\.onAuditionPromptRow\(name\)/, 'the IVR prompt is not auditioned through the real prompt library');
  const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');
  for (const action of ['ivr-key-add', 'ivr-key-remove', 'ivr-audition']) {
    assert.match(design, new RegExp(`action:'${action}'`), `the design never declares ${action}`);
  }
});
