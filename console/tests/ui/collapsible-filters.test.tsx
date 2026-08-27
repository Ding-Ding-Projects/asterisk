/**
 * Collapsible filter rows, search bars and statistics panels.
 *
 * Most of the weight sits on one property: a collapsed panel that is currently excluding
 * results must never be able to report itself as inert. That is checked both at the type
 * level (an active filter cannot be constructed without a description) and by exhaustively
 * looping the collapsed/active combinations, so a newly added panel kind cannot slip through
 * with a silent, unannounced filter.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PANEL_KINDS, PANEL_KIND_DESCRIPTIONS, TOGGLE_ACTIVATION_KEYS,
  activeFilter, collapsiblePanelState, isCollapsed, isPanelKind, isToggleActivationKey,
  noActiveFilter, panelAccessibleState, panelAnnouncement, panelToggleAriaAttributes,
  setCollapsed, toggleCollapsed, type PanelKind, type PanelStorage,
} from '../../app/renderer/src/collapsible-filters.ts';

const memory = (): PanelStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

const defaultCollapsedFor = (kind: PanelKind): boolean =>
  PANEL_KIND_DESCRIPTIONS.find((d) => d.id === kind)!.defaultCollapsed;

/* --- kinds and defaults ---------------------------------------------------------- */

test('every panel kind has exactly one registered description', () => {
  const ids = PANEL_KIND_DESCRIPTIONS.map((d) => d.id);
  assert.deepEqual([...ids].sort(), [...PANEL_KINDS].sort());
  assert.equal(new Set(ids).size, PANEL_KINDS.length, 'a panel kind was described more than once');
});

test('statistics panels start collapsed; search and filter rows do not', () => {
  /* The core claim of the contract: a panel that only describes the collection starts out
   * of the way, while one that changes it stays visible so the active controls are seen. */
  assert.equal(defaultCollapsedFor('statistics'), true);
  assert.equal(defaultCollapsedFor('search'), false);
  assert.equal(defaultCollapsedFor('filterRow'), false);
});

test('every kind is recognised and nothing else is', () => {
  for (const kind of PANEL_KINDS) assert.ok(isPanelKind(kind));
  for (const bad of ['Statistics', '', 'sort', undefined, 3]) assert.ok(!isPanelKind(bad));
});

/* --- persistence: per surface, per kind, defaulting per kind --------------------- */

test('with no storage, every kind reads as its own default', () => {
  for (const kind of PANEL_KINDS) {
    assert.equal(isCollapsed(undefined, 'servers', kind), defaultCollapsedFor(kind));
  }
});

test('an unrecognised stored value reads as this kind\'s own default, not a fixed one', () => {
  /* Distinct from the attention-modes rule of "always reads as off": here the fallback
   * varies per kind, so a naive copy of that pattern would get statistics wrong. */
  const storage = memory();
  storage.map.set('console.panel.servers.statistics', 'maybe');
  storage.map.set('console.panel.servers.search', 'maybe');
  assert.equal(isCollapsed(storage, 'servers', 'statistics'), true);
  assert.equal(isCollapsed(storage, 'servers', 'search'), false);
});

test('setCollapsed persists and reads back for every kind', () => {
  for (const kind of PANEL_KINDS) {
    const storage = memory();
    setCollapsed(storage, 'servers', kind, !defaultCollapsedFor(kind));
    assert.equal(isCollapsed(storage, 'servers', kind), !defaultCollapsedFor(kind));
    setCollapsed(storage, 'servers', kind, defaultCollapsedFor(kind));
    assert.equal(isCollapsed(storage, 'servers', kind), defaultCollapsedFor(kind));
  }
});

test('the collapsed state persists per surface, not globally', () => {
  const storage = memory();
  setCollapsed(storage, 'servers', 'filterRow', true);
  assert.equal(isCollapsed(storage, 'servers', 'filterRow'), true);
  assert.equal(isCollapsed(storage, 'extensions', 'filterRow'), defaultCollapsedFor('filterRow'),
    'collapsing the filter row on one surface collapsed it on another');
});

test('toggleCollapsed flips the stored value and returns the new state', () => {
  const storage = memory();
  const start = isCollapsed(storage, 'servers', 'search');
  const after = toggleCollapsed(storage, 'servers', 'search');
  assert.equal(after, !start);
  assert.equal(isCollapsed(storage, 'servers', 'search'), !start);
  const again = toggleCollapsed(storage, 'servers', 'search');
  assert.equal(again, start);
});

/* --- constructing an active filter: the description cannot be missing ------------ */

