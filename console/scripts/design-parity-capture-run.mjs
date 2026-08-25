#!/usr/bin/env node
/**
 * Takes the reference-versus-built captures a design-parity row's evidence is made of, and
 * turns each pair into a visual diff plus a labelled side-by-side comparison.
 *
 * Three stages, each runnable on its own because they need different things running:
 *
 *   --side=reference --port=N   the design export, rendered by its own runtime, driven
 *                               through console/design-reference/index.html
 *   --side=built     --port=N   the real built renderer under Electron
 *   --side=diff                 no browser at all; reads the two PNG sets off disk
 *
 * Both browser stages connect to an ALREADY-RUNNING target on a loopback debugging port
 * rather than launching one, exactly like scripts/ui-drive/drive.mjs. The caller starts the
 * target on an off-screen Windows desktop; this script never touches the visible desktop,
 * and it refuses to drive anything unless the debugging port exposes exactly one page target.
 *
 * Why the reference stage blocks the network instead of merely not needing it: the design's
 * helmet asks Google Fonts for the exact stylesheet console/assets/fonts was downloaded from,
 * so a capture taken with the network up would render with remotely-fetched fonts while the
 * built side renders with the local copies — a difference in the evidence that came from the
 * harness rather than from either artifact. Every request is intercepted: the font stylesheet
 * is answered from console/assets/fonts/fonts.css with its URLs rewritten to the local files,
 * the capture server's own origin is allowed through, and everything else is refused and
 * counted. A run that reached the network says so in its ledger.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareCaptures } from './design-parity-diff.mjs';
import { connectCdp, pollUntil, sleep } from './design-parity-cdp.mjs';
import { startCaptureServer } from './design-parity-server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONSOLE_ROOT = resolve(REPO_ROOT, 'console');
const INVENTORY = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'inventories', 'design-parity.json'), 'utf8'));
const LABELS = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'design-reference', 'destination-labels.generated.json'), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'design-reference', 'capture-manifest.generated.json'), 'utf8'));
const FONT_DIR = join(CONSOLE_ROOT, 'assets', 'fonts');
const FONT_MANIFEST = JSON.parse(readFileSync(join(FONT_DIR, 'manifest.json'), 'utf8'));
const TUPLE = INVENTORY.captureContract.captureTuple;
const LEDGER_DIR = join(CONSOLE_ROOT, 'release', 'evidence', 'parity');

const artifactPath = (key, id) => resolve(REPO_ROOT, INVENTORY.evidenceTemplates[key].replaceAll('{id}', id));
const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');

function writeArtifact(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { bytes: bytes.length, sha256: sha256Of(bytes) };
}

/** `--only=a,b` narrows a run to named destinations — for smoke-testing one screen without
 *  re-driving all 32. Absent, every audited destination runs. */
function selectedDestinations() {
  const only = argValue('only');
  if (!only) return MANIFEST.destinations;
  const wanted = new Set(only.split(',').map((id) => id.trim()).filter(Boolean));
  const chosen = MANIFEST.destinations.filter((entry) => wanted.has(entry.id));
  const unknown = [...wanted].filter((id) => !chosen.some((entry) => entry.id === id));
  if (unknown.length > 0) throw new Error(`design-parity-capture-run: --only names destination(s) not in the manifest: ${unknown.join(', ')}`);
  return chosen;
}

