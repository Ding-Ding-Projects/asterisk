// The design-reference capture harness's browser-side driver.
//
// Reuses the exact same parseCaptureTuple/navigationPlanFor logic the diff pipeline and
// its tests already exercise (../scripts/design-parity-capture.mjs) — this file adds no
// second parser and no second selector strategy of its own; it is the DOM automation layer
// on top of that already-tested contract.
//
// A CORRECTION TO WHAT THIS FILE USED TO SAY. It recorded the React runtime as a capability
// boundary that could not be closed: "the design export expects window.React/window.ReactDOM
// and this harness cannot supply them without editing design/". That is true of the HTML file
// and false of the runtime sitting beside it. design/support.js loads React itself
// (`loadReactUmd()` at its foot) and, one function above that, `cdnScriptFor()` reads
// `window.__resources[url]` and prefers it — so the design already ships exactly the hook a
// host is meant to use. console/scripts/design-parity-server.mjs sets that map to the copies
// vendored under vendor/ and serves the design through its own virtual directory, so nothing
// under design/ is edited and a capture run reaches no network at all.
//
// waitForReactHost below is unchanged, and is now a check that the shim actually landed
// rather than a permanent refusal. A shim inserted after the runtime has booted, or keyed to
// a URL the design no longer pins, is inert — and an inert shim leaves an empty page that
// photographs perfectly well.
import { parseCaptureTuple, DEFAULT_TUPLE } from '../scripts/design-parity-capture.mjs';

// design-parity-server.mjs's DESIGN_HOST_PREFIX maps this virtual directory onto the real
// design/ folder and injects the local-React shim into the .dc.html on the way out. The
// <x-dc> template the runtime actually renders is passed through byte-for-byte, and
// './support.js' and <dc-import name="M3 Control"> both resolve inside the same directory.
const DESIGN_FILE_RELATIVE = './design-host/Asterisk Console M3.dc.html';
const SETTLE_POLL_MS = 50;
const SETTLE_TIMEOUT_MS = 15000;
const REACT_READY_TIMEOUT_MS = 8000;
/** Time given to the design's own rail/section transition after a click before the next step
 *  reads the DOM. The design animates its section list in, so reading it on the same tick as
 *  the click sees the list the rail had a moment ago. */
const RAIL_SETTLE_MS = 500;
/** How many times a step will re-click a target that accepted the click without acting on it. */
const CLICK_ATTEMPTS = 3;
/** How long one step waits for its own target to appear. Deliberately much shorter than
 *  SETTLE_TIMEOUT_MS: a step that cannot find its target is retried as part of a whole plan
 *  attempt below, and a long per-step wait would make one retry cost most of a minute. */
const STEP_FIND_TIMEOUT_MS = 2500;
/** How many times the whole navigation plan is re-run before a destination is given up on. */
const PLAN_ATTEMPTS = 6;
/** How long one plan attempt waits for the heading to prove it arrived. */
const PLAN_ATTEMPT_SETTLE_MS = 2500;
/** How long, and how tightly, a click's own effect is polled for before it is re-clicked. */
const VERIFY_TIMEOUT_MS = 1500;
const VERIFY_POLL_MS = 20;

/** Parses the harness's own URL into the five-part capture tuple, defaulting anything the
 *  request omitted to DEFAULT_TUPLE so a partial query string still behaves deterministically. */
export function tupleFromLocation(locationSearch) {
  return parseCaptureTuple(locationSearch.startsWith('?') ? locationSearch.slice(1) : locationSearch);
}

/** Builds the iframe src pointing at the real, unmodified, checked-in design export as the
 *  capture server hosts it (see DESIGN_FILE_RELATIVE above for what that host adds). The
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

/**
 * A control's text with its icon ligature removed.
 *
 * A Material Symbols icon is a glyph NAME sitting in the DOM as text, so a section button
 * rendered as `<span class="msym">graphic_eq</span>Live channels` has a `textContent` of
 * `graphic_eqLive channels`. Matching that against the catalogue's `Live channels` finds
 * nothing, on every destination whose button carries an icon — which cost this harness its
 * first real run. Strip the glyph spans, then compare.
 */
export function controlText(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === 3) text += node.textContent;
    else if (node.nodeType === 1 && !node.classList?.contains('msym')) text += controlText(node);
  }
  return text.trim();
}

/**
 * The label a section button shows, without its trailing badge.
 *
 * The design renders a section as its label and, on most destinations, a live badge beneath
 * it — `Dashboard` over `live`, `Endpoints` over `12`. Those arrive as separate text nodes,
 * so the button's text is `Dashboard\n              live` and an exact comparison against the
 * catalogue's `Dashboard` matches nothing. The label is the first non-empty line.
 */
export function controlLabel(element) {
  return controlText(element).split('\n')[0].trim();
}

