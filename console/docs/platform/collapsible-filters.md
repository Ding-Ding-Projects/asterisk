# Collapsible filters and statistics

Search bars, filter rows, and statistics panels that describe rather than change the current view start collapsed and can be reopened.

## Behavior

Purely descriptive controls, such as filter summaries and statistics panels, are meant to collapse by default, persist that collapsed state, and clearly indicate when a collapsed filter is still actively excluding results.

## Configuration

The collapsed toggle would be keyboard-operable with a visible focus ring and be announced alongside its expanded or collapsed state.

## Current status

**Desktop application:** Not implemented. The desktop application's filter and statistics areas, where present, are always expanded; there is no collapse control.

**Documentation website:** Partial. The site's article list has no filter or statistics row to collapse; the underlying collapse behavior exists in the settings-page overlay controls but has not been extended to a filter or statistics panel.

## Failure modes

A collapsed filter that is still silently excluding results without any visible indicator is the specific failure this feature exists to prevent; there is no filter panel on either surface yet to check that against.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Regex builder](regex-builder.md), [Platform feature index](README.md).
