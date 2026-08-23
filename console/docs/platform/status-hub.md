# Status hub

A shared, live status page reporting what the product's own maintenance work is currently doing — what is running, what has landed, and what is blocked.

## Behavior

A status surface is meant to show real-time build, verification, and release state with evidence behind every claim, distinct from the product's own PBX operational dashboards.

## Configuration

It would update one page in place rather than mint a new page per update, and carry emoji-coded states that never claim a check passed before it has actually run.

## Current status

**Desktop application:** Not implemented. No such development-status page exists for this product on the desktop application.

**Documentation website:** Not implemented. No such development-status page exists on the site either.

## Failure modes

If the underlying build or release data were unreachable, the intended behavior is to say so on the page rather than show a stale state as current; nothing implements that today.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Non-blocking notifications](non-blocking-notifications.md), [In-app changelog viewer](changelog-viewer.md), [Agent hub](../agent/hub.md), [Platform feature index](README.md).
