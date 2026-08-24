# Personal vocabulary upload

Lets a user supply a local JSON file that remaps specific words in the interface to their own preferred terms, with no data leaving the device.

## Behavior

A file-upload control is meant to accept a bounded, versioned local JSON file of word replacements, apply it to user-facing text only, and clear back to original wording when the file is removed.

## Configuration

Validation would bound file size, nesting depth, and entry count, and make no network request of any kind when loading, applying, or clearing the file.

## Current status

**Desktop application:** Not implemented. The desktop application has no personal-vocabulary upload control anywhere in its settings.

**Documentation website:** Implemented for the shared site shell. Every page exposes upload and clear controls. The loader bounds bytes and entry counts, rejects unsupported versions, unexpected fields, unsafe and duplicate keys, and unbounded strings, applies replacements locally, and revalidates cached data on every load. Reload status describes the cache rather than pretending the original file remains loaded.

## Failure modes

A malformed or oversized file is rejected inline and never partially applied. A corrupt cache is removed and original wording resumes. Personal mappings, source names, and file paths are excluded from export.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Language modes](language-modes.md), [Platform feature index](README.md).
