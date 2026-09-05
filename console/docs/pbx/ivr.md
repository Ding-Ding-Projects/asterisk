# IVR menus

## Behavior

Each menu is a canvas subgraph with a prompt and a key map. Editing a key here moves the matching node on the canvas. It is backed by `extensions.conf`. The rail badge on this destination currently reads `5`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Menu behaviour

Applies to the selected menu.

- **Digit timeout** (`i_timeout`) — a slider control, default `7`.
- **Retries before fallback** (`i_retries`) — a stepper control, default `3`.
- **On invalid entry** (`i_invalid`) — a segmented control, default `Repeat`, choices `Repeat`, `Operator`, `Voicemail`, `Hangup`.
- **Allow direct extension dial** (`i_direct`) — a switch control, default `true`.
- **Prompt language** (`i_lang`) — a select control, default `en`, choices `en`, `es`, `fr`, `de`, `zh`.
- **Allow barge-in over prompt** (`i_barge`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in extensions.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

The **Write it** group is the one control that reaches the target: it replaces any `[main-menu]` context in `extensions.conf` with exactly the previewed lines, through the three-hit confirmation gate and the same full-document apply path the wizard uses (backup, write, reload, verify). Before it existed this screen previewed a dialplan it could never write.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in extensions.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Dialplan canvas](canvas.md), [Queues & agents](queues.md), and [Voicemail](../media/voicemail.md).
