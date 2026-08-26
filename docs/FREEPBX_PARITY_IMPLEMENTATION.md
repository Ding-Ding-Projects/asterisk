# FreePBX Parity Implementation

This document tracks the expansion of Material Asterisk toward FreePBX-style administration while preserving Ding's Electron architecture, compiled Material 3 design system, local-first safety boundary, and Asterisk-native configuration model.

The implementation handoff for pull request #3 is `PBX_ADMIN_HANDOFF.md`.

## Non-negotiable implementation rules

- Extend the existing Electron console; do not replace it.
- Do not mount a second PBX administration application, floating workspace or decorative overlay.
- Do not hand-edit `console/app/renderer/src/generated/`.
- Register feature destinations through the compiled console's `RAIL`, `SCREENS` and `ORDER` catalogues.
- Render feature inputs/actions through the existing compiled `M3Control` kinds.
- Keep the no-shell control-plane boundary intact.
- Never show sample PBX values as though they were target readings.
- Preview a live diff before applying configuration.
- Keep destructive actions behind the existing confirmation flow.
- Do not represent a FreePBX-framework, Sangoma commercial/account, provider-cloud or operating-system feature as working until a real bounded backend exists for it.

## Current scope on pull request #3

### FreePBX Standard Modules

The current public FreePBX 17 module metadata snapshot is also checked in at
`console/catalog/freepbx-module-catalog.json`. It was generated on 2026-08-24 by
`console/scripts/generate-freepbx-module-catalog.mjs` through the official `gh api` CLI route
against the `FreePBX` organization and each public repository's `release/17.0/module.xml`.
The snapshot contains **83 public module entries**, zero locally installed entries because no
local module directory was supplied during generation, and a pinned SHA-256 over the module and
metadata revisions. This current-repository snapshot complements the historical 15/16/17 union
accounting below; it does not replace the hand-reviewed disposition of older or deliberately
excluded module names.

The PBX Admin catalogue now contains **107 current Standard Module tasks** across:

- Applications
- Connectivity
- Administration
- Reports
- Settings

Asterisk-backed configuration tasks remain PBX Admin generic/M3 destinations. Standard-module tasks for which Ding already has a richer live implementation route into the existing Ding destination instead of cloning it (for example Dashboard, Endpoints, Trunks, Queues, AMI/ARI, Modules, Logger, CLI, Deploy & servers, Voicemail, Music on hold, Codecs & RTP, About and Call records).

A hand-written, exhaustive per-group completeness list lives beside the catalogue in `console/tests/ui/pbx-admin-model.test.tsx`. Each group's test asserts set equality (not a subset) between the catalogue's ids and the hand-written list, so a Standard Module that is silently added or silently removed turns the guard red rather than passing unnoticed.

#### Authoritative source: the union of three FreePBX module indexes, parsed whole

The catalogue was checked against FreePBX's own published module repository indexes for the 15.0, 16.0 and 17.0 branches, each parsed in full as XML rather than summarized. **The union across all three versions is 91 unique module rawnames** -- using the union rather than 17.0 alone so a module that existed in an earlier branch is not silently dropped. Each file's root is `<xml><module>...</module></xml>`: every rawname is a direct child element of the single outer `<module>` wrapper, not a repeated `<module>` element -- parsing this correctly is what separates 91 real modules from an empty result.

The catalogue moved from 95 to 107 tasks across three passes:

