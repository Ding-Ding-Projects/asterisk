/**
 * The command palette's own CSS.
 *
 * Everything else about the palette -- its list, its search, its keyboard -- is pure
 * logic and lives in command-palette.ts, covered in tests/ui/command-palette.test.tsx.
 * This file covers the one part that is not logic: App.tsx's hand-written markup for
 * `.palette-scrim` / `.palette-card` / its rows had NO rule anywhere in the stylesheet.
 * Measured live in the built app, the scrim rendered `position:static;
 * background:rgba(0,0,0,0)` and the card rendered `background:rgba(0,0,0,0)` with no
 * border, no radius and no padding -- a bare input followed by a few hundred default
 * buttons in normal document flow, pushing the rest of the page off-screen. Results also
 * read as `DashboardDestination`: two correct, unstyled sibling spans with nothing
 * between them.
 *
 * These tests read the real files -- App.tsx and styles.css, not a restated copy of
 * either -- and parse the stylesheet with a real brace-depth walk rather than a regex
 * that could cross a closing brace into an unrelated rule (see the CSS-comment and
 * lazy-`[\s\S]*?` traps this house's own instructions warn about).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const app = read('app/renderer/src/App.tsx');
const css = read('app/renderer/src/styles.css');
const generated = read('app/renderer/src/generated/console.tsx');

/* --- a real CSS parser: brace-depth, not a lazy regex that can cross a closing brace --- */

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Walks the stylesheet char by char and returns every rule as `{ selectors, declarations }`,
 * including rules nested inside an at-rule (so a future `@media` block is still covered).
 * Comments are stripped first, so a commented-out rule contributes nothing -- the guard
 * quality this suite depends on: a rule that is present only inside `/* ... *\/` must be
 * treated exactly like a rule that was never written.
 */
function collectRules(text) {
  const rules = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const braceAt = text.indexOf('{', i);
    if (braceAt === -1) break;
    const prelude = text.slice(i, braceAt).trim();
    let depth = 1;
    let j = braceAt + 1;
    while (j < n && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    const body = text.slice(braceAt + 1, j - 1);
    if (prelude.startsWith('@')) {
      rules.push(...collectRules(body));
    } else if (prelude !== '') {
      rules.push({ selectors: prelude, declarations: body });
    }
    i = j;
  }
  return rules;
}

/**
 * The class names a selector list actually TARGETS -- the last compound token of each
 * comma-separated segment, after descendant/child/sibling combinators are stripped.
 * `.palette-row-on .palette-context` targets `palette-context`, never `palette-row-on`
 * (an ancestor qualifier is not a rule for the ancestor's own class); `.a, .a:hover`
 * targets `a` from both segments. This is the exact discipline the house rules require
 * of a completeness guard: a descendant rule must never satisfy an existence check for
 * the ancestor it merely scopes.
 */
function targetClassesOf(selectorList) {
  const targets = new Set();
  for (const rawSegment of selectorList.split(',')) {
    const segment = rawSegment.trim();
    if (segment === '') continue;
    const tokens = segment.split(/\s+/).filter((t) => t !== '' && t !== '>' && t !== '+' && t !== '~');
    const last = tokens[tokens.length - 1] ?? '';
    for (const m of last.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)) targets.add(m[1]);
  }
  return targets;
}

/** A value that is technically present but paints nothing -- one shared list, so a fix
 *  to it (or an omission from it) cannot silently differ between the tests that use it. */
const UNPAINTED = ['', 'none', 'transparent', 'inherit', 'initial', 'unset', 'rgba(0,0,0,0)', 'rgba(0, 0, 0, 0)'];
const isPainted = (value) => value !== undefined && !UNPAINTED.includes(value.trim().toLowerCase());

function coveredClasses(cssText) {
  const covered = new Set();
  for (const rule of collectRules(stripComments(cssText))) {
    for (const c of targetClassesOf(rule.selectors)) covered.add(c);
  }
  return covered;
}

/** The declaration body of the first rule whose selector list is exactly `selector` (no combinator, no compounding). */
function declarationsFor(cssText, selector) {
  for (const rule of collectRules(stripComments(cssText))) {
    const segments = rule.selectors.split(',').map((s) => s.trim());
    if (segments.includes(selector)) return rule.declarations;
  }
  return undefined;
}

