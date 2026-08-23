# Provider-authored markup rendering

Text authored elsewhere — release notes, imported documents — is rendered as real formatted markup rather than printed as raw source characters.

## Behavior

Provider-authored markdown-like text is meant to be rendered through one shared, isolated renderer producing real headings, links, and lists, rather than showing literal hash marks and brackets to the reader.

## Configuration

The renderer would keep an honest empty state when no content is provided, rather than presenting a blank area that looks like a loading failure.

## Current status

**Desktop application:** Not implemented. The desktop application does not currently render externally authored markup text in this sense.

**Documentation website:** Implemented. The documentation website's own articles are authored in markdown and rendered through one shared renderer, producing real headings, links, lists, and section navigation rather than raw markdown characters. This is the website's own authored content rather than third-party provider text, but the rendering mechanism itself is the one this feature describes.

## Failure modes

Malformed markdown in a source article is meant to degrade to plain paragraphs rather than break the page layout; the site's renderer has not been separately stress-tested against adversarial input.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Offline documentation browser](offline-documentation-browser.md), [Platform feature index](README.md).
