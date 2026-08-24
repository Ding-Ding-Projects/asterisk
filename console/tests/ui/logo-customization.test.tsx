/**
 * Choosing the console's own mark.
 *
 * An image file is untrusted input that arrives looking harmless, so most of these tests
 * are about the bytes disagreeing with the label, and about the bound a decompression
 * bomb actually crosses -- which is pixels, not file size.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCEPTED_FORMATS, DEFAULT_PRESET_ID, LOGO_PRESETS, LOGO_SETTING, MAX_DECODED_PIXELS,
  MAX_DIMENSION, MAX_FILE_BYTES, NEVER_CHANGED_BY_A_MARK,
  acceptLogo, chooseCustom, choosePreset, currentChoice, resetLogo, sniffFormat,
  type ImageFacts, type LogoStorage,
} from '../../app/renderer/src/logo-customization.ts';
import { IDENTITY } from '../../app/renderer/src/display-name.ts';

const memory = (): LogoStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const SVG = new TextEncoder().encode('<?xml version="1.0"?>\n<!-- a mark -->\n<svg xmlns="x"></svg>');

const facts = (over: Partial<ImageFacts> = {}): ImageFacts => ({ width: 512, height: 512, frames: 1, ...over });

/* --- the bytes decide, not the label --------------------------------------------------- */

test('each accepted format is recognised by its own leading bytes', () => {
  assert.equal(sniffFormat(PNG), 'png');
  assert.equal(sniffFormat(JPEG), 'jpeg');
  assert.equal(sniffFormat(WEBP), 'webp');
  assert.equal(sniffFormat(SVG), 'svg');
});

test('an SVG is found after a declaration and a comment, not at a fixed offset', () => {
  /* Exporters put all sorts in front of the root element, and a fixed-offset check would
   * reject perfectly ordinary files. */
  assert.equal(sniffFormat(new TextEncoder().encode('   \n<svg viewBox="0 0 1 1"/>')), 'svg');
});

test('something that is none of them is refused rather than guessed at', () => {
  assert.equal(sniffFormat(new TextEncoder().encode('MZ this is an executable')), undefined);
  assert.equal(sniffFormat(new Uint8Array([1, 2, 3])), undefined);
});

test('a file whose contents contradict its name is used by its contents', () => {
  /* A PNG named .jpg is ordinary. A file claiming PNG and containing something else is
   * the case this exists for -- and the claim is the thing that turned out untrue. */
  const accepted = acceptLogo(PNG, facts(), { fileName: 'mark.jpg', mimeType: 'image/jpeg' });
  assert.ok(!('problems' in accepted));
  assert.equal(accepted.format, 'png');
});

test('a mislabelled file is reported rather than refused', () => {
  /* Usually somebody's export settings rather than an attack, and the bytes were used
   * either way -- but they should be told. */
  const accepted = acceptLogo(PNG, facts(), { fileName: 'mark.jpg' });
  assert.ok(!('problems' in accepted));
  assert.ok(accepted.notices.some((notice) => /named as jpeg and is actually png/u.test(notice)));
});

test('a correctly labelled file produces no mismatch notice', () => {
  const accepted = acceptLogo(PNG, facts(), { fileName: 'mark.png', mimeType: 'image/png' });
  assert.ok(!('problems' in accepted));
  assert.ok(!accepted.notices.some((notice) => /actually/u.test(notice)));
});

test('an unrecognised file names what it is not, rather than repeating its claim', () => {
  const rejected = acceptLogo(new Uint8Array([1, 2, 3]), facts(), { fileName: 'mark.png' });
  assert.ok('problems' in rejected);
  assert.match(rejected.problems[0].message, /whatever its name says/u);
});

/* --- pixels, not only bytes -------------------------------------------------------------- */

test('a decompression bomb is caught by its pixels, which no byte limit would catch', () => {
  /* Small on disk, enormous in memory. This is the whole reason the pixel bound exists
   * beside the byte bound rather than instead of it. */
  const bomb = acceptLogo(PNG, facts({ width: 60000, height: 60000 }));
  assert.ok('problems' in bomb);
  assert.ok(bomb.problems.some((problem) => /more pixels than this console will hold/u.test(problem.message)));
  assert.ok(PNG.length < MAX_FILE_BYTES, 'the fixture is not small, so this proves nothing');
});

test('an oversized side is refused even when the total is within the pixel bound', () => {
  const long = acceptLogo(PNG, facts({ width: MAX_DIMENSION + 1, height: 4 }));
  assert.ok('problems' in long);
  assert.ok(long.problems.some((problem) => /pixels on a side/u.test(problem.message)));
});

test('an image at both bounds exactly is accepted', () => {
  const side = Math.sqrt(MAX_DECODED_PIXELS);
  const accepted = acceptLogo(PNG, facts({ width: side, height: side }));
  assert.ok(!('problems' in accepted));
});

test('an animated image is refused', () => {
  const animated = acceptLogo(WEBP, facts({ frames: 12 }));
  assert.ok('problems' in animated);
  assert.ok(animated.problems.some((problem) => /loop behind the interface/u.test(problem.message)));
});

