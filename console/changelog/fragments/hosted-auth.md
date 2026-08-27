# Hosted authentication fails closed

- Account storage now distinguishes missing, valid, and corrupt records, with first-run setup available only for a genuinely missing record.
- Hosted shell delivery and control-plane dispatch now require a current valid account and signed session.
- Setup and sign-in now expose bounded checking, busy, timeout, unavailable, refused, rate-limited, recovery, and retry states.
- Password setup and sign-in are refused on non-loopback plain HTTP unless the process is running under an explicit development-only policy.
- Session and rate-limit memory are bounded, sign-out and revoke-all interfaces are available, and an unauthenticated secret-free health route supports deployment monitoring.

Verification note: this ultra-speed change did not run tests, lint, type checks, builds, packaging, server launch, UI interaction, or screen captures.
