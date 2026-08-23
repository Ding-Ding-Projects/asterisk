# Music on hold

## Behavior

Hold classes and their sources. Files are chosen from a picker; the playlist is reordered by dragging. It is backed by `musiconhold.conf`. The rail badge on this destination currently reads `4`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.

## Configuration

### Playback

How each class behaves while somebody waits.

- **Mode** (`h_mode`) — a segmented control, default `files`, choices `files`, `quietmp3`, `ringing`, `custom`.
- **Playback order** (`h_sort`) — a segmented control, default `random`, choices `alpha`, `random`, `randstart`.
- **Announcement every** (`h_announce`) — a slider control, default `30`.
- **Volume trim** (`h_volume`) — a slider control, default `0`.

## Failure modes and security

Every row reflects a real object in musiconhold.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in musiconhold.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Conferences](confbridge.md), [Codecs & RTP](codecs.md), and [Voicemail](voicemail.md).
