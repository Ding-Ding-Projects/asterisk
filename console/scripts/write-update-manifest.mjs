#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = join(consoleRoot, '..');
const packageJson = JSON.parse(readFileSync(join(consoleRoot, 'package.json'), 'utf8'));
const head = execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT ?? head;
const version = process.env.DING_PBX_VERSION ?? packageJson.version;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const inferredTag = process.env.GITHUB_RUN_NUMBER && runAttempt ? `ding-pbx-console-v0.0.${process.env.GITHUB_RUN_NUMBER}-r${runAttempt}` : null;
const tag = process.env.DING_PBX_RELEASE_TAG ?? inferredTag;
if (!/^[0-9a-f]{40}$/u.test(candidateCommit) || candidateCommit !== head) throw new Error('The candidate commit must be the exact checkout HEAD.');
if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('The package version must be numeric semantic version text.');
if (tag !== null && tag !== `ding-pbx-console-v0.0.${process.env.GITHUB_RUN_NUMBER}-r${runAttempt}`) throw new Error('The release tag must use the legacy-compatible tag shape for this package version.');

const outDir = join(consoleRoot, 'resources');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'update-manifest.json'), JSON.stringify({
  schemaVersion: 1,
  product: 'ding-pbx-console',
  version,
  candidateCommit,
  tag,
  published: Boolean(tag),
}, null, 2) + '\n', 'utf8');
console.log(`Wrote resources/update-manifest.json for version ${version}, candidate ${candidateCommit}, tag ${tag ?? '(local unpublished build)'}.`);
