# Material appearance system

Runtime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.

## Behavior

A conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.

## Configuration

Colours are chosen through a continuous translator with bidirectional conversion between HEX, RGB, HSL, HSV, HWB, CMYK, Lab, LCH, OKLab, OKLCH, and named colours rather than a fixed swatch grid. The translator reports its source colour space, clipping risk, and WCAG contrast. Named theme presets are exportable and importable as bounded JSON files.

## Current status

**Desktop application:** Partial. A dark/light theme toggle exists in settings, but accent color, density, typography customization, the continuous color picker, and the per-element appearance editor are all absent.

**Documentation website:** Partial. Every page exposes persisted dark, light, and high-contrast themes, density, accent, font scale, navigation docking, logo presets, and a broad colour translator. These values apply live. Context-menu appearance editors now cover route tabs and stable local element targets, with credential checks before edits and resets when a target is toy-locked. The editor also stores font family, pixel size, weight, style, underline and strike, overline, capitalization, small caps, superscript or subscript, highlight, outline, shadow, spacing, line height, direction, alignment, rainbow sentinel, reduced-motion freeze, JSON import/export, and per-mutation history. Named theme presets have local history, import, export, and reset. Font choices include verified bundled and generic families, typed validation, browser availability checks, and a CJK-safe fallback. Variable-font axes and full gamut editing remain incomplete.

## Failure modes

An appearance change that fails to persist keeps the prior value and reports the browser error. A locked target requires its current toy-lock value before appearance edits or reset. A typed family that is unavailable remains selected but reports fallback to the CJK-safe family chain. Out-of-range colour values remain visible in the translator with a clipping warning. Export includes redacted appearance records but never credential digests.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane ran syntax and source Chuts only. It did not run test suites, builds, browser checks, or captures. The site registry remains partial because variable-font axes and runtime proof are incomplete. The desktop application row remains partial.

## Suggested articles

[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
