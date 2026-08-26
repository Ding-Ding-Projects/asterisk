/**
 * Contract: status-hub. The honest state is "absent" -- `status.html` exists
 * as a real page (real M3 status cards and a factual timeline, `#evidence`
 * section), but no live status-hub project, session card, or question-card
 * logic exists in site/app.js. It is a static, factual snapshot page, not a
 * connection to a live, authenticated hub.
 *
 * That absence is now deliberate and stated in the page itself rather than
 * left as a silent gap: a GitHub Pages site has no backend to host session
 * state, polling, or a question-card reply channel, so building one here
 * would mean faking a connection that does not exist. status.html says so in
 * plain words (#status-hub-boundary) and points at the console application's
 * own documented live hub instead of reproducing it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const statusHtml = read('status.html');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for status-hub', () => {
  assert.ok(registry.features['status-hub'], 'no status-hub row in site/feature-registry.json');
});

test('status.html is a real page with real status cards and a factual timeline', () => {
  assert.match(statusHtml, /<section class="status-stage" id="evidence"><div class="status-cards">/u,
    'the status-cards section no longer matches -- the page shell may have changed');
  assert.match(statusHtml, /<ol class="status-timeline" aria-label="Documentation surface timeline">/u,
    'the status timeline no longer matches');
});

test('no live status-hub project, session card, or question-card logic exists in app.js', () => {
  // "Status hub" DOES appear once, in the DESTINATIONS catalogue entry for the
  // console app's own "agent/hub" documentation article -- that is cataloguing
  // a documented topic, exactly like the "app/history" entry local-version-
  // history.test.mjs already accounts for, and is confirmed as such below
  // rather than excluded by a blind word match.
  const statusHubMatches = [...app.matchAll(/status.?hub/giu)];
  assert.equal(statusHubMatches.length, 1, 'the number of "status hub" occurrences changed -- re-check each one before trusting this test');
  assert.match(app, /\{id:'hub',name:'Status hub sessions',icon:'◆',group:'Agent',article:'agent\/hub',/u,
    'the one "Status hub" occurrence no longer matches the expected documentation-catalogue entry -- a real implementation may have been added');
  assert.doesNotMatch(app, /session.?card|question.?card|sessionKey|hubToken/iu,
    'live status-hub session/question-card logic now exists in app.js -- the "absent" state needs re-checking');
});

test('the status page has no polling, session key, or authenticated connection to a live hub', () => {
  /* The blanket "no fetch anywhere" ban this line used to carry went red on 2026-08-26
   * for the published-version watch, which polls this same origin for one small file.
   * That is polling, and it is deliberately not the thing this row is about, so the pin
   * is the difference rather than the mechanism: exactly one request, on this origin,
   * with credentials OMITTED so it cannot carry a session even if somebody wanted it to,
   * and still no session key or hub token anywhere in the file. An authenticated
   * connection to a live hub would have to break at least one of those. */
  const calls = [...app.matchAll(/\bfetch\(/gu)];
  assert.equal(calls.length, 1,
    `expected exactly one request in app.js -- the published-version check -- and found ${calls.length}; a second one needs accounting for before this row stays "absent"`);
  assert.match(app, /const url=versionManifestUrl\(BASE,document\.baseURI\);/u,
    'the one request no longer takes its address from versionManifestUrl, which refuses anything off this origin');
  assert.match(app, /credentials:'omit'/u,
    'the one request no longer omits credentials, so it could now carry a session');
  assert.doesNotMatch(app, /sessionKey|hubToken/iu,
    'a session key or hub token now exists in app.js -- re-check the "absent" state');
});

test('status.html states plainly why it does not implement a live status hub, rather than leaving a silent gap', () => {
  assert.match(statusHtml, /<p id="status-hub-boundary">This page is this site's own static, factual status surface[^<]*it is not a live, authenticated Status Hub\./u,
    'status.html no longer explains why a live authenticated Status Hub is not implemented here -- the reason must be stated, not just the absence');
  assert.match(statusHtml, /no backend to host session state, polling, or a question-card reply channel/u,
    'the specific technical reason (no backend on a GitHub Pages site) no longer appears');
});

test('the registry records status-hub as absent, and the code agrees', () => {
  assert.equal(registry.features['status-hub'].state, 'absent',
    'status.html is a real static status surface with a factual timeline, and now explicitly states why it is not a live authenticated Status Hub, but no live status-hub project, session card, or question-card logic exists -- "absent" is still the honest state');
});
