# Operations & releases

## Behavior

Release history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification. It is backed by `release`. The rail badge on this destination currently reads `v3.2`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## Configuration

### Updates

Unsigned artifacts. The operating system may warn about an unknown publisher — that is expected.

- **Check for updates** (`o_check`) — a segmented control, default `On start + hourly`, choices `On start`, `On start + hourly`, `Manual`.
- **Stage in background** (`o_stage`) — a switch control, default `true`.
- **Install on next restart** (`o_restart`) — a switch control, default `true`.
- **Channel** (`o_channel`) — a segmented control, default `Stable`, choices `Stable`, `Beta`.
- **Verify package hashes** (`o_hash`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in release; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in release, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[History & git](../app/history.md), [Secret intake](secrets.md), and [About & policy](../app/about.md).
