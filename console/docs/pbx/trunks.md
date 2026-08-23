# Trunks & registrations

## Behavior

Outbound carriers and inbound identifies. Registration state is polled live; credentials live in the secret intake, never on this screen. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `3`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Failover

What happens when the primary carrier stops answering.

- **Retry interval** (`t_retry`) — a slider control, default `60`.
- **Forbidden retry** (`t_forbidden`) — a slider control, default `300`.
- **Fatal retry attempts** (`t_fatal`) — a stepper control, default `5`.
- **Failover order** (`t_order`) — a order control, default `carrier-primary`, `carrier-backup`, `branch-iax`.

### Outbound identity

How your calls appear to the carrier.

- **From domain source** (`t_from`) — a segmented control, default `Trunk`, choices `Trunk`, `Endpoint`, `Global`.
- **Send P-Asserted-Identity** (`t_pai`) — a switch control, default `true`.
- **Privacy header** (`t_privacy`) — a segmented control, default `none`, choices `none`, `id`, `header`, `critical`.
- **100rel** (`t_100rel`) — a segmented control, default `yes`, choices `no`, `required`, `yes`.

## Failure modes and security

Every row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Trunk authentication](trunkauth.md), [Endpoints](endpoints.md), and [Security](../system/security.md).
