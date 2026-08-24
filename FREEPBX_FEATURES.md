# FreePBX feature adoption catalog for Ding PBX Console

This is the master inventory of FreePBX capabilities that may be designed and implemented in Ding PBX Console. It is deliberately a catalog, not a claim of compatibility, implementation, or source-code portability.

## Coverage contract

This document has two different, explicit completeness levels:

1. **Atomic Core coverage.** Every user-facing surface, editable field, callable behavior, API, import/export path, backup/restore path, service, command, configuration generator, integration hook, conditional branch, and known dormant or legacy path found in the supplied FreePBX Core snapshot is cataloged below. The audited baseline is FreePBX Core `17.0.18.52`, commit `c844adb4cdea1042e0e966d1e596d3c27664443d`.
2. **Module-level ecosystem coverage.** FreePBX is modular, and the supplied source is only the non-disableable `core` module. The wider catalog reconciles the live FreePBX 17 mirror manifest, the official FreePBX GitHub organization, the separately linked FreePBX-ContributedModules organization, Sangoma's current Community Supported, commercial-module, and deprecated-module guides as of 2026-08-23. Those modules are complete at module/repository level; field-level parity requires a separate source/contract audit for each module.

The live FreePBX 17 manifest contains 82 entries: 60 Standard, 15 Extended, 6 Unsupported, and 1 Commercial. Excluding Core, that is 81 additional module-level candidates: 78 GPL/AGPL modules and 3 proprietary or provider-coupled modules. A public repository does not prove current Module Admin availability, and a mirror entry does not prove that public source exists.

Separately, the officially linked FreePBX-ContributedModules organization contains 63 installable module repositories plus one non-module repository. Eight of those modules overlap the live manifest, one additional module appears in the current Community Supported guide, six match deprecated families, and 48 are historical/currently unlisted. They are cataloged without assuming current FreePBX 17 compatibility, security, or maintainership.

The checklist state means:

- `[ ]` — not yet accepted as complete in Ding.
- `[x]` — implemented, source-bound, locally verified, and recorded in the parity inventory. No adoption item is checked merely because a destination, reader, allowlisted file, or backend action exists.
- **Existing — read-only** — Ding has a real reader, but no verified editor.
- **Existing — partial** — Ding overlaps the feature but does not satisfy the whole FreePBX contract.
- **Backend ready, no UI** — a safe backend primitive exists without a complete product surface.
- **New destination required** — Ding has no suitable complete screen.
- **Cross-cutting** — work affects several destinations or the platform itself.
- **External module** — outside the supplied Core source and requiring its own audit.
- **Commercial/provider-specific** — capability may inspire an equivalent, but proprietary code, brands, services, and entitlements are not reusable.
- **Legacy/deprecated** — preserve only when migration or backward compatibility has a justified product requirement.

## Adoption rules

Every adopted item must satisfy these rules:

- Reimplement behavior against Asterisk and documented interfaces; do not copy FreePBX implementation code without an explicit GPL compatibility and distribution review.
- Keep the implementation inside Ding's existing Electron renderer, Material Design 3 system, and control-plane safety model.
- Read before writing; validate external input; show a reviewable plan; create a recoverable backup; apply atomically where possible; read back; compare; roll back on failure; record redacted evidence.
- Never display demo, sample, fabricated, or simulated PBX values. An unread value is `—`, accompanied by the exact reason it could not be read.
- Store secrets only through the operating-system credential store. Never expose secrets in logs, diffs, history, exports, screenshots, or support bundles.
- Keep network requests bounded, cancellable, TLS-protected, and explicit about unavailable dependencies or permissions.
- Design every surface for keyboard operation, screen readers, focus visibility, reduced motion, responsive layouts, and complete localization.
- Treat unavailable Asterisk versions, modules, hardware, licenses, codecs, transports, and services as visible capability states, not silent omissions.
- Require a positive and negative local regression for each validator or safety guard.
- Do not equate Asterisk `.so` module management with FreePBX PHP module management.

## Current Ding baseline

Ding currently has 32 design-compiled destinations. They are compiled, not visually verified; see [the design inventory](console/design/inventory.json) and [the design-parity inventory](console/inventories/design-parity.json).

| Ding rail | Current destinations | FreePBX adoption area | Initial state |
|---|---|---|---|
| PBX | Dashboard, Live channels, Endpoints, Trunks, Trunk authentication, Dialplan canvas, IVR, Queues | People/devices, trunks, routes, destinations, IVR, queues, call features | Existing — partial |
| Media | Voicemail, Conferences, Music on hold, Codecs & RTP | Mailboxes, conference rooms, recordings, prompts, languages, media policies | Existing — partial |
| Data | CDR & CEL, AMI & ARI | Reports, event logs, APIs, manager users, integrations | Existing — partial |
| System | Modules, Logger, Security, CLI | Asterisk runtime, settings, TLS, ACLs, services, diagnostics | Existing — partial |
| App | Deploy & servers, Arcade, Notifications, History, Customise, Appearance, About | Deployment, recovery, users/roles, localization, support | Existing — partial |
| Agent | Memory, Sync, Skills, Hub, Vocabulary, Operations, Secrets | Ding-specific capabilities | Not a FreePBX catch-all |

Sixteen destinations are in the live-reading allowlist in [readings.ts](console/app/renderer/src/readings.ts). The control plane exposes 63 source-verified read-only Asterisk commands, 41 allowlisted configuration resources, and a 29-action contract. The UI source tests currently assert 84 real Asterisk-key bindings across 13 screens. Those primitives do not establish feature parity, and no configuration write has been verified against a real production exchange.

## Part I — FreePBX Core 17.0.18.52 atomic inventory

### Core navigation and shared interaction

**Ding target:** cross-cutting navigation, forms, tables, and dependency states. **Initial state:** Existing — partial.

- [ ] CORE-NAV-001 — Extensions administration destination.
- [ ] CORE-NAV-002 — Separate Users administration destination when user/device mode is enabled.
- [ ] CORE-NAV-003 — Separate Devices administration destination when user/device mode is enabled.
- [ ] CORE-NAV-004 — Inbound Routes administration destination.
- [ ] CORE-NAV-005 — DAHDI Channel DIDs administration destination.
- [ ] CORE-NAV-006 — Outbound Routes administration destination.
- [ ] CORE-NAV-007 — Trunks administration destination.
- [ ] CORE-NAV-008 — Advanced Settings administration destination.
- [ ] CORE-NAV-009 — Administrators administration destination.
- [ ] CORE-NAV-010 — Asterisk Modules administration destination.
- [ ] CORE-NAV-011 — Contextual Support destination that does not leak PBX or host information.
- [ ] CORE-NAV-012 — Quick-create Extension popover/modal.
- [ ] CORE-NAV-013 — Quick-create User popover when separate user/device mode is active.
- [ ] CORE-NAV-014 — Add, edit, submit, reset, duplicate, and delete action patterns with destructive confirmation.
- [ ] CORE-NAV-015 — Searchable, sortable, pageable, refreshable tables with column visibility and accessible bulk selection.
- [ ] CORE-NAV-016 — Basic versus Advanced operating mode, including an exact disclosure of hidden fields: Extension Basic mode suppresses every generated `advanced` and `findmefollow` category; Inbound Route Basic mode carries Caller-ID Priority, MOH, and Caller-ID Prefix as hidden values and omits Country Indication Zone and Force Answer.
- [ ] CORE-NAV-017 — Dependency-injected form tabs, sections, controls, destinations, and help without allowing unsafe arbitrary UI injection.
- [ ] CORE-NAV-018 — Destination usage discovery, reverse lookup, edit links, and safe replacement before deletion.
- [ ] CORE-NAV-019 — Global search across extensions, users, devices, inbound routes/DIDs/CIDs, outbound routes, and trunks.
- [ ] CORE-NAV-020 — Pending-change/apply state, reload requirement, validation failure, partial failure, and rollback result.
- [ ] CORE-NAV-021 — Localized labels, field prompts, inline help, empty states, dependency warnings, and error states.

### Extensions, users, and devices

**Ding target:** PBX / Endpoints. **Initial state:** Existing — partial; current live readings do not provide FreePBX-style CRUD or the combined user/device domain.


**Verification state (2026-08-23 audit against `configs/samples/*.sample` and `console/control-plane/*.ts`).** No item in this section is checked. Every item requires a real Extension/User/Device destination, which does not exist in [pbx-rail-mapping.ts](console/app/renderer/src/pbx-rail-mapping.ts) — the "Endpoints" rail is a merged read-only surface backed by `pjsip show endpoints`/`pjsip show contacts`/`pjsip show registrations` in [asterisk-readings.ts](console/control-plane/asterisk-readings.ts), not a CRUD editor. Per-subsection reality:

- **Modes, lists, and lifecycle / Quick create (CORE-EXT-*, CORE-EXT-QC-*):** New destination required. No extension/user/device list, add, edit, or delete surface of any kind exists; `pjsip.conf`, `chan_dahdi.conf`, and `iax.conf` are in the writable-resource allowlist ([wsl-config-transport.ts](console/control-plane/wsl-config-transport.ts) lines 35, 50-51) but nothing reads or writes an individual extension record through it yet.
- **User identity and extension options (CORE-USER-*):** New destination required. There is no separate User record model anywhere in the control plane; `voicemail.conf` is on the writable allowlist (line 38) but has no field-level parse/validate model comparable to [subsystem-models.ts](console/control-plane/subsystem-models.ts), so CORE-USER-026 (voicemail mailbox lifecycle) is Backend ready, no UI at best today.
- **Common device identity (CORE-DEV-*):** New destination required.
- **PJSIP device fields (CORE-PJSIP-DEV-*):** Six items complete; the rest are not. `console/control-plane/subsystem-models.ts` carries a typed model treating the endpoint, auth and aor trio as one identity, `console/app/renderer/src/endpoint-create.ts` builds one from the guided wizard, and `endpoint-edit.ts` maps an existing one onto the screen’s controls and back. Selecting a row, saving and removing are wired to the screen and go through the plan-and-apply path, which backs up, stages, validates, applies and reads back. Verified in the built application against a live target: the endpoint appears in the table with its real status, its settings load into the controls, a context change reached Asterisk’s own output, and a removal left no orphan section. The six ticked items each have a model field cited to `configs/samples/pjsip.conf.sample`, a real interactive control rather than a text box, and positive and negative regressions. The rest stay open for concrete reasons: several name keys the sample file never documents (`bundle`, `callgroup`, `pickupgroup`, `rtcp_mux`, `message_context`, `use_received_transport`, `min_expiry`/`max_expiry`), which are excluded rather than invented; others (codec order, mailbox, dial string, maximum contacts) are in the model but have no control on the screen yet, which by this document’s own rule earns nothing.
- **Legacy chan_sip device fields (CORE-SIP-DEV-*):** Legacy/deprecated, and currently unimplementable as specified. This Asterisk baseline ships no `sip.conf.sample` at all (`chan_sip` is fully removed from `configs/samples/`), so CORE-SIP-DEV-001's driver-migration and CORE-SIP-DEV-018's Asterisk 21+ removal warning describe a driver this build cannot load; treat the whole subsection as dormant/historical unless a chan_sip-capable target is explicitly reintroduced.
- **IAX2, DAHDI, Custom, and Virtual device fields (CORE-IAX-DEV-*, CORE-DAHDI-DEV-*, CORE-CUSTOM-DEV-*, CORE-VIRTUAL-DEV-*):** Backend ready, no UI for IAX2 only. `subsystem-models.ts` (lines 591-770) has a real, locally-tested `iax.conf` general/peer parser, validator, and `rebuildEntries` writer covering `bindport`/`bindaddr`, `iaxcompat`, `nochecksums`, `delayreject`, `amaflags`, `bandwidth`, `jitterbuffer`/`maxjitterbuffer`, `auth`, `requirecalltoken` (general) and `type`, `host`, `context`, `auth`, `permit`/`deny`, `trunk`, `qualify` (peer) — matching CORE-IAX-DEV-001 through 005 field-for-field against `configs/samples/iax.conf.sample`. CORE-IAX-DEV-006 (`setvar`/`REALCALLERIDNUM`) is not in that model and remains New destination required. There is no comparable model for `chan_dahdi.conf` (CORE-DAHDI-DEV-*), so those and CORE-CUSTOM-DEV-001/CORE-VIRTUAL-DEV-001 are New destination required — no device-type UI exists to host any of them, and the IAX2 model itself has no consuming screen either, so even CORE-IAX-DEV-001 through 005 stay unchecked pending a real Extensions destination. Updated 2026-08-23: the typed-control catalog in `console/control-plane/field-control-catalog.ts` now renders IAX2 fields with a documented set as real choice controls, driven by the sets the validators already enforce rather than by anything hand-authored. Verified in the built application over the debugging protocol against a live target carrying a real `iax.conf`: `bandwidth`, `amaflags` and `type` each rendered as a segmented choice with the target’s own value selected, while `bindport`, `host` and `context` correctly stayed text because no sample line documents a set or range for them. No item is ticked from this: rendering is verified, a save round trip through the generic editor is not. Save path traced in the built application on the same run: editing a control raised “Unsaved edits exist. Preview them against the live target before Apply is allowed.”, Preview returned “Live preview complete: 1 configuration resource difference.”, and Apply raised the destructive-action confirmation. Completing that confirmation was not driven, so the write itself is unverified through this screen — the underlying plan-and-apply path is separately verified by the endpoint editor, which created, edited and removed an endpoint on the live target. Rendering and staging are proven here; the last step is not, so nothing is ticked. The confirmation itself was then read out of the design rather than driven: it is four real stages — an operator key, a two-second arming hold, a slide to commit, and an attention check — so the destructive-action contract is implemented rather than decorated. Driving all four through the protocol is possible and was not done here. Driven again to completion attempt: the gate was raised, not satisfied, and the target file was then read back unchanged — `bandwidth` still `high`. That is the gate doing its job rather than a failure to verify, and it is the strongest single piece of evidence here: an unconfirmed destructive action leaves the target exactly as it was.

No item above is ticked: a model or a reader is not a rendered, validated, applied, read-back, and regression-tested control per the adoption rules, and none of that surface exists yet for this section.

#### Modes, lists, and lifecycle

- [ ] CORE-EXT-001 — Combined Extension mode where one workflow creates and maintains the user and device records.
- [ ] CORE-EXT-002 — Separate User and Device mode with fixed/ad-hoc mappings and an explicit unsupported/legacy warning when appropriate.
- [ ] CORE-EXT-003 — Basic PJSIP extension list with Extension, Name, Actions, Add, and bulk Delete.
- [ ] CORE-EXT-004 — Advanced all-driver extension list with Extension, Name, technology Type, Actions, and one tab per enabled driver.
- [ ] CORE-EXT-005 — Live status indicators for Call Waiting, DND, Follow Me, unconditional Call Forward, Call Forward Busy, and Call Forward Unavailable.
- [ ] CORE-EXT-006 — Separate Users list with User, Name, all call-state indicators, Actions, Add, and bulk Delete.
- [ ] CORE-EXT-007 — Separate Devices list with Device, Description, fixed/ad-hoc Device Type, linked User, technology Type, Actions, Add, and bulk Delete.
- [ ] CORE-EXT-008 — Add, edit, delete, bulk delete, reset, validation, permission/range checking, reload marking, and cleanup of dependent mappings.
- [ ] CORE-EXT-009 — Partial-create rollback so a failed quick-create cannot leave an orphaned user or device.
- [ ] CORE-EXT-010 — Rebuild user/device AstDB mappings, voicemail aliases, call-waiting state, and hints from the authoritative records.
- [x] CORE-EXT-011 — Unique extension, SIP alias, and direct-DID validation. Verified 2026-08-23: validateExtension refuses a duplicate against the endpoints actually on the target, a number outside the site range, a non-numeric value, and an empty one, reporting every problem at once rather than one per attempt. SIP alias and direct-DID uniqueness are not covered: neither has a model on this target yet, and claiming them would be a claim about validation that does not run. Covered by console/tests/ui/extensions.test.tsx; the caller-ID composition, the numbering suggestion and the ceiling were each proven by breaking them and watching the suite go red.
- [ ] CORE-EXT-012 — Driver availability and version gating for PJSIP, chan_sip, IAX2, DAHDI, Custom, and Virtual.
- [ ] CORE-EXT-013 — Technology migration with preserved compatible settings, explicit dropped-field preview, and optional managed-phone conversion/reboot integration.
- [ ] CORE-EXT-014 — Backend-only emergency-device quick creation and lifecycle for SIP/PJSIP emergency endpoints; expose it only through an intentionally designed consumer workflow.
- [x] CORE-EXT-015 — Maximum PJSIP contacts validation with the Core ceiling of 100. Verified 2026-08-23: validateMaxContacts holds the create path to the same ceiling of 100 the saved-config validator already enforces, so the wizard cannot write a config its own validator then rejects. Refuses a fraction and a negative rather than rounding. Covered by console/tests/ui/extensions.test.tsx; the caller-ID composition, the numbering suggestion and the ceiling were each proven by breaking them and watching the suite go red.
- [ ] CORE-EXT-016 — Right-side navigation among extension, user, and driver-specific device lists/add forms.

#### Quick create

- [ ] CORE-EXT-QC-001 — Device/extension Type.
- [x] CORE-EXT-QC-002 — Extension Number, including suggested-next-extension behavior and range validation. Verified 2026-08-23: suggestNextExtension fills the first free number in the site range, filling a gap before extending, ignoring non-numeric section names, and returning nothing at all when the range is full rather than pre-filling a number that would collide. Covered by console/tests/ui/extensions.test.tsx; the caller-ID composition, the numbering suggestion and the ceiling were each proven by breaking them and watching the suite go red.
- [ ] CORE-EXT-QC-003 — Conditional DAHDI Channel.
- [x] CORE-EXT-QC-004 — Display Name. Verified 2026-08-23: display name, composed into the pjsip.conf callerid key. Covered by console/tests/ui/extensions.test.tsx; the caller-ID composition, the numbering suggestion and the ceiling were each proven by breaking them and watching the suite go red.
- [x] CORE-EXT-QC-005 — Outbound Caller ID. Verified 2026-08-23: outbound caller ID, the other half of that same key. Display name and outbound caller ID look like two fields and are one Asterisk value (callerid=My Name <8005551212>, pjsip.conf.sample line 597); parseCallerId and formatCallerId round-trip both halves in either direction, a bare value is read as the display name because that is how Asterisk reads it, a name needing quotes gets them back, and two empty halves write nothing rather than a callerid= line that would override an inherited value with nothing. Covered by console/tests/ui/extensions.test.tsx; the caller-ID composition, the numbering suggestion and the ceiling were each proven by breaking them and watching the suite go red.
- [ ] CORE-EXT-QC-006 — Email Address.
- [ ] CORE-EXT-QC-007 — Backend/hook-supplied secret/password generation using the configured secret length; this is not a native visible Core modal field.
- [ ] CORE-EXT-QC-008 — Backend/hook-supplied Emergency Caller ID and PJSIP maximum contacts; these are not native visible Core modal fields.
- [ ] CORE-EXT-QC-009 — Hook-contributed wizard steps with validation and rollback.

#### User identity and extension options

