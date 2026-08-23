import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RAINBOW,
  clipToGamut,
  contrastRatio,
  contrastVerdict,
  formatColour,
  isOutOfGamut,
  isRainbow,
  parseColour,
  rainbowDurationMs,
  relativeLuminance,
  translate,
} from '../../app/renderer/src/colour.ts';
import type { Colour, ColourFormat } from '../../app/renderer/src/colour.ts';

const BLACK: Colour = { r: 0, g: 0, b: 0, a: 1 };
const WHITE: Colour = { r: 255, g: 255, b: 255, a: 1 };
const RED: Colour = { r: 255, g: 0, b: 0, a: 1 };
const MID_GREY_767676: Colour = { r: 0x76, g: 0x76, b: 0x76, a: 1 };

function closeTo(actual: number, expected: number, tolerance: number, msg?: string): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, msg ?? `expected ${actual} within ${tolerance} of ${expected}`);
}

function coloursClose(a: Colour, b: Colour, tolerance = 1): void {
  closeTo(a.r, b.r, tolerance, `r: ${a.r} vs ${b.r}`);
  closeTo(a.g, b.g, tolerance, `g: ${a.g} vs ${b.g}`);
  closeTo(a.b, b.b, tolerance, `b: ${a.b} vs ${b.b}`);
}

// ---------------------------------------------------------------- hex

test('parses and formats 6-digit hex', () => {
  const c = parseColour('#ff8800');
  assert.deepEqual(c, { r: 255, g: 136, b: 0, a: 1 });
  assert.equal(formatColour(c!, 'hex'), '#ff8800');
});

test('parses short 3-digit hex by digit doubling', () => {
  const c = parseColour('#f80');
  assert.deepEqual(c, { r: 255, g: 136, b: 0, a: 1 });
});

test('parses 8-digit hex with alpha and formats it back', () => {
  const c = parseColour('#ff880080');
  assert.ok(c);
  assert.equal(c!.r, 255);
  assert.equal(c!.g, 136);
  assert.equal(c!.b, 0);
  closeTo(c!.a, 128 / 255, 0.01);
  assert.equal(formatColour(c!, 'hex'), '#ff880080');
});

test('parses 4-digit short hex with alpha', () => {
  const c = parseColour('#f808');
  assert.ok(c);
  closeTo(c!.a, 0x88 / 255, 0.01);
});

test('hex parsing is case-insensitive and tolerant of a missing #', () => {
  assert.deepEqual(parseColour('#FF8800'), parseColour('ff8800'));
});

// ---------------------------------------------------------------- rgb/rgba

test('parses rgb() and rgba() with commas and with spaces', () => {
  assert.deepEqual(parseColour('rgb(255, 136, 0)'), { r: 255, g: 136, b: 0, a: 1 });
  assert.deepEqual(parseColour('rgb(255 136 0)'), { r: 255, g: 136, b: 0, a: 1 });
  const withAlpha = parseColour('rgba(255, 136, 0, 0.5)');
  assert.ok(withAlpha);
  assert.equal(withAlpha!.a, 0.5);
});

test('formats rgb with and without alpha', () => {
  assert.equal(formatColour(RED, 'rgb'), 'rgb(255, 0, 0)');
  assert.equal(formatColour({ ...RED, a: 0.4 }, 'rgb'), 'rgba(255, 0, 0, 0.4)');
});

// ---------------------------------------------------------------- hsl/hsla

test('parses and round-trips hsl', () => {
  const c = parseColour('hsl(24, 100%, 50%)');
  assert.ok(c);
  coloursClose(c!, { r: 255, g: 102, b: 0, a: 1 }, 2);
  const back = parseColour(formatColour(c!, 'hsl'));
  coloursClose(back!, c!, 1);
});

