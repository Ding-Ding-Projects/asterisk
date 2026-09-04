/**
 * Private, local-only logo cache.
 *
 * The cache contains only validated converted assets and redacted receipts. The
 * selected source filename and source bytes are never written to this store,
 * history, exports, or diagnostics.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  LOGO_MAX_OUTPUT_BYTES,
  LOGO_PACKAGE_IDENTITY,
  LOGO_SCHEMA_VERSION,
  inspectLogoBytes,
  validateLogoCrop,
  type LogoCacheAssetMetadata,
  type LogoCacheAsset,
  type LogoCacheClearRequest,
  type LogoCacheRecord,
  type LogoCacheWriteRequest,
  type LogoConversionResult,
  type LogoEncodedAsset,
  type LogoOutputReceipt,
  type LogoValidationFailure,
} from '../shared/logo.js';

export interface LogoStoreOptions {
  readonly rootPath: string;
  readonly now?: () => string;
}

function failure(code: LogoValidationFailure['code'], reason: string): LogoValidationFailure {
  return { ok: false, code, reason };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeAssetName(value: string): boolean {
  return value.length > 0 && value.length <= 180 && basename(value) === value && !value.includes('..') && /^[a-z0-9-]+\.(?:png|jpeg|webp)$/iu.test(value);
}

function receiptShape(value: unknown): value is LogoOutputReceipt {
  if (!isObject(value) || !isObject(value.target)) return false;
  const target = value.target;
  return (target.format === 'png' || target.format === 'jpeg' || target.format === 'webp')
    && Number.isInteger(target.width) && Number.isInteger(target.height)
    && typeof target.alpha === 'boolean'
    && typeof value.bytes === 'number' && Number.isInteger(value.bytes) && value.bytes > 0
    && typeof value.sha256 === 'string' && /^[0-9a-f]{64}$/iu.test(value.sha256)
    && typeof value.signature === 'string'
    && value.decoder === 'isolated'
    && value.roundTripVerified === true
    && Number.isInteger(value.width) && Number.isInteger(value.height)
    && typeof value.alpha === 'boolean'
    && Array.isArray(value.lossNotes) && value.lossNotes.every((note) => typeof note === 'string' && note.length <= 512);
}

function cacheShape(value: unknown): value is LogoCacheRecord {
  if (!isObject(value) || value.schemaVersion !== LOGO_SCHEMA_VERSION || value.packageIdentity !== LOGO_PACKAGE_IDENTITY) return false;
  if (typeof value.customLogoActive !== 'boolean' || typeof value.updatedAt !== 'string' || !isObject(value.crop) || !Array.isArray(value.assets)) return false;
  if (value.selectedPresetId !== undefined && (typeof value.selectedPresetId !== 'string' || value.selectedPresetId.length > 128)) return false;
  if (value.assets.length > 16) return false;
  return value.assets.every((asset) => isObject(asset) && typeof asset.filename === 'string' && safeAssetName(asset.filename) && receiptShape(asset.receipt));
}

function targetKey(asset: LogoEncodedAsset): string {
  return `${asset.target.format}-${asset.target.width}x${asset.target.height}-${asset.target.alpha ? 'alpha' : 'opaque'}-${asset.receipt.sha256.slice(0, 16)}`.toLowerCase();
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function validAssetBytes(bytes: Uint8Array, metadata: LogoCacheAssetMetadata): boolean {
  if (bytes.byteLength !== metadata.receipt.bytes || bytes.byteLength > LOGO_MAX_OUTPUT_BYTES || digest(bytes) !== metadata.receipt.sha256) return false;
  const inspection = inspectLogoBytes(bytes, { declaredExtension: metadata.receipt.target.format });
  return inspection.ok
    && inspection.inspection.format === metadata.receipt.target.format
    && inspection.inspection.width === metadata.receipt.width
    && inspection.inspection.height === metadata.receipt.height
    && inspection.inspection.alpha === metadata.receipt.alpha
    && inspection.inspection.signature === metadata.receipt.signature;
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

  constructor(options: LogoStoreOptions) {
    if (!isAbsolute(options.rootPath)) throw new Error('Logo cache path must be absolute.');
    const root = resolve(options.rootPath);
    if (root === parse(root).root || root === resolve(dirname(root))) throw new Error('Logo cache path must not be a filesystem root.');
    this.root = root;
    this.now = options.now ?? (() => new Date().toISOString());
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
      raw = await readFile(join(this.root, 'manifest.json'), 'utf8');
    } catch {
      return undefined;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (!cacheShape(parsed)) return undefined;
    const cropCheck = validateLogoCrop(parsed.crop);
    if (!cropCheck.ok) return undefined;
    let totalBytes = 0;
    for (const asset of parsed.assets) {
      totalBytes += asset.receipt.bytes;
      if (totalBytes > LOGO_MAX_OUTPUT_BYTES) return undefined;
      try {
        const bytes = new Uint8Array(await readFile(this.assetPath(asset.filename)));
        if (!validAssetBytes(bytes, asset)) return undefined;
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
      if (!validAssetBytes(bytes, metadata)) return undefined;
      return bytes;
    } catch {
      return undefined;
    }
  }

  /** Return cached derivatives only after independent digest, signature, dimension,
   * alpha, and byte-count validation. Source paths and source bytes never enter this
   * renderer-facing response. */
  async readForRenderer(): Promise<import('../shared/logo.js').LogoCacheReadResult | undefined> {
    const record = await this.read();
    if (!record) return undefined;
    const assets: LogoCacheAsset[] = [];
    for (const metadata of record.assets) {
      const bytes = await this.readAsset(record, metadata.filename);
      if (!bytes) return undefined;
      assets.push({ ...metadata, bytesBase64: Buffer.from(bytes).toString('base64') });
    }
    return { ...record, assets };
  }

  async write(request: LogoCacheWriteRequest): Promise<LogoCacheRecord> {
    const result = request.result;
    if (!result.ok) throw new Error('A failed logo conversion cannot replace the active logo.');
    for (const asset of result.outputs) {
      const metadata = assetMetadata(asset);
      if (!validAssetBytes(asset.bytes, metadata)) throw new Error('Logo cache refused an output that failed independent receipt validation.');
    }
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
      await writeFile(temporaryManifest, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
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
    write: async (request: LogoCacheWriteRequest) => store.write(request),
    clear: async (request: LogoCacheClearRequest) => store.clear(request),
  };
}
