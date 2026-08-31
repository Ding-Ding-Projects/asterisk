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
import { execFileSync } from 'node:child_process';
import { compareCaptures } from './design-parity-diff.mjs';
import { compareChrome } from './design-parity-chrome.mjs';
import { captureTuplesEqual } from './design-parity-contract.mjs';
import { BUILT_REGION_PROBE, REFERENCE_REGION_PROBE, buildRegionLedger, maskFromLedger } from './design-parity-regions.mjs';
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
const SOURCE_COMMIT = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const artifactPath = (key, id) => resolve(REPO_ROOT, INVENTORY.evidenceTemplates[key].replaceAll('{id}', id));
const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Where one side's raw region measurements live between the run that took them and the chrome stage. */
const regionMeasurementsPath = (side) => join(LEDGER_DIR, `regions-${side}.json`);

/**
 * Writes one side's region measurements, merging into whatever that side already recorded.
 *
 * Merging rather than replacing is what lets `--only` narrow a region run without throwing
 * away the other thirty destinations' measurements — the same courtesy `--only` already
 * gets from the capture stages, which write one PNG per destination rather than one file
 * for the set.
 */
function writeRegionMeasurements(side, target, measurements) {
  mkdirSync(LEDGER_DIR, { recursive: true });
  const path = regionMeasurementsPath(side);
  let previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  if (previous.sourceCommit !== SOURCE_COMMIT) previous = {};
  else {
    try { captureTuplesEqual(TUPLE, previous.tuple, `${side} region measurement tuple`); }
    catch { previous = {}; }
  }
  const merged = { ...(previous.measurements ?? {}), ...measurements };
  writeFileSync(path, `${JSON.stringify({
    generatedAt: new Date().toISOString(), generatedBy: 'console/scripts/design-parity-capture-run.mjs',
    sourceCommit: SOURCE_COMMIT, side, target, tuple: TUPLE, measurements: merged,
  }, null, 2)}\n`);
  return Object.keys(merged).length;
}

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

/**
 * `--regions-only` drives a side to every destination and measures its region rectangles
 * without photographing anything.
 *
 * It exists so the chrome-parity bar can be applied to captures that are already committed:
 * re-photographing them to obtain a mask would replace the very evidence being measured,
 * and a mask taken from one render against pixels from another is exactly the staleness
 * this harness refuses everywhere else.
 */
