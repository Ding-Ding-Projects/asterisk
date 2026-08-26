#!/usr/bin/env node
/**
 * Where the mode picker's "half pixel" enters, measured rather than argued.
 *
 * THE QUESTION THIS ANSWERS, AND HOW IT CHANGED UNDER IT.
 *
 * The roadmap asked where a half-pixel box offset came from: on every one of the 32
 * destinations the built side appeared to draw the Beginner/Expert picker's 1px border split
 * across two rows where the design drew it crisp on one. That symptom is gone. It belonged to
 * comparing two browsers, because the reference used to run under headless Edge while the built
 * side ran under Electron, and it disappeared when both sides were retaken under one browser.
 * What survived is 555 differing pixels inside `statusCell`, the same count on all 32, entirely
 * in the text band. This script explains those.
 *
 * WHAT IT FOUND.
 *
 * The built application draws the INACTIVE mode button one weight step heavier than the design
 * does. Not because anything in the compiled markup says so, since the button declares
 * `font:inherit` and no weight on both sides, but because App.tsx's appearance system writes its
 * own default `font-weight: 500` onto the shell root at startup (`applyAppearanceToDom`, whose
 * default comes from `currentAppearanceValues`' `str('ap_weight', '500')`). Everything that
 * inherits its weight therefore renders at 500. The design declares the same 500 default for the
 * same control, but feeds it only to the Appearance screen's preview swatch; nothing writes it to
 * the root.
 *
 * `Expert` is the only text in this cell that inherits its weight, because the active button, the
 * credits pill and every icon set their own. That is why it is the only one that changes ink, and
 * why every other glyph in the cell is byte-identical between the two sides.
 *
 * AND THE OFFSET IS A CONSEQUENCE OF THAT, NOT A SEPARATE FAULT. At weight 500 the `Expert`
 * label measures 0.359375px wider, so the picker measures 0.359375px wider, and the status group
 * is packed against the right edge of the strip, so the picker's LEFT edge moves left by exactly
 * that much and everything inside it goes with it: the `check` glyph, the `Beginner` label and
 * the `Expert` label. The credits pill to its right does not move at all, which is why its own
 * Roboto digit is byte-identical while `Beginner`, which has the same font, the same size, the
 * same weight and the same declared colours, is not.
 *
 * That is also why the offset looked like it had nowhere to come from. Every one of those
 * rectangles still rounds to the same painted device pixel, because Chromium snaps a painted box
 * to whole device pixels and positions text at sub-pixel precision. Reading the boxes could never
 * have found this.
 *
 * So the half pixel is a third of a pixel, it is a font weight rather than a box offset, and it
 * enters through a default nobody chose in the design.
 *
 * THE DEMONSTRATION, AND WHY IT IS RE-CHECKABLE WITHOUT A BROWSER.
 *
 * `--reproduce` renders the checked-in design as the top-level document and photographs it
 * twice: once as it stands, and once with the four declarations `applyAppearanceToDom` writes
 * applied to its shell root. Both PNGs are committed. `--check` needs no browser at all: it
 * reads them back off disk and asserts that inside `statusCell` the first equals the committed
 * REFERENCE capture and the second equals the committed BUILT capture, both to zero differing
 * pixels. A claim that survives being re-derived from committed bytes is worth more than one
 * that only a live run could ever have seen.
 *
 * TWO HYPOTHESES THIS FALSIFIED, RECORDED SO NOBODY PAYS FOR THEM TWICE.
 *
 *   The capture harness's wrapper. The reference is photographed through an <iframe> inside a
 *   `transform: scale(1)` wrapper and the built side is not, which is exactly the shape of thing
 *   that moves text by fractions. Rendering the same design both ways in one session gives
 *   ZERO differing pixels in this cell. The wrapper contributes nothing.
 *
 *   The DOM shape. The design's runtime wraps every interpolated value in a
 *   `<span class="sc-interp">`; the compiled renderer emits a bare text node. Replacing the
 *   spans with text nodes changes no rectangle and no pixel.
 *
 * Usage:
 *   node scripts/design-parity-statuscell-text.mjs --check
 *   node scripts/design-parity-statuscell-text.mjs --reproduce --port=N [--server-port=N]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePNG } from './png-codec.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONSOLE_ROOT = resolve(REPO_ROOT, 'console');
const INVENTORY = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'inventories', 'design-parity.json'), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'design-reference', 'capture-manifest.generated.json'), 'utf8'));

/** Where the two reproduction frames live. Their own directory rather than beside the 96
 *  destination captures, because those are guarded one-per-destination against the run
 *  ledgers and these belong to no destination's ledger. */
