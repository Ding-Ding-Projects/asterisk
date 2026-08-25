import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  addedDeclarations,
  cellRect,
  declarationsOf,
  differingPixelsIn,
  msymIconsFrom,
  msymRules,
  opticalSizeFor,
  REMOVED_PIN,
  variantStylesheets,
} from '../../scripts/design-parity-msym-axes.mjs';
import { readVariationAxes, readWoff2Tables } from '../../scripts/woff2-fvar.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const CONSOLE_ROOT = join(REPO_ROOT, 'console');
const DESIGN_DOCUMENT = join(REPO_ROOT, 'design', 'Asterisk Console M3.dc.html');
const COMPILED_STYLESHEET = join(CONSOLE_ROOT, 'app', 'renderer', 'src', 'generated', 'design-styles.css');
const SYMBOLS_FACE = join(CONSOLE_ROOT, 'assets', 'fonts', 'material-symbols-outlined-100-700-0.woff2');

/* ------------------------------------------------------------------ the shipped font -- */

test('the shipped Material Symbols face is a real four-axis variable font', () => {
  const axes = readVariationAxes(readFileSync(SYMBOLS_FACE));
  assert.deepEqual(axes.map((axis) => axis.tag).sort(), ['FILL', 'GRAD', 'opsz', 'wght']);
  const byTag = Object.fromEntries(axes.map((axis) => [axis.tag, axis]));
  // The decision this whole probe exists to settle rests on these four defaults: three of the
  // pinned axes are pinned to the value the file already defaults to, and only opsz is not.
  assert.equal(byTag.FILL.default, 0);
  assert.equal(byTag.GRAD.default, 0);
  assert.equal(byTag.wght.default, 400);
  assert.equal(byTag.opsz.default, 24);
  assert.equal(byTag.opsz.minimum, 20);
  assert.equal(byTag.opsz.maximum, 48);
});

test('a single-axis face reads back with just its own axis', () => {
  const axes = readVariationAxes(readFileSync(join(CONSOLE_ROOT, 'assets', 'fonts', 'roboto-400-10.woff2')));
  assert.deepEqual(axes.map((axis) => axis.tag), ['wght']);
});

test('the woff2 reader fails closed on something that is not a woff2', () => {
  assert.throws(() => readWoff2Tables(Buffer.from('not a font at all, not even close to 48 bytes long here')), /not a WOFF2/);
});

/* ------------------------------------------------------------------- reading the rules -- */

test('the .msym class name is matched exactly, never as a prefix of another', () => {
  const css = '.msymbol { color:red; } .msym { color:green; } .not-msym-either { color:blue; }';
  assert.deepEqual(msymRules(css), ['color:green;']);
});

test('every .msym rule is returned, in source order', () => {
  assert.deepEqual(msymRules('.msym { a:1; }\n.msym { b:2; }'), ['a:1;', 'b:2;']);
});

test('a declaration whose value contains a colon survives the split', () => {
  assert.deepEqual(
    declarationsOf('background:url(http://example.test/x.png); color:red'),
    [{ property: 'background', value: 'url(http://example.test/x.png)' }, { property: 'color', value: 'red' }],
  );
});

test('the only declaration the compiler adds on top of the design is font-size', () => {
  const design = msymRules(readFileSync(DESIGN_DOCUMENT, 'utf8'));
  const compiled = msymRules(readFileSync(COMPILED_STYLESHEET, 'utf8'));
  assert.ok(design.length > 0, 'the design document declares at least one .msym rule');
  const added = addedDeclarations(design, compiled).map((declaration) => declaration.property);
  // Read from the real files rather than asserted against a typed copy: if the compiler ever
  // adds a third property, or drops one, this names it instead of quietly agreeing.
  assert.deepEqual(added, ['font-size']);
});

test('the design document declares no font-variation-settings anywhere', () => {
  assert.ok(!readFileSync(DESIGN_DOCUMENT, 'utf8').includes('font-variation-settings'));
});

test('the compiled stylesheet pins no variation axes on .msym', () => {
  // The guard the decision rests on. Measured: pinning opsz 24 overrides automatic optical
  // sizing on every icon the design draws at any size other than 24px, which is 95 of its 98
  // literal icons. A pin reintroduced here would silently change every icon in the product.
  for (const rule of msymRules(readFileSync(COMPILED_STYLESHEET, 'utf8'))) {
    assert.ok(!rule.includes('font-variation-settings'), `a .msym rule pins variation axes: ${rule}`);
  }
});

/* ------------------------------------------------------------------- reading the icons -- */

test('the design\'s literal icons are found, and its template-bound spans are not counted as icons', () => {
  const { icons, withoutInlineSize, templateBoundExpressions } = msymIconsFrom(readFileSync(DESIGN_DOCUMENT, 'utf8'));
  assert.ok(icons.length > 50, `expected the design to draw many literal icons, found ${icons.length}`);
  assert.equal(withoutInlineSize, 0, 'every .msym span in the design carries its own inline font-size');
  assert.ok(templateBoundExpressions.length > 0, 'the design does bind some icons through its template language');
  for (const icon of icons) assert.ok(!icon.glyph.includes('{{'), `a template binding reached the rendered set: ${icon.glyph}`);
  for (const expression of templateBoundExpressions) assert.ok(expression.includes('{{'));
});

test('a span with no inline font-size is counted rather than silently dropped', () => {
  const { icons, withoutInlineSize } = msymIconsFrom('<span class="msym">home</span><span class="msym" style="font-size:16px;">star</span>');
  assert.equal(withoutInlineSize, 1);
  assert.deepEqual(icons, [{ fontSizePx: 16, glyph: 'star' }]);
});

