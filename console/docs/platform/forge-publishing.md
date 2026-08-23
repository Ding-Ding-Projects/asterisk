# Forge publishing

Lets a user publish a repository to a chosen account or organization, with a non-forking fallback for providers that cannot fork.

## Behavior

A publish flow is meant to let the user choose the target account or organization from a real signed-in account list, and to offer copy-and-push as an alternative when the target provider cannot fork.

## Configuration

The account list would be searchable and support adding further signed-in accounts through the same sign-in flow used for the first one.

## Current status

**Desktop application:** Not implemented. The desktop application administers a telephony exchange and has no source-repository publishing feature.

**Documentation website:** Not implemented. The documentation website has no repository-publishing feature of its own.

## Failure modes

N/A — with no publishing flow implemented, there is no failure path to describe.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[External editor handoff](external-editor-handoff.md), [Operations](../agent/ops.md), [Platform feature index](README.md).
