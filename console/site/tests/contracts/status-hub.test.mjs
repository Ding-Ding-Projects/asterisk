/**
 * Contract: status-hub. The honest state is "absent" -- `status.html` exists
 * as a real page (real M3 status cards and a factual timeline, `#evidence`
 * section), but no live status-hub project, session card, or question-card
 * logic exists in site/app.js. It is a static, factual snapshot page, not a
 * connection to a live, authenticated hub.
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
  assert.doesNotMatch(app, /\bfetch\(|sessionKey|hubToken/iu,
    'a live hub connection now exists in app.js -- re-check the "absent" state');
});

test('the registry records status-hub as absent, and the code agrees', () => {
  assert.equal(registry.features['status-hub'].state, 'absent',
    'status.html is a page shell with a real factual timeline, but no live status-hub project, session card, or question-card logic exists -- "absent" is the honest state');
});
