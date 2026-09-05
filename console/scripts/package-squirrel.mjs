#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neededCjsSiblings } from './copy-electron-cjs.mjs';
import {
  findMissingPackagingInputs,
  isUnsignedPortableExecutable,
  parseBuilderIdentity,
  validateBuilderIconUrl,
  sha256File,
  validateReleaseIdentity,
  validateReleasesIndex,
} from './packaging-contract.mjs';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(consoleRoot, '..');
const packageJson = JSON.parse(readFileSync(join(consoleRoot, 'package.json'), 'utf8'));
const version = process.env.DING_PBX_VERSION ?? packageJson.version;
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT ?? spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const runNumberText = process.env.GITHUB_RUN_NUMBER;
const tag = process.env.DING_PBX_RELEASE_TAG ?? (runNumberText && runAttempt ? `ding-pbx-console-v0.0.${runNumberText}-r${runAttempt}` : null);

if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('DING_PBX_VERSION must be an explicit numeric semantic version.');
if (!/^[0-9a-f]{40}$/u.test(candidateCommit)) throw new Error('DING_PBX_CANDIDATE_COMMIT must be the explicit 40-character candidate commit.');
const publishing = process.env.GITHUB_ACTIONS === 'true' || tag !== null;
if (publishing) {
  if (!runNumberText || !/^[1-9]\d{0,8}$/u.test(runNumberText) || !Number.isSafeInteger(Number(runNumberText))) throw new Error('GITHUB_RUN_NUMBER must be a positive bounded decimal run number when publishing.');
  if (version !== `0.1.${runNumberText}`) throw new Error(`Package version ${version} must map exactly to run ${runNumberText} as 0.1.${runNumberText}.`);
  if (process.env.GITHUB_ACTIONS === 'true' && (version === '0.1.0' || tag === null)) throw new Error('The first repaired published package must be newer than 0.1.0 and carry a release tag.');
  if (tag !== `ding-pbx-console-v0.0.${runNumberText}-r${runAttempt}`) throw new Error('DING_PBX_RELEASE_TAG must use the legacy-compatible tag shape for this package version.');
}

