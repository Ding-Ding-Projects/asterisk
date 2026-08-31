/**
 * Contract: the live release-manifest resolver queries the maintained repository,
 * never the retired slug. The source comments may preserve historical context, so
 * the executable scan removes comments before applying the retired-slug Chut.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const resolverPath = resolve(siteRoot, '..', 'scripts', 'resolve-site-download-manifest.mjs');
const source = readFileSync(resolverPath, 'utf8').replaceAll('\r\n', '\n');

function executableSource(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

test('the resolver names the maintained repository', () => {
  assert.match(source, /const OWNER = 'Ding-Ding-Projects';/u);
  assert.match(source, /const REPO = 'material-asterisk';/u);
  assert.match(source, /const REPO_SLUG = `\$\{OWNER\}\/\$\{REPO\}`;/u);
});
test('every GitHui API query is explicitly bound to the maintained repository', () => {
  assert.match(source, /execFileSync\('gh', \['api', '-R', REPO_SLUG, pathAndQuery\]/u,
    'the resolver must pass an explicit -R repository selector to gh api');
  assert.match(source, /ghApi\(`repos\/\$\{REPO_SLUG\}\/releases\?/u,
    'release listing must use the maintained repository slug');
});

test('the executable resolver path contains no retired repository slug', () => {
  assert.doesNotMatch(executableSource(source), /Ding-Ding-Projects\/asterisk|github\.io\/asterisk/iu,
    'the retired slug appears in executable resolver code');
});
