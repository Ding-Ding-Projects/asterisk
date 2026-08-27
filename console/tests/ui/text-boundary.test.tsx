import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BILINGUAL_SEPARATOR, LANGUAGE_MODES, isLanguageMode, languageMode, localizeText,
  localizedCreateElement, setCatalog, setLanguageMode, setVocabularyStorage, transformText,
} from '../../app/renderer/src/text-boundary.ts';
import { CANTONESE } from '../../app/renderer/src/locale-yue.ts';
import { h } from '../../app/renderer/src/dc-runtime.tsx';
import { createMemoryStorage, loadVocabularyFile } from '../../app/renderer/src/personal-vocabulary.ts';

/** The boundary holds module state, so every test starts from the shipped default. */
const reset = () => {
  setCatalog(CANTONESE);
  setLanguageMode('en');
  setVocabularyStorage(undefined);
};

const props = (node: unknown): Record<string, unknown> =>
  (node as { props: Record<string, unknown> }).props;

test('English is the default and passes every string through unchanged', () => {
  reset();
  assert.equal(languageMode(), 'en');
  assert.equal(localizeText('Endpoints'), 'Endpoints');
  assert.equal(localizeText('anything at all'), 'anything at all');
});

test('Cantonese translates a known string', () => {
  reset();
  setLanguageMode('yue');
  assert.equal(localizeText('Endpoints'), CANTONESE.Endpoints);
  assert.notEqual(CANTONESE.Endpoints, 'Endpoints');
});

test('a string nobody has translated renders as English, not as a placeholder', () => {
  /* The safe direction. A missing translation should look like untranslated copy,
   * never like a broken lookup, and never like a guess at what it might mean. */
  reset();
  setLanguageMode('yue');
  assert.equal(localizeText('Some untranslated sentence'), 'Some untranslated sentence');
});

test('bilingual keeps English primary and appends the Cantonese', () => {
  reset();
  setLanguageMode('both');
  assert.equal(localizeText('Endpoints'), `Endpoints${BILINGUAL_SEPARATOR}${CANTONESE.Endpoints}`);
});

test('bilingual with no translation does not leave a dangling separator', () => {
  /* Appending a separator with nothing after it reads as a rendering fault rather
   * than as an untranslated string. */
  reset();
  setLanguageMode('both');
  const out = localizeText('Some untranslated sentence');
  assert.equal(out, 'Some untranslated sentence');
  assert.ok(!out.includes(BILINGUAL_SEPARATOR));
});

test('every language mode is recognised and nothing else is', () => {
  for (const mode of LANGUAGE_MODES) assert.ok(isLanguageMode(mode));
  for (const bad of ['EN', 'zh', '', 'english', undefined, 3, null]) assert.ok(!isLanguageMode(bad));
});

/* --- the two hand-written lists -------------------------------------------
 * A rule alone ("every catalog entry is well-formed") passes on an empty catalog,
 * because it never looked for the entry that is missing. These name what must be
 * present and what must be absent. */

const RAILS_THAT_MUST_BE_TRANSLATED = [
  'Dashboard', 'Endpoints', 'Trunks', 'Dialplan canvas', 'IVR menus', 'Queues & agents',
  'Conferences', 'Voicemail', 'Music on hold', 'Codecs & RTP', 'CDR & CEL', 'AMI & ARI',
  'Modules', 'Logger', 'Security', 'Deploy & servers', 'Documentation', 'Appearance',
  'Notifications', 'Version history', 'Changelog', 'Status hub',
];

const IDENTIFIERS_THAT_MUST_NEVER_BE_TRANSLATED = [
  'opus', 'ulaw', 'g729', 'max_contacts', 'media_encryption', 'strategy',
  'sip:1001@10.20.4.31', 'from-internal', 'pjsip.conf', 'PJSIP', 'RTP',
];

test('every navigation rail has a translation', () => {
  for (const rail of RAILS_THAT_MUST_BE_TRANSLATED) {
    assert.ok(CANTONESE[rail],
      `the rail "${rail}" has no Cantonese and would render English while its neighbours do not`);
  }
});

test('a technical identifier is never translated, in any mode', () => {
  /* These share the design's `label` field with prose, so the only thing keeping
   * them literal is that nobody put them in the catalog. Assert it rather than
   * trust it: a codec or a config key has to survive being read back and typed. */
  reset();
  for (const mode of LANGUAGE_MODES) {
    setLanguageMode(mode);
    for (const id of IDENTIFIERS_THAT_MUST_NEVER_BE_TRANSLATED) {
      assert.equal(localizeText(id), id, `"${id}" was rewritten in ${mode} mode`);
    }
  }
});

