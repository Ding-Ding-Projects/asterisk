# Tab groups and tab search

Lets a user organize open tabs into named, colored groups and search across them from four distinct entry points.

## Behavior

Tabs are meant to support pinning and named or colored grouping, plus four separate searches: the current strip, inside one group, across group names, and a master search spanning every open tab.

## Configuration

The site tab manager stores named groups, membership, pinned routes, order, and the active group locally. Each of the four searches has its own adjacent regex-builder trigger and keeps the active group collapsed state intact. Reordering and group changes are local browser operations only.

The shared site export includes a versioned redacted tab and group record, including order, pins, groups, and appearance values. Toy-lock credential digests are omitted, and the file is an audit/export record rather than an import or restore format.

## Current status

**Desktop application:** Not implemented. The desktop application has no concept of multiple open tabs to group or search across.

**Documentation website:** Partial, runtime proof unverified. The shared route strip exposes group creation, rename, delete, color metadata, collapse, pinning, reordering, four independent searches, and local bulk-close controls. Closed-route persistence, destructive super-confirmation, group color rendering, and full local history integration remain incomplete. It does not claim that separate HTML documents share one renderer panel.

## Failure modes

The local model is bounded to the routes present in the current navigation. A route added later is appended to the primary group. Invalid saved groups, unknown route identifiers, malformed appearance records, and malformed lock digests are discarded and the valid local model remains. Regex failures remain local to their search and do not change the route order.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains not implemented.

## Suggested articles

[Browser-style tabbed navigation](browser-style-tabs.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).
