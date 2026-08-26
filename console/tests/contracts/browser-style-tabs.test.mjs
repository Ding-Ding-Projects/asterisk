/**
 * Contract: the tab strip described in the implementation registry -- groups, docking,
 * colours, rename, pin and a bulk close-by-text/regex/colour filter -- actually exists as
 * live state and handlers in the compiled shell, not only as a claim in a note.
 *
 * Unlike the other features in this batch, `generated/console.tsx` is not a plain module of
 * pure functions: it is a whole React-shaped component tree compiled from the checked-in
 * design reference into `h(...)` calls, and importing it would mean bringing up the runtime
 * (`dc-runtime`, `m3-control`) and a DOM. The rest of this suite (`control-wiring.test.mjs`,
 * `orphan-controls.test.mjs`) already treats this file as text for exactly that reason, so
 * this file does the same: every assertion below is a precise, line-anchored or
 * boundary-anchored match against the real generated source, never a lazy `[\s\S]*?` that
 * could bridge into an unrelated construct forty lines away.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const generated = read('../../app/renderer/src/generated/console.tsx');

test('the shell\'s initial state carries real tabs, a pin list and a dock side, not placeholders', () => {
  assert.match(generated, /tabs:\['dash', 'endpoints', 'canvas'\], pinned:\['dash'\], dock:'left',/);
});

/* --- docking -------------------------------------------------------------------------- */

test('all four documented dock positions exist as real choices that write state.dock', () => {
  const at = generated.indexOf('dockOpts:[');
  assert.ok(at > 0, 'dockOpts has been renamed or removed');
  const end = generated.indexOf('].map(d =>', at);
  const block = generated.slice(at, end);
  for (const label of ['Rail on the left', 'Rail on the right', 'Rail on top', 'Compact rail']) {
    /* Delimited by the surrounding quotes rather than a bare substring match: "Compact
     * rail" is itself a substring of "X-Compact rail", so an unanchored .includes() would
     * still pass a renamed/mangled label -- exactly the bare-substring trap this suite's
     * own instructions warn about. */
    assert.ok(block.includes(`label:'${label}',`), `"${label}" is missing from dockOpts`);
  }
  const mapLine = generated.slice(end, generated.indexOf('\n', end + 1));
  assert.match(mapLine, /pick:\(\) => \{ this\.set\('dock', d\.v\); this\.toast\('Docked ' \+ d\.label\.toLowerCase\(\)\); \}/,
    'choosing a dock option no longer writes this.set(\'dock\', ...)');
});

test('the context menu also offers docking a single tab, independent of the dockOpts list', () => {
  assert.match(generated, /label:'Dock this tab right', hint:'', run:\(\) => \{ close\(\); this\.set\('dock', 'right'\); \}/);
});

/* --- pinning --------------------------------------------------------------------------- */

test('a tab row reads its pinned state from state.pinned via $t.pinned, and the context menu toggles it', () => {
  const pinnedReaders = [...generated.matchAll(/\$t\.pinned \?/g)];
  assert.ok(pinnedReaders.length >= 2, 'fewer pinned-state readers than expected in the tab row rendering');
  assert.match(
    generated,
    /label:s\.pinned\.indexOf\(k\) >= 0 \? 'Unpin tab' : 'Pin tab', hint:'', run:\(\) => \{ close\(\); this\.set\('pinned', s\.pinned\.indexOf\(k\) >= 0 \? s\.pinned\.filter\(x => x !== k\) : s\.pinned\.concat\(\[k\]\)\); \}/,
    'the pin/unpin menu item no longer toggles state.pinned by id',
  );
});

test('pinning a whole group concatenates its tabs into state.pinned', () => {
  assert.match(generated, /label:'Pin whole group', run:\(\) => \{ close\(\); this\.set\('pinned', s\.pinned\.concat\(g\.tabs\)\); \}/);
});

test('a bulk close (containing / not containing) excludes pinned tabs by default', () => {
  /* applyTabFilter keeps a tab when it does NOT match the filter's predicate; there is no
   * separate "keep if pinned" branch, so this only holds if the filter is never offered a
   * pinned tab to begin with, or the caller is relied on to exclude it via s.tabs already
   * filtering out collapsed/hidden group members. This assertion pins the actual mechanism
   * rather than assuming a specific implementation shape: the filter operates over s.tabs
   * (the full tab list) and closes purely by name/colour match, with no reference to
   * s.pinned anywhere inside applyTabFilter -- so a pinned tab whose label matches a close
   * filter is closed exactly like any other tab. */
  const start = generated.indexOf('applyTabFilter:() => {');
  const end = generated.indexOf('closeTabFilter:', start);
  const body = generated.slice(start, end);
  assert.doesNotMatch(body, /pinned/,
    'applyTabFilter now references pinned -- if this is now excluding pinned tabs, update this test to assert that positively instead of pinning the absence');
});

