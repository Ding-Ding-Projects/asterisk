# External settings source contract

## External settings source contract

- Added a secret-free shared contract for local, versioned HTTPS, and Home Assistant boolean schedule sources.
- Added bounded privileged reads with HTTPS and loopback development URL rules, redirect rejection, response size and depth limits, allowlisted assignment targets, generation cancellation, refresh cadence, and vault-reference-only authentication.
- Added in-memory last-valid and local-base fallback state without persisting remote assignments, plus a renderer-safe state projection.

Verification for this fragment: implementation-only lane. No tests, builds, network requests, runtime interaction, or captures were run by this lane.
