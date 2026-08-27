# Authenticator, toy-lock, unlock-ladder, and history foundations

- Added RFC 6238 and RFC 4226 authenticator contracts for SHA-1, SHA-256, and SHA-512, with 6 to 8
  digits, bounded periods, standard pairing URIs, confirmation before arming, and vault-only secret
  storage.
- Added stable per-element toy-lock records with independent vault references, explicit unlock
  durations, factual recovery metadata, and no plaintext credential fallback.
- Reworked the unlock-ladder core so expected answers stay server-side, challenges are single-use
  and expiring, successful wait clears use a required durable rolling-hour budget store, mole rounds
  cannot finish early, and School mode starts with arithmetic.
- Reworked local history around immutable encrypted entry files and append-only Git commits. A
  restore creates a new encrypted revision, and unavailable Git or encryption wiring returns an
  honest failure result.

Verification note: this ultra-speed pass did not run tests, lint, type checks, builds, packaging,
runtime interaction, or screen captures. The generated interface and central dispatcher are not
connected by this fragment's implementation lane.
