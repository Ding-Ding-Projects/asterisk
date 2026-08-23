# Support Tickets recovery flow

A playful, entirely local, fake support-desk flow that helps a user recover from forgetting a toy-lock credential by pointing them at their own local data folder.

## Behavior

A mock ticket form is meant to lead, after a canned first response, to opening the application's local data folder in the file manager so the user can delete it themselves — nothing sent anywhere and no real ticket created.

## Configuration

One unmissable, unstyled line would state plainly that nothing leaves the device and nobody is reading the ticket, regardless of the active funny level.

## Current status

**Desktop application:** Not implemented. The desktop application has no such recovery flow; there is no per-element locking for it to recover from, and no mock support surface exists.

**Documentation website:** Not implemented. The documentation website has no locks for this recovery flow to serve.

## Failure modes

If the file manager cannot be launched on a given machine, the intended behavior is to show the exact folder path as text so the user can navigate there manually; nothing implements the flow yet to hit that fallback.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).
