# Built-in authenticator

The authenticator surface accepts an issuer, account, secret, algorithm, digit count, and period. It builds an `otpauth://totp/` pairing value locally, shows the manual value during pairing, and requires one current code before the vault-backed entry is armed.

After confirmation the surface displays only redacted metadata and generated current and next codes. Code reads use the typed vault client, never log the secret, and fail to an honest unavailable state when the vault cannot answer. The countdown is text, and a clock-skew warning is shown when the offset exceeds one period.

The entry list supports issuer grouping, bounded plain-text or regular-expression search, and removal through the typed client. Ordinary JSON export labels secret material as omitted and contains no vault reference. Mutation history receives redacted subjects only, so history failure cannot turn into a secret leak.

## Suggested articles

- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)
