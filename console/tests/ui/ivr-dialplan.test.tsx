/**
 * Generating an IVR's dialplan from the form that describes it.
 *
 * These controls were counted as unbound settings for a long time and were never going to
 * bind: extensions.conf has no key called "retries". So what matters here is that the
 * generated dialplan says what the form said -- particularly barge-in and the invalid
 * action, where an approximation would quietly change how calls are answered.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateIvr, isUsableContextName, renderDialplan, type IvrDefinition,
} from '../../app/renderer/src/ivr-dialplan.ts';

const ivr = (over: Partial<IvrDefinition> = {}): IvrDefinition => ({
  name: 'main-menu',
  digitTimeout: 7,
  retries: 3,
  onInvalid: 'Repeat',
  allowDirectDial: true,
  language: 'en',
  allowBargeIn: true,
  ...over,
});

const lines = (definition: IvrDefinition): string[] => {
  const out = generateIvr(definition);
  assert.ok(!('problems' in out), JSON.stringify(out));
  return out.map((line) => line.value);
};

/* --- the settings reach the dialplan --------------------------------------------------- */

test('the language is set on the channel, so every prompt after it is spoken in it', () => {
  assert.ok(lines(ivr({ language: 'zh' })).includes('s,n,Set(CHANNEL(language)=zh)'));
});

test('the digit timeout reaches both the channel and the wait', () => {
  const generated = lines(ivr({ digitTimeout: 12 }));
  assert.ok(generated.includes('s,n,Set(TIMEOUT(digit)=12)'));
  assert.ok(generated.includes('s,n,WaitExten(12)'));
});

test('barge-in is the difference between Background and Playback, not a shorter prompt', () => {
  /* Background plays and listens at once, which IS barge-in; Playback does not listen.
   * Approximating this with anything else would change whether a caller can interrupt. */
  assert.ok(lines(ivr({ allowBargeIn: true })).some((l) => l.includes('Background(main-menu-menu)')));
  const noBarge = lines(ivr({ allowBargeIn: false }));
  assert.ok(noBarge.some((l) => l.includes('Playback(main-menu-menu)')));
  assert.ok(!noBarge.some((l) => l.includes('Background(')));
});

test('retries are counted per call, not globally', () => {
  /* On the channel, so one caller pressing the wrong key does not consume another's tries. */
  const generated = lines(ivr({ retries: 5 }));
  assert.ok(generated.includes('s,n,Set(TRIES=0)'));
  assert.ok(generated.some((l) => l.includes('${TRIES} >= 5')));
});

test('direct dial is offered only when it was asked for', () => {
  assert.ok(lines(ivr({ allowDirectDial: true })).some((l) => l.startsWith('_X.,1,')));
  assert.ok(!lines(ivr({ allowDirectDial: false })).some((l) => l.startsWith('_X.,')));
});

test('direct dial hands routing back rather than dialling itself', () => {
  /* Routing belongs to the dialplan that owns extensions. Dialling here would be a second
   * place to keep in step with the first. */
  const line = lines(ivr({ allowDirectDial: true })).find((l) => l.startsWith('_X.,1,'));
  assert.match(line, /Goto\(from-internal,\$\{EXTEN\},1\)/u);
  assert.doesNotMatch(line, /Dial\(/u);
});

/* --- each invalid action is a different dialplan ----------------------------------------- */

test('every invalid action produces its own ending, and none falls off the end', () => {
  /* Falling off the end of a context hangs up without saying so, which is the one outcome
   * none of these four settings means. */
  for (const onInvalid of ['Repeat', 'Operator', 'Voicemail', 'Hang up'] as const) {
    const generated = lines(ivr({ onInvalid }));
    const fallback = generated.filter((l) => l.startsWith('fallback,'));
    assert.ok(fallback.length > 0, `${onInvalid} generated no fallback`);
  }
  assert.ok(lines(ivr({ onInvalid: 'Repeat' })).some((l) => l.includes('Goto(s,menu)')));
  assert.ok(lines(ivr({ onInvalid: 'Operator' })).some((l) => l.includes('Goto(operator,s,1)')));
  assert.ok(lines(ivr({ onInvalid: 'Voicemail' })).some((l) => l.includes('VoiceMail(')));
  assert.ok(lines(ivr({ onInvalid: 'Hang up' })).some((l) => l.includes('Hangup()')));
});

test('repeating resets the counter, so it is a repeat and not one more try', () => {
  const generated = lines(ivr({ onInvalid: 'Repeat' }));
  const at = generated.findIndex((l) => l === 'fallback,1,Set(TRIES=0)');
  assert.ok(at >= 0, 'the counter is not reset, so "repeat" would hang up on the next invalid entry');
});

/* --- what it refuses to generate ---------------------------------------------------------- */

test('a name that could end the section early is refused', () => {
  /* A bracket would close the context and put the rest of the IVR somewhere nobody meant. */
  for (const name of ['main]menu', '[main', 'main menu', '', 'x'.repeat(80), 'a;b']) {
    const out = generateIvr(ivr({ name }));
    assert.ok('problems' in out, `${JSON.stringify(name)} was accepted as a context name`);
  }
  assert.equal(isUsableContextName('main-menu_2'), true);
});

test('a timeout or retry count outside Asterisk’s range is refused, not clamped', () => {
  /* A value out of range came from a hand-edited profile, and quietly moving it to the
   * nearest legal one hides that from the person who set it. */
  for (const over of [{ digitTimeout: 0 }, { digitTimeout: 31 }, { retries: 0 }, { retries: 10 }]) {
    assert.ok('problems' in generateIvr(ivr(over)), JSON.stringify(over));
  }
});

test('a language that is not a two-letter code is refused', () => {
  for (const language of ['english', 'e', '', 'EN']) {
    assert.ok('problems' in generateIvr(ivr({ language })), language);
  }
});

test('every problem is reported at once, not one per attempt', () => {
  const out = generateIvr(ivr({ name: 'bad name', digitTimeout: 99, language: 'english' }));
  assert.ok('problems' in out);
  assert.equal(out.problems.length, 3, 'fixing one problem should not reveal the next');
});

/* --- what it produces to read ------------------------------------------------------------- */

test('the dialplan can be read before it is applied', () => {
  /* A form that silently writes call routing is a form nobody should trust. */
  const out = generateIvr(ivr());
  assert.ok(!('problems' in out));
  const text = renderDialplan('main-menu', out);
  assert.match(text, /^\[main-menu\]\n/u);
  assert.ok(text.split('\n').filter(Boolean).slice(1).every((l) => l.startsWith('exten => ')));
});
