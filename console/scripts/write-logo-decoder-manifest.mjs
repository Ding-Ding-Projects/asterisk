import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const worker = join(root, 'control-plane', 'logo-decoder-worker.mjs');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const sharp = lock.packages?.['node_modules/sharp'];
if (!sharp?.version || !sharp.integrity) throw new Error('The locked sharp package is missing version or integrity.');
const files = [];
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:js|node)$/u.test(entry.name) && (entry.name === 'index.js' || entry.name.endsWith('.node'))) {
      files.push({ path: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    }
  }
}
walk(join(root, 'node_modules', 'sharp'));
walk(join(root, 'node_modules', '@img'));
if (files.length === 0) throw new Error('No packaged sharp JavaScript or native binding files were found.');
writeFileSync(join(root, 'resources', 'logo-decoder-manifest.json'), `${JSON.stringify({ schemaVersion: 1, workerRevision: 'logo-worker-2026-08-23-v4', workerSha256: createHash('sha256').update(readFileSync(worker)).digest('hex'), sharpVersion: sharp.version, sharpIntegrity: sharp.integrity, platform: process.platform, arch: process.arch, nativeFiles: files }, null, 2)}\n`, 'utf8');
