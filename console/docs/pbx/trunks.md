# Trunks & registrations

## Behavior

Outbound carriers and inbound identifies, PJSIP and IAX2 alike -- the live table merges `pjsip show registrations` with `iax2 show registry`. Registration state is polled live; credentials live in the secret intake, never on this screen. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `3`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

Click a PJSIP row to load that exact registration, and the endpoint paired with it when one can be found, into the groups below. An IAX2 row has no PJSIP registration by that name -- it says so plainly rather than loading nothing silently, and points at the IAX peers screen's own editor instead.

## What loading and saving actually touch

Three real objects, not one:

- The **[registration]** section named after the clicked row (`configs/samples/pjsip.conf.sample` lines 1519-1552), which is where the Failover group's three fields live. `parsePjsip` deliberately does not model this object type -- its own comment excludes registrations alongside transports, ACLs and `[global]` -- so a dedicated module, `trunk-registration.ts`, finds and writes it by name and by `type=registration`, because a registration and an endpoint can share one bracket name the same way an endpoint/auth/aor trio already does.
- The **paired endpoint**, found through the registration's own `endpoint=` line, or by sharing its bracket name when there is no explicit one -- the Outbound identity and Advanced groups both read and write this object, through `trunk-advanced.ts`.
- Nothing is guessed: a registration with no reachable endpoint still loads its retry policy, and Save still writes it, but Outbound identity and Advanced simply keep whatever they last showed.

Before this screen had a Save action at all, these five controls were bound only to whichever registration and endpoint happened to be first in the file -- a real read, but the same value regardless of which row was clicked, and nothing anywhere wrote it back.

## Configuration

### Failover

What happens when the primary carrier stops answering. `configs/samples/pjsip.conf.sample` lines 1519-1552 (the `[registration]` template).

- **Retry interval** (`t_retry`) — a slider control, default `60`. `retry_interval`, line 1542.
- **Forbidden retry** (`t_forbidden`) — a slider control, default `300`. `forbidden_retry_interval`, line 1544.
- **Fatal retry attempts** (`t_fatal`) — a stepper control, default `5`. `max_retries`, line 1532.

### Outbound identity

How your calls appear to the carrier, on the paired `[endpoint]` section.

- **Send P-Asserted-Identity** (`t_pai`) — a switch control, default `true`. `send_pai`, default `no`.
- **100rel** (`t_100rel`) — a segmented control, default `yes`, choices `no`, `required`, `yes`. Line 650.

### Advanced

Further `[endpoint]` settings on the same paired endpoint -- T.38 fax relay, identity headers, and how this trunk's own address is presented. Every key here was previously fully built and tested in `trunk-advanced.ts` with no control anywhere in the design to carry it; this group is what finally gives that module a screen.

- **Send Connected Line updates** (`tk_connectedline`) — switch, default `true`. `send_connected_line`, default `yes`.
- **Contact user** (`tk_contactuser`) — text. `contact_user`, default empty.
- **From domain** (`tk_fromdomain`) — text. `from_domain`, default empty.
- **From user** (`tk_fromuser`) — text. `from_user`, default empty.
- **Media address** (`tk_mediaaddr`) — text. `media_address`, default empty.
- **T.38 UDPTL** (`tk_t38`) — switch, default `false`. `t38_udptl`, default `no`.
- **T.38 error correction** (`tk_t38ec`) — segmented, default `none`, choices `none`, `fec`, `redundancy`. `t38_udptl_ec`; only read while T.38 UDPTL is on.
- **T.38 NAT support** (`tk_t38nat`) — switch, default `false`. `t38_udptl_nat`; only read while T.38 UDPTL is on.
- **T.38 max datagram** (`tk_t38mtu`) — stepper, default `0`. `t38_udptl_maxdatagram`, bytes; only read while T.38 UDPTL is on.
- **CNG fax tone detection** (`tk_faxdetect`) — switch, default `false`. `fax_detect`, default `no`.
- **Trust ID outbound** (`tk_trustout`) — switch, default `false`. `trust_id_outbound`, default `no`.
- **Send Remote-Party-ID** (`tk_sendrpid`) — switch, default `false`. `send_rpid`, default `no`.
- **Send Diversion header** (`tk_senddiversion`) — switch, default `true`. `send_diversion`, default `yes`.

### Save

- **Save this trunk** (`t_save`) — action button. Writes the loaded registration's retry policy and, when a paired endpoint was found, its outbound identity and advanced fields, in one plan/apply transaction. Refused with a plain message when no row has been loaded, or when the loaded endpoint has since been removed from the target.

## Failure modes and security

Every row reflects a real object read live off the target; nothing is invented to fill the table. Save only ever writes the three retry keys on the loaded registration, and, when a paired endpoint was found at load time, the outbound-identity and advanced keys on that exact endpoint -- untouched fields are left exactly as they were, and a warning is surfaced (never silently dropped) when T.38 detail is configured without T.38 itself being on, or when Remote-Party-ID is sent without outbound identity being trusted. A registration this target's pjsip.conf does not yet declare statically is created on Save rather than refused, the same convention the SLA trunk editor already uses.

## Verification

`tests/ui/trunk-advanced.test.tsx` exercises every Advanced-group key, including 100rel and send_pai, against `configs/samples/pjsip.conf.sample`'s own defaults and full option ranges, confirms independence between controls, confirms an untouched control writes nothing, and confirms the whole set survives being rendered to a file and re-parsed. Confirm on the built application that clicking a row loads the right registration and (when one exists) the right paired endpoint, that Save writes only what changed, that an IAX2 row is refused with an explanation rather than silently loading nothing, and that a registration Save creates is visible on the next read.

## Suggested articles

[Trunk authentication](trunkauth.md), [Endpoints](endpoints.md), [IAX peers](iaxpeers.md), and [Security](../system/security.md).
