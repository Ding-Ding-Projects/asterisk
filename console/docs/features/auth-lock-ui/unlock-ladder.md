# Unlock ladder

The unlock ladder is a server-graded wait-clearing surface for toy-lock waits. A failed verification of one exact toy lock creates an authoritative wait tied to that lock. The ladder requests a single-use nonce challenge, displays the current rung, and submits answers through the typed client. A successful grade clears only that exact wait. It never creates a session, sets a cookie, signs a user in, or changes the ordinary attempt budget. This desktop implementation does not claim a separate application login lockout.

The ladder starts with a dish choice unless the privileged shared School mode record is active, in which case the dish rung is absent and the sums rung is first. Five wrong dishes escalate to ten sums, one wrong sum escalates to the timed mole round, and a lost mole round leaves only the clock. The service owns the rolling budget, nonce consumption, expiry, timing, and wait clearing. The three-per-hour cap and single-use receipt rules are bounded guarantees against accidental repetition, not a claim that a machine cannot automate the challenge.

Every request has a deadline. Mole hits receive privileged receipts only while a server clock observes the spawn as visible, one receipt per spawn. The surface reports a numeric countdown, but the service rejects early submission and grades only its own receipts. Offline trusted-time observation is explicit and does not block the local privileged clock from reporting its bounded behavior.

## Suggested articles

- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Built-in authenticator](authenticator.md)
