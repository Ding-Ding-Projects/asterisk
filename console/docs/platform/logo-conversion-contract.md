# App logo conversion contract

The logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.

## Behavior

A person picks a shipped mark or one local image; the chosen mark is inspected from its bytes,
converted into the display sizes the surfaces actually consume, and cached locally. The single most
important behaviour is the one in the sentence above this section, so it is worth restating as a
rule rather than a remark: **a custom mark changes presentation and nothing else.** The package
identifier, the executable name, the installer identity, the update feed and the application-data
directory are all derived from constants, never from the chosen logo — which is what makes changing
it safe rather than a way to orphan a profile.

The three stages below are strictly ordered, and each refuses rather than degrading: inspection
refuses input it cannot prove is a still image within bounds, conversion refuses to run without an
injected isolated decoder, and the cache refuses to load an asset whose recorded signature,
dimensions, alpha state and byte count no longer agree.

### Inputs and picker

The renderer registers one semantic local file picker at `logo.custom-file`. Its accepted formats are PNG, JPEG, WebP, and static SVG. The picker is keyboard and screen-reader operable and exposes empty, reading, ready, invalid, replacement, and clear/reset states. A selected filename is UI state only and is not written to the conversion cache, history, exports, logs, telemetry, or captures.

## Inspection and limits

The shared inspector reads bytes rather than trusting a file extension or declared MIME type. It validates PNG, JPEG, WebP, and SVG signatures, dimensions, frame count, alpha behavior, and decoded-memory estimates. It rejects malformed data, animated images, oversized inputs, dimensions beyond 4096 pixels, decoded buffers above 64 MiB, and SVG script, event-handler, animation, external-resource, or embedded-object content. The input limit is 8 MiB and the converted output set is bounded to 16 MiB.

SVG is accepted only when its root is a static `svg` element with a width and height or a viewBox. No network fetch or remote resource is permitted. A production decoder must run in an isolated process with the same CPU, memory, input, output, and frame limits.

## Crop and presentation

Crop coordinates, focal point, and safe-area insets are numeric proportions between 0 and 1. The fit choices are contain, cover, and fill. The background is either transparent or a validated hexadecimal colour. The surface provides keyboard-editable number fields for all crop and focal values and warns when a solid background may not provide a 4.5:1 contrast ratio for the mark.

## Conversion and receipts

The control-plane converter accepts an injected isolated decoder. It will not convert when that seam is absent. Every decoder result must contain bytes, a successful reopen or round-trip receipt, and optional loss notes. The converter independently re-inspects every output, verifies the requested format, dimensions, alpha policy, signature, output bounds, memory receipt, and elapsed CPU budget. Any failure returns a redacted reason and leaves the previous logo active.

The registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear`. They are local-only and are ready for the control-plane dispatcher to mount without granting the renderer filesystem or network access.

## Local cache

`LogoStore` writes only converted assets and a schema-versioned manifest beneath the app's private data directory. Asset names are generated from target metadata and a SHA-256 receipt. Loading rechecks the signature, dimensions, alpha state, and byte count. Missing or invalid cache data is treated as absent. Clear and reset remove the private logo cache; the shipped mark remains the fallback.

## Configuration

Nothing here is settable at runtime. Every number in this contract is a bound, and a bound a caller
could raise is not a bound, so they are stated here as the fixed values they are:

| Limit | Value |
| --- | --- |
| Accepted input formats | PNG, JPEG, WebP, static SVG — decided by signature, never by extension or declared MIME type |
| Input size | 8 MiB |
| Converted output set | 16 MiB |
| Dimensions | 4096 pixels |
| Decoded buffer | 64 MiB |
| Frames | one; an animated image is refused rather than flattened |

What a *host* supplies, rather than configures, is the isolated decoder. The control-plane converter
takes it as an injected seam and **will not convert when it is absent** — it refuses instead of
falling back to an in-process decode, which is the whole point of the seam. A production decoder must
run in an isolated process under the same CPU, memory, input, output and frame limits.

The five registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`,
`logo.cache.write` and `logo.cache.clear`. They are local-only, and mounting them grants the renderer
no filesystem or network access.

Crop, focal point and safe-area insets are numeric proportions between 0 and 1; fit is `contain`,
`cover` or `fill`; the background is transparent or a validated hexadecimal colour. Those are user
choices carried on the request, not installation settings.

## Failure modes

- **Malformed bytes, an animated image, an oversized input, dimensions past 4096, or a decoded
  buffer past 64 MiB** — refused at inspection, before any conversion begins.
- **An SVG carrying script, an event handler, animation, an external resource or an embedded
  object** — refused. SVG is accepted only when its root is a static `svg` element with a width and
  height, or a viewBox, and no network fetch is ever permitted.
- **No injected decoder** — conversion does not run, and says so. It does not decode in-process.
- **A decoder result without bytes and a reopen or round-trip receipt** — rejected. The converter
  re-inspects every output independently and verifies the requested format, dimensions, alpha
  policy, signature, output bounds, memory receipt and CPU budget.
- **Any conversion failure** — a redacted reason, and the previous logo stays active. A failed
  attempt never leaves the application with no mark.
- **Missing or invalid cache data** — treated as absent, so the shipped mark is the fallback. Clear
  and reset remove the private cache and land in the same place deliberately.
- **A solid background that may not reach a 4.5:1 contrast ratio for the mark** — a warning on the
  surface. It is a warning rather than a refusal because the mark's own contrast is the person's
  design decision; being unaware of it should not be.

## Verification boundary

This lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.

## Suggested articles

- [Material appearance](material-appearance.md) — the wider appearance model this mark is one part of.
- [App logo customization](app-logo-customization.md) — the user-facing surface these contracts sit under.
- [Complete exports](complete-exports.md) — why an export carries logo metadata and never the asset bytes.
- [Local version history](local-version-history.md) — where a logo change is recorded, like any other settings change.
- [Responsive sizing](responsive-sizing.md) — the display sizes the converted set has to survive.

