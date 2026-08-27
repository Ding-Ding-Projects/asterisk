# Tabs, searches, anchored regex builders, and the command palette

This article defines the navigation contract for tabs, tab discovery, local menu
search, bulk tab actions, and the command palette. It is deliberately explicit
about ownership and state so that a search result always leads to the same place
as the control it describes.

The current implementation supplies persistent state, reducers, bounded search
evaluation, capability models, close previews, a command registry, a palette
index, and exact teleport instructions. Rendering, shortcut registration,
overlay placement, local-history events, and central application wiring remain
with the owning renderer changes and are not claimed by this core lane.

## Browser-style tabs

The model represents application destinations and settings sections as separate
browser-style tabs.
The tab strip is a real `tablist`, and each destination is a `tab` connected to a
corresponding `tabpanel`. The strip docks to the left, right, top, or bottom edge
of its surface. Left is the default. The selected edge, tab order, pinned order,
groups, group order, and collapsed state persist locally per surface.

The strip provides all of the following behaviors:

- Reorder tabs with pointer and keyboard operations.
- Pin and unpin tabs. Pinned tabs occupy a stable protected region and remain
  visible when ordinary tabs overflow.
- Create, name, rename, recolor, reorder, collapse, expand, and remove tab
  groups. Moving a tab into a collapsed group does not expand that group.
- Open an overflow surface when the strip cannot show every tab. Overflow is
  scrollable and never silently clips a tab label.
- Keep full accessible names when a narrow layout reduces the strip to icons or
  an edge affordance.
- Expose normal tab management from the context menu and expose `Edit tab
  appearance...` in that same menu. Shift plus right-click opens the anchored
  appearance editor directly when the platform supports the modifier.

Keyboard navigation follows the strip orientation. A horizontal strip uses left
and right arrows, while a vertical strip uses up and down arrows. Focus is always
visible, and the selected tab, its controls, and its panel expose their current
state to assistive technology.

## Four independent tab searches

The state API defines four separate searches. They do not share query text,
regular-expression mode, flags, validation state, or result focus.

1. **Current strip search** searches the tabs in the active strip.
2. **Group search** is available inside every tab group and searches that group's
   tabs only.
3. **Group-name search** searches visible group names and labels.
4. **Master tab search** searches every open tab owned by the application, across
   all windows, workspaces, strips, and groups.

Every result identifies its location: window or workspace, strip edge, group,
pinned state, and visible tab label. Activating a result reveals the result in a
collapsed group without changing that group's persisted collapsed preference.
It selects the target tab, returns focus to the target, and provides an obvious
keyboard path back to the originating search.

Plain text is the default mode. Each search has its own adjacent builder button,
and choosing regex mode is an explicit user action. An empty result is a named
no-match state, not a blank list.

## Anchored regex builders

The regex builder belongs to the search field that opened it. It is an anchored
popover or inline panel, not a distant global dialog. The anchor remains clear
when the viewport changes, and the panel is bounded by the viewport with an
internal scroll region when necessary.

The renderer contract for the builder includes:

- Guided controls for literals, character classes, anchors, groups, alternation,
  and quantifiers.
- A raw pattern editor and the flags supported by the application's actual regex
  engine.
- Sample text, syntax feedback, live matches, and capture groups.
- Copy and export actions that preserve the pattern and flags.
- A visible indication of whether the field is in plain-text or regex mode.

The query, pattern, flags, validation result, and mode synchronize in both
directions. Switching back to plain text does not discard the user's pattern;
switching to regex restores it for that field. The builder states the engine
dialect, escaping rules, input limits, and evaluation timeout. Patterns and
sample text are evaluated locally. The core evaluator bounds pattern size,
candidate size, candidate count, match count, and elapsed work between
candidates, and rejects several high-risk pattern forms. A renderer that needs
hard interruption of one native regular-expression operation must host the
evaluator in its cancellable worker boundary.
Zero-width matches, Unicode, multiline input, invalid syntax, no matches, and
capture groups have explicit result states.

