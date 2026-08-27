# Vocabulary & emission guard

## Behavior

The private vocabulary dictionary and the emission guard that blocks a forbidden term before it can leave the process. It is backed by `vocabulary-dictionary.json`. The rail badge on this destination currently reads `lock`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

The real loaded state of the dictionary you upload from this machine, in words — whether one is loaded and how many replacements it is applying to the interface.

The terms themselves are deliberately **not** listed in the table. Every table in this console can be selected, copied and exported to a file, and a private vocabulary term must never reach an export or the clipboard. So the dictionary stays in this machine's own local cache, is applied to the interface, and is reported here as a count rather than as rows. That is a decision, not an omission.

## Configuration

### Emission guard

Runs on every string the app is about to write or display.

- **Guard enabled** (`n_guard`) — a switch control, default `true`.
- **On violation** (`n_mode`) — a segmented control, default `Block`, choices `Warn`, `Block`, `Rewrite`.
- **Scan surfaces** (`n_scan`) — a chips control, default `UI text`, `Logs`, `Exports`, choices `UI text`, `Logs`, `Exports`, `Clipboard`, `Telemetry`.
- **Vocabulary lock** (`n_lock`) — a switch control, default `true`.
- **Report drift daily** (`n_drift`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in vocabulary-dictionary.json; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in vocabulary-dictionary.json, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Memory console](memory.md), [Secret intake](secrets.md), and [Notifications](../app/notifications.md).
