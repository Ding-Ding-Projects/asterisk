#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the two documentation completeness lists in
 * `site/tests/site.test.mjs`.
 *
 * Both were bare totals -- 78 articles, 196 published files -- and both had gone stale, so
 * both were red on master while the tree they describe was correct. A stale total is the
 * least useful shape a completeness check can take: it names no category and no directory,
 * and one item deleted while another is added cancels out and passes in silence. They are
 * hand-written per-category and per-directory maps now, and this proves the maps are load
 * bearing rather than decorative.
 *
 * What each case removes, one at a time:
 *   - an article deleted from a category, which the per-category map must name;
 *   - an article ADDED to a category, which a "greater than" style check would miss
 *     entirely and which is how the original total went stale in the first place;
 *   - the required sections removed from one article;
 *   - a changelog fragment's exemption abused -- its verification statement removed, and
 *     a name in the exemption list pointed at a file that is not there;
 *   - a published page removed from one output directory.
 *
 * Two disciplines every case rests on. Each asserts its own bytes actually changed or its
 * own file actually appeared, because an edit that never landed reads exactly like a guard
 * that held. And each is planted alone, because breaking several at once proves only that
 * SOMETHING among them is watched.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = resolve(consoleRoot, 'docs');
const SUITE = 'site/tests/site.test.mjs';

/** Runs the site suite and reports whether it went red. Never throws on a red run. */
function suiteIsRed() {
  try {
    execFileSync(process.execPath, [SUITE], { cwd: consoleRoot, stdio: 'pipe' });
    return false;
  } catch {
    return true;
  }
}

/* An article whose only job here is to be moved, added and edited. Chosen because it sits
 * in the smallest category, so a change to it is unambiguous in the failure message. */
const SAMPLE_ARTICLE = resolve(docsRoot, 'data/ami.md');
const PARKED_ARTICLE = resolve(docsRoot, 'data/.parked-for-negative-regression.md.bak');
const EXTRA_ARTICLE = resolve(docsRoot, 'data/negative-regression-extra-article.md');
const FRAGMENT = resolve(docsRoot, 'platform/changelog-dim-sum-runtime.md');
/* The only page under docs/features/navigation, and the only page in the whole corpus that
 * no other check in the site suite reaches. See the case that uses it. */
const ISOLATED_SOURCE_PAGE = resolve(docsRoot, 'features/navigation/tabs-search-palette-core.md');
const PARKED_SOURCE_PAGE = resolve(docsRoot, 'features/navigation/.parked-for-negative-regression.md.bak');

