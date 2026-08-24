/**
 * Extension numbering and identity (CORE-EXT-011, -015, CORE-EXT-QC-002, -004, -005).
 *
 * The caller-ID tests carry the weight here. Display name and outbound caller ID look
 * like two fields and are one pjsip.conf key, so every round trip that loses a half is
 * a field the person filled in that quietly vanished, or worse, a name written into the
 * number.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_EXTENSION_RANGE, MAX_CONTACTS_CEILING, callerIdFor, formatCallerId, identityFor,
  parseCallerId, suggestNextExtension, takenExtensions, validateCallerId, validateExtension,
  validateMaxContacts,
} from '../../app/renderer/src/extensions.ts';
import { buildEndpointDraft, endpointDocument, WIZARD_CONTROLS } from '../../app/renderer/src/endpoint-create.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

/** Built through the real create path so the fixture cannot drift from what is written. */
const withExtensions = (...names: string[]): ConfigValue => {
  let value: ConfigValue = [] as unknown as ConfigValue;
  for (const name of names) {
    const draft = buildEndpointDraft(value, {
      [WIZARD_CONTROLS.name]: name, [WIZARD_CONTROLS.context]: 'from-internal',
    });
    assert.ok(!('error' in draft), `fixture could not create ${name}`);
    value = endpointDocument(draft).value;
  }
  return value;
};

const empty = () => [] as unknown as ConfigValue;

/* --- caller ID: two fields, one key ---------------------------------------- */

test('a caller ID splits into the display name and the number', () => {
  assert.deepEqual(parseCallerId('My Name <8005551212>'), { displayName: 'My Name', number: '8005551212' });
});

test('a quoted display name loses its quotes rather than keeping them as part of the name', () => {
  assert.deepEqual(parseCallerId('"Reception, Front" <2000>'),
    { displayName: 'Reception, Front', number: '2000' });
});

test('a bare value is read as the display name, not as the number', () => {
  /* Asterisk reads it that way, and guessing the other way would turn somebody's name
   * into a phone number without saying so. */
  assert.deepEqual(parseCallerId('Reception'), { displayName: 'Reception', number: undefined });
});

test('a number with no name keeps the number', () => {
  assert.deepEqual(parseCallerId('<8005551212>'), { displayName: undefined, number: '8005551212' });
});

test('an absent or empty caller ID yields neither half rather than empty strings', () => {
  const neither = { displayName: undefined, number: undefined };
  for (const input of [undefined, '', '   ']) assert.deepEqual(parseCallerId(input), neither);
});

test('both halves survive a round trip in either direction', () => {
  for (const value of ['My Name <8005551212>', '<2000>', 'Reception']) {
    assert.equal(formatCallerId(parseCallerId(value)), value);
  }
});

test('a name needing quotes gets them back on the way out', () => {
  assert.equal(formatCallerId({ displayName: 'Reception, Front', number: '2000' }), '"Reception, Front" <2000>');
});

test('an ordinary name is not needlessly quoted', () => {
  assert.equal(formatCallerId({ displayName: 'My Name', number: '2000' }), 'My Name <2000>');
});

test('two empty halves write nothing rather than an empty callerid line', () => {
  /* `callerid=` would override an inherited value with nothing, which is a change
   * nobody asked for dressed as leaving a field blank. */
  assert.equal(formatCallerId({}), undefined);
  assert.equal(formatCallerId({ displayName: '', number: '  ' }), undefined);
});

test('a display name with no number falls back to the extension, and never overrides one given', () => {
  assert.equal(callerIdFor({ extension: '1001', displayName: 'Reception' }), 'Reception <1001>');
  assert.equal(callerIdFor({ extension: '1001', displayName: 'Reception', callerIdNumber: '2000' }),
    'Reception <2000>');
});

test('an identity with neither half set writes no caller ID at all', () => {
  assert.equal(callerIdFor({ extension: '1001' }), undefined);
});

/* --- numbering -------------------------------------------------------------- */

test('the taken list is what is actually on the target', () => {
  assert.deepEqual(takenExtensions(withExtensions('1001', '1002')), ['1001', '1002']);
  assert.deepEqual(takenExtensions(empty()), []);
});

test('the next suggestion is the first free number in the range', () => {
  assert.equal(suggestNextExtension(empty()), '1000');
  assert.equal(suggestNextExtension(withExtensions('1000', '1001')), '1002');
});

test('a gap is filled before the range is extended', () => {
  assert.equal(suggestNextExtension(withExtensions('1000', '1002')), '1001');
});

