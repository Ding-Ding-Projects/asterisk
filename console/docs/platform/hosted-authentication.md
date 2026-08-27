# Hosted administrator authentication

The hosted console uses one local administrator account, memory-hard password hashing, signed server-side sessions, and server-side authorization for every control-plane request. Authentication is an access boundary for the hosted console. It is separate from the desktop application, which does not expose the hosted HTTP routes.

## Behavior

Account storage has three explicit states:

- **Missing:** first-run setup is available.
- **Valid:** setup is unavailable and sign-in is available.
- **Corrupt:** setup and sign-in both fail closed, existing sessions stop authorizing control-plane requests, and the sign-in surface explains the recovery action.

The server checks this state before serving the application shell. A missing record routes to setup, a valid unauthenticated request routes to sign-in, and a corrupt record routes to the recovery state. A network timeout or unavailable server is never interpreted as a missing account.

Setup and sign-in surfaces report checking, ready, busy, timeout, unavailable, refused, rate-limited, corrupt-account recovery, and retry states. They use bounded requests and leave form controls disabled while the account state is unknown.

Successful sign-in creates a random, HMAC-signed session identifier in an `HttpOnly`, `SameSite=Strict` cookie. TLS deployments also set `Secure`. Sign-out revokes the current session. The hosted bridge also exposes a revoke-all-sessions action for the signed-in administrator.

## Configuration: storage and limits

`admin-account.json` uses schema version 1 and contains only the username, scrypt password hash, and creation time. The reader limits file size, rejects unknown or extra fields, validates exact field bounds, and accepts the original unversioned three-field record as schema version 1 for compatibility. A malformed file is corrupt, never missing.

Account and signing-key files are created with restrictive permissions where the operating system supports them. Each file is written to a unique same-directory temporary file, flushed, and published without replacing an existing file. This prevents concurrent setup requests from overwriting the first completed account.

Password input is limited to 1,024 characters and the username to 128 characters. Password hashes must use the supported scrypt parameters, salt size, and derived-key size before password verification runs, so a modified record cannot request unbounded scrypt work.

The in-memory session table is capped at 1,024 live sessions and removes expired entries before every relevant operation. The login-rate table is capped at 4,096 source addresses, removes expired windows, and never trusts forwarding headers supplied by a client.

## Transport policy

Password creation and sign-in are allowed over TLS or a loopback-only plain HTTP listener. They are refused when a plain HTTP server is bound to a non-loopback address.

`ServerModeOptions.allowInsecureDevelopmentAuth` is an explicit development-only override. It is honored only when `NODE_ENV` is exactly `development`. Production launchers and service definitions must not set it. Sign-out remains available so a user can always revoke a session even if the transport policy changes after sign-in.

## Health and deployment

`GET /api/health` is unauthenticated and returns only the API version, stable service identifier, and `ok` or `degraded`. It contains no username, path, network address, session count, account existence flag, or control-plane data. A corrupt account store returns `503` with the same bounded health shape so a service monitor can distinguish readiness from process liveness without receiving sensitive data.

## Failure modes and recovery

- **Server unavailable or timeout:** retry from the same sign-in or setup surface after confirming service reachability. No setup redirect occurs.
- **Exposed plain HTTP:** enable TLS or return the listener to loopback, then retry.
- **Rate limited:** wait for the exact `Retry-After` interval. Correct credentials remain refused during the interval.
- **Corrupt account storage:** restore `admin-account.json` from a trusted backup, or move the corrupt file aside manually and restart. The server never overwrites or silently resets it.
- **Corrupt signing key:** the hosted process refuses to start. Restore the key or deliberately replace it, understanding that replacement revokes every existing session.

## Security considerations

Passwords are never logged, returned, or stored in plaintext. Password comparison uses Node's constant-time comparison after fixed, validated scrypt parameters. Session cookies contain only a random identifier and an HMAC. Control-plane requests are authorized by the server immediately before dispatch, including a fresh valid-account check and username match.

The health route is deliberately narrow. Static assets may be fetched without a session, but the application shell and every control-plane operation remain session-gated.

## Verification status

This change was implemented under an ultra-speed release lane that explicitly prohibited tests, lint, type checks, builds, packaging, server launch, browser interaction, and screen captures. Those checks remain unrun for this change and must not be inferred from this documentation.

## Suggested articles

[System security](../system/security.md), [Hosted server operation](../app/servers.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).

