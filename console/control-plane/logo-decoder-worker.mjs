import sharp from 'sharp';
import { createInterface } from 'node:readline';

if (!process.argv.includes('--no-network')) process.exit(78);
const WORKER_REVISION = 'logo-worker-2026-08-23-v4';
const baselineRss = process.memoryUsage().rss;
let peakRss = baselineRss;
const memoryProbe = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 20);
const signature = (format) => format === 'png' ? 'png-signature' : format === 'jpeg' ? 'jpeg-signature' : 'webp-riff-signature';
const alphaFor = (format, channels) => format !== 'jpeg' && (channels === 2 || channels === 4);

async function reopen(bytes, target) {
  const input = sharp(bytes, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' });
  const metadata = await input.metadata();
  const decoded = await sharp(bytes, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).raw().toBuffer({ resolveWithObject: true });
  const format = metadata.format === 'jpg' ? 'jpeg' : metadata.format;
  const alpha = alphaFor(target.format, metadata.channels);
  if (format !== target.format || metadata.width !== target.width || metadata.height !== target.height || alpha !== target.alpha || (metadata.pages ?? 1) !== 1 || decoded.data.byteLength < 1 || decoded.data.byteLength > 64 * 1024 * 1024) throw new Error('The isolated decoder reopen did not match the bounded target.');
  return { ok: true, inspection: { format, width: metadata.width, height: metadata.height, frames: 1, animated: false, alpha, decodedBytes: decoded.data.byteLength, signature: signature(target.format) }, roundTripVerified: true, peakMemoryBytes: Math.max(0, peakRss - baselineRss), workerVersion: process.version, workerRevision: WORKER_REVISION, sharpVersion: sharp.versions.sharp ?? 'unknown' };
}

async function health() {
  const onePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const decoded = await sharp(onePixel, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).raw().toBuffer({ resolveWithObject: true });
  if (decoded.data.byteLength < 1) throw new Error('The health decode was empty.');
  const formats = [];
  for (const target of [{ format: 'png', alpha: true }, { format: 'jpeg', alpha: false }, { format: 'webp', alpha: true }]) {
    let image = sharp(onePixel).resize(1, 1, { fit: 'fill' });
    image = target.alpha ? image.ensureAlpha() : image.removeAlpha();
    const bytes = target.format === 'png' ? await image.png().toBuffer() : target.format === 'jpeg' ? await image.jpeg().toBuffer() : await image.webp().toBuffer();
    await reopen(bytes, { format: target.format, width: 1, height: 1, alpha: target.alpha });
    formats.push(target.format);
  }
  return { ok: true, workerVersion: process.version, workerRevision: WORKER_REVISION, sharpVersion: sharp.versions.sharp ?? 'unknown', nativePlatform: process.platform, nativeArch: process.arch, peakMemoryBytes: Math.max(0, peakRss - baselineRss), formats };
}

async function convert(input) {
  const source = Buffer.from(String(input.sourceBase64), 'base64');
  const target = input.target;
  const crop = input.crop;
  const sourceMetadata = await sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || (sourceMetadata.pages ?? 1) !== 1) throw new Error('The source has no bounded static dimensions.');
  const left = Math.max(0, Math.min(sourceMetadata.width - 1, Math.floor(crop.crop.x * sourceMetadata.width)));
  const top = Math.max(0, Math.min(sourceMetadata.height - 1, Math.floor(crop.crop.y * sourceMetadata.height)));
  const width = Math.max(1, Math.min(sourceMetadata.width - left, Math.floor(crop.crop.width * sourceMetadata.width)));
  const height = Math.max(1, Math.min(sourceMetadata.height - top, Math.floor(crop.crop.height * sourceMetadata.height)));
  const background = crop.background.kind === 'solid' ? crop.background.color : { r: 0, g: 0, b: 0, alpha: 0 };
  let image = sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).extract({ left, top, width, height }).resize(target.width, target.height, { fit: crop.fit, position: 'centre', background });
  image = target.alpha ? image.ensureAlpha() : image.removeAlpha();
  const bytes = target.format === 'png' ? await image.png({ compressionLevel: 9 }).toBuffer() : target.format === 'jpeg' ? await image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer() : await image.webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error('The output exceeds the bounded byte limit.');
  return { ...(await reopen(bytes, target)), bytesBase64: bytes.toString('base64') };
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => { void (async () => { const request = JSON.parse(line); const result = request.operation === 'health' ? await health() : request.operation === 'convert' ? await convert(request) : await reopen(Buffer.from(String(request.bytesBase64), 'base64'), request.target); process.stdout.write(`${JSON.stringify({ id: request.id, ...result })}\n`); })().catch((error) => process.stdout.write(`${JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : 'decoder failure' })}\n`)); });
process.once('beforeExit', () => clearInterval(memoryProbe));
