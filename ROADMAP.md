# Ding PBX delivery roadmap

## 2026-08-23 integration lane

- [x] Mount addressable converter, Ollama, offline docs, and changelog surfaces through `console/app/renderer/src/main.tsx` and `surface-mounts.tsx`.
- [x] Register the converter catalog and PDF capability read seam in the local control plane, with unavailable picker and queue operations reported explicitly.
- [x] Keep the Ollama mount honest when its privileged dispatcher is not registered, with no model, health, pull, chat, harness, or sample values assumed.
- [x] Record converter and Ollama desktop and site rows as `implemented-unverified` in the feature registries and generated completeness matrix.
- [ ] Mount and verify the Status Hub and browser-extension transfer clients. The implementation is on `codex/mount-status-downloads`, including native destination approval, bounded transfer deadlines, durable Range pause/resume, startup reconciliation, strict persisted-state validation, retryable publication, and dedicated always-on-top windows with the primary shell limited to passive open-window actions. Tests, build, runtime interaction, extension handoff, and captures remain pending. Status Hub availability depends on `STATUS_HUB_URL`; transfer state is persisted in `download-transfers.json`.
- [ ] Register the remaining converter queue and file-picker handlers, then register the full local Ollama dispatcher and run the focused built-artifact verification.

## Delivery foundation

- [x] Add a pinned, digest-verified, user-scoped Windows dependency bootstrap.
- [x] Add touchless and interactive root build entry points.
- [x] Add unsigned Squirrel.Windows package verification for `Setup.exe`, `RELEASES`, and full packages.
- [x] Replace inherited test and administration workflows with separate build/package/release and Pages publication workflows.
- [x] Add unique release tags, workflow timing, SHA-256 records, safe failure artifacts, and runner fallback.
- [x] Add a reproducible committed line counter with project, generated, and inherited-source attribution.

## Design parity

- [x] Compile the checked-in design reference into the renderer instead of hand-writing an approximation of it.
- [x] Guard the compiled output against drift with a byte-identical recompile check.
- [x] Reproduce every audited declarative binding in the compiled renderer.
- [x] Bundle the design's type and icon families locally so the renderer fetches nothing at runtime.
- [x] Derive the navigation catalogue, the documentation set, and the static site catalogue from the design rather than from three divergent hand-written lists.
- [ ] Add reference-versus-built captures and visual diffs, so destinations can move from `compiled` to `verified`.

## Real readings, no sample data

- [x] Read live channels, endpoints, contacts, registrations, queues, modules and uptime from allowlisted read-only Asterisk CLI commands.
- [x] Draw the dialplan canvas from the target's own `dialplan show` output.
- [x] Remove the design's sample rows, dashboard tiles, health bars, nav badges, history, agent-rail and trunk-authentication content from the running app.
- [x] State the exact reason a surface is empty instead of showing an invented value.
- [ ] Read per-endpoint transport and codecs, so those columns stop reading `—`.
- [ ] Wire real sources for the history, agent and trunk-authentication surfaces.
- [ ] Verify every reading against a live Asterisk target.

## Evidence and completeness

- [x] Record the independent design audit's source hash and exact aggregate counts.
- [x] Add fail-closed schema and completeness validators.
- [x] Add deliberate red-then-green negative regression scripts.
- [ ] Map all 32 audited destinations to final reference routes, product routes, and built-artifact captures after integration.
- [ ] Replace every unverified per-surface inventory field with merged implementation, documentation, localization, local-check, interaction, and capture evidence. Measured position: **0 of 88 rows verified**, and all 528 claimed artifacts (88 rows x 6) are absent, with four of the seven evidence directories not yet created. This is the largest open item in the project.
- [x] Make the completeness check resolve its evidence templates and require the artifacts to exist, so a row cannot claim `verified` without them, with a red-then-green negative regression proving it refuses false claims rather than refusing everything.
- [x] Download the design reference's complete 49-face font set from its own stylesheet URL, preserving every weight and `unicode-range`, replacing package substitutes that covered only a fraction of it.
- [x] Audit the design compiler attribute-by-attribute and confirm 100% of the design specification reaches the renderer; record that `design/support.js` is design-tool editor machinery rather than missing runtime.
- [x] Remove private vocabulary from every shipped and published surface, and add a hand-written-list guard with a planted-term negative regression so a new term cannot arrive unnoticed.
- [x] Create, verify, stop and remove the console's own WSL distribution from the packaged Asterisk payload, replacing a `server.provision-bundled` action that was declared and implemented nowhere.
- [x] Make the confirmation flow dispatch the command it guards and report the real outcome, including refusals, instead of announcing success without calling anything.

