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
- [x] Add reference-versus-built captures and visual diffs, so destinations can move from `compiled` to `verified`. **All 32 destinations now have a capture on each side, a visual diff, a region ledger and a chrome-parity record, About included**, and every one of them came from a single run per side against one build of this tree — so each destination's rectangles and its pixels are the same moment of the same render, which removes the two provenance gaps the previous pass had to argue around rather than close. **The two pieces this line named as remaining are both done.** About's 32nd record exists: the built application settled on the design's own `About` heading and was photographed, measured and compared like the other thirty-one, so the expectation recorded in item 22 is discharged. And the shell-geometry question — repaired in the application, in the design, or in the capture harness — has an answer, which is **the capture harness, twice**, because the single cause this line asserted was not one cause and two of its three parts were defects in the equipment rather than in either artifact. **One: the reference document was never given the height its own root style needs.** The design's root is `height:100%; overflow:hidden`, exactly like the built shell, and a percentage height against an auto-height body computes to `auto` — so the reference shell grew to its content, 622px to 7668px tall, and scrolled, taking 12px off the width on 20 of the 32. `design/support.js` ships that stylesheet in its own `FULL_PAGE_CSS` constant but withholds it when the export declares a `$preview`, which this one does, leaving the sizing to a frame the design tool would have supplied and this harness did not. It is now served with the hosted design, read out of `support.js`'s own declaration rather than typed. **Two: every built capture was taken behind the update banner.** The updater raises it when its background check finishes, not at startup, and the driver dismissed once before the first destination — so a whole 32-destination run was taken with the application's shell 43px down the frame, then 52px as the banner's text rewrapped for a newer version. Nothing failed and every capture looked normal. The banner is now dismissed and *proved* dismissed before every destination, and any built measurement whose shell is not at the window origin is refused outright, naming what sits above it. **Three: the brand cell is 7px wider, and that is not geometry at all.** `Ding PBX Console` measures 106.63px against the design's `Asterisk Console` at 100.27px, same font, same padding, same glyph, same gap — a deliberate rename recorded in `compile-design.mjs`'s `BRAND` table, of the same kind as the sample data this project removed. Repaired nowhere, on purpose, and left inside the compared region so it is read rather than masked. **What the repairs are worth, measured:** every shell on both sides is now exactly 1440x1000 at the window origin; five of the eight declared areas measure the *same rectangle* on both sides on all 32; the whole-frame diff fell from 47.13%–63.95% to 23.07%–60.98%; the compared-region diff from 6.67%–26.78% to 6.34%–14.95%; and the compared fraction is now identical at 29.57% across the set instead of drifting. **What ticking this does not claim.** No destination moved to `verified` and none could. All 32 still report a real chrome divergence, and the Material Design 3 audit still reports all 32 nonconforming, so both prerequisites the guard names remain unmet — for measured reasons rather than absent ones. The captures and diffs this line asked for exist; what they now measure is the product's real distance from the design rather than two faults in the equipment measuring it. Evidence: `console/docs/evidence/design-parity-chrome-bar.md`, and `captureContract.geometryDivergence` in `console/inventories/design-parity.json`.
- [x] Define a parity bar that can actually be met: compare chrome and layout with the data-bearing regions excluded, since the reference shows invented sample content exactly where the built application shows the target's real readings. **The bar exists, is guarded, and has been applied.** It is declared once for the whole application as `chromeParityBar` in `inventories/design-parity.json` — tolerance exactly `0`, minimum compared fraction exactly `0.25`, eight measured areas of which two (`statusCell`, `contentPane`) are declared data and six chrome, each role carrying the reason it rests on. `scripts/design-parity-chrome.mjs` applies it, `docs/evidence/design-parity-chrome-bar.md` explains it, and 21 tests plus 19 planted breaks in `scripts/negative-design-parity.mjs` hold it — 11 of those breaks are the bar itself, including softening the tolerance away from exact, lowering the floor, dropping an area, and reclassifying the navigation rail as data so that a divergence there would quietly stop counting. This pass additionally broke the comparator's own floor by hand, forcing `if (comparedFraction < minimumComparedFraction)` to `if (false)`: two tests went red, and green again on restore. A mask wide enough to hide the artifact really is refused rather than passed, which is the one property the whole bar rests on. **What ticking this does not claim.** No destination currently *meets* the bar. All 31 records read `diff`, with 6.67%–26.78% of the compared region differing. That is not a defect in the bar, it is the bar doing its job: where whole-frame comparison could only say "57% of pixels differ", this names one cause. The built shell is exactly 1440x1000 on all 31 destinations, while the reference shell is 1428 wide on 20 of the 32 and ranges from 622px to 7668px tall, so every horizontal position in the top strip drifts — which is why `brandCell` differs by exactly 15.6% and `menuCell` by exactly 12.0% on *every* screen, identical figures being the signature of one divergence rather than 31. Repairing that, and taking About's still-absent 32nd record, belong to the item above.
- [x] Perform the per-destination Material Design 3 conformance audit the `verified` guard also requires. **Performed and committed for all 32 audited destinations.** The objection that had held it back for several passes — that a machine-written `conforms: true` nobody performed would be an invented verdict — was right, and it shaped the auditor rather than preventing it. `scripts/design-parity-material.mjs` measures seven properties of the real rendered destination against published specification values: the 15-size type scale, the four icon sizes, the six-step shape scale, two-layer elevation, translucent state layers with a focus state, the 48dp touch target, and the motion tokens. `conforms` is computed as `defects.length === 0` from findings taken out of the markup; no argument, option or code path can set it, and every check can only ever *add* a defect, so it can understate a divergence but can never manufacture a conformance. `scripts/audit-design-parity-material.mjs` renders each destination from the real `App` class — the product renderer, not the bare compiled shell — with both stylesheets the built renderer loads, and `--check` re-derives every record and fails when the renderer has moved, wired into `test:inventories`. 31 tests and 17 planted breaks hold it. **What it found: 0 of 32 conforming, 8279 divergences across seven checks** — 2364 icon glyphs off 20/24/40/48dp, 1955 type sizes off the scale, 1274 interactive elements under 48dp, 1120 opaque colour swaps where a state layer belongs, 955 off-token durations and easings, 578 radii off the shape scale, 33 single-layer shadows where an elevation is two layers. **No row moved to `verified` and none could**, which is the honest result rather than a disappointing one: this is now a second *measured* reason nothing is verified rather than an absent prerequisite. **What it does not claim, recorded in every record's own `notMeasured` field:** it reads declarations, not pixels, so it cannot decide whether a control whose numbers are right is a real Material Design 3 component or a lookalike sharing them, cannot see geometry that only exists after layout, cannot see runtime-injected style, cannot watch motion run, and measures no colour tokens at all. `docs/evidence/design-parity-material-audit.md`.
- [ ] Decide whether `commandCell` becomes a data area of the chrome-parity bar. Its declared reason said it "carries its own label, not a reading", and that is **false**: it renders `connLabel` and `connUptime`, so the design invents `pbx-hq · AMI 5038` / `up 14d 06:22` while the application shows what its own target reports. That makes it data-bearing in exactly the sense `statusCell` already is, and it is the worst area on **all 32** destinations at an identical 39.00% — the largest single contributor left in the compared region. The declaration has been corrected to say what the cell actually renders; the **role has deliberately not been changed**, because reclassifying an area as data narrows the bar, and narrowing it in the same pass that repaired two capture-harness defects would leave one number nobody could attribute to either change. Excluding it would drop the compared fraction from 29.57% to roughly 28.1%, still above the declared 25% floor. Whoever takes this should change one thing and re-run `--side=chrome` alone, which needs no browser.
- [x] Give the built About destination the design's own heading. Its `<h1>` now reads exactly `About`, so the settle condition that proves a driver arrived can be satisfied. The console's name did not disappear; it moved into the About screen's body, where a renamed console still shows its chosen name and, once renamed, states outright that a bug report will still name the shipped product. That is a better home for the boundary than the title bar was. Two tests read the `<h1>` itself rather than the flattened screen text, because `strip()` runs the heading and the subheading together into one line and would not notice a name moving between them. **What this item did not do is take the capture.** The approved off-screen capture route was unavailable to this pass, so `about-built.png` and `about-diff.json` are genuinely still absent rather than quietly regenerated, and the built count stays 31. The next `--side=built` run should now settle on About like the other thirty-one; that is an expectation, not a result, and `inventories/design-parity.json` records it as one.

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

