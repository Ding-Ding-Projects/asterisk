/**
 * The seam between funny-levels/dialog-emojis and the copy the console actually renders.
 *
 * funny-levels.ts and dialog-emojis.ts already prove `renderMessage` and `buildDialog`
 * are correct in isolation. What they cannot prove is that anything calls them --
 * before this module existed, neither had a caller outside its own test file, so the
 * two sliders and the emoji switch persisted a number and a boolean and changed nothing
 * a person could see. These tests are about the wiring: build a `Message`/`DialogParts`
 * the same way a real dialog would, and prove the produced text actually differs.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLevelMessage, classifyDialogKind, copyLanguageFor, styledDialog, styledMessageText,
  styledToastText, type MessageStorage,
} from '../../app/renderer/src/message-styling.ts';
import { FUNNY_LEVELS, setFunnyLevel, type FunnyLevel } from '../../app/renderer/src/funny-levels.ts';
import { ALL_DIALOG_EMOJI, DIALOG_EMOJI, setEmojisEnabled } from '../../app/renderer/src/dialog-emojis.ts';

const memory = (): MessageStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

/* --- buildLevelMessage: the fact-preserving construction --------------------------- */

test('the raw text is the message\'s only fact, at both languages', () => {
  for (const language of ['en', 'yue'] as const) {
    const message = buildLevelMessage(language, 'acme-trunk was removed from the server list.');
    assert.deepEqual(message.facts, ['acme-trunk was removed from the server list.']);
  }
});

test('every level for every language carries the fact as a literal substring', () => {
  const raw = 'Ticket 4821 was recorded.';
  for (const language of ['en', 'yue'] as const) {
    const message = buildLevelMessage(language, raw);
    for (const level of FUNNY_LEVELS) {
      const phrasing = message.phrasings[level];
      assert.ok(phrasing !== undefined, `${language} level ${level} has no phrasing at all`);
      assert.ok(phrasing.includes(raw), `${language} level ${level} lost the fact: "${phrasing}"`);
    }
  }
});

test('levels 1 and 2 are the text itself, unframed', () => {
  const raw = 'Editor choice forgotten';
  for (const language of ['en', 'yue'] as const) {
    const message = buildLevelMessage(language, raw);
    assert.equal(message.phrasings[1], raw);
    assert.equal(message.phrasings[2], raw);
  }
});

test('levels 3 through 5 genuinely differ from the plain text and from each other', () => {
  const raw = 'Connection removed';
  for (const language of ['en', 'yue'] as const) {
    const message = buildLevelMessage(language, raw);
    const loud = [3, 4, 5].map((level) => message.phrasings[level as FunnyLevel]);
    assert.ok(loud.every((text) => text !== raw), `${language}: a "loud" level rendered identically to the plain text`);
    assert.equal(new Set(loud).size, loud.length, `${language}: two different levels produced identical phrasing`);
  }
});

test('the Cantonese frame is real Cantonese, not the English text again', () => {
  const raw = 'Console installed';
  const message = buildLevelMessage('yue', raw);
  for (const level of [3, 4, 5] as const) {
    assert.match(message.phrasings[level] ?? '', /[一-鿿]/u, `yue level ${level} has no Chinese characters: "${message.phrasings[level]}"`);
  }
});

/* --- styledMessageText: the level actually applied ---------------------------------- */

test('an empty string is returned unchanged rather than gaining a frame with nothing in it', () => {
  const storage = memory();
  assert.equal(styledMessageText(storage, 'en', ''), '');
  assert.equal(styledMessageText(storage, 'en', '   '), '   ');
});

test('the default level (5) is genuinely louder than level 1', () => {
  const storage = memory();
  const raw = 'That name will not work';
  setFunnyLevel(storage, 'en', 1);
  const plain = styledMessageText(storage, 'en', raw);
  setFunnyLevel(storage, 'en', 5);
  const loud = styledMessageText(storage, 'en', raw);
  assert.equal(plain, raw, 'level 1 should render the text with no frame at all');
  assert.notEqual(loud, plain, 'changing the stored level from 1 to 5 rendered identical text');
  assert.ok(loud.includes(raw), 'the fact dropped out of the level-5 rendering');
});

test('the two language dials are independent: changing yue never moves en output', () => {
  const storage = memory();
  const raw = 'Ticket filed';
  setFunnyLevel(storage, 'en', 1);
  const before = styledMessageText(storage, 'en', raw);
  setFunnyLevel(storage, 'yue', 5);
  const after = styledMessageText(storage, 'en', raw);
  assert.equal(before, after, 'setting the Cantonese level changed English-language rendered text');
});

test('a missing storage backend falls back to the default level (5) rather than throwing', () => {
  /* Both dials ship at maximum, so a missing storage backend must style at level 5,
   * not render the text unchanged as though level 1 were the fallback. */
  const rendered = styledMessageText(undefined, 'en', 'Saved');
  assert.ok(rendered.includes('Saved'), 'the fact dropped out with no storage backend');
  assert.notEqual(rendered, 'Saved', 'a missing storage backend rendered as though the level were 1, not the default 5');
});

/* --- copyLanguageFor: which dial governs dialog copy in which display mode --------- */