/**
 * Every declaration body from a rule whose selector list DIRECTLY TARGETS `className`
 * (per targetClassesOf -- so a descendant rule that merely scopes by this class, like
 * `.palette-row-on .palette-context`, is correctly excluded), joined together. Used
 * instead of a hand-typed selector string so this file is never sensitive to exactly how
 * a multi-selector rule happens to be wrapped across lines.
 */
function declarationsTargeting(cssText, className) {
  const bodies = [];
  for (const rule of collectRules(stripComments(cssText))) {
    if (targetClassesOf(rule.selectors).has(className)) bodies.push(rule.declarations);
  }
  return bodies.length > 0 ? bodies.join('\n') : undefined;
}

/* --- every class App.tsx's hand-written renderer asks for, derived rather than restated --- */

/**
 * Every kebab-case token inside a `className:` value in App.tsx. Kebab-case only (at least
 * one hyphen) deliberately excludes bare JS identifiers picked up by a cruder scan --
 * `index`, `this`, `paletteRow` are all lowercase-letters-only or mixed-case and contain
 * no hyphen, so `/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/` cannot match them, while
 * `palette-row`, `palette-row-on` and `app-root` all do.
 */
function handWrittenClasses(appSource) {
  const found = new Set();
  for (const attr of appSource.matchAll(/\bclassName:\s*(`[^`]*`|'[^']*'|"[^"]*")/g)) {
    for (const token of attr[1].matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g)) found.add(token[0]);
  }
  return found;
}

test('the class scan itself finds something -- an empty result would make every other test in this file pass for nothing', () => {
  const used = handWrittenClasses(app);
  assert.ok(used.size > 0, 'handWrittenClasses() found no class tokens in App.tsx; the scan is broken');
  assert.ok(used.has('palette-scrim') && used.has('app-root'), 'the scan missed classes known to be there');
});

test('no direct React class prop survives in handwritten App.tsx', () => {
  assert.doesNotMatch(app, /\{[^{}]*\bclass\s*:/,
    'React DOM ignores `class`; handwritten App.tsx must use className exactly');
});

test('negative regression: one direct React class prop crosses the exact source boundary', () => {
  const withBrokenProp = app.replace("className: 'palette-scrim'", "class: 'palette-scrim'");
  assert.notEqual(withBrokenProp, app, 'the deliberate direct-prop mutation did not land');
  assert.match(withBrokenProp, /\{[^{}]*\bclass\s*:/,
    'the direct React class prop must be detected rather than passing on a descendant or substring');
});

test('every class the hand-written renderer asks for has a rule in styles.css', () => {
  const used = [...handWrittenClasses(app)].sort();
  const covered = coveredClasses(css);
  const missing = used.filter((c) => !covered.has(c));
  assert.deepEqual(missing, [], `used in App.tsx with no rule anywhere in styles.css: ${missing.join(', ')}`);
});

test('negative regression: deleting a used class\'s only rule is caught, not silently accepted', () => {
  const used = handWrittenClasses(app);
  assert.ok(used.has('palette-scrim'));
  const withoutScrimRule = css.replace(/\.palette-scrim\s*\{[^}]*\}/, '');
  assert.notEqual(withoutScrimRule, css, 'the mutation did not actually remove anything -- fix the test, not the code');
  const covered = coveredClasses(withoutScrimRule);
  assert.ok(!covered.has('palette-scrim'), 'palette-scrim should have dropped out of coverage once its rule was deleted');
});

test('negative regression: commenting out a used class\'s rule is caught too, not satisfied by the leftover substring', () => {
  /* The trap this proves the guard does not fall into: a rule that only survives inside
   * `/* ... *\/` still contains the literal text ".palette-scrim", so a check that never
   * strips comments before matching would wrongly call it covered. */
  const commentedOut = css.replace(/(\.palette-scrim\s*\{[^}]*\})/, '/* $1 */');
  assert.notEqual(commentedOut, css, 'the mutation did not actually comment anything out -- fix the test, not the code');
  assert.ok(commentedOut.includes('.palette-scrim'), 'the substring must still be present for this to be a real test of comment-stripping');
  const covered = coveredClasses(commentedOut);
  assert.ok(!covered.has('palette-scrim'), 'a commented-out rule must not count as coverage');
});

/* --- the scrim: paints an opaque backdrop and covers the whole viewport, not a corner --- */

