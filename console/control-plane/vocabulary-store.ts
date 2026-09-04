/**
 * Privileged local personal-vocabulary persistence.
 *
 * The renderer owns the user-interface text boundary. This store owns only the
 * private on-disk cache and returns redacted status, never the source path or
 * replacement values. Validation is delegated to the canonical pure loader so
 * the byte, schema, duplicate-key, depth, and key-safety rules cannot drift.
 */
import { access, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, isAbsolute, join, parse, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  validateVocabularyPayload,
  type VocabularyFile,
} from '../shared/personal-vocabulary-contract.js';

const CACHE_FILENAME = 'vocabulary.json';
const MAX_CACHE_BYTES = 65_536;

export interface VocabularyStatus {
  readonly state: 'empty' | 'loaded' | 'invalid';
  readonly replacementCount: number;
  readonly reason?: string;
}

export interface VocabularyStoreOptions {
  readonly rootPath: string;
}

function cachePath(rootPath: string): string {
  if (!isAbsolute(rootPath)) throw new Error('Vocabulary cache path must be absolute.');
  const root = resolve(rootPath);
  if (root === parse(root).root || root === resolve(dirname(root))) throw new Error('Vocabulary cache path must not be a filesystem root.');
  return join(root, CACHE_FILENAME);
}

function isInsideRoot(rootPath: string, filePath: string): boolean {
  const root = resolve(rootPath);
  const file = resolve(filePath);
  return file === root || file.startsWith(`${root}${sep}`);
}

function redactedStatus(file: VocabularyFile | undefined, reason?: string): VocabularyStatus {
  if (file) return { state: 'loaded', replacementCount: file.replacements.length };
  return reason ? { state: 'invalid', replacementCount: 0, reason } : { state: 'empty', replacementCount: 0 };
}

export class VocabularyStore {
  readonly #root: string;
  readonly #path: string;

  constructor(options: VocabularyStoreOptions) {
    this.#path = cachePath(options.rootPath);
    this.#root = dirname(this.#path);
    if (!isInsideRoot(this.#root, this.#path)) throw new Error('Vocabulary cache path escaped its private directory.');
  }

  async status(): Promise<VocabularyStatus> {
    let raw: string;
    try {
      await access(this.#path, fsConstants.R_OK);
      raw = await readFile(this.#path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return redactedStatus(undefined);
      return redactedStatus(undefined, 'The private vocabulary cache could not be read.');
    }
    const result = validateVocabularyPayload(raw);
    if (!result.ok) return redactedStatus(undefined, 'The private vocabulary cache is invalid and is not active.');
    return redactedStatus(result.file);
  }

  async read(): Promise<VocabularyFile | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.#path, 'utf8');
    } catch {
      return undefined;
    }
    const result = validateVocabularyPayload(raw);
    return result.ok ? result.file : undefined;
  }

  async replace(rawText: string): Promise<VocabularyStatus> {
    if (typeof rawText !== 'string') throw new Error('The vocabulary payload must be text.');
    const result = validateVocabularyPayload(rawText);
    if (!result.ok) return redactedStatus(undefined, result.reason);
    const canonical = `${JSON.stringify(result.file)}\n`;
    if (Buffer.byteLength(canonical, 'utf8') > MAX_CACHE_BYTES) {
      return redactedStatus(undefined, 'The validated vocabulary cache exceeds its bounded size.');
    }
    await mkdir(this.#root, { recursive: true });
    const rootStat = await lstat(this.#root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Vocabulary cache directory must be a real directory.');
    const temporary = `${this.#path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, canonical, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporary, this.#path);
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
    return redactedStatus(result.file);
  }

  async clear(): Promise<VocabularyStatus> {
    await rm(this.#root, { recursive: true, force: true });
    return redactedStatus(undefined);
  }
}