export const REPRODUCTION_DIR = 'console/release/captures/parity/statuscell-text';
export const AS_DESIGNED_PNG = `${REPRODUCTION_DIR}/dash-design-as-designed.png`;
export const APPEARANCE_DEFAULTS_PNG = `${REPRODUCTION_DIR}/dash-design-with-appearance-defaults.png`;
export const EVIDENCE = 'console/release/evidence/parity/statuscell-text.json';

/**
 * The four declarations App.tsx's `applyAppearanceToDom` writes onto the shell root, with the
 * values `currentAppearanceValues` falls back to when the user has changed nothing.
 *
 * Kept beside the finding rather than only in prose so `--reproduce` applies the real thing and
 * `--check` can name what was applied. `sourceOf` is where each default is declared; a reader
 * who doubts any of these can open that line.
 */
export const APPEARANCE_DEFAULTS = [
  { property: 'color', value: 'hsl(148 54% 68%)', sourceOf: "num('ap_hue', 148) / num('ap_sat', 54) / num('ap_light', 68)" },
  { property: 'font-family', value: 'Roboto,sans-serif', sourceOf: "str('ap_family', 'Roboto')" },
  { property: 'font-weight', value: '500', sourceOf: "str('ap_weight', '500')" },
  { property: 'font-size', value: '14px', sourceOf: "num('ap_size', 14)" },
];

/* --------------------------------------------------------------------- pixel arithmetic -- */

/** True when two decoded frames agree on every channel of one pixel. */
export function samePixel(a, b, offset) {
  return a.pixels[offset] === b.pixels[offset]
    && a.pixels[offset + 1] === b.pixels[offset + 1]
    && a.pixels[offset + 2] === b.pixels[offset + 2]
    && a.pixels[offset + 3] === b.pixels[offset + 3];
}

/**
 * Every differing pixel inside one rectangle, as a count plus the columns and rows it occupies.
 *
 * Refuses mismatched frame sizes by name rather than comparing whatever overlaps: two captures
 * of different sizes are not two views of one thing, and a partial comparison of them reads as
 * a small divergence when it is really a different picture.
 */
export function differencesIn(a, b, rect) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`design-parity-statuscell-text: frame sizes differ (${a.width}x${a.height} against ${b.width}x${b.height})`);
  }
  const columns = new Set();
  const rows = new Set();
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (samePixel(a, b, ((y * a.width) + x) * 4)) continue;
      count += 1;
      columns.add(x);
      rows.add(y);
    }
  }
  return { count, columns: [...columns].sort((p, q) => p - q), rows: [...rows].sort((p, q) => p - q) };
}

/**
 * Contiguous columns collapsed into runs.
 *
 * The runs are the whole point of the localisation: three of them, and each one lands on a
 * single piece of text, which is what turns "555 pixels differ somewhere in this cell" into
 * "the check glyph, the Beginner label and the Expert label, and nothing else".
 */
export function columnRuns(columns) {
  if (columns.length === 0) return [];
  const runs = [];
  let start = columns[0];
  let previous = columns[0];
  for (const column of columns.slice(1)) {
    if (column === previous + 1) { previous = column; continue; }
    runs.push({ from: start, to: previous });
    start = column;
    previous = column;
  }
  runs.push({ from: start, to: previous });
  return runs;
}

