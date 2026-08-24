# Right-click menus show keyboard shortcuts

Every context-menu item that has a keyboard shortcut displays it, right-aligned, in the platform's own notation.

## Behavior

A context menu is meant to show each item's real, currently-working keyboard shortcut beside its label, derived from the same source that registers the binding, never a guessed or stale one.

## Configuration

Shortcuts would be exposed to assistive technology as shortcuts, not as decorative trailing text.

## Current status

**Desktop application:** Not implemented. The desktop application's right-click menus, where they exist, do not display keyboard shortcuts beside their items.

**Documentation website:** Implemented on the delivery rail. Its context menu has a local filter field and labels the actual Ctrl+Shift+F, Ctrl+Enter, and Escape shortcuts beside their actions.

## Failure modes

A displayed shortcut that no longer matches the actual binding (because the binding changed and the label did not) is the specific failure this feature exists to prevent by deriving both from one source; there is nothing implemented yet to exercise that guarantee.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Command palette](command-palette.md), [Platform feature index](README.md).
