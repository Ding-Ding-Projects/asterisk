# Destructive-action super confirmation

A deliberately hard-to-trigger-by-accident confirmation gate for irreversible actions, requiring two independent keys plus a full-range slider.

## Behavior

Before an irreversible action proceeds, the gate is meant to name the exact affected data, require two independently operated key controls, and only then allow a full-range confirmation slider, with an always-available emergency exit.

## Configuration

The gate would anchor beside the triggering control where the layout allows it and remain fully keyboard-operable.

## Current status

**Desktop application:** Partial. Destructive actions use a single confirmation step (click or checkbox), not the two-key-plus-slider gate, and there is no dedicated emergency-exit control.

**Documentation website:** Not implemented. The documentation website performs no destructive actions of its own.

## Failure modes

Cancelling at any point (including through the emergency exit) is meant to leave the target data completely untouched; the existing single-step confirmation on the desktop app does support a plain cancel today, which is the one part of this contract already met.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Local version history](local-version-history.md), [Bulk actions](bulk-actions.md), [Security](../system/security.md), [Platform feature index](README.md).
