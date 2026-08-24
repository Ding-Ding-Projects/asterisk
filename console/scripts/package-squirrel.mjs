#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.env.DING_PBX_VERSION;
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT;

if (!version || !/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error('DING_PBX_VERSION must be an explicit numeric semantic version.');
}
if (!candidateCommit || !/^[0-9a-f]{40}$/u.test(candidateCommit)) {
  throw new Error('DING_PBX_CANDIDATE_COMMIT must be the explicit 40-character candidate commit.');
}

const head = spawnSync('git', ['-C', join(consoleRoot, '..'), 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
  shell: false,
});
if (head.status !== 0) throw new Error(head.stderr.trim() || 'Could not resolve the candidate commit.');
if (head.stdout.trim() !== candidateCommit) {
  throw new Error(`Candidate commit ${candidateCommit} does not match checkout HEAD ${head.stdout.trim()}.`);
}

const cli = join(consoleRoot, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [
  cli,
  '--win',
  'squirrel',
  '--config',
  'electron-builder.yml',
  `--config.extraMetadata.version=${version}`,
], {
  cwd: consoleRoot,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
