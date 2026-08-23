# Tab groups and tab search

Lets a user organize open tabs into named, colored groups and search across them from four distinct entry points.

## Behavior

Tabs are meant to support pinning and named or colored grouping, plus four separate searches: the current strip, inside one group, across group names, and a master search spanning every open tab.

## Configuration

Each search would carry its own adjacent regex builder and reveal a match inside a collapsed group without permanently expanding it.

## Current status

**Desktop application:** Not implemented. The desktop application has no concept of multiple open tabs to group or search across.

**Documentation website:** Not implemented. The site has no open-tab concept either.

## Failure modes

N/A — with no tab or group model implemented on either surface, there is no failure path to describe yet.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Browser-style tabbed navigation](browser-style-tabs.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).
