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
  LOGO_PACKAGE_IDENTITY,
  inspectLogoBytes,
  validateLogoCrop,
  validateLogoTargets,
  type LogoCacheClearRequest,
  type LogoCacheReadRequest,
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
  readonly lossNotes?: readonly string[];
  readonly peakMemoryBytes?: number;
}

export interface IsolatedLogoDecoder {
  readonly kind: 'isolated';
  convert(input: {
    readonly source: Uint8Array;
    readonly sourceFormat: string;
    readonly target: LogoTarget;
    readonly crop: LogoCropModel;
  }): Promise<IsolatedLogoDecoderOutput>;
}

export interface LogoConversionHandlers {
  readonly descriptors: readonly LogoHandlerDescriptor[];
  inspect(request: LogoSourceInput): LogoInspectionResult;
  convert(request: LogoConversionRequest): Promise<LogoConversionResult>;
  readonly cache: {
    read(request: LogoCacheReadRequest): Promise<LogoCacheRecord | undefined>;
    write(request: LogoCacheWriteRequest): Promise<LogoCacheRecord>;
    clear(request: LogoCacheClearRequest): Promise<void>;
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

function outputReceipt(target: LogoTarget, bytes: Uint8Array, inspection: Exclude<LogoInspectionResult, LogoValidationFailure>['inspection'], lossNotes: readonly string[]): LogoOutputReceipt {
  return {
    target,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    signature: inspection.signature,
    width: inspection.width,
    height: inspection.height,
    alpha: inspection.alpha,
    decoder: 'isolated',
    roundTripVerified: true,
    lossNotes: Object.freeze([...lossNotes]),
  };
}

function sameTarget(actual: Exclude<LogoInspectionResult, LogoValidationFailure>['inspection'], target: LogoTarget): boolean {
  return actual.format === target.format && actual.width === target.width && actual.height === target.height && actual.alpha === target.alpha;
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
      if ((decoded.peakMemoryBytes ?? 0) > LOGO_MAX_MEMORY_BYTES) return failure('MEMORY_LIMIT', 'The decoder exceeded the bounded memory budget.');
      if (decoded.bytes.byteLength > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'A converted logo exceeds the bounded output size.');
      totalOutputBytes += decoded.bytes.byteLength;
      if (totalOutputBytes > LOGO_MAX_OUTPUT_BYTES) return failure('OUTPUT_TOO_LARGE', 'The converted logo set exceeds the bounded output size.');
      const outputCheck = inspectLogoBytes(decoded.bytes, { declaredExtension: target.format });
      if (!outputCheck.ok) return failure('OUTPUT_INVALID', 'The converted bytes failed independent signature and dimension inspection.');
      if (!sameTarget(outputCheck.inspection, target)) return failure('OUTPUT_INVALID', 'The converted bytes do not match the requested format, dimensions, or alpha policy.');
      assets.push({
        target,
        bytes: decoded.bytes,
        receipt: outputReceipt(target, decoded.bytes, outputCheck.inspection, decoded.lossNotes ?? []),
      });
    }

    return {
      ok: true,
      inspection: sourceCheck.inspection,
      crop,
      outputs: Object.freeze(assets),
      packageIdentity: LOGO_PACKAGE_IDENTITY,
    };
  };

  return Object.freeze({
    descriptors: LOGO_HANDLER_DESCRIPTORS,
    inspect,
    convert,
    cache,
  });
}

