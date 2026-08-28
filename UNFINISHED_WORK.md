# Material Asterisk unfinished work and completion plan

> **Snapshot:** 2026-08-28, based on `master` at `58f6a96c41c236959ad87213d2fb4802cb466ab9`.
>
> **Evidence boundary:** this document was produced by inspecting the current repository, open issues, merged pull requests, current contracts, dispatcher routes, renderer integration, registries, and repository guidance. This documentation-only change does not claim that tests, builds, packaging, deployments, browser runs, desktop interaction, PBX writes, or captures were run for this pull request.

## Purpose

Material Asterisk has accumulated a large amount of implementation, evidence, and historical handoff material in a short period. Some older records describe work that later landed, some describe branches that no longer exist, and some describe real gaps that remain visible in current source. A useful completion plan therefore cannot be a copy of the oldest unchecked checklist.

This document establishes one current, reviewable path from the repository as it exists at the snapshot above to a release-grade close-out. It does four things:

1. distinguishes confirmed current gaps from historical leads that must be re-measured;
2. orders work by safety and dependency rather than by file or feature count;
3. defines implementation, test, built-interaction, and evidence requirements for every workstream; and
4. gives issue #1 and issue #6 explicit closure criteria.

`ROADMAP.md` remains the factual checklist and `HANDOFF.md` remains the evidence record. This document is the completion sequence that should be used to reconcile both of them against the current default branch.

## Evidence vocabulary

Use these terms consistently in issues, pull requests, inventories, handoffs, and release notes:

| Term | Meaning |
| --- | --- |
| **Present in source** | A path or symbol exists. This alone proves neither registration nor behavior. |
| **Integrated** | The owning surface reaches the implementation through the production route. |
| **Focused-verified** | The smallest relevant automated checks ran against the exact commit and passed. |
| **Suite-verified** | `npm test` completed against the exact commit and every named group reported its result. |
| **Built-verified** | The production build completed and the behavior was operated in the built artifact. |
| **Target-verified** | The behavior was exercised against an explicitly approved disposable target, with readback. |
| **Captured** | A current-commit interaction record and capture exist with their provenance tuple. |
| **Release-verified** | The installer, update path, release assets, Pages deployment, hashes, and download links were checked against one immutable candidate SHA. |

Never promote a feature because prose says it exists, because a file name resembles it, because an old branch once implemented it, or because a merge is reported as conflict-free.

## Current-state findings

### Tracking state

- Issue #1, **Build Ding PBX Console desktop control plane and documentation site**, remains open and is still the top-level delivery tracker.
- Pull request #3, **Integrate FreePBX-style PBX Admin into the Ding Electron UI**, is merged. Its old draft wording must not be treated as the current PR state.
- Issue #6, **ApplyResult returns no backup handle, so a successful configuration apply has no undo route**, remains open.
- The active tops of `ROADMAP.md` and `HANDOFF.md` contain facts tied to older default-branch commits and old branch topology. Their historical sections are valuable, but the active plan must be re-derived from current `master` before new completion claims are made.

### Configuration apply and undo

Current source has moved beyond the original issue #6 report:

- `console/control-plane/contracts.ts` now permits `ApplyResult.backups`, one resource/handle pair per successfully changed resource.
- `console/control-plane/config-transaction.ts` returns those handles after a verified successful apply and already rolls failed applies back in reverse resource order.
- `console/control-plane/dispatch.ts` returns the apply result to the renderer.
- `console/app/renderer/src/PbxAdminApp.tsx` provides per-resource recovery-point listing and confirmed restore through `history.list` and `history.restore`.

The stronger guided-undo contract is not present on current `master`:

- there is no current `ConfigUndoService` module;
- there is no current `pbx.undo` dispatcher action;
- the PBX Admin apply-success path reads only status/message, then reloads configuration and history;
- there is no immediate, target-bound, expiring, one-time undo receipt on the owning configuration surface; and
- the public apply response currently includes the domain result, so transport backup handles must be reviewed at the renderer boundary for path/token disclosure.

Historical commit `ed0ef9a1f0f324a063ae09d06e4976bf229b4f5e` is a useful behavioral reference: it implemented a target-bound one-time receipt, post-state validation, reverse restore, readback, redacted history, and focused concurrency checks. It is not a safe wholesale cherry-pick: current `master` has changed substantially and later removed that module. Re-implement the contract against current types, storage, dispatcher, and renderer seams.

