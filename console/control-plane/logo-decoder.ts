import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { LOGO_MAX_CPU_MS, LOGO_MAX_MEMORY_BYTES, type LogoTarget, type LogoCropModel } from '../shared/logo.js';
import type { IsolatedLogoDecoder, IsolatedLogoDecoderOutput } from './logo-converter.js';

interface WorkerSuccess { bytesBase64: string; roundTripVerified: boolean; lossNotes?: readonly string[]; peakMemoryBytes?: number }

function isWorkerSuccess(value: unknown): value is WorkerSuccess {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.bytesBase64 === 'string' && record.roundTripVerified === true && (record.lossNotes === undefined || Array.isArray(record.lossNotes)) && (record.peakMemoryBytes === undefined || Number.isSafeInteger(record.peakMemoryBytes));
}

export class PngIsolatedLogoDecoder implements IsolatedLogoDecoder {
  readonly kind = 'isolated' as const;

  async convert(input: { source: Uint8Array; sourceFormat: string; target: LogoTarget; crop: LogoCropModel }): Promise<IsolatedLogoDecoderOutput> {
    if (input.sourceFormat !== 'png' || input.target.format !== 'png') throw new Error('The isolated logo decoder currently supports PNG derivatives only.');
    const worker = new Worker(fileURLToPath(new URL('./logo-decoder-worker.js', import.meta.url)), {
      workerData: { sourceBase64: Buffer.from(input.source).toString('base64'), target: input.target, crop: input.crop },
      resourceLimits: { maxOldGenerationSizeMb: Math.ceil(LOGO_MAX_MEMORY_BYTES / 1024 / 1024), maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
      ...(process.execArgv.some((argument) => argument.startsWith('--input-type')) ? { execArgv: [] } : {}),
    });
    return await new Promise<IsolatedLogoDecoderOutput>((resolve, reject) => {
      let settled = false;
      const finish = (operation: () => void): void => { if (settled) return; settled = true; clearTimeout(timer); void worker.terminate(); operation(); };
      const timer = setTimeout(() => finish(() => reject(new Error('The isolated logo decoder exceeded its bounded CPU time.'))), LOGO_MAX_CPU_MS);
      worker.once('message', (message: unknown) => finish(() => {
        if (!isWorkerSuccess(message)) { const reason = message && typeof message === 'object' && typeof (message as Record<string, unknown>).error === 'string' ? String((message as Record<string, unknown>).error) : 'The isolated logo decoder returned an invalid response.'; reject(new Error(reason)); return; }
        const bytes = Buffer.from(message.bytesBase64, 'base64'); if (bytes.length === 0 || bytes.length > 16 * 1024 * 1024) { reject(new Error('The isolated logo decoder returned an oversized output.')); return; }
        resolve({ bytes: new Uint8Array(bytes), roundTripVerified: message.roundTripVerified, lossNotes: message.lossNotes, peakMemoryBytes: message.peakMemoryBytes });
      }));
      worker.once('error', error => finish(() => reject(error)));
      worker.once('exit', code => { if (!settled && code !== 0) finish(() => reject(new Error(`The isolated logo decoder exited with code ${code}.`))); });
    });
  }
}