- [ ] CORE-USER-001 — User Extension.
- [ ] CORE-USER-002 — User Password in separate user/device mode.
- [ ] CORE-USER-003 — Display Name.
- [ ] CORE-USER-004 — Outbound Caller ID.
- [ ] CORE-USER-005 — Caller-ID Number Alias / caller-ID masquerading.
- [ ] CORE-USER-006 — SIP Alias/Name.
- [ ] CORE-USER-007 — Virtual-extension Accountcode.
- [ ] CORE-USER-008 — Associated Device links and fixed/ad-hoc mapping visibility.
- [ ] CORE-USER-009 — Per-extension Asterisk Dial Options with inherit/system-default behavior.
- [ ] CORE-USER-010 — Ring Time.
- [ ] CORE-USER-011 — Ringer Volume Override with an explicit supported-device condition; the audited help limits it to Sangoma phones.
- [ ] CORE-USER-012 — Call Forward Ring Time.
- [ ] CORE-USER-013 — Outbound Concurrency Limit.
- [ ] CORE-USER-014 — Call Waiting enablement.
- [ ] CORE-USER-015 — Call Waiting Tone.
- [ ] CORE-USER-016 — Call Screening: disabled, no memory, or memory.
- [ ] CORE-USER-017 — Pinless Dialing.
- [ ] CORE-USER-018 — Auto-answer/intercom behavior when the Paging module supplies it.
- [ ] CORE-USER-019 — Direct inbound DID Description, DID, Caller-ID match, create/link, and edit-existing workflow.
- [ ] CORE-USER-020 — Inbound external, outbound external, inbound internal, and outbound internal recording policies with Force/Yes/Don't Care/No/Never states.
- [ ] CORE-USER-021 — On-demand recording Disable/Enable/Override.
- [ ] CORE-USER-022 — Recording priority from 0 through 20.
- [ ] CORE-USER-023 — No Answer destination and Caller-ID prefix.
- [ ] CORE-USER-024 — Busy destination and Caller-ID prefix.
- [ ] CORE-USER-025 — Not Reachable destination and Caller-ID prefix.
- [ ] CORE-USER-026 — Voicemail mailbox creation, state, aliasing, and deletion when the Voicemail module is present.
- [ ] CORE-USER-027 — User deletion cleanup across SQL, AstDB, call waiting, device maps, voicemail, and module hooks.

#### Common device identity

- [ ] CORE-DEV-001 — Device/Extension ID.
- [ ] CORE-DEV-002 — Device Description.
- [ ] CORE-DEV-003 — Device Type: Fixed or Ad-hoc.
- [ ] CORE-DEV-004 — Default User, including New User creation where supported.
- [ ] CORE-DEV-005 — Emergency Caller ID.
- [ ] CORE-DEV-006 — Hint Override.
- [ ] CORE-DEV-007 — Linked-user display and voicemail mailbox remapping.
- [ ] CORE-DEV-008 — Driver-specific defaults, storage, readback, config generation, and deletion cleanup.
- [ ] CORE-DEV-009 — Presence-state cleanup and re-creation.

#### PJSIP device fields

- [x] CORE-PJSIP-DEV-001 — Secret/password. Verified 2026-08-23: generated at random per endpoint, written to the auth section, shown once and never in the confirmed plan; verified on the live target as InAuth 8001/8001.
- [ ] CORE-PJSIP-DEV-002 — Account Code and Default User.
- [x] CORE-PJSIP-DEV-003 — DTMF mode, including version-appropriate RFC 4733 behavior. Verified 2026-08-23: select control e_dtmf bound to endpoint.dtmf_mode.
- [x] CORE-PJSIP-DEV-004 — Context. Verified 2026-08-23: segmented control e_context; changed from-internal to from-external on the live target and confirmed in Asterisk own output.
- [ ] CORE-PJSIP-DEV-005 — Caller-ID trust, Remote-Party-ID/PAI send mode, connected-line updates, and `user=phone`.
- [x] CORE-PJSIP-DEV-006 — Qualify Frequency; the audited PJSIP form removes the inherited chan_sip Qualify toggle. Verified 2026-08-23: slider control e_qualify bound to aor.qualify_frequency; round-tripped through 90s and confirmed via `pjsip show aor` on the live target.
- [x] CORE-PJSIP-DEV-007 — Active Transport. Verified 2026-08-23: segmented control e_transport bound to endpoint.transport.
- [ ] CORE-PJSIP-DEV-008 — AVPF, Force AVP, ICE, RTCP mux, and WebRTC defaults.
- [ ] CORE-PJSIP-DEV-009 — RTP bundling, with separate storage from WebRTC; do not reproduce Core's `bundle` key collision.
- [x] CORE-PJSIP-DEV-010 — Maximum Audio Streams and Maximum Video Streams. Verified 2026-08-23: stepper controls e_maxaudio and e_maxvideo bound to endpoint.max_audio_streams and max_video_streams. Zero is written rather than dropped as falsy, so refusing video outright is expressible. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [x] CORE-PJSIP-DEV-011 — Audio, video, text, and image codec enablement plus order. Verified 2026-08-23: order control e_codecs writes endpoint.allow (in order) plus disallow=["all"]; confirmed on the live target as `allow : (ulaw|alaw)` via `pjsip show endpoint`.
- [ ] CORE-PJSIP-DEV-012 — Call Groups and Pickup Groups.
- [ ] CORE-PJSIP-DEV-013 — Dial string. Excluded: no `dial=` key exists in pjsip.conf.sample or the PJSIP model; this is a FreePBX abstraction over the dialplan, not a native pjsip.conf field.
- [x] CORE-PJSIP-DEV-014 — Mailbox and Voicemail Extension. Verified 2026-08-23: free-text controls e_mailboxes and e_voicemail_ext bound to endpoint.mailboxes/voicemail_extension; confirmed on the live target via `pjsip show endpoint`.
- [x] CORE-PJSIP-DEV-015 — Maximum Contacts and Remove Existing Contacts. Verified 2026-08-23: stepper control e_maxcontacts and switch control e_removeexisting bound to aor.max_contacts/remove_existing; confirmed on the live target via `pjsip show aor`.
- [ ] CORE-PJSIP-DEV-016 — Media Use Received Transport.
- [x] CORE-PJSIP-DEV-017 — RTP Symmetric, Rewrite Contact, and Force rport. Verified 2026-08-23: switch controls e_symmetric, e_rewrite and e_forcerport, round-tripped through yes and no.
- [x] CORE-PJSIP-DEV-018 — MWI Subscription Type and Aggregate MWI. Verified 2026-08-23: switch controls e_aggregate_mwi and e_mwi_replaces bound to endpoint.aggregate_mwi and mwi_subscribe_replaces_unsolicited. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [x] CORE-PJSIP-DEV-019 — Media Encryption: none, SDES, or DTLS where supported. Verified 2026-08-23: select control e_encryption bound to endpoint.media_encryption.
- [x] CORE-PJSIP-DEV-020 — Opportunistic SRTP / allow non-encrypted media. Verified 2026-08-23: switch control e_optimistic bound to endpoint.media_encryption_optimistic. The control says plainly that opportunistic SRTP makes encryption best-effort rather than required. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [x] CORE-PJSIP-DEV-021 — Session Timers and Timer Expiration Period/minimum session expiration. Verified 2026-08-23: segmented control e_timers keeping all four Asterisk values (no/yes/required/always) rather than collapsing to a switch, plus sliders e_timers_min_se and e_timers_sess. timers_sess_expires was added to the PJSIP model in the same change, verified against configs/samples/pjsip.conf.sample line 735. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [ ] CORE-PJSIP-DEV-022 — Direct Media and Media Address.
- [x] CORE-PJSIP-DEV-023 — Blind REFER progress behavior. Verified 2026-08-23: switch control e_refer_blind bound to endpoint.refer_blind_progress. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [x] CORE-PJSIP-DEV-024 — Device State Busy At threshold. Verified 2026-08-23: stepper control e_busy_at bound to endpoint.device_state_busy_at. Zero is written, since it means never report busy on count. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [ ] CORE-PJSIP-DEV-025 — Match Permit / identify matching.
- [ ] CORE-PJSIP-DEV-026 — Minimum and Maximum Registration Expiration.
- [x] CORE-PJSIP-DEV-027 — RTP Timeout and RTP Hold Timeout. Verified 2026-08-23: sliders e_rtp_timeout and e_rtp_hold bound to endpoint.rtp_timeout and rtp_timeout_hold. Zero is written, since it disables the check. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [x] CORE-PJSIP-DEV-028 — Outbound Proxy and Outbound Authentication. Verified 2026-08-23: free-text controls e_outbound_proxy and e_outbound_auth bound to endpoint.outbound_proxy and outbound_auth. An empty control writes nothing rather than clearing a proxy nobody meant to touch. Each writes only its own key, round-trips back into its control, and survives being rendered to pjsip.conf and reparsed; covered by console/tests/ui/endpoint-advanced.test.tsx.
- [ ] CORE-PJSIP-DEV-029 — Messages Context.
- [ ] CORE-PJSIP-DEV-030 — PJSIP endpoint, AOR, auth, identify, registration, global, and transport extension points.
- [ ] CORE-PJSIP-DEV-031 — Backend-only `md5_cred` authentication path that generates MD5 credentials instead of ordinary username/password auth.
- [ ] CORE-PJSIP-DEV-032 — Backend-only `force_callerid` path that writes the supplied endpoint caller ID instead of applying device-to-user caller-ID mapping.
- [ ] CORE-PJSIP-DEV-033 — Backend-only `rtp_keepalive` generation with global SIP Settings fallback.

#### Legacy chan_sip device fields

- [ ] CORE-SIP-DEV-001 — Secret and the conditional, bidirectional Change SIP Driver action between PJSIP and chan_sip before Asterisk 21.
- [ ] CORE-SIP-DEV-002 — DTMF signaling.
- [ ] CORE-SIP-DEV-003 — Can Reinvite/direct-media behavior.
- [ ] CORE-SIP-DEV-004 — Context, Host, and Default Username.
- [ ] CORE-SIP-DEV-005 — Trust RPID, Send RPID, and `user=phone`.
- [ ] CORE-SIP-DEV-006 — Connection Type: friend, peer, or user.
- [ ] CORE-SIP-DEV-007 — Session Timers.
- [ ] CORE-SIP-DEV-008 — NAT Mode.
- [ ] CORE-SIP-DEV-009 — Port.
- [ ] CORE-SIP-DEV-010 — Qualify and Qualify Frequency.
- [ ] CORE-SIP-DEV-011 — UDP, TCP, TLS, WS, and WSS transports when supported.
- [ ] CORE-SIP-DEV-012 — AVPF, Force AVP, ICE, RTCP mux, encryption, and video support.
- [ ] CORE-SIP-DEV-013 — Call Groups and Pickup Groups.
- [ ] CORE-SIP-DEV-014 — Disallowed and Allowed codecs.
- [ ] CORE-SIP-DEV-015 — Dial string, Account Code, Mailbox, and Voicemail Extension.
- [ ] CORE-SIP-DEV-016 — Deny and Permit ACLs.
- [ ] CORE-SIP-DEV-017 — Visible missing-SIP-Settings dependency error and driver/port diagnostics.
- [ ] CORE-SIP-DEV-018 — Asterisk 21+ migration warning, conversion route, and final removal/hiding after no chan_sip objects remain.
- [ ] CORE-SIP-DEV-019 — Driver-contributed Bulk Handler `bundle` field for enabling WebRTC defaults.

#### IAX2, DAHDI, Custom, and Virtual device fields

- [x] CORE-IAX-DEV-001 — Secret, Context, Host, and friend/peer/user Type. Verified 2026-08-23: new IAX peers destination (pbx rail, iax.conf); segmented control ix_type (user/peer/friend), free-text ix_host and ix_context bound to the peer section. The secret is write-only: switch ix_secret_set generates a strong one from the platform CSPRNG, writes it once and hands it back once. Nothing on the screen can read a stored secret, no control value ever carries one, and the change summary says a secret was replaced without saying what to. Ten peer keys were added to the IAX model in the same change, each verified against Asterisk's own configs/samples/iax.conf.sample first. An empty control writes nothing, an additional context listed in the file is kept, [general] and other peers survive a save, and the whole peer round-trips through the file; covered by console/tests/ui/iax-peers.test.tsx.
- [x] CORE-IAX-DEV-002 — Transfer mode: yes, no, or media-only. Verified 2026-08-23: new IAX peers destination (pbx rail, iax.conf); segmented control ix_transfer keeping all three documented values including mediaonly (iax.conf.sample line 533-534), rather than collapsing to a switch. Ten peer keys were added to the IAX model in the same change, each verified against Asterisk's own configs/samples/iax.conf.sample first. An empty control writes nothing, an additional context listed in the file is kept, [general] and other peers survive a save, and the whole peer round-trips through the file; covered by console/tests/ui/iax-peers.test.tsx.
- [x] CORE-IAX-DEV-003 — Port, Qualify, Disallow codecs, and Allow codecs. Verified 2026-08-23: new IAX peers destination (pbx rail, iax.conf); stepper ix_port, free-text ix_qualify, and order control ix_codecs writing disallow=all ahead of the allow list. Ten peer keys were added to the IAX model in the same change, each verified against Asterisk's own configs/samples/iax.conf.sample first. An empty control writes nothing, an additional context listed in the file is kept, [general] and other peers survive a save, and the whole peer round-trips through the file; covered by console/tests/ui/iax-peers.test.tsx.
- [x] CORE-IAX-DEV-004 — Dial string, Accountcode, Mailbox, Deny, and Permit. Verified 2026-08-23: new IAX peers destination (pbx rail, iax.conf); free-text ix_accountcode and ix_mailbox bound to the peer section; permit and deny were already parsed and are carried through a save untouched. Dial string excluded on the same grounds as CORE-PJSIP-DEV-013: no dial= key exists in iax.conf.sample or the IAX model, so it is a FreePBX dialplan abstraction rather than a config field. Ten peer keys were added to the IAX model in the same change, each verified against Asterisk's own configs/samples/iax.conf.sample first. An empty control writes nothing, an additional context listed in the file is kept, [general] and other peers survive a save, and the whole peer round-trips through the file; covered by console/tests/ui/iax-peers.test.tsx.
- [x] CORE-IAX-DEV-005 — Require Call Token: yes, no, or auto. Verified 2026-08-23: new IAX peers destination (pbx rail, iax.conf); segmented control ix_calltoken keeping all three documented values including auto (iax.conf.sample line 418-423). Ten peer keys were added to the IAX model in the same change, each verified against Asterisk's own configs/samples/iax.conf.sample first. An empty control writes nothing, an additional context listed in the file is kept, [general] and other peers survive a save, and the whole peer round-trips through the file; covered by console/tests/ui/iax-peers.test.tsx.
- [ ] CORE-IAX-DEV-006 — Backend/import `setvar` value, defaulting to `REALCALLERIDNUM=`, with validation before generated configuration.
- [ ] CORE-DAHDI-DEV-001 — Channel, Context, Immediate, and Signalling.
- [ ] CORE-DAHDI-DEV-002 — Echo Cancel, Echo Cancel When Bridged, and Echo Training.
- [ ] CORE-DAHDI-DEV-003 — Busy Detect, Busy Count, and Call Progress.
- [ ] CORE-DAHDI-DEV-004 — Dial string, Accountcode, Call Groups, Pickup Groups, and Mailbox.
- [ ] CORE-CUSTOM-DEV-001 — Validated Custom Dial string.
- [ ] CORE-VIRTUAL-DEV-001 — Virtual endpoint identity with no physical/channel driver fields.

### Inbound routes and DAHDI channel DIDs

**Ding target:** PBX / Routing. **Initial state:** New destination required; the dialplan canvas is not a route editor.

#### Inbound route list and form behavior

- [ ] CORE-DID-001 — Add, list, edit, delete, validate, search, sort, paginate, and link to the selected destination.
- [ ] CORE-DID-002 — Grid columns for DID, Caller-ID match, Description, Destination, and Actions; blank DID/CID renders as Any and an unset destination as No Destination.
- [ ] CORE-DID-003 — Basic and Advanced form modes: Basic carries Caller-ID Priority, MOH, and Caller-ID Prefix as hidden values and omits Country Indication Zone and Force Answer; Advanced exposes those settings.
- [ ] CORE-DID-004 — General, Advanced, Privacy, dependency-contributed, and legacy Other tabs.
- [ ] CORE-DID-005 — Description.
- [ ] CORE-DID-006 — DID Number exact match or dial-pattern match; blank means any DID.
- [ ] CORE-DID-007 — Caller-ID Number exact/pattern/privacy-string match; blank means any caller.
- [ ] CORE-DID-008 — Caller-ID Priority Route / PRI priority behavior.
- [ ] CORE-DID-009 — Alert-Info / distinctive ring.
- [ ] CORE-DID-010 — Ringer Volume Override from 0 through 14 with an explicit supported-device condition; the audited help limits it to Sangoma phones.
- [ ] CORE-DID-011 — Caller-ID Name Prefix.
- [ ] CORE-DID-012 — Music-on-Hold class when that provider is available.
- [ ] CORE-DID-013 — Destination selection, validation, reverse lookup, use count, edit link, and safe replacement.
- [ ] CORE-DID-014 — Country Indication Zone.
- [ ] CORE-DID-015 — Send RINGING before answer.
- [ ] CORE-DID-016 — Reject Reverse Charges / polarity-reversal handling.
- [ ] CORE-DID-017 — Force Answer.
- [ ] CORE-DID-018 — Pause Before Answer.
- [ ] CORE-DID-020 — Privacy Manager enablement.
- [ ] CORE-DID-021 — Privacy Manager maximum attempts from 1 through 11.
- [ ] CORE-DID-022 — Privacy Manager minimum entered-number length from 1 through 16.
- [ ] CORE-DID-023 — Context-sensitive enabling/disabling of dependent privacy fields.
- [ ] CORE-DID-024 — Add/delete lifecycle hooks and dependency-contributed controls.
- [ ] CORE-DID-025 — Inbound DID bulk import/export and active GraphQL CRUD.

#### DAHDI channel DIDs

- [ ] CORE-DAHDI-DID-001 — List, add, edit, delete, validate, and navigate per-channel DID mappings.
- [ ] CORE-DAHDI-DID-002 — Channel, Description, and DID fields.
- [ ] CORE-DAHDI-DID-003 — Immutable Channel on edit.
- [ ] CORE-DAHDI-DID-004 — Multiple channels mapped to one DID for hunt-group behavior.
- [ ] CORE-DAHDI-DID-005 — Visible `from-analog` context prerequisite and handoff into ordinary inbound routing.

### Outbound routes

**Ding target:** PBX / Routing, with graph visualization in Dialplan Canvas. **Initial state:** New destination required.

#### Route lifecycle and settings

