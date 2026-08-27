import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaCatalogReconciliation,
  OllamaCatalogSnapshot,
  OllamaCatalogVariant,
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
  OllamaInstalledModel,
  OllamaRunningModel,
} from '../shared/ollama.js';
import type { OllamaClient } from './ollama-client.js';

const MAX_CATALOG_PAGES = 4_096;
const MAX_VARIANTS = 250_000;
const MAX_VARIANTS_PER_PAGE = 2_000;
const MAX_CATALOG_BYTES = 24 * 1024 * 1024;
const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1_000;
const CAPABILITIES = new Set(['chat', 'completion', 'vision', 'tools', 'embedding', 'insert', 'thinking']);

export interface OllamaCatalogPage {
  sourceId: string;
  sourceRevision?: string;
  cursor?: string;
  nextCursor?: string;
  terminal: boolean;
  variants: readonly OllamaCatalogVariant[];
}

/**
 * The catalogue transport is intentionally injected. Ollama's documented loopback API
 * does not expose the official online model catalogue, so the local client must never
 * pretend `/api/tags` is exhaustive or quietly call a cloud model service. A verified
 * catalogue adapter supplies every official page and tag through this bounded contract.
 */
export interface OllamaCatalogPageSource {
  readPage(cursor: string | undefined, signal?: AbortSignal): Promise<OllamaCatalogPage>;
}

export interface OllamaCatalogStore {
  loadCatalog(): Promise<OllamaCatalogSnapshot | undefined>;
  saveCatalog(snapshot: OllamaCatalogSnapshot): Promise<void>;
}

export interface OllamaCatalogOptions {
  source: OllamaCatalogPageSource;
  store: OllamaCatalogStore;
  client: OllamaClient;
  staleAfterMs?: number;
  now?: () => Date;
}

function validString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function validateVariant(value: OllamaCatalogVariant): OllamaCatalogVariant {
  if (!validString(value.id, 512) || !validString(value.model, 256) || !validString(value.tag, 256)) {
    throw new Error('A catalogue variant has an invalid id, model name, or tag.');
  }
  if (!validString(value.displayName, 512)) throw new Error(`Catalogue variant ${value.id} has no valid display name.`);
  if (value.sizeBytes !== undefined && (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 0)) {
    throw new Error(`Catalogue variant ${value.id} has an invalid size.`);
  }
  if (value.parameterCount !== undefined && (!Number.isSafeInteger(value.parameterCount) || value.parameterCount < 0)) {
    throw new Error(`Catalogue variant ${value.id} has an invalid parameter count.`);
  }
  if (value.contextLength !== undefined && (!Number.isSafeInteger(value.contextLength) || value.contextLength < 1)) {
    throw new Error(`Catalogue variant ${value.id} has an invalid context length.`);
  }
  if (!Array.isArray(value.capabilities) || value.capabilities.some(capability => !CAPABILITIES.has(capability))) {
    throw new Error(`Catalogue variant ${value.id} has an invalid capability.`);
  }
  const metadataEntries = Object.entries(value.metadata ?? {});
  if (metadataEntries.length > 128) throw new Error(`Catalogue variant ${value.id} has too many metadata fields.`);
  const metadata: Record<string, string | number | boolean> = {};
  for (const [key, metadataValue] of metadataEntries) {
    if (!validString(key, 256)) throw new Error(`Catalogue variant ${value.id} has an invalid metadata key.`);
    if (typeof metadataValue === 'string') {
      if (metadataValue.length > 2_048) throw new Error(`Catalogue variant ${value.id} has an oversized metadata value.`);
      metadata[key] = metadataValue;
    } else if ((typeof metadataValue === 'number' && Number.isFinite(metadataValue)) || typeof metadataValue === 'boolean') {
      metadata[key] = metadataValue;
    } else {
      throw new Error(`Catalogue variant ${value.id} has a non-primitive metadata value.`);
    }
  }
  return {
    ...value,
    id: value.id.trim(),
    model: value.model.trim(),
    tag: value.tag.trim(),
    displayName: value.displayName.trim(),
    description: value.description?.slice(0, 8_192),
    capabilities: [...new Set(value.capabilities)],
    metadata,
  };
}

function requestId(request: OllamaDispatchRequest): string {
  return normalizeOllamaRequestId(request.requestId);
}

function responseFailure(request: OllamaDispatchRequest, error: unknown): OllamaDispatchResponse {
  return {
    ok: false,
    requestId: requestId(request),
    code: 'OLLAMA_CATALOG_FAILED',
    message: ollamaErrorMessage(error, 'The Ollama catalogue operation failed.'),
  };
}

function modelNames(model: OllamaInstalledModel): readonly string[] {
  return [...new Set([model.name, model.model])];
}

function variantNames(variant: OllamaCatalogVariant): ReadonlySet<string> {
  const names = new Set([variant.id, `${variant.model}:${variant.tag}`]);
  if (variant.tag === 'latest') names.add(variant.model);
  return names;
}

export class OllamaCatalog {
  readonly #source: OllamaCatalogPageSource;
  readonly #store: OllamaCatalogStore;
  readonly #client: OllamaClient;
  readonly #staleAfterMs: number;
  readonly #now: () => Date;

  constructor(options: OllamaCatalogOptions) {
    this.#source = options.source;
    this.#store = options.store;
    this.#client = options.client;
    this.#staleAfterMs = Math.max(60_000, Math.min(options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS, 30 * 24 * 60 * 60 * 1_000));
    this.#now = options.now ?? (() => new Date());
  }

