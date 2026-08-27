import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = new URL('../../', import.meta.url);
const shipped = new URL('app/renderer/src/generated/docs-bundle.ts', consoleRoot);
const generator = fileURLToPath(new URL('scripts/bundle-docs.mjs', consoleRoot));

/**
 * The offline documentation browser reads a bundle that is committed, not built on demand, so a
 * reader browsing the checked-in tree sees exactly what is in that file and nothing else.
 *
 * This is the guard that was missing when two articles went missing. `npm run build` regenerates
 * the bundle, so a stale committed copy never reaches a release -- but it does reach every reader
 * of the repository, every reviewer reading the diff, and every test that imports DOCS_BUNDLE
 * directly. A merge that brings a new article in on one side and a bundle regenerated without it
 * on the other produces exactly that, silently, because the merge itself has no conflict to
 * report.
 *
 * The check generates into a scratch file rather than over the shipped one. Regenerating in place
 * and then reading the result back compares a file with itself and can only ever pass.
 */
test('the committed documentation bundle is byte-identical to a fresh generation from docs/', async () => {
  const before = await readFile(shipped, 'utf8');
  assert.ok(before.length > 0, 'no documentation bundle is checked in');

  const scratch = await mkdtemp(join(tmpdir(), 'ding-docs-drift-'));
  try {
    const scratchFile = join(scratch, 'docs-bundle.ts');
    execFileSync(process.execPath, [generator], {
      stdio: 'pipe',
      env: { ...process.env, DING_DOCS_OUT_FILE: scratchFile },
    });
    const after = await readFile(scratchFile, 'utf8');

    /* Report the count difference first when there is one. "44 lines differ" says nothing about
     * what is wrong; "the tree has 90 articles and the committed bundle has 88" names it. */
    const countOf = (source) => Number(source.match(/"articleCount":\s*(\d+)/u)?.[1] ?? -1);
    assert.equal(
      countOf(before),
      countOf(after),
      `the committed bundle carries ${countOf(before)} article(s) but docs/ generates ${countOf(after)}. ` +
        'Run `node scripts/bundle-docs.mjs` and commit the result.',
    );

    assert.equal(
      before,
      after,
      'the committed documentation bundle drifted from docs/. Run `node scripts/bundle-docs.mjs` and commit the result.',
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

/**
 * Generating into a scratch path must not touch the shipped bundle. If DING_DOCS_OUT_FILE were
 * ignored, the check above would still pass -- it would simply be comparing the file it had just
 * overwritten against itself, which is precisely the vacuous shape it replaced.
 */
test('generating into a scratch path leaves the shipped bundle untouched', async () => {
  const before = await readFile(shipped, 'utf8');

  const scratch = await mkdtemp(join(tmpdir(), 'ding-docs-redirect-'));
  try {
    const scratchFile = join(scratch, 'elsewhere.ts');
    execFileSync(process.execPath, [generator], {
      stdio: 'pipe',
      env: { ...process.env, DING_DOCS_OUT_FILE: scratchFile },
    });

    const written = await readFile(scratchFile, 'utf8');
    assert.match(written, /export const DOCS_BUNDLE/u, 'the redirected generation wrote no bundle');
    assert.equal(await readFile(shipped, 'utf8'), before, 'the shipped bundle was written to anyway');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
