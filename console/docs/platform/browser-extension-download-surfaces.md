# Browser-extension download capture surfaces

A companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.

## Behavior

A Start-download dialog is meant to name the proposed file, source, and destination before anything transfers; a separate always-on-top Downloading dialog would show live progress, rate, and pause/resume/cancel controls for the real transfer underway.

## Configuration

Both dialogs would reflect the actual queued and in-flight transfer rather than a simulated progress value.

## Current status

**Desktop application:** Not implemented. The desktop application is not a browser and has no browser-extension download surface of this kind.

**Documentation website:** Not implemented. The documentation website is not a browser extension and has no download-capture flow of this kind.

## Failure modes

N/A — with no extension or capture flow implemented, there is no failure path to describe.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).
