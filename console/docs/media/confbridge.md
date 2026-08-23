# ConfBridge rooms

## Behavior

Bridge profiles, user profiles and menus. Every mixing option is a control; the DTMF menu is edited on the canvas. It is backed by `confbridge.conf`. The rail badge on this destination currently reads `6`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.

## Configuration

### Mixing

Audio quality and how the bridge combines participants.

- **Internal sample rate** (`c_rate`) — a segmented control, default `48000`, choices `8000`, `16000`, `48000`, `auto`.
- **Mixing interval** (`c_mixing`) — a segmented control, default `20`, choices `10`, `20`, `40`, `80`.
- **Video mode** (`c_video`) — a segmented control, default `follow_talker`, choices `none`, `follow_talker`, `last_marked`, `sfu`.
- **Denoise** (`c_denoise`) — a switch control, default `true`.
- **Jitter buffer** (`c_jitter`) — a switch control, default `true`.
- **Talker detection events** (`c_talker`) — a switch control, default `true`.

### Participants

What each caller may do once inside.

- **Maximum members** (`c_max`) — a stepper control, default `50`.
- **Wait for marked user** (`c_marked`) — a switch control, default `true`.
- **Announce join and leave** (`c_announce`) — a segmented control, default `name`, choices `off`, `tone`, `name`, `count`.
- **Music while alone** (`c_music`) — a switch control, default `true`.
- **DTMF menu** (`c_dtmf`) — a select control, default `default_menu`, choices `default_menu`, `admin_menu`, `listen_only`.

## Failure modes and security

Every row reflects a real object in confbridge.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in confbridge.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Music on hold](moh.md), [Codecs & RTP](codecs.md), and [Dialplan canvas](../pbx/canvas.md).