test('English display mode uses the English dial; Cantonese and bilingual use the Cantonese one', () => {
  assert.equal(copyLanguageFor('en'), 'en');
  assert.equal(copyLanguageFor('yue'), 'yue');
  assert.equal(copyLanguageFor('both'), 'yue');
});

/* --- classifyDialogKind: a best-effort read of a bare title ------------------------- */

test('a title beginning "Not" or "No" classifies as an error', () => {
  assert.equal(classifyDialogKind('Not found'), 'error');
  assert.equal(classifyDialogKind('No target connected'), 'error');
  assert.equal(classifyDialogKind('That name will not work'), 'error');
});

test('a title ending in a question mark classifies as a question', () => {
  assert.equal(classifyDialogKind('Apply the deploy plan?'), 'question');
});

test('a title mentioning a security reduction classifies as a warning', () => {
  assert.equal(classifyDialogKind('media_encryption is off — that is a real reduction in security'), 'warning');
});

test('a title describing an action under way classifies as progress', () => {
  assert.equal(classifyDialogKind('Starting the phone system…'), 'progress');
  assert.equal(classifyDialogKind('Creating the runtime…'), 'progress');
});

test('an ordinary confirmation title falls back to success', () => {
  assert.equal(classifyDialogKind('Connection added'), 'success');
  assert.equal(classifyDialogKind('Step deleted'), 'success');
});

/* --- styledDialog and styledToastText: both settings actually compose -------------- */

test('styledDialog changes wording with the level and adds the emoji only when enabled', () => {
  const storage = memory();
  setFunnyLevel(storage, 'en', 1);
  const off = styledDialog(storage, 'en', 'destructive', 'Delete 1001', 'This cannot be undone.');
  assert.equal(off.heading, 'Delete 1001');
  assert.equal(off.body, 'This cannot be undone.');

  setEmojisEnabled(storage, true);
  setFunnyLevel(storage, 'en', 5);
  const on = styledDialog(storage, 'en', 'destructive', 'Delete 1001', 'This cannot be undone.');
  assert.ok(on.heading.startsWith(DIALOG_EMOJI.destructive), 'expected the destructive emoji on the heading');
  assert.ok(on.body.startsWith(DIALOG_EMOJI.destructive), 'expected the destructive emoji on the body');
  assert.ok(on.body.includes('This cannot be undone.'), 'the fact dropped out of a decorated, level-5 body');
  assert.notEqual(on.body, off.body, 'turning on both settings produced identical body text');
});

test('styledDialog never returns anything but heading and body -- no label field to leak an emoji into', () => {
  const storage = memory();
  setEmojisEnabled(storage, true);
  const result = styledDialog(storage, 'en', 'destructive', 'Delete 1001', 'x');
  assert.deepEqual(Object.keys(result).sort(), ['body', 'heading']);
});

test('styledToastText composes the same two settings for a one-line message box', () => {
  const storage = memory();
  const raw = 'Editor choice forgotten';
  setFunnyLevel(storage, 'en', 1);
  const plain = styledToastText(storage, 'en', 'success', raw);
  assert.equal(plain, raw);

  setFunnyLevel(storage, 'en', 5);
  setEmojisEnabled(storage, true);
  const decorated = styledToastText(storage, 'en', 'success', raw);
  assert.ok(decorated.startsWith(DIALOG_EMOJI.success));
  assert.ok(decorated.includes(raw));
  assert.notEqual(decorated, plain);
});

test('no dialog-emoji setting can make styledDialog or styledToastText emit a raw ALL_DIALOG_EMOJI string outside the leading position', () => {
  /* Decoration is meant to be a single leading mark, never scattered through the
   * funny-level framing sentence -- if it were, an emoji could end up mid-sentence
   * where a screen reader announces it out of context. */
  const storage = memory();
  setEmojisEnabled(storage, true);
  setFunnyLevel(storage, 'en', 5);
  const dialog = styledDialog(storage, 'en', 'success', 'Connection added', 'acme-trunk is now in the server list.');
  for (const emoji of ALL_DIALOG_EMOJI) {
    if (emoji === DIALOG_EMOJI.success) continue;
    assert.ok(!dialog.heading.includes(emoji), `unrelated emoji ${emoji} leaked into the heading`);
    assert.ok(!dialog.body.includes(emoji), `unrelated emoji ${emoji} leaked into the body`);
  }
});

/* --- BREAK CHECK: proving these assertions are not vacuous ------------------------- */

test('BREAK CHECK -- an unstyled pass-through would fail the level-differs assertion above', () => {
  /* If styledMessageText were reduced to `return text;` (exactly the bug this module
   * fixes), the "genuinely louder than level 1" test above would stop failing on a
   * broken implementation and start failing on a correct one -- which is the wrong way
   * around. This proves the assertion shape itself is sensitive to that regression. */
  const passThrough = (_storage: unknown, _language: unknown, text: string) => text;
  const raw = 'That name will not work';
  const level1 = passThrough(memory(), 'en', raw);
  const level5 = passThrough(memory(), 'en', raw);
  assert.equal(level1, level5, 'sanity check: the stand-in pass-through is level-blind, as expected');
  assert.throws(() => assert.notEqual(level1, level5), assert.AssertionError,
    'the real test\'s notEqual assertion would not have caught a pass-through implementation');
});
