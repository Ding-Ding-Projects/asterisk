# Security

## Behavior

Access control, transport certificates and caller-ID attestation. Certificates are chosen from the machine store — no path is ever typed. It is backed by `acl.conf · stir_shaken.conf`. The rail badge on this destination currently reads `!`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.

## Configuration

### Access control

Named ACLs applied to transports and endpoints.

- **Active ACL** (`s_acl`) — a select control, default `trusted-nets`, choices `trusted-nets`, `branch-offices`, `carrier-only`, `deny-all`.
- **Permitted networks** (`s_permit`) — a chips control, default `10.20.0.0/16`, `198.51.100.0/24`, choices `10.20.0.0/16`, `198.51.100.0/24`, `192.0.2.0/24`, `0.0.0.0/0`.
- **Auto-ban after failures** (`s_failban`) — a stepper control, default `5`.
- **Ban duration** (`s_bantime`) — a slider control, default `600`.
- **Allow guest calls** (`s_guest`) — a switch control, default `false`. Off. Always off, unless you run a public conference bridge and know exactly why you turned it on.
  - *What it is:* Whether calls from unauthenticated sources are accepted.
  - *Why it exists:* It is the setting that decides whether strangers can use your phone system.
  - *Choosing a value:* Off. Always off, unless you are running a public conference bridge and know exactly why.
  - *Gotcha:* Combined with a permissive context this is how a PBX ends up dialling premium numbers overnight.

### TLS

Certificates come from the system store.

- **Server certificate** (`s_cert`) — a select control, default `pbx.example.com`, choices `pbx.example.com`, `wildcard.example.com`, `internal-ca-issued`.
- **TLS method** (`s_method`) — a segmented control, default `tlsv1_3`, choices `tlsv1_2`, `tlsv1_3`.
- **Verify client certificates** (`s_verify`) — a switch control, default `false`.
- **Cipher policy** (`s_ciphers`) — a segmented control, default `Modern`, choices `Modern`, `Intermediate`, `Legacy`.

### STIR/SHAKEN

Signed caller identity for outbound calls.

- **Attestation enabled** (`s_stir`) — a switch control, default `true`.
  - *What it is:* Whether outbound calls are signed with a STIR/SHAKEN identity token.
  - *Why it exists:* Carriers increasingly downgrade or label unsigned calls, and regulators increasingly require it.
  - *Choosing a value:* On for anything reaching the public network.
  - *Gotcha:* Signing requires a certificate from an authorised provider. Enabling it without one produces calls that fail to sign and log an error per call.
- **Attestation level** (`s_level`) — a segmented control, default `A`, choices `A`, `B`, `C`. A means you know the caller and their right to that number. C means the call just passed through you.
  - *What it is:* The attestation level asserted on signed calls.
  - *Why it exists:* It tells the far end how confident you are that the caller may use that number.
  - *Choosing a value:* A means you know the caller and their right to the number. B means you know the caller but not the number. C means the call merely passed through you.
  - *Gotcha:* Claiming A when you cannot prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.
- **Verify inbound identity** (`s_verifyin`) — a switch control, default `true`.
- **On verification failure** (`s_failaction`) — a segmented control, default `Continue`, choices `Continue`, `Tag`, `Reject`.

## Failure modes and security

Every control here maps to a real key in acl.conf · stir_shaken.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Combined with a permissive context this is how a PBX ends up dialling premium numbers overnight. Signing requires a certificate from an authorised provider. Enabling it without one produces calls that fail to sign and log an error per call. Claiming A when you cannot prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in acl.conf · stir_shaken.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Endpoints](../pbx/endpoints.md), [Trunk authentication](../pbx/trunkauth.md), and [AMI & ARI](../data/ami.md).
