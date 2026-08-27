import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const consoleRoot = new URL('../../', import.meta.url);
const generated = new URL('app/renderer/src/generated/', consoleRoot);
const compiler = fileURLToPath(new URL('scripts/compile-design.mjs', consoleRoot));
const pbxExtension = fileURLToPath(new URL('scripts/extend-pbx-m3.mjs', consoleRoot));

const snapshot = async (dir = generated) => {
  const names = (await readdir(dir)).sort();
  const files = await Promise.all(names.map((name) => readFile(new URL(name, dir), 'utf8')));
  return Object.fromEntries(names.map((name, index) => [name, files[index]]));
};

/**
 * The shipped interface must be exactly what the design reference plus the checked-in
 * PBX M3 extension compile to. If anyone hand-edits generated output, edits the design
 * without recompiling, or changes the extension without regenerating, this fails.
 */
test('the shipped renderer is byte-identical to a fresh compile of the design reference and PBX M3 extension', async () => {
  const before = await snapshot();
  assert.ok(Object.keys(before).length > 0, 'no compiled design output is checked in');

  /* Into a scratch directory, never over the shipped files. Recompiling in place proved the
   * same thing and did it by writing the very files the other test files are reading at that
   * moment -- the runner runs them concurrently, so a sibling could read a half-written
   * console.tsx and fail with an empty parse. That reads exactly like a real regression in
   * whatever was changed last, which is the most expensive kind of false alarm there is. */
  const scratch = await mkdtemp(join(tmpdir(), 'ding-design-drift-'));
  try {
    execFileSync(process.execPath, [compiler], { stdio: 'pipe', env: { ...process.env, DING_DESIGN_OUT_DIR: scratch } });
    execFileSync(process.execPath, [pbxExtension], { stdio: 'pipe', env: { ...process.env, DING_DESIGN_OUT_DIR: scratch } });
    await compare(before, await snapshot(pathToFileURL(scratch + '/')));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

async function compare(before, after) {
  /* Only what the compile actually emits. The shipped directory also holds files put there
   * by other steps -- the docs and changelog bundles, a .gitattributes -- and a scratch
   * compile legitimately contains none of them, so comparing whole directory listings would
   * fail for a reason that has nothing to do with drift. */
  assert.ok(Object.keys(after).length >= 4, `the compile emitted only ${Object.keys(after).length} files`);
  for (const name of Object.keys(after)) {
    assert.ok(name in before, `${name} was compiled but is not checked in`);
  }
  for (const name of Object.keys(after)) {
    assert.equal(after[name], before[name], `${name} drifted from the reproducible design-system compile`);
  }
}

/**
 * The independently audited design carries 267 declarative bindings — 265 plus the two
 * added for the `file` control kind's own picker. The generated PBX editable-text M3
 * extension adds one real input with both onChange and onInput. The three frameless
 * window controls remain the only runtime window bindings outside that source material.
 * The `docs` destination (offline documentation browser) adds 6 onClick bindings
 * (search field regex toggle, regex palette tokens, per-result select, per-block link
 * spans in both paragraph and list-item form, suggested-article select) and 1 onChange
 * binding (the search field itself).
 * The accessibility pass adds 7 onKeyDown bindings, none of them wrapped in `fn(...)`
 * -- `onKeyDown` is not in the compiler's EVENTS set (scripts/compile-design.mjs), so
 * it is emitted as a raw prop and counted separately below rather than by the `fn(`
 * regex, which would silently report zero for every one of them. They are: the tab
 * strip's tablist wrapper (arrow/Home/End roving focus across the open-tab role="tab"
 * destinations); the tab-group header's role="button" toggle (Enter/Space activation,
 * since it is a div rather than a native button); the version-history commit-row
 * role="button" (Enter/Space activation); the docs-browser search-result row and
 * suggested-article row role="button"s (Enter/Space activation); and the docs article's
 * inline link span in both its paragraph and list-item rendering (Enter/Space
 * activation) -- each of those five reuses the same `activateOnEnter` helper in
 * App.tsx rather than a bespoke handler.
 * The tab-search extension adds eight reachable clicks: three discovery triggers, the
 * dismiss surface, scope selection, regex toggle, regex-builder launch, and result
 * activation. Its filter adds one change/input pair. Those fixed contributions are
 * enumerated below so the expected census remains hand-written rather than inferred.
 */
const AUDITED_BINDING_COUNTS = Object.freeze({
  // The raw compiler emits 227/15/10 for click/change/input. The fixed additions
  // below are individually audited extension contracts, never derived at runtime.
  onClick: 212 + 3 + 1 + 6 + 5 + 8,
  onChange: 10 + 1 + 1 + 1 + 3 + 1,
  onInput: 10 + 1 + 1,
  onContextMenu: 9,
  onDragStart: 4,
  onDragOver: 4,
  onDrop: 4,
  onDragEnd: 4,
  onMouseDown: 5,
  onMouseEnter: 1,
  onMouseLeave: 1,
  onMouseUp: 1,
  onKeyDown: 7,
});

function auditedBindingCounts(joined) {
  const counts = {};
  for (const [, event] of joined.matchAll(/\b(on[A-Z][A-Za-z]*): fn\(/gu)) {
    counts[event] = (counts[event] ?? 0) + 1;
  }
  counts.onKeyDown = (joined.match(/\bonKeyDown: /gu) ?? []).length;
  return counts;
}

function assertAuditedBindingCounts(joined) {
  assert.deepEqual(auditedBindingCounts(joined), AUDITED_BINDING_COUNTS);
}

test('the compiled renderer reproduces every audited design binding plus sanctioned extension controls', async () => {
  const sources = await Promise.all(
    ['console.tsx', 'm3-control.tsx'].map((name) => readFile(new URL(name, generated), 'utf8')),
  );
  const joined = sources.join('\n');
  assertAuditedBindingCounts(joined);

  /* Exact-source negative proof: losing the reachable tab-search dismiss handler
   * must make the count Chut red, then the original source restores it green. */
  const broken = joined.replace('onClick: fn(v.closeTabSearch)', 'onClick: removed(v.closeTabSearch)');
  assert.notEqual(broken, joined, 'the deliberate tab-search dismissal break did not land');
  assert.throws(() => assertAuditedBindingCounts(broken));
  assertAuditedBindingCounts(joined);

  const windowControls = sources[0].match(/"data-window-button": ``/gu) ?? [];
  assert.equal(windowControls.length, 3, 'the frameless window controls were not wired');
});

test('the generated renderer declares the design reference as its source and the compiler as generator', async () => {
  const manifest = JSON.parse(await readFile(new URL('design-manifest.json', generated), 'utf8'));
  assert.deepEqual(manifest.sources, ['design/Asterisk Console M3.dc.html', 'design/M3 Control.dc.html']);
  assert.match(manifest.generatedBy, /compile-design\.mjs$/u);
});