test('no catalog value is empty or identical to its English key', () => {
  for (const [en, yue] of Object.entries(CANTONESE)) {
    assert.notEqual(yue.trim(), '', `"${en}" maps to an empty string`);
    assert.notEqual(yue, en,
      `"${en}" maps to itself, an untranslated entry pretending to be a translated one`);
  }
});

/* --- the element factory --------------------------------------------------- */

test('a string child is transformed on its way to the screen', () => {
  reset();
  setLanguageMode('yue');
  const node = localizedCreateElement('span', null, 'Endpoints');
  assert.equal(props(node).children, CANTONESE.Endpoints);
});

test('an accessible name is transformed, because a screen-reader user chose the mode too', () => {
  reset();
  setLanguageMode('yue');
  const node = localizedCreateElement('button', { 'aria-label': 'Endpoints', title: 'Trunks' });
  assert.equal(props(node)['aria-label'], CANTONESE.Endpoints);
  assert.equal(props(node).title, CANTONESE.Trunks);
});

test('a control value is left alone, because it is data rather than copy', () => {
  /* Translating a value would rewrite what the person typed or what the target
   * reported, which is a different and much worse bug than an untranslated label. */
  reset();
  setLanguageMode('yue');
  const node = localizedCreateElement('input', { value: 'Endpoints', name: 'Endpoints' });
  assert.equal(props(node).value, 'Endpoints');
  assert.equal(props(node).name, 'Endpoints');
});

test('nested and multiple children are all reached', () => {
  reset();
  setLanguageMode('yue');
  const node = localizedCreateElement('div', null, 'Endpoints', ['Trunks', 'Modules']);
  const children = props(node).children as unknown[];
  assert.equal(children[0], CANTONESE.Endpoints);
  assert.deepEqual(children[1], [CANTONESE.Trunks, CANTONESE.Modules]);
});

test('whitespace and non-string children pass through untouched', () => {
  reset();
  const node = localizedCreateElement('div', null, ' ', 42, null);
  const children = props(node).children as unknown[];
  assert.deepEqual(children, [' ', 42, null]);
});

test('an attribute with nothing to translate survives byte-identical', () => {
  /* The boundary also avoids copying the props object when no attribute changed,
   * since a fresh object every render defeats React's own bail-outs. That identity
   * is deliberately not asserted here: `createElement` copies props into a node of
   * its own regardless, so the property is real but invisible from this side, and a
   * test claiming to check it would be checking React instead. */
  reset();
  setLanguageMode('yue');
  const original = { className: 'x', 'aria-label': 'nothing translated here' };
  const after = props(localizedCreateElement('div', original));
  assert.equal(after['aria-label'], 'nothing translated here');
  assert.equal(after.className, 'x');
});

/* --- the two features share one boundary ----------------------------------- */

test('the personal vocabulary reaches rendered text, which it never did before', () => {
  /* This is the assertion the feature never had. `applyVocabularyText` was correct,
   * tested and called by nothing, so an uploaded file changed a status line and not
   * one word on screen. */
  reset();
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, JSON.stringify({
    version: 1, replacements: [{ from: 'Endpoints', to: 'Handsets' }],
  }));
  setVocabularyStorage(storage);
  assert.equal(transformText('Endpoints'), 'Handsets');
  assert.equal(props(localizedCreateElement('span', null, 'Endpoints')).children, 'Handsets');
});

test('a personal replacement is the last word, applied after the translation', () => {
  /* Order matters and is deliberate: the person renaming a term must not have that
   * rename undone by a translation running afterwards. */
  reset();
  setLanguageMode('yue');
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, JSON.stringify({
    version: 1, replacements: [{ from: CANTONESE.Endpoints, to: '電話仔' }],
  }));
  setVocabularyStorage(storage);
  assert.equal(transformText('Endpoints'), '電話仔');
});

test('with no vocabulary wired the boundary is localization alone', () => {
  reset();
  setLanguageMode('yue');
  assert.equal(transformText('Endpoints'), CANTONESE.Endpoints);
});

test('the runtime factory the generated tree uses IS the localized one', () => {
  /* The whole point, and the assertion whose absence caused the defect being fixed:
   * a boundary nothing routes through is a boundary that does nothing. `h` is what
   * every compiled template calls, so if it is ever restored to React's own
   * createElement, language modes and the personal vocabulary both go silently
   * dead again with every other test in this file still passing. */
  assert.equal(h, localizedCreateElement);
});
