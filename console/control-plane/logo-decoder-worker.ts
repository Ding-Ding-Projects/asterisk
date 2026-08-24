import sharp from 'sharp';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.argv.includes('--no-network')) process.exit(78);
const WORKER_REVISION = 'logo-worker-2026-08-23-v4';

type Target = { format: 'png' | 'jpeg' | 'webp'; width: number; height: number; alpha: boolean };
type Crop = { fit: 'contain' | 'cover' | 'fill'; crop: { x: number; y: number; width: number; height: number }; focalPoint: { x: number; y: number }; safeArea: { top: number; right: number; bottom: number; left: number }; background: { kind: 'transparent' } | { kind: 'solid'; color: string } };
const baselineRss = process.memoryUsage().rss;
let peakRss = baselineRss;
const memoryProbe = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 20);
const require = createRequire(import.meta.url);
function nativeBinding(): { path: string; sha256: string } {
  const packageName = `@img/sharp-${process.platform}-${process.arch}`;
  const path = require.resolve(`${packageName}/sharp.${process.platform}-${process.arch}.node`) as string;
  return { path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
}

function cropDigest(crop: Crop): string {
  return createHash('sha256').update(JSON.stringify({ fit: crop.fit, crop: { x: crop.crop.x, y: crop.crop.y, width: crop.crop.width, height: crop.crop.height }, focalPoint: { x: crop.focalPoint.x, y: crop.focalPoint.y }, safeArea: { top: crop.safeArea.top, right: crop.safeArea.right, bottom: crop.safeArea.bottom, left: crop.safeArea.left }, background: crop.background.kind === 'solid' ? { kind: 'solid', color: crop.background.color } : { kind: 'transparent' } }), 'utf8').digest('hex');
}

function digestFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function verifyStartupResources(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(readFileSync(join(root, 'logo-decoder-manifest.json'), 'utf8')) as { workerSha256?: unknown; launcherSha256?: unknown; recoverySha256?: unknown; packageLockSha256?: unknown; nativeFiles?: Array<{ path?: unknown; sha256?: unknown }> };
  const assertDigest = (path: string, expected: unknown, label: string) => {
    if (typeof expected !== 'string' || !/^[0-9a-f]{64}$/iu.test(expected) || digestFile(path) !== expected) throw new Error('The decoder startup ' + label + ' digest does not match the manifest.');
  };
  assertDigest(join(root, 'logo-decoder-worker.mjs'), manifest.workerSha256, 'worker');
  assertDigest(join(root, 'logo-worker-job.ps1'), manifest.launcherSha256, 'launcher');
  assertDigest(join(root, 'logo-worker-recovery.ps1'), manifest.recoverySha256, 'recovery helper');
  assertDigest(join(root, 'package-lock.json'), manifest.packageLockSha256, 'package lock');
  if (!Array.isArray(manifest.nativeFiles) || manifest.nativeFiles.length === 0) throw new Error('The decoder startup manifest has no native runtime files.');
  for (const entry of manifest.nativeFiles) {
    if (typeof entry.path !== 'string' || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(entry.sha256) || !/^node_modules\/(?:sharp|@img)\/.+\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.path)) throw new Error('The decoder startup manifest contains an invalid native runtime path.');
    const path = resolve(root, entry.path);
    const relativePath = relative(root, path);
    if (isAbsolute(relativePath) || /^(?:\.\.(?:[\\/]|$))/u.test(relativePath)) throw new Error('The decoder startup manifest contains a runtime path outside its resource root.');
    assertDigest(path, entry.sha256, entry.path);
  }
  nativeBinding();
}

function signature(format: Target['format']): string {
  return format === 'png' ? 'png-signature' : format === 'jpeg' ? 'jpeg-signature' : 'webp-riff-signature';
}

function alphaFor(format: Target['format'], channels: number | undefined): boolean {
  return format !== 'jpeg' && (channels === 2 || channels === 4);
}

async function reopen(bytes: Buffer, target: Target): Promise<Record<string, unknown>> {
  const metadata = await sharp(bytes, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).metadata();
  const decoded = await sharp(bytes, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).raw().toBuffer({ resolveWithObject: true });
  const format = metadata.format === 'jpg' ? 'jpeg' : metadata.format;
  const alpha = alphaFor(target.format, metadata.channels);
  if (format !== target.format || metadata.width !== target.width || metadata.height !== target.height || alpha !== target.alpha || (metadata.pages ?? 1) !== 1) throw new Error('The isolated decoder reopen did not match the requested output.');
  if (decoded.data.byteLength > 64 * 1024 * 1024) throw new Error('The isolated reopen exceeded its decoded memory bound.');
  return { ok: true, inspection: { format, width: metadata.width, height: metadata.height, frames: 1, animated: false, alpha, decodedBytes: decoded.data.byteLength, signature: signature(target.format) }, roundTripVerified: true, peakMemoryBytes: Math.max(0, peakRss - baselineRss), workerVersion: process.version, workerRevision: WORKER_REVISION, sharpVersion: (sharp.versions as Record<string, string>).sharp ?? 'unknown' };
}

