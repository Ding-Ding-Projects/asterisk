# PBX Admin implementation handoff

This handoff is scoped to pull request **#3**, branch `feat/freepbx-parity-electron`. It supplements the historical delivery records in `HANDOFF.md`; it does not rewrite older release evidence as though it had been produced for this branch.

## Product constraint

PBX Admin is part of the existing Material Asterisk. It does **not** mount a second Electron/React application, floating workspace, decorative overlay, or parallel visual language.

- `console/app/renderer/src/main.tsx` renders one application shell: `PbxAdminIntegratedApp`.
- `PbxAdminIntegratedApp` extends the existing `App`, which extends the compiled `ConsoleShell`.
- `pbx-admin-screens.ts` registers PBX Admin into the exported `RAIL`, `SCREENS`, and `ORDER` catalogue from the compiled design.
- Every PBX Admin feature is therefore a normal Ding tab / command-palette destination on the **PBX Admin** rail.
- Feature controls are supplied through the generic-screen `groups[].ctls` path and rendered by the existing compiled `M3Control` component.
- No file under `console/app/renderer/src/generated/` is changed by this pull request.
- The earlier experimental `PbxAdminWorkspace.tsx` floating overlay and its custom CSS were removed from the branch. They must not be reintroduced.

## FreePBX standard-module catalogue

`console/app/renderer/src/pbx-admin-model.ts` carries the current Sangoma Standard Modules menu names across the five FreePBX groups:

- **Applications:** Announcements, Calendar Event Groups, Calendar, Callback, Call Flow Control, Call Recording, Conferences, Directory, DISA, Extensions, Follow Me, IVR, Languages, Misc Applications, Misc Destinations, MissedCall Notification, Paging and Intercom, Parking, Queue Priorities, Queues, Ring Groups, Set CallerID, Text to Speech, Time Conditions, Time Groups, Voicemail Blasting, Wake Up Calls.
- **Connectivity:** API, Call Forwarding, Call Waiting, DAHDI (Analog) Channel DIDs, DAHDI Configs, Do Not Disturb, Firewall, Inbound Routes, Outbound Routes, SIPStation, SMS Plus, SMS Webhook, Trunks, Voip Innovations.
- **Administration:** Administrators, Asterisk CLI, Backup and Restore, Blacklist, Bulk Handler, CallerID Lookup Sources, Certificate Management, CID Superfecta, Configuration File Editor, Contact Manager, Custom Destinations, Custom Extensions, Feature Codes, Module Admin, Presence State, Sound Languages, System Admin, System Recordings, User Management, Voicemail.
- **Reports:** Asterisk Info, Asterisk Logfiles, Call Event Logging, CDR Reports, FreePBX System Status, Print Extensions, Weak Password Detection.
- **Settings:** Advanced Settings, Asterisk IAX Settings, Asterisk Logfile Settings, Asterisk Managers Interface, Asterisk REST Interface Users, Asterisk SIP Settings, Extension Settings, Fax Configuration, Filestore, Music on Hold, Pin Sets, Route Congestion Messages, Text to Speech Engines, Voicemail Admin.

The catalogue also exposes Asterisk capabilities that do not have a one-to-one FreePBX Standard Module label where doing so is useful (for example IAX2 trunking, STIR/SHAKEN, geolocation, realtime/database backends, monitoring, XMPP, ADSI, RTP and DUNDi).

### Meaning of parity

This branch implements **Asterisk/Ding equivalents of the standard-module tasks**. It does not vendor or impersonate the FreePBX PHP framework, FreePBX database schema, FreePBX commercial licensing, Sangoma cloud services, or provider credentials.

Provider-branded Standard Modules such as SIPStation, Voip Innovations, SMS Plus and SMS Webhook expose the real underlying PJSIP / HTTP / dialplan resources Ding can configure. They do not claim that Sangoma account provisioning, billing, cloud APIs, OAuth enrollment or commercial entitlements are reproduced.

Likewise, “Firewall” exposes Asterisk named ACL/service access policy. It does not claim to be a host operating-system firewall; arbitrary shell execution remains prohibited by the product boundary.

## 47-resource writable surface

`WslConfigTransport.CONFIGURABLE_RESOURCES` is now mirrored by `EXPECTED_CONFIGURABLE_RESOURCES` in the renderer and guarded by tests. The resources are:

