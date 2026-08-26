#!/usr/bin/env node
/** Deliberate red then green mutation harness for the source manifest. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateManifest } from './verify-ui-smoke-manifest.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const original = JSON.parse(readFileSync(resolve(root, 'console/inventories/ui-smoke/interaction-manifest.json'), 'utf8'));
const copy = () => JSON.parse(JSON.stringify(original));
const failures = [];
function mustFail(label, mutate) { const candidate = copy(); mutate(candidate); try { validateManifest(candidate); } catch { failures.push(label); return; } throw new Error(`negative mutation stayed green: ${label}`); }

export function runNegativeRegressions() {
  mustFail('remove one row', (candidate) => { candidate.rows.pop(); });
  mustFail('change one exact URL', (candidate) => { candidate.rows[0].route.expectedUrl += '-drift'; });
  mustFail('remove adapter identity', (candidate) => { delete candidate.rows[0].runtimeIdentity.adapter; });
  mustFail('duplicate one row id', (candidate) => { candidate.rows[1].id = candidate.rows[0].id; });
  mustFail('remove one mapping', (candidate) => { delete candidate.rows[0].mappings.pages; });
  mustFail('drop destructive ceremony', (candidate) => { const row = candidate.rows.find((item) => item.destructiveSafety.level === 'destructive'); row.destructiveSafety.keys = []; });
  mustFail('remove handler source needle', (candidate) => { candidate.rows[0].action.semantics.handler.sourceNeedle = ''; });
  mustFail('remove control feature ownership', (candidate) => { candidate.rows[0].featureIds = []; });
  mustFail('remove numeric step', (candidate) => { const row = candidate.rows.find((item) => ['slider', 'stepper'].includes(item.action.exact.split(':')[0])); row.action.boundedFixture.step = null; });
  mustFail('drop occurrence stable id', (candidate) => { const row = candidate.rows.find((item) => item.occurrenceStableId); delete row.occurrenceStableId; row.id = row.id.replace(/@design[^.]+/u, ''); });
  mustFail('dynamic count drift', (candidate) => { candidate.sourceCounts.dynamicRuntimeControlCount = 0; });
  mustFail('malformed default census count', (candidate) => { candidate.sourceCounts.controlOccurrenceCount = 0; });
  mustFail('weak switch observable', (candidate) => { const row = candidate.rows.find((item) => item.action.type === 'toggle-on'); row.expected.observablePredicate = 'true'; });
  validateManifest(original);
  return { redMutations: failures.length, restored: true, runtimeEvidence: 'unrun' };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/negative-ui-smoke-manifest.mjs')) { const result = runNegativeRegressions(); console.log(`RED then GREEN definitions verified: ${result.redMutations} deliberate mutations rejected, restored manifest accepted`); }