The same field-owned builder is required for every search surface described in
this article. It is also required beside each dropdown filter and context-menu
filter, including short menus.

## Dropdowns and context menus

Every select, combobox, picker, autocomplete list, menu button, overflow menu,
and right-click menu opens with a keyboard-accessible local filter field. The
field searches the visible items in that menu only. It has its own anchored regex
builder and its own plain-text-first query state.

Filtering never changes an item's action, reorders items to change their meaning,
or removes an action from keyboard access without showing why. Arrow keys move
through the filtered set, Enter activates, and Escape first clears the filter and
then closes the menu. Focus returns to the control that opened the menu. The
filtered count and an honest no-match message are announced to assistive
technology.

## Bulk-close previews

Each tab strip and searchable tab list provides both **Close tabs containing
text** and **Close tabs not containing text**. Both actions use the visible tab
label or title, never hidden page content. They share the exact same predicate,
including case, Unicode, flags, and regex mode, so the inverse action is a true
logical inverse rather than a second implementation.

Before closing, the surface shows the entered query, match mode, exact number of
tabs that would close, and a reviewable preview. Empty queries and invalid
patterns cannot run. Pinned tabs are excluded by default, and an explicit
include-pinned choice is part of the reviewed preview. Locked, non-closable, and
unsaved-work tabs remain excluded. A partial result reports which tabs were
closed, skipped, cancelled, or refused.

Bulk actions are keyboard accessible and use the application's destructive-action
confirmation for irreversible closes. They record the result in local history
when the application owns the affected tab state, and they remain cancellable
while a long operation is in progress.

## Command palette

The command registry is designed for the owning renderer to open the command
palette with `Ctrl+Shift+F`. That is the global shortcut contract for the
Windows desktop surface, and `Ctrl+K` is not a competing default. Shortcut
wiring is outside this reducer-only lane.

The palette indexes every command, destination, feature article, setting,
appearance control, nested tab, group, and documentation route. Its search is
plain-text-first and has its own anchored full regex builder. Results retain
keyboard navigation, an accessible name, and enough context to distinguish two
similarly named controls.

Palette rows are rich controls where the target supports a live value. A setting
row can expose its real switch, checkbox, text field, stepper, slider, select, or
color control inline. The row uses the same validation, persistence,
localization, history, and accessibility behavior as the originating control.
An action row exposes its real action and target context rather than a decorative
label.

Selecting a result teleports to the exact target. The palette opens the owning
surface, selects the correct tab and group, reveals the target if it is inside a
collapsed group, scrolls it into view, focuses it, and briefly highlights it
without changing unrelated state. A result for a locked target opens the target's
unlock route. A result that cannot be reached reports the exact missing route or
state instead of silently opening a nearby page.

The palette offers a bounded card view and a full-window view. The selected size
persists locally, and the palette itself remains searchable and keyboard
operable in both sizes.

## Configuration and persistence

Tab, group, search, menu-filter, bulk-close, and palette state is stored in a
versioned local schema. Stable identifiers are used for surfaces, windows,
strips, groups, tabs, searches, and palette targets. Persisted state includes:

- Tab and group order, pinned order, membership, edge docking, and collapsed
  state.
- The active query, regex mode, pattern, flags, and last validated state for each
  independent search field, where retaining query state is enabled by the
  surface.
- Palette size, recent navigation context, and user-selected display options.

The schema currently accepts version 1 and rejects unsupported versions,
malformed values, oversized patterns, and invalid identifiers without partially
applying the record. A future schema change must add an explicit deterministic
migration. Clearing local application data resets this state to the documented
defaults. Local-history recording is an integration responsibility of the
surface that dispatches settings, tab, group, bulk, or palette actions.

## Integration seams

The navigation implementation exposes these seams to its owning renderer and
application shell:

