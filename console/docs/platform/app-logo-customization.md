# App logo customization

The logo surface lets a user choose a shipped mark or supply a local picture for the displayed
application mark. The current desktop implementation is partial and is documented here at its
actual boundary, not at the broader contract it is intended to reach.

## Behavior

The desktop application currently exposes three shipped presets, a local custom-image picker, a
status readout, and a reset action. The selected mark is consumed by the title-bar image boundary,
which renders a real local image with an accessible name. Package identity, executable name,
installer identity, update feed, credential service, and data directory remain independent of the
selected mark.

The visible custom-image picker is PNG-only in the current packaged-decoder path. Its generated
control advertises `image/png,.png`. A file whose bytes identify as JPEG, WebP, or SVG is refused
with an explicit unavailable-format message, even if its filename claims to be PNG. The bytes,
not the filename or declared MIME type, decide the format.

## Local conversion and cache

Accepted input is inspected locally before conversion. The shared logo contract bounds encoded
input, decoded dimensions and pixels, frame count, output count, CPU time, memory, and output
bytes. Animated or multi-frame input, malformed bytes, invalid dimensions, unsupported formats,
and limit violations are refused before partial application.

The desktop route uses typed local actions for `logo.inspect`, `logo.convert`, `logo.cache.read`,
`logo.cache.write`, and `logo.cache.clear`. Conversion currently requests PNG derivatives at 20 by
20 and 64 by 64 pixels with alpha, using contain fitting, a transparent background, a centered
focal point, and the declared safe area. Conversion and cache failures leave the previous valid
mark active and report the actual refusal.

The durable custom-choice marker is derived from the validated derivative receipt SHA-256, using
the shape `logo/cache/<receipt-sha256>`. It does not use the source filename or a source path. A
cache record is accepted only when its schema version, package identity, active-custom marker,
asset list, isolated-decoder receipt, dimensions, byte count, digest, and round-trip validation
are all valid.

On startup, the renderer requests the validated local cache and rehydrates a supplied derivative
payload into a short-lived object URL for the title bar. A missing payload, invalid base64, invalid
receipt, or unavailable cache leaves the shipped mark visible and says why. Reset removes the
local choice and requests cache clearing through the typed service action. A cache-clear refusal
does not claim that the reset completed.

## Configuration

The current desktop controls are the three shipped presets, the PNG custom picker, a status
readout, and reset. The selected choice persists through the durable local settings boundary.
Custom source bytes remain local and are not uploaded. Release and deployment targeting was also
corrected to the maintained repository in commit `1f279d1ea0dd62acbfa88c589d68566dd3779c67`.
That adjacent delivery correction does not constitute packaged logo proof.

Crop, fit, focal-point, background, multi-size editing, named custom presets, and broader
per-element appearance editing remain incomplete as user-facing controls. The conversion request
has bounded defaults for these values, but a default sent to a service is not the same thing as an
editor a user can operate.

## Failure modes

The previous valid mark remains active when inspection, conversion, output validation, cache
writing, cache reading, cache clearing, or rehydration fails. The current boundary explicitly
refuses non-PNG custom input because the packaged isolated decoder supports PNG derivatives only.
The renderer also refuses empty, malformed, spoofed, oversized, over-dimension, animated, and
otherwise unsupported input without applying a partial result.

No remote image, source URL, source filename, or source path is used as the durable custom mark.
The stable application identity remains unchanged when a displayed mark changes.

## Accessibility and localization

The title-bar mark has a real accessible label, and the custom picker is a semantic file control
with a no-file state, rejection state, loaded state, replacement path, and clear/reset path in the
compiled design contract. The renderer source also keeps the selected mark separate from package
identity and supplies the image boundary with an accessible label.

Real packaged interaction, keyboard traversal, screen-reader output, narrow-layout behavior,
display-scale behavior, all language modes, and every funny-level setting remain unverified for
this feature. The broader appearance editor contract is also not implemented. No screenshot or
recording is presented as proof of those boundaries.

## Focused checks

The implementation commits focused checks at the following exact paths:

- `console/tests/contracts/app-logo-customization.test.mjs`: 21 test declarations covering byte
  format detection, bounds, animation, storage fallback, identity invariants, renderer wiring,
  title-bar consumption, local-only behavior, PNG-only picker registration, and receipt-derived
  markers.
- `console/tests/ui/logo-mark-wired.test.tsx`: 3 test declarations covering shipped preset assets,
  accessible image naming, and title-bar consumption.
- `console/tests/ui/logo-persistence-wired.test.tsx`: 5 test declarations covering inspect,
  convert, cache write, startup rehydration, reset failure reporting, restart rendering, and the
  PNG picker contract.

These 29 focused test declarations are associated with renderer commit
`a05f4b614384a96b4b7bb12eddaac8231835ac22`. This documentation lane did not execute the test
files. No packaged interaction, accessibility session, broader appearance-editor verification,
or real screenshot evidence is claimed.

## Verification boundary

Source-level checks establish the PNG-only registration, typed inspection and conversion actions,
receipt-derived persistence, validated cache rehydration, title-bar image consumer, and reset
failure path. They do not establish that the packaged application executes the complete flow on a
fresh install, that taskbar or executable icons consume the selected mark, or that accessibility
and visual behavior are correct at every supported size and language mode. Those require the
current built application, real user interaction, and fresh capture evidence.

## Suggested articles

[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Automatic updates](automatic-updates.md), [Platform feature index](README.md).
