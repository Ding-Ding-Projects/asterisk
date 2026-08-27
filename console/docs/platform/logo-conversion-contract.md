# App logo conversion contract

The logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.

## Behavior

### Inputs and picker

The renderer registers one semantic local file picker at `logo.custom-file`. Its accepted formats are PNG, JPEG, WebP, and static SVG. The picker is keyboard and screen-reader operable and exposes empty, reading, ready, invalid, replacement, and clear/reset states. A selected filename is UI state only and is not written to the conversion cache, history, exports, logs, telemetry, or captures.

### Inspection and limits

The shared inspector reads bytes rather than trusting a file extension or declared MIME type. It validates PNG, JPEG, WebP, and SVG signatures, dimensions, frame count, alpha behavior, and decoded-memory estimates. It rejects malformed data, animated images, oversized inputs, dimensions beyond 4096 pixels, decoded buffers above 64 MiB, and SVG script, event-handler, animation, external-resource, or embedded-object content. The input limit is 8 MiB and the converted output set is bounded to 16 MiB.

SVG is accepted only when its root is a static `svg` element with a width and height or a viewBox. No network fetch or remote resource is permitted. A production decoder must run in an isolated process with the same CPU, memory, input, output, and frame limits.

### Crop and presentation

Crop coordinates, focal point, and safe-area insets are numeric proportions between 0 and 1. The fit choices are contain, cover, and fill. The background is either transparent or a validated hexadecimal colour. The surface provides keyboard-editable number fields for all crop and focal values and warns when a solid background may not provide a 4.5:1 contrast ratio for the mark.

### Conversion and receipts

The control-plane converter accepts an injected isolated decoder. It will not convert when that seam is absent. Every decoder result must contain bytes, a successful reopen or round-trip receipt, and optional loss notes. The converter independently re-inspects every output, verifies the requested format, dimensions, alpha policy, signature, output bounds, memory receipt, and elapsed CPU budget. Any failure returns a redacted reason and leaves the previous logo active.

The registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear`. They are local-only and are ready for the control-plane dispatcher to mount without granting the renderer filesystem or network access.

### Local cache

`LogoStore` writes only converted assets and a schema-versioned manifest beneath the app's private data directory. Asset names are generated from target metadata and a SHA-256 receipt. Loading rechecks the signature, dimensions, alpha state, and byte count. Missing or invalid cache data is treated as absent. Clear and reset remove the private logo cache; the shipped mark remains the fallback.

## Configuration

Everything a person sets here is presentation, and the boundary in the first paragraph is
what makes that safe to offer: the package identifier, the executable name, the installer
identity, the update feed and the application-data directory are all derived from
constants, so none of them can move because somebody chose a different picture. A mark
that renamed the data directory would orphan every stored setting on the next launch, and
that is exactly the failure this decoupling exists to prevent.

The settings, each bounded where it is described above:

- **The mark itself** -- one of the shipped presets, or one local PNG, JPEG, WebP or
  static SVG through the `logo.custom-file` picker.
- **Crop, focal point and safe-area insets**, as numeric proportions between 0 and 1, with
  keyboard-editable number fields rather than a drag-only cropper.
- **Fit**, one of contain, cover or fill.
- **Background**, either transparent or a validated hexadecimal colour, with a warning when
  a solid choice may not reach a 4.5:1 contrast ratio against the mark.

The limits are contract values rather than settings. The 8 MiB input bound, the 16 MiB
output bound, the 4096-pixel dimension ceiling and the 64 MiB decoded-buffer ceiling cannot
be raised from the surface, so no configuration path can widen them to admit a file the
inspector would otherwise refuse.

## Failure modes

A refusal here always leaves the previous logo active, and says why in redacted terms
rather than failing silently into a blank mark.

The inspector reads bytes rather than trusting an extension or a declared MIME type, and
refuses malformed data, an animated image, an oversized input, dimensions past 4096
pixels, a decoded buffer above 64 MiB, and any SVG carrying script, an event handler,
animation, an external resource or an embedded object. An SVG whose root is not a static
`svg` element with a width and height or a viewBox is refused on the same terms.

Conversion refuses to run at all when the isolated decoder seam is absent, rather than
falling back to an in-process decode. A decoder result missing bytes or a reopen receipt
is refused; so is an output whose re-inspection disagrees with the requested format,
dimensions, alpha policy, signature, output bounds, memory receipt or CPU budget.

Cache data that is missing or fails its recheck of signature, dimensions, alpha state and
byte count is treated as absent rather than as corrupt-but-usable, and the shipped mark is
the fallback. Clear and reset remove the private cache and leave that fallback in place.

## Verification boundary

This lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.

## Suggested articles

[Material appearance](material-appearance.md), [Complete exports](complete-exports.md), [Local version history](local-version-history.md), and [Responsive sizing](responsive-sizing.md).

