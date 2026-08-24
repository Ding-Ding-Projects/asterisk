# Browser-style tabbed navigation

Presents application and settings content as discrete, navigable tabs rather than one long scrolling page.

## Behavior

Every major surface, including settings, is meant to use a persistent tab strip, dockable to any screen edge, with overflow handling, reordering, and pinning, rather than a single scrolling column.

## Configuration

Tabs would support keyboard navigation with correct roles and states, and the strip would collapse gracefully at narrow widths without clipping labels.

## Current status

**Desktop application:** Partial. A left navigation rail separates the app's screens, which gives some of the navigational benefit of tabs, but there is no true tab strip with overflow handling, reordering, pinning, or edge-docking choice.

**Documentation website:** Partial. Every top-level page and composed article receives the same ARIA tablist with persisted left, right, top, and bottom docking. Left is the default, and side docking collapses to the compact header below 900px. Reordering, pinning, grouping, overflow management, and the four independent tab searches remain incomplete.

## Failure modes

When more tabs are open than the strip can show, the intended behavior is an overflow menu listing the rest rather than silently clipping the last tab off-screen; there is no tab strip yet to overflow.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Tab groups and tab search](tab-groups-and-searches.md), [Command palette](command-palette.md), [Material appearance system](material-appearance.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
