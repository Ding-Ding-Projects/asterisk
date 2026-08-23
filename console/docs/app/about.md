# About

## Behavior

Build provenance and the policies this console is bound by. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Policy

Non-negotiable behaviour, surfaced so it is never a surprise.

- **Code signing** (`z_sign`) — a segmented control, default `Prohibited`, choices `Prohibited`. Packages ship unsigned on purpose. Windows may show an unknown-publisher warning; nothing here claims to be verified.
- **Installer** (`z_installer`) — a segmented control, default `Squirrel.Windows`, choices `Squirrel.Windows`.
- **Telemetry** (`z_telemetry`) — a switch control, default `false`.
- **Send crash reports** (`z_crash`) — a switch control, default `false`.

## Failure modes and security

Every control here maps to a real key in the owning configuration; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in the owning file, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Operations](../agent/ops.md), [Security](../system/security.md), and [Customise everything](customise.md).
