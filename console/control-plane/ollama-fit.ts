import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
  OllamaFitAssessment,
  OllamaGpuEvidence,
  OllamaHardwareEvidence,
  OllamaVariantResourceEvidence,
} from '../shared/ollama.js';

const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;
const MAX_RESOURCE_BYTES = Math.floor(Number.MAX_SAFE_INTEGER / 4);

function finiteBytes(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_RESOURCE_BYTES ? value : undefined;
}

function optionalBytes(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = finiteBytes(value);
  if (parsed === undefined) throw new Error(`${label} must be a non-negative bounded integer.`);
  return parsed;
}

function requiredString(value: unknown, label: string, max = 512): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new Error(`${label} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function parseGpu(value: unknown): OllamaGpuEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('GPU evidence must be an object.');
  const record = value as Record<string, unknown>;
  return {
    model: requiredString(record.model, 'GPU model'),
    usableVramBytes: optionalBytes(record.usableVramBytes, 'Usable VRAM'),
    driver: typeof record.driver === 'string' ? record.driver.slice(0, 512) : undefined,
    backend: typeof record.backend === 'string' ? record.backend.slice(0, 128) : undefined,
    supported: typeof record.supported === 'boolean' ? record.supported : undefined,
  };
}

export function parseHardwareEvidence(value: unknown): OllamaHardwareEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Hardware evidence must be an object.');
  const record = value as Record<string, unknown>;
  const observedAt = requiredString(record.observedAt, 'Hardware observation time', 128);
  if (!Number.isFinite(new Date(observedAt).getTime())) throw new Error('Hardware observation time is invalid.');
  if (record.gpus !== undefined && !Array.isArray(record.gpus)) throw new Error('GPU evidence must be an array.');
  return {
    observedAt,
    architecture: requiredString(record.architecture, 'Hardware architecture', 128),
    totalRamBytes: optionalBytes(record.totalRamBytes, 'Total RAM'),
    availableRamBytes: optionalBytes(record.availableRamBytes, 'Available RAM'),
    freeDiskBytes: optionalBytes(record.freeDiskBytes, 'Free storage'),
    gpus: Array.isArray(record.gpus) ? record.gpus.map(parseGpu) : [],
  };
}

export function parseVariantResourceEvidence(value: unknown): OllamaVariantResourceEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Model resource evidence must be an object.');
  const record = value as Record<string, unknown>;
  return {
    model: requiredString(record.model, 'Model name'),
    blobSizeBytes: optionalBytes(record.blobSizeBytes, 'Model blob size'),
    parameterCount: optionalBytes(record.parameterCount, 'Parameter count'),
    quantization: typeof record.quantization === 'string' ? record.quantization.slice(0, 128) : undefined,
    contextLength: (() => {
      const context = optionalBytes(record.contextLength, 'Context length');
      if (context !== undefined && context > 16_777_216) throw new Error('Context length exceeds the supported evidence bound.');
      return context;
    })(),
    contextOverheadBytes: optionalBytes(record.contextOverheadBytes, 'Context overhead'),
    runtimeOverheadBytes: optionalBytes(record.runtimeOverheadBytes, 'Runtime overhead'),
  };
}

function formatGiB(bytes: number): string {
  return `${(bytes / GIBIBYTE).toFixed(2)} GiB`;
}

/**
 * Gives a conservative fit assessment from explicit machine and variant facts. A result
 * is never inferred from the model name. Missing measurements produce Unknown rather
 * than silently becoming zero.
 */
export function assessOllamaFit(
  hardware: OllamaHardwareEvidence,
  variant: OllamaVariantResourceEvidence,
  now: Date = new Date(),
): OllamaFitAssessment {
  const evidence: string[] = [
    `Hardware observed at ${hardware.observedAt}.`,
    `Architecture: ${hardware.architecture}.`,
  ];
  const assumptions: string[] = [];
  const blockers: string[] = [];

  if (variant.blobSizeBytes === undefined) blockers.push('The exact model blob size is unavailable.');
  if (hardware.availableRamBytes === undefined) blockers.push('Available system RAM was not measured.');
  if (hardware.freeDiskBytes === undefined) blockers.push('Free destination storage was not measured.');
  if (variant.blobSizeBytes === undefined || hardware.availableRamBytes === undefined || hardware.freeDiskBytes === undefined) {
    return {
      verdict: 'unknown',
      observedAt: now.toISOString(),
      model: variant.model,
      summary: 'There is not enough measured evidence to estimate whether this variant will run.',
      evidence,
      assumptions,
      blockers,
    };
  }

  const contextOverhead = variant.contextOverheadBytes ?? Math.max(
    512 * MEBIBYTE,
    variant.contextLength !== undefined ? variant.contextLength * 128 * 1024 : GIBIBYTE,
  );
  if (variant.contextOverheadBytes === undefined) {
    assumptions.push(
      variant.contextLength === undefined
        ? 'Context overhead is conservatively estimated as 1.00 GiB because exact context metadata is unavailable.'
        : `Context overhead is conservatively estimated from ${variant.contextLength} context units at 128 KiB each, with a 512 MiB floor.`,
    );
  }
  const runtimeOverhead = variant.runtimeOverheadBytes ?? GIBIBYTE;
  if (variant.runtimeOverheadBytes === undefined) assumptions.push('Runtime overhead is conservatively estimated as 1.00 GiB.');
  const requiredRamBytes = Math.ceil(variant.blobSizeBytes * 1.15 + contextOverhead + runtimeOverhead);
  const requiredDiskBytes = Math.ceil(variant.blobSizeBytes * 1.1);

  evidence.push(`Exact model blob size: ${formatGiB(variant.blobSizeBytes)}.`);
  evidence.push(`Available system RAM: ${formatGiB(hardware.availableRamBytes)}.`);
  evidence.push(`Free destination storage: ${formatGiB(hardware.freeDiskBytes)}.`);
  if (hardware.totalRamBytes !== undefined) evidence.push(`Total system RAM: ${formatGiB(hardware.totalRamBytes)}.`);
  if (variant.parameterCount !== undefined) evidence.push(`Published parameter count: ${variant.parameterCount}.`);
  if (variant.quantization) evidence.push(`Published quantization: ${variant.quantization}.`);
  if (variant.contextLength !== undefined) evidence.push(`Published context length: ${variant.contextLength}.`);

  const supportedGpus = hardware.gpus.filter(gpu => gpu.supported === true);
  const rejectedGpus = hardware.gpus.filter(gpu => gpu.supported === false);
  for (const gpu of hardware.gpus) {
    evidence.push(
      `GPU ${gpu.model}: ${gpu.supported === true ? 'supported' : gpu.supported === false ? 'unsupported' : 'support unknown'}` +
      `${gpu.usableVramBytes === undefined ? ', usable VRAM unknown' : `, ${formatGiB(gpu.usableVramBytes)} usable VRAM`}.`,
    );
  }

  if (hardware.freeDiskBytes < requiredDiskBytes) blockers.push(
    `Free storage ${formatGiB(hardware.freeDiskBytes)} is below the conservative ${formatGiB(requiredDiskBytes)} requirement.`,
  );
  if (hardware.availableRamBytes < requiredRamBytes) blockers.push(
    `Available RAM ${formatGiB(hardware.availableRamBytes)} is below the conservative ${formatGiB(requiredRamBytes)} requirement.`,
  );
  if (blockers.length > 0) {
    return {
      verdict: 'unlikely',
      observedAt: now.toISOString(),
      model: variant.model,
      summary: 'Measured storage or memory is below the conservative requirement.',
      requiredRamBytes,
      requiredDiskBytes,
      evidence,
      assumptions,
      blockers,
    };
  }

  const gpuCanHoldBlob = supportedGpus.some(gpu => (gpu.usableVramBytes ?? 0) >= variant.blobSizeBytes!);
  const ampleRam = hardware.availableRamBytes >= requiredRamBytes * 1.5;
  const ampleDisk = hardware.freeDiskBytes >= requiredDiskBytes * 1.25;
  if (gpuCanHoldBlob && ampleRam && ampleDisk) {
    return {
      verdict: 'runs-well',
      observedAt: now.toISOString(),
      model: variant.model,
      summary: 'Measured memory, storage, and supported GPU capacity have conservative headroom.',
      requiredRamBytes,
      requiredDiskBytes,
      evidence,
      assumptions,
      blockers,
    };
  }

  if (supportedGpus.length === 0) {
    assumptions.push(
      rejectedGpus.length > 0
        ? 'No reported GPU backend supports this workload, so CPU execution may be slower.'
        : 'GPU support or usable VRAM is not proven, so the assessment assumes CPU execution may be required.',
    );
  } else if (!gpuCanHoldBlob) {
    assumptions.push('No supported GPU has enough measured usable VRAM for the complete blob, so partial offload may limit performance.');
  }
  return {
    verdict: 'runs-with-limits',
    observedAt: now.toISOString(),
    model: variant.model,
    summary: 'The measured minimums fit, but headroom or accelerated capacity is limited or unproven.',
    requiredRamBytes,
    requiredDiskBytes,
    evidence,
    assumptions,
    blockers,
  };
}

export function createOllamaFitHandlers(): OllamaDispatchHandlers {
  return {
    'ollama.fit.evaluate': (async (request: OllamaDispatchRequest) => {
      try {
        if (request.payload === null || typeof request.payload !== 'object' || Array.isArray(request.payload)) {
          throw new Error('Fit evaluation needs hardware and variant evidence.');
        }
        const payload = request.payload as Record<string, unknown>;
        const assessment = assessOllamaFit(
          parseHardwareEvidence(payload.hardware),
          parseVariantResourceEvidence(payload.variant),
        );
        return { ok: true, requestId: normalizeOllamaRequestId(request.requestId), data: assessment } as OllamaDispatchResponse<OllamaFitAssessment>;
      } catch (error) {
        return {
          ok: false,
          requestId: normalizeOllamaRequestId(request.requestId),
          code: 'OLLAMA_FIT_EVIDENCE_INVALID',
          message: ollamaErrorMessage(error, 'Fit evidence is invalid.'),
        } as OllamaDispatchResponse;
      }
    }),
  };
}
