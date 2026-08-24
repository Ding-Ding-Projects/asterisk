/**
 * Reading dimensions from a header without decoding.
 *
 * The ordering is the whole point: a pixel bound that can only be checked by decoding
 * first has already handed a decompression bomb to a decoder. So these fixtures are built
 * byte by byte -- a real encoder would refuse to produce most of them, which is exactly
 * why they need to exist.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { readHeaderFacts } from '../../control-plane/image-facts.ts';

const be = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const le24 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const ascii = (text) => [...text].map((character) => character.charCodeAt(0));

const png = (width, height, extra = []) => new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ...be(13), ...ascii('IHDR'), ...be(width), ...be(height), 8, 6, 0, 0, 0, 0, 0, 0, 0,
  ...extra,
  ...be(0), ...ascii('IDAT'), 0, 0, 0, 0,
]);

const actl = (frames) => [...be(8), ...ascii('acTL'), ...be(frames), ...be(0), 0, 0, 0, 0];

const jpeg = (width, height, { comment = 0, marker = 0xc0 } = {}) => {
  const bytes = [0xff, 0xd8];
  if (comment > 0) {
    bytes.push(0xff, 0xfe, ((comment + 2) >> 8) & 255, (comment + 2) & 255, ...new Array(comment).fill(0x20));
  }
  bytes.push(0xff, marker, 0, 11, 8, (height >> 8) & 255, height & 255, (width >> 8) & 255, width & 255, 1, 1, 0x11, 0);
  return new Uint8Array(bytes);
};

const riff = (fourcc, payload) => {
  const body = [...ascii(fourcc), ...payload];
  return new Uint8Array([...ascii('RIFF'), ...le(body.length + 4), ...ascii('WEBP'), ...body]);
};

const webpLossy = (width, height) => riff('VP8 ', [
  0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a,
  width & 255, (width >> 8) & 0x3f, height & 255, (height >> 8) & 0x3f, 0, 0,
]);

const webpLossless = (width, height) => {
  const packed = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff('VP8L', [0, 0, 0, 0, 0x2f, ...le(packed), 0, 0, 0, 0]);
};

const webpExtended = (width, height, animated) => riff('VP8X', [
  0, 0, 0, 0, animated ? 0x02 : 0x00, 0, 0, 0,
  ...le24(width - 1), ...le24(height - 1), 0, 0, 0, 0,
]);

const svg = (text) => new TextEncoder().encode(text);

/* --- dimensions come out of the header ------------------------------------------------- */

test('a PNG states its size in IHDR, at a fixed place', () => {
  assert.deepEqual(readHeaderFacts(png(640, 480)), { width: 640, height: 480, frames: 1 });
});

test('a bomb is measured without being decoded', () => {
  /* Thirty kilopixels a side is nine hundred megapixels, and this fixture is under a
   * hundred bytes. Reading it costs nothing, which is the entire argument for header
   * parsing rather than asking a decoder how big something is. */
  const facts = readHeaderFacts(png(30000, 30000));
  assert.equal(facts.width * facts.height, 900_000_000);
});

test('an animated PNG admits its frames before the pixels start', () => {
  assert.equal(readHeaderFacts(png(16, 16, actl(24))).frames, 24);
});

test('a chunk name appearing inside pixel data is not mistaken for a chunk', () => {
  /* The four letters can occur anywhere in compressed data. Walking the chunk list is
   * what makes the difference between reading a header and grepping a file. */
  const decoy = [...be(8), ...ascii('IDAT'), ...ascii('acTL'), 0, 0, 0, 9, 0, 0, 0, 0];
  assert.equal(readHeaderFacts(png(8, 8, decoy)).frames, 1);
});

