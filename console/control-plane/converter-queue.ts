import { lstat, mkdir, statfs } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type {
  ConverterOutcome,
  ConverterProgress,
  ConverterQueueItem,
  ConverterQueueItemInput,
  ConverterQueueRecord,
  ConverterRequest,
} from "../shared/converter.js";
import { ConverterRegistry } from "./converter-registry.js";
import { ConverterRunner } from "./converter-runner.js";
import { ConverterStore } from "./converter-store.js";

export interface ConverterQueueOptions {
  store: ConverterStore;
  registry: ConverterRegistry;
  runner: ConverterRunner;
  maxConcurrency?: number;
  storageSafetyBytes?: number;
  now?: () => Date;
  onItemProgress?: (item: ConverterQueueItem, progress: ConverterProgress) => void;
}

export interface ConverterEnqueueResult {
  accepted: number;
  reservedOutputBytes: number;
  queue: ConverterQueueRecord;
}

export class ConverterQueue {
  readonly #store: ConverterStore;
  readonly #registry: ConverterRegistry;
  readonly #runner: ConverterRunner;
  readonly #maxConcurrency: number;
  readonly #storageSafetyBytes: number;
  readonly #now: () => Date;
  readonly #onItemProgress?: (item: ConverterQueueItem, progress: ConverterProgress) => void;
  readonly #active = new Map<string, AbortController>();
  readonly #runningQueues = new Map<string, Promise<ConverterQueueRecord>>();
  #enqueueLock: Promise<void> = Promise.resolve();

