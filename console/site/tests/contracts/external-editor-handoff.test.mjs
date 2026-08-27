/**
 * Contract: external-editor-handoff. The honest state is "absent" -- no
 * open-in-external-editor / VS Code handoff exists on the site. There is no
 * downloadable artifact this static documentation site owns that a user
 * would open in an editor, and no such control exists in the markup or in
 * app.js.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';
const PAGES = PAGE_NAMES;
const everyPage = PAGES.map((name) => read(`${name}.html`)).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for external-editor-handoff', () => {
  assert.ok(registry.features['external-editor-handoff'], 'no external-editor-handoff row in site/feature-registry.json');
});

test('no VS Code / external-editor handoff of any kind exists in app.js or the published markup', () => {
  assert.doesNotMatch(app, /vscode|code:\/\/|open.?in.?editor|external.?editor/iu,
    'an external-editor handoff now exists in app.js -- the "absent" state needs re-checking');
  assert.doesNotMatch(everyPage, /open in (vs code|visual studio code)/iu, 'external-editor handoff copy now exists -- re-check the "absent" state');
});

test('the registry records external-editor-handoff as absent, and the code agrees', () => {
  assert.equal(registry.features['external-editor-handoff'].status, 'absent',
    'no open-in-external-editor / VS Code handoff exists on the site -- "absent" is the honest state');
});
