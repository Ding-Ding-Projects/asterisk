#!/usr/bin/env node
/** Deliberate red then green tests for every sharded-manifest integrity boundary. */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadUiSmokeManifest } from './ui-smoke-manifest-loader.mjs';
const root = resolve(import.meta.dirname, '..', '..'); const inventory = resolve(root, 'console/inventories/ui-smoke');
const index = JSON.parse(readFileSync(resolve(inventory, 'interaction-manifest.json'), 'utf8')); const clone = () => JSON.parse(JSON.stringify(index)); const failures = [];
function red(label, mutate) { const candidate = clone(); mutate(candidate); try { loadUiSmokeManifest({ index: candidate }); } catch { failures.push(label); return; } throw new Error(`negative shard mutation stayed green: ${label}`); }
export function runShardNegatives() {
  red('missing', (v) => { v.shards[0].path = 'shards/missing.json'; }); red('reordered', (v) => { [v.shards[0], v.shards[1]] = [v.shards[1], v.shards[0]]; }); red('duplicated', (v) => { v.shards[1] = { ...v.shards[0], ordinal: 1 }; }); red('oversized', (v) => { v.storage.maxShardBytes = 1; }); red('altered-hash', (v) => { v.shards[0].sha256 = '0'.repeat(64); }); red('wrong-count', (v) => { v.shards[0].rowCount += 1; }); red('wrong-boundary', (v) => { v.shards[0].firstRowId = 'wrong'; });
  const temp = resolve(inventory, '.negative-shard-temp'); rmSync(temp, { recursive: true, force: true }); mkdirSync(resolve(temp, 'shards'), { recursive: true }); copyFileSync(resolve(inventory, 'interaction-manifest.json'), resolve(temp, 'interaction-manifest.json')); for (const shard of index.shards) copyFileSync(resolve(inventory, shard.path), resolve(temp, shard.path)); writeFileSync(resolve(temp, 'shards/stale.json'), '[]\n'); try { try { loadUiSmokeManifest({ inventoryRoot: temp }); } catch { failures.push('extra-and-stale'); } } finally { rmSync(temp, { recursive: true, force: true }); }
  if (failures.length !== 8) throw new Error(`expected eight shard negatives, got ${failures.length}`); loadUiSmokeManifest(); return { redMutations: failures.length, restored: true };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/negative-ui-smoke-shards.mjs')) { const result = runShardNegatives(); console.log(`RED then GREEN shard integrity verified: ${result.redMutations} deliberate mutations rejected`); }