test('a JPEG is found by walking the marker chain, wherever the frame ends up', () => {
  assert.deepEqual(readHeaderFacts(jpeg(1024, 768)), { width: 1024, height: 768, frames: 1 });
  /* Metadata in front moves the frame marker, which is why its position cannot be assumed. */
  assert.deepEqual(readHeaderFacts(jpeg(1024, 768, { comment: 400 })), { width: 1024, height: 768, frames: 1 });
});

test('a progressive JPEG is read as readily as a baseline one', () => {
  assert.deepEqual(readHeaderFacts(jpeg(320, 200, { marker: 0xc2 })), { width: 320, height: 200, frames: 1 });
});

test('a JPEG huffman table is not mistaken for a frame', () => {
  /* 0xc4 sits inside the frame-marker range and is not a frame. Reading it as one would
   * produce dimensions out of a table of code lengths. */
  assert.equal(readHeaderFacts(jpeg(64, 48, { marker: 0xc4 })), undefined);
});

test('each of the three WebP shapes states its size in its own place', () => {
  assert.deepEqual(readHeaderFacts(webpLossy(800, 600)), { width: 800, height: 600, frames: 1 });
  assert.deepEqual(readHeaderFacts(webpLossless(800, 600)), { width: 800, height: 600, frames: 1 });
  assert.deepEqual(readHeaderFacts(webpExtended(800, 600, false)), { width: 800, height: 600, frames: 1 });
});

test('an animated WebP is caught by its flag rather than by counting frames', () => {
  /* The count lives further in, and one animation is already one too many. */
  assert.ok(readHeaderFacts(webpExtended(64, 64, true)).frames > 1);
});

test('an SVG is sized by its attributes, or by its viewBox when it has none', () => {
  assert.deepEqual(readHeaderFacts(svg('<svg width="120" height="40"></svg>')),
    { width: 120, height: 40, frames: 1 });
  assert.deepEqual(readHeaderFacts(svg('<?xml version="1.0"?><svg viewBox="0 0 24 24"/>')),
    { width: 24, height: 24, frames: 1 });
});

test('an SVG with a negative viewBox origin is still sized by its last two numbers', () => {
  assert.deepEqual(readHeaderFacts(svg('<svg viewBox="-10 -10 200 100"/>')),
    { width: 200, height: 100, frames: 1 });
});

/* --- unreadable means unreadable, never "fine" ------------------------------------------- */

test('anything unrecognised comes back undefined rather than guessed at', () => {
  for (const bytes of [new Uint8Array(), new Uint8Array([1, 2, 3]), svg('<html><body/></html>')]) {
    assert.equal(readHeaderFacts(bytes), undefined);
  }
});

test('a truncated file is not read past its own end', () => {
  /* A hostile or half-copied file will claim a chunk runs past the buffer. Every prefix of
   * every real header, cut at every possible point. */
  for (const bytes of [png(640, 480), jpeg(640, 480), webpLossy(640, 480), webpLossless(640, 480)]) {
    for (let length = 0; length < bytes.length; length += 1) {
      const facts = readHeaderFacts(bytes.slice(0, length));
      if (facts === undefined) continue;
      assert.ok(Number.isFinite(facts.width) && Number.isFinite(facts.height),
        `a ${length}-byte prefix produced ${JSON.stringify(facts)}`);
    }
  }
});

test('a PNG chunk claiming to run past the file does not loop or overrun', () => {
  const liar = [...be(0x7ffffff0), ...ascii('tEXt'), 0, 0, 0, 0];
  assert.equal(readHeaderFacts(png(8, 8, liar)).frames, 1);
});

test('a zero-length JPEG segment does not spin', () => {
  /* A length below two would step backwards, and a marker chain that steps backwards
   * never terminates. */
  assert.equal(readHeaderFacts(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xc0])), undefined);
});

test('an SVG claiming a nonsense size is refused rather than believed', () => {
  for (const text of ['<svg width="0" height="10"/>', '<svg width="abc" height="10"/>', '<svg/>']) {
    assert.equal(readHeaderFacts(svg(text)), undefined, `${text} was believed`);
  }
});