async function health(): Promise<Record<string, unknown>> {
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const decoded = await sharp(onePixelPng, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).raw().toBuffer({ resolveWithObject: true });
  if (decoded.data.byteLength < 1) throw new Error('The isolated decoder health decode was empty.');
  const formats: string[] = [];
  for (const target of [{ format: 'png', alpha: true }, { format: 'jpeg', alpha: false }, { format: 'webp', alpha: true }] as const) {
    let image = sharp(onePixelPng, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).resize(1, 1, { fit: 'fill' });
    if (target.alpha) image = image.ensureAlpha(); else image = image.removeAlpha();
    const bytes = target.format === 'png' ? await image.png().toBuffer() : target.format === 'jpeg' ? await image.jpeg().toBuffer() : await image.webp().toBuffer();
    await reopen(bytes, { format: target.format, width: 1, height: 1, alpha: target.alpha });
    formats.push(target.format);
  }
  const binding = nativeBinding();
  return { ok: true, workerVersion: process.version, workerRevision: WORKER_REVISION, sharpVersion: (sharp.versions as Record<string, string>).sharp ?? 'unknown', nativePlatform: process.platform, nativeArch: process.arch, nativeBindingPath: binding.path.replaceAll('\\', '/'), nativeBindingSha256: binding.sha256, peakMemoryBytes: Math.max(0, peakRss - baselineRss), formats };
}

async function convert(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const source = Buffer.from(String(input.sourceBase64), 'base64');
  const target = input.target as Target;
  const crop = input.crop as Crop;
  const sourceMetadata = await sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || (sourceMetadata.pages ?? 1) !== 1) throw new Error('The isolated decoder source has no bounded static dimensions.');
  const cropLeft = Math.max(0, Math.min(sourceMetadata.width - 1, Math.floor(crop.crop.x * sourceMetadata.width)));
  const cropTop = Math.max(0, Math.min(sourceMetadata.height - 1, Math.floor(crop.crop.y * sourceMetadata.height)));
  const cropWidth = Math.max(1, Math.min(sourceMetadata.width - cropLeft, Math.floor(crop.crop.width * sourceMetadata.width)));
  const cropHeight = Math.max(1, Math.min(sourceMetadata.height - cropTop, Math.floor(crop.crop.height * sourceMetadata.height)));
  const targetRatio = target.width / target.height;
  const viewportWidth = Math.max(1, Math.min(cropWidth, Math.floor(Math.min(cropWidth, cropHeight * targetRatio))));
  const viewportHeight = Math.max(1, Math.min(cropHeight, Math.floor(Math.min(cropHeight, cropWidth / targetRatio))));
  const focusX = crop.focalPoint.x * sourceMetadata.width;
  const focusY = crop.focalPoint.y * sourceMetadata.height;
  const left = Math.max(cropLeft, Math.min(cropLeft + cropWidth - viewportWidth, Math.floor(focusX - viewportWidth / 2)));
  const top = Math.max(cropTop, Math.min(cropTop + cropHeight - viewportHeight, Math.floor(focusY - viewportHeight / 2)));
  const width = viewportWidth;
  const height = viewportHeight;
  const safeLeft = Math.floor(target.width * crop.safeArea.left);
  const safeTop = Math.floor(target.height * crop.safeArea.top);
  const safeRight = Math.floor(target.width * crop.safeArea.right);
  const safeBottom = Math.floor(target.height * crop.safeArea.bottom);
  const safeWidth = target.width - safeLeft - safeRight;
  const safeHeight = target.height - safeTop - safeBottom;
  const fit = crop.fit === 'fill' ? 'fill' : crop.fit;
  const background = crop.background.kind === 'solid' ? crop.background.color : { r: 0, g: 0, b: 0, alpha: 0 };
  let image = sharp(source, { animated: false, limitInputPixels: 16_000_000, failOn: 'error' }).extract({ left, top, width, height }).resize(safeWidth, safeHeight, { fit, position: 'centre', background }).extend({ left: safeLeft, top: safeTop, right: safeRight, bottom: safeBottom, background });
  if (target.alpha) image = image.ensureAlpha();
  else image = image.removeAlpha();
  if (target.format === 'png') image = image.png({ compressionLevel: 9 });
  else if (target.format === 'jpeg') image = image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' });
  else image = image.webp({ quality: 90, alphaQuality: 100 });
  const bytes = await image.toBuffer();
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error('The isolated decoder output exceeds the bounded byte limit.');
  const reopened = await reopen(bytes, target);
  return { ...reopened, bytesBase64: bytes.toString('base64'), cropDigest: cropDigest(crop), lossNotes: ['focal point applied', 'safe area applied'] };
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
let startupReady = false;
input.on('line', (line) => {
  void (async () => {
    if (!startupReady) {
      if (line !== 'START') throw new Error('The decoder startup protocol expected START before any request.');
      verifyStartupResources();
      startupReady = true;
      process.stdout.write('READY\n');
      return;
    }
    const request = JSON.parse(line) as Record<string, unknown>;
    const result = request.operation === 'health'
      ? await health()
      : request.operation === 'convert'
        ? await convert(request)
        : await reopen(Buffer.from(String(request.bytesBase64), 'base64'), request.target as Target);
    process.stdout.write(`${JSON.stringify({ id: request.id, ...result })}\n`);
  })().catch((error) => {
    process.stdout.write(`${JSON.stringify({ id: (() => { try { return (JSON.parse(line) as Record<string, unknown>).id; } catch { return undefined; } })(), ok: false, reason: error instanceof Error ? error.message : 'decoder failure' })}\n`);
  });
});
process.once('beforeExit', () => clearInterval(memoryProbe));
