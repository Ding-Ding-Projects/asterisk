/**
 * Contract: regex-builder, recomputed from the published site rather than restated
 * from feature-registry.json. The site ships a real anchored regex dialog -- attached
 * to the field that opened it, with literal-insert helpers, flag checkboxes, a live
 * sample match count, and a write-back into the originating search field -- and this
 * file proves each of those pieces exists in the shipped markup and script rather
 * than trusting the registry's prose.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for regex-builder', () => {
  assert.ok(registry.features['regex-builder'], 'no regex-builder row in site/feature-registry.json');
});

test('at least eight regex-trigger affordances exist across the six published pages', () => {
  const total = PAGES.reduce((sum, name) => sum + [...pageSource[name].matchAll(/class="regex-trigger"/gu)].length, 0);
  assert.ok(total >= 8, `only ${total} regex-trigger buttons found across the six pages`);
});

test('the regex dialog carries a field-attachment label, a pattern field, and the i/m/u flags', () => {
  const dialog = pageSource.index.match(/<dialog id="regex-dialog"[\s\S]*?<\/dialog>/u);
  assert.ok(dialog, 'index.html has no #regex-dialog element');
  const body = dialog[0];
  assert.match(body, /id="regex-target-label"/u);
  assert.match(body, /id="regex-pattern"/u);
  for (const flag of ['regex-i', 'regex-m', 'regex-u']) {
    assert.match(body, new RegExp(`id="${flag}"[^>]*type="checkbox"`, 'u'), `${flag} checkbox missing from the regex dialog`);
  }
  assert.match(body, /id="regex-apply"/u);
});

test('the dialog offers literal-insert helpers for common regex tokens', () => {
  const dialog = pageSource.index.match(/<dialog id="regex-dialog"[\s\S]*?<\/dialog>/u);
  const inserts = [...dialog[0].matchAll(/data-insert="([^"]+)"/gu)].map((m) => m[1]);
  assert.ok(inserts.length >= 4, `only ${inserts.length} data-insert helper buttons found`);
  for (const token of ['^', '$']) {
    assert.ok(inserts.includes(token), `no literal-insert helper for "${token}"`);
  }
});

test('openRegex() attaches the dialog to the field that opened it', () => {
  const line = app.split('\n').find((l) => /^\s*function openRegex\(target\)\{/.test(l));
  assert.ok(line, 'openRegex(target) was not found as a single source line');
  assert.match(line, /\$\('regex-target-label'\)\.textContent=`Attached to: \$\{target\}`/u,
    'openRegex no longer labels which field the dialog is attached to');
  assert.match(line, /\.showModal\(\)/u, 'openRegex no longer opens the dialog as a real modal');
});

test('previewRegex() compiles the real pattern and reports live match counts, without hiding a compile error', () => {
  const line = app.split('\n').find((l) => /^\s*function previewRegex\(\)\{/.test(l));
  assert.ok(line, 'previewRegex() was not found as a single source line');
  assert.match(line, /new RegExp\(config\.pattern,config\.flags\)/u, 'previewRegex no longer compiles the user pattern');
  assert.match(line, /matchAll/u, 'previewRegex no longer runs the pattern against the sample text');
  assert.match(line, /catch\(error\)/u, 'previewRegex no longer reports an invalid pattern instead of throwing');
});

test('applyRegex() writes the compiled pattern back into the field that requested it, never a different one', () => {
  const line = app.split('\n').find((l) => /^\s*function applyRegex\(\)\{/.test(l));
  assert.ok(line, 'applyRegex() was not found as a single source line');
  assert.match(line, /regexState\.set\(regexTarget,/u, 'applyRegex no longer stores the pattern keyed by the originating field');
  assert.match(line, /\$\(regexTarget\)\?\.dispatchEvent\(new Event\('input'\)\)/u,
    'applyRegex no longer re-triggers the originating field after writing the pattern back');
});

test('matched fields use their own independent regex, and unconfigured fields fall back to plain-text search', () => {
  const line = app.split('\n').find((l) => /^\s*function matchText\(text,query,target\)\{/.test(l));
  assert.ok(line, 'matchText(text,query,target) was not found as a single source line');
  assert.match(line, /regexState\.get\(target\)/u, 'matchText no longer looks up a per-field regex configuration');
  assert.match(line, /toLocaleLowerCase\(\)\.includes\(query\.toLocaleLowerCase\(\)\)/u,
    'matchText no longer falls back to plain-text search when no regex is configured for the field');
});

test('the registry records regex-builder as implemented, and every fact above supports that', () => {
  assert.equal(registry.features['regex-builder'].status, 'implemented-unverified',
    'a real anchored, per-field, flag-aware regex engine with live preview exists in the shipped site -- "implemented" is the honest state');
});

/**
 * The "Site C - Blueprint" design export shows a persistent, always-visible readout
 * next to every regex-capable search field: "regex mode: /pattern/flags -- plain text
 * stays the default; toggle MODE to leave" when a pattern is active, and an equally
 * visible plain-text statement otherwise. The shipped site had the working regex
 * engine but no visible statement of which mode a field was in beyond a one-shot
 * toast; these tests pin the readout the design calls for.
 */