## Canonical surface completeness matrix

- [x] Replace the two-aggregate-surface model with a versioned hand-written canonical feature and requirement set independent of source discovery.
- [x] Enumerate the desktop shell, login and setup routes, 32 desktop destinations, 17 dialog or secondary-window states, six top-level site pages, 82 generated documentation routes, and Start, progress, and completion browser-extension states.
- [x] Keep all 44 canonical features required on every surface, including local file conversion and the local Ollama suite manager, with no exemptions.
- [x] Add exact implementation and registration symbol records, route, documentation, localization, persistence, provenance, focused-check, negative-evidence, built-interaction, capture, and design-parity fields to every row.
- [x] Add exact-boundary negative regressions for missing features and pages, renamed or commented symbols, stale commits, missing evidence, route-only claims, fake success, and sample data.
- [ ] Run the matrix validators and capture proof on the integrated default branch. This remains unverified because the current delivery lane explicitly did not run validators or captures.

## Attention runtime

- [x] Mount the five independent attention modes from durable settings, add live desktop consumers, persist the user-selected next action, acknowledge serialized durable writes, persist redacted warning and error history with corrupt-state recovery, pass explicit notification severity, wire the exact six-row Chut into inventory validation, and route exact mutation actions through one generated callback without treating navigation or reads as changes. Status: implemented-unverified in `codex/mount-attention-runtime`; the design compiler ran, but no built-artifact or UI evidence was collected in that lane.
- [ ] Run focused built-artifact verification for attention restoration, focus dimming, low stimulation, time awareness, one thing at a time, Momentum snooze, keyboard access, and reduced-motion behavior.

## Cover Asterisk's real capability surface

A survey against this checkout measured the console at roughly **12%** of Asterisk's
configurable surface: 106 shippable sample configuration files, about 13 the console
could name. The owner's direction is that every gap below is closed, partials included.

**Foundation — done.** The control plane no longer limits this: writable resources went
from 10 files to 41 and read-only commands from 23 to 63, every name verified against the
Asterisk sources by a test that refuses an invented one. A new destination needs no change
to the control plane.

### Major gaps — no destination exists at all

- [ ] **Access control rules** (`acl.conf`) — the highest-value gap by far. SIP scanning is constant and toll fraud is the expensive failure; the security screen currently edits no rule at all.
- [ ] **Sound prompt management** — upload, list, audition and remove prompts. Every IVR and voicemail screen references prompts it cannot create.
- [ ] **TLS and certificate management** (`http.conf` TLS, PJSIP transport certificates, STIR/SHAKEN keys) — every other screen assumes certificates that nothing can install or rotate.
- [ ] **Hardware trunks** (`chan_dahdi.conf`) — analogue lines, T1/E1 and PRI.
- [ ] **Database backends and realtime** (`res_odbc.conf`, `extconfig.conf`, `sorcery.conf`, `res_pgsql.conf`, `res_ldap.conf`) — required for hosted and multi-tenant deployments.
- [ ] **Fax** (`res_fax.conf`, `udptl.conf`) — sending, receiving, T.38 gateway.
- [ ] **Channel event logging** (`cel.conf`, `cel_odbc.conf`, `cel_pgsql.conf`) — the compliance counterpart to call records.
- [ ] **Call attestation** (`stir_shaken.conf`) — profiles, certificates, verification.
- [ ] **Emergency-services location** (`geolocation.conf`) — a regulatory requirement in several jurisdictions.
- [ ] **Handset auto-provisioning** (`phoneprov.conf`) — the deployment flow asks how many phones and has nowhere to template them.
- [ ] **Feature codes and parking** (`features.conf`) — transfer, park, pickup, recording keys.
- [ ] **Shared line appearances** (`sla.conf`).
- [ ] **IAX2 trunking** (`iax.conf`) — currently only illustrative rows, which is worse than absence because it reads as configurable.
- [ ] **Configuration backup, restore and diff** across the whole tree — no safe whole-config recovery exists.
- [ ] **A live REST resource browser** — channels, bridges, applications, events, beyond a static table.
- [ ] **Dialplan scripting visibility** (AGI).
- [ ] **Distributed dialplan lookup** (`dundi.conf`).
- [ ] **Calendars** (`calendar.conf`).
- [ ] **Monitoring integration** (`res_snmp.conf`, `prometheus.conf`).
- [ ] **Directory and identity settings** (`asterisk.conf`), NAT discovery (`res_stun_monitor.conf`), messaging (`xmpp.conf`), caller display (`adsi.conf`).

