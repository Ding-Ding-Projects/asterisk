# PJSIP endpoints

## Behavior

Phones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `12`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Identity

Who this endpoint claims to be on the wire, and what the far end is allowed to present back.

- **Transport** (`e_transport`) — a select control, default `transport-udp`, choices `transport-udp`, `transport-tcp`, `transport-tls`, `transport-wss`. A transport is the road the signalling travels on. UDP is the plain road, TLS is the same road inside an armoured tunnel.
  - *What it is:* Chooses which configured transport this endpoint signals over: plain UDP, TCP, TLS, or WebSocket for browsers.
  - *Why it exists:* Signalling carries who is calling whom, the credentials exchange and the media keys. On UDP all of that is readable by anything on the path.
  - *Choosing a value:* transport-udp is the historic default and fine inside a trusted LAN. transport-tcp helps where packets are large or fragmented. transport-tls is the right answer for anything crossing a network you do not own. transport-wss is required for WebRTC browser clients.
  - *Gotcha:* The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so.
- **Dialplan context** (`e_context`) — a select control, default `from-internal`, choices `from-internal`, `from-external`, `from-trunk`, `sip-guest`. When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.
  - *What it is:* The dialplan context this endpoint enters when it dials.
  - *Why it exists:* A context is a namespace of extensions. It is the single most important security boundary in Asterisk: an endpoint can only reach what its context lets it reach.
  - *Choosing a value:* from-internal for staff phones, from-external for anything untrusted, from-trunk for carriers.
  - *Gotcha:* Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will.
- **Caller ID presentation** (`e_callerid`) — a segmented control, default `Allowed`, choices `Allowed`, `Prohibited`, `Unavailable`.
- **Trust inbound identity** (`e_trust`) — a switch control, default `false`. Only turn this on for carriers you control. It tells Asterisk to believe P-Asserted-Identity headers the other side sends.

### Media & NAT

Every option here came out of pjsip.conf. Toggle, do not type.

- **direct_media** (`e_direct`) — a switch control, default `false`. Off means audio goes through Asterisk. On means the two phones talk to each other directly and Asterisk steps out of the audio path.
  - *What it is:* Whether the two phones may send audio straight to each other, leaving Asterisk out of the media path.
  - *Why it exists:* It halves bandwidth at the PBX and removes a hop of latency.
  - *Choosing a value:* no keeps audio flowing through Asterisk. yes lets the endpoints talk directly once the call is up.
  - *Gotcha:* With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off.
- **rtp_symmetric** (`e_symmetric`) — a switch control, default `true`.
  - *What it is:* Requires that RTP arrives from the same address and port we are sending to.
  - *Why it exists:* It defeats a class of audio injection where a third party sprays packets at your open RTP port.
  - *Choosing a value:* yes is strongly recommended. no only for equipment that genuinely cannot comply.
  - *Gotcha:* Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.
- **force_rport** (`e_forcerport`) — a switch control, default `true`.
  - *What it is:* Sends responses back to the port the request actually came from, rather than the port the phone claimed.
  - *Why it exists:* A phone behind NAT advertises its private port. Replying there sends the packet nowhere.
  - *Choosing a value:* yes for anything behind a router, which is nearly everything.
  - *Gotcha:* Turning it off for a remote phone produces one-way registration that silently expires.
- **rewrite_contact** (`e_rewrite`) — a switch control, default `true`. Needed when a phone behind a home router announces its private address. Asterisk quietly replaces it with the address the packet really came from.
  - *What it is:* Replaces the Contact header address with the address the packet actually arrived from.
  - *Why it exists:* Same NAT problem as force_rport, at the registration layer.
  - *Choosing a value:* yes for remote and home workers. Not needed on a flat trusted LAN.
  - *Gotcha:* On a carrier trunk this can be wrong: the carrier may legitimately present a Contact that differs from the source.
