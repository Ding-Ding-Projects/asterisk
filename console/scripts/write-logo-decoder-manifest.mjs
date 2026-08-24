import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const worker = join(root, 'control-plane', 'logo-decoder-worker.mjs');
const launcher = join(root, 'control-plane', 'logo-worker-job.ps1');
const recovery = join(root, 'control-plane', 'logo-worker-recovery.ps1');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const sharp = lock.packages?.['node_modules/sharp'];
if (!sharp?.version || !sharp.integrity) throw new Error('The locked sharp package is missing version or integrity.');
const generated = new Set(['resources/update-manifest.json']);
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/u).filter(Boolean).map((line) => line.slice(3).replaceAll('\\', '/')).filter((path) => !generated.has(path) && !path.startsWith('app/renderer/src/generated/'));
if (dirty.length > 0) throw new Error(`The decoder manifest refuses uncommitted product inputs: ${dirty.join(', ')}`);
const sourceCommit = (process.env.DING_PBX_CANDIDATE_COMMIT && /^[0-9a-f]{40}$/iu.test(process.env.DING_PBX_CANDIDATE_COMMIT)) ? process.env.DING_PBX_CANDIDATE_COMMIT.toLowerCase() : (process.env.GITHUB_SHA && /^[0-9a-f]{40}$/iu.test(process.env.GITHUB_SHA)) ? process.env.GITHUB_SHA.toLowerCase() : execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/iu.test(sourceCommit)) throw new Error('The decoder manifest could not bind to an exact source commit.');
const files = [];
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.name)) {
      files.push({ path: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    }
  }
}
walk(join(root, 'node_modules', 'sharp'));
walk(join(root, 'node_modules', '@img'));
if (files.length === 0) throw new Error('No packaged sharp JavaScript or native binding files were found.');
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'logo-decoder-manifest.json'), `${JSON.stringify({ schemaVersion: 1, sourceCommit, workerRevision: 'logo-worker-2026-08-23-v4', workerSha256: createHash('sha256').update(readFileSync(worker)).digest('hex'), launcherSha256: createHash('sha256').update(readFileSync(launcher)).digest('hex'), recoverySha256: createHash('sha256').update(readFileSync(recovery)).digest('hex'), packageLockSha256: createHash('sha256').update(readFileSync(join(root, 'package-lock.json'))).digest('hex'), sharpVersion: sharp.version, sharpIntegrity: sharp.integrity, platform: process.platform, arch: process.arch, nativeFiles: files }, null, 2)}\n`, 'utf8');
