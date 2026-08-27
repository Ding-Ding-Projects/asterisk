# App logo conversion contract

The logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.

## Behavior

Choosing a mark is a presentation change and nothing else. The decoupling matters more than it
sounds: a project whose data directory was derived from its package name would orphan every
stored profile the first time somebody changed the logo, so identity is a constant here and
display is the setting.

A custom image travels one path. The bytes are inspected — signature, dimensions, frame count,
alpha behaviour, decoded-memory estimate — before anything is decoded for real. An accepted
image is handed to an injected isolated decoder, and the converter then re-inspects what came
back rather than trusting it: format, dimensions, alpha policy, signature, output bounds,
memory receipt and elapsed CPU budget. A failure at any point returns a redacted reason and
leaves the previous logo active, so there is no state in which the mark is half-replaced.

## Configuration

- **Formats.** PNG, JPEG, WebP and static SVG. SVG is accepted only when its root is a static
  `svg` element carrying a width and height or a viewBox, and script, event-handler, animation,
  external-resource and embedded-object content are refused rather than stripped.
- **Bounds.** 8 MiB input, 16 MiB converted output set, 4096 pixels in either dimension, 64 MiB
  decoded buffer. Animated images are refused outright. These are fixed, not tunable: a caller
  cannot raise them, and a production decoder must run in an isolated process under the same
  CPU, memory, input, output and frame limits.
- **Presentation values.** Crop coordinates, focal point and safe-area insets are numeric
  proportions between 0 and 1; fit is contain, cover or fill; background is transparent or a
  validated hexadecimal colour. Every one has a keyboard-editable number field.
- **Registration descriptors.** `logo.inspect`, `logo.convert`, `logo.cache.read`,
  `logo.cache.write` and `logo.cache.clear`. They are local-only and grant the renderer no
  filesystem or network access.
- **Cache location.** `LogoStore` writes converted assets and a schema-versioned manifest
  beneath the application's private data directory, and nowhere else.

## Inputs and picker

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

## Failure modes

- **No decoder registered.** The converter refuses to convert at all rather than falling back to
  an in-process decode. The seam is required, not preferred.
- **A decoder result that cannot prove itself.** Bytes without a successful reopen or
  round-trip receipt are rejected, and the previous logo stays active.
- **Independent re-inspection disagrees.** A mismatch in format, dimensions, alpha policy,
  signature, output bounds, memory receipt or CPU budget returns a redacted reason. The reason
  is redacted because a raw decoder error can quote the file the person chose.
- **Refused input.** Malformed data, an animated image, an oversized file, dimensions beyond
  4096 pixels, a decoded buffer above 64 MiB, or SVG carrying script, event handlers, animation,
  external resources or embedded objects — each is refused whole, never partially applied.
- **Cache that no longer validates.** Loading rechecks signature, dimensions, alpha state and
  byte count; anything missing or invalid is treated as absent and the shipped mark is used.
- **Contrast.** A solid background that may not reach 4.5:1 against the mark is warned about
  rather than silently accepted or silently corrected.

## Verification boundary

This lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.

So nothing above has been run. There is no registered decoder in this tree, which means the
conversion path in particular has never executed end to end, and the failure modes listed above
are properties of the contract rather than behaviours anyone has watched happen.

## Suggested articles

[Material appearance](material-appearance.md), [Complete exports](complete-exports.md), [Local version history](local-version-history.md), and [Responsive sizing](responsive-sizing.md).

