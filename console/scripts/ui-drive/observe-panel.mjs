/**
 * The committed panel-observation harness.
 *
 * WHY THIS FILE EXISTS. Twenty-six of the thirty-nine built-interaction records under
 * `release/evidence/windows-console/` carry an `observedPanelControls` field, and
 * twenty-five of them recorded an empty list. `operated-interaction-evidence.mjs` reads
 * that field and refuses a `verified` row without it, so the field is consumed. Nothing
 * in this repository ever produced it: a search of the whole tree finds the field in the
 * two guard scripts, in the records themselves, and in one contract test -- and in no
 * script that writes one. The selector lived in an ad-hoc paste at a driving session and
 * was never committed, so it could not be reviewed, could not be tested, and could not be
 * fixed once. That is the same "wired at one end and consumed at neither" shape this
 * repository keeps meeting, arriving from the producer side for once.
 *
 * WHAT THE MISSING SELECTOR WOULD HAVE GOT WRONG. Two properties of this application's
 * real DOM defeat the two obvious readers, and both are measured rather than assumed --
 * `tests/scripts/panel-observation.test.mjs` reads them off the compiled shell:
 *
 *   1. The compiled shell -- 6,277 lines and effectively the whole console interface --
 *      declares ZERO `role` attributes and ZERO `aria-*` attributes, so
 *      `getAttribute('aria-label')` is null on every control the shell renders and
 *      `drive.mjs`'s `aria-label || textContent` name always fell through to `textContent`.
 *      Six `aria-label`s do exist in the hand-written components outside the shell, which is
 *      why the reader below still prefers one where it is there.
 *
 *      CORRECTED, 2026-08-26. This paragraph used to continue "and NO `role="dialog"`
 *      anywhere at all, so a selector for `role=dialog` matches nothing in this application
 *      under any state". That was false, and false about the surface it mattered most for.
 *      The command palette's card carries `role: 'dialog'` (`App.tsx`, on `.palette-card`),
 *      and every one of the twenty-five empty records was driven THROUGH the palette. The
 *      test guarding the claim could not see it: its needle was the JSX spelling
 *      `role="dialog"` while this renderer is hyperscript and writes `role: 'dialog'`, so it
 *      reported absence and had never once looked. Measured against the packaged build in
 *      `release/evidence/ui-drive/command-palette-reading.json`: the dialog-role count is 0
 *      before the chord, 1 while the palette is up, and 0 again after a result is activated.
 *      The z-index scan below stays, for a reason that is now stated rather than assumed --
 *      one element in one state is not a reader, and a driver that reached for the role would
 *      be blind on every other screen. `.palette-card` is neither positioned nor z-indexed,
 *      so the scan finds the `.palette-scrim` that WRAPS it: honest, and coarse, because the
 *      controls found are the card's while the rectangle reported is the whole viewport.
 *
 *   2. The shell renders 175 `<span class="msym">` Material Symbols ligature spans, and
 *      an icon-bearing control puts its icon span BEFORE its label. So `textContent` on
 *      the regex builder's first tool button reads `"backspaceDelete last"`, not
 *      `"Delete last"` -- the glyph's own name is in the DOM, exactly as the shared
 *      instructions warn.
 *
 * A dead end worth recording, because it is the obvious fix and it is wrong. `gallery.mjs`
 * strips the ligature with the prefix pattern `/^[a-z_]+(?=[A-Z])/`, which needs a capital
 * immediately after the icon name. It handles `"backspaceDelete last"` and it silently
 * fails on every label that begins lowercase: the regex builder's own flag chips render as
 * `"checki · ignore case"` when the flag is on, and the pattern strips nothing, because
 * there is no capital for the lookahead to find. `stripLigaturePrefix` below keeps that
 * behaviour and its test pins the failure, so nobody reaches for it again. The browser side
 * does not use it -- it removes the `.msym` elements from a clone and reads what is left,
 * which is exact and cannot mis-fire on a lowercase label.
 *
 * SHAPE. The browser-side expressions collect plain readings and hand them back by value;
 * every decision -- which candidate is the panel, what a control is called, whether the
 * panel sits against the control that opened it -- happens in Node, in the pure functions
 * below, where it can be tested without a browser and where the readings that produced it
 * land in the record beside the conclusion.
 */

