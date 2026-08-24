#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const cli = join(consoleRoot, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [cli, '--win', 'squirrel', '--config', 'electron-builder.yml', `--config.extraMetadata.version=${version}`], { cwd: consoleRoot, env: process.env, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const output = join(consoleRoot, 'dist', 'squirrel-windows', 'squirrel-windows');
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const forgeGh = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked', 'resources', 'forge', 'gh.exe');
const forgeHelper = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked', 'resources', 'forge', 'forge-device-signin.ps1');
const dependencyManifest = JSON.parse(readFileSync(join(repoRoot, 'dependency-manifest.json'), 'utf8'));
const forgeGhRecord = dependencyManifest.dependencies.find((entry) => entry.id === 'github-cli-win-x64');
const forgeHelperRecord = dependencyManifest.dependencies.find((entry) => entry.id === 'forge-conpty-helper');
if (!forgeGhRecord || !forgeHelperRecord) throw new Error('Forge publishing dependencies are missing from dependency-manifest.json.');
if (!existsSync(forgeGh) || digest(forgeGh) !== forgeGhRecord.sha256) throw new Error('Packaged gh.exe is missing or does not match the pinned SHA-256.');
if (!existsSync(forgeHelper) || digest(forgeHelper) !== forgeHelperRecord.sha256) throw new Error('Packaged forge-device-signin.ps1 ConPTY helper is missing or does not match the pinned SHA-256.');
const files = readdirSync(output).map((name) => ({ name, path: join(output, name) })).filter((entry) => statSync(entry.path).isFile());
const setup = files.filter((entry) => /Setup\.exe$/iu.test(entry.name));
const releases = files.filter((entry) => entry.name === 'RELEASES');
const fullPackages = files.filter((entry) => /-full\.nupkg$/iu.test(entry.name));
const deltaPackages = files.filter((entry) => /-delta\.nupkg$/iu.test(entry.name));
if (setup.length !== 1 || releases.length !== 1 || fullPackages.length < 1) throw new Error('Squirrel output must contain exactly one Setup.exe, one RELEASES file, and at least one full nupkg.');
for (const entry of fullPackages) if (!entry.name.includes(`-${version}-full.nupkg`)) throw new Error(`Full package ${entry.name} does not carry version ${version}.`);
const releaseText = readFileSync(releases[0].path, 'utf8');
for (const entry of [...fullPackages, ...deltaPackages]) if (!releaseText.includes(entry.name)) throw new Error(`RELEASES does not reference ${entry.name}.`);
const record = (entry) => ({ name: entry.name, size: statSync(entry.path).size, sha256: digest(entry.path) });
writeFileSync(join(output, 'release-identity.json'), JSON.stringify({
  schemaVersion: 1,
  product: 'ding-pbx-console',
  version,
  candidateCommit,
  tag,
  published: Boolean(tag),
  artifacts: {
    setup: record(setup[0]),
    releases: record(releases[0]),
    fullPackages: fullPackages.map(record),
    deltaPackages: deltaPackages.map(record),
    sha256sums: 'SHA256SUMS.txt',
    identity: 'release-identity.json',
  },
}, null, 2) + '\n', 'utf8');