/**
 * Whether a control is the one labelled `wanted`.
 *
 * Two shapes have to match, because the design and the application that compiles from it
 * render a section row differently. The design puts the label and its badge in separate text
 * nodes, so the button's text reads `Modules\n              255` and the first line is the
 * label. The built renderer puts each in its own <span>, so the same button's text reads
 * `Modules255` with nothing to split on — and a first-line rule silently matches nothing,
 * which is what stopped every badged destination on the built side. So: the whole label, or
 * any single non-glyph child element whose own text is exactly the label. Prefix matching is
 * deliberately not used; `Feature codes` and `Feature Codes` are different destinations here.
 */
export function controlMatchesLabel(element, wanted) {
  const target = wanted.trim();
  if (controlLabel(element) === target) return true;
  for (const child of element.children ?? []) {
    if (child.classList?.contains('msym')) continue;
    if ((child.textContent ?? '').trim() === target) return true;
  }
  return false;
}

function findButtonByExactText(doc, text) {
  for (const button of doc.querySelectorAll('button')) {
    if (controlMatchesLabel(button, text)) return button;
  }
  return null;
}

/**
 * Dismisses the design's own first-run wizard if it is up.
 *
 * The design export boots with the setup wizard covering the screen, exactly as a freshly
 * installed build does. Every audited destination sits behind it, so both sides of a parity
 * capture dismiss it the same way and the run ledger records that they did. Returns whether
 * a wizard was actually there, so a caller can say so rather than assume it.
 */
export async function dismissFirstRun(doc) {
  const skip = findButtonByExactText(doc, 'Skip setup');
  if (!skip) return false;
  skip.click();
  // Wait for it to actually GO, not for a fixed pause. A rail click issued while the wizard
  // is still unwinding is swallowed by the re-render that follows it, and the run then fails
  // fifteen seconds later looking for a section that is genuinely not there — because the
  // rail never changed. This cost four destinations on the first full reference run.
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!findButtonByExactText(doc, 'Skip setup')) return true;
    await sleep(SETTLE_POLL_MS);
  }
  throw new Error(`design-reference harness: the design's first-run wizard was still up ${SETTLE_TIMEOUT_MS}ms after 'Skip setup' was clicked`);
}

/** The design's rail strip (design/Asterisk Console M3.dc.html's <sc-for list="{{ rail }}">
 *  block) renders each rail as an icon-only button with NO visible text and no data
 *  attribute — only a Material Symbols ligature glyph inside a `.msym` span whose text
 *  content equals the icon name (e.g. 'settings_applications' for the system rail). That
 *  glyph name is therefore the only real, accessible-name-shaped hook available to click a
 *  rail; find the `.msym` span whose text matches, then click its nearest ancestor button. */
function findRailButton(doc, iconName, railLabel) {
  const candidates = [];
  for (const span of doc.querySelectorAll('.msym')) {
    if ((span.textContent ?? '').trim() !== iconName) continue;
    const button = span.closest('button');
    if (button) candidates.push(button);
  }
  // A glyph is not unique to the rail strip: `graphic_eq` is the Media rail's icon AND the
  // Live channels section button's icon, so taking the first match walks into the section
  // list. The rail button carries the rail's own label beside its glyph, so prefer that.
  if (railLabel) {
    const exact = candidates.find((button) => controlLabel(button) === railLabel);
    if (exact) return exact;
  }
  return candidates[0] ?? null;
}

/** Every label the section list is currently showing — the one fact that makes a failed
 *  click-section step diagnosable, since it says which rail the design is actually on. */
export function sectionLabels(doc) {
  return [...doc.querySelectorAll('button')]
    .filter((button) => button.offsetWidth > 150 && button.offsetHeight > 25 && button.offsetHeight < 60)
    .map((button) => controlLabel(button))
    .filter(Boolean);
}

/** Resolves once any rail icon button exists, proving the design has rendered its first commit. */
async function waitForFirstPaint(doc, rails) {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (Object.values(rails).some((rail) => findRailButton(doc, rail.icon, rail.label))) return;
    await sleep(SETTLE_POLL_MS);
  }
  throw new Error(`design-reference harness: the design rendered no rail strip within ${SETTLE_TIMEOUT_MS}ms — React booted but nothing painted`);
}

/** Executes one navigation-plan step (see design-parity-capture.mjs's navigationPlanFor)
 *  against the design iframe's real rendered DOM — real clicks on the real rendered nav,
 *  never a synthesized state mutation. `rails` is the railId -> {icon, label} map from
 *  destination-labels.generated.json (derived from the compiled RAIL strip), because a
 *  click-rail step names a rail id and the DOM only exposes that rail's icon glyph. */