function argValue(name, fallback) {
  const hit = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/* ------------------------------------------------------------------ font interception -- */

/**
 * The font stylesheet the design asks for, rewritten to point at the local face files.
 *
 * console/assets/fonts/manifest.json records the exact `stylesheetUrl` those 49 faces were
 * downloaded from, so the match is against a recorded fact rather than a guessed URL shape.
 */
function localFontStylesheet(origin) {
  const css = readFileSync(join(FONT_DIR, 'fonts.css'), 'utf8');
  return css.replaceAll(/url\("\.\/([^"]+)"\)/g, (_whole, file) => `url("${origin}/console/assets/fonts/${file}")`);
}

/** gstatic source URL -> local face filename, straight out of the download manifest. */
function fontFileByRemoteUrl() {
  return new Map(FONT_MANIFEST.files.map((face) => [face.source, face.file]));
}

/**
 * Answers every intercepted request. Returns the CDP method and params to send back, plus a
 * short classification for the ledger, so a run can state exactly what it let through.
 */
export function routeInterceptedRequest(url, { origin, fontStylesheetUrl, fontFiles }) {
  if (url.startsWith(`${origin}/`)) return { kind: 'server', method: 'Fetch.continueRequest' };
  if (url === fontStylesheetUrl || url.startsWith('https://fonts.googleapis.com/')) {
    return { kind: 'font-stylesheet', method: 'Fetch.fulfillRequest', body: 'stylesheet' };
  }
  const localFace = fontFiles.get(url);
  if (localFace) return { kind: 'font-face', method: 'Fetch.fulfillRequest', body: 'face', file: localFace };
  return { kind: 'blocked', method: 'Fetch.failRequest' };
}

/* -------------------------------------------------------------------- reference stage -- */

async function captureReferenceSide(port, serverPort) {
  const server = await startCaptureServer({ root: REPO_ROOT, port: serverPort });
  const fontFiles = fontFileByRemoteUrl();
  const stylesheet = localFontStylesheet(server.origin);
  const intercepted = { server: 0, 'font-stylesheet': 0, 'font-face': 0, blocked: 0 };
  const blockedUrls = new Set();

  const cdp = await connectCdp(port);
  cdp.on('Fetch.requestPaused', (event) => {
    const route = routeInterceptedRequest(event.request.url, {
      origin: server.origin, fontStylesheetUrl: FONT_MANIFEST.stylesheetUrl, fontFiles,
    });
    intercepted[route.kind] += 1;
    const send = (method, params) => cdp.send(method, { requestId: event.requestId, ...params }).catch(() => {});
    if (route.method === 'Fetch.continueRequest') { send('Fetch.continueRequest', {}); return; }
    if (route.method === 'Fetch.failRequest') {
      blockedUrls.add(event.request.url.slice(0, 160));
      send('Fetch.failRequest', { errorReason: 'BlockedByClient' });
      return;
    }
    const body = route.body === 'stylesheet' ? Buffer.from(stylesheet, 'utf8') : readFileSync(join(FONT_DIR, route.file));
    send('Fetch.fulfillRequest', {
      responseCode: 200,
      responseHeaders: [
        { name: 'content-type', value: route.body === 'stylesheet' ? 'text/css; charset=utf-8' : 'font/woff2' },
        { name: 'access-control-allow-origin', value: '*' },
      ],
      body: body.toString('base64'),
    });
  });

  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: TUPLE.width, height: TUPLE.height, deviceScaleFactor: TUPLE.scale, mobile: false,
  });

  const results = [];
  for (const entry of selectedDestinations()) {
    const url = `${server.origin}/${entry.referenceRoute}`;
    await cdp.send('Page.navigate', { url });
    let outcome;
    try {
      outcome = await pollUntil(
        cdp.evaluate,
        `(() => { if (!window.__captureTuple || window.__captureTuple.destination !== ${JSON.stringify(entry.id)}) return 0;
                  if (window.__captureError) return 'ERROR: ' + window.__captureError;
                  return window.__captureReady === true ? 'READY' : 0; })()`,
        { timeoutMs: 90_000, describe: `reference harness settling on '${entry.id}'` },
      );
    } catch (error) {
      outcome = `ERROR: ${error.message}`;
    }
    if (typeof outcome === 'string' && outcome.startsWith('ERROR')) {
      results.push({ id: entry.id, captured: false, reason: outcome });
      console.log(`reference ${entry.id}: ${outcome}`);
      continue;
    }
    // The design animates on entry; settle before photographing or two runs disagree.
    await sleep(700);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const written = writeArtifact(artifactPath('referenceCapture', entry.id), Buffer.from(data, 'base64'));
    results.push({ id: entry.id, captured: true, heading: entry.navigationPlan.settle.expectedHeading, ...written });
    console.log(`reference ${entry.id}: ${written.bytes} bytes`);
  }

  cdp.close();
  await server.close();
  return {
    side: 'reference',
    target: 'design/Asterisk Console M3.dc.html rendered by design/support.js with locally vendored React 18.3.1',
    tuple: TUPLE,
    interceptedRequests: intercepted,
    blockedUrls: [...blockedUrls],
    reachedTheNetwork: intercepted.blocked > 0 ? 'no — every non-local request was refused; the list above is what was refused' : 'no',
    captured: results.filter((r) => r.captured).length,
    failed: results.filter((r) => !r.captured).length,
    results,
  };
}

/* ------------------------------------------------------------------------ built stage -- */

/**
 * The same label rule the reference harness uses (design-reference/route.mjs's controlText /
 * controlLabel): strip the Material Symbols glyph spans, whose text is the icon NAME and
 * would otherwise prefix every label, then take the first line, because a section button
 * renders its live badge as a second line beneath its label. Both sides of a parity capture
 * must reach a destination by the same rule or they are not photographing the same thing.
 */
const LABEL_OF = `((el) => { const txt = (e) => { let t = '';
  for (const n of e.childNodes) { if (n.nodeType === 3) t += n.textContent;
    else if (n.nodeType === 1 && !(n.classList && n.classList.contains('msym'))) t += txt(n); } return t.trim(); };
  return txt(el).split('\\n')[0].trim(); })`;

