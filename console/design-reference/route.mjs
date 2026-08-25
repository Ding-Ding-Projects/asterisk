// The design-reference capture harness's browser-side driver.
//
// Reuses the exact same parseCaptureTuple/navigationPlanFor logic the diff pipeline and
// its tests already exercise (../scripts/design-parity-capture.mjs) — this file adds no
// second parser and no second selector strategy of its own; it is the DOM automation layer
// on top of that already-tested contract.
//
// HONEST LIMITATION, stated here rather than papered over: the checked-in design export
// (design/Asterisk Console M3.dc.html) expects `window.React` and `window.ReactDOM` to
// already exist before its own <script src="./support.js"> runs — normally supplied by
// whatever design-tool host renders a `.dc.html` file. This harness does not (and, per this
// task's scope, cannot: design/ is out of bounds for this lane) modify that file to vendor
// a runtime host itself. If React/ReactDOM are not present in the iframe's window by the
// time it finishes loading, `captureReady()` below REJECTS with a specific, actionable
// error rather than hanging or silently reporting success — see README.md in this
// directory for what supplying that host requires.
import { parseCaptureTuple, DEFAULT_TUPLE } from '../scripts/design-parity-capture.mjs';

const DESIGN_FILE_RELATIVE = '../../design/Asterisk Console M3.dc.html';
const SETTLE_POLL_MS = 50;
const SETTLE_TIMEOUT_MS = 15000;
const REACT_READY_TIMEOUT_MS = 8000;

/** Parses the harness's own URL into the five-part capture tuple, defaulting anything the
 *  request omitted to DEFAULT_TUPLE so a partial query string still behaves deterministically. */
export function tupleFromLocation(locationSearch) {
  return parseCaptureTuple(locationSearch.startsWith('?') ? locationSearch.slice(1) : locationSearch);
}

/** Builds the iframe src pointing at the real, unmodified, checked-in design export. The
 *  design runtime itself already reads `?theme=` from its own location.search (see
 *  design/support.js's helmet manager) — this harness relies on that existing behaviour
 *  rather than reimplementing theme switching. */
export function designFrameSrc(tuple) {
  return `${DESIGN_FILE_RELATIVE}?theme=${encodeURIComponent(tuple.theme)}`;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

/** Polls the iframe's own window for `window.React` / `window.ReactDOM` becoming available.
 *  Rejects — never silently proceeds — if they never appear, since clicking into a page
 *  with no rendered React tree would otherwise just click nothing and report a false settle. */
async function waitForReactHost(frameWindow) {
  const deadline = Date.now() + REACT_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (frameWindow.React && frameWindow.ReactDOM) return;
    await sleep(SETTLE_POLL_MS);
  }
  throw new Error(
    'design-reference harness: window.React / window.ReactDOM were never supplied to the design '
    + 'iframe. The checked-in design export (design/*.dc.html) expects a host to provide the React '
    + 'runtime before its own support.js boots — this harness deliberately does not vendor one '
    + '(design/ is out of scope for this lane). Provide React/ReactDOM in the iframe before relying '
    + 'on this harness for a real capture; see design-reference/README.md.',
  );
}

function findButtonByExactText(doc, text) {
  const buttons = doc.querySelectorAll('button');
  for (const button of buttons) {
    if ((button.textContent ?? '').trim() === text.trim()) return button;
  }
  return null;
}

/** The design's rail strip (design/Asterisk Console M3.dc.html's <sc-for list="{{ rail }}">
 *  block) renders each rail as an icon-only button with NO visible text and no data
 *  attribute — only a Material Symbols ligature glyph inside a `.msym` span whose text
 *  content equals the icon name (e.g. 'settings_applications' for the system rail). That
 *  glyph name is therefore the only real, accessible-name-shaped hook available to click a
 *  rail; find the `.msym` span whose text matches, then click its nearest ancestor button. */
function findRailButton(doc, iconName) {
  const spans = doc.querySelectorAll('.msym');
  for (const span of spans) {
    if ((span.textContent ?? '').trim() === iconName) {
      const button = span.closest('button');
      if (button) return button;
    }
  }
  return null;
}

/** Executes one navigation-plan step (see design-parity-capture.mjs's navigationPlanFor)
 *  against the design iframe's real rendered DOM — real clicks on the real rendered nav,
 *  never a synthesized state mutation. `rails` is the railId -> {icon, label} map from
 *  destination-labels.generated.json (derived from the compiled RAIL strip), because a
 *  click-rail step names a rail id and the DOM only exposes that rail's icon glyph. */
function runStep(doc, step, rails) {
  let target;
  if (step.kind === 'click-rail') {
    const icon = rails[step.target]?.icon;
    if (!icon) throw new Error(`design-reference harness: no icon recorded for rail '${step.target}' in destination-labels.generated.json`);
    target = findRailButton(doc, icon);
  } else {
    target = findButtonByExactText(doc, step.target);
  }
  if (!target) {
    throw new Error(`design-reference harness: could not find a clickable element for step ${JSON.stringify(step)}`);
  }
  target.click();
}

async function waitForHeading(doc, expectedHeading) {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const heading = doc.querySelector('h1');
    if (heading && heading.textContent.trim() === expectedHeading) return;
    await sleep(SETTLE_POLL_MS);
  }
  throw new Error(`design-reference harness: <h1> never settled on '${expectedHeading}' within ${SETTLE_TIMEOUT_MS}ms`);
}

/** Drives the already-loaded design iframe to the destination named by `plan`
 *  (design-parity-capture.mjs's navigationPlanFor output) and resolves once the screen
 *  heading proves it arrived. `rails` is destination-labels.generated.json's `rails` map.
 *  Throws — never silently times out unreported — on any step that cannot find its target
 *  or never settles. */
export async function driveToDestination(frameWindow, plan, rails) {
  await waitForReactHost(frameWindow);
  const doc = frameWindow.document;
  for (const step of plan.steps) runStep(doc, step, rails);
  await waitForHeading(doc, plan.settle.expectedHeading);
}

export { DEFAULT_TUPLE };
