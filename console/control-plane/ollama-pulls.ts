import { randomUUID } from 'node:crypto';
import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
  OllamaFitVerdict,
  OllamaPullEnqueueItem,
  OllamaPullProgress,
  OllamaPullRecord,
} from '../shared/ollama.js';
import type { OllamaClient } from './ollama-client.js';

const MAX_QUEUE_RECORDS = 20_000;
const MAX_BATCH_ITEMS = 2_000;
const FIT_VERDICTS = new Set<OllamaFitVerdict>(['runs-well', 'runs-with-limits', 'unlikely', 'unknown']);

export interface OllamaPullStore {
  loadPulls(): Promise<readonly OllamaPullRecord[]>;
  savePulls(records: readonly OllamaPullRecord[]): Promise<void>;
}

export interface OllamaPullQueueOptions {
  client: OllamaClient;
  store: OllamaPullStore;
  concurrency?: number;
  now?: () => Date;
}

function modelName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('A pull item needs a model name.');
  const model = value.trim();
  if (model.length === 0 || model.length > 256 || /[\u0000-\u001f\u007f]/u.test(model)) {
    throw new Error('A pull model name is empty, too long, or contains control characters.');
  }
  return model;
}

function enqueueItem(value: unknown): OllamaPullEnqueueItem {
  if (typeof value === 'string') return { model: modelName(value) };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('A pull item must be a model name or object.');
  const record = value as Record<string, unknown>;
  const estimatedBytes = record.estimatedBytes;
  if (estimatedBytes !== undefined && (!Number.isSafeInteger(estimatedBytes) || (estimatedBytes as number) < 0)) {
    throw new Error('A pull size estimate must be a non-negative integer.');
  }
  const fitVerdict = record.fitVerdict;
  if (fitVerdict !== undefined && (typeof fitVerdict !== 'string' || !FIT_VERDICTS.has(fitVerdict as OllamaFitVerdict))) {
    throw new Error('A pull fit verdict is invalid.');
  }
  return {
    model: modelName(record.model),
    estimatedBytes: estimatedBytes as number | undefined,
    fitVerdict: fitVerdict as OllamaFitVerdict | undefined,
  };
}

function recordId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/iu.test(value)) throw new Error('A valid pull record id is required.');
  return value;
}

function requestId(request: OllamaDispatchRequest): string {
  return normalizeOllamaRequestId(request.requestId);
}

export class OllamaPullQueue {
  readonly #client: OllamaClient;
  readonly #store: OllamaPullStore;
  readonly #concurrency: number;
  readonly #now: () => Date;
  readonly #controllers = new Map<string, AbortController>();
  #records: OllamaPullRecord[] = [];
  #initialized: Promise<void> | undefined;
  #runPromise: Promise<void> | undefined;
  #lock: Promise<void> = Promise.resolve();
  #lastRunError: string | undefined;

  constructor(options: OllamaPullQueueOptions) {
    this.#client = options.client;
    this.#store = options.store;
    this.#concurrency = Math.max(1, Math.min(options.concurrency ?? 2, 8));
    this.#now = options.now ?? (() => new Date());
  }

