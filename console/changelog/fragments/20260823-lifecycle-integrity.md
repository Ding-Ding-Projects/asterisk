## Fixed

- Prevented failed configuration and inventory reads from being treated as writable empty state.
- Preserved existing secret fields through hidden, non-writable references and privileged exact post-write verification.
- Aligned saved connection kinds with the control-plane contract and stopped non-WSL targets from being silently routed through WSL.
- Required operating-system and Asterisk identity probes before reporting a connection.
- Bound daemon actions and configuration transactions to the selected target, with reload and runtime verification before success.
- Added the missing AoR section to onboarding, exposed endpoint save and delete actions, and refused endpoint creation before a successful `pjsip.conf` read.
- Preserved configuration file uid, gid, and mode across atomic staging and apply, with restrictive `root:root` and `0600` defaults for new resources, independent live metadata verification, and metadata-preserving rollback.

## Verification

Source and diff inspection only. The ultra-speed task did not run tests, lint, type checks, builds, packaging, UI interaction, or captures.
