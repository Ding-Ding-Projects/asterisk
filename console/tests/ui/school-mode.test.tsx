/**
 * School mode.
 *
 * Three groups of tests carry the weight. The capability filter, because "omitted, not
 * disabled" is a shape a lazy implementation can fake by returning everything with a
 * flag flipped -- the test has to check the item is actually gone. The retention pair
 * (`effectiveLanguageMode` / `effectiveFunnyLevel`), because a forcing function that
 * silently no-ops is the single way this whole feature could ship inert while every
 * other test still passes. And the name-leak scan, because the rule is "never, in any
 * surface", and a rule like that is only real if something checks every surface this
 * module can produce rather than trusting a reviewer to remember it in six months.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HIDDEN_CAPABILITIES, HONESTY_NOTICE, MAX_NAME_LENGTH, SHIPPED_NAME,
  activateSchoolMode, capabilityVisible, credentialMethod, deactivateSchoolMode,
  effectiveFunnyLevel, effectiveLanguageMode, filterVisibleCapabilities, hasCredential,
  isHiddenCapability, lockedOffExplanation, renameSchoolMode, schoolModeActive,
  schoolModeDescriptor, schoolModeName, setCredential, validateName, verifyCredential,
  type CredentialMethod, type FunnyLevel, type HiddenCapability, type LanguageMode,
  type SchoolModeStorage,
} from '../../app/renderer/src/school-mode.ts';

const memory = (): SchoolModeStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

const ALL_LANGUAGE_MODES: readonly LanguageMode[] = ['english', 'cantonese', 'bilingual'];
const ALL_FUNNY_LEVELS: readonly FunnyLevel[] = [1, 2, 3, 4, 5];
const ALL_CREDENTIAL_METHODS: readonly CredentialMethod[] = ['pin', 'password', 'passkey'];

/* --- the switch itself: off by default, on needs nothing, off needs a credential --- */

test('the mode is off by default', () => {
  /* A mode that switches itself on has decided something about the user it has no
   * standing to decide -- same principle as every other opt-in accommodation here. */
  assert.equal(schoolModeActive(memory()), false);
  assert.equal(schoolModeActive(undefined), false);
});

test('an unrecognised stored value reads as off', () => {
  const storage = memory();
  storage.map.set('console.schoolMode.active', 'sure');
  assert.equal(schoolModeActive(storage), false);
});

test('turning it on requires no credential at all', () => {
  const storage = memory();
  activateSchoolMode(storage);
  assert.equal(schoolModeActive(storage), true);
});

test('turning it off is refused when no credential was ever set', () => {
  /* Fail closed exactly like every other lock in this app: nothing to check against is
   * never treated as an implicit pass. */
  const storage = memory();
  activateSchoolMode(storage);
  const result = deactivateSchoolMode(storage, 'anything');
  assert.equal(result.ok, false);
  assert.equal(schoolModeActive(storage), true, 'the mode turned off with no credential set');
});

test('turning it off is refused with the wrong credential, and the mode stays on', () => {
  const storage = memory();
  activateSchoolMode(storage);
  setCredential(storage, 'pin', '1234');
  const result = deactivateSchoolMode(storage, '0000');
  assert.equal(result.ok, false);
  assert.equal(schoolModeActive(storage), true);
});

test('turning it off succeeds with the right credential, for every credential method', () => {
  for (const method of ALL_CREDENTIAL_METHODS) {
    const storage = memory();
    activateSchoolMode(storage);
    setCredential(storage, method, 'the-real-secret');
    const result = deactivateSchoolMode(storage, 'the-real-secret');
    assert.equal(result.ok, true, `${method} credential did not unlock the mode`);
    assert.equal(schoolModeActive(storage), false);
  }
});

test('turning off an already-off mode is a harmless no-op, not a demand for a credential', () => {
  const storage = memory();
  const result = deactivateSchoolMode(storage, '');
  assert.equal(result.ok, true);
  assert.equal(schoolModeActive(storage), false);
});

/* --- credentials: never the plaintext, never a length or composition report --------- */

test('nothing is credentialed until setCredential is called', () => {
  assert.equal(hasCredential(memory()), false);
  assert.equal(credentialMethod(memory()), undefined);
  assert.equal(verifyCredential(memory(), 'whatever'), false);
});

test('the stored credential is never the plaintext secret', () => {
  const storage = memory();
  setCredential(storage, 'password', 'hunter2');
  for (const value of storage.map.values()) {
    assert.notEqual(value, 'hunter2', 'the plaintext secret was written straight into storage');
  }
});

test('verification matches the exact secret and rejects every near miss, for every method', () => {
  for (const method of ALL_CREDENTIAL_METHODS) {
    const storage = memory();
    setCredential(storage, method, 'correct-horse');
    assert.equal(verifyCredential(storage, 'correct-horse'), true, `${method}: exact secret was rejected`);
    for (const wrong of ['correct-hors', 'correct-horsee', '', 'Correct-Horse', ' correct-horse']) {
      assert.equal(verifyCredential(storage, wrong), false, `${method}: "${wrong}" was wrongly accepted`);
    }
  }
});

