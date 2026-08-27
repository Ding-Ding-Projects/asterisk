import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, rename, rm, statfs } from "node:fs/promises";
import { dirname, isAbsolute, parse, resolve, sep } from "node:path";
import type {
  ConverterAdapter,
  PdfInspectResult,
  PdfOperation,
  PdfOperationPlan,
  PdfOperationRequest,
  PdfValidationExpectation,
} from "../shared/converter.js";
import { ConverterRegistry } from "./converter-registry.js";
import { sniffFileType } from "./converter-sniff.js";

export interface PdfCapability {
  operation: PdfOperation;
  available: boolean;
  adapterId?: string;
  reason?: string;
}

export interface PdfOutputInspector {
  inspectorId: string;
  inspect(path: string, signal?: AbortSignal): Promise<PdfInspectResult>;
}

export interface PdfOperationExecutor {
  adapterId: string;
  execute(plan: PdfOperationPlan, temporaryOutputPath: string, signal?: AbortSignal): Promise<void>;
}

const PDF_OPERATIONS: ReadonlyArray<PdfOperation> = [
  "inspect",
  "split",
  "merge",
  "extract",
  "reorder",
  "rotate",
  "metadata",
];

export function pdfCapabilities(registry: ConverterRegistry): ReadonlyArray<PdfCapability> {
  return PDF_OPERATIONS.map((operation) => {
    const candidates = registry.adapters().filter((adapter) => adapter.pdfOperations?.includes(operation));
    const enabled = candidates.find((adapter) => adapter.availability.state === "enabled");
    if (enabled) return { operation, available: true, adapterId: enabled.id };
    const unavailable = candidates[0];
    return {
      operation,
      available: false,
      adapterId: unavailable?.id,
      reason: unavailable?.availability.state === "unavailable"
        ? unavailable.availability.reason
        : `No adapter declares the PDF ${operation} operation.`,
    };
  });
}

export function planPdfOperation(
  registry: ConverterRegistry,
  request: PdfOperationRequest,
  acknowledgedDisclosureIds: ReadonlyArray<string>,
): PdfOperationPlan {
  validatePdfOperationRequest(request);
  const adapter = registry.adapters().find(
    (candidate) => candidate.availability.state === "enabled" && candidate.pdfOperations?.includes(request.operation),
  );
  if (!adapter) {
    const capability = pdfCapabilities(registry).find((entry) => entry.operation === request.operation);
    throw new Error(capability?.reason ?? `PDF ${request.operation} is unavailable.`);
  }
  requirePdfAdapter(adapter);
  const acknowledgements = new Set(acknowledgedDisclosureIds);
  const missing = adapter.disclosureIds.filter((id) => !acknowledgements.has(id));
  if (missing.length > 0) {
    throw new Error(`PDF operation disclosure must be acknowledged before running: ${missing.join(", ")}.`);
  }
  return { adapterId: adapter.id, request, limits: adapter.limits, disclosures: adapter.disclosures };
}

export function validatePdfOperationRequest(request: PdfOperationRequest): void {
  if (!request || !PDF_OPERATIONS.includes(request.operation)) throw new Error("Unknown PDF operation.");
  if (request.sourcePaths.length === 0 || request.sourcePaths.length > 1_000) {
    throw new Error("A PDF operation requires 1 through 1,000 source files.");
  }
  for (const source of request.sourcePaths) {
    if (!isAbsolute(source) || source.includes("\0")) throw new Error("PDF source paths must be absolute and contain no null byte.");
  }
  if (new Set(request.sourcePaths).size !== request.sourcePaths.length) {
    throw new Error("A PDF operation cannot name the same source file more than once.");
  }
  switch (request.operation) {
    case "inspect":
      return;
    case "split":
      if (request.ranges.length === 0 || request.ranges.length > 10_000) throw new Error("PDF split requires 1 through 10,000 ranges.");
      for (const [start, end] of request.ranges) requirePageRange(start, end);
      return;
    case "merge":
      if (request.sourcePaths.length < 2) throw new Error("PDF merge requires at least two source files.");
      return;
    case "extract":
      requirePageList(request.pages, "extract");
      return;
    case "reorder":
      requirePageList(request.pageOrder, "reorder");
      if (new Set(request.pageOrder).size !== request.pageOrder.length) {
        throw new Error("PDF reorder cannot repeat a page number.");
      }
      return;
    case "rotate":
      requirePageList(request.pages, "rotate");
      if (![90, 180, 270].includes(request.degrees)) throw new Error("PDF rotation must be 90, 180, or 270 degrees.");
      return;
    case "metadata": {
      const entries = Object.entries(request.metadata);
      if (entries.length > 256) throw new Error("PDF metadata update accepts at most 256 fields.");
      for (const [key, value] of entries) {
        if (key.trim().length === 0 || key.length > 128 || (value !== null && value.length > 4_096)) {
          throw new Error("PDF metadata keys and values exceed the supported bounds.");
        }
      }
    }
  }
}

