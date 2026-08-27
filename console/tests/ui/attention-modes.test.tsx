/**
 * Attention modes.
 *
 * Two groups of tests carry the weight. Independence, because bundling these behind one
 * switch is the failure that makes people turn the whole thing off. And the copy scan,
 * because the line between an accommodation and a nag is entirely in the wording, and a
 * reviewer will not catch a judgemental clause added in six months.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ATTENTION_MODES, FOCUS_DIM_CSS, FORBIDDEN_COPY_TERMS, IDLE_THRESHOLD_MS, MODE_DESCRIPTIONS, SNOOZE_MS,
  elapsedPhrase, enabledModes, isAttentionMode, modeEnabled, momentumPrompt, msSinceSnooze,
  nextAction, presentationFor, setModeEnabled, setNextAction, snoozeMomentum,
  type AttentionMode, type ModeStorage,
} from '../../app/renderer/src/attention-modes.ts';

const memory = (): ModeStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

const withMode = (mode: AttentionMode) => { const s = memory(); setModeEnabled(s, mode, true); return s; };

/* --- off by default, and independent ------------------------------------------ */

test('every mode is off by default', () => {
  /* Accommodations are opt-in. A mode that switches itself on has decided something
   * about the user it has no standing to decide. */
  const storage = memory();
  for (const mode of ATTENTION_MODES) assert.equal(modeEnabled(storage, mode), false, `${mode} was on`);
  assert.deepEqual(enabledModes(storage), []);
  assert.deepEqual(enabledModes(undefined), []);
});

test('turning one mode on turns no other mode on', () => {
  /* The whole design. Somebody may want a quieter interface without time nudges, or
   * time nudges precisely because they are hyperfocusing. */
  for (const mode of ATTENTION_MODES) {
    assert.deepEqual(enabledModes(withMode(mode)), [mode], `${mode} switched something else on`);
  }
});

test('modes toggle back off independently', () => {
  const storage = memory();
  setModeEnabled(storage, 'focus', true);
  setModeEnabled(storage, 'momentum', true);
  setModeEnabled(storage, 'focus', false);
  assert.deepEqual(enabledModes(storage), ['momentum']);
});

test('an unrecognised stored value reads as off', () => {
  const storage = memory();
  storage.map.set('console.attention.focus', 'perhaps');
  assert.equal(modeEnabled(storage, 'focus'), false);
});

test('every mode is recognised and nothing else is', () => {
  for (const mode of ATTENTION_MODES) assert.ok(isAttentionMode(mode));
  for (const bad of ['Focus', '', 'adhd', undefined, 7]) assert.ok(!isAttentionMode(bad));
});

/* --- what each mode actually does ---------------------------------------------- */

test('focus dims rather than hides', () => {
  /* The property is in the name of the field: an interface that removes work is a worse
   * problem than a busy one. */
  const state = presentationFor(withMode('focus'));
  assert.equal(state.dimInactive, true);
  assert.ok(!('hideInactive' in state), 'a hiding behaviour appeared, which focus must never do');
});

test('low stimulation reduces motion and quietens notifications together', () => {
  const state = presentationFor(withMode('lowStimulation'));
  assert.equal(state.reduceMotion, true);
  assert.equal(state.quietNotifications, true);
});

test('the platform preference reduces motion on its own', () => {
  /* Somebody who told their OS they want less motion has asked once and must not have
   * to ask again here. */
  const state = presentationFor(memory(), { prefersReducedMotion: true });
  assert.equal(state.reduceMotion, true);
  assert.equal(state.quietNotifications, false, 'a platform motion preference quietened notifications too');
});

test('the app switch does not override a platform preference in the other direction', () => {
  const state = presentationFor(memory(), { prefersReducedMotion: false });
  assert.equal(state.reduceMotion, false);
  assert.equal(presentationFor(withMode('lowStimulation'), { prefersReducedMotion: false }).reduceMotion, true);
});

