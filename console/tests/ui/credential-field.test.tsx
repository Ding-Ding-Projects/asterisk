/**
 * Consuming a credential from a bound control.
 *
 * Every test here is about the secret NOT being somewhere. A bound control's value is
 * walked by exports, by the settings surfaces and by anything that dumps or screenshots
 * component state, so a secret that merely sits in that map has already left through
 * several doors at once.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attemptMessage, consumeCredential, retainsSecret,
} from '../../app/renderer/src/credential-field.ts';

const SECRET = 'correct-horse-battery';
const FIELD = 'school_credential';

test('the secret is returned and the field is blanked in the same step', () => {
  /* The window in which the secret exists in component state is one call long. */
  const result = consumeCredential({ [FIELD]: SECRET, other: 'kept' }, FIELD);
  assert.equal(result.secret, SECRET);
  assert.equal(result.values[FIELD], '');
});

test('no value in the returned map still holds the secret', () => {
  /* Asserted across the whole map rather than the one field, so a secret copied into a
   * second key by some later change fails here even though the narrow check passes. */
  const result = consumeCredential({ [FIELD]: SECRET }, FIELD);
  assert.equal(retainsSecret(result.values, SECRET), false);
  assert.ok(!JSON.stringify(result.values).includes(SECRET));
});

test('the original map is not mutated, so a caller holding it is not surprised', () => {
  const original = { [FIELD]: SECRET };
  consumeCredential(original, FIELD);
  assert.equal(original[FIELD], SECRET, 'the input map was edited in place');
});

test('every other value is carried through untouched', () => {
  const result = consumeCredential({ [FIELD]: SECRET, lang_mode: 'English', fun_level: 3 }, FIELD);
  assert.equal(result.values.lang_mode, 'English');
  assert.equal(result.values.fun_level, 3);
});

test('an empty field yields no secret rather than an empty one', () => {
  /* An empty string handed to a verifier is an attempt, and would be reported as a wrong
   * credential rather than as nothing having been typed. */
  for (const value of ['', undefined, null, 42]) {
    const result = consumeCredential({ [FIELD]: value }, FIELD);
    assert.equal(result.secret, undefined, `${JSON.stringify(value)} was treated as a secret`);
  }
});

test('the field is blanked even when nothing was typed', () => {
  /* So a half-typed then abandoned attempt does not linger either. */
  assert.equal(consumeCredential({ [FIELD]: '   x' }, FIELD).values[FIELD], '');
  assert.equal(consumeCredential({}, FIELD).values[FIELD], '');
});

test('the field is blanked rather than deleted', () => {
  /* The control is bound; a missing key makes it briefly render uncontrolled. */
  const result = consumeCredential({ [FIELD]: SECRET }, FIELD);
  assert.ok(FIELD in result.values);
});

test('retainsSecret finds a secret hiding in any value, not only the credential field', () => {
  assert.equal(retainsSecret({ somewhere_else: SECRET }, SECRET), true);
  assert.equal(retainsSecret({ a: `prefix-${SECRET}-suffix` }, SECRET), true);
  assert.equal(retainsSecret({ a: 'unrelated' }, SECRET), false);
});

test('retainsSecret does not report a match for an empty secret', () => {
  /* Every string contains the empty string, so without this the check would report a
   * leak on every map and be ignored within a week. */
  assert.equal(retainsSecret({ a: 'anything' }, ''), false);
});

/* --- what the person is told ------------------------------------------------------- */

test('a rejected attempt does not reveal whether a credential is even set', () => {
  /* Distinguishing "wrong" from "none set" tells somebody which of the two they face. */
  const rejected = attemptMessage('rejected', 'Quiet mode');
  assert.ok(!/no unlock credential/iu.test(rejected));
  assert.match(rejected, /Nothing has changed/u);
});

test('no message quotes what was typed', () => {
  /* A message reaches whatever toast history, log or export it is shown in. */
  for (const outcome of ['accepted', 'rejected', 'missing'] as const) {
    assert.ok(!attemptMessage(outcome, 'Quiet mode').includes(SECRET));
  }
});

test('every message uses the chosen name and never the shipped one', () => {
  /* School mode may be renamed, and after a rename no surface may reveal the original. */
  for (const outcome of ['accepted', 'rejected', 'missing'] as const) {
    const message = attemptMessage(outcome, 'Quiet mode');
    assert.ok(message.includes('Quiet mode'), `${outcome} did not use the chosen name`);
    assert.ok(!message.includes('School mode'), `${outcome} leaked the shipped name`);
  }
});

test('the missing-credential message names the reset route rather than leaving somebody stuck', () => {
  assert.match(attemptMessage('missing', 'Quiet mode'), /application-data record/u);
});
