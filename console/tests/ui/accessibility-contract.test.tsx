/**
 * Accessibility contract.
 *
 * The module exists so the app's accessibility rules are enforced by a check rather than
 * by memory. These tests exist so the check itself is trustworthy: the contrast maths
 * against known reference pairs (catches a wrong exponent or a wrong linear threshold,
 * both of which shift every ratio without looking wrong in the diff), the enumerated
 * boundary cases for target size and focus (catches an off-by-one at the threshold), and
 * a scan proving a glyph never counts as a name (catches the specific defect an icon-only
 * toolbar button ships with most often).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AA_LARGE_TEXT_RATIO, AA_NORMAL_TEXT_RATIO, AAA_LARGE_TEXT_RATIO, AAA_NORMAL_TEXT_RATIO,
  CONTRAST_RATIO_OFFSET, MAX_SAFE_TABINDEX, MIN_TARGET_SIZE_PX, SRGB_GAMMA_EXPONENT,
  SRGB_LINEAR_THRESHOLD,
  contrastLevel, contrastRatio, contrastRatioFromHex, focusIssues, hasAccessibleName,
  meetsFocusContract, meetsTargetSize, motionPermitted, namingIssue, parseHexColour,
  relativeLuminance, resolveAccessibleName, shouldReduceMotion, targetSizeIssue,
  type AccessibleNameSources, type FocusableElement,
} from '../../app/renderer/src/accessibility-contract.ts';

/* --- contrast: the sRGB maths itself -------------------------------------------- */

test('the sRGB linearisation constants are the WCAG-specified values', () => {
  /* These two numbers are the whole formula. Get either wrong and every ratio computed
   * from it is quietly off, with no test failure anywhere near the change that broke it. */
  assert.equal(SRGB_LINEAR_THRESHOLD, 0.03928);
  assert.equal(SRGB_GAMMA_EXPONENT, 2.4);
  assert.equal(CONTRAST_RATIO_OFFSET, 0.05);
});

test('black has zero relative luminance and white has one', () => {
  assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
});

test('black against white is the maximum possible ratio, 21:1', () => {
  const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.001, `expected 21, got ${ratio}`);
});