- [ ] CORE-ROUTE-001 — Add, list, edit, duplicate, delete, and drag to change route priority; the audited FreePBX grid does not provide search, column sorting, or pagination.
- [ ] CORE-ROUTE-002 — Grid columns for Route Name, Outbound Caller ID, Attributes, and Actions.
- [ ] CORE-ROUTE-003 — Attribute indicators for Emergency, Intra-Company, Password, Time Group, and Override Extension Caller ID.
- [ ] CORE-ROUTE-004 — Duplicate route with a collision-safe copy name and independent child records.
- [ ] CORE-ROUTE-005 — Route Settings, Dial Patterns, Import/Export Patterns, Notifications, dependency-contributed, and Additional Settings tabs.
- [ ] CORE-ROUTE-006 — Route Name.
- [ ] CORE-ROUTE-007 — Route Caller ID.
- [ ] CORE-ROUTE-008 — Override Extension Caller ID.
- [ ] CORE-ROUTE-009 — Route Password/PIN.
- [ ] CORE-ROUTE-010 — Emergency Route flag and emergency caller-ID calculation.
- [ ] CORE-ROUTE-011 — Intra-Company Route flag; mutually exclusive validation with Emergency Route.
- [ ] CORE-ROUTE-012 — Music-on-Hold class when available.
- [ ] CORE-ROUTE-013 — Time Match Time Zone and Time Group/Permanent Route when Time Conditions is installed.
- [ ] CORE-ROUTE-014 — Calendar/calendar-group routing only after the disabled Core UI contract is independently designed and tested; it is stored in Core but not currently exposed there.
- [ ] CORE-ROUTE-015 — Ordered Trunk Sequence with add, remove, drag order, disabled-trunk indication, and empty/failover handling.
- [ ] CORE-ROUTE-016 — Optional Destination on Congestion.
- [ ] CORE-ROUTE-017 — Destination and trunk usage checks before deletion.

#### Dial patterns and wizard

- [ ] CORE-ROUTE-PAT-001 — Row editor for Prepend, Prefix, Match Pattern, and Caller-ID match.
- [ ] CORE-ROUTE-PAT-002 — Add, delete, validate, and de-duplicate pattern rows; the audited FreePBX editor does not drag-sort pattern rows.
- [ ] CORE-ROUTE-PAT-003 — Pattern syntax for `X`, `Z`, `N`, ranges, dot, and Caller-ID-specific matching.
- [ ] CORE-ROUTE-PAT-004 — Warning for an unsafe lone-dot match.
- [ ] CORE-ROUTE-PAT-005 — Optional legacy bulk-textarea editor behind an explicit setting.
- [ ] CORE-ROUTE-PAT-006 — CSV upload that validates and replaces all route patterns only after review.
- [ ] CORE-ROUTE-PAT-007 — CSV export with `prepend`, `prefix`, `match pattern`, and `callerid` columns.
- [ ] CORE-ROUTE-PAT-008 — NPA/NXX input and bounded local-prefix lookup.
- [ ] CORE-ROUTE-PAT-009 — Generate 7-digit, 10-digit, and 11-digit patterns.
- [ ] CORE-ROUTE-PAT-010 — Generate US/Canada toll-free patterns.
- [ ] CORE-ROUTE-PAT-011 — Generate North American information/service patterns including 211, 311, 411, 511, 611, 711, 911, 933, and 988.
- [ ] CORE-ROUTE-PAT-012 — Generate US international and long-distance patterns.
- [ ] CORE-ROUTE-PAT-013 — Generate EU information and emergency patterns, including 112 and 116xxx.
- [ ] CORE-ROUTE-PAT-014 — Explicit HTTPS/network failure, invalid NPA/NXX, empty result, cancellation, and retry states; do not reproduce unbounded third-party HTTP behavior.

#### Route email notifications

- [ ] CORE-ROUTE-MAIL-001 — Trigger when Call Successful or when Dial Pattern Matched.
- [ ] CORE-ROUTE-MAIL-002 — Email To, Email From, Subject, and Body with validation and redacted preview.
- [ ] CORE-ROUTE-MAIL-003 — Built-in visible variables for Call UID, route name, dialed and raw numbers, caller name/number/all, outgoing caller-ID name/number/all, trunk name, month/day/year, time, AM/PM time, and full/short time zone.
- [ ] CORE-ROUTE-MAIL-004 — Controlled dependency-contributed template variables, gated by the Allow Module Hook Data setting; Core passes hotdesk and emergency state to this hook but does not expose them as built-in tokens.
- [ ] CORE-ROUTE-MAIL-005 — Delivery failure visibility without leaking addresses or call data into unsafe logs.
- [ ] CORE-ROUTE-MAIL-006 — Visible high-traffic/excessive-email warning before enabling route notifications.

### Trunks and connectivity

**Ding target:** PBX / Trunks and Trunk authentication. **Initial state:** Existing — partial and mainly PJSIP-oriented.

#### Trunk lifecycle and common fields

- [ ] CORE-TRUNK-001 — Add-type chooser for PJSIP, legacy chan_sip, IAX2, DAHDI, ENUM, DUNDi, Custom, and conditional mISDN.
- [ ] CORE-TRUNK-018 — Top-level General, Dialed Number Manipulation Rules, and technology-specific Settings tabs.
- [ ] CORE-TRUNK-002 — Searchable/paginated list with Name, Technology, Caller ID, Enabled/Disabled state, edit, and delete.
- [ ] CORE-TRUNK-003 — Add, edit, copy, delete, submit, reset, enable, disable, hide from route selection, and show in route selection.
- [ ] CORE-TRUNK-004 — Usage panel listing outbound routes and route priority, plus an unused-trunk warning.
- [ ] CORE-TRUNK-005 — Trunk Name.
- [ ] CORE-TRUNK-006 — Hide Caller ID.
- [ ] CORE-TRUNK-007 — Outbound Caller ID.
- [ ] CORE-TRUNK-008 — Caller-ID policy: Allow Any, Block Foreign, Remove CNAM, or Force Trunk Caller ID.
- [ ] CORE-TRUNK-009 — Maximum Channels.
- [ ] CORE-TRUNK-010 — Per-trunk Asterisk Dial Options override or system default.
- [ ] CORE-TRUNK-011 — Continue if Busy / continue-on-failure.
- [ ] CORE-TRUNK-012 — Disable Trunk.
- [ ] CORE-TRUNK-013 — Monitor Trunk Failures and validated Custom AGI Script.
- [ ] CORE-TRUNK-014 — Provider metadata, channel ID, user context, failure trunk/script, and effective technology.
- [ ] CORE-TRUNK-015 — Runtime bulk enable/disable of all trunks, registered trunks, or selected trunks.
- [ ] CORE-TRUNK-016 — Destructive delete cleanup across technology data, dial options, patterns, route associations, AstDB, and hooks.
- [ ] CORE-TRUNK-017 — Dependency-contributed General settings.

#### Number manipulation

- [ ] CORE-TRUNK-PAT-001 — Prepend, Prefix, and Match Pattern row editor with add/delete and syntax help.
- [ ] CORE-TRUNK-PAT-002 — Outbound Dial Prefix.
- [ ] CORE-TRUNK-PAT-003 — Optional legacy bulk-textarea editor.
- [ ] CORE-TRUNK-PAT-004 — North-American/US-only NPA/NXX lookup and generation for 7-, 10-, and 11-digit dialing, toll-free, information, emergency, international, and long-distance patterns; unlike the route wizard, the audited trunk wizard has no EU choices.
- [ ] CORE-TRUNK-PAT-005 — Backend-only legacy three-column CSV import/export, clearly marked unavailable until a reviewed UI is intentionally restored.

#### PJSIP trunk — General

- [ ] CORE-PJSIP-TRUNK-GEN-000 — PJSIP General, Advanced, and Codecs sub-tabs.
- [ ] CORE-PJSIP-TRUNK-GEN-001 — Username.
- [ ] CORE-PJSIP-TRUNK-GEN-002 — Authentication Username.
- [ ] CORE-PJSIP-TRUNK-GEN-003 — Secret.
- [ ] CORE-PJSIP-TRUNK-GEN-004 — Authentication: Outbound, Inbound, Both, or None.
- [ ] CORE-PJSIP-TRUNK-GEN-005 — Registration: Send, Receive, or None.
- [ ] CORE-PJSIP-TRUNK-GEN-006 — Language Code with Sound Languages integration or validated free text.
- [ ] CORE-PJSIP-TRUNK-GEN-007 — SIP Server and SIP Server Port.
- [ ] CORE-PJSIP-TRUNK-GEN-008 — Context.
- [ ] CORE-PJSIP-TRUNK-GEN-009 — Transport.
- [ ] CORE-PJSIP-TRUNK-GEN-010 — Dynamic dependency locking among authentication, registration, username, URI, and server fields.

#### PJSIP trunk — Advanced

- [ ] CORE-PJSIP-TRUNK-ADV-001 — DTMF Mode: Auto where supported, RFC 4733, Inband, or Info.
- [ ] CORE-PJSIP-TRUNK-ADV-002 — Send Line in Registration where supported.
- [x] CORE-PJSIP-TRUNK-ADV-003 — Send Connected Line. Verified 2026-08-24: switch tk_connectedline bound to endpoint.send_connected_line. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [ ] CORE-PJSIP-TRUNK-ADV-004 — Permanent Authentication Rejection.
- [ ] CORE-PJSIP-TRUNK-ADV-005 — Allow Unauthenticated OPTIONS.
- [ ] CORE-PJSIP-TRUNK-ADV-006 — Forbidden, Fatal, and General Retry Intervals.
- [ ] CORE-PJSIP-TRUNK-ADV-007 — Expiration and Maximum Retries.
- [ ] CORE-PJSIP-TRUNK-ADV-008 — Qualify Frequency.
- [ ] CORE-PJSIP-TRUNK-ADV-009 — Outbound Proxy.
- [ ] CORE-PJSIP-TRUNK-ADV-010 — `user=phone`.
- [x] CORE-PJSIP-TRUNK-ADV-011 — Contact User. Verified 2026-08-24: free-text tk_contactuser bound to endpoint.contact_user. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-012 — From Domain and From User. Verified 2026-08-24: free-text tk_fromdomain and tk_fromuser bound to endpoint.from_domain and from_user. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [ ] CORE-PJSIP-TRUNK-ADV-013 — Client URI and Server URI.
- [x] CORE-PJSIP-TRUNK-ADV-014 — Media Address. Verified 2026-08-24: free-text tk_mediaaddr bound to endpoint.media_address. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [ ] CORE-PJSIP-TRUNK-ADV-015 — AOR and AOR Contact.
- [ ] CORE-PJSIP-TRUNK-ADV-016 — Match/Permit identify data.
- [ ] CORE-PJSIP-TRUNK-ADV-017 — Support Path.
- [x] CORE-PJSIP-TRUNK-ADV-018 — T.38 UDPTL support. Verified 2026-08-24: switch tk_t38 bound to endpoint.t38_udptl. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-019 — T.38 Error Correction: None, Forward, or Redundancy. Verified 2026-08-24: segmented tk_t38ec keeping all three documented values (none, fec, redundancy) rather than collapsing to a switch, which would make two unreachable and rewrite whichever was set on the next save. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-020 — T.38 NAT and Maximum Datagram. Verified 2026-08-24: switch tk_t38nat and stepper tk_t38mtu bound to endpoint.t38_udptl_nat and t38_udptl_maxdatagram, with a warning before the write when either is set while T.38 itself is off, since Asterisk will not read them. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-021 — Fax Detect. Verified 2026-08-24: switch tk_faxdetect bound to endpoint.fax_detect. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-022 — Trust RPID/PAI. Verified 2026-08-24: switch tk_trustout bound to endpoint.trust_id_outbound. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-023 — Send RPID/PAI: No, Remote-Party-ID, PAI, or Both. Verified 2026-08-24: switch tk_sendrpid bound to endpoint.send_rpid, with a warning before the write when Remote-Party-ID is sent while outbound identity is not trusted -- the case where a caller who withheld their number has it forwarded anyway. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [x] CORE-PJSIP-TRUNK-ADV-024 — Send Private Caller-ID Information. Verified 2026-08-24: switch tk_senddiversion bound to endpoint.send_diversion. Thirteen trunk keys were added to the PJSIP model in the same change, each checked against Asterisk’s own configs/samples/pjsip.conf.sample first; CORE-PJSIP-TRUNK-ADV-002 and -010 are deliberately NOT claimed because Support Path and user=phone have no key in that sample, and a test asserts no control writes either. Each control writes only its own key, an untouched one writes nothing, an empty text control does not clear the field, and the whole set round-trips through pjsip.conf; covered by console/tests/ui/trunk-advanced.test.tsx.
- [ ] CORE-PJSIP-TRUNK-ADV-025 — Match Inbound Authentication by Default, Username, Auth Username, IP, or Header.
- [ ] CORE-PJSIP-TRUNK-ADV-026 — Inband Progress.
- [ ] CORE-PJSIP-TRUNK-ADV-027 — Direct Media.
- [ ] CORE-PJSIP-TRUNK-ADV-028 — Rewrite Contact.
- [ ] CORE-PJSIP-TRUNK-ADV-029 — RTP Symmetric.
- [ ] CORE-PJSIP-TRUNK-ADV-030 — Media Encryption: None or SDES in the audited UI; DTLS requires a new supported contract.
- [ ] CORE-PJSIP-TRUNK-ADV-031 — Force rport.
- [ ] CORE-PJSIP-TRUNK-ADV-032 — Message Context.
- [ ] CORE-PJSIP-TRUNK-ADV-033 — Codec enable/disable and drag-sort order across supported codec families.
- [ ] CORE-PJSIP-TRUNK-ADV-034 — Display preserved converted chan_sip Outgoing, Register String, and Incoming details.
- [ ] CORE-PJSIP-TRUNK-ADV-035 — Permanent Delete Old chan_sip Details action with review and backup.

#### Other trunk technologies

- [ ] CORE-SIP-IAX-TRUNK-000 — Legacy SIP/IAX Outgoing and Incoming sub-tabs.
- [ ] CORE-SIP-IAX-TRUNK-001 — Legacy chan_sip/IAX Outgoing Trunk Name and free-form PEER Details.
- [ ] CORE-SIP-IAX-TRUNK-002 — Incoming USER Context and USER Details.
- [ ] CORE-SIP-IAX-TRUNK-003 — Register String with secret redaction.
- [ ] CORE-DAHDI-TRUNK-001 — DAHDI group/channel Identifier.
- [ ] CORE-CUSTOM-TRUNK-001 — Custom Dial String with validated `$OUTNUM$` substitution.
- [ ] CORE-DUNDI-TRUNK-001 — DUNDi mapping name/manual configuration and limited-support warning.
- [ ] CORE-ENUM-TRUNK-001 — ENUM trunk lifecycle and runtime lookup behavior; the audited snapshot exposes no technology-specific ENUM form fields.
- [ ] CORE-MISDN-TRUNK-001 — Conditional mISDN Group/Port selector, clearly marked unsupported/external.
- [ ] CORE-ZAP-TRUNK-001 — Legacy edit-only Zap Identifier for migration, not new creation.

### Advanced Settings

**Ding target:** System / Advanced settings. **Initial state:** Backend ready, no complete generic settings UI.

The page contract is itself a feature: render all registered settings by category; display keyword, friendly name, help, current/default value, dependency/read-only state, and validation; save by group; and restore individual defaults. Required control types are Boolean, bounded integer, directory/path text, ordinary text, fixed select (`fselect`), custom-select with Custom value, ordinary select, and textarea. The audited Core page does not provide a file picker.

- [x] CORE-ADV-UI-001 — Grouped accordion/settings-list renderer with Submit, Reset, modified indicators, and per-setting Restore Default. Verified 2026-08-23: renderSettings groups by category in registry order rather than alphabetically, because registry order is editorial and sorting scatters related settings apart. Each rendered setting carries its keyword, friendly name, help, current and default value and a modified indicator; restoreDefault restores one setting without touching its neighbours and resetAll restores every writable one. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.
- [x] CORE-ADV-UI-002 — Read-only values hidden or displayed by policy, with a deliberate and audited override flow. Verified 2026-08-23: a read-only setting renders its value and reports isLocked. Writing one is refused unless policy carries allowReadOnlyOverride with an explicit reason, so an override is a recorded decision rather than a boolean somebody flipped. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.
- [x] CORE-ADV-UI-003 — Hidden settings remain inaccessible unless an explicit product policy allows them; do not reproduce Core's dead hidden-setting preference. Verified 2026-08-23: a hidden setting is withheld entirely rather than rendered disabled, and submitting its key is refused even so. Core's dead hidden-setting preference is deliberately not reproduced: a control that reads as a control and does nothing is worse than no control. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.
- [x] CORE-ADV-UI-004 — Type, option, path, range, and read-only validation before write. Verified 2026-08-23: validateWrite checks type, enum membership, integer range inclusively at both ends, absolute paths, and refusal of any path containing a traversal segment, plus rejection of unregistered keys. Every problem is reported at once rather than one per submit. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.
- [ ] CORE-ADV-UI-005 — Backup warning, impact summary, reload/service-restart preview, readback, and rollback.
- [x] CORE-ADV-UI-006 — UI language refresh and secret-setting validation without rendering stored secret values. Verified 2026-08-23: a stored secret never reaches a rendered setting at all: currentValue is undefined and hasValue is the only thing said about it, asserted by serialising the whole render result and searching it for the stored value. A rejected secret is never quoted back into its own validation message, since a message reaches whatever log, toast or export it is shown in. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.
- [x] CORE-ADV-UI-007 — Asterisk/module/version-specific visibility with a reason for every omitted setting. Verified 2026-08-23: omissionFor withholds a setting whose minimum Asterisk major or required module the target does not meet, and every omission carries a reason naming the cause. An unknown target version gates nothing rather than emptying the page. Covered by console/tests/ui/advanced-settings.test.tsx; the secret, hidden, read-only and path-traversal guards were each proven by breaking them and watching the suite go red.

#### Every Core-defined setting