test('a full range suggests nothing rather than a number that cannot be used', () => {
  /* A form pre-filled with a colliding value is worse than an empty one, because it
   * looks like it was checked. */
  const range = { from: 1000, to: 1001 };
  assert.equal(suggestNextExtension(withExtensions('1000', '1001'), range), undefined);
});

test('a non-numeric section name is ignored rather than counted as a number', () => {
  assert.equal(suggestNextExtension(withExtensions('reception', '1000')), '1001');
});

test('a duplicate extension is refused and says what to do instead', () => {
  const problems = validateExtension(withExtensions('1001'), '1001');
  assert.equal(problems.length, 1);
  assert.equal(problems[0].field, 'extension');
  assert.match(problems[0].message, /already on this target/u);
});

test('a number outside the range is refused and the range is named', () => {
  const problems = validateExtension(empty(), '9999');
  assert.match(problems[0].message, /1000 to 1999/u);
});

test('a non-numeric extension is refused before anything else is checked', () => {
  /* Reporting "out of range" for "reception" would be true and useless. */
  const problems = validateExtension(empty(), 'reception');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /digits only/u);
});

test('an empty extension is refused', () => {
  assert.match(validateExtension(empty(), '   ')[0].message, /needs a number/u);
});

test('every problem is reported at once rather than one per attempt', () => {
  /* Out of range AND already taken: someone fixing a form should see both. */
  const problems = validateExtension(withExtensions('9999'), '9999');
  assert.equal(problems.length, 2);
  assert.deepEqual(problems.map((p) => p.field), ['extension', 'extension']);
});

test('a valid new extension in range reports nothing', () => {
  assert.deepEqual(validateExtension(withExtensions('1001'), '1002'), []);
});

test('the range boundaries are inclusive on both ends', () => {
  assert.deepEqual(validateExtension(empty(), String(DEFAULT_EXTENSION_RANGE.from)), []);
  assert.deepEqual(validateExtension(empty(), String(DEFAULT_EXTENSION_RANGE.to)), []);
});

/* --- ceilings and caller-ID validation -------------------------------------- */

test('max contacts is held to the documented ceiling at create time too', () => {
  /* The saved-config validator already refuses this. If the wizard did not, it would
   * happily write a config its own validator then rejects. */
  assert.deepEqual(validateMaxContacts(MAX_CONTACTS_CEILING), []);
  assert.equal(validateMaxContacts(MAX_CONTACTS_CEILING + 1).length, 1);
  assert.match(validateMaxContacts(101)[0].message, /cannot exceed 100/u);
});

test('max contacts refuses a fraction or a negative rather than rounding it', () => {
  assert.equal(validateMaxContacts(-1).length, 1);
  assert.equal(validateMaxContacts(1.5).length, 1);
  assert.deepEqual(validateMaxContacts(0), []);
});

test('a caller-ID number has to be dialable', () => {
  assert.deepEqual(validateCallerId({ number: '8005551212' }), []);
  assert.deepEqual(validateCallerId({ number: '+441234567890' }), []);
  assert.equal(validateCallerId({ number: 'reception' }).length, 1);
});

test('a display name is free text, because people have punctuation in their names', () => {
  assert.deepEqual(validateCallerId({ displayName: "O'Brien, Front Desk" }), []);
});

/* --- reading an identity back off the target -------------------------------- */

test('an identity round-trips through the file', () => {
  const value = withExtensions('1001');
  const endpoints = (value as unknown as { name: string; entries: { key: string; value: string }[] }[]);
  const endpointSection = endpoints.find((s) => s.name === '1001' && s.entries.some((e) => e.value === 'endpoint'));
  assert.ok(endpointSection, 'the fixture has no endpoint section to write a caller ID into');
  endpointSection.entries.push({ key: 'callerid', value: 'Reception <2000>' });

  const identity = identityFor(value, '1001');
  assert.deepEqual(identity, { extension: '1001', displayName: 'Reception', callerIdNumber: '2000' });
  assert.equal(callerIdFor(identity!), 'Reception <2000>');
});

test('an extension that is not there has no identity rather than an empty one', () => {
  assert.equal(identityFor(withExtensions('1001'), '9999'), undefined);
});

test('an extension with no caller ID reports both halves absent, not blank', () => {
  assert.deepEqual(identityFor(withExtensions('1001'), '1001'),
    { extension: '1001', displayName: undefined, callerIdNumber: undefined });
});