### Target support

`TargetProfile` names four connection kinds: `wsl`, `localDocker`, `remoteLinux`, and `remoteDocker`. Current dispatcher behavior is not yet equivalent across them:

- `server.list` discovers WSL distributions and local Docker targets;
- `server.connect` accepts the WSL path;
- a registered non-WSL target is refused with `CONNECTION_KIND_NOT_WIRED`; and
- issue #1 still requires exact-source provisioning and operation on WSL Ubuntu, local Docker, and remote Debian/Ubuntu hosts.

This is a confirmed product gap, not just missing evidence.

### Evidence and inventory state

The schema-v2 registries contain many rows marked `partial` or otherwise unverified. A typical row identifies a source symbol and documentation route while leaving focused checks, localization, persistence, built interaction, current-commit capture, and design-parity evidence unrun or empty.

That state is honest. It also means source volume cannot be used as a completion percentage. The authoritative unfinished-work list must be generated from current:

- `console/inventories/surface-completeness.json`;
- `console/app/feature-registry.json`;
- `console/site/feature-registry.json`;
- `console/inventories/design-parity.json`;
- built/operated interaction evidence inventories; and
- their validators and deliberate-break scripts.

Do not carry old totals into a new handoff. Recompute them from the exact candidate commit.

### Suite, build, and release state

Recent history contains both red-suite diagnoses and later integration commits that repair or supersede parts of those diagnoses. This pull request did not run the current suite, so the present default-branch verdict is deliberately recorded as **unknown until re-run**.

The same rule applies to installer, target deployment, current-commit captures, release assets, and Pages deployment. Historical success is useful provenance, but it does not verify a later candidate.

## Blocking order

The work below is ordered. Later work may be developed in parallel, but it must not be described as release-complete until every earlier gate it depends on has passed.

---

## P0 — Re-establish a trustworthy current baseline

### Objective

Produce one exact-commit report that says what is green, red, partial, absent, stale, published, and operated on current `master`. This prevents another repair cycle from solving an already-integrated branch or trusting an obsolete count.

### Implementation steps

1. Start from a clean checkout of current `master` and record the full SHA before installing or generating anything.
2. Install the pinned toolchain and dependencies through the repository entry point:

   ```bat
   download-dependencies.bat /s
   ```

3. From `console/`, run and retain the complete grouped result:

   ```powershell
   npm ci
   npm test
   npm run build
   ```

4. Run the inventory lane independently when diagnosing it, even though it is included in the grouped suite:

   ```powershell
   npm run test:inventories
   ```

5. Confirm the working tree after generators. Generated output must be byte-identical to a fresh sanctioned generation; never repair a generated renderer file by hand.
6. Generate a current status report from the three feature/completeness registries. At minimum record, per surface and feature:
   - status vocabulary value;
   - missing implementation/registration evidence;
   - localization and persistence state;
   - focused-check state;
   - negative-evidence state;
   - built-interaction state;
   - capture state; and
   - design-parity state.
7. Reconcile the active sections of `ROADMAP.md` and `HANDOFF.md`:
   - retain historical entries as history;
   - move stale branch-specific instructions out of the active blocking section;
   - record PR #3 as merged;
   - record issue #6 as partially repaired but not closed;
   - replace old branch/SHA/count claims with the exact current baseline; and
   - link each remaining blocker to a current issue or a narrowly scoped follow-up PR.
8. Inspect the current site build manifest rather than assuming that tracked HTML/JavaScript sources are published. Every top-level page must be either emitted and reachable or explicitly documented as source-only/unbuilt.
9. Inspect current releases and Pages results for provenance only. Do not count an old release as current-candidate verification.

### Required evidence

- exact commit SHA and clean-tree proof;
- one result for every grouped test lane: UI, renderer, control plane, contracts, site, site contracts, server, ISO, scripts, live, and inventories;
- build result and generated-drift result;
- registry status summary generated from the current files;
- reconciled active roadmap/handoff sections; and
- a short list of failures with owning paths and next actions, not only a total.

### Completion gate

P0 is complete only when another contributor can reproduce the verdict from the recorded SHA and commands without reading abandoned branch commit messages.

---

## P1 — Finish safe successful-apply undo and close issue #6

### Objective

Turn the current backup-handle return path into a user-visible, target-bound, one-time undo operation that refuses unsafe restoration, survives the intended lifecycle, keeps transport handles private, and proves the result by readback.

