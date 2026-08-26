# Status hub sessions

## Behavior

Open sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window. It is backed by `status-hub`. The rail badge on this destination currently reads `3`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

Nothing yet, and the reason is specific enough to be worth naming: the status-hub client module exists in this console and is covered by its own tests, and no surface a person can reach calls it. Until that changes there is no session, no question and no reply state to list here — so the table says that rather than blaming a missing phone system, which would have nothing to do with it.

## Configuration

### Session policy

How the console behaves as a hub client.

- **Reply poll interval** (`b_poll`) — a slider control, default `15`.
- **Desktop notification on reply** (`b_notify`) — a switch control, default `true`.
- **Auto-close idle sessions** (`b_close`) — a switch control, default `false`.
- **Report worktree state each run** (`b_report`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in status-hub; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in status-hub, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Skills registry](skills.md), [Memory console](memory.md), and [Sync & attestation](sync.md).