/**
 * The same two-shape rule as the reference harness's controlMatchesLabel: the whole label, or
 * any single non-glyph child element whose own text is exactly the label. The design separates
 * a row's label and badge with a newline; the built renderer puts each in its own <span> and
 * separates them with nothing, so `Modules255` has no line to split and a first-line rule
 * quietly matches none of the badged destinations.
 */
const MATCHES_LABEL = `((el, wanted) => { const labelOf = ${LABEL_OF};
  if (labelOf(el) === wanted) return true;
  if ((el.getAttribute('aria-label') || '').trim() === wanted) return true;
  for (const child of el.children) {
    if (child.classList && child.classList.contains('msym')) continue;
    if ((child.textContent || '').trim() === wanted) return true;
  }
  return false; })`;

const CLICK_BY_TEXT = (text) => `(() => {
  const wanted = ${JSON.stringify(text)};
  const matches = ${MATCHES_LABEL};
  const el = [...document.querySelectorAll('button, [role=tab], a[href]')]
    .find((e) => matches(e, wanted) && (e.offsetWidth || e.offsetHeight) && !e.disabled);
  if (!el) return 0;
  el.click();
  return 1;
})()`;

/**
 * Clicks a rail by its Material Symbols glyph, preferring the button that also carries the
 * rail's own label — the same disambiguation the reference harness needs, and for the same
 * reason: `graphic_eq` is both the Media rail's glyph and the Live channels row's glyph, so
 * taking the first match walks into the section list instead of switching rails.
 */
const CLICK_RAIL = (icon, railLabel) => `(() => {
  const icon = ${JSON.stringify(icon)};
  const railLabel = ${JSON.stringify(railLabel)};
  const labelOf = ${LABEL_OF};
  const buttons = [...document.querySelectorAll('.msym, [class*=msym]')]
    .filter((s) => (s.textContent || '').trim() === icon)
    .map((s) => s.closest('button'))
    .filter(Boolean);
  const button = buttons.find((b) => labelOf(b) === railLabel) || buttons[0];
  if (!button) return 0;
  button.click();
  return 1;
})()`;

const HEADING = `(() => ((document.querySelector('h1') || {}).textContent || '').trim())()`;
/** Matches the reference harness's own retry shape (design-reference/route.mjs). */
const PLAN_ATTEMPTS = 6;
const SECTION_POLL_MS = 1500;
const HEADING_POLL_MS = 2500;

async function captureBuiltSide(port) {
  const cdp = await connectCdp(port);

  // Dismiss, then prove dismissed. An unverified dismissal is what produced 873 pictures of
  // a wizard the last time this repository photographed this application.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await cdp.evaluate(CLICK_BY_TEXT('Skip setup'));
    await sleep(700);
    const stillThere = await cdp.evaluate(`[...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup')`);
    if (!stillThere) break;
    if (attempt === 2) { cdp.close(); throw new Error('design-parity-capture-run: the onboarding wizard is still up; refusing to capture the built side'); }
  }
  await cdp.evaluate(CLICK_BY_TEXT('Later'));
  await sleep(400);

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: TUPLE.width, height: TUPLE.height, deviceScaleFactor: TUPLE.scale, mobile: false,
  });
  await sleep(500);

  const results = [];
  for (const entry of selectedDestinations()) {
    const label = LABELS.labels[entry.id];
    const rail = LABELS.rails[label.rail];
    // Every destination is reached from its own rail, exactly as its manifest plan says, with
    // no shortcut for "we are already on that rail". Both sides of a parity capture follow the
    // same self-contained plan, and this application derives the open rail from the ACTIVE
    // destination: a rail click that is not followed promptly by a section click snaps back to
    // wherever the current screen lives, so the two clicks are a tight pair rather than a
    // sequence with a polite pause in the middle.
    const failure = await (async () => {
      let last = 'never attempted';
      for (let attempt = 1; attempt <= PLAN_ATTEMPTS; attempt += 1) {
        if (!(await cdp.evaluate(CLICK_RAIL(rail.icon, rail.label)))) { last = `no rail button carrying the '${rail.icon}' glyph`; continue; }
        let clickedSection = 0;
        const sectionDeadline = Date.now() + SECTION_POLL_MS;
        while (!clickedSection && Date.now() < sectionDeadline) {
          clickedSection = await cdp.evaluate(CLICK_BY_TEXT(label.label));
        }
        if (!clickedSection) { last = `no visible enabled control labelled '${label.label}' appeared after clicking the ${rail.label} rail`; continue; }
        const headingDeadline = Date.now() + HEADING_POLL_MS;
        let heading = '';
        while (Date.now() < headingDeadline) {
          heading = await cdp.evaluate(HEADING);
          if (heading === label.title) return null;
          await sleep(80);
        }
        last = `heading settled on '${heading}', not '${label.title}'`;
      }
      return `${last} (after ${PLAN_ATTEMPTS} attempts)`;
    })();

    if (failure) {
      results.push({ id: entry.id, captured: false, reason: failure });
      console.log(`built ${entry.id}: ${failure}`);
      continue;
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const written = writeArtifact(artifactPath('builtCapture', entry.id), Buffer.from(data, 'base64'));
    results.push({ id: entry.id, captured: true, heading: label.title, ...written });
    console.log(`built ${entry.id}: ${written.bytes} bytes`);
  }

  cdp.close();
  return {
    side: 'built',
    target: 'console/dist built renderer under Electron on an off-screen Windows desktop',
    tuple: TUPLE,
    captured: results.filter((r) => r.captured).length,
    failed: results.filter((r) => !r.captured).length,
    results,
  };
}

