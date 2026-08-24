# Browser-style tabbed navigation

Presents application and settings content as discrete, navigable tabs rather than one long scrolling page.

## Behavior

The documentation route strip is a navigation surface with browser-style tab presentation. It persists a left default, supports left, right, top, and bottom docking, keeps pinned routes first, scrolls overflow instead of clipping labels, and offers keyboard traversal. Each route keeps a real accessible `main` panel, so the site does not claim that separate HTML documents are one ARIA tabpanel.

## Configuration

The strip stores its route order, pinned routes, group membership, appearance choices, and toy-lock records in bounded browser storage. Route links use navigation semantics with `aria-current` and `aria-controls="main"`; the side presentation uses vertical arrow traversal and the top or bottom presentation uses horizontal traversal. At narrow widths the side rail becomes a compact header and every edge keeps an internally scrolling strip.

## Current status

**Desktop application:** Partial. A left navigation rail separates the app's screens, which gives some of the navigational benefit of tabs, but there is no true tab strip with overflow handling, reordering, pinning, or edge-docking choice.

**Documentation website:** Partial, local equivalent implemented and runtime proof unverified. Every top-level route receives the shared route strip with persisted docking, pinned-first ordering, overflow scrolling, keyboard traversal, local groups, local appearance, local toy locks, and a tab manager. The surface is navigation across separate documents, not a single ARIA tablist with hidden panels.

## Failure modes

When more routes are present than the strip can show, the strip scrolls internally and keeps pinned routes at the beginning of the ordered list. The browser page owns the actual navigation and reports that it cannot keep a remote panel open across documents.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The registry therefore remains `implemented-unverified` for the route-strip equivalent. The desktop application row remains partial and is not changed by this site lane.

## Suggested articles

[Tab groups and tab search](tab-groups-and-searches.md), [Command palette](command-palette.md), [Material appearance system](material-appearance.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