/**
 * The z-index floor above which this application's floating surfaces live.
 *
 * Measured, not chosen: every `z-index` in the compiled shell is either at most 6 (the
 * in-page chrome: rails, sticky headers) or at least 55 (the wizard, the info sheet, the
 * command palette, context menus, the appearance drawer, the lock and unlock sheets, the
 * confirmation gate, the regex builder at 96/97). There is nothing between 6 and 55, so
 * the floor separates page chrome from overlays with a wide margin either side. The test
 * re-derives both bounds from the shell and fails if the gap ever closes.
 */
export const OVERLAY_Z_FLOOR = 55;

/**
 * How near a panel has to sit to the control that opened it to read as anchored to it.
 *
 * A geometric reading and nothing more. A panel this application positions by percentage,
 * or one the user has dragged, will legitimately read false; that is a fact about where the
 * panel is, not a verdict on the feature. The harness reports the measurement beside the
 * flag so a record can be argued with rather than merely believed.
 */
export const ANCHOR_MAX_GAP_PX = 24;

/**
 * Strip a leading Material Symbols ligature the way `gallery.mjs` does.
 *
 * Kept, exported and tested for one reason: to hold the dead end still. It works only when
 * the real label starts with a capital, and the browser side deliberately does not use it.
 */
export function stripLigaturePrefix(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/^[a-z_]+(?=[A-Z])/u, '');
}

/**
 * Decide what one control is called, from the readings the browser handed back.
 *
 * The order is the order of decreasing honesty. An accessible name would win if this
 * application had one; it has none, so in practice the text wins, and an icon-only button
 * falls through to its `title`, which this application does set on every icon-only control
 * in the regex builder's header. The very last resort is the icon's own ligature name, and
 * it is reported as such rather than passed off as a label, so a record carrying
 * `source: "icon"` says plainly that the control had no readable name at all.
 *
 * `segments` exists because the first real reading taken with this harness came back with a
 * command-palette row named `"languageHardware trunks - Signalling & routing"`. `textContent`
 * concatenates adjacent element children with nothing between them, and a palette row is two
 * top-level spans -- its label and the context it sits in -- with no whitespace in the markup
 * to separate them. That is the ligature hazard again in a second shape: the reading is not
 * missing, it is two different fields glued into one word, which reads as a broken label and
 * can never match a name a person wrote down. So the browser hands back the top-level runs and
 * the joining happens here, where it is a pure function with a test rather than a `textContent`
 * whose behaviour has to be remembered. Top-level only: descending further would start putting
 * spaces inside words that a component split across spans for styling.
 */
export function readControlLabel(reading) {
  const pick = (value) => (typeof value === 'string' ? value.trim() : '');
  const ariaLabel = pick(reading?.ariaLabel);
  if (ariaLabel) return { label: ariaLabel, source: 'aria-label' };
  const segments = Array.isArray(reading?.segments)
    ? reading.segments.map(pick).filter((segment) => segment.length > 0)
    : [];
  /* Capped at the same 80 characters the browser side caps `textWithoutIcons` at, so the two
   * paths cannot produce labels of different lengths for the same control. */
  if (segments.length > 0) return { label: segments.join(' ').slice(0, 80), source: 'text' };
  const text = pick(reading?.textWithoutIcons);
  if (text) return { label: text, source: 'text' };
  const title = pick(reading?.title);
  if (title) return { label: title, source: 'title' };
  const icon = pick(reading?.icon);
  if (icon) return { label: icon, source: 'icon' };
  return { label: '', source: 'none' };
}

