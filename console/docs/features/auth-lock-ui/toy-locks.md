# Per-element toy locks

The lock manager treats every target identity as an independent, optional speed bump. A credential reference is created for that target, then the typed lock client stores only the reference and duration. Password and TOTP candidates are converted to short-lived bytes for verification and cleared from the surface after the request settles.

Durations are surface-only, a bounded number of minutes, or until the application closes. The manager lists each lock, shows whether it is open, offers an explicit Lock again action, and keeps search local. It never describes the feature as encryption or access control.

Recovery is self-service. The exact application-data path comes from the typed recovery record. Support Tickets can request that the platform file manager open the path, but the app never deletes it. The recovery record explicitly says that deletion is a user action.

## Suggested articles

- [Built-in authenticator](authenticator.md)
- [Support Tickets](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)
