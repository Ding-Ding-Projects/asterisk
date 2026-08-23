# Live channels

## Behavior

Every channel currently up. Spy, record or hang up any of them; each action runs the full four-gate confirmation. It is backed by `core show channels`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Monitor defaults

Applied to any spy or recording started from this screen.

- **Spy mode** (`m_spy`) — a segmented control, default `Whisper`, choices `Listen`, `Whisper`, `Barge`.
- **Recording format** (`m_format`) — a segmented control, default `wav`, choices `wav`, `gsm`, `g722`, `ogg`.
- **Beep on record start** (`m_beep`) — a switch control, default `true`.
- **Keep recordings for** (`m_retain`) — a slider control, default `90`.

## Failure modes and security

Every row reflects a real object in core show channels; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in core show channels, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Dashboard](dash.md), [Security](../system/security.md), and [Endpoints](endpoints.md).
