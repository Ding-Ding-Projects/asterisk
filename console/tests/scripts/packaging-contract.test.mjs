import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_PACKAGING_INPUTS,
  findMissingPackagingInputs,
  isUnsignedPortableExecutable,
  validateReleaseIdentity,
  validateReleasesIndex,
} from '../../scripts/packaging-contract.mjs';

const COMMIT = 'a'.repeat(40);
const VERSION = '0.1.42';
const IDENTITY = {
  schemaVersion: 1,
  product: 'ding-pbx-console',
  productName: 'Ding PBX Console',
  appId: 'org.dingdingprojects.dingpbxconsole',
  version: VERSION,
  candidateCommit: COMMIT,
  tag: null,
  published: false,
};

test('the packaging input list is hand-written and catches a missing source', () => {
  const root = mkdtempSync(join(tmpdir(), 'asterisk-packaging-'));
  try {
    for (const entry of REQUIRED_PACKAGING_INPUTS) {
      const path = join(root, entry);
      if (entry === 'native-messaging') mkdirSync(path, { recursive: true });
      else { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, 'source'); }
    }
    assert.deepEqual(findMissingPackagingInputs(root), []);
    rmSync(join(root, 'resources', 'forge', 'gh.exe'));
    assert.deepEqual(findMissingPackagingInputs(root), ['resources/forge/gh.exe']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('release identity rejects stale candidate, product, app, and publication fields', () => {
  assert.deepEqual(validateReleaseIdentity(IDENTITY, { version: VERSION, candidateCommit: COMMIT, tag: null }), []);
  assert.ok(validateReleaseIdentity({ ...IDENTITY, candidateCommit: 'b'.repeat(40) }, { version: VERSION, candidateCommit: COMMIT, tag: null }).some((error) => error.includes('candidateCommit')));
  assert.ok(validateReleaseIdentity({ ...IDENTITY, appId: 'wrong' }, { version: VERSION, candidateCommit: COMMIT, tag: null }).some((error) => error.includes('appId')));
  assert.ok(validateReleaseIdentity({ ...IDENTITY, published: true }, { version: VERSION, candidateCommit: COMMIT, tag: null }).some((error) => error.includes('published')));
});

test('RELEASES must contain exactly the generated full and delta package rows', () => {
  const rows = ['hash 10 Console-0.1.42-full.nupkg', 'hash 11 Console-0.1.42-delta.nupkg'].join('\n');
  assert.deepEqual(validateReleasesIndex(rows, ['Console-0.1.42-full.nupkg', 'Console-0.1.42-delta.nupkg']), []);
  assert.ok(validateReleasesIndex(rows, ['Console-0.1.42-full.nupkg']).some((error) => error.includes('exactly')));
  assert.ok(validateReleasesIndex('hash 10 Console-0.1.42-full.nupkg\nhash 10 Console-0.1.42-full.nupkg', ['Console-0.1.42-full.nupkg', 'Console-0.1.42-full.nupkg']).some((error) => error.includes('duplicate')));
});

test('unsigned PE proof accepts a valid PE32+ with an empty certificate table', () => {
  const bytes = Buffer.alloc(0x200);
  bytes.writeUInt16LE(0x5a4d, 0);
  bytes.writeUInt32LE(0x80, 0x3c);
  bytes.writeUInt32LE(0x00004550, 0x80);
  bytes.writeUInt16LE(0x20b, 0x80 + 24);
  bytes.writeUInt32LE(0, 0x80 + 24 + 112 + (4 * 8));
  bytes.writeUInt32LE(0, 0x80 + 24 + 112 + (4 * 8) + 4);
  assert.equal(isUnsignedPortableExecutable(bytes), true);
  bytes.writeUInt32LE(1, 0x80 + 24 + 112 + (4 * 8) + 4);
  assert.equal(isUnsignedPortableExecutable(bytes), false);
});

test('every root build entry point bootstraps before invoking its build script', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  for (const name of ['build.bat', 'build-installer.bat', 'build-iso.bat']) {
    const source = readFileSync(join(root, name), 'utf8');
    assert.match(source, /download-dependencies\.bat/u, `${name} must self-fetch dependencies`);
  }
  const throwaway = readFileSync(join(root, 'build-wsl-throwaway.bat'), 'utf8');
  assert.match(throwaway, /download-dependencies\.bat/u, 'build-wsl-throwaway.bat must self-fetch on build paths');
  assert.match(throwaway, /NEEDS_BOOTSTRAP=0/u, 'removal-only path must remain dependency-free');
});

test('packaging script clears generated output and checks fresh packaged resources', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const source = readFileSync(join(root, 'console', 'scripts', 'package-squirrel.mjs'), 'utf8');
  assert.match(source, /rmSync\(generatedRoot, \{ recursive: true, force: true \}\)/u);
  assert.match(source, /findMissingPackagingInputs\(consoleRoot\)/u);
  assert.match(source, /Packaged resource is missing from the fresh unpacked output/u);
  assert.match(source, /Packaged native resource digest proof is missing or stale/u);
  assert.match(source, /isUnsignedPortableExecutable\(readFileSync\(setup\[0\]\.path\)\)/u);
});
