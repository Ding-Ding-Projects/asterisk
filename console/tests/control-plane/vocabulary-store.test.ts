import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VocabularyStore } from '../../control-plane/vocabulary-store.js';

async function withStore(run: (store: VocabularyStore, root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-vocabulary-'));
  try { await run(new VocabularyStore({ rootPath: join(root, 'cache') }), root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('vocabulary status starts empty and clear is idempotent', async () => {
  await withStore(async store => {
    assert.deepEqual(await store.status(), { state: 'empty', replacementCount: 0 });
    assert.deepEqual(await store.clear(), { state: 'empty', replacementCount: 0 });
  });
});

test('valid vocabulary replacement is persisted as canonical redacted state', async () => {
  await withStore(async (store, root) => {
    const status = await store.replace(JSON.stringify({ version: 1, replacements: [{ from: 'alpha', to: 'beta' }] }));
    assert.deepEqual(status, { state: 'loaded', replacementCount: 1 });
    assert.deepEqual(await store.read(), { version: 1, replacements: [{ from: 'alpha', to: 'beta' }] });
    const raw = await readFile(join(root, 'cache', 'vocabulary.json'), 'utf8');
    assert.match(raw, /"version":1/u);
  });
});

test('invalid replacement is refused without replacing the last valid cache', async () => {
  await withStore(async store => {
    await store.replace(JSON.stringify({ version: 1, replacements: [{ from: 'alpha', to: 'beta' }] }));
    const result = await store.replace('{"version":1,"replacements":[{"from":"alpha","to":"beta"},{"from":"alpha","to":"gamma"}]}');
    assert.equal(result.state, 'invalid');
    assert.deepEqual(await store.read(), { version: 1, replacements: [{ from: 'alpha', to: 'beta' }] });
  });
});

test('corrupt cache is reported inactive and never returned as active vocabulary', async () => {
  await withStore(async (store, root) => {
    const path = join(root, 'cache');
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'vocabulary.json'), '{not-json', 'utf8');
    assert.equal((await store.status()).state, 'invalid');
    assert.equal(await store.read(), undefined);
  });
});
