# Codecs & RTP

## Behavior

Transcoding, packetisation and the media port range. Drag the codec list to change preference order globally. It is backed by `codecs.conf · rtp.conf`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.

## Configuration

### Codec preference

The order Asterisk offers codecs in an SDP. Drag to reorder — there is no list to type.

- **Global order** (`k_order`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`, `g729`.
  - *What it is:* The order codecs are offered in an SDP.
  - *Why it exists:* The far end picks the first one it also speaks, so order is preference.
  - *Choosing a value:* opus for quality, g722 for wideband on desk phones, ulaw as the universal fallback, g729 only where bandwidth is scarce and you have licences.
  - *Gotcha:* Putting a narrowband codec first means every call is narrowband, no matter what the phones support.
- **Allow transcoding** (`k_transcode`) — a switch control, default `true`.
- **Opus bitrate** (`k_opusbr`) — a slider control, default `24`.
- **Preferred ptime** (`k_ptime`) — a segmented control, default `20`, choices `10`, `20`, `30`, `40`, `60`.

### RTP

Where media lands and how it survives a bad network.

- **RTP port range start** (`r_start`) — a slider control, default `10000`.
  - *What it is:* The lowest UDP port Asterisk will use for media.
  - *Why it exists:* Firewalls need to know the range to open.
  - *Choosing a value:* 10000 to 20000 is the usual convention.
  - *Gotcha:* Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.
- **RTP port range end** (`r_end`) — a slider control, default `20000`.
- **RFC2833 payload** (`r_dtmf`) — a stepper control, default `101`.
- **strictrtp** (`r_strict`) — a switch control, default `true`.
- **ICE support** (`r_ice`) — a switch control, default `false`.
- **DTLS for WebRTC** (`r_dtls`) — a switch control, default `true`.

## Failure modes and security

Every control here maps to a real key in codecs.conf · rtp.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Putting a narrowband codec first means every call is narrowband, no matter what the phones support. Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in codecs.conf · rtp.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Endpoints](../pbx/endpoints.md), [Conferences](confbridge.md), and [Music on hold](moh.md).
