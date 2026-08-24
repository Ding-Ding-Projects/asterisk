#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const unpackedRoot = join(consoleRoot, 'dist', 'squirrel-windows', 'win-unpacked');
const resourcesRoot = join(unpackedRoot, 'resources');
const executable = join(unpackedRoot, 'Ding PBX Console.exe');
const provenancePath = join(resourcesRoot, 'school-mode-provenance.json');
const nativeBinary = join(resourcesRoot, 'app.asar.unpacked', 'node_modules', 'keytar', 'build', 'Release', 'keytar.node');
if (!existsSync(executable)) throw new Error('Packaged Ding PBX Console executable is missing from win-unpacked.');
if (!existsSync(provenancePath)) throw new Error('Packaged School provenance is missing from the final resources directory.');
if (!existsSync(nativeBinary)) throw new Error('Packaged keytar native add-on is missing from app.asar.unpacked.');
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
if (provenance.schemaVersion !== 1 || provenance.product !== 'ding-pbx-console' || !/^[0-9a-f]{40}$/u.test(provenance.candidateCommit) || !/^\d+\.\d+\.\d+$/u.test(provenance.packageVersion) || provenance.appId !== 'org.dingdingprojects.dingpbxconsole') {
  throw new Error('Final packaged School provenance is malformed.');
}

const resultPath = join(process.env.TEMP || process.env.TMP || consoleRoot, `ding-pbx-keytar-probe-${randomUUID()}.json`);
const child = spawn(executable, [`--school-vault-probe-result=${resultPath}`], { cwd: unpackedRoot, windowsHide: true, stdio: 'ignore' });
const exitCode = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => { child.kill(); reject(new Error('Packaged main-process IPC keytar probe timed out.')); }, 15000);
  child.once('error', (error) => { clearTimeout(timer); reject(error); });
  child.once('exit', (code) => { clearTimeout(timer); resolve(code ?? -1); });
});
try {
  if (exitCode !== 0) throw new Error(`Packaged main-process IPC keytar probe exited with code ${exitCode}.`);
  if (!existsSync(resultPath)) throw new Error('Packaged main-process IPC keytar probe did not write a result.');
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (result.error) throw new Error(`Packaged main-process IPC keytar probe failed: ${result.error}`);
  for (const key of ['provenanceMatched', 'writeSucceeded', 'readMatched', 'deleteSucceeded', 'absentAfterDelete']) {
    if (result[key] !== true) throw new Error(`Packaged main-process IPC keytar probe did not prove ${key}.`);
  }
} finally {
  rmSync(resultPath, { force: true });
}
console.log('Packaged main-process IPC keytar load, provenance, vault round-trip, deletion, and post-delete absence verified.');
