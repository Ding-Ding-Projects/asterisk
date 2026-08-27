/**
 * The local dim-sum startup cache contract.
 *
 * The package or application-data owner is responsible for producing this JSON
 * after it has resolved a record from Ding-Ding-Projects/dim-sum-photos and a
 * published catalog-v1 release asset. The renderer never fetches the catalog or
 * an image. It accepts only the bounded, self-contained cache below.
 */

export const DIM_SUM_CACHE_SCHEMA_VERSION = 1 as const;
export const DIM_SUM_SOURCE_REPOSITORY = 'Ding-Ding-Projects/dim-sum-photos' as const;
export const DIM_SUM_CATALOG_URL = 'https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json' as const;
export const DIM_SUM_PUBLISHED_ASSET_PREFIX = 'catalog-v1' as const;
export const DIM_SUM_CACHE_MAX_BYTES = 12 * 1024 * 1024;
export const DIM_SUM_CACHE_MAX_ENTRIES = 256;
export const DIM_SUM_CACHE_MAX_NAME_LENGTH = 160;
export const DIM_SUM_CACHE_MAX_ID_LENGTH = 160;
export const DIM_SUM_CACHE_MAX_ASSET_URL_LENGTH = 2048;
export const DIM_SUM_CACHE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const DIM_SUM_CACHE_MAX_IMAGE_DIMENSION = 8192;

