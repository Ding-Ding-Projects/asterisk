# Guided forms

Fields populated from real data wherever possible, sensible defaults, plain-language inline validation, and named reasons on every disabled control.

## Behavior

Wherever a value can be enumerated or defaulted, the form is meant to do so — pickers over blank text boxes, a suggested default instead of an empty field, and inline validation that says what to type rather than only showing a red border.

## Configuration

Every disabled control would state, in its own tooltip or adjacent text, exactly which condition is unmet and how to satisfy it.

## Current status

**Desktop application:** Partial. The desktop application's server and deployment forms mix real pickers for some fields with free-text entry for others; validation messages exist for some fields but not consistently, and not every disabled control names its exact blocking condition.

**Documentation website:** Partial. The site's forms, such as the settings placeholders, are minimal and mostly unvalidated; inline validation guidance is largely absent.

## Failure modes

A field left blank or filled incorrectly is meant to be caught inline, in plain words, before submission is attempted; several forms on both surfaces still rely on submission itself, or a generic error, to reveal that a field was wrong.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).
