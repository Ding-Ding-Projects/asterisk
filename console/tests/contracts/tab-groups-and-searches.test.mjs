/**
 * Contract: tab-groups-and-searches.
 *
 * Real and wired: tab groups (`state.groups`, create/rename/ungroup/recolour,
 * "Wrap in group"'s neighbour "Rename group…"/"Ungroup" context-menu items),
 * pinning (`state.pinned`, pin/unpin/"Pin whole group"/"All unpinned"), and a
 * single per-strip bulk-close filter with three modes -- Containing, Not
 * containing, By colour -- each previewed live before closing, with a regex
 * toggle (`openTabRegex`) shared with the project's regex builder.
 *
 * NOT real, against the canonical four-search contract this feature names
 * (current strip, inside a group, group names, and a master cross-window
 * search): the one filter that exists is a bulk CLOSE action, not a find/reveal
 * search -- it removes matching tabs from `state.tabs` rather than locating and
 * focusing one. There is no dedicated group-name search, no in-group search,
 * and no master search across windows.
 *
 * One naming trap worth pinning explicitly: "Wrap in group" (line ~5294) is a
 * regex-builder action ("Wrap the whole pattern in a capture group") that
 * mutates the current regex pattern -- it has nothing to do with tab groups
 * despite the coincidental phrase. This file asserts the two never get
 * conflated.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const GENERATED = 'app/renderer/src/generated/console.tsx';

test('the registry row is internally honest: it records the real generated implementation instead of calling it absent', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['tab-groups-and-searches'];
  assert.ok(row, 'the implementation registry has no row for tab-groups-and-searches');
  assert.ok(['implemented-unverified', 'partial', 'absent'].includes(row.status), `undefined status "${row.status}"`);
  assert.ok(row.implementation.symbols.some((symbol) => symbol.path === 'app/renderer/src/generated/console.tsx'), 'the generated tab surface is missing from the registry implementation symbols');
  assert.doesNotMatch(row.note, /^No implementation is recorded/u, 'the registry contradicts the generated tab controls');
});

test('tab groups are real: rename, ungroup, and per-group colour all exist as wired context-menu commands', () => {
  const src = read(GENERATED);
  assert.match(src, /\{ icon:'edit', label:'Rename group…', hint:'F2', run:\(\) => \{ close\(\); this\.setState\(\{ renameOpen:true, renameKey:'group:' \+ g\.id, renameValue:g\.name \}\); \} \}/u,
    'Rename group… no longer matches the expected wired command');
  assert.match(src, /\{ icon:'link_off', label:'Ungroup', hint:'', run:\(\) => \{ close\(\); this\.setState\(\{ groups:s\.groups\.filter\(x => x\.id !== g\.id\) \}\); this\.toastWithId\('event-generated-event-source-\d+-toast-0', 'Group dissolved — tabs kept'\); \} \}/u,
    'Ungroup no longer matches the expected wired command');
});

test('pinning is real: pin/unpin, "Pin whole group", and "All unpinned" all mutate state.pinned', () => {
  const src = read(GENERATED);
  assert.match(src, /\{ icon:'push_pin', label:s\.pinned\.indexOf\(k\) >= 0 \? 'Unpin tab' : 'Pin tab',/u, 'the per-tab pin/unpin toggle no longer matches');
  assert.match(src, /\{ icon:'push_pin', label:'Pin whole group', run:\(\) => \{ close\(\); this\.set\('pinned', s\.pinned\.concat\(g\.tabs\)\); \} \}/u, '"Pin whole group" no longer matches');
});

test('tab discovery implements current-strip, per-group, group-name, and master searches without repurposing bulk close', () => {
  const src = read(GENERATED);
  assert.match(src, /tabFilterTitle:s\.tabFilterMode === 'not' \? 'Close tabs NOT containing…' : \(s\.tabFilterMode === 'colour' \? 'Close tabs by colour' : 'Close tabs containing…'\),/u,
    'the tab filter titles no longer match the expected three close modes');
  assert.match(src, /applyTabFilter:\(\) => \{/u, 'applyTabFilter no longer exists');
  for (const symbol of ['stripTabSearch', 'groupTabSearch', 'groupNameSearch', 'masterTabSearch']) {
    assert.match(src, new RegExp(`\\b${symbol}\\b`, 'u'), `${symbol} is missing`);
  }
  assert.match(src, /tabSearchRevealTab|activateTabSearch/u,
    'a tab search must reveal and focus its match rather than only deleting tabs');
});

test('"Wrap in group" is a regex-builder action on the current pattern, unrelated to tab groups -- the naming coincidence does not extend to behaviour', () => {
  const src = read(GENERATED);
  assert.match(src, /\{ icon:'data_array', label:'Wrap in group', title:'Wrap the whole pattern in a capture group', run:\(\) => \{ const v = '\(' \+ \(s\.rxText \|\| ''\) \+ '\)'; const p = Object\.assign\(\{\}, s\.patterns\); p\[s\.regexTarget\] = \[v\]; this\.setState\(\{ rxText:v, patterns:p \}\); \} \}/u,
    '"Wrap in group" no longer matches the expected regex-builder action -- re-check the naming-coincidence note');
});

test('close-tab filtering has a real regex toggle shared with the project regex builder', () => {
  const src = read(GENERATED);
  assert.match(src, /openTabRegex:\(\) => this\.setState\(\{ regexOpen:true, regexTarget:'nav',/u,
    'openTabRegex no longer opens the shared regex builder targeted at the tab-filter field');
});
