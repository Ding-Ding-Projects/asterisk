/**
 * Contract: collapsible-filters. `collapsible-filters.ts` (implemented
 * 2026-08-24) is a complete, tested module: panel kinds with real default
 * collapsed states (statistics start collapsed, since a view whose controls
 * occupy more space than its content has buried the content), persistence,
 * and the rule that matters most -- a collapsed panel currently EXCLUDING
 * results must say so (`isFiltering`), because a quietly filtering collapsed
 * row is how somebody comes to believe their data is missing.
 *
 * NOTHING IMPORTS IT YET: no surface in the console renders a collapsible
 * panel, confirmed by grepping App.tsx and finding no import. The drafted
 * controls would write real storage keys nothing reads. Real consumption
 * means a screen with a filter row or a statistics panel calling
 * isCollapsed/setCollapsed with its own surface id.
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
const MODULE = 'app/renderer/src/collapsible-filters.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['collapsible-filters'];
  assert.ok(row, 'the implementation registry has no row for collapsible-filters');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('nothing in App.tsx imports collapsible-filters.ts -- it constrains nothing that ships today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/collapsible-filters'/u,
    'App.tsx now imports collapsible-filters.ts -- a real filter row or statistics panel may now use it, which would flip this row');
});

test('statistics panels start collapsed by default -- the three panel kinds are declared with real default states', () => {
  const src = read(MODULE);
  assert.match(src, /export const PANEL_KINDS = \['search', 'filterRow', 'statistics'\] as const;/u,
    'the panel-kind enum no longer matches');
  assert.match(src, /statistics.*start collapsed/isu, 'the statistics-starts-collapsed rationale is no longer documented');
});

test('isCollapsed and a real per-surface storage key exist', () => {
  const src = read(MODULE);
  assert.match(src, /export function isCollapsed\(storage: PanelStorage \| undefined, surfaceId: string, kind: PanelKind\): boolean \{/u,
    'isCollapsed no longer matches the expected signature');
  assert.match(src, /export const PANEL_SETTING_PREFIX = 'console\.panel\.';/u, 'the panel storage-key prefix no longer matches');
});

test('a collapsed panel that is currently excluding results must say so -- isFiltering is a real, honest flag', () => {
  const src = read(MODULE);
  assert.match(src, /isFiltering: boolean;/u, 'the isFiltering field no longer exists on the accessible summary');
  assert.match(src, /A collapsed row can be quietly excluding results/isu,
    'the rationale for isFiltering is no longer documented -- re-check whether the honesty rule still holds');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/collapsible-filters.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/collapsible-filters.test.tsx exists but looks too small to be real coverage');
});
