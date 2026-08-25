/**
 * Contract: spoken narration.
 *
 * The registry note for this feature contradicts itself: it opens by saying `narration.ts`
 * "is never imported by App.tsx ... so it never runs inside the mounted application," then
 * appends "Wired 2026-08-24 with seven controls." Both halves are checked here against the
 * current source rather than trusted -- the honest answer turns out to be a third thing,
 * narrower than either half of the note.
 *
 * What IS wired: exactly seven settings controls (enabled, language, two voice pickers,
 * rate, pitch, status line), each routed through `applyNarrationControl`, persisted, and
 * reported back through `resolveVoiceStatus` -- including live re-enumeration of the
 * platform's voice list via the `voiceschanged` event, matching the module's own stated
 * reason for subscribing rather than reading once.
 *
 * What is NOT wired: the `Narrator` class -- the queue, the per-category cooldown, and the
 * actual call to `engine.speak(...)` -- is never imported or instantiated anywhere in
 * App.tsx. So today the app can report which voice WOULD speak Cantonese or English, and
 * persist a rate and pitch for it, but no application event ever reaches an `enqueue()`
 * call and nothing is ever spoken aloud. This file pins that gap explicitly.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/narration.ts';
const APP = 'app/renderer/src/App.tsx';
const DESIGN = 'app/renderer/src/generated/console.tsx';

test('the registry records this feature as implemented', () => {
  const registry = json('app/feature-registry.json');
  assert.equal(registry.features['narration'].state, 'implemented');
});

test('default settings are off, with the documented default rate and pitch', () => {
  const src = read(MODULE);
  assert.match(
    src,
    /return \{ enabled: false, language: 'en', voices: \{\}, rate: DEFAULT_RATE, pitch: DEFAULT_PITCH \};/,
  );
  assert.match(src, /^export const DEFAULT_RATE = 1\.0;$/m);
  assert.match(src, /^export const DEFAULT_PITCH = 1\.0;$/m);
  assert.match(src, /^export const MIN_RATE = 0\.5;$/m);
  assert.match(src, /^export const MAX_RATE = 2\.0;$/m);
});

test('the Narrator class exists, queues, and would actually call the engine to speak', () => {
  /* Establishes that the capability is real code, not a stub -- so the gap this file
   * documents is genuinely "unwired", not "unimplemented". */
  const src = read(MODULE);
  assert.match(src, /^export class Narrator \{$/m);
  assert.match(src, /enqueue\(category: string, text: string,/);
  assert.match(src, /await this\.engine\.speak\(\{/);
});

test('exactly seven controls are declared in the compiled design for this feature', () => {
  const design = read(DESIGN);
  const ids = ['nar_enabled', 'nar_language', 'nar_en_voice', 'nar_yue_voice', 'nar_rate', 'nar_pitch', 'nar_status'];
  for (const id of ids) {
    assert.match(design, new RegExp(`ctl\\('${id}',`), `expected control '${id}' in the compiled design`);
  }
  const count = [...design.matchAll(/ctl\('nar_\w+',/g)].length;
  assert.equal(count, ids.length, `expected exactly ${ids.length} nar_* controls, found ${count}`);
});

test('App.tsx routes every one of the seven controls through applyNarrationControl', () => {
  const app = read(APP);
  const fn = app.match(/private applyNarrationControl\(id: string, value: unknown\): void \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'expected to find applyNarrationControl');
  const body = fn[0];
  for (const id of ['nar_enabled', 'nar_language', 'nar_en_voice', 'nar_yue_voice', 'nar_rate', 'nar_pitch']) {
    assert.match(body, new RegExp(`id === '${id}'`), `expected applyNarrationControl to handle '${id}'`);
  }
  assert.match(app, /if \(action === 'narration-status'\) return this\.narrationStatusLine;/);
});

test('voice enumeration subscribes to live changes rather than reading the list once', () => {
  /* The module and the doc both say enumeration fills in late behind an event; this
   * checks the app actually subscribes, not merely calls getVoices() once. The negative
   * lookbehind refuses a line commented out with "// " immediately before the call --
   * a bare substring match would still find that text inside a disabled line. */
  const app = read(APP);
  assert.match(app, /(?<!\/\/ )speech\.addEventListener\('voiceschanged', handler\);/);
  assert.match(app, /(?<!\/\/ )speech\.removeEventListener\('voiceschanged', handler\);/);
});

test('the stable voice identity is stored, and the display name is resolved separately', () => {
  const app = read(APP);
  assert.match(app, /private voiceIdByName\(name: string\): string \| undefined \{/);
  assert.match(app, /next\.voices\.en = value === 'Choose automatically' \? undefined : this\.voiceIdByName\(value\);/);
});

test('App.tsx imports the settings helpers but never the Narrator class itself', () => {
  const app = read(APP);
  const importLine = app.match(/^import \{\n\s*DEFAULT_PITCH, DEFAULT_RATE, MAX_PITCH, MAX_RATE, MIN_PITCH, MIN_RATE,\n\s*defaultNarrationSettings, resolveVoiceStatus,\n\s*type NarrationLanguage, type NarrationSettings, type SpeechVoice,\n\} from '\.\/narration';$/m);
  assert.ok(importLine, 'expected the exact known-good import list from ./narration in App.tsx');
  assert.doesNotMatch(app, /\bNarrator\b/, 'the Narrator class name must not appear anywhere in App.tsx');
});

test('HONEST GAP: nothing in App.tsx ever enqueues an utterance, so nothing is ever spoken', () => {
  /* This is the assertion the whole file exists to make. Anchored on the call shape, not
   * the bare word, so a stray mention in a comment cannot satisfy or defeat it. */
  const app = read(APP);
  assert.doesNotMatch(app, /\.enqueue\(/, '.enqueue(...) must never be called from App.tsx');
  assert.doesNotMatch(app, /new Narrator\(/, 'a Narrator must never be constructed in App.tsx');
});

test('the status line honestly reports what is happening, not that narration is speaking', () => {
  const app = read(APP);
  assert.match(app, /private narrationStatusLine = 'Not started\.';/);
  assert.match(app, /this\.narrationStatusLine = 'This computer has no speech synthesis, so nothing can be spoken\.';/);
});