/** Area of a `{width, height}` rect, guarding against the absent and the negative. */
const areaOf = (rect) => {
  const width = Number(rect?.width);
  const height = Number(rect?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0;
  return width * height;
};

/**
 * Choose the open panel from the overlay candidates the browser reported.
 *
 * A scrim and its panel are two sibling absolutely-positioned elements one z-index apart,
 * and the scrim is the one that fills the viewport and holds nothing. So: keep the
 * candidates that are visible and actually hold something operable, take the highest
 * z-index, and where two share it prefer the smaller -- a full-viewport flex container that
 * centres a card reports the same z-index as the card, and the card is the panel.
 *
 * Returns `null` when nothing qualifies, which is the honest answer for a screen with no
 * panel open and is what the caller records rather than an empty list that reads as a
 * panel with no controls in it.
 */
export function choosePanel(candidates) {
  if (!Array.isArray(candidates)) return null;
  const operable = candidates.filter((candidate) => candidate
    && candidate.visible === true
    && Number.isFinite(Number(candidate.zIndex))
    && Number(candidate.zIndex) >= OVERLAY_Z_FLOOR
    && ((Array.isArray(candidate.controls) && candidate.controls.length > 0) || Number(candidate.inputs) > 0));
  if (operable.length === 0) return null;

  let best = operable[0];
  for (const candidate of operable.slice(1)) {
    const higher = Number(candidate.zIndex) > Number(best.zIndex);
    const tiedAndTighter = Number(candidate.zIndex) === Number(best.zIndex)
      && areaOf(candidate.rect) > 0 && areaOf(candidate.rect) < areaOf(best.rect);
    if (higher || tiedAndTighter) best = candidate;
  }
  return best;
}

/** The shortest distance between two boxes along each axis; zero when they overlap. */
export function gapBetween(a, b) {
  if (!a || !b) return null;
  const axis = (aStart, aSize, bStart, bSize) => {
    const aEnd = Number(aStart) + Number(aSize);
    const bEnd = Number(bStart) + Number(bSize);
    if (![aStart, aSize, bStart, bSize].every((n) => Number.isFinite(Number(n)))) return null;
    if (aEnd < Number(bStart)) return Number(bStart) - aEnd;
    if (bEnd < Number(aStart)) return Number(aStart) - bEnd;
    return 0;
  };
  const x = axis(a.x, a.width, b.x, b.width);
  const y = axis(a.y, a.height, b.y, b.height);
  if (x === null || y === null) return null;
  return Math.max(x, y);
}

/**
 * Turn a chosen panel into the structured observation a built-interaction record carries.
 *
 * `observedPanelControls` is the field twenty-five records reported empty. It is a list of
 * strings because that is what `operated-interaction-evidence.mjs` checks with its
 * `nonEmptyList` shape; the fuller per-control readings travel alongside it in
 * `panelControlReadings`, so a record says both what the panel offered and how each name
 * was arrived at.
 */
export function summarisePanel(panel, { originatorRect = null, viewport = null } = {}) {
  if (!panel) {
    return {
      panelFound: false,
      observedPanelControls: [],
      panelControlReadings: [],
      whyNoPanel: 'no visible overlay above the z-index floor held an operable control',
    };
  }

  const readings = (Array.isArray(panel.controls) ? panel.controls : [])
    .map((control) => ({ ...readControlLabel(control), disabled: control?.disabled === true }))
    .filter((control) => control.label.length > 0);

  const coversViewport = viewport
    ? areaOf(panel.rect) >= areaOf(viewport) * 0.995
    : panel.coversViewport === true;
  const gapPx = originatorRect ? gapBetween(panel.rect, originatorRect) : null;

  const summary = {
    panelFound: true,
    panelZIndex: Number(panel.zIndex),
    panelRect: panel.rect ?? null,
    panelHeading: typeof panel.heading === 'string' ? panel.heading : '',
    panelInputs: Number(panel.inputs) || 0,
    coversViewport,
    observedPanelControls: readings.filter((r) => r.source !== 'icon').map((r) => r.label),
    panelControlReadings: readings,
  };

  if (originatorRect) {
    summary.originatorRect = originatorRect;
    summary.gapToOriginatorPx = gapPx;
    summary.anchoredToOriginatingField = gapPx !== null && !coversViewport && gapPx <= ANCHOR_MAX_GAP_PX;
  }
  return summary;
}

/**
 * The one label reader every driver shares, as a browser-side expression.
 *
 * Exported as source rather than duplicated into each script on purpose: three private
 * copies is how one of them silently stops matching what the application renders, which is
 * the failure this whole file is repairing. `tests/scripts/panel-observation.test.mjs`
 * refuses a driver that carries its own.
 *
 * The icon spans are removed from a clone rather than pattern-matched off the front,
 * because the pattern cannot see a lowercase label. Reading the clone also leaves the real
 * element untouched, which matters: these expressions run against a live application whose
 * state is the thing being measured.
 */
export const CONTROL_READING_SOURCE = `((el) => {
  const clone = el.cloneNode(true);
  for (const icon of clone.querySelectorAll('.msym')) icon.remove();
  const iconEl = el.querySelector('.msym');
  return {
    ariaLabel: el.getAttribute('aria-label'),
    /* The top-level runs, kept apart. \`textContent\` would glue a control's two spans into
     * one word with nothing between them; the joining happens in Node, in readControlLabel. */
    segments: [...clone.childNodes]
      .map((node) => (node.textContent || '').replace(/\\s+/g, ' ').trim())
      .filter((segment) => segment.length > 0)
      .slice(0, 8),
    textWithoutIcons: (clone.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
    title: el.getAttribute('title'),
    icon: iconEl ? (iconEl.textContent || '').trim() : '',
    disabled: !!el.disabled,
  };
})`;

/** Everything this application uses as an operable control. The shell declares no roles. */
export const CONTROL_SELECTOR = 'button, input, select, textarea, a[href], [tabindex]';

/**
 * The narrower set a driver may click.
 *
 * Deliberately not `CONTROL_SELECTOR`. Enumerating what a panel offers should include its
 * text fields; clicking every text field on a screen because it appeared in the enumeration
 * is a different act, and one that types nothing while changing focus and dismissing the
 * panel being measured. Two names, one label reader.
 */
export const CLICKABLE_SELECTOR = 'button, [role=tab], input[type=checkbox], select, a[href]';

/**
 * How many overlays are currently up, as a browser-side expression.
 *
 * Replaces the dialog-role count, and the reason is narrower than the one first written here.
 * That reason said the application renders no element carrying the role anywhere, so the
 * count was always zero; the palette card carries it, so the count is one while the palette
 * is up. The real objection is that ONE surface out of a dozen declares it. Every other
 * overlay this console raises -- the wizard, the info sheet, context menus, the appearance
 * drawer, the lock and unlock sheets, the confirmation gate, the colour picker, the regex
 * builder -- declares no role at all, so a driver refusing to capture "while a dialog is up"
 * refused for exactly one of them and sailed past the rest.
 */
export const OVERLAY_COUNT_SOURCE = `(() => [...document.querySelectorAll('*')].filter((el) => {
  const style = getComputedStyle(el);
  if (style.position !== 'absolute' && style.position !== 'fixed') return false;
  const z = parseInt(style.zIndex, 10);
  if (!Number.isFinite(z) || z < ${OVERLAY_Z_FLOOR}) return false;
  const rect = el.getBoundingClientRect();
  return !!(rect.width && rect.height);
}).length)()`;

/**
 * Collect every candidate overlay, with its controls already read.
 *
 * Positioned elements only, because this application's floating surfaces are all
 * `position:absolute`; the z-index floor is applied in Node so a record keeps the readings
 * that were rejected as well as the one that was chosen.
 */
export const PANEL_CANDIDATES_SOURCE = `(() => {
  const readControl = ${CONTROL_READING_SOURCE};
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.position !== 'absolute' && style.position !== 'fixed') continue;
    const z = parseInt(style.zIndex, 10);
    if (!Number.isFinite(z) || z < ${OVERLAY_Z_FLOOR}) continue;
    const rect = el.getBoundingClientRect();
    const controls = [...el.querySelectorAll(${JSON.stringify(CONTROL_SELECTOR)})]
      .filter((c) => (c.offsetWidth || c.offsetHeight))
      .slice(0, 60)
      .map(readControl);
    const headingEl = el.querySelector('h1, h2, h3');
    out.push({
      zIndex: z,
      visible: !!(rect.width && rect.height) && style.visibility !== 'hidden' && style.display !== 'none',
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      coversViewport: Math.round(rect.width) >= innerWidth && Math.round(rect.height) >= innerHeight,
      heading: headingEl ? (headingEl.textContent || '').trim().slice(0, 60) : '',
      inputs: el.querySelectorAll('input, select, textarea').length,
      controls,
    });
  }
  return { viewport: { width: innerWidth, height: innerHeight }, candidates: out };
})()`;

/**
 * Run the collector against a live page and return the structured observation.
 *
 * `evaluate` is the CDP evaluator from `cdp.mjs`. `originatorSelectorSource` is an optional
 * browser-side expression returning the element the panel was opened from, so the record
 * can carry the measured distance between the two rather than a claim about it.
 */
export async function observePanel(evaluate, { originatorSelectorSource = null } = {}) {
  const collected = await evaluate(PANEL_CANDIDATES_SOURCE);
  const candidates = collected?.candidates ?? [];
  let originatorRect = null;
  if (originatorSelectorSource) {
    originatorRect = await evaluate(`(() => {
      const el = ${originatorSelectorSource};
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    })()`);
  }
  return {
    ...summarisePanel(choosePanel(candidates), { originatorRect, viewport: collected?.viewport ?? null }),
    candidatesConsidered: candidates.length,
  };
}
