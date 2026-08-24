#!/usr/bin/env node
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const unpacked = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked', 'resources', 'app.asar.unpacked');
const packageIdentity = JSON.parse(readFileSync(join(consoleRoot, 'package.json'), 'utf8'));
const packageVersion = process.env.DING_PBX_VERSION || packageIdentity.version;
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT || spawnSync('git', ['-C', join(consoleRoot, '..'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const packageJson = join(unpacked, 'node_modules', 'keytar', 'package.json');
const nativeBinary = join(unpacked, 'node_modules', 'keytar', 'build', 'Release', 'keytar.node');
if (!existsSync(packageJson) || !existsSync(nativeBinary)) {
  throw new Error('Packaged keytar is not present in app.asar.unpacked/node_modules/keytar/build/Release. Native-addon unpacking or rebuild is incomplete.');
}

const requireFromPackage = createRequire(packageJson);
const keytar = requireFromPackage('keytar');
if (typeof keytar.setPassword !== 'function' || typeof keytar.getPassword !== 'function' || typeof keytar.deletePassword !== 'function') {
  throw new Error('Packaged keytar did not expose the credential-vault API.');
}

const service = `ding-pbx-console:packaged-roundtrip:${packageVersion}:${candidateCommit}`;
const account = `probe-${process.pid}`;
const value = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
try {
  await keytar.setPassword(service, account, value);
  const loaded = await keytar.getPassword(service, account);
  if (loaded !== value) throw new Error('Packaged keytar round-trip did not return the value written to the vault.');
} finally {
  await keytar.deletePassword(service, account).catch(() => undefined);
  const absent = await keytar.getPassword(service, account);
  if (absent !== null) throw new Error('Packaged keytar probe deletion did not leave the probe account absent.');
}
console.log('Packaged keytar load and OS credential-vault round-trip verified.');