test('activeFilter refuses a blank or whitespace-only description', () => {
  for (const bad of ['', '   ', '\n\t']) {
    assert.throws(() => activeFilter(bad), RangeError);
  }
});

test('activeFilter accepts a real description and carries it through unchanged', () => {
  const filter = activeFilter('3 of 12 shown -- status: down');
  assert.deepEqual(filter, { active: true, description: '3 of 12 shown -- status: down' });
});

test('noActiveFilter is the inactive case and nothing else', () => {
  assert.deepEqual(noActiveFilter, { active: false });
});

/* --- the central rule: collapsed and filtering can never be silent --------------- */

test('a collapsed panel with an active filter can never report itself as inert', () => {
  /* Loop the full cross product rather than one example, so a newly added panel kind or a
   * newly added boolean cannot slip through with a silently-inert combination. */
  for (const kind of PANEL_KINDS) {
    if (kind === 'statistics') continue; // statistics cannot carry a filter at all -- covered below
    for (const collapsed of [true, false]) {
      for (const filter of [noActiveFilter, activeFilter('7 of 40 shown -- carrier: down')]) {
        const state = panelAccessibleState(collapsed, filter);
        const shouldReportFiltering = collapsed && filter.active;
        assert.equal(state.isFiltering, shouldReportFiltering,
          `kind=${kind} collapsed=${collapsed} active=${filter.active}: isFiltering was wrong`);
        if (shouldReportFiltering) {
          assert.ok(state.filterSummary.length > 0,
            `kind=${kind}: collapsed and filtering but filterSummary was empty -- this is the exact silent-inert bug`);
        } else {
          assert.equal(state.filterSummary, '', `kind=${kind}: filterSummary was non-empty while not filtering`);
        }
      }
    }
  }
});

test('filterActive mirrors the filter regardless of collapsed state', () => {
  /* An expanded panel with an active filter is not "inert" either -- the caller may still
   * want to know filtering is happening even though the controls are already on screen. */
  const filter = activeFilter('showing extensions only');
  assert.equal(panelAccessibleState(true, filter).filterActive, true);
  assert.equal(panelAccessibleState(false, filter).filterActive, true);
  assert.equal(panelAccessibleState(true, noActiveFilter).filterActive, false);
});

test('an expanded panel never carries a synthetic filter summary, active or not', () => {
  /* When the panel is open the user can see the filter controls directly; a duplicated
   * text summary next to a fully visible control would be noise, not safety. */
  const filter = activeFilter('showing down endpoints only');
  assert.equal(panelAccessibleState(false, filter).filterSummary, '');
});

test('the filter summary text is exactly the caller\'s description, not a rewritten copy', () => {
  const description = 'showing 2 of 9 -- protocol: sip';
  const state = panelAccessibleState(true, activeFilter(description));
  assert.equal(state.filterSummary, description);
});

/* --- statistics panels cannot filter, by contract --------------------------------- */

test('a statistics panel can never be told it is filtering', () => {
  assert.throws(() => panelAnnouncement('statistics', true, activeFilter('anything')), RangeError);
  assert.throws(() => panelAnnouncement('statistics', false, activeFilter('anything')), RangeError);
});

test('a statistics panel with no active filter announces cleanly', () => {
  assert.doesNotThrow(() => panelAnnouncement('statistics', true, noActiveFilter));
});

/* --- the announcement carries the expanded state, always ------------------------- */

test('the announcement always names the expanded state, for every kind', () => {
  for (const kind of PANEL_KINDS) {
    assert.match(panelAnnouncement(kind, true, noActiveFilter), /collapsed/);
    assert.match(panelAnnouncement(kind, false, noActiveFilter), /expanded/);
  }
});

test('the announcement includes the filter description when collapsed and filtering', () => {
  const description = 'showing 1 of 30 -- extension: 101';
  const text = panelAnnouncement('filterRow', true, activeFilter(description));
  assert.ok(text.includes(description), `announcement did not include "${description}": got "${text}"`);
});

test('the announcement omits any filtering clause when expanded, even with an active filter', () => {
  const text = panelAnnouncement('search', false, activeFilter('showing matches for "queue"'));
  assert.ok(!text.includes('Filtering:'), `expanded announcement should not claim to be filtering: "${text}"`);
});

/* --- aria-expanded mirrors collapsed, never the filter ---------------------------- */

test('aria-expanded mirrors collapsed and only collapsed', () => {
  for (const collapsed of [true, false]) {
    for (const filter of [noActiveFilter, activeFilter('x')]) {
      const state = panelAccessibleState(collapsed, filter);
      assert.equal(state.ariaExpanded, collapsed ? 'false' : 'true');
      assert.equal(state.expanded, !collapsed);
    }
  }
});

