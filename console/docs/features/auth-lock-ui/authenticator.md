# Built-in authenticator

The authenticator surface accepts an issuer, account, secret, algorithm, digit count, and period. It builds an `otpauth://totp/` pairing value locally, renders a bundled in-process QR, shows the manual value during pairing, and requires one current code before the vault-backed entry is armed. After pairing, the renderer receives only privileged current and next code snapshots. It never reads a stored secret from the vault.

After confirmation the surface displays only redacted metadata and privileged current and next code snapshots. Code generation uses the privileged clock and reports when no external clock observation is configured. Vault failures produce an honest unavailable state. The countdown is text, and a clock observation warning remains visible when external time is not configured.

The entry list supports issuer grouping, bounded plain-text or regular-expression search, and removal through the typed client. Ordinary JSON export labels secret material as omitted and contains no vault reference. Mutation history receives redacted subjects only, so history failure cannot turn into a secret leak.

## Suggested articles

- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)
