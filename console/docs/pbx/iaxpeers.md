# IAX peers

## Behavior

IAX2 peers, users and friends. The table is `iax2 show peers`, live off the target; selecting a row loads that exact peer's real `iax.conf` section below. It is backed by `iax.conf`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

The secret is write-only: this screen can set one and can never show you the one already there, which is why there is no field displaying it.

## Configuration

### Identity

What this peer is and where it lives.

- **type** (`ix_type`) — a segmented control, default `friend`, choices `user`, `peer`, `friend`.
- **host** (`ix_host`) — a text control, placeholder `dynamic`. An address, or `dynamic` when the far end registers to you.
- **username** (`ix_username`) — a text control, placeholder `asterisk`.
- **port** (`ix_port`) — a stepper control, default `4569`. IAX2 is 4569 by default; the sample shows 5036 for a second instance.

### Call handling

Transfers, liveness and call-token validation.

- **transfer** (`ix_transfer`) — a segmented control, default `yes`, choices `no`, `yes`, `mediaonly`. Native IAX2 transfer. `mediaonly` keeps the signalling here and moves only the audio.
- **qualify** (`ix_qualify`) — a text control, placeholder `yes`. `yes`, `no`, or a millisecond threshold.
- **trunk** (`ix_trunk`) — a switch control, default `false`. IAX2 trunking multiplexes several calls into one stream to this host.
- **requirecalltoken** (`ix_calltoken`) — a segmented control, default `yes`, choices `no`, `yes`, `auto`. Call-token validation resists spoofed call setup. `auto` requires it only from peers known to support it. Turning it off weakens that protection.

### Media

- **Allowed codecs** (`ix_codecs`) — an order control, default `ulaw`, `alaw`, pool `opus`, `g722`, `ulaw`, `alaw`, `g729`, `gsm`, `ilbc`, `speex`. Written as `disallow=all` followed by the allow list, which is what makes an allow list mean anything.

### Routing & accounting

Where calls land and how they are recorded.

- **context** (`ix_context`) — a text control, placeholder `from-internal`. The dialplan context inbound calls enter. `iax.conf` permits several; the first is the default.
- **accountcode** (`ix_accountcode`) — a text control, placeholder `lss0101`.
- **mailbox** (`ix_mailbox`) — a text control, placeholder `1234`.

### Credential

Write-only. Setting a secret replaces whatever is there; nothing on this screen can read one back.

- **Set a new secret** (`ix_secret_set`) — a switch control, default `false`. Leave this off and the existing secret is left exactly as it is. Switch it on and a strong secret is generated, written once, and shown once — this console never stores or redisplays it.

### Save

- **Save this peer** (`ix_save`) — action button. Select a peer from the table above first — this writes only what changed for that exact peer, backed up first and applied through the same plan/apply transaction every other write in this console uses. A generated secret is shown exactly once, in a dialog, and nowhere else — never persisted by this console, never in an export, never in local history.

## What loading and saving actually touch

`iax.conf` writes a peer as a named section carrying `type=peer` or `type=friend` inside it, so a binding looking for a section literally called `peer` could never have matched one — matching by type, not by name, is what makes the row-click load and Save both work at all. `iax-peers.ts`'s `findPeer`/`applyControlValues` do that match; `App.tsx`'s `onPickIaxPeerRow`/`onSaveIaxPeer` are the load and save paths themselves.

The trunks screen's own live table also shows every IAX2 registration (`iax2 show registry`, `iax.conf`'s own `register =>` lines), named the same way the directive itself is: username and host joined by `@`, or the bare host when the line sets no username. That is a reading only, not an edit — the registration line an IAX2 trunk uses to dial *out* is a different object from the peer/friend section a partner dials *in* to, and this screen edits only the latter.

## Failure modes and security

Every row reflects a real object in `iax.conf`; nothing is invented to fill the table. A target with no configured peers renders an honestly empty table rather than the design's own sample rows. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The secret's write-only design means a wrong guess here cannot be corrected by comparison — only by setting a new one, which is the trade-off for never letting a credential travel back through renderer state, an export, a screenshot, or local history.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in `iax.conf`, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that picking a different row without saving resets `ix_secret_set` to off (so a switch armed for one peer can never silently apply to the next), that a generated secret is shown exactly once and never persisted, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Trunks](trunks.md), [Endpoints](endpoints.md), and [Security](../system/security.md).