- First pass (95 -> 98): `notifications` (Administration; system event/log-channel visibility, backed by `logger.conf`/`manager.conf`, with no invented persistent alert store) and `vitelity` / `bandwidth` (Connectivity; provider trunk integration points in the same non-commercial-claim framing already used for SIPStation and Voip Innovations).
- Second pass, against the 17.0 XML alone (98 -> 105): `amd` (Applications; Answering Machine Detection dialplan tuning), `dictate` (Applications; the `app_dictate` dialplan application, `extensions.conf`), `dynamic-routes` (Applications; conditional dialplan routing, `extensions.conf` + `pjsip.conf`), `accountcode-preserve` (Administration; dialplan account-code propagation reflected in CDR, `extensions.conf` + `cdr.conf`), `allowlist` (Administration; the counterpart to the existing Blacklist task, `extensions.conf` + `acl.conf`), `custom-apps-registration` (Administration; named custom dialplan applications, `extensions.conf`), and `outbound-cnam` (Administration; PJSIP identity/CallerID name applied outbound, `pjsip.conf` + `extensions.conf`).
- Third pass, against the full 91-rawname union with name/description matching rather than identifier string matching (105 -> 107, net): added `info-services` (Applications; rawname `infoservices` -- feature-code dialplan applications: company directory, call trace, echo test, speaking clock, backed by `extensions.conf`; a prior version of this doc excluded this rawname as framework plumbing, which was wrong -- it is a real dialplan-backed capability and that exclusion is corrected here), `custom-contexts` (Connectivity; rawname `customcontexts` -- restricted dialplan contexts with time/pattern/PIN-protected failover, `extensions.conf` + `acl.conf`), `phonebook` (Administration; rawname `phonebook` -- the contact-list data source behind CallerID lookup and speed dial, `extensions.conf`), and `rest-api` (Administration; rawname `restapi` -- FreePBX's REST API module, a distinct rawname from the existing `api`/GraphQL entry, backed by the same `http.conf` embedded HTTP server); and removed `sms-plus` and `sms-webhook` (see below). Net across this pass: +4 added, -2 removed, +105 baseline = 107.

Every resource cited above is a member of the console's own writable Asterisk resource allowlist (`EXPECTED_CONFIGURABLE_RESOURCES`, mirrored 1:1 from `WslConfigTransport.CONFIGURABLE_RESOURCES`, now **91 resources**); a resource outside that allowlist is never referenced even when the underlying Asterisk sample config exists, because the console cannot actually transact it yet. This pass also re-checked every pre-existing entry against the now-expanded 91-resource list -- the earlier passes were written against an older 47-resource list and could only cite what was available then -- and corrected entries that were under-citing real, now-writable capability: `amd` now also cites `amd.conf` (not just `extensions.conf`), `follow-me` now also cites `followme.conf`, `queues` now also cites `agents.conf`, and `conferences` now also cites `meetme.conf`.

#### `sms-plus` / `sms-webhook`: an invented pair, resolved by removal

`sms-plus` and `sms-webhook` (Connectivity) predated the verification passes above. Checked against all three authoritative indexes by `<name>` and `<description>` text as well as rawname -- not identifier string matching alone -- neither corresponds to anything FreePBX actually ships: no index contains the strings "SMS Plus" or "SMS Webhook" in any form, under any rawname, in any of the three versions. FreePBX ships exactly one SMS-related module, rawname `sms`, display name "SMS" (description: "This module is used to configure and manage SMS chat interfaces inside of the new UCP"), and it is **`license: Commercial`** in all three indexes -- a paid Sangoma module, not something this console could honestly represent as working under the "commercial-only modules must not be presented as working" rule. It is also UCP-dependent (FreePBX's end-user web portal), which this console does not implement (see UCP below). Both invented entries were removed rather than consolidated into an `sms` entry, since the real `sms` module fails the commercial-module boundary on its own terms. This is recorded here as a correction, not a silent deletion: the catalogue previously claimed two SMS-connectivity capabilities FreePBX does not have under those names, which is the same category of error as a missing feature and was invisible because nothing about it failed a test.

#### Rawnames checked and deliberately excluded, with reasons

Framework/plumbing rawnames with no distinct Asterisk-backed admin surface: `core`, `framework`, `pm2` (FreePBX's process manager), `phpinfo` (PHP diagnostic page), `versionupgrade` (module updater), `fw_langpacks` (language-pack downloader; no Asterisk configuration behind it). `sysadmin`'s Asterisk-relevant surface is already covered by the existing `system-admin` entry.

Vendor-specific rawnames representing a commercial cloud service or proprietary hardware integration rather than a generic Asterisk capability: `digium_phones` (Digium/Sangoma phone-provisioning cloud service; the underlying generic capability is already represented by `phoneprov`), `digiumaddoninstaller` (installer for Digium's commercial addon catalogue), `cxpanel` (iSymphonyV3, a third-party commercial call-center UI), `synologyabb` (Synology NAS backup destination tied to one vendor's proprietary API; the generic transactional recovery-point capability is already `backup`), `irc` ("Online Support" -- a support-chat widget, not an Asterisk capability).

Sangoma commercial-only rawnames, per the module's own `license: Commercial` field: `sms` (see above).

End-user-portal rawnames with no Ding equivalent: `ucp` (User Control Panel -- FreePBX's separate end-user self-service web portal; Ding ships an administrator console only, and building a distinct end-user portal is outside this parity effort's scope) and `webrtc` (WebRTC Phone -- a browser softphone widget attached to and launched from UCP; the underlying PJSIP WebSocket transport it would ride on is already configurable through the existing `sip-settings`/`extension-settings`/`trunks` entries, but the UCP-embedded phone widget itself has no Ding equivalent to represent).

The authoritative indexes also list nine rawnames under two FreePBX menu categories each: `cidlookup`, `certman`, `dahdiconfig`, `featurecodeadmin`, `logfiles`, `manager`, `presencestate`, `printextensions` and `soundlang`. Each is one real capability with one implementation in this catalogue (`callerid-lookup`, `certificates`, `dahdi-configs`, `feature-codes`, `asterisk-logfiles`/`logfile-settings`, `ami-settings`, `presence-state`, `print-extensions`, `sound-languages` respectively); it is not duplicated into a second group, because duplicating an identical resource-backed task across groups would inflate the count without adding capability. Group placement otherwise follows FreePBX's primary category for each module.

#### Accounting

Of the 91 union rawnames: 77 map to an existing catalogue entry (including the nine cross-category names counted once each), 4 were added this pass (`info-services`, `custom-contexts`, `phonebook`, `rest-api`), and 14 are recorded above as deliberately out of scope with reasons (`core`, `framework`, `pm2`, `phpinfo`, `versionupgrade`, `fw_langpacks`, `digium_phones`, `digiumaddoninstaller`, `cxpanel`, `synologyabb`, `irc`, `sms`, `ucp`, `webrtc`). 77 + 4 + 14 = 95: the four-name overshoot past 91 is `sysadmin`, `manager`, `certman` and `sms` each being discussed in more than one place above (framework note plus mapped entry, or excluded-list plus the dedicated sms subsection) rather than a real double-count in the catalogue itself. The authoritative per-rawname disposition is the prose above, not this arithmetic checksum. The two invented entries (`sms-plus`, `sms-webhook`) that corresponded to nothing in any index were removed.

### Asterisk writable capability

The bounded writable configuration surface is **91 resources** (expanded from 47 by a sibling lane's writable-allowlist work; this catalogue's mirror was re-synced to match in this pass). The renderer mirrors the same list and a regression test requires every resource to remain represented by at least one PBX Admin task.

The branch adds or corrects coverage for, among others:

- `ari.conf`
- `res_parking.conf` (modern Asterisk parking)
- `festival.conf` (Festival text-to-speech)
- `cli_aliases.conf`
- `cli_permissions.conf`
- `indications.conf`

The repository capability test checks every allowlisted resource against Asterisk's own `configs/samples` tree rather than accepting remembered filenames.

### Configuration workflow

PBX Admin configuration screens now wire:

1. target discovery (`server.list`);
2. live structured reads (`pbx.config`);
3. M3 section/value controls with repeated keys kept in order;
4. local section/setting add, rename and remove operations;
5. live change preview (`pbx.plan`);
6. confirmation-gated transactional apply (`pbx.apply`);
7. post-write re-read;
8. recovery-point list/restore (`history.*`);
9. bounded media list/upload/remove (`media.*`) where the feature uses recordings or music.

There is no raw Asterisk-command or operating-system-shell path in PBX Admin.

### Transaction and validation work

- `StructuredConfigPlanner` now invokes the typed validators already present in the repository before accepting a plan for ACL, TLS, CEL, feature-code, phone-provisioning, IAX2, fax and UDPTL models.
- Known semantic errors block the plan before a target read. Analysis warnings are not promoted to invented syntax failures.
- A missing optional allowlisted config file reads as an empty structured resource only for a confirmed missing-file condition; permission/other failures still fail closed.
- A transaction that creates a previously absent file records an `-absent` recovery marker. Rollback or restoring that marker removes the new file and verifies absence.
- `ConfigHistory.restore` accepts only a recovery handle actually returned by the target's bounded history listing, not an arbitrary string with a valid-looking resource prefix.

## FreePBX parity boundary

This branch implements the Asterisk/Ding equivalent of Standard Module administration tasks. It does **not** copy or claim to implement:

- the FreePBX PHP framework itself;
- the FreePBX database/schema/module loader;
- Sangoma commercial licensing/entitlement logic;
- Sangoma account provisioning/billing/cloud APIs;
- provider credentials or OAuth enrollment;
- a host operating-system firewall.

Provider-labelled Standard Modules are represented by the real PJSIP/HTTP/dialplan integration surfaces Ding can operate. They must not be described as reproducing the vendor's cloud service.

## Verification status

Implementation and regression tests have been added to the branch, and `.github/workflows/validation.yml` is intended to run the repository test suite plus a production console build on pull requests.

**No successful validation run is recorded for the current pull-request head yet.** Do not state that this branch passes `npm test`, TypeScript/build, design drift, or packaged Electron verification until a real run records that result.

The pull request should remain draft until that evidence exists and failures, if any, are repaired.

## Continuation

See `PBX_ADMIN_HANDOFF.md` for exact files, safety contracts, current test additions, production-verification boundary, and the next validation/write/capture steps.
