# Trunk authentication

## Behavior

When a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do. It is backed by `pjsip.conf · partner requests`. The rail badge on this destination currently reads `2`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Answering policy

How requests arrive and what may be answered without you.

- **Auto-approve low-risk requests** (`ta_auto`) — a switch control, default `false`. Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.
- **Requests expire after** (`ta_expire`) — a slider control, default `48`.
- **Notify on new request** (`ta_notify`) — a switch control, default `true`.
- **Require mutual confirmation** (`ta_mutual`) — a switch control, default `true`. Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.
- **Sign my answers** (`ta_sign`) — a switch control, default `true`.
- **Keep the answer history forever** (`ta_log`) — a switch control, default `true`.

## Failure modes and security

Every control here maps to a real key in pjsip.conf · partner requests; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf · partner requests, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Trunks](trunks.md), [Security](../system/security.md), and [History & git](../app/history.md).
