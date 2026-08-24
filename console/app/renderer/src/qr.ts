/* Small in-process QR encoder for the local otpauth pairing surface.
 * Version 5, byte mode, error correction L is enough for the bounded pairing URI.
 * No network service or third-party image is involved. */
const SIZE = 37;
const MAX_QR_BYTES = 100;
const DATA_CODEWORDS = 108;
const TOTAL_CODEWORDS = 134;
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
let value = 1;
for (let i = 0; i < 255; i += 1) { GF_EXP[i] = value; GF_LOG[value] = i; value <<= 1; if (value & 0x100) value ^= 0x11d; }
for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255]!;

function multiply(a: number, b: number): number { return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!; }
function ecc(data: number[], count: number): number[] {
  const generator = [1];
  for (let i = 0; i < count; i += 1) { const next = Array(generator.length + 1).fill(0); for (let j = 0; j < generator.length; j += 1) { next[j] ^= generator[j]!; next[j + 1] ^= multiply(generator[j]!, GF_EXP[i]!); } generator.splice(0, generator.length, ...next); }
  const result = Array(count).fill(0);
  for (const byte of data) { const factor = byte ^ result[0]!; result.shift(); result.push(0); for (let i = 0; i < count; i += 1) result[i] ^= multiply(generator[i + 1]!, factor); }
  return result;
}
function bitsFor(value: number, length: number): number[] { return Array.from({ length }, (_, index) => (value >>> (length - index - 1)) & 1); }
function setFunction(matrix: (boolean | undefined)[][], reserved: boolean[][], row: number, col: number, bit: boolean): void { if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) { matrix[row]![col] = bit; reserved[row]![col] = true; } }
function finder(matrix: (boolean | undefined)[][], reserved: boolean[][], row: number, col: number): void { for (let r = -1; r <= 7; r += 1) for (let c = -1; c <= 7; c += 1) setFunction(matrix, reserved, row + r, col + c, r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))); }
function formatBits(mask: number): number[] { let data = (1 << 3) | mask; let bits = data << 10; const generator = 0x537; for (let i = 14; i >= 10; i -= 1) if ((bits >>> i) & 1) bits ^= generator << (i - 10); return bitsFor(((data << 10) | bits) ^ 0x5412, 15); }

export function qrMatrix(valueText: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(valueText));
  if (bytes.length > MAX_QR_BYTES) throw new Error('The pairing value is too long for the bundled QR encoder.');
  const dataBits = [...bitsFor(0b0100, 4), ...bitsFor(bytes.length, 8), ...bytes.flatMap((byte) => bitsFor(byte, 8))];
  while (dataBits.length < DATA_CODEWORDS * 8 && dataBits.length < DATA_CODEWORDS * 8 - 4) dataBits.push(0);
  while (dataBits.length % 8 !== 0) dataBits.push(0);
  const data: number[] = []; for (let i = 0; i < dataBits.length; i += 8) data.push(dataBits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0));
  for (let i = 0; data.length < DATA_CODEWORDS; i += 1) data.push(i % 2 === 0 ? 0xec : 0x11);
  const codewords = [...data, ...ecc(data, TOTAL_CODEWORDS - DATA_CODEWORDS)];
  const matrix: (boolean | undefined)[][] = Array.from({ length: SIZE }, () => Array(SIZE)); const reserved = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  finder(matrix, reserved, 0, 0); finder(matrix, reserved, 0, SIZE - 7); finder(matrix, reserved, SIZE - 7, 0);
  for (let i = 8; i < SIZE - 8; i += 1) { setFunction(matrix, reserved, 6, i, i % 2 === 0); setFunction(matrix, reserved, i, 6, i % 2 === 0); }
  for (const r of [6, 30]) for (const c of [6, 30]) if (!reserved[r]![c]) for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) setFunction(matrix, reserved, r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  setFunction(matrix, reserved, SIZE - 8, 8, true);
  const format = formatBits(0); for (let i = 0; i < 15; i += 1) { const a = i < 6 ? [i, 8] : i < 8 ? [i + 1, 8] : [SIZE - 15 + i, 8]; const b = i < 8 ? [8, SIZE - i - 1] : i < 9 ? [8, 15 - i] : [8, 15 - i - 1]; setFunction(matrix, reserved, a[0]!, a[1]!, Boolean(format[i])); setFunction(matrix, reserved, b[0]!, b[1]!, Boolean(format[i])); }
  let bitIndex = 0; let row = SIZE - 1; let upward = true; for (let col = SIZE - 1; col > 0; col -= 2) { if (col === 6) col -= 1; for (;;) { for (let c = 0; c < 2; c += 1) { const r = row; const cc = col - c; if (!reserved[r]![cc]) { const bit = bitIndex < codewords.length * 8 ? ((codewords[Math.floor(bitIndex / 8)]! >>> (7 - (bitIndex % 8))) & 1) !== 0 : false; matrix[r]![cc] = bit ^ ((r + cc) % 2 === 0); bitIndex += 1; } } if (upward ? row === 0 : row === SIZE - 1) break; row += upward ? -1 : 1; } upward = !upward; row += upward ? -1 : 1; }
  return matrix.map((line) => line.map((cell) => cell === true));
}

export function qrSvg(valueText: string, accessibleLabel: string): string {
  const matrix = qrMatrix(valueText); const rects: string[] = [];
  for (let r = 0; r < SIZE; r += 1) for (let c = 0; c < SIZE; c += 1) if (matrix[r]![c]) rects.push(`<rect x="${c}" y="${r}" width="1" height="1"/>`);
  const label = accessibleLabel.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${SIZE + 8} ${SIZE + 8}" role="img" aria-label="${label}"><rect x="-4" y="-4" width="${SIZE + 8}" height="${SIZE + 8}" fill="white"/><g fill="black">${rects.join('')}</g></svg>`;
}
