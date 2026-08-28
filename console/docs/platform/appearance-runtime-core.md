# Appearance runtime core

The desktop renderer has a local, versioned appearance model that can be mounted by any real surface without routing settings through a preview-only facade.

## Behavior

Every override is addressed by a stable element identifier, one interaction state, and one property. Interaction states include default, hover, focus, focus-visible, active, disabled, selected, checked, and expanded. Resolution is deterministic: an element's state override wins over its default override, then the matching global state, then the global default.

Editing uses a per-property draft. Creating a draft does not change the mounted value. Apply changes only that property and removes its draft. Discard removes only the draft. Reset can target one property, one state on one element, every state on one element, one global state, all global values, or the complete appearance model. These scopes are separate so resetting one color cannot erase unrelated settings.

Named presets contain real global settings, rainbow speed, and override snapshots. Applying a preset replaces those values and clears drafts. Saving, applying, deleting, importing, and resetting return executable inverse actions only after local persistence succeeds. A no-op reports that nothing changed, and an unavailable operation reports why it did not run.

## Configuration

An override is addressed by three things and configured by nothing else: a stable element identifier, one interaction state, and one property. There is no global switch that turns the system on, and no per-surface exemption -- a surface participates by exposing `data-appearance-id`, and the host sets `data-appearance-state` as interaction changes.

Two values are configured globally rather than per element: the rainbow speed level, which maps to one duration shared by every mounted rainbow surface so they turn together, and the storage adapter the local store is given. The browser adapter can use local storage; a test or a non-browser host supplies another without changing the model.

## Color model

The color engine accepts continuous HSL coordinates and translates bidirectionally among named colors, HEX and HEX8, RGB and RGBA, HSL and HSLA, HSV and HSB, HWB, CIELAB and LCH, OKLab and OKLCH, and CMYK. Alpha is retained in every translation, using an alpha-preserving hexadecimal fallback when no exact name exists.

Wide-gamut input reports when its displayed sRGB result was clipped. The original input remains available to the calling editor, so a display conversion never pretends the source was already inside the display gamut. Contrast evidence records the exact foreground, background, ratio, and WCAG verdict when both colors are fixed. Animated color reports that a fixed ratio cannot be calculated.

Rainbow is a discriminated marker, not a color string and not a palette entry. One global speed level maps to one duration shared by every mounted rainbow surface. Reduced motion resolves the marker to one stable hue and disables the animation.

## Configuration

Nothing here is configured by editing a file. Every knob is an argument a host passes when it
constructs the store or mounts the model, and the exact names matter because two hosts that spell a
storage key differently do not share a model:

| What a host supplies | Where | Default |
| --- | --- | --- |
| The storage adapter — `getItem`/`setItem`, nothing browser-specific | `createAppearanceStore(storage, …)` (`app/renderer/src/appearance-store.ts:122`) | none; it is required |
| The capability records the runtime detected on this machine | second argument to the same call | `[]`, meaning nothing is claimed supported |
| The storage key the model is written under | third argument | `APPEARANCE_STORAGE_KEY`, `ding-pbx-console.appearance.v2` |
| Which element an override addresses | the `data-appearance-id` attribute on the element (`APPEARANCE_ELEMENT_ATTRIBUTE`) | none; an element without it is never targeted |
| Which interaction state is live | the `data-appearance-state` attribute, rewritten by the host as interaction changes (`APPEARANCE_STATE_ATTRIBUTE`) | the default state |
| Rainbow speed | one global level on the model, shared by every mounted rainbow surface | see the color model above |

The stored document declares `schemaVersion: 2` (`APPEARANCE_MODEL_SCHEMA_VERSION`,
`app/renderer/src/appearance-schema.ts:3`). A document declaring anything else is rejected whole
rather than migrated silently, so an older profile reports its version instead of being partly read.

The user-facing settings this model backs are described in
[Material appearance system](material-appearance.md); this article is the layer underneath them.

## Persistence and import

The local store uses schema version 2 and a caller-provided storage adapter. The browser adapter can use local storage, while tests or non-browser hosts can supply another adapter without changing the model. Reads revalidate the complete stored document. Writes serialize and validate the complete next model before replacing the prior stored value. A rejected import applies nothing.

JSON export includes the complete model, drafts, presets, capability records, and safe logo rendering metadata. It does not include custom-logo bytes, filenames, paths, cache keys, or network references. A custom logo export states that the local asset was omitted.

## Configuration

An appearance model is not a configuration file a person edits; it is a document this core
validates whole on every read and every write. What a host supplies is narrower than that
document and worth naming exactly:

- **The storage adapter.** `browserSettingsRuntime`-style hosts pass local storage; a test or a
  non-browser host passes its own. Schema version 2 and the complete revalidation on read do not
  move with the adapter, so a different host cannot store a document this model would refuse.
- **The mounted element identifiers.** A surface opts in by carrying `data-appearance-id`, and
  reports interaction changes through `data-appearance-state`. The adapter reports identifiers
  that are stored but not mounted, which is the only way a stale override announces itself.
- **The rainbow speed level.** One global level, not a per-element duration, mapped to one
  duration every mounted rainbow surface shares. Setting it per element is what makes six
  animated surfaces drift out of step, so this core does not offer that.
- **Presets and imports.** A preset carries real global settings, the rainbow speed and an
  override snapshot. An import is applied whole or not at all: a rejected document changes
  nothing, so there is no partially-configured state to recover from.

Two things are deliberately not configurable. Reduced motion resolves the rainbow marker to one
stable hue and disables the animation regardless of the level, and the capability records below
cannot be asserted by a caller — they are detected, and an unsupported one carries its reason.

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
