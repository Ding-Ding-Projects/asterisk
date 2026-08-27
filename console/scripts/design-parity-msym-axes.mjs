#!/usr/bin/env node
/**
 * Demonstrates, in pixels, what the compiler's `.msym` axis pin actually does to the icons.
 *
 * The question this answers is narrow and had been carried for several passes on the strength
 * of a named mechanism nobody had rendered: `compile-design.mjs` appends
 * `font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 24` to its `.msym` rule, the
 * design declares no such property anywhere, and `statusCell`'s measured divergence is
 * concentrated on the Material Symbols glyphs. That is a hypothesis, not a finding, and the
 * two are easy to confuse because the hypothesis is plausible enough to act on.
 *
 * So this renders the icons rather than reasoning about them. Every icon the design draws --
 * each distinct (font-size, ligature) pair, taken out of the design document itself -- is
 * drawn four times in one Chromium at the capture tuple's own device metrics, from the same
 * local font file the application ships:
 *
 *   design   the design's own `.msym` rules, verbatim, and nothing else
 *   shipped  every `.msym` rule in the compiled stylesheet, verbatim -- what the app draws
 *   pinned   the design's rules plus the axis pin that was removed, verbatim
 *   clamped  the design's rules plus that pin with `opsz` set per icon to
 *            clamp(font-size, axis minimum, axis maximum)
 *
 * `design` against `shipped` is the convergence check: after the pin's removal the shipped
 * stylesheet must draw the design's icons pixel-for-pixel, and if it ever stops doing so this
 * says by how much. `design` against `pinned` is what the pin was worth. `clamped` is the
 * mechanism, and is the part worth having: CSS `font-optical-sizing` defaults to `auto`, which
 * drives the `opsz` axis from the used font-size, and `font-variation-settings` outranks it.
 * `clamped` being pixel-identical to `design` says the unpinned rendering IS the pin at each
 * icon's own optical size, so the divergence was exactly the distance to a fixed 24.
 *
 * One thing here is typed rather than read, deliberately: the pin itself, in `REMOVED_PIN`.
 * It is the treatment this experiment applies rather than a fact about the tree, and it no
 * longer exists in any file to read it from. A test asserts the shipped stylesheet does not
 * carry it, so it cannot quietly become live again while this file goes on calling it removed.
 *
 * Everything else comes out of its real source: both rule sets out of their own files, the
 * icons out of the design document, and the axis ranges out of the shipped WOFF2's own `fvar`
 * table. A copy of any of those would drift and nothing would say so.
 *
 * Usage:
 *   node scripts/design-parity-msym-axes.mjs --port=N
 *
 * `--port` is the loopback debugging port of an ALREADY-RUNNING browser on an off-screen
 * desktop, exactly like design-parity-capture-run.mjs: this script never launches a browser
 * and never touches the visible desktop.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connectCdp, sleep } from './design-parity-cdp.mjs';
import { decodePNG } from './png-codec.mjs';
import { readVariationAxes } from './woff2-fvar.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONSOLE_ROOT = resolve(REPO_ROOT, 'console');
const DESIGN_DOCUMENT = join(REPO_ROOT, 'design', 'Asterisk Console M3.dc.html');
const COMPILED_STYLESHEET = join(CONSOLE_ROOT, 'app', 'renderer', 'src', 'generated', 'design-styles.css');
const FONT_DIR = join(CONSOLE_ROOT, 'assets', 'fonts');
const EVIDENCE = join(CONSOLE_ROOT, 'release', 'evidence', 'parity', 'msym-axis-pin.json');

/**
 * The declaration `compile-design.mjs` used to append to its `.msym` rule, verbatim.
 *
 * Typed rather than read because it is the treatment under test and there is nothing left to
 * read it from. `msym-axis-pin.test.mjs` asserts the shipped stylesheet carries no
 * `font-variation-settings` on `.msym`, so this cannot drift back into being a description of
 * the live rule while still being called the removed one.
 */
export const REMOVED_PIN = 'font-variation-settings:"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;';

/** The capture tuple's own metrics, so this renders at the size the parity captures do. */
const VIEWPORT = { width: 1440, height: 1000, scale: 1 };
/** One icon per cell, at a fixed origin, so a metrics change cannot move a neighbour. */
const CELL = 96;
const CELL_INSET = 4;
const COLUMNS = 14;

/* ------------------------------------------------------------------- reading the inputs -- */

/**
 * Every `.msym` rule in a stylesheet, in source order, as raw declaration text.
 *
 * Anchored so that `.msymbol` cannot satisfy it: the class name must be followed by
 * whitespace or the opening brace. A looser match would silently pick up a differently-named
 * rule and compare something nobody asked about.
 */