/**
 * PDF adapters must reopen the output through an independent parser after the atomic
 * temporary write. This comparison is intentionally separate from the adapter that wrote
 * the file so a self-reported success cannot satisfy its own validation contract.
 */
export async function reopenAndValidatePdf(
  outputPath: string,
  inspector: PdfOutputInspector,
  expectation: PdfValidationExpectation,
  signal?: AbortSignal,
): Promise<PdfInspectResult> {
  if (!isAbsolute(outputPath)) throw new Error("PDF output validation requires an absolute path.");
  if (signal?.aborted) throw abortError();
  const actual = await inspector.inspect(outputPath, signal);
  if (!Number.isSafeInteger(actual.pageCount) || actual.pageCount < 1) {
    throw new Error("Reopened PDF reported an invalid page count.");
  }
  if (actual.pageFingerprints.length !== actual.pageCount || actual.rotations.length !== actual.pageCount) {
    throw new Error("Reopened PDF inspection did not provide one rotation and fingerprint for every page.");
  }
  if (expectation.pageCount !== undefined && actual.pageCount !== expectation.pageCount) {
    throw new Error(`Reopened PDF has ${actual.pageCount} pages; ${expectation.pageCount} were expected.`);
  }
  if (expectation.rotations && !sameNumbers(actual.rotations, expectation.rotations)) {
    throw new Error("Reopened PDF page rotations do not match the requested operation.");
  }
  if (expectation.metadata) {
    for (const [key, value] of Object.entries(expectation.metadata)) {
      if (actual.metadata[key] !== value) throw new Error(`Reopened PDF metadata field ${key} did not match the requested value.`);
    }
  }
  if (expectation.pageOrder) {
    if (!expectation.pageFingerprints || expectation.pageFingerprints.length !== expectation.pageOrder.length) {
      throw new Error("Page-order validation requires an independently captured fingerprint for every expected page.");
    }
    if (
      actual.pageFingerprints.length !== expectation.pageFingerprints.length ||
      actual.pageFingerprints.some((fingerprint, index) => fingerprint !== expectation.pageFingerprints?.[index])
    ) throw new Error("Reopened PDF page fingerprints do not match the requested page order.");
  }
  return actual;
}

