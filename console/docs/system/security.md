# Security

## Behavior

Named access control lists, listed in the exact order Asterisk evaluates them — the last
matching rule wins, which is what makes a broad deny followed by a narrow permit work as an
allowlist. TLS certificate and key paths on this screen are typed, not chosen from a store
this console does not have: it can point Asterisk at a certificate and check the wiring looks
sane, but it cannot install, generate or rotate one. The rail badge on this destination
currently reads `!`. It lives on the System rail, under the Runtime & security group:
Modules, logging, certificates and the CLI.

This screen edits `acl.conf`, a PJSIP transport's `[section]` in `pjsip.conf`, and the
`[attestation]`/`[verification]` objects in `stir_shaken.conf` — three files, none of them
this screen's own declared `file` (`acl.conf`) for the latter two, so pjsip.conf and
stir_shaken.conf are read and written through their own dedicated paths in `App.tsx` rather
than the generic per-screen read every other configuration screen relies on alone.

## Configuration

### Access control (`acl.conf`)

The table is one row per `permit=`/`deny=` line, across every named ACL, in file order —
Asterisk applies the *last* matching rule, so reordering a rule is not cosmetic. Rows resolve
back to a real rule through `app/renderer/src/acl-editor.ts`, which embeds each rule's own
action and spec in its row key so a stale context menu can never act on the wrong rule after a
concurrent edit shifts positions. Add, edit, remove and reorder all go through the same
`pbx.plan`/`pbx.apply` transaction (backup, stage, validate, apply, post-read, compare,
rollback on mismatch) every other write in this console uses.

- **ACL name** (`s_aclname`) — a text control. The named list a new rule joins, e.g.
  `trusted-nets`. A name that does not already exist creates that ACL with this as its first
  rule.
- **Action** (`s_action`) — a segmented control, `permit` or `deny`.
- **Network / CIDR** (`s_spec`) — a text control. A bare address or address/mask. A hostname
  is refused: Asterisk resolves an ACL address at load time and this console cannot verify one
  offline.

None of the three above carry a config-key binding: they are read straight out of state by
`App.tsx`'s `onAddAclRule`, the same way the servers screen's `sv_host`/`sv_user` are — the
current typed value of a form field, not a persisted setting.

- **Auto-ban after failures** (`s_failban`) — a stepper control, default `5`. This console's
  own behaviour, never written to `acl.conf` or anywhere else on the target.
- **Ban duration** (`s_bantime`) — a slider control, default `600`. Same as above.

### TLS (a PJSIP transport, in `pjsip.conf`)

A PJSIP transport's own TLS listener. Type the section name of an existing transport (e.g.
`transport-tls`), press **Load from target** to see what it currently has, edit, then **Save
transport TLS settings** — this edits a transport already declared on the target, it does not
create one. Saving refuses outright when the typed name does not resolve to an existing
`type=transport` section, rather than inventing a bare `[section]` with nothing but TLS keys
and no `bind=`/`type=` — which would not be a usable transport.

- **Transport name** (`s_transport`) — a text control. The `pjsip.conf` `[section]` these
  fields read and write. Not itself bound to a key: every field below reads and writes
  through `sectionFrom: 's_transport'`, so the section is whichever name is currently typed
  here.
- **Load from target** (`s_tload`) — a one-shot action button (`security-transport-load`).
  Reads the named transport's current TLS settings from `pjsip.conf` into the fields below.
- **Protocol** (`s_tprotocol`) — a segmented control, default `tls`, choices `udp`, `tcp`,
  `tls`, `ws`, `wss`, `flow` → `protocol`.
- **Certificate file** (`s_tcert`) — a text control → `cert_file`.
- **Private key file** (`s_tprivkey`) — a text control → `priv_key_file`.
- **CA list file** (`s_tcalistfile`) — a text control → `ca_list_file`. Required for either
  verification switch below — without one, a client or server certificate can never actually
  be verified.
- **CA list path** (`s_tcalistpath`) — a text control → `ca_list_path`, an alternative to the
  file above.
- **Cipher list** (`s_tcipher`) — a text control → `cipher`.
- **Method** (`s_tmethod`) — a text control → `method`. The only value the shipped sample
  documents (`tlsv1`) is free text rather than a segmented choice; PJPROJECT accepts others,
  and this console does not offer a list it cannot verify against a real build.
