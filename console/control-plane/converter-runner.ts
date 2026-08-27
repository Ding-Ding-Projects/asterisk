import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm, stat, statfs } from "node:fs/promises";
import { dirname, isAbsolute, parse, resolve, sep } from "node:path";
import { Worker } from "node:worker_threads";
import type {
  ConverterAdapter,
  ConverterOutcome,
  ConverterProgress,
  ConverterRequest,
} from "../shared/converter.js";
import { ConverterRegistry } from "./converter-registry.js";
import { sniffBuffer } from "./converter-sniff.js";

export interface ConverterRunnerOptions {
  registry: ConverterRegistry;
  now?: () => Date;
}

export type ConverterProgressListener = (progress: ConverterProgress) => void;

const WORKER_SOURCE = String.raw`
"use strict";
const { parentPort, workerData } = require("node:worker_threads");

function strictUtf8(bytes) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function canonicalBase64(value) {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  return Buffer.from(value, "base64").toString("base64") === value;
}

try {
  const input = Buffer.from(workerData.inputBase64, "base64");
  let output;
  switch (workerData.kernel) {
    case "builtin:utf8-to-base64": {
      const text = strictUtf8(input);
      output = Buffer.from(Buffer.from(text, "utf8").toString("base64") + "\n", "ascii");
      break;
    }
    case "builtin:base64-to-binary": {
      const compact = strictUtf8(input).replace(/\s+/g, "");
      if (!canonicalBase64(compact)) throw new Error("Input is not canonical Base64 text.");
      output = Buffer.from(compact, "base64");
      break;
    }
    case "builtin:binary-to-hex":
      output = Buffer.from(input.toString("hex") + "\n", "ascii");
      break;
    case "builtin:hex-to-binary": {
      const compact = strictUtf8(input).replace(/\s+/g, "");
      if (compact.length === 0 || compact.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(compact)) {
        throw new Error("Input is not even-length hexadecimal text.");
      }
      output = Buffer.from(compact, "hex");
      break;
    }
    case "builtin:normalize-utf8": {
      const normalized = strictUtf8(input).replace(/^\uFEFF/, "").replace(/\r\n|\r/g, "\n");
      output = Buffer.from(normalized.replace(/\n*$/, "") + "\n", "utf8");
      break;
    }
    default:
      throw new Error("The requested fixed converter kernel is not allowlisted.");
  }
  parentPort.postMessage({ ok: true, outputBase64: output.toString("base64"), outputBytes: output.byteLength });
} catch (error) {
  parentPort.postMessage({ ok: false, error: error instanceof Error ? error.message : "Conversion failed." });
}
`;

export class ConverterRunner {
  readonly #registry: ConverterRegistry;
  readonly #now: () => Date;

  constructor(options: ConverterRunnerOptions) {
    this.#registry = options.registry;
    this.#now = options.now ?? (() => new Date());
  }

