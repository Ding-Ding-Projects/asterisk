import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [process.argv[2], 'dist/squirrel-windows/win-unpacked/resources/logo-decoder', 'dist/win-unpacked/resources/logo-decoder'].filter(Boolean);
const root = candidates.find((candidate) => existsSync(join(candidate, 'logo-decoder-manifest.json')));
if (!root) throw new Error('The packaged decoder resource is missing its manifest.');
const manifestPath = join(root, 'logo-decoder-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestSha256 = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
const candidateCommit = process.env.GITHUB_SHA && /^[0-9a-f]{40}$/iu.test(process.env.GITHUB_SHA) ? process.env.GITHUB_SHA.toLowerCase() : execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/iu.test(manifest.sourceCommit ?? '') || manifest.sourceCommit !== candidateCommit || !Array.isArray(manifest.nativeFiles) || manifest.nativeFiles.length === 0) throw new Error('The packaged decoder manifest is empty or not bound to the candidate commit.');
if (manifest.nativeFiles.some((entry) => !entry || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(entry.sha256) || !/^node_modules\/(?:sharp|@img)\/.+\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.path)) || new Set(manifest.nativeFiles.map((entry) => entry.path)).size !== manifest.nativeFiles.length) throw new Error('The packaged decoder manifest contains an invalid or duplicate runtime path.');
const identityPath = join(root, '..', 'update-manifest.json');
if (!existsSync(identityPath)) throw new Error('The packaged product identity is missing beside the decoder resource.');
const identity = JSON.parse(readFileSync(identityPath, 'utf8'));
if (identity.schemaVersion !== 1 || identity.product !== 'ding-pbx-console' || !/^[0-9a-f]{40}$/iu.test(identity.candidateCommit ?? '') || identity.candidateCommit === '0000000000000000000000000000000000000000' || identity.candidateCommit !== manifest.sourceCommit || !/^[0-9a-f]{64}$/iu.test(identity.logoDecoderManifestSha256 ?? '') || identity.logoDecoderManifestSha256 !== manifestSha256) throw new Error('The packaged decoder manifest is not bound to a complete, non-placeholder product identity.');
const worker = join(root, 'logo-decoder-worker.mjs');
if (!existsSync(worker) || createHash('sha256').update(readFileSync(worker)).digest('hex') !== manifest.workerSha256) throw new Error('The copied packaged decoder worker does not match its manifest.');
const launcher = join(root, 'logo-worker-job.ps1');
if (!existsSync(launcher) || createHash('sha256').update(readFileSync(launcher)).digest('hex') !== manifest.launcherSha256) throw new Error('The copied packaged decoder launcher does not match its manifest.');
const packageLock = join(root, 'package-lock.json');
if (!existsSync(packageLock) || createHash('sha256').update(readFileSync(packageLock)).digest('hex') !== manifest.packageLockSha256) throw new Error('The copied decoder package lock does not match its manifest.');
const expectedPaths = manifest.nativeFiles.map((entry) => entry.path).sort();
const runtimeFiles = [];
const walk = (directory) => {
  if (!existsSync(directory)) throw new Error(`The copied decoder runtime is missing its first required directory: ${directory.slice(root.length + 1).replaceAll('\\', '/')}.`);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:js|mjs|cjs|node|dll|exe|so|dylib|wasm)$/iu.test(entry.name)) runtimeFiles.push(path.slice(root.length + 1).replaceAll('\\', '/'));
  }
};
walk(join(root, 'node_modules', 'sharp'));
walk(join(root, 'node_modules', '@img'));
runtimeFiles.sort();
for (let index = 0; index < Math.max(expectedPaths.length, runtimeFiles.length); index += 1) {
  if (expectedPaths[index] !== runtimeFiles[index]) throw new Error(`The copied decoder runtime set differs at the first path: expected ${expectedPaths[index] ?? '<none>'}, actual ${runtimeFiles[index] ?? '<none>'}.`);
}
for (const entry of manifest.nativeFiles) {
  const path = join(root, entry.path.replaceAll('/', '\\'));
  if (!existsSync(path) || createHash('sha256').update(readFileSync(path)).digest('hex') !== entry.sha256) throw new Error(`The copied packaged decoder runtime does not match its manifest: ${entry.path}`);
}
console.log(`Verified packaged decoder manifest for ${manifest.sourceCommit} with ${manifest.nativeFiles.length} runtime files.`);
