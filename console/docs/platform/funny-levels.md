# Funny-level sliders

Two independent sliders, one per language, that control how playful the product's own copy sounds — from fully serious to maximum playfulness.

## Behavior

Two sliders, English and Cantonese, are meant to each range from level 1 (fully professional wording) to level 5 (maximum playfulness), restyling every message category including warnings and errors without changing the underlying facts they carry.

## Configuration

Sliders would live in settings, default to level 5 for both languages, and be changeable and resettable independently of each other.

## Current status

**Desktop application:** Not implemented. No slider exists and all product copy is written at a single fixed tone.

**Documentation website:** Partial. Every page exposes two independent persisted controls from 1 to 5, both defaulting to 5. Shared copy with defined variants changes immediately, but every authored article sentence is not yet represented at all five levels.

## Failure modes

A message's facts (file names, error causes, irreversible-action warnings) are meant to stay exact at every level regardless of tone; if a restyled string ever disagreed with the underlying fact, that would be treated as a defect in the styling layer, not an acceptable trade-off.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Language modes](language-modes.md), [Platform feature index](README.md).
