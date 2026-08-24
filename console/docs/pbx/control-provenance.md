# Control and table provenance

## Behavior

Every base control has an explicit inventory entry. A control that edits Asterisk configuration is bound to one exact resource, section, key, parser, and host writer capability. Its current state is one of `read`, `missing`, `unparseable`, `unmapped`, `local-draft`, `applied`, or `unavailable`. A shipped design value is presentation data only and is never reported as the current value on a selected target.

Table destinations aggregate the state of every command required to build their rows. The model distinguishes a verified empty result from a command that was not read, a command that was unavailable, and a partially observed destination. Unread cells use a neutral marker while retaining an accessible explanation of what was not observed and why.

The dialplan canvas publishes subset metadata beside its graph. The metadata names the source command, observation time, observed and rendered counts, omitted edge count, represented scope, and the unavailable add, edit, remove, and rewire capabilities.

## Configuration

Screen resources come from `console/shared/configuration-resources.ts`. Multi-file screens use ordered resource arrays. Display labels such as `cdr.conf · cel.conf` are never parsed into paths. Missing resource and host-capability descriptors fail closed.

Control bindings live in `console/app/renderer/src/control-keys.ts`. Resource readings and freshness metadata live in `configuration.ts`. `control-provenance.ts` combines those inputs with local draft and applied records without copying a compiled design default into the observed value.

## Failure modes

- A missing binding produces `unmapped` and disables writing.
- A target file or key that is absent produces `missing`; it is not treated as an empty string.
- A raw value outside the parser contract produces `unparseable` and preserves the raw value for diagnosis without enabling a write.
- A missing host capability produces `unavailable` with its exact reason.
- A stale observation keeps its prior state and carries a separate stale reason.
- A multi-command table with mixed outcomes produces `partial` and retains the status of every command.

## Security

Only hand-written resource descriptors can authorize a resource. Paths are not accepted from display text, and missing descriptors never inherit access from another screen. Provenance records contain configuration coordinates and timing, not credentials or secret values.

## Verification

The ultra-speed implementation pass intentionally does not run tests, type checks, builds, runtime interaction, or captures. Integration must wire the screen resource arrays, per-control provenance records, destination table state, server collection counts, and canvas subset metadata into the compiled shell before claiming runtime verification.

## Suggested articles

[Dialplan canvas](canvas.md), [Endpoints](endpoints.md), and [Queues and agents](queues.md).