/** The declared `statusCell` rectangle out of one destination's region ledger. */
export function statusCellRect(root, destinationId, read = readFileSync) {
  const path = resolve(root, INVENTORY.evidenceTemplates.regionLedger.replaceAll('{id}', destinationId));
  return JSON.parse(read(path, 'utf8')).areas.statusCell.union;
}

const capturePath = (root, key, id) => resolve(root, INVENTORY.evidenceTemplates[key].replaceAll('{id}', id));

/* ---------------------------------------------------------------------- the check stage -- */

/**
 * Re-derives the whole finding from committed bytes, and returns every problem it found.
 *
 * Returning problems rather than throwing on the first one means a run reports the complete
 * state of the evidence instead of the first thing that happened to be wrong, which is the
 * difference between "this needs regenerating" and "this one file is stale".
 */
export function checkStatusCellTextEvidence({
  root = REPO_ROOT,
  ids = MANIFEST.destinations.map((entry) => entry.id),
  read = readFileSync,
  exists = existsSync,
} = {}) {
  const problems = [];
  const load = (path) => decodePNG(read(path));

  const evidencePath = resolve(root, EVIDENCE);
  if (!exists(evidencePath)) {
    return { problems: [`${EVIDENCE} is absent; run --reproduce to take it`], destinations: [] };
  }
  const record = JSON.parse(read(evidencePath, 'utf8'));

  // 1. The 555 pixels, on every audited destination, in the same three column runs.
  const destinations = [];
  for (const id of ids) {
    const referencePath = capturePath(root, 'referenceCapture', id);
    const builtPath = capturePath(root, 'builtCapture', id);
    const ledgerPath = resolve(root, INVENTORY.evidenceTemplates.regionLedger.replaceAll('{id}', id));
    if (!exists(referencePath) || !exists(builtPath) || !exists(ledgerPath)) {
      // Said rather than thrown. A destination whose evidence has not been taken yet is a state
      // this project is genuinely in, and reporting it beside the ones that were taken is more
      // use than stopping the whole re-derivation on the first gap.
      problems.push(`${id}: a committed capture or its region ledger is absent, so the localisation cannot be re-derived`);
      continue;
    }
    const rect = statusCellRect(root, id, read);
    const { count, columns, rows } = differencesIn(load(referencePath), load(builtPath), rect);
    const runs = columnRuns(columns);
    destinations.push({ id, differingPixels: count, columnRuns: runs, rowRange: rows.length ? { from: rows[0], to: rows[rows.length - 1] } : null });
    if (count !== record.differingPixelsPerDestination) {
      problems.push(`${id}: statusCell differs by ${count} pixels, the record says ${record.differingPixelsPerDestination}`);
    }
    if (runs.length !== record.columnRuns.length || runs.some((run, i) => run.from !== record.columnRuns[i].from || run.to !== record.columnRuns[i].to)) {
      problems.push(`${id}: the differing columns are ${JSON.stringify(runs)}, the record says ${JSON.stringify(record.columnRuns)}`);
    }
  }

  // 2. The two reproduction frames, which are what make the finding checkable without a browser.
  const asDesigned = resolve(root, AS_DESIGNED_PNG);
  const withDefaults = resolve(root, APPEARANCE_DEFAULTS_PNG);
  if (!exists(asDesigned) || !exists(withDefaults)) {
    problems.push(`a reproduction frame is absent (${AS_DESIGNED_PNG} / ${APPEARANCE_DEFAULTS_PNG}); run --reproduce`);
    return { problems, destinations, record };
  }
  const witness = record.reproducedOn;
  const rect = statusCellRect(root, witness, read);
  const reference = load(capturePath(root, 'referenceCapture', witness));
  const built = load(capturePath(root, 'builtCapture', witness));
  const plain = load(asDesigned);
  const themed = load(withDefaults);

  const plainVsReference = differencesIn(plain, reference, rect).count;
  const themedVsBuilt = differencesIn(themed, built, rect).count;
  const themedVsReference = differencesIn(themed, reference, rect).count;
  if (plainVsReference !== 0) {
    problems.push(`the as-designed frame differs from the committed reference capture by ${plainVsReference} pixels in statusCell; it should be identical, or this rig is not rendering what the reference run rendered`);
  }
  if (themedVsBuilt !== 0) {
    problems.push(`applying the appearance defaults to the design leaves ${themedVsBuilt} pixels differing from the committed built capture in statusCell; the finding claims zero`);
  }
  if (themedVsReference !== record.differingPixelsPerDestination) {
    problems.push(`the themed frame differs from the reference by ${themedVsReference} pixels, not the ${record.differingPixelsPerDestination} the finding accounts for`);
  }

  // 3. The source the finding names must still say what it said.
  const appTsx = read(resolve(root, 'console/app/renderer/src/App.tsx'), 'utf8').replaceAll('\r\n', '\n');
  for (const anchor of record.sourceAnchors) {
    if (!appTsx.includes(anchor)) {
      problems.push(`App.tsx no longer contains ${JSON.stringify(anchor)} the recorded cause has moved or been repaired, and this evidence is now stale`);
    }
  }

  return { problems, destinations, record, measured: { plainVsReference, themedVsBuilt, themedVsReference } };
}