  async convert(
    request: ConverterRequest,
    signal?: AbortSignal,
    onProgress?: ConverterProgressListener,
  ): Promise<ConverterOutcome> {
    const startedAt = this.#now().toISOString();
    const adapterId = typeof request?.adapterId === "string" ? request.adapterId : "invalid";
    const sourcePathForOutcome = typeof request?.sourcePath === "string" ? request.sourcePath : "";
    const destinationPathForOutcome = typeof request?.destinationPath === "string" ? request.destinationPath : "";
    try {
      throwIfAborted(signal);
      const adapter = this.#registry.requireEnabledAdapter(adapterId);
      validateRequest(request, adapter);
      onProgress?.({ phase: "preflight", completedBytes: 0, detail: "Validating source, destination, adapter proof, storage, and disclosures." });

      const sourcePath = resolve(request.sourcePath);
      const destinationPath = resolve(request.destinationPath);
      if (sourcePath === destinationPath) throw new Error("Source and destination must be different files.");
      await assertRegularNonSymlinkFile(sourcePath);
      await mkdir(dirname(destinationPath), { recursive: true });
      await assertNoSymlinkComponents(dirname(destinationPath));
      await assertDestinationPolicy(destinationPath, request.overwriteApproved);

      const sourceInfo = await stat(sourcePath);
      if (sourceInfo.size === 0) throw new Error("Empty files are not converted.");
      if (sourceInfo.size > adapter.limits.maxInputBytes) {
        throw new Error(`Input is ${sourceInfo.size} bytes, over this adapter's ${adapter.limits.maxInputBytes}-byte limit.`);
      }
      await requireStorage(dirname(destinationPath), adapter.limits.maxOutputBytes);

      throwIfAborted(signal);
      onProgress?.({ phase: "reading", completedBytes: 0, totalBytes: sourceInfo.size, detail: "Reading one bounded source file." });
      const input = await readSourceBounded(sourcePath, adapter.limits.maxInputBytes, signal);
      const sniffed = sniffBuffer(input, input.byteLength, true);
      if (!sniffed.formatId || !sniffed.candidateFormatIds.some((formatId) => adapter.sourceFormats.includes(formatId))) {
        throw new Error(
          `Input bytes were identified as ${sniffed.formatId ?? "unknown"}; adapter ${adapter.id} accepts ${adapter.sourceFormats.join(", ")}.`,
        );
      }

      throwIfAborted(signal);
      onProgress?.({ phase: "converting", completedBytes: input.byteLength, totalBytes: input.byteLength, detail: "Running the fixed allowlisted worker kernel with no shell or network operation." });
      const output = await runFixedWorker(adapter, input, signal);
      if (output.byteLength === 0) throw new Error("The adapter returned an empty output.");
      if (output.byteLength > adapter.limits.maxOutputBytes) {
        throw new Error(`Output is ${output.byteLength} bytes, over this adapter's ${adapter.limits.maxOutputBytes}-byte limit.`);
      }

      onProgress?.({ phase: "validating", completedBytes: output.byteLength, totalBytes: output.byteLength, detail: "Validating output bytes before they can replace the destination." });
      validateOutputBytes(output, adapter);
      throwIfAborted(signal);
      onProgress?.({ phase: "writing", completedBytes: 0, totalBytes: output.byteLength, detail: "Writing and syncing a temporary file beside the destination." });
      await writeAtomicValidated(destinationPath, output, adapter, signal);
      onProgress?.({ phase: "complete", completedBytes: output.byteLength, totalBytes: output.byteLength, detail: "The destination was atomically replaced after post-write validation." });

      return {
        state: "converted",
        adapterId: adapter.id,
        sourcePath,
        destinationPath,
        inputBytes: input.byteLength,
        outputBytes: output.byteLength,
        sourceFormat: sniffed.formatId,
        targetFormat: adapter.targetFormat,
        detail: "Converted locally; source bytes were unchanged and the destination was validated before atomic replacement.",
        startedAt,
        completedAt: this.#now().toISOString(),
      };
    } catch (error) {
      const cancelled = signal?.aborted === true || isAbortError(error);
      return {
        state: cancelled ? "cancelled" : "failed",
        adapterId,
        sourcePath: sourcePathForOutcome,
        destinationPath: destinationPathForOutcome,
        detail: cancelled ? "Conversion was cancelled before the destination was replaced." : errorMessage(error),
        startedAt,
        completedAt: this.#now().toISOString(),
      };
    }
  }
}

function validateRequest(request: ConverterRequest, adapter: ConverterAdapter): void {
  if (
    !request || typeof request.sourcePath !== "string" || typeof request.destinationPath !== "string" ||
    typeof request.adapterId !== "string" || !Array.isArray(request.acknowledgedDisclosureIds) ||
    !isAbsolute(request.sourcePath) || !isAbsolute(request.destinationPath)
  ) {
    throw new Error("Converter source and destination paths must be absolute.");
  }
  if (request.sourcePath.includes("\0") || request.destinationPath.includes("\0")) {
    throw new Error("Converter paths cannot contain a null byte.");
  }
  const acknowledged = new Set(request.acknowledgedDisclosureIds);
  const missing = adapter.disclosureIds.filter((id) => !acknowledged.has(id));
  if (missing.length > 0) {
    throw new Error(`Conversion disclosure must be acknowledged before running: ${missing.join(", ")}.`);
  }
  if (adapter.sandbox.kind !== "fixed-worker-kernel" || !adapter.sandbox.kernel) {
    throw new Error(`Adapter ${adapter.id} has no implemented isolated execution kernel.`);
  }
}

async function runFixedWorker(
  adapter: ConverterAdapter,
  input: Buffer,
  signal?: AbortSignal,
): Promise<Buffer> {
  const kernel = adapter.sandbox.kernel;
  if (!kernel) throw new Error("The adapter has no fixed converter kernel.");
  throwIfAborted(signal);
  return await new Promise<Buffer>((resolvePromise, reject) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: { kernel, inputBase64: input.toString("base64") },
      resourceLimits: {
        maxOldGenerationSizeMb: adapter.limits.memoryMb,
        maxYoungGenerationSizeMb: Math.min(32, Math.max(8, Math.floor(adapter.limits.memoryMb / 4))),
        stackSizeMb: 4,
      },
    });
    let settled = false;
    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      operation();
    };
    const onAbort = (): void => finish(() => {
      void worker.terminate();
      reject(abortError());
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => finish(() => {
      void worker.terminate();
      reject(new Error(`Converter worker exceeded its ${adapter.limits.timeoutMs}-millisecond deadline.`));
    }), adapter.limits.timeoutMs);
    worker.once("message", (message: unknown) => finish(() => {
      void worker.terminate();
      if (!isWorkerSuccess(message)) {
        reject(new Error(isWorkerFailure(message) ? message.error : "Converter worker returned an invalid response."));
        return;
      }
      const output = Buffer.from(message.outputBase64, "base64");
      if (output.byteLength !== message.outputBytes) {
        reject(new Error("Converter worker output length did not match its declared length."));
        return;
      }
      resolvePromise(output);
    }));
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", (code) => {
      if (!settled) finish(() => reject(new Error(`Converter worker exited with code ${code} before returning a result.`)));
    });
  });
}