export async function executePdfOperationAtomic(
  plan: PdfOperationPlan,
  destinationPath: string,
  overwriteApproved: boolean,
  executor: PdfOperationExecutor,
  inspector: PdfOutputInspector,
  expectation: PdfValidationExpectation,
  signal?: AbortSignal,
): Promise<PdfInspectResult> {
  validatePdfOperationRequest(plan.request);
  if (!isAbsolute(destinationPath) || destinationPath.includes("\0")) {
    throw new Error("PDF destination must be an absolute path containing no null byte.");
  }
  if (executor.adapterId !== plan.adapterId) {
    throw new Error(`PDF executor ${executor.adapterId} cannot run plan for adapter ${plan.adapterId}.`);
  }
  if (inspector.inspectorId === plan.adapterId) {
    throw new Error("PDF output must be reopened by an inspector independent from the adapter that wrote it.");
  }
  const resolvedDestination = resolve(destinationPath);
  if (plan.request.sourcePaths.some((source) => resolve(source) === resolvedDestination)) {
    throw new Error("PDF destination must differ from every source file.");
  }
  let totalInputBytes = 0;
  const sourceDigests = new Map<string, string>();
  for (const source of plan.request.sourcePaths) {
    const sourceInfo = await lstat(source);
    if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile() || sourceInfo.size === 0) {
      throw new Error("Every PDF source must be a non-empty regular file, not a symbolic link.");
    }
    if (sourceInfo.size > plan.limits.maxInputBytes) {
      throw new Error(`A PDF source is ${sourceInfo.size} bytes, over the adapter's ${plan.limits.maxInputBytes}-byte input limit.`);
    }
    const sniffed = await sniffFileType(source);
    if (sniffed.formatId !== "application/pdf") {
      throw new Error(`PDF operation source bytes were identified as ${sniffed.formatId ?? "unknown"}.`);
    }
    sourceDigests.set(source, await sha256File(source, signal));
    totalInputBytes += sourceInfo.size;
    if (!Number.isSafeInteger(totalInputBytes) || totalInputBytes > plan.limits.maxTemporaryBytes) {
      throw new Error(`Combined PDF sources exceed the adapter's ${plan.limits.maxTemporaryBytes}-byte temporary-storage limit.`);
    }
  }
  await mkdir(dirname(resolvedDestination), { recursive: true });
  await assertNoSymlinkComponents(dirname(resolvedDestination));
  try {
    const existing = await lstat(resolvedDestination);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error("An existing PDF destination must be a regular file, not a symbolic link.");
    }
    if (!overwriteApproved) throw new Error("The PDF destination exists and overwrite approval was not supplied.");
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
  }
  const storage = await statfs(dirname(resolvedDestination));
  const available = Number(storage.bavail) * Number(storage.bsize);
  if (!Number.isFinite(available) || available < plan.limits.maxOutputBytes) {
    throw new Error(`PDF destination storage has ${available} bytes available; the adapter reserves ${plan.limits.maxOutputBytes} bytes.`);
  }
  const temporaryPath = `${resolvedDestination}.pdf-converter-${process.pid}-${randomUUID()}.tmp`;
  try {
    throwIfAborted(signal);
    await executor.execute(plan, temporaryPath, signal);
    throwIfAborted(signal);
    for (const [source, digest] of sourceDigests) {
      if (await sha256File(source, signal) !== digest) {
        throw new Error("A PDF source changed while the operation was running, so the temporary output was refused.");
      }
    }
    const temporary = await lstat(temporaryPath);
    if (temporary.isSymbolicLink() || !temporary.isFile() || temporary.size === 0 || temporary.size > plan.limits.maxOutputBytes) {
      throw new Error("PDF adapter output is empty, not a regular file, or exceeds its declared output bound.");
    }
    const validated = await reopenAndValidatePdf(temporaryPath, inspector, expectation, signal);
    throwIfAborted(signal);
    await renameWithRetry(temporaryPath, resolvedDestination, signal);
    return validated;
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

function requirePdfAdapter(adapter: ConverterAdapter): void {
  if (adapter.outputValidation.kind !== "pdf-reopen") {
    throw new Error(`PDF adapter ${adapter.id} does not require independent reopen validation.`);
  }
  if (adapter.sandbox.network !== "disabled" || adapter.sandbox.shell !== false) {
    throw new Error(`PDF adapter ${adapter.id} does not meet the offline isolated-execution contract.`);
  }
  if (adapter.availability.state !== "enabled" || !adapter.availability.proof.packagedArtifact) {
    throw new Error(`PDF adapter ${adapter.id} has no packaged-artifact proof.`);
  }
}

function requirePageRange(start: number, end: number): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
    throw new Error("PDF page ranges use positive one-based integers with the end at or after the start.");
  }
}

function requirePageList(pages: ReadonlyArray<number>, operation: string): void {
  if (pages.length === 0 || pages.length > 100_000) {
    throw new Error(`PDF ${operation} requires 1 through 100,000 page numbers.`);
  }
  if (pages.some((page) => !Number.isSafeInteger(page) || page < 1)) {
    throw new Error(`PDF ${operation} page numbers must be positive one-based integers.`);
  }
}

function sameNumbers(left: ReadonlyArray<number>, right: ReadonlyArray<number>): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function abortError(): Error {
  const error = new Error("PDF output validation was cancelled.");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

async function renameWithRetry(source: string, destination: string, signal?: AbortSignal): Promise<void> {
  const delays = [0, 15, 30, 60, 120, 180];
  let lastError: unknown;
  for (const delayMs of delays) {
    throwIfAborted(signal);
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === "string";
}

async function assertNoSymlinkComponents(path: string): Promise<void> {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  const parts = absolute.slice(root.length).split(sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = resolve(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error("PDF destination path cannot traverse a symbolic link.");
    if (!info.isDirectory()) throw new Error("A PDF destination parent is not a directory.");
  }
}

async function sha256File(path: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  try {
    for await (const chunk of stream) {
      throwIfAborted(signal);
      hash.update(chunk);
    }
    return hash.digest("hex");
  } finally {
    stream.destroy();
  }
}
