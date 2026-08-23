# External settings sources

Lets a scheduled setting take its value from a remote source — an HTTPS API or a home-automation boolean — instead of only from a fixed local schedule.

## Behavior

A scheduled rule is meant to be able to source its active or inactive value from a validated versioned HTTPS endpoint or a linked home-automation boolean entity, refreshing on a bounded interval.

## Configuration

The source would be selected per rule alongside the local schedule fields, with the access token for a remote source kept in the operating system credential store rather than in a settings file.

## Current status

**Desktop application:** Not implemented. No external source integration exists; scheduled settings themselves are also not implemented, so there is nothing yet for a remote source to feed.

**Documentation website:** Not implemented. No remote settings source exists on the site.

## Failure modes

On a network failure, timeout, or malformed response, the intended behavior is to keep the last valid local value and surface a recovery notification rather than silently applying whatever the failed response contained; nothing implements that path today.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Scheduled settings](scheduled-settings.md), [Platform feature index](README.md).
