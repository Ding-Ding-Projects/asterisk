# Renameable app display name

Lets a user rename what the application calls itself in its own title bar and About screen, without touching its install identity.

## Behavior

A settings field is meant to let a user set a custom display name shown in the title bar, notifications, and About screen, persisted across restarts and resettable to the shipped name in one action.

## Configuration

Renaming would change display only — the application's data directory, package identifiers, and update feed stay fixed to the shipped constant regardless of what the user renames it to.

## Current status

**Desktop application:** Not implemented. The desktop application shows a fixed title-bar name with no rename control anywhere in settings.

**Documentation website:** Not implemented. The documentation website is not an installed application with a title bar identity of this kind.

## Failure modes

A rename that accidentally altered the application's data-directory path rather than only its display label is the specific failure this feature is designed to prevent by deriving the two from separate constants; there is no rename control yet to exercise that separation.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[App logo customization](app-logo-customization.md), [About and policy](../app/about.md), [Platform feature index](README.md).
