# Appearance runtime core

The desktop renderer has a local, versioned appearance model that can be mounted by any real surface without routing settings through a preview-only facade.

## Behavior

Every override is addressed by a stable element identifier, one interaction state, and one property. Interaction states include default, hover, focus, focus-visible, active, disabled, selected, checked, and expanded. Resolution is deterministic: an element's state override wins over its default override, then the matching global state, then the global default.

Editing uses a per-property draft. Creating a draft does not change the mounted value. Apply changes only that property and removes its draft. Discard removes only the draft. Reset can target one property, one state on one element, every state on one element, one global state, all global values, or the complete appearance model. These scopes are separate so resetting one color cannot erase unrelated settings.

Named presets contain real global settings, rainbow speed, and override snapshots. Applying a preset replaces those values and clears drafts. Saving, applying, deleting, importing, and resetting return executable inverse actions only after local persistence succeeds. A no-op reports that nothing changed, and an unavailable operation reports why it did not run.

## Color model

The color engine accepts continuous HSL coordinates and translates bidirectionally among named colors, HEX and HEX8, RGB and RGBA, HSL and HSLA, HSV and HSB, HWB, CIELAB and LCH, OKLab and OKLCH, and CMYK. Alpha is retained in every translation, using an alpha-preserving hexadecimal fallback when no exact name exists.

Wide-gamut input reports when its displayed sRGB result was clipped. The original input remains available to the calling editor, so a display conversion never pretends the source was already inside the display gamut. Contrast evidence records the exact foreground, background, ratio, and WCAG verdict when both colors are fixed. Animated color reports that a fixed ratio cannot be calculated.

Rainbow is a discriminated marker, not a color string and not a palette entry. One global speed level maps to one duration shared by every mounted rainbow surface. Reduced motion resolves the marker to one stable hue and disables the animation.

## Persistence and import

The local store uses schema version 2 and a caller-provided storage adapter. The browser adapter can use local storage, while tests or non-browser hosts can supply another adapter without changing the model. Reads revalidate the complete stored document. Writes serialize and validate the complete next model before replacing the prior stored value. A rejected import applies nothing.

JSON export includes the complete model, drafts, presets, capability records, and safe logo rendering metadata. It does not include custom-logo bytes, filenames, paths, cache keys, or network references. A custom logo export states that the local asset was omitted.

## Capability records

Runtime support is recorded explicitly for installed-font enumeration, variable font axes, eyedropper access, clipboard writes, local logo decoding and crop, rainbow animation, and direct OKLCH output. An unsupported record carries both the reason and the fallback. The interface must use these records to keep an unavailable control visible and truthful rather than showing a success notification for an operation that never ran.

## Mounting

`appearance-runtime.ts` mounts values onto elements that expose `data-appearance-id`. A host can set `data-appearance-state` as interaction changes and remount the model. The adapter reports element identifiers that are stored but not present in the mounted surface. It also exports the stylesheet needed for hue interpolation. The central renderer must install that stylesheet and mount the adapter before these model changes become visible.

## Configuration

This is a model rather than a screen, so what it takes is supplied by the host that mounts
it rather than typed by a person:

- **The storage adapter**, provided by the caller. A browser host can pass local storage; a
  test or a non-browser host can pass another adapter without the model changing, which is
  the point of the seam. The stored document is schema version 2 and is revalidated whole
  on every read.
- **Global settings, rainbow speed level and override snapshots**, saved and applied as
  named presets. One speed level maps to one duration shared by every mounted rainbow
  surface, so two surfaces cannot drift apart by however long apart they were mounted.
- **The mount hook**, `data-appearance-id` on each element and `data-appearance-state` as
  interaction changes. The adapter reports identifiers that are stored but absent from the
  mounted surface, so a stale override is named rather than silently doing nothing.
- **Reset scope**, chosen per action: one property, one state on one element, every state
  on one element, one global state, all global values, or the whole model. They are
  separate precisely so resetting one colour cannot erase unrelated settings.

Capability records are read rather than set. Installed-font enumeration, variable axes,
eyedropper, clipboard, local decoding and direct OKLCH output are each recorded with a
reason and a fallback when unavailable, and the interface must keep such a control visible
and truthful rather than reporting a success for an operation that never ran.

## Failure modes and security

- Storage read failure starts with an empty model and exposes the rejection reason.
- Storage write failure preserves the previous in-memory and persisted model.
- A stale inverse action is refused when its expected revision no longer matches.
- A malformed, oversized, duplicate, unknown-version, or privacy-invalid import is rejected as a whole.
- A rainbow marker never enters color parsing, translation, contrast, alpha concatenation, or finite palettes.
- Logo metadata cannot carry a path, URL, raw asset, filename, or cache key.
- Capability detection never invokes a permission prompt and never claims clipboard, eyedropper, font, or decoder success.

## Verification status

This ultra-speed implementation did not run unit tests, lint, type checking, a build, packaging, runtime interaction, or screen captures. The API is mount-ready, but the central renderer integration and built-artifact proof belong to the surface-wiring lane.

## Suggested articles

[Material appearance system](material-appearance.md), [App logo customization](app-logo-customization.md), and [Accessibility](accessibility.md).