- [ ] CORE-ADV-001 `LAUNCH_AGI_AS_FASTAGI` — Launch local AGIs through the loopback FastAGI service.
- [ ] CORE-ADV-002 `DIALPARTIESDIALPLAN` — Use the experimental pure-dialplan dial-party engine instead of the legacy AGI path.
- [ ] CORE-ADV-003 `OUTBOUND_CID_UPDATE` — Display outbound caller ID on the calling phone.
- [ ] CORE-ADV-004 `OUTBOUND_DIAL_UPDATE` — Display the final dialed number on the calling phone.
- [ ] CORE-ADV-005 `VMX_CONTEXT` — VmX default context.
- [ ] CORE-ADV-006 `VMX_PRI` — VmX default priority.
- [ ] CORE-ADV-007 `VMX_TIMEDEST_CONTEXT` — VmX timeout destination context.
- [ ] CORE-ADV-008 `VMX_TIMEDEST_EXT` — VmX timeout destination extension.
- [ ] CORE-ADV-009 `VMX_TIMEDEST_PRI` — VmX timeout destination priority.
- [ ] CORE-ADV-010 `VMX_LOOPDEST_CONTEXT` — VmX loop-exceeded destination context.
- [ ] CORE-ADV-011 `VMX_LOOPDEST_EXT` — VmX loop-exceeded destination extension.
- [ ] CORE-ADV-012 `VMX_LOOPDEST_PRI` — VmX loop-exceeded destination priority.
- [ ] CORE-ADV-013 `MIXMON_DIR` — Override call-recording location/directory layout.
- [ ] CORE-ADV-014 `MIXMON_POST` — Post-call-recording script.
- [ ] CORE-ADV-015 `MIXMON_FORMAT` — Call-recording audio format.
- [ ] CORE-ADV-016 `DIAL_OPTIONS` — Internal Asterisk Dial options.
- [ ] CORE-ADV-017 `TRUNK_OPTIONS` — Outbound trunk Dial options.
- [ ] CORE-ADV-018 `INBOUND_NOTRANS` — Disallow transfer features for inbound callers.
- [ ] CORE-ADV-019 `RINGTIMER` — Default ring time.
- [ ] CORE-ADV-020 `CONNECTEDLINE_PRESENCESTATE` — Display the callee's presence state.
- [ ] CORE-ADV-021 `CLEARGLOBALVARS` — Clear/reset generated global variables.
- [ ] CORE-ADV-022 `AMPSYSLOGLEVEL` — Core's legacy/minimal syslog-level setting.
- [ ] CORE-ADV-023 `TONEZONE` — Country indication/tone zone.
- [x] CORE-ADV-024 `HTTPENABLED` — Enable the Asterisk mini-HTTP server. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_enabled bound to http.conf enabled. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-025 `HTTPENABLESTATIC` — Enable mini-HTTP static content. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_static bound to enable_static. Note the underscore: the Core setting is HTTPENABLESTATIC and writing "enablestatic" emits a line Asterisk ignores. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-026 `HTTPENABLESTATUS` — Enable the mini-HTTP status page. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_status bound to enable_status, same spelling divergence. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-027 `HTTPBINDADDRESS` — HTTP bind address. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; free-text ht_bindaddr bound to bindaddr. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-028 `HTTPBINDPORT` — HTTP bind port. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; stepper ht_bindport bound to bindport. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-029 `HTTPPREFIX` — HTTP URL prefix. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; free-text ht_prefix bound to prefix. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-030 `HTTPTLSENABLE` — Enable HTTPS/TLS. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_tlsenable bound to tlsenable, with a warning shown before Submit when TLS is turned on without a certificate or a listener -- Asterisk reports that at load time, by which point the console has already said the write succeeded. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-031 `HTTPTLSBINDADDRESS` — HTTPS bind address. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; free-text ht_tlsaddr, the address half of tlsbindaddr. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-032 `HTTPTLSBINDPORT` — HTTPS bind port. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; stepper ht_tlsport, the port half. Core splits the TLS listener into two settings and Asterisk keeps one key (tlsbindaddr=0.0.0.0:8089), so the two are composed and decomposed here; editing either half preserves the other, and the split is taken at the first colon so a bare IPv6 address is read as an address rather than becoming address ":" and port "1". Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-033 `HTTPTLSCERTFILE` — TLS certificate path. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; free-text ht_tlscert bound to tlscertfile. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-034 `HTTPTLSPRIVATEKEY` — TLS private-key path. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; free-text ht_tlskey bound to tlsprivatekey. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-035 `TLSDISABLEV1` — Disable TLS 1.0. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_notls1 bound to tlsdisablev1, with a warning when a deprecated version is re-enabled. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-036 `TLSDISABLEV11` — Disable TLS 1.1. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_notls11 bound to tlsdisablev11, same warning. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-037 `TLSDISABLEV12` — Disable TLS 1.2. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; switch ht_notls12 bound to tlsdisablev12. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-038 `HTTPSESSIONLIMIT` — HTTP session limit. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; stepper ht_sesslimit bound to sessionlimit -- no underscore, unlike the two session keys beside it. That inconsistency is Asterisk’s own and guessing consistently in either direction gets one of the three wrong. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-039 `HTTPSESSIONINACTIVITY` — HTTP session inactivity timeout. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; slider ht_sessinact bound to session_inactivity. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [x] CORE-ADV-040 `HTTPSESSIONKEEPALIVE` — HTTP session keepalive. Verified 2026-08-23: new HTTP server destination (sys rail, http.conf) with a new parseHttp/toConfigValueHttp model; slider ht_sesskeep bound to session_keep_alive. Every key checked against Asterisk’s own configs/samples/http.conf.sample first. An untouched control writes nothing, a key the file never set does not appear on screen, and an unmanaged section such as [post_mappings] survives a save; covered by console/tests/ui/http-server.test.tsx.
- [ ] CORE-ADV-041 `HTTPWEBSOCKETMODE` — Force WebSocket mode: auto, chan_sip, or PJSIP; read-only/version-gated in Core.
- [ ] CORE-ADV-042 `SIPSECRETSIZE` — Generated SIP-secret length; read-only in the audited UI.
- [ ] CORE-ADV-043 `ENABLEOLDDIALPATTERNS` — Enable legacy dial-pattern textareas.
- [ ] CORE-ADV-044 `RSSFEEDS` — RSS feeds used by UCP/Dashboard.
- [ ] CORE-ADV-045 `INTERNALALERTINFO` — Internal-call Alert-Info value.
- [ ] CORE-ADV-046 `ATTTRANSALERTINFO` — Attended-transfer Alert-Info value.
- [ ] CORE-ADV-047 `BLINDTRANSALERTINFO` — Blind-transfer Alert-Info value.
- [ ] CORE-ADV-048 `PHPTIMEZONE` — PHP/application time zone.
- [ ] CORE-ADV-049 `EXPOSE_ALL_FEATURE_CODES` — Expose all feature codes; hidden in separate device/user mode where inappropriate.
- [ ] CORE-ADV-050 `ALLOW_MODULE_HOOK_IN` — Allow other module data/variables in outbound-route email notifications.

#### Upgrade and data-quality behavior

- [ ] CORE-ADV-MIG-001 — Force-rport, media-encryption, and `sendrpid` migrations with before/after evidence.
- [ ] CORE-ADV-MIG-002 — Disable unsafe experimental dial-party settings when a version migration requires it.
- [ ] CORE-ADV-MIG-003 — Repair orphaned outbound routes and decode legacy Alert-Info values.
- [ ] CORE-ADV-MIG-004 — Migrate ambiguous IPv6 `::` HTTP bind values and emit actionable warnings.
- [ ] CORE-ADV-MIG-005 — Scrub invalid emergency caller IDs and create a visible notification.
- [ ] CORE-ADV-MIG-006 — Asterisk 21+ chan_sip object detection, conversion warning, PJSIP enforcement, and legacy setting hiding.

### Administrators and access restrictions

**Ding target:** App / Administration. **Initial state:** New destination required.

- [ ] CORE-ADMIN-001 — Administrator list, add, edit, delete, and navigation.
- [ ] CORE-ADMIN-002 — Username.
- [ ] CORE-ADMIN-003 — Password change without exposing an existing hash or secret.
- [ ] CORE-ADMIN-004 — Preserve Email, Department, and legacy allowed-extension range data only for backend/migration compatibility; the audited form exposes none of them as ordinary editable controls, and extension-low/high are hidden inputs.
- [ ] CORE-ADMIN-005 — Dual selected/not-selected access list with keyboard-accessible ordering and Select All/Unselect All.
- [ ] CORE-ADMIN-006 — Permission for every enabled administration section.
- [ ] CORE-ADMIN-007 — Permission for the Apply Changes bar.
- [ ] CORE-ADMIN-008 — Permission to add a Device/Extension.
- [ ] CORE-ADMIN-009 — All Sections permission.
- [ ] CORE-ADMIN-010 — Restart Setup Wizard permission.
- [ ] CORE-ADMIN-011 — Clear warnings and disabled editing when authentication is not database-backed.
- [ ] CORE-ADMIN-012 — Legacy/failover warning when a separate User Management identity system owns normal authentication.
- [ ] CORE-ADMIN-013 — OEM-branding visibility policy without weakening authorization enforcement.
- [ ] CORE-ADMIN-014 — MFA enrollment/status synchronization when an MFA provider is present.
- [ ] CORE-ADMIN-015 — Replace legacy SHA-1 password storage with a current password-hashing and credential-management contract in Ding.

### Asterisk binary modules

**Ding target:** System / Modules. **Initial state:** Existing — partial/read-only; this remains distinct from application-plugin management.

- [ ] CORE-ASTMOD-001 — Excluded (`noload`), Manually Loaded (`load`), and Preloaded (`preload`) sections.
- [ ] CORE-ASTMOD-002 — Searchable/module tables with Module and Action columns.
- [ ] CORE-ASTMOD-003 — Add a validated `.so` module rule to each policy section.
- [ ] CORE-ASTMOD-004 — Remove a module rule.
- [ ] CORE-ASTMOD-005 — Explain startup risk, distinguish Asterisk modules from Ding/FreePBX modules, and require review before writes.
- [ ] CORE-ASTMOD-006 — Ding-native, recoverable Reset to Asterisk Defaults workflow based on Core's informational guidance that deleting `modules.conf` restores defaults; the audited Core page has no reset button/action.
- [ ] CORE-ASTMOD-007 — Preserve the chosen policy tab across navigation.

### Feature codes and in-call controls

**Ding target:** PBX / Call features. **Initial state:** New destination required; CLI/dialplan readings offer only partial observability.

- [ ] CORE-FCODE-001 — User Logon, default `*11`.
- [ ] CORE-FCODE-002 — User Logoff, default `*12`.
- [ ] CORE-FCODE-003 — Legacy ZapBarge, default `888`, migration-only and removed for modern Asterisk.
- [ ] CORE-FCODE-004 — ChanSpy, default `555`.
- [ ] CORE-FCODE-005 — Call Seize, default `*59`.
- [ ] CORE-FCODE-006 — Simulate Incoming Call, default `7777`, clearly identified as a diagnostic call path rather than fabricated UI data.
- [ ] CORE-FCODE-007 — Directed Call Pickup, default `**`.
- [x] CORE-FCODE-008 — General Call Pickup, default `*8`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_pickupexten bound to features.conf [general] pickupexten. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-009 — Blind Transfer, default `##`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_blindxfer bound to [featuremap] blindxfer. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-010 — Attended Transfer, default `*2`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_atxfer bound to [featuremap] atxfer. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-011 — Abort Attended Transfer, default `*3`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_atxferabort bound to [general] atxferabort, added to the features model in the same change (features.conf.sample). An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-012 — Complete Attended Transfer, default `*4`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_atxfercomplete bound to [general] atxfercomplete, added to the features model in the same change. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-013 — Complete as Three-Way, default `*5`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_atxferthreeway bound to [general] atxferthreeway, added to the features model in the same change. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-014 — Swap Transferee and Destination, default `*6`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_atxferswap bound to [general] atxferswap, added to the features model in the same change. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-015 — Toggle Call Recording / one-touch automon, default `*1`. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_automixmon bound to [featuremap] automixmon. Deliberate divergence from Core, stated on the control itself: this Asterisk ships automixmon and its features.conf.sample carries no automon, so writing automon would emit a line the build ignores -- indistinguishable from a working setting that does nothing. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [x] CORE-FCODE-016 — Disconnect in-call feature mapping, default `**` where applicable. Verified 2026-08-23: new Feature codes destination (pbx rail, features.conf); free-text control fc_disconnect bound to [featuremap] disconnect. An empty control writes nothing rather than un-configuring a code, an existing [featuremap] line keeps its position in the file, and unmanaged sections such as [applicationmap] survive the save; covered by console/tests/ui/feature-codes.test.tsx.
- [ ] CORE-FCODE-017 — Enable, disable, and renumber codes through the external Feature Code Admin contract.
- [ ] CORE-FCODE-018 — Dependency relationships, including attended-transfer child codes and version-gated codes.

### Core destination registry

**Ding target:** PBX / Dialplan shared destination picker. **Initial state:** Existing — partial visualization, no complete registry/editor.

- [ ] CORE-DEST-001 — Terminate Call: Hangup.
- [ ] CORE-DEST-002 — Terminate Call: Congestion.
- [ ] CORE-DEST-003 — Terminate Call: Busy.
- [ ] CORE-DEST-004 — Terminate Call: SIT/Zapateller tones.
- [ ] CORE-DEST-005 — Terminate Call: Hold with music forever.
- [ ] CORE-DEST-006 — Terminate Call: Ring forever.
- [ ] CORE-DEST-007 — Terminate Call: play no-service message.
- [ ] CORE-DEST-008 — Every Extension/User as a direct destination.
- [ ] CORE-DEST-009 — Voicemail Busy Greeting when the mailbox/provider exists.
- [ ] CORE-DEST-010 — Voicemail Unavailable Greeting when the mailbox/provider exists.
- [ ] CORE-DEST-011 — Voicemail with no message when the mailbox/provider exists.
- [ ] CORE-DEST-012 — Voicemail instructions only when the mailbox/provider exists.
- [ ] CORE-DEST-013 — Every non-ENUM trunk as a destination.
- [ ] CORE-DEST-014 — Every inbound route as a destination.
- [ ] CORE-DEST-015 — Creation shortcuts, reverse lookup, usage graph, editable-owner link, validation, and safe replacement.

### Dialplan and live call behavior

**Ding target:** PBX / Dialplan and Call features. **Initial state:** Existing — read-only/partial graph; behavior must be generated and tested independently.

#### Inbound, internal, and outbound routing runtime

- [ ] CORE-DIAL-001 — Inbound DID and Caller-ID matching, priority, fallback, and destination routing.
- [ ] CORE-DIAL-002 — Inbound MOH, force-answer, pre-answer ringing, polarity reversal, pause-before-answer, indication zone, Privacy Manager, and caller-ID prefix behavior.
- [ ] CORE-DIAL-003 — Per-channel and general DAHDI ingress contexts.
- [ ] CORE-DIAL-004 — Local extension dialing, hints, presence display, and optional IVR direct dialing.
- [ ] CORE-DIAL-005 — No-answer, busy, unavailable, intercom, blackhole, bad-number, and voicemail paths.
- [ ] CORE-DIAL-006 — Inbound trunk contexts and direct trunk dialing.
- [ ] CORE-DIAL-007 — Outbound prepend/prefix/pattern processing and route ordering.
- [ ] CORE-DIAL-008 — Route time/time-zone/calendar includes when providers are active.
- [ ] CORE-DIAL-009 — Route PIN validation.
- [ ] CORE-DIAL-010 — Emergency and intra-company caller-ID handling.
- [ ] CORE-DIAL-011 — Caller-ID/Diversion header calculation and caller-ID prepend.
- [ ] CORE-DIAL-012 — Ordered trunk failover, busy/congestion behavior, hangup-cause handling, and alternate destination.
- [ ] CORE-DIAL-013 — Route email notification invocation.
- [ ] CORE-DIAL-014 — ENUM NAPTR routing and DUNDi routing with bounded DNS/network behavior.

#### Dial-party and endpoint behavior

- [ ] CORE-DIALPARTY-001 — Ring-all and Ringallv2/pre-ring behavior.
- [ ] CORE-DIALPARTY-002 — Hunt/sequential and randomized/shuffle dialing.
- [ ] CORE-DIALPARTY-003 — Memory-hunt behavior.
- [ ] CORE-DIALPARTY-004 — First-available and first-not-on-phone selection.
- [ ] CORE-DIALPARTY-005 — Device availability checks and dial-list construction.
- [ ] CORE-DIALPARTY-006 — Call forwarding, forwarding timers, Diversion headers, and optionally blocked forwarding.
- [ ] CORE-DIALPARTY-007 — DND and call-waiting state.
- [ ] CORE-DIALPARTY-008 — Call screening with and without memory.
- [ ] CORE-DIALPARTY-009 — Ringer-volume and Alert-Info headers, including supported Sangoma-device headers only when explicitly selected.
- [ ] CORE-DIALPARTY-010 — Call group, pickup group, directed/general/ring-group-aware pickup.
- [ ] CORE-DIALPARTY-011 — Call trace and constructed endpoint dial strings, including PJSIP contacts.
- [ ] CORE-DIALPARTY-012 — Queue elapsed-time/wait metadata and queue-callback integration.
- [ ] CORE-DIALPARTY-013 — Call confirmation, auto-confirmation, ring-group confirmation, and blocked-voicemail confirmation paths.
- [ ] CORE-DIALPARTY-014 — Inbound-transfer option stripping and connected-line/presence updates.
- [ ] CORE-DIALPARTY-015 — Caller-ID masquerading, account code, emergency caller ID, hotdesk identity, CDR caller ID, language, concurrency, and recursion/TTL protection.
- [ ] CORE-DIALPARTY-016 — Pure-dialplan engine and legacy AGI engine with observable selection, parity tests, and safe fallback.
- [ ] CORE-DIALPARTY-017 — Invalid method/mode, no devices, no contacts, unavailable destination, and dependency-failure behavior.

#### Hotdesking, voicemail glue, and specialized utilities

- [ ] CORE-HOTDESK-001 — User login/logout, fixed/ad-hoc device mapping, hints, UserEvents, and hangup cleanup.
- [ ] CORE-HOTDESK-002 — Preserve/restore queue, Follow Me, DND, forwarding, camp-on, voicemail alias/symlink, and device state across login/logout where providers exist.
- [ ] CORE-VMX-001 — VmX context/priority, timeout, loop-exceeded, greeting check, instructions, and mailbox destination glue.
- [ ] CORE-DIR-001 — Dial-by-name directory AGI supporting first-name, last-name, or all-name T9 lookup, prompts, operator selection, extension announcement, and dialing; UI ownership remains external Directory.
- [ ] CORE-ENUM-001 — Hard-coded sequential e164.org, e164.arpa, and e164.info lookups with sorted SIP/IAX results, plus the `ENUMUSEGOOGLEDNS` choice between the normal resolver path and `dig` against Google DNS; Core does not expose per-provider selection.
- [ ] CORE-LEGACY-001 — Deprecated `fixlocalprefix` no-op retained only for migration recognition.

### Bulk Handler and direct import/export

**Ding target:** cross-cutting Data / Import & Export. **Initial state:** New destination required.

- [ ] CORE-BULK-001 — Extension CSV export/import with Extension and Name required, optional Description and Device Technology, and all driver-contributed fields.
- [ ] CORE-BULK-002 — Secret value `REGEN` to generate a new secret without exporting or displaying an existing secret.
- [ ] CORE-BULK-003 — Inbound DID export/import with Description, Incoming DID, Caller ID, and destination Context/Extension/Priority.
- [ ] CORE-BULK-004 — PJSIP-trunk export/import with Trunk Name and SIP Server.
- [ ] CORE-BULK-005 — Validate PJSIP, chan_sip, Virtual, IAX2, DAHDI, and Custom extension technologies.
- [ ] CORE-BULK-006 — Validate numeric/ranged extensions, names, driver-required fields, destination existence, and trunk-required fields.
- [ ] CORE-BULK-007 — Dry-run parse, row-level errors, complete change plan, downloadable redacted error report, and explicit replace-existing decision.
- [ ] CORE-BULK-008 — Extension replacement across both user and device records with defaults and AstDB rebuild.
- [ ] CORE-BULK-009 — DID replacement with optional Caller-ID Superfecta augmentation when that module is installed.
- [ ] CORE-BULK-010 — Same-name PJSIP trunk replacement.
- [ ] CORE-BULK-011 — Transactional batch behavior, backup, rollback, and post-import readback.
- [ ] CORE-BULK-012 — Route-specific four-column pattern CSV replacement/export.
- [ ] CORE-BULK-013 — Legacy trunk-specific three-column pattern CSV backend path, unavailable in UI until intentionally restored.

### Active APIs and automation contracts

**Ding target:** Data / APIs. **Initial state:** Existing — partial AMI/ARI visibility; FreePBX API compatibility is not implemented.

#### REST

- [ ] CORE-REST-001 — Authenticated, scoped `GET /core/users` equivalent.
- [ ] CORE-REST-002 — Authenticated, scoped `GET /core/users/{id}` equivalent.
- [ ] CORE-REST-003 — Optional voicemail mailbox augmentation only when voicemail data was actually read.