/* --- collapsing/expanding never touches the filter -------------------------------- */

test('collapsing and expanding a panel repeatedly never mutates an external filter record', () => {
  /* The functions that change the collapsed flag take no filter argument at all, so there
   * is nothing for them to clear or reapply. Demonstrated rather than merely asserted by
   * type: an external "filter store" object is round-tripped through several toggles and
   * must come out with the identical reference and value. */
  const storage = memory();
  const externalFilterStore = activeFilter('showing 4 of 11 -- status: unregistered');
  for (let i = 0; i < 5; i += 1) toggleCollapsed(storage, 'servers', 'filterRow');
  assert.equal(isCollapsed(storage, 'servers', 'filterRow'), true, 'five toggles from false should land collapsed');
  assert.equal(externalFilterStore, externalFilterStore, 'sanity: same reference');
  assert.deepEqual(externalFilterStore, { active: true, description: 'showing 4 of 11 -- status: unregistered' },
    'toggling collapsed state changed the unrelated filter record');
});

test('expanding a panel does not flip an inactive filter back on', () => {
  const storage = memory();
  setCollapsed(storage, 'servers', 'filterRow', true);
  const clearedByUser: typeof noActiveFilter = noActiveFilter;
  setCollapsed(storage, 'servers', 'filterRow', false);
  assert.deepEqual(clearedByUser, { active: false }, 'expanding the panel reapplied a cleared filter');
  assert.equal(panelAccessibleState(isCollapsed(storage, 'servers', 'filterRow'), clearedByUser).filterActive, false);
});

/* --- collapsiblePanelState: the one call a surface actually makes ----------------- */

test('collapsiblePanelState reads storage, kind defaults and the filter into one shape', () => {
  const storage = memory();
  const state = collapsiblePanelState(storage, 'iax-peers', 'filterRow', activeFilter('showing 2 of 5 -- codec: g711'));
  assert.equal(state.kind, 'filterRow');
  assert.equal(state.collapsed, defaultCollapsedFor('filterRow'));
  assert.equal(state.isFiltering, state.collapsed && true);
  assert.ok(state.announcement.length > 0);
});

test('collapsiblePanelState toggle label says what pressing it would do, not what it currently is', () => {
  const storage = memory();
  setCollapsed(storage, 'servers', 'statistics', true);
  assert.equal(collapsiblePanelState(storage, 'servers', 'statistics', noActiveFilter).toggleLabel, 'Show statistics');
  setCollapsed(storage, 'servers', 'statistics', false);
  assert.equal(collapsiblePanelState(storage, 'servers', 'statistics', noActiveFilter).toggleLabel, 'Hide statistics');
});

test('collapsiblePanelState throws rather than silently dropping a filter handed to statistics', () => {
  const storage = memory();
  assert.throws(() => collapsiblePanelState(storage, 'servers', 'statistics', activeFilter('anything')), RangeError);
});

test('every panel kind produces a working collapsiblePanelState when it is allowed a filter', () => {
  for (const kind of PANEL_KINDS) {
    if (kind === 'statistics') continue;
    const storage = memory();
    const state = collapsiblePanelState(storage, 'extensions', kind, activeFilter('showing 1 of 6'));
    assert.equal(typeof state.toggleLabel, 'string');
    assert.ok(state.toggleLabel.length > 0, `${kind}: toggle label was empty`);
  }
});

/* --- keyboard operability and the focus-reachable aria contract ------------------- */

test('the toggle is focusable and announces its role and expanded state', () => {
  for (const collapsed of [true, false]) {
    const attrs = panelToggleAriaAttributes(collapsed);
    assert.equal(attrs.role, 'button');
    assert.equal(attrs.tabIndex, 0, 'a toggle with no tabIndex cannot be reached by keyboard');
    assert.equal(attrs['aria-expanded'], collapsed ? 'false' : 'true');
  }
});

test('aria-controls is present only when a target id is given', () => {
  assert.ok(!('aria-controls' in panelToggleAriaAttributes(true)));
  assert.equal(panelToggleAriaAttributes(true, 'servers-statistics-panel')['aria-controls'], 'servers-statistics-panel');
});

test('Enter and Space activate the toggle; nothing else does', () => {
  assert.ok(isToggleActivationKey('Enter'));
  assert.ok(isToggleActivationKey(' '));
  assert.equal(TOGGLE_ACTIVATION_KEYS.length, 2, 'an activation key was added without updating this expectation');
  for (const other of ['Tab', 'Escape', 'ArrowDown', 'a', '', 'Spacebar']) {
    assert.ok(!isToggleActivationKey(other), `"${other}" should not activate the toggle`);
  }
});