## Cover Asterisk's real capability surface

A survey against this checkout measured the console at roughly **12%** of Asterisk's
configurable surface: 106 shippable sample configuration files, about 13 the console
could name. The owner's direction is that every gap below is closed, partials included.

**Foundation — done.** The control plane no longer limits this: writable resources went
from 10 files to 41 and read-only commands from 23 to 63, every name verified against the
Asterisk sources by a test that refuses an invented one. A new destination needs no change
to the control plane.

### Major gaps — no destination exists at all

- [x] **Access control rules** (`acl.conf`) — the highest-value gap by far. SIP scanning is constant and toll fraud is the expensive failure; the security screen currently edits no rule at all Shipped as a table of every `permit=`/`deny=` rule across every named ACL in file evaluation order, with add, edit, remove and reorder writing through the existing plan-and-apply path. Deliberately not bound through the single-key control table: that table is permit-only and would have silently dropped any interleaved `deny=` line.
- [x] **Sound prompt management** — upload, list, audition and remove prompts. Every IVR and voicemail screen references prompts it cannot create Shipped as a Sound prompts destination listing every real file on the target, with upload through a native picker, removal behind the destructive-action gate, and audition through a new media read action. Audition refuses the five raw telephony formats outright rather than failing silently: they carry no header, sample rate or framing a browser could recover.
- [x] **TLS and certificate management** (`http.conf` TLS, PJSIP transport certificates, STIR/SHAKEN keys) — every other screen assumes certificates that nothing can install or rotate Shipped as a TLS group that loads a named PJSIP transport and writes ten fields back, a STIR/SHAKEN key-material group, and the first write path http.conf ever had -- its bindings were complete and unreachable. Paths only, never key contents. Saving refuses outright when the typed transport does not resolve, so it cannot invent a half-built transport carrying TLS keys and no bind address.
- [ ] **Hardware trunks** (`chan_dahdi.conf`) — analogue lines, T1/E1 and PRI.
- [ ] **Database backends and realtime** (`res_odbc.conf`, `extconfig.conf`, `sorcery.conf`, `res_pgsql.conf`, `res_ldap.conf`) — required for hosted and multi-tenant deployments.
- [ ] **Fax** (`res_fax.conf`, `udptl.conf`) — sending, receiving, T.38 gateway.
- [ ] **Channel event logging** (`cel.conf`, `cel_odbc.conf`, `cel_pgsql.conf`) — the compliance counterpart to call records.
- [ ] **Call attestation** (`stir_shaken.conf`) — profiles, certificates, verification.
- [ ] **Emergency-services location** (`geolocation.conf`) — a regulatory requirement in several jurisdictions.
- [ ] **Handset auto-provisioning** (`phoneprov.conf`) — the deployment flow asks how many phones and has nowhere to template them.
- [x] **Feature codes and parking** (`features.conf`) — transfer, park, pickup, recording keys Thirty controls bound in total: fourteen against `features.conf` for transfer, pickup and recording, and sixteen against `res_parking.conf`, which is where parking actually lives -- `features.conf.sample` says so in its own fifth line, and its `[featuremap]` carries only the park trigger. Every one cites its sample line.
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
- [x] **Exercise an approved write plan end to end against a running Asterisk.** The console provisioned
      its own distribution from the bundled root filesystem, digest verified against the recorded
      provenance, and a plan ran backup, stage, validate, apply and post-read through the real
      `StructuredConfigPlanner` and `ConfigTransaction`. The Asterisk command line -- a channel independent
      of the transport that performed the write -- reported the new dialplan context before, during and
      after, and the exchange was restored to its exact prior state. Evidence:
      `console/release/evidence/live-exchange/write-plan.json`.