- **Verify client certificate** (`s_tverifyclient`) — a switch control → `verify_client`.
- **Verify server certificate** (`s_tverifyserver`) — a switch control → `verify_server`.
- **Require client certificate** (`s_treqclientcert`) — a switch control →
  `require_client_cert`.
- **Save transport TLS settings** (`s_tsave`) — a one-shot action button
  (`security-transport-save`). Writes the ten fields above into the named transport section
  and nowhere else.

### STIR/SHAKEN (`stir_shaken.conf`)

Signed caller identity for outbound calls. The four switches below are policy, read from and
written to the `[attestation]`/`[verification]` objects; the key material that makes signing
and verification actually work lives in the group beneath it.

- **Attestation enabled** (`s_stir`) — a switch control, default `true` → `[attestation]`
  `global_disable` (inverted).
- **Attestation level** (`s_level`) — a segmented control, default `A`, choices `A`, `B`, `C`
  → `[attestation]` `attest_level`. A means you know the caller and their right to that
  number. C means the call just passed through you.
- **Verify inbound identity** (`s_verifyin`) — a switch control, default `true` →
  `[verification]` `global_disable` (inverted).
- **On verification failure** (`s_failaction`) — a segmented control, default `Continue`,
  choices `Continue`, `Tag`, `Reject` → `[verification]` `failure_action`
  (`continue`/`continue_return_reason`/`reject_request`).

### STIR/SHAKEN keys (`stir_shaken.conf`)

The private key Asterisk signs outgoing Identity headers with, and the certificate-authority
material used to verify incoming ones — a telephone-number issuing authority hands you these;
this console only points Asterisk at them.

- **Signing private key file** (`s_privkey`) — a text control → `[attestation]`
  `private_key_file`. Must not be group- or world-readable; the account the asterisk process
  runs as must own it.
- **Signing certificate URL** (`s_certurl`) — a text control → `[attestation]`
  `public_cert_url`. Published by the issuing authority — make sure whatever this URL serves
  is the certificate alone, never the private key too.
- **Trust the system CA store** (`s_loadsyscerts`) — a switch control, default `false` →
  `[verification]` `load_system_certs`.
- **Verification CA file** (`s_cafile`) — a text control → `[verification]` `ca_file`. At
  least one of this and the directory below is required for verification to do anything.
- **Verification CA directory** (`s_capath`) — a text control → `[verification]` `ca_path`.
- **Save STIR/SHAKEN settings** (`s_stirsave`) — a one-shot action button
  (`security-stir-save`). Writes all nine STIR/SHAKEN fields on this screen — the four policy
  switches above and the five key-material fields — in one write, since both objects live in
  the one file.

## Failure modes and security

Every bound control here maps to a real key: `permit=`/`deny=` lines in `acl.conf`; a named
PJSIP transport section in `pjsip.conf`; the `[attestation]`/`[verification]` objects in
`stir_shaken.conf`. An unreachable file is shown as unreachable, never backfilled with
placeholder values. Saving the TLS group refuses to write when the typed transport name does
not resolve to an existing `type=transport` section, rather than creating a half-built
transport with no `bind=`. The plan step itself also validates: `verify_client`/
`verify_server` enabled with no CA list set, a `cert_file` with nothing to pair it, attestation
left enabled with no `private_key_file`/`public_cert_url`, or an `attest_level` outside
`A`/`B`/`C` all block the write with the exact reason, for every declared PJSIP transport in
the file — not only the first one that looks like TLS. Combined with a permissive ACL this is
how a PBX ends up open to toll fraud overnight. Claiming attestation level A when you cannot
prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.
Private key material is never logged, captured, or written anywhere but the path the operator
typed; this console shows the path, never the key's contents.

## Verification

Exercise the ACL editor's add/edit/remove/reorder against a real `acl.conf`, confirm evaluation
order actually changes when a rule moves. Type an existing transport's name, press Load,
confirm the fields match what is really in `pjsip.conf`, edit and Save, and confirm a name that
does not resolve to a `type=transport` section is refused rather than silently accepted. Set
and clear each STIR/SHAKEN policy switch and key field, Save, and confirm both objects in
`stir_shaken.conf` land correctly in one write. Confirm the console's own validation blocks a
`verify_client` with no CA list, and that Asterisk's own load logs agree.

## Suggested articles

[Endpoints](../pbx/endpoints.md), [Trunk authentication](../pbx/trunkauth.md), and [AMI & ARI](../data/ami.md).
