/**
 * The command palette's list, its search and its keyboard.
 *
 * Built against fixtures rather than the real design: a test that reads the live console
 * passes for the wrong reason the moment somebody adds a control, and stops telling you
 * anything about the ordering it was written to pin down.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PALETTE_CHORD, buildPalette, isPaletteChord, moveSelection, searchPalette,
} from '../../app/renderer/src/command-palette.ts';

const ctl = (id, label, info) => ({ id, label, kind: 'switch', info });

const SCREENS = {
  dash: { label: 'Dashboard', title: 'Dashboard', sub: 'What the PBX is doing right now.', groups: [] },
  endpoints: {
    label: 'Endpoints', title: 'PJSIP endpoints', sub: 'Phones and softphones.',
    groups: [
      { title: 'Identity', ctls: [ctl('e_callerid', 'Caller ID presentation', 'Whether the far end is told who is calling.')] },
      { title: 'Media', ctls: [ctl('e_encryption', 'media_encryption'), ctl('e_dtmf', 'dtmf_mode')] },
    ],
  },
  appearance: { label: 'Appearance', title: 'Appearance', groups: [] },
};
const ORDER = ['dash', 'endpoints', 'appearance'];
const APPEARANCE = [{ title: 'Typography', ctls: [ctl('ap_family', 'Font family'), ctl('ap_weight', 'Weight')] }];

const palette = () => buildPalette(ORDER, SCREENS, APPEARANCE);
const labels = (matches) => matches.map((match) => match.entry.label);

/* --- the list is derived, never kept beside the thing it describes ---------------------- */

test('every destination and every one of its settings is listed', () => {
  /* A hand-written palette is a second inventory of the same thing, and the two diverge the
   * first time somebody adds a control -- always with the palette as the stale one. */
  const found = palette();
  assert.deepEqual(found.filter((entry) => entry.kind === 'destination').map((entry) => entry.label),
    ['Dashboard', 'Endpoints', 'Appearance']);
  assert.deepEqual(found.filter((entry) => entry.kind === 'setting').map((entry) => entry.controlId),
    ['e_callerid', 'e_encryption', 'e_dtmf']);
  assert.deepEqual(found.filter((entry) => entry.kind === 'appearance').map((entry) => entry.controlId),
    ['ap_family', 'ap_weight']);
});

test('a setting carries the screen and control needed to reach it', () => {
  /* Landing on the right screen and leaving somebody to hunt is not teleporting. */
  const entry = palette().find((candidate) => candidate.controlId === 'e_dtmf');
  assert.equal(entry.screen, 'endpoints');
  assert.equal(entry.context, 'Endpoints · Media');
});

test('a destination unknown to the screens is skipped rather than half-built', () => {
  const found = buildPalette([...ORDER, 'not-a-screen'], SCREENS, APPEARANCE);
  assert.ok(found.every((entry) => entry.label !== undefined && entry.screen !== 'not-a-screen'));
});

test('a repeated key keeps the first entry rather than whichever came last', () => {
  /* Two things answering to one result would teleport somewhere arbitrary, and "last wins"
   * makes that depend on iteration order. */
  const twice = buildPalette(['endpoints', 'endpoints'], SCREENS, APPEARANCE);
  const dtmf = twice.filter((entry) => entry.controlId === 'e_dtmf');
  assert.equal(dtmf.length, 1);
});

test('an empty design produces an empty palette rather than throwing', () => {
  assert.deepEqual(buildPalette([], {}, []), []);
});

/* --- searching ---------------------------------------------------------------------------- */

test('an empty query lists everything in the design order', () => {
  assert.deepEqual(labels(searchPalette(palette(), '   ')), palette().map((entry) => entry.label));
});

test('a label that starts with what was typed comes before one that merely contains it', () => {
  /* People type the first few letters of something they already know the name of. The
   * fixture deliberately lists the contains-match FIRST, so passing cannot be an accident
   * of the design order. */
  const screens = { one: { label: 'One', title: 'One', groups: [{ title: 'G', ctls: [
    ctl('a', 'Legacy dtmf_mode'), ctl('b', 'dtmf_mode'),
  ] }] } };
  const found = labels(searchPalette(buildPalette(['one'], screens, []), 'dtmf'));
  assert.deepEqual(found, ['dtmf_mode', 'Legacy dtmf_mode']);
});

test('within one tier the design order is kept, so a familiar result stops moving', () => {
  const found = labels(searchPalette(palette(), 'e'));
  const encryption = found.indexOf('media_encryption');
  const dtmf = found.indexOf('dtmf_mode');
  assert.ok(encryption >= 0 && dtmf >= 0);
  assert.ok(encryption < dtmf, 'a stable sort would have kept the design order');
});

test('searching is case-insensitive in both directions', () => {
  assert.deepEqual(labels(searchPalette(palette(), 'FONT')), ['Font family']);
  assert.deepEqual(labels(searchPalette(palette(), 'caller')), ['Caller ID presentation']);
});

test('what a setting does is searched as well as its name', () => {
  /* For somebody who remembers what it does and not what it is called. */
  const found = labels(searchPalette(palette(), 'far end'));
  assert.deepEqual(found, ['Caller ID presentation']);
});

test('a detail-only match is ranked below every label match', () => {
  const found = searchPalette(palette(), 'endpoints');
  assert.equal(found[0].entry.label, 'Endpoints');
  assert.ok(found.slice(1).every((match) => match.at === -1));
});

test('typed text is matched literally, never as a pattern', () => {
  /* Regex is an explicit opt-in everywhere else in this console. A palette that treated a
   * typed dot as "any character" would return the wrong thing rather than nothing. */
  assert.deepEqual(searchPalette(palette(), 'dtmf.mode'), []);
  assert.deepEqual(searchPalette(palette(), '.*'), []);
});

test('nothing matching is an empty list, not everything', () => {
  assert.deepEqual(searchPalette(palette(), 'zzzz'), []);
});

/* --- the keyboard ------------------------------------------------------------------------- */

test('the chord is control and shift and F, and it is stated in one place', () => {
  assert.deepEqual({ ...PALETTE_CHORD }, { ctrl: true, shift: true, key: 'f' });
  assert.ok(isPaletteChord({ ctrlKey: true, shiftKey: true, key: 'F' }));
  assert.ok(isPaletteChord({ ctrlKey: true, shiftKey: true, key: 'f' }));
});

test('a near miss does not open it', () => {
  const misses = [
    { ctrlKey: true, shiftKey: false, key: 'f' },
    { ctrlKey: false, shiftKey: true, key: 'f' },
    { ctrlKey: true, shiftKey: true, key: 'g' },
    { ctrlKey: true, shiftKey: true, altKey: true, key: 'f' },
  ];
  for (const miss of misses) assert.equal(isPaletteChord(miss), false, JSON.stringify(miss));
});

test('the key is compared, not the physical position', () => {
  /* So a non-QWERTY layout opens the palette with the key that has F printed on it. */
  assert.ok(isPaletteChord({ ctrlKey: true, shiftKey: true, key: 'F', code: 'KeyA' }));
});

test('the highlight wraps at both ends', () => {
  /* A list you can fall off the end of makes somebody look at the screen to find out where
   * they are, which is what keyboard navigation exists to avoid. */
  assert.equal(moveSelection(3, 2, 1), 0);
  assert.equal(moveSelection(3, 0, -1), 2);
  assert.equal(moveSelection(3, 0, 1), 1);
});

test('an empty list highlights nothing rather than a negative row', () => {
  assert.equal(moveSelection(0, 0, 1), 0);
  assert.equal(moveSelection(0, 0, -1), 0);
});
