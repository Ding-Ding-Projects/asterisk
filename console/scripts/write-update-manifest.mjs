#!/usr/bin/env node
/**
 * Writes `resources/update-manifest.json`, the one fact the packaged app needs in order
 * to know its own place in the release sequence: the exact release tag the delivery
 * workflow will publish for the run doing the packaging.
 *
 * `.github/workflows/delivery.yml` supplies an explicit version, candidate commit, and
 * tag to both packaging and publication. Outside CI, the version is derived from the
 * candidate commit count and the tag remains null, so a local build never claims it is
 * a published release.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = join(consoleRoot, '..');
const runNumber = process.env.GITHUB_RUN_NUMBER;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
let checkoutHead;
try {
  checkoutHead = execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  checkoutHead = undefined;
}
const candidateCommit = process.env.DING_PBX_CANDIDATE_COMMIT ?? checkoutHead;
if (!candidateCommit) {
  throw new Error('DING_PBX_CANDIDATE_COMMIT is required when Git metadata is unavailable.');
}
const version = process.env.DING_PBX_VERSION
  ?? `0.0.${execFileSync('git', ['-C', repositoryRoot, 'rev-list', '--count', candidateCommit], { encoding: 'utf8' }).trim()}`;

if (!/^[0-9a-f]{40}$/u.test(candidateCommit)) {
  throw new Error('The candidate commit must be an explicit 40-character lowercase SHA.');
}
if (!/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error('The package version must be an explicit numeric semantic version.');
}
if (checkoutHead && candidateCommit !== checkoutHead) {
  throw new Error(`Candidate commit ${candidateCommit} does not match checkout HEAD ${checkoutHead}.`);
}

const inferredTag = runNumber && runAttempt ? `ding-pbx-console-v${version}-r${runAttempt}` : null;
const tag = process.env.DING_PBX_RELEASE_TAG ?? inferredTag;
if (tag !== null && tag !== `ding-pbx-console-v${version}-r${runAttempt}`) {
  throw new Error(`Release tag ${tag} is inconsistent with version ${version} and run attempt ${runAttempt ?? '(missing)'}.`);
}

const outDir = join(consoleRoot, 'resources');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'update-manifest.json'), JSON.stringify({
  schemaVersion: 1,
  version,
  candidateCommit,
  tag,
}, null, 2) + '\n', 'utf8');
console.log(`Wrote resources/update-manifest.json for version ${version}, candidate ${candidateCommit}, tag ${tag ?? '(local build, not published)'}.`);
