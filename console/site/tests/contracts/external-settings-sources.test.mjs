/**
 * Contract: external-settings-sources. The honest state is "absent" -- no
 * HTTPS API integration and no Home Assistant integration exist anywhere in
 * site/app.js. This is the same underlying gap as scheduled-settings.md
 * (there is no scheduling surface for an external source to feed into
 * anyway), stated here as its own row because the contract names it
 * separately.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for external-settings-sources', () => {
  assert.ok(registry.features['external-settings-sources'], 'no external-settings-sources row in site/feature-registry.json');
});

/* The site also carries explicit local Ollama calls. The property here is that no
 * settings source can reach an arbitrary host, so classify the bounded callers instead
 * of using a blanket fetch count. */
test('settings sources stay same-origin or approved loopback, and no absolute URL is fetched', () => {
  const calls = app.split('\n').filter(line => line.includes('fetch('));
  assert.equal(calls.length, 4,
    `expected one manifest fetch plus three local Ollama fetches, found ${calls.length}`);
  assert.match(app, /const url=versionManifestUrl\(BASE,document\.baseURI\);/u,
    'the manifest request no longer takes its address from versionManifestUrl, which is the function that refuses an off-origin resolution');
  assert.match(app, /const response=await fetch\(url,\{cache:'no-store',credentials:'omit',signal:controller\.signal\}\);/u,
    'the manifest request no longer fetches that resolved address with credentials omitted');
  assert.match(app, /if\(there\.origin!==here\.origin\)return null;/u,
    'versionManifestUrl no longer refuses an address whose origin is not this document own');
  assert.doesNotMatch(app, /fetch\(\s*['"`]https?:/iu,
    'app.js now fetches an absolute URL literal -- an external settings source may have been added');
  const localCalls = calls.filter(line => line.includes('endpoint.replace') && line.includes('/api/'));
  assert.equal(localCalls.length, 2, 'a direct Ollama stream is not built from the approved endpoint');
  assert.match(app, /function ollamaJsonFetch\(path,endpoint,signal\)\{[^\n]*endpoint\.replace[^\n]*credentials:'omit'/u,
    'the JSON Ollama reader is not built from the approved endpoint with credentials omitted');
  assert.match(app, /function validOllamaEndpoint\(value\)\{[^\n]*protocol==='http:'[^\n]*localhost[^\n]*127\.0\.0\.1[^\n]*\[::1\]/u,
    'the Ollama endpoint allowlist is missing');
});

test('nothing the published-version check returns is ever written into a setting', () => {
  /* The manifest reader is the whole surface the response reaches, and it returns three
   * strings that are displayed. If it ever assigned into `state`, a remote file would be
   * configuring this browser, which is exactly the feature this row records as absent. */
  const start = app.indexOf('function parseVersionManifest(');
  assert.notEqual(start, -1, 'parseVersionManifest is no longer declared in site/app.js');
  const end = app.indexOf('function compareBuildVersions(', start);
  assert.ok(end > start, 'compareBuildVersions no longer follows parseVersionManifest, so this slice cannot be bounded');
  const reader = app.slice(start, end);
  assert.doesNotMatch(reader, /state\./u,
    'the published-version manifest reader now touches state -- a remote file would be configuring this browser');
});

test('no Home Assistant integration (binary_sensor, input_boolean, access token) exists anywhere', () => {
  assert.doesNotMatch(app, /home.?assistant|binary_sensor|input_boolean/iu,
    'a Home Assistant integration now exists -- the "absent" state needs re-checking');
});

test('the registry records external-settings-sources as absent, and the code agrees', () => {
  assert.equal(registry.features['external-settings-sources'].status, 'absent',
    'no HTTPS API or Home Assistant integration exists anywhere in site/app.js -- "absent" is the honest state');
});
