/**
 * Contract: the five attention modes compose, phrase elapsed time and gate the momentum
 * prompt the way the module claims to -- and the running console now actually reads them
 * back, rather than only remembering which switch is on.
 *
 * This header used to say the opposite, and it was true when written: the modes persisted
 * a boolean and nothing dimmed, quieted, timed or prompted. That gap is closed, and the
 * pins that documented it further down are inverted to match. One is deliberately left
 * as it was -- `enabledModes` is still called nowhere -- because collapsing all of them
 * into one cheerful sweep would hide the part that is still true.
 *
 * `attention-modes.ts` is pure and self-contained, so this plain `.mjs` file `import()`s it
 * directly through Node's built-in TypeScript type-stripping and calls the real
 * `presentationFor` / `elapsedPhrase` / `momentumPrompt` functions -- no reimplementation of
 * the composition-with-platform-preference rule that could quietly drift from the original.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const attention = await import('../../app/renderer/src/attention-modes.ts');

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) };
}

/* --- every mode is independently off by default, and independently toggleable ---------- */

test('every mode reads as disabled with no storage at all, and with a fresh empty storage', () => {
  for (const mode of attention.ATTENTION_MODES) {
    assert.equal(attention.modeEnabled(undefined, mode), false);
    assert.equal(attention.modeEnabled(memoryStorage(), mode), false);
  }
});

test('setModeEnabled toggles exactly the one mode named, leaving every sibling mode untouched', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'focus', true);
  for (const mode of attention.ATTENTION_MODES) {
    assert.equal(attention.modeEnabled(storage, mode), mode === 'focus',
      `turning on "focus" must not also turn on "${mode}"`);
  }
});

test('enabledModes reports exactly the modes actually turned on, in ATTENTION_MODES order', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'momentum', true);
  attention.setModeEnabled(storage, 'lowStimulation', true);
  assert.deepEqual(attention.enabledModes(storage), ['lowStimulation', 'momentum']);
});

test('isAttentionMode accepts only the five real ids and rejects everything else, including near-misses', () => {
  for (const mode of attention.ATTENTION_MODES) assert.equal(attention.isAttentionMode(mode), true);
  assert.equal(attention.isAttentionMode('focused'), false);
  assert.equal(attention.isAttentionMode(''), false);
  assert.equal(attention.isAttentionMode(123), false);
});

/* --- presentationFor: low stimulation composes with, never overrides, the platform ------ */

test('presentationFor maps each mode to exactly the one presentation flag it owns', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'focus', true);
  attention.setModeEnabled(storage, 'timeAwareness', true);
  attention.setModeEnabled(storage, 'oneThing', true);
  const state = attention.presentationFor(storage, { prefersReducedMotion: false });
  assert.deepEqual(state, {
    dimInactive: true, reduceMotion: false, quietNotifications: false, showElapsedTime: true, showNextAction: true,
  });
});

test('reduceMotion is true whenever EITHER lowStimulation or the platform preference asks for it, never only when both agree', () => {
  const off = memoryStorage();
  assert.equal(attention.presentationFor(off, { prefersReducedMotion: true }).reduceMotion, true,
    'the platform preference alone must reduce motion, with the app setting off');
  const on = memoryStorage();
  attention.setModeEnabled(on, 'lowStimulation', true);
  assert.equal(attention.presentationFor(on, { prefersReducedMotion: false }).reduceMotion, true,
    'the app setting alone must reduce motion, with the platform preference off');
  assert.equal(attention.presentationFor(memoryStorage(), { prefersReducedMotion: false }).reduceMotion, false);
});

test('lowStimulation also quiets notifications, and only lowStimulation does', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'lowStimulation', true);
  assert.equal(attention.presentationFor(storage).quietNotifications, true);
  const other = memoryStorage();
  attention.setModeEnabled(other, 'focus', true);
  assert.equal(attention.presentationFor(other).quietNotifications, false);
});

/* --- elapsedPhrase: states a number, never a second clause --------------------------- */

test('elapsedPhrase reports plain thresholds with correct singular/plural wording', () => {
  assert.equal(attention.elapsedPhrase(0), 'less than a minute');
  assert.equal(attention.elapsedPhrase(59_999), 'less than a minute');
  assert.equal(attention.elapsedPhrase(60_000), '1 minute');
  assert.equal(attention.elapsedPhrase(120_000), '2 minutes');
  assert.equal(attention.elapsedPhrase(3_600_000), '1 hour');
  assert.equal(attention.elapsedPhrase(3_660_000), '1 hour 1 minute');
  assert.equal(attention.elapsedPhrase(7_320_000), '2 hours 2 minutes');
});

test('elapsedPhrase treats a negative or non-finite value as "just now" rather than throwing', () => {
  assert.equal(attention.elapsedPhrase(-1), 'just now');
  assert.equal(attention.elapsedPhrase(NaN), 'just now');
  assert.equal(attention.elapsedPhrase(Infinity), 'just now');
});

test('elapsedPhrase never states anything beyond the number -- no encouragement, no judgement', () => {
  for (const ms of [0, 60_000, 3_600_000, 7_320_000]) {
    const phrase = attention.elapsedPhrase(ms);
    for (const term of attention.FORBIDDEN_COPY_TERMS) {
      assert.ok(!phrase.toLowerCase().includes(term), `elapsedPhrase(${ms}) contains the forbidden term "${term}"`);
    }
  }
});

/* --- momentumPrompt: gated on the mode, the idle threshold, and a respected snooze ------ */

test('momentumPrompt never fires when the momentum mode itself is off, however idle the session is', () => {
  const storage = memoryStorage();
  const prompt = attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS * 10, undefined);
  assert.deepEqual(prompt, { show: false, message: '' });
});

