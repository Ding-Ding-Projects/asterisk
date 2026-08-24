# Funny-level sliders

Two independent sliders, one for English and one for Cantonese, style the console's own copy without changing its facts.

## Behavior

`English funny level` and `Cantonese funny level` each range from 1 (fully serious) to 5 (maximum playfulness). Notification and dialog wrappers use the selected language's level while keeping factual text, technical values, error causes and irreversible-action warnings intact.

## Configuration

Both controls live in `Customise everything`, default to level 5, persist in the durable settings store, and can be changed or reset independently. School mode temporarily forces both to level 1 and restores the saved choices after a verified unlock.

## Current status

**Desktop application:** Implemented. The pure funny-level module clamps values to the supported range and supplies the styling boundary used by app events.

**Documentation website:** Partial. Its settings page has separate controls but remains a separate runtime.

## Failure modes

Malformed or out-of-range stored values fall back to level 5. Styling adds only bounded voice, never a replacement for the underlying fact.

## Accessibility and localization

Both sliders are keyboard-reachable generated controls with localized labels. Voice names, file paths, identifiers and observed PBX data are never restyled as funny copy.

## Verification

The pure funny-level module and renderer integration are covered by focused renderer checks. Built-artifact interaction evidence remains tracked in the per-surface inventory.

## Suggested articles

[Language modes](language-modes.md), [School mode](school-mode.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
