# Skills registry

## Behavior

Installed agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here. It is backed by `skills/`. The rail badge on this destination currently reads `26`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

Nothing. This console installs no agent skills and has no registry to read one from, so the table is empty.

The orchestration settings below are this console's own preferences and are stored locally; they describe no installed skill, because there is none.

## Configuration

### Orchestration

Multi-agent orchestration defaults.

- **Maximum parallel lanes** (`u_lanes`) — a stepper control, default `4`.
- **Isolated worktree per lane** (`u_isolate`) — a switch control, default `true`.
- **Lane model override** (`u_model`) — a select control, default `gpt-5.6-luna`, choices `gpt-5.6-luna`, `inherit`.
- **Verification panel for high-risk lanes** (`u_verify`) — a switch control, default `true`.
- **Keep destructive actions with orchestrator** (`u_destruct`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in skills/; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in skills/, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Memory console](memory.md), [Status hub](hub.md), and [Operations](ops.md).
