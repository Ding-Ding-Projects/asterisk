# Logging

## Behavior

Severity per destination as a matrix of switches. Rotation is a picker, retention is a slider. It is backed by `logger.conf`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.

## Configuration

### Console

What the attached console prints.

- **Console levels** (`g_console`) — a chips control, default `notice`, `warning`, `error`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.
- **Verbosity** (`g_verbose`) — a slider control, default `3`.
- **Colourise output** (`g_colour`) — a switch control, default `true`.

### Files & rotation

Disk logging.

- **File levels** (`g_file`) — a chips control, default `notice`, `warning`, `error`, `verbose`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.
- **Rotation strategy** (`g_rotate`) — a segmented control, default `rotate`, choices `sequential`, `rotate`, `timestamp`, `none`.
  - *What it is:* How log files are rotated when they reach the size limit.
  - *Why it exists:* Unrotated logs fill the disk, and a full disk stops Asterisk.
  - *Choosing a value:* rotate renames sequentially, timestamp appends the date, sequential numbers forever, none disables it.
  - *Gotcha:* If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.
- **Keep files** (`g_count`) — a stepper control, default `10`.
- **Rotate at** (`g_size`) — a slider control, default `50`.
- **Queue log** (`g_queue`) — a switch control, default `true`.

## Failure modes and security

Every control here maps to a real key in logger.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in logger.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Modules](modules.md), [CLI builder](cli.md), and [History & git](../app/history.md).
