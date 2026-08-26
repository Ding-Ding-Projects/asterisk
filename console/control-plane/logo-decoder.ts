import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { LogoInspection, LogoInspectionResult, LogoTarget } from '../shared/logo.js';
import type { IsolatedLogoDecoder, IsolatedLogoDecoderHealth, IsolatedLogoDecoderOutput } from './logo-converter.js';

export interface IsolatedLogoDecoderOptions { readonly workerPath: string; readonly jobScriptPath?: string; readonly recoveryScriptPath?: string; readonly manifestPath: string; readonly packageLockPath: string; readonly identityManifestPath?: string; readonly timeoutMs?: number }
const MAX_WORKER_RESPONSE_BYTES = Math.ceil((16 * 1024 * 1024) * 4 / 3) + 64 * 1024;
const MAX_DECODE_ALLOWANCE_BYTES = 64 * 1024 * 1024;
const MAX_WORKER_OS_BYTES = 128 * 1024 * 1024;

type WorkingSetError = Error & { readonly code?: string };

function workingSet(pid: number): Promise<number> {
  if (process.platform !== 'win32') return Promise.resolve(0);
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${Math.trunc(pid)} -ErrorAction SilentlyContinue).WorkingSet64`], { windowsHide: true, timeout: 250, maxBuffer: 4096 }, (error, stdout) => {
      if (error) return reject(error);
      const value = Number.parseInt(stdout.trim(), 10);
      if (!Number.isSafeInteger(value)) {
        const missing = new Error('The decoder worker process is no longer present.') as WorkingSetError;
        Object.defineProperty(missing, 'code', { value: 'PROCESS_NOT_FOUND' });
        reject(missing);
      } else resolve(value);
    });
  });
}

async function waitForTermination(pid: number | undefined, timeoutMs = 500): Promise<boolean> {
  if (!pid || process.platform !== 'win32') return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await workingSet(pid); } catch (error) {
      if ((error as WorkingSetError)?.code === 'PROCESS_NOT_FOUND') return true;
      throw new Error('The decoder worker termination query failed.', { cause: error });
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

async function waitForChildExit(child: ReturnType<typeof spawn>, timeoutMs = 750): Promise<boolean> {
  if (child.exitCode !== null) return true;
  return await new Promise<boolean>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once('exit', () => { clearTimeout(timer); resolve(true); });
  });
}

async function runtimeFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  const walk = async (directory: string) => {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.name)) output.push(path);
    }
  };
  await walk(resolve(root, 'node_modules', 'sharp'));
  await walk(resolve(root, 'node_modules', '@img'));
  return output;
}

type PackagedDecoderManifest = {
  readonly schemaVersion?: unknown;
  readonly sourceCommit?: unknown;
  readonly workerRevision?: unknown;
  readonly workerSha256?: unknown;
  readonly launcherSha256?: unknown;
  readonly recoverySha256?: unknown;
  readonly packageLockSha256?: unknown;
  readonly sharpVersion?: unknown;
  readonly sharpIntegrity?: unknown;
  readonly platform?: unknown;
  readonly arch?: unknown;
  readonly nativeFiles?: unknown;
};

async function validatePackagedProductIdentity(options: IsolatedLogoDecoderOptions): Promise<{ manifestBytes: Buffer; manifestSha256: string; manifest: PackagedDecoderManifest }> {
  if (!options.identityManifestPath) throw new Error('The packaged product identity path is missing.');
  const manifestBytes = await readFile(options.manifestPath);
  const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as PackagedDecoderManifest;
  const identity = JSON.parse(await readFile(options.identityManifestPath, 'utf8')) as { schemaVersion?: unknown; product?: unknown; candidateCommit?: unknown; logoDecoderManifestSha256?: unknown };
  if (
    identity.schemaVersion !== 1
    || identity.product !== 'ding-pbx-console'
    || typeof manifest.sourceCommit !== 'string'
    || !/^[0-9a-f]{40}$/iu.test(manifest.sourceCommit)
    || identity.candidateCommit !== manifest.sourceCommit
    || identity.logoDecoderManifestSha256 !== manifestSha256
  ) throw new Error('The decoder manifest is not bound to the packaged product identity.');
  return { manifestBytes, manifestSha256, manifest };
}

async function runWorker(options: IsolatedLogoDecoderOptions, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  await validatePackagedProductIdentity(options);
  const launcher = process.platform === 'win32' && options.jobScriptPath;
  if (launcher) {
    if (!options.recoveryScriptPath) throw new Error('The packaged decoder recovery path is missing before conversion.');
    const manifest = JSON.parse((await readFile(options.manifestPath)).toString('utf8')) as { recoverySha256?: unknown };
    const recoveryDigest = createHash('sha256').update(await readFile(options.recoveryScriptPath)).digest('hex');
    if (typeof manifest.recoverySha256 !== 'string' || manifest.recoverySha256 !== recoveryDigest) throw new Error('The packaged decoder recovery helper digest does not match before conversion.');
  }
  return await new Promise((resolve, reject) => {
    const minimalEnv: NodeJS.ProcessEnv = { ELECTRON_RUN_AS_NODE: '1', PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP };
    const profileName = `DingLogoDecoder_${randomUUID().replaceAll('-', '')}`;
    const recoveryPath = join(process.env.TEMP ?? process.env.TMP ?? '.', `${profileName}.json`);
    const child = launcher
      ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', options.jobScriptPath!, '-NodePath', process.execPath, '-WorkerPath', options.workerPath, '-MemoryBytes', String(MAX_WORKER_OS_BYTES), '-ManifestPath', options.manifestPath, '-PackageLockPath', options.packageLockPath, '-WorkerTimeoutMs', String(options.timeoutMs ?? 2_000), '-ProfileName', profileName, '-RecoveryPath', recoveryPath, '-RecoveryScriptPath', options.recoveryScriptPath!], { windowsHide: true, shell: false, env: minimalEnv, stdio: ['pipe', 'pipe', 'ignore'] })
      : spawn(process.execPath, ['--max-old-space-size=64', options.workerPath, '--no-network'], { windowsHide: true, shell: false, env: minimalEnv, stdio: ['pipe', 'pipe', 'ignore'] });
    const limit = MAX_WORKER_RESPONSE_BYTES;
    let output = '';
    let settled = false;
    let peakWorkingSetBytes = 0;
    let baselineWorkingSetBytes: number | undefined;
    let baselinePid: number | undefined;
    let inputSent = false;
    let startupSent = false;
    let workerPid: number | undefined;
    let monitorPid = child.pid;
    let readySeen = !launcher;
    let workerExitAcknowledged = !launcher;
    let jobCleanupAcknowledged = !launcher;
    let cleanupComplete = !launcher;
    let cleanupFailure: string | undefined;
    let finish: (error?: Error, value?: Record<string, unknown>) => void;
    const sendRequestIfReady = () => {
      if (launcher && workerPid && baselinePid === workerPid && baselineWorkingSetBytes !== undefined && !startupSent) {
        startupSent = true;
        child.stdin.write('START\n');
      }
      if (launcher && !inputSent && readySeen && workerPid && baselinePid === workerPid && baselineWorkingSetBytes !== undefined) {
        inputSent = true;
        child.stdin.end(`${JSON.stringify({ id: randomUUID(), ...request })}\n`);
      }
    };
    const monitor = setInterval(() => {
      if (!monitorPid || (launcher && !workerPid)) return;
      void workingSet(monitorPid).then((value) => {
        if (baselinePid !== monitorPid) { baselinePid = monitorPid; baselineWorkingSetBytes = value; peakWorkingSetBytes = value; }
        peakWorkingSetBytes = Math.max(peakWorkingSetBytes, value);
        sendRequestIfReady();
        if (value > baselineWorkingSetBytes + MAX_DECODE_ALLOWANCE_BYTES) finish(new Error('The isolated decoder exceeded its native working-set ceiling.'));
      }).catch(() => finish(new Error('The isolated decoder working-set query failed.')));
    }, 50);
    finish = (error?: Error, value?: Record<string, unknown>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(monitor);
      if (!inputSent) child.stdin.end();
      void (async () => {
        let cleanupError: Error | undefined;
        try {
          let workerTerminated = await waitForTermination(workerPid, 2_000);
          let childExited = await waitForChildExit(child, 2_000);
          if (!childExited && child.exitCode === null) childExited = await waitForChildExit(child, 2_000);
          if (!workerTerminated) workerTerminated = await waitForTermination(workerPid, 2_000);
          if (!childExited || child.exitCode === null) throw new Error('The isolated decoder launcher did not terminate after cancellation.');
          if (!workerTerminated) throw new Error('The isolated decoder worker termination could not be proven.');
          if (launcher && (!readySeen || !workerExitAcknowledged || !jobCleanupAcknowledged || !cleanupComplete || cleanupFailure)) throw new Error(cleanupFailure ?? 'The isolated decoder cleanup acknowledgement was incomplete.');
        } catch (cause) {
          cleanupError = cause instanceof Error ? cause : new Error('The isolated decoder cleanup failed.');
          const childExitedAfterFailure = await waitForChildExit(child, 2_000);
          const receiptMissing = Boolean(launcher && (!readySeen || !workerExitAcknowledged || !jobCleanupAcknowledged || !cleanupComplete || cleanupFailure));
          if (launcher && (receiptMissing || (!childExitedAfterFailure && child.exitCode === null))) {
            if (options.recoveryScriptPath) {
              try {
                const recoveryRecord = JSON.parse((await readFile(recoveryPath)).toString('utf8')) as { recoveryNonce?: unknown };
                if (typeof recoveryRecord.recoveryNonce !== 'string' || recoveryRecord.recoveryNonce.length < 16) throw new Error('The decoder recovery record nonce was missing before recovery.');
                await new Promise<void>((resolveRecovery, rejectRecovery) => {
                  const recovery = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', options.recoveryScriptPath!, '-RecoveryPath', recoveryPath], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
                  let output = '';
                  recovery.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString('utf8'); });
                  recovery.stderr?.resume();
                  recovery.once('error', rejectRecovery);
                  recovery.once('exit', (code) => {
                    if (code !== 0) { rejectRecovery(new Error(`Decoder recovery exited with ${code}.`)); return; }
                    const receiptLine = output.trim().split(/\r?\n/u).at(-1) ?? '';
                    try {
                      const receipt = JSON.parse(receiptLine) as Record<string, unknown>;
                      const complete = receipt.type === 'RECOVERY_COMPLETE' && receipt.recoveryNonce === recoveryRecord.recoveryNonce && receipt.workerExitObserved === true && receipt.aclRestored === true && receipt.profileDeleted === true && receipt.recordRemoved === true && receipt.noOrphan === true;
                      if (!complete) throw new Error('The decoder recovery receipt was incomplete.');
                      resolveRecovery();
                    } catch (error) { rejectRecovery(error instanceof Error ? error : new Error('The decoder recovery receipt was invalid.')); }
                  });
                });
              } catch (recoveryError) { cleanupError = new Error('The isolated decoder launcher termination and independent recovery could not be proven.', { cause: recoveryError }); }
            } else cleanupError = new Error('The isolated decoder launcher termination could not be proven by its supervisor receipt.', { cause: cleanupError });
          }
        }
        if (error) reject(error); else if (cleanupError) reject(cleanupError); else if (launcher && (workerPid === undefined || baselinePid !== workerPid)) reject(new Error('The isolated decoder working-set baseline was not bound to the worker PID.')); else resolve({ ...value!, workerPid, baselinePid, peakWorkingSetBytes, baselineWorkingSetBytes, workingSetIncrementBytes: baselineWorkingSetBytes === undefined ? undefined : peakWorkingSetBytes - baselineWorkingSetBytes });
      })();
    };
    const timer = setTimeout(() => finish(new Error('The isolated logo decoder exceeded its bounded deadline.')), options.timeoutMs ?? 2_000);
    child.once('error', () => finish(new Error('The isolated logo decoder could not be started.')));
    child.once('exit', (code) => { if (!settled && (code !== 0 || !inputSent)) finish(new Error(code === 0 ? 'The isolated decoder exited before a complete response.' : 'The isolated decoder launcher exited with a nonzero status.')); });
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      if (Buffer.byteLength(output, 'utf8') > limit) { finish(new Error('The isolated logo decoder exceeded its output bound.')); return; }
      let newline = output.indexOf('\n');
      while (newline >= 0) {
        const line = output.slice(0, newline).replace(/\r$/u, '');
        output = output.slice(newline + 1);
        if (launcher && !workerPid) {
          const pidMatch = /^WORKER_PID:(\d+)$/u.exec(line);
          if (pidMatch) {
            if (!Number.isSafeInteger(Number(pidMatch[1])) || Number(pidMatch[1]) < 1) { finish(new Error('The isolated decoder launcher did not emit an exact worker PID frame.')); return; }
            workerPid = Number(pidMatch[1]);
            monitorPid = workerPid;
            newline = output.indexOf('\n');
            continue;
          }
          if (line.startsWith('ERROR:')) cleanupFailure = line;
          else if (line === 'READY') { finish(new Error('The isolated decoder emitted READY before WORKER_PID.')); return; }
          else if (line.length > 0) { finish(new Error('The isolated decoder launcher did not emit an exact worker PID frame.')); return; }
          newline = output.indexOf('\n');
          continue;
        }
        if (launcher && !readySeen) {
          if (line === 'READY') readySeen = true;
          else if (line.startsWith('ERROR:')) cleanupFailure = line;
          else if (line.length > 0) { finish(new Error('The isolated decoder worker did not emit exact READY framing.')); return; }
          newline = output.indexOf('\n');
          continue;
        }
        if (launcher && /^WORKER_EXIT:-?\d+$/u.test(line)) { workerExitAcknowledged = true; newline = output.indexOf('\n'); continue; }
        if (launcher && line === 'JOB_CLEANUP_COMPLETE') { jobCleanupAcknowledged = true; newline = output.indexOf('\n'); continue; }
        if (launcher && line === 'CLEANUP_COMPLETE') { cleanupComplete = true; newline = output.indexOf('\n'); continue; }
        if (launcher && line.startsWith('ERROR:CLEANUP:')) { cleanupFailure = line; newline = output.indexOf('\n'); continue; }
        if (launcher && line.startsWith('ERROR:')) { cleanupFailure = line; newline = output.indexOf('\n'); continue; }
        try {
          const value = JSON.parse(line) as Record<string, unknown>;
          if (value.ok === false) finish(new Error(typeof value.reason === 'string' ? value.reason : 'The isolated logo decoder refused the operation.'));
          else finish(undefined, value);
        } catch { finish(new Error('The isolated logo decoder returned malformed JSON.')); }
        newline = output.indexOf('\n');
      }
      sendRequestIfReady();
    });
    if (!launcher) { inputSent = true; child.stdin.end(`${JSON.stringify({ id: randomUUID(), ...request })}\n`); }
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
      if (typeof result.cropDigest !== 'string' || !/^[0-9a-f]{64}$/iu.test(result.cropDigest)) throw new Error('The isolated decoder did not return an applied crop digest.');
      return { bytes, roundTripVerified: true, cropDigest: result.cropDigest, lossNotes: Array.isArray(result.lossNotes) ? result.lossNotes.filter((note): note is string => typeof note === 'string' && note.length <= 512) : [], peakMemoryBytes: typeof result.workingSetIncrementBytes === 'number' ? result.workingSetIncrementBytes : undefined };
    },
    async health(): Promise<IsolatedLogoDecoderHealth> {
      const packageIdentity = await validatePackagedProductIdentity(options);
      const result = await runWorker(options, { operation: 'health' });
      if (typeof result.workerPid !== 'number' || typeof result.baselinePid !== 'number' || result.workerPid !== result.baselinePid || typeof result.workerVersion !== 'string' || typeof result.workerRevision !== 'string' || typeof result.sharpVersion !== 'string' || typeof result.nativePlatform !== 'string' || typeof result.nativeArch !== 'string' || typeof result.nativeBindingPath !== 'string' || !/^[0-9a-f]{64}$/iu.test(String(result.nativeBindingSha256)) || typeof result.baselineWorkingSetBytes !== 'number' || typeof result.peakWorkingSetBytes !== 'number' || typeof result.workingSetIncrementBytes !== 'number' || !Array.isArray(result.formats) || result.formats.length !== 3 || new Set(result.formats.map(String)).size !== 3 || result.formats.some((format) => !['png', 'jpeg', 'webp'].includes(String(format)))) throw new Error('The isolated decoder health handshake was incomplete or its baseline PID was not the worker PID.');
      const { manifest } = packageIdentity;
      const lock = JSON.parse(await readFile(options.packageLockPath, 'utf8')) as { packages?: Record<string, { version?: unknown; integrity?: unknown }> };
      const lockedSharp = lock.packages?.['node_modules/sharp'];
      if (manifest.schemaVersion !== 1 || typeof manifest.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/iu.test(manifest.sourceCommit) || manifest.workerRevision !== result.workerRevision || manifest.sharpVersion !== result.sharpVersion || lockedSharp?.version !== manifest.sharpVersion || typeof manifest.sharpIntegrity !== 'string' || lockedSharp?.integrity !== manifest.sharpIntegrity || manifest.platform !== result.nativePlatform || manifest.arch !== result.nativeArch || !Array.isArray(manifest.nativeFiles) || manifest.nativeFiles.length === 0) throw new Error('The isolated decoder does not match the checked-in worker, native binding, source commit, and sharp lock manifest.');
      const workerDigest = createHash('sha256').update(await readFile(options.workerPath)).digest('hex');
      if (manifest.workerSha256 !== workerDigest) throw new Error('The packaged decoder worker digest does not match its checked-in manifest.');
      if (!options.jobScriptPath) throw new Error('The packaged decoder launcher path is missing.');
      const launcherDigest = createHash('sha256').update(await readFile(options.jobScriptPath)).digest('hex');
      const packageLockDigest = createHash('sha256').update(await readFile(options.packageLockPath)).digest('hex');
      if (!options.recoveryScriptPath) throw new Error('The packaged decoder recovery path is missing.');
      const recoveryDigest = createHash('sha256').update(await readFile(options.recoveryScriptPath)).digest('hex');
      if (manifest.launcherSha256 !== launcherDigest || manifest.recoverySha256 !== recoveryDigest || manifest.packageLockSha256 !== packageLockDigest) throw new Error('The packaged launcher, recovery helper, or package lock digest does not match its manifest.');
      const nativeFiles: string[] = [];
      for (const entry of manifest.nativeFiles as Array<{ path?: unknown; sha256?: unknown }>) {
        if (typeof entry.path !== 'string' || typeof entry.sha256 !== 'string' || !/^node_modules\/(?:sharp|@img)\/.+\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.path)) throw new Error('The decoder native-file manifest is malformed.');
        const path = resolve(dirname(options.packageLockPath), entry.path);
        const digest = createHash('sha256').update(await readFile(path)).digest('hex');
        if (digest !== entry.sha256) throw new Error(`The packaged decoder native file digest does not match: ${entry.path}`);
        nativeFiles.push(entry.path);
      }
      const normalizedBindingPath = String(result.nativeBindingPath).replaceAll('\\', '/');
      const nodeModulesMarker = '/node_modules/';
      const nodeModulesIndex = normalizedBindingPath.lastIndexOf(nodeModulesMarker);
      const bindingPath = nodeModulesIndex >= 0 ? `node_modules/${normalizedBindingPath.slice(nodeModulesIndex + nodeModulesMarker.length)}` : normalizedBindingPath;
      const bindingEntry = (manifest.nativeFiles as Array<{ path?: unknown; sha256?: unknown }>).find((entry) => entry.path === bindingPath);
      if (!bindingEntry || bindingEntry.sha256 !== result.nativeBindingSha256) throw new Error('The loaded sharp native binding is not the exact verified manifest entry.');
      const expected = nativeFiles.map((entry) => resolve(dirname(options.packageLockPath), entry)).sort();
      const actual = (await runtimeFiles(dirname(options.packageLockPath))).sort();
      if (nativeFiles.filter((entry) => entry.endsWith('.node')).length === 0 || JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('The packaged sharp and native runtime file set differs from the checked-in manifest.');
      return { workerPid: result.workerPid, baselinePid: result.baselinePid, workerVersion: result.workerVersion, workerRevision: result.workerRevision, sharpVersion: result.sharpVersion, peakMemoryBytes: result.workingSetIncrementBytes, baselineWorkingSetBytes: result.baselineWorkingSetBytes, peakWorkingSetBytes: result.peakWorkingSetBytes, formats: result.formats.map(String), sharpIntegrity: manifest.sharpIntegrity, nativePlatform: result.nativePlatform, nativeArch: result.nativeArch, nativeBindingPath: bindingPath, nativeBindingSha256: String(result.nativeBindingSha256), nativeFiles };
    },
    async reopen(input): Promise<LogoInspectionResult> {
      const result = await runWorker(options, { operation: 'reopen', bytesBase64: Buffer.from(input.bytes).toString('base64'), target: input.target });
      if (result.roundTripVerified !== true || !result.inspection || typeof result.inspection !== 'object') return { ok: false, code: 'OUTPUT_INVALID', reason: 'The isolated decoder did not provide reopen evidence.' };
      return { ok: true, inspection: result.inspection as LogoInspection };
    },
  };
}