/* ------------------------------------------------------------------ the reproduce stage -- */

async function reproduce(port, serverPort) {
  const { connectCdp, pollUntil, sleep } = await import('./design-parity-cdp.mjs');
  const { startCaptureServer, DESIGN_HOST_PREFIX } = await import('./design-parity-server.mjs');
  const { routeInterceptedRequest } = await import('./design-parity-capture-run.mjs');

  const fontDir = join(CONSOLE_ROOT, 'assets', 'fonts');
  const fontManifest = JSON.parse(readFileSync(join(fontDir, 'manifest.json'), 'utf8'));
  const server = await startCaptureServer({ root: REPO_ROOT, port: serverPort });
  const stylesheet = readFileSync(join(fontDir, 'fonts.css'), 'utf8')
    .replaceAll(/url\("\.\/([^"]+)"\)/g, (_whole, file) => `url("${server.origin}/console/assets/fonts/${file}")`);
  const fontFiles = new Map(fontManifest.files.map((face) => [face.source, face.file]));
  const intercepted = { server: 0, 'font-stylesheet': 0, 'font-face': 0, blocked: 0 };
  const blockedUrls = new Set();

  const cdp = await connectCdp(port);
  cdp.on('Fetch.requestPaused', (event) => {
    const route = routeInterceptedRequest(event.request.url, {
      origin: server.origin, fontStylesheetUrl: fontManifest.stylesheetUrl, fontFiles,
    });
    intercepted[route.kind] += 1;
    const send = (method, params) => cdp.send(method, { requestId: event.requestId, ...params }).catch(() => {});
    if (route.method === 'Fetch.continueRequest') { send('Fetch.continueRequest', {}); return; }
    if (route.method === 'Fetch.failRequest') {
      blockedUrls.add(event.request.url.slice(0, 160));
      send('Fetch.failRequest', { errorReason: 'BlockedByClient' });
      return;
    }
    const body = route.body === 'stylesheet' ? Buffer.from(stylesheet, 'utf8') : readFileSync(join(fontDir, route.file));
    send('Fetch.fulfillRequest', {
      responseCode: 200,
      responseHeaders: [
        { name: 'content-type', value: route.body === 'stylesheet' ? 'text/css; charset=utf-8' : 'font/woff2' },
        { name: 'access-control-allow-origin', value: '*' },
      ],
      body: body.toString('base64'),
    });
  });

  const tuple = INVENTORY.captureContract.captureTuple;
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: tuple.width, height: tuple.height, deviceScaleFactor: tuple.scale, mobile: false,
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

  // The design as the TOP-LEVEL document. Deliberately not through the capture harness's
  // index.html: rendering it both ways is what proved the harness's iframe and identity
  // transform contribute nothing, and going direct removes them from this measurement too.
  const url = `${server.origin}${DESIGN_HOST_PREFIX}${encodeURIComponent('Asterisk Console M3.dc.html')}?theme=${encodeURIComponent(tuple.theme)}`;
  await cdp.send('Page.navigate', { url });

  const state = `(() => { const labels = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim());
    if (labels.includes('Skip setup')) return 'WIZARD';
    return labels.some((t) => t.endsWith('Beginner')) ? 'READY' : 0; })()`;
  await pollUntil(cdp.evaluate, state, { timeoutMs: 90_000, describe: 'the design booting as the top-level document' });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await cdp.evaluate(state) === 'READY') break;
    await cdp.evaluate(`(() => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Skip setup'); if (el) el.click(); return 1; })()`);
    await sleep(500);
  }
  if (await cdp.evaluate(state) !== 'READY') {
    cdp.close();
    await server.close();
    throw new Error("design-parity-statuscell-text: the design's first-run wizard never cleared");
  }
  await sleep(700);

  const measureExpression = readFileSync(join(HERE, 'design-parity-statuscell-measure.js'), 'utf8');
  const asDesignedMeasurement = await cdp.evaluate(measureExpression);

  mkdirSync(resolve(REPO_ROOT, REPRODUCTION_DIR), { recursive: true });
  const shoot = async (relativePath) => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const bytes = Buffer.from(data, 'base64');
    writeFileSync(resolve(REPO_ROOT, relativePath), bytes);
    return bytes.length;
  };
  const asDesignedBytes = await shoot(AS_DESIGNED_PNG);

  // Exactly what App.tsx writes, onto exactly the element it writes it to: the parent of the
  // 40px drag strip, which is `appearanceRootEl()`'s own rule expressed without the attribute
  // the design does not carry.
  const applyExpression = `(() => {
    const picker = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'checkBeginner').parentElement;
    let strip = picker;
    while (strip && Math.round(strip.getBoundingClientRect().height) !== 40) strip = strip.parentElement;
    if (!strip || !strip.parentElement) return 'no shell root';
    const root = strip.parentElement;
    ${APPEARANCE_DEFAULTS.map((d) => `root.style.setProperty(${JSON.stringify(d.property)}, ${JSON.stringify(d.value)});`).join('\n    ')}
    return 'applied';
  })()`;
  const applied = await cdp.evaluate(applyExpression);
  if (applied !== 'applied') {
    cdp.close();
    await server.close();
    throw new Error(`design-parity-statuscell-text: could not reach the design's shell root (${applied})`);
  }
  await sleep(500);
  const withDefaultsMeasurement = await cdp.evaluate(measureExpression);
  const withDefaultsBytes = await shoot(APPEARANCE_DEFAULTS_PNG);

  const record = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'console/scripts/design-parity-statuscell-text.mjs --reproduce',
    tuple,
    reproducedOn: 'dash',
    whyOneDestinationIsEnough: 'statusCell differs by the same 555 pixels in the same three column runs on all 32 audited destinations, so one witness carries the measurement and the check stage re-derives the count on every one of them anyway.',
    differingPixelsPerDestination: 555,
    columnRuns: [{ from: 1088, to: 1098 }, { from: 1106, to: 1154 }, { from: 1180, to: 1214 }],
    whatEachColumnRunIs: {
      '1088-1098': "the active button's Material Symbols `check` glyph",
      '1106-1154': "the active button's `Beginner` label",
      '1180-1214': "the inactive button's `Expert` label",
    },
    cause: "App.tsx's appearance system writes its own default font-weight 500 onto the shell root at startup, so every element that inherits its weight renders one step heavier than the design draws it. `Expert` is the only text in this cell that inherits; at 500 it measures 0.359375px wider, which widens the picker by the same amount, and because the status group is packed against the right edge of the strip the picker's left edge and everything inside it moves left by exactly that fraction.",
    sourceAnchors: [
      "weight: str('ap_weight', '500')",
      "root.style.setProperty('font-weight', weightVal)",
    ],
    appearanceDefaultsApplied: APPEARANCE_DEFAULTS,
    measurements: { asDesigned: JSON.parse(asDesignedMeasurement), withAppearanceDefaults: JSON.parse(withDefaultsMeasurement) },
    frames: {
      asDesigned: { path: AS_DESIGNED_PNG, bytes: asDesignedBytes },
      withAppearanceDefaults: { path: APPEARANCE_DEFAULTS_PNG, bytes: withDefaultsBytes },
    },
    target: 'design/Asterisk Console M3.dc.html served by design-parity-server.mjs as the top-level document, under Electron on an off-screen Windows desktop',
    interceptedRequests: intercepted,
    blockedUrls: [...blockedUrls],
    reachedTheNetwork: intercepted.blocked > 0 ? 'no every non-local request was refused; blockedUrls lists what' : 'no',
    falsified: [
      "the capture harness's <iframe> inside a `transform: scale(1)` wrapper: rendering the same design wrapped and unwrapped in one session gives zero differing pixels in statusCell",
      "the DOM shape: replacing the design runtime's `<span class=\"sc-interp\">` wrappers with bare text nodes, as the compiled renderer emits, changes no rectangle and no pixel",
    ],
    notClaimed: [
      'nothing is repaired here. The default is still 500 and the built application still renders every inheriting weight one step heavier than the design.',
      'this measures statusCell. The same default reaches every inheriting weight in the frame, and how much of the other areas it accounts for is not measured here.',
    ],
  };
  mkdirSync(dirname(resolve(REPO_ROOT, EVIDENCE)), { recursive: true });
  writeFileSync(resolve(REPO_ROOT, EVIDENCE), `${JSON.stringify(record, null, 2)}\n`);

  // Written before the teardown, not after. `server.close()` waits for the browser's
  // keep-alive sockets to drain and the browser has no reason to drop them, so a run that
  // tears down first takes both photographs, measures both states, and then hangs with
  // nothing recorded which looks exactly like a run that failed early.
  cdp.close();
  await Promise.race([server.close(), new Promise((done) => setTimeout(done, 3000))]);
  return record;
}

