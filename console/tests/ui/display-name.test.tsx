/**
 * The app display name, and the identity it must never touch.
 *
 * The identity tests are the reason this file exists. A rename that moved the data
 * directory would orphan every stored profile, credential and history at once, and the
 * app would look freshly installed with the old data still on disk under a name nothing
 * reads any more. Nothing about that failure announces itself.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DISPLAY_NAME_SETTING, IDENTITY, MAX_DISPLAY_NAME_LENGTH, RENAME_DISCLOSURE,
  aboutIdentityLine, displayName, isRenamed, nameFor, resetDisplayName, setDisplayName,
  validateDisplayName,
  type NameStorage,
} from '../../app/renderer/src/display-name.ts';

const memory = (): NameStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
};

/* --- the identity, which a rename must never move ---------------------------- */

test('the identity is frozen, so nothing can reassign it at run time', () => {
  assert.ok(Object.isFrozen(IDENTITY));
});

test('renaming the app moves no part of its identity', () => {
  /* The whole safety of the feature in one assertion. */
  const storage = memory();
  const before = { ...IDENTITY };
  setDisplayName(storage, 'Reception');
  assert.deepEqual({ ...IDENTITY }, before);
  assert.equal(IDENTITY.dataDirectory, 'ding-pbx-console');
  assert.equal(IDENTITY.credentialService, 'ding-pbx-console');
});

test('no identity value is derived from the display name', () => {
  /* Derivation is the mistake, so this checks the shape rather than one instance: after
   * a rename, no identity value contains any part of the chosen name. */
  const storage = memory();
  setDisplayName(storage, 'Reception');
  for (const value of Object.values(IDENTITY)) {
    assert.ok(!value.toLowerCase().includes('reception'), `"${value}" moved with the display name`);
  }
});

test('the storage key is not the identity key, so the two cannot collide', () => {
  assert.notEqual(DISPLAY_NAME_SETTING, IDENTITY.dataDirectory);
  assert.notEqual(DISPLAY_NAME_SETTING, IDENTITY.credentialService);
});

/* --- which surfaces get which name -------------------------------------------- */

test('the chosen name reaches the surfaces a person looks at', () => {
  const storage = memory();
  setDisplayName(storage, 'Reception');
  for (const surface of ['titleBar', 'about', 'notification', 'windowTitle'] as const) {
    assert.equal(nameFor(surface, storage), 'Reception');
  }
});

test('the shipped name reaches anything a stranger has to read', () => {
  /* "Reception" in a bug tracker tells the reader nothing about what software it is. */
  const storage = memory();
  setDisplayName(storage, 'Reception');
  for (const surface of ['diagnosticReport', 'crashLog', 'issueReport', 'updateFeed', 'installer'] as const) {
    assert.equal(nameFor(surface, storage), IDENTITY.productName, `${surface} used the chosen name`);
  }
});

test('the disclosure states the boundary where the rename is offered', () => {
  assert.match(RENAME_DISCLOSURE, /does not move your data/u);
  assert.ok(RENAME_DISCLOSURE.includes(IDENTITY.productName));
});

/* --- the About screen's own line ----------------------------------------------- */

test('the About line names the shipped console when nothing has been renamed', () => {
  assert.equal(aboutIdentityLine(memory()), `This console is ${IDENTITY.productName}.`);
  assert.equal(aboutIdentityLine(undefined), `This console is ${IDENTITY.productName}.`);
});

test('the About line names the chosen console once renamed, and still discloses the boundary', () => {
  const storage = memory();
  setDisplayName(storage, 'Reception');
  const line = aboutIdentityLine(storage);
  assert.ok(line.includes('renamed to Reception'), line);
  /* The one screen a reader goes to for "what is this software" must not stop saying what
   * a bug report will call it. */
  assert.ok(line.includes(IDENTITY.productName), line);
});

test("the About line takes its name from the surface table, not from the setting behind it", () => {
  /* Both resolve the same today. Asserting the relationship rather than the literal is what
   * keeps the 'about' entry in NameSurface load-bearing: if it ever moves into the
   * shipped-name-only set, this line has to follow it. */
  const storage = memory();
  setDisplayName(storage, 'Reception');
  for (const store of [memory(), storage]) {
    assert.ok(aboutIdentityLine(store).includes(nameFor('about', store)), aboutIdentityLine(store));
  }
});

