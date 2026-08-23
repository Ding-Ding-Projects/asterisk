# Bounded, self-painting overlays

Every popover, menu, and tooltip paints its own background and elevation and stays fully inside the viewport, scrolling internally rather than clipping content.

## Behavior

Overlays are meant to never render transparent over whatever sits behind them, and to bound their height to the available space, scrolling their own content rather than silently truncating it.

## Configuration

An overlay would never cover the control that opened it and would remain reachable and legible at every supported display scale.

## Current status

**Desktop application:** Partial. The desktop application's menus and popovers generally paint an opaque background and stay within the window, but have not been systematically verified against the viewport-bounding and internal-scroll requirements at every scale.

**Documentation website:** Partial. The site has a small number of overlay elements, such as the command-palette filter overlay, that paint an opaque surface and stay within the viewport in ordinary use, but have not been stress-tested at extreme viewport sizes.

## Failure modes

An overlay taller than the available viewport is meant to scroll its own content rather than clip the bottom entries silently out of view; this has not been verified as the actual behavior on either surface at extreme sizes.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Material appearance system](material-appearance.md), [Command palette](command-palette.md), [Platform feature index](README.md).
