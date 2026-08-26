/**
 * Contract: material-appearance, recomputed from the published site.
 *
 * What genuinely exists: a real colour translator across eleven colour spaces, a
 * continuous (native `type="color"`) accent picker, and theme/density/font-scale
 * controls with a live preview, all wired in site/app.js. What does not exist: a
 * per-element "Edit appearance..." editor, or named presets that survive beyond the
 * one general settings export. Both halves are checked here from source, so the
 * registry's "partial" state is pinned to real facts rather than to prose.
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
const settingsHtml = read('settings.html');
const everyPage = ['index', 'product', 'documentation', 'downloads', 'status', 'settings']
  .map((n) => read(`${n}.html`)).join('\n');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for material-appearance', () => {
  assert.ok(registry.features['material-appearance'], 'no material-appearance row in site/feature-registry.json');
});

test('a real colour translator spans at least ten colour spaces, not a single fixed conversion', () => {
  const line = app.split('\n').find((l) => /^\s*const COLOUR_FORMATS=/.test(l));
  assert.ok(line, 'COLOUR_FORMATS declaration was not found as a single source line');
  const formats = line.match(/\[(.+?)\]/u)[1].split(',').map((s) => s.trim().replace(/'/gu, ''));
  assert.ok(formats.length >= 10, `only ${formats.length} colour formats declared`);
  for (const required of ['hex', 'rgb', 'hsl', 'oklch']) {
    assert.ok(formats.includes(required), `colour translator no longer covers "${required}"`);
  }
  assert.match(app, /function translateColour\(value\)\{/u, 'translateColour() is no longer defined');
});

test('the accent control is a continuous native colour picker, not a fixed swatch list', () => {
  const input = settingsHtml.match(/<input id="accent-color"[^>]*>/u);
  assert.ok(input, 'settings.html has no #accent-color input');
  assert.match(input[0], /type="color"/u, 'the accent control is no longer a continuous colour input');
});

test('theme, density, and font-scale controls exist and are wired to persisted state', () => {
  for (const id of ['theme-mode', 'density-mode', 'font-scale']) {
    assert.match(settingsHtml, new RegExp(`id="${id}"`, 'u'), `settings.html is missing #${id}`);
  }
  const line = app.split('\n').find((l) => /^\s*function initSettings\(\)\{/.test(l));
  assert.ok(line, 'initSettings() was not found as a single source line');
  assert.match(line, /\$\('theme-mode'\)\.onchange=event=>update\('theme',event\.target\.value\)/u,
    'theme-mode is no longer wired to persisted state via update()');
  assert.match(line, /\$\('accent-color'\)\.oninput=event=>update\('accent',event\.target\.value\)/u,
    'accent-color is no longer wired to persisted state via update()');
});

test('changing appearance settings updates a live preview in the same pass, via applyState()', () => {
  const line = app.split('\n').find((l) => /^\s*function applyState\(\)\{/.test(l));
  assert.ok(line, 'applyState() was not found as a single source line');
  assert.match(line, /document\.documentElement\.dataset\.theme=state\.theme/u, 'applyState no longer applies the live theme');
  assert.match(line, /document\.documentElement\.style\.setProperty\('--primary',state\.accent\)/u,
    'applyState no longer applies the live accent colour');
});

test('there is no per-element "Edit appearance..." editor anywhere in the published site', () => {
  assert.doesNotMatch(everyPage, /edit appearance/iu, 'a per-element appearance editor now exists -- revisit the "partial" state');
  assert.doesNotMatch(app, /edit appearance/iu, 'a per-element appearance editor now exists in app.js -- revisit the "partial" state');
});

test('there is no named-preset save/load/export mechanism beyond the one general settings export', () => {
  /* This used to be a bare word ban on "preset" anywhere in app.js. On 2026-08-26 the
   * changelog viewer landed with named DATE-RANGE presets ("Last 30 days"), which is a
   * different thing entirely -- it saves and loads nothing, and touches no appearance
   * value. Rather than widen the check into something that would pass on a real
   * appearance-preset system, every line mentioning the word is collected and each one
   * must belong to that one known, named exception. A mention anywhere else still
   * fails, which a narrowed needle would not have caught. */
  const exceptionStart = app.indexOf('  /** Writes the two date fields from a named preset.');
  const exceptionEnd = app.indexOf('  function changelogVisibleEntries(');
  assert.ok(exceptionStart !== -1 && exceptionEnd > exceptionStart,
    'the changelog date-range preset block was not found where this exception expects it -- re-derive this contract by hand');
  const outside = app.slice(0, exceptionStart) + app.slice(exceptionEnd);
  assert.ok(outside.length < app.length, 'nothing was excluded, so the scan below would be checking the exception itself');
  const mentions = outside.split('\n').filter((line) => /preset/iu.test(line));
  assert.ok(mentions.length > 0, 'no line outside the exception mentions "preset" at all, so this list would pass vacuously');
  for (const line of mentions) {
    assert.match(line, /CHANGELOG_PRESETS|changelogPresetRange|changelog-date-preset/u,
      `app.js mentions "preset" outside the changelog date-range controls -- if a named appearance-preset system landed, the "partial" state needs re-checking: ${line.trim().slice(0, 90)}`);
  }
  assert.doesNotMatch(app, /appearancePreset|savePreset|loadPreset|presetName/iu,
    'app.js now carries a named appearance-preset mechanism -- the "partial" state needs re-checking');
  /* The one export path that does exist is the general settings-export button, and it
   * exports the whole flat settings object rather than a named, reusable preset. */
  assert.match(app, /\$\('settings-export'\)\.onclick=\(\)=>download\('ding-pbx-page-settings\.json'/u,
    'the general settings export itself is gone; the appearance state has no export path at all');
});

test('the registry records material-appearance as partial, matching translator-and-tokens-yes, per-element-editor-no', () => {
  assert.equal(registry.features['material-appearance'].state, 'partial',
    'a real colour translator and live theme/density/font tokens exist, but no per-element editor and no named presets -- "partial" is the honest state');
});