/* ------------------------------------------------------------------------- diff stage -- */

/** Every file the built capture depends on, for compareCaptures' staleness check. */
function buildOutputMtimes() {
  const mtimes = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) walk(path);
      else mtimes.push(statSync(path).mtimeMs);
    }
  };
  walk(join(CONSOLE_ROOT, 'dist'));
  walk(join(CONSOLE_ROOT, 'dist-electron'));
  return mtimes;
}

function diffAll() {
  const sourceMtimes = buildOutputMtimes();
  const results = [];
  for (const entry of selectedDestinations()) {
    const referencePath = artifactPath('referenceCapture', entry.id);
    const builtPath = artifactPath('builtCapture', entry.id);
    if (!existsSync(referencePath) || !existsSync(builtPath)) {
      results.push({ id: entry.id, skipped: `${!existsSync(referencePath) ? 'reference' : 'built'} capture absent` });
      console.log(`diff ${entry.id}: skipped, a capture is absent`);
      continue;
    }
    const comparison = compareCaptures({
      reference: readFileSync(referencePath),
      built: readFileSync(builtPath),
      destinationId: entry.id,
      builtCaptureMtimeMs: statSync(builtPath).mtimeMs,
      builtSourceMtimesMs: sourceMtimes,
      sideBySide: true,
    });
    const { sideBySideBuffer, ...record } = comparison;
    writeArtifact(artifactPath('sideBySide', entry.id), sideBySideBuffer);
    writeArtifact(artifactPath('visualDiff', entry.id), Buffer.from(`${JSON.stringify({
      ...record,
      generatedBy: 'console/scripts/design-parity-capture-run.mjs --side=diff',
      tuple: TUPLE,
      referenceCapture: INVENTORY.evidenceTemplates.referenceCapture.replaceAll('{id}', entry.id),
      builtCapture: INVENTORY.evidenceTemplates.builtCapture.replaceAll('{id}', entry.id),
    }, null, 2)}\n`, 'utf8'));
    results.push({ id: entry.id, verdict: record.verdict, diffPercentage: record.diffPercentage, reasons: record.reasons });
    console.log(`diff ${entry.id}: ${record.verdict}${record.diffPercentage == null ? '' : ` (${record.diffPercentage.toFixed(2)}% of pixels differ)`}`);
  }
  const verdicts = {};
  for (const result of results) {
    const key = result.skipped ? 'skipped' : result.verdict;
    verdicts[key] = (verdicts[key] ?? 0) + 1;
  }
  return { side: 'diff', tuple: TUPLE, verdicts, results };
}

/* ------------------------------------------------------------------------------ main -- */

async function main() {
  const side = argValue('side');
  const port = Number(argValue('port', '0'));
  if (!['reference', 'built', 'diff'].includes(side)) {
    console.error('usage: design-parity-capture-run.mjs --side=reference|built|diff [--port=N]');
    process.exit(2);
  }
  if (side !== 'diff' && !port) {
    console.error(`design-parity-capture-run.mjs --side=${side} needs --port=N, the loopback debugging port of an already-running target`);
    process.exit(2);
  }

  const ledger = side === 'reference' ? await captureReferenceSide(port, Number(argValue('server-port', '0')))
    : side === 'built' ? await captureBuiltSide(port)
      : diffAll();
  mkdirSync(LEDGER_DIR, { recursive: true });
  writeFileSync(join(LEDGER_DIR, `run-${side}.json`), `${JSON.stringify({ generatedAt: new Date().toISOString(), ...ledger }, null, 2)}\n`);
  console.log(`\nwrote console/release/evidence/parity/run-${side}.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
