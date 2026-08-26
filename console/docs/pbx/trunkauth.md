# Trunk authentication

## Behavior

When a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do. It is backed by `pjsip.conf · partner requests`. The rail badge on this destination currently reads `2`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## What this screen reads

Two things, and they are not the same thing.

**The request inbox is empty and always has been.** No partner-request channel is wired into this console — there is no protocol, no transport and no partner identity behind those cards, because which of each to use is a product decision rather than a piece of wiring. The screen says exactly that. It says it whether or not a target is connected, because connecting a phone system would not add a single request: the missing channel is a fact about this console, not about any target.

**The target's real trunk authentication is read and reported.** The screen runs `pjsip show auths` and names every `type=auth` object the target actually has, with the `username=` each one presents — these are the objects an endpoint's `auth=`/`outbound_auth=` refers to, which is what "this trunk authenticates as X" is made of. It reads `pjsip show registrations` alongside them and reports how many outbound registrations exist. An object with no username reads `no username set` rather than rendering an empty pair of brackets, and a failed read carries the target's own reason.

The auth objects are deliberately **not** rendered as rows in the answer-history grid below. That grid's four fields are partner, what, answer and when, under a heading reading "Answer history" — so a row in it claims a partner asked something and this console answered. An auth object is neither, and putting real-looking content under a label it does not belong to is the same defect as the sample rows this console removed.

### Why the plural command, and never the singular one

`pjsip show auths` prints an id and a username and nothing else. `pjsip show auth <id>` prints the object's whole parameter set — including `password`, `md5_cred`, `oauth_secret` and `refresh_token`, all of which are registered fields on this object. Running it would put a real credential on screen and into anything that copies the screen. It is in neither read-only allowlist, the gateway refuses it if it is constructed by hand anyway, and both of those are asserted by tests rather than assumed.

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

The six controls above are this console's own settings and are stored locally. They are not keys in pjsip.conf, and there is no key in pjsip.conf for "auto-approve a low-risk partner request" — that is this console's workflow, which is why this destination's `file` field reads `pjsip.conf · partner requests` where the second half is not a file name at all. The article said otherwise until the auth reading landed, and it was wrong when it said it.

The reading beside them is unreachable-shown-as-unreachable, never backfilled: a failed `pjsip show auths` reports the target's own reason, and a target with genuinely no auth object reports that instead of leaving a blank.

## Verification

Exercise every control against its documented default and its full option range, and confirm each value survives a relaunch — they are local settings, so nothing should be expected to land in a configuration file.

For the reading, confirm on the built application that a target's real auth objects appear by name, that one with no `username=` reads `no username set`, that a target with none says so, and that a failed read carries the target's own reason. `tests/control-plane/pjsip-auths.test.ts` asserts the parser against a fixture assembled from this checkout's own `config_auth.c` format strings and re-derives the column widths from `res_pjsip_cli.h`, and it asserts the two things that keep the credential off this screen: the singular `pjsip show auth <id>` is in neither allowlist, and the gateway refuses it if it is constructed by hand. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and reads all of the above out of the markup.

## Suggested articles

[Trunks](trunks.md), [Security](../system/security.md), and [History & git](../app/history.md).