- **ice_support** (`e_ice`) — a switch control, default `false`.
- **media_encryption** (`e_encryption`) — a segmented control, default `sdes`, choices `no`, `sdes`, `dtls`.
  - *What it is:* Whether media is encrypted, and with which scheme.
  - *Why it exists:* TLS protects signalling only. Without media encryption the conversation itself is in the clear.
  - *Choosing a value:* no is unencrypted. sdes exchanges keys in the SDP and requires TLS to be meaningful. dtls negotiates keys in the media stream itself and is what WebRTC uses.
  - *Gotcha:* sdes over UDP signalling is theatre — the keys travel in plain text. If you turn on sdes, turn on TLS as well.
- **dtmf_mode** (`e_dtmf`) — a segmented control, default `rfc4733`, choices `rfc4733`, `inband`, `info`, `auto`.
  - *What it is:* How keypad presses travel from the phone to Asterisk.
  - *Why it exists:* IVR menus, voicemail passwords and conference controls all depend on getting this right.
  - *Choosing a value:* rfc4733 sends them as RTP events and is the modern default. inband sends actual tones in the audio, which compressed codecs mangle. info uses SIP INFO messages. auto tries to work it out.
  - *Gotcha:* inband with g729 is the single most common cause of an IVR that ignores every key press.

### Registration & AOR

How many devices may share this identity and how often Asterisk pokes them.

- **max_contacts** (`e_maxcontacts`) — a stepper control, default `2`.
  - *What it is:* How many devices may register against this one identity at the same time.
  - *Why it exists:* One identity ringing a desk phone and a mobile app together needs at least two.
  - *Choosing a value:* 1 for a single desk phone. 2 to 3 for desk plus mobile. 0 means unlimited and should not be used.
  - *Gotcha:* A stolen credential can quietly add a device. Keep this as low as the deployment allows and watch the contact list.
- **qualify_frequency** (`e_qualify`) — a slider control, default `60`. Asterisk sends a tiny OPTIONS ping this often to see if the phone is still alive. Zero switches the pings off.
  - *What it is:* How often Asterisk sends a lightweight OPTIONS request to check the endpoint is still alive.
  - *Why it exists:* It is how the console knows an endpoint went unreachable before a caller discovers it.
  - *Choosing a value:* 60 seconds is a sensible default. 30 for critical endpoints. 0 disables the check.
  - *Gotcha:* Very short intervals across hundreds of endpoints generate real traffic and real CPU. It is a poll, not a subscription.
- **Registration expiry** (`e_expiry`) — a slider control, default `3600`.
- **Allowed codecs** (`e_codecs`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`.

## What the table's Transport and Codecs columns read

The two columns come from the endpoint's own parameter table, which Asterisk prints for
`pjsip show endpoint <id>` and for nothing else. The plural `pjsip show endpoints` listing
carries neither value, so the console runs one further read per endpoint.

- **Transport** is the endpoint's configured `transport=`. An endpoint that sets none shows
  `—`: transports are matched from the inbound connection unless one is pinned, so there is
  genuinely no per-endpoint value to report. An endpoint pinned to a transport the target
  does not have still shows the name it is pinned to, which is the case worth seeing — the
  plural listing omits that row entirely and made the misconfiguration look like an
  ordinary blank.
- **Codecs** is the endpoint's configured `allow=` list, in Asterisk's own preference
  order. An endpoint configured to allow nothing reads `none allowed`, which is a real
  answer and not the same thing as never having looked.
- When the parameter table could not be read for a particular endpoint, the column falls
  back to the codec negotiated on a live channel and says so — `ulaw (in use)`. That is a
  different reading: one codec on one call, rather than the list the endpoint offers. It is
  labelled so the two can never be mistaken for each other.

One view reads the parameter table for at most **100 endpoints**, six at a time, because
each one is a separate command against the target. Anything past that shows `—` in both
columns rather than a value nobody read.

## Failure modes and security

Every row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so. Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will. With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off. Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Trunks](trunks.md), [Security](../system/security.md), and [Codecs & RTP](../media/codecs.md).