async function runStep(doc, step, rails, trace, verify) {
  const find = () => {
    if (step.kind === 'click-rail') {
      const icon = rails[step.target]?.icon;
      if (!icon) throw new Error(`design-reference harness: no icon recorded for rail '${step.target}' in destination-labels.generated.json`);
      return findRailButton(doc, icon, rails[step.target]?.label);
    }
    return findButtonByExactText(doc, step.target);
  };
  // React having mounted is not the same as this step's target having rendered: the rail
  // strip and the section list arrive on different commits, and clicking the instant
  // window.React appeared found nothing at all on the very first destination of a run while
  // succeeding on every later one — a timing failure that reads as a broken selector.
  const deadline = Date.now() + STEP_FIND_TIMEOUT_MS;
  let target = find();
  while (!target && Date.now() < deadline) {
    await sleep(SETTLE_POLL_MS);
    target = find();
  }
  if (!target) {
    trace?.push({ step: `${step.kind}:${step.target}`, found: false, sectionsNow: sectionLabels(doc) });
    throw new Error(`design-reference harness: could not find a clickable element for step ${JSON.stringify(step)} within ${STEP_FIND_TIMEOUT_MS}ms; the section list currently reads [${sectionLabels(doc).join(' | ')}]`);
  }
  // Clicking is not the same as the click having taken effect, and on this design they come
  // apart for several seconds after the first-run wizard is dismissed: a rail click issued
  // during that settling is accepted by the button and then discarded by the re-render, so
  // the rail never changes and the next step hunts for a section that is genuinely not on
  // screen. Verify, and click again if it did not land, rather than waiting longer — waiting
  // was tried first and fifteen seconds of it changed nothing.
  for (let attempt = 1; attempt <= CLICK_ATTEMPTS; attempt += 1) {
    target.click();
    if (!verify) {
      await sleep(RAIL_SETTLE_MS);
      trace?.push({ step: `${step.kind}:${step.target}`, found: true, attempts: attempt });
      return;
    }
    // Poll hard and return the instant it lands, rather than sleeping a fixed settle. The
    // design derives the open rail from the ACTIVE destination, so a rail click that is not
    // followed promptly by a section click snaps straight back to the rail the current screen
    // belongs to — which is why every destination that is not the FIRST entry of its rail
    // failed, and every first entry succeeded. Half a second of politeness was the whole bug.
    const verifyDeadline = Date.now() + VERIFY_TIMEOUT_MS;
    while (Date.now() < verifyDeadline) {
      if (verify()) {
        trace?.push({ step: `${step.kind}:${step.target}`, found: true, attempts: attempt });
        return;
      }
      await sleep(VERIFY_POLL_MS);
    }
    target = find() ?? target;
  }
  trace?.push({ step: `${step.kind}:${step.target}`, found: true, tookEffect: false, sectionsNow: sectionLabels(doc) });
  throw new Error(`design-reference harness: clicked the target for step ${JSON.stringify(step)} ${CLICK_ATTEMPTS} times and it never took effect; the section list still reads [${sectionLabels(doc).join(' | ')}]`);
}

async function waitForHeading(doc, expectedHeading, timeoutMs = SETTLE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const heading = doc.querySelector('h1');
    if (heading && heading.textContent.trim() === expectedHeading) return;
    await sleep(SETTLE_POLL_MS);
  }
  throw new Error(`design-reference harness: <h1> never settled on '${expectedHeading}' within ${timeoutMs}ms; it reads '${(doc.querySelector('h1')?.textContent ?? '').trim()}'`);
}

/** Drives the already-loaded design iframe to the destination named by `plan`
 *  (design-parity-capture.mjs's navigationPlanFor output) and resolves once the screen
 *  heading proves it arrived. `rails` is destination-labels.generated.json's `rails` map.
 *  Throws — never silently times out unreported — on any step that cannot find its target
 *  or never settles. */
export async function driveToDestination(frameWindow, plan, rails) {
  await waitForReactHost(frameWindow);
  const doc = frameWindow.document;
  // Wait for the first paint before touching anything: React having mounted is not the same
  // as a commit having rendered, and the wizard check below would otherwise read a document
  // that is still empty and conclude, wrongly and silently, that there is no wizard.
  await waitForFirstPaint(doc, rails);
  const dismissedFirstRun = await dismissFirstRun(doc);
  if (dismissedFirstRun) await sleep(RAIL_SETTLE_MS);
  const trace = [{ step: 'first-paint', found: true, sectionsNow: sectionLabels(doc) }];
  const sectionStep = plan.steps.find((step) => step.kind === 'click-section');

  // The whole plan is retried, not just each click, because the design un-does a rail change
  // made while it is still settling after the wizard: the rail step verifies, the section
  // button appears, and by the time the next step reads the DOM the rail has snapped back to
  // where it started. Re-running the plan is what actually converges; per-click retries alone
  // did not, and neither did waiting.
  let lastError;
  for (let attempt = 1; attempt <= PLAN_ATTEMPTS; attempt += 1) {
    try {
      for (const step of plan.steps) {
        const verify = step.kind === 'click-rail' && sectionStep
          ? () => Boolean(findButtonByExactText(doc, sectionStep.target))
          : undefined;
        await runStep(doc, step, rails, trace, verify);
      }
      await waitForHeading(doc, plan.settle.expectedHeading, PLAN_ATTEMPT_SETTLE_MS);
      return { dismissedFirstRun, trace, planAttempts: attempt };
    } catch (error) {
      lastError = error;
      trace.push({ step: 'plan-attempt-failed', attempt, reason: error.message });
      await sleep(RAIL_SETTLE_MS);
    }
  }
  throw lastError;
}

export { DEFAULT_TUPLE };