const HEX_64 = /^[a-f0-9]{64}$/;
const REVISION = /^[a-f0-9]{7,128}$/;
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const DATA_URL_PREFIX = /^data:(image\/(?:png|jpeg|webp));base64,/;
const ASSET_URL = /^https:\/\/github\.com\/Ding-Ding-Projects\/dim-sum-photos\/releases\/download\/catalog-v1[^/]+\/[^/?#]+$/;

export interface DimSumImageDecodeProof {
  readonly validated: true;
  readonly static: true;
  readonly mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  readonly width: number;
  readonly height: number;
  readonly checkedAt: string;
}

export interface DimSumImageManifest {
  /** Public identity, retained for audit and release notes. */
  readonly assetId: string;
  readonly assetUrl: string;
  /** The actual image is local cache data, never a remote URL used by the renderer. */
  readonly dataUrl: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly decodeProof: DimSumImageDecodeProof;
}

export interface DimSumDishNames {
  readonly en: string;
  readonly zhHant: string;
}

export interface DimSumCacheEntry {
  readonly id: string;
  readonly names: DimSumDishNames;
  readonly image: DimSumImageManifest;
}

export interface DimSumCacheSource {
  readonly repository: typeof DIM_SUM_SOURCE_REPOSITORY;
  readonly catalogUrl: typeof DIM_SUM_CATALOG_URL;
  /** Immutable catalog commit or release revision used to produce this cache. */
  readonly catalogRevision: string;
  readonly catalogRevisionUrl: string;
  /** Published release asset identity, always a catalog-v1 release. */
  readonly assetRelease: string;
}

export interface DimSumCacheManifest {
  readonly schemaVersion: typeof DIM_SUM_CACHE_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly source: DimSumCacheSource;
  readonly entries: readonly DimSumCacheEntry[];
}

/** The only read seam the mounted runtime needs from the control plane. */
export interface DimSumCacheReader {
  read(): Promise<string | null>;
}

export interface DimSumCacheStorage {
  getItem(key: string): string | null;
}

export const DIM_SUM_CACHE_STORAGE_KEY = 'ding-pbx-dim-sum-cache-v1';

export type DimSumCacheValidation =
  | { readonly ok: true; readonly cache: DimSumCacheManifest }
  | { readonly ok: false; readonly reason: string };

export type DimSumAsyncCacheValidation = DimSumCacheValidation;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const expected = new Set(allowed);
  return Object.keys(value).every((key) => expected.has(key)) && allowed.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function decodeBase64(dataUrl: string): Uint8Array | undefined {
  const match = DATA_URL_PREFIX.exec(dataUrl);
  if (!match) return undefined;
  const encoded = dataUrl.slice(match[0].length);
  if (encoded.length === 0 || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return undefined;
  try {
    const binary = globalThis.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return undefined;
  }
}

function parseDataUrlMime(dataUrl: string): DimSumImageManifest['decodeProof']['mimeType'] | undefined {
  const match = DATA_URL_PREFIX.exec(dataUrl);
  if (!match || !MIME_TYPES.has(match[1]!)) return undefined;
  return match[1] as DimSumImageManifest['decodeProof']['mimeType'];
}

async function sha256(bytes: Uint8Array): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return undefined;
  const digest = await subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

function validateEntry(value: unknown, index: number): DimSumCacheEntry | string {
  if (!isRecord(value) || !exactKeys(value, ['id', 'names', 'image'])) return `entry ${index + 1} has unexpected or missing fields`;
  if (!boundedString(value.id, DIM_SUM_CACHE_MAX_ID_LENGTH)) return `entry ${index + 1} has an invalid id`;

  const names = value.names;
  if (!isRecord(names) || !exactKeys(names, ['en', 'zhHant'])) return `entry ${index + 1} has invalid bilingual names`;
  if (!boundedString(names.en, DIM_SUM_CACHE_MAX_NAME_LENGTH) || !boundedString(names.zhHant, DIM_SUM_CACHE_MAX_NAME_LENGTH)) {
    return `entry ${index + 1} has a bilingual name outside the bound`;
  }

  const image = value.image;
  if (!isRecord(image) || !exactKeys(image, ['assetId', 'assetUrl', 'dataUrl', 'sha256', 'byteSize', 'decodeProof'])) {
    return `entry ${index + 1} has an incomplete image manifest`;
  }
  if (!boundedString(image.assetId, DIM_SUM_CACHE_MAX_ID_LENGTH)) return `entry ${index + 1} has an invalid published asset id`;
  if (!boundedString(image.assetUrl, DIM_SUM_CACHE_MAX_ASSET_URL_LENGTH) || !ASSET_URL.test(image.assetUrl)) {
    return `entry ${index + 1} does not identify a published catalog-v1 image asset`;
  }
  if (typeof image.dataUrl !== 'string' || image.dataUrl.length > DIM_SUM_CACHE_MAX_IMAGE_BYTES * 2) return `entry ${index + 1} has an oversized local image`;
  const bytes = decodeBase64(image.dataUrl);
  const mimeType = parseDataUrlMime(image.dataUrl);
  if (!bytes || !mimeType || bytes.length === 0 || bytes.length > DIM_SUM_CACHE_MAX_IMAGE_BYTES) return `entry ${index + 1} has invalid local image bytes`;
  if (typeof image.byteSize !== 'number' || !Number.isSafeInteger(image.byteSize) || image.byteSize !== bytes.length) return `entry ${index + 1} has a byte-size proof that does not match its local image`;
  if (typeof image.sha256 !== 'string' || !HEX_64.test(image.sha256)) return `entry ${index + 1} has an invalid image digest`;

  const proof = image.decodeProof;
  if (!isRecord(proof) || !exactKeys(proof, ['validated', 'static', 'mimeType', 'width', 'height', 'checkedAt'])) return `entry ${index + 1} has incomplete decode proof`;
  if (proof.validated !== true || proof.static !== true || proof.mimeType !== mimeType) return `entry ${index + 1} has an untrusted decode proof`;
  const width = proof.width;
  const height = proof.height;
  if (typeof width !== 'number' || !Number.isSafeInteger(width) || width < 1 || width > DIM_SUM_CACHE_MAX_IMAGE_DIMENSION || typeof height !== 'number' || !Number.isSafeInteger(height) || height < 1 || height > DIM_SUM_CACHE_MAX_IMAGE_DIMENSION) return `entry ${index + 1} has an invalid decoded image size`;
  if (!isIsoDate(proof.checkedAt)) return `entry ${index + 1} has an invalid decode-proof timestamp`;
  const checkedAt = proof.checkedAt;

  return {
    id: value.id,
    names: { en: names.en, zhHant: names.zhHant },
    image: {
      assetId: image.assetId,
      assetUrl: image.assetUrl,
      dataUrl: image.dataUrl,
      sha256: image.sha256,
      byteSize: image.byteSize,
      decodeProof: {
        validated: true,
        static: true,
        mimeType,
        width,
        height,
        checkedAt,
      },
    },
  };
}

/**
 * Validate the complete cache envelope before a startup draw. This is intentionally
 * synchronous so a mount can fail closed before rendering any image bytes. The package
 * producer must provide the SHA-256 proof; an application-data reader may additionally
 * verify it before returning the JSON.
 */
export function validateDimSumCachePayload(rawText: string): DimSumCacheValidation {
  const bytes = new TextEncoder().encode(rawText).length;
  if (bytes > DIM_SUM_CACHE_MAX_BYTES) return { ok: false, reason: `the private dim-sum cache is ${bytes} bytes, above the ${DIM_SUM_CACHE_MAX_BYTES}-byte limit` };
  let value: unknown;
  try {
    value = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: 'the private dim-sum cache is not valid JSON' };
  }
  if (!isRecord(value) || !exactKeys(value, ['schemaVersion', 'generatedAt', 'source', 'entries'])) return { ok: false, reason: 'the private dim-sum cache has unexpected or missing top-level fields' };
  if (value.schemaVersion !== DIM_SUM_CACHE_SCHEMA_VERSION || !isIsoDate(value.generatedAt)) return { ok: false, reason: 'the private dim-sum cache has an unsupported schema or timestamp' };

  const source = value.source;
  if (!isRecord(source) || !exactKeys(source, ['repository', 'catalogUrl', 'catalogRevision', 'catalogRevisionUrl', 'assetRelease'])) return { ok: false, reason: 'the private dim-sum cache is missing its public source manifest' };
  if (source.repository !== DIM_SUM_SOURCE_REPOSITORY || source.catalogUrl !== DIM_SUM_CATALOG_URL || typeof source.catalogRevision !== 'string' || !REVISION.test(source.catalogRevision) || !boundedString(source.catalogRevisionUrl, DIM_SUM_CACHE_MAX_ASSET_URL_LENGTH) || !source.catalogRevisionUrl.startsWith(`${DIM_SUM_CATALOG_URL.replace('/main/', `/${source.catalogRevision}/`)}`)) return { ok: false, reason: 'the private dim-sum cache does not identify an immutable public catalog revision' };
  if (!boundedString(source.assetRelease, 160) || !source.assetRelease.startsWith(DIM_SUM_PUBLISHED_ASSET_PREFIX)) return { ok: false, reason: 'the private dim-sum cache does not identify a published catalog-v1 release' };

  if (!Array.isArray(value.entries) || value.entries.length > DIM_SUM_CACHE_MAX_ENTRIES) return { ok: false, reason: 'the private dim-sum cache has too many entries' };
  const ids = new Set<string>();
  const entries: DimSumCacheEntry[] = [];
  for (let index = 0; index < value.entries.length; index += 1) {
    const result = validateEntry(value.entries[index], index);
    if (typeof result === 'string') return { ok: false, reason: result };
    if (ids.has(result.id)) return { ok: false, reason: `the private dim-sum cache repeats entry id ${result.id}` };
    ids.add(result.id);
    entries.push(result);
  }

  return {
    ok: true,
    cache: {
      schemaVersion: DIM_SUM_CACHE_SCHEMA_VERSION,
      generatedAt: value.generatedAt,
      source: {
        repository: DIM_SUM_SOURCE_REPOSITORY,
        catalogUrl: DIM_SUM_CATALOG_URL,
        catalogRevision: source.catalogRevision,
        catalogRevisionUrl: source.catalogRevisionUrl,
        assetRelease: source.assetRelease,
      },
      entries,
    },
  };
}

/**
 * Validate the envelope and independently recompute every local image digest before
 * the renderer is allowed to use it. A host without Web Crypto fails closed rather
 * than treating a digest-shaped string as proof.
 */
export async function validateDimSumCachePayloadAsync(rawText: string): Promise<DimSumAsyncCacheValidation> {
  const result = validateDimSumCachePayload(rawText);
  if (!result.ok) return result;
  for (let index = 0; index < result.cache.entries.length; index += 1) {
    const entry = result.cache.entries[index]!;
    const bytes = decodeBase64(entry.image.dataUrl);
    if (!bytes) return { ok: false, reason: `entry ${index + 1} has no decodable local image bytes` };
    let digest: string | undefined;
    try {
      digest = await sha256(bytes);
    } catch {
      digest = undefined;
    }
    if (!digest) return { ok: false, reason: 'Web Crypto is unavailable, so the private dim-sum cache cannot be verified' };
    if (digest !== entry.image.sha256) return { ok: false, reason: `entry ${index + 1} image bytes do not match the recorded SHA-256 proof` };
  }
  return result;
}

/** Read only the private cache storage seam. It never performs network I/O. */
export function readDimSumCache(storage: DimSumCacheStorage): DimSumCacheValidation {
  const raw = storage.getItem(DIM_SUM_CACHE_STORAGE_KEY);
  return raw === null ? { ok: false, reason: 'no validated private dim-sum cache is available' } : validateDimSumCachePayload(raw);
}