test('momentumPrompt fires only once the idle threshold is reached, states the elapsed time and nothing else', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'momentum', true);
  assert.equal(attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS - 1, undefined).show, false);
  const at = attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS, undefined);
  assert.equal(at.show, true);
  /* Exactly one sentence, full stop at the very end and nowhere else -- the difference
   * between an accommodation and a nag is whether a second clause sneaks in. */
  assert.match(at.message, /^Nothing has changed here for [^.]+\.$/);

});

test('a declined prompt is respected for the full SNOOZE_MS, not for a token few seconds', () => {
  const storage = memoryStorage();
  attention.setModeEnabled(storage, 'momentum', true);
  assert.equal(attention.SNOOZE_MS, 30 * 60 * 1000);
  assert.equal(attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS * 5, 5_000).show, false,
    'snoozed five seconds ago must still suppress the prompt');
  assert.equal(attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS * 5, attention.SNOOZE_MS - 1).show, false);
  assert.equal(attention.momentumPrompt(storage, attention.IDLE_THRESHOLD_MS * 5, attention.SNOOZE_MS).show, true);
});

/* --- copy is never medical, scored, or judgemental -------------------------------------- */

test('every mode description is free of every forbidden term', () => {
  for (const mode of attention.MODE_DESCRIPTIONS) {
    const text = `${mode.label} ${mode.help}`.toLowerCase();
    for (const term of attention.FORBIDDEN_COPY_TERMS) {
      assert.ok(!text.includes(term), `${mode.id}'s copy contains the forbidden term "${term}"`);
    }
  }
});

/* --- wiring: what App.tsx actually does with all of the above -------------------------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('the att_* handler persists the mode and also applies it, rather than only persisting', () => {
  /* This replaces a pin that asserted the handler was "one persistence write and nothing
   * else". That was true and worth pinning: five switches stored a boolean and nothing
   * ever read it back, so turning a mode on changed nothing a person could see. The pin
   * fired the moment the wiring landed, which is exactly what it was for.
   *
   * The import assertion moved too. It named an exact two-symbol list, so it broke when a
   * reader was legitimately added beside the writer -- the point was never the arity, it
   * was that a writer exists, so it now requires the reader as well. */
  assert.match(app, /^import \{[^}]*\bsetModeEnabled\b[^}]*\} from '\.\/attention-modes';$/m,
    'App.tsx no longer imports the attention-mode writer');
  assert.match(app, /^import \{[^}]*\bmodeEnabled\b[^}]*\} from '\.\/attention-modes';$/m,
    'App.tsx no longer imports the attention-mode reader, so nothing can act on a stored mode');

  const start = app.indexOf("if (control?.id?.startsWith('att_') && typeof value === 'boolean') {");
  assert.ok(start > 0, 'the att_* handler has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n    }', start));
  assert.match(body, /setModeEnabled\(this\.durableStorage\.storage, mode, value\);/,
    'the handler no longer persists the mode');
  /* Asserting the real call rather than a line count. A first version of this counted
   * non-comment lines and stayed green when the handler was collapsed back to a bare
   * write, because the collapse still left four lines. A proxy that a real regression
   * walks straight past is not a guard. */
  assert.match(body, /this\.narrator\.setQuiet\(value\);/,
    'the handler no longer applies low stimulation to anything -- it is back to persisting a boolean nobody reads');
});

test('the design renders all five mode switches, and none of them carries a status readout the way sch_status/logo_status do', () => {
  const at = generated.indexOf("title:'Attention", 0);
  assert.ok(at > 0, 'no group titled starting "Attention" exists in the design -- update this test to the real group name');
  const next = generated.indexOf("{ title:'", at + 10);
  const group = generated.slice(at, next);
  const controlIds = [...group.matchAll(/ctl\('([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(controlIds, ['att_focus', 'att_low', 'att_time', 'att_one', 'att_momentum']);
});

/* --- PIN: nothing in the running app ever reads the modes back to change anything ------- */

/* These three replace pins that asserted the opposite: that presentationFor, elapsedPhrase
 * and momentumPrompt were called nowhere App.tsx or the compiled shell could reach. That was
 * true and worth pinning -- five switches each persisted a boolean and changed nothing else
 * about the interface, so turning a mode on did nothing a person could see. Each pin carried
 * its own instruction to update it once the gap closed, and each fired the moment it did.
 *
 * They assert the calls now. `enabledModes` keeps its original pin below, deliberately: it is
 * still uncalled, and collapsing all four into one cheerful sweep would hide that. */

test('presentationFor is called, so the modes drive something visible', () => {
  assert.match(app, /\bpresentationFor\(/,
    'presentationFor is called nowhere again -- the modes persist a boolean and change nothing');
});

test('elapsedPhrase is called, so time awareness shows a real figure', () => {
  assert.match(app, /\belapsedPhrase\(/,
    'elapsedPhrase is called nowhere again -- time awareness would display nothing');
});

test('momentumPrompt is called, so momentum can actually prompt', () => {
  assert.match(app, /\bmomentumPrompt\(/,
    'momentumPrompt is called nowhere again -- the momentum mode would never prompt');
});

test('PIN: enabledModes is never called anywhere App.tsx or the generated shell can reach', () => {
  /* Confirms the gap is not merely "the derived presentation is unused" -- nothing even asks
   * which modes are currently on, anywhere outside this module and its own test file. */
  assert.doesNotMatch(app, /enabledModes\(/,
    'App now calls enabledModes -- update this pin and the report if this gap has been closed');
  assert.doesNotMatch(generated, /enabledModes\(/);
});
