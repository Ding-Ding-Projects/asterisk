# FreePBX module catalog and native administration

The console keeps a generated catalog of the public FreePBX module repositories and renders each
catalog entry through the native Material Design 3 administration surface. The catalog is metadata,
not a claim that a module is installed, licensed, or reachable on the selected target.

## Source and revision

Run `node console/scripts/generate-freepbx-module-catalog.mjs` from the repository root. The script
uses the official `gh api` CLI route against the `FreePBX` organization, reads each public module's
published `module.xml` from `release/17.0`, records the exact repository and metadata revisions, and
writes `console/catalog/freepbx-module-catalog.json`. A local FreePBX installation may be included
by setting `FREEPBX_LOCAL_MODULE_ROOT` to its module directory. Local metadata is recorded as local
metadata only and never changes the published license or source claims.

`module.xml` is parsed with a well-formed XML parser from Python's standard library through the
`py -3` parser route on Windows, or `python3` on other supported hosts. Set `FREEPBX_XML_PARSER`
when a host uses a different approved Python launcher. A malformed document fails generation rather
than being partially cataloged by a tag-matching heuristic.

For each repository, the generator resolves the branch head commit first, validates the 40-character
revision, and fetches `module.xml` by that immutable revision. A moving branch cannot therefore
change the XML between revision capture and metadata parsing.

The catalog records the module identifier, display name, version, source revision, license and
entitlement class, dependencies, mapped Asterisk resources, published fwconsole command metadata,
API capability metadata, menu items, UI family, documentation links, local installation state, and
an exact availability reason. A module with no verified target is not presented as working.

The **FreePBX Module Catalog** destination is a native PBX Admin destination. It searches all public
catalog records with plain text by default, offers the shared bounded regex mode, filters installed
and commercial records, includes explicit historical exclusions on request, exports the filtered
records in lossless structured and tabular formats, and reads installed state through the target
runtime adapter. Exclusion records retain a distinct `recordId` and are never actionable. The
catalog destination also exposes structured action controls for the selected module. Every action is
refused when the target handshake, module metadata, entitlement, dependency state, backup receipt,
confirmation, or expected source revision is not acceptable.

`console/app/renderer/src/freepbx-module-adapters.ts` carries one declarative adapter policy for
every catalog UI family and derives one module adapter for every catalog entry. Each policy names
its entity shape, target configuration fields, published API fields where applicable, readback
source, and backup requirement. An adapter with no bounded target resource remains metadata-only.
The form renderer uses the adapter to keep module-specific identity and multi-resource fields
separate, while entity and published-API fields remain explicitly non-actionable until their typed
target route exists.

## Native module families

Every family below uses the same schema-driven form contract. The form begins with values read from
the selected target. It does not insert sample values. Closed enumerations come from the checked-in
Asterisk field catalog, while free text remains available only where the target format does not
publish a closed set.

### Extensions, users, devices, and endpoint settings

Core endpoint identity, user-facing labels, device registration, PJSIP settings, and IAX settings
are shown as target-backed fields. Missing endpoint data is an empty state with the target reason.

### Trunks, inbound routes, outbound routes, and dial patterns

Trunk and route resources are edited through structured configuration documents. Preview is required
before apply, and the transaction creates a verified recovery point before writing.

### Feature codes and call-flow destinations

Feature codes, announcements, IVR, miscellaneous applications, miscellaneous destinations, callback,
DISA, and information services use the dialplan resource mapping recorded by the catalog. A command
or destination is not shown as available when its module metadata or target capability is missing.

### Queues, ring groups, paging, conferences, and parking

Queue members, ring strategies, paging/intercom targets, conference settings, and parking settings
use their mapped Asterisk resources. Long reads and writes report progress at the originating
surface, and a cancellation leaves the draft unchanged.

### Announcements, recordings, music on hold, and text-to-speech

Media-backed families use the local media library only. The UI reports missing recordings, unsupported
formats, unavailable Festival settings, and permission errors directly. It never creates placeholder
audio or claims a file was uploaded when the target did not confirm it.

### Time groups, time conditions, call-flow control, and day/night

Schedule and call-flow settings use the target's current configuration. Equal or incomplete schedule
values are rejected before a plan is requested. Cross-midnight behavior is recorded by the schema
and is not inferred from a label.

