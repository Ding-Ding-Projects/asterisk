/**
 * Contract: the accessibility-contract module computes WCAG contrast, target size,
 * accessible naming and focus/motion the way it claims to, and only the contrast half of it
 * is actually reached by the running console.
 *
 * `accessibility-contract.ts` is pure and self-contained, so this plain `.mjs` file
 * `import()`s it directly through Node's built-in TypeScript type-stripping and calls the
 * real `contrastRatio` / `meetsTargetSize` / `resolveAccessibleName` / `focusIssues` /
 * `motionPermitted` functions -- no reimplementation of the WCAG relative-luminance formula
 * that could quietly disagree with the original by a rounding choice nobody would notice.
 *
 * The wiring section is where the feature registry's "implemented" claim needs narrowing:
 * only `contrastRatioFromHex` and `contrastLevel` are ever called by App.tsx, to build one
 * read-only status line under the appearance editor. `meetsTargetSize`, `resolveAccessibleName`,
 * `focusIssues`/`meetsFocusContract` and `motionPermitted`/`shouldReduceMotion` are a real,
 * tested audit toolkit that nothing in the shipped app ever runs against anything -- there is
 * no runtime accessibility audit, no target-size check on a real control, no accessible-name
 * check on a real element, and no reduced-motion resolver wired to an actual animation.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const a11y = await import('../../app/renderer/src/accessibility-contract.ts');

/* --- contrast: WCAG 2.x relative luminance and the well-known reference ratios --------- */

test('contrastRatio: black on white is exactly 21:1, and a colour against itself is exactly 1:1', () => {
  assert.equal(a11y.contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21);
  assert.equal(a11y.contrastRatio({ r: 128, g: 64, b: 32 }, { r: 128, g: 64, b: 32 }), 1);
});

test('contrastRatio does not care about argument order', () => {
  const a = { r: 20, g: 120, b: 220 };
  const b = { r: 240, g: 240, b: 240 };
  assert.equal(a11y.contrastRatio(a, b), a11y.contrastRatio(b, a));
});

