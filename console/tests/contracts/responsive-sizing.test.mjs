/**
 * Contract: responsive-sizing. The honest state is "partial", but the registry
 * note's specific citation is wrong in two ways and this file corrects both
 * rather than repeating them.
 *
 * The note says: "App.tsx line 709, narrow: true ... used to pick a narrower
 * layout for at least one screen." Reading the actual source: there is no
 * `narrow: true` anywhere near that line any more (line numbers drift), and the
 * `narrow` flag that DOES exist is not a screen-level responsive breakpoint at
 * all -- it is a per-CONTROL rendering variant (`isSegNarrow` in
 * `generated/m3-control.tsx`) applied to individual segmented pickers with more
 * than two options and to the read-only dialplan-step inspector fields on the
 * canvas screen. "Narrow" here means "a compact segmented-control layout", not
 * "the window is narrow" -- a name collision, not the responsive strategy the
 * canonical contract describes.
 *
 * What genuinely does NOT exist, confirmed by grepping the whole renderer:
 * no `matchMedia` query beyond `prefers-reduced-motion`, no `@media` breakpoint
 * beyond that same reduced-motion query in styles.css, and no window-width or
 * devicePixelRatio-driven layout logic anywhere. There is a `ResizeObserver` in
 * `UpdateBanner.tsx`, but it repositions one banner and is not a general
 * responsive strategy either. So "partial" understates nothing and the note's
 * one piece of cited evidence for even a single narrow-layout screen does not
 * hold up on inspection.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const M3_CONTROL = 'app/renderer/src/generated/m3-control.tsx';
const STYLES = 'app/renderer/src/styles.css';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['responsive-sizing'];
  assert.ok(row, 'the implementation registry has no row for responsive-sizing');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('the only "narrow" flag in the renderer is a per-control segmented-picker variant, not a screen-level responsive breakpoint', () => {
  const m3 = read(M3_CONTROL);
  assert.match(m3, /isSegmented: c\.kind === 'segmented' && !c\.narrow,/u, 'the isSegmented/narrow branching no longer matches');
  assert.match(m3, /isSegNarrow: c\.kind === 'segmented' && !!c\.narrow,/u, 'the isSegNarrow branching no longer matches');
});

test('App.tsx sets the narrow flag on individual controls (node-inspector fields), never on a whole screen', () => {
  const app = read(APP);
  assert.match(app, /narrow: true,/u, 'the narrow:true control property no longer appears in App.tsx');
  assert.doesNotMatch(app, /screen(Width|Narrow)|isNarrowScreen|layoutFor.*narrow/iu,
    'a screen-level narrow/responsive flag now exists -- the "per-control only" finding needs re-checking');
});

test('there is no window-width, devicePixelRatio, or breakpoint-driven layout logic anywhere in the renderer', () => {
  const rendererSrcDir = resolve(root, 'app/renderer/src');
  const rendererFiles = readdirSync(rendererSrcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const rendererSource = rendererFiles.map((f) => read(`app/renderer/src/${f}`)).join('\n');
  assert.doesNotMatch(rendererSource, /window\.innerWidth|devicePixelRatio/u,
    'window-width or devicePixelRatio-driven layout logic now exists -- update this row');
});

test('styles.css carries the real width breakpoints, and still respects reduced motion', () => {
  /* This assertion used to say the opposite: that prefers-reduced-motion was the ONLY
   * @media query, because the application genuinely had no screen breakpoint of any
   * kind. It went red the moment three landed, which is exactly what it was written to
   * notice -- its own failure message said "a real breakpoint may have landed". One did,
   * so it is inverted rather than deleted: what is pinned now is which breakpoints exist,
   * so nobody can quietly lose them either. */
  const styles = read(STYLES);
  /* Comments first: styles.css explains its own breakpoints in prose that mentions
   * @media, and a scan that does not strip comments reads those mentions as rules. */
  const css = styles.replace(/\/\*[\s\S]*?\*\//gu, '');
  const queries = [...css.matchAll(/@media\s*\(([^)]+)\)/gu)].map((m) => m[1].trim()).sort();
  assert.deepEqual(
    queries,
    ['max-width: 1000px', 'max-width: 1200px', 'prefers-reduced-motion: reduce'],
    'the set of @media queries changed; say which way and why rather than editing this list to match',
  );
});

test('the one ResizeObserver in the renderer repositions a single banner, not a general responsive layout', () => {
  const banner = read('app/renderer/src/UpdateBanner.tsx');
  assert.match(banner, /new ResizeObserver\(apply\)/u, 'UpdateBanner.tsx\'s ResizeObserver no longer matches');
});

test('matchMedia is used only for prefers-reduced-motion, never for a responsive width query', () => {
  const app = read(APP);
  const calls = [...app.matchAll(/matchMedia\?\.\('([^']+)'\)/gu)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'expected at least one matchMedia(...) call in App.tsx');
  for (const query of calls) {
    assert.match(query, /prefers-reduced-motion/u, `a matchMedia query other than prefers-reduced-motion now exists ("${query}") -- a real responsive query may have landed`);
  }
});