test('setting a new credential replaces the old one rather than accumulating both', () => {
  const storage = memory();
  setCredential(storage, 'pin', '1111');
  setCredential(storage, 'password', 'new-password');
  assert.equal(verifyCredential(storage, '1111'), false);
  assert.equal(verifyCredential(storage, 'new-password'), true);
  assert.equal(credentialMethod(storage), 'password');
});

/* --- rename: validated, and the shipped default until then -------------------------- */

test('the name is the shipped default until it is renamed', () => {
  assert.equal(schoolModeName(memory()), SHIPPED_NAME);
  assert.equal(schoolModeName(undefined), SHIPPED_NAME);
});

test('a valid rename is trimmed and takes effect immediately', () => {
  const storage = memory();
  const result = renameSchoolMode(storage, '  Quiet hours  ');
  assert.equal(result.ok, true);
  assert.equal(result.name, 'Quiet hours');
  assert.equal(schoolModeName(storage), 'Quiet hours');
});

test('an empty or whitespace-only name is refused, and the prior name survives', () => {
  const storage = memory();
  renameSchoolMode(storage, 'Guest mode');
  for (const bad of ['', '   ', '\n\t']) {
    const result = renameSchoolMode(storage, bad);
    assert.equal(result.ok, false, `"${JSON.stringify(bad)}" was accepted as a name`);
  }
  assert.equal(schoolModeName(storage), 'Guest mode', 'a refused rename still changed the stored name');
});

test('a name past the maximum length is refused', () => {
  const tooLong = 'x'.repeat(MAX_NAME_LENGTH + 1);
  const result = validateName(tooLong);
  assert.equal(result.ok, false);
  assert.equal(validateName('x'.repeat(MAX_NAME_LENGTH)).ok, true, 'the boundary length itself was refused');
});

test('a name that is only whitespace around real content is still accepted, trimmed', () => {
  assert.deepEqual(validateName('  Library mode  '), { ok: true, name: 'Library mode' });
});

/* --- the shipped name never leaks after a rename ------------------------------------- */

test('no text this module produces contains the shipped name once it has been renamed', () => {
  /* The whole point of letting somebody rename it: after the rename, "School mode" must
   * not resurface anywhere -- not the descriptor, not the lock explanation, for any
   * credential state. */
  const storage = memory();
  renameSchoolMode(storage, 'Focus session');
  const descriptor = schoolModeDescriptor(storage);
  const surfaces = [descriptor.label, descriptor.help, lockedOffExplanation(storage)];

  activateSchoolMode(storage);
  surfaces.push(lockedOffExplanation(storage));
  for (const method of ALL_CREDENTIAL_METHODS) {
    setCredential(storage, method, 'secret');
    surfaces.push(lockedOffExplanation(storage));
  }

  for (const text of surfaces) {
    assert.ok(!text.toLowerCase().includes(SHIPPED_NAME.toLowerCase()), `"${text}" leaked the shipped name`);
    assert.ok(text.includes('Focus session'), `"${text}" did not use the chosen name at all`);
  }
});

test('before any rename, the descriptor legitimately shows the shipped name', () => {
  /* Not a leak: nobody has renamed it yet, so the shipped name is simply the name. */
  const descriptor = schoolModeDescriptor(memory());
  assert.equal(descriptor.label, SHIPPED_NAME);
});

test('the lock explanation names the actual unlock route, per credential method', () => {
  for (const method of ALL_CREDENTIAL_METHODS) {
    const storage = memory();
    activateSchoolMode(storage);
    setCredential(storage, method, 'secret');
    const explanation = lockedOffExplanation(storage);
    assert.ok(explanation.toLowerCase().includes(method), `explanation for ${method} did not name its route: "${explanation}"`);
  }
});

test('the lock explanation is honest when no credential has been set yet', () => {
  const storage = memory();
  activateSchoolMode(storage);
  const explanation = lockedOffExplanation(storage);
  assert.match(explanation, /not been set/, `explanation did not admit no credential exists: "${explanation}"`);
});

/* --- the honesty notice: a UX lock, and the app has to say so ------------------------ */

test('the honesty notice names the actual reset route and claims no protection', () => {
  const lower = HONESTY_NOTICE.toLowerCase();
  assert.ok(lower.includes('not a security boundary'), 'the notice does not admit it is only a UX lock');
  assert.ok(lower.includes('application-data'), 'the notice does not name the actual reset route');
  for (const overclaim of ['encrypt', 'protects', 'secures your']) {
    assert.ok(!lower.includes(overclaim), `the notice overclaims with "${overclaim}"`);
  }
});

/* --- the capability list: recognised exactly, and hidden means OMITTED, not disabled - */

test('isHiddenCapability recognises exactly the declared list and nothing else', () => {
  for (const capability of HIDDEN_CAPABILITIES) assert.ok(isHiddenCapability(capability));
  for (const bad of ['language.english', 'schoolMode', '', undefined, 7, 'DIMSUM']) {
    assert.ok(!isHiddenCapability(bad), `"${String(bad)}" was wrongly recognised as a hidden capability`);
  }
});

