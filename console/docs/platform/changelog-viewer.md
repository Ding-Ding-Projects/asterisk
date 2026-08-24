# In-app changelog viewer

A browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.

## Behavior

The viewer lists every released version found by the build-time tag generator before any display cap is applied. It records the complete tag range, with categorized changes, typed inclusive date-range fields and presets, plain-text or regex search, copy, Markdown export, and links to the exact commit in `Ding-Ding-Projects/asterisk` that made each change.

## Configuration

Its tone would follow the funny-level and language settings while every version number, date, and commit link stays exact regardless of tone.

## Current status

**Desktop application:** Partial and mounted. App rail > App > Changelog renders the complete generated tag bundle, search and inclusive date filters compose, copy and Markdown export use the filtered entries, and each real commit reference is linked to the correct repository. A full month and year jump calendar remains open.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

A missing commit id is not turned into a link. The generator reads actual tags and commits, and the viewer's link builder refuses anything other than a full hexadecimal commit id. A tag with no new commits is rendered as a version with no recorded changes rather than an invented summary commit.

## Accessibility and localization

The controls use the generated shell's normal keyboard and focus behavior. A broad accessibility or narrow-layout run was not performed in this implementation lane.

## Verification

The mounted path is `changelog.ts`, `App.tsx`, `scripts/bundle-changelog.mjs`, and the generated changelog bundle. The bundle was regenerated from the repository's real tags in this lane; no broad build or runtime capture was run.

## Suggested articles

[Local version history](local-version-history.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).