  async initialize(): Promise<void> {
    if (!this.#initialized) {
      this.#initialized = (async () => {
        const loaded = [...await this.#store.loadPulls()];
        const now = this.#now().toISOString();
        let repaired = false;
        this.#records = loaded.map(record => {
          if (record.state !== 'pulling') return { ...record };
          repaired = true;
          return {
            ...record,
            state: 'queued',
            updatedAt: now,
            progress: { ...record.progress, status: 'Recovered after the previous process stopped.' } as OllamaPullProgress,
          };
        });
        if (this.#records.length > MAX_QUEUE_RECORDS) throw new Error(`Pull queue exceeded ${MAX_QUEUE_RECORDS} records.`);
        if (repaired) await this.#store.savePulls(this.#records);
      })();
    }
    await this.#initialized;
  }

  async #mutate<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.initialize();
    let resolveResult!: (value: T | PromiseLike<T>) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const operation = this.#lock.then(async () => {
      try {
        const value = await fn();
        await this.#store.savePulls(this.#records);
        resolveResult(value);
      } catch (error) {
        rejectResult(error);
      }
    });
    this.#lock = operation.catch(() => undefined);
    return await result;
  }

  async list(): Promise<readonly OllamaPullRecord[]> {
    await this.initialize();
    await this.#lock;
    return structuredClone(this.#records);
  }

  get lastRunError(): string | undefined {
    return this.#lastRunError;
  }

  async enqueue(items: readonly OllamaPullEnqueueItem[]): Promise<readonly OllamaPullRecord[]> {
    if (items.length === 0 || items.length > MAX_BATCH_ITEMS) {
      throw new Error(`A pull batch needs 1 to ${MAX_BATCH_ITEMS} items.`);
    }
    return await this.#mutate(() => {
      if (this.#records.length + items.length > MAX_QUEUE_RECORDS) throw new Error(`Pull queue exceeded ${MAX_QUEUE_RECORDS} records.`);
      const now = this.#now().toISOString();
      const created = items.map(item => ({
        id: randomUUID(),
        model: modelName(item.model),
        state: 'queued' as const,
        createdAt: now,
        updatedAt: now,
        estimatedBytes: item.estimatedBytes,
        networkTransferRequired: true,
        fitVerdict: item.fitVerdict,
        attempt: 1,
      }));
      this.#records.push(...created);
      return structuredClone(created);
    });
  }

  async cancel(id: string): Promise<OllamaPullRecord> {
    const updated = await this.#mutate(() => {
      const record = this.#records.find(item => item.id === id);
      if (!record) throw new Error(`Pull record ${id} does not exist.`);
      if (record.state === 'pulled' || record.state === 'skipped' || record.state === 'failed') {
        throw new Error(`Pull record ${id} cannot be cancelled from state ${record.state}.`);
      }
      record.state = 'cancelled';
      record.updatedAt = this.#now().toISOString();
      record.progress = { ...record.progress, status: 'Cancelled.' };
      return structuredClone(record);
    });
    this.#controllers.get(id)?.abort(new Error('The pull was cancelled.'));
    return updated;
  }

  async retry(id: string): Promise<OllamaPullRecord> {
    return await this.#mutate(() => {
      const record = this.#records.find(item => item.id === id);
      if (!record) throw new Error(`Pull record ${id} does not exist.`);
      if (record.state !== 'failed' && record.state !== 'cancelled') {
        throw new Error(`Pull record ${id} cannot be retried from state ${record.state}.`);
      }
      record.state = 'queued';
      record.error = undefined;
      record.progress = { status: 'Queued for retry.' };
      record.updatedAt = this.#now().toISOString();
      record.attempt += 1;
      return structuredClone(record);
    });
  }

  async reconcile(): Promise<readonly OllamaPullRecord[]> {
    const installed = new Set((await this.#client.installedModels()).flatMap(model => [model.name, model.model]));
    return await this.#mutate(() => {
      const now = this.#now().toISOString();
      for (const record of this.#records) {
        if (!installed.has(record.model)) continue;
        if (record.state === 'queued') {
          record.state = 'skipped';
          record.networkTransferRequired = false;
          record.progress = { status: 'Already installed when the queue was reconciled.' };
          record.updatedAt = now;
        } else if (record.state === 'pulling' || record.state === 'failed') {
          record.state = 'pulled';
          record.error = undefined;
          record.progress = { ...record.progress, status: 'Installed state confirmed by local Ollama.' };
          record.updatedAt = now;
        }
      }
      return structuredClone(this.#records);
    });
  }

  async #process(record: OllamaPullRecord): Promise<void> {
    const controller = new AbortController();
    this.#controllers.set(record.id, controller);
    let completed = false;
    try {
      for await (const progress of this.#client.pull(record.model, controller.signal)) {
        completed ||= progress.status.trim().toLowerCase() === 'success';
        await this.#mutate(() => {
          const current = this.#records.find(item => item.id === record.id);
          if (!current || current.state !== 'pulling') return;
          current.progress = progress;
          current.updatedAt = this.#now().toISOString();
        });
      }
      if (!completed) throw new Error('Local Ollama ended the pull stream without a success record.');
      await this.#mutate(() => {
        const current = this.#records.find(item => item.id === record.id);
        if (!current || current.state !== 'pulling') return;
        current.state = 'pulled';
        current.error = undefined;
        current.progress = { ...current.progress, status: 'Pull completed.' };
        current.updatedAt = this.#now().toISOString();
      });
    } catch (error) {
      await this.#mutate(() => {
        const current = this.#records.find(item => item.id === record.id);
        if (!current || current.state === 'cancelled') return;
        current.state = 'failed';
        current.error = error instanceof Error ? error.message : 'The local Ollama pull failed.';
        current.progress = { ...current.progress, status: 'Pull failed.' };
        current.updatedAt = this.#now().toISOString();
      });
    } finally {
      this.#controllers.delete(record.id);
    }
  }

  async #drain(): Promise<void> {
    while (true) {
      const batch = await this.#mutate(() => {
        const selected = this.#records.filter(record => record.state === 'queued').slice(0, this.#concurrency);
        const now = this.#now().toISOString();
        for (const record of selected) {
          record.state = 'pulling';
          record.updatedAt = now;
          record.progress = { ...record.progress, status: 'Starting local Ollama pull.' };
        }
        return structuredClone(selected);
      });
      if (batch.length === 0) return;
      await Promise.all(batch.map(record => this.#process(record)));
    }
  }

  run(): Promise<void> {
    if (!this.#runPromise) {
      this.#lastRunError = undefined;
      this.#runPromise = this.#drain()
        .catch(async error => {
          this.#lastRunError = error instanceof Error ? error.message : 'The pull queue stopped unexpectedly.';
          try {
            await this.#mutate(() => {
              const now = this.#now().toISOString();
              for (const record of this.#records) {
                if (record.state !== 'pulling') continue;
                record.state = 'failed';
                record.error = this.#lastRunError;
                record.progress = { ...record.progress, status: 'Pull queue stopped unexpectedly.' };
                record.updatedAt = now;
              }
            });
          } catch {
            // The in-memory error remains visible even if the durable store itself is unavailable.
          }
          throw error;
        })
        .finally(() => { this.#runPromise = undefined; });
    }
    return this.#runPromise;
  }

  start(): void {
    void this.run().catch(() => undefined);
  }

  async stop(): Promise<void> {
    for (const controller of this.#controllers.values()) controller.abort(new Error('The pull queue is stopping.'));
    await this.#runPromise;
  }
}

