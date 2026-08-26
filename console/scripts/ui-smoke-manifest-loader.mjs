/** Bounded, fail-closed reader for the sharded UI smoke interaction manifest. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DESIGN_BINDING_CENSUS, FEATURES, INVENTORY_VERSION, LANGUAGE_MODES, PENDING_CONTRACTS, SURFACES } from '../inventories/ui-smoke-inventory.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventoryRoot = resolve(root, 'console/inventories/ui-smoke');
const indexPath = resolve(inventoryRoot, 'interaction-manifest.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalInventoryDigest = () => {
  const census = JSON.parse(readFileSync(resolve(inventoryRoot, 'control-census.json'), 'utf8'));
  const surfaceControlIndex = JSON.parse(readFileSync(resolve(inventoryRoot, 'surface-control-index.json'), 'utf8'));
  return sha256(JSON.stringify({ inventoryVersion: INVENTORY_VERSION, features: FEATURES, pendingContracts: PENDING_CONTRACTS, surfaces: SURFACES, controlCensus: census, surfaceControlIndex, designBindingCensus: DESIGN_BINDING_CENSUS, languageModes: LANGUAGE_MODES }));
};
export function loadUiSmokeManifest(options = {}) {
  const activeRoot = options.inventoryRoot ?? inventoryRoot;
  const index = options.index ?? JSON.parse(readFileSync(resolve(activeRoot, 'interaction-manifest.json'), 'utf8'));
  if (index.schemaVersion !== 3 || index.storage?.kind !== 'deterministic-shards' || !Array.isArray(index.shards)) throw new Error('UI smoke shard index schema is invalid');
  const expectedPaths = new Set(index.shards.map((shard) => shard.path.slice('shards/'.length)));
  const actualPaths = readdirSync(resolve(activeRoot, 'shards')).filter((name) => name.endsWith('.json'));
  if (actualPaths.length !== expectedPaths.size || actualPaths.some((name) => !expectedPaths.has(name))) throw new Error('UI smoke extra or stale shard detected');
  if (index.inventoryDigest !== canonicalInventoryDigest()) throw new Error('UI smoke shard index canonical inventory digest drift');
  const rows = []; const ids = new Set();
  for (let position = 0; position < index.shards.length; position += 1) {
    const shard = index.shards[position];
    if (shard.ordinal !== position || !/^shards\/interaction-\d{4}\.json$/u.test(shard.path)) throw new Error(`UI smoke shard order/path drift at ${position}`);
    const path = resolve(activeRoot, shard.path);
    if (!existsSync(path) || statSync(path).size !== shard.byteSize) throw new Error(`UI smoke shard missing or size drift: ${shard.path}`);
    if (shard.byteSize > index.storage.maxShardBytes) throw new Error(`UI smoke shard exceeds cap: ${shard.path}`);
    const bytes = readFileSync(path); if (sha256(bytes) !== shard.sha256) throw new Error(`UI smoke shard hash drift: ${shard.path}`);
    const part = JSON.parse(bytes.toString('utf8'));
    if (!Array.isArray(part) || part.length !== shard.rowCount || !part.length || part[0].id !== shard.firstRowId || part.at(-1).id !== shard.lastRowId) throw new Error(`UI smoke shard boundary/count drift: ${shard.path}`);
    for (const row of part) { if (!row?.id || ids.has(row.id)) throw new Error(`UI smoke row duplicate/missing-order drift at ${row?.id}`); ids.add(row.id); rows.push(row); }
  }
  if (rows.length !== index.totalRows || rows.length !== 17127) throw new Error(`UI smoke total row count drift: ${rows.length}`);
  if (index.rowSequenceSha256 !== sha256(Buffer.from(rows.map((row) => row.id).join('\n')))) throw new Error('UI smoke row sequence digest drift');
  return { ...index.manifest, schemaVersion: 2, inventoryDigest: index.inventoryDigest, rows };
}
