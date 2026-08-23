import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_RULES,
  MAX_VALUE_LENGTH,
  RAINBOW,
  WILDCARD_ELEMENT,
  addRule,
  applyTheme,
  contrastWarnings,
  describeLoss,
  exportTheme,
  importTheme,
  resetAll,
  resetElement,
  resetProperty,
  resolve,
  validateRule,
} from '../../app/renderer/src/appearance.ts';
import type { AppearanceRule, AppearanceTheme } from '../../app/renderer/src/appearance.ts';

function theme(rules: AppearanceRule[]): AppearanceTheme {
  return { id: 'test-theme', name: 'Test', rules };
}

function rule(element: string, property: AppearanceRule['property'], value: string): AppearanceRule {
  return { element, property, value };
}

// ---------------------------------------------------------------- validateRule: bounds

test('fontSize accepts a positive bounded length and refuses zero/negative/oversized', () => {
  assert.equal(validateRule(rule('btn', 'fontSize', '14px')).ok, true);
  assert.equal(validateRule(rule('btn', 'fontSize', '0px')).ok, false);
  assert.equal(validateRule(rule('btn', 'fontSize', '-3px')).ok, false);
  const big = validateRule(rule('btn', 'fontSize', '9999px'));
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.reason, /fontSize/);
});

test('fontWeight accepts 100-900 steps of 100 and named weights, refuses 550', () => {
  assert.equal(validateRule(rule('btn', 'fontWeight', '400')).ok, true);
  assert.equal(validateRule(rule('btn', 'fontWeight', 'bold')).ok, true);
  const bad = validateRule(rule('btn', 'fontWeight', '550'));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.reason, /'550'/);
});

test('opacity is refused by name with the actual value quoted', () => {
  const r = validateRule(rule('btn', 'opacity', '1.5'));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /opacity must be a number within \[0, 1\], got '1.5'/);
});

test('letterSpacing refused with a non-length value quoted', () => {
  const r = validateRule(rule('el', 'letterSpacing', 'quite wide'));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /letterSpacing/);
  if (!r.ok) assert.match(r.reason, /'quite wide'/);
});

test('elevation accepts an in-range integer and refuses out of range/non-integer', () => {
  assert.equal(validateRule(rule('card', 'elevation', '4')).ok, true);
  assert.equal(validateRule(rule('card', 'elevation', '25')).ok, false);
  assert.equal(validateRule(rule('card', 'elevation', '2.5')).ok, false);
});

test('radius/borderWidth/padding/gap accept non-negative bounded lengths', () => {
  assert.equal(validateRule(rule('card', 'radius', '8px')).ok, true);
  assert.equal(validateRule(rule('card', 'radius', '-1px')).ok, false);
  assert.equal(validateRule(rule('card', 'gap', '600px')).ok, false);
});

test('textAlign/direction/capitalisation/fontStyle enums refuse unknown values', () => {
  assert.equal(validateRule(rule('p', 'textAlign', 'center')).ok, true);
  assert.equal(validateRule(rule('p', 'textAlign', 'diagonally')).ok, false);
  assert.equal(validateRule(rule('p', 'direction', 'ltr')).ok, true);
  assert.equal(validateRule(rule('p', 'direction', 'up')).ok, false);
  assert.equal(validateRule(rule('p', 'capitalisation', 'uppercase')).ok, true);
  assert.equal(validateRule(rule('p', 'capitalisation', 'shout')).ok, false);
  assert.equal(validateRule(rule('p', 'fontStyle', 'italic')).ok, true);
  assert.equal(validateRule(rule('p', 'fontStyle', 'sideways')).ok, false);
});

test('underline/strikethrough/overline accept only true/false', () => {
  assert.equal(validateRule(rule('p', 'underline', 'true')).ok, true);
  assert.equal(validateRule(rule('p', 'underline', 'yes')).ok, false);
});

test('lineHeight accepts a bounded unitless number or length, refuses zero and huge', () => {
  assert.equal(validateRule(rule('p', 'lineHeight', '1.5')).ok, true);
  assert.equal(validateRule(rule('p', 'lineHeight', '0')).ok, false);
  assert.equal(validateRule(rule('p', 'lineHeight', '25')).ok, false);
});

// ---------------------------------------------------------------- colour delegation

test('a colour property is validated through colour.ts, not reimplemented', () => {
  assert.equal(validateRule(rule('btn', 'colour', '#336699')).ok, true);
  assert.equal(validateRule(rule('btn', 'colour', 'rebeccapurple-ish')).ok, false);
  assert.equal(validateRule(rule('btn', 'background', 'rgb(10, 20, 30)')).ok, true);
});

// ---------------------------------------------------------------- rainbow sentinel

