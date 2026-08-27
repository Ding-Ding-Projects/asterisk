import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import type {
  OllamaCatalogSnapshot,
  OllamaHarnessProfile,
  OllamaHarnessSnapshot,
  OllamaPullRecord,
} from '../shared/ollama.js';
import type { OllamaCatalogStore } from './ollama-catalog.js';

const SCHEMA_VERSION = 1;
const MAX_STATE_BYTES = 32 * 1024 * 1024;
const MAX_PULL_RECORDS = 20_000;
const MAX_HARNESS_PROFILES = 1_000;
const MAX_HARNESS_SNAPSHOTS = 2_000;
const TRANSIENT_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const SECRET_SUFFIXES = ['password', 'secret', 'token', 'credential', 'privatekey', 'apikey', 'accesstoken', 'refreshtoken'];

export interface OllamaHarnessPersistentState {
  profiles: readonly OllamaHarnessProfile[];
  snapshots: readonly OllamaHarnessSnapshot[];
}

interface OllamaPersistentState {
  schemaVersion: 1;
  updatedAt: string;
  catalog?: OllamaCatalogSnapshot;
  pulls: OllamaPullRecord[];
  harness: {
    profiles: OllamaHarnessProfile[];
    snapshots: OllamaHarnessSnapshot[];
  };
}

function emptyState(): OllamaPersistentState {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date(0).toISOString(),
    pulls: [],
    harness: { profiles: [], snapshots: [] },
  };
}

function assertNoPlaintextSecrets(value: unknown, path = 'state', depth = 0): void {
  if (depth > 24) throw new Error('Ollama state exceeded the maximum nesting depth.');
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertNoPlaintextSecrets(value[index], `${path}[${index}]`, depth + 1);
    }
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[^a-z0-9]/giu, '').toLowerCase();
    if (normalized === 'key' || SECRET_SUFFIXES.some(suffix => normalized === suffix || normalized.endsWith(suffix))) {
      throw new Error(`Plaintext credential field ${path}.${key} is refused.`);
    }
    assertNoPlaintextSecrets(child, `${path}.${key}`, depth + 1);
  }
}

function validateState(value: unknown): OllamaPersistentState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ollama state is not an object.');
  const state = value as Partial<OllamaPersistentState>;
  if (state.schemaVersion !== SCHEMA_VERSION) throw new Error('Ollama state schema version is unsupported.');
  if (!Array.isArray(state.pulls) || state.pulls.length > MAX_PULL_RECORDS) throw new Error('Ollama pull state is missing or too large.');
  if (state.harness === null || typeof state.harness !== 'object') throw new Error('Ollama harness state is missing.');
  if (!Array.isArray(state.harness.profiles) || state.harness.profiles.length > MAX_HARNESS_PROFILES) {
    throw new Error('Ollama harness profile state is missing or too large.');
  }
  if (!Array.isArray(state.harness.snapshots) || state.harness.snapshots.length > MAX_HARNESS_SNAPSHOTS) {
    throw new Error('Ollama harness snapshot state is missing or too large.');
  }
  assertNoPlaintextSecrets(state);
  return structuredClone(state as OllamaPersistentState);
}

async function renameWithRetry(source: string, destination: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException).code;
      if (!code || !TRANSIENT_RENAME_CODES.has(code) || attempt === 6) throw error;
      await new Promise(resolve => setTimeout(resolve, 15 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function atomicWrite(path: string, value: OllamaPersistentState): Promise<void> {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });
  const parentStat = await lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error('Ollama state parent must be a real directory, not a link.');
  }
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error('Ollama state path cannot be a symbolic link.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(text, 'utf8') > MAX_STATE_BYTES) throw new Error(`Ollama state exceeded ${MAX_STATE_BYTES} bytes.`);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await renameWithRetry(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export class OllamaStore implements OllamaCatalogStore {
  readonly #path: string;
  #statePromise: Promise<OllamaPersistentState> | undefined;
  #mutation: Promise<void> = Promise.resolve();

  constructor(path: string) {
    if (!isAbsolute(path)) throw new Error('Ollama state path must be absolute.');
    this.#path = path;
  }

  async #load(): Promise<OllamaPersistentState> {
    if (!this.#statePromise) {
      this.#statePromise = (async () => {
        try {
          await access(this.#path, fsConstants.R_OK);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyState();
          throw error;
        }
        const file = await readFile(this.#path);
        if (file.byteLength > MAX_STATE_BYTES) throw new Error(`Ollama state exceeded ${MAX_STATE_BYTES} bytes.`);
        let parsed: unknown;
        try {
          parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(file));
        } catch {
          throw new Error('Ollama state is not valid bounded UTF-8 JSON.');
        }
        return validateState(parsed);
      })();
    }
    return await this.#statePromise;
  }

  async #mutate(update: (draft: OllamaPersistentState) => void): Promise<void> {
    const operation = this.#mutation.then(async () => {
      const draft = structuredClone(await this.#load());
      update(draft);
      draft.updatedAt = new Date().toISOString();
      const validated = validateState(draft);
      await atomicWrite(this.#path, validated);
      this.#statePromise = Promise.resolve(validated);
    });
    this.#mutation = operation.catch(() => undefined);
    await operation;
  }

  async loadCatalog(): Promise<OllamaCatalogSnapshot | undefined> {
    return structuredClone((await this.#load()).catalog);
  }

  async saveCatalog(snapshot: OllamaCatalogSnapshot): Promise<void> {
    if (!snapshot.complete || snapshot.pageCount < 1 || snapshot.stale) {
      throw new Error('Only a complete, non-stale catalogue refresh can replace the verified cache.');
    }
    await this.#mutate(draft => { draft.catalog = structuredClone(snapshot); });
  }

  async loadPulls(): Promise<readonly OllamaPullRecord[]> {
    return structuredClone((await this.#load()).pulls);
  }

  async savePulls(records: readonly OllamaPullRecord[]): Promise<void> {
    if (records.length > MAX_PULL_RECORDS) throw new Error(`Ollama pull queue exceeded ${MAX_PULL_RECORDS} records.`);
    await this.#mutate(draft => { draft.pulls = structuredClone([...records]); });
  }

  async loadHarnessState(): Promise<OllamaHarnessPersistentState> {
    return structuredClone((await this.#load()).harness);
  }

  async saveHarnessState(state: OllamaHarnessPersistentState): Promise<void> {
    if (state.profiles.length > MAX_HARNESS_PROFILES || state.snapshots.length > MAX_HARNESS_SNAPSHOTS) {
      throw new Error('Ollama harness state exceeded its bounded record count.');
    }
    assertNoPlaintextSecrets(state);
    await this.#mutate(draft => {
      draft.harness = {
        profiles: structuredClone([...state.profiles]),
        snapshots: structuredClone([...state.snapshots]),
      };
    });
  }
}
