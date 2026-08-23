# Confirmation credits

## Behavior

The four-gate ceremony is thorough and, twelve times a day, exhausting. Win credits here and spend one to skip a ceremony. Credits are earned, never bought with money, and destructive actions above the danger line always cost two. It is backed by `arcade`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Spending rules

How credits are allowed to replace a ceremony.

- **Allow credits to skip ceremonies** (`cr_enable`) — a switch control, default `true`.
- **Cost per skip** (`cr_cost`) — a stepper control, default `1`.
- **High-danger actions still need the full ceremony** (`cr_danger`) — a switch control, default `true`. Restarting Asterisk, unloading a module and deleting an endpoint are above the danger line. Leave this on unless you enjoy explaining outages.
- **Maximum credits held** (`cr_cap`) — a stepper control, default `20`.
- **Credits expire after** (`cr_expire`) — a slider control, default `7`.

## Failure modes and security

Every control here maps to a real key in arcade; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in arcade, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[History & git](history.md), [Customise everything](customise.md), and [Notifications](notifications.md).
