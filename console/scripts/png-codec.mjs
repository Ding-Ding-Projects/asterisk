#!/usr/bin/env node
/**
 * A minimal, dependency-free PNG decoder and encoder.
 *
 * The design-parity diff tool needs to open the reference and built captures, compare
 * their pixels, and write a labelled side-by-side comparison image back to disk. Pulling
 * in an image library for that is unnecessary: Node already ships the one genuinely hard
 * part (DEFLATE, via `node:zlib`), and the rest of PNG is chunk framing plus a small,
 * well-specified per-scanline unfilter/filter pass. Writing it out here keeps the whole
 * evidence pipeline dependency-free and auditable in one file.
 *
 * Deliberately narrow support, and it FAILS CLOSED outside that support rather than
 * guessing: 8-bit depth, non-interlaced, colour type 0 (greyscale), 2 (RGB) or 6 (RGBA).
 * That covers every ordinary screenshot a capture tool produces. Anything else (16-bit
 * depth, a palette, Adam7 interlacing) throws a named, specific error instead of silently
 * decoding garbage — the same "fail rather than guess" rule this project applies to every
 * other reader of externally produced evidence.
 */
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CHANNELS_FOR_COLOR_TYPE = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** @typedef {{ width: number, height: number, pixels: Uint8ClampedArray }} DecodedImage
 *  `pixels` is always RGBA, four bytes per pixel, row-major, top-to-bottom — regardless of
 *  the source PNG's own colour type — so every caller downstream works against one shape. */

function readChunks(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('png-codec: not a PNG (bad 8-byte signature)');
  }
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('png-codec: truncated chunk header');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error(`png-codec: truncated '${type}' chunk`);
    const data = buffer.subarray(dataStart, dataEnd);
    const declaredCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(buffer.subarray(offset + 4, dataEnd)) >>> 0;
    if (declaredCrc !== actualCrc) throw new Error(`png-codec: CRC mismatch in '${type}' chunk (corrupt file)`);
    chunks.push({ type, data });
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }
  return chunks;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const a = x >= bytesPerPixel ? out[rowStart + x - bytesPerPixel] : 0;
      const b = y > 0 ? out[prevRowStart + x] : 0;
      const c = y > 0 && x >= bytesPerPixel ? out[prevRowStart + x - bytesPerPixel] : 0;
      let reconstructed;
      switch (filterType) {
        case 0: reconstructed = value; break;
        case 1: reconstructed = value + a; break;
        case 2: reconstructed = value + b; break;
        case 3: reconstructed = value + Math.floor((a + b) / 2); break;
        case 4: reconstructed = value + paethPredictor(a, b, c); break;
        default: throw new Error(`png-codec: unsupported scanline filter type ${filterType}`);
      }
      out[rowStart + x] = reconstructed & 0xff;
    }
    rawOffset += stride;
  }
  return out;
}

/** Decodes a PNG buffer into `{ width, height, pixels }`, `pixels` always RGBA. */
export function decodePNG(buffer) {
  const chunks = readChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR');
  if (!ihdr) throw new Error('png-codec: missing IHDR chunk');
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data.readUInt8(8);
  const colorType = ihdr.data.readUInt8(9);
  const interlace = ihdr.data.readUInt8(12);
  if (bitDepth !== 8) throw new Error(`png-codec: unsupported bit depth ${bitDepth} (only 8-bit PNGs are supported)`);
  if (interlace !== 0) throw new Error('png-codec: interlaced (Adam7) PNGs are not supported');
  const channels = CHANNELS_FOR_COLOR_TYPE[colorType];
  if (!channels) throw new Error(`png-codec: unsupported colour type ${colorType} (palette images are not supported)`);
  if (width <= 0 || height <= 0) throw new Error(`png-codec: invalid dimensions ${width}x${height}`);

  const idatChunks = chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data);
  if (idatChunks.length === 0) throw new Error('png-codec: no IDAT chunks found');
  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);

  const bytesPerPixel = channels;
  const expectedRawLength = height * (1 + width * bytesPerPixel);
  if (inflated.length !== expectedRawLength) {
    throw new Error(`png-codec: decompressed size ${inflated.length} does not match expected ${expectedRawLength} — corrupt or truncated capture`);
  }
  const unfiltered = unfilter(inflated, width, height, bytesPerPixel);

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, srcOffset = 0, dstOffset = 0; i < width * height; i += 1, srcOffset += channels, dstOffset += 4) {
    if (colorType === 0) {
      const gray = unfiltered[srcOffset];
      pixels[dstOffset] = gray; pixels[dstOffset + 1] = gray; pixels[dstOffset + 2] = gray; pixels[dstOffset + 3] = 255;
    } else if (colorType === 2) {
      pixels[dstOffset] = unfiltered[srcOffset]; pixels[dstOffset + 1] = unfiltered[srcOffset + 1]; pixels[dstOffset + 2] = unfiltered[srcOffset + 2]; pixels[dstOffset + 3] = 255;
    } else if (colorType === 4) {
      const gray = unfiltered[srcOffset];
      pixels[dstOffset] = gray; pixels[dstOffset + 1] = gray; pixels[dstOffset + 2] = gray; pixels[dstOffset + 3] = unfiltered[srcOffset + 1];
    } else {
      pixels[dstOffset] = unfiltered[srcOffset]; pixels[dstOffset + 1] = unfiltered[srcOffset + 1]; pixels[dstOffset + 2] = unfiltered[srcOffset + 2]; pixels[dstOffset + 3] = unfiltered[srcOffset + 3];
    }
  }
  return { width, height, pixels };
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Encodes `{ width, height, pixels }` (RGBA) into a PNG buffer. Always emits colour type 6
 *  (RGBA) at filter type 0 (None) — larger than an optimally filtered PNG, but simple,
 *  correct, and round-trips exactly through {@link decodePNG}. */
export function encodePNG({ width, height, pixels }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`png-codec: invalid dimensions for encode ${width}x${height}`);
  }
  if (pixels.length !== width * height * 4) {
    throw new Error(`png-codec: pixel buffer length ${pixels.length} does not match ${width}x${height}x4`);
  }
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type 0 (None)
    raw.set(pixels.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const compressed = deflateSync(raw, { level: 9 });

  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}
