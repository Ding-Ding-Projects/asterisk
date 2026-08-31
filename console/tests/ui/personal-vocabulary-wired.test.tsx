import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { App } from '../../app/renderer/src/App.tsx';
import { setVocabularyStorage, transformText } from '../../app/renderer/src/text-boundary.ts';

const VALID = JSON.stringify({
  version: 1,
  replacements: [{ from: 'Vocabulary file', to: 'Personal glossary' }],
});
const REPLACED = JSON.stringify({
  version: 1,
  replacements: [{ from: 'Vocabulary file', to: 'Private lexicon' }],
});
const INVALID = JSON.stringify({ version: 2, replacements: [{ from: 'Vocabulary file', to: 'Wrong version' }] });

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface TestApp {
  state: Record<string, unknown>;
  durableStorage: {
    storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
    bootstrap(): Promise<unknown>;
  };
  vocabStorage: TestApp['durableStorage']['storage'];
  onFilePicked(control: { id: string }, file: File): void;
  onFileCleared(control: { id: string }): void;
  fileControlName(control: { id: string }): string;
  controlActionText(action: string): string;
  render(): unknown;
  fire: (...args: unknown[]) => void;
  toast: (...args: unknown[]) => void;
}

function makeApp(writes: Array<Record<string, unknown>>): TestApp {
  (globalThis as { window?: unknown }).window = {
    dingDesktop: {
      platform: 'win32',
      window: { minimize() {}, toggleMaximize() {}, close() {}, setTitle() {} },
      controlPlane: {
        request: async (request: Record<string, unknown>) => {
          if (request.action === 'settings.snapshot') return { ok: true, data: { values: {} } };
          if (request.action === 'settings.write') {
            writes.push((request.payload ?? {}) as Record<string, unknown>);
            return { ok: true, data: {} };
          }
          if (request.action === 'settings.remove') return { ok: true, data: {} };
          return { ok: true, data: {} };
        },
      },
    },
  };
  const app = new App({}) as unknown as TestApp;
  (app as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueSetState(instance: TestApp, partial: unknown) {
      const next = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(instance.state)
        : partial as Record<string, unknown>;
      instance.state = { ...instance.state, ...next };
    },
  };
  app.state = { ...app.state, screen: 'appearance', railId: 'app', onboardOpen: false };
  app.fire = () => {};
  app.toast = () => {};
  return app;
}

async function choose(app: TestApp, text: string, name: string): Promise<void> {
  const file = new File([text], name, { type: 'application/json' });
  app.onFilePicked({ id: 'va_file' }, file);
  await tick();
  await tick();
}

test('valid upload is applied to rendered copy and acknowledged by the durable settings action', async () => {
  const writes: Array<Record<string, unknown>> = [];
  const app = makeApp(writes);
  await app.durableStorage.bootstrap();
  setVocabularyStorage(app.vocabStorage);

  await choose(app, VALID, 'vocabulary.json');
  const markup = renderToStaticMarkup(app.render() as never);

  assert.match(markup, /Personal glossary/u);
  assert.equal(transformText('Vocabulary file'), 'Personal glossary');
  assert.equal(app.fileControlName({ id: 'va_file' }), 'vocabulary.json');
  assert.match(app.controlActionText('vocab-status'), /Loaded 1 local replacement/u);
  assert.ok(writes.some((payload) => payload.key === 'ding-pbx-vocabulary-cache'), 'the load did not reach settings.write');
});

test('a second valid upload replaces the active mapping, while an invalid upload preserves it', async () => {
  const writes: Array<Record<string, unknown>> = [];
  const app = makeApp(writes);
  await app.durableStorage.bootstrap();
  setVocabularyStorage(app.vocabStorage);

  await choose(app, VALID, 'first.json');
  await choose(app, REPLACED, 'replacement.json');
  assert.equal(transformText('Vocabulary file'), 'Private lexicon');
  assert.equal(app.fileControlName({ id: 'va_file' }), 'replacement.json');

  await choose(app, INVALID, 'bad.json');
  assert.equal(transformText('Vocabulary file'), 'Private lexicon');
  assert.equal(app.fileControlName({ id: 'va_file' }), 'bad.json — rejected');
  assert.match(app.controlActionText('vocab-status'), /Loaded 1 local replacement/u);
});

test('clearing the loaded file restores the original wording immediately', async () => {
  const writes: Array<Record<string, unknown>> = [];
  const app = makeApp(writes);
  await app.durableStorage.bootstrap();
  setVocabularyStorage(app.vocabStorage);

  await choose(app, VALID, 'vocabulary.json');
  app.onFileCleared({ id: 'va_file' });

  assert.equal(transformText('Vocabulary file'), 'Vocabulary file');
  assert.equal(app.fileControlName({ id: 'va_file' }), 'No file chosen');
  assert.match(app.controlActionText('vocab-status'), /original wording is active/u);
  assert.ok(writes.some((payload) => payload.key === 'ding-pbx-vocabulary-cache'), 'the clear did not use the durable settings path');
});