test('the scrim is positioned to cover the window and paints a real, non-transparent backdrop', () => {
  const decl = declarationsFor(css, '.palette-scrim');
  assert.ok(decl, '.palette-scrim has no standalone rule');
  assert.match(decl, /position:\s*fixed/, 'the scrim must be taken out of document flow to cover the window');
  assert.match(decl, /inset:\s*0/, 'the scrim must span the full viewport, not a corner of it');
  const backgroundMatch = decl.match(/background:\s*([^;]+);/);
  assert.ok(backgroundMatch, '.palette-scrim declares no background at all');
  assert.ok(isPainted(backgroundMatch[1]), `.palette-scrim's background "${backgroundMatch[1]}" paints nothing`);
});

test('negative regression: the ORIGINAL measured broken scrim -- position:static, rgba(0,0,0,0) -- would have failed the check above', () => {
  /* Not hypothetical: these are the exact computed values captured by driving the real
   * built app before this fix (see the commit message / issue for the full readout). */
  const brokenDecl = 'position: static; background: rgba(0,0,0,0); z-index: auto; inset: auto;';
  assert.doesNotMatch(brokenDecl, /position:\s*fixed/);
  const backgroundMatch = brokenDecl.match(/background:\s*([^;]+);/);
  assert.ok(!isPainted(backgroundMatch[1]), 'the broken value should have been caught as unpainted');
});

/* --- the card: paints its own surface (background, border, shape, elevation) --------- */

test('the card paints a real background, border, radius and shadow -- an undecorated overlay lets the interface behind it read straight through', () => {
  const decl = declarationsFor(css, '.palette-card');
  assert.ok(decl, '.palette-card has no standalone rule');

  const background = decl.match(/background:\s*([^;]+);/)?.[1];
  assert.ok(isPainted(background), `.palette-card background "${background}" paints nothing`);

  const border = decl.match(/border:\s*([^;]+);/)?.[1];
  assert.ok(isPainted(border), `.palette-card border "${border}" paints nothing`);

  const radius = decl.match(/border-radius:\s*([^;]+);/)?.[1];
  assert.ok(radius !== undefined && radius.trim() !== '0', `.palette-card declares no real corner radius: "${radius}"`);

  const shadow = decl.match(/box-shadow:\s*([^;]+);/)?.[1];
  assert.ok(isPainted(shadow), `.palette-card box-shadow "${shadow}" paints no elevation`);
});

test('negative regression: the ORIGINAL measured broken card -- transparent, no border, no radius, no padding -- would have failed the check above', () => {
  const brokenDecl = 'background: rgba(0,0,0,0); border: none; border-radius: 0; padding: 0; max-height: none; overflow: visible;';
  const background = brokenDecl.match(/background:\s*([^;]+);/)?.[1];
  assert.ok(!isPainted(background));
  const border = brokenDecl.match(/border:\s*([^;]+);/)?.[1];
  assert.ok(!isPainted(border));
  const radius = brokenDecl.match(/border-radius:\s*([^;]+);/)?.[1];
  assert.equal(radius.trim(), '0');
});

/* --- bounded by the viewport, and scrolls internally instead of clipping ------------- */

