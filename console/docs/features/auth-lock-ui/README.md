# Authenticator and local recovery surfaces

This feature set adds mount-ready renderer surfaces for the local authenticator, per-element toy locks, Support Tickets, and the unlock ladder. The surfaces accept typed clients so the renderer never reaches storage, the credential vault, or the control plane directly.

Articles:

- [Built-in authenticator](authenticator.md)
- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)

All requests use a bounded deadline. Secret material is held only long enough for pairing or code calculation, is never rendered after pairing, and is omitted from ordinary exports. The Support Tickets disclosure is intentionally plain: tickets are local fiction, no request leaves the computer, and the folder-opening action never deletes data.