function failure(request: OllamaDispatchRequest, error: unknown): OllamaDispatchResponse {
  return {
    ok: false,
    requestId: requestId(request),
    code: 'OLLAMA_PULL_OPERATION_FAILED',
    message: ollamaErrorMessage(error, 'The Ollama pull operation failed.'),
  };
}

export function createOllamaPullHandlers(queue: OllamaPullQueue): OllamaDispatchHandlers {
  const wrap = <T>(fn: (request: OllamaDispatchRequest) => Promise<T>) => async (request: OllamaDispatchRequest) => {
    try {
      return { ok: true, requestId: requestId(request), data: await fn(request) } as OllamaDispatchResponse<T>;
    } catch (error) {
      return failure(request, error) as OllamaDispatchResponse<T>;
    }
  };
  return {
    'ollama.pulls.list': wrap(async () => ({ records: await queue.list(), backgroundError: queue.lastRunError })),
    'ollama.pulls.enqueue': wrap(async request => {
      const payload = request.payload !== null && typeof request.payload === 'object' && !Array.isArray(request.payload)
        ? request.payload as Record<string, unknown>
        : {};
      if (!Array.isArray(payload.items)) throw new Error('Pull enqueue needs an items array.');
      const records = await queue.enqueue(payload.items.map(enqueueItem));
      queue.start();
      return { records };
    }),
    'ollama.pulls.cancel': wrap(async request => {
      const payload = request.payload as Record<string, unknown> | undefined;
      return await queue.cancel(recordId(payload?.id));
    }),
    'ollama.pulls.retry': wrap(async request => {
      const payload = request.payload as Record<string, unknown> | undefined;
      const record = await queue.retry(recordId(payload?.id));
      queue.start();
      return record;
    }),
    'ollama.pulls.reconcile': wrap(async () => ({ records: await queue.reconcile() })),
  } as OllamaDispatchHandlers;
}