test('every regex-trigger button in every page is paired with its own mode-status readout', () => {
  for (const name of PAGES) {
    const triggers = [...pageSource[name].matchAll(/data-regex-for="([a-zA-Z-]+)"/gu)].map((m) => m[1]);
    assert.ok(triggers.length > 0, `${name}.html has no regex-trigger fields to check`);
    for (const target of triggers) {
      assert.match(pageSource[name], new RegExp(`id="${target}-mode-status"`, 'u'),
        `${name}.html: no #${target}-mode-status element next to the regex-trigger for "${target}"`);
    }
  }
});

test('the mode-status readout is a live region, not a plain decorative paragraph', () => {
  for (const name of PAGES) {
    for (const match of pageSource[name].matchAll(/<p class="mode-status mono" id="([a-zA-Z-]+)-mode-status"([^>]*)>/gu)) {
      assert.match(match[2], /role="status"/u, `${name}.html: #${match[1]}-mode-status has no role="status"`);
      assert.match(match[2], /aria-live="polite"/u, `${name}.html: #${match[1]}-mode-status has no aria-live="polite"`);
    }
  }
});

test('renderModeStatus() reads live regex state and writes a fact-bearing, mode-aware readout', () => {
  const line = app.split('\n').find((l) => /^\s*function renderModeStatus\(target\)\{/.test(l));
  assert.ok(line, 'renderModeStatus(target) was not found as a single source line');
  assert.match(line, /regexState\.get\(target\)/u, 'renderModeStatus no longer reads the same per-field regex state matchText uses');
  assert.match(line, /\/\$\{config\.pattern\}\/\$\{config\.flags\}/u,
    'renderModeStatus no longer names the live pattern and flags -- the readout would stop being a fact');
  assert.match(line, /classList\.add\('is-regex'\)/u, 'renderModeStatus no longer marks the element as active when regex is enabled');
});

test('applyRegex() and applyState() both keep the readout in sync, not just the toast', () => {
  const applyRegexLine = app.split('\n').find((l) => /^\s*function applyRegex\(\)\{/.test(l));
  assert.match(applyRegexLine, /renderModeStatus\(regexTarget\)/u,
    'applyRegex no longer refreshes the mode-status readout for the field it just changed');
  const applyStateLine = app.split('\n').find((l) => /^\s*function applyState\(\)\{/.test(l));
  assert.match(applyStateLine, /renderAllModeStatuses\(\)/u,
    'applyState no longer re-renders every mode-status readout, so a language or funny-level change would leave it stale');
});

test('the COPY table carries a genuine plain-text and regex-mode voice, not a hard-coded English sentence', () => {
  assert.ok(/searchModePlain:\{en:\[/u.test(app), 'no searchModePlain entry in the COPY table');
  assert.ok(/searchModeRegex:\{en:\[/u.test(app), 'no searchModeRegex entry in the COPY table');
  assert.match(app, /searchModePlain:\{en:\[[\s\S]*?\],zh:\[/u, 'searchModePlain has no Cantonese array');
  assert.match(app, /searchModeRegex:\{en:\[[\s\S]*?\],zh:\[/u, 'searchModeRegex has no Cantonese array');
});
