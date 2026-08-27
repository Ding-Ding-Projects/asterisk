# Sync & attestation

## Behavior

Every sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here. It is backed by `agent-memory-sync`. The rail badge on this destination currently reads `ok`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

Nothing, because there is nothing to synchronise: this console keeps no agent-memory corpus (see [Memory console](memory.md)). With no run to record there is no run history, no backup and no attestation, so the table is empty rather than listing runs that never happened.

The schedule controls below are this console's own preferences and are stored locally. They describe no run, because there is none.

## Configuration

### Schedule

When the console pushes memory upstream.

- **Automatic sync** (`y_auto`) — a switch control, default `true`.
- **Interval** (`y_every`) — a slider control, default `60`.
- **Backup before write** (`y_backup`) — a switch control, default `true`.
- **Require attestation** (`y_attest`) — a switch control, default `true`.
- **Keep backups** (`y_retain`) — a stepper control, default `30`.

## Failure modes and security

Every row reflects a real object in agent-memory-sync; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in agent-memory-sync, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Memory console](memory.md), [Secret intake](secrets.md), and [History & git](../app/history.md).
