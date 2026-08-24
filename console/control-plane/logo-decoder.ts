import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { LogoInspection, LogoInspectionResult, LogoTarget } from '../shared/logo.js';
import type { IsolatedLogoDecoder, IsolatedLogoDecoderHealth, IsolatedLogoDecoderOutput } from './logo-converter.js';

export interface IsolatedLogoDecoderOptions { readonly workerPath: string; readonly jobScriptPath?: string; readonly manifestPath: string; readonly packageLockPath: string; readonly timeoutMs?: number }
const MAX_WORKER_RESPONSE_BYTES = Math.ceil((16 * 1024 * 1024) * 4 / 3) + 64 * 1024;
const MAX_WORKER_WORKING_SET_BYTES = 64 * 1024 * 1024;

function workingSet(pid: number): Promise<number | undefined> {
  if (process.platform !== 'win32') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${Math.trunc(pid)} -ErrorAction SilentlyContinue).WorkingSet64`], { windowsHide: true, timeout: 250, maxBuffer: 4096 }, (error, stdout) => {
      if (error) return resolve(undefined);
      const value = Number.parseInt(stdout.trim(), 10);
      resolve(Number.isSafeInteger(value) ? value : undefined);
    });
  });
}

function runWorker(options: IsolatedLogoDecoderOptions, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const minimalEnv: NodeJS.ProcessEnv = { ELECTRON_RUN_AS_NODE: '1', PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP };
    const child = spawn(process.execPath, ['--max-old-space-size=64', options.workerPath, '--no-network'], { windowsHide: true, shell: false, env: minimalEnv, stdio: ['pipe', 'pipe', 'ignore'] });
    const boundary = process.platform === 'win32' && options.jobScriptPath
      ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', options.jobScriptPath, '-Pid', String(child.pid), '-MemoryBytes', String(MAX_WORKER_WORKING_SET_BYTES)], { windowsHide: true, shell: false, stdio: ['ignore', 'ignore', 'ignore'] })
      : undefined;
    const limit = MAX_WORKER_RESPONSE_BYTES;
    let output = '';
    let settled = false;
    let peakWorkingSetBytes = 0;
    let finish: (error?: Error, value?: Record<string, unknown>) => void;
    const monitor = setInterval(() => {
      if (!child.pid) return;
      void workingSet(child.pid).then((value) => {
        if (value === undefined) return;
        peakWorkingSetBytes = Math.max(peakWorkingSetBytes, value);
        if (value > MAX_WORKER_WORKING_SET_BYTES) finish(new Error('The isolated decoder exceeded its native working-set ceiling.'));
      });
    }, 50);
    finish = (error?: Error, value?: Record<string, unknown>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(monitor);
      boundary?.kill();
      child.kill();
      if (error) reject(error); else resolve({ ...value!, peakWorkingSetBytes });
    };
    const timer = setTimeout(() => finish(new Error('The isolated logo decoder exceeded its bounded deadline.')), options.timeoutMs ?? 2_000);
    child.once('error', () => finish(new Error('The isolated logo decoder could not be started.')));
    boundary?.once('error', () => finish(new Error('The isolated decoder OS memory boundary could not be started.')));
    boundary?.once('exit', (code) => { if (code !== 0 && !settled) finish(new Error('The isolated decoder OS memory boundary refused the child.')); });
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
      return { bytes, roundTripVerified: true, peakMemoryBytes: typeof result.peakWorkingSetBytes === 'number' ? result.peakWorkingSetBytes : undefined };
    },
    async health(): Promise<IsolatedLogoDecoderHealth> {
      const result = await runWorker(options, { operation: 'health' });
      if (typeof result.workerVersion !== 'string' || typeof result.workerRevision !== 'string' || typeof result.sharpVersion !== 'string' || typeof result.nativePlatform !== 'string' || typeof result.nativeArch !== 'string' || typeof result.peakWorkingSetBytes !== 'number' || !Array.isArray(result.formats) || result.formats.length !== 3 || new Set(result.formats.map(String)).size !== 3 || result.formats.some((format) => !['png', 'jpeg', 'webp'].includes(String(format)))) throw new Error('The isolated decoder health handshake was incomplete.');
      const manifest = JSON.parse(await readFile(options.manifestPath, 'utf8')) as { schemaVersion?: unknown; workerRevision?: unknown; workerSha256?: unknown; sharpVersion?: unknown; sharpIntegrity?: unknown; platform?: unknown; arch?: unknown; nativeFiles?: unknown };
      const lock = JSON.parse(await readFile(options.packageLockPath, 'utf8')) as { packages?: Record<string, { version?: unknown; integrity?: unknown }> };
      const lockedSharp = lock.packages?.['node_modules/sharp'];
      if (manifest.schemaVersion !== 1 || manifest.workerRevision !== result.workerRevision || manifest.sharpVersion !== result.sharpVersion || lockedSharp?.version !== manifest.sharpVersion || typeof manifest.sharpIntegrity !== 'string' || lockedSharp?.integrity !== manifest.sharpIntegrity || manifest.platform !== result.nativePlatform || manifest.arch !== result.nativeArch || !Array.isArray(manifest.nativeFiles) || manifest.nativeFiles.length === 0) throw new Error('The isolated decoder does not match the checked-in worker, native binding, and sharp lock manifest.');
      const workerDigest = createHash('sha256').update(await readFile(options.workerPath)).digest('hex');
      if (manifest.workerSha256 !== workerDigest) throw new Error('The packaged decoder worker digest does not match its checked-in manifest.');
      const nativeFiles: string[] = [];
      for (const entry of manifest.nativeFiles as Array<{ path?: unknown; sha256?: unknown }>) {
        if (typeof entry.path !== 'string' || typeof entry.sha256 !== 'string' || !/^node_modules\/(?:sharp|@img)\/.+\.(?:js|node)$/u.test(entry.path)) throw new Error('The decoder native-file manifest is malformed.');
        const path = resolve(dirname(options.packageLockPath), entry.path);
        const digest = createHash('sha256').update(await readFile(path)).digest('hex');
        if (digest !== entry.sha256) throw new Error(`The packaged decoder native file digest does not match: ${entry.path}`);
        nativeFiles.push(entry.path);
      }
      return { workerVersion: result.workerVersion, workerRevision: result.workerRevision, sharpVersion: result.sharpVersion, peakMemoryBytes: result.peakWorkingSetBytes, formats: result.formats.map(String), sharpIntegrity: manifest.sharpIntegrity, nativePlatform: result.nativePlatform, nativeArch: result.nativeArch, nativeFiles };
    },
    async reopen(input): Promise<LogoInspectionResult> {
      const result = await runWorker(options, { operation: 'reopen', bytesBase64: Buffer.from(input.bytes).toString('base64'), target: input.target });
      if (result.roundTripVerified !== true || !result.inspection || typeof result.inspection !== 'object') return { ok: false, code: 'OUTPUT_INVALID', reason: 'The isolated decoder did not provide reopen evidence.' };
      return { ok: true, inspection: result.inspection as LogoInspection };
    },
  };
}
