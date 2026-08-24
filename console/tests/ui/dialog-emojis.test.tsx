/**
 * Dialog emoji decoration, and the three places it must never reach.
 *
 * The control-text tests are the point. An emoji in an accessible name is read aloud as
 * its Unicode description, so a screen-reader user hears "wastebasket Delete" on every
 * focus -- a decoration nobody chose, on the surface least able to ignore it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_DIALOG_EMOJI, DIALOG_EMOJI, DIALOG_EMOJI_SETTING, buildDialog, controlText,
  decorateDialogText, emojisEnabled, setEmojisEnabled,
  type DialogKind, type EmojiStorage,
} from '../../app/renderer/src/dialog-emojis.ts';

const memory = (): EmojiStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

const on = () => { const s = memory(); setEmojisEnabled(s, true); return s; };

const PARTS = {
  heading: 'Delete this endpoint?',
  body: 'This removes 1001 and its auth and aor sections. It cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  accessibleName: 'Delete this endpoint',
};

/* --- the setting --------------------------------------------------------------- */

test('decoration is off by default, so it is opt-in rather than opt-out', () => {
  assert.equal(emojisEnabled(memory()), false);
  assert.equal(emojisEnabled(undefined), false);
});

test('the setting persists both ways', () => {
  const storage = memory();
  setEmojisEnabled(storage, true);
  assert.equal(emojisEnabled(storage), true);
  setEmojisEnabled(storage, false);
  assert.equal(emojisEnabled(storage), false);
});

test('an unrecognised stored value reads as off rather than on', () => {
  /* Failing towards no decoration is the safe direction for an opt-in setting. */
  const storage = memory();
  storage.map.set(DIALOG_EMOJI_SETTING, 'maybe');
  assert.equal(emojisEnabled(storage), false);
});

/* --- what gets decorated ------------------------------------------------------- */

test('a heading and body are decorated when the setting is on', () => {
  const dialog = buildDialog(on(), 'destructive', PARTS);
  assert.ok(dialog.heading.startsWith(DIALOG_EMOJI.destructive));
  assert.ok(dialog.body.startsWith(DIALOG_EMOJI.destructive));
});

test('the same copy appears without emoji when the setting is off', () => {
  const dialog = buildDialog(memory(), 'destructive', PARTS);
  assert.deepEqual(dialog, PARTS);
});

test('every kind has its own emoji and none is shared', () => {
  const kinds = Object.keys(DIALOG_EMOJI) as DialogKind[];
  assert.equal(new Set(Object.values(DIALOG_EMOJI)).size, kinds.length,
    'two kinds share an emoji, so the mark no longer identifies the category');
  for (const kind of kinds) {
    assert.ok(decorateDialogText(on(), kind, 'x').startsWith(DIALOG_EMOJI[kind]));
  }
});

test('decorating twice does not stack, so a re-render cannot double it', () => {
  const storage = on();
  const once = decorateDialogText(storage, 'warning', 'Careful');
  assert.equal(decorateDialogText(storage, 'warning', once), once);
});

test('empty text stays empty rather than becoming a bare emoji', () => {
  assert.equal(decorateDialogText(on(), 'info', ''), '');
  assert.equal(decorateDialogText(on(), 'info', '   '), '   ');
});

test('the facts survive decoration untouched', () => {
  /* The emoji is added to the copy, never in place of any of it. */
  const dialog = buildDialog(on(), 'destructive', PARTS);
  assert.ok(dialog.heading.includes(PARTS.heading));
  assert.ok(dialog.body.includes(PARTS.body));
  assert.ok(dialog.body.includes('1001'), 'the affected object dropped out of the message');
  assert.ok(dialog.body.includes('cannot be undone'));
});

/* --- what must never be decorated ---------------------------------------------- */

test('no emoji ever reaches a button, an action label or an accessible name', () => {
  /* The assertion that matters most. Screen readers announce an emoji by its Unicode
   * description, so one in an accessible name is heard on every single focus. */
  const dialog = buildDialog(on(), 'destructive', PARTS);
  for (const field of ['confirmLabel', 'cancelLabel', 'accessibleName'] as const) {
    for (const emoji of ALL_DIALOG_EMOJI) {
      assert.ok(!dialog[field].includes(emoji), `${field} carries ${emoji}`);
    }
    assert.equal(dialog[field], PARTS[field], `${field} was altered at all`);
  }
});

test('control text is unchanged whatever the setting says', () => {
  for (const storage of [memory(), on(), undefined]) {
    assert.equal(buildDialog(storage, 'error', PARTS).confirmLabel, 'Delete');
  }
  assert.equal(controlText('Delete'), 'Delete');
});

test('control text is a real function, not a comment somebody has to remember', () => {
  /* A dialog builder reaching for decorateDialogText on a button label is a mistake
   * nobody would catch in review. Reaching for controlText is not. */
  assert.equal(typeof controlText, 'function');
  assert.equal(controlText(''), '');
});

test('every kind refuses to decorate a control, not only the destructive one', () => {
  for (const kind of Object.keys(DIALOG_EMOJI) as DialogKind[]) {
    const dialog = buildDialog(on(), kind, PARTS);
    assert.equal(dialog.confirmLabel, PARTS.confirmLabel, `${kind} decorated a button`);
    assert.equal(dialog.accessibleName, PARTS.accessibleName, `${kind} decorated an accessible name`);
  }
});
