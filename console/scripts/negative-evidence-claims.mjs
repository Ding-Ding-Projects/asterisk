#!/usr/bin/env node
/* Evidence claims are separate from feature presence. A row cannot become
 * verified merely by changing its status string. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateSurfaceInventory } from './inventory-validation.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const clone = () => structuredClone(source);
const rowOf = (data) => data.surfaces.find((surface) => surface.id === 'desktop-shell').rows.find((row) => row.featureId === 'narration');
function mustFail(name, mutate) { const candidate = clone(); mutate(candidate); try { validateSurfaceInventory(candidate, { allowUnverified: true, root, currentCommit }); } catch (error) { console.log(`RED: ${name}: ${error.message}`); return; } throw new Error(`${name}: deliberate break stayed green`); }
function claimVerified(row) {
  row.status = 'verified'; row.demoState = 'verified'; row.localization.state = 'verified'; row.persistence.state = 'verified'; row.focusedChecks.state = 'verified';
  row.builtInteraction = { state: 'verified', commit: currentCommit, route: row.route, evidence: 'built-interaction-record' };
  row.captures = { state: 'verified', currentCommit, paths: ['console/release/captures/current.png'] };
  row.designParity = { state: 'verified', referenceRoute: 'design-reference://current', builtRoute: row.route, tuple: { state: 'default', theme: 'dark', viewport: '1280x800', scale: '1x' }, rawCaptures: ['reference.png', 'built.png'], sideBySide: 'side-by-side.png', visualDiff: 'diff.json' };
}
validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit });
mustFail('verified row without a capture', (data) => { const row = rowOf(data); claimVerified(row); row.captures.paths = []; });
mustFail('verified row with stale commit', (data) => { const row = rowOf(data); claimVerified(row); row.captures.currentCommit = '0000000000'; });
mustFail('verified row with sample data', (data) => { const row = rowOf(data); claimVerified(row); row.dataProvenance.sampleData = true; });
validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit });
console.log('GREEN: restored evidence claims remain unverified and honest.');
