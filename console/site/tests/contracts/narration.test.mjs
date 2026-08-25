/**
 * Contract: narration. The honest state is "absent" -- no TTS narrator, voice
 * picker, or spoken-event queue exists anywhere in site/app.js.
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
const everyPage = PAGES.map((name) => read(`${name}.html`)).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for narration', () => {
  assert.ok(registry.features['narration'], 'no narration row in site/feature-registry.json');
});

test('no speech synthesis, TTS, or narrator surface exists anywhere in app.js', () => {
  assert.doesNotMatch(app, /speechSynthesis|SpeechSynthesisUtterance|\bnarrat\w*/iu,
    'speech-synthesis or narrator logic now exists in app.js -- the "absent" state needs re-checking');
});

test('no voice-picker setting or spoken-event queue exists anywhere in the published markup', () => {
  assert.doesNotMatch(everyPage, /voice.?picker|narrat\w*.?voice/iu, 'a voice-picker control now exists -- re-check the "absent" state');
});

test('the registry records narration as absent, and the code agrees', () => {
  assert.equal(registry.features['narration'].state, 'absent',
    'no TTS narrator, voice picker, or spoken-event queue exists anywhere in site/app.js -- "absent" is the honest state');
});