test('time awareness and one-thing surface their own state and nothing else', () => {
  assert.equal(presentationFor(withMode('timeAwareness')).showElapsedTime, true);
  assert.equal(presentationFor(withMode('timeAwareness')).showNextAction, false);
  assert.equal(presentationFor(withMode('oneThing')).showNextAction, true);
});

/* --- elapsed time: a number, and then it stops --------------------------------- */

test('elapsed time reads as a plain phrase at every scale', () => {
  assert.equal(elapsedPhrase(0), 'less than a minute');
  assert.equal(elapsedPhrase(59_000), 'less than a minute');
  assert.equal(elapsedPhrase(60_000), '1 minute');
  assert.equal(elapsedPhrase(40 * 60_000), '40 minutes');
  assert.equal(elapsedPhrase(60 * 60_000), '1 hour');
  assert.equal(elapsedPhrase(61 * 60_000), '1 hour 1 minute');
  assert.equal(elapsedPhrase(150 * 60_000), '2 hours 30 minutes');
});

test('a nonsensical duration degrades rather than rendering NaN', () => {
  for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
    assert.equal(elapsedPhrase(bad), 'just now');
  }
});

/* --- momentum: declined means declined ----------------------------------------- */

test('no prompt when the mode is off, however long it has been', () => {
  assert.equal(momentumPrompt(memory(), 10 * 60 * 60 * 1000, undefined).show, false);
});

test('no prompt before the idle threshold', () => {
  assert.equal(momentumPrompt(withMode('momentum'), IDLE_THRESHOLD_MS - 1, undefined).show, false);
});

test('a prompt once the threshold is reached, stating the fact and nothing more', () => {
  const prompt = momentumPrompt(withMode('momentum'), 40 * 60_000, undefined);
  assert.equal(prompt.show, true);
  assert.equal(prompt.message, 'Nothing has changed here for 40 minutes.');
});

test('not now is respected for a stated period, not for thirty seconds', () => {
  /* A prompt that returns immediately after being declined is the behaviour this rule
   * exists to forbid. */
  const storage = withMode('momentum');
  assert.equal(momentumPrompt(storage, 60 * 60_000, SNOOZE_MS - 1).show, false);
  assert.equal(momentumPrompt(storage, 60 * 60_000, SNOOZE_MS).show, true);
  assert.ok(SNOOZE_MS >= 10 * 60_000, 'the snooze is too short to count as respecting the answer');
});

/* --- the copy ------------------------------------------------------------------- */

test('no copy anywhere in the feature is medical, judgemental or gamified', () => {
  /* Kept as a scan rather than a review note: the clause that breaks this rule will be
   * added in six months by somebody who never read it. */
  const copy = [
    ...MODE_DESCRIPTIONS.flatMap((m) => [m.label, m.help]),
    momentumPrompt(withMode('momentum'), 40 * 60_000, undefined).message,
    elapsedPhrase(40 * 60_000),
  ];
  for (const text of copy) {
    for (const term of FORBIDDEN_COPY_TERMS) {
      assert.ok(!text.toLowerCase().includes(term), `"${text}" contains "${term}"`);
    }
  }
});

test('each mode is named for what it does, not for who might need it', () => {
  /* So switching one on in front of a colleague discloses nothing. */
  assert.deepEqual(MODE_DESCRIPTIONS.map((m) => m.id), [...ATTENTION_MODES]);
  for (const mode of MODE_DESCRIPTIONS) {
    assert.ok(mode.label.length > 2 && mode.help.length > 20, `${mode.id} is not described`);
    assert.ok(!/you /iu.test(mode.label), `${mode.id} addresses the user in its label`);
  }
});

test('every mode has a description, so none can ship unexplained', () => {
  const described = new Set(MODE_DESCRIPTIONS.map((m) => m.id));
  for (const mode of ATTENTION_MODES) assert.ok(described.has(mode), `${mode} has no description`);
});

