/**
 * Funny levels.
 *
 * The tests that matter are the ones proving the facts survive. A playful console is a
 * pleasant thing right up until somebody cannot tell which file a destructive action is
 * about to take, and the difference between those two outcomes is entirely in whether the
 * facts are carried separately from the phrasing or trusted to be inside it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COPY_LANGUAGES, DEFAULT_FUNNY_LEVEL, FUNNY_LEVELS, FUNNY_LEVEL_DISCLOSURE,
  LEVEL_LABELS, LEVEL_SETTING_PREFIX, MAX_FUNNY_LEVEL, MIN_FUNNY_LEVEL,
  funnyLevel, isFunnyLevel, renderMessage, resetFunnyLevel, setFunnyLevel,
  type FunnyLevel, type LevelStorage, type Message,
} from '../../app/renderer/src/funny-levels.ts';

const memory = (): LevelStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

/** A destructive confirmation: the category where losing a fact costs the most. */
const DELETE_ENDPOINT: Message = {
  facts: ['1001', 'cannot be undone'],
  phrasings: {
    1: 'Delete 1001. This cannot be undone.',
    3: 'About to delete 1001 -- this cannot be undone, so have a look first.',
    5: 'Say goodbye to 1001. It cannot be undone, and it is not coming back.',
  },
};

/* --- the two dials ---------------------------------------------------------------- */

test('both languages start at maximum', () => {
  /* Somebody who wants it flat says so; nobody has to opt in to a console with a voice. */
  const storage = memory();
  for (const language of COPY_LANGUAGES) {
    assert.equal(funnyLevel(storage, language), DEFAULT_FUNNY_LEVEL);
  }
  assert.equal(DEFAULT_FUNNY_LEVEL, MAX_FUNNY_LEVEL);
});

test('the two languages are independent', () => {
  /* One shared slider makes "Cantonese warm, English flat" impossible, and that is a
   * combination somebody sitting beside a colleague genuinely wants. */
  const storage = memory();
  setFunnyLevel(storage, 'en', 1);
  assert.equal(funnyLevel(storage, 'en'), 1);
  assert.equal(funnyLevel(storage, 'yue'), DEFAULT_FUNNY_LEVEL);
});

test('each language has its own stored key', () => {
  const storage = memory();
  setFunnyLevel(storage, 'en', 2);
  setFunnyLevel(storage, 'yue', 4);
  assert.equal(storage.map.get(`${LEVEL_SETTING_PREFIX}en`), '2');
  assert.equal(storage.map.get(`${LEVEL_SETTING_PREFIX}yue`), '4');
});

test('resetting one language leaves the other alone', () => {
  const storage = memory();
  setFunnyLevel(storage, 'en', 1);
  setFunnyLevel(storage, 'yue', 1);
  resetFunnyLevel(storage, 'en');
  assert.equal(funnyLevel(storage, 'en'), DEFAULT_FUNNY_LEVEL);
  assert.equal(funnyLevel(storage, 'yue'), 1);
});

test('every level in range round-trips', () => {
  const storage = memory();
  for (const level of FUNNY_LEVELS) {
    setFunnyLevel(storage, 'en', level);
    assert.equal(funnyLevel(storage, 'en'), level);
  }
});

test('an unreadable stored value falls back rather than being clamped', () => {
  /* Clamping a hand-edited 9 to 5 looks identical to somebody having chosen 5. Falling
   * back says the file is not saying anything trustworthy about this setting. */
  const storage = memory();
  for (const bad of ['9', '0', '-1', '2.5', 'loud', '']) {
    storage.map.set(`${LEVEL_SETTING_PREFIX}en`, bad);
    assert.equal(funnyLevel(storage, 'en'), DEFAULT_FUNNY_LEVEL, `"${bad}" was not rejected`);
  }
});

test('a missing storage backend is survivable', () => {
  assert.equal(funnyLevel(undefined, 'en'), DEFAULT_FUNNY_LEVEL);
});

test('only whole levels in range are levels', () => {
  for (const level of FUNNY_LEVELS) assert.ok(isFunnyLevel(level));
  for (const bad of [0, 6, 2.5, -1, '3', null, undefined, Number.NaN]) {
    assert.ok(!isFunnyLevel(bad), `${String(bad)} was accepted as a level`);
  }
});

/* --- the facts survive, which is the whole safety of the feature ------------------- */

test('every fact appears at every level', () => {
  /* The assertion the feature rests on. A destructive confirmation that loses "1001" at
   * level 5 is a confirmation somebody cannot act on. */
  for (const level of FUNNY_LEVELS) {
    const rendered = renderMessage(DELETE_ENDPOINT, level);
    for (const fact of DELETE_ENDPOINT.facts) {
      assert.ok(rendered.text.includes(fact),
        `level ${level} lost the fact "${fact}": ${rendered.text}`);
    }
  }
});

