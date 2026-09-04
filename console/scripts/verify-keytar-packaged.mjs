#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import probePath from '../app/electron/probe-path.cjs';
import { parseBuilderIdentity } from './packaging-contract.mjs';

const { assertNoReparseAncestors } = probePath;

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const unpackedRoot = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked');
const resourcesRoot = join(unpackedRoot, 'resources');
const builderIdentity = parseBuilderIdentity(readFileSync(join(consoleRoot, 'electron-builder.yml'), 'utf8'));
const executable = join(unpackedRoot, builderIdentity.executableName);
const provenancePath = join(resourcesRoot, 'school-mode-provenance.json');
const releaseIdentityPath = join(consoleRoot, 'dist', 'squirrel-windows', 'squirrel-windows', 'release-identity.json');
const nativeBinary = join(resourcesRoot, 'app.asar.unpacked', 'node_modules', 'keytar', 'build', 'Release', 'keytar.node');
if (!existsSync(executable)) throw new Error(`Packaged ${builderIdentity.executableName} executable is missing from win-unpacked.`);
if (!existsSync(provenancePath)) throw new Error('Packaged School provenance is missing from the final resources directory.');
if (!existsSync(nativeBinary)) throw new Error('Packaged keytar native add-on is missing from app.asar.unpacked.');
if (!existsSync(releaseIdentityPath)) throw new Error('Final release identity is missing before the packaged vault probe.');
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const releaseIdentity = JSON.parse(readFileSync(releaseIdentityPath, 'utf8'));
const expected = {
  product: process.env.DING_PBX_EXPECTED_PRODUCT,
  packageVersion: process.env.DING_PBX_EXPECTED_VERSION,
  candidateCommit: process.env.DING_PBX_EXPECTED_COMMIT,
  appId: process.env.DING_PBX_EXPECTED_APP_ID,
};
if (!expected.product || !expected.packageVersion || !expected.candidateCommit || !expected.appId) throw new Error('Packaging controller did not supply independent product, candidate, version, and app identity values.');
if (releaseIdentity.product !== expected.product || releaseIdentity.productName !== builderIdentity.productName || releaseIdentity.appId !== expected.appId || releaseIdentity.version !== expected.packageVersion || releaseIdentity.candidateCommit !== expected.candidateCommit) throw new Error('Final release identity does not match the independent packaging-controller identity.');
if (provenance.schemaVersion !== 1 || provenance.product !== expected.product || !/^[0-9a-f]{40}$/u.test(provenance.candidateCommit) || !/^\d+\.\d+\.\d+$/u.test(provenance.packageVersion) || provenance.appId !== builderIdentity.appId) {
  throw new Error('Final packaged School provenance is malformed.');
}
if (provenance.product !== expected.product || provenance.packageVersion !== expected.packageVersion || provenance.candidateCommit !== expected.candidateCommit || provenance.appId !== expected.appId) throw new Error('Final packaged School provenance does not match the independent packaging-controller identity.');

