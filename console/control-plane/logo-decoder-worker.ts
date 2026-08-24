import sharp from 'sharp';
import { createInterface } from 'node:readline';

type Target = { format: 'png' | 'jpeg' | 'webp'; width: number; height: number; alpha: boolean };
type Crop = { fit: 'contain' | 'cover' | 'fill'; crop: { x: number; y: number; width: number; height: number }; background: { kind: 'transparent' } | { kind: 'solid'; color: string } };

function signature(format: Target['format']): string {
  return format === 'png' ? 'png-signature' : format === 'jpeg' ? 'jpeg-signature' : 'webp-riff-signature';
}

function alphaFor(format: Target['format'], channels: number | undefined): boolean {
  return format !== 'jpeg' && (channels === 2 || channels === 4);
}

async function reopen(bytes: Buffer, target: Target): Promise<Record<string, unknown>> {
  const metadata = await sharp(bytes, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).metadata();
  const format = metadata.format === 'jpg' ? 'jpeg' : metadata.format;
  const alpha = alphaFor(target.format, metadata.channels);
  if (format !== target.format || metadata.width !== target.width || metadata.height !== target.height || alpha !== target.alpha || (metadata.pages ?? 1) !== 1) throw new Error('The isolated decoder reopen did not match the requested output.');
  return { ok: true, inspection: { format, width: metadata.width, height: metadata.height, frames: 1, animated: false, alpha, decodedBytes: (metadata.width ?? 0) * (metadata.height ?? 0) * 4, signature: signature(target.format) }, roundTripVerified: true, peakMemoryBytes: process.memoryUsage().rss };
}

async function convert(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const source = Buffer.from(String(input.sourceBase64), 'base64');
  const target = input.target as Target;
  const crop = input.crop as Crop;
  const sourceMetadata = await sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || (sourceMetadata.pages ?? 1) !== 1) throw new Error('The isolated decoder source has no bounded static dimensions.');
  const left = Math.max(0, Math.min(sourceMetadata.width - 1, Math.floor(crop.crop.x * sourceMetadata.width)));
  const top = Math.max(0, Math.min(sourceMetadata.height - 1, Math.floor(crop.crop.y * sourceMetadata.height)));
  const width = Math.max(1, Math.min(sourceMetadata.width - left, Math.floor(crop.crop.width * sourceMetadata.width)));
  const height = Math.max(1, Math.min(sourceMetadata.height - top, Math.floor(crop.crop.height * sourceMetadata.height)));
  const fit = crop.fit === 'fill' ? 'fill' : crop.fit;
  const background = crop.background.kind === 'solid' ? crop.background.color : { r: 0, g: 0, b: 0, alpha: 0 };
  let image = sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).extract({ left, top, width, height }).resize(target.width, target.height, { fit, position: 'centre', background });
  if (target.alpha) image = image.ensureAlpha();
  else image = image.removeAlpha();
  if (target.format === 'png') image = image.png({ compressionLevel: 9 });
  else if (target.format === 'jpeg') image = image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' });
  else image = image.webp({ quality: 90, alphaQuality: 100 });
  const bytes = await image.toBuffer();
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error('The isolated decoder output exceeds the bounded byte limit.');
  const reopened = await reopen(bytes, target);
  return { ...reopened, bytesBase64: bytes.toString('base64') };
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
  void (async () => {
    const request = JSON.parse(line) as Record<string, unknown>;
    const result = request.operation === 'convert'
      ? await convert(request)
      : await reopen(Buffer.from(String(request.bytesBase64), 'base64'), request.target as Target);
    process.stdout.write(`${JSON.stringify({ id: request.id, ...result })}\n`);
  })().catch((error) => {
    process.stdout.write(`${JSON.stringify({ id: (() => { try { return (JSON.parse(line) as Record<string, unknown>).id; } catch { return undefined; } })(), ok: false, reason: error instanceof Error ? error.message : 'decoder failure' })}\n`);
  });
});