test('contrast ratio does not depend on argument order', () => {
  const a = { r: 30, g: 90, b: 200 };
  const b = { r: 240, g: 240, b: 245 };
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

test('a known WCAG reference pair matches the published ratio', () => {
  /* #767676 on white is a commonly cited boundary pair, right at the AA-normal-text
   * threshold. A wrong gamma exponent or a wrong linear threshold both move this number
   * measurably; this is the test that would catch it, not the round-number sanity checks
   * above (black/white round-trips to 21 or 1 under several wrong formulas too). */
  const ratio = contrastRatio({ r: 0x76, g: 0x76, b: 0x76 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 4.542) < 0.01, `expected ~4.542, got ${ratio}`);
});

/* --- contrast: hex parsing -------------------------------------------------------- */

test('hex colours parse in 3-digit and 6-digit form, with or without a leading #, either case', () => {
  const expected = { r: 0x11, g: 0x22, b: 0x33 };
  for (const hex of ['#112233', '112233', '#123', '123', '#112233'.toUpperCase(), '#123'.toUpperCase()]) {
    assert.deepEqual(parseHexColour(hex), expected, `failed to parse "${hex}"`);
  }
});

test('a string that is not a valid hex colour fails to parse rather than guessing', () => {
  for (const bad of ['', 'red', '#12', '#1234', '#gggggg', '#12345g', 'rgb(0,0,0)']) {
    assert.equal(parseHexColour(bad), undefined, `"${bad}" should not have parsed`);
  }
});

test('contrastRatioFromHex agrees with contrastRatio on the parsed colours', () => {
  const fromHex = contrastRatioFromHex('#767676', '#ffffff');
  const fromRgb = contrastRatio({ r: 0x76, g: 0x76, b: 0x76 }, { r: 255, g: 255, b: 255 });
  assert.equal(fromHex, fromRgb);
});

test('contrastRatioFromHex returns undefined rather than a number when either side fails to parse', () => {
  assert.equal(contrastRatioFromHex('not-a-colour', '#ffffff'), undefined);
  assert.equal(contrastRatioFromHex('#ffffff', 'not-a-colour'), undefined);
});

/* --- contrast: which level a ratio meets ------------------------------------------ */

test('the AAA thresholds are never looser than the matching AA threshold', () => {
  /* Guards against the two constants being swapped by a future edit -- a mistake that
   * would make AAA text easier to pass than AA, which defeats the point of having two
   * levels. */
  assert.ok(AAA_NORMAL_TEXT_RATIO >= AA_NORMAL_TEXT_RATIO);
  assert.ok(AAA_LARGE_TEXT_RATIO >= AA_LARGE_TEXT_RATIO);
  assert.ok(AA_NORMAL_TEXT_RATIO >= AA_LARGE_TEXT_RATIO);
  assert.ok(AAA_NORMAL_TEXT_RATIO >= AAA_LARGE_TEXT_RATIO);
});

test('contrastLevel reports the exact level at every threshold boundary, for both text sizes', () => {
  /* Looping over both sizes and the exact threshold constants -- rather than one hardcoded
   * ratio -- means a future change to any of the four constants is exercised by this test
   * without editing it. */
  for (const largeText of [false, true]) {
    const aa = largeText ? AA_LARGE_TEXT_RATIO : AA_NORMAL_TEXT_RATIO;
    const aaa = largeText ? AAA_LARGE_TEXT_RATIO : AAA_NORMAL_TEXT_RATIO;
    assert.equal(contrastLevel(aa - 0.01, largeText), 'fail', `just below AA, large=${largeText}`);
    assert.equal(contrastLevel(aa, largeText), 'AA', `exactly at AA, large=${largeText}`);
    assert.equal(contrastLevel(aaa - 0.01, largeText), 'AA', `just below AAA, large=${largeText}`);
    assert.equal(contrastLevel(aaa, largeText), 'AAA', `exactly at AAA, large=${largeText}`);
  }
});

test('a 1:1 ratio always fails, at any text size', () => {
  assert.equal(contrastLevel(1, false), 'fail');
  assert.equal(contrastLevel(1, true), 'fail');
});

/* --- touch/click target sizing ---------------------------------------------------- */

test('a control at exactly the minimum size passes, one pixel under fails on either axis', () => {
  assert.equal(meetsTargetSize({ width: MIN_TARGET_SIZE_PX, height: MIN_TARGET_SIZE_PX }), true);
  assert.equal(meetsTargetSize({ width: MIN_TARGET_SIZE_PX - 1, height: MIN_TARGET_SIZE_PX }), false);
  assert.equal(meetsTargetSize({ width: MIN_TARGET_SIZE_PX, height: MIN_TARGET_SIZE_PX - 1 }), false);
});

test('a visually small control with adequate padded hit area still passes', () => {
  /* The case named explicitly in the feature: a 16x16 icon centred in extra invisible hit
   * area that brings the real clickable region up to size. */
  const control = {
    width: 16, height: 16,
    paddedHitArea: { top: 4, right: 4, bottom: 4, left: 4 },
  };
  assert.equal(meetsTargetSize(control), true, 'padding should have brought this to 24x24');
});

test('padding that is not enough to reach the minimum still fails', () => {
  const control = {
    width: 16, height: 16,
    paddedHitArea: { top: 1, right: 1, bottom: 1, left: 1 },
  };
  assert.equal(meetsTargetSize(control), false);
});

test('a control with no padding field behaves exactly as one with all-zero padding', () => {
  const bare = { width: 10, height: 10 };
  const zeroPadded = { width: 10, height: 10, paddedHitArea: { top: 0, right: 0, bottom: 0, left: 0 } };
  assert.equal(meetsTargetSize(bare), meetsTargetSize(zeroPadded));
});

test('targetSizeIssue is undefined for a passing control and reports the real effective size for a failing one', () => {
  assert.equal(targetSizeIssue({ width: MIN_TARGET_SIZE_PX, height: MIN_TARGET_SIZE_PX }), undefined);

  const issue = targetSizeIssue({
    width: 10, height: 12,
    paddedHitArea: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  assert.deepEqual(issue, { tooSmall: true, effectiveWidth: 14, effectiveHeight: 16 });
});

test('a control that would obviously fail any real threshold does fail, catching a check that always reports pass', () => {
  assert.equal(meetsTargetSize({ width: 1, height: 1 }), false);
  assert.ok(targetSizeIssue({ width: 1, height: 1 }) !== undefined);
});

/* --- accessible naming ------------------------------------------------------------ */

test('a control with no name source at all has no accessible name', () => {
  assert.equal(hasAccessibleName({}), false);
  assert.deepEqual(resolveAccessibleName({}), { name: '', source: 'none' });
});

test('each name source is used when it is the only one present', () => {
  const cases: Array<[AccessibleNameSources, string]> = [
    [{ visibleText: 'Save' }, 'visible-text'],
    [{ ariaLabel: 'Save the current document' }, 'aria-label'],
    [{ labelledByText: 'Save' }, 'labelledby'],
  ];
  for (const [sources, expectedSource] of cases) {
    const resolved = resolveAccessibleName(sources);
    assert.equal(resolved.source, expectedSource, JSON.stringify(sources));
    assert.ok(resolved.name.length > 0);
  }
});

test('when more than one source is present, aria-label wins over labelledby, which wins over visible text', () => {
  /* This is the same priority order the accessibility tree itself resolves names in --
   * a check that disagreed with it would report a name nobody actually hears. */
  assert.equal(
    resolveAccessibleName({ visibleText: 'a', labelledByText: 'b', ariaLabel: 'c' }).name, 'c');
  assert.equal(
    resolveAccessibleName({ visibleText: 'a', labelledByText: 'b' }).name, 'b');
});

test('an icon-only control with no name source is flagged specifically as icon-only-missing-name', () => {
  const issue = namingIssue({ iconOnly: true });
  assert.deepEqual(issue, { reason: 'icon-only-missing-name' });
});

test('a decorative emoji or glyph is never by itself an accessible name', () => {
  /* The exact defect the feature calls out: "Export" reduced to a floppy-disk emoji with
   * no text anywhere is unnamed, not named "💾". */
  for (const glyph of ['💾', '🔔', '➜', '···', '  ✕  ']) {
    assert.equal(hasAccessibleName({ ariaLabel: glyph }), false, `"${glyph}" should not count as a name`);
    assert.equal(hasAccessibleName({ visibleText: glyph }), false, `"${glyph}" should not count as a name`);
  }
});

test('a glyph-only aria-label falls through to a real visible-text source rather than winning', () => {
  const resolved = resolveAccessibleName({ ariaLabel: '💾', visibleText: 'Export as PDF' });
  assert.equal(resolved.source, 'visible-text');
  assert.equal(resolved.name, 'Export as PDF');
});

test('when the only source present is glyph-only, the issue is reported as glyph-only-name, not a bare missing name', () => {
  const issue = namingIssue({ ariaLabel: '🎉' });
  assert.deepEqual(issue, { reason: 'glyph-only-name' });
});

test('a label containing real text alongside an emoji is not glyph-only', () => {
  assert.equal(hasAccessibleName({ visibleText: 'Save 💾' }), true);
  assert.equal(hasAccessibleName({ ariaLabel: '⚠ Warning' }), true);
});

test('a fully named control has no naming issue at all', () => {
  assert.equal(namingIssue({ visibleText: 'Save' }), undefined);
  assert.equal(namingIssue({ ariaLabel: 'Save', iconOnly: true }), undefined);
});

test('whitespace-only text sources do not count as a name', () => {
  assert.equal(hasAccessibleName({ visibleText: '   ' }), false);
  assert.equal(hasAccessibleName({ ariaLabel: '\t\n' }), false);
});

/* --- focus -------------------------------------------------------------------------- */

test('a control with a visible focus indicator and natural tab order has no focus issues', () => {
  const element: FocusableElement = { hasVisibleFocusIndicator: true };
  assert.deepEqual(focusIssues(element), []);
  assert.equal(meetsFocusContract(element), true);
});

test('a control with no visible focus indicator is flagged, regardless of its tab order', () => {
  for (const tabIndex of [undefined, 0, -1]) {
    const issues = focusIssues({ hasVisibleFocusIndicator: false, tabIndex });
    assert.deepEqual(issues, [{ reason: 'no-visible-focus-indicator' }], `tabIndex=${tabIndex}`);
  }
});

test('tabindex exactly at the safe maximum is fine; one above it is a positive-tabindex issue', () => {
  assert.deepEqual(
    focusIssues({ hasVisibleFocusIndicator: true, tabIndex: MAX_SAFE_TABINDEX }), []);
  assert.deepEqual(
    focusIssues({ hasVisibleFocusIndicator: true, tabIndex: MAX_SAFE_TABINDEX + 1 }),
    [{ reason: 'positive-tabindex' }]);
});

test('a negative tabindex (programmatic focus only) is never flagged as a positive-tabindex issue', () => {
  assert.deepEqual(focusIssues({ hasVisibleFocusIndicator: true, tabIndex: -1 }), []);
});

test('an element failing both focus rules reports the visible-indicator issue before the tabindex issue', () => {
  const issues = focusIssues({ hasVisibleFocusIndicator: false, tabIndex: 5 });
  assert.deepEqual(issues, [{ reason: 'no-visible-focus-indicator' }, { reason: 'positive-tabindex' }]);
});

test('meetsFocusContract is false whenever focusIssues reports anything at all', () => {
  /* Loop across a spread of tabindex values so a check that hardcodes one bad value
   * cannot pass this by accident. */
  for (const tabIndex of [1, 2, 5, 100]) {
    assert.equal(meetsFocusContract({ hasVisibleFocusIndicator: true, tabIndex }), false);
  }
  assert.equal(meetsFocusContract({ hasVisibleFocusIndicator: false }), false);
});

/* --- reduced motion ------------------------------------------------------------------ */

test('motion is permitted only when neither the platform nor the app asks for less of it', () => {
  /* The full truth table, rather than a couple of hand-picked cases, so a broken boolean
   * (AND instead of OR, or a flipped negation) cannot slip through untested. */
  const table: Array<[boolean, boolean, boolean]> = [
    [false, false, true],
    [false, true, false],
    [true, false, false],
    [true, true, false],
  ];
  for (const [platform, app, expectedPermitted] of table) {
    assert.equal(
      motionPermitted(platform, app), expectedPermitted,
      `platform=${platform} app=${app}`);
  }
});

test('shouldReduceMotion is the exact opposite of motionPermitted for every combination', () => {
  for (const platform of [false, true]) {
    for (const app of [false, true]) {
      assert.equal(shouldReduceMotion(platform, app), !motionPermitted(platform, app));
    }
  }
});

test('either source alone is enough to reduce motion, matching the "either wins" rule elsewhere in the app', () => {
  assert.equal(shouldReduceMotion(true, false), true, 'platform preference alone should reduce motion');
  assert.equal(shouldReduceMotion(false, true), true, 'app setting alone should reduce motion');
});