test('the same ligature at two sizes is two icons, and the same pair twice is one', () => {
  const { icons } = msymIconsFrom(
    '<span class="msym" style="font-size:16px;">home</span>'
    + '<span class="msym" style="font-size:24px;">home</span>'
    + '<span class="msym" style="font-size:16px;">home</span>',
  );
  assert.deepEqual(icons, [{ fontSizePx: 16, glyph: 'home' }, { fontSizePx: 24, glyph: 'home' }]);
});

/* ------------------------------------------------------------------------ the variants -- */

test('automatic optical sizing is the font-size clamped into the axis range', () => {
  const axis = { minimum: 20, default: 24, maximum: 48 };
  assert.equal(opticalSizeFor(14, axis), 20);
  assert.equal(opticalSizeFor(20, axis), 20);
  assert.equal(opticalSizeFor(24, axis), 24);
  assert.equal(opticalSizeFor(34, axis), 34);
  assert.equal(opticalSizeFor(74, axis), 48);
});

test('the clamped variant pins each icon at its own optical size and nothing else', () => {
  const sheets = variantStylesheets({
    designRules: ['color:red;'],
    shippedRules: ['color:green;'],
    icons: [{ fontSizePx: 14, glyph: 'home' }, { fontSizePx: 34, glyph: 'star' }],
    opszAxis: { minimum: 20, default: 24, maximum: 48 },
  });
  assert.ok(!sheets.design.includes('font-variation-settings'), 'the design variant carries no pin at all');
  assert.ok(!sheets.shipped.includes('font-variation-settings'), 'the shipped variant is whatever the compiled sheet says, and it says no pin');
  assert.ok(sheets.pinned.includes(REMOVED_PIN), 'the pinned variant carries the removed pin verbatim');
  // Built on the DESIGN's rules, so the pin is the only thing separating them from `design`.
  assert.ok(sheets.pinned.includes('color:red;') && !sheets.pinned.includes('color:green;'));
  assert.ok(sheets.clamped.includes('[data-cell="0"] { font-variation-settings:"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 20; }'));
  assert.ok(sheets.clamped.includes('[data-cell="1"] { font-variation-settings:"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 34; }'));
});

test('cells tile a fixed grid, so an icon whose metrics change cannot move a neighbour', () => {
  assert.deepEqual(cellRect(0), { x: 0, y: 0, width: 96, height: 96 });
  assert.deepEqual(cellRect(13), { x: 13 * 96, y: 0, width: 96, height: 96 });
  assert.deepEqual(cellRect(14), { x: 0, y: 96, width: 96, height: 96 });
});

/* -------------------------------------------------------------------- the pixel compare -- */

const image = (width, height, fill) => ({ width, height, pixels: Uint8ClampedArray.from({ length: width * height * 4 }, () => fill) });

test('an identical pair reports no differing pixels', () => {
  assert.equal(differingPixelsIn(image(4, 4, 7), image(4, 4, 7), { x: 0, y: 0, width: 4, height: 4 }), 0);
});

test('only pixels inside the rectangle are counted', () => {
  const a = image(4, 4, 0);
  const b = image(4, 4, 0);
  b.pixels[((3 * 4) + 3) * 4] = 255; // bottom-right pixel only
  assert.equal(differingPixelsIn(a, b, { x: 0, y: 0, width: 2, height: 2 }), 0);
  assert.equal(differingPixelsIn(a, b, { x: 0, y: 0, width: 4, height: 4 }), 1);
});

test('a difference in any single channel counts, alpha included', () => {
  for (const channel of [0, 1, 2, 3]) {
    const a = image(1, 1, 10);
    const b = image(1, 1, 10);
    b.pixels[channel] = 11;
    assert.equal(differingPixelsIn(a, b, { x: 0, y: 0, width: 1, height: 1 }), 1, `channel ${channel}`);
  }
});

/* ------------------------------------------------------------------- the recorded result -- */

test('the committed demonstration says the pin changed every icon that is not 24px, and that the shipped rules now converge', () => {
  const record = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'release', 'evidence', 'parity', 'msym-axis-pin.json'), 'utf8'));
  assert.equal(record.wholeFrame.designVersusShipped, 0,
    'the shipped .msym rules must draw the design\'s icons pixel-for-pixel; this is the convergence the pin\'s removal was for');
  assert.equal(record.wholeFrame.designVersusClamped, 0,
    'the unpinned rendering is the pin at each icon\'s own optical size; if this is not zero the mechanism is not what the record says it is');
  assert.ok(record.wholeFrame.designVersusPinned > 0, 'the pin changed pixels, which is why it went');
  assert.ok(record.bySize.length > 0, 'an empty size list would make every assertion below vacuous');
  let sizesOtherThan24 = 0;
  for (const size of record.bySize) {
    assert.equal(size.iconsStillDifferingWhenShipped, 0, `${size.fontSizePx}px still differs from the design as shipped`);
    if (size.opticalSizeWhenAutomatic === 24) {
      assert.equal(size.iconsDifferingFromThePin, 0, `${size.fontSizePx}px resolves opsz to 24, so the pin was a no-op there`);
    } else {
      sizesOtherThan24 += 1;
      assert.equal(size.iconsDifferingFromThePin, size.icons,
        `${size.fontSizePx}px resolves opsz to ${size.opticalSizeWhenAutomatic}, so every icon at that size differed from a pinned 24`);
    }
  }
  assert.ok(sizesOtherThan24 > 10, `only ${sizesOtherThan24} icon sizes are not 24px, which is too few for this record to be the one it claims to be`);
});