const CASES = [
  {
    id: 'article-deleted-from-a-category',
    why: 'the per-category article map must notice a category losing one',
    break() {
      renameSync(SAMPLE_ARTICLE, PARKED_ARTICLE);
      return !existsSync(SAMPLE_ARTICLE) && existsSync(PARKED_ARTICLE);
    },
    restore() { if (existsSync(PARKED_ARTICLE)) renameSync(PARKED_ARTICLE, SAMPLE_ARTICLE); },
  },
  {
    id: 'article-added-to-a-category',
    why: 'a total that only ever grew is how the original 78 went stale unnoticed',
    break() {
      writeFileSync(EXTRA_ARTICLE, '# Extra\n\n## Behavior\n\n## Configuration\n\n## Failure modes\n\n## Verification\n\n## Suggested articles\n');
      return existsSync(EXTRA_ARTICLE);
    },
    restore() { if (existsSync(EXTRA_ARTICLE)) rmSync(EXTRA_ARTICLE); },
  },
  {
    id: 'required-sections-removed-from-an-article',
    why: 'an article that stops meeting the documentation contract must be named',
    break() {
      snapshot(SAMPLE_ARTICLE);
      const before = readFileSync(SAMPLE_ARTICLE, 'utf8');
      const after = before.replace('## Configuration', '## Settings');
      if (after === before) return false;
      writeFileSync(SAMPLE_ARTICLE, after);
      return true;
    },
    restore() { restoreSnapshot(SAMPLE_ARTICLE); },
  },
  {
    id: 'changelog-fragment-drops-its-verification',
    why: 'a fragment is exempt from the article sections, never from stating what it verified',
    break() {
      snapshot(FRAGMENT);
      const before = readFileSync(FRAGMENT, 'utf8');
      const after = before.replace('Verification for this fragment:', 'Notes:');
      if (after === before) return false;
      writeFileSync(FRAGMENT, after);
      return true;
    },
    restore() { restoreSnapshot(FRAGMENT); },
  },
  {
    id: 'exemption-list-names-a-file-that-is-not-there',
    why: 'a name in the exemption list matching nothing turns an exemption into a hole',
    break() {
      renameSync(FRAGMENT, `${FRAGMENT}.bak`);
      return !existsSync(FRAGMENT);
    },
    restore() { if (existsSync(`${FRAGMENT}.bak`)) renameSync(`${FRAGMENT}.bak`, FRAGMENT); },
  },
  {
    /* The first version of this case deleted a file out of `site/dist` and stayed GREEN,
     * because the suite builds the site into a scratch directory and reads THAT manifest
     * -- so the committed `dist` it was vandalising is not what the assertion looks at.
     * The case had to break a SOURCE page instead, and the one chosen is the only page in
     * `docs/features/navigation`, which nothing else in the site suite mentions. That
     * isolation is the whole point: the per-category article map does not cover this
     * directory, and no link check reaches it, so the per-directory published map is the
     * only thing here that can notice it going missing. If this case ever passes for some
     * other reason, the assertion it is supposed to prove has stopped being load bearing. */
    id: 'published-page-removed-from-an-output-directory',
    why: 'the per-directory published map must notice an output directory losing its only page',
    break() {
      if (!existsSync(ISOLATED_SOURCE_PAGE)) return false;
      renameSync(ISOLATED_SOURCE_PAGE, PARKED_SOURCE_PAGE);
      return !existsSync(ISOLATED_SOURCE_PAGE);
    },
    restore() { if (existsSync(PARKED_SOURCE_PAGE)) renameSync(PARKED_SOURCE_PAGE, ISOLATED_SOURCE_PAGE); },
  },
];

/**
 * Restores a file from bytes captured before the break, never from git.
 *
 * `git checkout -- <path>` restores the COMMITTED copy, which is the wrong copy whenever
 * the file has uncommitted edits -- and in the pass that wrote this script, two of the
 * files these cases touch did. The first run of this script therefore silently reverted a
 * paragraph that had just been written, and the only thing that noticed was the
 * final-restore check at the bottom, which found the suite still red after every case had
 * reported ok. Capturing the bytes first cannot make that mistake.
 */
const snapshots = new Map();
function snapshot(absolutePath) {
  snapshots.set(absolutePath, readFileSync(absolutePath, 'utf8'));
}
function restoreSnapshot(absolutePath) {
  const bytes = snapshots.get(absolutePath);
  if (bytes !== undefined) writeFileSync(absolutePath, bytes);
}

let failedCases = 0;

if (suiteIsRed()) {
  console.error('FAILED CASE baseline: the site suite is already red before any break was planted');
  process.exit(1);
}
console.log('baseline: the site suite is GREEN on the untouched tree');

for (const testCase of CASES) {
  let landed = false;
  try {
    landed = testCase.break();
  } catch (error) {
    console.error(`FAILED CASE ${testCase.id}: planting threw -- ${error.message}`);
    testCase.restore();
    failedCases += 1;
    continue;
  }
  if (!landed) {
    console.error(`FAILED CASE ${testCase.id}: the break changed nothing, so a pass here would mean nothing`);
    testCase.restore();
    failedCases += 1;
    continue;
  }
  const red = suiteIsRed();
  testCase.restore();
  if (!red) {
    console.error(`FAILED CASE ${testCase.id}: the suite stayed GREEN -- ${testCase.why}`);
    failedCases += 1;
    continue;
  }
  console.log(`ok ${testCase.id}: RED when broken, and restored`);
}

if (suiteIsRed()) {
  console.error('FAILED CASE restore: the site suite did not return to GREEN on the restored tree');
  failedCases += 1;
}

if (failedCases > 0) {
  console.error(`FAIL: ${failedCases} of ${CASES.length} planted breaks did not behave`);
  process.exit(1);
}
console.log(`PASS: ${CASES.length} planted breaks, each alone, each RED, and GREEN again on restore`);