### Partial gaps — a destination exists but covers a fraction

- [ ] **Security** — edits no access rule and no attestation certificate despite naming both.
- [ ] **Trunks** — PJSIP only; no IAX2, no hardware, no registration retry detail.
- [ ] **IVR** — no dialplan application depth, and prompts are names it cannot manage.
- [ ] **Logger** — level chips only; no rotation, no queue log, no per-channel configuration.
- [ ] **Modules** — no per-module reload and no dependency view.
- [ ] **Call records** — one status reading; no backend selection across the several available.
- [ ] **Manager and REST** — a static table; no live event stream and no operable actions.
- [ ] **Voicemail** — no storage backend configuration and no greeting management.
- [ ] **Codecs** — a listing only; no per-endpoint negotiation.

### How each one lands

Each destination needs: its resources in the writable list (**done for all of the above**),
its read-only commands (**done**), a screen, and control bindings mapping each control to a
real Asterisk key. The first two are finished, so the remaining work per subsystem is the
screen and its bindings.

**One honest constraint that governs all of it:** nothing here has yet written to a live
Asterisk beyond a disposable target. No configuration mutation may be described as verified
until an approved plan has run against a real exchange.

## Build the Asterisk runtime image in CI instead of on every machine

The root filesystem is produced by building a container image that compiles Asterisk from
this checkout. That takes tens of minutes, needs a working local container engine, and —
until the tar-listing defect was fixed — had never once succeeded on a developer machine,
which is why no published installer has ever carried the payload.

- [ ] Build the runtime image in the release workflow and publish it to the registry, tagged and digest-pinned by the exact source commit.
- [ ] Have the packaging step pull that image and export the root filesystem, rather than compiling Asterisk again. The application still ships the exported tar inside the installer, so nothing is pulled at run time on a user's machine and the offline guarantee is unchanged.
- [ ] Record the image digest in the existing provenance file alongside the source commit and the tar's own hash, so a shipped payload can be traced to the exact image that produced it.
- [ ] Keep the local build script working as the fallback path and prove it from a cold checkout, so a contributor without registry access is never blocked.

Expected effect: the packaging step becomes a pull and an export rather than a compile, the
payload becomes reproducible from a digest rather than from whatever a machine happened to
build, and the local toolchain stops being a prerequisite for producing a release.

## Wiring the interface to real behaviour

Position now: **16 of 32 destinations are backed by live data** and **21 control-plane
actions are implemented**. When this work began it was 7 and 3.

