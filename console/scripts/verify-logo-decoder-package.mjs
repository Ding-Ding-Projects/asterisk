import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [process.argv[2], 'dist/squirrel-windows/win-unpacked/resources/logo-decoder', 'dist/win-unpacked/resources/logo-decoder'].filter(Boolean);
const root = candidates.find((candidate) => existsSync(join(candidate, 'logo-decoder-manifest.json')));
if (!root) throw new Error('The packaged decoder resource is missing its manifest.');
const manifest = JSON.parse(readFileSync(join(root, 'logo-decoder-manifest.json'), 'utf8'));
const candidateCommit = process.env.GITHUB_SHA && /^[0-9a-f]{40}$/iu.test(process.env.GITHUB_SHA) ? process.env.GITHUB_SHA.toLowerCase() : execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/iu.test(manifest.sourceCommit ?? '') || manifest.sourceCommit !== candidateCommit || !Array.isArray(manifest.nativeFiles) || manifest.nativeFiles.length === 0) throw new Error('The packaged decoder manifest is empty or not bound to the candidate commit.');
const worker = join(root, 'logo-decoder-worker.mjs');
if (!existsSync(worker) || createHash('sha256').update(readFileSync(worker)).digest('hex') !== manifest.workerSha256) throw new Error('The copied packaged decoder worker does not match its manifest.');
const launcher = join(root, 'logo-worker-job.ps1');
if (!existsSync(launcher) || createHash('sha256').update(readFileSync(launcher)).digest('hex') !== manifest.launcherSha256) throw new Error('The copied packaged decoder launcher does not match its manifest.');
const packageLock = join(root, 'package-lock.json');
if (!existsSync(packageLock) || createHash('sha256').update(readFileSync(packageLock)).digest('hex') !== manifest.packageLockSha256) throw new Error('The copied decoder package lock does not match its manifest.');
for (const entry of manifest.nativeFiles) {
  const path = join(root, entry.path.replaceAll('/', '\\'));
  if (!existsSync(path) || createHash('sha256').update(readFileSync(path)).digest('hex') !== entry.sha256) throw new Error(`The copied packaged decoder runtime does not match its manifest: ${entry.path}`);
}
console.log(`Verified packaged decoder manifest for ${manifest.sourceCommit} with ${manifest.nativeFiles.length} runtime files.`);
