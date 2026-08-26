# Secret intake

## Behavior

Credentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered. It is backed by `templates/secret-intake`. The rail badge on this destination currently reads `6`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

Nothing, because this console stores no secret of its own. A credential typed into a control is consumed and the field blanked in the same step — precisely so that nothing keeps it — which also means there is nothing here to name, date or rotate. The table is empty for that reason rather than for want of a phone system to read.

## Configuration

### Handling

Storage and rotation rules for everything in the intake.

- **Storage** (`x_store`) — a segmented control, default `OS keychain`, choices `OS keychain`, `Encrypted file`.
- **Rotation reminder** (`x_rotate`) — a slider control, default `90`.
- **Mask in all surfaces** (`x_mask`) — a switch control, default `true`.
- **Allow export** (`x_export`) — a switch control, default `false`.

## Failure modes and security

Every row reflects a real object in templates/secret-intake; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in templates/secret-intake, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Vocabulary & guard](vocab.md), [AMI & ARI](../data/ami.md), and [Operations](ops.md).