const regionsOnly = () => process.argv.includes('--regions-only');

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
  const measurements = {};
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
    // Measured while the screen is settled and before anything else touches it, so the
    // rectangles and the pixels are the same moment of the same render rather than two
    // visits that happen to agree.
    measurements[entry.id] = await cdp.evaluate(REFERENCE_REGION_PROBE);
    if (regionsOnly()) {
      results.push({ id: entry.id, captured: false, regionsOnly: true, reason: 'run made with --regions-only; no capture was taken and none was expected' });
      console.log(`reference ${entry.id}: regions measured, no capture (--regions-only)`);
      continue;
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const written = writeArtifact(artifactPath('referenceCapture', entry.id), Buffer.from(data, 'base64'));
    results.push({ id: entry.id, captured: true, heading: entry.navigationPlan.settle.expectedHeading, ...written });
    console.log(`reference ${entry.id}: ${written.bytes} bytes`);
  }

  cdp.close();
  await server.close();
  const regionCount = writeRegionMeasurements('reference', 'design/Asterisk Console M3.dc.html rendered by design/support.js', measurements);
  return {
    side: 'reference',
    regionsMeasuredThisRun: Object.keys(measurements).length,
    regionsOnDisk: regionCount,
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

/**
 * Whether the update banner is currently occupying the top of the window, and its `Later`.
 *
 * The banner is raised by the updater's own background check, which completes at whatever
 * moment it completes — not at startup. A single dismissal before the first destination is
 * therefore a bet, and it is a bet this harness lost: an entire 32-destination run was taken
 * with the banner up, pushing the application's shell 43px down the frame on the first
 * twenty-two destinations and 52px down on the last ten as the banner's text rewrapped. The
 * captures looked completely normal. Nothing failed.
 *
 * So it is cleared before every destination, and proved cleared, exactly as the onboarding
 * wizard already is.
 */
const UPDATE_BANNER_PRESENT = `(() => {
  const host = document.getElementById('update-banner-host');
  return Boolean(host) && host.getBoundingClientRect().height > 0;
})()`;

const DISMISS_UPDATE_BANNER = `(() => {
  const host = document.getElementById('update-banner-host');
  if (!host) return 0;
  const later = [...host.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Later');
  if (!later) return 0;
  later.click();
  return 1;
})()`;

/**
 * Names whatever is sitting between the top-left of the window and the application's shell.
 *
 * Takes the shell rectangle rather than locating the shell again, so there is one shell
 * locator in this harness (design-parity-regions.mjs) and not a second copy here that can
 * drift from it.
 */
export const OBSTRUCTIONS_ABOVE = (shell) => `(() => {
  const shell = ${JSON.stringify(shell)};
  return [...document.body.children]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((c) => c.r.height > 0 && c.r.width > 0 && (c.r.top < shell.y || c.r.left < shell.x))
    .map((c) => (c.el.id || c.el.tagName.toLowerCase()) + ' (' + Math.round(c.r.width) + 'x' + Math.round(c.r.height) + ': ' + (c.el.textContent || '').trim().slice(0, 60) + ')')
    .join('; ');
})()`;

/**
 * Clears the update banner and proves it gone, or refuses the run.
 *
 * Refusing is the point. A capture taken with the banner up is not a capture of this
 * application's chrome — every rectangle in it is displaced by the banner's height — and it
 * is indistinguishable from a good one to everything downstream, including the pixel diff,
 * which would report the displacement as a design divergence.
 */
export async function clearUpdateBanner(cdp, where, { attempts = 8, pauseMs = 500 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!(await cdp.evaluate(UPDATE_BANNER_PRESENT))) return attempt;
    await cdp.evaluate(DISMISS_UPDATE_BANNER);
    await sleep(pauseMs);
  }
  // The check after the last click, without which the last click is never judged. Measured:
  // the banner takes about a second to leave the DOM after `Later`, so a loop that clicks and
  // then gives up refuses a dismissal that was working — which is how this guard's first run
  // failed, on a banner the very next probe found already gone.
  if (!(await cdp.evaluate(UPDATE_BANNER_PRESENT))) return attempts;
  throw new Error(`design-parity-capture-run: the update banner is still up ${where}; refusing to capture the built side behind it`);
}

/**
 * Whether a built measurement's shell owns the window, which is the only position from which
 * its rectangles mean what the chrome bar reads them as meaning.
 *
 * A probe that already reported an error is not judged here — that error is its own refusal,
 * and answering `false` as well would replace a precise reason with a vaguer one.
 */
export function shellOwnsTheWindow(measured) {
  if (!measured || measured.error) return true;
  return measured.shell?.x === 0 && measured.shell?.y === 0;
}

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
  await clearUpdateBanner(cdp, 'before the first destination');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: TUPLE.width, height: TUPLE.height, deviceScaleFactor: TUPLE.scale, mobile: false,
  });
  await sleep(500);

  const results = [];
  const measurements = {};
  for (const entry of selectedDestinations()) {
    const label = LABELS.labels[entry.id];
    const rail = LABELS.rails[label.rail];
    await clearUpdateBanner(cdp, `before driving to '${entry.id}'`);
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
    const measured = await cdp.evaluate(BUILT_REGION_PROBE);
    // The application's shell owns the whole window. Anything that displaces it — the update
    // banner, a toast host, a surface nobody has thought of yet — displaces every rectangle
    // in the frame with it, and the pixel diff cannot tell that apart from a design
    // divergence. This catches the general case; clearUpdateBanner only knows the one
    // surface it is named after.
    if (!shellOwnsTheWindow(measured)) {
      const above = await cdp.evaluate(OBSTRUCTIONS_ABOVE(measured.shell));
      const reason = `the shell starts at (${measured.shell.x}, ${measured.shell.y}) rather than the top-left of the window; above or left of it: ${above || 'nothing this probe could name'}`;
      results.push({ id: entry.id, captured: false, reason });
      console.log(`built ${entry.id}: ${reason}`);
      continue;
    }
    measurements[entry.id] = measured;
    if (regionsOnly()) {
      results.push({ id: entry.id, captured: false, regionsOnly: true, reason: 'run made with --regions-only; no capture was taken and none was expected' });
      console.log(`built ${entry.id}: regions measured, no capture (--regions-only)`);
      continue;
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const written = writeArtifact(artifactPath('builtCapture', entry.id), Buffer.from(data, 'base64'));
    results.push({ id: entry.id, captured: true, heading: label.title, ...written });
    console.log(`built ${entry.id}: ${written.bytes} bytes`);
  }

  cdp.close();
  const regionCount = writeRegionMeasurements('built', 'console/dist built renderer under Electron on an off-screen Windows desktop', measurements);
  return {
    side: 'built',
    target: 'console/dist built renderer under Electron on an off-screen Windows desktop',
    tuple: TUPLE,
    regionsMeasuredThisRun: Object.keys(measurements).length,
    regionsOnDisk: regionCount,
    captured: results.filter((r) => r.captured).length,
    failed: results.filter((r) => !r.captured).length,
    results,
  };
}

