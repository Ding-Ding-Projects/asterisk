# Support Tickets recovery flow

A playful, entirely local, fake support-desk flow that helps a user recover from forgetting a toy-lock credential by pointing them at their own local data folder.

## Behavior

A mock ticket form is meant to lead, after a canned first response, to opening the application's local data folder in the file manager so the user can delete it themselves — nothing sent anywhere and no real ticket created.

## Configuration

One unmissable, unstyled line would state plainly that nothing leaves the device and nobody is reading the ticket, regardless of the active funny level.

## Current status

**Desktop application:** Not implemented. The desktop application has no such recovery flow; there is no per-element locking for it to recover from, and no mock support surface exists.

**Documentation website:** Local equivalent implemented, runtime proof unverified. Settings provides a local fictional ticket form with category, severity, description, ticket number, status progression, canned response, and a plain disclosure that nothing is sent and nobody is reading. The recovery route is clear browser storage, not a hosted support process and not an automated delete action.

## Failure modes

The static surface does not open an operating-system file manager. It states the exact recovery action, clearing this site's browser storage, and never claims that a ticket or response left the device.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains not implemented.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).
