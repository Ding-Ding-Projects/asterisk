# Language modes

Lets a person pick English, playful Cantonese, or a bilingual view of every label the product shows.

## Behavior

A language mode setting is meant to control which language every user-facing string renders in, independent of the operating system's own locale, with three choices: English only, a playful Cantonese variant, and a bilingual mode showing both languages together without crowding the layout.

## Configuration

The choice would live in application or site settings, persist across sessions, and apply to every screen at once rather than page by page.

## Current status

**Desktop application:** Not implemented. No language selector exists anywhere in the interface; every label is a fixed English string with no translation table behind it.

**Documentation website:** Partial, source-boundary proof unverified. Every top-level page and composed article is scanned into a static-copy catalog at runtime, with an English source, a Cantonese source, five independent surrounding-copy levels per language, and bilingual rendering. Technical identifiers, paths, dates, hashes, URLs, code, and product facts remain byte-identical. The catalog reports scanned and missing counts through the handwritten inventory. The Cantonese fallback for prose not yet phrase-translated is explicitly labelled as a generated source boundary rather than silently called a human translation.

## Failure modes

Where a static text node is missing from the catalog, the inventory reports it and keeps the English source rather than dropping or inventing the string. Technical and factual text intentionally remains exact in every language mode.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. The Day Teet Hui static catalog covers text nodes and the accessibility attributes it can scan, with a generated Cantonese source boundary for prose not yet phrase-translated.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
