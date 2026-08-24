# Modules

## Behavior

Every loadable module is represented by the generated source catalogue and reconciled with the target's live `module show` result. Loading and unloading are real actions and run the full confirmation ceremony. It is backed by `modules.conf`. The rail badge is populated only from the target's observed module count, and stays unavailable when no target has answered. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.

## Configuration

### Load policy

What Asterisk does with modules it was not explicitly told about.

- **autoload** (`mo_auto`) — a switch control, default `true`.
  - *What it is:* Whether Asterisk loads every module it finds at startup.
  - *Why it exists:* Convenient, but it means an unused module with a vulnerability is loaded anyway.
  - *Choosing a value:* On for a lab. Off with an explicit load list for a hardened deployment.
  - *Gotcha:* Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.
- **Preload** (`mo_preload`) — a chips control, default `res_odbc.so`, `res_config_odbc.so`, choices `res_odbc.so`, `res_config_odbc.so`, `res_curl.so`, `res_crypto.so`.
- **Never load** (`mo_noload`) — a chips control, default `chan_sip.so`, choices `chan_sip.so`, `chan_mobile.so`, `app_meetme.so`, `res_snmp.so`.
- **Fail startup on missing module** (`mo_require`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in modules.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in modules.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Logger](logger.md), [Security](security.md), and [CLI builder](cli.md).