test('the rainbow sentinel is accepted as a colour value', () => {
  assert.equal(validateRule(rule('btn', 'colour', RAINBOW)).ok, true);
  assert.equal(validateRule(rule('btn', 'borderColour', RAINBOW)).ok, true);
});

test('the rainbow sentinel is refused where a literal colour is required (font family etc.)', () => {
  assert.equal(validateRule(rule('btn', 'fontFamily', RAINBOW)).ok, false);
});

test('the rainbow sentinel survives an export/import round trip unchanged', () => {
  const t = theme([rule('btn', 'colour', RAINBOW)]);
  const json = exportTheme(t);
  const result = importTheme(json);
  assert.ok('theme' in result);
  if ('theme' in result) {
    assert.equal(result.theme.rules.length, 1);
    assert.equal(result.theme.rules[0].value, RAINBOW);
  }
});

// ---------------------------------------------------------------- unknown property/element

test('an unknown property is refused, not stored', () => {
  const r = validateRule({ element: 'btn', property: 'glow' as never, value: '1' });
  assert.equal(r.ok, false);
});

test('an unknown/invalid element id is refused, not stored', () => {
  const r = validateRule(rule('!!bad', 'opacity', '0.5'));
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------- precedence

test('resolve: an element-specific rule beats a wildcard rule regardless of order', () => {
  const t = theme([
    rule('btn', 'colour', '#111111'),
    rule(WILDCARD_ELEMENT, 'colour', '#eeeeee'),
  ]);
  assert.equal(resolve(t, 'btn', 'colour'), '#111111');
  assert.equal(resolve(t, 'other', 'colour'), '#eeeeee');
});

test('resolve: wildcard rule listed before the exact rule still loses to the exact rule', () => {
  const t = theme([
    rule(WILDCARD_ELEMENT, 'colour', '#eeeeee'),
    rule('btn', 'colour', '#111111'),
  ]);
  assert.equal(resolve(t, 'btn', 'colour'), '#111111');
});

test('resolve: among rules at the same scope, the later rule in the array wins', () => {
  const t = theme([
    rule('btn', 'colour', '#111111'),
    rule('btn', 'colour', '#222222'),
  ]);
  assert.equal(resolve(t, 'btn', 'colour'), '#222222');
});

test('resolve: no matching rule at any scope returns undefined', () => {
  const t = theme([rule('btn', 'colour', '#111111')]);
  assert.equal(resolve(t, 'other', 'fontSize'), undefined);
});

// ---------------------------------------------------------------- applyTheme

test('applyTheme omits an invalid rule entirely rather than emitting a bad value', () => {
  const t: AppearanceTheme = {
    id: 't', name: 'T',
    rules: [
      rule('card', 'opacity', '0.5'),
      { element: 'btn', property: 'opacity', value: '5' }, // out of range, invalid
    ],
  };
  const applied = applyTheme(t);
  assert.equal(applied['card::--opacity'], '0.5');
  assert.equal('btn::--opacity' in applied, false);
});

test('applyTheme never emits a declaration for a rule that fails validation', () => {
  const t = theme([rule('btn', 'fontWeight', '550')]);
  const applied = applyTheme(t);
  assert.equal(Object.keys(applied).length, 0);
});

test('applyTheme keys declarations by element and css var, valid rules only', () => {
  const t = theme([rule('btn', 'fontSize', '16px'), rule('card', 'radius', '8px')]);
  const applied = applyTheme(t);
  assert.equal(applied['btn::--font-size'], '16px');
  assert.equal(applied['card::--radius'], '8px');
  assert.equal(Object.keys(applied).length, 2);
});

// ---------------------------------------------------------------- resets

test('resetProperty removes only the targeted element+property, without mutating the original', () => {
  const original = theme([rule('btn', 'colour', '#111'), rule('btn', 'fontSize', '14px')]);
  const next = resetProperty(original, 'btn', 'colour');
  assert.equal(original.rules.length, 2);
  assert.equal(next.rules.length, 1);
  assert.equal(next.rules[0].property, 'fontSize');
});

test('resetElement removes every rule for that element, without mutating the original', () => {
  const original = theme([rule('btn', 'colour', '#111'), rule('card', 'colour', '#222')]);
  const next = resetElement(original, 'btn');
  assert.equal(original.rules.length, 2);
  assert.equal(next.rules.length, 1);
  assert.equal(next.rules[0].element, 'card');
});

test('resetAll clears every rule, without mutating the original', () => {
  const original = theme([rule('btn', 'colour', '#111')]);
  const next = resetAll(original);
  assert.equal(original.rules.length, 1);
  assert.equal(next.rules.length, 0);
});

// ---------------------------------------------------------------- export / import round trip

test('exportTheme/importTheme round trips every rule', () => {
  const original = theme([
    rule('btn', 'colour', '#123456'),
    rule('card', 'radius', '8px'),
    rule(WILDCARD_ELEMENT, 'fontFamily', 'Inter, sans-serif'),
  ]);
  const json = exportTheme(original);
  const result = importTheme(json);
  assert.ok('theme' in result);
  if ('theme' in result) {
    assert.deepEqual(result.theme.rules, original.rules);
    assert.equal(result.rejected.length, 0);
  }
});

test('importTheme with two bad rules reports exactly those two and keeps the rest', () => {
  const payload = JSON.stringify({
    schemaVersion: 1,
    id: 't', name: 'T',
    rules: [
      { element: 'btn', property: 'colour', value: '#123456' },      // good
      { element: 'btn', property: 'opacity', value: '5' },           // bad: out of range
      { element: 'btn', property: 'weirdProp', value: '1' },         // bad: unknown property
      { element: 'card', property: 'radius', value: '8px' },         // good
    ],
  });
  const result = importTheme(payload);
  assert.ok('theme' in result);
  if ('theme' in result) {
    assert.equal(result.theme.rules.length, 2);
    assert.equal(result.rejected.length, 2);
    assert.equal(result.rejected[0].index, 1);
    assert.equal(result.rejected[1].index, 2);
  }
});

test('importTheme refuses malformed JSON with a named reason', () => {
  const result = importTheme('{ not json');
  assert.equal('ok' in result && result.ok === false, true);
});

test('importTheme refuses an unsupported schema version', () => {
  const payload = JSON.stringify({ schemaVersion: 99, id: 't', name: 'T', rules: [] });
  const result = importTheme(payload);
  assert.equal('ok' in result && result.ok === false, true);
});

// ---------------------------------------------------------------- contrastWarnings

test('contrastWarnings catches unreadable text and names the ratio', () => {
  const t = theme([
    rule('label', 'colour', '#777777'),
    rule('label', 'background', '#888888'),
  ]);
  const warnings = contrastWarnings(t, [{ element: 'label' }]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].verdict, 'fail');
  assert.ok(warnings[0].ratio < 4.5);
});

test('contrastWarnings reports nothing for a readable pair', () => {
  const t = theme([
    rule('label', 'colour', '#000000'),
    rule('label', 'background', '#ffffff'),
  ]);
  const warnings = contrastWarnings(t, [{ element: 'label' }]);
  assert.equal(warnings.length, 0);
});

test('contrastWarnings skips a rainbow-valued pair rather than crashing', () => {
  const t = theme([
    rule('label', 'colour', RAINBOW),
    rule('label', 'background', '#ffffff'),
  ]);
  const warnings = contrastWarnings(t, [{ element: 'label' }]);
  assert.equal(warnings.length, 0);
});

// ---------------------------------------------------------------- describeLoss

test('describeLoss reports a loss before export for a lossy property/format pair', () => {
  const t = theme([rule('label', 'highlight', '#ffff00')]);
  const messages = describeLoss(t, 'css');
  assert.equal(messages.length, 1);
  assert.match(messages[0], /highlight/);
});

test('describeLoss reports nothing for a format that loses nothing', () => {
  const t = theme([rule('label', 'colour', '#000000')]);
  const messages = describeLoss(t, 'json');
  assert.equal(messages.length, 0);
});

// ---------------------------------------------------------------- caps

test('a value longer than MAX_VALUE_LENGTH is refused by name', () => {
  const r = validateRule(rule('btn', 'fontFamily', 'a'.repeat(MAX_VALUE_LENGTH + 1)));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, new RegExp(`at most ${MAX_VALUE_LENGTH}`));
});

