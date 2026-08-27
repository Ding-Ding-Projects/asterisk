# App logo conversion contract

The logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.

## Behavior

A person picks a shipped mark or one local image; the image is inspected by its bytes, cropped and fitted as they choose, converted into the size and format set the application actually renders, and cached privately. From then on the chosen mark is what the interface draws.

The sentence in the opening paragraph is the load-bearing one and is worth reading twice: **this changes presentation and nothing else**. The package identifier, executable name, installer identity, update feed and application-data directory are all constants here, so a person who changes the mark cannot accidentally move where their data lives or which feed their updates come from.

## Inputs and picker

The renderer registers one semantic local file picker at `logo.custom-file`. Its accepted formats are PNG, JPEG, WebP, and static SVG. The picker is keyboard and screen-reader operable and exposes empty, reading, ready, invalid, replacement, and clear/reset states. A selected filename is UI state only and is not written to the conversion cache, history, exports, logs, telemetry, or captures.

## Inspection and limits

The shared inspector reads bytes rather than trusting a file extension or declared MIME type. It validates PNG, JPEG, WebP, and SVG signatures, dimensions, frame count, alpha behavior, and decoded-memory estimates. It rejects malformed data, animated images, oversized inputs, dimensions beyond 4096 pixels, decoded buffers above 64 MiB, and SVG script, event-handler, animation, external-resource, or embedded-object content. The input limit is 8 MiB and the converted output set is bounded to 16 MiB.

SVG is accepted only when its root is a static `svg` element with a width and height or a viewBox. No network fetch or remote resource is permitted. A production decoder must run in an isolated process with the same CPU, memory, input, output, and frame limits.

## Configuration

Every choice here is made by a person at the logo surface, and none of it comes from a file or a build flag.

The source: one of the shipped marks, or one local PNG, JPEG, WebP or static SVG. The framing: crop coordinates, focal point and safe-area insets as proportions between 0 and 1, a fit of contain, cover or fill, and a background that is either transparent or one validated hexadecimal colour. All of those are editable as numbers from the keyboard rather than only by dragging, so the surface is operable without a pointer.

The bounds are not configurable, deliberately: 8 MiB of input, 16 MiB of converted output, 4096 pixels in any dimension, 64 MiB of decoded buffer, one frame, and no network fetch. A larger input is refused rather than resized down to fit, because silently converting something other than what was chosen is worse than saying no.

## Crop and presentation

Crop coordinates, focal point, and safe-area insets are numeric proportions between 0 and 1. The fit choices are contain, cover, and fill. The background is either transparent or a validated hexadecimal colour. The surface provides keyboard-editable number fields for all crop and focal values and warns when a solid background may not provide a 4.5:1 contrast ratio for the mark.

## Conversion and receipts

The control-plane converter accepts an injected isolated decoder. It will not convert when that seam is absent. Every decoder result must contain bytes, a successful reopen or round-trip receipt, and optional loss notes. The converter independently re-inspects every output, verifies the requested format, dimensions, alpha policy, signature, output bounds, memory receipt, and elapsed CPU budget. Any failure returns a redacted reason and leaves the previous logo active.

The registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear`. They are local-only and are ready for the control-plane dispatcher to mount without granting the renderer filesystem or network access.

## Failure modes

Every refusal in this contract leaves the previously active mark exactly where it was. There is no state in which a rejected image is half-applied.

The inspector refuses malformed bytes, a signature that disagrees with the extension or the declared MIME type, an animated image, an input over 8 MiB, a dimension over 4096 pixels, a decoded buffer over 64 MiB, and any SVG carrying script, an event handler, animation, an external resource or an embedded object. An SVG whose root is not a static `svg` element with a width and height or a viewBox is refused as well.

The converter refuses when the isolated decoder seam is absent — it does not fall back to converting in-process — and refuses again, after the decoder has returned, if its own independent re-inspection disagrees with the requested format, dimensions, alpha policy, signature, output bounds, memory receipt or CPU budget. The reason it returns is redacted, because a decoder failure can quote the file it was given.

The cache treats missing or invalid data as absent rather than trying to repair it, and the shipped mark is the fallback in every one of these cases, including after a clear or reset.

The one failure this contract cannot currently reach is a real one: no decoder is wired in, so in this tree the converter's refusal-when-the-seam-is-absent path is the path that runs. See the verification boundary below.

## Local cache

`LogoStore` writes only converted assets and a schema-versioned manifest beneath the app's private data directory. Asset names are generated from target metadata and a SHA-256 receipt. Loading rechecks the signature, dimensions, alpha state, and byte count. Missing or invalid cache data is treated as absent. Clear and reset remove the private logo cache; the shipped mark remains the fallback.

## Verification boundary

This lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.

## Suggested articles

[App logo customization](app-logo-customization.md), [Material appearance](material-appearance.md), [Complete exports](complete-exports.md), [Local version history](local-version-history.md), and [Responsive sizing](responsive-sizing.md).