/* ----------------------------------------------------------------------- chrome stage -- */

/**
 * Measures every destination against the chrome-parity bar, from the two sides' recorded
 * region measurements and the captures already on disk. No browser, like the diff stage.
 *
 * A destination missing either side's measurement is skipped and SAID to be skipped. It is
 * never compared with an empty mask, which would silently compare the data regions this
 * bar exists to exclude and report an enormous, meaningless divergence.
 */
function chromeAll() {
  const sourceMtimes = buildOutputMtimes();
  // The chrome-parity bar is what a `verified` row rests on, so its staleness proof may not
  // be quietly skipped. `compareCaptures` treats an empty mtime list as "not checked" and
  // carries on, which is right for the diff stage and wrong here: a check that silently
  // does not run is indistinguishable from one that passed.
  if (sourceMtimes.length === 0) {
    throw new Error('design-parity-capture-run --side=chrome: console/dist and console/dist-electron are both absent, so no capture can be proved newer than the build it claims to show. Build the console (npm run build) before applying the bar.');
  }
  const sides = {};
  for (const side of ['reference', 'built']) {
    const path = regionMeasurementsPath(side);
    if (!existsSync(path)) {
      throw new Error(`design-parity-capture-run --side=chrome: ${side} region measurements are absent at ${path}. Run --side=${side} --regions-only --port=N first; the bar cannot be applied with a mask nobody measured.`);
    }
    sides[side] = JSON.parse(readFileSync(path, 'utf8')).measurements ?? {};
  }

  const results = [];
  for (const entry of selectedDestinations()) {
    const referencePath = artifactPath('referenceCapture', entry.id);
    const builtPath = artifactPath('builtCapture', entry.id);
    const missing = [
      !existsSync(referencePath) && 'reference capture',
      !existsSync(builtPath) && 'built capture',
      !sides.reference[entry.id] && 'reference region measurement',
      !sides.built[entry.id] && 'built region measurement',
    ].filter(Boolean);
    if (missing.length > 0) {
      results.push({ id: entry.id, skipped: `${missing.join(' and ')} absent` });
      console.log(`chrome ${entry.id}: skipped, ${missing.join(' and ')} absent`);
      continue;
    }

    let ledger;
    try {
      ledger = buildRegionLedger({
        destinationId: entry.id, tuple: TUPLE, inventory: INVENTORY,
        reference: sides.reference[entry.id], built: sides.built[entry.id],
      });
    } catch (error) {
      results.push({ id: entry.id, skipped: error.message });
      console.log(`chrome ${entry.id}: skipped, ${error.message}`);
      continue;
    }
    writeArtifact(artifactPath('regionLedger', entry.id), Buffer.from(`${JSON.stringify({
      ...ledger, generatedBy: 'console/scripts/design-parity-capture-run.mjs --side=chrome', sourceCommit: SOURCE_COMMIT,
    }, null, 2)}\n`, 'utf8'));

    const { exclusions, areas } = maskFromLedger(ledger);
    const record = compareChrome({
      reference: readFileSync(referencePath),
      built: readFileSync(builtPath),
      destinationId: entry.id,
      exclusions,
      areas,
      builtCaptureMtimeMs: statSync(builtPath).mtimeMs,
      builtSourceMtimesMs: sourceMtimes,
      minimumComparedFraction: INVENTORY.chromeParityBar.minimumComparedFraction,
    });
    writeArtifact(artifactPath('chromeParity', entry.id), Buffer.from(`${JSON.stringify({
      ...record,
      generatedBy: 'console/scripts/design-parity-capture-run.mjs --side=chrome',
      sourceCommit: SOURCE_COMMIT,
      tuple: TUPLE,
      regionLedger: INVENTORY.evidenceTemplates.regionLedger.replaceAll('{id}', entry.id),
      referenceCapture: INVENTORY.evidenceTemplates.referenceCapture.replaceAll('{id}', entry.id),
      builtCapture: INVENTORY.evidenceTemplates.builtCapture.replaceAll('{id}', entry.id),
    }, null, 2)}\n`, 'utf8'));

    const worst = Object.entries(record.areas)
      .filter(([, area]) => (area.diffPercentage ?? 0) > 0)
      .sort((a, b) => b[1].diffPercentage - a[1].diffPercentage)[0];
    results.push({
      id: entry.id, verdict: record.verdict, diffPercentage: record.diffPercentage,
      comparedFraction: record.comparedFraction, worstArea: worst ? worst[0] : null, reasons: record.reasons,
    });
    console.log(`chrome ${entry.id}: ${record.verdict}`
      + (record.diffPercentage == null ? '' : ` (${record.diffPercentage.toFixed(2)}% of the compared ${(record.comparedFraction * 100).toFixed(1)}% differs`)
      + (worst ? `, worst area ${worst[0]} at ${worst[1].diffPercentage.toFixed(1)}%)` : ')'));
  }

  const verdicts = {};
  for (const result of results) {
    const key = result.skipped ? 'skipped' : result.verdict;
    verdicts[key] = (verdicts[key] ?? 0) + 1;
  }
  return { side: 'chrome', bar: 'chrome-parity', tuple: TUPLE, minimumComparedFraction: INVENTORY.chromeParityBar.minimumComparedFraction, verdicts, results };
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
      sourceCommit: SOURCE_COMMIT,
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
  const browserless = ['diff', 'chrome'];
  if (!['reference', 'built', ...browserless].includes(side)) {
    console.error('usage: design-parity-capture-run.mjs --side=reference|built|diff|chrome [--port=N] [--regions-only]');
    process.exit(2);
  }
  if (!browserless.includes(side) && !port) {
    console.error(`design-parity-capture-run.mjs --side=${side} needs --port=N, the loopback debugging port of an already-running target`);
    process.exit(2);
  }
  if (regionsOnly() && browserless.includes(side)) {
    console.error(`design-parity-capture-run.mjs --side=${side} takes no captures, so --regions-only would mean nothing there`);
    process.exit(2);
  }

  const ledger = side === 'reference' ? await captureReferenceSide(port, Number(argValue('server-port', '0')))
    : side === 'built' ? await captureBuiltSide(port)
      : side === 'chrome' ? chromeAll()
        : diffAll();
  // A --regions-only run measured rectangles and took no pictures, so it must not overwrite
  // the ledger that records which captures exist — that ledger is what the on-disk capture
  // guard checks every committed PNG against.
  const name = regionsOnly() ? `run-regions-${side}` : `run-${side}`;
  mkdirSync(LEDGER_DIR, { recursive: true });
  writeFileSync(join(LEDGER_DIR, `${name}.json`), `${JSON.stringify({
    generatedAt: new Date().toISOString(), generatedBy: 'console/scripts/design-parity-capture-run.mjs',
    sourceCommit: SOURCE_COMMIT, regionsOnly: regionsOnly(), ...ledger,
  }, null, 2)}\n`);
  console.log(`\nwrote console/release/evidence/parity/${name}.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
