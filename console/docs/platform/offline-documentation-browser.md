# Offline documentation browser

A fully offline, in-app documentation browser bundling every feature article, with internal links and a search bar, independent of the public documentation website.

## Behavior

Every article is meant to be bundled into the application at build time, rendered through one shared markdown renderer, with article-to-article links resolving inside the browser and a search bar covering both titles and article bodies.

## Configuration

A completeness guard would fail the build if any article file present in the source tree were missing from the bundle.

## Current status

**Desktop application:** Not implemented. The desktop application has no in-app documentation browser; it links out to the public documentation website instead of bundling articles for offline use.

**Documentation website:** Partial. The documentation website itself hosts and renders these same articles online, with in-page section navigation and inter-article links, but it depends on network access and is not the bundled in-app offline browser this feature describes; there is also no full-text search across article bodies yet, only the article list.

## Failure modes

An article present in the source tree but missing from a build's bundle is meant to fail that build outright; the site's own build script instead simply reflects whatever exists on disk, which is a different and looser guarantee than this feature calls for.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Command palette](command-palette.md), [Platform feature index](README.md).
