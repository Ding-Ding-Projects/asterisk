/** Contract: the mounted narrator uses the current channel-based settings schema. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const app = () => read('app/renderer/src/App.tsx');
const narration = () => read('app/renderer/src/narration.ts');
const design = () => read('app/renderer/src/generated/console.tsx');

test('default narration is off and retains independent stable voice, rate, and pitch channels', () => {
  const src = narration();
  assert.match(src, /enabled: false,/);
  assert.match(src, /language: 'en',/);
  assert.match(src, /channels: \{/);
  for (const language of ['en', 'zh']) {
    assert.match(src, new RegExp(`${language}: \\{ rate: DEFAULT_RATE, pitch: DEFAULT_PITCH \\}`));
  }
  assert.match(src, /^export const MIN_RATE = 0\.5;$/m);
  assert.match(src, /^export const MAX_RATE = 2\.0;$/m);
  assert.match(src, /^export const MIN_PITCH = 0\.0;$/m);
  assert.match(src, /^export const MAX_PITCH = 2\.0;$/m);
});

test('Narrator owns a serialized queue, error reporting, cooldown, quiet mode, and screen-reader yielding', () => {
  const src = narration();
  for (const needle of [
    'private queue: QueueItem[] = [];',
    'private speaking = false;',
    'private lastError: string | undefined;',
    'private readonly lastSpokenAtMs = new Map<string, number>();',
    'setScreenReaderActive(active: boolean): void',
    'setQuiet(quiet: boolean): void',
    'if (this.suppressed()) return false;',
    'if (!isError)',
    'this.queue = this.queue.filter((item) => item.category !== category);',
    'await this.engine.speak({',
    'this.lastError = error instanceof Error ? error.message : String(error);',
  ]) assert.ok(src.includes(needle), `missing narrator contract: ${needle}`);
});

test('each language resolves its chosen stable voice independently while retaining unavailable choices', () => {
  const src = narration();
  assert.match(src, /resolveVoiceStatus\(\n  language: 'en' \| 'zh',/);
  assert.match(src, /chosenVoiceId: string \| undefined,/);
  assert.match(src, /The chosen voice is not installed on this machine/);
  assert.match(src, /while keeping the choice\./);
  assert.match(src, /network-backed and will go quiet offline/);
});

test('the compiled surface declares exactly the seven narration controls owned by the mounted app', () => {
  const src = design();
  const ids = ['nar_enabled', 'nar_language', 'nar_en_voice', 'nar_yue_voice', 'nar_rate', 'nar_pitch', 'nar_status'];
  for (const id of ids) assert.match(src, new RegExp(`ctl\\('${id}',`));
  assert.equal([...src.matchAll(/ctl\('nar_\w+',/g)].length, ids.length);
});

test('the mounted app routes controls into channels and immediately updates the actual narrator', () => {
  const src = app();
  const match = src.match(/private applyNarrationControl\(id: string, value: unknown\): void \{[\s\S]*?\n  \}/);
  assert.ok(match, 'applyNarrationControl is missing');
  const body = match[0];
  for (const id of ['nar_enabled', 'nar_language', 'nar_en_voice', 'nar_yue_voice', 'nar_rate', 'nar_pitch']) {
    assert.match(body, new RegExp(`id === '${id}'`));
  }
  for (const needle of [
    'next.channels.en.voiceId', 'next.channels.zh.voiceId',
    'next.channels.en.rate', 'next.channels.zh.rate',
    'next.channels.en.pitch', 'next.channels.zh.pitch',
    'this.narrator.setSettings(next);',
  ]) assert.ok(body.includes(needle), `missing live narrator update: ${needle}`);
});

test('the app persists narration settings and restores the current schema before narration can run', () => {
  const src = app();
  assert.match(src, /private static readonly NARRATION_SETTING = 'console\.narration';/);
  assert.match(src, /this\.durableStorage\.storage\.setItem\(App\.NARRATION_SETTING, JSON\.stringify\(next\)\);/);
  assert.match(src, /private restoreNarration\(\): void \{/);
  assert.match(src, /this\.narrator\.setSettings\(this\.narration\);/);
});

test('voice enumeration is live and its status source is the effective channel voice', () => {
  const src = app();
  assert.match(src, /speech\.addEventListener\('voiceschanged', handler\);/);
  assert.match(src, /speech\.removeEventListener\('voiceschanged', handler\);/);
  assert.match(src, /private voiceIdByName\(name: string\): string \| undefined \{/);
  assert.match(src, /resolveVoiceStatus\(language, this\.narration\.channels\[language\]\.voiceId, this\.voices\)/);
});

test('the mounted notification path is narrated and preserves the styled message plus error priority', () => {
  const src = app();
  /* This pinned the whole one-line signature, `(title, body, isError = false)`. The
   * parameter genuinely changed -- a boolean became `NotificationSeverity | boolean`, so
   * an informational notice can be told from a warning -- and the assertion went red for
   * a real improvement while saying nothing about the property it exists to protect.
   *
   * What is pinned now is the property: `narratedFire` is what `fire` is replaced by, so
   * it IS the mounted path; the narrator is handed the STYLED text rather than the raw
   * text, so the humour level reaches speech; and error priority survives, whichever of
   * the two shapes the caller used. A signature is not asserted at all, because the next
   * caller shape is a change to make freely and this test has no opinion about it. */
  /* Anchored to the whole line, because the first version of this assertion was not and
   * stayed green when the mount was commented out -- which is how a wiring line usually
   * dies. Watched go red on that exact break before being trusted. */
  assert.match(src, /^\s*private narratedFire = \(/m, 'narratedFire is no longer declared as a bound field');
  assert.match(src, /^\s*this\.fire = this\.narratedFire;\s*$/m, 'narratedFire is no longer the mounted notification path');
  assert.match(src, /const styled = styledDialog\(/);
  assert.match(src, /this\.narrator\.enqueue\('notification', styled\.body \? `\$\{styled\.heading\}\. \$\{styled\.body\}` : styled\.heading, \{ isError: [^}]+\}\);/,
    'the narrator no longer speaks the styled text, or no longer carries error priority with it');
  assert.match(src, /this\.baseFire\(styled\.heading, styled\.body\);/);
  /* The legacy two-argument call shape still reaches this path from the compiled shell,
   * so the boolean it passes must still mean what it did. */
  assert.match(src, /typeof severityOrLegacyError === 'boolean'\s*\n?\s*\? \(severityOrLegacyError \? 'error' : 'warning'\)/,
    'a legacy fire(title, body, true) call no longer resolves to error severity');
});

test('the registry row remains an honest unresolved inventory task until the central inventory materializer records proof', () => {
  const registry = JSON.parse(read('app/feature-registry.json'));
  const row = registry.features.narration;
  assert.ok(row, 'missing narration registry row');
  assert.equal(row.status, 'partial');
  assert.equal(row.note, 'Exact source seams are recorded in this schema-v2 row. Built interaction, current-commit captures, and design-parity evidence remain not-run, so this row makes no verified claim.');
  assert.deepEqual(row.implementation.paths, []);
  assert.equal(row.builtInteraction.state, 'not-run');
});