### 1. Separate internal backup data from the public receipt

Keep raw transport handles inside the control plane. Define two contracts instead of sending a transport path/token to the renderer:

- an **internal undo record**, containing the exact backup handles, before/after canonical values or digests, target binding, plan binding, catalog revision, issue/expiry time, and consumption state; and
- a **public undo receipt**, containing only an opaque receipt ID, target/plan identity, affected resource names, issue/expiry time, and user-safe state.

Review both `pbx.apply` and `history.list` boundaries for transport-path disclosure. If a history handle contains a target path or recovery token, replace it at the public boundary with an opaque ID resolved only inside the control plane.

### 2. Issue a receipt only after a verified apply

After `ConfigTransaction.apply` returns `applied`:

1. require one internal backup for every changed resource;
2. bind the receipt to the exact target ID and plan ID;
3. bind it to the resource order used by the transaction;
4. record canonical pre-state and verified post-state, or stable digests plus the data needed for readback comparison;
5. set a bounded expiry;
6. persist the internal record atomically in the local application data boundary; and
7. return only the public receipt.

A no-op plan receives no undo receipt. A failed, cancelled, or internally rolled-back plan receives no successful-apply undo receipt.

### 3. Add a bounded `pbx.undo` route

The action should accept an opaque receipt ID and the selected server/target. It must reject, before any write:

- missing or malformed receipt;
- receipt not issued by this installation;
- target mismatch;
- plan/action mismatch;
- expired receipt;
- already consumed or currently pending receipt;
- catalog/resource mismatch;
- missing backup material; and
- target state that no longer equals the verified post-apply state.

The last refusal is essential: undo over an intervening edit is data loss, not recovery.

### 4. Make one-time consumption concurrency-safe

Reserve the receipt before asynchronous target reads, then mark it consumed before the first inverse write. Two callers racing the same receipt must produce exactly one restore attempt. Do not rely on a UI button becoming disabled quickly enough.

Define restart behavior explicitly:

- if receipts are intended to survive restart, persist pending/consumed transitions atomically and recover interrupted states conservatively;
- if they intentionally expire on restart, say so in the UI and contract, and keep ordinary history recovery available.

### 5. Restore in reverse order and verify

1. Re-read every affected resource and compare it with the recorded post-state.
2. Restore backup handles in reverse apply order.
3. Re-read every resource and compare it with the recorded pre-state.
4. Return a typed result that distinguishes success, refused-before-write, partial restore, rollback transport failure, and readback mismatch.
5. Keep the receipt consumed after any write begins. A blind replay after a partial restore can make recovery worse.
6. Preserve enough internal failure data for manual recovery while keeping public history/export redacted.

### 6. Integrate undo into the owning PBX Admin recovery surface

Do not add a parallel application or a catalogue screen. Extend the existing **Recovery** group on the relevant PBX Admin configuration surface:

- show **Undo last applied change** only when a valid receipt exists for the selected target/resource context;
- show the expiry and affected resources;
- disable it with the exact reason when expired, consumed, target-mismatched, or superseded;
- use the existing confirmation flow;
- show bounded progress and typed failure text;
- reload configuration and recovery points after success; and
- keep ordinary selected recovery-point restore as a separate, explicit operation.

The UI must never claim “undone” from the dispatcher response alone. It should display success only after the control plane reports pre-state readback success.

### 7. Test matrix

Add focused tests for at least:

| Case | Expected result |
| --- | --- |
| Successful single-resource apply and undo | Pre-state restored and read back |
| Successful multi-resource apply and undo | Reverse-order restore, all resources verified |
| Unknown/forged receipt | Refused before target write |
| Wrong target | Refused before target read/write beyond validation needs |
| Expired receipt | Refused before write |
| Consumed receipt | Refused before write |
| Two concurrent consumers | Exactly one restore attempt |
| Post-state changed after apply | Refused before write |
| Missing backup record | Refused before write |
| Transport rollback failure | Typed partial/failure result, no replay |
| Pre-state readback mismatch | Typed verification failure |
| Redacted history/export | No opaque handle, path, or recovery token exposed |
| Restart persistence or expiry | Matches the declared lifecycle |
| Renderer apply response | No raw transport handles cross the boundary |
| PBX Admin confirmation/cancel | Cancel performs no request; confirm uses exact receipt |
| Built disposable-target run | Apply, inspect, undo, and Asterisk readback all captured |

