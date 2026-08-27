import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import type {
  ConverterOutcome,
  ConverterQueueCursor,
  ConverterQueueItem,
  ConverterQueueItemInput,
  ConverterQueueItemState,
  ConverterQueuePage,
  ConverterQueueRecord,
  ConverterQueueState,
} from "../shared/converter.js";

const PAGE_LIMIT_MAX = 200;
const ITEM_SHARD_SIZE = 1_000;
const QUEUE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface ConverterStoreOptions {
  rootPath: string;
  now?: () => Date;
}

export class ConverterStore {
  readonly #rootPath: string;
  readonly #now: () => Date;
  #lock: Promise<void> = Promise.resolve();

  constructor(options: ConverterStoreOptions) {
    if (!isAbsolute(options.rootPath)) throw new Error("Converter queue storage must use an absolute application-data path.");
    this.#rootPath = resolve(options.rootPath);
    this.#now = options.now ?? (() => new Date());
  }

  async initialize(): Promise<void> {
    await mkdir(this.#queuesRoot(), { recursive: true });
  }

  async createQueue(label: string): Promise<ConverterQueueRecord> {
    const queueLabel = label.trim();
    if (queueLabel.length === 0 || queueLabel.length > 160) {
      throw new Error("A converter queue label must contain 1 through 160 characters.");
    }
    return await this.#exclusive(async () => {
      const now = this.#now().toISOString();
      const record: ConverterQueueRecord = {
        schemaVersion: 1,
        id: randomUUID(),
        label: queueLabel,
        state: "queued",
        createdAt: now,
        updatedAt: now,
        nextSequence: 1,
        nextClaimSequence: 1,
        reservedOutputBytes: 0,
        itemCounts: emptyCounts(),
      };
      await mkdir(this.#queuePath(record.id), { recursive: false });
      await atomicJson(this.#metadataPath(record.id), record);
      return record;
    });
  }

  async getQueue(queueId: string): Promise<ConverterQueueRecord> {
    requireQueueId(queueId);
    return parseQueue(await readBoundedText(this.#metadataPath(queueId), 256 * 1024));
  }

  async setQueueState(queueId: string, state: ConverterQueueState): Promise<ConverterQueueRecord> {
    return await this.#exclusive(async () => {
      const queue = await this.getQueue(queueId);
      const updated = { ...queue, state, updatedAt: this.#now().toISOString() };
      await atomicJson(this.#metadataPath(queueId), updated);
      return updated;
    });
  }

  async enqueueItem(queueId: string, input: ConverterQueueItemInput): Promise<ConverterQueueItem> {
    return await this.#exclusive(async () => {
      const queue = await this.getQueue(queueId);
      if (queue.state === "cancelled" || queue.state === "completed") {
        throw new Error(`Queue ${queueId} no longer accepts items because it is ${queue.state}.`);
      }
      validateItemInput(input);
      const sequence = queue.nextSequence;
      const now = this.#now().toISOString();
      const item: ConverterQueueItem = {
        ...input,
        schemaVersion: 1,
        id: `${queueId}:${sequence}`,
        queueId,
        sequence,
        state: "queued",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      };
      const updatedQueue: ConverterQueueRecord = {
        ...queue,
        updatedAt: now,
        nextSequence: sequence + 1,
        reservedOutputBytes: queue.reservedOutputBytes + input.estimatedOutputBytes,
        itemCounts: changeCount(queue.itemCounts, undefined, "queued"),
      };
      await atomicJson(this.#metadataPath(queueId), updatedQueue);
      await mkdir(this.#shardPath(queueId, sequence), { recursive: true });
      try {
        await atomicJson(this.#itemPath(queueId, sequence), item);
      } catch (error) {
        await atomicJson(this.#metadataPath(queueId), queue);
        throw error;
      }
      return item;
    });
  }

  async getItem(queueId: string, sequence: number): Promise<ConverterQueueItem | undefined> {
    requireQueueId(queueId);
    requireSequence(sequence);
    try {
      return parseItem(await readBoundedText(this.#itemPath(queueId, sequence), 512 * 1024));
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return undefined;
      throw error;
    }
  }

  async listPage(
    queueId: string,
    cursor: ConverterQueueCursor = { afterSequence: 0 },
    limit = 50,
  ): Promise<ConverterQueuePage> {
    requireQueueId(queueId);
    if (!Number.isSafeInteger(cursor.afterSequence) || cursor.afterSequence < 0) {
      throw new Error("Converter queue cursor is invalid.");
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > PAGE_LIMIT_MAX) {
      throw new Error(`Converter queue page limit must be 1 through ${PAGE_LIMIT_MAX}.`);
    }
    const queue = await this.getQueue(queueId);
    const items: ConverterQueueItem[] = [];
    let sequence = cursor.afterSequence + 1;
    while (sequence < queue.nextSequence && items.length < limit) {
      const item = await this.getItem(queueId, sequence);
      if (item) items.push(item);
      sequence += 1;
    }
    return {
      items,
      nextCursor: sequence < queue.nextSequence ? { afterSequence: sequence - 1 } : undefined,
    };
  }

  async claimNext(queueId: string): Promise<ConverterQueueItem | undefined> {
    return await this.#exclusive(async () => {
      const queue = await this.getQueue(queueId);
      if (queue.state !== "running") return undefined;
      let sequence = queue.nextClaimSequence;
      while (sequence < queue.nextSequence) {
        const item = await this.getItem(queueId, sequence);
        sequence += 1;
        if (!item || item.state !== "queued") continue;
        const now = this.#now().toISOString();
        const claimed: ConverterQueueItem = {
          ...item,
          state: "running",
          attempts: item.attempts + 1,
          updatedAt: now,
        };
        const updatedQueue: ConverterQueueRecord = {
          ...queue,
          nextClaimSequence: sequence,
          updatedAt: now,
          itemCounts: changeCount(queue.itemCounts, "queued", "running"),
        };
        await atomicJson(this.#itemPath(queueId, item.sequence), claimed);
        await atomicJson(this.#metadataPath(queueId), updatedQueue);
        return claimed;
      }
      if (queue.itemCounts.running === 0) {
        await atomicJson(this.#metadataPath(queueId), {
          ...queue,
          state: "completed",
          nextClaimSequence: sequence,
          updatedAt: this.#now().toISOString(),
        });
      }
      return undefined;
    });
  }

  async finishItem(
    queueId: string,
    sequence: number,
    state: Extract<ConverterQueueItemState, "converted" | "skipped" | "cancelled" | "failed">,
    outcome: ConverterOutcome,
  ): Promise<ConverterQueueItem> {
    return await this.#exclusive(async () => {
      const queue = await this.getQueue(queueId);
      const item = await this.getItem(queueId, sequence);
      if (!item) throw new Error(`Converter queue item ${queueId}:${sequence} does not exist.`);
      if (item.state !== "running" && !(state === "cancelled" && item.state === "queued")) {
        throw new Error(`Converter queue item ${item.id} cannot finish from state ${item.state}.`);
      }
      const now = this.#now().toISOString();
      const updated: ConverterQueueItem = { ...item, state, outcome, updatedAt: now };
      const updatedQueue: ConverterQueueRecord = {
        ...queue,
        updatedAt: now,
        reservedOutputBytes: Math.max(0, queue.reservedOutputBytes - item.estimatedOutputBytes),
        itemCounts: changeCount(queue.itemCounts, item.state, state),
      };
      await atomicJson(this.#itemPath(queueId, sequence), updated);
      await atomicJson(this.#metadataPath(queueId), updatedQueue);
      return updated;
    });
  }

  async reconcileAfterCrash(queueId: string): Promise<ConverterQueueRecord> {
    return await this.#exclusive(async () => {
      const queue = await this.getQueue(queueId);
      const counts = emptyCountsMutable();
      let reservedOutputBytes = 0;
      let firstQueued = queue.nextSequence;
      let cursor: ConverterQueueCursor | undefined = { afterSequence: 0 };
      do {
        const page = await this.listPage(queueId, cursor, PAGE_LIMIT_MAX);
        for (const item of page.items) {
          let reconciled = item;
          if (item.state === "running") {
            reconciled = { ...item, state: "queued", updatedAt: this.#now().toISOString() };
            await atomicJson(this.#itemPath(queueId, item.sequence), reconciled);
          }
          counts[reconciled.state] += 1;
          if (reconciled.state === "queued" || reconciled.state === "running") {
            reservedOutputBytes += reconciled.estimatedOutputBytes;
          }
          if (reconciled.state === "queued") firstQueued = Math.min(firstQueued, reconciled.sequence);
        }
        cursor = page.nextCursor;
      } while (cursor);
      const hasPending = counts.queued > 0 || counts.running > 0;
      const reconciledQueue: ConverterQueueRecord = {
        ...queue,
        state: queue.state === "cancelled" ? "cancelled" : hasPending ? "paused" : "completed",
        nextClaimSequence: firstQueued,
        reservedOutputBytes,
        itemCounts: counts,
        updatedAt: this.#now().toISOString(),
      };
      await atomicJson(this.#metadataPath(queueId), reconciledQueue);
      return reconciledQueue;
    });
  }

  #queuesRoot(): string {
    return join(this.#rootPath, "queues");
  }

  #queuePath(queueId: string): string {
    requireQueueId(queueId);
    return join(this.#queuesRoot(), queueId);
  }

  #metadataPath(queueId: string): string {
    return join(this.#queuePath(queueId), "queue.json");
  }

  #shardPath(queueId: string, sequence: number): string {
    const shard = Math.floor((sequence - 1) / ITEM_SHARD_SIZE);
    return join(this.#queuePath(queueId), "items", shard.toString().padStart(8, "0"));
  }

  #itemPath(queueId: string, sequence: number): string {
    requireSequence(sequence);
    return join(this.#shardPath(queueId, sequence), `${sequence.toString().padStart(16, "0")}.json`);
  }

  async #exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#lock;
    let release!: () => void;
    this.#lock = new Promise<void>((resolvePromise) => { release = resolvePromise; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await renameTransient(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

async function renameTransient(source: string, destination: string): Promise<void> {
  const delays = [0, 15, 30, 60, 120, 180];
  let lastError: unknown;
  for (const delayMs of delays) {
    if (delayMs > 0) await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, delayMs));
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      lastError = error;
      const code = isNodeError(error) ? error.code : undefined;
      if (code !== "EPERM" && code !== "EACCES" && code !== "EBUSY") throw error;
    }
  }
  throw lastError;
}

function validateItemInput(input: ConverterQueueItemInput): void {
  if (
    !input || typeof input.sourcePath !== "string" || typeof input.destinationPath !== "string" ||
    typeof input.adapterId !== "string" || !Array.isArray(input.acknowledgedDisclosureIds) ||
    !isAbsolute(input.sourcePath) || !isAbsolute(input.destinationPath)
  ) {
    throw new Error("Queued converter paths must be absolute.");
  }
  if (!Number.isSafeInteger(input.estimatedOutputBytes) || input.estimatedOutputBytes < 1) {
    throw new Error("A queued conversion needs a positive estimated output size.");
  }
}

function parseQueue(json: string): ConverterQueueRecord {
  const value = JSON.parse(json) as Partial<ConverterQueueRecord>;
  const states: ReadonlySet<string> = new Set(["queued", "running", "paused", "cancelled", "completed"]);
  const counts = value.itemCounts as Partial<Record<ConverterQueueItemState, number>> | undefined;
  if (
    value.schemaVersion !== 1 || typeof value.id !== "string" || !QUEUE_ID_PATTERN.test(value.id) ||
    typeof value.label !== "string" || value.label.length < 1 || value.label.length > 160 ||
    typeof value.state !== "string" || !states.has(value.state) ||
    !finiteDate(value.createdAt) || !finiteDate(value.updatedAt) ||
    !Number.isSafeInteger(value.nextSequence) || (value.nextSequence as number) < 1 ||
    !Number.isSafeInteger(value.nextClaimSequence) || (value.nextClaimSequence as number) < 1 ||
    (value.nextClaimSequence as number) > (value.nextSequence as number) ||
    !Number.isSafeInteger(value.reservedOutputBytes) || (value.reservedOutputBytes as number) < 0 || !validCounts(counts)
  ) {
    throw new Error("Converter queue metadata is invalid or unsupported.");
  }
  return value as ConverterQueueRecord;
}

function parseItem(json: string): ConverterQueueItem {
  const value = JSON.parse(json) as Partial<ConverterQueueItem>;
  const states: ReadonlySet<string> = new Set(["queued", "running", "converted", "skipped", "cancelled", "failed"]);
  if (
    value.schemaVersion !== 1 || typeof value.id !== "string" || typeof value.queueId !== "string" ||
    !QUEUE_ID_PATTERN.test(value.queueId) || !Number.isSafeInteger(value.sequence) || (value.sequence as number) < 1 ||
    value.id !== `${value.queueId}:${value.sequence}` || typeof value.state !== "string" || !states.has(value.state) ||
    !Number.isSafeInteger(value.attempts) || (value.attempts as number) < 0 ||
    typeof value.adapterId !== "string" || value.adapterId.length < 1 || value.adapterId.length > 160 ||
    typeof value.sourcePath !== "string" || !isAbsolute(value.sourcePath) || value.sourcePath.length > 32_768 ||
    typeof value.destinationPath !== "string" || !isAbsolute(value.destinationPath) || value.destinationPath.length > 32_768 ||
    typeof value.overwriteApproved !== "boolean" || !Array.isArray(value.acknowledgedDisclosureIds) ||
    value.acknowledgedDisclosureIds.some((id) => typeof id !== "string" || id.length > 256) ||
    !Number.isSafeInteger(value.estimatedOutputBytes) || (value.estimatedOutputBytes as number) < 1 ||
    !finiteDate(value.createdAt) || !finiteDate(value.updatedAt)
  ) {
    throw new Error("Converter queue item is invalid or unsupported.");
  }
  return value as ConverterQueueItem;
}

async function readBoundedText(path: string, maximumBytes: number): Promise<string> {
  const handle = await open(path, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 2 || before.size > maximumBytes) {
      throw new Error(`Converter queue record exceeds its ${maximumBytes}-byte bound or is not a regular file.`);
    }
    const bytes = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (offset !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error("Converter queue record changed while it was being read.");
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Converter queue record is not strict UTF-8.");
    }
  } finally {
    await handle.close();
  }
}

function validCounts(counts: Partial<Record<ConverterQueueItemState, number>> | undefined): boolean {
  if (!counts) return false;
  return (["queued", "running", "converted", "skipped", "cancelled", "failed"] as const)
    .every((state) => Number.isSafeInteger(counts[state]) && (counts[state] as number) >= 0);
}

function finiteDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function requireQueueId(queueId: string): void {
  if (!QUEUE_ID_PATTERN.test(queueId)) throw new Error("Converter queue id is invalid.");
}

function requireSequence(sequence: number): void {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Converter queue sequence is invalid.");
}

function emptyCounts(): Readonly<Record<ConverterQueueItemState, number>> {
  return emptyCountsMutable();
}

function emptyCountsMutable(): Record<ConverterQueueItemState, number> {
  return { queued: 0, running: 0, converted: 0, skipped: 0, cancelled: 0, failed: 0 };
}

function changeCount(
  current: Readonly<Record<ConverterQueueItemState, number>>,
  from: ConverterQueueItemState | undefined,
  to: ConverterQueueItemState,
): Readonly<Record<ConverterQueueItemState, number>> {
  const next = { ...current };
  if (from) next[from] = Math.max(0, next[from] - 1);
  next[to] += 1;
  return next;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === "string";
}
