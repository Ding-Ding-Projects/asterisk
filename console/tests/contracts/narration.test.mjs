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

/* This guard went red on master, and the code was right and the guard was wrong.
 * It pinned `narratedFire`'s exact one-line signature -- `(title, body, isError = false)`
 * -- and its exact `{ isError }` argument. The notification path since grew a third
 * parameter that accepts either a `NotificationSeverity` or the legacy boolean, which
 * moved the declaration onto four lines and turned the argument into a derived
 * `{ isError: severity === 'error' }`. Both are refactors of the spelling, not of the
 * behaviour, so the guard was reporting a defect that was not there while saying
 * nothing about the three properties its own title claims.
 *
 * It asserts those three properties now, against the code as it is actually written:
 * the path is narrated, it narrates the STYLED text rather than the raw text, and an
 * error keeps its priority through the boolean-to-severity normalisation. Each is
 * anchored to a whole line, because a needle like `narratedFire` is satisfied by a
 * renamed `narratedFireX` and by a commented-out call. */
/**
 * The body of `narratedFire`, on its own.
 *
 * Whole-file anchors are not enough here, and that was measured rather than assumed:
 * `scripts/negative-narration-fire.mjs` deleted the styling line and the on-screen
 * hand-off from inside `narratedFire` and this guard stayed GREEN both times, because
 * `const styled = styledDialog(..., classifyDialogKind(title), title, body);` and
 * `this.baseFire(styled.heading, styled.body);` each appear TWICE in App.tsx -- once
 * here and once in a sibling dialog path. A file-wide match is therefore satisfied by
 * the copy this test is not about, which is the descendant-satisfies-the-check shape
 * in a new costume. Slicing the method out first is what makes the two assertions
 * below say anything at all.
 */
function narratedFireBody(src) {
  const start = src.indexOf('  private narratedFire = (');
  assert.notEqual(start, -1, 'narratedFire is no longer declared as a private class field on the mounted app');
  const end = src.indexOf('\n  };', start);
  assert.notEqual(end, -1, 'narratedFire has no closing brace at class-field indentation -- the slice would run to end of file');
  const body = src.slice(start, end);
  // A slice that came back empty or tiny would let every assertion below pass by
  // finding nothing, so its size is asserted before it is used.
  assert.ok(body.split('\n').length > 5, 'the narratedFire slice is too short to be the real method body');
  return body;
}

test('the mounted notification path is narrated and preserves the styled message plus error priority', () => {
  const src = app();
  const body = narratedFireBody(src);

  assert.match(body, /^ {4}severityOrLegacyError: NotificationSeverity \| boolean = 'warning',$/m,
    'the severity parameter that replaced the old isError boolean is gone; a caller passing true may no longer reach the error path');
  assert.match(src, /^ {4}this\.fire = this\.narratedFire;$/m,
    'the mounted fire() is no longer narratedFire, so the notification path is not narrated at all');

  /* Styled before spoken. The console must not say one thing while the screen shows
   * another, so the narrator has to receive styled.heading/styled.body and never the
   * raw title and body it was handed. Both of these are asserted inside the slice. */
  assert.match(body, /^ {4}const styled = styledDialog\(this\.messageStorage, this\.currentCopyLanguage\(\), classifyDialogKind\(title\), title, body\);$/m,
    'narratedFire no longer styles the copy before narrating it');
  assert.match(body, /^ {4}this\.narrator\.enqueue\('notification', styled\.body \? `\$\{styled\.heading\}\. \$\{styled\.body\}` : styled\.heading, \{ isError: severity === 'error' \}\);$/m,
    'the narrator no longer receives the styled text, or no longer derives isError from the normalised severity');
  assert.match(body, /^ {4}this\.baseFire\(styled\.heading, styled\.body\);$/m,
    'the on-screen notification no longer receives the same styled text the narrator was given');

  /* Error priority survives the legacy boolean. `fire(title, body, true)` is the call
   * shape the compiled shell still emits, and it has to keep arriving as 'error'. */
  assert.match(body, /^ {6}\? \(severityOrLegacyError \? 'error' : 'warning'\)$/m,
    'a legacy boolean true no longer normalises to the error severity, so shell error notices lose their priority');
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