### Voicemail, voicemail broadcast, directory, and follow-me/find-me

Mailbox policy, greetings, broadcast destinations, directory sources, and follow-me settings remain
separate schema families. A missing voicemail or follow-me resource is unavailable, not an empty
successful result.

### DND, call waiting, call forwarding, blacklist, caller ID, and languages

Per-endpoint and dialplan features are represented by their exact mapped resources. Caller-ID and
language names retain their published values, and any missing target support is shown beside the
control that would require it.

### Contacts, calendar, and presence

Contact-manager, phonebook, calendar, and presence metadata are cataloged separately. The native
surface exposes only values read from the selected target and records the source revision for the
module that owns the capability.

### CDR, CEL, reports, recordings, and diagnostics

Reports and diagnostic modules are read-oriented until a bounded write contract exists. CDR, CEL,
logger, and recording data are not fabricated. A target that does not expose a report says why it is
unavailable and leaves the result empty.

### Certificates, TLS, firewall, and security

Certificate and TLS resources are shown through the existing validation path. Firewall and security
modules are metadata-only unless a bounded target adapter confirms the operation. A host operating
system firewall is never represented as a native FreePBX module action.

### SIP, PJSIP, IAX, DAHDI, and media settings

SIP settings, PJSIP transports, IAX peers, DAHDI configuration, RTP, codecs, and media resources
use the Asterisk allowlist. Closed values are offered as selects only when the sample-backed field
catalog documents them; otherwise the form preserves free text without inventing constraints.

### Backup, restore, module administration, updates, and system administration

Backup and restore actions use verified recovery points. Module install, enable, disable, update,
and remove actions are structured action requests and remain unavailable until the target reports
the module, permission, entitlement, and operation capability. The console does not claim to
implement the FreePBX PHP module loader or commercial licensing service.

### UCP, WebRTC, APIs, jobs, notifications, and scheduler

UCP and WebRTC metadata is listed when published, but the administrator console does not claim to
be the separate end-user portal or browser phone. API and job metadata is shown only with a bounded
published capability. Notifications and scheduler entries keep their exact unavailable reason when
the target does not expose an operation.

### Catalog-discovered modules without a native resource mapping

Every public module remains in the catalog, including framework, vendor, commercial, portal, and
utility modules. These entries are visible as metadata-only or unavailable with a reason. They are
never hidden, replaced with a fake success state, or described as licensed. A later adapter may add
a native resource mapping without changing the module's published source or entitlement record.

## Failure modes and recovery

The target must be discovered before a module form can read. A missing WSL distribution, stopped
service, missing FreePBX runtime, missing module, permission refusal, unavailable database or web
service, missing license, and invalid credential state each remain distinct. A failed plan or action
leaves the current draft intact and offers the existing recovery-point route. Destructive module
removal uses the native confirmation flow and never runs from a free-form command string.

The runtime adapter invokes the official `fwconsole` executable through WSL or local Docker with
separate, allowlisted arguments. It reads the capability handshake, `fwconsole ma list`, and
`fwconsole ma show <module>` with bounded output, then uses `install`, `enable`, `disable`, `upgrade`,
or `uninstall` only after module ID, open entitlement, dependency, confirmation, source-revision,
known-capability, and one-time target-bound backup-receipt checks. Every action reads the module back.
A mismatch attempts the safe inverse action for install, enable, disable, and remove. Updates require
an exact catalog-version readback. The receipt is bound to the target, selected backup job, module,
action, catalog revision, nonce, and short expiry. Database or web-service state that remains
unknown keeps mutation refused rather than being treated as healthy.

## Verification boundary

The catalog and inventory validator are narrow static checks. The generated catalog currently
contains the public modules discovered from the official FreePBX organization, with no local module
directory supplied during generation. Runtime adapter behavior, module actions, the final WSL and
container stack, the built Windows artifact, accessibility interaction, and real screen captures
remain unverified until the parent integration lane completes its approved verification pass. The
runtime adapter source is present and fail-closed, but no target was contacted in this lane.

## Suggested articles

[Extensions](endpoints.md), [Trunks](trunks.md), [Queues](queues.md), [IVR](ivr.md),
[Voicemail](../media/voicemail.md), [Music on hold](../media/moh.md),
[Control-plane security](../system/security.md), and [PBX documentation index](README.md).
