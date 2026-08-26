import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

// This checkout is CRLF (Windows core.autocrlf). A line-anchored regex written against
// "\n" alone silently matches nothing on "\r\n" -- and a check that silently matches
// nothing still exits green, which is worse than a check that never existed. Normalise
// once, here, before any pattern below ever sees the text.
async function readNormalised(path) {
  const text = await readFile(new URL(path, root), 'utf8');
  return text.replace(/\r\n/g, '\n');
}

/**
 * Finds every top-level `@media (...) { ... }` block in `css` and returns its raw
 * condition text plus its body. Brace-depth counting rather than a lazy `[\s\S]*?`
 * bridge: a non-greedy "any character" span happily crosses a rule's own closing
 * brace and keeps matching into the next block, which is exactly the failure mode
 * that has made guards in this repository pass while proving nothing (see the
 * house-style warnings against `[\s\S]*?` bridging two tokens). Anchored to the
 * start of a line (`^\s*@media`) rather than a bare substring, so a commented-out
 * `@media` could never satisfy this the way a substring match could.
 */
function findMediaBlocks(css) {
  const blocks = [];
  const opener = /^[ \t]*@media\s*\(([^)]*)\)\s*\{/gm;
  let match;
  while ((match = opener.exec(css))) {
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    assert.ok(depth === 0, `unterminated @media block starting at offset ${match.index}`);
    blocks.push({ condition: match[1].trim(), body: css.slice(bodyStart, i - 1) });
  }
  return blocks;
}

function validateResponsiveCss(rawCss) {
  // Strip real CSS comments before anything else matches. `[\s\S]*?` bridging a `/*`
  // to the next `*/` is the one place a lazy any-character span is actually correct
  // (comments are a bounded, non-nesting delimiter pair, not two unrelated tokens) --
  // and without this step every check below is a plain substring/pattern match that a
  // commented-out rule satisfies exactly as well as a live one.
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const mediaBlocks = findMediaBlocks(css);
  // Guard the derived list itself before anything iterates or filters it -- an
  // accidentally-empty list here would make every assertion below vacuously pass
  // (an `it.each`/`.find` over `[]` reports nothing wrong because it never looked).
  assert.ok(
    mediaBlocks.length >= 3,
    `expected at least 3 @media blocks (reduced-motion + two width breakpoints), found ${mediaBlocks.length}`,
  );

  const widthBlocks = mediaBlocks.filter(b => /max-width/.test(b.condition));
  assert.ok(
    widthBlocks.length >= 2,
    `expected at least 2 real max-width breakpoints (a screen mechanism), found ${widthBlocks.length} -- ` +
      'a per-control variant such as a segmented picker does not count',
  );

  // The two tiers this file actually ships, present as their own genuine width
  // conditions -- not merely mentioned in a comment, which `condition` (parsed only
  // from the real `@media (...)` clause, never from body text) cannot be fooled by.
  assert.ok(widthBlocks.some(b => /max-width:\s*1200px/.test(b.condition)), 'missing the 1200px tier');
  assert.ok(widthBlocks.some(b => /max-width:\s*1000px/.test(b.condition)), 'missing the 1000px tier');

  const narrowTier = widthBlocks.find(b => /max-width:\s*1000px/.test(b.condition));
  assert.ok(narrowTier, 'the 1000px tier must exist before its body can be checked');

  // The two structural shell columns actually narrow, at the correct real DOM
  // serialisation (a space after the colon -- see the file's own comment on why the
  // no-space spelling matches nothing). Anchored to the exact selector text rather
  // than a loose substring, so a renamed or commented-out rule cannot satisfy this.
  assert.match(
    narrowTier.body,
    /\[style\*="width: 88px; flex: 0 0 88px;"\]\s*\{[^}]*flex:\s*0 0 72px\s*!important/,
    'the icon rail must narrow inside the 1000px tier',
  );
  assert.match(
    narrowTier.body,
    /\[style\*="width: 268px; flex: 0 0 268px;"\]\s*\{[^}]*flex:\s*0 0 176px\s*!important/,
    'the section list must narrow inside the 1000px tier',
  );

  // Every multi-column grid collapses to a single flexed column once neither of the
  // two structural columns above has anywhere left to borrow room from.
  assert.match(
    narrowTier.body,
    /\[style\*="display: grid"\]\s*\{[^}]*display:\s*flex\s*!important[^}]*flex-direction:\s*column\s*!important/,
    'grids must collapse to a single column inside the 1000px tier',
  );

  // The min-width:0 restoration sits outside every @media block -- it is a baseline
  // correctness fix (it only ever activates when a row is genuinely short of room),
  // not something gated to a narrow window.
  const withoutMediaBodies = mediaBlocks.reduce((text, b) => text.replace(b.body, ''), css);
  assert.match(
    withoutMediaBodies,
    /\[style\*="display: flex"\]\s*>\s*\*,\s*\n\[style\*="display: grid"\]\s*>\s*\*\s*\{\s*\n\s*min-width:\s*0;/,
    'the flex/grid child min-width:0 restoration must exist unconditionally, outside every @media block',
  );

  // The pre-existing reduced-motion rule (a user preference, not a screen size) must
  // still be present and untouched by this work.
  assert.ok(
    mediaBlocks.some(b => /prefers-reduced-motion:\s*reduce/.test(b.condition)),
    'the existing prefers-reduced-motion rule must not have been removed',
  );
}

test('the desktop shell has real width breakpoints, not only a per-control variant', async () => {
  validateResponsiveCss(await readNormalised('app/renderer/src/styles.css'));
});

test('negative regression: removing the narrow-tier rail selector turns the check red', async () => {
  const css = await readNormalised('app/renderer/src/styles.css');
  const broken = css.replace('[style*="width: 88px; flex: 0 0 88px;"]', '[style*="width: 88px; flex: 0 0 88pxX;"]');
  assert.throws(() => validateResponsiveCss(broken));
});

test('negative regression: commenting out the min-width:0 restoration turns the check red', async () => {
  const css = await readNormalised('app/renderer/src/styles.css');
  const broken = css.replace(
    '[style*="display: flex"] > *,\n[style*="display: grid"] > * {\n  min-width: 0;\n}',
    '/* [style*="display: flex"] > *,\n[style*="display: grid"] > * {\n  min-width: 0;\n} */',
  );
  assert.notEqual(broken, css, 'the fixture text to comment out must actually be present in the real file');
  assert.throws(() => validateResponsiveCss(broken));
});

test('negative regression: a max-width breakpoint with no real width condition turns the check red', async () => {
  const css = await readNormalised('app/renderer/src/styles.css');
  const broken = css.replace(/@media \(max-width: 1000px\)/, '@media (max-width: 999999px)');
  assert.throws(() => validateResponsiveCss(broken));
});

test('design-styles.css itself still has zero @media rules -- the compiled design was never the responsive layer', async () => {
  const generated = await readNormalised('app/renderer/src/generated/design-styles.css');
  assert.equal(findMediaBlocks(generated).length, 0);
});
