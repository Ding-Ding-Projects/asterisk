# Notification centre

## Behavior

Every non-blocking notification the console has raised, reviewable after the fact so nothing important disappears with a toast. It is backed by `console`. The rail badge on this destination currently reads `4`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Delivery

What interrupts you and what merely gets recorded.

- **Show toasts** (`nt_toast`) — a switch control, default `true`.
- **Play a sound** (`nt_sound`) — a switch control, default `false`.
- **Notify on** (`nt_levels`) — a chips control, default `Errors`, `Warnings`, choices `Errors`, `Warnings`, `Info`, `Every change`.
- **Quiet hours** (`nt_quiet`) — a switch control, default `false`.
- **Keep history for** (`nt_keep`) — a slider control, default `30`.

## Failure modes and security

Every row reflects a real object in console; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in console, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[History & git](history.md), [Arcade](arcade.md), and [Vocabulary & guard](../agent/vocab.md).
