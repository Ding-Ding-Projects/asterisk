# Command palette

A `Ctrl+Shift+F`-activated global search that jumps directly to any command, setting, or destination in the product.

## Behavior

The palette is meant to list every command, feature page, destination, and setting, and to teleport the user to the exact matching control rather than only its containing page.

## Configuration

Results would render as rich, interactive rows — a settings row with its actual live control inline — rather than plain text, in either a compact or a full-window view.

## Current status

**Desktop application:** Not implemented. The desktop application has no command palette or global keyboard-activated search of any kind.

**Documentation website:** Implemented for the shared shell. Every page responds to `Ctrl+Shift+F`, searches all top-level pages, direct composed article URLs, and exact shared controls, and opens a selected control with focus. Article results no longer depend on a paginated destination card being present.

## Failure modes

An empty result says that no page, article, or control matched. The palette uses direct article paths instead of hash targets that can be absent from the current pagination page.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Regex builder](regex-builder.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Platform feature index](README.md).