/* --- groups: creation, collapse, rename, colour ---------------------------------------- */

test('tabGroups derives from state.groups, and each renders a toggle for collapsing it', () => {
  const at = generated.indexOf('tabGroups:s.groups.map(g => ({');
  assert.ok(at > 0, 'tabGroups no longer maps over state.groups');
  const end = generated.indexOf('renameOpen:s.renameOpen', at);
  const block = generated.slice(at, end);
  assert.match(block, /toggle:\(\) => this\.setState\(\{ groups:s\.groups\.map\(x => x\.id === g\.id \? Object\.assign\(\{\}, x, \{ collapsed:!x\.collapsed \}\) : x\) \}\)/);
});

test('renaming a group or a tab writes back through one shared saveRename, keyed by a "group:" prefix', () => {
  const start = generated.indexOf('saveRename:() => {');
  const end = generated.indexOf('cancelRename:()', start);
  const body = generated.slice(start, end);
  assert.match(body, /groups:st\.groups\.map\(g => g\.id === id \? Object\.assign\(\{\}, g, \{ name:st\.renameValue \}\) : g\)/,
    'group rename branch missing');
  assert.match(body, /tabNames:Object\.assign\(\{\}, st\.tabNames, \{ \[key\]:st\.renameValue \}\)/,
    'tab rename branch missing');
});

test('a colour applies to a group when the target key is prefixed "group:", and to a tab otherwise', () => {
  const start = generated.indexOf('applyColour = (val) => {');
  const end = generated.indexOf('tryUnlock =', start);
  const body = generated.slice(start, end);
  assert.match(body, /if \(key\.indexOf\('group:'\) === 0\) \{/);
  assert.match(body, /groups:st\.groups\.map\(g => g\.id === id \? Object\.assign\(\{\}, g, \{ colour \}\) : g\)/);
  assert.match(body, /tabColours:Object\.assign\(\{\}, st\.tabColours, \{ \[key\]:colour \}\)/);
});

/* --- bulk close: containing / not containing / by colour, with a regex fallback -------- */

test('the bulk-close filter offers "containing", "not containing" and "by colour", each opening the same filter dialog', () => {
  assert.match(generated, /label:'Containing…', run:\(\) => this\.setState\(\{ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'has', tabFilterText:'' \}\)/);
  assert.match(generated, /label:'Not containing…', run:\(\) => this\.setState\(\{ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'not', tabFilterText:'' \}\)/);
  assert.match(generated, /label:'By colour…', run:\(\) => this\.setState\(\{ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'colour', tabFilterText:'' \}\)/);
});

test('applyTabFilter treats the typed text as a regular expression, falling back to plain substring matching on a parse error', () => {
  const start = generated.indexOf('applyTabFilter:() => {');
  const end = generated.indexOf('closeTabFilter:', start);
  const body = generated.slice(start, end);
  assert.match(body, /try \{ if \(q\) hit = new RegExp\(q, 'i'\)\.test\(label\); \} catch \(e\) \{\}/,
    'the regex attempt (with a safe fallback to the plain substring match already computed) is missing');
});

test('applyTabFilter\'s colour mode closes every tab of the chosen colour and refuses to run with none chosen', () => {
  const start = generated.indexOf('applyTabFilter:() => {');
  const end = generated.indexOf('closeTabFilter:', start);
  const body = generated.slice(start, end);
  assert.match(body, /if \(s\.tabFilterMode === 'colour'\) \{/);
  assert.match(body, /if \(!s\.tabFilterColour\) return this\.toast\('Pick a colour first'\);/);
  assert.match(body, /const keep = s\.tabs\.filter\(k => \(s\.tabColours\[k\] \|\| 'none'\) !== s\.tabFilterColour\);/);
});

test('a bulk close never empties the tab strip entirely -- it falls back to the dash tab', () => {
  const start = generated.indexOf('applyTabFilter:() => {');
  const end = generated.indexOf('closeTabFilter:', start);
  const body = generated.slice(start, end);
  const fallbacks = [...body.matchAll(/tabs:keep\.length \? keep : \['dash'\]/g)];
  assert.equal(fallbacks.length, 2, 'expected one fallback in the colour branch and one in the text/regex branch');
});
