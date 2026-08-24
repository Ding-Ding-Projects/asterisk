#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const unpackedRoot = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked');
const resourcesRoot = join(unpackedRoot, 'resources');
const executable = join(unpackedRoot, 'Ding PBX Console.exe');
const provenancePath = join(resourcesRoot, 'school-mode-provenance.json');
const releaseIdentityPath = join(consoleRoot, 'dist', 'squirrel-windows', 'squirrel-windows', 'release-identity.json');
const nativeBinary = join(resourcesRoot, 'app.asar.unpacked', 'node_modules', 'keytar', 'build', 'Release', 'keytar.node');
if (!existsSync(executable)) throw new Error('Packaged Ding PBX Console executable is missing from win-unpacked.');
if (!existsSync(provenancePath)) throw new Error('Packaged School provenance is missing from the final resources directory.');
if (!existsSync(nativeBinary)) throw new Error('Packaged keytar native add-on is missing from app.asar.unpacked.');
if (!existsSync(releaseIdentityPath)) throw new Error('Final release identity is missing before the packaged vault probe.');
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const releaseIdentity = JSON.parse(readFileSync(releaseIdentityPath, 'utf8'));
const expected = {
  product: process.env.DING_PBX_EXPECTED_PRODUCT || releaseIdentity.product,
  packageVersion: process.env.DING_PBX_EXPECTED_VERSION,
  candidateCommit: process.env.DING_PBX_EXPECTED_COMMIT,
  appId: process.env.DING_PBX_EXPECTED_APP_ID,
};
if (!expected.packageVersion || !expected.candidateCommit || !expected.appId) throw new Error('Packaging controller did not supply independent candidate identity values.');
if (releaseIdentity.product !== expected.product || releaseIdentity.version !== expected.packageVersion || releaseIdentity.candidateCommit !== expected.candidateCommit) throw new Error('Final release identity does not match the independent packaging-controller identity.');
if (provenance.schemaVersion !== 1 || provenance.product !== 'ding-pbx-console' || !/^[0-9a-f]{40}$/u.test(provenance.candidateCommit) || !/^\d+\.\d+\.\d+$/u.test(provenance.packageVersion) || provenance.appId !== 'org.dingdingprojects.dingpbxconsole') {
  throw new Error('Final packaged School provenance is malformed.');
}
if (provenance.product !== expected.product || provenance.packageVersion !== expected.packageVersion || provenance.candidateCommit !== expected.candidateCommit || provenance.appId !== expected.appId) throw new Error('Final packaged School provenance does not match the independent packaging-controller identity.');

const resultPath = join(process.env.TEMP || process.env.TMP || consoleRoot, `ding-pbx-keytar-probe-${randomUUID()}.json`);
const profilePath = join(process.env.TEMP || process.env.TMP || consoleRoot, `ding-pbx-keytar-profile-${randomUUID()}`);
let child;
try {
  child = spawn(executable, [`--user-data-dir=${profilePath}`, `--school-vault-probe-result=${resultPath}`], { cwd: unpackedRoot, windowsHide: true, stdio: 'ignore' });
  const exitCode = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Packaged main-process IPC keytar probe timed out.')); }, 15000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); resolve(code ?? -1); });
  });
  if (exitCode !== 0) throw new Error(`Packaged main-process IPC keytar probe exited with code ${exitCode}.`);
  if (!existsSync(resultPath)) throw new Error('Packaged main-process IPC keytar probe did not write a result.');
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (result.error) throw new Error(`Packaged main-process IPC keytar probe failed: ${result.error}`);
  for (const key of ['provenanceMatched', 'writeSucceeded', 'readMatched', 'deleteSucceeded', 'absentAfterDelete']) {
    if (result[key] !== true) throw new Error(`Packaged main-process IPC keytar probe did not prove ${key}.`);
  }
  const artifact = result.artifact;
  const provenanceSha256 = createHash('sha256').update(readFileSync(provenancePath)).digest('hex');
  if (!artifact || artifact.product !== expected.product || artifact.packageVersion !== expected.packageVersion || artifact.candidateCommit !== expected.candidateCommit || artifact.appId !== expected.appId || artifact.provenanceSha256 !== provenanceSha256) throw new Error('Packaged main-process IPC probe returned mismatched or unredacted artifact identity.');
} finally {
  if (child && !child.killed) child.kill();
  rmSync(resultPath, { force: true });
  rmSync(profilePath, { recursive: true, force: true });
}
console.log('Packaged main-process IPC keytar load, provenance, vault round-trip, deletion, and post-delete absence verified.');