- [ ] **Repeat that write against a non-disposable exchange.** The run above proved the path against an
      Asterisk the console created for the purpose, which is still one it may safely destroy. A write to an
      exchange somebody depends on needs a target and an authorization only the repository owner can
      supply, so this is annotated rather than attempted.
- [ ] **Stop corrupting `key =>` lines on every write.** Reading a resource and writing the identical value
      back rewrites `exten => 8100` as `exten = > 8100`, which Asterisk parses as an extension literally
      named `>8100`. An unchanged round trip of `extensions.conf` took it from 61 `exten =>` lines to 0 and
      changed all 161 dialplan and include lines. Thirteen shipped sample files use the arrow form, 419
      lines in total. `validate` and `post-read` both compare the parsed structure, which round-trips
      consistently, so neither can see it -- the transaction reported "Configuration applied and verified".
- [ ] **Return the backup handle from `ApplyResult`.** The transaction takes a backup and completes its
      `backup:` action, but the result exposes no handle, so a caller can only undo a *failed* apply. A
      deliberate undo after a successful one has no supported route.
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

## Desktop contract features that are wired at one end only

Found by writing a per-feature contract test for all 44 rows on each surface, which is the
first thing in this project to look at every one of them. Each entry below is a module that
exists, is tested in isolation, and that nothing a person can reach ever calls -- the failure
this repository keeps repeating, because it produces no error and no failing test.

- [ ] **Reach the export and bulk-action code from the buttons that claim to do it.** Both
      modules import cleanly and their planning logic genuinely runs, but the compiled interface
      routes Export and Delete through separate code that never passes `bulk()` the verb needed to
      reach the rich branch. Subtler than never importing it, and invisible for the same reason.
- [ ] **Give the desktop a responsive mechanism at all.** The line cited as evidence of one is a
      per-control segmented-picker variant, not a screen breakpoint. There is no breakpoint
      anywhere.