test('the About line never begins with the word the heading ends on', () => {
  /* Guards the exact regression this line exists to prevent: the name used to sit in the
   * <h1> as "About <name>", which cost the parity harness its settle condition. Rendered,
   * the heading and this line sit adjacent, so a line starting with the name would read
   * as "About Ding PBX Console" again -- correct in the markup, wrong on the screen. */
  const storage = memory();
  setDisplayName(storage, 'Reception');
  for (const line of [aboutIdentityLine(memory()), aboutIdentityLine(storage)]) {
    assert.equal(/^(Ding PBX Console|Reception)\b/u.test(line), false, line);
  }
});

/* --- the setting itself -------------------------------------------------------- */

test('with nothing stored, the shipped name is used', () => {
  assert.equal(displayName(memory()), IDENTITY.productName);
  assert.equal(displayName(undefined), IDENTITY.productName);
  assert.equal(isRenamed(memory()), false);
});

test('a chosen name persists and is reported as a rename', () => {
  const storage = memory();
  assert.deepEqual(setDisplayName(storage, 'Reception'), []);
  assert.equal(displayName(storage), 'Reception');
  assert.equal(isRenamed(storage), true);
});

test('reset restores the shipped name in one action', () => {
  const storage = memory();
  setDisplayName(storage, 'Reception');
  resetDisplayName(storage);
  assert.equal(displayName(storage), IDENTITY.productName);
  assert.equal(isRenamed(storage), false);
});

test('surrounding whitespace is trimmed rather than stored', () => {
  const storage = memory();
  setDisplayName(storage, '  Reception  ');
  assert.equal(displayName(storage), 'Reception');
});

test('a name in any script is accepted, because it is a label', () => {
  /* Somebody calling their PBX 電話系統 is entitled to. */
  for (const name of ['電話系統', 'Reception (do not touch)', 'PBX #2', 'Téléphonie']) {
    const storage = memory();
    assert.deepEqual(setDisplayName(storage, name), [], `${name} was refused`);
    assert.equal(displayName(storage), name);
  }
});

test('an empty name is refused, and points at reset instead', () => {
  const storage = memory();
  const problems = setDisplayName(storage, '   ');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /Reset it instead/u);
  assert.equal(displayName(storage), IDENTITY.productName, 'a refused name was stored anyway');
});

test('an over-long name is refused and the message says how long it was', () => {
  const problems = validateDisplayName('x'.repeat(MAX_DISPLAY_NAME_LENGTH + 1));
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, new RegExp(String(MAX_DISPLAY_NAME_LENGTH + 1), 'u'));
});

test('a name exactly at the limit is accepted', () => {
  assert.deepEqual(validateDisplayName('x'.repeat(MAX_DISPLAY_NAME_LENGTH)), []);
});

test('a control character is refused, because a newline in a title bar is a fault', () => {
  /* The NUL is constructed rather than written as an escape: an escape here has to
   * survive every layer between the editor and the file, and this exact line arrived
   * once with a real control character in it. */
  for (const bad of ['Rec\nption', 'Rec\tption', `Rec${String.fromCharCode(0)}ption`]) {
    assert.equal(validateDisplayName(bad).length, 1, `${JSON.stringify(bad)} was accepted`);
  }
});

test('a refused name never reaches storage', () => {
  const storage = memory();
  setDisplayName(storage, 'x'.repeat(MAX_DISPLAY_NAME_LENGTH + 1));
  assert.equal(storage.map.size, 0);
});

test('a stored value the app would now refuse falls back rather than rendering', () => {
  /* Hand-edited settings, or one written by an older version with looser rules. Showing
   * something the app would refuse to accept leaves the two ends disagreeing. */
  const storage = memory();
  storage.map.set(DISPLAY_NAME_SETTING, 'Rec\nption');
  assert.equal(displayName(storage), IDENTITY.productName);
  storage.map.set(DISPLAY_NAME_SETTING, 'y'.repeat(MAX_DISPLAY_NAME_LENGTH + 5));
  assert.equal(displayName(storage), IDENTITY.productName);
});

test('a missing storage backend is survivable rather than a crash', () => {
  assert.equal(nameFor('titleBar', undefined), IDENTITY.productName);
  assert.equal(isRenamed(undefined), false);
});
