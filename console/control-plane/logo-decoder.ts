import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { LogoInspection, LogoInspectionResult, LogoTarget } from '../shared/logo.js';
import type { IsolatedLogoDecoder, IsolatedLogoDecoderOutput } from './logo-converter.js';

export interface IsolatedLogoDecoderOptions { readonly workerPath: string; readonly timeoutMs?: number }

function runWorker(options: IsolatedLogoDecoderOptions, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [options.workerPath], { windowsHide: true, shell: false, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['pipe', 'pipe', 'ignore'] });
    const limit = 20 * 1024 * 1024;
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
      const bytes = typeof result.bytesBase64 === 'string' ? new Uint8Array(Buffer.from(result.bytesBase64, 'base64')) : undefined;
      if (!bytes || result.roundTripVerified !== true) throw new Error('The isolated logo decoder returned no independently reopened output.');
      return { bytes, roundTripVerified: true, peakMemoryBytes: typeof result.peakMemoryBytes === 'number' ? result.peakMemoryBytes : undefined };
    },
    async reopen(input): Promise<LogoInspectionResult> {
      const result = await runWorker(options, { operation: 'reopen', bytesBase64: Buffer.from(input.bytes).toString('base64'), target: input.target });
      if (result.roundTripVerified !== true || !result.inspection || typeof result.inspection !== 'object') return { ok: false, code: 'OUTPUT_INVALID', reason: 'The isolated decoder did not provide reopen evidence.' };
      return { ok: true, inspection: result.inspection as LogoInspection };
    },
  };
}