test('parseHexColour accepts 3- and 6-digit hex with or without "#", and rejects garbage', () => {
  assert.deepEqual(a11y.parseHexColour('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(a11y.parseHexColour('00ff80'), { r: 0, g: 255, b: 128 });
  assert.equal(a11y.parseHexColour('not a colour'), undefined);
  assert.equal(a11y.parseHexColour('#12345'), undefined, 'five digits is neither 3 nor 6');
});

test('contrastRatioFromHex round-trips through parseHexColour and matches contrastRatio directly', () => {
  assert.equal(a11y.contrastRatioFromHex('#000000', '#ffffff'), 21);
  assert.equal(a11y.contrastRatioFromHex('garbage', '#ffffff'), undefined);
});

test('contrastLevel applies the documented AA/AAA thresholds, and large text has a lower floor than normal text', () => {
  assert.equal(a11y.contrastLevel(a11y.AAA_NORMAL_TEXT_RATIO, false), 'AAA');
  assert.equal(a11y.contrastLevel(a11y.AAA_NORMAL_TEXT_RATIO - 0.01, false), 'AA');
  assert.equal(a11y.contrastLevel(a11y.AA_NORMAL_TEXT_RATIO, false), 'AA');
  assert.equal(a11y.contrastLevel(a11y.AA_NORMAL_TEXT_RATIO - 0.01, false), 'fail');
  assert.equal(a11y.contrastLevel(a11y.AA_LARGE_TEXT_RATIO, true), 'AA');
  assert.equal(a11y.contrastLevel(a11y.AA_LARGE_TEXT_RATIO - 0.01, true), 'fail');
  assert.ok(a11y.AA_LARGE_TEXT_RATIO < a11y.AA_NORMAL_TEXT_RATIO, 'large text must have the more forgiving floor');
});

test('the cited WCAG constants match the published spec values, not an approximation', () => {
  /* https://www.w3.org/TR/WCAG21/#dfn-relative-luminance and Success Criteria 1.4.3/1.4.6 */
  assert.equal(a11y.SRGB_LINEAR_THRESHOLD, 0.03928);
  assert.equal(a11y.SRGB_GAMMA_EXPONENT, 2.4);
  assert.equal(a11y.CONTRAST_RATIO_OFFSET, 0.05);
  assert.equal(a11y.AA_NORMAL_TEXT_RATIO, 4.5);
  assert.equal(a11y.AA_LARGE_TEXT_RATIO, 3);
  assert.equal(a11y.AAA_NORMAL_TEXT_RATIO, 7);
  assert.equal(a11y.AAA_LARGE_TEXT_RATIO, 4.5);
});

/* --- target size: the visible box, or a padded hit area, must reach the floor ---------- */

test('meetsTargetSize: the WCAG 2.2 AA floor is 24x24, and a small visible control padded out to it still passes', () => {
  assert.equal(a11y.MIN_TARGET_SIZE_PX, 24);
  assert.equal(a11y.meetsTargetSize({ width: 24, height: 24 }), true);
  assert.equal(a11y.meetsTargetSize({ width: 23, height: 24 }), false);
  assert.equal(a11y.meetsTargetSize({ width: 10, height: 10, paddedHitArea: { top: 7, right: 7, bottom: 7, left: 7 } }), true);
});

test('targetSizeIssue reports the actual effective size for a failing control, and undefined for a passing one', () => {
  assert.equal(a11y.targetSizeIssue({ width: 24, height: 24 }), undefined);
  const issue = a11y.targetSizeIssue({ width: 10, height: 10 });
  assert.deepEqual(issue, { tooSmall: true, effectiveWidth: 10, effectiveHeight: 10 });
});

/* --- accessible naming: aria-label beats labelledby beats visible text, glyphs never count */

test('resolveAccessibleName follows the documented priority order', () => {
  assert.deepEqual(
    a11y.resolveAccessibleName({ ariaLabel: 'Save', labelledByText: 'x', visibleText: 'y' }),
    { name: 'Save', source: 'aria-label' },
  );
  assert.deepEqual(
    a11y.resolveAccessibleName({ labelledByText: 'Save', visibleText: 'y' }),
    { name: 'Save', source: 'labelledby' },
  );
  assert.deepEqual(
    a11y.resolveAccessibleName({ visibleText: 'Save' }),
    { name: 'Save', source: 'visible-text' },
  );
  assert.deepEqual(a11y.resolveAccessibleName({}), { name: '', source: 'none' });
});

test('a glyph-only string never counts as an accessible name, even as the only source offered', () => {
  assert.equal(a11y.hasAccessibleName({ ariaLabel: '\u{1F4BE}' }), false, 'a floppy-disk emoji alone is not a name');
  assert.equal(a11y.hasAccessibleName({ visibleText: '>>>' }), false, 'punctuation alone is not a name');
  assert.equal(a11y.hasAccessibleName({ visibleText: 'Save 2' }), true, 'a real word with a digit is a name');
});

test('namingIssue distinguishes a glyph-only name from an icon-only control from an ordinary missing name', () => {
  assert.deepEqual(a11y.namingIssue({ ariaLabel: '\u{1F4BE}' }), { reason: 'glyph-only-name' });
  assert.deepEqual(a11y.namingIssue({ iconOnly: true }), { reason: 'icon-only-missing-name' });
  assert.deepEqual(a11y.namingIssue({}), { reason: 'missing-name' });
  assert.equal(a11y.namingIssue({ visibleText: 'Save' }), undefined);
});

/* --- focus: a positive tabindex is a trap; a missing visible indicator is worse -------- */

test('focusIssues reports a missing visible focus indicator before a positive tabindex', () => {
  const both = a11y.focusIssues({ hasVisibleFocusIndicator: false, tabIndex: 3 });
  assert.deepEqual(both.map((i) => i.reason), ['no-visible-focus-indicator', 'positive-tabindex']);
  assert.equal(a11y.MAX_SAFE_TABINDEX, 0);
});

test('tabindex 0 and -1 are both fine; only a strictly positive value is the WCAG 2.4.3 trap', () => {
  assert.equal(a11y.meetsFocusContract({ hasVisibleFocusIndicator: true, tabIndex: 0 }), true);
  assert.equal(a11y.meetsFocusContract({ hasVisibleFocusIndicator: true, tabIndex: -1 }), true);
  assert.equal(a11y.meetsFocusContract({ hasVisibleFocusIndicator: true, tabIndex: 1 }), false);
});

/* --- reduced motion: composes with the platform preference, never overrides it --------- */

test('motionPermitted is false whenever EITHER the platform or the app setting asks for less motion', () => {
  assert.equal(a11y.motionPermitted(false, false), true);
  assert.equal(a11y.motionPermitted(true, false), false, 'platform preference alone must reduce motion');
  assert.equal(a11y.motionPermitted(false, true), false, 'app setting alone must reduce motion');
  assert.equal(a11y.shouldReduceMotion(true, false), true);
  assert.equal(a11y.shouldReduceMotion(false, false), false);
});

/* --- wiring: what the running console actually calls ----------------------------------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('App imports and calls the real contrast functions to build the accent readout', () => {
  assert.match(app, /AA_LARGE_TEXT_RATIO, AA_NORMAL_TEXT_RATIO, contrastLevel, contrastRatioFromHex,/);
  const start = app.indexOf('private contrastStatus(): string {');
  assert.ok(start > 0, 'contrastStatus has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /const ratio = contrastRatioFromHex\(hex, App\.SURFACE_HEX\);/);
  assert.match(body, /const normal = contrastLevel\(ratio, false\);/);
});

test('the design renders one contrast readout, answered from contrastStatus', () => {
  assert.match(generated, /ctl\('ap_contrast_status','Contrast of the current accent','text',/);
  assert.match(generated, /action:'contrast-status'/);
  assert.match(app, /if \(action === 'contrast-status'\) return this\.contrastStatus\(\);/);
});

/* --- PIN: everything except contrast measurement is unreached by the running app ------- */

test('PIN: meetsTargetSize/targetSizeIssue are never called outside the module that defines them', () => {
  assert.doesNotMatch(app, /meetsTargetSize\(|targetSizeIssue\(/,
    'App now runs a target-size check -- the "no runtime target-size audit" gap this pins may be fixed; update the test and the report');
  assert.doesNotMatch(generated, /meetsTargetSize\(|targetSizeIssue\(/);
});

test('PIN: resolveAccessibleName/hasAccessibleName/namingIssue are never called outside the module that defines them', () => {
  assert.doesNotMatch(app, /resolveAccessibleName\(|hasAccessibleName\(|namingIssue\(/,
    'App now runs an accessible-naming check -- update this pin and the report if this gap has been closed');
  assert.doesNotMatch(generated, /resolveAccessibleName\(|hasAccessibleName\(|namingIssue\(/);
});

test('PIN: focusIssues/meetsFocusContract are never called outside the module that defines them', () => {
  assert.doesNotMatch(app, /focusIssues\(|meetsFocusContract\(/,
    'App now runs a focus-order/indicator check -- update this pin and the report if this gap has been closed');
  assert.doesNotMatch(generated, /focusIssues\(|meetsFocusContract\(/);
});

test('PIN: motionPermitted/shouldReduceMotion are never called outside the module that defines them', () => {
  /* The design's own reduced-motion handling (elsewhere in generated/console.tsx) reads
   * window.matchMedia('(prefers-reduced-motion: reduce)') directly rather than through this
   * module's composition helper, so the "composes with the app setting, never only the
   * platform" property this module exists to guarantee is not actually enforced anywhere
   * these two functions are reachable from. */
  assert.doesNotMatch(app, /motionPermitted\(|shouldReduceMotion\(/,
    'App now calls the reduced-motion composition helper -- update this pin and the report if this gap has been closed');
  assert.doesNotMatch(generated, /motionPermitted\(|shouldReduceMotion\(/);
});
