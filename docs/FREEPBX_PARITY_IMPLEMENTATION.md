# FreePBX Parity Implementation

This document tracks the expansion of Ding PBX Console toward FreePBX-style administration while preserving Ding's Electron architecture, compiled Material 3 design system, local-first safety boundary, and Asterisk-native configuration model.

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

The PBX Admin catalogue now contains the current Standard Module menu names across:

- Applications
- Connectivity
- Administration
- Reports
- Settings

Asterisk-backed configuration tasks remain PBX Admin generic/M3 destinations. Standard-module tasks for which Ding already has a richer live implementation route into the existing Ding destination instead of cloning it (for example Dashboard, Endpoints, Trunks, Queues, AMI/ARI, Modules, Logger, CLI, Deploy & servers, Voicemail, Music on hold, Codecs & RTP, About and Call records).

### Asterisk writable capability

The bounded writable configuration surface is **47 resources**. The renderer mirrors the same list and a regression test requires every resource to remain represented by at least one PBX Admin task.

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
