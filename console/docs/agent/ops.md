# Operations & releases

## Behavior

Release history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification. It is backed by `release`. The rail badge on this destination currently reads `v3.2`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

This build's own bundled release history — the one place on the agent rail with a real source.

`scripts/bundle-changelog.mjs` runs at build time and reads this repository's real `ding-pbx-console-v*` tags, newest first, at most twenty of them. Every version in the table is a tag that exists and every date is the calendar date of the commit that tag points at. Nothing here is invented, and a checkout with no version tag on it produces an honestly empty table that says so rather than a table that looks broken.

Three of the five columns stay empty, and the screen says why rather than filling them:

- **Artifacts** — the bundle records commits, never release assets. This console has not asked a forge which files are attached to any of these tags.
- **Duration** — the workflow's own end-to-end timing is written into the release notes on the forge, not into this bundle.
- **State** — a tag is not a release. Whether a non-draft release was published for one of these tags is a fact about the forge that nothing in this process has checked, and writing `Published` into every row would be asserting exactly that unchecked fact.

### A coupling worth knowing about

The table's rows come from a build-generated file, so regenerating it changes what this screen renders. `npm run build` regenerates `changelog-bundle.ts` from whatever tags the checkout has, and when a new tag appears the rows change — which makes this destination's Material Design 3 audit record genuinely stale, because that record is a measurement of what this screen renders. Regenerate it with `npx tsx console/scripts/audit-design-parity-material.mjs` and commit the result. No other destination has this coupling, because no other table on this rail has a source at all.

## Configuration

### Updates

Unsigned artifacts. The operating system may warn about an unknown publisher — that is expected.

- **Check for updates** (`o_check`) — a segmented control, default `On start + hourly`, choices `On start`, `On start + hourly`, `Manual`.
- **Stage in background** (`o_stage`) — a switch control, default `true`.
- **Install on next restart** (`o_restart`) — a switch control, default `true`.
- **Channel** (`o_channel`) — a segmented control, default `Stable`, choices `Stable`, `Beta`.
- **Verify package hashes** (`o_hash`) — a switch control, default `true`.

## Failure modes and security

Every row is a real tag on this repository; nothing is invented to fill the table, and a column the bundle does not carry is left empty with its reason stated rather than backfilled with a plausible value. The rows describe releases rather than a running configuration, so they cannot drift from one: they describe the build you are looking at, and they change only when that build's own bundled history does.

## Verification

Exercise every control against its documented default and its full option range. For the table itself, confirm on the built application that the versions and dates it shows are the ones in this build's own `changelog-bundle.ts`, that Artifacts, Duration and State are empty on every row, and that the note beneath says why. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and asserts all three against the bundle rather than against its own expectations, so a reading taken and dropped on the way to this screen fails there rather than showing as a quietly blank table.

## Suggested articles

[History & git](../app/history.md), [Secret intake](secrets.md), and [About & policy](../app/about.md).
