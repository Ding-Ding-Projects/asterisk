# Regex builder

A guided pattern-building tool attached to every search field, letting a user construct a regular expression without knowing the syntax by heart.

## Behavior

Every search bar, dropdown filter field, and context-menu filter is meant to carry an adjacent, anchored regex builder offering guided construction, a raw pattern editor, sample text, and live match feedback, with plain text staying the default search mode.

## Configuration

Query, pattern, flags, and mode would stay synchronized bidirectionally between the search field and its builder popover; pattern and sample size would be bounded to protect against runaway evaluation.

## Current status

**Desktop application:** Partial. The desktop application's filter fields accept plain-text substring queries and have no adjacent builder affordance, raw pattern editor, or guided construction controls.

**Documentation website:** Implemented for the shared shell. Settings, documentation, command-palette, notification, every upgraded dropdown, and page-context searches have their own adjacent builder, bounded raw pattern, guided inserts, i/m/u flags, sample text, live match count, and local JavaScript-engine application. Plain text remains the default.

## Failure modes

Pattern and sample input are bounded, but browser-native JavaScript regular expressions do not provide a hard execution deadline. The site identifies that engine and keeps the evaluator local; a worker-isolated timeout remains incomplete.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Command palette](command-palette.md), [Tab groups and tab search](tab-groups-and-searches.md), [Collapsible filters and statistics](collapsible-filters.md), [Platform feature index](README.md).
