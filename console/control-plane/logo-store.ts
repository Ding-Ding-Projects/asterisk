/**
 * Private, local-only logo cache.
 *
 * The cache contains only validated converted assets and redacted receipts. The
 * selected source filename and source bytes are never written to this store,
 * history, exports, or diagnostics.
 */
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  LOGO_MAX_OUTPUT_BYTES,
  LOGO_MAX_MANIFEST_BYTES,
  LOGO_MAX_OUTPUTS,
  LOGO_PRESETS,
  LOGO_PACKAGE_IDENTITY,
  LOGO_SCHEMA_VERSION,
  inspectLogoBytes,
  validateLogoCrop,
  validateLogoTargets,
  type LogoCacheAssetMetadata,
  type LogoCacheAssetReadRequest,
  type LogoCacheClearRequest,
  type LogoCacheRecord,
  type LogoCacheWriteRequest,
  type LogoConversionResult,
  type LogoEncodedAsset,
  type LogoOutputReceipt,
  type LogoInspectionResult,
  type LogoTarget,
  type LogoValidationFailure,
} from '../shared/logo.js';

export interface LogoStoreOptions {
  readonly rootPath: string;
  readonly now?: () => string;
  readonly reopen?: (bytes: Uint8Array, target: LogoTarget) => Promise<LogoInspectionResult>;
}