test('addRule refuses beyond MAX_RULES by name', () => {
  let t = theme([]);
  for (let i = 0; i < MAX_RULES; i += 1) {
    const next = addRule(t, rule(`el${i}`, 'opacity', '0.5'));
    assert.ok(!('ok' in next && next.ok === false), `unexpected rejection at ${i}`);
    t = next as AppearanceTheme;
  }
  const overflow = addRule(t, rule('overflow-el', 'opacity', '0.5'));
  assert.equal('ok' in overflow && overflow.ok === false, true);
  if ('ok' in overflow && overflow.ok === false) {
    assert.match(overflow.reason, /maximum of/);
  }
});

test('addRule replaces an existing rule for the same element+property rather than duplicating', () => {
  let t = theme([]);
  t = addRule(t, rule('btn', 'opacity', '0.5')) as AppearanceTheme;
  t = addRule(t, rule('btn', 'opacity', '0.8')) as AppearanceTheme;
  assert.equal(t.rules.length, 1);
  assert.equal(resolve(t, 'btn', 'opacity'), '0.8');
});

test('addRule refuses an invalid rule and leaves the theme untouched', () => {
  const original = theme([rule('btn', 'opacity', '0.5')]);
  const result = addRule(original, rule('btn', 'opacity', '5'));
  assert.equal('ok' in result && result.ok === false, true);
});
