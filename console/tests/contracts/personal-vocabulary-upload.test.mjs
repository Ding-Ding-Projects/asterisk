/**
 * Contract: personal-vocabulary-upload. The registry note documents its own
 * two corrections, which are worth repeating rather than re-deriving.
 *
 * Correction 1 (2026-08-23): this row once read "implemented -- fully wired
 * into App.tsx", true of load/clear/status/storage and false of the one thing
 * the feature exists to do -- `applyVocabularyText` had no caller anywhere
 * outside its own tests, so an uploaded file changed a validation status line
 * and not one rendered word. It is now consumed through `text-boundary.ts`,
 * which App.tsx hands the storage handle on mount, and replacement runs after
 * translation so a personal rename is the last word.
 *
 * Correction 2 (2026-08-23): the durability gap is fixed. The renderer no
 * longer reaches `window.localStorage` (in-memory only for a `file://`
 * origin) for this cache; it goes through `durable-storage.ts`, which
 * write-through-caches against the main process's real `settings.snapshot`/
 * `settings.write`/`settings.remove` control-plane actions, persisted
 * atomically to `settings.json` under `app.getPath('userData')`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const TEXT_BOUNDARY = 'app/renderer/src/text-boundary.ts';
const DISPATCH = 'control-plane/dispatch.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['personal-vocabulary-upload'];
  assert.ok(row, 'the implementation registry has no row for personal-vocabulary-upload');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('load, clear, and status are genuinely wired to real App.tsx call sites', () => {
  const app = read(APP);
  assert.match(app, /clearVocabulary, loadVocabularyFile, vocabularyStatus, type VocabularyStorage,/u,
    'personal-vocabulary.ts is no longer imported the expected way');
  assert.match(app, /const result = loadVocabularyFile\(this\.vocabStorage, text\);/u, 'loadVocabularyFile(...) is no longer called');
  assert.match(app, /const result = clearVocabulary\(this\.vocabStorage\);/u, 'clearVocabulary(...) is no longer called');
});

test('applyVocabularyText IS consumed through text-boundary.ts -- replacement runs after translation, so a personal rename is the last word', () => {
  const src = read(TEXT_BOUNDARY);
  assert.match(src, /import \{ applyVocabularyText, type VocabularyStorage \} from '\.\/personal-vocabulary';/,
    'personal-vocabulary.ts is no longer imported by text-boundary.ts -- the consumption gap may have regressed');
  assert.match(src, /return vocabulary \? applyVocabularyText\(vocabulary, \{ text: renamed, boundary: 'user-interface-copy' \}\) : renamed;/u,
    'applyVocabularyText no longer runs after localization -- re-check ordering');
});

test('text-boundary.ts is genuinely wired into App.tsx, not merely imported by tests', () => {
  const app = read(APP);
  assert.match(app, /\} from '\.\/text-boundary';/u, 'text-boundary.ts is no longer imported by App.tsx');
});

test('the vocabulary cache no longer reaches window.localStorage -- it goes through durable-storage.ts', () => {
  const app = read(APP);
  assert.match(app, /createDurableStorage, type DurableStorageHandle \} from '\.\/durable-storage';/,
    'durable-storage.ts is no longer imported the expected way');
  assert.match(app, /private vocabStorage: VocabularyStorage = this\.durableStorage\.storage;/u,
    'vocabStorage no longer derives from durableStorage -- the durability fix may have regressed');
  // window.localStorage is mentioned only in the explanatory comment above this
  // field (why it is NOT used) and, separately, for the unrelated appearance
  // editor's own key -- never assigned as vocabStorage's backing store.
  assert.doesNotMatch(app, /vocabStorage\s*[:=][^;]*window\.localStorage/u,
    'vocabStorage now appears to be backed by window.localStorage -- the durability fix may have regressed');
});

test('settings.snapshot, settings.write, and settings.remove are real control-plane dispatch actions', () => {
  const src = read(DISPATCH);
  for (const action of ["'settings.snapshot'", "'settings.write'", "'settings.remove'"]) {
    assert.ok(src.includes(action), `${action} no longer appears as a dispatch action`);
  }
});