| Seam | Required contract |
| --- | --- |
| Tab registry | Stable tab, group, strip, window, and workspace identifiers plus visible labels and pinned state. |
| Search adapter | A field-scoped query, pattern, flags, mode, validation result, bounded evaluator, and result location. |
| Overlay anchor | The opening control, viewport bounds, focus return target, and collision-aware placement. |
| Menu adapter | Visible menu items, action identity, keyboard shortcuts, disabled-state reason, and local filter scope. |
| Bulk-close planner | The exact predicate, protected-item policy, preview rows, cancellation handle, and per-tab outcome. |
| Palette index | Commands and destinations with stable target paths, rich-control descriptors, and teleport callbacks. |
| Persistence adapter | Versioned records, load, save, reset, and visible write errors. Atomic storage and local-history events belong to the supplied storage integration. |

Adapters must use stable target identity rather than display text. Display labels
can be renamed or localized, while a teleport callback must still reach the same
element. The renderer must not accept arbitrary executable actions, unbounded
patterns, or caller-supplied paths through these seams.

## Failure modes and recovery

The user receives an actionable, non-blocking notification for recoverable
failures. Examples include an unavailable search index, an invalid regex, a
stale target identifier, a failed persistence write, an overflow surface that
cannot be positioned, or a target that is currently locked. The message names
what was attempted, what remains unchanged, and the next available action.

The implementation must fail closed in these cases:

- An invalid or over-limit pattern produces no matches and cannot trigger a bulk
  action.
- A stale palette target does not fall back to a similarly named control.
- A failed persistence write does not claim that tab or group state was saved.
- A protected tab is never closed because a preview omitted its protection state.
- A missing group or strip does not cause a result to teleport into another
  window or workspace.
- A timed-out multi-candidate evaluation stops adding results, marks the result
  truncated, and reports the timeout. Hard interruption of one native regex
  call requires the renderer's cancellable worker boundary.

When a target disappears between indexing and activation, the palette keeps the
user's query, identifies the stale result, refreshes its index, and offers a
retry. It does not invoke a guessed action.

## Security, privacy, and bounds

Search, regex evaluation, tab metadata, and palette navigation run locally.
Patterns, sample text, tab labels, group labels, and navigation history are not
sent to a server or placed in telemetry. Exports and ordinary diagnostics omit
private search contents and credentials. A palette result never serializes a
credential, secret, private file content, or hidden page data merely because the
target is searchable.

Core inputs are bounded by record size, entry count, identifier length, pattern
length, candidate length, match count, elapsed multi-candidate evaluation time,
and result count. Regex evaluation must be isolated from the UI event loop by
the owning renderer when a hard per-operation deadline is required. Menu
filters inspect only their menu's visible items. Tab searches inspect only the
metadata declared by the tab registry. Bulk close inspects only visible labels
and titles, never document contents or hidden fields.

## Verification boundary

Documentation for this contract is complete when every surface names its own
tab registry, four search fields, anchored builder, menu and dropdown filters,
bulk-close preview, palette index, teleport target, persistence record, and
failure state. Implementation verification is separate. It must exercise the
real built desktop artifact, including keyboard navigation, focus return,
vertical and horizontal strips, overflow, groups, protected tabs, invalid and
pathological regex input, menu filtering, both bulk-close actions, rich palette
rows, exact teleport targets, stale targets, persistence across restart, and
narrow and high-scale layouts. A source-only assertion or mock overlay does not
prove the built interaction.

This core change does not claim that those runtime, capture, or test checks were
performed. The assigned lane is limited to reusable reducers and adapters plus
this contract and its verification boundary.

## Suggested articles

- [Browser-style tabbed navigation](../../platform/browser-style-tabs.md)
- [Tab groups and tab search](../../platform/tab-groups-and-searches.md)
- [Regex builder](../../platform/regex-builder.md)
- [Command palette](../../platform/command-palette.md)
- [Bounded overlays](../../platform/bounded-overlays.md)
- [Bulk actions](../../platform/bulk-actions.md)
- [Context-menu shortcuts](../../platform/context-menu-shortcuts.md)
- [Local version history](../../platform/local-version-history.md)