test('hsla alpha is preserved through parse and format', () => {
  const c = parseColour('hsla(200, 50%, 50%, 0.25)');
  assert.ok(c);
  assert.equal(c!.a, 0.25);
  const formatted = formatColour(c!, 'hsl');
  assert.match(formatted, /^hsla\(/);
  const back = parseColour(formatted);
  closeTo(back!.a, 0.25, 0.01);
});

// ---------------------------------------------------------------- hsv/hsb

test('parses hsv and hsb identically', () => {
  const a = parseColour('hsv(120, 100%, 100%)');
  const b = parseColour('hsb(120, 100%, 100%)');
  assert.deepEqual(a, b);
  coloursClose(a!, { r: 0, g: 255, b: 0, a: 1 }, 2);
});

test('hsv round-trips through format and parse', () => {
  const original: Colour = { r: 200, g: 60, b: 180, a: 1 };
  const formatted = formatColour(original, 'hsv');
  const back = parseColour(formatted);
  coloursClose(back!, original, 1);
});

// ---------------------------------------------------------------- hwb

test('parses hwb and reports lossy alpha via the slash form', () => {
  const c = parseColour('hwb(90 10% 10%)');
  assert.ok(c);
  const withAlpha = { ...c!, a: 0.6 };
  const formatted = formatColour(withAlpha, 'hwb');
  assert.match(formatted, /\/ 0\.6/);
  const back = parseColour(formatted);
  closeTo(back!.a, 0.6, 0.01);
});

test('hwb round-trips', () => {
  const original: Colour = { r: 40, g: 200, b: 90, a: 1 };
  const back = parseColour(formatColour(original, 'hwb'));
  coloursClose(back!, original, 1);
});

// ---------------------------------------------------------------- cmyk

test('cmyk of pure red is 0,100,100,0', () => {
  const formatted = formatColour(RED, 'cmyk');
  assert.match(formatted, /^cmyk\(0%, 100%, 100%, 0%\)$/);
});

test('cmyk round-trips to rgb and is reported lossy for alpha', () => {
  const original: Colour = { r: 30, g: 90, b: 210, a: 1 };
  const formatted = formatColour(original, 'cmyk');
  assert.doesNotMatch(formatted, /a/i, 'cmyk format string should carry no alpha component');
  const back = parseColour(formatted);
  coloursClose(back!, original, 1);
});

// ---------------------------------------------------------------- lab / lch

test('lab and lch round-trip through parse/format', () => {
  const original: Colour = { r: 120, g: 200, b: 60, a: 1 };
  const labBack = parseColour(formatColour(original, 'lab'));
  coloursClose(labBack!, original, 1);
  const lchBack = parseColour(formatColour(original, 'lch'));
  coloursClose(lchBack!, original, 1);
});

test('black and white have Lab lightness 0 and 100', () => {
  const blackLab = formatColour(BLACK, 'lab');
  const whiteLab = formatColour(WHITE, 'lab');
  const [blackL] = blackLab.replace('lab(', '').replace(')', '').split(',').map(Number);
  const [whiteL] = whiteLab.replace('lab(', '').replace(')', '').split(',').map(Number);
  closeTo(blackL, 0, 0.5);
  closeTo(whiteL, 100, 0.5);
});

// ---------------------------------------------------------------- oklab / oklch

test('oklab and oklch round-trip through parse/format', () => {
  const original: Colour = { r: 10, g: 140, b: 240, a: 1 };
  const oklabBack = parseColour(formatColour(original, 'oklab'));
  coloursClose(oklabBack!, original, 1);
  const oklchBack = parseColour(formatColour(original, 'oklch'));
  coloursClose(oklchBack!, original, 1);
});

// ---------------------------------------------------------------- named colours

test('named colours parse to their rgb value', () => {
  assert.deepEqual(parseColour('red'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseColour('Coral'), { r: 255, g: 127, b: 80, a: 1 });
  assert.deepEqual(parseColour('  navy  '), { r: 0, g: 0, b: 128, a: 1 });
});

test('formatColour returns the exact name for an exact match, and hex otherwise', () => {
  assert.equal(formatColour({ r: 255, g: 127, b: 80, a: 1 }, 'name'), 'coral');
  assert.equal(formatColour({ r: 1, g: 2, b: 3, a: 1 }, 'name'), '#010203');
});

// ---------------------------------------------------------------- translate

test('translate produces every format from one pasted value', () => {
  const result = translate('#ff8800');
  assert.ok(result);
  const formats: ColourFormat[] = ['hex', 'rgb', 'hsl', 'hsv', 'hwb', 'cmyk', 'lab', 'lch', 'oklab', 'oklch', 'name'];
  for (const format of formats) {
    assert.ok(typeof result![format] === 'string' && result![format].length > 0, `missing ${format}`);
  }
  assert.equal(result!.hex, '#ff8800');
});

test('translate returns undefined for garbage input', () => {
  assert.equal(translate('not-a-colour'), undefined);
});

// ---------------------------------------------------------------- round-trip stability across every format

test('round-trip stability: parsing a formatted value returns the same colour within one unit per channel', () => {
  const samples: Colour[] = [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
    { r: 255, g: 0, b: 0, a: 1 },
    { r: 0, g: 255, b: 0, a: 1 },
    { r: 0, g: 0, b: 255, a: 1 },
    { r: 123, g: 45, b: 200, a: 1 },
    { r: 17, g: 200, b: 90, a: 1 },
  ];
  const formats: ColourFormat[] = ['hex', 'rgb', 'hsl', 'hsv', 'hwb', 'cmyk', 'lab', 'lch', 'oklab', 'oklch'];
  for (const sample of samples) {
    for (const format of formats) {
      const formatted = formatColour(sample, format);
      const back = parseColour(formatted);
      assert.ok(back, `failed to parse back ${format}: ${formatted}`);
      coloursClose(back!, sample, 1);
    }
  }
});

// ---------------------------------------------------------------- unparseable input

test('an unparseable string returns undefined rather than falling back to black', () => {
  assert.equal(parseColour(''), undefined);
  assert.equal(parseColour('   '), undefined);
  assert.equal(parseColour('definitely not a colour'), undefined);
  assert.equal(parseColour('rgb(1,2)'), undefined);
  assert.notDeepEqual(parseColour('garbage-input-xyz'), BLACK);
});

// ---------------------------------------------------------------- WCAG contrast — the three reference pairs

test('WCAG reference pair: black on white contrast ratio is exactly 21', () => {
  const ratio = contrastRatio(BLACK, WHITE);
  closeTo(ratio, 21, 0.001);
});

test('WCAG reference pair: white on white contrast ratio is exactly 1', () => {
  const ratio = contrastRatio(WHITE, WHITE);
  closeTo(ratio, 1, 0.0001);
});

test('WCAG reference pair: #767676 on white is just over 4.5', () => {
  const ratio = contrastRatio(MID_GREY_767676, WHITE);
  assert.ok(ratio > 4.5, `expected > 4.5, got ${ratio}`);
  closeTo(ratio, 4.54, 0.05);
});

test('relativeLuminance of black is 0 and white is 1', () => {
  closeTo(relativeLuminance(BLACK), 0, 0.0001);
  closeTo(relativeLuminance(WHITE), 1, 0.0001);
});

// ---------------------------------------------------------------- contrastVerdict boundaries

test('contrastVerdict at normal-text boundaries: 3 fails, 4.5 is AA, 7 is AAA', () => {
  assert.equal(contrastVerdict(2.9), 'fail');
  assert.equal(contrastVerdict(3), 'fail');
  assert.equal(contrastVerdict(4.5), 'AA');
  assert.equal(contrastVerdict(6.9), 'AA');
  assert.equal(contrastVerdict(7), 'AAA');
  assert.equal(contrastVerdict(21), 'AAA');
});

test('contrastVerdict at large-text boundaries: 3 is AA, 4.5 is AAA', () => {
  assert.equal(contrastVerdict(2.9, true), 'fail');
  assert.equal(contrastVerdict(3, true), 'AA');
  assert.equal(contrastVerdict(4.4, true), 'AA');
  assert.equal(contrastVerdict(4.5, true), 'AAA');
});

// ---------------------------------------------------------------- gamut honesty

test('an LCH colour outside sRGB is detected as out of gamut', () => {
  // Very high chroma green-ish LCH is not representable in sRGB.
  assert.equal(isOutOfGamut('lch', 'lch(90, 130, 140)'), true);
});

test('an ordinary in-gamut LCH colour is not flagged out of gamut', () => {
  const inGamut = formatColour(RED, 'lch');
  assert.equal(isOutOfGamut('lch', inGamut), false);
});

test('clipToGamut clamps and reports whether clipping occurred', () => {
  const outOfRange: Colour = { r: 300, g: -20, b: 128, a: 1 };
  const result = clipToGamut(outOfRange);
  assert.equal(result.clipped, true);
  assert.equal(result.colour.r, 255);
  assert.equal(result.colour.g, 0);
  assert.equal(result.colour.b, 128);

  const inRange: Colour = { r: 10, g: 20, b: 30, a: 1 };
  const result2 = clipToGamut(inRange);
  assert.equal(result2.clipped, false);
  assert.deepEqual(result2.colour, inRange);
});

// ---------------------------------------------------------------- rainbow sentinel

test('the rainbow sentinel is recognised by isRainbow', () => {
  assert.equal(isRainbow(RAINBOW), true);
  assert.equal(isRainbow('#ff0000'), false);
  assert.equal(isRainbow('rainbow'), false);
});

test('the rainbow sentinel is refused as a real colour by parseColour', () => {
  assert.equal(parseColour(RAINBOW), undefined);
});

test('rainbowDurationMs maps levels 1..5 to durations, fastest is shortest', () => {
  const durations = [1, 2, 3, 4, 5].map(rainbowDurationMs);
  for (let i = 1; i < durations.length; i += 1) {
    assert.ok(durations[i] < durations[i - 1], 'each higher level must be faster (shorter duration) than the last');
  }
  for (const d of durations) {
    assert.ok(d > 0);
  }
});

test('rainbowDurationMs refuses levels outside 1..5 by name', () => {
  assert.throws(() => rainbowDurationMs(0), /level/i);
  assert.throws(() => rainbowDurationMs(6), /level/i);
  assert.throws(() => rainbowDurationMs(2.5), /level/i);
});
