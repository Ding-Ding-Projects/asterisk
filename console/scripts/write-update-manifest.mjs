#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = join(consoleRoot, '..');
const packageJson = JSON.parse(readFileSync(join(consoleRoot, 'package.json'), 'utf8'));
const suppliedSourceRevision = process.env.DING_PBX_SOURCE_REVISION?.trim() || null;
const head = suppliedSourceRevision ?? execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT ?? head;
const version = process.env.DING_PBX_VERSION ?? packageJson.version;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const runNumberText = process.env.GITHUB_RUN_NUMBER;
const inferredTag = runNumberText && runAttempt ? `ding-pbx-console-v0.0.${runNumberText}-r${runAttempt}` : null;
const tag = process.env.DING_PBX_RELEASE_TAG ?? inferredTag;
if (!/^[0-9a-f]{40}$/u.test(candidateCommit) || (suppliedSourceRevision ? candidateCommit !== suppliedSourceRevision : candidateCommit !== head)) throw new Error('The candidate commit must be the exact checkout HEAD or the explicitly supplied source revision.');
if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('The package version must be numeric semantic version text.');
const publishing = process.env.GITHUB_ACTIONS === 'true' || tag !== null;
if (publishing) {
  if (!runNumberText || !/^[1-9]\d{0,8}$/u.test(runNumberText) || !Number.isSafeInteger(Number(runNumberText))) throw new Error('GITHUB_RUN_NUMBER must be a positive bounded decimal run number when publishing.');
  if (version !== `0.1.${runNumberText}`) throw new Error(`Package version ${version} must map exactly to run ${runNumberText} as 0.1.${runNumberText}.`);
  if (process.env.GITHUB_ACTIONS === 'true' && (version === '0.1.0' || tag === null)) throw new Error('The first repaired published manifest must be newer than 0.1.0 and carry a release tag.');
  if (tag !== `ding-pbx-console-v0.0.${runNumberText}-r${runAttempt}`) throw new Error('The release tag must use the legacy-compatible tag shape for this package version.');
}

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
