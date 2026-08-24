# Authenticator and local recovery surfaces

This feature set mounts the local authenticator, per-element toy locks, Support Tickets, and the unlock ladder at `#surface=authenticator`, `#surface=locks`, `#surface=support-tickets`, and `#surface=unlock-ladder`. The surfaces accept typed clients so the renderer never reaches storage, the credential vault, or the control plane directly. The privileged desktop path persists redacted metadata and ticket state under application data, keeps credential values behind the operating-system vault adapter, and reports an unavailable vault or history protector without inventing a success.

Articles:

- [Built-in authenticator](authenticator.md)
- [Per-element toy locks](toy-locks.md)
- [Support Tickets](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)

All requests use a bounded deadline. Secret material is held only long enough for pairing or code calculation, is never rendered after pairing, and is omitted from ordinary exports. The Support Tickets disclosure is intentionally plain: tickets are local fiction, no request leaves the computer, and the folder-opening action never deletes data. Built-artifact interaction, focused checks, packaging, and capture evidence remain unverified for this mount lane.
