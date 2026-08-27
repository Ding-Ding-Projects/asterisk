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

/**
 * Repaired 2026-08-27. Three of the four needles below were pinned to a signature the
 * feature has not had since the notification-severity work landed: `narratedFire` grew a
 * `NotificationSeverity | boolean` third parameter, its declaration went multi-line, and
 * the narrator's `isError` stopped being a shorthand. The old needles matched nothing, so
 * this contract had been failing on `master` rather than guarding anything -- and the
 * direction matters: it was a stale test against a working feature, not the reverse.
 *
 * What is pinned now is the property rather than the spelling. The narrator must speak
 * the STYLED text (narrating the raw text would have the console say one thing while the
 * screen showed another), the rendered notice must be that same styled text, and error
 * priority must survive the widening -- which is exactly what the boolean-to-severity
 * mapping decides, so that mapping is asserted here for the first time. The declaration
 * is matched across its own line breaks with an explicit `[\s\S]` run bounded to the
 * parameter list, rather than by re-flattening it into one line that the source does not
 * contain.
 */
test('the mounted notification path is narrated and preserves the styled message plus error priority', () => {
  const src = app();
  assert.match(src, /private narratedFire = \(\s*title: string,\s*body: string,\s*severityOrLegacyError: NotificationSeverity \| boolean = 'warning',\s*\): void => \{/,
    'narratedFire no longer declares the widened (title, body, severity-or-legacy-error) signature');
  assert.match(src, /const styled = styledDialog\(/);
  /* The legacy two-argument and boolean-true call shapes still have to reach the same
   * severities, or a compiled-shell error path would quietly become a warning. */
  assert.match(src, /const severity: NotificationSeverity = typeof severityOrLegacyError === 'boolean'\s*\? \(severityOrLegacyError \? 'error' : 'warning'\)\s*: severityOrLegacyError;/,
    'the boolean-to-severity mapping is gone, so a legacy fire(title, body, true) may no longer be an error');
  /* These two are matched together, in order, inside one bounded run rather than as two
   * independent needles. The second was a bare `this.baseFire(styled.heading, styled.body);`
   * and App.tsx contains that call TWICE -- once here and once in an unrelated notice path
   * around line 846 -- so deleting it from `narratedFire` left the assertion satisfied by the
   * other occurrence. Measured on 2026-08-27 rather than reasoned about: with `narratedFire`'s
   * call replaced by `this.baseFire(title, body)`, one occurrence of the styled call remained
   * in the file and the old bare needle still matched it. A substring that exists elsewhere in
   * the file is not a check on the place it was written for. */
  assert.match(src, /this\.narrator\.enqueue\('notification', styled\.body \? `\$\{styled\.heading\}\. \$\{styled\.body\}` : styled\.heading, \{ isError: severity === 'error' \}\);\s*this\.baseFire\(styled\.heading, styled\.body\);/,
    'the narrator no longer speaks the styled text, no longer carries error priority, or no longer renders that same styled text');
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
