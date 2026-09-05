import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_PACKAGING_INPUTS,
  findMissingPackagingInputs,
  isUnsignedPortableExecutable,
  parseBuilderIdentity,
  validateBuilderIconUrl,
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

test('builder product identity, unpacked executable, release identity, and runtime event path agree', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const builder = parseBuilderIdentity(readFileSync(join(root, 'console', 'electron-builder.yml'), 'utf8'));
  const identityErrors = validateReleaseIdentity({ ...IDENTITY, productName: builder.productName, appId: builder.appId }, {
    version: VERSION,
    candidateCommit: COMMIT,
    tag: null,
    productName: builder.productName,
    appId: builder.appId,
  });
  assert.deepEqual(identityErrors, []);
  const runtimeSource = execFileSync('git', ['show', 'HEAD:console/app/electron/squirrel-events.ts'], { cwd: root, encoding: 'utf8' });
  assert.match(runtimeSource, /const exeName = basename\(host\.execPath\)/u);
  const runtimeTest = execFileSync('git', ['show', 'HEAD:console/tests/control-plane/squirrel-events.test.ts'], { cwd: root, encoding: 'utf8' });
  const executableName = runtimeTest.match(/execPath:\s*'[^']*[/\\]([^/\\']+\.exe)'/u)?.[1];
  assert.equal(executableName, builder.executableName, 'runtime event fixture must exercise the builder-configured executable name');
});

test('builder icon metadata uses an immutable canonical raw URL', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const config = readFileSync(join(root, 'console', 'electron-builder.yml'), 'utf8');
  const iconUrl = validateBuilderIconUrl(config);
  assert.match(iconUrl, /^https:\/\/raw\.githubusercontent\.com\/Ding-Ding-Projects\/material-asterisk\/[0-9a-f]{40}\/console\/assets\/icon\.png$/u);
  assert.doesNotMatch(iconUrl, /Ding-Ding-Projects\/asterisk\//u);
  assert.throws(() => validateBuilderIconUrl(config.replace('Ding-Ding-Projects/material-asterisk', 'Ding-Ding-Projects/asterisk')));
  assert.throws(() => validateBuilderIconUrl(config.replace('fcd627165ef60989cad4fbd9b71af113e52591a9', 'main')));
});

test('runtime release resolver is pinned to the canonical product Oak Kay', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const commonPath = join(root, 'console', 'scripts', 'asterisk-wsl-rootfs-common.ps1');
  const common = readFileSync(commonPath, 'utf8');
  const start = common.indexOf('function Get-AsteriskRepositorySlug');
  const end = common.indexOf('function Get-AsteriskImageRepositoryOwner', start);
  assert.ok(start >= 0 && end > start, 'the release resolver function must remain addressable');
  const resolver = common.slice(start, end);
  assert.match(resolver, /Ding-Ding-Projects\/material-asterisk/u);
  assert.doesNotMatch(resolver, /Ding-Ding-Projects\/asterisk(?:['"]|\s|$)/u);
  assert.doesNotMatch(resolver, /GITHUB_REPOSITORY|remote get-url origin/u);
  const command = `$env:GITHUB_REPOSITORY='Ding-Ding-Projects/asterisk'; . '${commonPath.replaceAll('\\', '/')}'; Get-AsteriskRepositorySlug -RepoRoot '${root.replaceAll('\\', '/')}'`;
  const resolved = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8' }).trim();
  assert.equal(resolved, 'Ding-Ding-Projects/material-asterisk');
  const dockerfile = readFileSync(join(root, 'console', 'scripts', 'asterisk-wsl-runtime.Dockerfile'), 'utf8');
  assert.match(dockerfile, /org\.opencontainers\.image\.source="https:\/\/github\.com\/Ding-Ding-Projects\/material-asterisk"/u);
  assert.doesNotMatch(dockerfile, /org\.opencontainers\.image\.source="https:\/\/github\.com\/Ding-Ding-Projects\/asterisk"/u);
});

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
  const expected = { version: VERSION, candidateCommit: COMMIT, tag: null, productName: IDENTITY.productName, appId: IDENTITY.appId };
  assert.deepEqual(validateReleaseIdentity(IDENTITY, expected), []);
  assert.ok(validateReleaseIdentity({ ...IDENTITY, candidateCommit: 'b'.repeat(40) }, expected).some((error) => error.includes('candidateCommit')));
  assert.ok(validateReleaseIdentity({ ...IDENTITY, appId: 'wrong' }, expected).some((error) => error.includes('appId')));
  assert.ok(validateReleaseIdentity({ ...IDENTITY, published: true }, expected).some((error) => error.includes('published')));
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
  assert.match(source, /executable: record\(executable\)/u);
  assert.match(source, /isUnsignedPortableExecutable\(readFileSync\(setup\[0\]\.path\)\)/u);
});

test('release path invokes the target verifier and exposes a receipt-only post-install wrapper', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const build = readFileSync(join(root, 'console', 'scripts', 'build-installer.ps1'), 'utf8');
  assert.match(build, /verify-squirrel-artifacts\.ps1/u);
  assert.match(build, /packaging-provenance\.json/u);
  assert.match(build, /squirrel-artifact-receipt\.json/u);
  assert.match(build, /RequiredPackageEntry '\*lib\/net45\/resources\/app\.asar'/u);
  const wrapper = readFileSync(join(root, 'console', 'scripts', 'validate-squirrel-runtime-receipt.bat'), 'utf8');
  assert.match(wrapper, /validate-squirrel-runtime-receipt\.mjs/u);
  assert.match(wrapper, /Usage: validate-squirrel-runtime-receipt\.bat/u);
});

test('the packaging script generates School provenance before the input preflight can miss it', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const source = readFileSync(join(root, 'console', 'scripts', 'package-squirrel.mjs'), 'utf8');
  const writeIndex = source.search(/^\s*writeFileSync\(join\(consoleRoot, 'resources', 'school-mode-provenance[.]json'\)/m);
  const preflightIndex = source.search(/^const missingInputs = findMissingPackagingInputs\(consoleRoot\);/m);
  assert.ok(writeIndex >= 0, 'package-squirrel.mjs must write resources/school-mode-provenance.json');
  assert.ok(preflightIndex >= 0, 'package-squirrel.mjs must run the packaging input preflight');
  assert.ok(writeIndex < preflightIndex, 'School provenance must be written before the preflight');
  for (const field of ['schemaVersion: 1', 'product: packageJson.name', 'packageVersion: version', 'candidateCommit,', 'appId: provenanceIdentity.appId']) {
    assert.ok(source.includes(field), `School provenance must carry ${field}`);
  }
});

test('the packaging script never publishes from electron-builder itself', () => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
  const source = readFileSync(join(root, 'console', 'scripts', 'package-squirrel.mjs'), 'utf8');
  const spawnLine = source.split(String.fromCharCode(10)).map((line) => line.replace(String.fromCharCode(13), '')).find((line) => line.includes("'--win', 'squirrel'"));
  assert.ok(spawnLine, 'package-squirrel.mjs must invoke electron-builder for the squirrel target');
  assert.ok(spawnLine.includes("'--publish', 'never'"), 'electron-builder must run with --publish never; the workflow owns publication');
});
