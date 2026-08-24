# Material appearance system

Runtime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.

## Behavior

A conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.

## Configuration

Colors would be chosen through a continuous picker with bidirectional conversion between common color notations rather than a fixed swatch grid; presets would be exportable and importable as files.

## Current status

**Desktop application:** Partial. The central renderer creates one persisted `AppearanceStore`, installs the appearance runtime stylesheet, derives the generated preview from that store, marks rendered controls with stable appearance ids, and exposes every appearance property through the shared rich-control registration. The generated palette still renders destination buttons rather than inline rich rows, dynamic target-specific controls remain unavailable until their real navigation entries exist, and built-artifact interaction remains unverified in this lane.

**Documentation website:** Partial. Every page exposes persisted dark, light, and high-contrast themes, density, accent, font scale, navigation docking, logo presets, and a broad color translator. These values apply live. Per-element editors and full word-processor typography remain incomplete.

## Failure modes

An appearance change that fails to persist (for example, a write to a locked settings file) reports the exact store refusal and keeps the previous mounted model active. A missing or unsupported capability remains visible in the capability record instead of being silently discarded.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
