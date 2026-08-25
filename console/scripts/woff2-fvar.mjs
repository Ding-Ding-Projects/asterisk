#!/usr/bin/env node
/**
 * Reads the variation axes out of a WOFF2 font, so a claim about a variable font's axes is a
 * measurement of the shipped file rather than a repetition of the URL it was requested from.
 *
 * This exists because the `.msym` axis-pin question could not be settled any other way. The
 * font stylesheet asks Google Fonts for `opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`,
 * but what gstatic actually serves is its own decision: it may instance a variable font down
 * to a static one, drop an axis, or narrow a range, and the served file is the only thing the
 * application renders from. An axis that is absent from the file cannot be pinned, and an axis
 * whose default already equals the pinned value is pinned to no effect — two opposite readings
 * of the same rule, distinguishable only by opening the binary.
 *
 * Deliberately narrow, and it fails closed rather than guessing: WOFF2 only, and only the
 * `fvar` table, which the format never transforms (only `glyf` and `loca` carry a transform),
 * so it appears verbatim in the decompressed stream. Anything else throws by name.
 */
import { brotliDecompressSync } from 'node:zlib';

/** WOFF2's known-table index, in the order the specification numbers it (0..62). */
const KNOWN_TABLE_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

const WOFF2_SIGNATURE = 'wOF2';
const WOFF2_HEADER_BYTES = 48;

/** F2Dot14 and Fixed both appear in `fvar`; the axis record uses Fixed (16.16). */
const fixedToNumber = (raw) => raw / 65536;

/**
 * Splits a WOFF2 into its tables. Returns a Map of tag -> Buffer of that table's bytes as they
 * appear in the decompressed stream.
 */
export function readWoff2Tables(buffer) {
  if (buffer.length < WOFF2_HEADER_BYTES || buffer.toString('ascii', 0, 4) !== WOFF2_SIGNATURE) {
    throw new Error('woff2-fvar: not a WOFF2 font (bad 4-byte signature)');
  }
  const numTables = buffer.readUInt16BE(12);
  const totalCompressedSize = buffer.readUInt32BE(20);
  let offset = WOFF2_HEADER_BYTES;

  // UIntBase128: up to five 7-bit groups, most significant first, high bit as the continuation flag.
  const readUIntBase128 = () => {
    let accumulated = 0;
    for (let group = 0; group < 5; group += 1) {
      const byte = buffer[offset];
      offset += 1;
      accumulated = ((accumulated << 7) | (byte & 0x7f)) >>> 0;
      if ((byte & 0x80) === 0) return accumulated;
    }
    throw new Error('woff2-fvar: malformed UIntBase128 in the table directory');
  };

  const directory = [];
  for (let index = 0; index < numTables; index += 1) {
    const flags = buffer[offset];
    offset += 1;
    const knownIndex = flags & 0x3f;
    let tag;
    if (knownIndex === 0x3f) {
      tag = buffer.toString('ascii', offset, offset + 4);
      offset += 4;
    } else {
      tag = KNOWN_TABLE_TAGS[knownIndex];
      if (!tag) throw new Error(`woff2-fvar: unknown table index ${knownIndex} in the table directory`);
    }
    const originalLength = readUIntBase128();
    // Transform version 0 means "transformed" for glyf/loca and "untransformed" for every
    // other table, which is the one genuinely counter-intuitive rule in the format.
    const transformVersion = (flags >> 6) & 0x03;
    const transformed = (tag === 'glyf' || tag === 'loca') ? transformVersion === 0 : transformVersion !== 0;
    const length = transformed ? readUIntBase128() : originalLength;
    directory.push({ tag, length });
  }

  const decompressed = brotliDecompressSync(buffer.subarray(offset, offset + totalCompressedSize));
  const tables = new Map();
  let cursor = 0;
  for (const entry of directory) {
    tables.set(entry.tag, decompressed.subarray(cursor, cursor + entry.length));
    cursor += entry.length;
  }
  return tables;
}

/**
 * The font's variation axes, in `fvar` order.
 *
 * Returns an empty array for a font with no `fvar` table — a static font, which is a real and
 * meaningful answer here rather than an error, because "the served face is not variable at all"
 * is one of the two readings this reader exists to distinguish.
 */
export function readVariationAxes(buffer) {
  const fvar = readWoff2Tables(buffer).get('fvar');
  if (!fvar) return [];
  const axisArrayOffset = fvar.readUInt16BE(4);
  const axisCount = fvar.readUInt16BE(8);
  const axisSize = fvar.readUInt16BE(10);
  const axes = [];
  for (let index = 0; index < axisCount; index += 1) {
    const at = axisArrayOffset + (index * axisSize);
    axes.push({
      tag: fvar.toString('ascii', at, at + 4),
      minimum: fixedToNumber(fvar.readInt32BE(at + 4)),
      default: fixedToNumber(fvar.readInt32BE(at + 8)),
      maximum: fixedToNumber(fvar.readInt32BE(at + 12)),
    });
  }
  return axes;
}