interface WorkerSuccess { ok: true; outputBase64: string; outputBytes: number }
interface WorkerFailure { ok: false; error: string }

function isWorkerSuccess(value: unknown): value is WorkerSuccess {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.ok === true && typeof record.outputBase64 === "string" && Number.isSafeInteger(record.outputBytes) && (record.outputBytes as number) >= 0;
}

function isWorkerFailure(value: unknown): value is WorkerFailure {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.ok === false && typeof record.error === "string";
}

async function writeAtomicValidated(
  destinationPath: string,
  output: Buffer,
  adapter: ConverterAdapter,
  signal?: AbortSignal,
): Promise<void> {
  const temporaryPath = `${destinationPath}.converter-${process.pid}-${randomUUID()}.tmp`;
  try {
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(output);
      await handle.sync();
    } finally {
      await handle.close();
    }
    throwIfAborted(signal);
    const reopened = await readFile(temporaryPath);
    if (!reopened.equals(output)) throw new Error("Post-write byte validation did not match the converter output.");
    validateOutputBytes(reopened, adapter);
    throwIfAborted(signal);
    await renameWithTransientRetry(temporaryPath, destinationPath, signal);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

function validateOutputBytes(bytes: Buffer, adapter: ConverterAdapter): void {
  switch (adapter.outputValidation.kind) {
    case "binary-nonempty":
      if (bytes.length === 0) throw new Error("Output validation refused an empty binary file.");
      return;
    case "utf8-text": {
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new Error("Output validation refused text that is not strict UTF-8.");
      }
      return;
    }
    case "base64-text": {
      const value = bytes.toString("utf8").replace(/\s+/gu, "");
      if (value.length === 0 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
        throw new Error("Output validation refused malformed Base64 text.");
      }
      if (Buffer.from(value, "base64").toString("base64") !== value) {
        throw new Error("Output validation refused non-canonical Base64 text.");
      }
      return;
    }
    case "hex-text": {
      const value = bytes.toString("utf8").replace(/\s+/gu, "");
      if (value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(value)) {
        throw new Error("Output validation refused malformed hexadecimal text.");
      }
      return;
    }
    case "sniffed-format": {
      const sniffed = sniffBuffer(bytes, bytes.byteLength, true);
      if (sniffed.formatId !== adapter.outputValidation.expectedFormat) {
        throw new Error(`Output validation expected ${adapter.outputValidation.expectedFormat} but found ${sniffed.formatId ?? "unknown"}.`);
      }
      return;
    }
    case "pdf-reopen":
      throw new Error("PDF output requires a PDF-specific reopen validator and cannot use the generic converter runner.");
  }
}

async function assertRegularNonSymlinkFile(path: string): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new Error("Converter source cannot be a symbolic link.");
  if (!info.isFile()) throw new Error("Converter source must be a regular file.");
}

async function readSourceBounded(path: string, maximumBytes: number, signal?: AbortSignal): Promise<Buffer> {
  const handle = await open(path, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size === 0 || before.size > maximumBytes) {
      throw new Error(`Input changed before reading or exceeds the ${maximumBytes}-byte adapter limit.`);
    }
    const bytes = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      throwIfAborted(signal);
      const result = await handle.read(bytes, offset, Math.min(1024 * 1024, bytes.length - offset), offset);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (offset !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error("Input changed while it was being read, so no output was written.");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function assertDestinationPolicy(path: string, overwriteApproved: boolean): Promise<void> {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error("Converter destination cannot be a symbolic link.");
    if (!info.isFile()) throw new Error("An existing converter destination must be a regular file.");
    if (!overwriteApproved) throw new Error("The destination already exists and overwrite approval was not supplied.");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return;
    throw error;
  }
}

async function assertNoSymlinkComponents(path: string): Promise<void> {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  const parts = absolute.slice(root.length).split(sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = resolve(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error("Converter destination path cannot traverse a symbolic link.");
    if (!info.isDirectory()) throw new Error("A converter destination parent is not a directory.");
  }
}

async function requireStorage(directory: string, requiredBytes: number): Promise<void> {
  const storage = await statfs(directory);
  const available = Number(storage.bavail) * Number(storage.bsize);
  if (!Number.isFinite(available) || available < requiredBytes) {
    throw new Error(`Destination storage has ${available} bytes available; this adapter reserves up to ${requiredBytes} bytes.`);
  }
}

async function renameWithTransientRetry(source: string, destination: string, signal?: AbortSignal): Promise<void> {
  const delays = [0, 15, 30, 60, 120, 180];
  let lastError: unknown;
  for (const delayMs of delays) {
    throwIfAborted(signal);
    if (delayMs > 0) await delay(delayMs, signal);
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

async function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError();
  await new Promise<void>((resolvePromise, reject) => {
    const finish = (): void => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    };
    const timer = setTimeout(finish, milliseconds);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function abortError(): Error {
  const error = new Error("Operation cancelled.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === "string";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Conversion failed for an unknown reason.";
}
