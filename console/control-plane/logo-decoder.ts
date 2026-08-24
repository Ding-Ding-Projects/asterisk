import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { LogoInspection, LogoInspectionResult, LogoTarget } from '../shared/logo.js';
import type { IsolatedLogoDecoder, IsolatedLogoDecoderHealth, IsolatedLogoDecoderOutput } from './logo-converter.js';

export interface IsolatedLogoDecoderOptions { readonly workerPath: string; readonly timeoutMs?: number }
const MAX_WORKER_RESPONSE_BYTES = Math.ceil((16 * 1024 * 1024) * 4 / 3) + 64 * 1024;

function runWorker(options: IsolatedLogoDecoderOptions, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const minimalEnv: NodeJS.ProcessEnv = { ELECTRON_RUN_AS_NODE: '1', PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP };
    const child = spawn(process.execPath, ['--max-old-space-size=64', options.workerPath, '--no-network'], { windowsHide: true, shell: false, env: minimalEnv, stdio: ['pipe', 'pipe', 'ignore'] });
    const limit = MAX_WORKER_RESPONSE_BYTES;
    let output = '';
    let settled = false;
    const finish = (error?: Error, value?: Record<string, unknown>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error); else resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error('The isolated logo decoder exceeded its bounded deadline.')), options.timeoutMs ?? 2_000);
    child.once('error', () => finish(new Error('The isolated logo decoder could not be started.')));
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      if (Buffer.byteLength(output, 'utf8') > limit) finish(new Error('The isolated logo decoder exceeded its output bound.'));
      const newline = output.indexOf('\n');
      if (newline < 0) return;
      const line = output.slice(0, newline);
      try {
        const value = JSON.parse(line) as Record<string, unknown>;
        if (value.ok === false) finish(new Error(typeof value.reason === 'string' ? value.reason : 'The isolated logo decoder refused the operation.'));
        else finish(undefined, value);
      } catch { finish(new Error('The isolated logo decoder returned malformed JSON.')); }
    });
    child.stdin.end(`${JSON.stringify({ id: randomUUID(), ...request })}\n`);
  });
}

export function createIsolatedLogoDecoder(options: IsolatedLogoDecoderOptions): IsolatedLogoDecoder {
  return {
    kind: 'isolated',
    async convert(input): Promise<IsolatedLogoDecoderOutput> {
      const result = await runWorker(options, { operation: 'convert', sourceBase64: Buffer.from(input.source).toString('base64'), sourceFormat: input.sourceFormat, target: input.target, crop: input.crop });
      if (typeof result.bytesBase64 !== 'string' || Buffer.byteLength(result.bytesBase64, 'utf8') > MAX_WORKER_RESPONSE_BYTES) throw new Error('The isolated decoder response exceeded its mathematically bounded Base64 envelope.');
      const bytes = new Uint8Array(Buffer.from(result.bytesBase64, 'base64'));
      if (bytes.byteLength > 16 * 1024 * 1024 || result.roundTripVerified !== true) throw new Error('The isolated logo decoder returned no independently reopened output.');
      return { bytes, roundTripVerified: true, peakMemoryBytes: typeof result.peakMemoryBytes === 'number' ? result.peakMemoryBytes : undefined };
    },
    async health(): Promise<IsolatedLogoDecoderHealth> {
      const result = await runWorker(options, { operation: 'health' });
      if (typeof result.workerVersion !== 'string' || typeof result.sharpVersion !== 'string' || typeof result.peakMemoryBytes !== 'number') throw new Error('The isolated decoder health handshake was incomplete.');
      return { workerVersion: result.workerVersion, sharpVersion: result.sharpVersion, peakMemoryBytes: result.peakMemoryBytes };
    },
    async reopen(input): Promise<LogoInspectionResult> {
      const result = await runWorker(options, { operation: 'reopen', bytesBase64: Buffer.from(input.bytes).toString('base64'), target: input.target });
      if (result.roundTripVerified !== true || !result.inspection || typeof result.inspection !== 'object') return { ok: false, code: 'OUTPUT_INVALID', reason: 'The isolated decoder did not provide reopen evidence.' };
      return { ok: true, inspection: result.inspection as LogoInspection };
    },
  };
}