- [x] Implement the configuration transport `ConfigTransaction` and `StructuredConfigPlanner` require. Allowlisted absolute resource paths, content on standard input rather than in an argument, ordered entries so repeated keys survive a round trip, and a post-read mismatch that rolls back instead of reporting success.
- [x] Wire `pbx.config`, `pbx.plan` and `pbx.apply` so a change previews as a real diff against the target and commits through that path.
- [x] Read the real configuration file on every screen that declares one, and seed the bound controls from it, so a switch shows the target's setting instead of a shipped default.
- [x] Bind controls to real Asterisk keys — 82 of 130 across 13 screens, each justified by a line in Asterisk's own samples. The other 48 are deliberately unbound and each screen says how many, because a wrong binding writes the wrong setting to an exchange and looks like it worked.
- [x] Implement `history.list` and `history.restore` against the backups that path already takes.
- [x] Give ten previously unreadable destinations a real reader: voicemail, conferences, music on hold, codecs, access control, call records, logging, manager and REST, and the two system screens. Fourteen parsers, each shaped from the literal format string in Asterisk's own source rather than a guess — a guessed parser returns an empty list, which is what those screens already showed, so the defect would have been invisible.
- [x] Add media management so a screen offering a custom prompt can accept a file, refusing by name before a command is built and confirming what landed.
- [x] Add a real append-only local history where a restore is a new record rather than a rewrite.
- [ ] **Exercise an approved write plan against a real exchange.** Nothing here has yet written to anything but a disposable distribution, so no configuration change may be called verified.
- [ ] Bind the remaining 48 controls, each from a key justified in the samples, or state on the screen exactly which setting it cannot write. None may be guessed.
- [ ] Call the media, local-history and runtime actions from their screens. The actions exist; the interface does not yet reach them.
- [ ] Remove or gate `server.connect`, which is implemented in the main process and never called from the interface.

### Platform contract features delivered

Each is a logic layer with its own tests, built to be driven by a surface rather than to
be one. What remains for each is the screen that uses it.

- [x] **Authenticator** — time-based one-time passwords verified against all eighteen published specification test vectors rather than against their own expectations, plus pairing-URI build and parse. Nothing prints or characterises a secret.
- [x] **Narration** — off by default, injectable, a voice choice per language, strictly one utterance at a time, a superseded line replaced rather than stacked, ordinary narration rate-limited and an error never dropped.
- [x] **Colour engine** — every format both directions with alpha preserved or reported lossy, contrast checked against the reference pairs, out-of-gamut colours flagged before clipping, and the animated rainbow modelled as a sentinel that must never enter a palette of real colours.
- [x] **Unlock ladder** — clears the waiting and never the credential, never refunds the attempt budget, budgeted to three skips an hour because a machine can play it, single-use nonces, and a timed round that cannot be won faster than it lasts. The first two rules are structural: no field exists that could carry a token, and no code path can add budget.
- [x] **Changelog** — parsing, date and text filtering that compose, an invalid pattern reported rather than thrown, a version with nothing recorded surviving as an empty entry, and a commit reference refused unless it is a real identifier.
- [x] **Local version history** — append-only, a restore recorded as a new entry rather than a rewrite, commit messages naming what changed, and credential-shaped values redacted before they reach disk.
- [x] **Offline documentation** — all 82 articles generated into the application with a completeness check that fails the build when the bundled count and the count on disk disagree, plus search, link resolution and broken-link reporting.
- [x] **Media library** — prompts and music on hold, refusing by name before a command is built, verifying content by leading bytes where the format has any, and honest that headerless formats cannot be verified that way.

### Canvases worth building

An assessment rejected most candidates as tables wearing a costume — queues, conferences,
access rules, voicemail routing and feature codes are flat, ordered or one-to-one, and a
graph of one-to-one edges is a two-column table with extra steps. Module dependencies were
downgraded to not buildable: no Asterisk command exposes inter-module dependencies, so it
is a wish rather than a proposal. Two survived on merit.

