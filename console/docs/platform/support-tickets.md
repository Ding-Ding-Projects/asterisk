# Support Tickets recovery flow

A playful, entirely local, fake support-desk flow that helps a user recover from forgetting a toy-lock credential by pointing them at their own local data folder.

## Behavior

A local ticket form leads, after a canned first response, to opening the application's local data folder in the file manager so the user can delete it themselves. Nothing is sent anywhere and no real ticket is created.

## Configuration

The surface uses one unmissable, unstyled disclosure stating that nothing leaves the device and nobody is reading the ticket, regardless of the active funny level. Categories, severities, statuses, ticket numbers, opening time, and the canned response use one shared bounded model.

## Current status

**Desktop application:** Implemented-unverified. The mounted Support Tickets surface stores bounded local records, shows the exact recovery folder, provides a canned first response, and never deletes anything itself. Built-artifact interaction remains unverified.

**Documentation website:** Not implemented. The documentation website has no locks for this recovery flow to serve.

## Failure modes

If the file manager cannot be launched, the surface reports that exact outcome and continues to show the copyable folder path so the user can navigate there manually. Malformed or unavailable local ticket storage remains an explicit error rather than an empty success state.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

Focused checks and built-artifact interaction remain unverified in this lane. The source contract covers local persistence, bounded fields, exact disclosure, status advancement, and the non-deleting folder handoff.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).
