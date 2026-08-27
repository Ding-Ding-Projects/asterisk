# Language modes

Lets a person pick English, playful Cantonese, or a bilingual view of every label the product shows.

## Behavior

A language mode setting is meant to control which language every user-facing string renders in, independent of the operating system's own locale, with three choices: English only, a playful Cantonese variant, and a bilingual mode showing both languages together without crowding the layout.

## Configuration

The choice would live in application or site settings, persist across sessions, and apply to every screen at once rather than page by page.

## Current status

**Desktop application:** Not implemented. No language selector exists anywhere in the interface; every label is a fixed English string with no translation table behind it.

**Documentation website:** Partial. Every top-level page and composed article now receives the same persisted English, Cantonese, and bilingual control. Shared shell labels and status copy change immediately; authored article prose remains its original source text, and the shell states that limitation.

## Failure modes

Where a translation is missing for a chosen mode, the intended behavior is to fall back to English for that string rather than showing a blank or broken label; today there is nothing to fall back from, since no second language exists yet.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
