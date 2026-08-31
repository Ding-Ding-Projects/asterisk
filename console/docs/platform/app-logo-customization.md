# App logo customization

Lets a user replace the application's displayed mark with a shipped preset or their own local image.

## Behavior

A logo customization surface is meant to offer several presets plus a local image upload, processed entirely on-device with cropping, fit, and background controls, then applied live wherever the mark is shown.

## Configuration

Processing would be bounded and safe — validated file types, no network upload — with conversion failures leaving the previous valid logo in place.

## Current status

**Desktop application:** Not implemented. The desktop application shows a fixed application mark with no customization surface.

**Documentation website:** Partial but operational. The settings surface exposes three shipped
presets, contain/fill/original fit, focal-point controls, a local PNG/JPEG/SVG upload, a live preview,
and a reset action. The selected data stays in browser storage and the page states that nothing was
transmitted. Browser MIME and byte-size checks remain bounded, while cryptographic image signature
and decoded-pixel validation are not available in this static equivalent. Multi-size platform icon
output is not available here.

## Failure modes

A malformed, spoofed, oversized, or over-dimension image is rejected before storage, with the previous valid logo staying active. Source filenames and file paths are not retained, and image bytes are omitted from site-state export with that omission stated.

## Accessibility and localization

The site controls use native keyboard-reachable inputs and buttons, visible focus, labelled preview
and status regions, and the site's reduced-motion preference. The generated preset controls and
focal-point fields are still awaiting built-browser interaction evidence. The site can localize its
surrounding settings copy, while the preset names and image-format names remain factual labels.

## Verification

The focused static contract checks the bounded upload path, local storage key, live mark application,
and the presence of the new preset and presentation controls in `console/site/app.js`. A real browser
drive and packaged-artifact capture remain unrun in this lane, so the site evidence is
implemented-unverified rather than verified.

## Suggested articles

[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
