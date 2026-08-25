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

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['tab-groups-and-searches'];
  assert.ok(row, 'the implementation registry has no row for tab-groups-and-searches');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('tab groups are real: rename, ungroup, and per-group colour all exist as wired context-menu commands', () => {
  const src = read(GENERATED);
  assert.match(src, /\{ icon:'edit', label:'Rename group…', hint:'F2', run:\(\) => \{ close\(\); this\.setState\(\{ renameOpen:true, renameKey:'group:' \+ g\.id, renameValue:g\.name \}\); \} \}/u,
    'Rename group… no longer matches the expected wired command');
  assert.match(src, /\{ icon:'link_off', label:'Ungroup', hint:'', run:\(\) => \{ close\(\); this\.setState\(\{ groups:s\.groups\.filter\(x => x\.id !== g\.id\) \}\); this\.toast\('Group dissolved — tabs kept'\); \} \}/u,
    'Ungroup no longer matches the expected wired command');
});

test('pinning is real: pin/unpin, "Pin whole group", and "All unpinned" all mutate state.pinned', () => {
  const src = read(GENERATED);
  assert.match(src, /\{ icon:'push_pin', label:s\.pinned\.indexOf\(k\) >= 0 \? 'Unpin tab' : 'Pin tab',/u, 'the per-tab pin/unpin toggle no longer matches');
  assert.match(src, /\{ icon:'push_pin', label:'Pin whole group', run:\(\) => \{ close\(\); this\.set\('pinned', s\.pinned\.concat\(g\.tabs\)\); \} \}/u, '"Pin whole group" no longer matches');
});

test('the one existing filter is a bulk CLOSE action (three modes), not a find/reveal search', () => {
  const src = read(GENERATED);
  assert.match(src, /tabFilterTitle:s\.tabFilterMode === 'not' \? 'Close tabs NOT containing…' : \(s\.tabFilterMode === 'colour' \? 'Close tabs by colour' : 'Close tabs containing…'\),/u,
    'the tab filter titles no longer match the expected three close modes');
  assert.match(src, /applyTabFilter:\(\) => \{/u, 'applyTabFilter no longer exists');
  assert.doesNotMatch(src, /revealTab|focusTab|jumpToTab|findTab/iu,
    'a find/reveal-shaped tab action now exists -- the "close-only, no find" gap may have been closed');
});

test('there is no dedicated group-name search, in-group search, or master cross-window search', () => {
  const src = read(GENERATED);
  assert.doesNotMatch(src, /groupSearch|searchGroups|masterTabSearch|crossWindowSearch/iu,
    'a dedicated group-name, in-group, or master tab search now exists -- update this row');
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
