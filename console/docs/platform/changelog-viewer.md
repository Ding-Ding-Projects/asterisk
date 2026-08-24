# In-app changelog viewer

A browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.

## Behavior

The viewer is meant to list every released version with categorized changes, a calendar-based date filter, a text search wired to the regex builder, and export to a durable text format, with each entry linked to the exact commit that made the change.

## Configuration

Its tone would follow the funny-level and language settings while every version number, date, and commit link stays exact regardless of tone.

## Current status

**Desktop application:** Not implemented. The desktop application has no in-app changelog viewer; release history is not browsable from within the application.

**Documentation website:** Partial, runtime proof unverified. `settings.html` now mounts a local viewer that consumes only the validated release history embedded by `console/site/build.mjs`, filters by text and date, opens the anchored regex builder, copies the filtered Markdown, exports the filtered Markdown, and links each accepted change to its exact 40-character commit. Missing records remain an explicit empty state. The calendar accepts ISO and host-locale date text, month and year jumps, presets, and range selection. Locale-specific parsing polish and runtime proof remain incomplete.

## Failure modes

A referenced commit that no longer exists is rejected by the composer record shape and never rendered as a link. A missing or unavailable tag list leaves the viewer with an explicit empty state rather than a guessed release.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Local version history](local-version-history.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).
