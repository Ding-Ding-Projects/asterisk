# Funny-level sliders

Two independent sliders, one per language, that control how playful the product's own copy sounds — from fully serious to maximum playfulness.

## Behavior

Two sliders, English and Cantonese, are meant to each range from level 1 (fully professional wording) to level 5 (maximum playfulness), restyling every message category including warnings and errors without changing the underlying facts they carry.

## Configuration

Sliders would live in settings, default to level 5 for both languages, and be changeable and resettable independently of each other.

## Current status

**Desktop application:** Partial. Both sliders exist in the design (`fun_level` for English, `fun_level_yue` for Cantonese, each ranging 1-5 and defaulting to 5) and `App.tsx` persists whichever value is chosen. What does not exist is the restyling itself: `funny-levels.ts` exports `renderMessage()`, the function that would take a message's facts and a chosen level and produce styled text, and nothing in the mounted application ever calls it -- a grep across the renderer finds it only inside its own file and test. Moving either slider today changes a stored number and nothing a person can see. One further wrinkle worth recording: the compiled console also has a long-standing, unrelated 0-4 "fun mode" dial (confetti, rainbow fills, motion) that happens to share the exact control id `fun_level` with this feature's slider, so the two systems silently read and write the same stored value without either knowing about the other.

**Documentation website:** Partial, and more real than the desktop application's slider mechanism. `site/app.js` implements a genuine `COPY` table with eight keys, each carrying four real English and four real Cantonese phrasings, and `copyText()`/`copyLevel()` genuinely select and render the phrasing matching the chosen level -- changing the site's funny-level selects visibly changes rendered text. The gap is coverage and range: only eight strings on the whole site are wired to it (three through a `data-copy` attribute, five more used directly in notification code), and the site's selects offer four levels (0-3, defaulting to 0/Plain) rather than the canonical five levels defaulting to 5/Maximum.

## Failure modes

A message's facts (file names, error causes, irreversible-action warnings) are meant to stay exact at every level regardless of tone; if a restyled string ever disagreed with the underlying fact, that would be treated as a defect in the styling layer, not an acceptable trade-off.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop sliders and the site's selects are ordinary native controls reachable by keyboard, but no dedicated accessibility audit of either has been performed. Copy for this feature exists in both English and Cantonese wherever it is actually wired (the site's eight `COPY` keys); the desktop sliders persist correctly but currently style nothing.

## Verification

`tests/ui/funny-levels.test.tsx` exercises the desktop module's own logic (level bounds, storage round-trip, `renderMessage`'s fact-preservation) in isolation, not its absence of wiring into the mounted app. Verifying the wiring gap means opening the built application, moving either slider, and confirming that no rendered message changes tone -- and opening the site's settings page, moving either funny-level select, and confirming that the hero copy and the theme/motion descriptions on that page do change tone across the four available levels.

## Suggested articles

[Language modes](language-modes.md), [Platform feature index](README.md).
