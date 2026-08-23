# Automatic updates

Chrome-style unsigned update checking that downloads, validates, and stages a new version in the background, then offers a non-blocking restart prompt.

## Behavior

The application is meant to check for updates on startup and on a bounded schedule, validate the unsigned update package by hash over HTTPS, stage it locally, and show a persistent non-blocking ready banner naming the version and offering restart-now or later.

## Configuration

Because code signing is permanently out of scope for this product, every update surface would say plainly that the package is unsigned and may trigger an operating-system warning.

## Current status

**Desktop application:** Not implemented. The desktop application has no automatic-update mechanism; new versions must be installed manually from a downloaded installer, and there is no update-check, staging, or ready-to-restart banner.

**Documentation website:** Not implemented. The documentation website has no installable update cycle of this kind; it is redeployed directly rather than updated on a user's machine.

## Failure modes

A downloaded update package whose hash does not match its published manifest is meant to be discarded without staging or offering to restart into it; there is no updater yet to enforce that check.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Status hub](status-hub.md), [About and policy](../app/about.md), [Platform feature index](README.md).
