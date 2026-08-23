# Appearance

## Behavior

Density, theme and motion for this console. Changes apply immediately with an undo. It is backed by `console settings`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Layout

How much fits on screen.

- **Row density** (`p_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.
- **Theme** (`p_theme`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`.
- **Interface scale** (`p_scale`) — a slider control, default `100`.
- **Reduced motion** (`p_motion`) — a switch control, default `false`.
- **Monospace numerics** (`p_mono`) — a switch control, default `true`.

### Behaviour

The console itself.

- **Open on launch** (`p_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`.
- **Offer the tour on launch** (`p_tour`) — a switch control, default `false`.
- **Keep running in tray** (`p_tray`) — a switch control, default `true`.
- **Full ceremony on every destructive action** (`p_confirm`) — a switch control, default `true`. Leave this on. It is the four-gate check: key, arming switch, slider and attention test.

## Failure modes and security

Every control here maps to a real key in console settings; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in console settings, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Customise everything](customise.md), [History & git](history.md), and [Notifications](notifications.md).