export function msymRules(css) {
  const rules = [];
  const pattern = /(^|[^\w.-])\.msym(?=[\s{])\s*\{([^}]*)\}/g;
  let match = pattern.exec(css);
  while (match) {
    rules.push(match[2].trim());
    match = pattern.exec(css);
  }
  return rules;
}

/**
 * The declarations the compiler adds on top of the design's own `.msym` rules.
 *
 * Returned rather than assumed, because the whole question is what the added rule contributes
 * and an assumption about that is the thing being tested.
 */
export function addedDeclarations(designRules, compiledRules) {
  const designProperties = new Set(designRules.flatMap((rule) => declarationsOf(rule).map((d) => d.property)));
  const added = [];
  for (const rule of compiledRules) {
    for (const declaration of declarationsOf(rule)) {
      if (!designProperties.has(declaration.property)) added.push(declaration);
    }
  }
  return added;
}

/** `a:b; c:d;` -> [{property,value}]. Splits on the FIRST colon so a value containing one survives. */
export function declarationsOf(rule) {
  return rule.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const at = part.indexOf(':');
    return { property: part.slice(0, at).trim(), value: part.slice(at + 1).trim() };
  });
}

/**
 * Every distinct (font-size, ligature) icon the design draws literally, first-seen order.
 *
 * Two kinds of span are counted and NOT rendered, because rendering them would put a number
 * in this record that does not mean what its name says:
 *
 *   - A span whose text is a template binding (`{{ a.icon }}`) has no glyph in the document
 *     at all; its ligature is chosen when the design's runtime evaluates the expression. Left
 *     in, it renders as literal text through whatever the font does with those characters --
 *     which is not nothing, since a ligature font carries the Latin letters its ligatures are
 *     built from -- and 36 such cells contributed 86 differing pixels to an earlier run of
 *     this probe under the heading "icons". They are counted separately and said to be
 *     uncovered rather than quietly included or quietly dropped.
 *   - A span with no inline font-size would inherit one, and is the only kind the compiler's
 *     added `font-size:24px` could reach. The design has none, and the count is returned so a
 *     future design that grows one cannot slip past unnoticed.
 */
export function msymIconsFrom(html) {
  const pattern = /<span([^>]*class="msym"[^>]*)>([^<]*)<\/span>/g;
  const seen = new Set();
  const icons = [];
  const templateBound = new Set();
  let withoutInlineSize = 0;
  let match = pattern.exec(html);
  while (match) {
    const size = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(match[1]);
    const glyph = match[2].trim();
    if (!size) withoutInlineSize += 1;
    else if (glyph.includes('{{')) templateBound.add(glyph);
    else if (glyph) {
      const key = `${size[1]}|${glyph}`;
      if (!seen.has(key)) {
        seen.add(key);
        icons.push({ fontSizePx: Number(size[1]), glyph });
      }
    }
    match = pattern.exec(html);
  }
  icons.sort((a, b) => a.fontSizePx - b.fontSizePx || a.glyph.localeCompare(b.glyph));
  return { icons, withoutInlineSize, templateBoundExpressions: [...templateBound].sort() };
}

/** What `font-optical-sizing: auto` resolves `opsz` to for an icon of this size. */
export const opticalSizeFor = (fontSizePx, axis) => Math.min(Math.max(fontSizePx, axis.minimum), axis.maximum);

/* -------------------------------------------------------------------------- probe page -- */

/**
 * The four stylesheets under test, keyed by variant.
 *
 * `design` and `shipped` are the real rules, joined back into `.msym { ... }` blocks in their
 * own source order. `pinned` and `clamped` add the removed pin to the design's own rules --
 * to the DESIGN's rules rather than the shipped ones, so that the pin is the only thing
 * separating them from `design` and a future change to the compiled sheet cannot quietly
 * become part of what this attributes to the pin.
 */
export function variantStylesheets({ designRules, shippedRules, icons, opszAxis }) {
  const asRules = (rules) => rules.map((rule) => `.msym { ${rule} }`).join('\n');
  const perIcon = icons.map((icon, index) => {
    const opsz = opticalSizeFor(icon.fontSizePx, opszAxis);
    return `[data-cell="${index}"] { font-variation-settings:"FILL" 0, "wght" 400, "GRAD" 0, "opsz" ${opsz}; }`;
  }).join('\n');
  return {
    design: asRules(designRules),
    shipped: asRules(shippedRules),
    pinned: `${asRules(designRules)}\n.msym { ${REMOVED_PIN} }`,
    clamped: `${asRules(designRules)}\n.msym { ${REMOVED_PIN} }\n${perIcon}`,
  };
}

/** Where each icon's cell sits in the grid. Pure arithmetic, shared by the page and the diff. */
export function cellRect(index) {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { x: column * CELL, y: row * CELL, width: CELL, height: CELL };
}

