# Spoken narration

An optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.

## Behavior

A narrator is meant to speak application events using platform or bundled natural-sounding voices, in English, Cantonese, or both in sequence, with independently selectable voice, rate, and pitch per language, staying off until the user turns it on.

## Configuration

Voice, rate, pitch, and narrated language would each be independent settings; narration would be rate-limited so lines never overlap.

## Current status

**Desktop application:** Not implemented. No narrator, no voice picker, and no narration queue exist in the product.

**Documentation website:** Not implemented. A static documentation site has no application events of the kind this feature narrates.

## Failure modes

If narration ever failed mid-line (missing voice, synthesis error), the intended behavior is to drop that one line silently rather than block the interface; there is nothing to fail today because there is no narrator.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Language modes](language-modes.md), [Platform feature index](README.md).