function failure(code: LogoValidationFailure['code'], reason: string): LogoValidationFailure {
  return { ok: false, code, reason };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return Object.keys(value).every((key) => allowed.has(key)) && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function hasDuplicateJsonKeys(raw: string): boolean {
  let index = 0;
  const whitespace = () => { while (/\s/u.test(raw[index] ?? '')) index += 1; };
  const string = (): string | undefined => {
    if (raw[index] !== '"') return undefined;
    const start = index;
    index += 1;
    while (index < raw.length) {
      if (raw[index] === '\\') { index += 2; continue; }
      if (raw[index] === '"') { const value = raw.slice(start, ++index); try { return JSON.parse(value) as string; } catch { return undefined; } }
      index += 1;
    }
    return undefined;
  };
  const value = (): boolean => {
    whitespace();
    if (raw[index] === '{') return object();
    if (raw[index] === '[') {
      index += 1; whitespace();
      if (raw[index] === ']') { index += 1; return true; }
      while (index < raw.length) {
        if (!value()) return false;
        whitespace();
        if (raw[index] === ']') { index += 1; return true; }
        if (raw[index] !== ',') return false;
        index += 1;
      }
      return false;
    }
    if (raw[index] === '"') return string() !== undefined;
    const match = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u.exec(raw.slice(index));
    if (!match) return false;
    index += match[0].length;
    return true;
  };
  const object = (): boolean => {
    index += 1; whitespace();
    const keys = new Set<string>();
    if (raw[index] === '}') { index += 1; return true; }
    while (index < raw.length) {
      const key = string();
      if (key === undefined || keys.has(key)) return false;
      keys.add(key); whitespace();
      if (raw[index] !== ':') return false;
      index += 1;
      if (!value()) return false;
      whitespace();
      if (raw[index] === '}') { index += 1; return true; }
      if (raw[index] !== ',') return false;
      index += 1; whitespace();
    }
    return false;
  };
  if (!value()) return true;
  whitespace();
  return index !== raw.length;
}

function safeAssetName(value: string): boolean {
  return value.length > 0 && value.length <= 180 && basename(value) === value && !value.includes('..') && /^[a-z0-9-]+\.(?:png|jpeg|webp)$/iu.test(value);
}

function receiptShape(value: unknown): value is LogoOutputReceipt {
  if (!isObject(value) || !isObject(value.target)) return false;
  const target = value.target;
  if (!exactKeys(target, ['format', 'width', 'height', 'alpha'])) return false;
  if (!exactKeys(value, ['target', 'bytes', 'sha256', 'signature', 'width', 'height', 'alpha', 'decoder', 'roundTripVerified', 'lossNotes'])) return false;
  return (target.format === 'png' || target.format === 'jpeg' || target.format === 'webp')
    && Number.isInteger(target.width) && Number.isInteger(target.height)
    && typeof target.alpha === 'boolean'
    && typeof value.bytes === 'number' && Number.isInteger(value.bytes) && value.bytes > 0
    && typeof value.sha256 === 'string' && /^[0-9a-f]{64}$/iu.test(value.sha256)
    && typeof value.signature === 'string' && value.signature.length > 0 && value.signature.length <= 128
    && value.decoder === 'isolated'
    && value.roundTripVerified === true
    && Number.isInteger(value.width) && Number.isInteger(value.height)
    && typeof value.alpha === 'boolean'
    && Array.isArray(value.lossNotes) && value.lossNotes.every((note) => typeof note === 'string' && note.length <= 512);
}

function cacheShape(value: unknown): value is LogoCacheRecord {
  if (!isObject(value) || value.schemaVersion !== LOGO_SCHEMA_VERSION || value.packageIdentity !== LOGO_PACKAGE_IDENTITY) return false;
  if (!exactKeys(value, ['schemaVersion', 'packageIdentity', 'customLogoActive', 'crop', 'assets', 'updatedAt'], ['selectedPresetId'])) return false;
  if (typeof value.customLogoActive !== 'boolean' || typeof value.updatedAt !== 'string' || value.updatedAt.length < 1 || value.updatedAt.length > 64 || !isObject(value.crop) || !Array.isArray(value.assets)) return false;
  if (value.selectedPresetId !== undefined && (typeof value.selectedPresetId !== 'string' || value.selectedPresetId.length > 128)) return false;
  if (value.assets.length > 16) return false;
  if (!exactKeys(value.crop, ['fit', 'crop', 'focalPoint', 'safeArea', 'background'])) return false;
  if (!isObject(value.crop.crop) || !exactKeys(value.crop.crop, ['x', 'y', 'width', 'height'])) return false;
  if (!isObject(value.crop.focalPoint) || !exactKeys(value.crop.focalPoint, ['x', 'y'])) return false;
  if (!isObject(value.crop.safeArea) || !exactKeys(value.crop.safeArea, ['top', 'right', 'bottom', 'left'])) return false;
  if (!isObject(value.crop.background) || !exactKeys(value.crop.background, ['kind'], ['color'])) return false;
  if (value.crop.background.kind === 'solid' && typeof value.crop.background.color !== 'string') return false;
  if (value.crop.background.kind === 'transparent' && Object.prototype.hasOwnProperty.call(value.crop.background, 'color')) return false;
  const filenames = new Set<string>();
  return value.assets.every((asset) => {
    if (!isObject(asset) || !exactKeys(asset, ['filename', 'receipt']) || typeof asset.filename !== 'string' || !safeAssetName(asset.filename) || filenames.has(asset.filename) || !receiptShape(asset.receipt)) return false;
    filenames.add(asset.filename);
    return true;
  });
}

function targetKey(asset: LogoEncodedAsset): string {
  return `${asset.target.format}-${asset.target.width}x${asset.target.height}-${asset.target.alpha ? 'alpha' : 'opaque'}-${asset.receipt.sha256.slice(0, 16)}`.toLowerCase();
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function validAssetBytes(bytes: Uint8Array, metadata: LogoCacheAssetMetadata, reopen: LogoStoreOptions['reopen']): Promise<boolean> {
  if (bytes.byteLength !== metadata.receipt.bytes || bytes.byteLength > LOGO_MAX_OUTPUT_BYTES || digest(bytes) !== metadata.receipt.sha256) return false;
  const inspection = inspectLogoBytes(bytes, { declaredExtension: metadata.receipt.target.format });
  if (!inspection.ok || inspection.inspection.format !== metadata.receipt.target.format || inspection.inspection.width !== metadata.receipt.width || inspection.inspection.height !== metadata.receipt.height || inspection.inspection.alpha !== metadata.receipt.alpha || inspection.inspection.signature !== metadata.receipt.signature) return false;
  if (!reopen) return false;
  const reopened = await reopen(bytes, metadata.receipt.target);
  return reopened.ok
    && reopened.inspection.format === metadata.receipt.target.format
    && reopened.inspection.width === metadata.receipt.width
    && reopened.inspection.height === metadata.receipt.height
    && reopened.inspection.alpha === metadata.receipt.alpha
    && reopened.inspection.signature === metadata.receipt.signature
    && metadata.receipt.roundTripVerified === true;
}

function assetMetadata(asset: LogoEncodedAsset): LogoCacheAssetMetadata {
  return {
    filename: `${targetKey(asset)}.${asset.target.format}`,
    receipt: asset.receipt,
  };
}

export class LogoStore {
  private readonly root: string;
  private readonly now: () => string;
  private readonly reopen: LogoStoreOptions['reopen'];

  constructor(options: LogoStoreOptions) {
    if (!isAbsolute(options.rootPath)) throw new Error('Logo cache path must be absolute.');
    const root = resolve(options.rootPath);
    if (root === parse(root).root || root === resolve(dirname(root))) throw new Error('Logo cache path must not be a filesystem root.');
    this.root = root;
    this.now = options.now ?? (() => new Date().toISOString());
    this.reopen = options.reopen;
  }

  private assetPath(filename: string): string {
    if (!safeAssetName(filename)) throw new Error('Logo cache asset name is invalid.');
    const candidate = resolve(join(this.root, filename));
    if (candidate !== this.root && !candidate.startsWith(`${this.root}${sep}`)) throw new Error('Logo cache asset escaped its private directory.');
    return candidate;
  }

  async read(): Promise<LogoCacheRecord | undefined> {
    let raw: string;
    try {
      const manifestPath = join(this.root, 'manifest.json');
      const info = await stat(manifestPath);
      if (!info.isFile() || info.size > LOGO_MAX_MANIFEST_BYTES) return undefined;
      raw = await readFile(manifestPath, 'utf8');
    } catch {
      return undefined;
    }
    if (Buffer.byteLength(raw, 'utf8') > LOGO_MAX_MANIFEST_BYTES || hasDuplicateJsonKeys(raw)) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (!cacheShape(parsed)) return undefined;
    const cropCheck = validateLogoCrop(parsed.crop);
    if (!cropCheck.ok) return undefined;
    for (const asset of parsed.assets) {
      try {
        const bytes = new Uint8Array(await readFile(this.assetPath(asset.filename)));
        if (!(await validAssetBytes(bytes, asset, this.reopen))) return undefined;
      } catch {
        return undefined;
      }
    }
    return parsed;
  }

  async readAsset(record: LogoCacheRecord, filename: string): Promise<Uint8Array | undefined> {
    const metadata = record.assets.find((asset) => asset.filename === filename);
    if (!metadata) return undefined;
    try {
      const bytes = new Uint8Array(await readFile(this.assetPath(filename)));
      if (!(await validAssetBytes(bytes, metadata, this.reopen))) return undefined;
      return bytes;
    } catch {
      return undefined;
    }
  }

  async write(request: LogoCacheWriteRequest): Promise<LogoCacheRecord> {
    const result = request.result;
    if (!result.ok || result.packageIdentity !== LOGO_PACKAGE_IDENTITY) throw new Error('A failed or foreign logo conversion cannot replace the active logo.');
    if (request.selectedPresetId !== undefined && !LOGO_PRESETS.some((preset) => preset.id === request.selectedPresetId)) throw new Error('The selected logo preset is not registered.');
    const cropCheck = validateLogoCrop(result.crop);
    if (!cropCheck.ok) throw new Error(cropCheck.reason);
    const targetCheck = validateLogoTargets(result.outputs.map((asset) => asset.target));
    if (!targetCheck.ok || result.outputs.length > LOGO_MAX_OUTPUTS) throw new Error(targetCheck.ok ? 'Logo output count is outside the bounded limit.' : targetCheck.reason);
    for (const asset of result.outputs) {
      const metadata = assetMetadata(asset);
      if (!(await validAssetBytes(asset.bytes, metadata, this.reopen))) throw new Error('Logo cache refused an output that failed independent receipt and reopen validation.');
    }
    const outputBytes = result.outputs.reduce((total, asset) => total + asset.bytes.byteLength, 0);
    if (outputBytes > LOGO_MAX_OUTPUT_BYTES) throw new Error('Logo cache refused an output set over the aggregate byte limit.');
    const assets = result.outputs.map(assetMetadata);
    if (new Set(assets.map((asset) => asset.filename)).size !== assets.length) throw new Error('Logo cache output names must be unique.');
    const record: LogoCacheRecord = {
      schemaVersion: LOGO_SCHEMA_VERSION,
      packageIdentity: LOGO_PACKAGE_IDENTITY,
      selectedPresetId: request.selectedPresetId,
      customLogoActive: true,
      crop: result.crop,
      assets,
      updatedAt: this.now(),
    };
    await mkdir(this.root, { recursive: true });
    const temporary: string[] = [];
    try {
      for (let index = 0; index < result.outputs.length; index += 1) {
        const asset = result.outputs[index];
        const filename = assets[index].filename;
        const destination = this.assetPath(filename);
        const temporaryPath = `${destination}.${randomUUID()}.tmp`;
        temporary.push(temporaryPath);
        await writeFile(temporaryPath, asset.bytes, { flag: 'wx' });
        await rename(temporaryPath, destination);
      }
      const manifestPath = join(this.root, 'manifest.json');
      const temporaryManifest = `${manifestPath}.${randomUUID()}.tmp`;
      temporary.push(temporaryManifest);
      const manifest = JSON.stringify(record, null, 2);
      if (Buffer.byteLength(manifest, 'utf8') > LOGO_MAX_MANIFEST_BYTES) throw new Error('Logo cache manifest exceeds its bounded byte limit.');
      await writeFile(temporaryManifest, manifest, { encoding: 'utf8', flag: 'wx' });
      await rename(temporaryManifest, manifestPath);
      return record;
    } finally {
      await Promise.all(temporary.map((path) => rm(path, { force: true }).catch(() => undefined)));
    }
  }

  async clear(_request: LogoCacheClearRequest = { kind: 'clear' }): Promise<void> {
    await rm(this.root, { recursive: true, force: true });
  }

  async reset(): Promise<void> {
    await this.clear({ kind: 'reset' });
  }
}

export function logoStoreHandlers(store: LogoStore) {
  return {
    read: async () => store.read(),
    readAsset: async (request: LogoCacheAssetReadRequest) => {
      const record = await store.read();
      return record ? store.readAsset(record, request.filename) : undefined;
    },
    write: async (request: LogoCacheWriteRequest) => store.write(request),
    clear: async (request: LogoCacheClearRequest) => store.clear(request),
  };
}