Plant at least one deliberate break in the concurrency reservation and one in the post-state comparison, observe the focused route turn red, restore it, and observe green.

### Completion gate for issue #6

Close issue #6 only after all of the following are true on `master`:

- typed internal/public receipt split is integrated;
- `pbx.undo` is bounded and target-state-aware;
- the existing PBX Admin recovery surface exposes guided undo;
- focused and full suites pass on the exact commit;
- a disposable target proves apply then undo with readback;
- a current built-artifact interaction record and capture exist; and
- public/local-history evidence contains no raw backup handle or target path.

---

## P2 — Complete target and provisioning parity

### Objective

Make the connection kinds already present in the contract real, bounded, and behaviorally consistent, then meet issue #1's deployment requirement on WSL Ubuntu, local Docker, remote Debian/Ubuntu, and remote Docker where supported.

### Current confirmed gap

Current `server.connect` is WSL-specific and refuses non-WSL profiles with `CONNECTION_KIND_NOT_WIRED`. Discovery of a target is not the same as a working connection, read, plan, apply, undo, or provisioning path.

### Implementation sequence

#### A. Define capability seams per target kind

For every connection kind, define how the control plane performs:

- identity and operating-system discovery;
- Asterisk version and daemon-state discovery;
- bounded read-only CLI operations;
- structured configuration read;
- backup, stage, validate, apply, post-read, and rollback;
- media list/upload/remove where supported;
- free-storage and elevation checks;
- exact-source provisioning/build;
- daemon start/stop/restart; and
- recovery history and guided undo.

Reuse domain planners and transaction logic. Keep transport-specific path, process, SSH, Docker, and privilege details behind the target adapter.

#### B. Local Docker

- Resolve only containers/projects belonging to the configured target, not arbitrary local containers.
- Prove container identity and Asterisk readiness separately.
- Use bounded argument arrays; never concatenate shell commands from renderer input.
- Define how configuration files and backups are addressed across bind mounts or container filesystems.
- Test stopped, missing, recreated, wrong-label, and version-mismatch cases.

#### C. Remote Linux

- Use strict host-key verification and the configured known-hosts boundary.
- Store credentials only in the operating-system credential store.
- Bound command, connection, body-idle, and total deadlines.
- Validate Debian/Ubuntu support before provisioning.
- Separate “host reachable” from “Asterisk installed” and “daemon answering.”
- Refuse elevation when it is unavailable rather than silently degrading.

#### D. Remote Docker

- Bind every operation to the configured remote context and project identity.
- Apply the same container-label, filesystem, timeout, and readiness rules as local Docker.
- Prove that an answer from one target cannot populate another target's state.

#### E. Exact-source provisioning

For every supported target kind:

1. resolve the requested Asterisk master/24-preview commit to an immutable SHA;
2. record source URL, commit, base image/distribution, packages, and build options;
3. check storage and elevation before mutation;
4. make steps cancellable and idempotent where possible;
5. verify the installed binary identity;
6. start the daemon and poll until the CLI answers;
7. record a typed receipt for every step; and
8. preserve a clear recovery path after partial provisioning.

### Required test matrix

For each target kind, cover:

- discover/connect success;
- not found, stopped, stale registration, and refused identity;
- timeout/cancellation;
- read-only snapshot;
- structured plan with no change;
- successful disposable change, post-read, and undo;
- failed apply with internal rollback;
- intervening-edit undo refusal;
- daemon lifecycle;
- provisioning success and interrupted provisioning; and
- cross-target response isolation.

### Completion gate

A target kind is not complete until it has source tests, a deliberate-break guard, a built UI path, a disposable-target interaction record, and current-commit evidence. Keep unsupported target kinds visibly unavailable with the exact missing adapter rather than presenting a saved profile as connected.

---

## P3 — Convert the registries into an executable completion queue

### Objective

Finish features by promoting honest inventory rows, not by maintaining a separate hand-written feature count that drifts from the product.

### Generate the queue

Create or extend a report command that reads the current registries and emits, for every non-verified row:

- surface and route;
- feature ID and status;
- implementation and registration evidence gaps;
- localization and persistence gaps;
- focused checks and negative scripts;
- built-interaction evidence;
- capture/design-parity evidence; and
- the next smallest action that can change the status honestly.