test('each mode changes only its own presentation, not another mode’s', () => {
  /* Storage-level independence is tested above and is not enough: a mode can be stored
   * independently and still bleed into another's behaviour. Found by a probe that made
   * low stimulation also dim inactive content and watched the suite stay green. */
  const FIELD: Record<AttentionMode, keyof ReturnType<typeof presentationFor>> = {
    focus: 'dimInactive',
    lowStimulation: 'reduceMotion',
    timeAwareness: 'showElapsedTime',
    oneThing: 'showNextAction',
    momentum: 'dimInactive', // momentum drives no presentation field of its own
  };
  for (const mode of ATTENTION_MODES) {
    const state = presentationFor(withMode(mode), { prefersReducedMotion: false });
    for (const other of ATTENTION_MODES) {
      if (other === mode) continue;
      const field = FIELD[other];
      if (field === FIELD[mode]) continue;
      assert.equal(state[field], false,
        `switching ${mode} on also switched ${String(field)}, which belongs to ${other}`);
    }
  }
});

test('momentum changes no presentation state at all, only whether a prompt is due', () => {
  const state = presentationFor(withMode('momentum'), { prefersReducedMotion: false });
  assert.deepEqual(state, {
    dimInactive: false, reduceMotion: false, quietNotifications: false,
    showElapsedTime: false, showNextAction: false,
  });
});

/* --- the one chosen next action -------------------------------------------------- */

test('the chosen next action is blank until something is chosen', () => {
  assert.equal(nextAction(memory()), '');
  assert.equal(nextAction(undefined), '');
});

test('the chosen next action round-trips through storage, so it survives a context switch', () => {
  const storage = memory();
  setNextAction(storage, 'Reload the trunk after the codec change');
  assert.equal(nextAction(storage), 'Reload the trunk after the codec change');
});

/* --- momentum: the snooze stamp itself, not just its effect ---------------------- */

test('nothing has been snoozed until "not now" is actually said', () => {
  assert.equal(msSinceSnooze(memory()), undefined);
  assert.equal(msSinceSnooze(undefined), undefined);
});

test('snoozing records a real moment, and time since it is measured from that moment', () => {
  const storage = memory();
  snoozeMomentum(storage, 10_000);
  assert.equal(msSinceSnooze(storage, 10_000), 0);
  assert.equal(msSinceSnooze(storage, 40_000), 30_000);
});

test('a corrupted snooze stamp is treated as never snoozed rather than crashing', () => {
  const storage = memory();
  storage.map.set('console.attention.snoozedAt', 'not-a-timestamp');
  assert.equal(msSinceSnooze(storage), undefined);
});

/* --- focus: the injected stylesheet dims and never hides ------------------------- */

test('the focus stylesheet never sets a property that removes something from view', () => {
  /* opacity is reversible and everything under it is still there and still clickable;
   * any of these three would make something genuinely unreachable, which focus mode
   * must never do. */
  for (const forbidden of ['display:none', 'display: none', 'visibility:hidden', 'visibility: hidden',
    'pointer-events:none', 'pointer-events: none']) {
    assert.ok(!FOCUS_DIM_CSS.includes(forbidden), `focus stylesheet contains "${forbidden}"`);
  }
});

test('the focus stylesheet only dims once something in the console actually has focus', () => {
  /* An unqualified ".attn-content *" rule would dim an idle screen with nothing
   * focused into oblivion the instant the mode is switched on -- the opposite of
   * "brings the active thing forward", which only means anything once something is
   * active. Every dimming rule must be gated on :focus-within. */
  const dimmingRules = FOCUS_DIM_CSS.split('}').filter((rule) => rule.includes('opacity: .55'));
  assert.ok(dimmingRules.length > 0, 'expected at least one dimming rule');
  for (const rule of dimmingRules) assert.match(rule, /:focus-within/);
});
