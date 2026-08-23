# Ding PBX delivery roadmap

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

## Wiring the interface to real behaviour

Measured position: **7 of 32 destinations are backed by live control-plane data**; 3 of 9 declared actions are implemented.

- [x] Implement the configuration transport `ConfigTransaction` and `StructuredConfigPlanner` require. Ten allowlisted absolute resource paths, content on standard input rather than in an argument, ordered entries so repeated keys survive a round trip, and a post-read mismatch that rolls back instead of reporting success.
- [ ] Wire `pbx.plan` and `pbx.apply` actions onto that transport and connect the 21 configuration-editor screens to them, so a change previews as a real diff and commits through the existing backup/stage/validate/apply/post-read path. The engine and its transport are both ready; only the action wiring and the screen bindings remain.
- [ ] Exercise an approved write plan against the managed WSL distribution before describing any configuration mutation as verified against a real target. Nothing in this project has yet written to a live Asterisk.
- [ ] Implement `history.list` and `history.restore` against the same backups the transport already takes.
- [ ] Give the permanently empty table destinations (`ivr`, `voicemail`, `confbridge`, `moh`, `ami`, `sync`, `skills`, `hub`, `vocab`, `ops`, `secrets`, `notifications`) either a real reader or an empty state that distinguishes "not wired yet" from "connected and genuinely zero rows".
- [ ] Remove or gate `server.connect`, which is implemented in the main process and never called from the interface.
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
- [x] Publish and independently verify the first unique non-draft Ding PBX Console release and downloadable assets. Verified at `ding-pbx-console-v0.0.5-r1`: non-draft, non-prerelease, target `50dad7aadbc8c8c3b79ecc844245ea977509daf3`, carrying `Ding-PBX-Console-Setup.exe` (422,853,632 bytes), `ding-pbx-console-0.1.0-full.nupkg` (422,856,987 bytes), `RELEASES`, `SHA256SUMS.txt`, and both line-count evidence files. `RELEASES` and `SHA256SUMS.txt` were downloaded and read back, and the size `RELEASES` records for the full package matches the published asset exactly.