The report must fail on unknown status vocabulary, duplicate rows, missing routes, stale source paths, or a claimed evidence file that is absent.

### Promotion contract for each row

A feature can move through these stages only when the corresponding evidence exists:

1. **Absent → partial**
   - real implementation seam exists;
   - owning route and registration are identified;
   - unavailable portions are stated precisely; and
   - no sample or simulated user-facing data is introduced.

2. **Partial → implemented-unverified**
   - every promised action is wired on the owning surface;
   - values persist where the product contract requires persistence;
   - localization is complete for user-facing text;
   - focused tests pass; and
   - a deliberate break proves the guard can fail.

3. **Implemented-unverified → verified**
   - production build completes at the exact SHA;
   - the behavior is operated in the built artifact;
   - target-backed behavior uses an approved disposable target;
   - current-commit interaction and capture evidence are recorded;
   - design/accessibility gates for the surface pass or the row honestly remains non-verified; and
   - every evidence path is validated on disk.

### Batch strategy

Work in small evidence-coherent batches, for example:

- one destination and its controls;
- one platform feature across desktop and site;
- one persistence/localization family;
- one target adapter; or
- one capture tuple.

Do not open a broad “complete the inventory” PR that changes hundreds of verdicts without operating the corresponding product paths.

### Completion gate

P3 is complete when the generated queue is empty for the release scope, every remaining non-verified row is an explicit out-of-scope decision with rationale, and the inventory validators plus negative regressions pass from a clean checkout.

---

## P4 — Finish all 32 destination interactions, accessibility, and design evidence

### Objective

Prove that every audited destination is reachable, data-honest, operable, accessible, and compared against the authoritative design under a reproducible tuple.

### Per-destination checklist

For each of the 32 destinations:

- route opens from navigation, tabs, and command palette where promised;
- every value-bearing control visibly records its accepted value;
- every action control performs work or states exactly why it is unavailable;
- no control merely announces “saved,” “queued,” “exported,” or “applied” without a receipt;
- real target data is shown, and unread values remain `—` with a reason;
- empty, loading, offline, refused, permission-denied, and failed states are distinct;
- destructive actions use the shared confirmation flow;
- long work has bounded progress and cancellation semantics;
- keyboard focus order and restoration are correct;
- dialogs expose name, role, and modality;
- live updates are announced without flooding assistive technology;
- labels, descriptions, touch targets, type, shape, state layers, elevation, and motion are audited against the Material Design 3 contract;
- the built route is operated; and
- reference capture, built capture, region ledger, visual diff, and provenance tuple are current.

### Implementation rules

- Never hand-edit `console/app/renderer/src/generated/`.
- Change the design source or sanctioned extension/compiler path, then recompile.
- Integrate a capability into the surface that owns it; do not create a feature catalogue or a second shell.
- Keep data-bearing regions distinct from chrome in parity measurement, but do not reclassify divergent chrome as data to make a score pass.
- A measured nonconformance remains non-verified. Do not change the verdict vocabulary to hide it.

### Accessibility verification

Combine automated contracts with built manual operation:

- keyboard-only navigation and escape/return behavior;
- focus trap and restoration for every modal;
- screen-reader names, roles, states, and live-region output;
- reduced-motion behavior;
- high-contrast/system-theme behavior where supported;
- text resizing and responsive breakpoints; and
- error recovery without pointer-only actions.

Record tool/version, operating-system build, viewport, scale, theme, target state, and commit for every manual pass.

### Completion gate

All 32 destinations have current-commit operated interaction evidence. Any destination that still fails the declared parity or accessibility bar remains explicitly non-verified and blocks a claim that the full design contract is complete.

---

## P5 — Reconcile documentation, static site, and download behavior

### Objective

Ensure that documentation describes the current product, every intended static page is emitted and reachable, and the download surface points only to verified release assets.

### Implementation steps

1. Rebuild documentation and changelog through sanctioned generators:

   ```powershell
   cd console
   npm run bundle:docs
   npm run bundle:changelog
   npm run test:site
   npm run test:site-contracts
   ```

2. Derive the published-page inventory from the build manifest, not a fixed historical total.
3. For every tracked top-level site page or standalone script:
   - publish and link it;
   - integrate its behavior into the current shared shell; or
   - mark it explicitly as unbuilt/source-only and correct present-tense documentation.
