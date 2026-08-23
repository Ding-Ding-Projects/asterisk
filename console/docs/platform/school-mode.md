# School mode

A single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.

## Behavior

One shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.

## Configuration

Turning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.

## Current status

**Desktop application:** Not implemented. No shared switch, no rename path, and no unlock credential exist anywhere in the product.

**Documentation website:** Not implemented. No shared switch exists on the site either.

## Failure modes

If the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked; nothing currently implements that fallback because nothing implements the mode.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
