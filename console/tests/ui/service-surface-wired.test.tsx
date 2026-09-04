import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import type { OllamaCatalogSnapshot } from '../../shared/ollama.ts';

test('the renderer source maps a complete service catalog and retains installed-only tags', async () => {
  const source = await readFile(new URL('../../app/renderer/src/surface-mounts.tsx', import.meta.url), 'utf8');
  const catalog: OllamaCatalogSnapshot = {
    schemaVersion: 1,
    sourceId: 'official-catalog',
    sourceRevision: 'rev-7',
    refreshedAt: '2026-08-31T02:00:00.000Z',
    pageCount: 3,
    complete: true,
    stale: false,
    variants: [{
      id: 'qwen3:8b',
      model: 'qwen3',
      tag: '8b',
      displayName: 'Qwen 3 8B',
      description: 'Local model',
      capabilities: ['chat', 'vision'],
      sizeBytes: 8_000,
      parameterCount: 8_000_000_000,
      quantization: 'Q4_K_M',
      contextLength: 32_768,
      metadata: { family: 'qwen' },
    }],
  };
  assert.match(source, /mapCatalogSnapshot\(/u);
  assert.match(source, /sourceIdentity: catalog\.sourceId/u);
  assert.match(source, /revision: catalog\.sourceRevision/u);
  assert.match(source, /catalog\.complete \? 'complete'/u);
  assert.match(source, /installedOnly/u);
  assert.match(source, /The installed tag was not present in the catalog response/u);
  assert.match(source, /variant\.capabilities\.map/u);
  assert.match(source, /fit: unknownFit/u);
  assert.equal(catalog.complete, true);
});

test('the renderer source maps queue progress and mixed outcomes without claiming a whole-batch success', async () => {
  const source = await readFile(new URL('../../app/renderer/src/surface-mounts.tsx', import.meta.url), 'utf8');
  assert.match(source, /export function pullQueueEvidence/u);
  assert.match(source, /completedBytes: record\.progress\?\.completedBytes/u);
  assert.match(source, /totalBytes: record\.progress\?\.totalBytes/u);
  assert.match(source, /state: record\.state === 'pulled' \? 'complete' : record\.state/u);
  assert.match(source, /retry this item after checking the local Ollama service/iu);
});

test('the converter and Ollama mounts use the typed service actions and refresh durable queue outcomes', async () => {
  const source = await readFile(new URL('../../app/renderer/src/surface-mounts.tsx', import.meta.url), 'utf8');
  const converter = await readFile(new URL('../../app/renderer/src/converter-surface.tsx', import.meta.url), 'utf8');
  assert.match(source, /converter\.pdf-validate/u);
  assert.match(source, /ollama\.catalog\.refresh|ollama\.catalog\.get/u);
  assert.match(source, /ollama\.pulls\.list/u);
  assert.match(source, /ollama\.chat\.sessions/u);
  assert.match(source, /ollama\.pulls\.enqueue/u);
  assert.match(source, /ollama\.pulls\.cancel/u);
  assert.match(source, /ollama\.pulls\.retry/u);
  assert.match(converter, /await loadQueuePage\(state\.queue\.id\)/u);
});
