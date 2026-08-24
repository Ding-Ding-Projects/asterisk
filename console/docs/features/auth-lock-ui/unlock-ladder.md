# Unlock ladder

The unlock ladder is a server-graded wait-clearing surface. It requests a single-use nonce challenge, displays the current rung, and submits an answer through the typed client. A successful grade clears only the waiting period. It never creates a session, sets a cookie, signs a user in, or changes the ordinary attempt budget.

The ladder starts with a dish choice unless School mode is active, in which case the dish rung is absent and the sums rung is first. Five wrong dishes escalate to ten sums, one wrong sum escalates to the timed mole round, and a lost mole round leaves only the clock. The client owns the rolling budget, nonce consumption, expiry, and timing checks.

Every request has a deadline. The mole surface reports a numeric countdown and cannot submit before the round has elapsed. It records distinct visible-cell hits only, while the service remains responsible for grading.

## Suggested articles

- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Built-in authenticator](authenticator.md)
