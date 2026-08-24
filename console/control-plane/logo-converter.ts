/**
 * Local logo conversion boundary.
 *
 * The decoder is intentionally injected. A production adapter must run in the
 * application's isolated image process, with no ambient network and with the
 * limits from shared/logo.ts enforced by that process as well as here.
 */
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  DEFAULT_LOGO_CROP,
  LOGO_HANDLER_DESCRIPTORS,
  LOGO_MAX_CPU_MS,
  LOGO_MAX_MEMORY_BYTES,
  LOGO_MAX_OUTPUT_BYTES,
  LOGO_MAX_OUTPUTS,
  LOGO_PACKAGE_IDENTITY,
  inspectLogoBytes,
  canonicalLogoCrop,
  validateLogoCrop,
  validateLogoTargets,
  type LogoCacheClearRequest,
  type LogoCacheReadRequest,
  type LogoCacheAssetReadRequest,
  type LogoCacheRecord,
  type LogoCacheWriteRequest,
  type LogoConversionResult,
  type LogoCropModel,
  type LogoEncodedAsset,
  type LogoHandlerDescriptor,
  type LogoInspectionResult,
  type LogoOutputReceipt,
  type LogoSourceInput,
  type LogoTarget,
  type LogoValidationFailure,
} from '../shared/logo.js';

export interface LogoConversionRequest {
  readonly source: LogoSourceInput;
  readonly crop?: LogoCropModel;
  readonly targets: readonly LogoTarget[];
}

export interface IsolatedLogoDecoderOutput {
  readonly bytes: Uint8Array;
  readonly roundTripVerified: boolean;
  readonly cropDigest?: string;
  readonly lossNotes?: readonly string[];
  readonly peakMemoryBytes?: number;
}

export interface IsolatedLogoDecoderHealth {
  readonly workerPid: number;
  readonly baselinePid: number;
  readonly workerVersion: string;
  readonly workerRevision: string;
  readonly sharpVersion: string;
  readonly peakMemoryBytes: number;
  readonly baselineWorkingSetBytes: number;
  readonly peakWorkingSetBytes: number;
  readonly formats: readonly string[];
  readonly sharpIntegrity: string;
  readonly nativePlatform: string;
  readonly nativeArch: string;
  readonly nativeBindingPath: string;
  readonly nativeBindingSha256: string;
  readonly nativeFiles: readonly string[];
}

export interface IsolatedLogoDecoder {
  readonly kind: 'isolated';
  health(): Promise<IsolatedLogoDecoderHealth>;
  convert(input: {
    readonly source: Uint8Array;
    readonly sourceFormat: string;
    readonly target: LogoTarget;
    readonly crop: LogoCropModel;
  }): Promise<IsolatedLogoDecoderOutput>;
  reopen(input: { readonly bytes: Uint8Array; readonly target: LogoTarget }): Promise<LogoInspectionResult>;
}

export interface LogoConversionHandlers {
  readonly descriptors: readonly LogoHandlerDescriptor[];
  readonly inspect(request: LogoSourceInput): LogoInspectionResult;
  readonly convert(request: LogoConversionRequest): Promise<LogoConversionResult>;
  readonly cache: {
    readonly read(request: LogoCacheReadRequest): Promise<LogoCacheRecord | undefined>;
    readonly readAsset(request: LogoCacheAssetReadRequest): Promise<Uint8Array | undefined>;
    readonly write(request: LogoCacheWriteRequest): Promise<LogoCacheRecord>;
    readonly clear(request: LogoCacheClearRequest): Promise<void>;
  };
}

export interface LogoCacheBridge {
  read(request: LogoCacheReadRequest): Promise<LogoCacheRecord | undefined>;
  write(request: LogoCacheWriteRequest): Promise<LogoCacheRecord>;
  clear(request: LogoCacheClearRequest): Promise<void>;
}

