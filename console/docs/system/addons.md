# Add-on modules

## Behavior

The source catalogue includes the four add-on modules in this checkout: `chan_mobile.so`, `chan_ooh323.so`, `format_mp3.so`, and `res_config_mysql.so`. Their source records include the registration evidence and the build-graph hash. The console exposes them only after a target's live module inventory has answered.

## Configuration

The add-on records point to the configuration files and runtime surfaces discovered from source. A target-specific configuration filename inventory is read separately from `/etc/asterisk`; checked-in samples are never treated as live configuration. The MP3 and MySQL modules remain unavailable when their external build dependencies were not enabled, and the live result says so instead of presenting a writable control that cannot work.

## Failure modes and security

An add-on missing from `module show` is unavailable, not silently successful. An installed module absent from the source catalogue is retained as an unverified installed-only record and has no write or lifecycle action until its provenance and action boundary are reviewed. AMI and ARI credentials are resolved through the operating-system vault and never appear in catalogue records, receipts, logs, exports, or history.

## Verification

Run `node console/scripts/generate-asterisk-catalog.mjs` and confirm the four `addons/` module records and their SHA-256 source hashes. Runtime availability remains unverified until `pbx.catalog` is exercised against a real target.

## Suggested articles

[Modules](modules.md), [Dynamic Asterisk capability catalogue](asterisk-capability-catalog.md), [CLI builder](cli.md), and [Security](security.md).
