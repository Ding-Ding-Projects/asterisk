# Material appearance system

Runtime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.

## Behavior

A conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.

## Configuration

Colors would be chosen through a continuous picker with bidirectional conversion between common color notations rather than a fixed swatch grid; presets would be exportable and importable as files.

## Current status

**Desktop application:** Partial, and corrected 2026-08-25. The accent colour (hue/saturation/lightness), font family, font weight, and font size controls are genuinely live: changing any of them writes a real inline style onto the console's root element immediately, with no restart, persists across relaunch, and can be exported as a re-importable JSON theme file. There is no import path yet for that same file even though export is real, and the whole system is scoped to one global (wildcard) theme rather than the true per-element appearance editor the contract describes, because the compiled interface exposes no per-element CSS hook for a rule to be read back from. A `Theme: Dark / Light / Follow system` control also exists and persists, but it has no effect: the compiled design bakes literal dark-mode hex colours and pixel paddings rather than CSS custom properties the theme setting could switch, so it is a stored intention with no live consumer, in the same way a density control sits beside it.

**Documentation website:** Partial. Every page exposes persisted dark, light, and high-contrast themes, density, accent, font scale, navigation docking, logo presets, and a broad color translator. These values apply live. Per-element editors and full word-processor typography remain incomplete.

## Failure modes

An appearance change that fails to persist (for example, a write to a locked settings file) is meant to notify the user and keep the prior appearance in effect rather than silently reverting after the fact.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.

## Verification

`console/tests/contracts/material-appearance.test.mjs` pins which of the six imported appearance symbols write real styles, which one (theme import) is dead, and the wildcard-only scoping, against the source directly. Verifying it by hand means opening the desktop application's appearance panel and dragging the hue control while watching the console's own text colour change live.

## Suggested articles

[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