const resultPath = join(process.env.TEMP || process.env.TMP || consoleRoot, `ding-pbx-keytar-probe-${randomUUID()}.json`);
const profilePath = join(process.env.TEMP || process.env.TMP || consoleRoot, `ding-pbx-keytar-profile-${randomUUID()}`);
assertNoReparseAncestors(profilePath);
let child;
let childExitProven = false;
const cleanup = { childExit: null, childExitProven: false, childKillRequested: false, resultRead: false, resultDeleted: false, profileDeleted: false, profileRetainedForensics: false, resultRetainedForensics: false };
try {
  child = spawn(executable, [
    `--user-data-dir=${profilePath}`,
    `--school-vault-probe-result=${resultPath}`,
    `--school-vault-expected-product=${expected.product}`,
    `--school-vault-expected-version=${expected.packageVersion}`,
    `--school-vault-expected-commit=${expected.candidateCommit}`,
    `--school-vault-expected-app-id=${expected.appId}`,
  ], { cwd: unpackedRoot, windowsHide: true, stdio: 'ignore' });
  const exitCode = await new Promise((resolve, reject) => {
    let deadline;
    let killDeadline;
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(deadline); if (killDeadline) clearTimeout(killDeadline); fn(value); };
    child.once('error', (error) => finish(reject, error));
    child.once('exit', (code) => { cleanup.childExit = code ?? -1; childExitProven = true; cleanup.childExitProven = true; finish(resolve, code ?? -1); });
    deadline = setTimeout(() => {
      cleanup.childKillRequested = true;
      child.kill();
      killDeadline = setTimeout(() => finish(reject, new Error(`Packaged main-process IPC keytar probe did not prove child exit after the bounded kill deadline: ${JSON.stringify(cleanup)}`)), 5000);
    }, 15000);
  });
  if (exitCode !== 0) throw new Error(`Packaged main-process IPC keytar probe exited with code ${exitCode}.`);
  if (!existsSync(resultPath)) throw new Error('Packaged main-process IPC keytar probe did not write a result.');
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  cleanup.resultRead = true;
  if (result.error) throw new Error(`Packaged main-process IPC keytar probe failed: ${result.error}`);
  for (const key of ['provenanceMatched', 'writeSucceeded', 'readMatched', 'deleteSucceeded', 'absentAfterDelete']) {
    if (result[key] !== true) throw new Error(`Packaged main-process IPC keytar probe did not prove ${key}.`);
  }
  if (!result.cleanup || result.cleanup.maxDeleteAttempts !== 3 || !Number.isInteger(result.cleanup.deleteAttempts) || result.cleanup.deleteAttempts < 1 || result.cleanup.deleteAttempts > result.cleanup.maxDeleteAttempts || !Number.isInteger(result.cleanup.cleanupPasses) || result.cleanup.cleanupPasses < 1 || result.cleanup.cleanupPasses > 2 || !Number.isInteger(result.cleanup.vaultOperations) || result.cleanup.vaultOperations !== 2 + (result.cleanup.deleteAttempts * 2) || result.cleanup.cleanupError) throw new Error('Packaged main-process IPC keytar probe did not return cumulative bounded deletion evidence.');
  const artifact = result.artifact;
  const provenanceSha256 = createHash('sha256').update(readFileSync(provenancePath)).digest('hex');
  const executableDigest = releaseIdentity.artifacts?.executable;
  if (!artifact || !executableDigest || executableDigest.name !== builderIdentity.executableName || artifact.executableSha256 !== executableDigest.sha256 || artifact.executableVersion !== expected.packageVersion || artifact.executableProduct !== releaseIdentity.productName) throw new Error('Packaged executable identity does not match the release identity.');
  if (!artifact || artifact.product !== expected.product || artifact.packageVersion !== expected.packageVersion || artifact.candidateCommit !== expected.candidateCommit || artifact.appId !== expected.appId || artifact.provenanceSha256 !== provenanceSha256 || artifact.probeUserDataMatches !== true) throw new Error('Packaged main-process IPC probe returned mismatched or unredacted artifact identity.');
  if (!result.cleanup || result.cleanup.maxDeleteAttempts !== 3 || result.cleanup.vaultOperations !== 2 + (result.cleanup.deleteAttempts * 2) || result.cleanup.cleanupError) throw new Error('Packaged main-process IPC probe returned incomplete cumulative cleanup evidence.');
} finally {
  if (child && !child.killed) { cleanup.childKillRequested = true; child.kill(); }
  try { rmSync(resultPath, { force: true }); cleanup.resultDeleted = true; } catch { cleanup.resultDeleted = false; cleanup.resultRetainedForensics = true; console.error(`Retained keytar probe result for local diagnostics at ${resultPath}`); }
  if (childExitProven) {
    try { rmSync(profilePath, { recursive: true, force: true }); cleanup.profileDeleted = true; } catch { cleanup.profileDeleted = false; cleanup.profileRetainedForensics = true; console.error(`Retained keytar probe profile for local diagnostics at ${profilePath}`); }
  } else {
    cleanup.profileRetainedForensics = true;
  }
}
if (!cleanup.resultDeleted || (!cleanup.profileDeleted && !cleanup.profileRetainedForensics)) throw new Error(`Packaged probe cleanup incomplete: ${JSON.stringify(cleanup)}`);
if (!childExitProven) {
  console.error(`Retained keytar probe profile for local forensics at ${profilePath}`);
  throw new Error(`Packaged probe child exit was not proven; forensic profile retained: ${JSON.stringify(cleanup)}`);
}
console.log(`Packaged main-process IPC keytar proof verified: ${JSON.stringify({ provenance: 'matched', vault: 'round-trip-delete-absent', cleanup })}`);