4. Verify generated documentation routes, local navigation, command palette entries, search, history, recovery, and offline behavior.
5. Ensure the site performs no undeclared runtime network fetches.
6. Make download links derive from the immutable release/version manifest and verify every linked asset and SHA-256.
7. Keep unknown-publisher/SmartScreen wording explicit because signing is prohibited.
8. Deploy Pages from the same release candidate or record the exact intentional difference.

### Documentation honesty checks

Every feature article must state:

- behavior;
- configuration;
- failure modes;
- verification boundary; and
- current availability.

Changelog fragments and evidence records may use their own genre, but must not be counted as feature articles or used to satisfy feature-completeness sections with invented prose.

### Completion gate

The built site manifest, site tests, route operation, Pages deployment, and release download links all agree with one immutable candidate. No page is “available” only because its source file exists.

---

## P6 — Build, deploy, package, update, capture, and release one immutable candidate

### Objective

Close issue #1 with one candidate SHA that survives every local and public gate without borrowing evidence from earlier commits.

### Candidate sequence

1. Freeze the candidate SHA and require a clean working tree.
2. Run the full P0 suite/build baseline.
3. Build the runnable console through:

   ```bat
   build.bat /s
   ```

4. Deploy/provision supported disposable targets from the same SHA.
5. Operate the cheap headless/built interaction pass, then the required target-backed write/undo pass.
6. Capture all required current-commit evidence.
7. Build and verify the unsigned distribution:

   ```bat
   build-installer.bat /s
   ```

8. Install the produced package on a clean Windows profile or disposable VM.
9. Verify first launch, target discovery, daemon readiness, configuration preview/apply/undo, recovery history, documentation, and shutdown/relaunch persistence.
10. Verify the automatic update path from a supported previous installed release to the candidate:
    - update discovery;
    - manifest/release selection;
    - SHA-256 verification;
    - explicit unsigned-artifact warning;
    - installer launch;
    - relaunch/version verification; and
    - safe failure behavior for interrupted or mismatched downloads.
11. Publish one unique, immutable, non-draft `ding-pbx-console-*` tag.
12. Verify release contents and Pages/download behavior after publication.

### Required release contents

The release must contain and verify:

- exactly one `Setup.exe`/named setup executable;
- `RELEASES`;
- at least one full `.nupkg`;
- delta packages when the packaging path produces them;
- `SHA256SUMS.txt` or equivalent SHA-256 evidence;
- reproducible line-count evidence generated only by `node console/scripts/count-lines.mjs`;
- exact workflow timing;
- source/runtime provenance;
- unsigned-publisher warning; and
- a unique immutable tag targeting the exact candidate SHA.

### Stop conditions

Do not publish or close issue #1 when any of these is true:

- the suite verdict is red or unknown;
- generated output drifts;
- a required inventory row is unverified;
- a target-backed write/undo has not been proven;
- installer assets come from a different SHA;
- Pages/download links target a different or missing release;
- captures are from an older build;
- a release asset hash is missing or mismatched; or
- a workflow is merely running rather than completed and read back.

### Completion gate for issue #1

Close issue #1 only when its original checklist is rewritten or checked with links to current evidence for:

- sanitized design contract and all 32 destinations;
- real discovery, monitoring, plan, atomic apply, post-read, rollback, and guided undo;
- exact-source provisioning on every declared supported target kind;
- current unsigned installer and automatic update flow;
- complete Pages documentation and download surface;
- local suites, accessibility, built interaction, captures, and design evidence; and
- merged default branch, immutable release, verified assets, and verified Pages deployment.

---

## Recommended pull-request sequence

Keep the remaining work reviewable. The following sequence is intentionally narrower than one large “finish everything” branch:

1. **Rebaseline delivery records** — run P0, update the active roadmap/handoff, and publish the generated current gap report.
2. **Undo domain and public contract** — internal/public receipt split, persistence model, lifecycle, and focused pure-domain tests.
3. **Undo dispatcher and transport integration** — `pbx.undo`, target-state validation, reverse restore, readback, redaction, and dispatcher tests.
4. **PBX Admin guided undo** — integrate into the existing Recovery group with confirmation, state, and renderer tests.
5. **Local Docker connection parity** — connection/read/transaction/undo/provisioning for one additional target kind.
6. **Remote Linux connection parity** — SSH trust, credential, timeout, transaction, undo, and provisioning path.
7. **Remote Docker parity** — only after local Docker and remote Linux seams are stable.
8. **Inventory promotion batches** — small feature/surface batches with deliberate-break and built evidence.
9. **Accessibility and Material/design batches** — destination-scoped fixes and fresh evidence.
10. **Current-candidate release proof** — package, install, update, target operation, capture, release, Pages, and close-out.