test('every hidden capability is visible when the mode is off, and invisible when it is on', () => {
  /* Loops the whole list rather than a single example, so a capability added later
   * without wiring it into the switch cannot slip past untested. */
  const off = memory();
  const on = memory();
  activateSchoolMode(on);
  for (const capability of HIDDEN_CAPABILITIES) {
    assert.equal(capabilityVisible(off, capability), true, `${capability} was hidden while the mode is off`);
    assert.equal(capabilityVisible(on, capability), false, `${capability} stayed visible while the mode is on`);
  }
});

test('the filter OMITS hidden items entirely -- the array gets shorter, nothing is merely flagged', () => {
  interface Row { id: string; capability: HiddenCapability | null }
  const rows: Row[] = [
    ...HIDDEN_CAPABILITIES.map((capability): Row => ({ id: capability, capability })),
    { id: 'endpoints', capability: null },
    { id: 'trunks', capability: null },
  ];

  const storage = memory();
  activateSchoolMode(storage);
  const visible = filterVisibleCapabilities(storage, rows, (row) => row.capability);

  assert.deepEqual(visible.map((row) => row.id), ['endpoints', 'trunks']);
  for (const capability of HIDDEN_CAPABILITIES) {
    assert.ok(!visible.some((row) => row.id === capability), `${capability} survived the filter while hidden`);
  }
});

test('the filter returns every item unchanged while the mode is off', () => {
  interface Row { id: string; capability: HiddenCapability | null }
  const rows: Row[] = HIDDEN_CAPABILITIES.map((capability): Row => ({ id: capability, capability }));
  const visible = filterVisibleCapabilities(memory(), rows, (row) => row.capability);
  assert.deepEqual(visible, rows);
});

test('an item naming no capability is never filtered by school mode either way', () => {
  const item = { id: 'trunks', capability: null as HiddenCapability | null };
  const on = memory();
  activateSchoolMode(on);
  assert.deepEqual(filterVisibleCapabilities(on, [item], (i) => i.capability), [item]);
  assert.deepEqual(filterVisibleCapabilities(memory(), [item], (i) => i.capability), [item]);
});

/* --- retention: prior choices survive, and this is the "silently inert" tripwire ---- */

test('every language mode is forced to English while the mode is on, whatever was stored', () => {
  /* Loops every enum value on purpose: a forcing function that special-cased one value
   * and passed the rest through would leave the feature half-inert and every other test
   * in this file would still be green. */
  const storage = memory();
  activateSchoolMode(storage);
  for (const stored of ALL_LANGUAGE_MODES) {
    assert.equal(effectiveLanguageMode(storage, stored), 'english', `${stored} was not forced to english`);
  }
});

test('every language mode passes through unchanged while the mode is off', () => {
  /* This is the retention proof: the same stored value goes in and comes back out,
   * proving nothing was destroyed while the mode was on -- there was simply never
   * anything to destroy, because this function never writes anywhere. */
  const storage = memory();
  for (const stored of ALL_LANGUAGE_MODES) {
    assert.equal(effectiveLanguageMode(storage, stored), stored);
  }
});

test('every funny level is forced to fully serious while the mode is on, whatever was stored', () => {
  const storage = memory();
  activateSchoolMode(storage);
  for (const stored of ALL_FUNNY_LEVELS) {
    assert.equal(effectiveFunnyLevel(storage, stored), 1, `level ${stored} was not forced to serious`);
  }
});

test('every funny level passes through unchanged while the mode is off', () => {
  const storage = memory();
  for (const stored of ALL_FUNNY_LEVELS) {
    assert.equal(effectiveFunnyLevel(storage, stored), stored);
  }
});

test('turning the mode off hands back exactly the value that was there before it went on', () => {
  /* The end-to-end version of the two tests above: on forces it, off releases it, and
   * the caller's own storage -- standing in for wherever language/funny-level actually
   * live -- was never touched by this module at any point. */
  const storage = memory();
  setCredential(storage, 'pin', '9999');
  const priorLanguage: LanguageMode = 'bilingual';
  const priorFunny: FunnyLevel = 5;

  assert.equal(effectiveLanguageMode(storage, priorLanguage), priorLanguage);
  activateSchoolMode(storage);
  assert.equal(effectiveLanguageMode(storage, priorLanguage), 'english');
  assert.equal(effectiveFunnyLevel(storage, priorFunny), 1);
  deactivateSchoolMode(storage, '9999');
  assert.equal(effectiveLanguageMode(storage, priorLanguage), priorLanguage, 'the prior language was not restored');
  assert.equal(effectiveFunnyLevel(storage, priorFunny), priorFunny, 'the prior funny level was not restored');
});

/* --- discoverability: the switch itself is never one of the things it hides --------- */

test('the mode\'s own descriptor is always produced, including while the mode is active', () => {
  /* The control itself stays discoverable -- it is the one thing school mode never
   * hides from itself. */
  const storage = memory();
  activateSchoolMode(storage);
  const descriptor = schoolModeDescriptor(storage);
  assert.ok(descriptor.label.length > 0);
  assert.ok(descriptor.help.length > 10);
});
