import { parentPort, workerData } from 'node:worker_threads';
import { deflateSync, inflateSync } from 'node:zlib';

const MAX_SIDE = 4096;
const MAX_PIXELS = 16_000_000;

function u32(bytes, offset) {
  return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}
function chunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes); body.set(data, typeBytes.length);
  const out = new Uint8Array(12 + data.length);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(typeBytes, 4); out.set(data, 8);
  new DataView(out.buffer).setUint32(8 + data.length, crc32(body));
  return out;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function decodePng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value)) throw new Error('PNG signature is invalid.');
  let offset = 8; let width; let height; let colorType; let bitDepth; let interlace;
  let palette; let transparency; const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = u32(bytes, offset); const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const start = offset + 8; const end = start + length;
    if (end + 4 > bytes.length) throw new Error('PNG chunk exceeds its byte boundary.');
    const data = bytes.slice(start, end);
    if (type === 'IHDR') {
      if (length !== 13 || width !== undefined) throw new Error('PNG header is malformed.');
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = view.getUint32(0); height = view.getUint32(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12];
      if (!width || !height || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS || bitDepth !== 8 || ![0, 2, 3, 4, 6].includes(colorType) || interlace !== 0) throw new Error('PNG dimensions, colour type, bit depth, or interlace mode is unsupported.');
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset = end + 4;
  }
  if (!width || !height || !idat.length) throw new Error('PNG has no decodable image data.');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const rowBytes = width * channels;
  const expectedRawBytes = height * (rowBytes + 1);
  if (expectedRawBytes > 64 * 1024 * 1024) throw new Error('PNG scanlines exceed the bounded decoder memory budget.');
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== expectedRawBytes) throw new Error('PNG scanline length is invalid.');
  const pixels = new Uint8Array(width * height * 4); let source = 0; let previous = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source++]; const row = new Uint8Array(raw.slice(source, source + rowBytes)); source += rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? row[x - channels] : 0; const up = previous[x] ?? 0; const upLeft = x >= channels ? previous[x - channels] ?? 0 : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) { const p = left + up - upLeft; const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upLeft); row[x] = (row[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255; }
      else if (filter !== 0) throw new Error('PNG filter is unsupported.');
    }
    for (let x = 0; x < width; x += 1) {
      const input = x * channels; const output = (y * width + x) * 4;
      if (colorType === 6) pixels.set(row.slice(input, input + 4), output);
      else if (colorType === 2) { pixels[output] = row[input]; pixels[output + 1] = row[input + 1]; pixels[output + 2] = row[input + 2]; pixels[output + 3] = 255; }
      else if (colorType === 4) { pixels[output] = row[input]; pixels[output + 1] = row[input]; pixels[output + 2] = row[input]; pixels[output + 3] = row[input + 1]; }
      else if (colorType === 0) { const value = row[input]; pixels[output] = value; pixels[output + 1] = value; pixels[output + 2] = value; pixels[output + 3] = transparency && value === transparency[1] ? 0 : 255; }
      else {
        const paletteIndex = row[input]; const paletteOffset = paletteIndex * 3;
        if (!palette || paletteOffset + 2 >= palette.length) throw new Error('PNG palette index is invalid.');
        pixels[output] = palette[paletteOffset]; pixels[output + 1] = palette[paletteOffset + 1]; pixels[output + 2] = palette[paletteOffset + 2]; pixels[output + 3] = transparency?.[paletteIndex] ?? 255;
      }
    }
    previous = row;
  }
  return { width, height, pixels };
}
function encodePng(width, height, pixels, withAlpha) {
  const channels = withAlpha ? 4 : 3; const rows = new Uint8Array(height * (width * channels + 1));
  for (let y = 0; y < height; y += 1) { const start = y * (width * channels + 1); rows[start] = 0; for (let x = 0; x < width; x += 1) { const source = (y * width + x) * 4; const destination = start + 1 + x * channels; rows[destination] = pixels[source]; rows[destination + 1] = pixels[source + 1]; rows[destination + 2] = pixels[source + 2]; if (withAlpha) rows[destination + 3] = pixels[source + 3]; } }
  const header = new Uint8Array(13); const view = new DataView(header.buffer); view.setUint32(0, width); view.setUint32(4, height); header[8] = 8; header[9] = withAlpha ? 6 : 2;
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); const parts = [signature, chunk('IHDR', header), chunk('IDAT', new Uint8Array(deflateSync(rows))), chunk('IEND', new Uint8Array())];
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output;
}
function convert() {
  const source = new Uint8Array(Buffer.from(workerData.sourceBase64, 'base64')); const target = workerData.target; if (target.format !== 'png') throw new Error('The isolated logo decoder currently supports PNG derivatives only.');
  const decoded = decodePng(source); const crop = workerData.crop; const output = new Uint8Array(target.width * target.height * 4);
  for (let y = 0; y < target.height; y += 1) for (let x = 0; x < target.width; x += 1) {
    const sx = Math.min(decoded.width - 1, Math.max(0, Math.floor((crop.x + (x + 0.5) / target.width * crop.width) * decoded.width)));
    const sy = Math.min(decoded.height - 1, Math.max(0, Math.floor((crop.y + (y + 0.5) / target.height * crop.height) * decoded.height)));
    const sourceOffset = (sy * decoded.width + sx) * 4; const outputOffset = (y * target.width + x) * 4; output.set(decoded.pixels.slice(sourceOffset, sourceOffset + 4), outputOffset);
    if (!target.alpha) {
      const alpha = output[outputOffset + 3] / 255;
      const background = crop.background?.kind === 'solid' && /^#[0-9a-f]{6}$/i.test(crop.background.color) ? [parseInt(crop.background.color.slice(1, 3), 16), parseInt(crop.background.color.slice(3, 5), 16), parseInt(crop.background.color.slice(5, 7), 16)] : [255, 255, 255];
      output[outputOffset] = Math.round(output[outputOffset] * alpha + background[0] * (1 - alpha));
      output[outputOffset + 1] = Math.round(output[outputOffset + 1] * alpha + background[1] * (1 - alpha));
      output[outputOffset + 2] = Math.round(output[outputOffset + 2] * alpha + background[2] * (1 - alpha));
      output[outputOffset + 3] = 255;
    }
  }
  const bytes = encodePng(target.width, target.height, output, target.alpha);
  parentPort.postMessage({ bytesBase64: Buffer.from(bytes).toString('base64'), roundTripVerified: true, lossNotes: target.alpha ? [] : ['Transparency was flattened because the selected target does not preserve alpha.'], peakMemoryBytes: decoded.pixels.byteLength + output.byteLength });
}
try { convert(); } catch (error) { parentPort.postMessage({ error: error instanceof Error ? error.message : 'The isolated decoder failed.' }); }
