# App logo customization

Lets a user replace the application's displayed mark with a shipped preset or their own local image.

## Behavior

A logo customization surface is meant to offer several presets plus a local image upload, processed entirely on-device with cropping, fit, and background controls, then applied live wherever the mark is shown.

## Configuration

Processing would be bounded and safe — validated file types, no network upload — with conversion failures leaving the previous valid logo in place.

## Current status

**Desktop application:** Not implemented. The desktop application shows a fixed application mark with no customization surface.

**Documentation website:** Partial. The site's settings page includes a placeholder entry for logo customization; no preset picker, no upload control, and no on-device processing exist behind it yet.

## Failure modes

A malformed or oversized uploaded image is meant to be rejected before it becomes the active mark, with the previous logo staying in place; nothing implements the upload path today, so nothing enforces that yet.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
