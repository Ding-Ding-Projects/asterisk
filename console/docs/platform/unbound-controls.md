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

The CDR **backend** picker would offer csv, odbc, pgsql and the rest. `cdr.conf` has no key
naming a backend: each is its own `[section]`, and choosing one means writing a section. The
**active ACL** picker on the security screen is the same shape against `acl.conf`.

**This one never came back as a picker, and it is not going to.** What it got instead, on the
CDR/CEL screen, is a live `d_status`/`l_status` readout: what cdr.conf/cel_odbc.conf/
cel_pgsql.conf actually have configured, against what the target's running Asterisk actually
has registered (`cdr show status`, and `modules show` for the `cel_*.so` module names) --
answering "which backend" honestly instead of offering a single control that could never be
one real key. cel_odbc.conf's own per-context `connection`/`table` pair, which IS a plain pair
of keys once a context section is named, is bound the same way the security screen's PJSIP-
transport TLS fields are: `l_octx` names the `[section]`, the same `sectionFrom` mechanism
`s_permit`'s own removal note documented and the TLS lane above already reused once.

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

### A control whose values cannot be confirmed from this checkout

Caller ID **presentation** offers Allowed, Prohibited and Unavailable, and `pjsip.conf` does
have `callerid_privacy`. It needs a value map, and this is the closest to bindable of
anything here — but the only accepted value evidenced anywhere in the sample files is
`allowed_not_screened`. The spellings for the prohibited and unavailable cases are not in
this checkout to check against, and the difference between `prohib`, `prohibited` and
`prohib_not_screened` is not a guess worth taking: it changes what a telephone exchange
tells the far end about who is calling.

Binding it needs the accepted values confirmed against Asterisk itself, not inferred.

### A control whose key does not exist in the file its screen edits

The **RFC2833 payload** stepper and the **DTLS for WebRTC** switch sit on a screen editing
`codecs.conf` and `rtp.conf`. `rtp.conf` has no payload key at all — `dtmftimeout` is a
timeout, not a payload number — and the DTLS keys are `dtls_verify`, `dtls_rekey` and their
siblings in `pjsip.conf`, per endpoint rather than globally. **Global codec order**,
**transcoding**, **Opus bitrate** and **preferred ptime** have no key in either file: the
one `bitrate` that exists is inside a `[silk24]` section.

## Removed rather than bound

Thirteen controls were taken off their screens on 2026-08-24. Each described a setting
Asterisk does not have in the file its screen edits, and mapping it onto something else would
have meant inventing behaviour and calling it configuration. Removing is the same call
already made for a window control in a single-window console and for pushing a history whose
own design says it is never pushed.

Any of them can come back the moment it has a real key. That is the whole reason each reason
is written down rather than summarised.

| Control | Screen | Why it went |
| --- | --- | --- |
| Announcement every N seconds | Music on hold | an interval; `announcement=` is a filename |
| Volume trim | Music on hold | no volume key in `musiconhold.conf` |
| Opus bitrate | Codecs | the only `bitrate` is inside a `[silk24]` section |
| Preferred ptime | Codecs | no ptime key; the matches are `rtptime`, `ftptime`, `httptime` |
| RFC2833 payload | Codecs | `rtp.conf` has no payload key; `dtmftimeout` is a timeout |
| DTLS for WebRTC | Codecs | the DTLS keys are per endpoint in `pjsip.conf` |
| Colourise output | Logger | no colour key in `logger.conf` or `asterisk.conf` |
| Keep files | Logger | no file-count key; `rotatestrategy` picks a strategy |
| Rotate at | Logger | no size key |
| Server certificate | Security | a hostname picker; `tlscertfile` takes a path |
| TLS method | Security | Asterisk uses `tlsdisablev1`/`v11`/`v12` flags, not a method |
| Verify client certificates | Security | no such key in these files |
| Cipher policy | Security | `tlscipher` takes a cipher string; deciding what Modern means is a security decision |

The last four are the ones worth being careful about. Each could be made to write something,
and each would require this console to decide a security question on somebody's behalf --
which certificates live where, which TLS versions a name implies, which ciphers count as
modern. A console must not make those silently.

**Two of the four came back on 2026-08-25, with real keys, as plain paths and a raw string
rather than the removed picker's translated categories:**

- **Server certificate** is bound today as `ht_tlscert`/`ht_tlskey` on the `httpd` screen
  (http.conf's `tlscertfile`/`tlsprivatekey`) and as `s_tcert`/`s_tprivkey` on the security
  screen's new "TLS" group (a PJSIP transport's `cert_file`/`priv_key_file`). Both are plain
  text path fields, exactly the "a hostname picker; tlscertfile takes a path" reason this row
  gave for removal in the first place -- once the control stopped being a hostname picker,
  the objection stopped applying.
- **Verify client certificates** is bound as `s_tverifyclient`/`s_tverifyserver` on the same
  group, against `verify_client`/`verify_server` -- real keys that were simply not being
  looked for in `pjsip.conf`'s `[transport]` section when this row was written, because the
  security screen had no PJSIP-transport controls at all yet.

**TLS method and Cipher policy have NOT come back, and the distinction matters.** `s_tmethod`
and `s_tcipher` also exist now, on the same group, but they are free-text fields that write
whatever string is typed straight into `method`/`cipher` -- not the translated picker this
table describes (a TLS-version name mapped to `tlsdisablev1`/`v11`/`v12`, or a Modern/
Intermediate/Legacy label mapped to a cipher string). This console still refuses to make that
translation decision on somebody's behalf; typing the exact string Asterisk wants is a
different, narrower thing than picking a category and trusting this console's judgment about
what the category means.

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