test('a correct message reports no missing facts', () => {
  for (const level of FUNNY_LEVELS) {
    assert.deepEqual(renderMessage(DELETE_ENDPOINT, level).missingFacts, []);
  }
});

test('a phrasing that drops a fact has it appended rather than silently lost', () => {
  /* Returned rather than thrown: a caller mid-render of a destructive confirmation must
   * still show something, and what it should show is the facts. The suite treats a
   * dropped fact as a defect; at run time the person still gets told which file. */
  const careless: Message = {
    facts: ['1001', 'cannot be undone'],
    phrasings: { 5: 'Poof! Gone!' },
  };
  const rendered = renderMessage(careless, 5);
  assert.deepEqual(rendered.missingFacts, ['1001', 'cannot be undone']);
  assert.ok(rendered.text.includes('1001'));
  assert.ok(rendered.text.includes('cannot be undone'));
});

test('the level applies to a destructive message rather than exempting it', () => {
  /* No category carve-out: the wording genuinely differs, and the facts genuinely do not. */
  const plain = renderMessage(DELETE_ENDPOINT, 1).text;
  const loud = renderMessage(DELETE_ENDPOINT, 5).text;
  assert.notEqual(plain, loud, 'a destructive message was exempted from the setting');
  for (const fact of DELETE_ENDPOINT.facts) {
    assert.ok(plain.includes(fact) && loud.includes(fact));
  }
});

test('a level with no phrasing falls back down rather than rendering empty', () => {
  assert.equal(renderMessage(DELETE_ENDPOINT, 4).text, DELETE_ENDPOINT.phrasings[3]);
  assert.equal(renderMessage(DELETE_ENDPOINT, 2).text, DELETE_ENDPOINT.phrasings[1]);
});

test('a message defined only at a high level still renders at a low one', () => {
  /* Falling back downward finds nothing, so it looks upward rather than rendering an
   * empty string -- an empty message is worse than an over-playful one. */
  const onlyHigh: Message = { facts: [], phrasings: { 5: 'Only the loud one exists.' } };
  assert.equal(renderMessage(onlyHigh, 1).text, 'Only the loud one exists.');
});

test('a message with no phrasings at all renders empty rather than throwing', () => {
  assert.equal(renderMessage({ facts: [], phrasings: {} }, 3).text, '');
});

test('a message with no facts is rendered as written', () => {
  const chatty: Message = { facts: [], phrasings: { 1: 'Saved.', 5: 'Saved! Nice one.' } };
  assert.equal(renderMessage(chatty, 5).text, 'Saved! Nice one.');
  assert.deepEqual(renderMessage(chatty, 5).missingFacts, []);
});

/* --- what the person is told about the setting -------------------------------------- */

test('the disclosure says it covers every category and that facts never change', () => {
  assert.match(FUNNY_LEVEL_DISCLOSURE, /warnings and errors/u);
  assert.match(FUNNY_LEVEL_DISCLOSURE, /no category it skips/u);
  assert.match(FUNNY_LEVEL_DISCLOSURE, /never changes is what a message says/u);
});

test('the disclosure states both languages and the default', () => {
  assert.match(FUNNY_LEVEL_DISCLOSURE, /English/u);
  assert.match(FUNNY_LEVEL_DISCLOSURE, /Cantonese/u);
  assert.match(FUNNY_LEVEL_DISCLOSURE, new RegExp(String(DEFAULT_FUNNY_LEVEL), 'u'));
});

test('the disclosure is itself plain, whatever the level is set to', () => {
  /* Somebody at level 5 reading a jokey explanation of what level 5 does has been told
   * nothing they can act on. */
  assert.ok(!/!|😀|🎉/u.test(FUNNY_LEVEL_DISCLOSURE));
});

test('every level has a label, and the labels are distinct', () => {
  const labels = FUNNY_LEVELS.map((level) => LEVEL_LABELS[level]);
  assert.equal(labels.filter(Boolean).length, FUNNY_LEVELS.length);
  assert.equal(new Set(labels).size, FUNNY_LEVELS.length, 'two levels share a label');
});

test('the range is 1 to 5, not 0 to 4', () => {
  /* The design shipped a 0-4 slider; the contract is 1-5, and an off-by-one here would
   * make level 1 unreachable and 5 mean something different from what is written down. */
  assert.equal(MIN_FUNNY_LEVEL, 1);
  assert.equal(MAX_FUNNY_LEVEL, 5);
  assert.deepEqual([...FUNNY_LEVELS], [1, 2, 3, 4, 5]);
});
