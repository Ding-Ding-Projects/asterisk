# App logo customization

Lets a user replace the application's displayed mark with a shipped preset or their own local image.

## Behavior

The shared logo contract defines three shipped presets, a local picker, crop, fit, focal point, safe area, and background metadata. The renderer runtime reads only the validated private cache and keeps the previous active mark when inspection, conversion, or caching fails.

## Configuration

`shared/logo.ts` validates PNG, JPEG, WebP, and static SVG signatures, dimensions, animation, SVG safety, crop ratios, output targets, and byte budgets before conversion. `control-plane/logo-store.ts` persists only independently inspected output bytes and redacted receipts below the private per-installation cache. No logo action accepts a URL. The privileged dispatcher currently registers no image decoder, so conversion reports `DECODER_UNAVAILABLE` rather than claiming success; a future decoder must be isolated and round-trip verified before registration.

## Current status

**Desktop application:** Privileged logo inspection, conversion, cache read/write/asset-read/clear actions, and a desktop local-file picker are wired. `renderer/src/logo-runtime.ts` supplies the live application lifecycle. The UI mount and a verified decoder remain separate follow-up work; conversion is explicitly unavailable until a bundled decoder is proven.

**Documentation website:** Partial. Every page exposes three presets, contain/fill choice, and local PNG/JPEG upload. The loader verifies the byte signature, bounds encoded bytes and decoded pixels, revalidates the cache, applies the mark live, and retains the prior valid mark after rejection. Crop, focal point, background treatment, and multi-size output remain incomplete.

## Failure modes

A malformed, spoofed, oversized, or over-dimension image is rejected before storage, with the previous valid logo staying active. Source filenames and file paths are not retained, and image bytes are omitted from site-state export with that omission stated.

## Accessibility and localization

The renderer lifecycle exposes state and recovery text for the UI mount, but this lane did not run tests, build, or capture verification. Copy remains English in the runtime seam until the owning UI lane mounts localization.

## Verification

Verification was not run in this lane. The concrete bridge paths are `logo:pick-file`, `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.asset.read`, `logo.cache.write`, and `logo.cache.clear`; a verified packaged decoder and built-artifact interaction remain open.

## Suggested articles

[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
