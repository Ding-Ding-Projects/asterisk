/**
 * The dim sum surprise, actually reached from the running application.
 *
 * The whole original defect was that `dim-sum-surprise.ts` was correct, tested, and
 * imported by no `.tsx` file anywhere in the renderer -- so the feature never once ran
 * in the shipped console. A test that only imports the module directly, the way
 * `dim-sum-surprise.test.tsx` already does, would repeat exactly that mistake: it would
 * pass whether or not `main.tsx` mounts anything at all. Everything here instead reads
 * the real `main.tsx` source and the real card markup, so a regression that un-mounts
 * the surprise again -- deleting the import, commenting out the render call, renaming
 * the host element -- turns this red.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';

import { DimSumSurpriseCard } from '../../app/renderer/src/DimSumSurprise.tsx';
import { surpriseFor, type Dish } from '../../app/renderer/src/dim-sum-surprise.ts';

const mainUrl = new URL('../../app/renderer/src/main.tsx', import.meta.url);
const stylesUrl = new URL('../../app/renderer/src/styles.css', import.meta.url);

const DISHES: readonly Dish[] = [
  { id: 'har-gow', nameEn: 'Shrimp dumpling', nameZhHant: '蝦餃', asset: 'assets/dim-sum/har-gow.webp' },
];

const surprise = surpriseFor(DISHES, { context: 'normal', draw: 0, pick: 0, alreadyDrawnThisLaunch: false })!;

/* --- reachable from the real mount chain ------------------------------------------ */

test('main.tsx imports the runtime component, on an uncommented line', async () => {
  const source = await readFile(mainUrl, 'utf8');
  /* Anchored to the exact, whole import line rather than a bare substring: a
   * `// import { DimSumSurprise } ...` line starts with `//`, not `import`, so it
   * cannot satisfy a pattern anchored to the start of the line. */
  assert.match(source, /^import \{ DimSumSurprise \} from '\.\/DimSumSurprise';$/mu, 'main.tsx does not import DimSumSurprise, or the import is commented out');
});

test('main.tsx actually mounts the component as its own root, on an uncommented line', async () => {
  const source = await readFile(mainUrl, 'utf8');
  /* Same anti-comment-out anchoring as above: the line must not be preceded on its own
   * line by `//`. A renamed host element, a renamed component, or a deleted render call
   * all fail this exact match -- the original defect (imported by nothing) is exactly
   * what this line rules out. */
  assert.match(
    source,
    /^\s*createRoot\(surpriseHost\)\.render\(<React\.StrictMode><DimSumSurprise \/><\/React\.StrictMode>\);$/mu,
    'main.tsx does not render <DimSumSurprise /> as its own root, or the line is commented out',
  );
  assert.match(source, /^\s*const surpriseHost = document\.createElement\('div'\);$/mu, 'no dedicated host element is created for the surprise root');
  assert.doesNotMatch(source, /\/\/\s*createRoot\(surpriseHost\)/u, 'the surprise mount line is commented out');
});

test('the surprise is mounted after the hosted setup/login redirects, never before them', async () => {
  const source = await readFile(mainUrl, 'utf8');
  const setupIndex = source.indexOf("window.location.assign('/setup.html')");
  const loginIndex = source.indexOf("window.location.assign('/login.html')");
  const surpriseIndex = source.indexOf('createRoot(surpriseHost)');
  assert.ok(setupIndex >= 0 && loginIndex >= 0 && surpriseIndex >= 0, 'expected boot() structure was not found in main.tsx');
  assert.ok(surpriseIndex > setupIndex, 'the surprise mounts before the hosted first-run (setup) redirect can even run');
  assert.ok(surpriseIndex > loginIndex, 'the surprise mounts before the hosted login redirect can even run');
});

/* --- the card itself: no blocking node, alt text names the dish ------------------- */

test('the card renders no blocking node -- no dialog role, no aria-modal, no focusable control', () => {
  const html = renderToStaticMarkup(createElement(DimSumSurpriseCard, { surprise }));
  assert.doesNotMatch(html, /role="dialog"/u, 'a dialog role would make this a blocking surface, contrary to the module\'s own contract');
  assert.doesNotMatch(html, /aria-modal/u);
  assert.doesNotMatch(html, /<button|<input|tabindex|autofocus/iu, 'a focusable control here could steal focus, which the module explicitly forbids');
  assert.match(html, /role="status"/u, 'a non-blocking delight should be an informational live region, not silence');
  assert.match(html, /aria-live="polite"/u);
});

test('the alt text names the dish, in both languages, exactly as the pure module produced it', () => {
  const html = renderToStaticMarkup(createElement(DimSumSurpriseCard, { surprise }));
  assert.match(html, /alt="Shrimp dumpling \(蝦餃\)"/u);
});

test('the image is the bundled asset path, never rewritten into a URL', () => {
  const html = renderToStaticMarkup(createElement(DimSumSurpriseCard, { surprise }));
  assert.match(html, /src="assets\/dim-sum\/har-gow\.webp"/u);
  assert.doesNotMatch(html, /src="https?:/iu);
});

/* --- reduced motion is honoured ---------------------------------------------------- */

/** Extracts one flat CSS rule's declaration block by matching brace boundaries rather
 *  than a regex that could cross into a neighbouring rule -- `[\s\S]*?` between two
 *  selectors has silently matched the wrong rule elsewhere in this project before. */
function extractRule(css: string, selectorLine: string): string {
  const start = css.indexOf(selectorLine);
  assert.ok(start >= 0, `selector not found in stylesheet: ${selectorLine}`);
  const braceOpen = css.indexOf('{', start);
  const braceClose = css.indexOf('}', braceOpen);
  assert.ok(braceOpen >= 0 && braceClose > braceOpen, `malformed rule for: ${selectorLine}`);
  return css.slice(braceOpen + 1, braceClose);
}

test('the card animates by CSS animation, so the app-wide reduced-motion override actually reaches it', async () => {
  const css = await readFile(stylesUrl, 'utf8');
  const rule = extractRule(css, '.dim-sum-surprise {');
  assert.match(rule, /animation:\s*dimSumSurpriseIn/u);
  assert.match(rule, /pointer-events:\s*none/u, 'the card should never intercept clicks meant for whatever is beneath it');
});

test('the stylesheet explicitly disables the animation under prefers-reduced-motion', async () => {
  const css = await readFile(stylesUrl, 'utf8');
  const mediaIndex = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(mediaIndex >= 0, 'no prefers-reduced-motion block exists');
  const afterMedia = css.slice(mediaIndex, mediaIndex + 400);
  assert.match(afterMedia, /\.dim-sum-surprise\s*\{\s*animation:\s*none;?\s*\}/u, 'the reduced-motion block does not disable the dim-sum-surprise animation');
});