- [ ] **Codec translation paths.** `core show translation` is literally an N×N cost matrix, so the data is already graph-shaped rather than needing graph semantics invented for it. Answers "why is this call transcoding twice" and "what is the cheapest common codec" — questions a matrix past six codecs genuinely cannot.
- [ ] **Endpoint to registration topology.** Endpoint, address-of-record, contact and registration as one chain. Answers "why can't this trunk call out", which today means cross-referencing three screens by hand; a broken link in a chain is what a graph shows and a table hides.
- [ ] Highlight time-conditional edges inside the existing dialplan canvas rather than building a second canvas for them — they are already drawn there.
- [ ] Decide whether the pre-scrub installers published before `899a3c3ecf` should be superseded or removed; their binaries carry private wording and cannot be edited. Every release from `899a3c3ecf` onward is clean.
- ~~Correct the two commit messages that carry private wording (`9beed2f159`, `899a3c3ecf`).~~ **Deliberately not doing this.** It would require rewriting published history and force-pushing, and the owner declined. Recorded here so the gap reads as a decision rather than an oversight, and so a later contributor does not rewrite shared history to close it. Every editable surface was swept instead, and a guard refuses new occurrences.
- [x] Run the built Windows console through the approved headless interaction route and record genuine packaged interaction evidence for WSL discovery.

## Release readiness

- [x] Verify `download-dependencies.bat /s` from a clean user-scoped toolchain cache.
- [x] Verify `build.bat /s` at the merged candidate commit.
- [x] Verify `build-installer.bat /s` produces an unsigned installable Squirrel.Windows set.
- [x] Bundle a complete Ubuntu WSL root filesystem containing Asterisk and every runtime dependency inside the installer.
- [x] Verify the static Pages output includes `console/site/dist/build-manifest.json` and deploys without runtime asset fetches.
- [x] Rework the static Pages home into a modern responsive marketing and documentation surface while preserving all 32 destination identifiers and honest release availability.
- [x] Split the static experience into compact Home, Product, Documentation, Downloads, Status, and Settings routes with shared local assets and anchored article navigation.
- [x] Add the local delivery workspace route with bounded append-only history, date/action/regex filters, restore-as-new-event, and redacted JSON/Markdown export.
- [x] Add the dated changelog viewer with full commit links, composed filters, copy, and Markdown export.
- [x] Add browser-mediated external editor, forge, browser-download, long-operation, recovery, and static-update equivalents with explicit capability boundaries.
- [x] Register the delivery module on every primary and generated documentation page, and document the route in the platform index.
- [x] Replace simulated browser transfer states with measured File System Access writes, explicit unsupported-browser status, and stream-close completion evidence.
- [x] Generate the site changelog from every real local tag with valid full object identifiers, and read the bundled release manifest before reporting update state.
- [x] Add strict recursive event-detail redaction, retention preview and prune events, validated date presets, searchable dropdowns, anchored regex reuse, and persisted shared route tabs.
- [x] Generate and validate all 702 tag records with exactly 89 product releases, optional upstream history, full-builder script wiring, depth-correct generated-page mounts, and a versioned release-manifest schema.
- [x] Reconcile interrupted local writes on reload, reserve the prune-event slot, scrub free-form summaries, and keep route navigation ordinary where the static host does not provide complete tab semantics.
- [x] Publish and independently verify the first unique non-draft Ding PBX Console release and downloadable assets. Verified at `ding-pbx-console-v0.0.5-r1`: non-draft, non-prerelease, target `50dad7aadbc8c8c3b79ecc844245ea977509daf3`, carrying `Ding-PBX-Console-Setup.exe` (422,853,632 bytes), `ding-pbx-console-0.1.0-full.nupkg` (422,856,987 bytes), `RELEASES`, `SHA256SUMS.txt`, and both line-count evidence files. `RELEASES` and `SHA256SUMS.txt` were downloaded and read back, and the size `RELEASES` records for the full package matches the published asset exactly.
- [ ] **Mount the Status Hub and browser-extension transfer clients** — implemented on `codex/mount-status-downloads` but not yet verified by tests, build, runtime interaction, extension handoff, or capture. Status Hub external availability remains dependent on `STATUS_HUB_URL`; transfer persistence is in `download-transfers.json`.
- [x] Add real built-artifact updater evidence for the old `0.1.0` baseline and installed `0.1.84` draft-blocked state, with source commits `745d7425df791646aef4a6972c96dcf279a6004a`, `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, and `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, exact release tags, SHA-256 image records, dimensions, hidden-desktop CDP method, direct installer launch, restart, Later persistence, and draft blocking documented in `console/docs/platform/automatic-updates-evidence.md`.