`pjsip.conf`, `extensions.conf`, `queues.conf`, `voicemail.conf`, `confbridge.conf`, `musiconhold.conf`, `cdr.conf`, `manager.conf`, `logger.conf`, `rtp.conf`, `modules.conf`, `acl.conf`, `chan_dahdi.conf`, `iax.conf`, `res_fax.conf`, `cel.conf`, `cel_odbc.conf`, `cel_pgsql.conf`, `res_odbc.conf`, `extconfig.conf`, `sorcery.conf`, `res_pgsql.conf`, `res_ldap.conf`, `cdr_odbc.conf`, `cdr_pgsql.conf`, `http.conf`, `ari.conf`, `stir_shaken.conf`, `geolocation.conf`, `phoneprov.conf`, `features.conf`, `res_parking.conf`, `sla.conf`, `dundi.conf`, `calendar.conf`, `queuerules.conf`, `udptl.conf`, `res_stun_monitor.conf`, `res_snmp.conf`, `prometheus.conf`, `xmpp.conf`, `adsi.conf`, `asterisk.conf`, `festival.conf`, `cli_aliases.conf`, `cli_permissions.conf`, and `indications.conf`.

`capability-surface.test.ts` verifies that every allowlisted filename has a matching Asterisk sample file in this checkout. The additions in this branch include `ari.conf`, modern `res_parking.conf`, Festival TTS, CLI alias/permission configuration, and indication tones.

Parking is intentionally mapped to `res_parking.conf`: modern Asterisk moved parking-lot configuration out of `features.conf` starting with Asterisk 12. `features.conf` remains used for in-call transfer/pickup/dynamic feature behavior.

## UI behavior

For PBX Admin destinations that are primarily configuration tasks, `PbxAdminApp` creates only existing M3 control kinds:

- **select** — discovered PBX target, resource, section, setting, recovery point, target media file;
- **text** — setting values, section names, setting names, new-setting values;
- **segmented** — bounded actions such as discover, read, preview, apply, add/remove, refresh and restore;
- **file** — validated prompt/music media upload.

No PBX Admin renderer code calls `pbx.command`, `child_process`, `exec`, `spawn`, `cmd.exe`, PowerShell or `wsl.exe`.

A configuration flow is:

1. Discover a real target through `server.list`.
2. Select one of the feature's checked-in allowlisted resources.
3. Read it through `pbx.config`.
4. Render its real sections and ordered/repeated keys as M3 controls; no sample values are inserted.
5. Make local structured edits.
6. Preview against the current live target through `pbx.plan`.
7. Apply is unavailable as a real write until a preview exists; apply goes through the existing confirmation dialog (`areYouSure`).
8. `pbx.apply` re-plans and uses `ConfigTransaction`: backup -> stage -> staged round-trip validation -> apply -> post-read -> compare; mismatch rolls back.
9. Re-read the target and its recovery points after a successful write.

Section/setting removal and recovery/media removal also use the existing confirmation flow.

## Live/report module delegation

When Ding already has the richer live implementation, the FreePBX-labelled PBX Admin item routes to that existing screen instead of cloning UI. `PbxAdminIntegratedApp` resolves `delegateScreen` and switches both `screen` and `railId`.

Current mappings include, among others:

- Extensions / Contact Manager / Print Extensions -> **Endpoints**
- Queues -> **Queues**
- Trunks -> **Trunks**
- API / AMI / ARI -> **Manager & REST interfaces**
- Asterisk CLI -> **CLI**
- Module Admin -> **Modules**
- System Admin -> **Deploy & servers**
- Asterisk Info -> **About**
- Asterisk Logfiles -> **Logger**
- CDR Reports -> **Call records**
- FreePBX System Status -> **Dashboard**
- Music on Hold -> **Music on hold**
- Voicemail / Voicemail Admin -> **Voicemail**
- RTP -> **Codecs & RTP**

This keeps one source of truth for live data and preserves the original Ding interaction/design behavior.

## Semantic validation before planning

`console/control-plane/config-document-validation.ts` connects the typed subsystem models already in the repository to `StructuredConfigPlanner`.

Before the planner reads the target, blocking errors are checked for modelled resources:

- ACL syntax / address rules;
- HTTP, PJSIP and STIR/SHAKEN TLS settings;
- CEL;
- feature codes;
- phone provisioning;
- IAX2;
- fax and UDPTL.

ACL analysis findings such as wide-open permits are warnings rather than fabricated syntax errors. Resources for which the checkout has no typed semantic model still use structured-shape checks plus transaction/post-read safety; no semantic rules are guessed.

## Creating a previously absent optional config

Fresh Asterisk installations do not necessarily contain every optional subsystem file.

The transport now treats **only a confirmed “No such file” condition** for an allowlisted resource as an empty `ConfigValue`. Permission and other failures continue to fail closed.