- [ ] **Anchor notifications in a corner and let them stack.** Toasts currently appear
      bottom-centre and do not stack, and the Notification centre screen renders the fixed rows
      that came from the design rather than a reviewable history of what was actually raised.
- [ ] **Import the six finished modules nothing imports:** status hub, bounded overlays,
      context-menu shortcuts, long-operation progress, collapsible filters, and forge publishing.
      Each is complete and covered by its own tests; none is reachable from the interface.
- [ ] **Correct the implementation registry where its notes are now false.** It still records that
      per-element locks have no one-time-code option and no documented context-menu command; both
      shipped. Their real gap is that credentials sit in plain state rather than the operating
      system vault. It also understates appearance, where four of six symbols do write real styles
      and only theme import is dead.
## Controls that announce themselves instead of working

Found by the repository owner watching a drive of the built application and noticing that
a click produced a message and nothing else. Every one below is styled as a live control,
is reachable, and does nothing but raise a notification -- which the project already
forbids: anything presented as operable must perform its labelled action.

- [x] **Build the seven menus in the menu bar.** File, Edit, View, PBX, Agent, Window and Each opens the real context-menu overlay with real items: File and Window operate tab and workspace state, View docks and goes full-screen, PBX carries the six existing quick actions hoisted into one shared constant so the dashboard and the menu cannot drift, Agent lists its seven screens, Help reaches the documentation and history.
      Help are generated by one line that maps each label to a handler raising the text
      "<label> menu". No menu opens, and no item exists behind any of them.
- [x] **Stop claiming actions that never happened.** Five notifications state an outcome The guard scan became real, routed through the same confirmation flow its two sibling panels already used -- it was the only one of three skipping it. The rest became honest: a new branch, an exported bundle and a branch-from-here have no repository or bundle operation anywhere in the control plane; a detail request has no partner channel; and authenticator pairing has a static checkerboard for a code and an unlock that never checks one. Each is dimmed, carries a tooltip naming exactly what is missing, and says it is not built rather than reporting success.
      in the past tense while nothing runs: a branch created from the current commit, a
      bundle written to disk, a guard scan queued, a detail request sent to a named
      partner, and a built-in authenticator paired. A control that does nothing is a
      defect; one that says it succeeded is a false statement to the person reading it.
- [x] **Make the two canvas actions real.** Adding a step and duplicating a node both Both now push through the same mechanism the right-click duplicate already used, so the canvas genuinely gains the node.
      report a change to the canvas that the canvas never receives.
- [x] **Make copy-to-clipboard actually copy.** Two handlers report that a value was Both colour-format handlers now perform the real clipboard write the sibling copy controls were already wired to.
- [ ] **Fix the two remaining controls of the same class.** A global Undo on the shared
      notification reverts nothing, and the copy-tab-list item writes the literal text
      `undefined` to the clipboard because it reads a label off the wrong shape.
      copied without writing to the clipboard.
## Release readiness

- [x] Verify `download-dependencies.bat /s` from a clean user-scoped toolchain cache.
- [x] Verify `build.bat /s` at the merged candidate commit.
- [x] Verify `build-installer.bat /s` produces an unsigned installable Squirrel.Windows set.
- [x] Bundle a complete Ubuntu WSL root filesystem containing Asterisk and every runtime dependency inside the installer.
- [x] Verify the static Pages output includes `console/site/dist/build-manifest.json` and deploys without runtime asset fetches.
- [x] Rework the static Pages home into a modern responsive marketing and documentation surface while preserving all 32 destination identifiers and honest release availability.
- [x] Split the static experience into compact Home, Product, Documentation, Downloads, Status, and Settings routes with shared local assets and anchored article navigation.
- [x] Publish and independently verify the first unique non-draft Ding PBX Console release and downloadable assets. Verified at `ding-pbx-console-v0.0.5-r1`: non-draft, non-prerelease, target `50dad7aadbc8c8c3b79ecc844245ea977509daf3`, carrying `Ding-PBX-Console-Setup.exe` (422,853,632 bytes), `ding-pbx-console-0.1.0-full.nupkg` (422,856,987 bytes), `RELEASES`, `SHA256SUMS.txt`, and both line-count evidence files. `RELEASES` and `SHA256SUMS.txt` were downloaded and read back, and the size `RELEASES` records for the full package matches the published asset exactly.
- [x] Add real built-artifact updater evidence for the old `0.1.0` baseline and installed `0.1.84` draft-blocked state, with source commits `745d7425df791646aef4a6972c96dcf279a6004a`, `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, and `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, exact release tags, SHA-256 image records, dimensions, hidden-desktop CDP method, direct installer launch, restart, Later persistence, and draft blocking documented in `console/docs/platform/automatic-updates-evidence.md`.