  async get(): Promise<OllamaCatalogSnapshot> {
    const stored = await this.#store.loadCatalog();
    if (!stored) {
      return {
        schemaVersion: 1,
        sourceId: 'unavailable',
        refreshedAt: this.#now().toISOString(),
        pageCount: 0,
        complete: false,
        stale: true,
        variants: [],
        unavailableReason: 'No verified official catalogue has been refreshed on this computer.',
      };
    }
    const age = this.#now().getTime() - new Date(stored.refreshedAt).getTime();
    return { ...stored, stale: !Number.isFinite(age) || age > this.#staleAfterMs };
  }

  async refresh(signal?: AbortSignal): Promise<OllamaCatalogSnapshot> {
    const variants: OllamaCatalogVariant[] = [];
    const ids = new Set<string>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    let pageCount = 0;
    let catalogueBytes = 0;
    let sourceId: string | undefined;
    let sourceRevision: string | undefined;
    try {
      while (true) {
        signal?.throwIfAborted();
        const page = await this.#source.readPage(cursor, signal);
        pageCount += 1;
        if (pageCount > MAX_CATALOG_PAGES) throw new Error(`Catalogue exceeded ${MAX_CATALOG_PAGES} pages.`);
        if (!validString(page.sourceId, 512)) throw new Error('Catalogue page did not identify its source.');
        if (page.sourceRevision !== undefined && !validString(page.sourceRevision, 2_048)) {
          throw new Error('Catalogue page supplied an invalid source revision.');
        }
        if (sourceId === undefined) {
          sourceId = page.sourceId;
          sourceRevision = page.sourceRevision;
        } else if (page.sourceId !== sourceId || page.sourceRevision !== sourceRevision) {
          throw new Error('Catalogue source identity or revision changed during pagination.');
        }
        if (page.cursor !== cursor) throw new Error('Catalogue page cursor did not match the requested cursor.');
        if (page.variants.length > MAX_VARIANTS_PER_PAGE) {
          throw new Error(`Catalogue page exceeded ${MAX_VARIANTS_PER_PAGE} variants.`);
        }
        for (const item of page.variants) {
          const variant = validateVariant(item);
          if (ids.has(variant.id)) throw new Error(`Catalogue variant id ${variant.id} appeared more than once.`);
          catalogueBytes += Buffer.byteLength(JSON.stringify(variant), 'utf8');
          if (catalogueBytes > MAX_CATALOG_BYTES) throw new Error(`Catalogue exceeded ${MAX_CATALOG_BYTES} encoded bytes.`);
          ids.add(variant.id);
          variants.push(variant);
          if (variants.length > MAX_VARIANTS) throw new Error(`Catalogue exceeded ${MAX_VARIANTS} variants.`);
        }
        if (page.terminal) {
          if (page.nextCursor !== undefined) throw new Error('Terminal catalogue page unexpectedly supplied another cursor.');
          break;
        }
        if (!validString(page.nextCursor, 2_048)) throw new Error('Non-terminal catalogue page supplied no valid next cursor.');
        if (seenCursors.has(page.nextCursor)) throw new Error('Catalogue pagination repeated a cursor.');
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
      }
      if (!sourceId) throw new Error('Catalogue refresh returned no pages.');
      if (variants.length === 0) throw new Error('Catalogue refresh returned no variants and cannot be marked complete.');
      const snapshot: OllamaCatalogSnapshot = {
        schemaVersion: 1,
        sourceId,
        sourceRevision,
        refreshedAt: this.#now().toISOString(),
        pageCount,
        complete: true,
        stale: false,
        variants,
      };
      await this.#store.saveCatalog(snapshot);
      return snapshot;
    } catch (error) {
      const previous = await this.#store.loadCatalog();
      if (!previous) throw error;
      return {
        ...previous,
        stale: true,
        unavailableReason: ollamaErrorMessage(error, 'Catalogue refresh failed.'),
      };
    }
  }

  async reconcile(): Promise<OllamaCatalogReconciliation> {
    const [catalog, installed, running] = await Promise.all([
      this.get(),
      this.#client.installedModels(),
      this.#client.runningModels(),
    ]);
    const installedByName = new Map<string, OllamaInstalledModel>();
    const runningByName = new Map<string, OllamaRunningModel>();
    for (const model of installed) for (const name of modelNames(model)) installedByName.set(name, model);
    for (const model of running) for (const name of modelNames(model)) runningByName.set(name, model);
    const matchedInstalled = new Set<OllamaInstalledModel>();
    const variants = catalog.variants.map(variant => {
      const names = variantNames(variant);
      const installedModel = [...names].map(name => installedByName.get(name)).find(Boolean);
      const runningModel = [...names].map(name => runningByName.get(name)).find(Boolean);
      if (installedModel) matchedInstalled.add(installedModel);
      return {
        ...variant,
        installed: installedModel !== undefined,
        running: runningModel !== undefined,
        installedModel,
        runningModel,
      };
    });
    return {
      observedAt: this.#now().toISOString(),
      catalog,
      variants,
      installedOnly: installed.filter(model => !matchedInstalled.has(model)),
    };
  }
}

export function createOllamaCatalogHandlers(catalog: OllamaCatalog): OllamaDispatchHandlers {
  const wrap = <T>(fn: () => Promise<T>) => async (request: OllamaDispatchRequest) => {
    try {
      return { ok: true, requestId: requestId(request), data: await fn() } as OllamaDispatchResponse<T>;
    } catch (error) {
      return responseFailure(request, error) as OllamaDispatchResponse<T>;
    }
  };
  return {
    'ollama.catalog.get': wrap(async () => await catalog.get()),
    'ollama.catalog.refresh': wrap(async () => await catalog.refresh()),
    'ollama.catalog.reconcile': wrap(async () => await catalog.reconcile()),
  } as OllamaDispatchHandlers;
}
