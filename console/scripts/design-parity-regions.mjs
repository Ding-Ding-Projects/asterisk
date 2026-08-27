#!/usr/bin/env node
/**
 * Records where each destination's chrome and data actually sit, off the live DOM, on both
 * sides of a design-parity comparison.
 *
 * The chrome-parity bar (design-parity-chrome.mjs) needs to know which rectangles carry
 * data before it can compare everything else. Those rectangles must not be hand-drawn — a
 * hand-drawn mask is a number somebody nudged until a screenshot passed — and they must not
 * be derived from the pixel diff, which would make the verdict circular. So they are
 * measured: this module hands a headless driver one expression that walks the real rendered
 * shell and returns the rectangle of every named area, and does the same on both sides.
 *
 * The area ROLES (which areas carry data and which are chrome) are declared once,
 * application-wide, in design-parity.json's `chromeParityBar`. That is the human judgement
 * the bar rests on, and keeping it in one reviewable place — rather than 32 per-destination
 * masks — is what makes it checkable. This module contributes geometry and no judgement.
 *
 * The shell is located structurally rather than by class name, because the two sides do not
 * share class names: the design export's runtime emits `scp7`/`scp8` and the compiled
 * renderer emits `k-h0`/`k-h7`, both hashed at build time. What they DO share is the layout
 * the design specifies and the compiler reproduces — a three-row shell whose last row is
 * three columns — so the locator is that structure, and a side whose structure has drifted
 * from it is refused by name rather than silently measured at the wrong place.
 */

/** The shell layout both sides are required to have. A mismatch is a finding, not a fallback. */
export const EXPECTED_SHELL = Object.freeze({ rows: 3, topCells: 4, mainColumns: 3 });

/**
 * The page expression a driver evaluates to measure one side.
 *
 * @param {string} documentExpression  how to reach the document being measured — `document`
 *   for the built renderer, the harness iframe's `contentDocument` for the reference side.
 * @param {string} offsetExpression  the origin to add to every rect, so an iframed reference
 *   is reported in the same capture coordinates the built side is.
 */
export function regionProbeExpression(documentExpression, offsetExpression) {
  return `(() => {
  const doc = ${documentExpression};
  const off = ${offsetExpression};
  if (!doc) return { error: 'the document being measured does not exist' };
  // The shell is the widest element that lays the whole application out in rows. Chosen by
  // area rather than by taking the first match, because the design export nests several
  // full-width wrappers and any of them would satisfy a looser test.
  const candidates = [...doc.querySelectorAll('div')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((c) => c.r.width >= 1200 && c.el.children.length === ${EXPECTED_SHELL.rows});
  if (candidates.length === 0) return { error: 'no ${EXPECTED_SHELL.rows}-row full-width shell element was found' };
  candidates.sort((a, b) => (b.r.width * b.r.height) - (a.r.width * a.r.height));
  const shell = candidates[0].el;
  const rows = [...shell.children];
  const topCells = [...rows[0].children];
  const mainColumns = [...rows[rows.length - 1].children];
  if (topCells.length !== ${EXPECTED_SHELL.topCells}) {
    return { error: 'the top strip has ' + topCells.length + ' cells, not ${EXPECTED_SHELL.topCells}' };
  }
  if (mainColumns.length !== ${EXPECTED_SHELL.mainColumns}) {
    return { error: 'the main row has ' + mainColumns.length + ' columns, not ${EXPECTED_SHELL.mainColumns}' };
  }
  const R = (el) => { const r = el.getBoundingClientRect(); return {
    x: Math.round(r.x + off.x), y: Math.round(r.y + off.y),
    width: Math.round(r.width), height: Math.round(r.height) }; };
  return {
    shell: R(shell),
    areas: {
      brandCell: R(topCells[0]),
      menuCell: R(topCells[1]),
      commandCell: R(topCells[2]),
      statusCell: R(topCells[3]),
      tabStrip: R(rows[1]),
      rail: R(mainColumns[0]),
      sectionList: R(mainColumns[1]),
      contentPane: R(mainColumns[2]),
    },
  };
})()`;
}

/** Measures the built renderer, whose document is the page itself. */
export const BUILT_REGION_PROBE = regionProbeExpression('document', '{ x: 0, y: 0 }');

/** Measures the reference side, which the capture harness renders inside an iframe. */
export const REFERENCE_REGION_PROBE = regionProbeExpression(
  "(document.getElementById('design-frame') || {}).contentDocument",
  "(() => { const f = document.getElementById('design-frame'); if (!f) return { x: 0, y: 0 }; const r = f.getBoundingClientRect(); return { x: r.x, y: r.y }; })()",
);

const RECT_KEYS = ['x', 'y', 'width', 'height'];
const isRect = (value) => Boolean(value) && RECT_KEYS.every((k) => Number.isInteger(value[k]));

/**
 * Checks one side's probe result before it is written down as evidence.
 *
 * A probe that returned `{ error }`, or a rect that is not four integers, is refused here
 * rather than reaching the ledger — a region ledger holding a plausible-looking `undefined`
 * would produce a mask of nothing and a chrome comparison that quietly compared the data.
 */
