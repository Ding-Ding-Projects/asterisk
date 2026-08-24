/**
 * Reading an image's dimensions WITHOUT decoding it.
 *
 * This exists because of the ordering. `logo-customization.ts` refuses an image whose
 * pixel count is too large, and that refusal is worthless if the only way to learn the
 * pixel count is to decode the image first -- a decompression bomb is small on disk and
 * enormous in memory, so handing it to a decoder to ask how big it is has already done
 * the damage the check was written to prevent.
 *
 * Every format below states its dimensions in a header, near the front, in a fixed place.
 * So they are read from the bytes directly, the bound is applied, and only something that
 * passed is ever given to a real decoder.
 *
 * Nothing here trusts a length field far enough to allocate from it. Every read is bounds
 * checked against the buffer actually supplied, because a truncated or hostile file will
 * happily claim a chunk runs past the end of itself.
 */

export interface HeaderFacts {
  width: number;
  height: number;
  /** How many frames the header admits to. One unless a container says otherwise. */
  frames: number;
}

/** Enough of the front of a file to hold any header below. Never the whole file. */
export const HEADER_BYTES = 64 * 1024;

const u16be = (b: Uint8Array, i: number): number => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number): number =>
  ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u24le = (b: Uint8Array, i: number): number => b[i] + (b[i + 1] << 8) + (b[i + 2] << 16);

/**
 * The dimensions a file's own header states, or undefined when they cannot be read.
 *
 * Undefined means "this was not readable", never "this is fine" -- the caller refuses on
 * undefined rather than proceeding with a guess, because a header that cannot be parsed is
 * exactly the file that deserves the least benefit of the doubt.
 */
export function readHeaderFacts(bytes: Uint8Array): HeaderFacts | undefined {
  return pngFacts(bytes) ?? jpegFacts(bytes) ?? webpFacts(bytes) ?? svgFacts(bytes);
}

/** PNG states width and height in the IHDR chunk, always the first chunk, always at 16. */
function pngFacts(b: Uint8Array): HeaderFacts | undefined {
  if (b.length < 24) return undefined;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => b[index] === byte)) return undefined;
  if (String.fromCharCode(b[12], b[13], b[14], b[15]) !== 'IHDR') return undefined;
  /* APNG announces its frame count in an acTL chunk, which must precede the first IDAT.
   * A PNG viewer that ignores it shows one frame; this console refuses animation, so it
   * is worth finding rather than ignoring. */
  return { width: u32be(b, 16), height: u32be(b, 20), frames: pngFrames(b) };
}

function pngFrames(b: Uint8Array): number {
  let offset = 8;
  /* Walk the chunk list rather than searching for the four letters anywhere in the file,
   * which would match the same bytes appearing inside compressed pixel data. */
  while (offset + 12 <= b.length) {
    const length = u32be(b, offset);
    const type = String.fromCharCode(b[offset + 4], b[offset + 5], b[offset + 6], b[offset + 7]);
    if (type === 'acTL' && offset + 12 <= b.length) return Math.max(1, u32be(b, offset + 8));
    if (type === 'IDAT' || type === 'IEND') return 1;
    /* A chunk claiming to run past the buffer is either truncated or lying; either way
     * there is nothing further to read. */
    const next = offset + 12 + length;
    if (length < 0 || next <= offset || next > b.length) return 1;
    offset = next;
  }
  return 1;
}

/**
 * JPEG states its dimensions in a start-of-frame marker, whose position depends on how
 * much metadata came first -- so the marker chain has to be walked.
 */
function jpegFacts(b: Uint8Array): HeaderFacts | undefined {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 4 <= b.length) {
    if (b[offset] !== 0xff) { offset += 1; continue; }
    const marker = b[offset + 1];
    /* Padding and the standalone markers carry no length field to skip by. */
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { offset += 2; continue; }
    const length = u16be(b, offset + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf
      && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      if (offset + 9 > b.length) return undefined;
      return { width: u16be(b, offset + 7), height: u16be(b, offset + 5), frames: 1 };
    }
    if (length < 2) return undefined;
    offset += 2 + length;
  }
  return undefined;
}

/** WebP has three shapes, and the dimensions sit in a different place in each. */
function webpFacts(b: Uint8Array): HeaderFacts | undefined {
  if (b.length < 16) return undefined;
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'RIFF') return undefined;
  if (String.fromCharCode(b[8], b[9], b[10], b[11]) !== 'WEBP') return undefined;
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === 'VP8 ' && b.length >= 30) {
    /* Lossy: 14 bytes of frame tag, then the dimensions, each 14 bits with two scaling
     * bits above them that are not part of the size. */
    return {
      width: (b[26] | (b[27] << 8)) & 0x3fff,
      height: (b[28] | (b[29] << 8)) & 0x3fff,
      frames: 1,
    };
  }
  if (chunk === 'VP8L' && b.length >= 25) {
    /* Lossless packs both dimensions, minus one each, into 28 bits after a signature. */
    const packed = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1, frames: 1 };
  }
  if (chunk === 'VP8X' && b.length >= 30) {
    /* Extended: canvas size minus one, 24 bits each, and a flag bit that says animation.
     * The flag is the honest frame answer here -- the count lives in ANMF chunks further
     * in, and one animation is already one too many. */
    const animated = (b[20] & 0x02) !== 0;
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1, frames: animated ? 2 : 1 };
  }
  return undefined;
}

/** SVG is text, so its size comes from attributes rather than from an offset. */
function svgFacts(b: Uint8Array): HeaderFacts | undefined {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(0, 4096));
  const root = /<svg\b[^>]*>/iu.exec(head);
  if (!root) return undefined;
  /* Regex LITERALS, never a pattern built from a string: a string pattern needs doubled
   * backslashes, and anything that writes this file through a shell strips one level --
   * which turns \b into a literal backspace and \s into the letter s, silently, so the
   * pattern matches nothing and every SVG reports no size. A literal carries single
   * backslashes and survives. */
  const attribute = (pattern: RegExp): number | undefined => {
    const found = pattern.exec(root[0]);
    if (!found) return undefined;
    const value = Number.parseFloat(found[1]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const width = attribute(/\bwidth\s*=\s*["']([^"']+)["']/iu);
  const height = attribute(/\bheight\s*=\s*["']([^"']+)["']/iu);
  if (width !== undefined && height !== undefined) return { width, height, frames: 1 };
  /* A great many SVGs carry only a viewBox and are sized by whatever draws them. Its
   * last two numbers are the width and height in user units. */
  const box = /\bviewBox\s*=\s*["']\s*[-\d.eE]+[,\s]+[-\d.eE]+[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)/u.exec(root[0]);
  if (!box) return undefined;
  const boxWidth = Number.parseFloat(box[1]);
  const boxHeight = Number.parseFloat(box[2]);
  if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight) || boxWidth <= 0 || boxHeight <= 0) return undefined;
  return { width: boxWidth, height: boxHeight, frames: 1 };
}