test('the card is capped to the viewport height, and the RESULT LIST is what scrolls -- not a hard clip with no scrollbar', () => {
  const card = declarationsFor(css, '.palette-card');
  assert.match(card, /max-height:\s*calc\(100vh/, '.palette-card has no viewport-relative height cap');

  const results = declarationsFor(css, '.palette-results');
  assert.ok(results, '.palette-results has no standalone rule');
  assert.match(results, /overflow-y:\s*(auto|scroll)/,
    'the calendar-loses-its-last-week failure: a cap with no internal scroll deletes rows past the cap silently');
});

test('negative regression: capping height with overflow:hidden and no internal scroll is exactly the failure this check exists to catch', () => {
  const clippedNotScrolled = 'max-height: 420px; overflow: hidden; padding: 8px;';
  assert.doesNotMatch(clippedNotScrolled, /overflow-y:\s*(auto|scroll)/);
});

/* --- label and context read as two distinct things, not one glued string ------------- */

test('the row keeps its two spans visually apart with a real gap, matching the row layout elsewhere in the design', () => {
  const row = declarationsFor(css, '.palette-row');
  assert.ok(row, '.palette-row has no standalone rule');
  const gap = row.match(/gap:\s*([^;]+);/)?.[1];
  assert.ok(gap !== undefined && parseFloat(gap) > 0, `.palette-row gap "${gap}" would not separate its children`);
});

test('label and context are styled as primary and secondary text, exactly matching the compiled design\'s own reference row (search "dlgPalette" in generated/console.tsx)', () => {
  /* The reference is read from the generated file, not restated as a literal here, so
   * this test would notice if the compiled design's own reference values ever moved. */
  const referenceLabel = generated.match(/flex:1;\s*font-size:13\.5px;\s*color:#DFE4DC;/i);
  const referenceHint = generated.match(/font-family:'Roboto Mono',monospace;\s*font-size:11px;\s*color:#8FA394;/i);
  assert.ok(referenceLabel, 'the reference label style has moved or been removed in the compiled design');
  assert.ok(referenceHint, 'the reference hint style has moved or been removed in the compiled design');

  const label = declarationsFor(css, '.palette-label');
  const context = declarationsFor(css, '.palette-context');
  assert.ok(label && context, 'both .palette-label and .palette-context need standalone rules');

  const labelColor = label.match(/color:\s*([^;]+);/)?.[1].trim().toLowerCase();
  const contextColor = context.match(/color:\s*([^;]+);/)?.[1].trim().toLowerCase();
  assert.equal(labelColor, '#dfe4dc', 'label colour has drifted from the compiled reference');
  assert.equal(contextColor, '#8fa394', 'context colour has drifted from the compiled reference');
  assert.notEqual(labelColor, contextColor, 'label and context must not share one colour, or nothing on screen tells them apart');

  const labelSize = parseFloat(label.match(/font-size:\s*([^;]+);/)?.[1] ?? '0');
  const contextSize = parseFloat(context.match(/font-size:\s*([^;]+);/)?.[1] ?? '0');
  assert.ok(labelSize > contextSize, 'the label should read as the primary text and the context as the smaller, secondary text');
});

test('no separator character was inserted to fake the fix: the markup that already renders the two spans is untouched', () => {
  /* The label/context split was a styling gap, not a markup bug -- App.tsx already
   * renders two correct sibling spans. Confirms no middot or other delimiter text was
   * added to paper over it once the real fix (the rules above) landed. */
  assert.match(app, /h\('span', \{ className: 'palette-label' \}, match\.entry\.label\)/);
  assert.match(app, /h\('span', \{ className: 'palette-context' \}, match\.entry\.context\)/);
  assert.doesNotMatch(app, /palette-label[\s\S]{0,40}·/, 'a separator character was inserted near the label -- style with CSS instead');
});

/* --- the keyboard-selected row reads as a selection, not a plain hover --------------- */

test('the keyboard-selected row (.palette-row-on) is visually distinct from an ordinary mouse hover', () => {
  const hoverDecl = declarationsFor(css, '.palette-row:hover');
  const onDecl = declarationsTargeting(css, 'palette-row-on');
  assert.ok(hoverDecl, '.palette-row:hover has no rule');
  assert.ok(onDecl, '.palette-row-on has no rule');
  const hoverBg = hoverDecl.match(/background:\s*([^;]+);/)?.[1].trim().toLowerCase();
  const onBg = onDecl.match(/background:\s*([^;]+);/)?.[1].trim().toLowerCase();
  assert.ok(hoverBg && onBg, 'both states need a declared background to be visible at all');
  assert.notEqual(hoverBg, onBg, 'the selected row must not look identical to a plain hover, or Enter\'s target is unreadable');
});

/* --- interactive elements keep a visible focus ring; nothing sets outline:none blind --- */

test('the search field and the rows declare a real focus treatment rather than suppressing the outline', () => {
  const field = declarationsFor(css, '.palette-field:focus');
  assert.ok(field, '.palette-field:focus has no rule');
  assert.match(field, /outline:\s*(?!none)/i, '.palette-field:focus must not merely suppress the outline with nothing in its place');

  const rowFocus = declarationsFor(css, '.palette-row:focus-visible');
  assert.ok(rowFocus, '.palette-row:focus-visible has no rule');
  assert.match(rowFocus, /outline:\s*(?!none)/i, '.palette-row:focus-visible must not merely suppress the outline with nothing in its place');
});
