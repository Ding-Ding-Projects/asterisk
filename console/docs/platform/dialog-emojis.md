# Dialog emoji toggle

A persisted on/off switch controlling whether dialogs and message boxes show a decorative emoji alongside their factual text.

## Behavior

When enabled, dialogs are meant to get a relevant, non-semantic emoji; when disabled, the same factual copy is meant to appear with no emoji. The toggle would never add emoji to buttons, field labels, or other control text — only to descriptive dialog copy.

## Configuration

A single switch in application settings, reachable by keyboard, is meant to control this for every dialog at once.

## Current status

**Desktop application:** Not implemented. No toggle exists and no dialog in the product currently carries an emoji.

**Documentation website:** Not implemented. The site has no application-style message boxes to decorate.

## Failure modes

N/A — a switch with no dialogs to affect has no meaningful failure mode of its own; failure would only arise once dialogs exist to decorate.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