const head = spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', shell: false });
if (head.status !== 0 || head.stdout.trim() !== candidateCommit) throw new Error(`Candidate commit ${candidateCommit} does not match checkout HEAD ${head.stdout.trim()}.`);
// School provenance is a generated packaging input: nothing else produces it, so it
// is written here from the same identity the release record will carry, before the
// hand-written input preflight can report it missing. electron-builder ships it via
// extraResources and verify-keytar-packaged.mjs compares it against the release identity.
{
  const provenanceIdentity = parseBuilderIdentity(readFileSync(join(consoleRoot, 'electron-builder.yml'), 'utf8'));
  const schoolProvenance = {
    schemaVersion: 1,
    product: packageJson.name,
    productName: provenanceIdentity.productName,
    appId: provenanceIdentity.appId,
    packageVersion: version,
    candidateCommit,
  };
  writeFileSync(join(consoleRoot, 'resources', 'school-mode-provenance.json'), `${JSON.stringify(schoolProvenance, null, 2)}\n`, 'utf8');
}
const missingInputs = findMissingPackagingInputs(consoleRoot);
if (missingInputs.length > 0) throw new Error(`Packaging source inputs are missing or the wrong kind: ${missingInputs.join(', ')}.`);
const builderConfig = readFileSync(join(consoleRoot, 'electron-builder.yml'), 'utf8');
const builderIdentity = parseBuilderIdentity(builderConfig);
validateBuilderIconUrl(builderConfig);
const cli = join(consoleRoot, 'node_modules', 'electron-builder', 'cli.js');
if (!existsSync(cli)) throw new Error(`electron-builder CLI is missing at ${cli}; run download-dependencies.bat /s first.`);
const generatedRoot = join(consoleRoot, 'dist', 'squirrel-windows');
// A package run must never inherit a prior candidate's unpacked files or release
// rows. Remove only the generated packaging directory, then verify fresh output.
rmSync(generatedRoot, { recursive: true, force: true });
// --publish never: the workflow's single gh release create publishes. With GH_TOKEN in the
// environment electron-builder otherwise tries to publish on its own and fails on
// repository detection after the setup executable has already been built.
const result = spawnSync(process.execPath, [cli, '--win', 'squirrel', '--config', 'electron-builder.yml', '--publish', 'never', `--config.extraMetadata.version=${version}`], { cwd: consoleRoot, env: process.env, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const output = join(consoleRoot, 'dist', 'squirrel-windows', 'squirrel-windows');
const unpacked = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked');
if (!existsSync(unpacked)) throw new Error(`electron-builder did not produce a fresh unpacked directory at ${unpacked}.`);
const digest = (path) => sha256File(path, createHash);
const executable = join(unpacked, builderIdentity.executableName);
if (!existsSync(executable) || !statSync(executable).isFile()) throw new Error(`Fresh unpacked output is missing the packaged executable: ${executable}`);
const forgeGh = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked', 'resources', 'forge', 'gh.exe');
const forgeHelper = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked', 'resources', 'forge', 'forge-device-signin.ps1');
const dependencyManifest = JSON.parse(readFileSync(join(repoRoot, 'dependency-manifest.json'), 'utf8'));
const forgeGhRecord = dependencyManifest.dependencies.find((entry) => entry.id === 'github-cli-win-x64');
const forgeHelperRecord = dependencyManifest.dependencies.find((entry) => entry.id === 'forge-conpty-helper');
if (!forgeGhRecord || !forgeHelperRecord) throw new Error('Forge publishing dependencies are missing from dependency-manifest.json.');
if (!existsSync(forgeGh) || digest(forgeGh) !== forgeGhRecord.sha256) throw new Error('Packaged gh.exe is missing or does not match the pinned SHA-256.');
if (!existsSync(forgeHelper) || digest(forgeHelper) !== forgeHelperRecord.sha256) throw new Error('Packaged forge-device-signin.ps1 ConPTY helper is missing or does not match the pinned SHA-256.');
const packagedRootfs = join(unpacked, 'resources', 'asterisk', 'asterisk-wsl-rootfs.tar');
const packagedRootfsProvenance = join(unpacked, 'resources', 'asterisk', 'asterisk-wsl-rootfs.json');
const packagedUpdateManifest = join(unpacked, 'resources', 'update-manifest.json');
const packagedNativeHost = join(unpacked, 'resources', 'native-messaging', 'Ding-PBX-Console-NativeMessagingHost.exe');
const packagedSecureHelper = join(unpacked, 'resources', 'native-messaging', 'Ding-PBX-Console-SecureTempHelper.exe');
const packagedBroker = join(unpacked, 'resources', 'native-messaging', 'Ding-PBX-Console-NativeIngressBroker.exe');
for (const path of [packagedRootfs, packagedRootfsProvenance, packagedUpdateManifest, packagedNativeHost, packagedSecureHelper, packagedBroker]) {
  if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Packaged resource is missing from the fresh unpacked output: ${path}`);
}
// The compiled main process imports hand-written .cjs siblings by bare relative
// specifier. Prove they are inside the packaged asar at the exact path the ESM
// loader will resolve, not merely somewhere in the config's file list.
{
  const asar = await import('@electron/asar');
  const packagedAsar = join(unpacked, 'resources', 'app.asar');
  if (!existsSync(packagedAsar)) throw new Error(`Packaged app.asar is missing: ${packagedAsar}`);
  const entries = new Set(asar.listPackage(packagedAsar).map((entry) => entry.replace(/\\/g, '/')));
  for (const name of neededCjsSiblings(join(consoleRoot, 'dist-electron', 'app', 'electron'))) {
    const expected = `/dist-electron/app/electron/${name}`;
    if (!entries.has(expected)) throw new Error(`Packaged app.asar lacks ${expected}; the installed app would fail with ERR_MODULE_NOT_FOUND at launch.`);
  }
}
for (const path of [packagedNativeHost, packagedSecureHelper, packagedBroker]) {
  const sidecar = `${path}.sha256`;
  const expected = `${digest(path)}  ${path.split(/[\\/]/u).at(-1)}`;
  if (!existsSync(sidecar) || readFileSync(sidecar, 'utf8').trim() !== expected) throw new Error(`Packaged native resource digest proof is missing or stale: ${sidecar}`);
}
const rootfsProvenance = JSON.parse(readFileSync(packagedRootfsProvenance, 'utf8'));
if (rootfsProvenance.sourceCommit !== candidateCommit || rootfsProvenance.sha256 !== digest(packagedRootfs) || rootfsProvenance.bytes !== statSync(packagedRootfs).size) {
  throw new Error('Packaged Asterisk rootfs provenance does not match the candidate commit, bytes, and digest.');
}
const updateManifest = JSON.parse(readFileSync(packagedUpdateManifest, 'utf8'));
if (updateManifest.candidateCommit !== candidateCommit || updateManifest.version !== version) throw new Error('Packaged update manifest does not match the candidate commit and version.');
const files = readdirSync(output).map((name) => ({ name, path: join(output, name) })).filter((entry) => statSync(entry.path).isFile());
const setup = files.filter((entry) => /Setup\.exe$/iu.test(entry.name));
const releases = files.filter((entry) => entry.name === 'RELEASES');
const fullPackages = files.filter((entry) => /-full\.nupkg$/iu.test(entry.name));
const deltaPackages = files.filter((entry) => /-delta\.nupkg$/iu.test(entry.name));
if (setup.length !== 1 || releases.length !== 1 || fullPackages.length < 1) throw new Error('Squirrel output must contain exactly one Setup.exe, one RELEASES file, and at least one full nupkg.');
for (const entry of fullPackages) if (!entry.name.includes(`-${version}-full.nupkg`)) throw new Error(`Full package ${entry.name} does not carry version ${version}.`);
const releaseText = readFileSync(releases[0].path, 'utf8');
const releaseRows = validateReleasesIndex(releaseText, [...fullPackages, ...deltaPackages].map((entry) => entry.name));
if (releaseRows.length > 0) throw new Error(releaseRows.join(' '));
if (!isUnsignedPortableExecutable(readFileSync(setup[0].path))) throw new Error('Setup.exe is not a valid unsigned PE file.');
const record = (entry) => ({ name: entry.name, size: statSync(entry.path).size, sha256: digest(entry.path) });
const identity = {
  schemaVersion: 1,
  product: packageJson.name,
  productName: builderIdentity.productName,
  appId: builderIdentity.appId,
  version,
  candidateCommit,
  tag,
  published: Boolean(tag),
  artifacts: {
    setup: record(setup[0]),
    releases: record(releases[0]),
    executable: record({ name: builderIdentity.executableName, path: executable }),
    fullPackages: fullPackages.map(record),
    deltaPackages: deltaPackages.map(record),
    sha256sums: 'SHA256SUMS.txt',
    identity: 'release-identity.json',
  },
};
const identityErrors = validateReleaseIdentity(identity, { version, candidateCommit, tag, product: packageJson.name, productName: builderIdentity.productName, appId: builderIdentity.appId });
if (identityErrors.length > 0) throw new Error(`Generated release identity is invalid: ${identityErrors.join('; ')}`);
writeFileSync(join(output, 'release-identity.json'), JSON.stringify(identity, null, 2) + '\n', 'utf8');
const hashLines = readdirSync(output).map((name) => ({ name, path: join(output, name) })).filter((entry) => statSync(entry.path).isFile() && entry.name !== 'SHA256SUMS.txt').sort((a, b) => a.name.localeCompare(b.name)).map((entry) => `${digest(entry.path)}  ${entry.name}`);
writeFileSync(join(output, 'SHA256SUMS.txt'), `${hashLines.join('\n')}\n`, 'ascii');
