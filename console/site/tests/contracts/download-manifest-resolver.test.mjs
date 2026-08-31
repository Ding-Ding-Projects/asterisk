/**
 * Contract: the live release-manifest resolver queries the maintained repository,
 * never the retired slug. The source comments may preserve historical context, so
 * the executable scan removes comments before applying the retired-slug guard.
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
  assert.match(source, /const API_ROOT = 'repos\/Ding-Ding-Projects\/material-asterisk';/u);
});
test('every GitHub API query is explicitly bound to the maintained repository', () => {
  assert.match(source, /execFileSync\('gh', \['api', pathAndQuery\]/u,
    'the resolver must pass the complete canonical API path as one gh api argument');
  assert.doesNotMatch(source, /\['api',\s*'-R'/u,
    'the installed gh api does not accept a repository flag in this invocation shape');
  assert.match(source, /ghApi\(`\$\{API_ROOT\}\/releases\?/u,
    'release listing must use the complete maintained repository API path');
});

test('the executable resolver path contains no retired repository slug', () => {
  assert.doesNotMatch(executableSource(source), /Ding-Ding-Projects\/asterisk|github\.io\/asterisk/iu,
    'the retired slug appears in executable resolver code');
});