/* ------------------------------------------------------------------------------- main -- */

const argValue = (name, fallback) => {
  const hit = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

async function main() {
  if (process.argv.includes('--reproduce')) {
    const port = Number(argValue('port', '0'));
    if (!port) {
      console.error('design-parity-statuscell-text.mjs --reproduce needs --port=N, the loopback debugging port of an already-running target');
      process.exit(2);
    }
    const record = await reproduce(port, Number(argValue('server-port', '0')));
    console.log(`wrote ${AS_DESIGNED_PNG} (${record.frames.asDesigned.bytes} bytes)`);
    console.log(`wrote ${APPEARANCE_DEFAULTS_PNG} (${record.frames.withAppearanceDefaults.bytes} bytes)`);
    console.log(`wrote ${EVIDENCE}`);
    return;
  }

  const { problems, destinations, measured } = checkStatusCellTextEvidence();
  const counts = new Set(destinations.map((entry) => entry.differingPixels));
  console.log(`statusCell across ${destinations.length} destination(s): ${[...counts].join(', ')} differing pixel(s)`);
  if (measured) {
    console.log(`as-designed vs committed reference: ${measured.plainVsReference}`);
    console.log(`appearance defaults applied vs committed built: ${measured.themedVsBuilt}`);
    console.log(`appearance defaults applied vs committed reference: ${measured.themedVsReference}`);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  PROBLEM: ${problem}`);
    process.exit(1);
  }
  console.log('the statusCell text finding re-derives from the committed captures');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
