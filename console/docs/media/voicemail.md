# Voicemail boxes

## Behavior

Mailboxes, greetings and delivery. Attachment and storage options are switches; nothing about a mailbox needs typing except the owner name. It is backed by `voicemail.conf`. The rail badge on this destination currently reads `18`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.

## Configuration

### Delivery

What happens the moment a message lands.

- **Attach recording to email** (`v_attach`) — a switch control, default `true`.
- **Delete after emailing** (`v_delete`) — a switch control, default `false`. Careful. On means the only copy of the message is the one in the mailbox of the email server.
  - *What it is:* Whether the recording is deleted from the PBX once it has been emailed.
  - *Why it exists:* Mailbox storage on a PBX is finite and messages accumulate forever.
  - *Choosing a value:* Off keeps a copy on the PBX. On makes email the only copy.
  - *Gotcha:* If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it.
- **Message format** (`v_format`) — a segmented control, default `wav49`, choices `wav`, `wav49`, `gsm`, `ogg`.
- **Maximum messages** (`v_maxmsg`) — a stepper control, default `100`.
- **Maximum message length** (`v_maxsecs`) — a slider control, default `180`.
  - *What it is:* The longest a single voicemail message may be.
  - *Why it exists:* It bounds storage and stops accidental open-line recordings filling the disk.
  - *Choosing a value:* 180 seconds is generous for business use.
  - *Gotcha:* Callers are cut off mid-word with no warning tone unless you also configure one.
- **Discard shorter than** (`v_minsecs`) — a slider control, default `3`.

### Caller experience

Prompts, review and escape routes.

- **Let caller review** (`v_review`) — a switch control, default `true`.
- **Zero escapes to operator** (`v_operator`) — a switch control, default `true`.
- **Play date envelope** (`v_envelope`) — a switch control, default `true`.
- **Announce caller ID** (`v_saycid`) — a switch control, default `false`.

## Failure modes and security

Every row reflects a real object in voicemail.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it. Callers are cut off mid-word with no warning tone unless you also configure one.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in voicemail.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Queues & agents](../pbx/queues.md), [Codecs & RTP](codecs.md), and [Secret intake](../agent/secrets.md).