test('an image reporting no usable size is refused before anything else is read', () => {
  for (const bad of [{ width: 0 }, { height: -1 }, { width: Number.NaN }]) {
    assert.ok('problems' in acceptLogo(PNG, facts(bad)), `${JSON.stringify(bad)} was accepted`);
  }
});

test('an empty or oversized file is refused', () => {
  assert.ok('problems' in acceptLogo(new Uint8Array(), facts()));
  const huge = new Uint8Array(MAX_FILE_BYTES + 1);
  huge.set(PNG);
  assert.ok('problems' in acceptLogo(huge, facts()));
});

test('a raster mark says plainly that it will be resampled', () => {
  /* Stated before it becomes the mark rather than discovered when it looks soft in the
   * title bar. */
  for (const bytes of [PNG, JPEG, WEBP]) {
    const accepted = acceptLogo(bytes, facts());
    assert.ok(!('problems' in accepted));
    assert.ok(accepted.notices.some((notice) => /resampled/u.test(notice)));
  }
  const vector = acceptLogo(SVG, facts());
  assert.ok(!('problems' in vector));
  assert.ok(!vector.notices.some((notice) => /resampled/u.test(notice)));
});

/* --- nothing partially applied, and identity untouched -------------------------------------- */

test('a rejected file leaves the previous mark exactly as it was', () => {
  /* A half-applied logo is a console that looks broken with no obvious way back. */
  const storage = memory();
  choosePreset(storage, 'handset');
  const rejected = acceptLogo(new Uint8Array([1, 2, 3]), facts());
  assert.ok('problems' in rejected);
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: 'handset' });
});

test('nothing a mark can change appears in the identity', () => {
  /* The same rule as the display name: a mark that moved the data directory would orphan
   * every stored profile and credential. There is deliberately no path from here to it. */
  for (const field of NEVER_CHANGED_BY_A_MARK) {
    const value = (IDENTITY as unknown as Record<string, string>)[field];
    if (value === undefined) continue;
    const storage = memory();
    chooseCustom(storage, 'logo/custom-1.png');
    assert.equal((IDENTITY as unknown as Record<string, string>)[field], value,
      `${field} moved when a custom mark was chosen`);
  }
  assert.ok(Object.isFrozen(IDENTITY));
});

/* --- the stored choice ----------------------------------------------------------------------- */

test('with nothing stored the shipped preset is used', () => {
  assert.deepEqual(currentChoice(memory()), { kind: 'preset', presetId: DEFAULT_PRESET_ID });
  assert.deepEqual(currentChoice(undefined), { kind: 'preset', presetId: DEFAULT_PRESET_ID });
});

test('a preset round-trips and an unknown one is refused', () => {
  const storage = memory();
  assert.equal(choosePreset(storage, 'handset'), true);
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: 'handset' });
  assert.equal(choosePreset(storage, 'not-a-preset'), false);
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: 'handset' });
});

test('a custom mark round-trips', () => {
  const storage = memory();
  assert.equal(chooseCustom(storage, 'logo/custom-1.png'), true);
  assert.deepEqual(currentChoice(storage), { kind: 'custom', storedAt: 'logo/custom-1.png' });
});

test('a remote address is refused, on the way in and on the way out', () => {
  /* A remote mark is a network request on every launch, and a failed one is an app with
   * no logo. Refused when set, and ignored if some older version stored one. */
  const storage = memory();
  assert.equal(chooseCustom(storage, 'https://example.net/logo.png'), false);
  storage.map.set(LOGO_SETTING, JSON.stringify({ kind: 'custom', storedAt: 'http://example.net/x.png' }));
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: DEFAULT_PRESET_ID });
});

test('a corrupt stored choice falls back rather than throwing', () => {
  const storage = memory();
  storage.map.set(LOGO_SETTING, '{not json');
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: DEFAULT_PRESET_ID });
});

test('reset returns to the shipped mark in one action', () => {
  const storage = memory();
  chooseCustom(storage, 'logo/custom-1.png');
  resetLogo(storage);
  assert.deepEqual(currentChoice(storage), { kind: 'preset', presetId: DEFAULT_PRESET_ID });
});

test('every preset is a bundled asset rather than a URL', () => {
  for (const preset of LOGO_PRESETS) {
    assert.ok(preset.asset.startsWith('assets/'), `${preset.id} is not bundled`);
    assert.ok(!/^https?:/iu.test(preset.asset));
  }
  assert.ok(LOGO_PRESETS.some((preset) => preset.id === DEFAULT_PRESET_ID), 'the default names no preset');
});

test('every accepted format is one this module can identify', () => {
  /* So the list somebody reads and the bytes the code recognises cannot drift apart. */
  const samples: Record<string, Uint8Array> = { png: PNG, jpeg: JPEG, webp: WEBP, svg: SVG };
  for (const format of ACCEPTED_FORMATS) {
    assert.equal(sniffFormat(samples[format]), format, `${format} is advertised but not recognised`);
  }
});