#### GraphQL-equivalent operations

- [ ] CORE-GQL-ADV-001 — Query all advanced settings.
- [ ] CORE-GQL-ADV-002 — Query one advanced setting.
- [ ] CORE-GQL-ADV-003 — Update an advanced setting with read-only, type, option, path, and scope validation.
- [ ] CORE-GQL-DEV-001 — Add, update, delete, list, and fetch one device.
- [ ] CORE-GQL-DEV-002 — Reject unsupported chan_sip operations on Asterisk 21+.
- [ ] CORE-GQL-DID-001 — Add, update, remove, list, and fetch one inbound route/DID.
- [ ] CORE-GQL-DID-002 — Validate the destination through the same registry used by the UI.
- [ ] CORE-GQL-EXT-001 — Add, update, delete, list, list valid, and fetch one extension.
- [ ] CORE-GQL-EXT-002 — Create a range of extensions with collision, size, licensing, dependency, and max-contact validation.
- [ ] CORE-GQL-EXT-003 — Optional User Management and Voicemail augmentation.
- [ ] CORE-GQL-USER-001 — Add, update, remove, list, and fetch one user.
- [ ] CORE-GQL-USER-002 — Define explicit least-privilege user scopes; the audited Users class lacks its own resource-specific `getScopes()` declaration.
- [ ] CORE-GQL-TECH-001 — Technology union exposing DTMF, user/account, account code, MWI, codecs, AVPF, caller ID, context, busy threshold, dial string, rport, ICE, mailbox, match, contacts/expiration, encryption/transport, proxy, qualify, contact rewriting, RTCP/RTP, RPID, timers, transport, and trust fields.
- [ ] CORE-GQL-TECH-002 — Make secrets write-only/redacted; the audited upstream technology resolver exposes the raw stored secret as an ordinary readable string and that behavior must not be reproduced.
- [ ] CORE-GQL-DEST-001 — Typed termination destinations.
- [ ] CORE-API-SEC-001 — Consistent least-privilege scopes; do not reproduce Core's singular/plural or advanced-setting scope inconsistencies.
- [ ] CORE-API-SEC-002 — Bounded queries, pagination, input limits, audit events, secret redaction, stable errors, versioning, and CSRF/origin/authentication controls appropriate to the transport.

#### Explicitly inactive in the audited Core snapshot

- [ ] CORE-GQL-INACTIVE-001 — Do not advertise the entirely commented legacy aggregate Core GraphQL class.
- [ ] CORE-GQL-INACTIVE-002 — Do not advertise Trunk GraphQL; the audited class is entirely commented out.
- [ ] CORE-GQL-INACTIVE-003 — Do not advertise Outbound Route GraphQL; the audited class is empty.

### Backup, restore, migration, and warm spare

**Ding target:** App / History & Backup. **Initial state:** Backend ready for resource-level transactions; no complete FreePBX-style whole-domain workflow.

- [ ] CORE-BACKUP-001 — Back up administrators.
- [ ] CORE-BACKUP-002 — Back up Asterisk `modules.conf` policy.
- [ ] CORE-BACKUP-003 — Back up DAHDI channel DID mappings.
- [ ] CORE-BACKUP-004 — Back up devices and SIP/DAHDI/IAX driver data.
- [ ] CORE-BACKUP-005 — Back up inbound routes/DIDs.
- [ ] CORE-BACKUP-006 — Back up outbound routes, patterns, trunk order, time/calendar associations, and email notifications.
- [ ] CORE-BACKUP-007 — Back up trunks, PJSIP key/value data, and trunk dial patterns.
- [ ] CORE-BACKUP-008 — Back up users and per-user AstDB data.
- [ ] CORE-BACKUP-009 — Back up Core configuration, feature codes, advanced settings, key/value data, backup settings, and dependencies.
- [ ] CORE-BACKUP-010 — Explain and test cross-domain technology-table ownership: the Devices backup owns the complete `sip`, `dahdi`, and `iax` tables, which also contain some legacy trunk rows, while the Trunks backup separately owns PJSIP trunk rows from `pjsip`.
- [ ] CORE-BACKUP-011 — Disable Trunks on Restore option.
- [ ] CORE-RESTORE-001 — Restore every Core backup domain with a preflight inventory and version/dependency report.
- [ ] CORE-RESTORE-002 — Clear/rebuild `AMPUSER`, `AMPDEV`, and call-waiting AstDB families safely.
- [ ] CORE-RESTORE-003 — Preserve or skip trunks and routes when requested.
- [ ] CORE-RESTORE-004 — Warm-spare behavior.
- [ ] CORE-RESTORE-005 — Module reinstall/dependency restoration without assuming FreePBX's PHP framework exists in Ding.
- [ ] CORE-RESTORE-006 — Optional chan_sip extension and trunk conversion to PJSIP.
- [ ] CORE-RESTORE-007 — Skip unsupported chan_sip records with an explicit itemized report.
- [ ] CORE-RESTORE-008 — Restore feature codes, settings, route time/calendar associations, and key/value data.
- [ ] CORE-RESTORE-009 — Preserve selected SIP, PJSIP, and IAX trunks.
- [ ] CORE-RESTORE-010 — Transactional restore, integrity/hash validation, conflict policy, dry run, readback, rollback, and redacted evidence.
- [ ] CORE-RESTORE-011 — Make clear that the audited Core backup classes are configuration/table-oriented, not a whole-host filesystem backup.

### Console commands and operational tools

**Ding target:** System / CLI and PBX / migration actions. **Initial state:** Existing — read-only CLI builder; write commands require dedicated safe actions.

- [ ] CORE-CLI-001 — Convert all extensions from chan_sip to PJSIP.
- [ ] CORE-CLI-002 — Convert a comma-separated/ranged extension selection to PJSIP.
- [ ] CORE-CLI-003 — Validate ranges, preview field mapping/loss, back up, convert, mark reload, read back, and roll back on failure.
- [ ] CORE-CLI-004 — List trunks in human-readable table format.
- [ ] CORE-CLI-005 — List trunks as stable JSON.
- [ ] CORE-CLI-006 — List trunks as stable XML.
- [ ] CORE-CLI-007 — Interactively or explicitly enable selected trunks.
- [ ] CORE-CLI-008 — Interactively or explicitly disable selected trunks.
- [ ] CORE-CLI-009 — Convert one or all eligible trunks to PJSIP.
- [ ] CORE-CLI-010 — Do not reproduce the audited command's swapped JSON/XML option descriptions.

### FastAGI and transfer-monitoring services

**Ding target:** System / Services. **Initial state:** Backend-ready daemon lifecycle primitives; no feature-specific service surface.

- [ ] CORE-SVC-FASTAGI-001 — Optional loopback-only FastAGI listener on configurable/validated local service settings; the audited default is TCP 4573.
- [ ] CORE-SVC-FASTAGI-002 — Parse the AGI environment and proxy bidirectional stdin/stdout to a requested local AGI.
- [ ] CORE-SVC-FASTAGI-003 — Hangup termination, child cleanup, input bounds, executable allowlisting, privilege restriction, and log redaction.
- [ ] CORE-SVC-FASTAGI-004 — Install, start, stop, status, reload, health, notification, and fallback-to-forked-AGI states.
- [ ] CORE-SVC-FASTAGI-005 — Start/stop service when the advanced setting changes, with rollback on failed transition.
- [ ] CORE-SVC-XFER-001 — Supervised call-transfer listener lifecycle: install, start, stop, status/reconnect, and uninstall.
- [ ] CORE-SVC-XFER-002 — Consume AMI AttendedTransfer and UnParkedCall events.
- [ ] CORE-SVC-XFER-003 — Resume `MixMonitor` recording after transfer/unpark.
- [ ] CORE-SVC-XFER-004 — Exact missing-AMI, missing-supervisor, permission, connection, and unsupported-event states.

### Asterisk configuration generation

**Ding target:** cross-cutting control plane. **Initial state:** Existing — partial resource transaction support.

- [ ] CORE-CONFIG-001 — Generate SIP general, endpoint/trunk, registration, and notify configuration plus custom include points.
- [ ] CORE-CONFIG-002 — Generate PJSIP endpoint, AOR, auth, registration, identify, transport, and custom include configuration.
- [ ] CORE-CONFIG-003 — Generate IAX general, endpoint/trunk, registration, and custom include configuration.
- [ ] CORE-CONFIG-004 — Generate DAHDI/Zapata configuration.
- [ ] CORE-CONFIG-005 — Generate `features.conf` general, application map, and feature map configuration.
- [ ] CORE-CONFIG-006 — Generate `res_odbc.conf` contributions.
- [ ] CORE-CONFIG-007 — Generate Asterisk `http.conf` contributions.
- [ ] CORE-CONFIG-008 — Generate country indication/tone configuration.
- [ ] CORE-CONFIG-009 — Generate extensions/dialplan contexts, globals, macros, functions, trunk routes, inbound routes, and feature-code mappings.
- [ ] CORE-CONFIG-010 — Preserve dedicated custom include files and never overwrite administrator-owned custom content.
- [ ] CORE-CONFIG-011 — Deterministic output, syntax validation, file permissions/ownership validation, atomic replace, reload preview, readback, and rollback.
- [ ] CORE-CONFIG-012 — Required Asterisk PJSIP resource-module enable/disable policy.
- [ ] CORE-CONFIG-013 — Install RTP base scaffolding that includes dedicated `rtp_additional.conf` and administrator-owned `rtp_custom.conf` files; this is a template/include surface, not a Core settings generator.
- [ ] CORE-CONFIG-014 — Install UDPTL/T.38 base scaffolding with an administrator-owned `udptl_custom.conf` include; this is a template/include surface, not a Core settings generator.

### Hooks, dependencies, logging, and maintenance

**Ding target:** cross-cutting extension contract. **Initial state:** New Ding contract required; FreePBX BMO/module hooks are not implemented.

- [ ] CORE-HOOK-001 — Bulk Handler provider hook.
- [ ] CORE-HOOK-002 — Backup-settings provider hook.
- [ ] CORE-HOOK-003 — Framework setting update/remove hooks.
- [ ] CORE-HOOK-004 — Service start/stop hooks.
- [ ] CORE-HOOK-005 — Pre-reload and post-reload hooks.
- [ ] CORE-HOOK-006 — Quick-create UI and creation hooks.
- [ ] CORE-HOOK-007 — User, device, trunk, and DID lifecycle hooks.
- [ ] CORE-HOOK-008 — Additional user/device/inbound-route/outbound-route tabs and controls.
- [ ] CORE-HOOK-009 — Outbound-route email fields and variables.
- [ ] CORE-HOOK-010 — PJSIP endpoint, AOR, auth, global, registration, and identify config-section hooks.
- [ ] CORE-HOOK-011 — Typed, permissioned, versioned Ding extension points with failure isolation; do not emulate unsafe arbitrary PHP hooks.
- [ ] CORE-LOG-001 — Debug-log rotation at a reviewed size/retention policy; Core defaults to 500 MB and seven rotations.
- [ ] CORE-LOG-002 — General PBX-log rotation; Core defaults to 100 MB and seven rotations.
- [ ] CORE-LOG-003 — FastAGI-log rotation; Core defaults to 50 MB and five rotations.
- [ ] CORE-LOG-004 — Supervisor log reopen/reload after rotation.

### Core dependency integrations, not Core-owned products

Each item needs an explicit provider interface and unavailable state; importing a reference or hook does not make the external module a Core feature.

- [ ] CORE-DEP-001 — SIP Settings provider for bind addresses, ports, transports, NAT, codecs, and driver-wide settings.
- [ ] CORE-DEP-002 — Voicemail provider for mailbox CRUD, destinations, aliases, greetings, and VmX.
- [ ] CORE-DEP-003 — Endpoint Manager provider for phone technology conversion, reboot, templates, and provisioning.
- [ ] CORE-DEP-004 — Paging/Intercom provider for auto-answer and intercom controls.
- [ ] CORE-DEP-005 — System Admin/provider licensing hooks without proprietary entitlement assumptions.
- [ ] CORE-DEP-006 — User Management identity provider.
- [ ] CORE-DEP-007 — Ring Groups pickup integration.
- [ ] CORE-DEP-008 — Follow Me state, pre-ring, cleanup, and dial-party integration.
- [ ] CORE-DEP-009 — Call Recording provider for recording-policy execution.
- [ ] CORE-DEP-010 — Caller-ID Superfecta provider for imported DID lookup configuration.
- [ ] CORE-DEP-011 — MFA provider for administrator synchronization.
- [ ] CORE-DEP-012 — Music-on-Hold, Time Conditions, Calendar, Sound Languages, Directory, IVR, Queue, Presence, DND, Camp-On, VQA, and route-message providers.
- [ ] CORE-DEP-013 — PM2-equivalent restricted supervisor and AMI provider for background services.
- [ ] CORE-DEP-014 — Conditional mISDN integration with an unsupported/dependency warning.

### Known source conditions and defects to avoid reproducing

- [ ] CORE-CAVEAT-001 — Core is one module, not the whole FreePBX product.
- [ ] CORE-CAVEAT-002 — Asterisk 21+ does not support chan_sip; legacy records need migration, not a new primary UI.
- [ ] CORE-CAVEAT-003 — ZapBarge is migration-only on modern Asterisk.
- [ ] CORE-CAVEAT-004 — Route Calendar data exists, but the audited route Calendar UI is forced off and HTML-commented.
- [ ] CORE-CAVEAT-005 — Legacy trunk-pattern CSV endpoints exist, but the current templates hide the controls.
- [ ] CORE-CAVEAT-006 — The Advanced Settings page reads a hidden-setting preference but unconditionally omits hidden settings.
- [ ] CORE-CAVEAT-007 — PJSIP device RTP Bundling and WebRTC collide on the same `bundle` UI key in the audited source.
- [ ] CORE-CAVEAT-008 — Trunk GraphQL is commented out, Routes GraphQL is empty, and the legacy aggregate Core GraphQL file is commented out.
- [ ] CORE-CAVEAT-009 — GraphQL scope names are inconsistent in several audited operations; Ding scopes must be normalized.
- [ ] CORE-CAVEAT-010 — `fwconsole trunks` JSON/XML help descriptions appear swapped.
- [ ] CORE-CAVEAT-011 — mISDN is conditional and explicitly unsupported.
- [ ] CORE-CAVEAT-012 — Core's route/trunk pattern wizard depends on a third-party calling-guide service and must not be copied as unbounded plain HTTP.
- [ ] CORE-CAVEAT-013 — Core's administrator password representation is legacy; Ding must use contemporary authentication and hashing.
- [ ] CORE-CAVEAT-014 — PJSIP devices inherit persistence in the `sip` table, while PJSIP trunks use `pjsip`; the full device technology tables also carry some legacy trunk rows, so backup/import boundaries must be explicit.
- [ ] CORE-CAVEAT-015 — UI fields vary by Asterisk version, driver mode, installed modules, hardware, permissions, and licenses.
- [ ] CORE-CAVEAT-016 — The GraphQL technology field is named `trustpid` while the stored PJSIP key is `trustrpid`, so the generic upstream resolver misses the intended setting.

## Part II — Current FreePBX 17 module ecosystem

