# Call records

## Behavior

Which backend stores records, what counts as an answered call, and which events are logged.
This screen edits four files, each read and written independently: `cdr.conf` (its own
declared `file`), plus `cel.conf`, `cel_odbc.conf` and `cel_pgsql.conf`, read the same way
the Security screen reads pjsip.conf and stir_shaken.conf besides its own acl.conf. It lives
on the Data rail, under the Records & APIs group: Call records, event logging and the machine
interfaces.

There is no single key anywhere that selects a CDR backend by name. `cdr.conf.sample`'s own
"CHOOSING A CDR BACKEND" section is explicit about this: a backend is chosen by which
`[section]` is present in cdr.conf itself (`[csv]`, `[radius]`), or by which separate file
exists and is populated (`cdr_odbc.conf`, `cdr_pgsql.conf`, `cdr_custom.conf`, and so on).
`d_status` reports that honestly instead of pretending a picker exists: what this screen has
actually read as configured, against what the target's running Asterisk has actually
registered (`cdr show status`). A backend can be configured in a file and not loaded, or
loaded from a configuration that has since changed underneath it — those are two different
facts, and the readout says both rather than one.

CEL had no configuration surface at all before this: the screen's own declared `file` used to
be the two-file label `cdr.conf · cel.conf`, which is not a real filename, so nothing was ever
actually read from a target and every control below silently showed the design's own shipped
default. It now reads cel.conf, cel_odbc.conf and cel_pgsql.conf for real.

Connection secrets never appear on this screen. cel_pgsql.conf's `password` key stays
deliberately unbound — see [Controls that do not write to a file, and why](../platform/unbound-controls.md).

## Configuration

### CDR — cdr.conf

One row per call.

- **CDR enabled** (`d_enable`) — a switch control, default `true`. `[general]/enable`.
- **Log unanswered calls** (`d_unanswered`) — a switch control, default `false`. `[general]/unanswered`.
- **Log congestion** (`d_congestion`) — a switch control, default `false`. `[general]/congestion`.
- **Batch mode** (`d_batch`) — a switch control, default `true`. `[general]/batch`.
  - *Gotcha:* If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.
- **Batch size** (`d_size`) — a stepper control, default `100`. `[general]/size`.
- **Backends** (`d_status`) — a live status readout, not a value control. Reports which of
  cdr.conf's own `[csv]`/`[radius]` sections are populated, and which backend modules the
  target's running Asterisk has actually registered.
- **Save call records settings** — writes the five fields above to cdr.conf.

### CEL — cel.conf

One row per channel event — far more detail, far more volume.

- **CEL enabled** (`l_enable`) — a switch control, default `true`. `[general]/enable`.
- **Tracked events** (`l_events`) — a chips control, default `CHAN_START`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, choices `CHAN_START`, `CHAN_END`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, `BRIDGE_EXIT`, `APP_START`, `APP_END`, `PARK_START`, `BLINDTRANSFER`. `[general]/events`.
- **Tracked applications** (`l_apps`) — a chips control, default `Dial`, `Queue`, choices `Dial`, `Queue`, `VoiceMail`, `ConfBridge`, `Playback`, `Park`. `[general]/apps`.
- **Timestamp format** (`l_date`) — a segmented control, default `ISO8601`, choices `ISO8601`, `epoch`, `local`. `[general]/dateformat`.
- **Backends** (`l_status`) — a live status readout: what cel_odbc.conf/cel_pgsql.conf have
  configured, against which `cel_*.so` module the target shows loaded.
- **Save channel event logging settings** — writes the four fields above to cel.conf.

### CEL: ODBC backend — cel_odbc.conf

Records are written per named context — cel_odbc.conf declares one `[section]` per
connection/table pair, not one fixed section, so this group edits whichever one is named in
**Context name**.

- **Show USER_DEFINED events** (`l_oshow`) — a switch control, default `false`. `[general]/show_user_defined`.
- **Context name** (`l_octx`) — a text control. Names the `[section]` the two fields below
  read and write. Not itself a binding — the same shape as the Security screen's **Transport
  name** field for a PJSIP transport's TLS settings.
- **Load from target** — reads the named context's current connection/table into the fields
  below. A name that resolves to nothing yet is not a refusal, unlike the PJSIP transport
  case: a cel_odbc.conf context needs nothing but these two keys to be usable.
- **ODBC connection** (`l_oconn`) — a text control. `connection`, in the section named by `l_octx`.
- **Table** (`l_otable`) — a text control. `table`, in the same section.
- **Save ODBC context** — writes `l_oshow` and the named context's `connection`/`table` in
  one cel_odbc.conf write. Creates the section if the name does not already exist.

### CEL: PostgreSQL backend — cel_pgsql.conf

One connection for the whole file, in its single `[global]` section.

- **Show USER_DEFINED events** (`l_pshow`) — a switch control, default `false`. `[global]/show_user_defined`.
- **Log date/time in GMT** (`l_pgmtime`) — a switch control, default `false`. `[global]/usegmtime`.
- **Hostname** (`l_phost`) — a text control. `[global]/hostname`.
- **Port** (`l_pport`) — a stepper control, default `5432`. `[global]/port`.
- **Database name** (`l_pdb`) — a text control. `[global]/dbname`.
- **User** (`l_puser`) — a text control. `[global]/user`.
- **Table** (`l_ptable`) — a text control. `[global]/table`.
- **Schema** (`l_pschema`) — a text control, optional. `[global]/schema`. Defaults to the
  database's own `current_schema()` when left blank.
- **Application name** (`l_papp`) — a text control, optional. `[global]/appname`. No
  whitespace allowed.
- **Save PostgreSQL settings** — writes all nine fields above in one cel_pgsql.conf write.
  `password` is deliberately absent from this list and from the screen.

## Failure modes and security

Every bound control here maps to a real key, justified against this checkout's own
`configs/samples/cdr.conf.sample`, `cel.conf.sample`, `cel_odbc.conf.sample` and
`cel_pgsql.conf.sample`; an unreachable configuration store is shown as unreachable, never
backfilled with placeholder values. If the database becomes unreachable, Asterisk may block
on writes. Batch mode mitigates it; test the failure case before you rely on it. `password`
on the PostgreSQL group is never read, written or displayed by this console — set it through
secret intake on the target directly.

## Verification

Exercise every control against its documented default and its full option range, confirm the
write lands in the file its own group names, and confirm the ODBC context Save both creates a
missing section and edits an existing one without disturbing any other section in
cel_odbc.conf. Confirm every default shown here matches what a fresh install actually ships,
that changing a value here is reflected the next time this screen loads, and that `d_status`/
`l_status` distinguish a backend that is merely configured from one the target actually has
loaded.

## Suggested articles

[AMI & ARI](ami.md), [Dashboard](../pbx/dash.md), [Logger](../system/logger.md), and
[Controls that do not write to a file, and why](../platform/unbound-controls.md).