Before creating a previously absent resource, `backup()` creates a bounded `-absent` recovery marker. If the transaction later rolls back, the transport removes the newly created resource, restoring actual absence rather than replacing absence with an empty file.

`ConfigHistory` understands these markers. Restoring one removes the resource and verifies it no longer exists.

History restore was also hardened: a handle is accepted only when it exactly matches a recovery point returned by the target directory listing and exists on the target. A caller cannot manufacture a path by supplying a valid-looking resource prefix.

## Media

Feature screens that use prompts or music expose the compiled M3 file control. Upload/list/remove stays entirely inside the existing `MediaLibrary` boundary:

- writable roots are only Asterisk prompts and music-on-hold;
- filename must be a validated bare filename;
- supported extensions are bounded;
- size is bounded;
- WAV/Ogg/Opus signatures are checked where the format has a signature;
- file content travels through the existing bounded control-plane request, not a shell argument;
- removal is confirmation-gated.

## Tests added or changed in this pull request

- `tests/ui/pbx-admin-model.test.tsx` — 47-resource coverage; exact Standard Module catalogue tripwires; no embedded sample rows; immutable structured-editor helpers.
- `tests/ui/pbx-admin-wiring.test.tsx` — every feature is registered in `RAIL/SCREENS/ORDER`; delegate destinations exist; renderer uses bounded actions and M3 control kinds; no raw command/shell path; no parallel PBX Admin root.
- `tests/control-plane/config-document-validation.test.ts` — typed errors block plans before target reads, warnings remain warnings, unmodelled resources do not gain invented rules.
- `tests/control-plane/absent-config-transaction.test.ts` — absent-file read/create/rollback/recovery behavior and manufactured-handle refusal.
- `tests/control-plane/config-history.test.ts` — restore fixtures now require the recovery point to have been listed before copy/verification.
- Existing capability-surface tests continue to verify resource names against Asterisk's source/sample tree.

## Validation workflow and current evidence

`.github/workflows/validation.yml` was added to run `npm ci`, `npm test`, and `npm run build` for pull requests to `master` using repository-pinned Node.js `22.23.2`.

**No successful validation run is recorded for this pull request yet.** A workflow newly introduced only on a pull-request branch may not receive a `pull_request` run until that workflow exists on the base branch, and the connected GitHub result showed no workflow run for the branch head when checked. Therefore this handoff does **not** claim that the new tests, TypeScript build, design-drift check, or full suite are green.

Pull request #3 should remain **draft** until the branch is tested from a checkout/runner and any failures are repaired. GitHub reporting the branch “mergeable” only proves that the Git histories can be merged; it is not test evidence.

## Production verification boundary

The historical handoff records a live Asterisk **read** path. This pull request does not add evidence that PBX Admin writes were exercised against a production exchange.

The write path is engineered to use the existing disposable-target transaction guarantees, but no write in this branch should be described as production-verified until an approved test runs against a disposable or explicitly approved real target and records the result.

## Files central to continuation

- `console/app/renderer/src/pbx-admin-model.ts` — feature catalogue/resource mapping.
- `console/app/renderer/src/pbx-admin-screens.ts` — integration into Ding rails/screens/order.
- `console/app/renderer/src/PbxAdminApp.tsx` — M3-only configuration/media/recovery behavior.
- `console/app/renderer/src/PbxAdminIntegratedApp.tsx` — live destination aliases.
- `console/control-plane/wsl-config-transport.ts` — 47-resource allowlist and absent-file transaction support.
- `console/control-plane/config-document-validation.ts` — typed semantic validation dispatch.
- `console/control-plane/config-transaction.ts` — planning gate + transaction.
- `console/control-plane/config-history.ts` — recovery listing/restore.
- `.github/workflows/validation.yml` — PR test/build workflow.

## Highest-value continuation work

1. Run `npm ci`, `npm test`, and `npm run build` from `console/` on the exact PR head and fix every failure before marking the PR ready.
2. Exercise representative writes on a disposable Asterisk target: existing file edit, missing optional file creation, typed validation rejection, rollback after forced post-read mismatch, normal backup restore, absent-marker restore, prompt upload/remove.
3. Capture the integrated PBX Admin rail and representative feature screens from the built Electron application and add the inventory/capture evidence required by the repository's verification rules.
4. Replace generic key/value controls with additional domain-specific controls only when a real Asterisk semantic model exists; keep the generic structured editor as the complete fallback so no resource becomes unreachable.
5. Do not add host-firewall, Sangoma commercial/account, or FreePBX-framework behavior as a visual placeholder. Add a real bounded backend first, then expose it through the Ding design system.
