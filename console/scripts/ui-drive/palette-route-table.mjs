/**
 * The palette routes the committed built-interaction records claim were driven, derived from
 * those records rather than transcribed beside them.
 *
 * WHY DERIVED. Twenty-six of the thirty-nine records under `release/evidence/windows-console/`
 * carry an `observedPanelControls` field. Twenty-five of them recorded an empty list, and every
 * one of those twenty-five names, in its own `action` prose, the query it typed into the command
 * palette and the result it clicked. A hand-written copy of that list is a second authority that
 * drifts from the first the day a record is edited, and nothing would say so; reading the records
 * on every run means a route that changes changes here too, and a record that stops being a
 * palette route fails loudly instead of being quietly driven against a query it no longer claims.
 *
 * WHAT A ROUTE IS. `query` is the string the record says was typed. `expectedTarget` is the
 * record's own `observedTarget`. Neither is invented and neither is normalised: where a record
 * names its target in prose rather than as a palette row label -- `language-modes` says
 * "Language section, Customise everything" and `narration` says "Narration section, Customise
 * everything" -- the driver reports that the expected target was not among the rows and says
 * which row it activated instead, because silently substituting one for the other would produce
 * a record that reads as a match and is not one.
 *
 * Everything here is a pure function over already-read JSON, so `tests/scripts/palette-routes.test.mjs`
 * exercises the whole derivation without a browser, an application, or a driving session.
 */

/** The field whose twenty-five empty readings this whole exercise exists to replace. */
export const OBSERVED_FIELD = 'observedPanelControls';

/**
 * The records that carry `observedPanelControls` and are NOT palette routes.
 *
 * Named by exact file, with the reason, rather than inferred from a missing query -- an
 * inference would silently absorb a palette record whose prose stopped naming its query, which
 * is precisely the record that most needs to fail. The derivation asserts each name is really
 * present among the candidates, so an allowance that has stopped excusing anything is an error
 * rather than a comment nobody removed.
 */
export const NON_PALETTE_RECORDS = Object.freeze({
  'regex-builder': 'driven from the dashboard section-search row rather than through the command '
    + 'palette, and the only one of the twenty-six whose reading was not empty',
});

/** `typed 'x'` out of a record's own action prose. Returns null when the prose names no query. */
export function queryFromAction(action) {
  if (typeof action !== 'string') return null;
  const match = /typed '([^']*)'/u.exec(action);
  if (!match) return null;
  const query = match[1].trim();
  return query.length > 0 ? query : null;
}

/**
 * Turn `{ feature -> record }` into the ordered route table.
 *
 * Throws rather than skipping. A route table that quietly drops a record it could not read is
 * a table that reports full coverage of whatever it happened to understand.
 */
export function deriveRoutes(recordsByFeature) {
  const entries = Object.entries(recordsByFeature).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const candidates = entries.filter(([, record]) => Array.isArray(record?.interaction?.[OBSERVED_FIELD]));
  if (candidates.length === 0) {
    throw new Error(`palette-route-table: no record carries ${OBSERVED_FIELD}, so this derivation would cover nothing`);
  }

  const routes = [];
  const excluded = [];
  for (const [feature, record] of candidates) {
    const interaction = record.interaction;
    const query = queryFromAction(interaction.action);
    if (query === null) {
      const reason = NON_PALETTE_RECORDS[feature];
      if (!reason) {
        throw new Error(`palette-route-table: ${feature} carries ${OBSERVED_FIELD} but its action names no typed query, `
          + 'and it is not one of the records declared as reached another way');
      }
      excluded.push({ feature, reason });
      continue;
    }
    const expectedTarget = typeof interaction.observedTarget === 'string' ? interaction.observedTarget.trim() : '';
    if (expectedTarget.length === 0) {
      throw new Error(`palette-route-table: ${feature} names a typed query but no observedTarget, `
        + 'so there is nothing to say the activation reached');
    }
    routes.push({
      feature,
      query,
      expectedTarget,
      recordedControlCount: interaction[OBSERVED_FIELD].length,
      recordedRoute: typeof interaction.route === 'string' ? interaction.route : '',
    });
  }

  for (const [feature, reason] of Object.entries(NON_PALETTE_RECORDS)) {
    if (!excluded.some((entry) => entry.feature === feature)) {
      throw new Error(`palette-route-table: '${feature}' is declared as reached another way, but no such record `
        + `carries ${OBSERVED_FIELD} without a typed query, so the allowance now excuses nothing: ${reason}`);
    }
  }
  if (routes.length === 0) {
    throw new Error('palette-route-table: every candidate was excluded, so the table would be empty');
  }
  return { routes, excluded };
}

