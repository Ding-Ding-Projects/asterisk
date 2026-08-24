# Scheduled settings

Lets a user schedule when a setting — language, theme, density, and the like — takes effect, by date, time, and weekday.

## Behavior

A schedule editor is meant to let a rule pick an optional start and end date, a start and end time, and either every day or specific weekdays, then apply a chosen setting value only during that window, respecting the user's local timezone including daylight-saving behavior.

## Configuration

Rules would be stored with stable identifiers and deterministic precedence for when more than one rule could apply at the same moment.

## Current status

**Desktop application:** Not implemented. No schedule editor and no scheduled-value application logic exist anywhere in the product.

**Documentation website:** Implemented for site-owned local settings. Every page exposes one persisted rule with explicit weekdays, start and end times, cross-midnight and equal-time behavior, local-timezone status, and scheduled theme, language, and density values. Base values return when the window ends.

## Failure modes

An empty weekday selection never matches. Invalid time text never matches. This bounded site implementation has one rule, so overlapping-rule precedence and external sources remain outside the implemented slice.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[External settings sources](external-settings-sources.md), [Platform feature index](README.md).
