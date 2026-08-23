# Call records

## Behavior

Which backend stores records, what counts as an answered call, and which events are logged. Backends are picked, connection secrets come from secret intake. It is backed by `cdr.conf · cel.conf`. It lives on the Data rail, under the Records & APIs group: Call records, event logging and the machine interfaces.

## Configuration

### CDR

One row per call.

- **CDR enabled** (`d_enable`) — a switch control, default `true`.
- **Backend** (`d_backend`) — a select control, default `odbc`, choices `csv`, `custom`, `odbc`, `pgsql`, `sqlite3`, `mysql`, `manager`, `radius`.
  - *What it is:* Where call detail records are written.
  - *Why it exists:* Billing, reporting and disputes all depend on these records existing.
  - *Choosing a value:* csv for small sites, odbc or pgsql for anything that needs querying, custom when you have your own schema.
  - *Gotcha:* If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.
- **Log unanswered calls** (`d_unanswered`) — a switch control, default `false`.
- **Log congestion** (`d_congestion`) — a switch control, default `false`.
- **Batch mode** (`d_batch`) — a switch control, default `true`.
- **Batch size** (`d_size`) — a stepper control, default `100`.

### CEL

One row per channel event — far more detail, far more volume.

- **CEL enabled** (`l_enable`) — a switch control, default `true`.
- **Tracked events** (`l_events`) — a chips control, default `CHAN_START`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, choices `CHAN_START`, `CHAN_END`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, `BRIDGE_EXIT`, `APP_START`, `APP_END`, `PARK_START`, `BLINDTRANSFER`.
- **Tracked applications** (`l_apps`) — a chips control, default `Dial`, `Queue`, choices `Dial`, `Queue`, `VoiceMail`, `ConfBridge`, `Playback`, `Park`.
- **Timestamp format** (`l_date`) — a segmented control, default `ISO8601`, choices `ISO8601`, `epoch`, `local`.

## Failure modes and security

Every control here maps to a real key in cdr.conf · cel.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in cdr.conf · cel.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[AMI & ARI](ami.md), [Dashboard](../pbx/dash.md), and [Logger](../system/logger.md).