This part uses the [live FreePBX 17 manifest](https://mirror.freepbx.org/all-17.0.xml) as the current Module Admin roster. Support tier is part of the feature contract: **Standard** modules receive the ordinary distribution treatment, **Extended** modules are less common/lower support, **Unsupported** modules are not supported by Sangoma, and **Commercial** or provider modules have separate terms. Every module below needs its own atomic source/contract audit before implementation can be marked complete.

### Standard open-source modules beyond Core

#### Calls, routing, and user-facing call features

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [AMD (`amd`)](https://github.com/FreePBX/amd) | Answering-machine detection for outbound calls, branching human versus machine results. | PBX / Call flow — new |
| [ ] | [Announcements (`announcement`)](https://github.com/FreePBX/announcement) | Play a reusable recording, optionally allow skip/replay behavior, then route to a destination. | PBX + Media — new |
| [ ] | [Blacklist (`blacklist`)](https://github.com/FreePBX/blacklist) | System-wide blocked-caller records, feature-code management, inbound enforcement, and auditability. | PBX / Call features — new |
| [ ] | [Calendar (`calendar`)](https://github.com/FreePBX/calendar) | Local/remote calendars, events, groups, synchronization, and calendar-driven call-routing states. | PBX / Scheduling — new |
| [ ] | [Call Forward (`callforward`)](https://github.com/FreePBX/callforward) | Unconditional, busy, unavailable, no-answer, and related forwarding states and feature codes. | PBX / Call features — new |
| [ ] | [Call Recording (`callrecording`)](https://github.com/FreePBX/callrecording) | Global/per-call recording policy, on-demand behavior, storage naming, execution, and notices. | Media / Recordings — partial fields only |
| [ ] | [Call Waiting (`callwaiting`)](https://github.com/FreePBX/callwaiting) | Per-extension call-waiting state, tone behavior, feature codes, and runtime status. | PBX / Call features — new |
| [ ] | [Conferences (`conferences`)](https://github.com/FreePBX/conferences) | Audio conference rooms, PINs, participant/admin policies, join/leave behavior, recordings, and destinations. | Media / Conferences — existing partial |
| [ ] | [Custom Applications (`customappsreg`)](https://github.com/FreePBX/customappsreg) | Register validated custom extensions and destinations for safe use by other call-flow features. | PBX / Dialplan — new |
| [ ] | [Call Flow Control / Day Night (`daynight`)](https://github.com/FreePBX/daynight) | Manual two-destination toggle with current state, feature code, labels, and override audit. | PBX / Call flow — new |
| [ ] | [Directory (`directory`)](https://github.com/FreePBX/directory) | Dial-by-name directories, membership, name-search mode, operator behavior, prompts, and destination. | PBX / Directory — new |
| [ ] | [Do-Not-Disturb (`donotdisturb`)](https://github.com/FreePBX/donotdisturb) | Per-extension DND state, feature-code control, presence/hint propagation, and call treatment. | PBX / Call features — new |
| [ ] | [Follow Me (`findmefollow`)](https://github.com/FreePBX/findmefollow) | Per-extension follow-me lists, ring strategies, timing, prefixes, confirmation, failover, and state. | PBX / Endpoints — new |
| [ ] | [Wake Up Calls (`hotelwakeup`)](https://github.com/FreePBX/hotelwakeup) | Schedule, cancel, originate, retry, and report reminder/hotel-style wake-up calls. | PBX / Scheduling — new |
| [ ] | [Info Services (`infoservices`)](https://github.com/FreePBX/infoservices) | Directory, last-call trace, echo test, speaking clock, and speak-my-extension service codes. | PBX / Call features — new |
| [ ] | [IVR (`ivr`)](https://github.com/FreePBX/ivr) | Auto-attendant menus, prompts, key mappings, timeouts, invalid retries, direct dialing, return behavior, and destinations. | PBX / IVR — existing partial |
| [ ] | [Missed Call Notification (`missedcall`)](https://github.com/FreePBX/missedcall) | Rules and delivery for qualifying missed-call notifications with privacy-safe content and failures. | App / Notifications — new |
| [ ] | [Route Congestion Messages (`outroutemsg`)](https://github.com/FreePBX/outroutemsg) | Select recordings/tones when all route trunks fail, including emergency and intra-company variants. | PBX + Media — new |
| [ ] | [Paging and Intercom (`paging`)](https://github.com/FreePBX/paging) | Paging groups, intercom prefixes, duplex/quiet behavior, auto-answer, and per-user page/intercom permissions. | PBX / Paging — new |
| [ ] | [Parking Lot (`parking`)](https://github.com/FreePBX/parking) | Parking lots/slots, park and pickup codes, timeouts, comeback destinations, hints, and permissions. | PBX / Call features — new |
| [ ] | [Queues (`queues`)](https://github.com/FreePBX/queues) | ACD queues, static/dynamic agents, ring strategies, penalties, announcements, wait limits, failover, recording, and runtime actions. | PBX / Queues — existing partial |
| [ ] | [Ring Groups (`ringgroups`)](https://github.com/FreePBX/ringgroups) | Group members, external numbers, hunt/ring methods, timing, caller ID, confirmation, recording, and failover. | PBX / Ring groups — new |
| [ ] | [Set CallerID (`setcid`)](https://github.com/FreePBX/setcid) | Change caller name/number within a call flow and continue to a destination. | PBX / Call flow — new |
| [ ] | [Time Conditions (`timeconditions`)](https://github.com/FreePBX/timeconditions) | Time groups, dates/times, override states/codes, time zones, and true/false routing destinations. | PBX / Scheduling — new |
| [ ] | [Voicemail Blasting (`vmblast`)](https://github.com/FreePBX/vmblast) | Record once and distribute to a configured mailbox group with permissions and delivery result. | Media / Voicemail — new |

#### Endpoints, identity, and collaboration

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [Contact Manager (`contactmanager`)](https://github.com/FreePBX/contactmanager) | Internal, external, private, shared, and grouped contacts with permissions and caller-ID integration. | App / Contacts — new |
| [ ] | [Feature Code Admin (`featurecodeadmin`)](https://github.com/FreePBX/featurecodeadmin) | List module-contributed feature codes; enable, disable, renumber, detect conflicts, and show dependencies. | PBX / Call features — new |
| [ ] | [Presence State (`presencestate`)](https://github.com/FreePBX/presencestate) | Define presence states, labels, hints, destinations, and integration with users/apps. | PBX / Endpoints — new |
| [ ] | [User Control Panel (`ucp`)](https://github.com/FreePBX/ucp) | Least-privilege end-user portal for voicemail, call handling, contacts, presence, devices, and approved widgets. | Separate end-user surface — new |
| [ ] | [User Management (`userman`)](https://github.com/FreePBX/userman) | Users, groups, directory providers, permissions, login/API identities, application assignments, and lifecycle. | App / Administration — new |
| [ ] | [Voicemail (`voicemail`)](https://github.com/FreePBX/voicemail) | Voicemail service, mailbox settings, greetings, authentication, storage, notifications, usage, and extension linkage. | Media / Voicemail — existing partial |
| [ ] | [WebRTC Phone (`webrtc`)](https://github.com/FreePBX/webrtc) | Browser phone, user/extension assignment, secure WebSocket/DTLS media readiness, device permissions, and call controls. | App/PBX — new |

#### Media, fax, and prompts

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [Fax Configuration (`fax`)](https://github.com/FreePBX/fax) | Inbound fax detection/reception, destination routing, fax-to-email, attachment/storage policy, and failures. | Media / Fax — backend resource only |
| [ ] | [Music on Hold (`music`)](https://github.com/FreePBX/music) | MOH categories, audio upload/download/audition/delete/order, streaming sources, formats, and runtime class selection. | Media / Music on hold — existing partial |
| [ ] | [System Recordings (`recordings`)](https://github.com/FreePBX/recordings) | Record by phone, upload, convert, audition, concatenate, name, replace, delete, and find usages of reusable prompts. | Media / Recordings — backend ready, no complete UI |
| [ ] | [Sound Languages (`soundlang`)](https://github.com/FreePBX/soundlang) | Discover, download, verify, install, update, remove, and choose Asterisk prompt-language packages. | Media / Languages — new |
| [ ] | [Text To Speech Engines (`ttsengines`)](https://github.com/FreePBX/ttsengines) | Configure available TTS engines, credentials through secure storage, voices/options, health, and test generation. | Media / TTS — new |

#### Connectivity, SIP, APIs, and host security

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [PBX API (`api`)](https://github.com/FreePBX/api) | Authenticated automation API, applications/clients, scopes, tokens, GraphQL/REST schema, audit, and revocation. | Data / APIs — existing partial transport views |
| [ ] | [Asterisk IAX Settings (`iaxsettings`)](https://github.com/FreePBX/iaxsettings) | Global IAX bind, registration, codec, jitter, encryption, network, and protocol settings. | System / IAX — backend resource only |
| [ ] | [Asterisk API / Manager (`manager`)](https://github.com/FreePBX/manager) | AMI global settings and users, permissions, networks, secret lifecycle, connection tests, and runtime status. | Data / AMI & ARI — existing partial |
| [ ] | [Asterisk SIP Settings (`sipsettings`)](https://github.com/FreePBX/sipsettings) | Global PJSIP/legacy SIP, transports, NAT, RTP, codecs, DNS, timers, security, and network settings. | System / SIP — backend resources, no complete UI |
| [ ] | [System Firewall (`firewall`)](https://github.com/FreePBX/firewall) | Host/network firewall, zones, interfaces, services, responsive firewall, intrusion controls, logs, safe lockout prevention, and rollback. | System / Security — new and high risk |

#### Data, reports, diagnostics, and security

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [Asterisk Info (`asteriskinfo`)](https://github.com/FreePBX/asteriskinfo) | Runtime snapshot of channels, peers/endpoints, subscriptions, registries, codecs, uptime, and related Asterisk state. | PBX/System live views — existing partial |
| [ ] | [CDR Reports (`cdr`)](https://github.com/FreePBX/cdr) | Search/filter/page call records, inspect legs/dispositions, export, authorize recording playback, and expose exact backend failures. | Data / CDR & CEL — existing partial |
| [ ] | [Call Event Logging (`cel`)](https://github.com/FreePBX/cel) | Detailed channel-event search, call-chain correlation, filters, export, and associated recording access. | Data / CDR & CEL — existing partial |
| [ ] | [Certificate Manager (`certman`)](https://github.com/FreePBX/certman) | Import, generate, request/renew, validate, assign, rotate, revoke/remove, and monitor certificates for TLS, DTLS, HTTPS, and WebRTC. | System / Security — new and high risk |
| [ ] | [CallerID Lookup (`cidlookup`)](https://github.com/FreePBX/cidlookup) | HTTP, database, ENUM, OpenCNAM, and phonebook sources; ordering, caching, test lookup, timeout, and fallback. | Data / Integrations — new |
| [ ] | [System Dashboard (`dashboard`)](https://github.com/FreePBX/dashboard) | Real calls, CPU, memory, disks, network, processes, services, alarms, and actionable system warnings. | PBX Dashboard — existing partial |
| [ ] | [Asterisk Logfiles (`logfiles`)](https://github.com/FreePBX/logfiles) | Browse, filter, tail, download/redact, rotate, and explain access/retention for Asterisk and application logs. | System / Logger — existing partial |
| [ ] | [Print Extensions (`printextensions`)](https://github.com/FreePBX/printextensions) | Printable/exportable inventory of internal callable numbers and labels, filtered by authorization. | Data / Reports — new |
| [ ] | [Weak Password Detection (`weakpasswords`)](https://github.com/FreePBX/weakpasswords) | Detect weak endpoint secrets without exposing them; notify, prioritize, remediate, and verify rotation. | System / Security — new |

#### Administration, backup, and platform services

| Adopt | Module | Capability to design for Ding | Target / starting state |
|---|---|---|---|
| [ ] | [Backup & Restore (`backup`)](https://github.com/FreePBX/backup) | Scheduled/manual backups, restore, migration, retention, encryption, module/database/voicemail/recording/certificate/custom-file sets, logs, and verification. | App / History & Backup — backend partial |
| [ ] | [Bulk Handler (`bulkhandler`)](https://github.com/FreePBX/bulkhandler) | CSV import/export framework for modules such as extensions, DIDs, users, groups, and contacts, with dry runs and row errors. | Data / Import & Export — new |
| [ ] | [Filestore (`filestore`)](https://github.com/FreePBX/filestore) | Local and remote storage targets, credentials, test connection, quotas, paths, retention, and consumer assignments. | App / Storage — new |
| [ ] | [FreePBX Framework (`framework`)](https://github.com/FreePBX/framework) | FreePBX admin shell, Module Admin, BMO, hooks, authentication integration, settings, and common UI services; map concepts, do not claim PHP-framework compatibility. | Cross-cutting — Ding-native equivalents only |
| [ ] | [PIN Sets (`pinsets`)](https://github.com/FreePBX/pinsets) | Reusable PIN lists, route/module assignment, secure import/export, usage, and audit without plaintext disclosure. | PBX / Security — new |
| [ ] | [Process Management (`pm2`)](https://github.com/FreePBX/pm2) | Restricted background-process inventory, desired state, health, restart, logs, startup, and dependency visibility. | System / Services — backend lifecycle partial |

### Extended open-source modules

| Adopt | Module | Capability to design for Ding | Source/status |
|---|---|---|---|
| [ ] | [Preserve Accountcode (`accountcodepreserve`)](https://github.com/FreePBX-ContributedModules/accountcodepreserve) | Retain the first applicable extension account code through forwarding, Follow Me, and redirection for billing/CDR attribution. | Extended; community-supported public source |
| [ ] | [Asterisk REST Interface Users (`arimanager`)](https://github.com/FreePBX/arimanager) | ARI user CRUD, password/secret rotation, read/write resource permissions, network access, and connection validation. | Extended |
| [ ] | [Asterisk CLI (`asterisk-cli`)](https://github.com/FreePBX/asterisk-cli) | Run allowlisted Asterisk CLI commands with read-only defaults, bounds, timeout, redaction, and audit. | Extended; Ding has partial read-only CLI |
| [ ] | [Callback (`callback`)](https://github.com/FreePBX/callback) | Hang up an inbound caller, originate a callback, validate caller ID, apply delay/retries, and route the answered callback. | Extended |
| [ ] | [Config Edit (`configedit`)](https://github.com/FreePBX/configedit) | Edit only explicitly supported custom config files with syntax checks, diff, backup, rollback, and ownership protection. | Extended; backend resources partial |
| [ ] | [DAHDI Config (`dahdiconfig`)](https://github.com/FreePBX/dahdiconfig) | Detect/configure analog, T1/E1, PRI, spans, channels, signaling, timing, echo, alarms, and hardware dependencies. | Extended; hardware-specific |
| [ ] | [Dictation (`dictate`)](https://github.com/FreePBX/dictate) | Telephone dictation recording, review/edit controls, authentication, storage, completion, and email delivery. | Extended |
| [ ] | [DISA (`disa`)](https://github.com/FreePBX/disa) | Authenticated inbound access to PBX dial tone with PINs, caller-ID policy, context, timeouts, and fraud controls. | Extended; high risk |
| [ ] | [Languages (`languages`)](https://github.com/FreePBX/languages) | Change spoken language in a call flow and assign language preferences to users/extensions. | Extended |
| [ ] | [Misc Applications (`miscapps`)](https://github.com/FreePBX/miscapps) | Create feature codes that route to arbitrary validated destinations. | Extended |
| [ ] | [Misc Destinations (`miscdests`)](https://github.com/FreePBX/miscdests) | Create reusable local-number destinations for IVR, time conditions, and other flows. | Extended |
| [ ] | [PHP Info (`phpinfo`)](https://github.com/FreePBX-ContributedModules/phpinfo) | Expose sanitized PHP runtime diagnostics with strict authorization and no secrets/environment leakage. | Extended; community-supported public source |
| [ ] | [Queue Priorities (`queueprio`)](https://github.com/FreePBX/queueprio) | Raise/change caller priority before queue entry and continue to a destination. | Extended |
| [ ] | [CID Superfecta (`superfecta`)](https://github.com/FreePBX/superfecta) | Chain/order caller-ID sources, per-source configuration, timeouts, caching, testing, fallback, and privacy controls. | Extended |
| [ ] | [Text To Speech (`tts`)](https://github.com/FreePBX/tts) | Call-flow destinations that render configured text through a selected TTS engine and continue routing. | Extended |

### Unsupported open-source modules

Unsupported means Sangoma does not support the module; adoption requires an independent security, maintenance, and replacement analysis.

| Adopt | Module | Capability to design for Ding | Source/status |
|---|---|---|---|
| [ ] | [Allow List (`allowlist`)](https://github.com/FreePBX-ContributedModules/allowlist) | System-wide explicitly permitted callers, enforcement scope, precedence with blacklist, and audit. | Unsupported; community-supported public source |
| [ ] | [Custom Contexts (`customcontexts`)](https://github.com/FreePBX-ContributedModules/customcontexts) | Restricted dialplan contexts with allow/deny patterns, time restrictions, PINs, and failover destinations. | Unsupported; community-supported public source; high risk |
| [ ] | [Dynamic Routes (`dynroute`)](https://github.com/FreePBX-ContributedModules/dynroute) | Resolve destinations from database, ODBC, URL, AGI, Asterisk variable, or DTMF lookup results with strict bounds and validation. | Unsupported; community-supported public source; high risk |
| [ ] | [Extension Settings (`extensionsettings`)](https://github.com/FreePBX/extensionsettings) | Consolidated extension view of forwarding, call waiting, DND, voicemail, and related live states. | Unsupported |
| [ ] | [Outbound CNAM (`outcnam`)](https://github.com/FreePBX-ContributedModules/outcnam) | Current exact behavior must be confirmed from the package before design; manifest metadata is not substantive. | Unsupported; community-supported public source |
| [ ] | [Synology Active Backup for Business (`synologyabb`)](https://github.com/FreePBX-ContributedModules/synologyabb) | Configure and monitor Synology ABB integration, identity, jobs, status, and recovery guidance. | Unsupported/provider-specific; community-supported public source |

### Proprietary and provider-coupled entries in the public manifest

| Adopt | Module | Capability that may inspire a Ding-native equivalent | Boundary |
|---|---|---|---|
| [ ] | [System Admin (`sysadmin`)](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35618920/PBX+GUI+-+System+Admin+Module) | OS network/DNS/email, intrusion detection, HTTPS assignment, provisioning protocols, notifications, ports, power, storage, time zone, updates, UPS, licensing, and support VPN. | Proprietary mix of free and licensed features; official Distro coupling |
| [ ] | SIPSTATION (`sipstation`) | Provision, manage, purchase/assign, and troubleshoot Sangoma/FreePBX.com trunks, numbers, emergency location, failover, and provider status. | Proprietary/provider-coupled; no public official repository found |
| [ ] | SMS (`sms`) | Provider-backed SMS conversations, numbers, routing, UCP/user permissions, delivery state, attachments where supported, and webhook integration. | Proprietary/provider-coupled; no public official repository found |

## Part III — Commercial capability families

Sangoma's [commercial-module policy](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/22216860/PBX+GUI+-+Commercial+Modules) describes these as proprietary add-ons intended for the official FreePBX Distro. The checklist is therefore about independently designed Ding capabilities, not reuse of code, brands, provider services, licensing mechanisms, or entitlement checks. Availability and support must be re-confirmed before adopting any provider integration.

Sangoma's current Commercial Module Guides index contains 33 families. System Admin is already counted in Part II because it is also the manifest's Commercial entry; the table below contains the other 32 guide families plus the separately indexed Sangoma Talk product, for 33 rows. Across Parts II and III, the unique proprietary/provider census is therefore 36: three public-manifest entries, 32 additional guide families, and Sangoma Talk.

| Adopt | Commercial family | Capability that may be independently designed | Boundary/status |
|---|---|---|---|
| [ ] | [Appointment Reminder](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26477189/PBX+GUI+-+Appointment+Reminder) | Appointment records, CSV import, automated reminder calls, confirmation/cancellation/rescheduling, retries, schedules, pacing, and results. | Commercial |
| [ ] | [Broadcast XactDialer](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26477706/PBX+GUI+-+Broadcast+XactDialer) | Outbound voice campaigns, contact lists, human/machine branches, pacing, concurrency, retries, opt-out, compliance controls, and reports. | Commercial/high risk |
| [ ] | [Caller ID Management](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26772576/PBX+GUI+-+Caller+ID+Management) | Feature-code-driven one-call or persistent outbound caller-ID selection with authorization and audit. | Commercial |
| [ ] | [CDR Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/22282324/PBX+GUI+-+CDR+Pro+Reporting+Module) | Simplified/predefined CDR reports, summaries, schedules, exports, sharing, and user-scoped visibility. | Commercial |
| [ ] | [Class of Service](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/27361476/PBX+GUI+-+Class+of+Service) | Per-extension/group access policy for outbound routes, feature codes, ring groups, queues, conferences, voicemail blasts, paging, and destinations. | Commercial |
| [ ] | [Conference Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/27492527/PBX+GUI+-+Conference+Pro) | End-user conference management and administrator-created conference-room IVR workflows. | Commercial |
| [ ] | [CRM Link](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/27263360/PBX+GUI+-+Customer+Relationship+Management+CRM+Link) | Authorized call-history/caller-data sync, click-to-call, screen pop, CRM association, provider health, and per-user permissions. | Commercial/provider-specific |
| [ ] | [EndPoint Manager](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/31064118/PBX+GUI+-+EndPoint+Manager) | Vendor/model templates, firmware, button maps, base files, images, provisioning servers, assignment, bulk rebuild/reboot, and drift. | Commercial/vendor-specific |
| [ ] | [Extension Routing](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/32572684/PBX+GUI+-+Extension+Routing) | Visual per-extension allow/deny matrix for outbound routes, with group operations and conflict reporting. | Commercial |
| [ ] | [Fax Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34177114/PBX+GUI+-+Fax+Pro) | Outbound faxing plus user send/receive/history, documents, retries, status, and authorization. | Commercial |
| [ ] | [FreePBX High Availability](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/22642992/PBX+GUI+-+FreePBX+High+Availability) | Historical DRBD/Pacemaker two-node replication and automatic failover concepts. | Commercial and legacy; official guide says unsupported on FreePBX 14+ |
| [ ] | [Outbound Call Limit](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34177148/PBX+GUI+-+Outbound+Call+Limit) | Limit calls to selected external numbers over configured rolling/calendar periods, with clear counters and overrides. | Commercial |
| [ ] | [Page Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34144404/PBX+GUI+-+Page+Pro) | Emergency/outbound notifications, valet paging, prerecorded prefixes, scheduled pages, retry, acknowledgement, and reporting. | Commercial |
| [ ] | [Park and Announce](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/33489572/PBX+GUI+-+Park+and+Announce) | Automatically park calls and announce slot/caller information to a paging group. | Commercial; depends on paging and parking features |
| [ ] | [Park Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34046313/PBX+GUI+-+Park+Pro) | Multiple parking lots, permissions, lot-specific policies, and supported device/application integration. | Commercial |
| [ ] | [PINSet Pro](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34111801/PBX+GUI+-+PINSet+Pro) | Assign PINs to extensions, control route PIN requirements, and attribute calls securely without exposing PINs. | Commercial |
| [ ] | [Queue Reports / Q-Xact](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34111833/PBX+GUI+-+Queue+Reports+Q+Xact) | Queue/agent performance metrics, reusable filters/templates, charts, drilldowns, schedules, and exports. | Commercial |
| [ ] | [Phone Apps](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34046391/PBX+GUI+-+Phone+Apps) | On-phone applications for PBX features, device capability discovery, permissions, and app deployment. | Commercial; supported-device dependency |
| [ ] | [UCP for EndPoint Manager](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35292107/PBX+GUI+-+UCP+for+EndPoint+Manager) | Let authorized users edit their phone buttons, BLFs, speed dials, feature codes, and device apps. | Commercial; EPM/UCP dependency |
| [ ] | [VM Notify](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/34833983/PBX+GUI+-+VM+Notify) | Escalate new-voicemail alerts through ordered recipients until acknowledged, with retry windows and audit. | Commercial |
| [ ] | [Voicemail Reports](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35226647/PBX+GUI+-+Voicemail+Reports) | Audit mailbox greetings/settings/storage and let authorized users find/play system voicemail with strict privacy controls. | Commercial |
| [ ] | [Queue Pro / VQ Plus](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35586407/PBX+GUI+-+Queue+Pro+VQ+Plus) | Virtual queue callback, dynamic penalties, virtual queues, additional failovers, post-hangup destinations, and reporting. | Commercial |
| [ ] | [Web CallBack](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35193874/PBX+GUI+-+Web+CallBack) | Secure embeddable “call me” form/API connecting a web visitor to an authorized PBX destination, with abuse controls. | Commercial/high risk |
| [ ] | [Sangoma Property Management](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35782839/PBX+GUI+-+Sangoma+Property+Management+SPM) | Guest check-in/out, rooms, room-phone policy, billing, wake-up/guest services, housekeeping, and PMS integration. | Commercial/hospitality-specific |
| [ ] | [PBX Call Accounting](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35914096/PBX+GUI+-+PBX+Call+Accounting+Module) | Rate decks for trunks/users/groups, jurisdiction/time bands, cost calculation, markup, reports, and export. | Commercial/financial accuracy required |
| [ ] | [Contact Image](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35946940/PBX+GUI+-+Contact+Image) | Associate remote device/door-phone images with contacts and deliver them to compatible phones safely. | Commercial/device-specific |
| [ ] | [Advanced Recovery](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35783290/PBX+GUI+-+Advanced+Recovery) | Replicate a primary PBX to a secondary, monitor drift/health, test readiness, and automate or guide failover/failback. | Commercial/high risk |
| [ ] | [MFA](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/36241789/PBX+GUI+-+MFA+Module) | Multi-factor enrollment, recovery codes, policy, enforcement, trusted sessions, reset, and audit for PBX access. | Commercial ecosystem; guide says $0 since April 2025 |
| [ ] | [Call Recording Reports](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/62488691/PBX+GUI+-+Call+Recording+Reports) | Search, filter, authorize, play, download, archive, retain, annotate, and delete call recordings with audit. | Commercial/privacy-sensitive |
| [ ] | [Brainbox](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/132087846/PBX+GUI+-+Brainbox) | Hospitality reports, room-phone operations, and property-management-system integration. | Third-party commercial; supported by vendor, not Sangoma |
| [ ] | [Scribe](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/488898594/PBX+GUI+-+Scribe) | Authorized call/voicemail transcription, summaries, sentiment/customer-satisfaction analysis, retention, correction, and opt-out. | Commercial AI/privacy-sensitive |
| [ ] | [SAML](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/925106179/PBX+GUI+-+SAML) | SAML identity providers, metadata, certificates, attribute/group mapping, admin/UCP SSO, logout, testing, and break-glass access. | Commercial/security-sensitive |
| [ ] | [Sangoma Talk Mobile](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/37716355/PBX+GUI+-+Sangoma+Talk) | Managed mobile softphone onboarding, extension assignment, calls, transfer, contacts/BLF, conferencing, push state, and device revocation. | Commercial/provider-application integration |

## Part IV — Community-supported module organization

Sangoma's [Community Supported Modules guide](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/131694652/PBX+GUI+-+Community+Supported+Modules) links the separate [FreePBX-ContributedModules organization](https://github.com/FreePBX-ContributedModules) and states that its modules are not maintained by the core PBX Engineering team. As of 2026-08-23 that organization has 64 public repositories: 63 installable module repositories with a root `module.xml`, plus one unestablished/non-module repository. Only OSS Endpoint Manager and Dynamic Routes are currently surfaced on the guide page; absence from that page is not itself an official deprecation judgment.

### Community repositories that overlap the live FreePBX 17 manifest

These eight repositories do not add eight products to the 81-entry non-Core manifest census; they provide the public community source for already-counted entries.

| Track | Repository/module | Capability | Current boundary |
|---|---|---|---|
| [ ] | [accountcodepreserve](https://github.com/FreePBX-ContributedModules/accountcodepreserve) | Preserve the first applicable extension account code through forwarding/redirection for CDR attribution. | Live 17 Extended |
| [ ] | [allowlist](https://github.com/FreePBX-ContributedModules/allowlist) | Manage a system-wide list of explicitly permitted callers. | Live 17 Unsupported |
| [ ] | [customcontexts](https://github.com/FreePBX-ContributedModules/customcontexts) | Restricted dialplan contexts with pattern, time, PIN, and failover controls. | Live 17 Unsupported |
| [ ] | [dynroute](https://github.com/FreePBX-ContributedModules/dynroute) | Calculate call destinations from SQL/ODBC, URLs, AGI, variables, or DTMF. | Live 17 Unsupported and current Community guide |
| [ ] | [outcnam](https://github.com/FreePBX-ContributedModules/outcnam) | Manage outbound caller-name behavior. | Live 17 Unsupported |
| [ ] | [phpinfo](https://github.com/FreePBX-ContributedModules/phpinfo) | Display PHP runtime diagnostics. | Live 17 Extended |
| [ ] | [setcid](https://github.com/FreePBX-ContributedModules/setcid) | Change caller ID within a call flow before routing onward. | Live 17 Standard; current source also exists under `FreePBX/setcid` |
| [ ] | [synologyabb](https://github.com/FreePBX-ContributedModules/synologyabb) | Configure and monitor Synology Active Backup for Business. | Live 17 Unsupported/provider-specific |

### Currently documented community module outside the live roster

| Track | Repository/module | Capability | Boundary |
|---|---|---|---|
| [ ] | [OSS PBX End Point Manager (`endpointman`)](https://github.com/FreePBX-ContributedModules/endpointman) | Open-source phone templates/provisioning, device assignment, vendor/model configuration, and generated endpoint files. | Current Community guide; absent from live manifest; unsupported by Sangoma |

Dynamic Routes is the other module currently named by the Community Supported guide and is already counted in the overlap table.

### Community repositories matching official deprecated families

| Track | Repository/module | Historical capability | Replacement/boundary |
|---|---|---|---|
| [ ] | [Bulk DIDs (`bulkdids`)](https://github.com/FreePBX-ContributedModules/bulkdids) | CSV import of inbound DIDs and destinations. | Deprecated; use Bulk Handler |
| [ ] | [Bulk Extensions (`bulkextensions`)](https://github.com/FreePBX-ContributedModules/bulkextensions) | CSV extension import/export. | Deprecated; use Bulk Handler |
| [ ] | [Camp-On (`campon`)](https://github.com/FreePBX-ContributedModules/campon) | Call-completion/callback when a busy or unanswered extension becomes available. | Deprecated family |
| [ ] | [FreePBX ARI (`fw_ari`)](https://github.com/FreePBX-ContributedModules/fw_ari) | Legacy ARI user-portal framework and patch delivery. | Superseded by modern UCP/user portal |
| [ ] | [iSymphony (`isymphony`)](https://github.com/FreePBX-ContributedModules/isymphony) | Auto-configure the iSymphony operator panel from FreePBX. | Deprecated XactView/iSymphony family |
| [ ] | [Java SSH (`javassh`)](https://github.com/FreePBX-ContributedModules/javassh) | Browser Java-applet access to the host shell over SSH. | Deprecated, obsolete, and unsafe; do not adopt |

### Historical or currently unlisted installable community modules

“Historical/unlisted” means absent from the live FreePBX 17 manifest and the current Community Supported and Deprecated guide indexes. It is not an official deprecation judgment. Each row requires a fresh security, maintenance, licensing, and need assessment.

| Track | Repository/module | Capability that may be evaluated |
|---|---|---|
| [ ] | [A2Billing (`a2billing`)](https://github.com/FreePBX-ContributedModules/a2billing) | Bootstrap and configure A2Billing integration. |
| [ ] | [Agent Administration (`agentadministration`)](https://github.com/FreePBX-ContributedModules/agentadministration) | Manage legacy `agents.conf` agent IDs, names, and passwords. |
| [ ] | [Boss Secretary (`bosssecretary`)](https://github.com/FreePBX-ContributedModules/bosssecretary) | Boss/secretary screening groups, permitted direct callers, and feature-code toggling. |
| [ ] | [Bulk Dial Patterns (`bulkdialpatterns`)](https://github.com/FreePBX-ContributedModules/bulkdialpatterns) | Batch-insert dial patterns into outbound routes. |
| [ ] | [Capture Groups (`capturegroups`)](https://github.com/FreePBX-ContributedModules/capturegroups) | Subscribe extensions to ringing contexts and capture/pick up those calls. |
| [ ] | [CDR Cost (`cdrcost`)](https://github.com/FreePBX-ContributedModules/cdrcost) | Define destination tariffs and assign calculated costs to CDR records. |
| [ ] | [chan_sccp (`chan_sccp`)](https://github.com/FreePBX-ContributedModules/chan_sccp) | Integrate/configure the legacy `chan-sccp-b` channel driver. |
| [ ] | [Caller-ID Popup (`cidpopup`)](https://github.com/FreePBX-ContributedModules/cidpopup) | Send answered-call caller ID to SugarCRM for agent desktop popups. |
| [ ] | [Caller Location Routing (`cidroute`)](https://github.com/FreePBX-ContributedModules/cidroute) | Route inbound calls by caller geography; bundled data was Australia-specific. |
| [ ] | [Contact Directory (`contactdir`)](https://github.com/FreePBX-ContributedModules/contactdir) | Configure external servers from which users can import contacts. |
| [ ] | [Customer Database (`customerdb`)](https://github.com/FreePBX-ContributedModules/customerdb) | Store customer identity/address/account, SIP-or-DID assignment, device, network, and credential records. |
| [ ] | [Database Editor (`dbeditor`)](https://github.com/FreePBX-ContributedModules/dbeditor) | Directly edit Asterisk/FreePBX database values; a high-risk administrative tool. |
| [ ] | [Directory Pro (`directorypro`)](https://github.com/FreePBX-ContributedModules/directorypro) | Add LumenVox-backed speech recognition to dial-by-name directories. |
| [ ] | [External Audio (`extaudio`)](https://github.com/FreePBX-ContributedModules/extaudio) | Configure external audio connections for radio feeds and public-address systems. |
| [ ] | [Extension Config (`extcfg`)](https://github.com/FreePBX-ContributedModules/extcfg) | Legacy extension view/editor for DND, call waiting, forwarding, registration/device state, and YAC popup address. |
| [ ] | [Language Packs (`fw_langpacks`)](https://github.com/FreePBX-ContributedModules/fw_langpacks) | Deliver translation updates independently from individual module releases. |
| [ ] | [Google Voice (`googlevoice`)](https://github.com/FreePBX-ContributedModules/googlevoice) | Manage legacy Google Voice accounts as trunks. |
| [ ] | [Grammar (`grammar`)](https://github.com/FreePBX-ContributedModules/grammar) | Configure speech recognition for extensions, IVR, VmX, ring groups, voicemail blasts, and paging. |
| [ ] | [H.323 (`h323`)](https://github.com/FreePBX-ContributedModules/h323) | Configure the legacy NuFone/Open H.323 driver, bind/port, QoS, codecs, and globals. |
| [ ] | [Import Extensions (`importextensions`)](https://github.com/FreePBX-ContributedModules/importextensions) | Import extension/device accounts from CSV. |
| [ ] | [Inventory Database (`inventorydb`)](https://github.com/FreePBX-ContributedModules/inventorydb) | Track phone assets, employee/location assignment, extension, MAC/serial/IP, PBX, and deployment data. |
| [ ] | [IRC (`irc`)](https://github.com/FreePBX-ContributedModules/irc) | Embedded IRC client for live community/developer support. |
| [ ] | [IVR Pro (`ivrpro`)](https://github.com/FreePBX-ContributedModules/ivrpro) | Speech-recognition IVR extension with customizable invalid/timeout failovers. |
| [ ] | [Key Lock (`keylock`)](https://github.com/FreePBX-ContributedModules/keylock) | PIN/feature-code lock an extension so it can dial only configured destinations. |
| [ ] | [Language Status (`languagestatus`)](https://github.com/FreePBX-ContributedModules/languagestatus) | Report translated-string coverage for each language. |
| [ ] | [LDAP Caller-ID Lookup (`ldapcidlookup`)](https://github.com/FreePBX-ContributedModules/ldapcidlookup) | Caller-ID lookup through LDAP plus MySQL, HTTP, ENUM, and phonebook sources. |
| [ ] | [mISDN (`misdn`)](https://github.com/FreePBX-ContributedModules/misdn) | Configure legacy mISDN global settings and ISDN hardware channels/groups. |
| [ ] | [Missed Call Notify (`missedcallnotify`)](https://github.com/FreePBX-ContributedModules/missedcallnotify) | Notify users when they miss qualifying calls. |
| [ ] | [Motif (`motif`)](https://github.com/FreePBX-ContributedModules/motif) | Manage Google Voice trunks through legacy `chan_motif`. |
| [ ] | [Noojee (`noojee`)](https://github.com/FreePBX-ContributedModules/noojee) | Configure Noojee Receptionist/Fax/Click destinations, AMI accounts, and supporting dialplan. |
| [ ] | [ODBC Admin (`odbcadmin`)](https://github.com/FreePBX-ContributedModules/odbcadmin) | Administer ODBC connectivity and user configuration. |
| [ ] | [Panel (`panel`)](https://github.com/FreePBX-ContributedModules/panel) | Configure an operator-panel layout. |
| [ ] | [PHPAGI Config (`phpagiconf`)](https://github.com/FreePBX-ContributedModules/phpagiconf) | Configure PHPAGI debugging/errors, host/temp paths, Festival TTS, and Asterisk API connection settings. |
| [ ] | [QueueMetrics (`queuemetrics`)](https://github.com/FreePBX-ContributedModules/queuemetrics) | Integrate QueueMetrics, including logging IVR selections into queue logs. |
| [ ] | [REST API (`restapi`)](https://github.com/FreePBX-ContributedModules/restapi) | Legacy RESTful PBX API. |
| [ ] | [Route Permissions (`routepermissions`)](https://github.com/FreePBX-ContributedModules/routepermissions) | Per-extension outbound-route allow/deny policy backed by an always-available database. |
| [ ] | [SCCP Manager (`sccp_manager`)](https://github.com/FreePBX-ContributedModules/sccp_manager) | Manage SCCP phones and extensions. |
| [ ] | [Silent Monitor (`silentmonitor`)](https://github.com/FreePBX-ContributedModules/silentmonitor) | Supervisor feature codes for ChanSpy silent-listen and whisper modes. |
| [ ] | [SIP Comment (`sipcomment`)](https://github.com/FreePBX-ContributedModules/sipcomment) | Add an administrative comment field to legacy SIP devices. |
| [ ] | [Smart Routes (`smartroutes`)](https://github.com/FreePBX-ContributedModules/smartroutes) | Database-driven inbound/skills routing, SIP-to-TDM gateway decisions, variable transforms, and caller/DID normalization. |
| [ ] | [Telemarketer Torture (`teletorture`)](https://github.com/FreePBX-ContributedModules/teletorture) | Route nuisance callers into an endless IVR. |
| [ ] | [Text to Speech (`texttospeech`)](https://github.com/FreePBX-ContributedModules/texttospeech) | Legacy text-to-speech call-flow destinations and generated prompts. |
| [ ] | [Tweet2Call (`tweet2call`)](https://github.com/FreePBX-ContributedModules/tweet2call) | Poll specially formatted Twitter direct messages and originate calls; obsolete/high-risk integration. |
| [ ] | [User Panel Tab (`userpaneltab`)](https://github.com/FreePBX-ContributedModules/userpaneltab) | Add a menu entry that launches the legacy ARI User Panel. |
| [ ] | [User Sets (`usersets`)](https://github.com/FreePBX-ContributedModules/usersets) | Define reusable permitted-user sets for consumers such as outbound routes. |
| [ ] | [Voicemail Admin (`vmailadmin`)](https://github.com/FreePBX-ContributedModules/vmailadmin) | Administer voicemail independently from user administration. |
| [ ] | [Wake Up (`wakeup`)](https://github.com/FreePBX-ContributedModules/wakeup) | Schedule and provide wake-up calls. |
| [ ] | [Weather (`weather`)](https://github.com/FreePBX-ContributedModules/weather) | Provide a dialable spoken weather report. |

### Non-module repository in the contributed organization

| Repository | Evidence/treatment |
|---|---|
| [gateway](https://github.com/FreePBX-ContributedModules/gateway) | The default branch contains only a one-line README and no root `module.xml`; capability is unestablished, so it is not counted among the 63 installable module repositories. |

The contributed-org arithmetic is **8 manifest overlaps + 1 currently documented non-manifest module + 6 deprecated-family matches + 48 historical/unlisted modules = 63 installable modules**, plus `gateway` = 64 repositories.

## Part V — Legacy, deprecated, unlisted, and internal projects

### Officially deprecated feature families plus legacy High Availability

The first 15 rows come from Sangoma's official Deprecated Modules index. The final FreePBX High Availability row is an additional commercial-guide item whose own guide says it is unsupported on FreePBX 14 and later. All are historical compatibility/migration references, not default adoption commitments; prefer the stated modern replacement.

| Track | Deprecated family | Historical capability | Replacement or decision |
|---|---|---|---|
| [ ] | [Bulk DIDs](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41517373/PBX+GUI+-+Bulk+DIDs+Module) | Legacy mass DID import. | Bulk Handler / transactional import |
| [ ] | [Bulk Extensions](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41746549/PBX+GUI+-+Bulk+Extensions) | Legacy mass extension import. | Bulk Handler / transactional import |
| [ ] | [Camp-On](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41615582/PBX+GUI+-+Camp-On+Module+-+User+Guide) | Request callback/camp-on for an unavailable called party. | Independently assess as a modern call feature |
| [ ] | [Magic Button](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41746577/PBX+GUI+-+Magic+Button) | Legacy phone/PBX convenience workflow. | No adoption without a current use case |
| [ ] | [User Control Panel / ARI](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41746591/PBX+GUI+-+User+Control+Panel+ARI) | Old ARI-era user portal. | Modern least-privilege user portal |
| [ ] | [XactView / iSymphony](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35521337/PBX+GUI+-+XactView+iSymphony) | Legacy operator-panel integration. | Current operator/reception console design |
| [ ] | [Bria Cloud Solutions](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/20840524/PBX+GUI+-+Bria+Cloud+Solutions) | Bria cloud softphone provisioning/integration. | Provider-neutral softphone provisioning |
| [ ] | [Sangoma Addons](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/20709908/PBX+GUI+-+Sangoma+Addons) | Obsolete add-on installer/aggregator. | Ding's reviewed update/plugin model |
| [ ] | [Java SSH](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/20644608/PBX+GUI+-+Java+SSH+Module) | Obsolete SSH dependency. | No adoption; use bounded native control-plane transports |
| [ ] | [Sangoma Phones](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26083461/PBX+GUI+-+Sangoma+Phones+Module+Depreciated) | Retired Sangoma-phone configuration. | Current endpoint provisioning design |
| [ ] | [General Settings](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26575017/PBX+GUI+-+General+Settings+2.10+and+lower) | Pre-2.11 monolithic settings page. | Settings remain with their owning domains |
| [ ] | [Bulk Phone Restart](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/202473479/PBX+GUI+-+Bulk+Phone+Restart+Module) | Mass SIP-NOTIFY phone restart. | Reviewed endpoint bulk action with capability checks |
| [ ] | [XMPP Chat Management](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/25952518/PBX+GUI+-+XMPP+Chat+Management) | Prosody/XMPP administration. | No adoption unless a maintained messaging requirement exists |
| [ ] | [PBX Vega Management](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/35848193/PBX+GUI+-+PBX+Vega+Management+Module) | Sangoma Vega gateway integration. | Provider-neutral gateway management if demanded |
| [ ] | [Asterisk Phonebook](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/18285445/PBX+GUI+-+Asterisk+Phonebook+Module) | Legacy phonebook/caller-ID/speed-dial records. | Contact Manager plus current speed-dial design |
| [ ] | FreePBX High Availability | Legacy DRBD/Pacemaker cluster. | Advanced recovery architecture; do not revive unsupported implementation |

FreePBX 17 documentation also identifies Zulu, CxPanel/iSymphony, and XMPP as removed/deprecated product areas. Preserve import/read-only migration only if real installations require it.

### Official public module repositories absent from the live FreePBX 17 manifest

An official repository exists, but current Module Admin availability is unconfirmed. Treat these as source-confirmation or migration items.

| Track | Repository | Historical or potential capability | Initial decision |
|---|---|---|---|
| [ ] | [cxpanel / iSymphonyV3](https://github.com/FreePBX/cxpanel) | Operator-panel configuration. | Deprecated/migration only |
| [ ] | [dbmanager](https://github.com/FreePBX/dbmanager) | Legacy backup database manager. | Superseded; no default adoption |
| [ ] | [digium_phones](https://github.com/FreePBX/digium_phones) | Digium phone configuration. | Legacy vendor provisioning |
| [ ] | [digiumaddoninstaller](https://github.com/FreePBX/digiumaddoninstaller) | Legacy Digium add-on installation. | Do not adopt installer model |
| [ ] | [dundicheck](https://github.com/FreePBX/dundicheck) | DUNDi lookup registry. | Confirm current interoperability need |
| [ ] | [pbdirectory](https://github.com/FreePBX/pbdirectory) | Phonebook-backed dial-by-name directory. | Fold requirements into Directory/Contacts |
| [ ] | [phonebook](https://github.com/FreePBX/phonebook) | Phonebook, caller-ID lookup, and speed-dial data. | Deprecated; fold into Contact Manager |
| [ ] | [restart](https://github.com/FreePBX/restart) | Bulk SIP-NOTIFY phone restart. | Deprecated; use reviewed endpoint action |
| [ ] | [speeddial](https://github.com/FreePBX/speeddial) | Speed-dial functions. | Confirm need; integrate with contacts/features |
| [ ] | [xmpp](https://github.com/FreePBX/xmpp) | Prosody/XMPP management. | Deprecated |
| [ ] | [freepbx-gh-test](https://github.com/FreePBX/freepbx-gh-test) | Development/CI test module. | Not a product feature |

### Documentation-only/provider features not established in the live roster

Older/current PBX GUI navigation documentation also names SMS Plus, SMS Webhook, and VoIP Innovations. Treat them as provider-integration research items rather than current open-source modules:

- [ ] HIST-PROVIDER-001 — SMS Plus end-user messaging capability; reconcile with the current proprietary `sms` package before designing.
- [ ] HIST-PROVIDER-002 — SMS Webhook inbound/outbound event integration with authentication, signatures, replay protection, rate limits, delivery status, and privacy controls.
- [ ] HIST-PROVIDER-003 — VoIP Innovations account, trunk, DID, messaging, and provider-status integration; confirm whether a current supported API/product still exists before adoption.

### Developer, library, distribution, and infrastructure repositories

These official public repositories are not ordinary PBX feature modules and must not inflate the feature count:

| Project | Purpose | Ding treatment |
|---|---|---|
| [`.github`](https://github.com/FreePBX/.github) | Organization profile/shared metadata. | No product feature |
| [devtools](https://github.com/FreePBX/devtools) | Developer tooling. | Evaluate only for developer workflow concepts |
| [figlet](https://github.com/FreePBX/figlet) | PHP text-rendering library. | No product feature |
| [freepbx-ci-actions](https://github.com/FreePBX/freepbx-ci-actions) | Shared CI workflows/actions. | No runtime feature |
| [freepbx-gh-test](https://github.com/FreePBX/freepbx-gh-test) | Test module. | No product feature |
| [freepbx-module-generator](https://github.com/FreePBX/freepbx-module-generator) | Module scaffolding generator. | Reference only if Ding creates a plugin SDK |
| [freepbxlocalization](https://github.com/FreePBX/freepbxlocalization) | Archived localization corpus. | Do not copy; Ding needs its own complete catalog |
| [issue-tracker](https://github.com/FreePBX/issue-tracker) | Public issue tracker. | No runtime feature |
| [php-ssh](https://github.com/FreePBX/php-ssh) | Experimental PHP SSH library. | Do not adopt by default |
| [security-reporting](https://github.com/FreePBX/security-reporting) | Security-reporting infrastructure. | Research only; not a current public module package |
| [simpleCalDAV](https://github.com/FreePBX/simpleCalDAV) | CalDAV client library. | Calendar implementation dependency decision only |
| [sng_freepbx_debian_install](https://github.com/FreePBX/sng_freepbx_debian_install) | FreePBX 17 Debian installer. | No Ding feature; compare deployment requirements only |
| [sngfd12](https://github.com/FreePBX/sngfd12) | Debian FreePBX ISO build tooling. | No Ding feature; compare installer evidence only |

## Part VI — Core persistence and integration ownership

An implementation must migrate behavior and invariants, not blindly reproduce FreePBX tables. These records define the audited Core domain and therefore the minimum import/export and migration coverage.

| Adopt | FreePBX Core-owned record set | Capability/data represented | Ding design requirement |
|---|---|---|---|
| [ ] | `trunks` | Technology, name, caller ID, keep-CID policy, channel limits, failure/prefix/context/provider, disabled/continue/show flags. | Typed trunk model with secrets separated from ordinary data |
| [ ] | `pjsip` | PJSIP trunk key/value settings. | Typed PJSIP trunk ownership and backup |
| [ ] | `sip` | Shared endpoint storage for PJSIP and legacy chan_sip devices, plus legacy chan_sip trunk peer/user/register rows. | Explicit cross-domain ownership; chan_sip rows are migration-only on modern Asterisk |
| [ ] | `dahdi` | DAHDI device/trunk key/value settings. | Hardware-aware typed records |
| [ ] | `iax` | IAX endpoint/trunk key/value settings. | Typed IAX records with secret handling |
| [ ] | `indications_zonelist` | Country/tone-zone choices. | Read from the real runtime/catalog with provenance |
| [ ] | `devices` | Device ID, technology, dial string, fixed/ad-hoc mapping, description, emergency CID, hint override. | Endpoint/device entity and user mapping |
| [ ] | `users` | Extension identity, passwords, names, voicemail, timers, recording, outbound CID, aliases, destinations, prefixes, MOH. | User/extension entity with secure credential separation |
| [ ] | `incoming` | Inbound DID/CID match, destination, privacy, signaling, MOH, prefix, delay, priority, volume, and tone zone. | Typed inbound-route entity |
| [ ] | `dahdichandids` | DAHDI channel-to-DID mappings. | Hardware-channel DID entity |
| [ ] | `outbound_route_patterns` | Route prepend/prefix/match/caller-ID patterns. | Ordered validated pattern children |
| [ ] | `outbound_route_sequence` | Outbound route priority/order. | Transactional stable ordering |
| [ ] | `outbound_route_trunks` | Ordered route-to-trunk assignments. | Transactional failover sequence |
| [ ] | `outbound_routes` | Route identity, caller-ID policy, PIN, type flags, MOH, time/calendar, congestion destination. | Typed outbound-route entity |
| [ ] | `outbound_route_email` | Notification trigger, sender, recipient, subject, and body. | Notification policy with secret/PII-safe audit |
| [ ] | `trunk_dialpatterns` | Trunk-level number manipulation. | Validated ordered trunk patterns |
| [ ] | `emergencydevices` | Emergency-only SIP/PJSIP endpoint records. | Explicit emergency endpoint class and validation |
| [ ] | Asterisk AstDB families | User/device maps, call waiting, forwarding, DND, hints, voicemail aliases, recording and runtime state. | Separate desired configuration from observed runtime state and rebuild deterministically |

## Part VII — Suggested Ding information architecture

This is a placement map, not an implementation sequence. It keeps FreePBX concepts inside Ding's product language instead of reproducing the FreePBX menu hierarchy.

| Ding destination | Adopt or extend with |
|---|---|
| PBX / Dashboard | System dashboard, Asterisk info, alarms, current calls, service health, capacity, and real unread/failure states |
| PBX / Live channels | Channel/bridge/endpoint activity, transfer/park/queue state, safe live actions, call trace |
| PBX / Endpoints | Extensions, users, devices, PJSIP/IAX2/DAHDI/Custom/Virtual settings, forwarding, DND, waiting, follow-me, presence, emergency CID |
| PBX / Trunks | All current trunk types, registration/authentication, codecs, dial manipulation, usage, runtime enable/disable, migrations |
| PBX / Routing | Inbound routes, outbound routes, DAHDI DIDs, route ordering, time/calendar gates, congestion destinations, notifications |
| PBX / Dialplan | Destination registry, graph, custom applications/destinations, Set CallerID, announcements, callbacks, DISA, dynamic routes |
| PBX / IVR & Directory | IVRs, announcements, directory, prompts, direct dialing, retries/timeouts, destinations |
| PBX / Groups | Ring groups, Follow Me, paging/intercom, voicemail blasts, queue priority |
| PBX / Queues | Full queue/agent configuration, runtime, virtual queue/callback concepts, reports |
| PBX / Call features | Feature codes, forwarding, call waiting, DND, parking, pickup, transfer, flow control, blacklist/allowlist, PIN sets |
| PBX / Scheduling | Time groups/conditions, calendars, wake-up calls, scheduled pages/reminders |
| Media / Voicemail | Mailboxes, greetings, storage, notifications, VmX, blast groups, reports |
| Media / Conferences | Conference rooms, participant policy, recordings, user controls |
| Media / Recordings | System prompts, call recording policy/reports, upload/record/audition/convert, retention |
| Media / Music on hold | Categories, files/streams, audition, conversion, ordering, usage |
| Media / Languages & TTS | Sound packages, call language, TTS engines, rendered TTS destinations |
| Media / Fax | Fax settings, inbound/outbound fax, documents, email, delivery status |
| Media / Codecs & RTP | Global and endpoint/trunk codec policy, translation, RTP, ICE, SRTP/DTLS, media diagnostics |
| Data / CDR & CEL | Search, event correlation, exports, authorized recording access, call-accounting concepts |
| Data / APIs & Events | AMI, ARI, REST/GraphQL-equivalent APIs, users/clients/scopes, event stream, webhooks |
| Data / Integrations | Caller-ID lookup/Superfecta, CRM, PMS, storage, calendar, SMS, provider integrations |
| Data / Import & Export | Bulk Handler, dry run, validation, conflict resolution, rollback, redacted evidence |
| System / Security | ACLs, certificates, TLS, firewall, weak-password checks, MFA, SAML, authentication policy |
| System / Telephony settings | SIP/PJSIP, IAX, DAHDI, HTTP/WebSocket, indications, feature maps, advanced settings |
| System / Runtime | Asterisk modules, services/processes, CLI, logs, configuration generation, reload/apply status |
| App / Administration | Administrators, identities, roles/groups, permissions, localization, appearance, notifications, support |
| App / History & Backup | Transaction history, resource backups, scheduled whole-domain backup, restore, migration, recovery |
| App / Deploy & Servers | Multi-server inventory, runtime lifecycle, provisioning, update, recovery target, hosted/ISO deployment |
| Separate user portal | Least-privilege voicemail, calls, contacts, presence, phone settings, WebRTC, approved self-service features |

The Agent rail remains Ding-specific. Ordinary PBX administration must not be placed there merely because no current destination exists.

## Part VIII — Definition of done for every checklist item

No feature or module row may be checked until all applicable conditions below are true:

- [ ] DONE-001 — The source behavior or external contract is linked to a pinned version and its dependencies/conditions are recorded.
- [ ] DONE-002 — Product scope states what is implemented, deliberately different, unsupported, legacy-only, commercial/provider-dependent, or out of scope.
- [ ] DONE-003 — The information model distinguishes configured, generated, observed, unavailable, stale, and unread values.
- [ ] DONE-004 — The UI includes loading, empty, unavailable, permission-denied, dependency-missing, version-unsupported, validation, conflict, partial-failure, rollback, and success states.
- [ ] DONE-005 — Every displayed value comes from a real read; unread cells are `—` with the exact reason.
- [ ] DONE-006 — No sample, demo, simulated, or fabricated content can reach a user-facing build.
- [ ] DONE-007 — Inputs are typed, length/range/pattern validated, normalized, and safely encoded at every boundary.
- [ ] DONE-008 — Network and process operations are allowlisted, bounded, timed out, cancellable, and protected from command concatenation/injection.
- [ ] DONE-009 — Secrets use the operating-system credential store and are redacted from UI readback, logs, diffs, backups, exports, screenshots, and errors.
- [ ] DONE-010 — Writes provide preview/diff, impact and reload/restart disclosure, explicit confirmation, backup, atomic apply where possible, post-read verification, rollback, and local history.
- [ ] DONE-011 — Destructive actions show exact affected objects and dependencies and require a reviewable confirmation.
- [ ] DONE-012 — Permissions are enforced in the control plane as well as hidden/disabled in the UI.
- [ ] DONE-013 — The UI is keyboard-complete, screen-reader labeled, focus visible, contrast compliant, reduced-motion aware, and responsive.
- [ ] DONE-014 — Every user-facing string, option, help text, warning, and error is localizable; locale/time-zone/number formatting is tested.
- [ ] DONE-015 — Positive tests cover the normal workflow and readback; deliberate negative regressions prove validators and guards turn red.
- [ ] DONE-016 — Tests cover absent optional modules, missing binaries/files/permissions, unsupported Asterisk versions, corrupt/stale state, conflicts, and interrupted operations.
- [ ] DONE-017 — Real disposable-exchange evidence covers reads and writes; production safety remains documented separately.
- [ ] DONE-018 — The per-surface and design-parity inventories, ROADMAP factual checklist, and HANDOFF evidence are updated without claiming unrun checks.
- [ ] DONE-019 — Generated renderer output is changed only by editing the design reference and recompiling; generated files are never hand-edited.
- [ ] DONE-020 — Licensing, trademarks, provider terms, privacy, recording/consent, emergency calling, accessibility, and export/compliance implications are reviewed where applicable.

## Audit evidence

### Supplied Core snapshot

The atomic audit covered the complete user-facing Core page set:

- `page.extensions.php`
- `page.users.php`
- `page.devices.php`
- `page.did.php`
- `page.dahdichandids.php`
- `page.routing.php`
- `page.trunks.php`
- `page.advancedsettings.php`
- `page.ampusers.php`
- `page.astmodules.php`
- `export.html.php`

It also covered `module.xml`, `Core.class.php`, `functions.inc.php`, every endpoint driver, the outbound-routing and DAHDI components, views and JavaScript behavior, dialplan classes/macros, AGIs, the FastAGI implementation, the transfer-event listener, active and inactive API classes, backup/restore classes, console commands, templates, install/upgrade logic, database declarations, hooks, and log rotation.

Primary upstream source links pinned to the audited commit:

- [Core module metadata and schema](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/module.xml)
- [Core domain/service implementation](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/Core.class.php)
- [Core dialplan/configuration generation](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/functions.inc.php)
- [Core install, feature codes, settings, and migrations](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/install.php)
- [PJSIP driver](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/functions.inc/drivers/PJSip.class.php)
- [Legacy chan_sip driver](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/functions.inc/drivers/Sip.class.php)
- [IAX2 driver](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/functions.inc/drivers/Iax2.class.php)
- [DAHDI driver](https://github.com/FreePBX/core/blob/c844adb4cdea1042e0e966d1e596d3c27664443d/functions.inc/drivers/Dahdi.class.php)
- [Active API directory](https://github.com/FreePBX/core/tree/c844adb4cdea1042e0e966d1e596d3c27664443d/Api)
- [Backup and restore implementation](https://github.com/FreePBX/core/tree/c844adb4cdea1042e0e966d1e596d3c27664443d/Backup)
- [Console commands](https://github.com/FreePBX/core/tree/c844adb4cdea1042e0e966d1e596d3c27664443d/Console)

### Wider ecosystem sources

- [Live FreePBX 17 module manifest](https://mirror.freepbx.org/all-17.0.xml)
- [Official FreePBX GitHub repositories](https://github.com/orgs/FreePBX/repositories)
- [FreePBX Community Supported Modules guide](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/131694652/PBX+GUI+-+Community+Supported+Modules)
- [FreePBX-ContributedModules repositories](https://github.com/FreePBX-ContributedModules)
- [Sangoma Standard Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/18874569/PBX+GUI+-+Standard+Modules)
- [Sangoma Applications Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/21135611/Applications+Modules)
- [Sangoma Connectivity Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/24641749/Connectivity+Modules)
- [Sangoma Admin Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/18710823/Admin+Modules)
- [Sangoma Reports Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/25788713/)
- [Sangoma Settings Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26738760/PBX+GUI+-+Settings+Modules)
- [Sangoma Commercial Module Guides](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/22478862/PBX+GUI+-+Module+Guides)
- [Sangoma Deprecated Modules index](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/41812064/PBX+GUI+-+Deprecated+Modules)
- [FreePBX 17 overview](https://sangomakb.atlassian.net/wiki/spaces/FP/pages/222101505)
- [FreePBX 17 FAQ and chan_sip/deprecation guidance](https://sangomakb.atlassian.net/wiki/spaces/FP/pages/279052296/FreePBX+Open+Source+-+Version+17+FAQ)

## Maintenance policy

Update this file when any of the following changes:

- the pinned Core source version or audited commit;
- the live FreePBX 17 module manifest or the official/community-linked repository censuses;
- an official module's support tier, source availability, licensing, deprecation, or documented contract;
- a Ding surface, route, control binding, reader, writer, resource, action, verification result, or product boundary;
- a capability is split, merged, deliberately rejected, or checked complete.

When updating the wider ecosystem, record the census date and reconcile the mirror, official GitHub organization, community-supported guide and contributed organization, commercial guide, and deprecated guide again. When checking an atomic item, add its exact Ding evidence to the repository's factual inventories rather than replacing this source-backed catalog with an intention-only summary.