export function validateSideMeasurement(side, measurement, declaredAreas) {
  if (!measurement || typeof measurement !== 'object') throw new Error(`design-parity-regions: the ${side} probe returned ${JSON.stringify(measurement)}`);
  if (measurement.error) throw new Error(`design-parity-regions: the ${side} side could not be measured — ${measurement.error}`);
  if (!isRect(measurement.shell)) throw new Error(`design-parity-regions: the ${side} side reported no shell rectangle`);
  const missing = declaredAreas.filter((name) => !isRect(measurement.areas?.[name]));
  if (missing.length > 0) {
    throw new Error(`design-parity-regions: the ${side} side reported no usable rectangle for ${missing.join(', ')} — every declared area must be measured or the mask silently shrinks`);
  }
  const unexpected = Object.keys(measurement.areas ?? {}).filter((name) => !declaredAreas.includes(name));
  if (unexpected.length > 0) {
    throw new Error(`design-parity-regions: the ${side} side measured ${unexpected.join(', ')}, which design-parity.json's chromeParityBar does not declare a role for — an area with no declared role would be silently treated as chrome`);
  }
  return measurement;
}

/**
 * Reads the bar's declaration out of the inventory, refusing a declaration that could not
 * produce a meaningful comparison.
 *
 * A `chromeParityBar` with no data areas would compare everything and never pass; one with
 * no chrome areas would compare nothing and always pass. Both are refused here, at the one
 * place the declaration is read, rather than discovered as a strange verdict later.
 */
export function readBarDeclaration(inventory) {
  const bar = inventory?.chromeParityBar;
  if (!bar || typeof bar !== 'object') throw new Error('design-parity-regions: design-parity.json has no chromeParityBar declaration');
  const areas = bar.areas;
  if (!areas || typeof areas !== 'object') throw new Error('design-parity-regions: chromeParityBar.areas is missing');
  const names = Object.keys(areas);
  if (names.length === 0) throw new Error('design-parity-regions: chromeParityBar.areas declares no areas');
  const data = names.filter((n) => areas[n].role === 'data');
  const chrome = names.filter((n) => areas[n].role === 'chrome');
  const unknown = names.filter((n) => !['data', 'chrome'].includes(areas[n].role));
  if (unknown.length > 0) throw new Error(`design-parity-regions: chromeParityBar.areas has no role of 'data' or 'chrome' for ${unknown.join(', ')}`);
  if (data.length === 0) throw new Error("design-parity-regions: chromeParityBar.areas declares no 'data' area, so the bar would compare the sample content it exists to exclude");
  if (chrome.length === 0) throw new Error("design-parity-regions: chromeParityBar.areas declares no 'chrome' area, so the bar would compare nothing and pass vacuously");
  const undocumented = names.filter((n) => typeof areas[n].why !== 'string' || areas[n].why.trim().length === 0);
  if (undocumented.length > 0) throw new Error(`design-parity-regions: chromeParityBar.areas gives no reason for ${undocumented.join(', ')} — an area's role is a judgement and has to say what it rests on`);
  return { names, dataAreas: data, chromeAreas: chrome, areas };
}

/**
 * Builds one destination's region ledger from the two sides' measurements.
 *
 * The exclusion for an area is the UNION of the two sides' rectangles: the sides genuinely
 * disagree about some heights, and an intersection would leave a strip of one side's data
 * inside the compared region, reporting it as a chrome defect it is not.
 */
export function buildRegionLedger({ destinationId, tuple, reference, built, inventory }) {
  if (!destinationId) throw new Error('buildRegionLedger: destinationId is required');
  const declaration = readBarDeclaration(inventory);
  validateSideMeasurement('reference', reference, declaration.names);
  validateSideMeasurement('built', built, declaration.names);

  const union = (a, b) => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
  };

  const areas = {};
  for (const name of declaration.names) {
    areas[name] = {
      role: declaration.areas[name].role,
      why: declaration.areas[name].why,
      reference: reference.areas[name],
      built: built.areas[name],
      union: union(reference.areas[name], built.areas[name]),
    };
  }
  return {
    destinationId,
    bar: 'chrome-parity',
    tuple,
    shell: { reference: reference.shell, built: built.shell },
    areas,
    exclusions: declaration.dataAreas.map((name) => ({ area: name, ...areas[name].union })),
    comparedAreas: declaration.chromeAreas,
  };
}

/** The exclusion rectangles and named chrome areas `compareChrome` takes, out of a ledger. */
export function maskFromLedger(ledger) {
  if (!Array.isArray(ledger?.exclusions)) throw new Error('maskFromLedger: the region ledger has no exclusions array');
  if (!Array.isArray(ledger?.comparedAreas)) throw new Error('maskFromLedger: the region ledger has no comparedAreas array');
  const exclusions = ledger.exclusions.map(({ x, y, width, height }) => ({ x, y, width, height }));
  const areas = {};
  for (const name of ledger.comparedAreas) {
    const union = ledger.areas?.[name]?.union;
    if (!isRect(union)) throw new Error(`maskFromLedger: the region ledger has no measured rectangle for the compared area '${name}'`);
    areas[name] = union;
  }
  return { exclusions, areas };
}
