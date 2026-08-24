# Controls that do not write to a file, and why

Most of this console's telephony controls are bound to a real Asterisk key, and the ones
that are not have been treated as a backlog of typing. Going through them one at a time,
most are not. They are shapes that do not correspond to a single key, and writing a binding
for any of them would mean inventing behaviour and calling it configuration.

This records each remaining one with its actual reason, so nobody re-derives the same
answers, and so a decision to change the design is taken deliberately rather than by
somebody filling in what looks like a blank.

## Behavior

A binding maps one control to one key inside one section of one file. Two extensions to
that shape already exist, and both were added because a real control needed them:

- **Composite.** Two controls share one value that carries two things, such as
  `tlsbindaddr=address:port`. Each owns its half and leaves the other alone on write.
- **Section by type.** The section is identified by the `type=` declared inside it rather
  than by its name, because `pjsip.conf` and `iax.conf` name each section after the object
  it configures. Several types may be accepted at once, since an IAX peer is written
  `type=peer` or `type=friend`.

Everything below needs something neither of those provides.

### One control, several keys

The conference **announce** picker offers off, tone, name and count, and `confbridge.conf`
spells that across `announce_join_leave` and `announce_user_count` — two independent
booleans. A binding that wrote one would leave the other saying something different.

### A control whose values are sections, not a value

The CDR **backend** picker offers csv, odbc, pgsql and the rest. `cdr.conf` has no key
naming a backend: each is its own `[section]`, and choosing one means writing a section.
The **active ACL** picker on the security screen is the same shape against `acl.conf`.

### A control that is a repeated key

**Permitted networks** is a list of CIDRs, and `acl.conf` writes one `permit=` line per
entry. The writer replaces the first matching key and appends when absent; it has no notion
of a key appearing many times in one section, and inventing one risks losing entries the
person did not touch.

### A control whose unit is not the key's unit

Music-on-hold **announcement every N seconds** is an interval; `musiconhold.conf`'s
`announcement=` is a filename. **Volume trim** in decibels has no key at all. The cipher
**policy** offers Modern, Intermediate and Legacy where Asterisk wants a cipher string, and
the mapping between them is a security decision, not a translation table.

### A control on a different file from its screen

Logger **verbosity** is `asterisk.conf`'s `verbose`, or a per-logfile `verbose(<level>)`
argument. Neither is a key in `logger.conf`, which is the file that screen edits. **Colourise
output**, **keep files** and **rotate at** have no key in either.

### A control that needs a key removed rather than written

**Deny by default** is a switch, and its off state means `deny=` should not be there at all.
The writer can create and replace an entry; it cannot delete one, and a switch that can be
turned on and not off is worse than one that is not wired.

### A control that would break the thing that found it

The IAX **type** picker IS the discriminator the section is matched by. Binding it would let
somebody change `type=peer` to `type=user` through the very match that located the section,
after which the screen is editing something it can no longer see.

### A control that must never carry its value

**Set a new secret** means exactly that: it is a switch that starts a credential flow, not a
value. A secret must never travel through an ordinary binding, because it would be read into
renderer state and from there into exports, local history and screenshots.

### A control that is dialplan logic, not configuration

The whole IVR screen — digit timeout, retries, invalid action, direct dial, prompt language,
barge-in — describes what an IVR does. `extensions.conf` has no keys for these; it has
`exten =>` lines. Generating dialplan from a form is a real feature and a different one.

### A control whose values Asterisk does not accept

Caller ID **presentation** offers Allowed, Prohibited and Unavailable. Those are the
human-readable names; the key wants its own spelling. This one is closest to bindable of
anything here: it needs a value map, and the map has to be right, because getting it wrong
changes what a telephone exchange tells the far end about who is calling.

## Configuration

Nothing here is configurable. The list is a record of design decisions still to be taken.

## Failure modes

The failure this document exists to prevent is somebody reading "unbound" as "unfinished"
and wiring one of these to the nearest plausible key. A wrong key does not fail loudly. It
writes a line that looks correct, Asterisk either ignores it or obeys it, and the person who
set it believes something about their exchange that is not true.

## Verification

`console/tests/contracts/orphan-controls.test.mjs` counts every control that reaches nothing
and refuses to let the number rise. It is a ratchet, not a target: it may fall freely, and a
second check forces the ceiling down when it does, so the figure cannot drift into permitting
new gaps in silence.

## Suggested articles

[Screen inventory and binding](../platform/README.md), [Configuration safety](../platform/README.md).