/**
 * Recount every summary claim a readings file makes, from its own per-route data.
 *
 * The point is narrow and worth stating: a summary written by the same run that wrote the rows
 * is a claim about the rows, not a reading of them. Recomputing it here means a hand-edited
 * total cannot survive, which is the one lie a reader of the file has no other way to catch.
 */
export function recountSummary(routeReadings) {
  const list = Array.isArray(routeReadings) ? routeReadings : [];
  const count = (predicate) => list.filter(predicate).length;
  const focused = (r) => typeof r?.afterActivation?.focusedControlId === 'string'
    && r.afterActivation.focusedControlId.length > 0;
  return {
    routesDriven: list.length,
    paletteOpened: count((r) => r?.paletteUp?.panelFound === true),
    expectedTargetPresent: count((r) => r?.activation?.expectedTargetPresent === true),
    expectedTargetAmbiguous: count((r) => r?.activation?.expectedTargetAmbiguous === true),
    /* An observation, never a verdict. Whether a route SHOULD have focused a control depends on
     * whether the row it activated is a destination or a setting, and the rendered row cannot
     * say which -- so that judgement belongs to the checker, which reads the compiled palette,
     * and not to a count taken here. A dead end worth keeping visible: classifying by the
     * context string this application prints beside a row does not work, because a destination
     * gets the literal `Destination` only when its title equals its label, and `Status hub`
     * (title `Status hub sessions`) therefore reads as a setting and appears to have failed. */
    routesWithFocusedControl: count(focused),
    noPanelAfterActivation: count((r) => r?.afterActivation?.panel?.panelFound === false),
    readingsTruncatedAtControlCap: count((r) => r?.paletteUp?.controlListTruncated === true),
    totalControlsObserved: list.reduce(
      (sum, r) => sum + (Array.isArray(r?.paletteUp?.[OBSERVED_FIELD]) ? r.paletteUp[OBSERVED_FIELD].length : 0),
      0,
    ),
  };
}

/**
 * Every way a readings file can disagree with the route table it claims to speak for.
 *
 * Returns a list of complaints rather than throwing on the first, so a check run names all of
 * them at once instead of one per invocation.
 */
export function reconcile(readings, routes) {
  const problems = [];
  const list = Array.isArray(readings?.routes) ? readings.routes : [];
  const seen = new Map();
  for (const reading of list) {
    if (seen.has(reading?.feature)) problems.push(`${reading.feature} appears more than once in the readings`);
    seen.set(reading?.feature, reading);
  }
  for (const route of routes) {
    const reading = seen.get(route.feature);
    if (!reading) { problems.push(`${route.feature} is a palette route in the records and has no reading`); continue; }
    if (reading.query !== route.query) {
      problems.push(`${route.feature} was driven with ${JSON.stringify(reading.query)} `
        + `but its record names ${JSON.stringify(route.query)}`);
    }
    if (reading.expectedTarget !== route.expectedTarget) {
      problems.push(`${route.feature} recorded an expected target of ${JSON.stringify(reading.expectedTarget)} `
        + `but its record names ${JSON.stringify(route.expectedTarget)}`);
    }
  }
  for (const feature of seen.keys()) {
    if (!routes.some((route) => route.feature === feature)) {
      problems.push(`${feature} has a reading but is not a palette route in the records`);
    }
  }

  const recounted = recountSummary(list);
  for (const [key, value] of Object.entries(recounted)) {
    if (readings?.summary?.[key] !== value) {
      problems.push(`summary.${key} says ${JSON.stringify(readings?.summary?.[key])} `
        + `but the per-route readings recount to ${value}`);
    }
  }
  return problems;
}