  constructor(options: ConverterQueueOptions) {
    this.#store = options.store;
    this.#registry = options.registry;
    this.#runner = options.runner;
    this.#maxConcurrency = integerBetween(options.maxConcurrency ?? 2, 1, 8, "maxConcurrency");
    this.#storageSafetyBytes = integerBetween(
      options.storageSafetyBytes ?? 128 * 1024 * 1024,
      1,
      Number.MAX_SAFE_INTEGER,
      "storageSafetyBytes",
    );
    this.#now = options.now ?? (() => new Date());
    this.#onItemProgress = options.onItemProgress;
  }

  async initialize(): Promise<void> {
    await this.#store.initialize();
  }

  async create(label: string): Promise<ConverterQueueRecord> {
    return await this.#store.createQueue(label);
  }

  /**
   * Consumes one input record at a time. Callers must provide a stream or generator, not an
   * array assembled from every selected file. Each accepted item is persisted before the
   * next input is requested, which keeps path and metadata memory constant as the queue grows.
   */
  async enqueue(
    queueId: string,
    inputs: AsyncIterable<ConverterRequest>,
  ): Promise<ConverterEnqueueResult> {
    if (!inputs || typeof inputs[Symbol.asyncIterator] !== "function") {
      throw new Error("Converter enqueue requires an AsyncIterable so the complete path set is never collected in memory.");
    }
    let accepted = 0;
    let reservedOutputBytes = 0;
    for await (const input of inputs) {
      const persisted = await this.enqueueOne(queueId, input);
      accepted += 1;
      reservedOutputBytes += persisted.estimatedOutputBytes;
    }
    return { accepted, reservedOutputBytes, queue: await this.#store.getQueue(queueId) };
  }

  async enqueueOne(queueId: string, input: ConverterRequest): Promise<ConverterQueueItem> {
    return await this.#exclusiveEnqueue(async () => {
      if (
        !input || typeof input.sourcePath !== "string" || typeof input.destinationPath !== "string" ||
        typeof input.adapterId !== "string" || !Array.isArray(input.acknowledgedDisclosureIds) ||
        !isAbsolute(input.sourcePath) || !isAbsolute(input.destinationPath)
      ) {
        throw new Error("Queued converter source and destination paths must be absolute.");
      }
      const adapter = this.#registry.requireEnabledAdapter(input.adapterId);
      const source = await lstat(input.sourcePath);
      if (source.isSymbolicLink() || !source.isFile()) {
        throw new Error("Queued converter input must be a regular file, not a symbolic link.");
      }
      if (source.size === 0 || source.size > adapter.limits.maxInputBytes) {
        throw new Error(`Queued input is ${source.size} bytes; adapter ${adapter.id} accepts 1 through ${adapter.limits.maxInputBytes} bytes.`);
      }
      const acknowledged = new Set(input.acknowledgedDisclosureIds);
      const missing = adapter.disclosureIds.filter((id) => !acknowledged.has(id));
      if (missing.length > 0) throw new Error(`Conversion disclosure must be acknowledged before queueing: ${missing.join(", ")}.`);
      const estimatedOutputBytes = estimateOutputBytes(adapter.sandbox.kernel, source.size, adapter.limits.maxOutputBytes);
      await mkdir(dirname(input.destinationPath), { recursive: true });
      const storage = await statfs(dirname(input.destinationPath));
      const availableBytes = Number(storage.bavail) * Number(storage.bsize);
      const queue = await this.#store.getQueue(queueId);
      const required = queue.reservedOutputBytes + estimatedOutputBytes + this.#storageSafetyBytes;
      if (!Number.isFinite(availableBytes) || availableBytes < required) {
        throw new Error(
          `Destination storage has ${availableBytes} bytes available; queued work plus safety reserve requires ${required} bytes.`,
        );
      }
      const persisted: ConverterQueueItemInput = { ...input, estimatedOutputBytes };
      return await this.#store.enqueueItem(queueId, persisted);
    });
  }

  async reconcile(queueId: string): Promise<ConverterQueueRecord> {
    return await this.#store.reconcileAfterCrash(queueId);
  }

  start(queueId: string): Promise<ConverterQueueRecord> {
    const existing = this.#runningQueues.get(queueId);
    if (existing) return existing;
    const running = this.#runQueue(queueId).finally(() => this.#runningQueues.delete(queueId));
    this.#runningQueues.set(queueId, running);
    return running;
  }

  async pause(queueId: string): Promise<ConverterQueueRecord> {
    return await this.#store.setQueueState(queueId, "paused");
  }

  async resume(queueId: string): Promise<ConverterQueueRecord> {
    const queue = await this.#store.getQueue(queueId);
    if (queue.state === "cancelled" || queue.state === "completed") return queue;
    const active = this.#runningQueues.get(queueId);
    if (active) await active;
    return await this.start(queueId);
  }

  async cancel(queueId: string): Promise<ConverterQueueRecord> {
    await this.#store.setQueueState(queueId, "cancelled");
    for (const [itemId, controller] of this.#active) {
      if (itemId.startsWith(`${queueId}:`)) controller.abort();
    }
    let afterSequence = 0;
    while (true) {
      const page = await this.#store.listPage(queueId, { afterSequence }, 100);
      for (const item of page.items) {
        afterSequence = item.sequence;
        if (item.state !== "queued") continue;
        await this.#store.finishItem(queueId, item.sequence, "cancelled", cancellationOutcome(item, this.#now()));
      }
      if (!page.nextCursor) break;
      afterSequence = page.nextCursor.afterSequence;
    }
    return await this.#store.getQueue(queueId);
  }

  async #runQueue(queueId: string): Promise<ConverterQueueRecord> {
    const current = await this.#store.getQueue(queueId);
    if (current.state === "cancelled" || current.state === "completed") return current;
    await this.#store.setQueueState(queueId, "running");
    const workers = Array.from({ length: this.#maxConcurrency }, () => this.#worker(queueId));
    await Promise.all(workers);
    const queue = await this.#store.getQueue(queueId);
    if (queue.state === "cancelled" || queue.state === "paused") return queue;
    if (queue.itemCounts.queued === 0 && queue.itemCounts.running === 0) {
      return await this.#store.setQueueState(queueId, "completed");
    }
    return queue;
  }

  async #worker(queueId: string): Promise<void> {
    while (true) {
      const queue = await this.#store.getQueue(queueId);
      if (queue.state !== "running") return;
      const item = await this.#store.claimNext(queueId);
      if (!item) return;
      const controller = new AbortController();
      this.#active.set(item.id, controller);
      try {
        const outcome = await this.#runner.convert(item, controller.signal, (progress) => {
          this.#onItemProgress?.(item, progress);
        });
        await this.#store.finishItem(queueId, item.sequence, outcome.state, outcome);
      } finally {
        this.#active.delete(item.id);
      }
    }
  }

  async #exclusiveEnqueue<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#enqueueLock;
    let release!: () => void;
    this.#enqueueLock = new Promise<void>((resolvePromise) => { release = resolvePromise; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function estimateOutputBytes(
  kernel: string | undefined,
  inputBytes: number,
  maximum: number,
): number {
  let estimate: number;
  switch (kernel) {
    case "builtin:utf8-to-base64":
      estimate = Math.ceil(inputBytes / 3) * 4 + 1;
      break;
    case "builtin:binary-to-hex":
      estimate = inputBytes * 2 + 1;
      break;
    case "builtin:normalize-utf8":
      estimate = inputBytes + 1;
      break;
    case "builtin:base64-to-binary":
    case "builtin:hex-to-binary":
      estimate = inputBytes;
      break;
    default:
      estimate = maximum;
  }
  if (estimate > maximum) {
    throw new Error(`Estimated output is ${estimate} bytes, over the adapter's ${maximum}-byte output limit.`);
  }
  return Math.max(1, estimate);
}

function cancellationOutcome(item: ConverterQueueItem, now: Date): ConverterOutcome {
  const timestamp = now.toISOString();
  return {
    state: "cancelled",
    adapterId: item.adapterId,
    sourcePath: item.sourcePath,
    destinationPath: item.destinationPath,
    detail: "Queued conversion was cancelled before it started; the source and destination were not touched.",
    startedAt: timestamp,
    completedAt: timestamp,
  };
}

function integerBetween(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
  }
  return value;
}