function probePage(icons) {
  const cells = icons.map((icon, index) => {
    const { x, y } = cellRect(index);
    return `<div class="cell" style="left:${x}px; top:${y}px;">`
      + `<span class="msym" data-cell="${index}" style="font-size:${icon.fontSizePx}px;">${icon.glyph}</span>`
      + '</div>';
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face { font-family:'Material Symbols Outlined'; font-style:normal; font-weight:100 700; src:url("/font.woff2") format("woff2"); }
html, body { margin:0; padding:0; background:#000000; }
.cell { position:absolute; width:${CELL}px; height:${CELL}px; overflow:hidden; }
.cell .msym { position:absolute; left:${CELL_INSET}px; top:${CELL_INSET}px; color:#FFFFFF; }
</style>
<style id="variant"></style>
</head><body>${cells}
<script>
  window.__setVariant = function (css) {
    document.getElementById('variant').textContent = css;
    return document.getElementById('variant').textContent.length;
  };
  document.fonts.load('24px "Material Symbols Outlined"').then(function () { window.__fontReady = true; });
</script>
</body></html>`;
}

/** Serves the probe page and the one real font file it renders from. Nothing else. */
async function startProbeServer(icons) {
  const page = probePage(icons);
  const font = readFileSync(join(FONT_DIR, 'material-symbols-outlined-100-700-0.woff2'));
  const server = createServer((request, response) => {
    if (request.url.startsWith('/font.woff2')) {
      response.writeHead(200, { 'content-type': 'font/woff2', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      response.end(font);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(page);
  });
  await new Promise((ready, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ready); });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}

/* ---------------------------------------------------------------------------- comparing -- */

/** Differing pixels inside one rectangle of two same-sized decoded images. */
export function differingPixelsIn(a, b, rect) {
  let differing = 0;
  for (let y = rect.y; y < rect.y + rect.height && y < a.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width && x < a.width; x += 1) {
      const at = ((y * a.width) + x) * 4;
      if (a.pixels[at] !== b.pixels[at] || a.pixels[at + 1] !== b.pixels[at + 1]
        || a.pixels[at + 2] !== b.pixels[at + 2] || a.pixels[at + 3] !== b.pixels[at + 3]) differing += 1;
    }
  }
  return differing;
}

/* --------------------------------------------------------------------------------- run -- */

const argValue = (name, fallback) => {
  const hit = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

async function run(port) {
  const designSource = readFileSync(DESIGN_DOCUMENT, 'utf8');
  const compiledSource = readFileSync(COMPILED_STYLESHEET, 'utf8');
  const designRules = msymRules(designSource);
  const shippedRules = msymRules(compiledSource);
  if (designRules.length === 0 || shippedRules.length === 0) {
    throw new Error('design-parity-msym-axes: no .msym rule found in the design document or the compiled stylesheet');
  }
  const { icons, withoutInlineSize, templateBoundExpressions } = msymIconsFrom(designSource);
  if (icons.length === 0) throw new Error('design-parity-msym-axes: the design document declares no .msym icons');

  const axes = readVariationAxes(readFileSync(join(FONT_DIR, 'material-symbols-outlined-100-700-0.woff2')));
  const opszAxis = axes.find((axis) => axis.tag === 'opsz');
  if (!opszAxis) throw new Error('design-parity-msym-axes: the shipped Material Symbols face carries no opsz axis, so the pin cannot be doing what it is named as doing');

  const stylesheets = variantStylesheets({ designRules, shippedRules, icons, opszAxis });
  const server = await startProbeServer(icons);
  const cdp = await connectCdp(port);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: VIEWPORT.scale, mobile: false,
  });
  await cdp.send('Page.navigate', { url: server.origin });
  // The font is the whole experiment; photographing before it loads compares two fallbacks.
  for (let attempt = 0; attempt < 100 && !(await cdp.evaluate('window.__fontReady === true')); attempt += 1) await sleep(100);
  if (!(await cdp.evaluate('window.__fontReady === true'))) throw new Error('design-parity-msym-axes: the Material Symbols face never finished loading in the probe page');

  const shots = {};
  const resolved = {};
  for (const [variant, css] of Object.entries(stylesheets)) {
    const applied = await cdp.evaluate(`window.__setVariant(${JSON.stringify(css)})`);
    if (applied !== css.length) throw new Error(`design-parity-msym-axes: the '${variant}' stylesheet did not reach the page`);
    await sleep(250);
    // Read back what the page resolved WHILE this variant is the one applied. Reading once at
    // the end would report the last variant's answer under every variant's name, which is a
    // record that looks complete and says the same wrong thing three times.
    resolved[variant] = await cdp.evaluate(`(() => {
      const el = document.querySelector('[data-cell="0"]');
      const style = getComputedStyle(el);
      return { fontSize: style.fontSize, fontOpticalSizing: style.fontOpticalSizing, fontVariationSettings: style.fontVariationSettings };
    })()`);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    shots[variant] = decodePNG(Buffer.from(data, 'base64'));
  }
  cdp.close();
  await server.close();

  const perIcon = icons.map((icon, index) => {
    const rect = cellRect(index);
    return {
      ...icon,
      opticalSizeWhenAutomatic: opticalSizeFor(icon.fontSizePx, opszAxis),
      designVersusShipped: differingPixelsIn(shots.design, shots.shipped, rect),
      designVersusPinned: differingPixelsIn(shots.design, shots.pinned, rect),
      designVersusClamped: differingPixelsIn(shots.design, shots.clamped, rect),
    };
  });

  const bySize = new Map();
  for (const icon of perIcon) {
    const entry = bySize.get(icon.fontSizePx) ?? {
      fontSizePx: icon.fontSizePx, icons: 0, opticalSizeWhenAutomatic: icon.opticalSizeWhenAutomatic,
      iconsDifferingFromThePin: 0, pixelsThePinChanged: 0, iconsStillDifferingWhenShipped: 0,
    };
    entry.icons += 1;
    if (icon.designVersusPinned > 0) entry.iconsDifferingFromThePin += 1;
    if (icon.designVersusShipped > 0) entry.iconsStillDifferingWhenShipped += 1;
    entry.pixelsThePinChanged += icon.designVersusPinned;
    bySize.set(icon.fontSizePx, entry);
  }

  const whole = { x: 0, y: 0, width: shots.design.width, height: shots.design.height };
  const wholeFrame = {
    designVersusShipped: differingPixelsIn(shots.design, shots.shipped, whole),
    designVersusPinned: differingPixelsIn(shots.design, shots.pinned, whole),
    designVersusClamped: differingPixelsIn(shots.design, shots.clamped, whole),
  };

  return {
    generatedBy: 'console/scripts/design-parity-msym-axes.mjs',
    viewport: VIEWPORT,
    font: {
      file: 'console/assets/fonts/material-symbols-outlined-100-700-0.woff2',
      axes,
      note: 'Axes read from the shipped file\'s own fvar table, not from the stylesheet URL that requested them.',
    },
    rules: {
      design: designRules,
      shipped: shippedRules,
      addedByTheCompiler: addedDeclarations(designRules, shippedRules),
      removedPinUnderTest: REMOVED_PIN,
    },
    icons: {
      rendered: icons.length,
      withoutInlineFontSize: withoutInlineSize,
      templateBoundAndNotCovered: templateBoundExpressions,
      whatIsNotCovered: 'A template-bound span picks its ligature when the design runtime evaluates the expression, so this probe cannot know which glyph it draws. The mechanism it would be drawn through is the same one measured here; the pixel counts below simply do not include those spans.',
    },
    resolvedForTheFirstIcon: { ...resolved, whichIcon: icons[0] },
    wholeFrame,
    bySize: [...bySize.values()].sort((a, b) => a.fontSizePx - b.fontSizePx),
    perIcon,
  };
}

async function main() {
  const port = Number(argValue('port', '0'));
  if (!port) {
    console.error('usage: design-parity-msym-axes.mjs --port=N   (the loopback debugging port of an already-running off-screen browser)');
    process.exit(2);
  }
  const record = await run(port);
  mkdirSync(dirname(EVIDENCE), { recursive: true });
  writeFileSync(EVIDENCE, `${JSON.stringify({ generatedAt: new Date().toISOString(), ...record }, null, 2)}\n`);
  console.log(`icons: ${record.icons.rendered} distinct (font-size, ligature) pairs rendered`
    + `, ${record.icons.templateBoundAndNotCovered.length} template-bound expressions not covered`
    + `, ${record.icons.withoutInlineFontSize} without an inline font-size`);
  console.log(`whole frame  design vs shipped: ${record.wholeFrame.designVersusShipped} differing pixels`);
  console.log(`whole frame  design vs pinned : ${record.wholeFrame.designVersusPinned} differing pixels`);
  console.log(`whole frame  design vs clamped: ${record.wholeFrame.designVersusClamped} differing pixels`);
  for (const size of record.bySize) {
    console.log(`  ${String(size.fontSizePx).padStart(2)}px  opsz auto -> ${size.opticalSizeWhenAutomatic}`
      + `  ${size.iconsDifferingFromThePin}/${size.icons} differ from the pin (${size.pixelsThePinChanged} pixels)`
      + `, ${size.iconsStillDifferingWhenShipped} still differ as shipped`);
  }
  console.log(`\nwrote ${EVIDENCE.replace(REPO_ROOT, '').replace(/^[\\/]/, '')}`);
  if (!existsSync(EVIDENCE)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