function failure(code: LogoValidationFailure['code'], reason: string): LogoValidationFailure {
  return { ok: false, code, reason };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function cropDigest(crop: LogoCropModel): string {
  return createHash('sha256').update(canonicalLogoCrop(crop), 'utf8').digest('hex');
}

function outputReceipt(target: LogoTarget, bytes: Uint8Array, inspection: Exclude<LogoInspectionResult, LogoValidationFailure>['inspection'], crop: LogoCropModel, lossNotes: readonly string[], roundTripVerified: true): LogoOutputReceipt {
  return {
    target,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    cropDigest: cropDigest(crop),
    signature: inspection.signature,
    width: inspection.width,
    height: inspection.height,
    alpha: inspection.alpha,
    decoder: 'isolated',
    roundTripVerified,
    lossNotes: Object.freeze([...lossNotes]),
  };
}

function sameTarget(actual: Exclude<LogoInspectionResult, LogoValidationFailure>['inspection'], target: LogoTarget): boolean {
  return actual.format === target.format && actual.width === target.width && actual.height === target.height && actual.alpha === target.alpha;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return Object.keys(value).every((key) => allowed.has(key)) && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/** Validates the JSON envelope before any Base64 bytes are decoded. */
export function validateLogoWirePayload(value: unknown): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  if (!object(value) || !exactKeys(value, ['ok', 'packageIdentity', 'inspection', 'crop', 'outputs']) || value.ok !== true || value.packageIdentity !== LOGO_PACKAGE_IDENTITY || !object(value.inspection) || !object(value.crop) || !Array.isArray(value.outputs)) return { ok: false, reason: 'The logo conversion envelope is incomplete or has an unexpected field.' };
  const inspection = value.inspection;
  if (!exactKeys(inspection, ['format', 'width', 'height', 'frames', 'animated', 'alpha', 'decodedBytes', 'signature'], ['declaredMime', 'declaredExtension']) || !['png', 'jpeg', 'webp', 'svg'].includes(inspection.format as string) || !Number.isInteger(inspection.width) || !Number.isInteger(inspection.height) || !Number.isInteger(inspection.frames) || typeof inspection.animated !== 'boolean' || typeof inspection.alpha !== 'boolean' || !Number.isSafeInteger(inspection.decodedBytes) || typeof inspection.signature !== 'string' || inspection.signature.length > 128) return { ok: false, reason: 'The logo inspection receipt is invalid.' };
  const crop = value.crop as LogoCropModel;
  const cropCheck = validateLogoCrop(crop);
  if (!cropCheck.ok) return cropCheck;
  if (value.outputs.length < 1 || value.outputs.length > LOGO_MAX_OUTPUTS) return { ok: false, reason: 'The logo output count is outside the bounded limit.' };
  const targets: LogoTarget[] = [];
  for (const output of value.outputs) {
    if (!object(output) || !exactKeys(output, ['target', 'receipt', 'bytesBase64']) || typeof output.bytesBase64 !== 'string' || !object(output.target) || !object(output.receipt)) return { ok: false, reason: 'A logo output is incomplete or has an unexpected field.' };
    const target = output.target;
    if (!exactKeys(target, ['format', 'width', 'height', 'alpha'])) return { ok: false, reason: 'A logo target has an unexpected field.' };
    targets.push(target as unknown as LogoTarget);
    const receipt = output.receipt;
    if (!exactKeys(receipt, ['target', 'bytes', 'sha256', 'cropDigest', 'signature', 'width', 'height', 'alpha', 'decoder', 'roundTripVerified', 'lossNotes']) || !object(receipt.target) || !exactKeys(receipt.target, ['format', 'width', 'height', 'alpha']) || JSON.stringify(receipt.target) !== JSON.stringify(target) || !Number.isSafeInteger(receipt.bytes) || Number(receipt.bytes) < 1 || Number(receipt.bytes) > LOGO_MAX_OUTPUT_BYTES || typeof receipt.sha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(receipt.sha256) || typeof receipt.cropDigest !== 'string' || !/^[0-9a-f]{64}$/iu.test(receipt.cropDigest) || receipt.cropDigest !== cropDigest(crop) || typeof receipt.signature !== 'string' || receipt.signature.length > 128 || receipt.decoder !== 'isolated' || receipt.roundTripVerified !== true || !Array.isArray(receipt.lossNotes) || receipt.lossNotes.length > 32 || receipt.lossNotes.some((note) => typeof note !== 'string' || note.length > 512)) return { ok: false, reason: 'A logo output receipt is invalid.' };
  }
  const targetCheck = validateLogoTargets(targets);
  if (!targetCheck.ok) return targetCheck;
  return { ok: true };
}

/** Validates the fully decoded conversion and every independent output receipt. */
export function validateLogoConversionResult(result: LogoConversionResult): { readonly ok: true } | LogoValidationFailure {
  if (!result.ok || result.packageIdentity !== LOGO_PACKAGE_IDENTITY) return failure('OUTPUT_INVALID', 'The logo conversion package identity is invalid.');
  const cropCheck = validateLogoCrop(result.crop);
  if (!cropCheck.ok) return cropCheck;
  const targetCheck = validateLogoTargets(result.outputs.map((output) => output.target));
  if (!targetCheck.ok) return targetCheck;
  let totalBytes = 0;
  for (const output of result.outputs) {
    totalBytes += output.bytes.byteLength;
    if (totalBytes > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'The converted logo set exceeds the bounded output size.');
    const inspected = inspectLogoBytes(output.bytes, { declaredExtension: output.target.format });
    if (!inspected.ok || !sameTarget(inspected.inspection, output.target) || JSON.stringify(output.receipt.target) !== JSON.stringify(output.target) || inspected.inspection.signature !== output.receipt.signature || inspected.inspection.width !== output.receipt.width || inspected.inspection.height !== output.receipt.height || inspected.inspection.alpha !== output.receipt.alpha || output.receipt.bytes !== output.bytes.byteLength || output.receipt.sha256 !== sha256(output.bytes) || output.receipt.cropDigest !== cropDigest(result.crop) || output.receipt.roundTripVerified !== true) return failure('OUTPUT_INVALID', 'A converted logo output does not match its crop-bound receipt and independent inspection.');
  }
  return { ok: true };
}

export function createLogoConversionHandlers(decoder: IsolatedLogoDecoder | undefined, cache: LogoCacheBridge): LogoConversionHandlers {
  const inspect = (request: LogoSourceInput): LogoInspectionResult => {
    if (request.kind !== 'local') return failure('NETWORK_SOURCE', 'Logo sources must be selected from local bytes.');
    return inspectLogoBytes(request.bytes, request.metadata);
  };

  const convert = async (request: LogoConversionRequest): Promise<LogoConversionResult> => {
    if (request.source.kind !== 'local') return failure('NETWORK_SOURCE', 'Logo conversion accepts local files only and never fetches a URL.');
    const crop = request.crop ?? DEFAULT_LOGO_CROP;
    const cropCheck = validateLogoCrop(crop);
    if (!cropCheck.ok) return cropCheck;
    const targetCheck = validateLogoTargets(request.targets);
    if (!targetCheck.ok) return targetCheck;
    const declaredOutputPixels = request.targets.reduce((total, target) => total + target.width * target.height, 0);
    if (!Number.isSafeInteger(declaredOutputPixels) || declaredOutputPixels * 4 > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'The declared output pixel aggregate exceeds the bounded output budget.');
    const sourceCheck = inspect(request.source);
    if (!sourceCheck.ok) return sourceCheck;
    if (!decoder) return failure('DECODER_UNAVAILABLE', 'The isolated image decoder is not registered for this build.');

    const started = performance.now();
    const assets: LogoEncodedAsset[] = [];
    let totalOutputBytes = 0;
    for (const target of request.targets) {
      if (performance.now() - started > LOGO_MAX_CPU_MS) return failure('TIME_LIMIT', 'Logo conversion exceeded its bounded CPU time.');
      let decoded: IsolatedLogoDecoderOutput;
      try {
        decoded = await decoder.convert({ source: request.source.bytes, sourceFormat: sourceCheck.inspection.format, target, crop });
      } catch {
        return failure('DECODER_FAILED', 'The isolated image decoder rejected the logo. The previous logo remains active.');
      }
      if (!(decoded.bytes instanceof Uint8Array)) return failure('DECODER_FAILED', 'The isolated image decoder returned no byte buffer.');
      if (!decoded.roundTripVerified) return failure('OUTPUT_INVALID', 'The decoder did not verify its output by reopening it.');
      if (decoded.cropDigest !== cropDigest(crop)) return failure('OUTPUT_INVALID', 'The isolated decoder did not return the exact applied crop policy.');
      if ((decoded.peakMemoryBytes ?? 0) > LOGO_MAX_MEMORY_BYTES) return failure('MEMORY_LIMIT', 'The decoder exceeded the bounded memory budget.');
      if (decoded.bytes.byteLength > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'A converted logo exceeds the bounded output size.');
      totalOutputBytes += decoded.bytes.byteLength;
      if (totalOutputBytes > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'The converted logo set exceeds the bounded output size.');
      const reopened = await decoder.reopen({ bytes: decoded.bytes, target });
      const roundTripVerified = decoded.roundTripVerified && reopened.ok && sameTarget(reopened.inspection, target);
      if (roundTripVerified !== true) return failure('OUTPUT_INVALID', 'The isolated image decoder did not reopen the output with the requested target shape.');
      const outputCheck = inspectLogoBytes(decoded.bytes, { declaredExtension: target.format });
      if (!outputCheck.ok) return failure('OUTPUT_INVALID', 'The converted bytes failed independent signature and dimension inspection.');
      if (!sameTarget(outputCheck.inspection, target)) return failure('OUTPUT_INVALID', 'The converted bytes do not match the requested format, dimensions, or alpha policy.');
      assets.push({
        target,
        bytes: decoded.bytes,
        receipt: outputReceipt(target, decoded.bytes, outputCheck.inspection, crop, decoded.lossNotes ?? [], roundTripVerified),
      });
    }
    const result: LogoConversionResult = {
      ok: true,
      inspection: sourceCheck.inspection,
      crop,
      outputs: Object.freeze(assets),
      packageIdentity: LOGO_PACKAGE_IDENTITY,
    };
    const resultCheck = validateLogoConversionResult(result);
    return resultCheck.ok ? result : resultCheck;
  };

  return Object.freeze({
    descriptors: LOGO_HANDLER_DESCRIPTORS,
    inspect,
    convert,
    cache,
  });
}