Every implementation PR should state:

- exact base/head SHA;
- current behavior and gap;
- files and owning surface;
- failure and security boundaries;
- commands actually run and their exact results;
- deliberate break observed;
- built/target evidence, or an explicit “not run”; and
- which inventory rows and issue criteria changed.

## Risk register

| Risk | Required control |
| --- | --- |
| Stale roadmap or handoff directs duplicate work | Rebaseline from current `master`; active section names exact SHA |
| Raw backup paths/tokens reach renderer or history export | Internal/public receipt split and redaction tests |
| Undo overwrites an intervening edit | Compare current target with recorded post-state before any write |
| Two undo requests restore the same backup | Atomic pending/consumed reservation with concurrency test |
| Partial multi-resource undo is blindly replayed | Consume before first write; typed partial result and manual recovery path |
| Non-WSL target appears saved but is not operational | Per-kind capability state and exact unavailable reason |
| A test guard stays green when its break did not land | Every negative script asserts bytes/source changed before testing |
| Generated renderer is hand-edited | Change sanctioned source/extension and require byte-identical recompile |
| Documentation presents tracked but unpublished pages as live | Build-manifest inventory and route operation |
| Evidence from one SHA is attached to another release | Candidate SHA embedded in every record and asset verification |
| A release is called complete while workflows are running | Read back completed workflow, release, assets, hashes, and Pages state |
| User-facing no-op claims success | Receipt-backed actions or explicit unavailable state |
| Cross-target response contaminates another server | Target/request binding and stale-response tests |

## Working tracker template

Use one row per independently closable item. Do not replace the evidence columns with a prose progress percentage.

| Item | Owner | Issue/PR | Source state | Focused checks | Negative break | Built interaction | Target proof | Capture | Release dependency | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current baseline | — | follow-up | unknown until run | not run in this PR | not run | not run | n/a | n/a | blocks all | execute P0 |
| Successful-apply guided undo | — | #6 | partial | not run in this PR | not run | absent/currently unproven | absent/currently unproven | absent/currently unproven | blocks configuration close-out | implement P1 |
| Local Docker operational parity | — | #1 follow-up | connection path incomplete | not run in this PR | not run | absent/currently unproven | absent/currently unproven | absent/currently unproven | blocks declared target matrix | implement P2B |
| Remote Linux operational parity | — | #1 follow-up | connection path incomplete | not run in this PR | not run | absent/currently unproven | absent/currently unproven | absent/currently unproven | blocks declared target matrix | implement P2C |
| Remote Docker operational parity | — | #1 follow-up | connection path incomplete | not run in this PR | not run | absent/currently unproven | absent/currently unproven | absent/currently unproven | depends on local Docker + remote Linux seams | implement P2D |
| Inventory/evidence queue | — | #1 follow-up | registries contain non-verified rows | not run in this PR | not run | mixed; regenerate | mixed; regenerate | mixed; regenerate | blocks release-grade completion | implement P3 report and batches |
| 32-destination current evidence | — | #1 follow-up | historical evidence exists | not run in this PR | not run | regenerate at candidate | target-dependent | regenerate at candidate | blocks design-contract close-out | execute P4 |
| Site/download reconciliation | — | #1 follow-up | re-measure current manifest | not run in this PR | not run | not run | n/a | not run | blocks Pages/download close-out | execute P5 |
| Immutable release candidate | — | #1 | not started for current SHA | not run in this PR | n/a | not run | not run | not run | final gate | execute P6 |

## What this document does not claim

- It does not claim that current `master` is green or red.
- It does not claim that a current installer or release has been built.
- It does not claim that any current target was read or written.
- It does not claim that historical captures verify the snapshot commit.
- It does not claim that every older roadmap finding remains present.
- It does not reopen merged PBX Admin implementation work.
- It does not close issue #1 or issue #6.

Its claim is narrower and testable: the confirmed gaps above are grounded in current source, stale claims are explicitly sent through remeasurement, and every remaining workstream now has an implementation sequence and a completion gate.
