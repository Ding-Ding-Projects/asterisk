/**
 * Contract: a row claiming a feature is absent is claiming something checkable.
 *
 * This exists because the registry was wrong in the expensive direction. `local-version-
 * history` was recorded absent with a note reading "backend plumbing with no reachable
 * UI" -- accurate when written, and stale by the time it mattered. Git-backed history,
 * secret redaction, `history.list` and `history.restore` dispatch actions and live
 * renderer calls were all in place. I read the row, believed it, and started designing a
 * replacement for a feature that already worked.
 *
 * The blocker guard beside this one catches the opposite mistake: a row explaining why
 * something is not done after it has been done. This catches a row asserting nothing
 * exists while the code sits in the tree.
 *
 * It deliberately does not try to judge whether a feature is COMPLETE -- that is what the
 * partial state is for. It only refuses the strongest claim, that there is nothing there.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = JSON.parse(readFileSync(resolve(root, 'app/feature-registry.json'), 'utf8'));

/** Every source file the console ships, so a search cannot miss a directory. */
const sources = (() => {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'generated' || entry === 'dist-electron') continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (/\.(ts|tsx|mjs)$/u.test(entry)) found.push(path);
    }
  };
  for (const dir of ['app/renderer/src', 'control-plane', 'app/electron']) walk(resolve(root, dir));
  return found.map((path) => readFileSync(path, 'utf8'));
})();

/**
 * Terms that would show a feature exists, per absent row.
 *
 * Hand-written rather than derived from the feature id: an id like `status-hub` appears
 * nowhere in source, and a rule guessing at identifiers would either miss everything or
 * match everything. Every entry here names something that only exists if the feature does.
 */
const EVIDENCE_OF_EXISTENCE = {
  'local-file-converter': ['convertFile', 'fileConverter'],
  'ollama-suite-manager': ['ollama'],
  'browser-extension-download-surfaces': ['downloadCapture', 'browserExtension'],
};

test('the scan found the sources, so these assertions are not vacuous', () => {
  assert.ok(sources.length > 40, `only ${sources.length} source files were scanned`);
});

test('every absent row has an evidence list, so none is exempt by omission', () => {
  /* A rule alone would pass on a row nobody listed. */
  for (const [id, row] of Object.entries(registry.features)) {
    if (row.state !== 'absent') continue;
    assert.ok(EVIDENCE_OF_EXISTENCE[id] !== undefined,
      `${id} is recorded absent and this check does not know how to verify that -- add its evidence terms`);
  }
});

test('nothing recorded absent is actually present in the source tree', () => {
  /* The mistake this exists for, in one assertion. */
  for (const [id, row] of Object.entries(registry.features)) {
    if (row.state !== 'absent') continue;
    for (const term of EVIDENCE_OF_EXISTENCE[id]) {
      const found = sources.some((source) => source.includes(term));
      assert.ok(!found,
        `${id} is recorded absent, but "${term}" is in the source -- the row is stale, and somebody reading it will build a replacement for something that already works`);
    }
  }
});

test('an evidence list is never empty, which would exempt a row silently', () => {
  for (const [id, terms] of Object.entries(EVIDENCE_OF_EXISTENCE)) {
    assert.ok(Array.isArray(terms) && terms.length > 0, `${id} has an empty evidence list`);
  }
});

test('the evidence list does not cover rows that are no longer absent', () => {
  /* Kept honest in the other direction: a term list for a shipped feature would fail the
   * moment it shipped, so removing the row from here is part of shipping it. */
  for (const id of Object.keys(EVIDENCE_OF_EXISTENCE)) {
    assert.equal(registry.features[id]?.state, 'absent',
      `${id} is listed here but is recorded as "${registry.features[id]?.state}" -- remove it from the evidence list`);
  }
});
