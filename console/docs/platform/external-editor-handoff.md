# External editor handoff

A one-click action to open the current project, file, or export directly in an installed code editor.

## Behavior

The product is meant to detect installed editors and offer opening the current folder or a selected or exported file directly in one, with the choice persisted.

## Configuration

Opening a folder would open it as a workspace root rather than a single unrooted file, so surrounding project context is usable immediately.

## Current status

**Desktop application:** Partial. History, Changelog, appearance, and table exports can hand off a generated file to Visual Studio Code through the privileged control-plane seam, and History can open its app-data folder. The general installed-editor picker, custom-editor registration, and selected-editor launch remain unmounted.

**Documentation website:** Not implemented. The documentation website has no local files of the user's own to hand off to an editor.

## Failure modes

When Visual Studio Code is unavailable, the handoff reports that the export remains available through its ordinary download. The broader editor picker is not yet mounted, so custom-editor failures are not currently reachable.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

The pure editor planner has focused Chuts, while the privileged handoff still needs built-artifact verification. The Documentation website has no local editor handoff of its own.

## Suggested articles

[Complete data export](complete-exports.md), [Operations](../agent/ops.md), [Platform feature index](README.md).
