# External editor handoff

A one-click action to open the current project, file, or export directly in an installed code editor.

## Behavior

The product is meant to detect installed editors and offer opening the current folder or a selected or exported file directly in one, with the choice persisted.

## Configuration

Opening a folder would open it as a workspace root rather than a single unrooted file, so surrounding project context is usable immediately.

## Current status

**Desktop application:** Not implemented. The desktop application has no external editor detection or handoff action anywhere in its interface.

**Documentation website:** Implemented as a browser-mediated equivalent at `history.html`. It accepts local file selection and export download, but keeps external-editor opening unavailable because a normal browser does not expose a verified local path. It links to the official Visual Studio Code download and states that local paths remain browser-owned.

## Failure modes

When no supported editor is installed, the intended behavior is a clear message naming that and an offer to get one, rather than a silently disabled or missing button; there is no handoff action yet to fail this way.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Complete data export](complete-exports.md), [Operations](../agent/ops.md), [Platform feature index](README.md).
