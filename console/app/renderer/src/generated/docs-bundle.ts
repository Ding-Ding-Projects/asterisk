// GENERATED FILE — do not edit by hand.
// Produced by console/scripts/bundle-docs.mjs from console/docs/**/*.md.
// Re-run `node scripts/bundle-docs.mjs` after changing any documentation article.

export interface DocsHeading {
  readonly title: string;
  readonly id: string;
}

export interface DocsArticle {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly headings: readonly DocsHeading[];
  readonly links: readonly string[];
  readonly body: string;
}

export interface DocsBundle {
  readonly generatedAt: string;
  readonly articleCount: number;
  readonly articles: readonly DocsArticle[];
}

export const DOCS_BUNDLE: DocsBundle = {
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "articleCount": 136,
  "articles": [
    {
      "id": "agent/hub",
      "category": "agent",
      "title": "Status hub sessions",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "skills.md",
        "memory.md",
        "sync.md"
      ],
      "body": "# Status hub sessions\n\n## Behavior\n\nOpen sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window. It is backed by `status-hub`. The rail badge on this destination currently reads `3`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing yet, and the reason is specific enough to be worth naming: the status-hub client module exists in this console and is covered by its own tests, and no surface a person can reach calls it. Until that changes there is no session, no question and no reply state to list here — so the table says that rather than blaming a missing phone system, which would have nothing to do with it.\n\n## Configuration\n\n### Session policy\n\nHow the console behaves as a hub client.\n\n- **Reply poll interval** (`b_poll`) — a slider control, default `15`.\n- **Desktop notification on reply** (`b_notify`) — a switch control, default `true`.\n- **Auto-close idle sessions** (`b_close`) — a switch control, default `false`.\n- **Report worktree state each run** (`b_report`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in status-hub; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in status-hub, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Skills registry](skills.md), [Memory console](memory.md), and [Sync & attestation](sync.md).\n"
    },
    {
      "id": "agent/memory",
      "category": "agent",
      "title": "Memory console",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "sync.md",
        "vocab.md",
        "hub.md"
      ],
      "body": "# Memory console\n\n## Behavior\n\nSearch the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it. It is backed by `agent global memory`. The rail badge on this destination currently reads `2.4k`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, and that is a fact about this console rather than about any phone system. It keeps no agent-memory corpus, so there is no store behind this screen to search, sync or attest, and the records list and the three panels beside it stay empty rather than showing invented entries.\n\nThis screen used to say \"No target is connected\" when nothing had been discovered. That was true, irrelevant, and read as a promise: find a phone system and this will fill in. It will not — nothing on this rail reads a target at all — so it now names the store it has not got instead.\n\n## Configuration\n\nThere is no settings form here. A visual regex builder searches the memory corpus directly, and the sync, attestation and emission-guard state are shown alongside it for context.\n\n## Failure modes and security\n\nA failed attestation on the most recent sync blocks further writes until it is acknowledged on the Sync & attestation screen.\n\n## Verification\n\nConfirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Sync & attestation](sync.md), [Vocabulary & guard](vocab.md), and [Status hub](hub.md).\n"
    },
    {
      "id": "agent/ops",
      "category": "agent",
      "title": "Operations & releases",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../app/history.md",
        "secrets.md",
        "../app/about.md"
      ],
      "body": "# Operations & releases\n\n## Behavior\n\nRelease history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification. It is backed by `release`. The rail badge on this destination currently reads `v3.2`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nThis build's own bundled release history — the one place on the agent rail with a real source.\n\n`scripts/bundle-changelog.mjs` runs at build time and reads this repository's real `ding-pbx-console-v*` tags, newest first, at most twenty of them. Every version in the table is a tag that exists and every date is the calendar date of the commit that tag points at. Nothing here is invented, and a checkout with no version tag on it produces an honestly empty table that says so rather than a table that looks broken.\n\nThree of the five columns stay empty, and the screen says why rather than filling them:\n\n- **Artifacts** — the bundle records commits, never release assets. This console has not asked a forge which files are attached to any of these tags.\n- **Duration** — the workflow's own end-to-end timing is written into the release notes on the forge, not into this bundle.\n- **State** — a tag is not a release. Whether a non-draft release was published for one of these tags is a fact about the forge that nothing in this process has checked, and writing `Published` into every row would be asserting exactly that unchecked fact.\n\n### A coupling worth knowing about\n\nThe table's rows come from a build-generated file, so regenerating it changes what this screen renders. `npm run build` regenerates `changelog-bundle.ts` from whatever tags the checkout has, and when a new tag appears the rows change — which makes this destination's Material Design 3 audit record genuinely stale, because that record is a measurement of what this screen renders. Regenerate it with `npx tsx console/scripts/audit-design-parity-material.mjs` and commit the result. No other destination has this coupling, because no other table on this rail has a source at all.\n\n## Configuration\n\n### Updates\n\nUnsigned artifacts. The operating system may warn about an unknown publisher — that is expected.\n\n- **Check for updates** (`o_check`) — a segmented control, default `On start + hourly`, choices `On start`, `On start + hourly`, `Manual`.\n- **Stage in background** (`o_stage`) — a switch control, default `true`.\n- **Install on next restart** (`o_restart`) — a switch control, default `true`.\n- **Channel** (`o_channel`) — a segmented control, default `Stable`, choices `Stable`, `Beta`.\n- **Verify package hashes** (`o_hash`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row is a real tag on this repository; nothing is invented to fill the table, and a column the bundle does not carry is left empty with its reason stated rather than backfilled with a plausible value. The rows describe releases rather than a running configuration, so they cannot drift from one: they describe the build you are looking at, and they change only when that build's own bundled history does.\n\n## Verification\n\nExercise every control against its documented default and its full option range. For the table itself, confirm on the built application that the versions and dates it shows are the ones in this build's own `changelog-bundle.ts`, that Artifacts, Duration and State are empty on every row, and that the note beneath says why. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and asserts all three against the bundle rather than against its own expectations, so a reading taken and dropped on the way to this screen fails there rather than showing as a quietly blank table.\n\n## Suggested articles\n\n[History & git](../app/history.md), [Secret intake](secrets.md), and [About & policy](../app/about.md).\n"
    },
    {
      "id": "agent/README",
      "category": "agent",
      "title": "Agent",
      "headings": [],
      "links": [
        "memory.md",
        "sync.md",
        "skills.md",
        "hub.md",
        "vocab.md",
        "ops.md",
        "secrets.md"
      ],
      "body": "# Agent\n\nAgent global memory: memory, sync, skills, hub sessions and the emission guard.\n\n- [Memory console](memory.md)\n- [Sync & attestation](sync.md)\n- [Skills registry](skills.md)\n- [Status hub](hub.md)\n- [Vocabulary & guard](vocab.md)\n- [Operations](ops.md)\n- [Secret intake](secrets.md)\n"
    },
    {
      "id": "agent/secrets",
      "category": "agent",
      "title": "Secret intake",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "vocab.md",
        "../data/ami.md",
        "ops.md"
      ],
      "body": "# Secret intake\n\n## Behavior\n\nCredentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered. It is backed by `templates/secret-intake`. The rail badge on this destination currently reads `6`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, because this console stores no secret of its own. A credential typed into a control is consumed and the field blanked in the same step — precisely so that nothing keeps it — which also means there is nothing here to name, date or rotate. The table is empty for that reason rather than for want of a phone system to read.\n\n## Configuration\n\n### Handling\n\nStorage and rotation rules for everything in the intake.\n\n- **Storage** (`x_store`) — a segmented control, default `OS keychain`, choices `OS keychain`, `Encrypted file`.\n- **Rotation reminder** (`x_rotate`) — a slider control, default `90`.\n- **Mask in all surfaces** (`x_mask`) — a switch control, default `true`.\n- **Allow export** (`x_export`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery row reflects a real object in templates/secret-intake; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in templates/secret-intake, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Vocabulary & guard](vocab.md), [AMI & ARI](../data/ami.md), and [Operations](ops.md).\n"
    },
    {
      "id": "agent/skills",
      "category": "agent",
      "title": "Skills registry",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "hub.md",
        "ops.md"
      ],
      "body": "# Skills registry\n\n## Behavior\n\nInstalled agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here. It is backed by `skills/`. The rail badge on this destination currently reads `26`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing. This console installs no agent skills and has no registry to read one from, so the table is empty.\n\nThe orchestration settings below are this console's own preferences and are stored locally; they describe no installed skill, because there is none.\n\n## Configuration\n\n### Orchestration\n\nMulti-agent orchestration defaults.\n\n- **Maximum parallel lanes** (`u_lanes`) — a stepper control, default `4`.\n- **Isolated worktree per lane** (`u_isolate`) — a switch control, default `true`.\n- **Lane model override** (`u_model`) — a select control, default `gpt-5.6-luna`, choices `gpt-5.6-luna`, `inherit`.\n- **Verification panel for high-risk lanes** (`u_verify`) — a switch control, default `true`.\n- **Keep destructive actions with orchestrator** (`u_destruct`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in skills/; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in skills/, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Status hub](hub.md), and [Operations](ops.md).\n"
    },
    {
      "id": "agent/status-hub-client",
      "category": "agent",
      "title": "Status Hub client",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/status-hub.md",
        "../system/security.md",
        "../platform/hosted-authentication.md",
        "../platform/in-context-recovery.md"
      ],
      "body": "# Status Hub client\n\n## Behavior\n\nThe client provides a typed, renderer-safe connection to the project's live status service. It can:\n\n- register a project and retain the server's registration receipt;\n- read the project record and its observed checks;\n- read sessions with exact ids, states, commit references, run references and evidence links;\n- read each session's question list and reply inbox; and\n- submit a question answer and expose the server's delivery receipt.\n\nThe desktop primary shell mounts the Status Hub surface through `createStatusHubClient` and `createStatusHubStore`. Before the first mount, the store hydrates a strictly validated project id and registration receipt from the durable settings store. A missing receipt triggers one registration attempt, and the returned receipt is persisted. A typed not-found or stale receipt clears the saved value and performs at most one bounded re-registration. Other refusals remain visible with Retry and Re-register actions.\n\nThe renderer surface derives rows only from server observations. It has no sample project, sample session, or optimistic delivery state. A question remains without a receipt until the server returns one. Polling is non-blocking, bounded, single-flight, and cancellable.\n\n## Configuration\n\n`StatusHubClient` accepts:\n\n- `baseUrl`, which must be HTTPS or HTTP on `localhost`, `127.0.0.1`, or `::1`;\n- optional `enrollment` and `reply` credential references; and\n- optional request and polling deadlines.\n\nCredential references use the bounded `vault://...` form. The client never accepts a bearer value, password, API key, or other credential value. A privileged host is responsible for resolving the references from its operating-system vault.\n\nThe registration descriptor is exported as `STATUS_HUB_REGISTRATION_DESCRIPTOR` for a later dispatch integration. The current route shape is:\n\n```text\nPOST /api/status-hub/projects\nGET  /api/status-hub/projects/:projectId\nGET  /api/status-hub/projects/:projectId/sessions\nGET  /api/status-hub/sessions/:sessionId\nGET  /api/status-hub/sessions/:sessionId/replies\nPOST /api/status-hub/sessions/:sessionId/questions/:questionId/answers\n```\n\nAll responses are bounded before JSON parsing. Redirects are refused, cross-origin responses are refused, and requests have deadlines. A new mount generation aborts older work and marks its late results stale.\n\n## Failure modes\n\nThe store reports the observed availability state instead of converting a failure into an empty success. Durable receipt read and write failures remain visible as a persistence warning while the live registration remains usable:\n\n- `unavailable`: the route or service is not reachable;\n- `offline`: a network or deadline failure occurred;\n- `authRequired`: the service requires authentication;\n- `refused`: the service rejected the request, URL, redirect, or response bounds;\n- `stale`: a newer generation superseded the request;\n- `partial`: some project, session, or inbox data arrived while another read did not; and\n- `error`: the response shape or JSON was invalid.\n\nThe surface exposes Retry and Re-register actions for refusals. A not-found or stale receipt is cleared and replaced at most once per mount. A failed durable settings write never deletes the live registration or claims that persistence succeeded.\n\nAn answer submission that receives a transport error does not create a receipt. A refusal returned by the server is shown only when it is part of the typed server receipt.\n\n## Security and privacy\n\nThe client does not log request bodies, response bodies, credential references, or credential values. It sends only a vault reference header to the configured origin. URL parsing rejects embedded credentials, fragments, unexpected origins, and non-HTTPS non-loopback transport. Response bodies are limited to 512 KiB, lists are bounded, and all strings are length-checked before entering renderer state.\n\nThe renderer receives project and session evidence links, states and ids, but no enrollment or reply credential material. The client does not follow redirects. A host integration must keep vault resolution in the privileged boundary and must never pass the resolved value through renderer code.\n\n## Verification boundary\n\nThis lane was implemented without launching tests, builds, lint, network requests, runtime interaction, or capture workflows. The decisive verification remains the later integration's typed build and server-contract checks against the exact endpoints recorded above.\n\n## Suggested articles\n\n- [Status Hub](../platform/status-hub.md) — the surface this client feeds, and what it does with a\n  registration receipt once one exists.\n- [Local security](../system/security.md) — where the `vault://` references named above are\n  resolved, and why a resolved value never crosses into renderer code.\n- [Hosted authentication](../platform/hosted-authentication.md) — the `authRequired` state above,\n  read from the side that produces it.\n- [In-context recovery](../platform/in-context-recovery.md) — the Retry and Re-register actions, and\n  the rule that a recovery route is offered beside the failure rather than in a menu elsewhere.\n"
    },
    {
      "id": "agent/sync",
      "category": "agent",
      "title": "Sync & attestation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "memory.md",
        "secrets.md",
        "../app/history.md"
      ],
      "body": "# Sync & attestation\n\n## Behavior\n\nEvery sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here. It is backed by `agent-memory-sync`. The rail badge on this destination currently reads `ok`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, because there is nothing to synchronise: this console keeps no agent-memory corpus (see [Memory console](memory.md)). With no run to record there is no run history, no backup and no attestation, so the table is empty rather than listing runs that never happened.\n\nThe schedule controls below are this console's own preferences and are stored locally. They describe no run, because there is none.\n\n## Configuration\n\n### Schedule\n\nWhen the console pushes memory upstream.\n\n- **Automatic sync** (`y_auto`) — a switch control, default `true`.\n- **Interval** (`y_every`) — a slider control, default `60`.\n- **Backup before write** (`y_backup`) — a switch control, default `true`.\n- **Require attestation** (`y_attest`) — a switch control, default `true`.\n- **Keep backups** (`y_retain`) — a stepper control, default `30`.\n\n## Failure modes and security\n\nEvery row reflects a real object in agent-memory-sync; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in agent-memory-sync, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "agent/vocab",
      "category": "agent",
      "title": "Vocabulary & emission guard",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "secrets.md",
        "../app/notifications.md"
      ],
      "body": "# Vocabulary & emission guard\n\n## Behavior\n\nThe private vocabulary dictionary and the emission guard that blocks a forbidden term before it can leave the process. It is backed by `vocabulary-dictionary.json`. The rail badge on this destination currently reads `lock`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nThe real loaded state of the dictionary you upload from this machine, in words — whether one is loaded and how many replacements it is applying to the interface.\n\nThe terms themselves are deliberately **not** listed in the table. Every table in this console can be selected, copied and exported to a file, and a private vocabulary term must never reach an export or the clipboard. So the dictionary stays in this machine's own local cache, is applied to the interface, and is reported here as a count rather than as rows. That is a decision, not an omission.\n\n## Configuration\n\n### Emission guard\n\nRuns on every string the app is about to write or display.\n\n- **Guard enabled** (`n_guard`) — a switch control, default `true`.\n- **On violation** (`n_mode`) — a segmented control, default `Block`, choices `Warn`, `Block`, `Rewrite`.\n- **Scan surfaces** (`n_scan`) — a chips control, default `UI text`, `Logs`, `Exports`, choices `UI text`, `Logs`, `Exports`, `Clipboard`, `Telemetry`.\n- **Vocabulary lock** (`n_lock`) — a switch control, default `true`.\n- **Report drift daily** (`n_drift`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in vocabulary-dictionary.json; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in vocabulary-dictionary.json, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [Notifications](../app/notifications.md).\n"
    },
    {
      "id": "app/about",
      "category": "app",
      "title": "About",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../agent/ops.md",
        "../system/security.md",
        "customise.md"
      ],
      "body": "# About\n\n## Behavior\n\nBuild provenance and the policies this console is bound by. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Policy\n\nNon-negotiable behaviour, surfaced so it is never a surprise.\n\n- **Code signing** (`z_sign`) — a segmented control, default `Prohibited`, choices `Prohibited`. Packages ship unsigned on purpose. Windows may show an unknown-publisher warning; nothing here claims to be verified.\n- **Installer** (`z_installer`) — a segmented control, default `Squirrel.Windows`, choices `Squirrel.Windows`.\n- **Telemetry** (`z_telemetry`) — a switch control, default `false`.\n- **Send crash reports** (`z_crash`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in the owning configuration; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in the owning file, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Operations](../agent/ops.md), [Security](../system/security.md), and [Customise everything](customise.md).\n"
    },
    {
      "id": "app/appearance",
      "category": "app",
      "title": "Appearance",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "customise.md",
        "history.md",
        "notifications.md"
      ],
      "body": "# Appearance\n\n## Behavior\n\nDensity, theme and motion for this console. Changes apply immediately with an undo. It is backed by `console settings`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Layout\n\nHow much fits on screen.\n\n- **Row density** (`p_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.\n- **Theme** (`p_theme`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`.\n- **Interface scale** (`p_scale`) — a slider control, default `100`.\n- **Reduced motion** (`p_motion`) — a switch control, default `false`.\n- **Monospace numerics** (`p_mono`) — a switch control, default `true`.\n\n### Behaviour\n\nThe console itself.\n\n- **Open on launch** (`p_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`.\n- **Offer the tour on launch** (`p_tour`) — a switch control, default `false`.\n- **Keep running in tray** (`p_tray`) — a switch control, default `true`.\n- **Full ceremony on every destructive action** (`p_confirm`) — a switch control, default `true`. Leave this on. It is the four-gate check: key, arming switch, slider and attention test.\n\n## Failure modes and security\n\nEvery control here maps to a real key in console settings; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console settings, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Customise everything](customise.md), [History & git](history.md), and [Notifications](notifications.md).\n"
    },
    {
      "id": "app/arcade",
      "category": "app",
      "title": "Confirmation credits",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "history.md",
        "customise.md",
        "notifications.md"
      ],
      "body": "# Confirmation credits\n\n## Behavior\n\nThe four-gate ceremony is thorough and, twelve times a day, exhausting. Win credits here and spend one to skip a ceremony. Credits are earned, never bought with money, and destructive actions above the danger line always cost two. It is backed by `arcade`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Spending rules\n\nHow credits are allowed to replace a ceremony.\n\n- **Allow credits to skip ceremonies** (`cr_enable`) — a switch control, default `true`.\n- **Cost per skip** (`cr_cost`) — a stepper control, default `1`.\n- **High-danger actions still need the full ceremony** (`cr_danger`) — a switch control, default `true`. Restarting Asterisk, unloading a module and deleting an endpoint are above the danger line. Leave this on unless you enjoy explaining outages.\n- **Maximum credits held** (`cr_cap`) — a stepper control, default `20`.\n- **Credits expire after** (`cr_expire`) — a slider control, default `7`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in arcade; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in arcade, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[History & git](history.md), [Customise everything](customise.md), and [Notifications](notifications.md).\n"
    },
    {
      "id": "app/customise",
      "category": "app",
      "title": "Customise everything",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "appearance.md",
        "../platform/language-modes.md",
        "../platform/school-mode.md",
        "../platform/narration.md",
        "notifications.md"
      ],
      "body": "# Customise everything\n\n## Behavior\n\nThe global layer reaches across the console, while each rendered element can still override it from its own context menu. It is backed by the local console profile.\n\n## Configuration\n\n### Fun\n\nEnglish and Cantonese have independent funny levels from 1 (fully serious) to 5 (maximum playfulness), both defaulting to 5. `fun_english` and `fun_cantonese` persist separately, and each has its own reset control. Notification and dialog wrappers preserve facts while styling the selected language.\n\nOther fun controls cover copy tone, celebrations, confetti, sound, hidden surprises and per-element appearance randomness. The global summary derives from the two language levels.\n\n### School mode and narration\n\n- `school_mode` forces English and removes Cantonese, bilingual, funny-level, vocabulary, dim-sum, narration, search and palette surfaces while active.\n- `school_name` is a validated shared display name. The chosen name replaces the shipped name in labels, descriptions, prompts, notices and accessible names.\n- `school_set_credential` and `school_unlock` open an app-owned accessible dialog. The credential is stored through the operating-system credential vault under `ding-pbx-console:school-mode-shared-unlock`, never in settings or application data. The exact `app.getPath('userData')` recovery path is fetched before the dialog can open.\n- `nar_enabled` is off by default. The narrator persists language, compatible voice identities, rate, pitch, quiet state and the explicit screen-reader override. Platform accessibility state is also read when available.\n\n### Motion\n\nGlobal timing. Individual elements can still set their own.\n\n- `mo_speed` controls animation speed.\n- `mo_curve` selects easing.\n- `mo_screen` and `mo_dialog` select screen and dialog transitions.\n- `mo_reduce` respects reduced motion.\n\n### Layout, theme, behavior and profiles\n\nThe remaining groups control rail position, density, dimensions, theme, accent, contrast, launch behavior, confirmation behavior, history, profile selection and export behavior. Each value is persisted by the owning control and has a generated explanation.\n\n## Failure modes and security\n\nAn unavailable settings store leaves the last known state in place and reports the refresh failure. Invalid names restore the previous valid name. The credential value never enters settings, exports, history, logs, captures or renderer state after submission.\n\n## Verification\n\nThe design source is compiled into the renderer. The dynamic event inventory records localized events and intentional plain-English fallbacks. The focused narration and language modules cover the pure behavior; built-artifact interaction evidence remains in the per-surface inventory.\n\n## Suggested articles\n\n[Appearance](appearance.md), [Language modes](../platform/language-modes.md), [School mode](../platform/school-mode.md), [Spoken narration](../platform/narration.md), [Notifications](notifications.md).\n"
    },
    {
      "id": "app/history",
      "category": "app",
      "title": "History",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "servers.md",
        "../system/security.md",
        "arcade.md"
      ],
      "body": "# History\n\n## Behavior\n\nEvery control you touch commits to a local git repository the moment you touch it. This screen is the full history: the commit graph, the exact diff, blame per option, branches for trying things out, and a restore that runs the four gates. It is backed by `/etc/asterisk/.git`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Commit behaviour\n\nWhat happens on every single change.\n\n- **Commit on every change** (`hi_commit`) — a switch control, default `true`. On means each toggle, slider and picker writes a real git commit against the configuration directory. Off batches changes until you commit by hand — which is how people lose track of what they changed.\n  - *What it is:* Whether every individual control change writes a git commit immediately.\n  - *Why it exists:* It gives you an exact, attributable history and a one-click revert of any single change.\n  - *Choosing a value:* On is strongly recommended.\n  - *Gotcha:* Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.\n- **Commit message style** (`hi_msg`) — a segmented control, default `Descriptive`, choices `Terse`, `Descriptive`, `Conventional`.\n- **Attribute commits to** (`hi_author`) — a segmented control, default `Signed-in user`, choices `Signed-in user`, `Console`, `Both`.\n- **Sign commits** (`hi_sign`) — a switch control, default `false`.\n- **Mirror to a remote** (`hi_push`) — a switch control, default `false`.\n- **Run asterisk config validation as a pre-commit hook** (`hi_hook`) — a switch control, default `true`.\n\n### Retention & safety\n\nHow much history is kept and what a restore does.\n\n- **Keep commits** (`hi_keep`) — a stepper control, default `500`.\n- **Garbage collect monthly** (`hi_gc`) — a switch control, default `true`.\n- **Show a diff before restoring** (`hi_diff`) — a switch control, default `true`.\n- **Restore onto a new branch instead of main** (`hi_branch`) — a switch control, default `true`.\n- **Reload Asterisk after a restore** (`hi_reload`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in /etc/asterisk/.git; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in /etc/asterisk/.git, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Deploy & servers](servers.md), [Security](../system/security.md), and [Arcade](arcade.md).\n"
    },
    {
      "id": "app/lifecycle-integrity",
      "category": "app",
      "title": "Lifecycle and configuration integrity",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security considerations",
          "id": "security-considerations"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "servers.md",
        "history.md",
        "../system/security.md"
      ],
      "body": "# Lifecycle and configuration integrity\n\nThe desktop console keeps server selection, configuration writes, and Asterisk daemon actions tied to one explicit target. It does not treat discovery, persistence, process launch, or an accepted CLI command as proof that a connection or lifecycle transition succeeded.\n\n## Behavior\n\n- The saved server inventory uses a versioned schema and validates every record before it can become a target.\n- A missing inventory is an empty first-run state. Unreadable or malformed inventory data is a blocking error and is never overwritten by a later add, edit, remove, or selection.\n- Connection kinds use the control-plane contract names: `wsl`, `localDocker`, `remoteLinux`, and `remoteDocker`.\n- WSL connection success requires both a valid operating-system observation and a valid Asterisk daemon identity from the exact selected distribution.\n- Docker and remote routes may be saved with their required routing fields, but daemon and configuration operations refuse them until their target-specific transports are implemented.\n- Start and restart succeed only after the selected daemon returns a valid identity. Stop succeeds only after an independent process check proves that Asterisk is no longer running.\n- Configuration reads return an explicit `present` or `absent` state. Read errors never become empty documents.\n- Existing secret values cross the renderer boundary only as hidden, non-writable references. The privileged transport resolves those references against the current target while staging, then verifies the exact post-write file without returning raw secret bytes.\n- Every staged configuration file has a unique handle and retains the live file's numeric uid, gid, and mode. When the target is absent, a new file starts with the documented restrictive `root:root` and `0600` metadata. Apply renames the staged file, reapplies the retained metadata through fixed argument lists, then independently stats the live file before reporting success.\n- Backup and rollback retain and reapply backup metadata, with an independent post-rollback stat. If a metadata step fails after the rename, the transport restores the bound backup before returning the failure.\n- A transaction is bound to its target id, verifies each applied file, reloads the affected Asterisk subsystem, and verifies the selected running daemon before reporting success.\n- The onboarding flow creates the endpoint, authentication, and AoR sections together. Endpoint create, save, and delete require a successful live `pjsip.conf` read and invalidate the displayed reading after a verified write.\n\n## Configuration\n\nThe server inventory accepts only fields belonging to its selected connection kind. WSL records require a discovered distribution. Local container records require a project. Remote records require an exact host, user, and valid port, while remote container records also require a project.\n\nConfiguration resources remain restricted to exact files below `/etc/asterisk`. Composite screen labels are split into individually allowlisted files and are accepted only when every component is a valid configuration filename. A partial multi-file read is reported as unavailable instead of combining old and new observations.\n\n## Failure modes\n\n- An unreadable inventory remains untouched and the server list reports the read reason.\n- A target changed after planning causes the write to be refused and reviewed again.\n- A missing configuration file is reported as absent. A failed, oversized, timed-out, malformed, or partial read is unavailable and cannot seed a write.\n- A hidden value whose original field disappeared is refused rather than replaced with a marker.\n- A reload or runtime verification failure triggers reverse-order file rollback and reloads the restored resources. If that recovery cannot be verified, the transaction remains failed and does not claim a safe rollback.\n- A stopped-daemon probe that cannot prove process absence is reported as unresponsive or unknown, never stopped.\n- Unsupported Docker and remote target transports remain visible as saved profiles with an exact refusal reason. They are not silently rerouted through WSL.\n\n## Security considerations\n\nRaw configuration bytes are read only inside the privileged control plane through fixed `wsl.exe` arguments, with bounded output and time. They are not logged, returned to the renderer, placed in command arguments, or persisted in the server inventory. Writable configuration documents are structurally validated before rendering, target resources are exact-allowlisted, and unique staging paths prevent two writes from sharing a predictable temporary file. Staged metadata is retained only against the generated handle and is cleared on validation or apply failure. The fixed `mv`, `chown`, `chmod`, and `stat` sequence has no shell concatenation, and metadata mismatches fail closed.\n\nPackaged-runtime provenance and base-image metadata use explicit schemas. Base-image URLs require HTTPS and an approved Ubuntu image host, with no embedded credentials. Renderer responses omit packaged filesystem paths.\n\nThe hosted HTTP layer must still enforce its own request-origin policy before dispatch. The dispatcher validates request shape and action membership, but it does not receive the browser request origin and therefore cannot replace the host's origin check.\n\n## Verification\n\nThis change was implemented under an ultra-speed boundary that prohibited tests, lint, type checks, builds, packaging, UI interaction, and captures. Verification in this task is limited to source and diff inspection. Runtime behavior, compilation, interaction reachability, and rollback behavior remain unverified until the owning integration task runs the applicable local checks and exercises the built desktop artifact.\n\n## Suggested articles\n\n- [Deploy a server](servers.md)\n- [History and Git](history.md)\n- [Security](../system/security.md)\n"
    },
    {
      "id": "app/notifications",
      "category": "app",
      "title": "Notification centre",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "history.md",
        "arcade.md",
        "../agent/vocab.md"
      ],
      "body": "# Notification centre\n\n## Behavior\n\nEvery non-blocking notification the console has raised, reviewable after the fact so nothing important disappears with a toast. It is backed by `console`. The rail badge on this destination currently reads `4`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Delivery\n\nWhat interrupts you and what merely gets recorded.\n\n- **Show toasts** (`nt_toast`) — a switch control, default `true`.\n- **Play a sound** (`nt_sound`) — a switch control, default `false`.\n- **Notify on** (`nt_levels`) — a chips control, default `Errors`, `Warnings`, choices `Errors`, `Warnings`, `Info`, `Every change`.\n- **Quiet hours** (`nt_quiet`) — a switch control, default `false`.\n- **Keep history for** (`nt_keep`) — a slider control, default `30`.\n\n## Failure modes and security\n\nEvery row reflects a real object in console; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[History & git](history.md), [Arcade](arcade.md), and [Vocabulary & guard](../agent/vocab.md).\n"
    },
    {
      "id": "app/README",
      "category": "app",
      "title": "App",
      "headings": [],
      "links": [
        "servers.md",
        "arcade.md",
        "notifications.md",
        "history.md",
        "customise.md",
        "appearance.md",
        "about.md"
      ],
      "body": "# App\n\nDeploy & application: stand up a new server, then appearance, updates and the console itself.\n\n- [Deploy & servers](servers.md)\n- [Arcade](arcade.md)\n- [Notifications](notifications.md)\n- [History & git](history.md)\n- [Customise everything](customise.md)\n- [Appearance](appearance.md)\n- [About & policy](about.md)\n"
    },
    {
      "id": "app/servers",
      "category": "app",
      "title": "Deploy a server",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../system/security.md",
        "../data/ami.md",
        "../agent/ops.md"
      ],
      "body": "# Deploy a server\n\n## Behavior\n\nThis screen discovers local targets, verifies the selected target through the control plane, and keeps the configured server list in the installation's local inventory. Discovery alone is not treated as a connection: the desktop calls `server.connect`, starts the managed daemon when needed, and retries the verification once. The rail badge is empty until a real server row exists. It lives on the App rail, under the Deploy & application group: stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Route\n\nHow this console reaches Asterisk. Everything below reshapes itself around this answer. The selected local target is read from the real discovery result rather than from the design's example names.\n\n- **Connection type** (`sv_kind`) — a segmented control, default `Local`, choices `Local`, `Local Docker`, `SSH`, `SSH Docker`. Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.\n  - *What it is:* How this console reaches Asterisk: locally, into a container, over SSH, or over SSH and then into a container.\n  - *Why it exists:* Everything else on the screen reshapes around this answer, including how configuration files are written.\n  - *Choosing a value:* Local for the same machine, Local Docker for a container here, SSH for another machine, SSH Docker for a container elsewhere.\n  - *Gotcha:* Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled.\n- **Host** (`sv_host`) — the host value supplied to the local inventory. It starts empty until the user supplies a target.\n- **Container** (`sv_container`) — the container context supplied to the local inventory when a container route is selected.\n- **SSH user** (`sv_user`) — the user supplied to the local inventory for an SSH route.\n- **SSH port** (`sv_sshport`) — a stepper control, default `22`.\n- **Strict host key checking** (`sv_hostkey`) — a switch control, default `true`. On means a changed host key aborts the connection instead of asking you to accept it. That prompt is how people get compromised.\n  - *What it is:* Whether a changed SSH host key aborts the connection.\n  - *Why it exists:* A changed host key means either a rebuild or an interception. Only one of those is benign.\n  - *Choosing a value:* On, always.\n  - *Gotcha:* The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.\n\n### Manager interface\n\nAMI for live events and CLI, ARI for Stasis applications.\n\n- **Interface** (`sv_iface`) — a segmented control, default `AMI`, choices `AMI`, `ARI`, `Both`.\n- **Manager port** (`sv_amiport`) — a stepper control, default `5038`.\n- **TLS** (`sv_tls`) — a switch control, default `true`.\n- **Forward through the SSH tunnel** (`sv_forward`) — a switch control, default `true`.\n- **Reconnect automatically** (`sv_watch`) — a switch control, default `true`.\n- **Open read-only** (`sv_readonly`) — a switch control, default `false`.\n\n## Failure modes and security\n\nThe server list is an honest local inventory. A discovered target is not labelled connected until `server.connect` confirms it. If the control plane cannot answer, the row retains the exact unavailable reason and the dashboard retries failed readings on its one-second refresh cadence. Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled. The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.\n\n## Verification\n\nExercise discovery with no target, discovery with a target whose daemon is stopped, a successful `server.connect`, and a refused connection. Confirm no row is labelled connected before the control-plane response, and that a failed dashboard read retries without relaunching the app.\n\n## Suggested articles\n\n[Security](../system/security.md), [AMI & ARI](../data/ami.md), and [Operations](../agent/ops.md).\n"
    },
    {
      "id": "changelog-fragments/2026-08-23-site-local-suites",
      "category": "changelog-fragments",
      "title": "Local suite pages added",
      "headings": [],
      "links": [],
      "body": "# Local suite pages added\n\nAdded the local file-converter and browser-local Ollama manager pages. The converter exposes only bundled text, structured, and binary-encoding adapters, while every unavailable media, document, and archive family stays visible with its missing-adapter reason. The Ollama page requires explicit loopback approval, keeps catalogue completeness unknown unless an exhaustive catalogue fetch exists, and reports browser and service boundaries without fake success.\n\nVerification remains pending because this lane intentionally ran no build, lint, test suite, browser session, or network request.\n"
    },
    {
      "id": "changelog-fragments/2026-08-23-site-universal-shell",
      "category": "changelog-fragments",
      "title": "Documentation website shared shell and factual status records",
      "headings": [
        {
          "title": "Changed",
          "id": "changed"
        },
        {
          "title": "Evidence boundary",
          "id": "evidence-boundary"
        }
      ],
      "links": [],
      "body": "# Documentation website shared shell and factual status records\n\n## Changed\n\n- Added one local shared control shell to every top-level page and every composed documentation article.\n- Added persisted language, independent 1-to-5 voice controls, attention modes, site-owned scheduling, appearance and logo controls, personal-vocabulary validation, notification history, direct article search, menu search, and complete site-state export.\n- Replaced copied status counters, decorative trends, and guessed download copy with build-manifest and validated release-record rendering.\n- Removed the invented product call path and linked command-palette article results directly to composed articles.\n- Moved every opted-in regular-expression preview and site search evaluation into bounded, locally constructed workers with timeouts, cancellation, zero-width handling, capture-group reporting, and stable-id result application.\n- Cleared stale search results while worker evaluation is pending or unavailable, and kept plain-text search synchronous by default.\n- Made destination coverage rails explicitly derive their labels and values from the current catalogue, and changed clipboard, export, vocabulary-clear, and logo-clear feedback so success is reported only after the corresponding local action starts or completes.\n\n## Evidence boundary\n\nNo automated test, build, package, or visual capture was run for this source change. Published status remains unavailable until `console/site/build.mjs` composes and embeds a validated record.\n"
    },
    {
      "id": "changelog-fragments/external-settings-sources",
      "category": "changelog-fragments",
      "title": "External settings source contract",
      "headings": [
        {
          "title": "External settings source contract",
          "id": "external-settings-source-contract"
        }
      ],
      "links": [],
      "body": "# External settings source contract\n\n## External settings source contract\n\n- Added a secret-free shared contract for local, versioned HTTPS, and Home Assistant boolean schedule sources.\n- Added bounded privileged reads with HTTPS and loopback development URL rules, redirect rejection, response size and depth limits, allowlisted assignment targets, generation cancellation, refresh cadence, and vault-reference-only authentication.\n- Added in-memory last-valid and local-base fallback state without persisting remote assignments, plus a renderer-safe state projection.\n\nVerification for this fragment: implementation-only lane. No tests, builds, network requests, runtime interaction, or captures were run by this lane.\n"
    },
    {
      "id": "changelog/attention-runtime-mount",
      "category": "changelog",
      "title": "Attention runtime mount",
      "headings": [],
      "links": [],
      "body": "# Attention runtime mount\n\n- Mounted the five attention controls from durable settings on desktop application start, with every mode still off by default and independently persisted.\n- Added live Focus dimming without hiding inactive work, low-stimulation color and motion consumers, platform reduced-motion composition, session and since-last-change values, a persisted next-action field, and factual Momentum snooze handling.\n- Added Cantonese labels for the new next-action control.\n- Repaired the runtime to use stable semantic design markers, acknowledged durable writes with pending, session-only, and retry states, severity-aware notification suppression, bounded snooze restoration, and centralized last-change tracking across real server, endpoint, onboarding, file, ticket, lock, and appearance mutations.\n- Repaired the second pass with explicit notification severity, per-key durable write serialization and newest-generation retry handling, plus one generated `onUserMutation` callback covering controls, steppers, appearance, canvas, layout, tabs, groups, presets, and application-owned mutations.\n- Group tabs by area now creates real groups, while moving a tab to a new window is labelled unavailable rather than claiming an unimplemented operation.\n- Status: implemented-unverified in this lane. The design compiler ran, but no UI, accessibility, browser, capture, or built-artifact verification ran here.\n"
    },
    {
      "id": "changelog/automatic-updater-reliability",
      "category": "changelog",
      "title": "Automatic updater reliability",
      "headings": [],
      "links": [],
      "body": "# Automatic updater reliability\n\n- Draft-count updates now advance the main-process updater revision before publication, so a stale status read cannot overwrite a newer restart block.\n- PBX draft publication now counts every loaded resource against its last live read, including the currently edited resource, so apply, discard, restore, and field edits converge on one accurate restart block.\n- Installer launch acknowledgement clears its timeout on success and failure, preventing an old timer from changing a later state.\n- Successful installer acknowledgement now returns to the renderer before quit is scheduled, while the installing latch stays held through shutdown and clears only for a failed launch.\n- Release identity validation rejects duplicate artifact records, requires every resolved full and delta package exactly once, and checks version-bearing Squirrel filenames.\n- Published tags retain the legacy-compatible `ding-pbx-console-v0.0.<run>-r<attempt>` shape while the package identity remains monotonic `0.1.<run>`, so existing `0.1.0` installations can see repaired releases.\n- Published packaging now rejects a tag and package-version pair unless the run number maps exactly to `0.1.<run>` within a bounded positive range; local unpublished `tag: null` builds remain valid.\n- Added two byte-preserved built-artifact update captures with source and release SHAs, dimensions, digests, hidden-desktop CDP method, direct installer launch, restart, Later, and draft-block evidence.\n- A newer ready revision now clears a stale local spawn-error message after recovery, while current failure state remains visible.\n"
    },
    {
      "id": "changelog/browser-extension-transfer",
      "category": "changelog",
      "title": "Browser-extension transfer surfaces",
      "headings": [
        {
          "title": "Browser-extension transfer surfaces",
          "id": "browser-extension-transfer-surfaces"
        }
      ],
      "links": [
        "browser-extension-download-surfaces-implementation.md"
      ],
      "body": "# Browser-extension transfer surfaces\n\n## Browser-extension transfer surfaces\n\n- Added typed extension handoff, transfer snapshot, command receipt, window-intent, and surface-registration contracts.\n- Added distinct Start download, Downloading, and Download complete renderer surfaces with real-client request seams, exact observed progress fields, partial-result reporting, keyboard focus, accessible live regions, reduced-motion behavior, and narrow-layout styling.\n- Added implementation documentation describing the preload/control-plane integration boundary and the deliberate no-simulation rule.\n\nVerification for this fragment: this lane intentionally ran no tests, builds, runtime interaction, or captures, as its implementation article records under [Browser-extension download transfer surfaces](browser-extension-download-surfaces-implementation.md). No extension has submitted a handoff, and none of the three surfaces has been photographed.\n"
    },
    {
      "id": "changelog/dim-sum-startup-runtime",
      "category": "changelog",
      "title": "Runtime contract: dim-sum startup cache",
      "headings": [
        {
          "title": "Runtime contract: dim-sum startup cache",
          "id": "runtime-contract-dim-sum-startup-cache"
        }
      ],
      "links": [
        "dim-sum-startup-runtime.md"
      ],
      "body": "# Runtime contract: dim-sum startup cache\n\n## Runtime contract: dim-sum startup cache\n\nAdded the mount-ready dim-sum startup runtime contract. It performs one cryptographically secure ten-percent draw per launch, suppresses School mode, first run, error, update, and mid-task states, and renders only a local image from a validated private application-data cache. The cache records the public catalog revision, bilingual names, published catalog-v1 asset identity, byte size, digest, and static decode proof. Missing or invalid cache data reports unavailable and never fetches or invents a dish.\n\nVerification for this fragment: nothing here has been driven in a built artifact, as its runtime article records under [Dim-sum startup runtime cache](dim-sum-startup-runtime.md). No launch has been observed winning or losing the draw, no cache has been produced by a package step, and no surface has been photographed.\n\n"
    },
    {
      "id": "changelog/forge-publishing-runtime",
      "category": "changelog",
      "title": "Forge publishing runtime",
      "headings": [],
      "links": [],
      "body": "# Forge publishing runtime\n\nThe desktop History screen now has a real provider-publishing runtime rather than a queued toast. It discovers local GitHub CLI accounts, confirms the selected login is active, proves `keyring` storage and refuses plaintext fallback, keeps only account ids and provider-supplied vault references, loads personal and organization owners from provider data with unknown organization capabilities until proven, and makes the fork and copy-and-push routes visibly distinct. Typed `gh` and `git` calls run with `shell: false`, per-request bounded deadlines, cleared inherited authentication variables, explicit GitHub host binding, exact destination identity and effective push-URL verification through `git ls-remote`, direct push to the validated URL, atomic versioned state with a CAS lock and terminal-state retirement, reloadable account and publication receipts, direct ConPTY-backed `gh auth login --web` with asynchronous reads, actual exit-code recording, immutable operation and expiry binding, ANSI stripping, a fixed no-op browser command, PID creation-identity cancellation, and explicit re-authentication outcomes based on pre and post credential state. The bundled archive and extracted CLI digests are pinned separately, and the exact no-token keyring-status fixture is included. GitLab remains an honest unavailable capability until its adapter exists. Runtime provider verification remains unrun.\n"
    },
    {
      "id": "changelog/inventory-schema-recovery",
      "category": "changelog",
      "title": "Inventory schema recovery",
      "headings": [],
      "links": [],
      "body": "# Inventory schema recovery\n\n- Restored `console/site/feature-registry.json` to schema v2. The integration merge had replaced it with a flat `{state, note, files}` file, dropping `implementation`, `registration`, `route`, `documentation`, `localization`, `persistence`, `focusedChecks`, `negativeEvidence`, `builtInteraction`, `captures` and `designParity` from all 44 rows. The restored file is a reconciliation, not a revert: every row's status is the current one, and every path, symbol and document it names was checked against this tree.\n- Repaired the symbol claims the merge invalidated. `loadLogoFromInput` and `loadVocabularyFromInput` had been renamed to `loadLogo` and `loadVocabulary`; the site converter now has a real `initConverter` mount and records `implemented-unverified`, while `initOllama` remains absent and its page records that every control is inert.\n- Added `console/site/tests/contracts/feature-registry-schema.test.mjs`, which runs the same validator the inventory check runs, requires every named file, symbol and document to resolve, and plants twelve breaks one at a time.\n- Defined `onUserMutation` on `App`. The compiled shell calls it after every control commit and nothing in the tree defined it, so changing any control threw `this.onUserMutation is not a function`. Added `console/tests/ui/shell-self-calls-resolve.test.tsx`, which reads every `this.name(` the shipped shell makes on itself and requires each to resolve on a real `App`.\n- Added `aria-modal` to the Tab search overlay in `console/scripts/extend-pbx-m3.mjs`. It was the only one of fifteen dialogs declaring `role=\"dialog\"` without it, behind a full-inset scrim that closes on click.\n- Re-anchored three guards to the code as it is now written: the narration test to the current `narratedFire` signature, the attention wiring inventory's next-action row to the attention rail input that carries the value today, and the panel-observation role counts to the shell's own.\n- Moved four changelog fragments out of the feature-article categories and gave two articles the `## Suggested articles` heading their links were sitting under as a sentence. Normalised the required headings across twelve platform articles that covered every required subject under names of their own.\n- Left open, and recorded on the roadmap: the merged shell records one user mutation where the inventory names sixty-one, so `test:inventories` remains red and says so.\n"
    },
    {
      "id": "changelog/logo-conversion",
      "category": "changelog",
      "title": "Changelog fragment: bounded app-logo conversion",
      "headings": [
        {
          "title": "Unreleased",
          "id": "unreleased"
        }
      ],
      "links": [],
      "body": "# Changelog fragment: bounded app-logo conversion\n\n## Unreleased\n\n- Added shared app-logo contracts for shipped presets, a semantic local image picker, signature-first inspection, safe static SVG handling, bounded crop models, contrast warnings, conversion receipts, and stable package identity.\n- Added a control-plane conversion boundary that requires an isolated decoder, independently validates every output, and preserves the previous logo when conversion fails.\n- Added a schema-versioned local cache that stores only converted assets and redacted receipts, with clear and reset purge operations.\n- Added a mount-ready renderer surface with keyboard-editable crop, focal-point, fit, background, preset, upload, status, and reset controls.\n\nVerification state: implementation contracts are ready for the integration lane. Decoder registration, dispatcher mounting, focused tests, packaged interaction, and captures remain unverified until that lane runs them.\n\n"
    },
    {
      "id": "changelog/status-hub-client",
      "category": "changelog",
      "title": "Changelog fragment: Status Hub client",
      "headings": [
        {
          "title": "Unreleased",
          "id": "unreleased"
        }
      ],
      "links": [],
      "body": "# Changelog fragment: Status Hub client\n\n## Unreleased\n\n- Added a typed Status Hub client and external store for project registration, observed sessions, reply inbox polling, and question delivery receipts.\n- Added HTTPS or explicit loopback transport validation, redirect refusal, bounded response parsing, request deadlines, generation cancellation, and honest unavailable/offline/authentication/refused/stale/partial states.\n- Added a standalone renderer surface that displays only server-observed project and session evidence. It does not invent rows or report delivery until a server receipt exists.\n\nVerification for this fragment: no tests, builds, lint, network requests, runtime interaction, or capture workflows were run in this implementation lane.\n"
    },
    {
      "id": "data/ami",
      "category": "data",
      "title": "Manager & REST interfaces",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "cdr.md",
        "../system/security.md",
        "../agent/secrets.md"
      ],
      "body": "# Manager & REST interfaces\n\n## Behavior\n\nMachine access to the PBX. Permissions are checkbox matrices, never a comma string you have to remember. It is backed by `manager.conf · ari.conf · http.conf`. The rail badge on this destination currently reads `2`. It lives on the Data rail, under the Records & APIs group: Call records, event logging and the machine interfaces.\n\n## Configuration\n\n### HTTP server\n\nARI and the built-in web sockets ride on this.\n\n- **HTTP enabled** (`a_http`) — a switch control, default `true`.\n- **Bind port** (`a_port`) — a stepper control, default `8088`.\n- **TLS enabled** (`a_tls`) — a switch control, default `true`.\n- **TLS port** (`a_tlsport`) — a stepper control, default `8089`.\n- **Allowed origins** (`a_origin`) — a chips control, default `https://console.local`, choices `https://console.local`, `https://ops.example`, `*`.\n\n### Manager permissions\n\nTick the classes this user may read or write.\n\n- **Read classes** (`a_read`) — a chips control, default `system`, `call`, `log`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `dtmf`, `reporting`, `cdr`, `dialplan`, `originate`, `message`.\n  - *What it is:* Which classes of AMI events and commands this user may read.\n  - *Why it exists:* AMI is full administrative access. Class-based permissions are the only granularity available.\n  - *Choosing a value:* system, call, log, verbose, command, agent, user, config, dtmf, reporting, cdr, dialplan, originate, message.\n  - *Gotcha:* The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.\n- **Write classes** (`a_write`) — a chips control, default `call`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `originate`, `message`.\n- **Deny by default** (`a_deny`) — a switch control, default `true`.\n- **Idle timeout** (`a_timeout`) — a slider control, default `300`.\n\n## Failure modes and security\n\nEvery row reflects a real object in manager.conf · ari.conf · http.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in manager.conf · ari.conf · http.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[CDR & CEL](cdr.md), [Security](../system/security.md), and [Secret intake](../agent/secrets.md).\n"
    },
    {
      "id": "data/cdr",
      "category": "data",
      "title": "Call records",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/unbound-controls.md",
        "ami.md",
        "../pbx/dash.md",
        "../system/logger.md",
        "../platform/unbound-controls.md"
      ],
      "body": "# Call records\n\n## Behavior\n\nWhich backend stores records, what counts as an answered call, and which events are logged.\nThis screen edits four files, each read and written independently: `cdr.conf` (its own\ndeclared `file`), plus `cel.conf`, `cel_odbc.conf` and `cel_pgsql.conf`, read the same way\nthe Security screen reads pjsip.conf and stir_shaken.conf besides its own acl.conf. It lives\non the Data rail, under the Records & APIs group: Call records, event logging and the machine\ninterfaces.\n\nThere is no single key anywhere that selects a CDR backend by name. `cdr.conf.sample`'s own\n\"CHOOSING A CDR BACKEND\" section is explicit about this: a backend is chosen by which\n`[section]` is present in cdr.conf itself (`[csv]`, `[radius]`), or by which separate file\nexists and is populated (`cdr_odbc.conf`, `cdr_pgsql.conf`, `cdr_custom.conf`, and so on).\n`d_status` reports that honestly instead of pretending a picker exists: what this screen has\nactually read as configured, against what the target's running Asterisk has actually\nregistered (`cdr show status`). A backend can be configured in a file and not loaded, or\nloaded from a configuration that has since changed underneath it — those are two different\nfacts, and the readout says both rather than one.\n\nCEL had no configuration surface at all before this: the screen's own declared `file` used to\nbe the two-file label `cdr.conf · cel.conf`, which is not a real filename, so nothing was ever\nactually read from a target and every control below silently showed the design's own shipped\ndefault. It now reads cel.conf, cel_odbc.conf and cel_pgsql.conf for real.\n\nConnection secrets never appear on this screen. cel_pgsql.conf's `password` key stays\ndeliberately unbound — see [Controls that do not write to a file, and why](../platform/unbound-controls.md).\n\n## Configuration\n\n### CDR — cdr.conf\n\nOne row per call.\n\n- **CDR enabled** (`d_enable`) — a switch control, default `true`. `[general]/enable`.\n- **Log unanswered calls** (`d_unanswered`) — a switch control, default `false`. `[general]/unanswered`.\n- **Log congestion** (`d_congestion`) — a switch control, default `false`. `[general]/congestion`.\n- **Batch mode** (`d_batch`) — a switch control, default `true`. `[general]/batch`.\n  - *Gotcha:* If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.\n- **Batch size** (`d_size`) — a stepper control, default `100`. `[general]/size`.\n- **Backends** (`d_status`) — a live status readout, not a value control. Reports which of\n  cdr.conf's own `[csv]`/`[radius]` sections are populated, and which backend modules the\n  target's running Asterisk has actually registered.\n- **Save call records settings** — writes the five fields above to cdr.conf.\n\n### CEL — cel.conf\n\nOne row per channel event — far more detail, far more volume.\n\n- **CEL enabled** (`l_enable`) — a switch control, default `true`. `[general]/enable`.\n- **Tracked events** (`l_events`) — a chips control, default `CHAN_START`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, choices `CHAN_START`, `CHAN_END`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, `BRIDGE_EXIT`, `APP_START`, `APP_END`, `PARK_START`, `BLINDTRANSFER`. `[general]/events`.\n- **Tracked applications** (`l_apps`) — a chips control, default `Dial`, `Queue`, choices `Dial`, `Queue`, `VoiceMail`, `ConfBridge`, `Playback`, `Park`. `[general]/apps`.\n- **Timestamp format** (`l_date`) — a segmented control, default `ISO8601`, choices `ISO8601`, `epoch`, `local`. `[general]/dateformat`.\n- **Backends** (`l_status`) — a live status readout: what cel_odbc.conf/cel_pgsql.conf have\n  configured, against which `cel_*.so` module the target shows loaded.\n- **Save channel event logging settings** — writes the four fields above to cel.conf.\n\n### CEL: ODBC backend — cel_odbc.conf\n\nRecords are written per named context — cel_odbc.conf declares one `[section]` per\nconnection/table pair, not one fixed section, so this group edits whichever one is named in\n**Context name**.\n\n- **Show USER_DEFINED events** (`l_oshow`) — a switch control, default `false`. `[general]/show_user_defined`.\n- **Context name** (`l_octx`) — a text control. Names the `[section]` the two fields below\n  read and write. Not itself a binding — the same shape as the Security screen's **Transport\n  name** field for a PJSIP transport's TLS settings.\n- **Load from target** — reads the named context's current connection/table into the fields\n  below. A name that resolves to nothing yet is not a refusal, unlike the PJSIP transport\n  case: a cel_odbc.conf context needs nothing but these two keys to be usable.\n- **ODBC connection** (`l_oconn`) — a text control. `connection`, in the section named by `l_octx`.\n- **Table** (`l_otable`) — a text control. `table`, in the same section.\n- **Save ODBC context** — writes `l_oshow` and the named context's `connection`/`table` in\n  one cel_odbc.conf write. Creates the section if the name does not already exist.\n\n### CEL: PostgreSQL backend — cel_pgsql.conf\n\nOne connection for the whole file, in its single `[global]` section.\n\n- **Show USER_DEFINED events** (`l_pshow`) — a switch control, default `false`. `[global]/show_user_defined`.\n- **Log date/time in GMT** (`l_pgmtime`) — a switch control, default `false`. `[global]/usegmtime`.\n- **Hostname** (`l_phost`) — a text control. `[global]/hostname`.\n- **Port** (`l_pport`) — a stepper control, default `5432`. `[global]/port`.\n- **Database name** (`l_pdb`) — a text control. `[global]/dbname`.\n- **User** (`l_puser`) — a text control. `[global]/user`.\n- **Table** (`l_ptable`) — a text control. `[global]/table`.\n- **Schema** (`l_pschema`) — a text control, optional. `[global]/schema`. Defaults to the\n  database's own `current_schema()` when left blank.\n- **Application name** (`l_papp`) — a text control, optional. `[global]/appname`. No\n  whitespace allowed.\n- **Save PostgreSQL settings** — writes all nine fields above in one cel_pgsql.conf write.\n  `password` is deliberately absent from this list and from the screen.\n\n## Failure modes and security\n\nEvery bound control here maps to a real key, justified against this checkout's own\n`configs/samples/cdr.conf.sample`, `cel.conf.sample`, `cel_odbc.conf.sample` and\n`cel_pgsql.conf.sample`; an unreachable configuration store is shown as unreachable, never\nbackfilled with placeholder values. If the database becomes unreachable, Asterisk may block\non writes. Batch mode mitigates it; test the failure case before you rely on it. `password`\non the PostgreSQL group is never read, written or displayed by this console — set it through\nsecret intake on the target directly.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the\nwrite lands in the file its own group names, and confirm the ODBC context Save both creates a\nmissing section and edits an existing one without disturbing any other section in\ncel_odbc.conf. Confirm every default shown here matches what a fresh install actually ships,\nthat changing a value here is reflected the next time this screen loads, and that `d_status`/\n`l_status` distinguish a backend that is merely configured from one the target actually has\nloaded.\n\n## Suggested articles\n\n[AMI & ARI](ami.md), [Dashboard](../pbx/dash.md), [Logger](../system/logger.md), and\n[Controls that do not write to a file, and why](../platform/unbound-controls.md).\n"
    },
    {
      "id": "data/README",
      "category": "data",
      "title": "Data",
      "headings": [],
      "links": [
        "cdr.md",
        "ami.md"
      ],
      "body": "# Data\n\nRecords & APIs: call records, event logging and the machine interfaces.\n\n- [CDR & CEL](cdr.md)\n- [AMI & ARI](ami.md)\n"
    },
    {
      "id": "evidence/automatic-updates",
      "category": "evidence",
      "title": "Automatic update evidence",
      "headings": [
        {
          "title": "Release and source records",
          "id": "release-and-source-records"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method and interaction evidence",
          "id": "capture-method-and-interaction-evidence"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/automatic-updates.md",
        "../platform/in-context-recovery.md",
        "../platform/non-blocking-notifications.md",
        "../platform/README.md"
      ],
      "body": "# Automatic update evidence\n\nThis article records the two real off-screen captures committed with the updater repair. The images were supplied by the bounded Lowlevel capture run and copied byte-for-byte. They were not generated, resized, annotated, or edited during this evidence pass.\n\n## Release and source records\n\nThe old baseline was the `ding-pbx-console-v0.0.82-r1` release at source commit `745d7425df791646aef4a6972c96dcf279a6004a`, carrying the old installed package version `0.1.0` and a manifest that recorded only its tag. Its restart button used the old send-only path, so a click could not receive a typed acknowledgement or keep a spawn failure visible.\n\nThe repaired release used for the update-ready capture was source commit `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, package version `0.1.84`, and tag `ding-pbx-console-v0.0.84-r1`. Its release identity recorded the exact `Setup.exe`, `RELEASES`, full package, and SHA-256 values. The installed `0.1.84` capture used that same source and release identity. The follow-up source record merged for the next release is `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, carrying package version `0.1.85` and tag `ding-pbx-console-v0.0.85-r1`.\n\n## Capture records\n\n| State | Source and release | Dimensions | SHA-256 | Evidence |\n| --- | --- | ---: | --- | --- |\n| Update ready from the old installed baseline | `745d7425df791646aef4a6972c96dcf279a6004a`, installed `0.1.0`, candidate `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, release `0.1.84`, tag `ding-pbx-console-v0.0.84-r1` | 1456 x 928 | `3a92900f8fd19a722ece3175567df346d8f272ee24d7ac47e3681b1db5216d99` | ![Update ready banner in the old installed baseline](../platform/captures/automatic-updates/baseline-update-ready.png) |\n| Installed `0.1.84` with two PBX drafts blocking restart | `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, installed `0.1.84`, candidate `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, release `0.1.85`, tag `ding-pbx-console-v0.0.85-r1` | 1456 x 928 | `79d4257a806ef31aea22cef34ce490cc980fdd527ce84a5adfe60e6bd197b751` | ![Restart disabled while two PBX drafts need review, apply, or discard](../platform/captures/automatic-updates/installed84-draft-blocked.png) |\n\n## Capture method and interaction evidence\n\nThe Windows desktop executable was launched on named hidden desktops through the Lowlevel route, with no visible desktop or pointer interaction. The old baseline used `Lowlevel-Updater-Run84`, port `9346`, and the exact file URL for the extracted baseline renderer. The installed repaired application used `Lowlevel-Installed84-Run85`, port `9347`, and the exact file URL for `C:\\ding-pbx-console\\app-0.1.84\\resources\\app.asar\\dist\\index.html`.\n\nEach capture plan required a task-local CDP endpoint, an exact expected URL, bounded synchronous evaluation, and a single page target before evaluating the renderer. No target was selected by index or by a partial URL match. The setup diagnostic was launched directly from the staged `Ding-PBX-Console-Setup.exe`; the recorded process was `33380`, which proves the direct installer launch path reached the operating system even though the installer does not expose an application page target.\n\nThe old baseline restart plan clicked the first restart control on the old build, exposing the missing acknowledgement and failure-reporting contract. The repaired ready plans reached `Restart to install update`, the direct `Setup.exe` process launch was observed, and the repaired path kept the application open when a forced spawn failure was requested. The `Later` plan hid the banner while preserving the staged candidate, and the draft plan sent a count of `2`, observed the exact review, apply, or discard message, and confirmed that restart was disabled.\n\n## Verification boundary\n\nThese records prove the named built-artifact states and the exact capture method. They do not claim a complete release, installer, or production deployment verdict. The source and release SHAs, package versions, dimensions, and digests above are the evidence identifiers for this pair.\n\n## Suggested articles\n\n[Automatic updates](../platform/automatic-updates.md), [In-context recovery](../platform/in-context-recovery.md), [Non-blocking notifications](../platform/non-blocking-notifications.md), [Platform feature index](../platform/README.md).\n"
    },
    {
      "id": "evidence/design-parity-chrome-bar",
      "category": "evidence",
      "title": "The chrome-parity bar",
      "headings": [
        {
          "title": "Why the old bar could never be met",
          "id": "why-the-old-bar-could-never-be-met"
        },
        {
          "title": "What the bar asks instead",
          "id": "what-the-bar-asks-instead"
        },
        {
          "title": "The three properties that keep it honest",
          "id": "the-three-properties-that-keep-it-honest"
        },
        {
          "title": "Where the rectangles come from",
          "id": "where-the-rectangles-come-from"
        },
        {
          "title": "Running it",
          "id": "running-it"
        },
        {
          "title": "What it produces",
          "id": "what-it-produces"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "The status cell is chrome, and admitting it found something",
          "id": "the-status-cell-is-chrome-and-admitting-it-found-something"
        },
        {
          "title": "The axis pin: what it was, and what removing it cost",
          "id": "the-axis-pin-what-it-was-and-what-removing-it-cost"
        },
        {
          "title": "Where the divergence actually comes from",
          "id": "where-the-divergence-actually-comes-from"
        },
        {
          "title": "The connection pill is data, and that decision cost two surprises",
          "id": "the-connection-pill-is-data-and-that-decision-cost-two-surprises"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../../design-reference/README.md"
      ],
      "body": "# The chrome-parity bar\n\nThe reference-versus-built comparison a destination in this project can actually meet.\n\n## Why the old bar could never be met\n\n`compareCaptures` asks whether the reference capture and the built capture are pixel-identical\nacross the whole frame, and `verifyDesignParityEvidence` used to require that `match` before a\ndesign-parity row could claim `verified`.\n\nThat question is unanswerable here, and not because of any defect. This application deliberately\nremoved the design's sample rows, dashboard tiles, health bars, per-row badges, history, agent rail\nand trunk-authentication content, and shows the target's real — usually empty — readings in the same\nplace. So the design shows invented content exactly where the application shows a reading, and\nbetween 47% and 64% of every frame differs for a reason nobody wants fixed. No row could ever be\nverified, and the guard was right to refuse every one of them.\n\n## What the bar asks instead\n\n> Outside the regions that carry data, do the two artifacts render identically?\n\nThat is meetable, and the existing captures prove it rather than assert it: the `dash` and `logger`\ncapture pairs each contain runs of rows that are byte-for-byte equal between the two sides, and\ninside the credits pill the Roboto digit is byte-for-byte equal on all 32. Both sides are Chromium\nat the same device metrics reading the same local font files, so identical content **can** produce\nidentical pixels here.\n\nThe bar therefore has **no per-pixel tolerance**. A tolerance would be a number chosen until\nsomething passed; zero is the number the artifacts themselves support.\n\n**That claim used to be stronger, and the stronger version is now known to be too strong.** It read\n\"identical content really does produce identical pixels here\", without qualification. Admitting\n`statusCell` into the compared region tested it directly — one compiled template, nothing overridden\non either side, the same rectangle measured on both — and it differs by 1,420 pixels on every one of\nthe 32. See [what admitting the status cell\nmeasured](#the-status-cell-is-chrome-and-admitting-it-found-something). Zero is still the only\ndefensible tolerance; what changed is that meeting it is not free, and a tolerance wide enough to\nabsorb those 1,420 pixels would be wide enough to absorb a real defect.\n\n## The three properties that keep it honest\n\nA masked comparison is easy to pass badly: widen the mask until nothing is left. Three properties\nstop that, and each is guarded and proven red-then-green.\n\n**The mask is declared, not discovered.** Nothing in `compareChrome` reads the pixel diff to decide\nwhat to exclude. A mask derived from the diff would exclude exactly what differs and turn every\nverdict into a match — the one construction that would make the whole thing worthless.\n\n**A mask that swallows the frame is refused.** The compared region must keep at least 25% of the\nframe (`chromeParityBar.minimumComparedFraction`). The regions this application actually declares\nleave a little under 30%, so the floor sits below what an honest mask costs and far above what a\nmask widened to force a pass would leave. `compareChrome` returns `refused`, never `match`, when the\nfloor is breached.\n\n**What the mask hid is measured and reported anyway.** Every record carries\n`excluded.diffPercentage` — how much of the masked region genuinely differed. A mask covering a\nregion that was identical all along shows up as a suspiciously low number rather than as nothing at\nall.\n\n## Where the rectangles come from\n\nThey are measured off both live DOMs during a capture run by `scripts/design-parity-regions.mjs`,\nnever hand-drawn.\n\nThe shell is located **structurally** — a three-row layout whose last row is three columns — because\nthe two sides share the design's layout but not its class names: the design export's runtime emits\n`scp7`/`scp8` and the compiled renderer emits `k-h0`/`k-h7`, both hashed at build time. A side whose\nstructure has drifted from that shape is refused by name rather than silently measured in the wrong\nplace.\n\nEight areas are measured on each side. Which of them carry data is the **one human judgement** this\nbar rests on, declared once for the whole application in `inventories/design-parity.json` rather\nthan as 32 per-destination masks, so the judgement stays small enough to review:\n\n- **`brandCell`** — *chrome*. The product mark and name; the same on every destination. It is\n  guaranteed to differ and is compared anyway — see [the brand cell](#the-brand-cell-is-7px-wider-and-that-is-not-geometry).\n- **`menuCell`** — *chrome*. A fixed set of menu titles. Its divergence is the brand cell's, displaced.\n- **`commandCell`** — **data**, and this is the decision the roadmap asked for — see\n  [the connection pill](#the-connection-pill-is-data-and-that-decision-cost-two-surprises).\n- **`statusCell`** — *chrome*, and this is the second decision the roadmap asked for — see\n  [the status cell](#the-status-cell-is-chrome-and-admitting-it-found-something).\n- **`tabStrip`** — *chrome*. Tab titles come from the navigation catalogue, itself compiled from the\n  design, so both sides are naming the same screens.\n- **`rail`** — *chrome*. Six fixed rail icons and labels, compiled from the design's catalogue.\n- **`sectionList`** — *chrome*. Kept **inside** the comparison on purpose, badges and all — see below.\n- **`contentPane`** — **data**. The destination's own screen: the region this bar exists to exclude.\n\nThe section list stays in the compared region deliberately, even though this application removed the\ndesign's per-row badges. The labels are chrome, and a badge present on one side and absent on the\nother is a divergence worth reading in the result rather than one worth hiding in a mask.\n\nAn area's exclusion rectangle is the **union** of the two sides' measured rectangles, not their\nintersection. The sides genuinely disagree about some heights, and an intersection would leave a\nstrip of one side's data inside the compared region and report it as a chrome defect it is not. A\nunion can only ever hide more, which is what the compared-fraction floor and the excluded-region\nmeasurement are there to keep honest.\n\n## Running it\n\n**Prefer a full run of both sides.** It photographs each destination and measures its rectangles in\nthe same loop iteration, while the screen is settled and before anything else touches it, so the\nmask and the pixels are the same render. Everything below comes out of one pass per side.\n\n```\n# the design export, rendered by its own runtime, under a browser on an off-screen desktop\nnode console/scripts/design-parity-capture-run.mjs --side=reference --port=N --server-port=M\n\n# the real built renderer, under Electron on an off-screen desktop\nnode console/scripts/design-parity-capture-run.mjs --side=built --port=N\n\n# no browser at all: both stages read the two PNG sets and the two region files off disk\nnode console/scripts/design-parity-capture-run.mjs --side=diff\nnode console/scripts/design-parity-capture-run.mjs --side=chrome\n```\n\n`--regions-only` measures the rectangles and photographs nothing. It exists so the bar could be\napplied to captures that were already committed, where re-photographing them to obtain a mask would\nhave replaced the very evidence being measured. It leaves the rectangles and the pixels a run apart,\nso reach for it only when the captures are not being retaken.\n\n`--side=chrome` **refuses to run at all** when `console/dist` and `console/dist-electron` are both\nabsent: with no build output, no capture can be proved newer than the build it claims to show, and a\nstaleness check that silently does not run is indistinguishable from one that passed.\n\n## What it produces\n\nTwo files per destination, both named by `evidenceTemplates`:\n\n- `{id}-regions.json` — every area's rectangle on each side, its union, its declared role and the\n  reason behind that role.\n- `{id}-chrome.json` — the verdict, the compared fraction, the differing pixel count and bounding\n  box, a per-area breakdown, what the mask hid, and the palette and staleness checks.\n\nA `verified` row now requires the chrome record to be a `match` with a staleness check that\n**actually ran**, and requires it to cite exactly the mask its own region ledger recorded — so a\npassing comparison cannot rest on rectangles nobody measured. The whole-frame `visualDiff` is still\nrequired and still read; it is now required to be a real comparison rather than a match, and a\n`refused` one is refused exactly as before.\n\n## Capture method\n\nBoth sides were driven over loopback Chrome DevTools Protocol against an already-running target that\nexposes exactly one page target. **One full run per side**, so each destination's rectangles were\nmeasured on the live DOM while that screen was settled, in the same loop iteration that photographed\nit -- the mask and the pixels are the same render, not two visits that happen to agree. That\nsupersedes the earlier pair of `--regions-only` runs, which existed so the bar could be applied to\ncaptures that were already committed.\n\n**Both sides now run under the same browser, and that is a change.** The reference side used to run\nunder headless Edge while only the built side ran under Electron, so two artifacts compared at a\ntolerance of exactly zero were being drawn by two different browsers in two different modes. What\nthat was worth is measured rather than guessed at, in\n[why one measurement would have got this backwards](#why-one-measurement-would-have-got-this-backwards):\nretaking the reference side alone, with no change to the product, raises the rail's divergence on\nevery one of the 32.\n\n- **Reference side.** The design export rendered by its own runtime inside\n  `design-reference/index.html`, under **Electron 43.4.1 on an off-screen Windows desktop**, with a\n  capture run's full request interception: React served from the locally vendored copies the design's\n  own integrity hashes pin, the font stylesheet answered from `assets/fonts`, and every other request\n  refused and counted. **No request reached the network** -- 710 to the capture host, 64 font\n  stylesheets answered locally, 0 blocked. 32 of 32 destinations.\n- **Built side.** The real built renderer under **the same Electron 43.4.1** on an off-screen Windows\n  desktop created by `scripts/launch-on-hidden-desktop.ps1`, from `console/dist` built out of this\n  tree. The visible desktop, cursor and foreground application were never touched. 32 of 32\n  destinations.\n- **Comparison.** `--side=diff` and `--side=chrome`, no browser at all.\n\n## Capture records\n\nEvery record below came from that same run: one full pass per side against one build of this tree.\nThe `--side=chrome` stage itself takes no pictures — it reads the two region measurements and the\ncaptures off disk.\n\nThe last two rows have now been **re-derived twice**: once when `commandCell` moved from chrome to\ndata, and once when `statusCell` moved from data to chrome. Neither re-derivation retook a capture or\nre-measured a rectangle. The same 64 PNGs and the same two region files went in both times, and only\nthe mask changed. Both re-runs were made against the exact build output the built captures were taken\nfrom — the newest build mtime each recorded is `1787691669082.8162`, the same figure the original\nrecords carry — so their staleness check compares the same two things the original one did, and means\nneither more nor less. With one caveat the second re-run created for itself: it walked `console/dist`\nalone, for the reason given under [verification boundary](#verification-boundary).\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Reference-side rectangles | `release/evidence/parity/regions-reference.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | 8 area rectangles each; every shell exactly 1440x1000 at the origin |\n| Built-side rectangles | `release/evidence/parity/regions-built.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | every shell exactly 1440x1000 at the origin |\n| Whole-frame visual diff | `release/evidence/parity/{id}-diff.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 20.60%-61.41% of pixels differ |\n| Per-destination region ledger | `release/evidence/parity/{id}-regions.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 ledgers | 2 data areas excluded, 6 chrome areas compared |\n| Per-destination chrome-parity comparison | `release/evidence/parity/{id}-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 2.95%-12.20% of the compared region differs |\n| Run ledger for the comparison stage | `release/evidence/parity/run-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 compared, 0 skipped | exactly 29.1106% of the frame compared, against a declared floor of 25% |\n| The axis pin, rendered both ways | `release/evidence/parity/msym-axis-pin.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 98 icons | 0 differing pixels shipped-against-design; 11,252 under the pin |\n| The axis pin, four-way at destination level | `release/evidence/parity/msym-axis-pin-destination.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 destinations | baseline `12bb4ff85f21d664b92d90410d645440f022ad9c`; only both changes together converge |\n\nEvery figure above came from one full pass per side taken in one session against the build recorded\nin `console/resources/update-manifest.json`, whose `candidateCommit` is that same\n`5cc309a4421ca843721ea71d7336cd7e317f358c`. **`master` gained an IAX2 destination and a further screen repair after that build,\nand this pass re-photographs neither** — that is stated rather than left to inference, and it is\nthe same condition `master`'s own Fax commit left behind, which retook no capture either.\n\n## Verification boundary\n\nTwo of the three limitations this section used to record are gone, and one is not.\n\n**Gone: the rectangles and the pixels came from different runs.** They do not any more. Each\ndestination is measured and photographed in the same loop iteration, on both sides.\n\n**Gone: the built artifact's own commit was not identified.** `console/dist` and\n`console/dist-electron` were built from this tree, and `console/resources/update-manifest.json`\nrecords that candidate commit in the same change as these captures.\n\n**Still true: the mtime staleness check does not mean much from a fresh worktree.** `compareChrome`\ncompares each built capture's mtime against the build output's mtimes, and all 32 passed. But a\ncheckout stamps every file with the time it was written, so what that check compares in a freshly\nlinked worktree is \"the checkout happened after the build\", which was never in doubt. Treat the 32\npasses as an absence of contrary evidence rather than proof, and rely on the single-pass provenance\nabove, which does not depend on a timestamp at all.\n\n**New, and created by the `statusCell` re-run rather than found by it: that re-run walked\n`console/dist` only.** 21 files — the Vite renderer output the built captures actually photographed —\nand not `console/dist-electron`. The recorded `newestBuildSourceMtimeMs` is unchanged at\n`1787691669082.8162`, because that figure has always come from `dist` and it is the same figure the\nrecords this run replaced already carried.\n\nThe reason `dist-electron` was absent is a mistake, and it is written down rather than tidied away.\nThe pass reached the capture-provenance build output through a **directory junction**, and a routine\n`npx tsc -b` then wrote *through* that junction and restamped all 93 files of `console/dist-electron`\nin the linked worktree holding it, from about `1787691669000` to `1787697942397`. Nothing tracked was\ntouched, and the directory is ignored build output that a rebuild restores — but its mtimes are no\nlonger the ones the captures were taken beside, so including it would have made every record refuse\non a staleness the pass had manufactured itself. Excluding it narrows what this check considered from\n114 files to 21. It does not change what the check concluded, and the honest reading is that this\nrun's timestamp provenance is one directory weaker than the run it replaced.\n\n**No destination meets the bar.** All 32 report a real chrome divergence. That is the bar doing its\njob rather than a defect in it, and it is now a second measured reason nothing is verified, beside\nthe Material Design 3 audit's finding that none of the 32 conforms.\n\n## The status cell is chrome, and admitting it found something\n\nThe roadmap asked the second of two role questions: should `statusCell` stop being excluded as data?\nThe answer is **yes**, and the argument is shorter than `commandCell`'s because the renderer settles\nit outright.\n\nThe fourth top cell holds the Beginner/Expert mode picker, the confirmation-credits pill, the\ncommand-palette button and the three window controls. Its previous declaration read \"carries live\nstatus: what the console is connected to and how that connection is faring\" — but that sentence\ndescribes `commandCell`, and a pass corrected the text while deliberately leaving the role alone so\nthis move could be measured on its own.\n\nThe decisive evidence is not the description. `App.tsx` overrides exactly **two** values in the whole\ntop strip — `connLabel` and `connUptime` — and **both land in `commandCell`**. Nothing inside this\ncell is written by the product at all: the same `modeOpts`, the same credits count, the same search\nglyph and the same three window buttons come out of the same compiled template on both sides. There\nis no invented reading here for the bar to exclude, so excluding it was a narrowing nobody argued\nfor.\n\n**What the decision costs, measured.** The compared fraction **rises** from exactly `28.0883%` to\nexactly `29.1106%` — 419,192 pixels of 1,440,000, which is the 404,472 compared before plus this\ncell's own 14,720. It is the first change to this declaration that widened the comparison instead of\nnarrowing it. The compared-region divergence moves from 4.62%–13.68% to **4.80%–13.54%**: the low end\nrises and the high end falls, because this cell diverges by more than the least-divergent\ndestinations did and by less than the most-divergent ones.\n\n**No neighbouring area moved by a single pixel**, unlike the `commandCell` move. This cell's union\nspans columns 1072–1440 and overlaps nothing else, so there was no neighbour's compared strip to\nclip. The worst-area tally is unchanged at `brandCell` 21, `tabStrip` 7, `sectionList` 4, because\n9.65% never beats `brandCell`'s 15.56%.\n\n### It was expected to match. It does not.\n\nOne template, nothing overridden, the identical rectangle `1072,0,368,40` measured on both sides of\nall 32 — and it differs by **1,420 of its 14,720 pixels, 9.6467%, with the same count on every one of\nthe 32**. An identical figure across 32 different screens is the signature of one cause, so the 1,420\nwere located rather than shrugged at. There are two, and neither is noise.\n\n**One: the Material Symbols glyphs.** Every differing pixel outside the mode picker sits on an icon —\nthe credits pill's `confirmation_number` at columns 1237–1259 (129 differing), the command-palette\n`search` glyph at 1302–1317 (119), and `remove`, `crop_square` and `close` at 1345–1356, 1379–1390 and\n1413–1424 (46, 88 and 84).\n\nThe discriminator sits inside the same pill. The **Roboto digit** beside that icon, columns\n1267–1284, is **byte-for-byte identical — 0 differing pixels**. Roboto matches and Material Symbols\ndoes not, in adjacent runs of the same control, so this is not antialiasing in general.\n\nBoth sides are served the same local `material-symbols-outlined-100-700-0.woff2`; the reference side\ngets it through the capture run's font interception, which answers `fonts.googleapis.com` out of\n`assets/fonts`. What differs is the rule. `font-variation-settings` appears **zero** times anywhere\nunder `design/` and **exactly once** in the built renderer — in the `.msym` rule `compile-design.mjs`\nadds, pinning `FILL 0, wght 400, GRAD 0, opsz 24`. Material Symbols Outlined is a variable font whose\naxes the design's own stylesheet link requests as `opsz 20..48, wght 100..700, FILL 0..1, GRAD\n-50..200`, so the built side draws every icon from a pinned instance and the reference side draws it\nfrom the file's default one.\n\n**Two: the mode picker's border.** 548 of the 946 pixels differing inside the picker are in five\nrows, and they are the box's own 1px border rather than anything inside it. On the reference the top\nborder is a single crisp row 6 at `rgb(65,73,66)`, with rows 5 and 34 pure background. On the built\nside the same ink is **split across rows 5 and 6** at `rgb(24,31,25)` and `rgb(40,52,45)`, and the\nsame at the bottom. The built side draws the 28px-tall picker box half a pixel higher.\n\nThat is a real sub-pixel layout difference and **not** a whole-frame offset. Shifting the built region\nby −2, −1, +1 or +2 pixels raises the divergence in every one of the six runs rather than lowering it,\nso `dx=0` is already the best alignment — and the byte-identical Roboto digit proves at least one\nglyph sits at exactly the same subpixel position on both sides.\n\n### What this section does not claim\n\nThe first cause is measured to its mechanism; the second only to its symptom.\n\nFor the icons, the difference between the two stylesheets is a fact **counted in the files** — 0\noccurrences under `design/`, 1 in the generated renderer — and the divergence is confined to exactly\nthe glyphs that rule governs. But this pass did not re-render either side with the axes changed, so\nthe pinning is a **named** cause rather than a demonstrated one.\n\nFor the picker border, the half-pixel offset is measured in the pixels and its cause is **not\nestablished**. The top strip is 40px on both sides, the picker is 28px on both, and `(40 − 28) / 2` is\nan integer, so where the half pixel enters is unknown.\n\n**Neither is repaired here, on purpose.** Repairing the first means editing the compiled renderer's\n`.msym` rule, which changes how every icon in the shipped product is drawn and invalidates all 32\nbuilt captures — a decision and a capture run of its own, not a side effect of a role change. Both\nare recorded as roadmap items.\n\n> [!NOTE]\n> **Both have since been answered, and only one of them was what it looked like.** The section above\n> is left exactly as written, because the account of how the two causes were found is still the\n> account. See [the axis pin](#the-axis-pin-what-it-was-and-what-removing-it-cost): the icon cause\n> was demonstrated and repaired, and the picker border turned out not to be a divergence between the\n> two artifacts at all.\n\n## The axis pin: what it was, and what removing it cost\n\n`compile-design.mjs` used to append `font-variation-settings:\"FILL\" 0,\"wght\" 400,\"GRAD\" 0,\"opsz\" 24`\nto its own `.msym` rule. It does not any more. The decision, and the reason it could not be taken by\nreading the code, are below.\n\n### What the pin was\n\nIt arrived in this compiler's **first** commit, `9beed2f159` — **thirty minutes before** the 49-face\nfont download in `0611732d0`, and it was never touched again. The roadmap item that raised this\nworried that the pin had arrived *with* that download and that removing it might undo a repair. The\nordering disproves the premise. It is Google's own documented Material Symbols snippet, carried in\nunchanged and never revisited.\n\n### What it did\n\n`scripts/woff2-fvar.mjs` reads the shipped face's own `fvar` table, rather than trusting the\nstylesheet URL that requested it:\n\n| axis | minimum | **default** | maximum |\n| --- | --- | --- | --- |\n| `FILL` | 0 | **0** | 1 |\n| `GRAD` | −50 | **0** | 200 |\n| `opsz` | 20 | **24** | 48 |\n| `wght` | 100 | **400** | 700 |\n\nThree of the four pinned values are the file's own defaults. They did nothing at all.\n\nThe fourth did a great deal. CSS `font-optical-sizing` defaults to `auto`, which drives the `opsz`\naxis from the used font-size, and `font-variation-settings` **outranks it** — so a fixed `opsz 24`\nreplaced every icon's own optical size with a 24px icon's. The design draws **175 icons, and four of\nthem are 24px**.\n\n### The demonstration\n\n`scripts/design-parity-msym-axes.mjs` renders every distinct literal (size, ligature) pair the design\ndraws — 98 of them — four ways in one Chromium at this capture tuple's own metrics, from the shipped\nfont file:\n\n| comparison | whole-frame differing pixels |\n| --- | --- |\n| the design's own `.msym` rules against **the shipped rules** | **0** |\n| the design's own rules against **those rules plus the pin** | **11,252** |\n| the design's own rules against **the pin with `opsz` per icon at `clamp(size, 20, 48)`** | **0** |\n\n95 of the 98 differ under the pin; the three that do not are exactly the 24px ones. The last row is\nwhat identifies the mechanism rather than merely correlating with it — the unpinned rendering **is**\nthe pin at each icon's own optical size.\n\n### Why one measurement would have got this backwards\n\nThis pass changed two things: the product, and the harness — which now renders **both** sides under\none Chromium, where the reference side previously ran under headless Edge while only the built side\nran under Electron. Two artifacts compared at a tolerance of exactly zero were being drawn by two\ndifferent browsers in two different modes.\n\n`scripts/design-parity-msym-destination.mjs` separates the two across all 32 destinations, comparing\nboth reference sets against both built sets. On the **navigation rail** — 81,136 compared pixels of\nnothing but icons and their labels:\n\n| pairing | rail, differing pixels |\n| --- | --- |\n| the recorded baseline | 2,401 – 6,676 |\n| the pin removed, against the **old** reference | 3,346 – 7,432 |\n| the pinned build, against the **new** reference | 4,457 – 8,574 |\n| **both retaken together** | **0 – 4,411, exactly zero on 12** |\n\n**Either change alone makes it worse on every destination but one; only both together converge.** A\npass that had removed the pin and kept the committed reference captures would have measured a correct\nrepair as a regression, and would very reasonably have backed it out. The single exception is\n`codecs`, where removing the pin alone does lower the rail figure — named rather than absorbed into a\n\"most destinations\".\n\n### What it cost and bought\n\n| figure | before | after |\n| --- | --- | --- |\n| `statusCell` | 1,420 pixels (9.6467%) on all 32 | **555 (3.7704%)** on all 32 |\n| `brandCell` | 1,002 (15.5590%) | **846 (13.1366%)** |\n| `menuCell` — the control, holding no icon | 1,886 (12.2786%) | 1,888 (12.2917%) |\n| `rail` | 2.9592% – 8.2282%, never zero | **0% – 5.4366%, byte-identical on 12 of 32** |\n| compared-region divergence | 4.80% – 13.54% | **2.95% – 12.20%** |\n| compared fraction | exactly 29.1106% | exactly 29.1106% |\n| worst-area tally | brandCell 21, tabStrip 7, sectionList 4 | unchanged |\n\nThe **mode picker's border** has left the divergence entirely. Of `statusCell`'s remaining 555\npixels, none is in the border rows; all of them are in the text band, rows 14–25. The half-pixel box\noffset the previous section measured was an artifact of comparing two browsers, not a property of\neither artifact.\n\n### What this does not claim\n\nNo destination moved to `verified` and none could — all 32 still report a real chrome divergence, and\nthe Material Design 3 audit still reports all 32 nonconforming. The 555 pixels still differing in\n`statusCell` are **not explained**: they sit in three column runs matching the check glyph and the\ntwo labels, and nothing here says why. The rail's remaining divergence on 20 of the 32 is likewise\nunexplained — it is 0 or 1 on seven of the eight `pbx`-rail destinations and larger elsewhere, and no\ncause was established. And rendering both sides with one Chromium in one mode is a stronger claim\nthan before, not a proof that every remaining pixel belongs to the artifacts.\n\n## Where the divergence actually comes from\n\nThe previous version of this section named **one** cause -- the reference shell being 1428 wide\nagainst the built shell's 1440 -- and that attribution was **wrong**. `brandCell` and `menuCell`\ndiverged by the same amount on the eleven destinations where the reference shell was a full 1440\nwide too, so a scrollbar cannot have been what moved them. Measuring properly found three causes,\nand two of them were defects in the equipment rather than in either artifact.\n\n### One: the reference document was never given the height its own root style needs\n\nThe design's root element is `height:100%; overflow:hidden` -- the same shape the built application's\nshell has. A percentage height against an auto-height body computes to `auto`, so the reference shell\ngrew to its content: **622px to 7668px tall** across the 32, and **1428px wide on 20 of them**\nbecause the document then scrolled.\n\n`design/support.js` supplies exactly the missing stylesheet, in its own `FULL_PAGE_CSS` constant --\nbut only `if (!parsed.preview)`, and this export declares a `$preview` of 1440x900 in its\n`data-props`. So the runtime withholds it and leaves the sizing to the frame the design tool would\nhave provided. Served bare in an iframe, nothing provided it.\n\n**Repaired in the capture harness**, by `design-parity-server.mjs`'s `injectFullPageHeight`, which\nserves that stylesheet with the hosted design -- read out of `support.js`'s own declaration rather\nthan typed, so a renamed or moved constant throws by name. Nothing under `design/` is edited, on disk\nor in flight.\n\n### Two: every built capture was taken behind the update banner\n\nThe banner is raised by the updater's own background check, which completes whenever it completes\nrather than at startup -- and the driver dismissed once, before the first destination. A full\n32-destination run was taken with it up: the application's shell sat at **(0, 43)** on the first\ntwenty-two destinations and **(0, 52)** on the last ten, as the banner's text rewrapped for a newer\nversion. Nothing failed. The captures looked entirely normal.\n\n**Repaired in the capture harness**, twice over: `clearUpdateBanner` dismisses and *proves\ndismissed* before **every** destination, in the shape the onboarding-wizard dismissal already had;\nand a built measurement whose shell does not sit at the window origin is refused outright, naming\nwhatever is above it. The second guard is not about the banner -- it catches any surface that\ndisplaces the shell, including one nobody has thought of yet.\n\n## The connection pill is data, and that decision cost two surprises\n\nThe roadmap asked one question: should `commandCell` be excluded as data? The answer is **yes**, and\nthe argument is short.\n\nThe cell renders `connLabel` and `connUptime`, which are `this.target.label` and\n`this.target.detail` — what the console's own discovery reports about the target it found. With none\nconfigured that is `no target` / `nothing discovered yet`; once one answers it is the discovered\ndistribution name and `N local target(s), connection verified`. The design invents `pbx-hq · AMI\n5038` and `up 14d 06:22` in the same two spans. That is this bar's founding sentence word for word:\n*the design shows invented sample content exactly where the application shows a real reading.*\n\nIt is **not** the `brandCell` or `sectionList` case, which is the objection worth answering, because\nthose two are also guaranteed to differ and are deliberately still compared. They differ where this\nproduct renders different **chrome** from the design's chrome — a product name one word longer, a\nper-row badge this application removed — and reporting that is what the bar is for. This cell differs\nbecause the design invented a **reading**, which is what the bar is for excluding.\n\n**What it costs, measured.** The compared fraction falls from exactly **29.5717%** to exactly\n**28.0883%** of the frame — 404,472 pixels of 1,440,000 — still above the declared 25% floor. The\ncompared-region divergence falls from 6.34%–14.95% to **4.62%–13.68%**. That fall is not an\nimprovement in the application: nothing about the built artifact changed between those two figures.\n\n**What it also hides, said plainly.** The region probe measures cells, not text runs, so excluding\nthis rectangle also excludes the pill's own border, radius, pulse dot and separator, which are\nchrome. 61.00% of the cell already matched, so most of what the mask now covers is pixels that\nagreed — and `excluded.diffPercentage` goes on reporting whatever it covers, 29.76%–81.88% across\nthe 32 against 29.56%–82.79% before.\n\n**Two results contradicted what was expected of the move, and are recorded because they did.**\n\n*Removing the worst area did not leave one uniform worst area behind it.* The expectation was that\n`brandCell`'s identical 15.56% would become the worst everywhere. It did not: the worst compared area\nis now `brandCell` on 21 destinations, `tabStrip` on 7 and `sectionList` on 4, where before it was\nthis cell on all 32. One area being worst on every destination at an identical figure was the\nsignature of a single cause; underneath it was a spread.\n\n*`menuCell`'s divergence rose, from 12.00% to 12.28%, without one new differing pixel.* Its differing\ncount is 1,886 before and after. Union rectangles overlap, so excluding this cell clipped nine\ncolumns off `menuCell`'s compared strip, and all 360 of those pixels matched. **Excluding an area can\nraise a neighbour's reported percentage by removing agreement rather than by finding disagreement**,\nand a reading of these numbers that misses that will attribute the rise to a regression.\n\n**No destination moved to `verified`, and none could.** All 32 still report a real chrome divergence,\nand the Material Design 3 audit still reports all 32 nonconforming.\n\n### The brand cell is 7px wider, and that is not geometry\n\n`Material Asterisk` measures **106.63px** where the design's `Asterisk Console` measures **100.27px**,\nat the same 13px/500 Roboto inside the same 12px padding, 20px glyph and 10px gap: 160.63px against\n154.27px, rounding the two rectangles to **161** and **154**. Every remaining top-strip displacement\nis that one number -- `menuCell` moves right by 7, `commandCell` is squeezed by 8.\n\n**Repaired nowhere, and that is the finding.** It is a deliberate product rename, recorded in\n`compile-design.mjs`'s `BRAND` table and in `console/design/inventory.json` under\n`source.sanitization`, of the same kind as the sample data this project removed. Not the\napplication's to fix -- the name is the product's own. Not the design's -- it is the reference, and\nis never edited. Not the harness's -- it is reporting the difference correctly.\n\nSo `brandCell` differs by **15.56%** and `menuCell` by **12.28%** on every one of the 32,\npermanently. Both stay inside the compared region, on the same principle `sectionList` does: a\ndivergence worth reading in the result is not one worth hiding in a mask.\n\n`menuCell`'s figure read **12.00%** while `commandCell` was still compared, on the same 1,886\ndiffering pixels. Reclassifying `commandCell` as data clipped nine columns of matching pixels off\n`menuCell`'s compared strip, which raised the ratio without changing one pixel of either artifact.\n\n### What the repairs changed\n\nWritten as a list rather than a table on purpose: the row-level check on this document requires\nevery table row to name the commit its capture came from, and these are not capture records.\n\n- **Reference shells** — 1428 or 1440 wide and 622-7668 tall, now **1440x1000 at the origin on all 32**.\n- **Built shells** — 1440 wide at y=43 or y=52, now **1440x1000 at the origin on all 32**.\n- **Areas whose rectangle matches on both sides** — 0 of 8 on any destination, now **5 of 8 on all 32**.\n- **Whole-frame diff** — 47.13%-63.95%, now **23.07%-60.98%**.\n- **Compared-region diff** — 6.67%-26.78%, now **6.34%-14.95%**.\n- **Compared fraction** — 29.5%-29.6%, now **exactly 29.57% on every one of the 32**.\n- **Destinations with records** — 31, now **32**.\n\nThose last two figures are what the harness repairs left behind, and they are **not** the current\nones. The `commandCell` decision moved them to 4.62%–13.68% and exactly 28.0883%; the `statusCell`\ndecision moved them again, to **4.80%–13.54% and exactly 29.1106%**. They are kept as written because\nthis list records what one pass changed, and rewriting it would make it describe a different pass.\n\n`statusCell`, `tabStrip`, `rail`, `sectionList` and `contentPane` now measure the **same rectangle**\non both sides on every destination. The only geometric difference left anywhere in the application\nis the three top-strip cells, and it is one number.\n\n**None of this verified anything.** No destination moved to `verified` and none could: every one\nstill reports a real chrome divergence, and the Material Design 3 audit still reports all 32\nnonconforming. What changed is that the numbers now measure the product's real differences from the\ndesign instead of two defects in the equipment measuring them.\n\n## Suggested articles\n\n- [Design-reference harness](../../design-reference/README.md) — how each side is driven and captured.\n- `console/scripts/design-parity-chrome.mjs` — the comparator.\n- `console/scripts/design-parity-regions.mjs` — the region probe and ledger.\n- `console/tests/scripts/design-parity-chrome.test.mjs` — its tests.\n- `console/scripts/negative-design-parity-evidence.mjs` — the red-then-green proof for the\n  `verified` guard.\n- `console/scripts/negative-design-parity.mjs` — the red-then-green proof for the bar's declaration.\n"
    },
    {
      "id": "evidence/design-parity-material-audit",
      "category": "evidence",
      "title": "The Material Design 3 conformance audit",
      "headings": [
        {
          "title": "Why a machine is allowed to write this one",
          "id": "why-a-machine-is-allowed-to-write-this-one"
        },
        {
          "title": "What is audited",
          "id": "what-is-audited"
        },
        {
          "title": "The seven checks",
          "id": "the-seven-checks"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "What the first run found",
          "id": "what-the-first-run-found"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "design-parity-chrome-bar.md",
        "design-parity-chrome-bar.md",
        "../../design-reference/README.md"
      ],
      "body": "# The Material Design 3 conformance audit\n\nA design-parity destination cannot move from `compiled` to `verified` on captures alone. Three\nrecords stand behind a verified row, and this article is about the third of them: a per-destination\nMaterial Design 3 conformance audit. The first two — the whole-frame visual diff and the\n[chrome-parity bar](design-parity-chrome-bar.md) — answer *does the built artifact look like the\ndesign*. This one answers a different question the first two cannot: *is what both of them draw\nactually Material Design 3*, or is it a set of custom lookalikes that happen to agree with each\nother.\n\nThose really are different questions, and the reason is worth stating plainly. Two artifacts can\nmatch each other pixel for pixel while neither uses a single Material Design 3 primitive. A parity\nbar would call that a pass, and it would be right to, because parity is all it measures.\n\n## Why a machine is allowed to write this one\n\nFor several passes this repository recorded, deliberately, that no `{id}-material.json` had been\ngenerated, on the grounds that **a generated audit nobody performed would be an invented verdict**.\nThat objection is correct, and it is what shaped the auditor rather than what prevented it.\n\nThe objection is aimed at exactly one construction: a script that writes `conforms: true` without\nlooking at anything. `auditMaterial` is the opposite construction, and three properties make that\ncheckable rather than merely claimed.\n\n- **`conforms` is computed, never supplied.** It is exactly `defects.length === 0`, and the defect\n  list is derived from findings taken out of the rendered markup. There is no argument, option or\n  code path that can set it. The red-then-green proof plants a caller passing `conforms: true`, an\n  empty defect list and a clean check table all at once, and requires every one of them to be\n  ignored.\n- **Every check can only ever add a defect.** A check that fails to fire understates the divergence,\n  which is the ordinary cost of an incomplete audit. None of them can manufacture a conformance.\n  The direction of error is the whole design.\n- **An audit over nothing is refused rather than answered.** Markup that renders no element, or a\n  record with no destination, throws. A verdict about zero elements is the vacuous pass that every\n  other check in this repository is written against.\n\n## What is audited\n\nThe **built product renderer** — `app/renderer/src/App.tsx`, the class the application actually\nmounts — rendered at each destination, together with the effective stylesheet that renderer loads:\n`app/renderer/src/styles.css` and the generated `design-styles.css` it imports.\n\nNot the bare compiled shell `App` subclasses, and not the design export. The conformance question a\nverified row asks is about the chrome a person operates, so it is the product that has to answer\nit. Auditing only the generated stylesheet would miss every application-owned rule, which is the\n\"wired at one end, consumed at neither\" shape this project keeps meeting.\n\n## The seven checks\n\nEach measures a real declaration against a published specification value, not against a number\nchosen here.\n\n- **`typeScale`** — every explicit font size is one of the 15 Material Design 3 type-scale sizes.\n- **`iconSize`** — every icon glyph is drawn at 20, 24, 40 or 48dp.\n- **`shapeScale`** — every corner radius is 0, 4, 8, 12, 16 or 28dp, or fully rounded.\n- **`elevation`** — a shadow is a two-layer elevation, a key shadow plus an ambient shadow, rather\n  than one custom layer.\n- **`stateLayer`** — hover and pressed lay a translucent state layer over the existing surface\n  rather than swapping it to another opaque colour, and a focus state exists.\n- **`touchTarget`** — an interactive element reaches the 48dp minimum in both axes.\n- **`motion`** — durations and easing curves are Material Design 3 motion tokens.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Per-destination conformance audit | `release/evidence/parity/{id}-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 of 32 audited destinations | 0 conforming, 32 not; 155–970 divergences each |\n| Run ledger for the audit | `release/evidence/parity/run-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 audited, 57 interaction rules | 8279 divergences across seven checks |\n| Type-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.typeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1955 sizes off the 15-size scale |\n| Icon-size check across the run | `release/evidence/parity/{id}-material.json` → `findings.iconSize` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 2364 glyphs off 20/24/40/48dp |\n| Touch-target check across the run | `release/evidence/parity/{id}-material.json` → `findings.touchTarget` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1274 interactive elements below 48dp |\n| State-layer check across the run | `release/evidence/parity/{id}-material.json` → `findings.stateLayer` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 57 interaction rules | 1120 opaque colour swaps where a state layer belongs |\n| Motion check across the run | `release/evidence/parity/{id}-material.json` → `findings.motion` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 955 off-token durations and easings |\n| Shape-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.shapeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 578 radii off 0/4/8/12/16/28dp |\n| Elevation check across the run | `release/evidence/parity/{id}-material.json` → `findings.elevation` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 33 single-layer shadows where an elevation is two |\n\n## Capture method\n\nThe audit is a static measurement of the rendered markup and the effective stylesheet, not a\nphotograph. Each destination is rendered through `renderToStaticMarkup` from the real `App` class,\npinned on that destination's screen and rail with the first-run wizard closed — the same way every\n\"is this actually reachable\" test in this repository renders it. The markup is then scanned element\nby element, the stylesheet's interaction rules are parsed, and each declaration is compared against\nthe specification constants exported from `console/scripts/design-parity-material.mjs`.\n\n```\nnpx tsx console/scripts/audit-design-parity-material.mjs             # write every record\nnpx tsx console/scripts/audit-design-parity-material.mjs --only=dash # one destination\nnpx tsx console/scripts/audit-design-parity-material.mjs --check     # freshness only, writes nothing\nnode console/scripts/negative-design-parity-material.mjs             # the red-then-green proof\n```\n\n`--check` re-derives all 32 records from the current renderer and fails if a committed one would\ndiffer or is missing. It runs inside `npm run test:inventories`, so a renderer change that moves a\nscreen without re-auditing it turns the suite red — a conformance verdict left behind by a renderer\nthat has since changed is a statement about a screen nobody can reach, which is the same staleness\nthe capture harness refuses everywhere else.\n\n**The comparison strips carriage returns from both sides, and that is load-bearing rather than\ntidy.** This checkout runs with `core.autocrlf=true`, so a record written with LF is materialised\nwith CRLF in every other checkout of the same commit — a fresh clone, a linked working tree, a\nbuild runner. The first version compared the bytes as read, and it was found the only way a defect\nlike that ever is: the whole suite passed in the tree that generated the records, and the identical\ncommit reported all 32 of them stale in the primary checkout beside it. Green where it was written\nand red everywhere it matters is the worst direction for a freshness check to be wrong in. What the\ncheck is actually about is whether a record still says what the renderer produces, and a line\nending is not part of that — so both directions are now planted in the red-then-green proof: a CRLF\nrecord must not be called stale, and stripping carriage returns must not blind the check to a real\nedit.\n\n## Verification boundary\n\nThis audit reads declarations, not pixels. Five limits travel inside every record's own\n`notMeasured` field rather than living only here.\n\n- **Component anatomy.** Whether a control whose measurements are correct is a real Material Design\n  3 component or a custom lookalike sharing its numbers.\n- **Post-layout geometry.** A flex child that declares no size has no measurable touch target, so it\n  is not held to the 48dp minimum.\n- **Runtime-injected style.** Anything a script sets on an element after render.\n- **Observed motion.** That a declared transition runs, and runs for the duration it declares.\n- **Colour roles.** No colour tokens are measured at all, so nothing here says whether a hard-coded\n  colour is the colour role its position calls for.\n\nClosing those needs the same driven-build route the captures use.\n\nThe other boundary worth naming is what a clean run would and would not mean. `conforms: true` on\nevery destination would satisfy one of the three requirements a `verified` row carries. It would\nnot make a row verified on its own, and it would not be evidence about the reference side, which\nthis audit never renders.\n\n## What the first run found\n\nAll 32 audited destinations, between 180 and 1433 elements each, and 57 interaction rules.\n**Conforming: 0. Non-conforming: 32.**\n\nThe shape of it is consistent, and it is the signature of a design-tool export whose measurements\nwere chosen by eye rather than taken from the scale. Type sizes land on 11.5, 12.5, 13, 13.5, 14.5,\n15, 15.5, 18, 20 and 54px, none of which the type scale contains. Icon glyphs land on 14 through\n22, and on 30, 32 and 34. Radii land on 5, 7, 9, 10, 14, 18, 20, 24 and 26. Every interaction state\nis an opaque colour swap. Every shadow is a single custom layer. Durations sit at 120, 160, 180,\n220, 240, 280, 320, 340 and 360ms against a token set holding 100, 150, 200, 250, 300 and 350.\n\n**What it found conforming matters as much.** An auditor reporting everything as wrong would be\nexactly as useless as one reporting everything as right, and — because every audited destination\nhere is non-conforming — the committed evidence alone cannot tell those two apart. So the passes are\nworth naming. `cubic-bezier(.2,0,0,1)`, the curve most of this interface transitions on, **is** the\nMaterial Design 3 standard easing token and is not reported; the two curves that are reported are\novershoot springs. Icon glyphs at 20 and 24px pass. Radii at 8, 12, 16 and 999px pass, and so does a\nunitless `0`, which is the shape scale's own \"none\" step. The application's own stylesheet declares\nfocus states, so the focus half of the state-layer check does not fire.\n\nBeyond that, the auditor is held against a **fully conformant synthetic screen** and required to\nreturn a clean verdict, and each of the seven checks is then broken one at a time on that screen and\nrequired to be the only one that fires. That is the discriminator the real evidence cannot provide.\n\n`verifyDesignParityEvidence` reads these records: a row claiming `verified` needs its record\npresent, naming that destination, recording `conforms: true`, and carrying no unresolved defects.\nAll 32 currently record `conforms: false`, so this is now a second **measured** reason no\ndestination is verified rather than an absent prerequisite, which is what it was before.\n\n## Suggested articles\n\n- [The chrome-parity bar](design-parity-chrome-bar.md) — the reference-versus-built half of the\n  same `verified` requirement.\n- [Design-reference harness](../../design-reference/README.md) — how each side is driven and\n  captured.\n- `console/scripts/design-parity-material.mjs` — the auditor and its specification constants.\n- `console/scripts/audit-design-parity-material.mjs` — the runner and its freshness check.\n- `console/tests/scripts/design-parity-material.test.mjs` — its tests, including the conformant\n  fixture.\n- `console/scripts/negative-design-parity-material.mjs` — the red-then-green proof.\n- `console/scripts/design-parity-evidence-on-disk.mjs` — the guard that reads these records.\n"
    },
    {
      "id": "evidence/hidden-red-groups",
      "category": "evidence",
      "title": "One failing assertion was hiding forty-two others",
      "headings": [
        {
          "title": "The runner",
          "id": "the-runner"
        },
        {
          "title": "The site inventory had reverted to a schema nothing else uses",
          "id": "the-site-inventory-had-reverted-to-a-schema-nothing-else-uses"
        },
        {
          "title": "Two defects found by the pins that were already there",
          "id": "two-defects-found-by-the-pins-that-were-already-there"
        },
        {
          "title": "Hiding happens inside a test as well as between groups",
          "id": "hiding-happens-inside-a-test-as-well-as-between-groups"
        },
        {
          "title": "What is still red, and why it is not fixed here",
          "id": "what-is-still-red-and-why-it-is-not-fixed-here"
        },
        {
          "title": "A hazard worth knowing before running these by hand",
          "id": "a-hazard-worth-knowing-before-running-these-by-hand"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "panel-observation.md",
        "palette-route-readings.md"
      ],
      "body": "# One failing assertion was hiding forty-two others\n\nMeasured on 2026-08-27, at `42b961370` on `master`.\n\n`npm test` was eleven groups chained with `&&`. That reads as an entirely reasonable thing to\nwrite, and it meant the fourth group's first failure stopped the seven groups after it from running\nat all. The exit code was `1` either way, so nothing anywhere said how much had not been looked at.\n\nWhat one visible failure was covering, once every group was actually run:\n\n| group | before | after |\n| --- | --- | --- |\n| `contracts` | 1 failing test | repaired |\n| `site-contracts` | **33 failing tests, never reached** | repaired |\n| `scripts` | 2 failing tests, never reached | repaired |\n| `site` | 2 failing pins, never reached | pins repaired; 15 articles still fail the genre check they were hiding |\n| `inventories` | **could not get past its own first command, never reached** | 7 of 38 commands still failing |\n\nThe one visible failure was a stale anchor: `narratedFire` had grown a third parameter carrying a\nreal severity, and `tests/contracts/narration.test.mjs` still asked for the old one-line signature\nand a bare `{ isError }`. Two of its four anchors matched nothing. That is an ordinary, cheap\nrepair — and it had been standing in front of everything else for as long as it had been there.\n\n## The runner\n\n[`scripts/run-test-groups.mjs`](../../scripts/run-test-groups.mjs) runs every group, prints each\ngroup's own verdict as it finishes, and ends with a summary naming every one. The exit code is\nstill a single bit; what changed is that a red run now says how much is red.\n\nReplacing a chain with something that keeps going gives up the chain's one real virtue — it could\nnot possibly finish green after a failure — so that has to be earned back explicitly rather than by\nlooking careful. The verdict is therefore a pure function of what the groups did, proved in\n[`tests/scripts/run-test-groups.test.mjs`](../../tests/scripts/run-test-groups.test.mjs) against\nfabricated results. The first case is the empty run: a summary that returned \"ok\" for a run in\nwhich nothing happened would be the worst possible defect in this file, so it is refused outright\nrather than trusted never to happen.\n\nThe group list is not hand-written. The runner refuses to start unless its arguments are exactly\nthe set of `test:*` scripts the package declares — both directions, because a requested group that\nis not declared would run nothing, and a declared group that is not requested is a suite nobody\nruns, which is the same defect one layer up from the one being fixed here.\n\n## The site inventory had reverted to a schema nothing else uses\n\nThis is what the thirty-three hidden failures were, and all thirty-three had one cause.\n\n`console/site/feature-registry.json` was at `schemaVersion: 1`, with each row carrying `state` and\n`files`. Everything that reads it wants `schemaVersion: 2`, with `status` and\n`implementation.paths`: `scripts/inventory-validation.mjs` refuses any other version outright, so\n`verify-inventories.mjs` — the first command of `test:inventories` — could not get past its own\nopening line, and the thirty-three contracts asserting `registry.features[id].status` were each\ncomparing `undefined` against a real value.\n\nThe migration to schema 2 exists, on the `site-registry-schema-v2` branch, and a later merge put\nthe schema-1 file back. Nobody noticed, because the chain never reached either group. The four\nfeatures that landed afterwards — `context-menu-shortcuts`, `long-operation-progress`,\n`in-context-recovery`, `built-in-authenticator` — were each written against `state` and `files`,\nso the site contracts had quietly split into two schemas, one of which had never passed.\n\nThe repair lifts each row into the schema-2 shape rather than taking the branch's file, because\nthat branch predates eight features and its notes would have written over the honest current ones.\nEvery row keeps its own status, its own note and its own file list; only the field names and the\nrow skeleton change. The status vocabulary differs by one word — schema 2 says\n`implemented-unverified` where schema 1 said `implemented`, which is the more honest of the two and\nis what every contract was already asking for.\n\nCross-checked before anything moved: of the twenty-seven contracts that assert a status, **every\none already agreed with the schema-1 value it was going to be migrated from**. So the migration\nchanges what the rows are called and not one thing about what they claim.\n\nTen `negative-*-site.mjs` scripts plant a deliberate break into the registry by literal text, and\ntheir anchors moved with the field names. All ten were retargeted and each anchor re-checked to\noccur exactly once in the migrated file — one of them did not, because the three-file list it\nedits is the identical text in seven other rows, so it is anchored to the tail of its own row's\nnote instead. A swap that hits the wrong row plants its break somewhere nothing is looking.\n\n## Two defects found by the pins that were already there\n\n**A modal dialog that never said it was modal.** `tests/scripts/panel-observation.test.mjs` pins\nthe number of dialog roles in the compiled shell against the number of `aria-modal` declarations,\nand insists they match. The tab-search overlay that `scripts/extend-pbx-m3.mjs` adds after the\ndesign is compiled had arrived carrying `role` and an accessible name and no `aria-modal`, while\npainting a full-inset scrim that dismisses on click. It behaves modally whatever it declares, and a\nmodal that does not announce itself takes focus away from a screen reader without telling it why.\nThe pairing assertion is what turned an arrival into a repair rather than a number somebody bumped;\neither count alone would have let it through.\n\n**A comment in a template is markup.** The first attempt at that repair put the explanation inside\nthe emitted template string, so the words `aria-modal` landed in the compiled shell as prose and\nthe attribute count came back one too high. The explanation now sits in the surrounding script.\nThis is the same trap the panel-observation harness already documents from the other direction: a\nsentence in an article that *mentions* an attribute is not an element carrying it.\n\n## Hiding happens inside a test as well as between groups\n\n`test:site` had two stale pinned counts — 78 documentation articles against 101, and 196 built\noutput files against 233 — both drifted by the consolidation merges while this group was never run.\nRepairing them let the rest of that same test run for the first time, and it immediately named\n**fifteen articles that do not carry the sections a feature article is required to carry**, plus\ntwo that are changelog fragments filed in a feature category. `assert` stops at the first failure,\nso a count at the top of a test hides everything below it exactly as a `&&` hides the group after\nit.\n\nThe count pins are now stated per category rather than as one total, and the built-output pin has\nthe relationship it was really recording asserted beside it — one markdown article in, one HTML\npage out — because a total on its own is exactly as easy to bump as it was to let drift, and it\ncannot notice an article that silently stops publishing.\n\nThe seventeen, named, so the next pass does not have to rediscover them:\n\n- `docs/agent/changelog-status-hub-client.md` — all five; it is a changelog fragment, and\n  `docs/changelog-fragments/` is the category for those\n- `docs/platform/changelog-logo-conversion.md` — all five; also a changelog fragment\n- `docs/platform/changelog-browser-extension-transfer.md` — Behavior, Configuration,\n  Failure modes, Verification\n- `docs/platform/changelog-dim-sum-runtime.md` — the same four\n- `docs/platform/browser-extension-download-surfaces-implementation.md` — the same four\n- `docs/platform/local-file-converter-ui.md` — the same four\n- `docs/platform/logo-conversion-contract.md` — Behavior, Configuration, Failure modes,\n  Suggested articles\n- `docs/platform/local-file-converter.md` — Behavior, Configuration, Failure modes\n- `docs/platform/dim-sum-startup-runtime.md` — Configuration, Failure modes, Verification\n- `docs/platform/desktop-settings-runtime.md` — Configuration, Verification\n- `docs/platform/ollama-suite-manager.md` — Behavior, Configuration\n- `docs/platform/appearance-runtime-core.md`, `docs/platform/export-and-bulk-core.md`,\n  `docs/platform/hosted-authentication.md`, `docs/platform/operation-receipts.md` — Configuration\n- `docs/platform/personal-vocabulary-upload.md` — Failure modes\n- `docs/agent/status-hub-client.md` — Suggested articles\n\nThey are not repaired here. Writing five sections of plausible-looking prose into fifteen articles\nwould satisfy the check and mean nothing, which is the failure the check exists to prevent. The two\nchangelog fragments are a different job again: they are in the wrong category rather than short of\nsections, and moving them changes the per-category counts pinned above, so it belongs with whoever\nwrites the other fifteen.\n\n## What is still red, and why it is not fixed here\n\n`test:site`, for the fifteen articles above, and `test:inventories`, where seven of thirty-eight\ncommands fail in four groups:\n\n- **Five scripts read a matrix shape that no longer exists.** `built-interaction-evidence.mjs`,\n  `operated-interaction-evidence.mjs`, `negative-evidence-claims.mjs` and the two negative scripts\n  beside them expect `console/inventories/surface-completeness.json` to hold two surfaces\n  (`windows-console`, `pages-site`) with `features` and `evidenceTemplates`. It holds 143 surfaces\n  with `rows`, and has since `246b2bc7a`. They fail with `surface.features is not iterable` and\n  `the inventory has no windows-console surface`. Repairing them is a redesign of the\n  evidence-checking layer, not an anchor edit, and it is the subject of the roadmap item this pass\n  belongs to rather than something to bolt on beside it.\n- **`verify-inventories.mjs` is blocked on a control nobody built.** `attention-inventory.ts` has\n  six wiring rows. Five are fully wired. The sixth, `next-action`, has **nine markers and eight of\n  them match nothing at all** — `att_next` is in neither the design, nor `App.tsx`, nor the\n  compiled shell. Only its durable key exists, in `attention-modes.ts`, along with `nextAction()`,\n  `setNextAction()` and `NEXT_ACTION_MAX_LENGTH`, which nothing calls. The canonical\n  \"One thing at a time\" mode rests on a user-chosen next action and the storage half is written and\n  the control was never built: wired at one end and consumed at neither, in the repository's own\n  inventory.\n- **Four scripts have planted breaks that stay green.** `negative-real-sources.mjs` (1 of 19),\n  `negative-dialplan-divergence.mjs` (1 of 31), `negative-changelog-site.mjs` (1 of 51: \"a filtered\n  export claims the range of the whole history\"), and `negative-destination-route.mjs` (11 cases\n  behaving backwards). Each is a real gap in what those guards can see, and each needs reading\n  rather than retargeting.\n\nNine of the ten `negative-*-site.mjs` scripts pass once their registry anchors follow the schema.\nThe tenth is the changelog one above, and its failure is its own, not the schema's.\n\n## A hazard worth knowing before running these by hand\n\nThe `negative-*` scripts plant a deliberate break into a real source file and restore it\nafterwards. They do not restore in a `finally`, so one that crashes mid-run leaves the break behind\n— which happened here: `negative-display-name-site.mjs` left four planted breaks in `site/app.js`,\nand every command run after it produced a verdict about a tree nobody had written. The nine\nverdicts after it in that pass were discarded and re-measured against a restored tree.\n\nRun them one at a time with `git status` checked in between, and treat any run after a crashed one\nas void.\n\n## Capture records\n\nNothing here is a photograph. Every figure is a count taken from a command run against a stated\ncommit, so the \"capture\" is the command and the record is what it printed.\n\n| Measurement | Value | Command | Source commit |\n| --- | --- | --- | --- |\n| Groups `npm test` reached before the change | 4 of 11 | `npm test` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Failing tests in `site-contracts`, never reached | 33 of 670 | `node --test site/tests/contracts/*.test.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Failing tests in `scripts`, never reached | 2 of 166 | `npm run test:scripts` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Failing tests in `site`, never reached | 2 of 15 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Commands of `test:inventories` failing | 6 of 38 | each command run singly | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Attention wiring markers matching nothing | 8 of 9, all in `next-action` | marker scan over the four owner sources | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Documentation articles, pinned versus actual | 78 versus 101 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Built site output files, pinned versus actual | 196 versus 233 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Articles missing a required section, once the pins stopped hiding them | 17, of which 2 are misfiled changelog fragments | section scan over the seven article categories | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Site negative scripts passing once their anchors follow the schema | 9 of 10 | each script run singly | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n\n## Capture method\n\nEach group was run on its own with `npm run test:<group>` and its TAP totals read from the run.\nThe thirty-eight commands of `test:inventories` were split out of `package.json` and run one at a\ntime, with `git status` checked between each, because several of them plant a deliberate break\ninto a real source file. The attention markers were counted by extracting every\n`marker('owner', \"text\")` pair from `attention-inventory.ts` and counting its occurrences in the\nfile that owner names.\n\n## Verification boundary\n\nThe counts are of this repository at the commit named above and say nothing about any other.\n\nThe `test:inventories` figure of \"6 of 38 failing\" is measured **after** the site registry was\nmigrated, because the migration is what let the group's first command get past its opening line at\nall; against the unmigrated tree the only measurable figure is \"1 of 38, and the chain stops\".\n\nNine of the thirty-eight verdicts in the first pass were discarded rather than reported, because\n`negative-display-name-site.mjs` crashed before restoring the breaks it had planted and everything\nafter it ran against a tree nobody had written. Those nine were re-measured against a restored\ntree; the numbers above are from the re-measurement.\n\nNothing here has been run in a browser, and no packaged artifact was built or driven. The\n`aria-modal` repair is proved by the compiled shell and by the pinned counts that caught it, and no\nscreen reader has been asked what it now announces.\n\n## Suggested articles\n\n[What a panel actually offered](panel-observation.md),\n[Command palette route readings](palette-route-readings.md).\n"
    },
    {
      "id": "evidence/live-readings",
      "category": "evidence",
      "title": "Every reading, run against a live Asterisk",
      "headings": [
        {
          "title": "What ran",
          "id": "what-ran"
        },
        {
          "title": "Result",
          "id": "result"
        },
        {
          "title": "Three things it found",
          "id": "three-things-it-found"
        },
        {
          "title": "One thing worth knowing about `dialplan show`",
          "id": "one-thing-worth-knowing-about-dialplan-show"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Guards",
          "id": "guards"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "statuscell-text-pixels.md",
        "design-parity-material-audit.md"
      ],
      "body": "# Every reading, run against a live Asterisk\n\nUntil this pass, no reading in this console had ever been taken from a running Asterisk. Every\nparser was written against a format string in this checkout's own C sources and tested against a\nfixture built from that string, which is a real discipline and a different claim: it says the\nparser matches what the source says Asterisk prints, not that it matches what Asterisk printed.\n\nThis is the second claim, measured.\n\nLedger: [`release/evidence/live-exchange/readings.json`](../../release/evidence/live-exchange/readings.json).\nCaptures: `release/evidence/live-exchange/readings/`.\nHarness: [`scripts/live-readings.mjs`](../../scripts/live-readings.mjs).\n\n## What ran\n\nThe target is the `ding-pbx-console` WSL2 distribution the console provisions from its own\nbundled root filesystem — an exchange this console created and may destroy. Nothing here writes\nto an exchange anybody depends on; that remains a separate, annotated roadmap item needing an\nauthorization only the repository owner can give.\n\n1. **Baseline.** All 63 allowlisted read-only command lines, plus the one object command, run\n   through `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production read path, not a\n   re-implementation of it. Every stdout committed verbatim.\n2. **Population.** The exchange as provisioned has no configured objects at all: every shipped\n   sample file is comment-only, so twelve readings would otherwise have been verified against\n   `No objects found.`, which proves the command runs and proves nothing about the parser. A\n   fixture was written through the console's own `StructuredConfigPlanner` → `ConfigTransaction`\n   → `WslConfigTransport` path across seven resources, and Asterisk reloaded.\n3. **Populated capture.** Every command run again. A command whose bytes were unchanged records\n   `sameAsBaseline` instead of committing a second identical file.\n4. **Restore.** Every backup handle the transaction returned rolled back, then each of the seven\n   files hashed on the target again. **All seven came back byte-identical.**\n\nBeside the parsers, all **14 gateway-backed production readers** were driven exactly as a screen\ncalls them, and the `CapabilityResult` each returned is recorded. That is the half a parser test\ncannot reach: a correct parser behind a reader that reports `unavailable` is a blank screen, and\nonly driving the reader tells the two apart.\n\n## Result\n\n**30 of 30 readings parse the live target's real output. 24 of 30 return rows once populated.**\n\n| Reading | Command | Parser | Baseline | Populated | Rows are |\n| --- | --- | --- | --- | --- | --- |\n| `channels` | `core show channels concise` | parseChannels | 0 | 0 | live channels |\n| `endpoints` | `pjsip show endpoints` | parseEndpoints | 0 | 1 | endpoints |\n| `contacts` | `pjsip show contacts` | parseContacts | 0 | 1 | contacts |\n| `registrations` | `pjsip show registrations` | parseRegistrations | 0 | 1 | outbound registrations |\n| `auths` | `pjsip show auths` | parsePjsipAuths | 0 | 1 | auth objects |\n| `channelStats` | `pjsip show channelstats` | parseChannelStats | 0 | 0 | per-channel codec rows |\n| `endpointDetail` | `pjsip show endpoint ding-live-probe` | parseEndpointDetail | — | 4 | transport and codec values |\n| `queues` | `queue show` | parseQueues | 0 | 1 | queues |\n| `modules` | `module show` | parseModules | 255 | 255 | modules |\n| `iaxPeers` | `iax2 show peers` | parseIax2Peers | 0 | 1 | IAX2 peers |\n| `iaxRegistrations` | `iax2 show registry` | parseIax2Registry | 0 | 1 | IAX2 registrations |\n| `uptimeSeconds` | `core show uptime seconds` | parseUptimeSeconds | 1 | 1 | seconds |\n| `dialplan` | `dialplan show` | parseDialplanGraph | 101 | 101 | dialplan steps |\n| `voicemailUsers` | `voicemail show users` | parseVoicemailUsers | 2 | 3 | mailboxes |\n| `voicemailZones` | `voicemail show zones` | parseVoicemailZones | 5 | 5 | zones |\n| `confbridgeRooms` | `confbridge list` | parseConfbridgeList | 0 | 0 | running conferences |\n| `mohClasses` | `moh show classes` | parseMohClasses | 1 | 2 | music classes |\n| `codecs` | `core show codecs` | parseCodecs | 46 | 46 | codecs |\n| `translations` | `core show translation` | parseTranslations | 18 | 18 | translation rows |\n| `aclRules` | `acl show` | parseAclRules | 0 | 1 | named ACLs |\n| `cdrStatus` | `cdr show status` | parseCdrStatus | 10 | 10 | settings and backends |\n| `loggerChannels` | `logger show channels` | parseLoggerChannels | 1 | 1 | logger channels |\n| `managerSettings` | `manager show settings` | parseManagerSettings | 15 | 15 | settings |\n| `managerUsers` | `manager show users` | parseManagerUsers | 0 | 1 | manager users |\n| `ariApps` | `ari show apps` | parseAriApps | 0 | 0 | connected REST applications |\n| `sysinfo` | `core show sysinfo` | parseSysinfo | 7 | 7 | system values |\n| `uptime` | `core show uptime seconds` | parseUptime | 2 | 2 | uptime values |\n| `bridges` | `bridge show all` | parseBridges | 0 | 0 | live bridges |\n| `applications` | `core show applications` | parseApplications | 178 | 178 | registered dialplan applications |\n| `ariUsers` | `ari show users` | parseAriUsers | 0 | 0 | ARI users |\n\nThe `applications` reading is the REST resource browser's own proof that `core show applications`\nparses real output rather than an invented shape: 178 real Asterisk applications, starting with\n`AddQueueMember`, off the live build this repository's sources produced.\n\nThe six that stayed empty are exactly the six this harness declares it cannot populate, and the\nreason is recorded against each rather than left as an unexplained zero: a channel and a channel\nstatistic exist only while a call is up; `confbridge list` prints conferences that are *running*,\nnot rooms that are configured; an ARI application appears when a client connects, not when a file\nsays so; a bridge exists only while two or more channels are actually being mixed together; and\n`ari.conf.sample` ships every `[username]` section commented out, so a freshly provisioned\nexchange has no ARI user for `ari show users` to print -- the fixture this harness writes creates\na PJSIP endpoint, not an ARI user, and adding a second unrelated fixture for one reading was not\nworth the coupling. `--check` refuses any *other* reading landing in that list, so a reading that\nquietly stopped returning rows cannot pass as a documented limitation.\n\n**11 of the 65 commands are not built into this target** and the console handles all eleven\ncorrectly: `AsteriskReadings` diverts on `No such command` and reports the subsystem as\nunavailable rather than parsing the refusal into an empty table. Those eleven are the three\n`dahdi show`, `odbc show`, both `dundi show`, all three `stir_shaken show`, and both `geoloc`.\n\n## Three things it found\n\n**1. The write path cannot represent a file that repeats a section name — high.** Found by the\nfixture's first attempt, which added a second `[general]` to `iax.conf` and was refused with\n`Post-read mismatch for /etc/asterisk/iax.conf`. Measured directly afterwards: an **unchanged**\nround trip of\n\n```\n[6001]                     [6001]\ntype=endpoint              type=aor\ncontext=default            max_contacts=1\nallow=ulaw\n```\n\n— the pattern nearly every real `pjsip.conf` uses — renders `type = endpoint` as `type = aor`,\ndeletes `context` and `allow`, and inserts `max_contacts` into the first section. Parsed section\nentry counts go from `[3, 2]` to `[2, 2]`. The cause is one line: `renderConfigOver` builds its\ndesired map with `wanted.set(section.name, section.entries)`, so the last section of a repeated\nname overwrites every earlier one.\n\nIt **fails safe**: `ConfigTransaction` compares the parsed post-read against the desired value,\nfinds them unequal, and rolls back. What it costs is that such a resource cannot be written at\nall, and the operator is told `Post-read mismatch`, which names nothing about repeated sections.\nThe fixture routes around it — the aor is `ding-live-probe-aor`, and `mergeFixture` folds the\n`register =>` line into the existing `[general]` rather than adding a second one — and refuses\noutright, by name, rather than discovering it three steps later.\n\n> **Repaired since this run, in a change of its own.** `renderConfigOver` now groups the desired\n> value into one ordered list of entry-lists per name and matches the *n*th `[name]` in the file\n> against the *n*th desired section of that name. The exact text above round-trips byte for byte,\n> entry counts stay `[3, 2]`, and editing, adding to, dropping and appending an occurrence each\n> reach the occurrence that asked for it — held by six tests in\n> `tests/control-plane/config-round-trip.test.ts`, each proven by breaking the repair four ways,\n> one at a time. Occurrence matching is positional, so which block's *comments* travel with a\n> surviving section is decided by position, exactly as it already was for a repeated key.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken. Two things this repair does **not** claim: nothing here has been run\n> against a live Asterisk, so the repair is proved against fixtures and this checkout's own\n> round-trip contract and no further; and the fixture still avoids the shape, because the\n> committed captures were taken under that constraint and widening it without re-running against\n> a target would describe a run that never happened.\n\n**2. The voicemail reading drops a mailbox and nothing says so — medium.** The live target's own\ntrailer said **4 voicemail users configured**; the reading produced **3**, and the Voicemail\nscreen renders exactly those three. The missing row is the shipped sample's\n`myaliases  1234@devices`, whose mailbox overruns the five-character field of a fixed-width\ntable. `parseVoicemailUsers` drops such a row deliberately — misassigning its columns would be\nworse — and says so in its own comment. What is missing is that the parser hands back a `total`\nbeside the list and `readings.ts` never reads it, so an incomplete list is indistinguishable from\na complete one. `parseManagerUsers` carries the same `total` beside the same kind of list into\nthe same screen.\n\nThis is also why the fixture's voicemail context is `dingvm` and not `ding-live-probe-vm`: an\neighteen-character context would have added a mailbox the reading could not see, and the fixture\nwould have proved nothing about parsing a new row.\n\n> **Repaired since this run, in a change of its own.** `parseVoicemailUsers` now hands back\n> `dropped` beside `users` and `total` -- every data line it refused, verbatim -- and both screens\n> read the count they were throwing away. The Voicemail screen says *1 of the 4 voicemail users\n> on this target is missing from this table*, names the mechanism, and quotes the line it could\n> not read; the AMI screen says the same about `manager show users` from its trailer alone,\n> because that parser cannot name the line it lost and the count is the whole honest signal it\n> has. A reading that never answered now names itself too, on both screens: each edits a\n> configuration file, so `note()` returns from its configuration branch and never reaches the\n> reading-failure report at the bottom of it, leaving an empty table whose only sentence was\n> about the file. The AMI screen acquired that same shape the day it was given a real\n> `manager.conf` to read, which is why both of its commands are checked rather than only the one\n> this item named. Nine render tests in `tests/ui/dropped-rows-wired.test.tsx` read those\n> sentences out of the real `App`'s markup rather than out of the note builder, because a value\n> computed and never rendered is exactly the defect being repaired.\n>\n> **The parse half of the ledger beside this article moved, and how it moved is worth stating.**\n> Adding a field to what `parseVoicemailUsers` returns changes the canonical JSON it hashes to,\n> so `--check` went red on both phases -- correctly: the recorded hash no longer described what\n> the parser produced. It was re-derived from the *same committed captures* by a new `--reparse`\n> mode rather than by editing four hashes into JSON by hand. `--reparse` touches only what a\n> parser decides (`parsedSha256`, `rows`, `summary`, `threw`), prints every field it moves, and\n> refuses to write at all when a capture no longer hashes to what the ledger recorded, so it\n> cannot launder an altered capture into a fresh-looking record. Four fields moved: two hashes\n> and two summaries, each gaining the `myaliases  1234@devices` line. **No capture was retaken\n> and no live-half field was touched** -- the commit, the exchange, the fixture, the restore and\n> every production-reader result are exactly as that run recorded them, and a test asserts it.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken. Two things this repair does **not** claim: nothing here ran against a\n> live Asterisk, so it is proved against the committed captures, fixtures and render tests and no\n> further; and the note reports a shortfall against the target's own trailer wherever there is\n> one, so a reading whose target printed no trailer falls back to counting the lines the parser\n> refused -- the best estimate available rather than the same measurement.\n\n**3. `media cache show` is allowlisted without the argument it needs — medium.** The live target\nanswered `Usage: media cache show <uri>` with exit code 0. `AsteriskReadings` diverts only on\n`No such command` and `Unable to connect to remote asterisk`, so a usage line reaches the CLI\nscreen as a successful reading. No parser consumes this command today, so nothing is currently\nmis-parsed; what is wrong is that the allowlist carries a line that can never produce one.\n\n> **Repaired since this run, in a change of its own, and the fix was neither of the two the\n> roadmap offered.** The entry was not a command missing an argument; it was the *wrong command*.\n> `main/media_cache.c` registers two CLI entries whose names are prefixes of one another: line 528\n> is the singular `media cache show`, which refuses any `a->argc != 4` and reads its subject from\n> `a->argv[3]`, and line 477 is `media cache show all`, the container listing that takes no\n> argument at all. The allowlist wanted the container and carried the singular. It now carries\n> `media cache show all`, `parseMediaCacheItems` reads it, the dispatcher takes it for the `moh`\n> view beside the classes, and the Music on Hold screen says what is in the cache — or that it is\n> empty, which is a different fact from unread and had to be sayable separately.\n>\n> **The singular is deliberately not a second object command.** It would fit the mechanism, and it\n> prints per-item metadata (`ext`, `content-type`, `__actual_expires`) the listing does not. It is\n> left out because its object id is a URI: `OBJECT_ID` admits no `:` and no `/`, and widening the\n> one check between a target-supplied string and an `asterisk -rx` argument, for metadata no screen\n> displays, is a bad trade. A test fails if that decision is ever reversed quietly.\n>\n> **It has its own live captures rather than being backdated into this run.** The command was run\n> against the same disposable exchange through `LocalAsteriskCliGateway` over\n> `NodeProcessExecutor`, empty and populated, and the cache was put back — recorded in\n> `commandsAllowlistedAfterThisRun`, which is checked exactly as a phase capture is (a committed\n> file, a hash that still matches, a parse that still digests the same) and additionally refuses a\n> row for a command the allowlist no longer carries. **Nothing in the phases, the fixture, the\n> restore or the production-reader records moved**, because those bytes came from a different run\n> against a different exchange state, and merging the two would describe a run that never happened.\n>\n> Populating it needed the target to *fetch* something: the media cache holds what Asterisk\n> retrieved at run time, so no configuration file can fill it, and `media cache create` is not a\n> route either — it needs the scheme backend to implement a create wizard, and\n> `res_http_media_cache` implements only retrieval, so it answers `Unable to create`. The harness\n> serves one file over loopback HTTP and asks the target to refresh two URIs, one inside the\n> format's 40-column pad and one well past it, which is what proves the parser rather than asserts\n> it: `%-40s` has no precision, so it pads and never truncates, and the long URI arrives in full\n> with no padding beside a short one padded out to 40.\n>\n> **Two things this repair found that are worth more than the repair.** The first\n> `--capture-added` run wrote three byte-identical captures of an empty listing and **passed its\n> own restore proof**, because after-restore trivially equals before-populate when the populate did\n> nothing at all. The cause was that `$name` does not survive the trip to the target: something\n> between `spawn` (with `shell: false`) and the Linux side of `wsl.exe` expands a `$`-sigil\n> identifier and replaces it with nothing, even inside a quoted heredoc — `my $body = 1; my $fh;\n> local $/;` arrives as `my  = 1; my ; local $/;`, with `$/` surviving only because it is not an\n> identifier. Nothing reports it: the file is written, the shell exits 0, and the failure surfaces\n> later as a perl syntax error nobody is looking at. The payload is base64 now, which has no `$` in\n> it for any layer to find. And the harness refuses a populate that changed nothing, because a\n> proof whose condition cannot be violated is not a proof.\n>\n> The finding above is left as it was written, because it is what this run measured and the run is\n> not being re-taken.\n\nAll three are recorded on the roadmap. None is repaired here: this pass verifies readings, and\nclosing a write-path or screen defect inside it would be a change nobody reviewing this item\nwould be looking for.\n\n## One thing worth knowing about `dialplan show`\n\nThe baseline `dialplan show` disagreed with `/etc/asterisk/extensions.conf` as it stood on the\ntarget. The file contained `[dundi-e164]` at line 287, `[iax2-trunk]` at 306 and `[trunkint]` at\n318; the running Asterisk had none of them, because it had not reloaded `pbx_config` since an\nearlier session restored that file. The harness reload brought the two into agreement, which is\nwhy `dialplan show` is the one command still differing after the restore — the file is identical,\nand it is the *loaded state* that moved.\n\nThat is a fact about readings in general and not about this run: **`dialplan show` reads what is\nloaded, not what is on disk**, and the console cannot presently tell an operator when the two have\ndiverged. The baseline capture is a genuine reading of a dialplan that no configuration file on\nthat target described.\n\n> **Repaired since this run, in a change of its own.** The canvas screen now compares the two:\n> `contextsMissingFromLoadedDialplan` (`app/renderer/src/canvas.ts`) checks every context name\n> `extensions.conf` declares against the contexts the loaded dialplan graph actually has\n> extensions under, and names the ones that are only in the file. Exactly the shape this run\n> measured: `[dundi-e164]`, `[iax2-trunk]` and `[trunkint]` would each have been reported, had\n> the file and the loaded dialplan still disagreed by the time an operator looked. It compares\n> only the direction a reading can prove without guessing -- a context declared but with no\n> loaded extension, never the reverse -- and says so in its own comment rather than overclaiming\n> what the comparison can rule out. `parseDialplanGraph`'s own return shape is untouched, so this\n> also needed no fresh live capture and does not move what `--check` re-derives above.\n>\n> Fixed alongside it: the canvas screen's status note was separately stuck reporting \"Reading…\"\n> forever, regardless of what `dialplan show` actually answered. `canvas` declares\n> `file: 'extensions.conf'` like a configuration-editing screen, which routed it into the note\n> logic that reports what `this.configs[screen]` holds -- but canvas has no bound controls\n> (`groups: []`) and that field is never populated for it, so the branch always returned its own\n> \"Reading…\" fallback and the canvas-specific reason below it was unreachable. Without that fix\n> the divergence sentence above, and every dialplan-read failure reason, would have been silently\n> discarded before reaching the screen.\n>\n> Held by `tests/ui/canvas.test.tsx` (the comparison itself, including the exact three contexts\n> above) and `tests/ui/canvas-divergence-wired.test.tsx` (rendering the real screen, including the\n> \"Reading…\" regression). The finding above is left as it was written, because it is what this\n> run measured and the run is not being re-taken.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Every allowlisted command against the exchange as provisioned | `release/evidence/live-exchange/readings/baseline/` and `readings.json` at `phases.baseline.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines, one capture each | 52 returned data, 11 are not built into this target, 1 answered with a usage line |\n| Every reading parsed from those exact bytes | `readings.json` at `phases.baseline.readings` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 27 of 27 readings | 26 parsed; `endpointDetail` threw, and the production reader turned that into an honest `unavailable` in the target's own words |\n| Every gateway-backed reader driven as a screen calls it | `readings.json` at `phases.baseline.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 13 `available`, 1 `unavailable` naming the endpoint that did not exist yet |\n| The fixture written through the console's own transaction path | `readings.json` at `fixture` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources, 35 backup/stage/validate/apply/post-read actions | `applied`, \"Configuration applied and verified\" |\n| Every allowlisted command against the populated exchange | `release/evidence/live-exchange/readings/populated/` and `readings.json` at `phases.populated.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines; 16 changed and were captured again, 48 recorded `sameAsBaseline` | 23 of 27 readings returned real rows |\n| Every gateway-backed reader against the populated exchange | `readings.json` at `phases.populated.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 14 of 14 `available` |\n| The exchange put back | `readings.json` at `restore` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources hashed on the target before and after | all 7 byte-identical; 4 commands still differ and every one has a recorded reason |\n\n## Capture method\n\nEvery command was run by `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production\nread path, imported from `control-plane/`, not a re-implementation of it — against the\n`ding-pbx-console` WSL2 distribution the console provisions from its own bundled root filesystem.\nEvery stdout is committed exactly as the console received it, which means after the executor's own\nredaction: a capture is what the console sees rather than what Asterisk printed, and\n`redactedMarkers` counts each place that mattered.\n\nThe fixture went through `StructuredConfigPlanner` → `ConfigTransaction` → `WslConfigTransport`,\nso it is the console writing to the exchange rather than a shell heredoc. The one command that is\n**not** a production path is `asterisk -rx \"core reload\"`: the control plane has no reload action,\nwhich is a recorded roadmap gap, so the harness issues it directly and the ledger says so.\n\nRe-run the live half with `npx tsx console/scripts/live-readings.mjs --capture`. Re-derive the\nparse half from committed bytes, on any machine and against no target, with\n`npx tsx console/scripts/live-readings.mjs --check`, which `npm test` runs.\n\nThe captures are pinned to LF in `.gitattributes`. Without that, `core.autocrlf=true` would check\nthem out as CRLF on a fresh Windows clone, changing every recorded hash and shifting every\nfixed-width column the voicemail and IAX2 parsers slice by — a red gate with nothing wrong with\nthe evidence, and no way for a reader to tell that from tampering. Proven by deleting the capture\ndirectory, checking it out again, and re-running `--check`: zero carriage returns, still green.\n\n## Verification boundary\n\n`--check` re-derives the **parse** half. It reads every committed capture back, re-hashes it,\nre-runs the production parser over it, and requires the canonical JSON to hash to exactly what was\nrecorded — so a parser that moves after a capture turns the suite red rather than leaving a stale\nclaim standing. It requires every allowlisted command to have a record, so a command added later\ncannot be silently unverified while the ledger goes on saying all 63 were covered. And it\nre-derives the ledger's headline counts from the ledger's own rows, so a count that stopped\nmatching its rows cannot keep reading as a verification.\n\nIt **cannot** re-derive the gateway, the executor, the reload or the restore. Those ran once,\nagainst one exchange, at one moment.\n\nFour readings were never exercised with rows, because no configuration file can create what they\nread: a live channel, a per-channel codec statistic, a *running* conference, or a connected REST\napplication. Their zeroes are the target being truthful and are labelled as such rather than left\nunexplained.\n\nNothing here writes to an exchange anybody depends on. The target is one this console created and\nmay destroy, and a write to a production exchange needs an authorization only the repository owner\ncan give — still open on the roadmap.\n\nOne safety property this happens to have measured rather than assumed. The fixture configured a\nreal `password=` on a PJSIP auth object and a real `secret=` on a manager user, and **that value\nappears in none of the 80 committed captures**, from any of the 64 command lines, in either phase.\nThe console's claim that its read-only allowlist prints no credential — the reason `pjsip show\nauth <id>` is kept out of it while `pjsip show auths` is in — now has a live exchange behind it\nrather than only a reading of Asterisk's sources. The executor's redactor fired zero times across\nthe whole run, so nothing was hidden on the way past either.\n\nThree defects were found and none was repaired here. This pass verifies readings; closing a\nwrite-path or screen defect inside it would be a change nobody reviewing this item would be\nlooking for.\n\n## Guards\n\n`tests/live/live-readings.test.mjs` (26 tests) and `scripts/negative-live-readings.mjs`\n(12 breaks, each planted alone, each watched go red, each restored green).\n\nThe five tests added after this run guard `--reparse`, the mode that re-derives the parse half\nfrom the committed captures: that it is a no-op against a ledger already matching its bytes, that\nit repairs a hand-damaged hash and names exactly what it moved, that it refuses to write when a\ncapture no longer hashes to what was recorded, that it leaves every live-half field alone, and\nthat the ledger still names the exact voicemail line the reading could not turn into a row.\n`scripts/negative-dropped-rows.mjs` holds the repair those describe with 18 further breaks, two\nof them aimed at `--reparse` itself.\n\nThe media cache repair adds `tests/control-plane/media-cache.test.ts` (12 tests, run against the\ncommitted live captures rather than against fixtures), `tests/ui/media-cache-wired.test.tsx` (7,\nwhich render the real `App` on the Music on Hold screen and read the sentence out of its markup,\nbecause a reading computed and never rendered is exactly the defect being repaired),\n`tests/live/live-readings-added.test.mjs` (13, mostly refusals — a mechanism that satisfies a\ncoverage check is a mechanism that can become a hole in it), and\n`scripts/negative-media-cache.mjs` with 18 further breaks, each planted alone, each watched go\nred, each restored green.\n\n`tests/scripts/test-suites-are-wired.test.mjs` gained an assertion of its own at the same time,\none layer over all of these: every `scripts/negative-*.mjs` must actually appear in the `npm test`\nchain. It is derived from the filesystem for the same reason its neighbour is — a hand-written\nlist cannot catch a script that was never added to the list, which is the exact failure it exists\nto stop. Proved by unchaining the new script and watching it name it.\n\nTwo of those eighteen stayed green when first planted, and both found something real rather than\nmerely needing rewording.\n\nThe first made the AMI screen claim a shortfall for a reading that had failed, and nothing went\nred, because `note()` returned the failure before the shortfall could be reached: the break was\nunreachable rather than unwatched. **The property genuinely unguarded was the one beside it** --\na screen fed by two commands, one failing while the other comes back a row light, reported\nwhichever sentence came first and dropped the other. Both are said now.\n\nThe second stayed green because of the assertion rather than the code. Three negative needles\nread `missing from this table`, and once a failed reading had a sentence of its own that phrase\nbelonged to both, so the needle could no longer fail for the reason it was written for. Tightened\nto `on this target is missing from this table`, it then missed a *plural* fabricated claim, since\nthat phrase inflects. All three are anchored on the uninflected `<unit>s on this target` now.\n**A negative assertion whose needle drifted onto neighbouring prose is the quietest kind of dead\nguard there is**, and only planting the exact lie it was written to catch shows it up.\n\nTwo of those twelve had to be rewritten, and the reason is worth recording. Commenting out\n`if (!recorded.has(command))` inside the coverage check left everything green — not because\nnothing watches that line, but because every command *did* have a capture, so the condition it\nguards was not violated and there was nothing to find. **A break that removes a guard whose\ncondition currently holds can never go red, and it reads exactly like a guard that is watched.**\nBoth were rewritten to violate the condition instead — a ledger missing a command, and a recorded\nhash that no longer matches the bytes on disk — and both then went red.\n\n## Suggested articles\n\n- [The first approved write plan against a live exchange](../../release/evidence/live-exchange/write-plan.json) — the pass that proved the write path this fixture rides on, and the two defects it found.\n- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — the same discipline applied to a rendered frame rather than to a reading.\n- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place a machine is allowed to write a verdict, and what constrains it.\n"
    },
    {
      "id": "evidence/palette-route-readings",
      "category": "evidence",
      "title": "Twenty-five palette routes, driven and read",
      "headings": [
        {
          "title": "The route table is read out of the records, not written beside them",
          "id": "the-route-table-is-read-out-of-the-records-not-written-beside-them"
        },
        {
          "title": "What each route establishes",
          "id": "what-each-route-establishes"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Three things the run found",
          "id": "three-things-the-run-found"
        },
        {
          "title": "Where the artifact came from",
          "id": "where-the-artifact-came-from"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "panel-observation.md",
        "panel-observation.md",
        "design-parity-chrome-bar.md"
      ],
      "body": "# Twenty-five palette routes, driven and read\n\nTwenty-six of the thirty-nine built-interaction records under `release/evidence/windows-console/`\ncarry an `observedPanelControls` field. Twenty-five of them recorded an empty list.\n\n[`panel-observation.md`](panel-observation.md) established why, in two parts. Nothing in this\nrepository ever produced the field -- the selector lived in an ad-hoc paste at a driving session and\nwas never committed. And every one of the twenty-five readings was taken at a moment with no panel\nin it, because activating a palette result closes the palette before it teleports. That pass\nrepaired the reader and drove exactly one of the twenty-five, which settled what a good reading\nlooks like and settled nothing about the other twenty-four.\n\nThis drives all twenty-five, at both of the moments that pass identified: with the palette up and\nfiltered, and again once whatever the result teleports to has opened.\n\nHarness: [`scripts/ui-drive/palette-routes.mjs`](../../scripts/ui-drive/palette-routes.mjs) and\n[`scripts/ui-drive/palette-route-table.mjs`](../../scripts/ui-drive/palette-route-table.mjs).\nChecker: [`scripts/palette-route-readings.mjs`](../../scripts/palette-route-readings.mjs).\nContract: [`tests/scripts/palette-routes.test.mjs`](../../tests/scripts/palette-routes.test.mjs).\nDeliberate breaks: [`scripts/negative-palette-routes.mjs`](../../scripts/negative-palette-routes.mjs).\nReading: [`release/evidence/ui-drive/palette-route-readings.json`](../../release/evidence/ui-drive/palette-route-readings.json).\n\n## The route table is read out of the records, not written beside them\n\nA hand-written list of twenty-five queries is a second authority, and it diverges from the first\nthe day somebody edits a record -- silently, and always in the direction of the copy being stale.\nSo the table is derived on every run from the records themselves: the query out of each record's\nown `action` prose, the target out of its `observedTarget`.\n\nThat makes three things errors rather than omissions. A record carrying the field whose prose no\nlonger names a typed query fails, unless it is one of the records declared as reached another way --\nthere is exactly one, `regex-builder`, driven from the dashboard section-search row and the only\none of the twenty-six whose reading was not empty. A declaration that no longer matches any record\nfails too, because an allowance that excuses nothing should be removed rather than left as a\ncomment nobody read. And a record naming a query with no target fails, because nothing would then\nsay what the activation was supposed to reach.\n\n## What each route establishes\n\nEach is a thing a passing suite cannot say, and each is in the reading rather than in this page.\n\n**The chord opens the palette from wherever the last route landed.** Every route is entered from\nthe previous route's destination, which is how a person uses it and is not how any unit test\nexercises it. `startedOn` records that screen. Across the run the routes were entered from ten\ndifferent screens -- `Dashboard`, `Customise everything`, `PJSIP endpoints`, `Changelog`,\n`Hardware trunks (DAHDI)`, `History`, `Appearance`, `Notification centre`, `Documentation` and\n`Status hub sessions` -- so this is not twenty-five readings of one starting state.\n\n**The query filtered, and the palette says by how much.** Its own hint is recorded verbatim, so a\nlist that rendered unfiltered is distinguishable from one that matched: `1 of 883` for\n`narrated language`, `7 of 883` for `school`.\n\n**The typing is real typing.** `Input.insertText` through the input domain, never an assignment to\n`.value`: the field is a controlled React input reading `event.target.value`, and an assignment\nsets the property without producing the event, so the component would never see it and the list\nwould never filter -- a difference invisible in a finished screenshot.\n\n**The control the application focused is the control the palette entry names.** This is the\nassertion worth having, and it is the checker's job rather than the driver's. A reading saying\n\"activating this row focused `e_displayname`\" is worth nothing alone, because nothing in it says\nthat row was supposed to reach that control. `buildPalette` gives a setting entry a `controlId` and\na destination entry none, so the row's own label and context determine what the application owed\nthe reader. The checker rebuilds the palette from the compiled design, finds the entry for the row\nthat was activated, and compares.\n\n## Capture records\n\n| State | Record | Read at commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Routes derived from the records | `release/evidence/windows-console/*.json` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 40 records | 26 carry the field; **25 are palette routes**, 1 is `regex-builder`, reached another way |\n| Routes driven end to end | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes, 2 phases each | **25 of 25** opened the palette on the chord; 0 refused |\n| Controls the reader returned with the palette up | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **266 controls**, between **2** and **60** per route, where the records recorded **0** on every one |\n| Controls the reader returned after activation | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **`panelFound: false` on all 25**, with its reason -- a settings screen is a page, not an overlay |\n| Focused control against the compiled palette | `scripts/palette-route-readings.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 25 activations | **22 setting entries each reached the exact `controlId` its entry names; 3 destination entries focused nothing, which is what a destination entry names** |\n| The record's own target, as a row label | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | 22 present as an exact row label; **3 name their target in prose** and are reported as such rather than counted as matches |\n| Rows sharing one label | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **1 route is ambiguous**: `display name` returns two rows both labelled `Display name` |\n| Readings standing on the reader's control cap | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **2**: `browser-style-tabs` held 63 controls and `material-appearance` 74, against a cap of 60 |\n| Pictures taken | `release/captures/ui-drive/palette-routes/` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 50 files | one per route with the palette up, one per route where it landed; every one hashes to what the reading recorded |\n| Deliberate breaks to the reading, one at a time | `scripts/negative-palette-routes.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 24 breaks | all 24 red one at a time, all 24 green on restore |\n| Deliberate breaks to the harness itself, one at a time | `tests/scripts/palette-routes.test.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 5 breaks | 3 red immediately; **2 stayed green** and were both this pass's own guards, described below; all 5 red after repair and green on restore |\n\n## Three things the run found\n\n**A palette row label does not always identify a result.** The query `display name` returns two\nrows, both labelled exactly `Display name`, separated only by their context: one on\n`Endpoints · Identity`, the PJSIP endpoint's own field, and one on\n`Customise everything · Identity`, the console's display name. `app-display-name.json` says in its\nprose that it \"clicked the 'Display name' result\", and its `route` says that result was in\n`Customise everything`. Those two sentences disagree, and matching on the label alone reaches the\nendpoint field: the run landed on `PJSIP endpoints` and focused `e_displayname`.\n\nThis is reported rather than resolved. Silently preferring the row whose context matches the\nrecord's prose would be a rule nobody argued for, and a reading that reported the substitution as a\nmatch would be worth less than no reading. The reading carries\n`expectedTargetAmbiguous: true` and both contexts, so the next pass can decide with the fact in\nfront of it.\n\n**Three routes focus nothing, and that is correct.** `changelog-viewer`,\n`offline-documentation-browser` and `status-hub` each activate a destination entry, which opens a\nscreen rather than revealing one control.\n\nThe dead end here is worth keeping, because it is the obvious classifier and it is wrong. This\napplication prints the literal context `Destination` beside a destination row -- but only when the\nscreen's title equals its label, which `buildPalette` decides. `Status hub`'s title is\n`Status hub sessions`, so its row reads as though it belonged to that screen, and a classifier\nreading the context string reports it as a *setting* that failed to focus anything. That is a\ndefect that does not exist, and the first version of this summary reported exactly one of them.\nReading the palette entry cannot make that mistake, so the classification lives in the checker,\nwhich has the entry, and the driver records only what it observed.\n\n**The reader has a cap, and two routes stood on it.** The shared collector takes at most 60\ncontrols from one overlay. It always has, as a bare literal, and it became worth naming when\n`tab` and `appearance` matched enough of this application's 883 palette entries to fill the list\nexactly. A reading of exactly 60 looks identical to a panel that happens to offer 60. The cap is\n`PANEL_CONTROL_CAP` now, the collector counts the controls before it cuts, and a reading standing\non the cap carries `controlListTruncated: true` beside the real number.\n\n## Where the artifact came from\n\nThe executable driven here was built from `f20a66f7388979d627203fd913c153d8f8d4a001`, while the\nharness ran from `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd`. Those are different commits and the\nreading says so in two separate fields rather than one that quietly means whichever the reader\nassumes.\n\n**It says so because the previous reading's did not.** `command-palette-reading.json` carries a\nfield called `commit`, documented in the driver as \"the commit the ARTIFACT was built from\" and\nproduced by `git rev-parse HEAD`, which is the commit the *driver* ran from. Those coincided in\nthat run, so nothing was wrong and nothing said the two were different things. Here they came\napart, and the field would have said something false. It is now `harnessCommit`, and the artifact's\ncommit is a separate field that is not taken on trust: this run drove the same executable as that\none, the two records must therefore name the same digest, and the checker refuses the reading if\nthey do not. The provenance is a chain between two committed files rather than a sentence.\n\n`appSourcesChangedSince` lists what moved in `console/app`, `console/shared` and\n`console/package.json` between those two commits, and the checker re-derives that list with git\nrather than believing it. Where a clone does not hold both commits it says so in its own output\ninstead of passing silently on an unverified list.\n\n## Capture method\n\nThe packaged executable was started on a named off-screen Windows desktop by\n[`scripts/launch-on-hidden-desktop.ps1`](../../scripts/launch-on-hidden-desktop.ps1), under a\n`--user-data-dir` created for the run and deleted with it, with a loopback debugging port. Nothing\ntouched the visible desktop, the cursor or the foreground window.\n\nThe driver connects through [`scripts/ui-drive/cdp.mjs`](../../scripts/ui-drive/cdp.mjs), which\nrefuses to return unless the endpoint offers **exactly one** page target -- not one acceptable\ntarget among several, which proves nothing. Both surfaces belonging to no flow are cleared before\nany reading: the onboarding wizard a fresh profile opens on, whose absence is then proved rather\nthan assumed, and the update banner, which arrives after its own background check and so cannot be\ndismissed once at startup. The banner comes back on its own as that check moves on, so every phase\nrecords its text verbatim rather than claiming a clear screen its own pictures contradict.\n\nEach route then presses Escape and proves the palette is down before sending its own chord, since a\nchord sent while the palette is already up would close it and the reading would be of a screen. The\nchord is a real `Input.dispatchKeyEvent` and the query a real `Input.insertText`; neither calls the\napplication's own handler, which would only prove that a function agrees with itself.\n\nTwo pictures per route, one with the palette up and filtered and one where activating landed, are\nwritten to `release/captures/ui-drive/palette-routes/` and their digests into the reading. Fifty\nfiles, and the checker re-hashes every one of them on each run.\n\nThe deliberate breaks were applied one at a time by\n[`scripts/negative-palette-routes.mjs`](../../scripts/negative-palette-routes.mjs), which refuses to\nreport a case whose edit did not actually land -- an unmatched replacement reports success and\nchanges nothing, and \"no effect\" then reads exactly like a passing guard. The five breaks to the\nharness itself were applied by hand to one file at a time, each with the same did-it-land check,\nand the two that stayed green are named below rather than quietly repaired.\n\n### The two guard breaks that stayed green\n\nBoth were written earlier in this same pass, which is the useful part: a guard is at its weakest\nimmediately after it is written, while its author still believes it.\n\n- **Commenting out the collector's own `operableControls` line left the whole suite green.** The\n  truncation flag would then read `null` forever and no reading could ever be told from a complete\n  one -- but every test handed `summarisePanel` a panel object of its own making rather than one the\n  collector built, so the consumer was well guarded and the producer was not guarded at all. That\n  is this repository's oldest recurring shape, arriving from the producer side again. The contract\n  now asserts the line itself, anchored to a whole line, because a needle for the bare property\n  name is satisfied by exactly the commented-out form that is how such a line usually dies.\n- **The assertion that the cut uses the named cap read the rendered template.** `PANEL_CANDIDATES_SOURCE`\n  is a template string, so `.slice(0, 60)` and `.slice(0, ${PANEL_CONTROL_CAP})` render to the same\n  characters and the assertion could not tell them apart -- a guard moving with the constant it\n  guards, which this harness's z-index check had already been once before. It reads the file source\n  now, where the interpolation is visible.\n\n## Verification boundary\n\n**No windows-console record was rewritten and no inventory row moved to `verified`.** The position\nis unchanged at 4 of 88. These readings live in their own file under `release/evidence/ui-drive/`,\ndeliberately apart from the per-feature records, for the same reason the first one does: they are\nevidence about routes, taken in one run, and merging them into records taken in a different run\nagainst a different build would describe a run that never happened.\n\n**Nothing here operates a setting.** Every route reveals and focuses a control and then leaves it\nalone, so nothing in this file says what any of these features *do*. That distinction is the whole\nsubject of [`operated-interaction-evidence.mjs`](../../scripts/operated-interaction-evidence.mjs),\nwhich refuses a `verified` row whose record operated nothing -- and these readings do not satisfy\nit, deliberately, because they were not taken to.\n\n**The application was not rebuilt for this run.** It is the executable the previous reading was\ntaken from, driven again; between its commit and this one the application's own sources moved by\ntwo generated bundle files and nothing else, which the checker re-derives rather than asserts.\n\n**Two of the twenty-five control lists are truncated**, and the controls past the cap were never\nread. The number beside each says what the panel actually held.\n\n**One route reached a control its record did not intend.** `app-display-name` is recorded as\nlanding on `PJSIP endpoints`, because that is what happened; whether the record, the palette or\nneither needs repairing is a decision this pass did not make.\n\n## Suggested articles\n\n- [What a panel actually offered, read rather than remembered](panel-observation.md) -- the harness\n  this run used, why the field had no producer, and the first reading ever taken with it.\n- [Design parity: the chrome bar](design-parity-chrome-bar.md) -- the other place in this project\n  where a measurement had to be separated from the equipment taking it.\n"
    },
    {
      "id": "evidence/panel-observation",
      "category": "evidence",
      "title": "What a panel actually offered, read rather than remembered",
      "headings": [
        {
          "title": "Two properties of this application that defeat the obvious reader",
          "id": "two-properties-of-this-application-that-defeat-the-obvious-reader"
        },
        {
          "title": "The dead end, kept where it can be seen",
          "id": "the-dead-end-kept-where-it-can-be-seen"
        },
        {
          "title": "How a panel is identified without a role",
          "id": "how-a-panel-is-identified-without-a-role"
        },
        {
          "title": "What the harness reports",
          "id": "what-the-harness-reports"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "palette-route-readings.md",
        "live-readings.md",
        "statuscell-text-pixels.md",
        "design-parity-material-audit.md"
      ],
      "body": "# What a panel actually offered, read rather than remembered\n\n`observedPanelControls` is a field in the built-interaction records under\n`release/evidence/windows-console/`. Twenty-six of the thirty-nine committed records carry it.\nTwenty-five of those recorded an empty list.\n\nThe field is not decorative. [`scripts/operated-interaction-evidence.mjs`](../../scripts/operated-interaction-evidence.mjs)\nreads it and refuses a `verified` inventory row whose record does not carry a non-empty one, on\nthe grounds that a row claiming proof must show the feature behaving rather than merely being\nphotographed. So the field is consumed.\n\nNothing in this repository ever produced it. A search of the whole tree finds\n`observedPanelControls` in the two guard scripts, in the records themselves, and in one contract\ntest, and in no script that writes one. The selector lived in an ad-hoc paste at a driving session\nand was never committed, so it could not be reviewed, could not be tested, and could not be fixed\nonce. Twenty-five empty readings are what that looks like from the outside — a field wired at one\nend and consumed at neither, arriving from the producer side for once.\n\nHarness: [`scripts/ui-drive/observe-panel.mjs`](../../scripts/ui-drive/observe-panel.mjs).\nContract: [`tests/scripts/panel-observation.test.mjs`](../../tests/scripts/panel-observation.test.mjs).\n\n## Two properties of this application that defeat the obvious reader\n\nBoth are measured off the compiled shell by the contract test rather than remembered here, so a\nchange to either fails the suite rather than quietly changing what the harness means.\n\n**This application used to declare almost no roles, and exactly one dialog role.** When this\nharness was designed, the compiled shell — effectively the whole console interface — contained zero\n`role` attributes and zero accessible-name attributes, and the only `dialog` role anywhere was the\ncommand palette's card in `App.tsx`. That is what forced the reader below to fall through to\n`textContent`.\n\n> **Corrected again on 2026-08-27.** The sentence above was left in the present tense after\n> accessibility work landed, so this article went on saying \"zero\" while\n> [`tests/scripts/panel-observation.test.mjs`](../../tests/scripts/panel-observation.test.mjs)\n> pinned **33** declared roles, **28** accessible-name attributes and **15** dialog roles in the\n> same file. The counts live in the test, measured off the shell on every run; this article keeps\n> the reasoning and no longer keeps a copy of the numbers, because a second copy is a second thing\n> to go stale. What has *not* changed is the consequence: the fall-through to `textContent` is now\n> a choice nobody has revisited rather than a necessity.\n\n> **Corrected on 2026-08-26.** This section used to say that *no* element anywhere carried the\n> dialog role, so a selector for it \"matches nothing under any state\" and a count of it \"can only\n> ever be zero\". That was false the whole time it was written down, and false about the one surface\n> it mattered most for: all twenty-five of the empty records were driven through the palette. The\n> test guarding the claim could not see it. Its needle was the JSX spelling `role=\"dialog\"`, and\n> this renderer is hyperscript, which writes `role: 'dialog'` — so it reported absence and had\n> never once looked. Measured on a tree deliberately carrying the role in **two** places, the old\n> needle still came back with an empty list.\n>\n> The number now comes from the packaged application rather than from a reading of the source.\n> [`release/evidence/ui-drive/command-palette-reading.json`](../../release/evidence/ui-drive/command-palette-reading.json)\n> records `dialogRoleElements` as **0** before the chord, **1** while the palette is up, and **0**\n> again once a result is activated.\n\n`drive.mjs` counted elements carrying the dialog role as its `dialogs` reading, recorded it either\nside of every click, and used it in the flag that decides whether a click changed anything. With\none surface in a dozen declaring the role, that reading moved for the command palette and stayed at\nzero for the wizard, the info sheet, context menus, the appearance drawer, the lock and unlock\nsheets, the confirmation gate, the colour picker and the regex builder — so the \"did this click\nopen something\" test was blind to almost every outcome it needed to see. `gallery.mjs` printed\n`(a dialog was still open)` beside a screenshot on the same reading.\n\n**The z-index scan stays, and the reason is now stated rather than assumed.** One element in one\nstate is not a reader: a driver choosing panels by the dialog role would be right about the palette\nand blind everywhere else. The contract test therefore keeps the ban on that selector for every\ndriver that *chooses* a panel, and names the single script allowed to *count* it.\n\n**Icon ligatures put their own name in the DOM, before the label.** The shell renders 175\n`<span class=\"msym\">` Material Symbols spans, and an icon-bearing control emits its icon span\nfirst. So `textContent` on the regex builder's first tool button reads `backspaceDelete last`, not\n`Delete last`. Every control name `drive.mjs` recorded carried its glyph name glued to the front,\nand any comparison against a name a person had written could never match.\n\n## The dead end, kept where it can be seen\n\n`gallery.mjs` stripped the ligature with the prefix pattern `/^[a-z_]+(?=[A-Z])/`. It is the\nobvious fix, it handles `backspaceDelete last` correctly, and it is wrong: it needs a capital\nimmediately after the glyph name, so it silently strips nothing from any label that begins\nlowercase. The regex builder's own flag chips render as `checki · ignore case` when the flag is\non — and the default state has one flag on, so this is the ordinary case rather than a corner.\n\n`stripLigaturePrefix` in the harness keeps that behaviour, exported and tested, with an assertion\npinning the lowercase failure, so nobody reaches for it again. The browser side does not use it.\nIt removes the icon elements from a clone and reads what is left, which is exact and cannot\nmis-fire on a lowercase label — and reading a clone leaves the live application untouched, which\nmatters when the thing being measured is its state.\n\n## How a panel is identified without a role\n\nBy stacking order, which this application is unusually disciplined about. Every literal `z-index`\nin the shell is either at most 6 — rails, sticky headers, ordinary page chrome — or at least 55:\nthe setup wizard, the info sheet, the command palette, context menus and their submenus, the\nappearance drawer, the lock and unlock sheets, the confirmation gate, the tab filter, the colour\npicker, and the regex builder at 96 and 97. There is nothing in between.\n\nSo `OVERLAY_Z_FLOOR` is 55, and an overlay is a positioned element at or above it. Among those,\nthe panel is the highest one that actually holds something operable — a scrim is the sibling one\nlevel below with nothing inside it — and where two share a level the smaller wins, because a\nfull-viewport flex container that centres a card reports the same level as the card and the card\nis the panel.\n\n**One surface does not have that shape, and the first real reading is of exactly that surface.**\nThe command palette's scrim *wraps* its card rather than sitting beside it, and `.palette-card`\ndeclares neither `position` nor `z-index`, so the card is never a candidate and the scrim is what\ngets chosen. The controls found are still the card's, because they are inside it — but the\nrectangle reported is the whole viewport, `coversViewport` is true, and a palette can therefore\nnever read as anchored to anything. All three are true of the reading and all three are in it. The\ncontract test reads both rules out of `styles.css` on every run, so a card that gains a position or\na scrim that loses one fails the suite instead of quietly changing what a reading means.\n\nThe one interpolated `z-index` in the shell is the dialplan canvas, which is `94` when fullscreen\nand the keyword `auto` otherwise. The keyword parses to `NaN` and is rejected; the number is a\ngenuine overlay and is correctly treated as one.\n\n## What the harness reports\n\n`observedPanelControls` is a list of strings, because that is the shape the guard checks. The\nfuller readings travel beside it in `panelControlReadings`, each naming how the label was arrived\nat: an accessible name where one exists, then the text with the icons removed, then the `title`\nthis application sets on its icon-only controls.\n\n**The ligature hazard has a second shape, and only a real reading found it.** The first run came\nback with a palette row named `languageHardware trunks · Signalling & routing`. `textContent` puts\nnothing between adjacent element children, and a palette row is two top-level spans — its label and\nthe context it sits in. The reading was not missing; it was two different fields glued into one\nword, which reads as a broken label and can never match a name a person wrote down. The browser\nside now hands the top-level runs back separately and `readControlLabel` joins them with a space,\nin Node, where it is a pure function with a test. Top-level only: descending further would start\nputting spaces inside words a component split across spans for styling.\n\nA control that has none of those is reported with `source: \"icon\"` and is deliberately kept **out**\nof `observedPanelControls`. A glyph name is a finding — this control has no name a person can read\n— not a control label, and letting it into the list would let a panel of unlabelled icons satisfy\na guard that exists to show a panel was operable.\n\nA screen with no panel open records `panelFound: false` and the reason, never an empty control\nlist. Those two are the readings that look identical in a record and mean opposite things, and\ntelling them apart is most of the point: an empty list beside `panelFound: true` is exactly the\nshape of the twenty-five records this work exists to stop being written again.\n\nWhere a caller supplies the control the panel was opened from, the record carries both rectangles\nand the measured gap between them beside `anchoredToOriginatingField`, so the flag can be argued\nwith rather than merely believed. It is a geometric reading: a panel the application positions by\npercentage, or one the user has dragged, will legitimately read false, and a panel covering the\nviewport can never read true.\n\n## Capture records\n\nThe first table is the tree-read evidence the design rests on. The second is the first reading\never taken with this harness from a running build, added on 2026-08-26 — the section directly\nbelow it says what that reading did and did not settle.\n\n| State | Record | Read at commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Producers of `observedPanelControls` anywhere in the tree | tree-wide search for the field name | `56ca283dccfae7b9226d17950193266482605f00` | whole repository | two guard scripts, 26 evidence records, one contract test, and **no script that writes one** |\n| Committed records carrying the field | `release/evidence/windows-console/*.json` | `56ca283dccfae7b9226d17950193266482605f00` | 39 records | 26 carry it; 25 of those recorded an empty list |\n| Role attributes in the compiled shell | `app/renderer/src/generated/console.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | zero roles, zero accessible-name attributes |\n| Roles anywhere in the renderer, JSX spelling only | `app/renderer/src/**/*.{ts,tsx}` | `56ca283dccfae7b9226d17950193266482605f00` | whole renderer | four: two `alert`, two `status`. **This is the reading that produced the \"no dialog role at all\" claim, and it is a partial count** — it can only see `role=\"…\"`, and this renderer is mostly hyperscript |\n| Roles anywhere in the renderer, both spellings | `app/renderer/src/**/*.{ts,tsx}` | `f20a66f7388979d627203fd913c153d8f8d4a001` | whole renderer | eleven: the four above plus `button`×2, `option`, `listbox`, `complementary`, `status`, and **one `dialog`** on the command palette's card |\n| Accessible names outside the shell | `app/renderer/src/**/*.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | whole renderer | six, which is why the reader still prefers one where it exists |\n| Icon ligature spans in the shell | `className: \"msym\"` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | 175, emitted before the label on every icon-bearing control |\n| Literal stacking levels in the shell | `z-index:` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 22 distinct values | page chrome tops out at 6, overlays start at 55, nothing between |\n| The one interpolated stacking level | `canvasZ:s.fullscreen ? 94 : 'auto'` | `56ca283dccfae7b9226d17950193266482605f00` | 1 site | `94` is a real overlay; `auto` parses to `NaN` and is rejected |\n| Deliberate breaks, applied one at a time | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | 19 red on the first attempt; **2 stayed green** and are described below |\n| The same 21 breaks after both guards were repaired | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | all 21 red one at a time, all 21 green on restore |\n| The whole suite with the harness wired in | `npm test` | `56ca283dccfae7b9226d17950193266482605f00` | 3,713 assertions | 3,713 passed, 0 failed |\n\n### The first reading taken from a running build\n\nTaken by [`scripts/ui-drive/palette-reading.mjs`](../../scripts/ui-drive/palette-reading.mjs)\nagainst the packaged executable built from `f20a66f7388979d627203fd913c153d8f8d4a001`, launched on\nan off-screen Windows desktop under a throwaway profile, driven over loopback Chrome DevTools\nProtocol with exactly one page target proved before anything was evaluated. The query typed is\n`language`, which is the exact query `language-modes.json` records — so this is a reading of one\nof the twenty-five routes, not a convenient example.\n\nEvery row below is the same five-column shape as the table above, so each one names the commit the\nartifact it was read from was built at.\n\n| State | Record | Read at commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Elements carrying the dialog role, packaged build | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 3 phases of one route | **0** before the chord, **1** while the palette is up, **0** after a result is activated |\n| Controls the reader returned | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | same 3 phases | `panelFound` false / **true** / false; `observedPanelControls` 0 / **11** / 0 entries |\n| The panel the z-index scan chose | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 candidate considered | `.palette-scrim`, z-index 1000, 1440×922, 1 input — the scrim, never the card |\n| The chord, sent as a real key event | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 press | the palette opened; `.palette-card` present where it had not been |\n| What the palette searched | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 883 entries | its own hint read `10 of 883`, so 10 matched a real query rather than a list rendering unfiltered |\n| Where activating a result landed | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 activation | heading `Hardware trunks (DAHDI)`, `focusedControlId` `da_language` — the exact control, focused |\n| The two captures | `release/captures/ui-drive/palette-open-filtered.png`, `palette-after-activation.png` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 2 states | both hash to what the record wrote down; both carry the update banner, which the record records rather than claims away |\n\nFour notes on the rows above, each about a sentence that had never been checked before this run:\n\n- **`Ctrl+Shift+F` reaches the handler in the packaged build.** It was sent as a real key event\n  through the input domain, never by calling the application's own toggle, which would only prove\n  that a function agrees with itself. Every one of the twenty-five records says the chord was used.\n- **The query was typed, not assigned.** `Input.insertText` rather than setting `.value`: the field\n  is a controlled React input reading `event.target.value`, and an assignment sets the property\n  without producing the event, so the component would never have seen it and the list would never\n  have filtered — a distinction that would have looked identical in the finished screenshot.\n- **Teleporting is not landing nearby.** Landing on the right screen and leaving somebody to hunt\n  for the row is the failure `focusedControlId` distinguishes, and it is a reading no screenshot\n  states outright.\n- **The update banner was up, and the record says so.** `Later` is clicked before any reading is\n  taken, and the banner returns on its own once the background check moves to downloading, so both\n  captures carry `Downloading update (0.1.264)…` in a strip above the title bar. It covers no part\n  of the palette. It is recorded as `updateBanner` rather than dismissed in prose, because a record\n  claiming a clear screen while its own picture shows a banner is describing a different picture.\n\n## Capture method\n\nNone of the readings above came from a running program, and none of them needed to: every one is\na property of the committed tree, read from the tree, and re-read by the contract test on every\nrun so it cannot go stale silently. The counts in the table were taken by search; the assertions\nin `tests/scripts/panel-observation.test.mjs` re-derive each of them from the same files and fail\nif they move.\n\nThe deliberate breaks were applied one at a time by a scratch script that refused to proceed when\nits edit did not actually land — an unmatched replacement reports success and changes nothing,\nand \"no effect\" then reads exactly like a passing guard. Each break was applied, the suite run,\nthe file restored byte for byte, and the suite run again to confirm green before the next break\nwas applied. Nineteen assertions in this file, run inside `npm test` through `test:scripts`.\n\n## Verification boundary\n\n**The harness has now observed one real panel, and one only.** The reading above is of the command\npalette, on one route, on one screen, from one build. It settles the two things it was taken to\nsettle — that the reader returns real controls when a panel is genuinely up, and that a reading\ntaken *after* a palette result is activated has no panel in it at all — and it settles nothing\nabout the other twenty-four routes.\n\n**Nothing in the 39 committed `release/evidence/windows-console/` records changed, and no inventory\nrow moved to `verified`.** The position is unchanged at 4 of 88. This reading lives in its own file\nunder `release/evidence/ui-drive/`, deliberately apart from the per-feature records, because it is\nevidence about the harness rather than evidence about a feature.\n\n**What it does close is the reason those twenty-five lists were empty**, and the answer is not the\none the previous pass expected. A missing selector was half of it. The other half is that all\ntwenty-five readings were taken at the wrong moment: activating a palette result closes the palette\nbefore it teleports, so there was no panel to read. `observedPanelControls: []` beside no\n`panelFound` field is exactly what that looks like. The repaired reader records `panelFound: false`\nwith `whyNoPanel` at that moment instead, which is the same fact stated so it cannot be mistaken for\na panel that offered nothing.\n\nSo the next pass drives the remaining twenty-four routes knowing where the reading has to be taken:\nwith the palette up, and again once whatever the result teleports to has opened — not once, after\nthe click, when neither is true.\n\n> **Done, on 2026-08-26.** All twenty-five palette routes have been driven, at both of those\n> moments, and the readings are in\n> [`release/evidence/ui-drive/palette-route-readings.json`](../../release/evidence/ui-drive/palette-route-readings.json).\n> The field that recorded an empty list twenty-five times now holds **266 controls**, between 2 and\n> 60 per route. [`palette-route-readings.md`](palette-route-readings.md) is that run: what it\n> established, the three things it found, and what it still does not claim. This paragraph's\n> prediction held: every one of the twenty-five reported no panel after activation, which is what\n> the empty lists were a reading of.\n\nTwo of the twenty-one breaks were applied to guards written earlier in the same pass and **stayed\ngreen**, which is the part worth recording:\n\n- The z-index check asserted that the lowest overlay equalled `OVERLAY_Z_FLOOR`. That is true of\n  any floor landing on a real value, so moving the floor from 55 down to 6 — into the middle of\n  the page chrome — passed. A guard that moves with the constant it guards cannot catch the\n  constant being wrong. It now measures the empty band from the shell alone and requires the floor\n  to sit inside it.\n- The comment stripper that keeps a scan for forbidden code from being satisfied by prose\n  describing that code checked only that stripping made the file shorter — which dropping blank\n  lines alone achieves. Defeating the stripper entirely passed. It is now checked against a sample\n  containing a marker in three comment shapes and two lines of real code.\n\nThe generated shell must not be hand-edited, so the assertions about its own DOM were exercised by\npointing the scan at a renderer source that does declare roles, and the dialog-role scan by\ntemporarily giving a hand-written component that role. Both went red.\n\n**And the third failure of that kind, found on 2026-08-26 and worth more than either of the two\nabove, because it is the one a deliberate break did not catch.** The dialog-role scan *was* broken\non purpose and it *did* go red — and it stayed blind anyway. The break was written in the JSX\nspelling the needle expected, `role=\"dialog\"`, and applied to one of the four JSX components; the\npalette card is hyperscript and writes `role: 'dialog'`, which the needle cannot see. So the guard\nwas proved able to fail on the shape it was looking for, while remaining unable to fail on the\nshape the codebase actually uses.\n\nThat is the general lesson: **breaking a guard in the form its needle expects proves the needle\nfires, never that the needle is the right one.** Break it in the form the code is really written\nin. Re-measured here — on a tree deliberately carrying the dialog role in *two* places, one\nhyperscript and one already present, the old needle returned an empty carrier list; the replacement\nreturns both. The replacement reads every attribute spelling this codebase uses, asserts the exact\nset of files carrying the role and the exact count within `App.tsx`, and pins it to the palette\ncard. **Fourteen deliberate breaks, one at a time: all fourteen red, all fourteen green on\nrestore.** Five on the dialog-role assertions — the role removed; a second carrier file in the\nhyperscript spelling; a second role inside `App.tsx`; the card's anchoring class renamed; the role\npushed out of the card's attribute block — one on the prose-bundle exclusion, four on the\nstylesheet assertions, two on the label runs, and two on the driver allowance.\n\n**One of those fourteen exists because writing this correction caused the failure it now guards.**\nThe scan walks every `.ts`/`.tsx` under `app/renderer/src`, and `docs-bundle.ts` is every\ndocumentation article serialised as string data — so the paragraph above, quoting the attribute,\nbecame a second \"carrier\" the moment the bundle was regenerated, and the suite went red on prose\nabout a defect rather than on the defect. A sentence mentioning an attribute is not an element\ncarrying it. Both prose bundles are excluded by exact path rather than by a `generated/` rule, since\n`console.tsx` and `m3-control.tsx` live there too and are the markup the scan exists to read, and\neach exclusion asserts that its file still exists and still declares itself generated — an excuse\nfor a file that is not there any more is an excuse nobody can check, and a renamed bundle would\nrejoin the scan as a false carrier.\n\n## Suggested articles\n\n- [Every reading, run against a live Asterisk](live-readings.md) — the same discipline applied to\n  command output rather than to a rendered panel, and the two guards there that could not go red.\n- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — measuring a rendered\n  frame rather than reasoning about the stylesheet that produced it.\n- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place\n  a machine writes a verdict about the interface, and what constrains it.\n"
    },
    {
      "id": "evidence/site-registry-schema-v2",
      "category": "evidence",
      "title": "The site's half of the per-surface inventory could not be validated at all",
      "headings": [
        {
          "title": "What was actually wrong",
          "id": "what-was-actually-wrong"
        },
        {
          "title": "What this pass changed",
          "id": "what-this-pass-changed"
        },
        {
          "title": "The guard",
          "id": "the-guard"
        },
        {
          "title": "One further defect this exposed, in a neighbouring contract",
          "id": "one-further-defect-this-exposed-in-a-neighbouring-contract"
        },
        {
          "title": "What this does not claim",
          "id": "what-this-does-not-claim"
        },
        {
          "title": "The one attention row that was repairable",
          "id": "the-one-attention-row-that-was-repairable"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "hidden-red-groups.md",
        "panel-observation.md",
        "../platform/completeness-matrix.md"
      ],
      "body": "# The site's half of the per-surface inventory could not be validated at all\n\n`console/site/feature-registry.json` is one of the two feature registries the per-surface\ncompleteness inventory rests on. The desktop one, `console/app/feature-registry.json`, is\nschema v2. The site one was schema v1, and every reader in the tree had already moved.\n\nThat is not a stylistic difference. Four things were true at once, and each hid the others.\n\n## What was actually wrong\n\n**One: the validator refused the file outright, and stopped before everything behind it.**\n[`scripts/inventory-validation.mjs`](../../scripts/inventory-validation.mjs) line 124 opens with\n`if (data?.schemaVersion !== 2) throw`. The committed file said `1`. So\n`scripts/verify-inventories.mjs` — the whole `test:inventories` chain's first step — printed\n`FAIL: pages-site feature registry: schemaVersion 2 required` and returned. Every check after\nthat point had not run in a long time, and nothing said so.\n\n**Two: the status vocabulary was not the canonical one.** The canonical set is exactly\n`absent`, `partial`, `implemented-unverified`, `verified`. Twenty of the site's forty-four rows\ncarried `implemented`, which is not one of them. It reads as a stronger claim than\n`implemented-unverified` and is precisely the claim the evidence does not support: those\nfeatures are built, and no running browser has been driven over any of them.\n\n**Three: thirty-three site contract tests were comparing `undefined` against a real value.**\nThe registry keys its status as `state`; twenty-seven of the tests read `.status`, and the rest\nread `.status` off a nested row. Every one of them failed with `+ undefined - 'partial'`. They\nwere not badly written — they were written against schema v2, which is what the rest of the\ntree uses. Five *newer* tests had been written against the v1 shape instead\n(`row.state`, `row.files`), so the two halves of the same directory disagreed about the shape of\nthe same file.\n\n**Four, and worst: the generator that produces the file had gone six features stale.**\n[`scripts/generate-completeness-matrix.mjs`](../../scripts/generate-completeness-matrix.mjs)\nwrites both registries *and* the canonical matrix from hand-written tables inside it. Its\n`siteStatus` table still recorded `responsive-sizing`, `guided-forms`,\n`built-in-authenticator`, `context-menu-shortcuts`, `long-operation-progress` and\n`in-context-recovery` as `absent` — each of them days after its own pass had built the feature\nand written a note into the registry describing what it had built. Running the generator would\nhave reverted all six, and the six site surfaces of the canonical matrix already carried the\nstale values, because they come from the same table.\n\nThat last one is the shape worth naming: **a producer nobody re-runs is a producer nobody\nnotices going stale.** The registry was being maintained by hand, and the generator that claims\nto own it was drifting further away with every pass, invisibly, because the only way to see the\ndifference was to run it and read a three-thousand-line diff.\n\n## What this pass changed\n\n- `site/feature-registry.json` is schema v2, surface `pages-site`, and every row carries the\n  canonical status vocabulary. The honest position is unchanged in substance: **20\n  `implemented-unverified`, 11 `partial`, 13 `absent`** — the same twenty, eleven and thirteen\n  features the hand-maintained file recorded, with `implemented` renamed to the canonical\n  `implemented-unverified` that says the same thing about the code and one more thing about the\n  evidence. Every row's hand-written note is preserved verbatim.\n- The generator's `siteStatus` table is corrected for those six features, so the matrix's six\n  `site-*` surfaces and the registry now agree on all 264 rows.\n- The generator has a `--check` mode. It re-derives every artifact and compares, rather than\n  overwriting, so drift is a failing check instead of something you would have to go looking\n  for. It compares with line endings normalised, because this checkout is CRLF on disk and the\n  generator emits LF, and comparing raw bytes would fail on every Windows checkout for a reason\n  that has nothing to do with drift.\n- The generator takes `--root=<dir>`, so a guard can point it at a copy of the tree.\n- Five contract tests that had been written against the v1 shape are moved to v2.\n- Ten `scripts/negative-*-site.mjs` break anchors are re-targeted, because the registry's byte\n  shape moved under them. Every one was found by those scripts' own did-the-bytes-change check\n  reporting a `FAILED CASE` rather than letting a break that never landed read as a guard that\n  held. Two of the ten needed more than an indentation change: the three-file path list\n  `site/app.js`, `site/settings.html`, `site/styles.css` is no longer unique across the file, so\n  one anchor is now tied to the tail of its own row's note.\n\n## The guard\n\n[`tests/contracts/site-registry-matrix-parity.test.mjs`](../../tests/contracts/site-registry-matrix-parity.test.mjs)\nasserts all four of the things that were wrong, so none of them can come back alone: schema v2;\nthe canonical vocabulary, hand-written in the test rather than read out of the file it polices;\nno `state` or `files` key returning beside `status` and `implementation.paths`; and exact\nagreement between the registry and all six site surfaces of the canonical matrix. It also runs\nthe generator's `--check`.\n\n[`scripts/negative-site-registry-parity.mjs`](../../scripts/negative-site-registry-parity.mjs)\nplants nine breaks on disk, one at a time, and every one turns that guard red and green again on\nrestore. Unchaining the script from `test:inventories` was also broken on purpose, and\n`tests/scripts/test-suites-are-wired.test.mjs` named it.\n\n**Two of those nine stayed green on the first run, and both were this pass's own guard.**\nNeutering `--check` so it never reports drift, and making it find drift and pass anyway, both\nleft the guard green — because the guard read `--check`'s `PASS` line, and a check that cannot\nfail prints exactly the same `PASS` line. The repair is the `--root=<dir>` option: the guard now\ncopies the three artifacts into a scratch tree, changes one byte, and requires\n`--check --root=<copy>` to fail *and to name the file that drifted*. Both breaks turn it red\nnow. A check whose own failure path has never been exercised is decoration, and reading its\nsuccess line is not exercising it.\n\n## One further defect this exposed, in a neighbouring contract\n\nWith the site contract suite red, `scripts/negative-changelog-site.mjs` could never start: its\nfirst act is to confirm the untouched contract test is green, and it was not. So its fifty-one\nplanted breaks had not run. With the suite green, fifty of the fifty-one turn the changelog\ncontract red — and one did not.\n\nThe break computes the export's date range from the whole history rather than from the rows\nbeing exported, so a filtered export claims a range it does not cover. The assertion written for\nit narrowed to one real entry and compared that row's `exportedRange` against the entry's own\ndate. **Every release in the generated changelog bundle is dated `2026-08-26` — one distinct\ndate across the whole file** — so `changelogRangeLabel` collapses to its `first === last` branch\nand returns that single date, which is the exact string the narrowed row was being checked\nagainst. The assertion compared two strings that were equal whatever the code did.\n\nThe narrowed set is synthetic now, with two dates (`1999-01-02`, `1999-03-04`) that the test\nfirst asserts do not occur in the real history, so the expected label is unreachable unless the\nrange really is derived from the rows being exported. All fifty-one breaks turn it red now.\n\n## What this does not claim\n\nNothing here was driven in a browser, and no inventory row moved to `verified`. The position on\nthe 88-row inventory is unchanged: **4 of 88**. Twenty site features are `implemented-unverified`\nprecisely because the two artifacts that need a running program — a built-artifact interaction\nrecord and a capture — do not exist for any of them.\n\n**And `npm test` is still red on `master` for a reason this pass did not repair.** With the\nregistry failure out of the way, `scripts/verify-inventories.mjs` reaches its attention-modes\nwiring check, and that check fails. The cause is structural rather than local:\n`console/app/renderer/src/App.tsx` exists in two lineages in this history, one of about 2,600\nlines carrying the attention runtime instrumentation and one of about 9,200 lines carrying the\nPBX feature set, and the integration merges have flipped between them. The current file is the\n9,179-line one; `console/app/renderer/src/attention-inventory.ts` survives from the other, and\ndescribes seams — `onUserMutation`, twelve mutation-action tuples, exact producer line numbers —\nthat the current `App.tsx` has never contained. All four attention verifiers fail against it.\n\nOne row of that inventory *was* repairable and is repaired here, because its implementation\ngenuinely ships and its record was simply describing the wrong thing. See\n[the attention inventory note](#the-one-attention-row-that-was-repairable) below.\n\n## The one attention row that was repairable\n\n`ATTENTION_WIRING`'s `next-action` row claimed a design control `ctl('att_next','Current next\naction','text','')`, an `App.ATTENTION_CONTROLS` entry beside the five modes, an\n`onUserMutation` writer, and a consumer writing `Next action: ...` into an element's\n`textContent`. Eight of its ten markers matched nothing, and a search of the whole history shows\n`att_next` has never appeared in `design/Asterisk Console M3.dc.html` in any commit. The design\ndraws five attention controls, all switches.\n\nWhat actually ships is the attention rail's own text input, built in `attentionOverlay()` in\n`App.tsx`, bound to `nextAction(storage)` and `setNextAction(...)`, and exercised by\n`tests/ui/attention-modes-wired.test.tsx`. That is what the canonical requirement asks for — the\nchosen action visible where the work happens rather than parked on a settings page. The design's\ncontribution is the sentence under the `att_one` switch that states the requirement, and that\nsentence is the row's design marker.\n\n**The first attempt at this repair produced a row that was a copy of its neighbour, and only\nbreaking it found that out.** The obvious seams to name were the rail's rendering — the\n`attn-rail-next` div, `value: nextAction(storage)`, `setNextAction(storage, event.target.value)`\nand `showNextAction: modeEnabled(storage, 'oneThing')`. All four are already named by the\n`one-thing` row above, because they are what its switch turns on. Removing any of them one at a\ntime raised `one-thing`'s error, not `next-action`'s: the sixth row was watching nothing of its\nown, and every marker still occurred exactly once, so nothing about reading it would have shown\nthat. What the row names now is the value's own storage seam, which no other row touches: the\ncontrol that carries it, its durable key, its bounded writer and its `removeItem` branch, the\nsetter, the reader, and the `NEXT_ACTION_MAX_LENGTH` clamp that bounds what a hand-edited store\ncan put on screen.\n\nEach of the nine markers was then removed alone and the check's error read back: all nine name\n`next-action`, and the baseline error returns on every restore. The proof cannot use the whole\nfunction as a green/red oracle, because its last step is the mutation-action check that fails for\nthe lineage reason above — so it asserts *which* error is raised instead, which is a stronger\nstatement than red-versus-green anyway.\n\nThe other five rows of that inventory were already green and are untouched.\n\n## Capture records\n\n| Measurement | Value | Command | Source commit |\n| --- | --- | --- | --- |\n| Site registry schema | `1` before, `2` after | `node scripts/generate-completeness-matrix.mjs --check` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Site feature rows | 44 canonical rows | `node scripts/negative-site-registry-parity.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n| Matrix and registry status agreement | 264 site rows compared | `node --test tests/contracts/site-registry-matrix-parity.test.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |\n\n## Capture method\n\nThe measurements came from the committed generator, the site registry parity contract, and the\nreal-file negative regression. No browser session or packaged application was used for these\nrecords. The negative regression rewrites one real file at a time, runs the contract, restores the\noriginal bytes in a `finally` block, and verifies the restoration.\n\n## Verification boundary\n\nThese records prove the schema shape, generated-file agreement, and deliberate-break behavior at\nthe source level. They do not prove a running browser, a packaged desktop application, a screen\nreader, or a deployed Pages response.\n\n## Suggested articles\n\n[Hidden test groups](hidden-red-groups.md), [Panel observation](panel-observation.md), and\n[Completeness evidence](../platform/completeness-matrix.md).\n"
    },
    {
      "id": "evidence/statuscell-text-pixels",
      "category": "evidence",
      "title": "Where the mode picker's half pixel enters",
      "headings": [
        {
          "title": "The question changed under the item that asked it",
          "id": "the-question-changed-under-the-item-that-asked-it"
        },
        {
          "title": "Where the 555 pixels are",
          "id": "where-the-555-pixels-are"
        },
        {
          "title": "The cause",
          "id": "the-cause"
        },
        {
          "title": "And the offset is a consequence of that, not a second fault",
          "id": "and-the-offset-is-a-consequence-of-that-not-a-second-fault"
        },
        {
          "title": "The demonstration, and why it needs no browser to re-check",
          "id": "the-demonstration-and-why-it-needs-no-browser-to-re-check"
        },
        {
          "title": "Two hypotheses this falsified",
          "id": "two-hypotheses-this-falsified"
        },
        {
          "title": "What this does not claim",
          "id": "what-this-does-not-claim"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        },
        {
          "title": "Guards",
          "id": "guards"
        }
      ],
      "links": [
        "design-parity-chrome-bar.md",
        "design-parity-material-audit.md"
      ],
      "body": "# Where the mode picker's half pixel enters\n\nThe last measured divergence inside `statusCell`, traced to its cause.\n\n## The question changed under the item that asked it\n\nThe roadmap asked where a **half-pixel box offset** came from. On every one of the 32 audited\ndestinations the built side appeared to draw the Beginner/Expert picker's 1px border split across\ntwo rows, at `rgb(24,31,25)` and `rgb(40,52,45)`, where the design drew it crisp on one row at\n`rgb(65,73,66)`. Both sides reported a 40px top strip and a 28px picker, `(40 − 28) / 2` is an\ninteger, and so the offset appeared to have nowhere to come from.\n\n**That symptom is gone, and it never belonged to either artifact.** It was a property of comparing\ntwo browsers: the reference used to be photographed under headless Edge while the built side ran\nunder Electron. When both sides were retaken under one browser it disappeared, and the picker's\nborder rows are now byte-for-byte identical between the two captures.\n\nWhat survived is **555 differing pixels inside `statusCell`, the same count on all 32\ndestinations**, entirely in the text band. This article is about those.\n\n## Where the 555 pixels are\n\nThree column runs, and each one lands on exactly one piece of text:\n\n| Columns | Pixels | What it is |\n| --- | --- | --- |\n| 1088–1098 | 31 | the active button's Material Symbols `check` glyph |\n| 1106–1154 | 329 | the active button's `Beginner` label |\n| 1180–1214 | 195 | the inactive button's `Expert` label |\n\nEverything else in the cell is byte-for-byte identical: the confirmation-credits pill including its\nown Roboto digit and its `confirmation_number` glyph, the command-palette `search` glyph, all three\nwindow-control glyphs, and **every box edge**, including the picker's own 1px border and the\nboundary between its two halves.\n\n## The cause\n\n**The built application draws the inactive mode button one weight step heavier than the design\ndoes.**\n\nNothing in the markup says so. The button declares `font:inherit` and no weight of its own, on both\nsides. The weight arrives from somewhere else entirely: `App.tsx`'s appearance system writes its own\ndefault `font-weight` onto the shell root at startup,\n\n```\nweight: str('ap_weight', '500')            // currentAppearanceValues\nroot.style.setProperty('font-weight', weightVal)   // applyAppearanceToDom\n```\n\nso every element in the application that inherits its weight renders at 500. The design declares\nthe *same* 500 default for the *same* control, but feeds it only to the Appearance screen's own\npreview swatch; nothing writes it to the root.\n\n`Expert` is the only text in this cell that inherits its weight. The active button, the credits pill\nand every icon set their own, which is why they are all identical.\n\n## And the offset is a consequence of that, not a second fault\n\nMeasured on the real render, at the capture tuple's own metrics:\n\n| | as designed | with the appearance defaults | change |\n| --- | --- | --- | --- |\n| `Expert` label width | 34.171875 | 34.53125 | **+0.359375** |\n| picker left edge | 1072.09375 | 1071.734375 | **−0.359375** |\n| picker right edge | 1228.171875 | 1228.171875 | 0 |\n| `check` glyph left | 1086.09375 | 1085.734375 | **−0.359375** |\n| `Beginner` label left | 1106.09375 | 1105.734375 | **−0.359375** |\n| `Expert` label left | 1180 | 1179.640625 | **−0.359375** |\n| credits pill left | 1236.171875 | 1236.171875 | 0 |\n\nAt weight 500 the `Expert` label measures 0.359375px wider, so the picker measures 0.359375px wider.\nThe status group is packed against the right edge of the strip, so the picker's **right** edge is\npinned and its **left** edge moves, taking the check glyph and both labels with it. The credits\npill, which sits outside the picker, does not move at all. That is why its Roboto digit is identical\nwhile `Beginner`, which has the same family, the same size, the same weight and the same declared\ncolours, is not.\n\n**And this is why the offset looked like it had no source.** Every one of those rectangles still\nrounds to the same painted device pixel: 1072.09375 and 1071.734375 both paint at 1072, and the\ninternal boundary at 1167 and 1166.640625 both paint at 1167. Chromium snaps a painted box to whole\ndevice pixels and positions text at sub-pixel precision, so a sub-pixel layout difference is\ninvisible in the geometry and visible only in the glyphs. Reading the boxes could never have found\nthis.\n\nSo the half pixel is a third of a pixel, it is a font weight rather than a box offset, and it enters\nthrough a default nobody chose in the design.\n\n## The demonstration, and why it needs no browser to re-check\n\n`console/scripts/design-parity-statuscell-text.mjs --reproduce` renders the checked-in design as the\ntop-level document and photographs it twice: once as it stands, and once with the four declarations\n`applyAppearanceToDom` writes applied to its shell root. Both frames are committed under\n`console/release/captures/parity/statuscell-text/`.\n\n`--check` reads them back off disk and re-derives the whole claim:\n\n```\nstatusCell across 32 destination(s): 555 differing pixel(s)\nas-designed vs committed reference: 0\nappearance defaults applied vs committed built: 0\nappearance defaults applied vs committed reference: 555\n```\n\nThe design as it stands reproduces the committed **reference** capture exactly. The design with the\nappearance system's own defaults reproduces the committed **built** capture exactly. Both to zero\ndiffering pixels, from committed bytes, with nothing running.\n\n## Two hypotheses this falsified\n\nRecorded because they are the obvious ones and both are wrong, so nobody pays for them twice.\n\n**The capture harness's wrapper.** The reference is photographed through an `<iframe>` inside a\n`transform: scale(1)` wrapper and the built side is not, which is exactly the shape of thing that\nmoves text by fractions. Rendering the same design both ways in one session, one browser, one\nsitting: **zero** differing pixels in this cell. The wrapper contributes nothing.\n\n**The DOM shape.** The design's runtime wraps every interpolated value in a\n`<span class=\"sc-interp\">`; the compiled renderer emits a bare text node in the same flex container.\nReplacing the spans with text nodes changes no rectangle and no pixel.\n\n## What this does not claim\n\n- **Nothing is repaired.** The default is still 500 and the built application still renders every\n  inheriting weight one step heavier than the design draws it. Changing it would move type across\n  every screen and invalidate all 64 committed captures, which is a product decision rather than\n  a measurement, and it is not made here.\n- **This measures `statusCell`.** The same root declaration reaches every inheriting weight in the\n  frame, and `applyAppearanceToDom` writes three more declarations beside it: a colour, a family\n  and a size. How much of the divergence in the other seven areas they account for is not measured\n  here, and the guess that it is \"most of it\" is a guess.\n- **No destination moved to `verified`.** All 32 still report a real chrome divergence and the\n  Material Design 3 audit still reports all 32 nonconforming.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| The design as it stands, top-level document | `release/captures/parity/statuscell-text/dash-design-as-designed.png` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | one frame, 1440x1000 | identical to the committed reference capture inside `statusCell`, 0 differing pixels |\n| The design with the appearance system's defaults on its shell root | `release/captures/parity/statuscell-text/dash-design-with-appearance-defaults.png` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | one frame, 1440x1000 | identical to the committed built capture inside `statusCell`, 0 differing pixels |\n| Sub-pixel rectangles for both states | `release/evidence/parity/statuscell-text.json` at `measurements` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | 7 rectangles per state, plus computed weights | everything inside the picker moves left by 0.359375px; the credits pill does not move |\n| Localisation across the audited set | `release/evidence/parity/statuscell-text.json` at `columnRuns` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | 32 of 32 audited destinations | 555 differing pixels each, in the same three column runs |\n| The destination captures this was measured against | `release/captures/parity/{id}-reference.png` and `{id}-built.png` | `a2dd99c0fd28341fbdbd8f38e56a3fdada64fcfc` | 32 per side | not retaken here; they are the frames the axis-pin run took |\n\n## Capture method\n\nBoth reproduction frames come from one Electron window on an off-screen Windows desktop, driven\nover its own loopback debugging port, in one sitting, with the second frame taken from the same\npage as the first after four inline declarations were applied to its shell root. The design is\nserved by `console/scripts/design-parity-server.mjs` and loaded as the **top-level document**\nrather than through the capture harness's `index.html`, because rendering it both ways is what\nproved the harness's wrapper contributes nothing here.\n\nEvery outbound request is intercepted. The design's own helmet asks Google Fonts for the exact\nstylesheet `console/assets/fonts` was downloaded from; that request is answered from the local\ncopy with its URLs rewritten to the local faces, the capture server's own origin is allowed\nthrough, and everything else is refused and counted. The recorded run refused nothing, because\nnothing else was asked for: `{\"server\":17,\"font-stylesheet\":2,\"font-face\":0,\"blocked\":0}`.\n\nThe 32-destination localisation is not a capture at all. It is arithmetic over the reference and\nbuilt PNGs already committed, and it runs with no browser.\n\n## Verification boundary\n\n- **The frames are of the design, not of the application.** The claim is that the design plus one\n  root declaration reproduces the built capture, not that the built application was re-photographed.\n  It was not; the destination captures are the ones the axis-pin run took, at the commit named\n  above.\n- **Zero differing pixels is claimed for `statusCell` only.** Outside that rectangle the\n  appearance-defaults frame is the design with a colour, a family and a size changed on its root,\n  and it is not compared to anything.\n- **The cause is identified by reproduction and by reading the source, not by inspecting the\n  running application's computed styles.** `App.tsx`'s two lines are named and anchored so that a\n  repair makes this record fail rather than go quietly stale, but no measurement here was taken\n  from inside the built renderer.\n- **Nothing was repaired**, so this record describes a divergence that is still present.\n\n## Suggested articles\n\n- [The chrome-parity bar](design-parity-chrome-bar.md), which declares the `statusCell` rectangle\n  these 555 pixels are counted inside, and why the bar's tolerance is exactly zero.\n- [The Material Design 3 conformance audit](design-parity-material-audit.md), the second\n  prerequisite a design-parity row has to meet, which this finding does not move.\n\n## Guards\n\n`node scripts/design-parity-statuscell-text.mjs --check` and `node scripts/negative-statuscell-text.mjs`\nrun in `npm run test:inventories`; `tests/scripts/statuscell-text.test.mjs` runs in\n`npm run test:scripts`.\n\nThe negative regression plants eight lies one at a time against the real committed evidence: a\nwrong pixel count, wrong column runs, either frame swapped for the wrong capture, either artifact\ndeleted, and each of the two `App.tsx` anchors moved. Every one must turn the check red before the\nuntouched evidence turns it green. The two source anchors are deliberate: if somebody repairs\nthe default, this evidence becomes stale and says so instead of quietly describing a state that no\nlonger exists.\n"
    },
    {
      "id": "features/auth-lock-ui/authenticator",
      "category": "features",
      "title": "Built-in authenticator",
      "headings": [
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "toy-locks.md",
        "support-tickets.md",
        "unlock-ladder.md"
      ],
      "body": "# Built-in authenticator\n\nThe authenticator surface accepts an issuer, account, secret, algorithm, digit count, and period. It builds an `otpauth://totp/` pairing value locally, shows the manual value during pairing, and requires one current code before the vault-backed entry is armed.\n\nAfter confirmation the surface displays only redacted metadata and generated current and next codes. Code reads use the typed vault client, never log the secret, and fail to an honest unavailable state when the vault cannot answer. The countdown is text, and a clock-skew warning is shown when the offset exceeds one period.\n\nThe entry list supports issuer grouping, bounded plain-text or regular-expression search, and removal through the typed client. Ordinary JSON export labels secret material as omitted and contains no vault reference. Mutation history receives redacted subjects only, so history failure cannot turn into a secret leak.\n\n## Suggested articles\n\n- [Per-element toy locks](toy-locks.md)\n- [Support Tickets](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n"
    },
    {
      "id": "features/auth-lock-ui/README",
      "category": "features",
      "title": "Authenticator and local recovery surfaces",
      "headings": [],
      "links": [
        "authenticator.md",
        "toy-locks.md",
        "support-tickets.md",
        "unlock-ladder.md"
      ],
      "body": "# Authenticator and local recovery surfaces\n\nThis feature set adds mount-ready renderer surfaces for the local authenticator, per-element toy locks, Support Tickets, and the unlock ladder. The surfaces accept typed clients so the renderer never reaches storage, the credential vault, or the control plane directly.\n\nArticles:\n\n- [Built-in authenticator](authenticator.md)\n- [Per-element toy locks](toy-locks.md)\n- [Support Tickets](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n\nAll requests use a bounded deadline. Secret material is held only long enough for pairing or code calculation, is never rendered after pairing, and is omitted from ordinary exports. The Support Tickets disclosure is intentionally plain: tickets are local fiction, no request leaves the computer, and the folder-opening action never deletes data.\n"
    },
    {
      "id": "features/auth-lock-ui/support-tickets",
      "category": "features",
      "title": "Support Tickets",
      "headings": [
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "toy-locks.md",
        "authenticator.md",
        "unlock-ladder.md"
      ],
      "body": "# Support Tickets\n\nSupport Tickets are a local recovery desk, not a network service. Ticket records contain a category, description, severity, status, local identifier, and creation time. The surface states that nothing is sent, no remote ticket exists, and nobody is reading the description.\n\nThe resolution action requests that the platform file manager open the exact application-data path supplied by the typed client. It never deletes the folder and does not offer a hidden deletion route. If the platform cannot open the file manager, the surface reports that failure instead of claiming success.\n\n## Suggested articles\n\n- [Per-element toy locks](toy-locks.md)\n- [Built-in authenticator](authenticator.md)\n- [Unlock ladder](unlock-ladder.md)\n"
    },
    {
      "id": "features/auth-lock-ui/toy-locks",
      "category": "features",
      "title": "Per-element toy locks",
      "headings": [
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "authenticator.md",
        "support-tickets.md",
        "unlock-ladder.md"
      ],
      "body": "# Per-element toy locks\n\nThe lock manager treats every target identity as an independent, optional speed bump. A credential reference is created for that target, then the typed lock client stores only the reference and duration. Password and TOTP candidates are converted to short-lived bytes for verification and cleared from the surface after the request settles.\n\nDurations are surface-only, a bounded number of minutes, or until the application closes. The manager lists each lock, shows whether it is open, offers an explicit Lock again action, and keeps search local. It never describes the feature as encryption or access control.\n\nRecovery is self-service. The exact application-data path comes from the typed recovery record. Support Tickets can request that the platform file manager open the path, but the app never deletes it. The recovery record explicitly says that deletion is a user action.\n\n## Suggested articles\n\n- [Built-in authenticator](authenticator.md)\n- [Support Tickets](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n"
    },
    {
      "id": "features/auth-lock-ui/unlock-ladder",
      "category": "features",
      "title": "Unlock ladder",
      "headings": [
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "toy-locks.md",
        "support-tickets.md",
        "authenticator.md"
      ],
      "body": "# Unlock ladder\n\nThe unlock ladder is a server-graded wait-clearing surface. It requests a single-use nonce challenge, displays the current rung, and submits an answer through the typed client. A successful grade clears only the waiting period. It never creates a session, sets a cookie, signs a user in, or changes the ordinary attempt budget.\n\nThe ladder starts with a dish choice unless School mode is active, in which case the dish rung is absent and the sums rung is first. Five wrong dishes escalate to ten sums, one wrong sum escalates to the timed mole round, and a lost mole round leaves only the clock. The client owns the rolling budget, nonce consumption, expiry, and timing checks.\n\nEvery request has a deadline. The mole surface reports a numeric countdown and cannot submit before the round has elapsed. It records distinct visible-cell hits only, while the service remains responsible for grading.\n\n## Suggested articles\n\n- [Per-element toy locks](toy-locks.md)\n- [Support Tickets](support-tickets.md)\n- [Built-in authenticator](authenticator.md)\n"
    },
    {
      "id": "features/authenticator-core",
      "category": "features",
      "title": "Authenticator core",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/built-in-authenticator.md",
        "../platform/local-version-history.md",
        "../system/security.md"
      ],
      "body": "# Authenticator core\n\n## Behavior\n\nThe authenticator core provides local TOTP registration and code verification using RFC 6238 over RFC 4226. It accepts SHA-1, SHA-256, or SHA-512, six through eight digits, and a positive period up to 86,400 seconds. Pairing data follows the standard `otpauth://totp/` shape so a local QR renderer can present it without a network request.\n\nRegistration validates bounded RFC 4648 base32 input, writes the secret directly to the operating-system credential vault, and returns only redacted metadata. An entry remains unarmed until the user confirms one current code. The confirmation result never reveals or describes secret material.\n\n## Configuration\n\nThe control-plane store receives a `CredentialVault` adapter, a durable metadata store, and a stable unique entry-identity source. Both stores must fail explicitly when unavailable. There is no in-memory or plaintext fallback. Persisted metadata contains issuer, account, algorithm, digit count, period, stable entry identity, vault reference, armed state, and timestamps, but never the secret. Returned entries omit the vault reference as well.\n\n## Failure modes and security\n\nMalformed registration, unsupported algorithms, out-of-range digits or periods, invalid base32, missing entries, unavailable vaults, and failed confirmation all return bounded, actionable error codes. Vault errors are passed through without secret values. Deleting an entry removes the vault record first and only then removes its metadata.\n\n## Verification boundary\n\nThis lane was implemented without running tests, lint, type checks, builds, packaging, runtime interaction, or captures. RFC-vector verification and built-artifact wiring remain unverified until the owning lane runs its release checks.\n\n## Suggested articles\n\n[Built-in authenticator](../platform/built-in-authenticator.md), [Local version history](../platform/local-version-history.md), and [Security](../system/security.md).\n"
    },
    {
      "id": "features/navigation/tabs-search-palette-core",
      "category": "features",
      "title": "Tabs, searches, anchored regex builders, and the command palette",
      "headings": [
        {
          "title": "Browser-style tabs",
          "id": "browser-style-tabs"
        },
        {
          "title": "Four independent tab searches",
          "id": "four-independent-tab-searches"
        },
        {
          "title": "Anchored regex builders",
          "id": "anchored-regex-builders"
        },
        {
          "title": "Dropdowns and context menus",
          "id": "dropdowns-and-context-menus"
        },
        {
          "title": "Bulk-close previews",
          "id": "bulk-close-previews"
        },
        {
          "title": "Command palette",
          "id": "command-palette"
        },
        {
          "title": "Configuration and persistence",
          "id": "configuration-and-persistence"
        },
        {
          "title": "Integration seams",
          "id": "integration-seams"
        },
        {
          "title": "Failure modes and recovery",
          "id": "failure-modes-and-recovery"
        },
        {
          "title": "Security, privacy, and bounds",
          "id": "security-privacy-and-bounds"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../../platform/browser-style-tabs.md",
        "../../platform/tab-groups-and-searches.md",
        "../../platform/regex-builder.md",
        "../../platform/command-palette.md",
        "../../platform/bounded-overlays.md",
        "../../platform/bulk-actions.md",
        "../../platform/context-menu-shortcuts.md",
        "../../platform/local-version-history.md"
      ],
      "body": "# Tabs, searches, anchored regex builders, and the command palette\n\nThis article defines the navigation contract for tabs, tab discovery, local menu\nsearch, bulk tab actions, and the command palette. It is deliberately explicit\nabout ownership and state so that a search result always leads to the same place\nas the control it describes.\n\nThe current implementation supplies persistent state, reducers, bounded search\nevaluation, capability models, close previews, a command registry, a palette\nindex, and exact teleport instructions. Rendering, shortcut registration,\noverlay placement, local-history events, and central application wiring remain\nwith the owning renderer changes and are not claimed by this core lane.\n\n## Browser-style tabs\n\nThe model represents application destinations and settings sections as separate\nbrowser-style tabs.\nThe tab strip is a real `tablist`, and each destination is a `tab` connected to a\ncorresponding `tabpanel`. The strip docks to the left, right, top, or bottom edge\nof its surface. Left is the default. The selected edge, tab order, pinned order,\ngroups, group order, and collapsed state persist locally per surface.\n\nThe strip provides all of the following behaviors:\n\n- Reorder tabs with pointer and keyboard operations.\n- Pin and unpin tabs. Pinned tabs occupy a stable protected region and remain\n  visible when ordinary tabs overflow.\n- Create, name, rename, recolor, reorder, collapse, expand, and remove tab\n  groups. Moving a tab into a collapsed group does not expand that group.\n- Open an overflow surface when the strip cannot show every tab. Overflow is\n  scrollable and never silently clips a tab label.\n- Keep full accessible names when a narrow layout reduces the strip to icons or\n  an edge affordance.\n- Expose normal tab management from the context menu and expose `Edit tab\n  appearance...` in that same menu. Shift plus right-click opens the anchored\n  appearance editor directly when the platform supports the modifier.\n\nKeyboard navigation follows the strip orientation. A horizontal strip uses left\nand right arrows, while a vertical strip uses up and down arrows. Focus is always\nvisible, and the selected tab, its controls, and its panel expose their current\nstate to assistive technology.\n\n## Four independent tab searches\n\nThe state API defines four separate searches. They do not share query text,\nregular-expression mode, flags, validation state, or result focus.\n\n1. **Current strip search** searches the tabs in the active strip.\n2. **Group search** is available inside every tab group and searches that group's\n   tabs only.\n3. **Group-name search** searches visible group names and labels.\n4. **Master tab search** searches every open tab owned by the application, across\n   all windows, workspaces, strips, and groups.\n\nEvery result identifies its location: window or workspace, strip edge, group,\npinned state, and visible tab label. Activating a result reveals the result in a\ncollapsed group without changing that group's persisted collapsed preference.\nIt selects the target tab, returns focus to the target, and provides an obvious\nkeyboard path back to the originating search.\n\nPlain text is the default mode. Each search has its own adjacent builder button,\nand choosing regex mode is an explicit user action. An empty result is a named\nno-match state, not a blank list.\n\n## Anchored regex builders\n\nThe regex builder belongs to the search field that opened it. It is an anchored\npopover or inline panel, not a distant global dialog. The anchor remains clear\nwhen the viewport changes, and the panel is bounded by the viewport with an\ninternal scroll region when necessary.\n\nThe renderer contract for the builder includes:\n\n- Guided controls for literals, character classes, anchors, groups, alternation,\n  and quantifiers.\n- A raw pattern editor and the flags supported by the application's actual regex\n  engine.\n- Sample text, syntax feedback, live matches, and capture groups.\n- Copy and export actions that preserve the pattern and flags.\n- A visible indication of whether the field is in plain-text or regex mode.\n\nThe query, pattern, flags, validation result, and mode synchronize in both\ndirections. Switching back to plain text does not discard the user's pattern;\nswitching to regex restores it for that field. The builder states the engine\ndialect, escaping rules, input limits, and evaluation timeout. Patterns and\nsample text are evaluated locally. The core evaluator bounds pattern size,\ncandidate size, candidate count, match count, and elapsed work between\ncandidates, and rejects several high-risk pattern forms. A renderer that needs\nhard interruption of one native regular-expression operation must host the\nevaluator in its cancellable worker boundary.\nZero-width matches, Unicode, multiline input, invalid syntax, no matches, and\ncapture groups have explicit result states.\n\nThe same field-owned builder is required for every search surface described in\nthis article. It is also required beside each dropdown filter and context-menu\nfilter, including short menus.\n\n## Dropdowns and context menus\n\nEvery select, combobox, picker, autocomplete list, menu button, overflow menu,\nand right-click menu opens with a keyboard-accessible local filter field. The\nfield searches the visible items in that menu only. It has its own anchored regex\nbuilder and its own plain-text-first query state.\n\nFiltering never changes an item's action, reorders items to change their meaning,\nor removes an action from keyboard access without showing why. Arrow keys move\nthrough the filtered set, Enter activates, and Escape first clears the filter and\nthen closes the menu. Focus returns to the control that opened the menu. The\nfiltered count and an honest no-match message are announced to assistive\ntechnology.\n\n## Bulk-close previews\n\nEach tab strip and searchable tab list provides both **Close tabs containing\ntext** and **Close tabs not containing text**. Both actions use the visible tab\nlabel or title, never hidden page content. They share the exact same predicate,\nincluding case, Unicode, flags, and regex mode, so the inverse action is a true\nlogical inverse rather than a second implementation.\n\nBefore closing, the surface shows the entered query, match mode, exact number of\ntabs that would close, and a reviewable preview. Empty queries and invalid\npatterns cannot run. Pinned tabs are excluded by default, and an explicit\ninclude-pinned choice is part of the reviewed preview. Locked, non-closable, and\nunsaved-work tabs remain excluded. A partial result reports which tabs were\nclosed, skipped, cancelled, or refused.\n\nBulk actions are keyboard accessible and use the application's destructive-action\nconfirmation for irreversible closes. They record the result in local history\nwhen the application owns the affected tab state, and they remain cancellable\nwhile a long operation is in progress.\n\n## Command palette\n\nThe command registry is designed for the owning renderer to open the command\npalette with `Ctrl+Shift+F`. That is the global shortcut contract for the\nWindows desktop surface, and `Ctrl+K` is not a competing default. Shortcut\nwiring is outside this reducer-only lane.\n\nThe palette indexes every command, destination, feature article, setting,\nappearance control, nested tab, group, and documentation route. Its search is\nplain-text-first and has its own anchored full regex builder. Results retain\nkeyboard navigation, an accessible name, and enough context to distinguish two\nsimilarly named controls.\n\nPalette rows are rich controls where the target supports a live value. A setting\nrow can expose its real switch, checkbox, text field, stepper, slider, select, or\ncolor control inline. The row uses the same validation, persistence,\nlocalization, history, and accessibility behavior as the originating control.\nAn action row exposes its real action and target context rather than a decorative\nlabel.\n\nSelecting a result teleports to the exact target. The palette opens the owning\nsurface, selects the correct tab and group, reveals the target if it is inside a\ncollapsed group, scrolls it into view, focuses it, and briefly highlights it\nwithout changing unrelated state. A result for a locked target opens the target's\nunlock route. A result that cannot be reached reports the exact missing route or\nstate instead of silently opening a nearby page.\n\nThe palette offers a bounded card view and a full-window view. The selected size\npersists locally, and the palette itself remains searchable and keyboard\noperable in both sizes.\n\n## Configuration and persistence\n\nTab, group, search, menu-filter, bulk-close, and palette state is stored in a\nversioned local schema. Stable identifiers are used for surfaces, windows,\nstrips, groups, tabs, searches, and palette targets. Persisted state includes:\n\n- Tab and group order, pinned order, membership, edge docking, and collapsed\n  state.\n- The active query, regex mode, pattern, flags, and last validated state for each\n  independent search field, where retaining query state is enabled by the\n  surface.\n- Palette size, recent navigation context, and user-selected display options.\n\nThe schema currently accepts version 1 and rejects unsupported versions,\nmalformed values, oversized patterns, and invalid identifiers without partially\napplying the record. A future schema change must add an explicit deterministic\nmigration. Clearing local application data resets this state to the documented\ndefaults. Local-history recording is an integration responsibility of the\nsurface that dispatches settings, tab, group, bulk, or palette actions.\n\n## Integration seams\n\nThe navigation implementation exposes these seams to its owning renderer and\napplication shell:\n\n| Seam | Required contract |\n| --- | --- |\n| Tab registry | Stable tab, group, strip, window, and workspace identifiers plus visible labels and pinned state. |\n| Search adapter | A field-scoped query, pattern, flags, mode, validation result, bounded evaluator, and result location. |\n| Overlay anchor | The opening control, viewport bounds, focus return target, and collision-aware placement. |\n| Menu adapter | Visible menu items, action identity, keyboard shortcuts, disabled-state reason, and local filter scope. |\n| Bulk-close planner | The exact predicate, protected-item policy, preview rows, cancellation handle, and per-tab outcome. |\n| Palette index | Commands and destinations with stable target paths, rich-control descriptors, and teleport callbacks. |\n| Persistence adapter | Versioned records, load, save, reset, and visible write errors. Atomic storage and local-history events belong to the supplied storage integration. |\n\nAdapters must use stable target identity rather than display text. Display labels\ncan be renamed or localized, while a teleport callback must still reach the same\nelement. The renderer must not accept arbitrary executable actions, unbounded\npatterns, or caller-supplied paths through these seams.\n\n## Failure modes and recovery\n\nThe user receives an actionable, non-blocking notification for recoverable\nfailures. Examples include an unavailable search index, an invalid regex, a\nstale target identifier, a failed persistence write, an overflow surface that\ncannot be positioned, or a target that is currently locked. The message names\nwhat was attempted, what remains unchanged, and the next available action.\n\nThe implementation must fail closed in these cases:\n\n- An invalid or over-limit pattern produces no matches and cannot trigger a bulk\n  action.\n- A stale palette target does not fall back to a similarly named control.\n- A failed persistence write does not claim that tab or group state was saved.\n- A protected tab is never closed because a preview omitted its protection state.\n- A missing group or strip does not cause a result to teleport into another\n  window or workspace.\n- A timed-out multi-candidate evaluation stops adding results, marks the result\n  truncated, and reports the timeout. Hard interruption of one native regex\n  call requires the renderer's cancellable worker boundary.\n\nWhen a target disappears between indexing and activation, the palette keeps the\nuser's query, identifies the stale result, refreshes its index, and offers a\nretry. It does not invoke a guessed action.\n\n## Security, privacy, and bounds\n\nSearch, regex evaluation, tab metadata, and palette navigation run locally.\nPatterns, sample text, tab labels, group labels, and navigation history are not\nsent to a server or placed in telemetry. Exports and ordinary diagnostics omit\nprivate search contents and credentials. A palette result never serializes a\ncredential, secret, private file content, or hidden page data merely because the\ntarget is searchable.\n\nCore inputs are bounded by record size, entry count, identifier length, pattern\nlength, candidate length, match count, elapsed multi-candidate evaluation time,\nand result count. Regex evaluation must be isolated from the UI event loop by\nthe owning renderer when a hard per-operation deadline is required. Menu\nfilters inspect only their menu's visible items. Tab searches inspect only the\nmetadata declared by the tab registry. Bulk close inspects only visible labels\nand titles, never document contents or hidden fields.\n\n## Verification boundary\n\nDocumentation for this contract is complete when every surface names its own\ntab registry, four search fields, anchored builder, menu and dropdown filters,\nbulk-close preview, palette index, teleport target, persistence record, and\nfailure state. Implementation verification is separate. It must exercise the\nreal built desktop artifact, including keyboard navigation, focus return,\nvertical and horizontal strips, overflow, groups, protected tabs, invalid and\npathological regex input, menu filtering, both bulk-close actions, rich palette\nrows, exact teleport targets, stale targets, persistence across restart, and\nnarrow and high-scale layouts. A source-only assertion or mock overlay does not\nprove the built interaction.\n\nThis core change does not claim that those runtime, capture, or test checks were\nperformed. The assigned lane is limited to reusable reducers and adapters plus\nthis contract and its verification boundary.\n\n## Suggested articles\n\n- [Browser-style tabbed navigation](../../platform/browser-style-tabs.md)\n- [Tab groups and tab search](../../platform/tab-groups-and-searches.md)\n- [Regex builder](../../platform/regex-builder.md)\n- [Command palette](../../platform/command-palette.md)\n- [Bounded overlays](../../platform/bounded-overlays.md)\n- [Bulk actions](../../platform/bulk-actions.md)\n- [Context-menu shortcuts](../../platform/context-menu-shortcuts.md)\n- [Local version history](../../platform/local-version-history.md)\n"
    },
    {
      "id": "features/toy-lock-and-history-core",
      "category": "features",
      "title": "Toy lock, unlock ladder, and local-history core",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration and integration",
          "id": "configuration-and-integration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification state",
          "id": "verification-state"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "authenticator-core.md",
        "../platform/built-in-authenticator.md",
        "../platform/per-element-toy-locks.md",
        "../platform/unlock-ladder.md",
        "../platform/local-version-history.md"
      ],
      "body": "# Toy lock, unlock ladder, and local-history core\n\n## Behavior\n\nThe core models each toy lock as one stable element identity with one independent credential-vault\nreference and one unlock duration. A matching value may open only that element for the current\nsurface, a bounded number of minutes, or the current application session. Relocking removes the\ntemporary grant without changing the credential reference.\n\nThe unlock ladder is a privileged, server-graded state machine. A challenge response may clear the\ncurrent wait only. It never clears a credential, restores sign-in attempts, or grants\nauthentication. Challenges use single-use nonces, expire, consume a rolling-hour success budget,\nreject a mole round submitted before its duration, and count each visible mole spawn at most once.\nWhen School mode is active, a new lockout begins with arithmetic and does not expose a dish rung.\n\nLocal history stores one immutable encrypted entry file per revision in an isolated local Git\nrepository. Restore opens the selected encrypted snapshot in memory, reseals it, and appends a new\nrevision. It never checks old plaintext into the working tree and never rewrites an existing commit.\n\n## Configuration and integration\n\nThe toy-lock store requires two runtime adapters:\n\n1. A metadata persistence adapter that stores only stable lock records and vault references.\n2. An operating-system credential-vault adapter that owns verification and credential removal.\n\nThe unlock ladder requires a privileged clock, a bounded random source for challenge content, and a\ncryptographically strong unique nonce source. It also requires a durable privileged state store for\nlockout progression and rolling-hour success timestamps. If that store is unavailable, only the\nordinary clock remains. The public challenge model does not contain expected answers.\n\nThe history store requires an executor that explicitly allows the `git` executable and a snapshot\nprotector backed by a key reference in the operating-system credential vault. The currently mounted\ndispatcher provides neither. Calls therefore return an honest unavailable result until that wiring\nis added. There is no plaintext or memory-only fallback.\n\n## Failure modes\n\n- If lock metadata cannot be read or written, the store does not assume a lock state and reports the\n  persistence failure.\n- If the credential vault is unavailable, lock creation, verification, removal, and history\n  snapshot work remain unavailable. Existing metadata is not silently deleted.\n- If a history snapshot cannot be encrypted, no plaintext file is written and the live operation\n  may continue with a separate history warning.\n- If an encrypted revision cannot be opened, restore leaves the live record unchanged.\n- If Git is not allowlisted, local-history initialization reports that exact missing integration\n  instead of claiming a revision was recorded.\n- A lost toy-lock credential is recovered by opening the application-data folder and letting the\n  user delete it themselves. The recovery route never deletes data automatically.\n\n## Security and privacy\n\nCredential material is represented as short-lived bytes only at the vault boundary. The store\nzeroes verification input after use and persists only an opaque vault account reference. History\nentry files contain redacted metadata and authenticated encrypted snapshots. Plaintext snapshots,\ncredential values, QR payloads, and one-time codes are not written to Git, logs, exports, captures,\nor documentation.\n\nToy locks are personal speed bumps. They are not encryption and do not protect data from another\nperson with access to the computer.\n\n## Verification state\n\nThis ultra-speed implementation pass intentionally did not run tests, lint, type checks, builds,\npackaging, runtime interaction, or screen captures. The files are integration-ready foundations,\nnot evidence that the currently generated interface is connected to them. The mounted dispatcher\nstill needs a reviewed Git executor and snapshot protector, and the generated interface still needs\nreviewed actions that use these stores.\n\n## Suggested articles\n\n- [Authenticator core](authenticator-core.md)\n- [Built-in authenticator](../platform/built-in-authenticator.md)\n- [Per-element toy locks](../platform/per-element-toy-locks.md)\n- [Unlock ladder](../platform/unlock-ladder.md)\n- [Local version history](../platform/local-version-history.md)\n"
    },
    {
      "id": "installer-iso",
      "category": "installer-iso.md",
      "title": "The Ding PBX installer ISO",
      "headings": [
        {
          "title": "What it is",
          "id": "what-it-is"
        },
        {
          "title": "Architecture",
          "id": "architecture"
        },
        {
          "title": "What happens on the target machine",
          "id": "what-happens-on-the-target-machine"
        },
        {
          "title": "First-boot credential flow",
          "id": "first-boot-credential-flow"
        },
        {
          "title": "Requirements",
          "id": "requirements"
        },
        {
          "title": "How to boot and install it",
          "id": "how-to-boot-and-install-it"
        },
        {
          "title": "Verifying the download",
          "id": "verifying-the-download"
        },
        {
          "title": "Honest security posture",
          "id": "honest-security-posture"
        },
        {
          "title": "Building it in CI",
          "id": "building-it-in-ci"
        },
        {
          "title": "Verification state",
          "id": "verification-state"
        }
      ],
      "links": [],
      "body": "# The Ding PBX installer ISO\n\n## What it is\n\nA bootable, unattended-install ISO that turns a bare machine (or VM) into a working Ding PBX\nserver, the same way a FreePBX distro ISO does. Boot it, walk away, and when it reboots itself\nthere is a running Asterisk and a Material Asterisk admin surface reachable from a browser on the\nlocal network — with no default password of any kind.\n\nIt is built by `build-iso.bat` at the repository root (`console/scripts/build-iso.ps1`), following\nthe same reproducibility discipline as the WSL Asterisk bundle: a base image pinned by digest,\nAsterisk compiled from the exact repository commit, every download verified against a recorded\nSHA-256 before it is trusted, and a provenance record written beside the finished artifact.\n\n## Architecture\n\nThe build has three stages, each a separate Docker stage or image so a failure in one is easy to\nisolate:\n\n1. **`iso-payload.Dockerfile`** compiles Asterisk from source (the same recipe as\n   `asterisk-wsl-runtime.Dockerfile`), builds the Material Asterisk server (`npm ci && npm run\n   build` against `console/`), and downloads a portable Linux Node.js runtime verified by SHA-256.\n   These three pieces — Asterisk, the console server, and Node — are assembled into one payload\n   directory with an `install-target.sh` script and systemd units.\n2. **`iso-respin.Dockerfile`** downloads the official Ubuntu 24.04 LTS Server ISO, verified against\n   a pinned SHA-256 before anything touches it, extracts it, drops in the payload plus an\n   `autoinstall` (Subiquity cloud-init) answer file at `/server/`, points the bootloader at\n   `autoinstall ds=nocloud;s=/cdrom/server/`, and repacks a hybrid BIOS+UEFI-bootable ISO with\n   `xorriso`.\n3. **`build-iso.ps1`** orchestrates both stages from Windows (Docker's Linux engine does the actual\n   work, since Windows cannot compile the Linux payload or produce an ISO 9660 image natively),\n   exports and verifies the result, and writes `console/release/iso/ding-pbx-installer.iso.json`\n   with the source commit, base image and Node digests, and the finished ISO's own SHA-256.\n\n## What happens on the target machine\n\nBooting the ISO runs Ubuntu's ordinary Subiquity installer with no prompts: it partitions the\ndisk, installs the base OS, then autoinstall's `late-commands` step runs `install-target.sh`\n(inside the newly installed system, via `curtin in-target`), which:\n\n- installs the bundled Node.js runtime to `/usr/local/lib/ding-pbx-node`\n- installs the compiled Asterisk tree and enables `asterisk.service`\n- installs the Material Asterisk server under `/opt/ding-pbx-console` (reusing\n  `console/server/deploy/install.sh` unmodified) and enables `ding-pbx-console.service`, bound to\n  `0.0.0.0:8443` so it is reachable from the LAN rather than loopback-only\n- installs a first-boot banner unit that writes the machine's current LAN address into\n  `/etc/issue`, so whoever is at the console sees exactly where to point a browser\n\n## First-boot credential flow\n\n**No credential of any kind is written to the ISO.** The `identity.password` field in the\nautoinstall answer file is the locked sentinel `\"!\"`, which refuses interactive password login for\nthat local Unix account entirely — it exists only so the installer has an account to run under,\nnever as an administrative credential.\n\nThe actual admin account is created by the Material Asterisk server itself, the first time anyone\nvisits it: `console/server/auth.ts`'s `createAdminAccount` gates every other request behind the\nfirst-run setup screen until an account exists. Whoever reaches the printed LAN address first\ncreates the admin account. Because the service binds to the LAN rather than loopback by default so\nthat an operator can reach it at all, **the operative security boundary during the first-boot\nwindow is the network the machine is plugged into**, not a credential — treat that window (from\nfirst boot until an admin account is created) the way you would treat an unconfigured switch port:\nkeep the machine off an untrusted network, or firewall port 8443 to the operator's own address,\nuntil setup is done.\n\n## Requirements\n\n- A machine or VM with x86-64 hardware, at least 2 vCPU / 2 GiB RAM / 8 GiB disk for a minimal\n  install (Asterisk itself is light; size storage for call recordings and voicemail separately).\n- **Secure Boot must be disabled**, or a custom key enrolled for this ISO. Code signing is\n  permanently out of scope for this project (see the repository's no-signing policy) — the ISO is\n  genuinely unsigned, and a machine enforcing Secure Boot will refuse to boot it. This is stated by\n  the build script's own output and here, rather than left for someone to discover at a boot\n  prompt.\n- Network reachable by DHCP during install (the base OS and package list install from the\n  network unless a local mirror is configured; the Asterisk/Node/console payload itself needs no\n  network, since it is embedded on the ISO).\n\n## How to boot and install it\n\n1. Write `console/release/iso/ding-pbx-installer.iso` to a USB drive (`dd`, Rufus, or Ventoy) or\n   attach it as a VM CD-ROM.\n2. Boot from it. No prompts appear; the machine partitions its disk and installs unattended.\n3. On completion the machine reboots itself into the installed system.\n4. At the console login screen, read the printed address (`Console admin setup: http://<ip>:8443/`)\n   and open it from a browser on the same network.\n5. Create the admin account. From then on the console requires that account's credentials for\n   every request.\n\n## Verifying the download\n\n`console/release/iso/ding-pbx-installer.iso.json` records the exact source commit, the pinned base\nUbuntu ISO URL and SHA-256, the pinned Node.js runtime version and SHA-256, and the finished ISO's\nown SHA-256. Compare that last value against a locally computed digest of the downloaded file\nbefore writing it to a USB drive or booting it in a VM.\n\n## Honest security posture\n\n- The ISO itself is unsigned; Secure Boot refuses it.\n- No credential is embedded anywhere on the ISO or in its build.\n- The admin surface binds to the LAN by default during the first-boot window, before any account\n  exists — see **First-boot credential flow** above for the mitigation.\n- `late-commands`' package list (`packages:` in the autoinstall answer file) is installed from\n  whatever apt sources the target machine reaches at install time; only the Asterisk, Node.js, and\n  Material Asterisk payload itself is fully offline and reproducible from the ISO's own contents.\n- Building the ISO requires Docker with a working Linux engine; it cannot be produced on a bare\n  Windows host.\n\n## Building it in CI\n\n`.github/workflows/installer-iso.yml` builds this ISO reproducibly on a GitHub-hosted\n`ubuntu-24.04` runner (a Linux Docker engine is required to compile the Linux payload and produce\nan ISO 9660 image, which a Windows host cannot do natively -- Docker ships preinstalled on that\nrunner image, so no separate setup is needed). It runs on `workflow_dispatch`, and automatically\nwhenever a push to `master` touches `console/scripts/iso/**`, `console/scripts/build-iso.ps1`,\n`build-iso.bat`, or the workflow file itself.\n\nIt runs the same three stages as local `build-iso.bat`/`build-iso.ps1` (payload build, ISO respin,\nboot verification), then keeps the same \"not tests, not lint\" discipline as every other workflow in\nthis repository: no test job, no lint job, nothing gates the build. A run either builds, packages,\nand publishes evidence, or it fails outright on the build or verification step itself.\n\n### The 2 GiB release-asset problem\n\nA GitHub release asset is capped at 2 GiB (2,147,483,648 bytes) per file. The ISO this pipeline\nproduces is roughly 3.47 GiB (3,720,878,080 bytes measured against a real build), so it cannot be\nattached to a release as a single file.\n\nThe workflow solves this by splitting the verified ISO into 1900 MiB volumes (`split -b 1900MiB`,\nsafely under the cap) and publishing all of them as release assets, alongside:\n\n- `ding-pbx-installer.iso.sha256` -- the reassembled image's own SHA-256, for a one-line check.\n- `ding-pbx-installer.iso.json` -- full provenance (source commit, base ISO URL/digest, Node\n  runtime version/digest, console build base image digest, ISO byte count and SHA-256, part\n  count, and the same Secure Boot / no-signing statement as the local build).\n- `ding-pbx-installer.iso.REASSEMBLE.md` -- exact reassembly commands for Linux/macOS and Windows,\n  plus the SHA-256 of every individual volume and of the reassembled whole.\n\nTo reassemble and verify a downloaded release:\n\n```sh\ncat ding-pbx-installer.iso.part* > ding-pbx-installer.iso\nsha256sum -c ding-pbx-installer.iso.sha256\n```\n\nOn Windows PowerShell:\n\n```powershell\ncmd /c \"copy /b ding-pbx-installer.iso.part001+ding-pbx-installer.iso.part002+... ding-pbx-installer.iso\"\ncertutil -hashfile ding-pbx-installer.iso SHA256\n```\n\nCompare the resulting digest against the one recorded in `ding-pbx-installer.iso.sha256` and in\n`ding-pbx-installer.iso.json` before writing the ISO to a USB drive or booting it. **Do not boot an\nISO whose reassembled digest does not match.**\n\nThe workflow also uploads the complete, unsplit ISO as an ordinary GitHub Actions workflow\nartifact (a separate, larger size limit than a release asset), for convenience when the run is\nstill fresh -- but workflow artifacts expire (14 days here) and are not a durable distribution\nchannel, so the split release assets are the one to link to for anyone downloading later.\n\n### Boot verification in CI\n\nThe workflow re-checks, on the artifact it actually produced, the exact three properties the local\nbuild and `console/tests/iso/iso-build.test.mjs` already require of the respin recipe: both El\nTorito boot catalog entries present (`BIOS` and `UEFI`), and a real master boot record signature\n(`55aa`) at byte 510, plus the ISO 9660 primary volume descriptor signature (`CD001`) at byte\n32769. These are the properties that distinguish a genuinely bootable image from a valid-looking\nISO 9660 file that cannot boot -- see the long comment above the repack in\n`console/scripts/iso/iso-respin.Dockerfile` for the real incident that made these checks necessary.\n\n### Unsigned, same as the local build\n\nThis ISO is unsigned in CI exactly as it is locally -- code signing is permanently out of scope for\nthis project. The workflow states this in its own release notes and evidence rather than leaving it\nto be discovered at a Secure Boot prompt.\n\n## Verification state\n\nEverything in `console/tests/iso/*.test.mjs` (20 tests) is run without Docker or a real ISO: it\nstatically checks the autoinstall answer file for structural correctness and the absence of any\nembedded credential, checks that `build-iso.ps1` verifies its downloads and the finished artifact\nrather than trusting a green build log, and checks that no code-signing call exists anywhere in the\npipeline. Every one of those checks was proved meaningful by breaking the real file it guards,\nobserving the test go red, and restoring it.\n\n**A full ISO has been built.** 3,720,878,080 bytes, from the packaged Asterisk runtime whose digest\nwas checked against its own manifest first. Its structure was verified rather than assumed: one El\nTorito BIOS entry, one EFI entry, an ISO 9660 primary volume descriptor, and a real master boot\nrecord signature at byte 510. The base Ubuntu image and the Linux Node.js runtime are pinned to\ntheir published SHA-256 values, both verified against the sums their vendors publish, and every\ndownload fails closed rather than accepting a file that does not match.\n\n**Building it found a defect that no other check would have.** The first image produced was a valid\nISO 9660 with entirely correct contents that no machine would boot. The repack followed Ubuntu's own\npublished autoinstall recipe, which names `boot_hybrid.img` for the master boot record; Ubuntu\n24.04.4 does not ship that file. The hybrid repack failed, a fallback repack ran, and the build\nreported success. Every test in the suite passed on that image.\n\nThe fallback is gone — one that quietly drops the single property the artifact exists for is worse\nthan no fallback. The repack now asks the base image to describe its own boot arrangement through\n`xorriso -report_el_torito as_mkisofs` and uses that answer, reading the master boot record and the\nappended EFI partition back out of it by byte interval. That is what the vendor shipped rather than\na reconstruction of it, and it does not go stale when a point release moves a file.\n\n**Still not done: the image has not been booted.** Its structure says it can; only running it proves\nit does. That, and the fact that it is unsigned and Secure Boot will therefore refuse it, are the two\nthings to know before trusting it.\n\nIt was built under WSL rather than a container, because the container engine on the build host would\nnot start. The CI workflow builds it in a container on a Linux runner, which is the reproducible\npath; the local script remains the fallback.\n"
    },
    {
      "id": "media/codecs",
      "category": "media",
      "title": "Codecs & RTP",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/endpoints.md",
        "confbridge.md",
        "moh.md"
      ],
      "body": "# Codecs & RTP\n\n## Behavior\n\nTranscoding, packetisation and the media port range. Drag the codec list to change preference order globally. It is backed by `codecs.conf · rtp.conf`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Codec preference\n\nThe order Asterisk offers codecs in an SDP. Drag to reorder — there is no list to type.\n\n- **Global order** (`k_order`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`, `g729`.\n  - *What it is:* The order codecs are offered in an SDP.\n  - *Why it exists:* The far end picks the first one it also speaks, so order is preference.\n  - *Choosing a value:* opus for quality, g722 for wideband on desk phones, ulaw as the universal fallback, g729 only where bandwidth is scarce and you have licences.\n  - *Gotcha:* Putting a narrowband codec first means every call is narrowband, no matter what the phones support.\n- **Allow transcoding** (`k_transcode`) — a switch control, default `true`.\n- **Opus bitrate** (`k_opusbr`) — a slider control, default `24`.\n- **Preferred ptime** (`k_ptime`) — a segmented control, default `20`, choices `10`, `20`, `30`, `40`, `60`.\n\n### RTP\n\nWhere media lands and how it survives a bad network.\n\n- **RTP port range start** (`r_start`) — a slider control, default `10000`.\n  - *What it is:* The lowest UDP port Asterisk will use for media.\n  - *Why it exists:* Firewalls need to know the range to open.\n  - *Choosing a value:* 10000 to 20000 is the usual convention.\n  - *Gotcha:* Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.\n- **RTP port range end** (`r_end`) — a slider control, default `20000`.\n- **RFC2833 payload** (`r_dtmf`) — a stepper control, default `101`.\n- **strictrtp** (`r_strict`) — a switch control, default `true`.\n- **ICE support** (`r_ice`) — a switch control, default `false`.\n- **DTLS for WebRTC** (`r_dtls`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in codecs.conf · rtp.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Putting a narrowband codec first means every call is narrowband, no matter what the phones support. Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in codecs.conf · rtp.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Endpoints](../pbx/endpoints.md), [Conferences](confbridge.md), and [Music on hold](moh.md).\n"
    },
    {
      "id": "media/confbridge",
      "category": "media",
      "title": "ConfBridge rooms",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "moh.md",
        "codecs.md",
        "../pbx/canvas.md"
      ],
      "body": "# ConfBridge rooms\n\n## Behavior\n\nBridge profiles, user profiles and menus. Every mixing option is a control; the DTMF menu is edited on the canvas. It is backed by `confbridge.conf`. The rail badge on this destination currently reads `6`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Mixing\n\nAudio quality and how the bridge combines participants.\n\n- **Internal sample rate** (`c_rate`) — a segmented control, default `48000`, choices `8000`, `16000`, `48000`, `auto`.\n- **Mixing interval** (`c_mixing`) — a segmented control, default `20`, choices `10`, `20`, `40`, `80`.\n- **Video mode** (`c_video`) — a segmented control, default `follow_talker`, choices `none`, `follow_talker`, `last_marked`, `sfu`.\n- **Denoise** (`c_denoise`) — a switch control, default `true`.\n- **Jitter buffer** (`c_jitter`) — a switch control, default `true`.\n- **Talker detection events** (`c_talker`) — a switch control, default `true`.\n\n### Participants\n\nWhat each caller may do once inside.\n\n- **Maximum members** (`c_max`) — a stepper control, default `50`.\n- **Wait for marked user** (`c_marked`) — a switch control, default `true`.\n- **Announce join and leave** (`c_announce`) — a segmented control, default `name`, choices `off`, `tone`, `name`, `count`.\n- **Music while alone** (`c_music`) — a switch control, default `true`.\n- **DTMF menu** (`c_dtmf`) — a select control, default `default_menu`, choices `default_menu`, `admin_menu`, `listen_only`.\n\n## Failure modes and security\n\nEvery row reflects a real object in confbridge.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in confbridge.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Music on hold](moh.md), [Codecs & RTP](codecs.md), and [Dialplan canvas](../pbx/canvas.md).\n"
    },
    {
      "id": "media/moh",
      "category": "media",
      "title": "Music on hold",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "confbridge.md",
        "codecs.md",
        "voicemail.md"
      ],
      "body": "# Music on hold\n\n## Behavior\n\nHold classes and their sources. Files are chosen from a picker; the playlist is reordered by dragging. It is backed by `musiconhold.conf`. The rail badge on this destination currently reads `4`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Playback\n\nHow each class behaves while somebody waits.\n\n- **Mode** (`h_mode`) — a segmented control, default `files`, choices `files`, `quietmp3`, `ringing`, `custom`.\n- **Playback order** (`h_sort`) — a segmented control, default `random`, choices `alpha`, `random`, `randstart`.\n- **Announcement every** (`h_announce`) — a slider control, default `30`.\n- **Volume trim** (`h_volume`) — a slider control, default `0`.\n\n## Failure modes and security\n\nEvery row reflects a real object in musiconhold.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in musiconhold.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Conferences](confbridge.md), [Codecs & RTP](codecs.md), and [Voicemail](voicemail.md).\n"
    },
    {
      "id": "media/README",
      "category": "media",
      "title": "Media",
      "headings": [],
      "links": [
        "voicemail.md",
        "confbridge.md",
        "moh.md",
        "codecs.md"
      ],
      "body": "# Media\n\nMedia & voice: codecs, RTP, recordings, prompts and conferencing.\n\n- [Voicemail](voicemail.md)\n- [Conferences](confbridge.md)\n- [Music on hold](moh.md)\n- [Codecs & RTP](codecs.md)\n"
    },
    {
      "id": "media/voicemail",
      "category": "media",
      "title": "Voicemail boxes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/queues.md",
        "codecs.md",
        "../agent/secrets.md"
      ],
      "body": "# Voicemail boxes\n\n## Behavior\n\nMailboxes, greetings and delivery. Attachment and storage options are switches; nothing about a mailbox needs typing except the owner name. It is backed by `voicemail.conf`. The rail badge on this destination currently reads `18`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Delivery\n\nWhat happens the moment a message lands.\n\n- **Attach recording to email** (`v_attach`) — a switch control, default `true`.\n- **Delete after emailing** (`v_delete`) — a switch control, default `false`. Careful. On means the only copy of the message is the one in the mailbox of the email server.\n  - *What it is:* Whether the recording is deleted from the PBX once it has been emailed.\n  - *Why it exists:* Mailbox storage on a PBX is finite and messages accumulate forever.\n  - *Choosing a value:* Off keeps a copy on the PBX. On makes email the only copy.\n  - *Gotcha:* If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it.\n- **Message format** (`v_format`) — a segmented control, default `wav49`, choices `wav`, `wav49`, `gsm`, `ogg`.\n- **Maximum messages** (`v_maxmsg`) — a stepper control, default `100`.\n- **Maximum message length** (`v_maxsecs`) — a slider control, default `180`.\n  - *What it is:* The longest a single voicemail message may be.\n  - *Why it exists:* It bounds storage and stops accidental open-line recordings filling the disk.\n  - *Choosing a value:* 180 seconds is generous for business use.\n  - *Gotcha:* Callers are cut off mid-word with no warning tone unless you also configure one.\n- **Discard shorter than** (`v_minsecs`) — a slider control, default `3`.\n\n### Caller experience\n\nPrompts, review and escape routes.\n\n- **Let caller review** (`v_review`) — a switch control, default `true`.\n- **Zero escapes to operator** (`v_operator`) — a switch control, default `true`.\n- **Play date envelope** (`v_envelope`) — a switch control, default `true`.\n- **Announce caller ID** (`v_saycid`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery row reflects a real object in voicemail.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it. Callers are cut off mid-word with no warning tone unless you also configure one.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in voicemail.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Queues & agents](../pbx/queues.md), [Codecs & RTP](codecs.md), and [Secret intake](../agent/secrets.md).\n"
    },
    {
      "id": "operations/build-and-release",
      "category": "operations",
      "title": "Material Asterisk operations",
      "headings": [
        {
          "title": "Build and package",
          "id": "build-and-package"
        },
        {
          "title": "The bundled runtime payload",
          "id": "the-bundled-runtime-payload"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Driving the built application",
          "id": "driving-the-built-application"
        },
        {
          "title": "Release",
          "id": "release"
        },
        {
          "title": "Recovery",
          "id": "recovery"
        }
      ],
      "links": [],
      "body": "\n# Material Asterisk operations\n\nEvery route below was executed in this repository and produced the stated result. Where a\nroute failed, the failure is recorded too, because the failures here are the expensive part.\n\n## Build and package\n\n    build.bat /s              # renderer + main process, ~32s warm\n    build-installer.bat /s    # full Squirrel.Windows set, ~8m\n\n**Invoke by absolute path from automation.** `NoDefaultCurrentDirectoryInExePath` makes\n`cmd /c build.bat` fail with \"is not recognized\" even when the working directory is right\nand the file is plainly there. Use:\n\n    MSYS_NO_PATHCONV=1 cmd /c \"cd /d <repo> && <repo>\\build.bat /s\"\n\nBoth halves matter: without `MSYS_NO_PATHCONV`, the shell rewrites `/s` to a drive path and\nthe build goes interactive.\n\n**Nothing else may touch `node_modules` while these run.** `npm ci` deletes and recreates\nit, so a test run or a live Electron instance holding a file produces `npm ci exited -4048`\n— a file-in-use error that reads like a corrupt install. Stop every Electron process first\nand run the suite and the build one at a time. Two separate failures in one session came\nfrom ignoring this.\n\n## The bundled runtime payload\n\n`console/resources/asterisk-wsl-rootfs.tar` (~315 MB) and its `.json` are **gitignored**;\nthey never enter history. Packaging refuses to reuse a payload whose `sourceCommit` differs\nfrom the commit being released — correct behaviour, not a defect — so a release from a new\ncommit rebuilds it, which needs a working local container engine.\n\nIf the engine is down, packaging fails with *\"Docker is installed but its Linux engine is\nunavailable\"*. Start it without disturbing the visible desktop by launching Docker Desktop\non an off-screen desktop through the cheap headless route, then poll `docker info` until\n`OSType` reports `linux`.\n\n## Verification\n\n    cd console && npm test    # 8 sub-suites, ~3200 assertions\n\nRead the **exit code**, not just the failure count: several gates live outside the test\nrunner (inventory validation, generated-file freshness, negative regressions), so a run can\nreport zero failures and still exit 1. When it does, the cause is in the last twenty lines.\n\nA failure under load is not automatically a regression. Re-run the single file alone before\nconcluding anything — a renderer test failed once in a contended run and passed 28/28 in\nisolation. Equally, a test that fails at exactly the configured timeout timed out; it did\nnot assert anything false.\n\n### Committed generated files\n\nTwo generated files are committed rather than built on demand, and each has a drift check that\ncompares the committed copy against a fresh generation:\n\n| File | Generator | Scratch override | Drift check |\n| --- | --- | --- | --- |\n| `app/renderer/src/generated/*` (the design compile) | `scripts/compile-design.mjs` | `DING_DESIGN_OUT_DIR` | `tests/ui/design-drift.test.mjs` |\n| `app/renderer/src/generated/docs-bundle.ts` | `scripts/bundle-docs.mjs` | `DING_DOCS_OUT_FILE` | `tests/ui/docs-drift.test.mjs` |\n\nThe scratch override is what makes each check able to fail. A check that regenerates over the file\nit is about to read compares that file with itself, always passes, and leaves the working tree\ndirty for whoever runs the suite next. The docs bundle was checked that way and drifted by two\narticles across a merge — `npm run build` regenerates it, so no release was affected, but every\nreader of the checked-in tree saw a catalogue missing this very article.\n\nA merge is the likeliest way to drift one: an article arriving on one side and a bundle\nregenerated without it on the other produces no conflict to report. If a drift check fails, run its\ngenerator and commit the result — do not hand-edit generated output.\n\n## Driving the built application\n\n    node console/scripts/ui-drive/drive.mjs      <port> <output>            # every click, a capture each\n    node console/scripts/ui-drive/gallery.mjs    <port> <output>            # clean per-destination shots\n    node console/scripts/ui-drive/smoke.mjs      <port> [artifact]          # ship-readiness verdict\n    node console/scripts/ui-drive/a11y-probe.mjs <port> [dist/index.html]   # ARIA roles, landmarks, aria-label, tabindex, tags\n\n`a11y-probe.mjs` prints the same five counts the accessibility ROADMAP entry was measured\nwith, dismisses the onboarding wizard the same way `smoke.mjs` does, and refuses (rather\nthan reports) when the artifact is stale against its sources. It exits non-zero when any\ncount drops below a floor set a little under what a healthy build actually produces —\nnever the exact figure, because a guard pinned to the exact number breaks on the next\nunrelated content change and gets \"fixed\" by whoever hits it first. What it protects is\nthe baseline the accessibility work started from: 1 role, 0 landmarks, 0 aria-label, 0\ntabindex out of 426 elements, all of which sit below every floor.\n\nLaunch the application on an off-screen desktop with `--remote-debugging-port` and a\ntask-scoped `--user-data-dir`, then drive it over loopback. Refuse to evaluate anything\nuntil the target list holds **exactly one** page; that check is the isolation proof.\n\nFour traps, each measured here:\n\n- **A fresh profile opens on a setup wizard covering 94% of the viewport.** Clicks issued\n  through the document bypass hit-testing, so navigation works underneath it while every\n  capture photographs the wizard. 109 published images were lost to this. Dismiss it and\n  prove it is gone. Detect it by its own `Skip setup` control — **not** by looking for a\n  full-viewport element, because the application's content wrapper legitimately fills the\n  screen and that test refuses to drive a perfectly healthy app.\n- **Never pass `awaitPromise: true` to `Runtime.evaluate`.** It hangs on this Node even for\n  synchronous expressions.\n- **Write evaluated expressions with no backslashes.** One arrived mangled and silently\n  deleted every letter `s` from the results, with no error at all.\n- **Every navigable control carries an icon ligature glued to its label** — the text reads\n  `smartphoneEndpoints`, not `Endpoints`. Matching whole text finds nothing, and finding\n  nothing is indistinguishable from a screen with no controls.\n\nA capture is not evidence until it is checked. Sampling for pure black catches an unpainted\nframe — this palette has none — but it cannot tell you the *right* screen was captured.\nRecord the visible heading beside each image, and open one before believing any of it.\n\n## Release\n\nEvery push to `master` publishes a uniquely tagged non-draft release with a ~446 MB\ninstaller, and redeploys the site. Verify by observation: non-draft, exact target commit,\nassets downloadable.\n\n**Code signing is permanently prohibited.** `Get-AuthenticodeSignature` on the setup\nexecutable must report `NotSigned`, and the notes must say so rather than implying\nauthenticity.\n\n## Recovery\n\n- Suite exits 1 with zero failures → read the last twenty lines; a non-runner gate failed.\n- A generated file reports stale with no visible diff → line endings. Regenerate, and pin\n  the file `eol=lf` so it stops recurring.\n- A pinned count moved → re-derive it from the code and explain the delta. Never add two\n  lanes' deltas together and never force a number.\n- A negative regression goes green → its fixture may be asserting something that progress\n  made true. Force the condition instead of assuming it.\n"
    },
    {
      "id": "operations/README",
      "category": "operations",
      "title": "Operations",
      "headings": [],
      "links": [
        "build-and-release.md"
      ],
      "body": "# Operations\n\nHow this repository is built, packaged, driven, captured and released, and what to do when\none of those fails.\n\nDistinct from the rest of this documentation, which describes the product to somebody using\nit. This describes the repository to somebody working on it.\n\n- [Build and release](build-and-release.md) — the commands, and the failures worth knowing\n  about before meeting them. Mirrors the `ding-pbx-console-ops` operational skill.\n"
    },
    {
      "id": "pbx/canvas",
      "category": "pbx",
      "title": "Dialplan canvas",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What the graph is, and what it is not",
          "id": "what-the-graph-is-and-what-it-is-not"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "ivr.md",
        "queues.md",
        "endpoints.md"
      ],
      "body": "# Dialplan canvas\n\n## Behavior\n\nOne infinite canvas for the live dialplan, IVR and queue routing graph. Nodes and edges are parsed from the target's `dialplan show` output, and the layout can be moved locally for inspection. The inspector is read-only because this surface has no dialplan write path. The rail badge on this destination is empty until a live graph is read. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## What the graph is, and what it is not\n\n`dialplan show` reads what `pbx_config` has **loaded**. It never reads a file. The two agree\nonly until somebody edits `extensions.conf` without reloading, and nothing in the command's\nown output marks the difference — so this canvas can draw a dialplan that no file on the\ntarget describes, and look exactly like one the file describes to the letter.\n\nThe screen therefore says which it is, in the sentence under its heading, on every read:\n\n- **Diverged.** It names the contexts `extensions.conf` declares that Asterisk has not\n  loaded, and the contexts loaded from that file that the file no longer holds, and says\n  that a dialplan reload on the target is what closes the gap.\n- **In agreement.** It says so plainly, and how many contexts that covers.\n- **Not comparable.** It reports the target's own reason the file could not be read, rather\n  than staying silent and letting the drawing be read as the file.\n\nThree things are deliberately excluded from the comparison, each because including them\nwould report a defect that is not one:\n\n- **Contexts another module created.** `dialplan show` prints the registrar that created\n  each context, and only `pbx_config` loads `extensions.conf`. On one real target 21 of 49\n  loaded contexts belonged to `pbx_ael`, `res_parking` or `func_periodic_hook`. Those are\n  counted and named as somebody else's, never compared.\n- **Contexts an `#include`d file declares.** Each extension carries the basename of the file\n  that declared it, so a context whose extensions name another file is reported as an\n  include rather than as a divergence. The included file itself is not read.\n- **`[general]`, `[globals]` and templates.** `pbx_config` skips the first two, and a\n  `[name](!)` category is a template that Asterisk's own config browser never returns.\n\nOne limit is stated on the screen rather than hidden: a context that this file does not\ndeclare, that carries no extension at all, and that sits beside an `#include` directive\ncannot be attributed to any file from this output. It is named as unattributed, and it is\nnot counted as a divergence, because an included file this console did not read could\naccount for it.\n\n## Configuration\n\nThere is no settings form here. Adding, deleting, duplicating, or rewiring a node reports that the canvas is read-only rather than claiming a write occurred. An unread or unavailable target produces an empty canvas with the control-plane reason.\n\n## Failure modes and security\n\nA node that references a destination that no longer exists is omitted by the parser and the source reading reports the exact parse or target failure. Local layout changes never alter the target.\n\n`extensions.conf` is read as exact bytes inside the privileged process, because the parsing\nthis comparison needs — directives, templates, a header with a trailing comment — is beyond\nwhat the console's ordinary configuration reader keeps. That text never leaves the control\nplane: only the derived facts (context names, directive lines and counts) reach the screen.\n\nThe comparison also reports its own shortfall. `dialplan show` prints a context total for\nitself, and when that total and the number of context headers this reading could make out\ndisagree, the screen says so before it says anything else — a comparison drawn from a short\nreading is short in exactly the lists it prints, and an empty list must not be read as\nagreement.\n\n## Verification\n\nConfirm the graph contains only nodes and edges from a successful live reading, that local dragging changes layout only, and that every attempted write action reports the read-only boundary without changing the target.\n\nConfirm the divergence sentence as well: edit a context out of `extensions.conf` without\nreloading and the screen must name it as declared-but-not-loaded; reload and it must report\nagreement; make the file unreadable and it must report the target's own reason rather than\neither verdict.\n\n## Suggested articles\n\n[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).\n"
    },
    {
      "id": "pbx/control-provenance",
      "category": "pbx",
      "title": "Control and table provenance",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security",
          "id": "security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "canvas.md",
        "endpoints.md",
        "queues.md"
      ],
      "body": "# Control and table provenance\n\n## Behavior\n\nEvery base control has an explicit inventory entry. A control that edits Asterisk configuration is bound to one exact resource, section, key, parser, and host writer capability. Its current state is one of `read`, `missing`, `unparseable`, `unmapped`, `local-draft`, `applied`, or `unavailable`. A shipped design value is presentation data only and is never reported as the current value on a selected target.\n\nTable destinations aggregate the state of every command required to build their rows. The model distinguishes a verified empty result from a command that was not read, a command that was unavailable, and a partially observed destination. Unread cells use a neutral marker while retaining an accessible explanation of what was not observed and why.\n\nThe dialplan canvas publishes subset metadata beside its graph. The metadata names the source command, observation time, observed and rendered counts, omitted edge count, represented scope, and the unavailable add, edit, remove, and rewire capabilities.\n\n## Configuration\n\nScreen resources come from `console/shared/configuration-resources.ts`. Multi-file screens use ordered resource arrays. Display labels such as `cdr.conf · cel.conf` are never parsed into paths. Missing resource and host-capability descriptors fail closed.\n\nControl bindings live in `console/app/renderer/src/control-keys.ts`. Resource readings and freshness metadata live in `configuration.ts`. `control-provenance.ts` combines those inputs with local draft and applied records without copying a compiled design default into the observed value.\n\n## Failure modes\n\n- A missing binding produces `unmapped` and disables writing.\n- A target file or key that is absent produces `missing`; it is not treated as an empty string.\n- A raw value outside the parser contract produces `unparseable` and preserves the raw value for diagnosis without enabling a write.\n- A missing host capability produces `unavailable` with its exact reason.\n- A stale observation keeps its prior state and carries a separate stale reason.\n- A multi-command table with mixed outcomes produces `partial` and retains the status of every command.\n\n## Security\n\nOnly hand-written resource descriptors can authorize a resource. Paths are not accepted from display text, and missing descriptors never inherit access from another screen. Provenance records contain configuration coordinates and timing, not credentials or secret values.\n\n## Verification\n\nThe ultra-speed implementation pass intentionally does not run tests, type checks, builds, runtime interaction, or captures. Integration must wire the screen resource arrays, per-control provenance records, destination table state, server collection counts, and canvas subset metadata into the compiled shell before claiming runtime verification.\n\n## Suggested articles\n\n[Dialplan canvas](canvas.md), [Endpoints](endpoints.md), and [Queues and agents](queues.md).\n"
    },
    {
      "id": "pbx/dash",
      "category": "pbx",
      "title": "Dashboard",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "live.md",
        "endpoints.md",
        "../data/cdr.md"
      ],
      "body": "# Dashboard\n\n## Behavior\n\nEverything the PBX is doing right now. Numbers come from AMI, not from a config file, so nothing here is editable — it is the truth of the running system. It is backed by `live`. The rail badge on this destination currently reads `live`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\nThis screen has no editable controls. It is read-only telemetry, refreshed from the live AMI connection to Asterisk, and nothing on it is written back to a configuration file.\n\n## Failure modes and security\n\nBecause the numbers come from AMI rather than a file, an unreachable manager connection means the dashboard shows its disconnected state honestly instead of the last good numbers.\n\n## Verification\n\nConfirm the screen goes to its disconnected state when AMI is unreachable and recovers without a manual refresh once it returns.\n\n## Suggested articles\n\n[Live channels](live.md), [Endpoints](endpoints.md), and [CDR & CEL](../data/cdr.md).\n"
    },
    {
      "id": "pbx/endpoints",
      "category": "pbx",
      "title": "PJSIP endpoints",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "What the table's Transport and Codecs columns read",
          "id": "what-the-table-s-transport-and-codecs-columns-read"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "../system/security.md",
        "../media/codecs.md"
      ],
      "body": "# PJSIP endpoints\n\n## Behavior\n\nPhones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `12`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Identity\n\nWho this endpoint claims to be on the wire, and what the far end is allowed to present back.\n\n- **Transport** (`e_transport`) — a select control, default `transport-udp`, choices `transport-udp`, `transport-tcp`, `transport-tls`, `transport-wss`. A transport is the road the signalling travels on. UDP is the plain road, TLS is the same road inside an armoured tunnel.\n  - *What it is:* Chooses which configured transport this endpoint signals over: plain UDP, TCP, TLS, or WebSocket for browsers.\n  - *Why it exists:* Signalling carries who is calling whom, the credentials exchange and the media keys. On UDP all of that is readable by anything on the path.\n  - *Choosing a value:* transport-udp is the historic default and fine inside a trusted LAN. transport-tcp helps where packets are large or fragmented. transport-tls is the right answer for anything crossing a network you do not own. transport-wss is required for WebRTC browser clients.\n  - *Gotcha:* The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so.\n- **Dialplan context** (`e_context`) — a select control, default `from-internal`, choices `from-internal`, `from-external`, `from-trunk`, `sip-guest`. When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.\n  - *What it is:* The dialplan context this endpoint enters when it dials.\n  - *Why it exists:* A context is a namespace of extensions. It is the single most important security boundary in Asterisk: an endpoint can only reach what its context lets it reach.\n  - *Choosing a value:* from-internal for staff phones, from-external for anything untrusted, from-trunk for carriers.\n  - *Gotcha:* Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will.\n- **Caller ID presentation** (`e_callerid`) — a segmented control, default `Allowed`, choices `Allowed`, `Prohibited`, `Unavailable`.\n- **Trust inbound identity** (`e_trust`) — a switch control, default `false`. Only turn this on for carriers you control. It tells Asterisk to believe P-Asserted-Identity headers the other side sends.\n\n### Media & NAT\n\nEvery option here came out of pjsip.conf. Toggle, do not type.\n\n- **direct_media** (`e_direct`) — a switch control, default `false`. Off means audio goes through Asterisk. On means the two phones talk to each other directly and Asterisk steps out of the audio path.\n  - *What it is:* Whether the two phones may send audio straight to each other, leaving Asterisk out of the media path.\n  - *Why it exists:* It halves bandwidth at the PBX and removes a hop of latency.\n  - *Choosing a value:* no keeps audio flowing through Asterisk. yes lets the endpoints talk directly once the call is up.\n  - *Gotcha:* With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off.\n- **rtp_symmetric** (`e_symmetric`) — a switch control, default `true`.\n  - *What it is:* Requires that RTP arrives from the same address and port we are sending to.\n  - *Why it exists:* It defeats a class of audio injection where a third party sprays packets at your open RTP port.\n  - *Choosing a value:* yes is strongly recommended. no only for equipment that genuinely cannot comply.\n  - *Gotcha:* Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n- **force_rport** (`e_forcerport`) — a switch control, default `true`.\n  - *What it is:* Sends responses back to the port the request actually came from, rather than the port the phone claimed.\n  - *Why it exists:* A phone behind NAT advertises its private port. Replying there sends the packet nowhere.\n  - *Choosing a value:* yes for anything behind a router, which is nearly everything.\n  - *Gotcha:* Turning it off for a remote phone produces one-way registration that silently expires.\n- **rewrite_contact** (`e_rewrite`) — a switch control, default `true`. Needed when a phone behind a home router announces its private address. Asterisk quietly replaces it with the address the packet really came from.\n  - *What it is:* Replaces the Contact header address with the address the packet actually arrived from.\n  - *Why it exists:* Same NAT problem as force_rport, at the registration layer.\n  - *Choosing a value:* yes for remote and home workers. Not needed on a flat trusted LAN.\n  - *Gotcha:* On a carrier trunk this can be wrong: the carrier may legitimately present a Contact that differs from the source.\n- **ice_support** (`e_ice`) — a switch control, default `false`.\n- **media_encryption** (`e_encryption`) — a segmented control, default `sdes`, choices `no`, `sdes`, `dtls`.\n  - *What it is:* Whether media is encrypted, and with which scheme.\n  - *Why it exists:* TLS protects signalling only. Without media encryption the conversation itself is in the clear.\n  - *Choosing a value:* no is unencrypted. sdes exchanges keys in the SDP and requires TLS to be meaningful. dtls negotiates keys in the media stream itself and is what WebRTC uses.\n  - *Gotcha:* sdes over UDP signalling is theatre — the keys travel in plain text. If you turn on sdes, turn on TLS as well.\n- **dtmf_mode** (`e_dtmf`) — a segmented control, default `rfc4733`, choices `rfc4733`, `inband`, `info`, `auto`.\n  - *What it is:* How keypad presses travel from the phone to Asterisk.\n  - *Why it exists:* IVR menus, voicemail passwords and conference controls all depend on getting this right.\n  - *Choosing a value:* rfc4733 sends them as RTP events and is the modern default. inband sends actual tones in the audio, which compressed codecs mangle. info uses SIP INFO messages. auto tries to work it out.\n  - *Gotcha:* inband with g729 is the single most common cause of an IVR that ignores every key press.\n\n### Registration & AOR\n\nHow many devices may share this identity and how often Asterisk pokes them.\n\n- **max_contacts** (`e_maxcontacts`) — a stepper control, default `2`.\n  - *What it is:* How many devices may register against this one identity at the same time.\n  - *Why it exists:* One identity ringing a desk phone and a mobile app together needs at least two.\n  - *Choosing a value:* 1 for a single desk phone. 2 to 3 for desk plus mobile. 0 means unlimited and should not be used.\n  - *Gotcha:* A stolen credential can quietly add a device. Keep this as low as the deployment allows and watch the contact list.\n- **qualify_frequency** (`e_qualify`) — a slider control, default `60`. Asterisk sends a tiny OPTIONS ping this often to see if the phone is still alive. Zero switches the pings off.\n  - *What it is:* How often Asterisk sends a lightweight OPTIONS request to check the endpoint is still alive.\n  - *Why it exists:* It is how the console knows an endpoint went unreachable before a caller discovers it.\n  - *Choosing a value:* 60 seconds is a sensible default. 30 for critical endpoints. 0 disables the check.\n  - *Gotcha:* Very short intervals across hundreds of endpoints generate real traffic and real CPU. It is a poll, not a subscription.\n- **Registration expiry** (`e_expiry`) — a slider control, default `3600`.\n- **Allowed codecs** (`e_codecs`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`.\n\n## What the table's Transport and Codecs columns read\n\nThe two columns come from the endpoint's own parameter table, which Asterisk prints for\n`pjsip show endpoint <id>` and for nothing else. The plural `pjsip show endpoints` listing\ncarries neither value, so the console runs one further read per endpoint.\n\n- **Transport** is the endpoint's configured `transport=`. An endpoint that sets none shows\n  `—`: transports are matched from the inbound connection unless one is pinned, so there is\n  genuinely no per-endpoint value to report. An endpoint pinned to a transport the target\n  does not have still shows the name it is pinned to, which is the case worth seeing — the\n  plural listing omits that row entirely and made the misconfiguration look like an\n  ordinary blank.\n- **Codecs** is the endpoint's configured `allow=` list, in Asterisk's own preference\n  order. An endpoint configured to allow nothing reads `none allowed`, which is a real\n  answer and not the same thing as never having looked.\n- When the parameter table could not be read for a particular endpoint, the column falls\n  back to the codec negotiated on a live channel and says so — `ulaw (in use)`. That is a\n  different reading: one codec on one call, rather than the list the endpoint offers. It is\n  labelled so the two can never be mistaken for each other.\n\nOne view reads the parameter table for at most **100 endpoints**, six at a time, because\neach one is a separate command against the target. Anything past that shows `—` in both\ncolumns rather than a value nobody read.\n\n## Failure modes and security\n\nEvery row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so. Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will. With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off. Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [Codecs & RTP](../media/codecs.md).\n"
    },
    {
      "id": "pbx/iaxpeers",
      "category": "pbx",
      "title": "IAX peers",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "What loading and saving actually touch",
          "id": "what-loading-and-saving-actually-touch"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "endpoints.md",
        "../system/security.md"
      ],
      "body": "# IAX peers\n\n## Behavior\n\nIAX2 peers, users and friends. The table is `iax2 show peers`, live off the target; selecting a row loads that exact peer's real `iax.conf` section below. It is backed by `iax.conf`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\nThe secret is write-only: this screen can set one and can never show you the one already there, which is why there is no field displaying it.\n\n## Configuration\n\n### Identity\n\nWhat this peer is and where it lives.\n\n- **type** (`ix_type`) — a segmented control, default `friend`, choices `user`, `peer`, `friend`.\n- **host** (`ix_host`) — a text control, placeholder `dynamic`. An address, or `dynamic` when the far end registers to you.\n- **username** (`ix_username`) — a text control, placeholder `asterisk`.\n- **port** (`ix_port`) — a stepper control, default `4569`. IAX2 is 4569 by default; the sample shows 5036 for a second instance.\n\n### Call handling\n\nTransfers, liveness and call-token validation.\n\n- **transfer** (`ix_transfer`) — a segmented control, default `yes`, choices `no`, `yes`, `mediaonly`. Native IAX2 transfer. `mediaonly` keeps the signalling here and moves only the audio.\n- **qualify** (`ix_qualify`) — a text control, placeholder `yes`. `yes`, `no`, or a millisecond threshold.\n- **trunk** (`ix_trunk`) — a switch control, default `false`. IAX2 trunking multiplexes several calls into one stream to this host.\n- **requirecalltoken** (`ix_calltoken`) — a segmented control, default `yes`, choices `no`, `yes`, `auto`. Call-token validation resists spoofed call setup. `auto` requires it only from peers known to support it. Turning it off weakens that protection.\n\n### Media\n\n- **Allowed codecs** (`ix_codecs`) — an order control, default `ulaw`, `alaw`, pool `opus`, `g722`, `ulaw`, `alaw`, `g729`, `gsm`, `ilbc`, `speex`. Written as `disallow=all` followed by the allow list, which is what makes an allow list mean anything.\n\n### Routing & accounting\n\nWhere calls land and how they are recorded.\n\n- **context** (`ix_context`) — a text control, placeholder `from-internal`. The dialplan context inbound calls enter. `iax.conf` permits several; the first is the default.\n- **accountcode** (`ix_accountcode`) — a text control, placeholder `lss0101`.\n- **mailbox** (`ix_mailbox`) — a text control, placeholder `1234`.\n\n### Credential\n\nWrite-only. Setting a secret replaces whatever is there; nothing on this screen can read one back.\n\n- **Set a new secret** (`ix_secret_set`) — a switch control, default `false`. Leave this off and the existing secret is left exactly as it is. Switch it on and a strong secret is generated, written once, and shown once — this console never stores or redisplays it.\n\n### Save\n\n- **Save this peer** (`ix_save`) — action button. Select a peer from the table above first — this writes only what changed for that exact peer, backed up first and applied through the same plan/apply transaction every other write in this console uses. A generated secret is shown exactly once, in a dialog, and nowhere else — never persisted by this console, never in an export, never in local history.\n\n## What loading and saving actually touch\n\n`iax.conf` writes a peer as a named section carrying `type=peer` or `type=friend` inside it, so a binding looking for a section literally called `peer` could never have matched one — matching by type, not by name, is what makes the row-click load and Save both work at all. `iax-peers.ts`'s `findPeer`/`applyControlValues` do that match; `App.tsx`'s `onPickIaxPeerRow`/`onSaveIaxPeer` are the load and save paths themselves.\n\nThe trunks screen's own live table also shows every IAX2 registration (`iax2 show registry`, `iax.conf`'s own `register =>` lines), named the same way the directive itself is: username and host joined by `@`, or the bare host when the line sets no username. That is a reading only, not an edit — the registration line an IAX2 trunk uses to dial *out* is a different object from the peer/friend section a partner dials *in* to, and this screen edits only the latter.\n\n## Failure modes and security\n\nEvery row reflects a real object in `iax.conf`; nothing is invented to fill the table. A target with no configured peers renders an honestly empty table rather than the design's own sample rows. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The secret's write-only design means a wrong guess here cannot be corrected by comparison — only by setting a new one, which is the trade-off for never letting a credential travel back through renderer state, an export, a screenshot, or local history.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in `iax.conf`, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that picking a different row without saving resets `ix_secret_set` to off (so a switch armed for one peer can never silently apply to the next), that a generated secret is shown exactly once and never persisted, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Endpoints](endpoints.md), and [Security](../system/security.md).\n"
    },
    {
      "id": "pbx/ivr",
      "category": "pbx",
      "title": "IVR menus",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "canvas.md",
        "queues.md",
        "../media/voicemail.md"
      ],
      "body": "# IVR menus\n\n## Behavior\n\nEach menu is a canvas subgraph with a prompt and a key map. Editing a key here moves the matching node on the canvas. It is backed by `extensions.conf`. The rail badge on this destination currently reads `5`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Menu behaviour\n\nApplies to the selected menu.\n\n- **Digit timeout** (`i_timeout`) — a slider control, default `7`.\n- **Retries before fallback** (`i_retries`) — a stepper control, default `3`.\n- **On invalid entry** (`i_invalid`) — a segmented control, default `Repeat`, choices `Repeat`, `Operator`, `Voicemail`, `Hangup`.\n- **Allow direct extension dial** (`i_direct`) — a switch control, default `true`.\n- **Prompt language** (`i_lang`) — a select control, default `en`, choices `en`, `es`, `fr`, `de`, `zh`.\n- **Allow barge-in over prompt** (`i_barge`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in extensions.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in extensions.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dialplan canvas](canvas.md), [Queues & agents](queues.md), and [Voicemail](../media/voicemail.md).\n"
    },
    {
      "id": "pbx/live",
      "category": "pbx",
      "title": "Live channels",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "dash.md",
        "../system/security.md",
        "endpoints.md"
      ],
      "body": "# Live channels\n\n## Behavior\n\nEvery channel currently up. Spy, record or hang up any of them; each action runs the full four-gate confirmation. It is backed by `core show channels`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Monitor defaults\n\nApplied to any spy or recording started from this screen.\n\n- **Spy mode** (`m_spy`) — a segmented control, default `Whisper`, choices `Listen`, `Whisper`, `Barge`.\n- **Recording format** (`m_format`) — a segmented control, default `wav`, choices `wav`, `gsm`, `g722`, `ogg`.\n- **Beep on record start** (`m_beep`) — a switch control, default `true`.\n- **Keep recordings for** (`m_retain`) — a slider control, default `90`.\n\n## Failure modes and security\n\nEvery row reflects a real object in core show channels; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in core show channels, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dashboard](dash.md), [Security](../system/security.md), and [Endpoints](endpoints.md).\n"
    },
    {
      "id": "pbx/queues",
      "category": "pbx",
      "title": "Queues & agents",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "canvas.md",
        "ivr.md",
        "../media/moh.md"
      ],
      "body": "# Queues & agents\n\n## Behavior\n\nRing strategy, penalties and service level, all lifted from queues.conf. Agents are dragged between queues on the canvas. It is backed by `queues.conf`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Ring strategy\n\nHow a waiting call is offered to the members of this queue.\n\n- **strategy** (`q_strategy`) — a select control, default `ringall`, choices `ringall`, `leastrecent`, `fewestcalls`, `random`, `rrmemory`, `linear`, `wrandom`. ringall rings every free agent at once. leastrecent picks whoever has gone longest without a call. Pick ringall if you are not sure.\n  - *What it is:* How a waiting call is offered to the members of the queue.\n  - *Why it exists:* It decides whether callers wait less or agents share work evenly. You cannot optimise both.\n  - *Choosing a value:* ringall rings every free agent and answers fastest. leastrecent picks whoever has gone longest without a call. fewestcalls balances totals. rrmemory is round robin that remembers its place. linear follows the member order exactly.\n  - *Gotcha:* ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent.\n- **Ring each agent for** (`q_timeout`) — a slider control, default `15`.\n- **wrapuptime** (`q_wrapup`) — a slider control, default `15`. Breathing room after a call ends before that agent may be rung again.\n  - *What it is:* How long after a call ends before this agent may be offered another.\n  - *Why it exists:* Agents need to finish notes. Without it the next call lands mid-sentence.\n  - *Choosing a value:* 15 to 30 seconds suits most support desks. 0 for a high-volume queue where notes are not taken.\n  - *Gotcha:* It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up.\n- **Retry gap** (`q_retry`) — a slider control, default `5`.\n- **ringinuse** (`q_ringinuse`) — a switch control, default `false`.\n  - *What it is:* Whether members already on a call should still be rung.\n  - *Why it exists:* Some phones can hold a second call; most staff cannot.\n  - *Choosing a value:* no in almost every case.\n  - *Gotcha:* Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them.\n- **autopause** (`q_autopause`) — a segmented control, default `no`, choices `no`, `yes`, `all`.\n\n### Capacity & announcements\n\nWhat callers hear and when the queue turns them away.\n\n- **Maximum callers** (`q_maxlen`) — a stepper control, default `25`.\n- **servicelevel** (`q_service`) — a slider control, default `60`.\n  - *What it is:* The answer target used to calculate the service level percentage.\n  - *Why it exists:* It is the number a manager reports on.\n  - *Choosing a value:* 60 seconds is the industry convention.\n  - *Gotcha:* Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.\n- **joinempty** (`q_joinempty`) — a chips control, default `paused`, `invalid`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.\n  - *What it is:* Under which member states a caller is still allowed to enter the queue.\n  - *Why it exists:* It stops callers waiting in a line nobody is standing behind.\n  - *Choosing a value:* A list of states: paused, inuse, invalid, unavailable, ringing.\n  - *Gotcha:* The semantics are inverted from what most people expect: these are the states that still count as \"somebody is there\".\n- **leavewhenempty** (`q_leave`) — a chips control, default `inuse`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.\n- **Periodic announcement every** (`q_periodic`) — a slider control, default `60`.\n- **Announce position in queue** (`q_position`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in queues.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent. It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up. Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them. Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in queues.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dialplan canvas](canvas.md), [IVR menus](ivr.md), and [Music on hold](../media/moh.md).\n"
    },
    {
      "id": "pbx/README",
      "category": "pbx",
      "title": "PBX",
      "headings": [],
      "links": [
        "dash.md",
        "live.md",
        "endpoints.md",
        "trunks.md",
        "iaxpeers.md",
        "trunkauth.md",
        "canvas.md",
        "ivr.md",
        "queues.md"
      ],
      "body": "# PBX\n\nTelephony: endpoints, routing and everything a call touches while it is alive.\n\n- [Dashboard](dash.md)\n- [Live channels](live.md)\n- [Endpoints](endpoints.md)\n- [Trunks](trunks.md)\n- [IAX peers](iaxpeers.md)\n- [Trunk authentication](trunkauth.md)\n- [Dialplan canvas](canvas.md)\n- [IVR menus](ivr.md)\n- [Queues & agents](queues.md)\n"
    },
    {
      "id": "pbx/trunkauth",
      "category": "pbx",
      "title": "Trunk authentication",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "../system/security.md",
        "../app/history.md"
      ],
      "body": "# Trunk authentication\n\n## Behavior\n\nWhen a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do. It is backed by `trunk partner requests`, which is not an Asterisk configuration file -- see \"Failure modes and security\" below. The rail badge on this destination currently reads `2`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## What this screen reads\n\nTwo things, and they are not the same thing.\n\n**The request inbox is empty and always has been.** No partner-request channel is wired into this console — there is no protocol, no transport and no partner identity behind those cards, because which of each to use is a product decision rather than a piece of wiring. The screen says exactly that. It says it whether or not a target is connected, because connecting a phone system would not add a single request: the missing channel is a fact about this console, not about any target.\n\n**The target's real trunk authentication is read and reported.** The screen runs `pjsip show auths` and names every `type=auth` object the target actually has, with the `username=` each one presents — these are the objects an endpoint's `auth=`/`outbound_auth=` refers to, which is what \"this trunk authenticates as X\" is made of. It reads `pjsip show registrations` alongside them and reports how many outbound registrations exist. An object with no username reads `no username set` rather than rendering an empty pair of brackets, and a failed read carries the target's own reason.\n\nThe auth objects are deliberately **not** rendered as rows in the answer-history grid below. That grid's four fields are partner, what, answer and when, under a heading reading \"Answer history\" — so a row in it claims a partner asked something and this console answered. An auth object is neither, and putting real-looking content under a label it does not belong to is the same defect as the sample rows this console removed.\n\n### Why the plural command, and never the singular one\n\n`pjsip show auths` prints an id and a username and nothing else. `pjsip show auth <id>` prints the object's whole parameter set — including `password`, `md5_cred`, `oauth_secret` and `refresh_token`, all of which are registered fields on this object. Running it would put a real credential on screen and into anything that copies the screen. It is in neither read-only allowlist, the gateway refuses it if it is constructed by hand anyway, and both of those are asserted by tests rather than assumed.\n\n## Configuration\n\n### Answering policy\n\nHow requests arrive and what may be answered without you.\n\n- **Auto-approve low-risk requests** (`ta_auto`) — a switch control, default `false`. Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.\n- **Requests expire after** (`ta_expire`) — a slider control, default `48`.\n- **Notify on new request** (`ta_notify`) — a switch control, default `true`.\n- **Require mutual confirmation** (`ta_mutual`) — a switch control, default `true`. Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.\n- **Sign my answers** (`ta_sign`) — a switch control, default `true`.\n- **Keep the answer history forever** (`ta_log`) — a switch control, default `true`.\n\n## Failure modes and security\n\nThe six controls above are this console's own settings and are stored locally. They are not keys in pjsip.conf, and there is no key in pjsip.conf for \"auto-approve a low-risk partner request\" — that is this console's workflow, which is why this destination's `file` field reads `trunk partner requests` rather than a real Asterisk filename: it used to read `pjsip.conf · partner requests`, which named a real file that this screen has never read a single key from, and `resource-for-file.test.tsx` pins the current label so a screen cannot drift back to claiming one.\n\nThe reading beside them is unreachable-shown-as-unreachable, never backfilled: a failed `pjsip show auths` reports the target's own reason, and a target with genuinely no auth object reports that instead of leaving a blank.\n\n## Verification\n\nExercise every control against its documented default and its full option range, and confirm each value survives a relaunch — they are local settings, so nothing should be expected to land in a configuration file.\n\nFor the reading, confirm on the built application that a target's real auth objects appear by name, that one with no `username=` reads `no username set`, that a target with none says so, and that a failed read carries the target's own reason. `tests/control-plane/pjsip-auths.test.ts` asserts the parser against a fixture assembled from this checkout's own `config_auth.c` format strings and re-derives the column widths from `res_pjsip_cli.h`, and it asserts the two things that keep the credential off this screen: the singular `pjsip show auth <id>` is in neither allowlist, and the gateway refuses it if it is constructed by hand. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and reads all of the above out of the markup.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "pbx/trunks",
      "category": "pbx",
      "title": "Trunks & registrations",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What loading and saving actually touch",
          "id": "what-loading-and-saving-actually-touch"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunkauth.md",
        "endpoints.md",
        "iaxpeers.md",
        "../system/security.md"
      ],
      "body": "# Trunks & registrations\n\n## Behavior\n\nOutbound carriers and inbound identifies, PJSIP and IAX2 alike -- the live table merges `pjsip show registrations` with `iax2 show registry`. Registration state is polled live; credentials live in the secret intake, never on this screen. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `3`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\nClick a PJSIP row to load that exact registration, and the endpoint paired with it when one can be found, into the groups below. An IAX2 row has no PJSIP registration by that name -- it says so plainly rather than loading nothing silently, and points at the IAX peers screen's own editor instead.\n\n## What loading and saving actually touch\n\nThree real objects, not one:\n\n- The **[registration]** section named after the clicked row (`configs/samples/pjsip.conf.sample` lines 1519-1552), which is where the Failover group's three fields live. `parsePjsip` deliberately does not model this object type -- its own comment excludes registrations alongside transports, ACLs and `[global]` -- so a dedicated module, `trunk-registration.ts`, finds and writes it by name and by `type=registration`, because a registration and an endpoint can share one bracket name the same way an endpoint/auth/aor trio already does.\n- The **paired endpoint**, found through the registration's own `endpoint=` line, or by sharing its bracket name when there is no explicit one -- the Outbound identity and Advanced groups both read and write this object, through `trunk-advanced.ts`.\n- Nothing is guessed: a registration with no reachable endpoint still loads its retry policy, and Save still writes it, but Outbound identity and Advanced simply keep whatever they last showed.\n\nBefore this screen had a Save action at all, these five controls were bound only to whichever registration and endpoint happened to be first in the file -- a real read, but the same value regardless of which row was clicked, and nothing anywhere wrote it back.\n\n## Configuration\n\n### Failover\n\nWhat happens when the primary carrier stops answering. `configs/samples/pjsip.conf.sample` lines 1519-1552 (the `[registration]` template).\n\n- **Retry interval** (`t_retry`) — a slider control, default `60`. `retry_interval`, line 1542.\n- **Forbidden retry** (`t_forbidden`) — a slider control, default `300`. `forbidden_retry_interval`, line 1544.\n- **Fatal retry attempts** (`t_fatal`) — a stepper control, default `5`. `max_retries`, line 1532.\n\n### Outbound identity\n\nHow your calls appear to the carrier, on the paired `[endpoint]` section.\n\n- **Send P-Asserted-Identity** (`t_pai`) — a switch control, default `true`. `send_pai`, default `no`.\n- **100rel** (`t_100rel`) — a segmented control, default `yes`, choices `no`, `required`, `yes`. Line 650.\n\n### Advanced\n\nFurther `[endpoint]` settings on the same paired endpoint -- T.38 fax relay, identity headers, and how this trunk's own address is presented. Every key here was previously fully built and tested in `trunk-advanced.ts` with no control anywhere in the design to carry it; this group is what finally gives that module a screen.\n\n- **Send Connected Line updates** (`tk_connectedline`) — switch, default `true`. `send_connected_line`, default `yes`.\n- **Contact user** (`tk_contactuser`) — text. `contact_user`, default empty.\n- **From domain** (`tk_fromdomain`) — text. `from_domain`, default empty.\n- **From user** (`tk_fromuser`) — text. `from_user`, default empty.\n- **Media address** (`tk_mediaaddr`) — text. `media_address`, default empty.\n- **T.38 UDPTL** (`tk_t38`) — switch, default `false`. `t38_udptl`, default `no`.\n- **T.38 error correction** (`tk_t38ec`) — segmented, default `none`, choices `none`, `fec`, `redundancy`. `t38_udptl_ec`; only read while T.38 UDPTL is on.\n- **T.38 NAT support** (`tk_t38nat`) — switch, default `false`. `t38_udptl_nat`; only read while T.38 UDPTL is on.\n- **T.38 max datagram** (`tk_t38mtu`) — stepper, default `0`. `t38_udptl_maxdatagram`, bytes; only read while T.38 UDPTL is on.\n- **CNG fax tone detection** (`tk_faxdetect`) — switch, default `false`. `fax_detect`, default `no`.\n- **Trust ID outbound** (`tk_trustout`) — switch, default `false`. `trust_id_outbound`, default `no`.\n- **Send Remote-Party-ID** (`tk_sendrpid`) — switch, default `false`. `send_rpid`, default `no`.\n- **Send Diversion header** (`tk_senddiversion`) — switch, default `true`. `send_diversion`, default `yes`.\n\n### Save\n\n- **Save this trunk** (`t_save`) — action button. Writes the loaded registration's retry policy and, when a paired endpoint was found, its outbound identity and advanced fields, in one plan/apply transaction. Refused with a plain message when no row has been loaded, or when the loaded endpoint has since been removed from the target.\n\n## Failure modes and security\n\nEvery row reflects a real object read live off the target; nothing is invented to fill the table. Save only ever writes the three retry keys on the loaded registration, and, when a paired endpoint was found at load time, the outbound-identity and advanced keys on that exact endpoint -- untouched fields are left exactly as they were, and a warning is surfaced (never silently dropped) when T.38 detail is configured without T.38 itself being on, or when Remote-Party-ID is sent without outbound identity being trusted. A registration this target's pjsip.conf does not yet declare statically is created on Save rather than refused, the same convention the SLA trunk editor already uses.\n\n## Verification\n\n`tests/ui/trunk-advanced.test.tsx` exercises every Advanced-group key, including 100rel and send_pai, against `configs/samples/pjsip.conf.sample`'s own defaults and full option ranges, confirms independence between controls, confirms an untouched control writes nothing, and confirms the whole set survives being rendered to a file and re-parsed. Confirm on the built application that clicking a row loads the right registration and (when one exists) the right paired endpoint, that Save writes only what changed, that an IAX2 row is refused with an explanation rather than silently loading nothing, and that a registration Save creates is visible on the next read.\n\n## Suggested articles\n\n[Trunk authentication](trunkauth.md), [Endpoints](endpoints.md), [IAX peers](iaxpeers.md), and [Security](../system/security.md).\n"
    },
    {
      "id": "platform/accessibility",
      "category": "platform",
      "title": "Accessibility",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "responsive-sizing.md",
        "material-appearance.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Accessibility\n\nKeyboard reachability, visible focus, correct semantic roles, sufficient contrast, and screen-reader-sensible structure across the whole product.\n\n## Behavior\n\nEvery interactive element is meant to be reachable by keyboard, carry a visible focus indicator, expose the correct accessible role, name, and state, hold sufficient contrast, and respect a reduced-motion preference.\n\n## Configuration\n\nThis is treated as a completion blocker rather than later polish: a control that looks interactive but cannot be reached or announced correctly is considered unfinished, not merely rough.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's rendered interface currently contains no accessibility attributes at all — no ARIA roles, no accessible names distinct from visible labels, and no verified keyboard focus order. There are also no automated tests covering the desktop application's generic feature surface. This is stated directly rather than left for a reader to assume.\n\n**Documentation website:** Partial. The documentation website has some baseline structure — heading hierarchy, a skip-to-content link, and semantic landmarks — but has not been audited for contrast, full keyboard operability, or screen-reader correctness across every page.\n\n## Failure modes\n\nA control that cannot currently be reached by keyboard or announced correctly to a screen reader is, today, a real and known gap rather than a hypothetical failure mode; closing it is unstarted work on the desktop application and partial work on the site.\n\n## Accessibility and localization\n\nThe desktop application's interface currently contains no accessibility attributes at all, and there are no automated tests covering the desktop application's generic feature surface. This is stated here directly so a reader does not have to assume it. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Responsive and high-scale sizing](responsive-sizing.md), [Material appearance system](material-appearance.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/accessibility-runtime-primitives",
      "category": "platform",
      "title": "Accessibility runtime primitives",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "accessibility.md",
        "responsive-sizing.md",
        "bounded-overlays.md",
        "long-operation-progress.md",
        "README.md"
      ],
      "body": "# Accessibility runtime primitives\n\nShared renderer contracts now describe focus, semantic structure, asynchronous status, responsive geometry, motion preferences, and long-running operations without tying those decisions to one React component.\n\n## Behavior\n\nThe runtime primitives provide:\n\n- deterministic focus capture, initial focus selection, Escape dismissal intent, focus return, and a composed confirmation-overlay contract;\n- orientation-aware roving focus for horizontal, vertical, and right-to-left tab strips;\n- semantic descriptors for dialogs, popovers, menus, lists, tables, disabled controls, and individual data values;\n- distinct loading, verified-empty, unavailable, partial, stale, ready, and error states with non-color status text and live-region announcements;\n- per-cell provenance that renders unread and unavailable values as `—` while announcing why the value is absent;\n- progress and countdown text that remains meaningful without color or animation;\n- reduced-motion resolution where the operating-system preference takes priority;\n- minimum target sizing, viewport-bounded overlay placement, recoverable panel geometry, and keyboard move or resize deltas;\n- a pure operation state machine for pending work, progress, cancellation, deadlines, completion, failure, timeout, and re-entry refusal.\n\n## Configuration\n\nThe modules expose TypeScript data and transition functions. A central renderer chooses the actual elements, live-region hosts, focus scopes, viewport values, and operation timers, then applies the returned descriptors to those surfaces.\n\nStatus severity is explicit. Failures use `error`, partial and stale data use `warning`, loading uses `progress`, verified empty data uses `neutral`, and completed data uses `success`. A renderer should map those names to both visible text and visual treatment. Color must remain supplementary.\n\n## Current status\n\n**Desktop application:** Primitives implemented, central mounting not implemented in this change. The modules are integration-ready, but generated screens and the root application do not yet consume them. This work therefore does not claim complete keyboard, focus, screen-reader, responsive-layout, or long-operation coverage.\n\n**Documentation website:** Unchanged. These renderer primitives do not mount into the website.\n\n## Failure modes and security\n\nReturning an attribute descriptor without applying it to the corresponding element has no user-visible effect. Focus return also requires the opening component to capture a snapshot before mounting its overlay and to call restore after dismissal. The operation state machine refuses duplicate starts, but callers must route every submission path through it, including keyboard submission.\n\nUnread values never acquire a placeholder that resembles measured data. An unavailable or stale value keeps its reason and observation metadata in the accessible description. Error text can include a recovery action, but it must not expose credentials, configuration secrets, call content, or private paths.\n\n## Accessibility and localization\n\nThe primitives accept user-facing labels and details from their caller instead of embedding a localization system. Integration must supply localized text for the active language mode. Exact values, counts, timestamps, and operation states remain factual at every copy tone.\n\n## Verification\n\nNo test, build, type check, UI interaction, or screen capture ran in this ultra-speed implementation lane. Central integration must add focused tests and built-application verification before any accessibility compliance claim is made.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md), [Bounded overlays](bounded-overlays.md), [Long-operation progress](long-operation-progress.md), and [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/app-display-name",
      "category": "platform",
      "title": "Renameable app display name",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Implementation notes",
          "id": "implementation-notes"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "On the documentation site",
          "id": "on-the-documentation-site"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "app-logo-customization.md",
        "../app/about.md",
        "README.md"
      ],
      "body": "# Renameable app display name\n\nLets a user rename what the application calls itself in its own title bar and About screen, without touching its install identity.\n\n## Behavior\n\nA settings field (Customise everything → Identity → Display name) lets a user set a custom display name, persisted across restarts through the durable-storage settings snapshot and resettable to the shipped name in one action (the \"Restore the shipped name\" switch beside it).\n\nThe chosen name reaches every surface the console uses to introduce itself to its own user:\n\n- **The in-app title bar** — the custom drag-region title bar the frameless window renders.\n- **The native OS window title** — taskbar and Alt+Tab, pushed to the main process over IPC (`window:set-title`) whenever the name changes, and once on startup after the durable-storage snapshot loads.\n- **The About screen's heading** — reads \"About \\<name\\>\" instead of a bare \"About\".\n- **Its own notifications** — a toast confirms \"Renamed to \\<name\\>\" when a rename is set, and \"Name restored to \\<shipped name\\>\" when it is reset.\n\n## Configuration\n\nRenaming changes display only. `display-name.ts` keeps two deliberately separate exports with no path between them: `IDENTITY` (a frozen constant: the shipped product name, the application-data directory, the packaging identifier, and the credential-vault service key) and `displayName()` (the user setting). Nothing derives an identity value from the chosen name.\n\nDiagnostics, crash logs, issue reports, the update feed, and the installer always use `IDENTITY.productName`, never the chosen name (`nameFor()`'s `SHIPPED_NAME_SURFACES`) — the rename control's own explanatory copy states this plainly, in text that itself always names the shipped product, regardless of what the console is currently renamed to.\n\n## Implementation notes\n\nThe compiled title bar text is a design-reference literal with no bound value (`h(\"span\", {...}, \"Material Asterisk\")`), and the renderer is compiled from the design reference and must never be hand-edited. Rather than edit the design reference for one label — which would need a matching, independently re-audited change to its pinned binding and expression counts — `title-bar-name.ts` rewrites the already-built element tree on its way out of `App.render()`, the same way `text-boundary.ts` already applies language and personal-vocabulary substitution to the compiled tree without touching a generated file. It finds the title bar by its `data-window-drag` marker (which `compile-design.mjs` guarantees is unique at compile time) and, within it, the one row carrying the leading Material Symbols icon — never by matching the shipped-name string itself, so an already vocabulary-substituted name is still found.\n\n## Failure modes\n\nA rename that accidentally altered the application's data-directory path rather than only its display label is the specific failure this feature is designed to prevent by deriving the two from separate constants — exercised directly by `display-name.test.tsx`'s identity tests. An invalid name (empty, over 60 characters, or containing a control character) is refused before it reaches storage, and a name a hand-edited settings file or an older version wrote that the app would no longer accept falls back to the shipped name rather than rendering.\n\n## Accessibility and localization\n\nFollows the product's standing accessibility contract: the rename field and reset switch are ordinary keyboard-reachable, correctly-named text and switch controls with the compiled design's own focus and contrast handling. Copy is currently fixed English; the disclosure and confirmation strings are not yet routed through the language-mode/funny-level boundary.\n\n## On the documentation site\n\nThe published site carries the same feature, built separately because it is a different\nprogram: no Electron, no durable-storage snapshot, no window title to push over IPC. It\nlives in `site/settings.html` (an IDENTITY card holding a bounded text field, a\n`Reset to shipped name` button and a live status line) and `site/app.js`\n(`applyDisplayName()`, called from `applyState()`).\n\nTwo surfaces are renamed and are named rather than swept: every `.brand-name` element —\nthe brand line in the header and footer of all six pages — and `document.title`, which is\nthe browser tab and the closest thing a web page has to a title bar. The title is\nrecomposed each time from `SHIPPED_TITLE`, captured once at load, so a second rename\ncomposes against the shipped title instead of against the first rename's output; a title\nthat never carried the shipped name is left exactly as it was rather than guessed at.\n\nThe boundary is the point of the feature, so it is stated as a list of things a rename\nmust **not** reach:\n\n- **`og:` metadata and the page description** — what somebody else's chat window and\n  somebody else's search result read. `app.js` never writes them.\n- **The product prose** on the home and product pages, which describes the real software\n  by its real name.\n- **Every identity constant**: `STORAGE_KEY`, `HISTORY_KEY`, the vocabulary and logo cache\n  keys, and the `ding-pbx-page-settings.json` export filename. All are literal constants\n  that nothing derives from the chosen name, so a rename cannot orphan a visitor's stored\n  settings — the same separation `IDENTITY` and `displayName()` keep in the console.\n\nTyping applies the rename live and persists on every keystroke, so it survives a reload\neven if the field is never left; one local-history entry (`display-name-changed`) and one\nnotification are written per committed rename rather than per keystroke. `Reset settings`\nclears the chosen name along with everything else and says so in its own confirmation\ntext. The card's description carries four English and four Cantonese variants at the two\nfunny levels, and every one of the eight names the shipped product, so the boundary is\nstated at every level rather than at some of them.\n\nOne ordering detail carries the whole feature and is easy to reverse by accident:\n`applyDisplayName()` runs **before** `applyVocabulary()` in `applyState()`. The vocabulary\nwalker caches the first text it sees for each node and thereafter rewrites from that\ncache, so reversing the two would put the shipped name straight back after every rename,\nwith nothing failing to say so. `site/tests/contracts/app-display-name.test.mjs` pins the\norder for that reason.\n\n## Verification\n\n`tests/ui/display-name.test.tsx` exercises the `display-name.ts` module directly: identity isolation, validation, persistence, reset, and shipped-name-only surfaces. `tests/ui/display-name-wired.test.tsx` proves the wiring itself against the real `App` — the title bar and About heading actually rendering the chosen name (and the shipped name when unrenamed), the notification toast, the native window-title IPC push, and (by source-scan, since it is Electron-only code this suite cannot import and run directly) `main.ts` and `preload.cjs`. `tests/ui/title-bar-name.test.tsx` covers the tree-rewrite's precision in isolation, including the negative case that would let it silently overwrite the connection-status pill instead.\n\nThe site's own half is covered by `site/tests/contracts/app-display-name.test.mjs`, which\nextracts the real `applyDisplayName`/`setDisplayName`/`commitDisplayName` source out of\n`site/app.js` and runs it against a recording page rather than asserting patterns over it\n— \"the value is stored\" and \"the setting persists\" are both true of a rename that never\nreaches a single pixel, and a source-pattern test cannot tell those apart from a working\none. The recorder keeps every selector asked for and every element id requested, so the\nboundary is proved by what the code reached for rather than by what its comments claim:\nexactly one selector (`.brand-name`) and exactly two ids (its own field and status line).\nNo capture of the site has been taken yet, so the `pages-site` inventory row remains\n`unverified`.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [About and policy](../app/about.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/app-logo-customization",
      "category": "platform",
      "title": "App logo customization",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "app-display-name.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# App logo customization\n\nLets a user replace the application's displayed mark with a shipped preset or their own local image.\n\n## Behavior\n\nA logo customization surface is meant to offer several presets plus a local image upload, processed entirely on-device with cropping, fit, and background controls, then applied live wherever the mark is shown.\n\n## Configuration\n\nProcessing would be bounded and safe — validated file types, no network upload — with conversion failures leaving the previous valid logo in place.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application shows a fixed application mark with no customization surface.\n\n**Documentation website:** Partial. Every page exposes three presets, contain/fill choice, and local PNG/JPEG upload. The loader verifies the byte signature, bounds encoded bytes and decoded pixels, revalidates the cache, applies the mark live, and retains the prior valid mark after rejection. Crop, focal point, background treatment, and multi-size output remain incomplete.\n\n## Failure modes\n\nA malformed, spoofed, oversized, or over-dimension image is rejected before storage, with the previous valid logo staying active. Source filenames and file paths are not retained, and image bytes are omitted from site-state export with that omission stated.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/appearance-runtime-core",
      "category": "platform",
      "title": "Appearance runtime core",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Color model",
          "id": "color-model"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Persistence and import",
          "id": "persistence-and-import"
        },
        {
          "title": "Capability records",
          "id": "capability-records"
        },
        {
          "title": "Mounting",
          "id": "mounting"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification status",
          "id": "verification-status"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "material-appearance.md",
        "app-logo-customization.md",
        "accessibility.md"
      ],
      "body": "# Appearance runtime core\n\nThe desktop renderer has a local, versioned appearance model that can be mounted by any real surface without routing settings through a preview-only facade.\n\n## Behavior\n\nEvery override is addressed by a stable element identifier, one interaction state, and one property. Interaction states include default, hover, focus, focus-visible, active, disabled, selected, checked, and expanded. Resolution is deterministic: an element's state override wins over its default override, then the matching global state, then the global default.\n\nEditing uses a per-property draft. Creating a draft does not change the mounted value. Apply changes only that property and removes its draft. Discard removes only the draft. Reset can target one property, one state on one element, every state on one element, one global state, all global values, or the complete appearance model. These scopes are separate so resetting one color cannot erase unrelated settings.\n\nNamed presets contain real global settings, rainbow speed, and override snapshots. Applying a preset replaces those values and clears drafts. Saving, applying, deleting, importing, and resetting return executable inverse actions only after local persistence succeeds. A no-op reports that nothing changed, and an unavailable operation reports why it did not run.\n\n## Configuration\n\nAn override is addressed by three things and configured by nothing else: a stable element identifier, one interaction state, and one property. There is no global switch that turns the system on, and no per-surface exemption -- a surface participates by exposing `data-appearance-id`, and the host sets `data-appearance-state` as interaction changes.\n\nTwo values are configured globally rather than per element: the rainbow speed level, which maps to one duration shared by every mounted rainbow surface so they turn together, and the storage adapter the local store is given. The browser adapter can use local storage; a test or a non-browser host supplies another without changing the model.\n\n## Color model\n\nThe color engine accepts continuous HSL coordinates and translates bidirectionally among named colors, HEX and HEX8, RGB and RGBA, HSL and HSLA, HSV and HSB, HWB, CIELAB and LCH, OKLab and OKLCH, and CMYK. Alpha is retained in every translation, using an alpha-preserving hexadecimal fallback when no exact name exists.\n\nWide-gamut input reports when its displayed sRGB result was clipped. The original input remains available to the calling editor, so a display conversion never pretends the source was already inside the display gamut. Contrast evidence records the exact foreground, background, ratio, and WCAG verdict when both colors are fixed. Animated color reports that a fixed ratio cannot be calculated.\n\nRainbow is a discriminated marker, not a color string and not a palette entry. One global speed level maps to one duration shared by every mounted rainbow surface. Reduced motion resolves the marker to one stable hue and disables the animation.\n\n## Configuration\n\nNothing here is configured by editing a file. Every knob is an argument a host passes when it\nconstructs the store or mounts the model, and the exact names matter because two hosts that spell a\nstorage key differently do not share a model:\n\n| What a host supplies | Where | Default |\n| --- | --- | --- |\n| The storage adapter — `getItem`/`setItem`, nothing browser-specific | `createAppearanceStore(storage, …)` (`app/renderer/src/appearance-store.ts:122`) | none; it is required |\n| The capability records the runtime detected on this machine | second argument to the same call | `[]`, meaning nothing is claimed supported |\n| The storage key the model is written under | third argument | `APPEARANCE_STORAGE_KEY`, `ding-pbx-console.appearance.v2` |\n| Which element an override addresses | the `data-appearance-id` attribute on the element (`APPEARANCE_ELEMENT_ATTRIBUTE`) | none; an element without it is never targeted |\n| Which interaction state is live | the `data-appearance-state` attribute, rewritten by the host as interaction changes (`APPEARANCE_STATE_ATTRIBUTE`) | the default state |\n| Rainbow speed | one global level on the model, shared by every mounted rainbow surface | see the color model above |\n\nThe stored document declares `schemaVersion: 2` (`APPEARANCE_MODEL_SCHEMA_VERSION`,\n`app/renderer/src/appearance-schema.ts:3`). A document declaring anything else is rejected whole\nrather than migrated silently, so an older profile reports its version instead of being partly read.\n\nThe user-facing settings this model backs are described in\n[Material appearance system](material-appearance.md); this article is the layer underneath them.\n\n## Persistence and import\n\nThe local store uses schema version 2 and a caller-provided storage adapter. The browser adapter can use local storage, while tests or non-browser hosts can supply another adapter without changing the model. Reads revalidate the complete stored document. Writes serialize and validate the complete next model before replacing the prior stored value. A rejected import applies nothing.\n\nJSON export includes the complete model, drafts, presets, capability records, and safe logo rendering metadata. It does not include custom-logo bytes, filenames, paths, cache keys, or network references. A custom logo export states that the local asset was omitted.\n\n## Capability records\n\nRuntime support is recorded explicitly for installed-font enumeration, variable font axes, eyedropper access, clipboard writes, local logo decoding and crop, rainbow animation, and direct OKLCH output. An unsupported record carries both the reason and the fallback. The interface must use these records to keep an unavailable control visible and truthful rather than showing a success notification for an operation that never ran.\n\n## Mounting\n\n`appearance-runtime.ts` mounts values onto elements that expose `data-appearance-id`. A host can set `data-appearance-state` as interaction changes and remount the model. The adapter reports element identifiers that are stored but not present in the mounted surface. It also exports the stylesheet needed for hue interpolation. The central renderer must install that stylesheet and mount the adapter before these model changes become visible.\n\n## Configuration\n\nThis is a model rather than a screen, so what it takes is supplied by the host that mounts\nit rather than typed by a person:\n\n- **The storage adapter**, provided by the caller. A browser host can pass local storage; a\n  test or a non-browser host can pass another adapter without the model changing, which is\n  the point of the seam. The stored document is schema version 2 and is revalidated whole\n  on every read.\n- **Global settings, rainbow speed level and override snapshots**, saved and applied as\n  named presets. One speed level maps to one duration shared by every mounted rainbow\n  surface, so two surfaces cannot drift apart by however long apart they were mounted.\n- **The mount hook**, `data-appearance-id` on each element and `data-appearance-state` as\n  interaction changes. The adapter reports identifiers that are stored but absent from the\n  mounted surface, so a stale override is named rather than silently doing nothing.\n- **Reset scope**, chosen per action: one property, one state on one element, every state\n  on one element, one global state, all global values, or the whole model. They are\n  separate precisely so resetting one colour cannot erase unrelated settings.\n\nCapability records are read rather than set. Installed-font enumeration, variable axes,\neyedropper, clipboard, local decoding and direct OKLCH output are each recorded with a\nreason and a fallback when unavailable, and the interface must keep such a control visible\nand truthful rather than reporting a success for an operation that never ran.\n\n## Failure modes and security\n\n- Storage read failure starts with an empty model and exposes the rejection reason.\n- Storage write failure preserves the previous in-memory and persisted model.\n- A stale inverse action is refused when its expected revision no longer matches.\n- A malformed, oversized, duplicate, unknown-version, or privacy-invalid import is rejected as a whole.\n- A rainbow marker never enters color parsing, translation, contrast, alpha concatenation, or finite palettes.\n- Logo metadata cannot carry a path, URL, raw asset, filename, or cache key.\n- Capability detection never invokes a permission prompt and never claims clipboard, eyedropper, font, or decoder success.\n\n## Verification status\n\nThis ultra-speed implementation did not run unit tests, lint, type checking, a build, packaging, runtime interaction, or screen captures. The API is mount-ready, but the central renderer integration and built-artifact proof belong to the surface-wiring lane.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [App logo customization](app-logo-customization.md), and [Accessibility](accessibility.md).\n"
    },
    {
      "id": "platform/attention-modes",
      "category": "platform",
      "title": "Attention-support modes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "accessibility.md",
        "non-blocking-notifications.md",
        "README.md"
      ],
      "body": "# Attention-support modes\n\nA set of independently toggleable, off-by-default interface modes — focus, low stimulation, time awareness, one-thing-at-a-time, and momentum — aimed at attention difficulties.\n\n## Behavior\n\nEach mode is meant to be a separate switch: focus dims everything but the active item without hiding it, low stimulation reduces motion and non-essential notifications, time awareness shows elapsed session time, one-thing-at-a-time pins a single chosen next action, and momentum gently and dismissibly flags long-untouched work.\n\n## Configuration\n\nCopy in these modes would stay plain and factual, never gamified or judgmental, presented as interface accommodations rather than anything medical or diagnostic.\n\n## Current status\n\n**Desktop application:** Implemented. Every switch in Customise › Attention now changes real behaviour, not only a stored preference:\n\n- **Focus** dims everything except whatever currently has focus once something is focused; nothing is hidden and the dim is pure opacity, so every element is still reachable and clickable. Nothing is dimmed while nothing is focused.\n- **Low stimulation** composes with, and never overrides, both the console's own Reduced motion switch and the operating system's `prefers-reduced-motion` preference — motion is reduced when any of the three is on. It also quiets the console's ambient, lower-priority toast notifications (progress pings, confirmations); the console's other non-blocking surface — reserved for failures and the outcome of something substantial — is unaffected, so a person still sees what genuinely needs attention.\n- **Time awareness** renders a small rail, present on every screen rather than only on the settings page, stating how long the session has been open and how long since anything last changed.\n- **One thing at a time** adds a single free-text field to that same rail for the one next action, chosen by the person and persisted, so it survives switching screens or relaunching.\n- **Momentum** shows a plain, dismissible prompt on the rail once something has sat unchanged for 20 minutes, stating only the fact (\"Nothing has changed here for 40 minutes.\"). Its \"Not now\" is respected for 30 minutes, not for the length of one render.\n\nEvery switch is off by default, independent of every other, and each attention-mode switch's own on/off position is restored after a relaunch, not only the underlying behaviour.\n\n**Documentation website:** Partial. The site's settings page includes placeholder entries naming these modes; none of the five behaviors are actually wired to change the rendered page yet.\n\n## Failure modes\n\nA failure here is silent by nature — a switch that persists correctly but changes nothing on screen — which is exactly the state this feature shipped in before it was wired. The wired tests in `attention-modes-wired.test.tsx` exist specifically to catch that: they assert on the actual rendered markup and DOM side effects (a real injected style element, a real snoozed timestamp) rather than only on `presentationFor()`'s return value, because a correct pure function that nothing calls passes every test on the pure function alone.\n\n## Accessibility and localization\n\nThe rail (`attn-rail` and its children) uses `role=\"complementary\"` with an `aria-label`, and the momentum prompt uses `role=\"status\"`. The next-action field and the Not now button are ordinary keyboard-reachable `<input>`/`<button>` elements. Copy is plain English today; the console's language-mode and funny-level machinery has not yet been extended to this rail's own strings, which remains open work tracked alongside the rest of the feature.\n\n## Verification\n\n`attention-modes.test.tsx` covers the pure module (`presentationFor`, `momentumPrompt`, `elapsedPhrase`, and the storage-backed helpers for the chosen next action and the momentum snooze). `attention-modes-wired.test.tsx` covers the actual `App.tsx` wiring: real control changes producing real presentation changes, a real style element appearing and disappearing in the document, the rail rendering only what each mode's own state says it should, and the switches' own on/off position surviving a restore. Both suites run under `npm run test:renderer`.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/automatic-updates",
      "category": "platform",
      "title": "Automatic updates",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Restart and drafts",
          "id": "restart-and-drafts"
        },
        {
          "title": "Configuration and safety",
          "id": "configuration-and-safety"
        },
        {
          "title": "Pages-site equivalent",
          "id": "pages-site-equivalent"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "The published website",
          "id": "the-published-website"
        },
        {
          "title": "Verification boundary (desktop)",
          "id": "verification-boundary-desktop"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../evidence/automatic-updates.md",
        "in-context-recovery.md",
        "non-blocking-notifications.md",
        "app-display-name.md",
        "README.md"
      ],
      "body": "# Automatic updates\n\nThe desktop updater checks the published release feed over HTTPS, validates one complete release identity, downloads the matching unsigned `Setup.exe`, checks its declared size and SHA-256 digest, and stages it for a user-directed restart.\n\n## Behavior\n\nPublished releases use a monotonic package version `0.1.<run>`, beginning above `0.1.0`, and one immutable identity record. The public release tag remains `ding-pbx-console-v0.0.<run>-r<attempt>` for compatibility with existing `0.1.0` installations. The updater maps that legacy-compatible tag to package version `0.1.<run>` before comparing versions. A usable release carries exactly one stable `Ding-PBX-Console-Setup.exe`, one `RELEASES`, at least one version-bearing full `.nupkg`, `SHA256SUMS.txt`, and `release-identity.json`. The identity records the package version, candidate commit, release tag, artifact names, sizes, and SHA-256 values. A release is ignored when any record is missing, malformed, unpublished, duplicated, or inconsistent.\n\nThe installed version comes from the packaged `update-manifest.json`. Published packaging rejects any run whose bounded positive run number does not map exactly to package version `0.1.<run>`. A release is offered only when its package version is strictly newer. Local unpublished builds remain identifiable by their candidate commit and are never treated as published releases.\n\nThe desktop checks once at startup and on a bounded schedule. Only one check or download may be in flight. Metadata, identity, checksum text, and installer streams have finite response and per-read deadlines and bounded sizes. Temporary installer directories are owned by the updater, removed after every failed or superseded operation, and swept when the desktop starts.\n\n## Restart and drafts\n\nThe ready banner is non-blocking and offers `Restart to install update` and `Later`. `Later` hides the banner without deleting the staged installer. A manual check or the next scheduled check may reveal the preserved ready state again. A newer ready revision clears an older local spawn-error message, while a current failure remains visible. Restart uses an invoke-based acknowledgement. The main process has one installing latch, launches `Setup.exe` at most once, and quits only after the operating system acknowledges process spawn. A spawn failure stays visible and retryable.\n\nPBX drafts disable restart. The renderer counts every loaded resource whose current draft differs from its last live read, including the resource currently being edited, and publishes that count through the main-process updater revision. The banner states the exact recovery route: review the draft, apply it, or discard it, then retry the restart. The updater never drops a draft to make installation convenient.\n\n## Configuration and safety\n\nCode signing is permanently prohibited. The package and update feed are intentionally unsigned, so the operating system may show an unknown-publisher or SmartScreen warning. Digest checking proves byte integrity only and never claims authenticity or signing.\n\n## Pages-site equivalent\n\nThe static delivery workspace at `history.html` reads the versioned release-manifest equivalent. A valid available record needs a full commit identifier, a version and tag, immutable HTTPS asset URLs, positive byte sizes, and SHA-256 hashes. The page reports `unavailable`, `available`, `downloading`, `ready`, or `failed` only when that schema validates. It offers a normal browser reload, but a hosted page cannot install or restart the desktop application, so it never claims that an update was downloaded, staged, or applied.\n\n## Failure modes\n\nMalformed packaged identity, an older or equal package version, incomplete release assets, missing checksum lines, inconsistent artifact sizes or digests, response-header timeout, stream-read timeout, bounded-size overflow, temporary-file failure, and installer-spawn failure remain visible as retryable updater states. A failed or superseded download is removed from its updater-owned temporary directory.\n\n## Accessibility and localization\n\nThe banner is a keyboard-operable, screen-reader-named non-blocking status surface with visible focus, a pending state, a disabled restart control while drafts exist, and explicit retry copy after spawn failure. The successful installer spawn is acknowledged to the renderer before application quit is scheduled, while a failure keeps the current session open. It avoids claiming that a download is running while a staged installer is merely ready. The product's language and localization surfaces own the final copy.\n\n## The published website\n\nThe documentation website has its own deployed-version watch, and it is a genuinely different mechanism rather than the desktop updater running somewhere else. A page installs nothing, so the contract is read for what it is for: notice that what is published has moved on, say so without interrupting anybody, and let the person take the new one when they choose. Reloading is the whole installation step.\n\n**Four canonical clauses have no equivalent on a page and are stated on the settings card rather than faked: there is no staged download, no signature to verify, no restart, and nothing to roll back.** Saying so is the point. A silent gap reads as an oversight to the next person and as a decision to nobody.\n\n`site/build.mjs` resolves one build identity per deploy: the commit from `git rev-parse HEAD`, the verified release label this site documents (or `unversioned` when no release manifest resolved), and the build time. It bakes those three values into `SITE_BUILD_VERSION`, `SITE_BUILD_COMMIT` and `SITE_BUILD_AT` in the published `app.js`, and publishes the same three as `version.json` beside the pages. A build that cannot name its own commit writes **neither** — no baked identity and no manifest — so a page served straight out of the source directory reports itself unbuilt and never asks for a file nobody published. A request that fails reads as a site that is down; an honest \"this page was not built\" does not.\n\n**The comparison is on the build commit and never on the version label.** Two builds of one release wear the same label, so a check resting on it reports `current` about a page that is not. The label is displayed and is otherwise used for one thing only: `compareBuildVersions` orders two `v0.1.N` labels so the wording can say `newer`, `older` or `rebuilt`, and returns `null` for anything else rather than guessing — because guessing an order is how a roll-back gets announced to somebody as an update.\n\n`checkForUpdate()` runs once at startup and every thirty minutes. The address comes from `versionManifestUrl()`, which resolves `version.json` against the document and **refuses any result whose origin is not this document's own**. Everything else on this site is a bundled local asset, so the property worth being able to check is not that it asked for the right file but that it could not have asked somebody else's server. The request is `cache: 'no-store'` with `credentials: 'omit'`, bounded at 4096 bytes and abandoned after eight seconds. A second check while one is in flight is refused rather than queued. `parseVersionManifest()` refuses a body it cannot vouch for and says which check refused it — over the byte bound (applied before parsing, so it holds whatever the body turns out to be), unparseable, not an object, an unreadable schema version, an unusable version label, a commit that is not forty lowercase hex characters, or a build time that is not a readable instant.\n\nThe banner is persistent and non-blocking, carries `role=\"status\"` and `aria-live=\"polite\"`, and states what reloading costs: settings are saved as they change, but anything typed into a field and not yet saved is lost. That is the whole unsaved-work protection a page can offer, and it is said rather than implied. `Later` is remembered against the exact commit it was said about and is persisted, so it survives moving to another page of the site; a newly published build is a different answer to a different question and raises the banner again. A newly available build is announced once however many times it is polled, and a background check that fails does so quietly — only a check somebody asked for reports back.\n\nNothing the manifest returns is ever written into a setting. `updatesDesc` carries four English and four Cantonese variants; the banner and status wording is rendered from the watch's own state rather than from `COPY`, because it is a factual report of two build identities rather than product prose, and every string in it still passes through the personal-vocabulary replacement.\n\n**What this does not claim.** Nothing here has been driven in a real browser: no `fetch` has been made by a browser, no deploy has been observed raising the banner on a loaded page, and the whole feature is proved against its own extracted source, a recording page and a fake network, and no further. The pages-site inventory row therefore stays `unverified`: the implementation, its documentation, its localized copy and its local check all exist, and the two artifacts that need a running program — a built-artifact interaction record and a capture — do not.\n\n## Verification boundary (desktop)\n\nThe website's own boundary is stated at the end of the section above; this one is about the desktop updater and nothing else. That lane intentionally did not run tests, lint, type checks, builds, packaging, desktop launch, UI interaction, or screen captures. The final handoff records the exact packaged regression seam that still needs the cheap Lowlevel headless route: a packaged Windows build with a valid unpublished manifest, a complete newer release identity, a mismatched digest, a malformed manifest, a preserved `Later` state, a duplicate restart activation, a spawn failure, and a PBX draft count above zero.\n\n## Suggested articles\n\n[Update evidence](../evidence/automatic-updates.md), [In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [App display name](app-display-name.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/bounded-overlays",
      "category": "platform",
      "title": "Bounded, self-painting overlays",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "command-palette.md",
        "README.md"
      ],
      "body": "# Bounded, self-painting overlays\n\nEvery popover, menu, and tooltip paints its own background and elevation and stays fully inside the viewport, scrolling internally rather than clipping content.\n\n## Behavior\n\nOverlays are meant to never render transparent over whatever sits behind them, and to bound their height to the available space, scrolling their own content rather than silently truncating it.\n\n## Configuration\n\nAn overlay would never cover the control that opened it and would remain reachable and legible at every supported display scale.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's menus and popovers generally paint an opaque background and stay within the window, but have not been systematically verified against the viewport-bounding and internal-scroll requirements at every scale.\n\n**Documentation website:** Partial. The site has a small number of overlay elements, such as the command-palette filter overlay, that paint an opaque surface and stay within the viewport in ordinary use, but have not been stress-tested at extreme viewport sizes.\n\n## Failure modes\n\nAn overlay taller than the available viewport is meant to scroll its own content rather than clip the bottom entries silently out of view; this has not been verified as the actual behavior on either surface at extreme sizes.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [Command palette](command-palette.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/branch-integration",
      "category": "platform",
      "title": "Why forty-eight branches are still unmerged",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security considerations",
          "id": "security-considerations"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "unbound-controls.md"
      ],
      "body": "# Why forty-eight branches are still unmerged\n\nForty-eight branches sit beside `master`, none of them an ancestor of it, every one holding\ncommits that are not on the default branch. That looks like a backlog nobody has got round to.\nIt is not: it was measured on 2026-08-24, and the reason each group is still separate is\nrecorded here so the same afternoon is not spent again.\n\n## Behavior\n\nNothing is at risk. Every one of the forty-eight is byte-identical on the remote — checked\nbranch by branch with `git ls-remote`, not assumed — so the work exists in two places and\ncleanup can never be the thing that loses it.\n\nThe branches divide cleanly:\n\n| Group | Count | State |\n| --- | --- | --- |\n| Conflict on merge | 26 | `git merge-tree` reports conflicts against `master` |\n| Merge cleanly, tree does not build | 20 | merged into a scratch branch; 57 type errors |\n| Merge refused during the batch | 2 | conflicted against an earlier branch in the same batch |\n\nThe middle group is the interesting one, because \"merges cleanly\" reads as \"ready to land\" and\nis not the same claim at all. Git merging without conflict means no two branches touched the\nsame lines. It says nothing about whether the result compiles, and here it does not.\n\n## Configuration\n\nNothing here is configurable. Reproduce the measurement with:\n\n```\ngit merge-tree --write-tree origin/master <branch>\n```\n\nfor the conflict split, then merge the clean ones onto a scratch branch and run the ordinary\nbuild.\n\n## Failure modes\n\nThe 57 errors are not scattered noise. Twenty-six of them are TS2339 — a property that does\nnot exist — across thirteen files, which is the signature of two branches carrying different\nversions of the same API rather than of one broken file. Two smaller instances were fixed\nwhile measuring, and both had that same shape:\n\n- Three changelog articles arrived without a top-level `# Title`, which the documentation\n  bundler requires. Straightforward, and they only exist on those branches.\n- `applyVocabularyText` was changed on one branch to take a classified boundary\n  (`{ text, boundary }`) instead of a bare string, while a caller on another branch still\n  passed a string. The fix is not to pick a boundary and hard-code it: `transformText` serves\n  both what a person reads and what a screen reader announces, so the caller has to say which,\n  and `alt` is an accessible name despite carrying no `aria-` prefix.\n\nFixing the remaining fifty-odd would mean reconciling two API generations across other\nsessions' work, blind, in a console that configures a real telephone exchange. A tree that\ncompiles is not evidence that it still behaves; that is a project with its own verification,\nnot a step in a cleanup pass.\n\n**So none of them were deleted, and none were force-merged.** A tidy branch list is not worth\nlosing work, and an integration nobody verified is worse than an unmerged branch, because it\nlooks finished.\n\n## Security considerations\n\nNone specific. The usual rule applies with more force than usual here: never resolve a merge\nconflict in a configuration writer by picking whichever side compiles. A wrong Asterisk key\ndoes not fail loudly — it writes a line that looks correct and the exchange obeys it.\n\n## Verification\n\n`git merge-base --is-ancestor <branch> origin/master` is the proof that must pass before any\nbranch is removed. On 2026-08-24 it passed for none of them, which is exactly why the cleanup\nhalf of that pass deleted nothing.\n\n## Suggested articles\n\n[Controls that do not write to a file](unbound-controls.md).\n"
    },
    {
      "id": "platform/browser-extension-download-surfaces",
      "category": "platform",
      "title": "Browser-extension download capture surfaces",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "long-operation-progress.md",
        "README.md"
      ],
      "body": "# Browser-extension download capture surfaces\n\nA companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.\n\n## Behavior\n\nA Start-download window names the proposed file, source, and destination before anything transfers. Dedicated always-on-top Downloading and completion windows show live progress or the final observed outcome for the real transfer underway.\n\n## Configuration\n\nThe native destination picker or a persisted approved destination root supplies the destination. The privileged transfer manager records the original handoff, applies bounded header, body-idle, and total deadlines, streams into a unique adjacent temporary file, validates bytes, and publishes atomically. Range pause and resume are enabled only when the source supplies both byte-range support and a stable validator.\n\n## Current status\n\n**Desktop application:** Implemented as three explicit routes: `#surface=download/start`, `#surface=download/progress`, and `#surface=download/complete`. The packaged submission-only native-messaging host accepts an authenticated extension handoff, the privileged transfer manager persists it, and each surface reads real receipts or transfer snapshots. The companion extension itself is not shipped in this repository, so its browser-side capture remains an external integration input rather than simulated content.\n\nThe supported ingress is the packaged submission-only native-messaging host executable `Ding-PBX-Console-NativeMessagingHost.exe`, registered under the reverse-domain host name `com.dingdingprojects.asterisk.downloads`, with the shipped 32-character extension id `dnpkplcgjmipnndmghkhljjoefjhidab`. Chrome or Edge authenticates the sender through the manifest `allowed_origins` allowlist, the host repeats the exact extension id check, and the desktop named-pipe ingress accepts only one bounded `download-handoff` message after a protected per-installation challenge response. The pipe identity is random per installation, current-user scoped, and connection-capped. The primary shell shows the typed ready, unavailable, starting, or retry state and offers the first-run Register extension ingress action. Registration hot-reloads the listener and verifies the executable, manifest, config, digest, ACL, and Chrome plus Edge registry records. The ingress can submit a handoff and receive its receipt, but it exposes no transfer command, snapshot, queue, or credential operation. `register-native-host.ps1` verifies the executable and recorded SHA-256, writes the absolute install-resolved executable path, and registers both browsers, returning a typed receipt.\n\n**Documentation website:** Implemented as a browser-local handoff equivalent at `history.html`. When File System Access is available, a real local file is written to a user-selected destination in measured chunks, cancellation aborts the writable stream, and completion follows stream close. Unsupported browsers remain explicitly unavailable. This browser-local equivalent does not receive native-extension handoffs, own the desktop transfer queue, or create always-on-top windows.\n\n## Failure modes\n\nMalformed or non-HTTPS handoffs are refused before transfer. Mismatched replayed handoffs, unauthenticated ingress, non-absolute or unapproved destinations, lexical containment failures, symlink or reparse components, destination conflicts, header timeout, body-idle timeout, total timeout, missing source bodies, HTTP errors, cancellation, short responses, bounded-size violations, and transfer failures remain visible as typed failure or partial outcomes. The destination parent is checked again after directory creation immediately before the temporary open. Hosted mode reports the exact unavailable boundary.\n\n## Accessibility and localization\n\nThe desktop surfaces use semantic headings, status and alert regions, visible focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and an always-on-top window intent. This lane was not run through tests, builds, type checks, lint, runtime interaction, or captures. Copy remains host-localized work for a later lane, while bytes, timestamps, paths, URLs, and status values remain factual.\n\n## Verification\n\nVerification remains pending for the built desktop artifact and a real extension handoff. The implementation paths are `console/control-plane/download-transfer-manager.ts`, `console/shared/download-transfer.ts`, `console/app/renderer/src/download-start-surface.tsx`, `console/app/renderer/src/download-progress-surface.tsx`, `console/app/renderer/src/download-complete-surface.tsx`, `console/app/electron/main.ts`, and `console/app/electron/preload.ts`.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/browser-extension-download-surfaces-implementation",
      "category": "platform",
      "title": "Browser-extension download transfer surfaces",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Extension handoff contract",
          "id": "extension-handoff-contract"
        },
        {
          "title": "Window and accessibility intent",
          "id": "window-and-accessibility-intent"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "long-operation-progress.md",
        "in-context-recovery.md",
        "accessibility.md",
        "responsive-sizing.md"
      ],
      "body": "# Browser-extension download transfer surfaces\n\n## Behavior\n\nThis implementation adds three mount-ready renderer surfaces for a browser-extension handoff:\n\n1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.\n2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.\n3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.\n\n## Extension handoff contract\n\n`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.\n\nThe dedicated `Ding-PBX-Console-NativeMessagingHost.exe` submits a bounded handoff over the authenticated allowlisted extension origin and a random protected per-installation named pipe. `Ding-PBX-Console-NativeIngressBroker.exe` owns that pipe with a protected descriptor for only the current user and `SYSTEM`, verifies the effective pipe ACL before its ready handshake, caps active slots, rejects incomplete frames by deadline, and has a bounded startup handshake. Registration settles only after ready, error, or unavailable status. The desktop arms the secure-helper path only after every config, manifest, host, broker, and helper digest and ACL check passes. Any config, registration, ACL, digest, broker startup, broker shutdown, or hot-reload failure clears that helper path before publishing the failure state. Before any resume Range request, the manager requires the temporary file size to equal the recorded acknowledged byte count exactly. A larger or smaller file is refused with no Range request unless a future explicit recovery record authorizes normalization. Pause does not persist a new byte count until the helper has closed and the durable size has been reconciled, so a flushed but not yet processed acknowledgement cannot leave a paused snapshot behind the actual temporary file. If reconciliation fails, the snapshot emits `SECURE_TEMP_SIZE_RECONCILIATION_FAILED`, disables resume, and requires discard before another attempt. The host and broker are built by `build-native-host.ps1` through the supported MSVC path, with the supported MinGW fallback when MSVC is unavailable, and the script records separate digests after proving fresh binaries. `register-native-host.ps1` verifies each regular-file SHA-256, installs absolute manifest and broker paths for Chrome and Edge, creates the current-user challenge configuration, verifies protected inheritance plus exact allow rules, and returns a typed registration receipt. The host can submit only a `download-handoff` message and receive its receipt. It cannot issue transfer commands or read queue or snapshot state. The desktop boundary repeats the challenge, extension id, and complete handoff validation before opening the native picker or entering the durable queue. The transfer manager streams new and resumed bytes directly into a native handle created relative to the verified parent handle, without a path reopen. The helper emits cumulative size and write acknowledgements only after `WriteFile` and `FlushFileBuffers` completion, and its `--publish` operation opens the verified child with exclusive sharing, hashes and flushes that same handle, validates the expected size and digest, renames it parent-relatively with `NtSetInformationFile`, verifies final destination identity through the original renamed handle, and if that handle query fails closes it and compares the destination file identity through a compatible reopen. If neither proof establishes the original file identity, it returns `SECURE_TEMP_PUBLISH_AMBIGUOUS`; the manager emits `PUBLISH_AMBIGUOUS`, clears publication pending, disables automatic retry, and requires review. Initial and retry publication use that native operation on Windows, so the digest-to-rename race has no unverified replacement window. Publication runs in a cancellable child attached to the transfer task, and cancel or discard waits for confirmed process termination before cleanup and terminal state. After cancellation, the manager verifies that the destination is still absent and emits `DOWNLOAD_LATE_PUBLICATION_CONFLICT` if a late publish is observed. Header, body-idle, and total timeout kinds remain attached to the terminal typed timeout receipt even when the native helper fails during the same operation, with `TRANSFER_TIMEOUT_HEADER`, `TRANSFER_TIMEOUT_BODY_IDLE`, and `TRANSFER_TIMEOUT_TOTAL` codes. On helper interruption, the manager stats and reconciles the durable temporary size before retaining a partial or allowing resume. Cancellation and discard wait for the exact helper process to close before bounded sharing-violation delete retry, and keep a typed cleanup failure when removal cannot be confirmed. Hot reload waits for the previous broker close and refuses replacement readiness while the old broker remains. The preload supplies the dedicated-window client, while the primary shell offers only a passive open-window action and does not mount a second transfer route. File and network I/O remain in the privileged manager. Hosted mode returns an explicit unavailable receipt because it cannot accept a desktop extension handoff.\n\n## Window and accessibility intent\n\n`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` document the contract, while Electron creates dedicated BrowserWindows with `alwaysOnTop: true` for Start, Downloading, and Complete. Start is a blocking decision and returns focus to its originating window after cancel or close. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.\n\nLanguage and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.\n\n## Configuration\n\nNothing on this path is configured by editing a file by hand, and that is deliberate: every value\nbelow is either derived per installation or verified by digest, because a settable browser origin or\na settable pipe name is a settable way in.\n\n| What | Where it comes from |\n| --- | --- |\n| The native-messaging manifest Chrome and Edge read | written by `native-messaging/register-native-host.ps1`, with absolute host and broker paths, after verifying each regular file's SHA-256 |\n| The allowed extension identity | `native-messaging/extension-identity.json`, checked again at the desktop boundary rather than trusted from the message |\n| The manifest name and shape | `native-messaging/com.dingdingprojects.asterisk.downloads.json` |\n| The named pipe carrying a handoff | random per installation, with a protected descriptor allowing only the current user and `SYSTEM`; the broker verifies the effective ACL before its ready handshake |\n| The per-user challenge | created by the same registration script, with protected inheritance and exact allow rules |\n| The host and broker binaries | built by `native-messaging/build-native-host.ps1` through MSVC, falling back to MinGW when MSVC is absent, recording a separate digest per binary after proving the binaries are fresh |\n| Durable transfer state | `download-transfers.json` beneath the installation data directory |\n\nRegistration returns a typed receipt and settles only on ready, error or unavailable — never on a\ntimeout read as success. The secure-helper path is armed only after every config, manifest, host,\nbroker and helper digest and ACL check passes, and any later failure among them clears that path\nbefore the failure state is published, so a partly-verified helper is never left armed.\n\nHosted mode has nothing to configure here at all: it returns an explicit unavailable receipt, because\na hosted server cannot accept a desktop extension handoff.\n\n## Failure modes\n\nThe transfer manager stores `download-transfers.json` beneath the installation data directory, strictly validates every persisted snapshot field before accepting it, and reconciles interrupted queued, downloading, and paused states at startup. It streams the HTTPS response into a unique adjacent temporary file, validates the byte total, records the exact complete size and SHA-256 digest, then uses the shared bounded Windows rename helper to publish atomically. A body interruption is distinct from a full-body publication failure. A complete temporary file remains available for retry publication only after its recorded size and digest are revalidated, without requesting Range at EOF. Header, body-idle, and total deadlines have distinct timeout codes. Pause and resume use HTTP Range with a recorded ETag or Last-Modified validator, and controls remain disabled with the exact reason when the server cannot resume. Cancel, discard, and non-resumable failure remove temporary files unless a resumable partial or publication-pending state is retained. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success.\n\n## Verification\n\nThe lane that wrote this ran no tests, no build, no runtime interaction and no captures. Since then\nthe contract and the renderer surfaces are covered by the repository's own suites — `npm run\ntest:renderer` and `npm run test:contracts` for the typed boundary and the three surfaces, `npx tsc\n-b` for the types — and all of that is source-level.\n\nWhat has **not** been observed, and matters most on this path:\n\n- No browser extension has actually handed a download off. The three surfaces have never been driven\n  from a real extension, so the Start → Downloading → Complete sequence is proved against supplied\n  snapshots rather than against a real transfer.\n- The native host, the ingress broker and the secure temporary-file helper are C++ binaries built by\n  `build-native-host.ps1`; nothing here proves a built pair registered, handshook and published a\n  file on a real machine.\n- The always-on-top intent is declared in `DOWNLOAD_WINDOW_INTENTS` and applied by Electron's\n  `alwaysOnTop`. No capture shows those windows above a browser.\n\nThe inventory row stays `implemented-unverified` until a driven run produces those records.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).\n"
    },
    {
      "id": "platform/browser-style-tabs",
      "category": "platform",
      "title": "Browser-style tabbed navigation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "tab-groups-and-searches.md",
        "command-palette.md",
        "material-appearance.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# Browser-style tabbed navigation\n\nPresents application and settings content as discrete, navigable tabs rather than one long scrolling page.\n\n## Behavior\n\nEvery major surface, including settings, is meant to use a persistent tab strip, dockable to any screen edge, with overflow handling, reordering, and pinning, rather than a single scrolling column.\n\n## Configuration\n\nTabs would support keyboard navigation with correct roles and states, and the strip would collapse gracefully at narrow widths without clipping labels.\n\n## Current status\n\n**Desktop application:** Partial. A left navigation rail separates the app's screens, which gives some of the navigational benefit of tabs, but there is no true tab strip with overflow handling, reordering, pinning, or edge-docking choice.\n\n**Documentation website:** Partial. Every top-level page and composed article receives the same ARIA tablist with persisted left, right, top, and bottom docking. Left is the default, and side docking collapses to the compact header below 900px. Reordering, pinning, grouping, overflow management, and the four independent tab searches remain incomplete.\n\n## Failure modes\n\nWhen more tabs are open than the strip can show, the intended behavior is an overflow menu listing the rest rather than silently clipping the last tab off-screen; there is no tab strip yet to overflow.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Tab groups and tab search](tab-groups-and-searches.md), [Command palette](command-palette.md), [Material appearance system](material-appearance.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/built-in-authenticator",
      "category": "platform",
      "title": "Built-in authenticator",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "unlock-ladder.md",
        "../agent/secrets.md",
        "complete-exports.md",
        "README.md"
      ],
      "body": "# Built-in authenticator\n\nAn in-app TOTP authenticator for arbitrary accounts, so a user does not need a separate phone app.\n\n## Behavior\n\nA dedicated authenticator surface accepts an account by pasted `otpauth://` link, by reading a QR code, or by typing the secret and its parameters, then shows live rotating codes for every registered account, entirely offline and stored locally.\n\nTwo jobs share the word *pairing*, and they run in opposite directions. Keeping them apart is the whole reason this article is worth reading before changing anything here:\n\n- **Pairing out.** An application that owns a one-time-code factor of its own generates a secret and draws a QR code for the user's phone to scan. The QR is the application handing its secret *outward*.\n- **Pairing in.** The user brings a secret that some *other* service issued and keeps it in the authenticator. Here a QR code is something to *read*, not to draw, and the routes that matter are the ones that avoid retyping a base32 string by hand.\n\nAn authenticator surface is a pairing-in surface. Whether it also owes a QR *generator* depends entirely on whether the same product owns a one-time-code factor to hand out.\n\n## Configuration\n\nEach account carries its own issuer, account name, secret, hash algorithm, digit count, and period, and every one of those is stored as the account declared it rather than normalized to a default. An unsupported value is refused with the reason rather than replaced: a link naming an algorithm the surface cannot compute would otherwise be stored as SHA-1 and generate confident, permanently wrong codes with nothing on screen to say why they are refused.\n\nSecrets are kept apart from ordinary settings, in their own storage location, so that no settings snapshot, history entry, or ordinary export can carry one by accident. The ordinary account export writes the account and its parameters with the word `omitted` where the secret would be; a separate, separately confirmed export exists for the secrets themselves, so that a user can move accounts elsewhere rather than lose them.\n\n## Current status\n\n**Desktop application:** Partial, and wired. There is no standalone authenticator holding arbitrary third-party accounts, so the description above is still where this is going rather than where it is. What exists is real and reachable: the per-element lock offers three methods that include a one-time code, and choosing one reaches `pairAuth` in `App.tsx`, which generates a twenty-byte secret from the Web Crypto random source, encodes it with `totp.ts`'s own base32, builds a standard `otpauth://totp/` pairing URI, and reveals both as copyable text. `lockNext` refuses to finish a one-time-code lock until pairing has actually happened, so the stored record carries the real secret rather than a placeholder, and `tryUnlock` verifies a real RFC 6238 code with one step of skew.\n\nThat is a pairing-*out* flow, which is why it wants a QR and does not have one. Two gaps are deliberate rather than pending. The box beside **Pair the built-in authenticator** is a decorative gradient in the compiled design with no bound slot for pixel data, so the secret is offered as text to copy by hand and the copy says so rather than implying something scannable. And there is no confirmation-code re-entry before the secret is treated as paired, because that method's wizard panel has no digit entry of its own and borrowing the PIN keypad would overwrite a real PIN. The secret lives in the same in-memory lock record the PIN and passphrase already did, which is not the operating-system credential vault this article's contract asks for.\n\n**Documentation website:** Implemented, on 2026-08-26. The previous version of this line said \"Not implemented. The documentation website has no accounts of its own for an authenticator to pair with\", and that sentence was doing the work of an exemption while getting the direction backwards: an authenticator does not hold the *page's* accounts, it holds the reader's, and the page having no factor of its own is an argument about pairing out rather than about whether the feature belongs. It is quoted here rather than deleted, because the reasoning is the part worth not repeating.\n\nThe site carries a **Built-in authenticator** card in Settings holding the account list, its own search with an anchored regular-expression builder, the shared bulk-selection controls, and two dialogs: one to add an account and one for the secrets export. `site/app.js` implements RFC 6238 over RFC 4226 with Web Crypto, RFC 4648 base32, and `otpauth://` build and parse, ported from `app/renderer/src/totp.ts` so the two implementations cannot drift apart.\n\nRegistration accepts four routes: a pasted `otpauth://` link, a QR read from an image file, a QR read from the clipboard, and a QR read from the camera — plus manual entry of the secret and its parameters, which is not a fallback but the route somebody pairing an authenticator on the very device showing the QR has to use. The reading is done by the browser's own `BarcodeDetector`; several browsers ship none, and there each route is **removed** with the reason named rather than left as a button that cannot scan. A scan control that silently fails teaches the reader their code is unreadable rather than that their browser is.\n\nNothing on the site generates a QR code, and that is a decision rather than an omission. The site owns no one-time-code factor: no surface here is protected by one, so there is no secret of the site's to hand out, and a QR drawn here would pair a phone to a factor nobody can use. Writing a QR *encoder* would also mean carrying error-correction and block-structure tables from a specification this repository has no independent way to check itself against, and a QR that a phone cannot read is a pairing route that fails silently — worse than the absence it would be replacing.\n\n## Failure modes\n\nA clock skewed far enough that generated codes would be rejected everywhere is meant to be reported to the user in plain words. The desktop build detects nothing of the kind, so a skewed machine simply sees its codes refused with no explanation. The site cannot detect it either, and says so instead of leaving a silence: knowing the true time needs an outside source and this feature makes no request at all, so the card states plainly that a drifted clock is the first thing to check when every code from every account is refused.\n\nA code from an earlier step is refused rather than accepted late: verification allows one step of skew and no more, on both surfaces.\n\nA secret that cannot produce a code is refused at the moment it is entered rather than at the next sign-in. On the site an account is not stored until the page has actually computed a code from its secret, which catches a truncated or mistyped base32 string immediately. An optional cross-check goes further where the reader already holds the account elsewhere: type its current code and a mismatch refuses the save. Leaving that field empty saves the account and says, in the notification, exactly what was not checked.\n\nA stored record that no longer produces a code — a corrupt secret, an algorithm a later build stopped supporting — is dropped on load and **counted**, and the count is shown. An account whose codes can never work is worse on screen than absent, because it looks like the service's fault.\n\nRemoving an account deletes its secret, and the confirmation says so. There is no recovery: the secret was never sent anywhere and nothing here can give it back.\n\n## Accessibility and localization\n\nOn the site the code region announces on *change* rather than every second: the countdown is plain text updated silently, and a separate off-screen polite live region carries only \"new code for …\". A live region wrapped around the countdown would speak once a second forever, which is the fastest way to make a page unusable with a screen reader. The code is monospaced so grouped digits do not shift width as they change, the countdown is stated in seconds rather than as colour or a shrinking shape, every row control carries its own accessible name, and the row wraps rather than pushing its actions off the edge on a narrow screen. The card description ships all three language modes and both funny levels through `COPY.authenticatorDesc`; the voice moves with the slider while three facts never do — the secrets stay in the browser and nothing is sent anywhere, every code is computed on the page from the registered secret, and clearing the site's storage deletes them with no way back.\n\nOn the desktop it renders inside the per-element lock wizard and the unlock dialog rather than on a surface of its own, so it inherits whatever those offer; none of that is independently verified for this feature yet, and all its copy is fixed English.\n\n## Verification\n\n`tests/contracts/built-in-authenticator.test.mjs` holds the desktop wiring: that `pairAuth` generates a real random secret and a real pairing URI, that both are revealed as copyable text with copy that does not imply a scannable image, that `lockNext` refuses an unpaired one-time-code lock, and that `tryUnlock` verifies through `totp.ts` rather than waving the factor through. `tests/ui/totp.test.tsx` covers the primitives themselves.\n\n`site/tests/contracts/built-in-authenticator.test.mjs` runs the site's real extracted source against a recording page and a clock the test holds still. The arithmetic is checked against an outside authority rather than against itself: the published RFC 6238 vectors run for SHA-1, SHA-256 and SHA-512, at eight digits, across six widely separated instants — the same table the desktop renderer's own test holds, so the two implementations are measured against one external standard rather than against each other. Beyond that it covers the skew window in both directions, base32 strictness, every refusal an `otpauth://` link can earn, the capability sentence with and without a detector, the row's countdown and its next-code peek (the code the row promises as next really is the one that arrives), that a code change is announced exactly once and a moving countdown never is, that no history entry, notification or ordinary export carries a secret, and that the secrets export writes nothing until two independent keys and a full-travel slider all agree.\n\n`scripts/negative-built-in-authenticator-site.mjs` is what says that test would notice if it stopped: it plants one lie at a time, each of which must turn the contract red and then green again on restore.\n\nBeyond the source tree, the packaged desktop application has been driven and photographed. `scripts/ui-drive/lock-evidence.mjs` pairs an authenticator through the real wizard and records what the running application did, in `release/evidence/windows-console/built-in-authenticator.json` and `release/captures/windows-console/built-in-authenticator.png`. Three things that run establishes rather than asserts: pairing added no resource entry of any kind, so the secret really is generated locally and no network call is made; a code computed independently by that script, with Node's own crypto, from the revealed secret is accepted by the running application; and a code from three steps back is refused first, so acceptance is time-based rather than any six digits.\n\nThe record deliberately carries the secret's length and the pairing URI's other parameters rather than the secret itself, and the capture is taken with the revealed secret dismissed, because a real credential must not travel in a committed file or a committed picture. `scripts/built-interaction-evidence.mjs` refuses any record carrying a base32 run long enough to be one, and `scripts/negative-built-interaction-evidence.mjs` plants exactly that leak to prove the refusal works.\n\nNothing on the site has been opened in a browser for this feature. No real `BarcodeDetector` has decoded a real photograph here, no camera stream has been started, and no clipboard image has been read: those three routes are proved against a detector the test supplies and against the honest absence path, and no further. The pages-site row therefore stays `unverified` in `inventories/surface-completeness.json` — implementation, documentation, localized copy and a local check all exist, and the two artifacts that need a running program do not.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Complete exports](complete-exports.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/bulk-actions",
      "category": "platform",
      "title": "Bulk actions",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "destructive-action-confirmation.md",
        "README.md"
      ],
      "body": "# Bulk actions\n\nMulti-select and batch operations across every list, table, and collection in the product, with an honest preview before anything irreversible runs.\n\n## Behavior\n\nEvery list is meant to support multi-select (click, shift-click ranges, and a keyboard equivalent), an honestly scoped select-all, and the same actions available singly — delete, export, move, tag, and so on — offered in bulk with a reviewable count and preview.\n\n## Configuration\n\nA bulk action would be undoable through local version history where the underlying action normally is, and would never silently skip an item without reporting it.\n\n## Current status\n\n**Desktop application:** Not implemented. Every list in the desktop application (servers, recordings, and similar) is single-selection only, with no multi-select, select-all, or batch action available.\n\n**Documentation website:** Not implemented. The documentation website has no user-owned lists to act on in bulk.\n\n## Failure modes\n\nIf an item in a bulk batch cannot complete the action (a locked record, a permission error), the intended behavior is to report that item as skipped in the result summary rather than silently omit it; there is no bulk mechanism yet to test this against.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/changelog-viewer",
      "category": "platform",
      "title": "In-app changelog viewer",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "local-version-history.md",
        "complete-exports.md",
        "regex-builder.md",
        "status-hub.md",
        "../app/history.md",
        "README.md"
      ],
      "body": "# In-app changelog viewer\n\nA browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.\n\n## Behavior\n\nThe viewer lists every released version, newest first, with its release date and its changes grouped by category. Each change carries the real commit that made it, rendered as a short id linking to that commit in the repository. A date range and a text search narrow what is shown; they compose rather than override one another, so a search restricted to a week returns what that search found *within* that week. Whatever is on screen is what exports.\n\nThe content is a **factual external record**, and that distinction decides most of the design. Every other string these surfaces render is their own copy — restyled by the funny-level sliders, rewritten by a local personal-vocabulary file. A change summary is neither of those. It is what a release said, and a viewer that restyles it has stopped being a record of anything. So the funny-level copy reaches the description *around* the list and nothing inside it, and the list is held outside the vocabulary walker.\n\nThe data is real or it is absent. `scripts/bundle-changelog.mjs` builds the Markdown from this repository's own tags: every version heading is a real tag, every change line is a real commit reachable from that tag and not from the one before it, and every id is the real 40-character SHA. Nothing is authored by hand and nothing is invented to fill a gap.\n\n## Configuration\n\nNothing about the changelog is a stored setting except whether its search-and-date panel is expanded, which persists per visitor like every other collapsible on the site.\n\nThe description above the list follows the language mode and both funny-level sliders. The entries do not, deliberately and permanently — see above. Version numbers, dates, commit ids, the match counts and the stated range are facts and are exact at every setting.\n\n## Current status\n\n**Desktop application:** Partial. `App > Changelog` renders every version parsed from the build-time bundle, with plain-text and regular-expression search, a date range, copy and Markdown export, and per-change commit links. Its remaining gap, recorded in `app/feature-registry.json`, is that the date filter is typed ISO fields plus range presets rather than the full month-and-year-jump calendar grid the contract describes.\n\n*This line was corrected on 2026-08-26.* It previously read \"Not implemented. The desktop application has no in-app changelog viewer\", which had been false for some time: `app/renderer/src/changelog.ts`, `tests/ui/changelog.test.tsx` and `tests/ui/changelog-wired.test.tsx` were all present and the registry already recorded the screen as wired. The claim above is taken from that registry row and those tests; this pass did not independently drive the desktop application.\n\n**Documentation website:** Implemented. `downloads.html` carries a `CHANGELOG` section, reachable from the page's own section tabs, holding the description, a collapsible search-and-date panel and the version list.\n\nThe panel carries a search field with the site's anchored regular-expression builder beside it and its own plain-versus-regular-expression mode line; a preset select (every version, this calendar year, the last 90, 30 or 7 days); two native date fields; an export-format select filled from whichever formats the shared export engine judges suitable for the rows currently shown; and Export and Copy actions.\n\nTwo properties of the website version are worth stating because they are the parts that could have been faked. First, the two date bounds are native date fields, which is what supplies the calendar with its month and year jump, and what makes a half-typed date detectable: such a field reports an empty value and `validity.badInput`, so the code reports the problem inline and leaves the field alone rather than writing to it, and what the reader typed survives. Second, the exported file states its own range on every row. A single metadata row carrying different keys would make the whole set ragged, and five of the ten formats would then correctly report that as a real loss; a repeated column costs bytes and says the same thing in CSV, JSON and SQL alike.\n\n## Failure modes\n\n**A commit that no longer exists.** `site/build.mjs` hands every referenced id to a single `git cat-file --batch-check` before it will emit a link. Where it cannot establish that the commits are real, the history still ships and the repository URL is dropped, so every id renders as plain text with no link on it. That is deliberate rather than a shortcut: the promise is *never a dead link*, and emitting no link keeps it exactly, while failing the build would take an unrelated deploy down with it.\n\n**What a \"missing\" report is and is not evidence of — and the deploy this broke.** The first version of that check reasoned: git answered, git said missing, therefore the commit is gone, therefore fail the build. That is false in exactly the case CI runs in. `actions/checkout` clones one commit deep, so `cat-file` correctly reported all 26 referenced commits as absent *from that checkout*, and the Pages deploy died on a repository that has every one of them. Reproduced afterwards in a real one-commit clone, which failed identically.\n\nThe distinction the check needs is between *the repository has lost this commit* and *this clone never fetched it*, and `cat-file` alone cannot tell them apart. `git rev-parse --is-shallow-repository` can, so `changelogVerificationVerdict(missingCount, shallow)` is now a pure function with its own tests: nothing missing is `verified`; missing in a shallow clone, or in one whose depth git would not state, is `unverifiable` and drops the links with the reason printed; missing in a complete clone is `dead` and fails the build, because only then is it a claim about the repository rather than about a directory. An unknown depth is never read as a complete clone — an unknown is not a proof.\n\nThe Pages workflow checks out with `fetch-depth: 200` so the objects are actually present and the links ship. That is bounded rather than `0` because full history here is large and this job needs none of the rest of it; the last twenty release tags sit a few commits apart, so it is far more than enough, and if it ever were not, the build declines to link rather than failing. Both halves were verified against real clones at depth 1 and depth 200 rather than reasoned about.\n\nThe lesson worth carrying: 45 planted breaks went red and green before this shipped, and not one of them saw it, because every check was about the *shape* of the resolver — is the call there, does it throw somewhere, does it return an empty repository on the fallback paths — rather than about the judgement inside it. A guard that checks a function is called cannot check that what it concludes is true.\n\n**A malformed id anywhere else.** `changelogCommitUrl` refuses anything that is not exactly 40 hexadecimal characters, and refuses a repository that is not an `https` URL. It returns nothing rather than composing a URL out of what it was given.\n\n**A line that does not match the grammar.** It is counted and the count is reported above the list, rather than dropped in silence. A viewer showing half its input is otherwise indistinguishable from one reading a short release history. Two versions in the current real history carry `Release published; no new commits recorded against the previous tag.` — a real line, deliberately not a change entry — so they are counted there and their versions render with an honest \"no changes were recorded\" body instead of disappearing.\n\n**A build with no history.** The committed `site/app.js` ships both declarations empty, and a page served straight from the source directory says so plainly rather than showing a stale copy baked in months earlier. That message is distinct from the no-match message, so a build problem never reads as the reader's search being too narrow.\n\n**A range that cannot contain anything.** A \"from\" after its \"to\" is reported in words naming both dates, rather than rendering as an empty list that reads as \"there are no releases\".\n\n## Accessibility and localization\n\nEvery control in the panel has its own label, the section is labelled by its own heading, and the count, range and problem lines are live regions so a change in the filter is announced rather than only drawn. The commit id keeps a visible contrast ratio against the surface rather than being dimmed into decoration — it is the one part of an entry a reader can check for themselves. The entry header collapses from a row to a stack at narrow widths so a version and its date never overlap.\n\nThe description carries four English and four Cantonese variants, and every one of the eight states the two facts the viewer rests on: that each line carries the real commit, and that what is exported is what is on screen. A fact stated at some funny levels and not at others is a fact nobody can rely on. The section heading, the control labels and the count and range lines are still fixed English.\n\n## Verification\n\n`site/tests/contracts/changelog-viewer.test.mjs` — 44 tests. The behavioural half extracts the real functions from `site/app.js` and runs them against the **real generated release history**, not an invented fixture: a parser proved only against text written to suit it has been proved against nothing. It also extracts and runs `changelogVerificationVerdict` out of `site/build.mjs` across all four of its cases, and pins the site's three grammar regular expressions equal to the desktop renderer's, so the two cannot come to read one generated changelog differently.\n\n`scripts/negative-changelog-site.mjs` plants **51 breaks, one at a time**, each of which turns that file red and green again on restore.\n\nFour of them were found by the script rather than written from a plan, and all four are worth keeping in mind. Two were guards that could not see what they claimed to: an assertion that a control was wired was satisfied by the closure that merely *reads* that control's value, so deleting the search listener outright left everything green, and an assertion that the first render happens was satisfied by any of the handlers that also call it. One was a break that degraded safely rather than breaking anything — every failure path in `isShallowCheckout` returns `undefined`, and `undefined` already means \"cannot tell\", so a broken git invocation drops the links rather than doing anything wrong; it was replaced by the wiring break, which is the real defect. And one was the shallow-clone judgement above, which no shape-checking break could have reached.\n\nThe desktop application's own coverage is `tests/ui/changelog.test.tsx` and `tests/ui/changelog-wired.test.tsx`.\n\n## Suggested articles\n\n[Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Regex builder](regex-builder.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/collapsible-filters",
      "category": "platform",
      "title": "Collapsible filters and statistics",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "README.md"
      ],
      "body": "# Collapsible filters and statistics\n\nSearch bars, filter rows, and statistics panels that describe rather than change the current view start collapsed and can be reopened.\n\n## Behavior\n\nPurely descriptive controls, such as filter summaries and statistics panels, are meant to collapse by default, persist that collapsed state, and clearly indicate when a collapsed filter is still actively excluding results.\n\n## Configuration\n\nThe collapsed toggle would be keyboard-operable with a visible focus ring and be announced alongside its expanded or collapsed state.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's filter and statistics areas, where present, are always expanded; there is no collapse control.\n\n**Documentation website:** Partial. The site's article list has no filter or statistics row to collapse; the underlying collapse behavior exists in the settings-page overlay controls but has not been extended to a filter or statistics panel.\n\n## Failure modes\n\nA collapsed filter that is still silently excluding results without any visible indicator is the specific failure this feature exists to prevent; there is no filter panel on either surface yet to check that against.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/command-palette",
      "category": "platform",
      "title": "Command palette",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "browser-style-tabs.md",
        "README.md"
      ],
      "body": "# Command palette\n\nA `Ctrl+Shift+F`-activated global search that jumps directly to any command, setting, or destination in the product.\n\n## Behavior\n\nThe palette is meant to list every command, feature page, destination, and setting, and to teleport the user to the exact matching control rather than only its containing page.\n\n## Configuration\n\nResults would render as rich, interactive rows — a settings row with its actual live control inline — rather than plain text, in either a compact or a full-window view.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no command palette or global keyboard-activated search of any kind.\n\n**Documentation website:** Implemented for the shared shell. Every page responds to `Ctrl+Shift+F`, searches all top-level pages, direct composed article URLs, and exact shared controls, and opens a selected control with focus. Article results no longer depend on a paginated destination card being present.\n\n## Failure modes\n\nAn empty result says that no page, article, or control matched. The palette uses direct article paths instead of hash targets that can be absent from the current pagination page.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/complete-exports",
      "category": "platform",
      "title": "Complete data export",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "bulk-actions.md",
        "local-version-history.md",
        "README.md"
      ],
      "body": "# Complete data export\n\nEvery record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.\n\n## Behavior\n\nEvery list, document, log, and setting is meant to be exportable in an appropriate format — JSON, CSV, Markdown, and others depending on the data's shape — stating encoding and any fields a format cannot carry before the export runs.\n\n## Configuration\n\nExports would be complete and, where the shape allows it, re-importable, rather than a partial dump of only the currently visible rows.\n\n## Current status\n\n**Desktop application:** Not implemented. No list, record, or setting anywhere in the desktop application can currently be exported to a file.\n\n**Documentation website:** Implemented for current site-owned records. Documentation results and selected notifications use every suitable structured or tabular format. Shared site-state export includes every persisted setting and notification in JSON, and explicitly names omitted personal-vocabulary data, source metadata, and custom-logo bytes.\n\n## Failure modes\n\nFormats that cannot faithfully carry nested values are removed from the applicable picker, and remaining loss notes appear before export. Privacy-bound payloads are omitted only with an explicit field in the exported file describing the omission.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/completeness-matrix",
      "category": "platform",
      "title": "Completeness matrix",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "offline-documentation-browser.md",
        "changelog-viewer.md",
        "status-hub.md",
        "README.md"
      ],
      "body": "# Completeness matrix\n\nThe completeness matrix is the hand-written record of the product contracts that every user-facing surface must carry. It is independent from source discovery, so a feature or page that disappears from the code cannot disappear from the inventory at the same time.\n\n## Behavior\n\n`console/inventories/surface-completeness.json` uses schema version 2. It records 44 canonical features and 143 addressable surfaces: the desktop shell, login and setup routes, 32 desktop destinations, 17 desktop overlay states, six top-level site pages, 82 generated documentation routes, and the three browser-extension download states. Every surface has one row for every canonical feature.\n\nEach row records the status (`absent`, `partial`, `implemented-unverified`, or `verified`), demo state, source provenance, sample-data declaration, implementation paths and symbols, registration paths and symbols, deterministic route, documentation, localization, persistence, focused checks, negative regression evidence, built-artifact interaction evidence, current-commit captures, and the design-parity tuple.\n\n## Configuration\n\nThe canonical feature and requirement arrays are literal data in the matrix generator and checked-in JSON. The generator does not scan source files, infer routes, or infer features. The two surface registries point back to the canonical matrix and preserve exact implementation notes and symbols for the desktop and site surfaces. Converter and Ollama requirements remain present on every surface. There are no exemptions.\n\n## Failure modes\n\nThe validator fails when a canonical feature, page, route, or row disappears; when a symbol is renamed or commented out; when a verified evidence commit is stale; when a required artifact is missing; when a route is supported only by prose; when a status claims success without all evidence; or when sample data is marked as provenance. Symbol matching uses exact declaration or registration boundaries, not substring presence.\n\n## Security and privacy\n\nThe matrix contains paths, symbols, routes, statuses, and evidence references only. It contains no credentials, private user data, call content, personal vocabulary values, or captured PBX configuration. Evidence references are claims about artifacts, not artifacts themselves. A row cannot become verified by changing its status string.\n\n## Verification\n\nThe focused validator is `console/scripts/verify-inventories.mjs`. The deliberate regression is `console/scripts/negative-surface-completeness.mjs`, with a companion evidence-claim regression in `console/scripts/negative-evidence-claims.mjs`. The current ultra-speed delivery boundary did not run these validators, tests, or captures, so all evidence that was not already present remains explicitly unverified. A later verification pass must run the validators against the exact integrated commit, observe every deliberate break turn red, restore the matrix, and observe green before changing any row to `verified`.\n\n## Suggested articles\n\n[Design parity](../../design/inventory.json), [Offline documentation browser](offline-documentation-browser.md), [Changelog viewer](changelog-viewer.md), [Status Hub](status-hub.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/context-menu-shortcuts",
      "category": "platform",
      "title": "Right-click menus show keyboard shortcuts",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "The pages-site",
          "id": "the-pages-site"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "regex-builder.md",
        "bounded-overlays.md",
        "per-element-toy-locks.md",
        "README.md"
      ],
      "body": "# Right-click menus show keyboard shortcuts\n\nEvery context-menu item that has a keyboard shortcut displays it, right-aligned, in the platform's own notation.\n\n## Behavior\n\nA context menu is meant to show each item's real, currently-working keyboard shortcut beside its label, derived from the same source that registers the binding, never a guessed or stale one.\n\n## Configuration\n\nShortcuts are exposed to assistive technology as shortcuts, not as decorative trailing text.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's right-click menus, where they exist, do not display keyboard shortcuts beside their items.\n\n**Documentation website:** Implemented. See the section below.\n\n## The pages-site\n\nThe published site ships a real right-click menu on every rendered element, and the shortcut column is derived from the binding rather than written beside it.\n\n### One table, both halves\n\n`MENU_ACTIONS` in `site/app.js` declares every action once. Each entry carries a `chord` object, and that same object is read twice: `chordLabel()` turns it into the string printed in the menu, and `chordMatches()` compares it against a real keyboard event in the one live `keydown` handler. There is no second place where a shortcut is spelled out, so the label cannot drift from the binding: an item's `shortcut` field is computed from `action.chord` at the moment the menu is built, and the contract test asserts the item carries that same object rather than a copy of it.\n\nAn action with no shortcut prints nothing. Padding the column with a placeholder would be worse than the empty space.\n\n### Which chords a page may actually claim\n\nA page does not get first refusal on the keyboard. `Ctrl+Shift+N` opens a private window, `Ctrl+Shift+C` opens the element picker, `Ctrl+Shift+R` is a cache-bypassing reload; a page that binds one of those prints a shortcut its own handler will never see, which is exactly the lie this feature exists to prevent. `RESERVED_CHORDS` records that set with the claimant named against each one, and no action may sit on a reserved chord.\n\nThat is why the site's own chords are `Alt+Shift+<key>`. There is one remaining collision on that pair: **Firefox activates access keys with Alt+Shift**, so an `accesskey` declared anywhere on the site would fire on the same keystroke as one of these actions. No page declares one, and a test asserts that absence rather than a comment hoping somebody remembers.\n\n`Ctrl+Shift+F` is a special case. The command palette's binding lives in `initNavigation()` and is covered by the command-palette contract; running it a second time would call `showModal()` on an already-open dialog and throw. So the menu **prints** that chord and the menu's own dispatcher deliberately excludes it. The two halves are held together by a test that lifts the literal condition out of `initNavigation()` and *runs* it against the chord the menu prints.\n\n### Reaching the menu\n\n- **Pointer:** an ordinary right-click, through one `contextmenu` listener on `document`, so every rendered element genuinely has a menu, rather than a list of selectors that is correct on the day it is written.\n- **Keyboard:** `Shift+F10` or the Menu key, anchored to whatever has focus.\n- **Touch and pen:** a long press, cancelled by a finger that moves more than a few pixels.\n- **`Shift`+right-click passes straight through to the browser's own menu.** A page that takes the context menu away entirely takes away \"copy image\", \"search for this\", \"view source\", and the reader's only escape hatch when this menu is the wrong menu.\n\n### The filter, and what filtering may not do\n\nEach menu carries its own filter field with its own anchored regular-expression builder, keyed to `context-menu-search` so its pattern can never be another field's. Plain text remains the default; the builder is the explicit opt-in, exactly as on every other search field on this site.\n\nFiltering narrows and does nothing else. It preserves source order, hands back the same item objects rather than copies, and never rewrites a label or re-points an action. One further rule matters more than it looks: **while the menu is open, an item the filter has hidden stops being reachable by its shortcut.** Otherwise typing three letters could leave a destructive action invisible on screen and live on the keyboard.\n\nEscape clears the filter on the first press and closes the menu on the second, returning focus to the element the menu was opened from.\n\n### What the menu cannot do, said out loud\n\nTwo entries are permanently unavailable, and each names the registry row that records why:\n\n- **Lock this element…**: this site ships no per-element lock; `per-element-toy-locks` is recorded `absent` in `site/feature-registry.json`.\n- **Edit this element's appearance…**: this site has no per-element appearance editor; `material-appearance` is recorded `partial`.\n\nBoth are offered rather than omitted, because the canonical contract asks every menu for them and a menu that quietly left them out would look complete while being two items short. Neither can be activated: `unavailable` takes no argument at all, so there is no page, element or state that could turn either one on, and both the click route and the chord route refuse a disabled item.\n\nEvery other unavailable item names its own unmet condition too (\"this page does not carry the notification centre; it is on the home and settings pages\"), because a disabled control with no explanation reads as broken rather than as blocked.\n\nThe destructive **Reset this site's settings…** carries no shortcut at all, and routes through the existing two-key confirmation gate by clicking the control that opens it, rather than calling the reset directly.\n\n### Naming an element\n\nThe menu titles itself after the element it was opened on, and an element named only by an icon gets no name rather than being called by its glyph. A leading run of symbols is stripped, so a card reading `▣ Dashboard` is called \"Dashboard\". This is not fussiness: an icon font puts its glyph name into `textContent`, and a driver in this repository once recorded a control called `backspaceDelete last` for exactly that reason.\n\n## Failure modes\n\nA displayed shortcut that no longer matches the actual binding is the specific failure this feature exists to prevent, and on this surface it cannot happen through drift, because both halves read one object. It can still happen two other ways, and both are guarded: an action bound to a chord the browser claims first (checked against `RESERVED_CHORDS`), and an `accesskey` appearing on a page and stealing the Alt+Shift pair (checked across all six pages).\n\nA menu placed outside the viewport, or one whose `max-height` is not paired with `overflow:auto`, silently deletes whatever falls past the edge with no scrollbar to say anything is missing. `clampMenuPosition()` is pure and returns the box plus whether it flipped and whether it scrolls, so both properties can be asked rather than eyeballed.\n\n## Accessibility and localization\n\nThe list is a `listbox` of `option`s; unavailable items carry `aria-disabled` and a visible reason. A shortcut is exposed through `aria-keyshortcuts` in that attribute's own grammar (`Control+Alt+Shift+L`, never the platform glyph), and the visible `<kbd>`-style chip beside it is `aria-hidden` so it is not read out twice. Arrow keys move an active option through `aria-activedescendant`; Enter runs it. The result count and the keyboard hint are both polite live regions. Rows and the builder trigger meet the site's own `--touch` target size, and the menu carries no motion beyond a short fade, which the site's low-stimulation setting and `prefers-reduced-motion` both remove.\n\nTwo copy keys are localized: `contextMenuHint` (the keyboard-route footer) and `contextMenuNoMatch` (the empty-filter state), each with four English and four Cantonese variants across the funny-level range. Item labels, unavailability reasons, the result count and every printed chord render from the action table and the platform instead, so they are English at every level. That is deliberate: a shortcut is a key to press, and translating `Alt+Shift+L` would be translating a fact.\n\n## Verification\n\n`site/tests/contracts/context-menu-shortcuts.test.mjs` extracts the whole feature block from `site/app.js` and runs it against a recording page, a fake clipboard and a fake timer. It checks the derivation directly (every item's printed shortcut is `chordLabel(action.chord)`, and every printed chord dispatches exactly its own item), the reserved-chord refusal, the absence of `accesskey`, the evaluated agreement with `initNavigation()`'s literal palette condition, the filter's order-and-identity preservation, the hidden-item shortcut suppression, the position clamping, and the keyboard and assistive-technology behavior. `scripts/negative-context-menu-site.mjs` plants deliberate breaks one at a time and requires each one to turn that suite red and green again on restore.\n\n**Nothing here has been driven in a real browser.** No chord has been pressed, no right-click has been made, no long press has been held, and no screen reader has read one of these options aloud. The behavior is proved against the real extracted source over a recording DOM, and no further.\n\n**Desktop application:** no automated test currently exercises this feature there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Regex builder](regex-builder.md), [Bounded overlays](bounded-overlays.md), [Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/desktop-settings-runtime",
      "category": "platform",
      "title": "Desktop settings runtime",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Integration API",
          "id": "integration-api"
        },
        {
          "title": "Personal vocabulary",
          "id": "personal-vocabulary"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "school-mode.md",
        "narration.md",
        "scheduled-settings.md",
        "personal-vocabulary-upload.md"
      ],
      "body": "# Desktop settings runtime\n\nThe desktop settings runtime provides one validated local state contract for language, tone, dialog decoration, renamed School mode, attention-support modes, narration, display naming, and scheduled overrides.\n\n## Behavior\n\nSettings use schema version 1 from `console/shared/settings-schema.ts`. A fresh profile starts with English, both funny levels at 5, dialog emojis enabled, School mode off, every attention-support mode off, narration off, the shipped display name, dark theme, comfortable density, the shipped accent and font, normal scale and weight, and motion enabled. The package identity remains the constant `com.dingdingprojects.ding-pbx-console` regardless of the chosen display name.\n\n`SettingsStore` validates every stored record during hydration and every proposed record before writing. Missing data uses documented defaults. Invalid or stale data is removed and reported through `recoveryReason`; it is never partially applied. Subscribers receive immutable snapshots after hydration, a successful update, a reset, or a storage event from another renderer.\n\n`RendererSettingsRuntime` adds schedule evaluation, School-mode projection, personal-vocabulary application, and narrator mounting. Schedule rules use an IANA timezone, optional date bounds, a local time window, weekdays, deterministic priority, and stable list ordering. Equal start and end times mean a full day. Cross-midnight windows belong to the day on which they begin. External rules remain inactive until the privileged source reader supplies an explicit active state.\n\nWhen School mode is enabled, the effective projection forces English and English narration, reports Cantonese, funny-level controls, personal vocabulary, and dim-sum behavior as unavailable, and leaves the user's stored choices untouched for restoration when the mode is disabled.\n\n## Configuration\n\nThere is no configuration file. A fresh profile is whatever `defaultDesktopSettings()` returns\n(`console/shared/settings-schema.ts:155`), and everything after that is a validated write through\n`SettingsStore`. The shipped values are:\n\n| Group | Value on a fresh profile |\n| --- | --- |\n| `language` | `mode: 'english'`, `englishFunnyLevel: 5`, `cantoneseFunnyLevel: 5`, `showDialogEmojis: true` |\n| `schoolMode` | `enabled: false`, `displayName: 'School mode'` |\n| `attention` | all five modes `false`, `nextAction: ''` — accommodations, off until asked for |\n| `narration` | `enabled: false`, `language: 'en'`, rate and pitch `1` on both the `en` and `zh` channels |\n| `displayName` | `'Ding PBX Console'` |\n| `appearance` | `theme: 'dark'`, `density: 'comfortable'`, `accentColor: '#6750A4'`, `fontFamily: 'Roboto'`, `fontScale: 1`, `fontWeight: 400`, `motion: true` |\n| `schedule` | this machine's own IANA zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `UTC`, and no rules |\n\nTwo bounds are compiled in rather than settable: `MAX_SCHEDULE_RULES = 128` and\n`MAX_ASSIGNMENTS_PER_RULE = 32` (`settings-schema.ts:8-9`). A record declaring any `version` other\nthan `SETTINGS_SCHEMA_VERSION` (`1`) is refused whole with `unsupported settings version …` rather\nthan partly read.\n\n`STABLE_APPLICATION_ID` is `com.dingdingprojects.ding-pbx-console` and is **not** derived from\n`displayName`. That separation is the whole reason renaming the application is safe: the display name\nis a setting, the identity is a constant, and a rename therefore cannot move the profile directory\nthe settings themselves live in.\n\n## Integration API\n\nThe application integration point is `console/app/renderer/src/settings/index.ts`.\n\n```ts\nconst settings = browserSettingsRuntime()\n\nsettings.hydrate()\nconst unsubscribe = settings.subscribe((snapshot) => render(snapshot))\nsettings.update((draft) => { draft.language.mode = 'bilingual' })\nsettings.applyVocabularyText({ text: label, boundary: 'user-interface-copy' })\nsettings.mountNarration(speechEngine)\nsettings.queueNarration('connection', { en: englishText, zh: cantoneseText })\n```\n\nThe runtime also exposes `snapshot()`, `reset()`, `provenance(target)`, `setScheduleSourceState()`, `tick()`, `narrationVoices()`, `narrationStatus()`, `narrationQueueStatus()`, `setScreenReaderActive()`, `setQuiet()`, `unmountNarration()`, and `dispose()`.\n\nEach scheduled target reports whether its current value came from compiled defaults, validated local storage, a schedule rule, or School-mode suppression. Effective appearance values are part of the snapshot and also remain exposed through `scheduledOverrides` for the separately owned appearance subsystem to consume.\n\n## Personal vocabulary\n\nThe accepted file has one canonical shape: a version of 1 and a `replacements` array containing only `from` and `to` strings. Validation rejects oversized input, excessive nesting, too many entries, unknown fields, unsafe keys, duplicate JSON object keys, duplicate source terms, invalid versions, and bounded-string violations. The cache is revalidated before every application. Invalid uploads never replace the last valid cache, and clearing the cache immediately restores original wording.\n\nReplacement is available only through an explicitly classified private user-interface-copy or accessible-name boundary. Commands, URLs, identifiers, code, paths, logs, exports, history, diagnostics, provider-authored text, and public records must not pass through that API. No mapping, payload, source filename, or source path ships in this repository.\n\n## Failure modes and security\n\n- A storage read or validation failure activates defaults and reports the exact recovery reason.\n- A privacy context that refuses access to browser storage uses one guarded probe, then gives settings and personal vocabulary the same memory-only store. Snapshots report `session-memory` provenance and the reason values will not survive restart.\n- A storage write failure leaves the previous settings active and returns a failed update result.\n- An external schedule source has no effect until its privileged reader reports a current true state.\n- Missing speech support leaves narration unmounted. Voice enumeration then returns an empty list and queue attempts return `false`.\n- A removed selected voice remains selected in stored settings while runtime status reports the actual fallback or lack of a usable voice.\n- Speech failures are retained in queue status and do not block the application or later queued lines.\n- Secrets are not part of the settings schema. Home Assistant rules store only a credential-vault account key, never credential material.\n\n## Configuration\n\nEvery value here is the reader's own, and the fresh-profile defaults in **Behavior** above\nare what a new install starts from rather than a table anybody has to set. What can be\nchanged, and what deliberately cannot:\n\n- **Language mode, both funny levels, dialog emojis, School mode, each attention-support\n  mode, narration, the display name, theme, density, accent, font, scale, weight and\n  motion** are all part of the schema-version-1 record and are written through\n  `update()`, which validates the whole proposed record before it replaces the stored one.\n- **Schedule rules** carry an IANA timezone, optional date bounds, a local time window,\n  weekdays and a deterministic priority. Equal start and end times mean a full day, and a\n  window crossing midnight belongs to the day it begins on -- both stated so neither has to\n  be guessed from behaviour.\n- **An external rule's active state** is not a setting at all: it stays inactive until the\n  privileged source reader supplies an explicit true, so an unreachable source leaves the\n  local value in place rather than flipping it.\n- **The personal-vocabulary file**, supplied by the reader and revalidated before every\n  application. No mapping, payload, filename or path ships in this repository.\n\nTwo things are constants rather than settings, and the distinction is load-bearing. The\npackage identity stays `com.dingdingprojects.ding-pbx-console` whatever display name is\nchosen, so renaming the console cannot orphan its stored profile. And no secret is part of\nthe schema: a Home Assistant rule stores a credential-vault account key, never credential\nmaterial.\n\n## Verification\n\nThe settings core and public integration functions exist, but the desktop shell does not yet construct the store, subscribe to runtime snapshots, route rendered text through the vocabulary boundary, mount a platform speech engine, or apply appearance overrides. Those seams belong to the application wiring change. Until that wiring lands, these settings do not change the visible desktop interface.\n\n## Verification\n\nThe lane that wrote this runtime ran nothing: no tests, no type checking, no build, no packaging, no\ninterface interaction, no captures. That is stated here rather than implied, because the section\nabove describes an API in the present tense and a reader is entitled to know how much of it has been\nwatched working.\n\nWhat has since been run against it, and what has not:\n\n- The schema, its defaults and its validation are exercised by the repository's renderer suite\n  (`npm run test:renderer`) and its type check (`npx tsc -b`). Both are source-level checks.\n- The desktop shell wiring described under **Current integration state** is still absent, so no test\n  can prove the visible interface follows these settings, because nothing yet reads them.\n- No built-artifact interaction record and no capture exist for this article. The inventory row is\n  `implemented-unverified` and stays that way until a run of the packaged application produces one.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Spoken narration](narration.md), [Scheduled settings](scheduled-settings.md), and [Personal vocabulary upload](personal-vocabulary-upload.md).\n"
    },
    {
      "id": "platform/destination-deep-links",
      "category": "platform",
      "title": "Destination deep links",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "browser-style-tabs.md",
        "app-display-name.md",
        "README.md"
      ],
      "body": "# Destination deep links\n\nA link of the form `ding-pbx://destination/<id>` opens that screen in the console.\n\n```\nding-pbx://destination/queues\nding-pbx://destination/endpoints?state=default&theme=dark&width=1440&height=1000&scale=1\n```\n\n## Behavior\n\nThe design-parity evidence maps each of the thirty-two audited destinations to three things: a\nreference route into the design harness, a **product route** into this application, and a built\ncapture. Two of those three were real. The product route was a string committed in\n`inventories/design-parity.json` and in `design-reference/capture-manifest.generated.json` that\nnothing in `app/` resolved: no scheme was registered, no command-line argument was read, and a\nlink would have opened a second copy of the console on the dashboard, if it opened anything at\nall. The inventory said so, in a sentence nobody had to read in order to use the file. That is\nthe shape of defect this project keeps meeting: wired at one end and consumed at neither. It\nships silently, because every file involved looks correct on its own.\n\nIt resolves now. A route arriving from the operating system (on the command line that started\nthe console, or as an activation delivered to the console already running) opens the\ndestination it names.\n\n| Part | Where |\n| --- | --- |\n| The route is spelled, parsed and refused | `console/shared/destination-route.ts` |\n| A route is held until the renderer can take it | `console/app/electron/deep-link.ts` |\n| The scheme is registered; the command line and second-instance activations are read | `console/app/electron/main.ts` |\n| The bridge the renderer subscribes to | `console/app/electron/preload.cjs` |\n| The id is resolved against the compiled catalogue and the screen is opened | `console/app/renderer/src/App.tsx` |\n\nParsing and resolving are deliberately two functions. The main process must decide whether an\nargument is a route at all, long before there is a renderer, and so that an arbitrary\n`http://` or `file://` argument on the command line can never be treated as a navigation\ninstruction. Only the renderer can decide whether the id names a destination, because the\ncatalogue is compiled into the renderer bundle and the main process holds no copy of it.\n\n## Configuration\n\nThere is nothing to configure, and that is deliberate. The scheme is fixed, the association is\nregistered for the current user on first run (`HKCU\\Software\\Classes` on Windows, through\nElectron's `setAsDefaultProtocolClient`), and a route carries no option that changes the\nconsole's settings.\n\n**The application acts on the destination, and nothing else.** `state`, `theme`, `width`,\n`height` and `scale` are parsed and validated, so a malformed route is refused whole rather than\nhalf-applied, because a route that navigated and then quietly ignored `width=nonsense` would be\nreporting success for a string it did not understand. They are then not applied. A link that\nresized somebody's window or flipped their theme would be a link that edited their settings, and\nthe person who followed it asked to go to a screen.\n\nThose fields exist in the route because the parity evidence it was written for compares two\nrenders at one screen, state, theme, viewport and scale. `DESTINATION_ROUTE_APPLIES` records\nwhich of them the product acts on, and a test asserts its exact contents, so widening it is a\ndecision somebody has to make on purpose rather than a line that slides in.\n\n## Failure modes\n\n- **An unknown destination.** The console says which id it does not have and navigates nowhere.\n  Nothing falls back to the dashboard: a link that quietly lands somewhere else is\n  indistinguishable from one that worked, and the person who followed it has no reason to doubt\n  the screen in front of them.\n- **A differently-cased id.** Refused rather than folded to lowercase. Two spellings of one\n  route are two routes as far as a log, a bookmark or a piece of evidence is concerned, and only\n  one of them would ever be the one written down.\n- **A scheme that merely starts the same way.** `ding-pbx-evil://destination/dash` is refused;\n  the scheme is compared exactly rather than by prefix.\n- **The opaque spelling `ding-pbx:destination/dash`.** Refused. It parses as a URL, carries no\n  authority component, and would have to be un-picked from the path; one canonical spelling is\n  what lets a recorded route and an accepted route be compared as strings.\n- **A route arriving before the window exists.** Held, and delivered when the page reports\n  `did-finish-load`. Two routes arriving in that window leave the newest, because the person\n  asked twice and meant the second answer. A later argument that is *not* a route does not\n  discard the one being held.\n- **A route arriving at an already-running console.** The single-instance lock is what makes\n  this possible at all: without it the operating system launches a second console, which cannot\n  see the first one's window and so cannot navigate it. The lock is taken after the Squirrel\n  install/update/uninstall branch, which runs as its own short-lived process and must never be\n  refused for a running console holding the lock.\n- **No deep-link bridge at all.** The hosted HTTP surface has no registered protocol client, so\n  the renderer subscribes to nothing there rather than pretending to listen.\n\nNothing crossing this boundary reaches a shell, a file path or the control plane: the widest\nthing a route can say is which of the console's own destinations to open, and an id that is not\nin the compiled catalogue opens nothing.\n\n## Verification\n\n- `console/tests/control-plane/destination-route.test.ts` covers the parser, the holding router,\n  and the committed mapping: every route recorded in the inventory is handed to the parser the\n  application uses and must resolve to that row's own destination.\n- `console/tests/ui/destination-route-wired.test.tsx`: the real `App`, driven: a delivered\n  route opens the screen *and* its rail, an unknown one says so and moves nothing, and the\n  listener is dropped on unmount.\n- `console/scripts/destination-route-wiring.mjs`: twelve whole-line anchors across the\n  renderer, the main process and both preloads. Whole-line, because a needle for\n  `listenForDestinationRoutes()` is satisfied by `// this.listenForDestinationRoutes();`, which\n  is how a wiring line usually dies.\n- `console/scripts/negative-destination-route.mjs`: fifteen inventory lies and twelve\n  commented-out wiring lines, each planted alone, each required to go red and then green again.\n\n**What is not claimed.** The committed built captures were not retaken through this route: they\nare the same captures the recorded parity run produced, driven to each destination through the\nsame rail-then-section clicks the reference side performs, and nothing here re-photographs a\nscreen. Nor has a link been followed on a real desktop: the parser, the holding router, the\nrenderer's navigation and the presence of every wiring line are proved, while the main process's\nown registration is proved only to be present in the source, because driving it needs a real\nElectron `app`, a real registered scheme, and a real operating system to hand it a link.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Browser-style tabbed navigation](browser-style-tabs.md),\n[App display name](app-display-name.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/destructive-action-confirmation",
      "category": "platform",
      "title": "Destructive-action super confirmation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "local-version-history.md",
        "bulk-actions.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Destructive-action super confirmation\n\nA deliberately hard-to-trigger-by-accident confirmation gate for irreversible actions, requiring two independent keys plus a full-range slider.\n\n## Behavior\n\nBefore an irreversible action proceeds, the gate is meant to name the exact affected data, require two independently operated key controls, and only then allow a full-range confirmation slider, with an always-available emergency exit.\n\n## Configuration\n\nThe gate would anchor beside the triggering control where the layout allows it and remain fully keyboard-operable.\n\n## Current status\n\n**Desktop application:** Partial. Destructive actions use a single confirmation step (click or checkbox), not the two-key-plus-slider gate, and there is no dedicated emergency-exit control.\n\n**Documentation website:** Not implemented. The documentation website performs no destructive actions of its own.\n\n## Failure modes\n\nCancelling at any point (including through the emergency exit) is meant to leave the target data completely untouched; the existing single-step confirmation on the desktop app does support a plain cancel today, which is the one part of this contract already met.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Local version history](local-version-history.md), [Bulk actions](bulk-actions.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/dialog-emojis",
      "category": "platform",
      "title": "Dialog emoji toggle",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "non-blocking-notifications.md",
        "funny-levels.md",
        "language-modes.md",
        "accessibility.md",
        "README.md"
      ],
      "body": "# Dialog emoji toggle\n\nA persisted on/off switch controlling whether dialogs and message boxes show a decorative emoji alongside their factual text.\n\n## Behavior\n\nWhen enabled, each dialog and each message box carries one relevant, non-semantic emoji beside its heading. When disabled, the same copy appears with no emoji at all — not a blank space where one used to be, and not a reworded sentence. The wording is identical in both states, which is the property the whole feature rests on: an emoji that carried a fact would be a fact only some people can see, and it would disappear the moment somebody turned the switch off.\n\nThe switch never adds an emoji to a button, an action label, a field label, an accessible name, an option, or any other control text. A control is read aloud by its own text, so a decorative glyph sitting inside one is noise the listener cannot switch off from where they are.\n\n## Configuration\n\nOne checkbox in settings, labelled **Show emojis in dialogs and message boxes**, controlling every dialog at once. It is off by default, so nobody who never touches it sees a change. The choice persists locally and is applied on load, so it survives a reload.\n\n## Current status\n\n**Desktop application:** Not implemented. No toggle exists and no dialog in the product currently carries an emoji.\n\n**Documentation website:** Implemented, in `site/settings.html`, `site/app.js` and `site/styles.css`. The card is an APPEARANCE card holding the labelled checkbox (`#dialog-emojis`), a funny-level description and a live status line that says what the switch is currently doing and, when it is off, how many dialogs turning it on would decorate.\n\n`DIALOG_EMOJI_DECORATIONS` in `site/app.js` names the decorated surfaces — the command palette, the regular-expression builder, the notification centre, the local history dialog, the reset-settings gate, and the inline dismissal alertdialog inside the notification centre — each with its own glyph. Message boxes (the toasts raised by `notify()`) get a single glyph, because a message box carries arbitrary text and choosing a glyph from that text would be inventing a meaning for it. Toasts already on screen change with the switch as well as the next one to arrive; a setting whose effect you have to wait for reads as broken.\n\n`setDialogDecoration()` is the only function that writes a glyph, and it writes only into an element it created itself. That is what makes the boundary above checkable rather than merely promised: there is no second place where the \"never in control text\" rule would be enforced by nobody.\n\n## Failure modes\n\n- **A glyph entering an accessible name.** Every decorated dialog is `aria-labelledby` its own heading, so a decoration nested inside that heading would be read aloud on open. The decoration is inserted *beside* the heading, inside the heading bar rather than inside the `<h2>`, and carries `aria-hidden=\"true\"` as well.\n- **A glyph treated as copy.** The personal-vocabulary walker rewrites text from a per-node cache of the first text it saw. The decoration carries `data-no-vocab`, which excludes it outright — rather than relying on it being applied in a particular order that a later edit could quietly reverse.\n- **A decoration left behind when the switch goes off.** Turning it off removes the element rather than emptying it. An emptied span still occupies the heading row and still reads as an element to anything walking the document, so \"off\" would not be off.\n- **Decorations stacking.** Applying the setting repeatedly reuses the existing element rather than prepending another, so a page that re-applies its settings several times does not accumulate glyphs.\n- **A page that does not carry a given dialog.** Only the settings page carries the reset gate and the history dialog; every page carries the palette. Absent surfaces are skipped rather than assumed, because one thrown error inside `applyState()` takes every other setting down with it.\n\n## Accessibility and localization\n\nThe checkbox is a real `<input type=\"checkbox\">` inside its own `<label>`, so it is keyboard-reachable and has a visible, clickable label rather than an `aria-label` nobody can see. The decoration itself is hidden from assistive technology. Nothing about the switch changes layout: the heading holds its own width whether or not a decoration is present, so turning it on adds a glyph and moves nothing else. The glyph is sized in `em`, so it tracks the text-size slider instead of standing still while everything around it grows.\n\nThe card description is localized through the site's own COPY table under `dialogEmojisDesc`: four English and four Cantonese variants at the four funny levels, and every one of the eight states both facts — that the wording is unchanged, and that no button, label or screen-reader name carries a glyph. A boundary stated at some settings and not others is a boundary nobody can rely on. The checkbox label, the card heading and the live status line are still fixed English.\n\n## Verification\n\n`console/site/tests/contracts/dialog-emojis.test.mjs` runs the real extracted source from `site/app.js` against a small recording DOM, rather than asserting patterns over it. That distinction matters here: \"the value is stored\", \"the checkbox reflects it\" and \"the setting persists\" are all true of a switch that never reaches a single pixel. The test covers both states, the removal, repeated application, an absent dialog, the accessible-name boundary, the `aria-hidden`/`data-no-vocab` attributes, and a full walk of the resulting tree asserting that no attribute and no control text anywhere contains an emoji. It also compares every string in the tree with the switch on against the same tree with it off, so any change in wording fails.\n\n`console/scripts/negative-dialog-emojis-site.mjs` proves that test would notice if the feature stopped: it plants one break at a time, requires each to turn the contract test red, and requires the restored file to turn it green again. A break whose replacement changed no bytes is reported as a failed case rather than counted as a pass, because an edit that never landed reads exactly like a guard that held.\n\n**Desktop application:** unverified — the feature does not exist there.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [Funny levels](funny-levels.md), [Language modes](language-modes.md), [Accessibility](accessibility.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/dim-sum-startup-runtime",
      "category": "platform",
      "title": "Dim-sum startup runtime cache",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Cache contract",
          "id": "cache-contract"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Mount seam",
          "id": "mount-seam"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "dim-sum-surprise.md",
        "school-mode.md",
        "non-blocking-notifications.md"
      ],
      "body": "# Dim-sum startup runtime cache\n\nThis article describes the mount-ready runtime contract for the dim-sum startup surprise. The parent surface still owns the final mount and the package step owns cache production.\n\n## Behavior\n\nThe renderer makes one fresh cryptographically secure random draw per launch. The winning interval is exactly ten percent of the uint32 range. A winning draw selects one entry from a validated private application-data cache and shows the cache's local image bytes with the authoritative English and Traditional Chinese names. The surface is non-blocking, does not take focus, respects reduced motion, and dismisses itself after the configured short interval. There is no opt-out control.\n\nThe draw is suppressed during School mode, first run, an active error, an active update, or a mid-task state. Suppression is reported to the mount callback and never names or reveals a hidden dish. The attempt flag is held in the component instance so Strict Mode or a rerender cannot create a second draw in one launch.\n\n## Cache contract\n\n`console/shared/dim-sum.ts` validates the complete JSON envelope before any image bytes render. The envelope must identify the public `Ding-Ding-Projects/dim-sum-photos` catalog URL, an immutable catalog revision, its revision URL, and a published `catalog-v1*` release asset. Every entry carries exact bilingual names, the public asset identity and URL, a local data URL, its byte size and SHA-256 digest, and a static decode proof with MIME type and dimensions. The async validator recomputes each local image digest with Web Crypto before selection. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, non-published asset URLs, missing proof, and unsupported revisions fail closed.\n\nThe renderer reads only through the `DimSumCacheReader` seam. A missing or invalid cache produces an unavailable diagnostic and no image. The renderer never calls the public catalog, never downloads a release asset, and never invents a dish. The package or application-data owner must verify the image digest before publishing the cache and must retain the public catalog revision and asset identity for audit.\n\n## Configuration\n\nThere is deliberately almost nothing to configure, and the thing a reader looks for first is the thing that does not exist: there is no opt-out control, because the canonical contract says the surprise cannot be switched off. The ten-percent interval, the automatic dismissal, and the non-blocking behavior are fixed by the contract rather than by a preference.\n\nWhat the host supplies at the mount seam is a `context` carrying the shared School-mode state and a `cacheReader` returning the private JSON text. The cache itself is produced by the package step, not by a setting, and it names its own catalog revision and published asset identity.\n\n## Failure modes\n\nA missing or invalid cache produces an unavailable diagnostic and no image; it never falls back to a dish chosen some other way. The validator fails closed on unknown fields, repeated entry ids, malformed data URLs, oversized bytes, a non-published asset URL, missing decode proof, and an unsupported revision, and it recomputes every local image digest before selection rather than trusting the recorded one.\n\nA suppressed draw -- School mode, first run, an active error, an active update, a mid-task state -- is reported to the mount callback and never names or reveals a hidden dish, because saying which dish was withheld would defeat School mode's own contract.\n\n## Verification\n\nNothing here has been observed at a real launch. The draw, the suppression rules, and the cache validator are proved against the shared module's own tests and no further: no packaged build has run the ten-percent draw, and no capture of the overlay exists.\n\n## Mount seam\n\n`DIM_SUM_SURPRISE_REGISTRATION` identifies the `startup-overlay` mount, its non-blocking and focus-neutral behavior, its automatic dismissal, its no-opt-out contract, its cache boundary, and its cryptographically secure ten-percent draw. The host supplies `context`, including the shared School-mode state, and a `cacheReader` that returns the private JSON text.\n\n## Configuration\n\nThe one thing a host may vary is how long the surface stays up. `DimSumSurprise` takes\n`autoDismissMs`, defaulting to `8_000` (`app/renderer/src/dim-sum-surprise.tsx:70`); the same timer\nclears a diagnostic as well as a dish, so an unavailable cache does not leave a message on screen\nforever.\n\nEverything else is fixed on purpose, because each value is a promise the surface makes:\n\n| Constant | Value | Why it is not a setting |\n| --- | --- | --- |\n| `DIM_SUM_DRAW_THRESHOLD` (`dim-sum-surprise.tsx:36`) | `floor(0x100000000 / 10)` | the stated ten percent, expressed over the exact uint32 range the draw comes from, so the published frequency and the code agree by construction |\n| `DIM_SUM_CACHE_SCHEMA_VERSION` (`shared/dim-sum.ts:10`) | `1` | any other version fails closed rather than being read partly |\n| `DIM_SUM_SOURCE_REPOSITORY`, `DIM_SUM_CATALOG_URL`, `DIM_SUM_PUBLISHED_ASSET_PREFIX` | the public photo repository, its raw catalog URL, and `catalog-v1` | a configurable source is a route to an unverified image |\n| `DIM_SUM_CACHE_MAX_BYTES`, `…_MAX_ENTRIES`, `…_MAX_IMAGE_BYTES`, `…_MAX_IMAGE_DIMENSION` | 12 MiB, 256, 8 MiB, 8192 | bounds a malicious or corrupt cache must not be able to raise |\n\nThere is deliberately **no opt-out setting**, and adding one would be a regression rather than a\nfeature. The politeness is delivered by the surface never gating startup, never taking focus and\ndismissing itself, not by a switch.\n\nThe cache itself is not configuration either: it is produced by the packaging or application-data\nowner, digest-verified before publication, and read through `DimSumCacheReader`. The renderer has no\nroute that reaches the network.\n\n## Failure modes\n\n- **No cache, or a cache the validator refuses** — an unavailable diagnostic, no image, and nothing\n  invented. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, a\n  non-published asset URL, a missing decode proof and an unsupported revision all land here.\n- **A digest that does not recompute** — the async validator hashes each local image with Web Crypto\n  before selection, so an entry whose bytes no longer match its recorded SHA-256 is not shown.\n- **A suppressed launch** — School mode, first run, an active error, an active update or a mid-task\n  state. The mount callback is told it was suppressed, and is deliberately not told which dish it\n  would have been: naming a hidden dish would defeat School mode's rule that dim-sum behaves as\n  though it is not installed.\n- **A rerender, or React Strict Mode's double invoke** — the attempt flag lives in the component\n  instance, so a launch still gets exactly one draw rather than two.\n- **A losing draw** — nine launches in ten. Nothing renders and nothing is reported as wrong.\n\n## Verification\n\nSource-level only, and the boundary is worth stating plainly because this surface is defined by a\nrandom event.\n\n- `shared/dim-sum.ts` and the renderer contract are covered by the repository's renderer suite\n  (`npm run test:renderer`) and its type check, both of which drive the draw with a supplied value\n  rather than a real random one — which is the only way a ten-percent branch is testable at all.\n- No packaged launch has been observed winning the draw, so there is no built-artifact interaction\n  record and no capture of the surface on screen. The inventory row stays `implemented-unverified`\n  until one exists.\n- The published cache has not been produced or verified here; that belongs to the packaging owner\n  named above.\n\n## Suggested articles\n\n[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).\n"
    },
    {
      "id": "platform/dim-sum-surprise",
      "category": "platform",
      "title": "Dim sum surprise",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "school-mode.md",
        "README.md"
      ],
      "body": "# Dim sum surprise\n\nA small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.\n\n## Behavior\n\nOn roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.\n\n## Configuration\n\nThere is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.\n\n## Current status\n\n**Desktop application:** Partial. `dim-sum-surprise.ts` implements the whole draw as specified and as tested: a one-in-ten chance per launch with an exclusive probability boundary, exactly one draw per launch, suppression during a first run, an error path, an update, a mid-task flow and quiet hours, bilingual dish names with alt text, bundled local images, and a deliberate absence of an off switch (`storedPreferenceIsIgnored()` asserts that as a checkable fact). None of it runs: nothing in the mounted application calls this module. A grep for its two exports (`surpriseFor`, `storedPreferenceIsIgnored`) across `App.tsx`, `main.tsx`, `PbxAdminApp.tsx` and `PbxAdminIntegratedApp.tsx` finds no reference outside the module and its own test. Every real launch of the built application currently has a zero, not a one-in-ten, chance of showing a dish.\n\n**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.\n\n## Failure modes\n\nIf the bundled image set were ever missing an entry, the intended behavior is to skip that draw rather than show a broken image; the desktop module implements this, but since nothing calls the module, the behavior has never run outside its own test.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The module's tests cover alt text for screen-reader users, but the surface itself is never mounted, so there is nothing in the running application to check focus order or motion behavior against yet.\n\n## Verification\n\n`tests/ui/dim-sum-surprise.test.tsx` exercises the draw logic, suppression rules, and the no-off-switch guarantee directly, in isolation from the running application. Verifying the wiring gap means launching the built desktop application repeatedly and confirming no dish ever appears -- which is the current, correct result, and the defect this article records.\n\n## Suggested articles\n\n[School mode](school-mode.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/docs-runtime",
      "category": "platform",
      "title": "Offline documentation and changelog runtime",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "offline-documentation-browser.md",
        "provider-markup-rendering.md",
        "changelog-viewer.md",
        "regex-builder.md",
        "README.md"
      ],
      "body": "# Offline documentation and changelog runtime\n\nThe desktop renderer includes mount-ready documentation and changelog surfaces backed by the generated bundles already produced during the normal build.\n\n## Behavior\n\nThe documentation surface lists every bundled article, searches titles, headings, and article bodies, renders the selected article as formatted content, resolves article-to-article links inside the application, exposes an article outline, and suggests related articles from real bundle links.\n\nThe changelog surface parses the generated release history, rejects malformed release dates, composes date and text filters, shows categorized changes, exports the filtered view, and links a recorded commit only when both its identifier and the supplied repository URL are valid. A caller may supply verified commit availability; absent that evidence, the surface labels availability as unverified rather than claiming the link was checked.\n\nBoth surfaces use the same isolated Markdown renderer. It creates React elements directly, treats embedded HTML as text, allows only HTTP, HTTPS, and mail links outside the bundle, and reports empty, truncated, or malformed input instead of executing provider-authored markup.\n\n## Configuration\n\n`DOCUMENTATION_SURFACE_MOUNT` targets the `docs` destination and carries the generated documentation bundle as its default input. `CHANGELOG_SURFACE_MOUNT` targets the `changelog` destination and carries the generated changelog text and repository URL. The central application integration imports these descriptors and decides where they mount; the surfaces do not alter the generated design shell themselves.\n\nPlain-text search is the default. Selecting regular-expression mode uses a disposable worker, a bounded corpus, a bounded result count, and a hard deadline. Search results retain the exact source field and capture groups returned by that single isolated evaluation.\n\n## Failure modes and security\n\nIf the bundle's declared article count differs from its contents, the documentation surface reports the mismatch. A missing selected article, empty bundle, malformed Markdown, an invalid release date, invalid date range, invalid pattern, unavailable worker, deadline expiry, missing commit, and unverified commit each have distinct visible states.\n\nRegular expressions never run on the renderer thread. When worker isolation is unavailable, regular-expression search fails closed. Plain-text search retains a bounded fallback. Links using file, script, data, or unknown schemes do not become active controls.\n\n## Accessibility and localization\n\nThe surfaces use semantic headings, regions, lists, labels, status messages, alerts, native date fields, keyboard-operable controls, and minimum 44-pixel action targets. The directly authored copy is currently English. A later language integration must provide the project's English, Cantonese, and bilingual resources without changing dates, versions, commit identifiers, search origins, or failure facts.\n\n## Verification\n\nThis implementation was prepared in the ultra-speed lane, where tests, type checks, builds, generated-bundle refreshes, runtime interaction, and screen captures were explicitly excluded. The central mounting integration and its normal verification remain separate work. The generated bundles were read as existing inputs and were not edited in this change.\n\n## Suggested articles\n\n[Offline documentation browser](offline-documentation-browser.md), [Provider-authored markup rendering](provider-markup-rendering.md), [In-app changelog viewer](changelog-viewer.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/export-and-bulk-core",
      "category": "platform",
      "title": "Export and bulk-operation core",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Platform integration contract",
          "id": "platform-integration-contract"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification status",
          "id": "verification-status"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "bulk-actions.md",
        "external-editor-handoff.md"
      ],
      "body": "# Export and bulk-operation core\n\nThe renderer includes a domain layer for preparing faithful data exports, scoping collection selections, planning bulk operations, and reporting confirmed platform outcomes.\n\n## Behavior\n\nExport preparation validates input against the versioned `ding-pbx-export.v1` tree schema before encoding it. Supported outputs are JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, SQL, TypeScript, JavaScript, and Python. Every artifact declares UTF-8, its schema version, media type, line-ending convention, byte count, row count, and format-specific disclosures.\n\nFormats fail closed when they cannot preserve a dataset. For example, TOML is unavailable for null values or mixed-type arrays, SQL is unavailable for nested values without a target schema, and XML is unavailable for characters XML 1.0 cannot represent. Source-code forms contain data literals only. Tabular formats use canonical JSON in headers and populated cells, while an empty cell means the field was absent, preserving names, types, and ragged rows.\n\nArchive export and archive encryption are explicitly unavailable because no bundled, verified ZIP or 7z adapter is registered. The core does not accept encryption settings or claim that a renamed or unverified archive is protected.\n\nSelection state belongs to one collection identifier and one query key. Changing either context creates a new empty selection, preventing stale selections from acting on a different result set. Page selection, all-match selection, inverse selection, additive toggles, and inclusive ranges share the same pinned and protected-item exclusion policy.\n\nBulk actions are discriminated as enabled or disabled. An enabled action must provide an execution handler. A disabled action must provide an exact reason and has no callable handler. Plans distinguish selected, affected, and excluded counts before execution. Runs report each item as converted, saved, exported, changed, skipped, cancelled, or failed according to the action and its confirmed result.\n\nEach execute and revert call receives a real `AbortSignal` from its own linked `AbortController` and a finite positive safe-integer per-item deadline. The default is 30 seconds. Caller cancellation actively aborts every in-flight item, while a deadline abort records a distinct timed-out result. Timers and caller-signal listeners are removed on every settle path. Untyped handler or platform-adapter rejections are reduced to fixed public-safe failure copy instead of exposing raw messages that may contain private paths.\n\nUndo is exposed only when a confirmed mutation supplies an inverse token or local-history revision and the surface registers a real inverse handler. A notification action cannot manufacture undo support.\n\n## Configuration\n\nThis layer has no settings file and no environment variables. Everything a caller can vary is an\noption object, and the defaults below are the ones the code actually carries:\n\n| Option | Where | Default |\n| --- | --- | --- |\n| `concurrency` — how many bulk items run at once | `RunBulkOptions` (`app/renderer/src/bulk.ts:214`) | unset, so the run is serial |\n| `itemDeadlineMs` — the finite per-item deadline described above | same interface | `DEFAULT_BULK_ITEM_DEADLINE_MS`, `30_000` (`bulk.ts:212`) |\n| `signal` — the caller's own `AbortSignal`, linked into each item's controller | same interface | unset, so only the deadline can abort |\n| `onProgress` — a callback receiving `BulkProgress` as outcomes settle | same interface | unset, so a run reports only when it finishes |\n| `includePinned`, `includeProtected` — whether a plan reaches records the exclusion policy holds back | `BulkPlanOptions` (`bulk.ts:105`) | both absent, so a pinned record is excluded and counted rather than silently dropped |\n| The export format | `ExportRequest.format` (`app/renderer/src/export.ts:23`) | none; a caller picks from the list above, and `suitableFormats()` reports which of them this dataset can survive |\n\nA per-item deadline above `MAX_TIMER_DELAY_MS` (`2_147_483_647`) cannot be expressed by the platform\ntimer, so `bulk.ts` knows that bound rather than silently giving a caller a shorter wait than it\nasked for.\n\nEvery prepared artifact declares `schemaVersion: 'ding-pbx-export.v1'`, UTF-8, and LF line endings\n(`export.ts:570`). Those three are fixed rather than configurable, because an export whose encoding\nor line endings vary by host is an export another tool cannot read without guessing.\n\nThere is nothing to configure for archives. No bundled ZIP or 7z adapter is registered, so those\nformats are unavailable rather than optional, and the core refuses encryption settings outright\ninstead of accepting settings it cannot honour.\n\n## Platform integration contract\n\nThe renderer does not write files or launch an editor directly. A privileged desktop or hosted adapter must implement the shared `ExportPlatformPort` contract for save, download, clipboard, editor detection, and editor launch. The renderer reports success only after that adapter returns a confirmation receipt with an operation identifier and completion time.\n\nSaving and opening an export in Visual Studio Code is a two-stage operation. The save must first be confirmed with a local path. Editor detection and launch happen afterward, and the overall result remains failed, cancelled, or unavailable unless the launch is separately confirmed.\n\n## Configuration\n\n- **The output format**, from the thirteen listed above. It is a choice among formats that\n  can carry the dataset, never a choice to lose part of it: a format that cannot preserve\n  the data is unavailable with its reason rather than offered and silently lossy.\n- **The selection context**, one collection identifier and one query key. Changing either\n  creates a new empty selection on purpose, so a selection made against one result set can\n  never act on another.\n- **Whether pinned and protected records are included**, which the caller must ask for\n  explicitly; the default excludes them across page, all-match, inverse, toggle and range\n  selection alike.\n- **The per-item deadline** for execute and revert, a finite positive safe integer\n  defaulting to 30 seconds, delivered to each handler as a real `AbortSignal` from its own\n  linked controller.\n- **The platform port.** Save, download, clipboard, editor detection and editor launch all\n  arrive through an injected `ExportPlatformPort`; the domain layer has no filesystem,\n  clipboard, process or network access of its own, so there is nothing here to point at a\n  path or a host.\n\nArchive export and archive encryption take no settings because neither is available: no\nbundled, verified ZIP or 7z adapter is registered. The core refuses encryption settings\noutright rather than accepting them and producing an archive it cannot claim is protected.\n\n## Failure modes\n\n- Unsupported values, excessive depth, excessive value count, sparse arrays, cycles, repeated object references, accessors, and class instances make preparation unavailable with an exact path and reason.\n- A platform cancellation remains cancelled. It is never translated into success.\n- A platform failure preserves its code, reason, and retryable state.\n- A confirmed save without a returned local path cannot proceed to editor handoff.\n- Pinned and protected records remain excluded unless the caller explicitly requests their inclusion.\n- Cancellation stops new bulk items from starting and records every unstarted item as cancelled.\n- A never-settling execute or revert handler is aborted at its finite per-item deadline and reported as timed out. Timed-out work is not automatically retryable because an abort-ignoring handler may still complete a side effect later.\n- A thrown action handler becomes a per-item failed outcome and does not turn the remaining batch green.\n\n## Security and privacy\n\nEncoding is local and deterministic. The domain layer performs no network access, filesystem access, clipboard mutation, process launch, clock read, or random generation. External effects exist only behind the injected platform contract. SQL output uses quoted identifiers and escaped literals, but remains review-only because target constraints and column types are not known to the exporter.\n\n## Verification status\n\nThis change provides the pure/domain implementation and platform contracts only. It does not wire a visible export button, file dialog, clipboard bridge, Visual Studio Code launch bridge, or list surface. No tests, type checks, builds, runtime interactions, or captures were run in the ultra-speed lane.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Bulk actions](bulk-actions.md), [External editor handoff](external-editor-handoff.md).\n"
    },
    {
      "id": "platform/external-editor-handoff",
      "category": "platform",
      "title": "External editor handoff",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "../agent/ops.md",
        "README.md"
      ],
      "body": "# External editor handoff\n\nA one-click action to open the current project, file, or export directly in an installed code editor.\n\n## Behavior\n\nThe product is meant to detect installed editors and offer opening the current folder or a selected or exported file directly in one, with the choice persisted.\n\n## Configuration\n\nOpening a folder would open it as a workspace root rather than a single unrooted file, so surrounding project context is usable immediately.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no external editor detection or handoff action anywhere in its interface.\n\n**Documentation website:** Implemented as a browser-mediated equivalent at `history.html`. It accepts local file selection and export download, but keeps external-editor opening unavailable because a normal browser does not expose a verified local path. It links to the official Visual Studio Code download and states that local paths remain browser-owned.\n\n## Failure modes\n\nWhen no supported editor is installed, the intended behavior is a clear message naming that and an offer to get one, rather than a silently disabled or missing button; there is no handoff action yet to fail this way.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Operations](../agent/ops.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/external-settings-sources",
      "category": "platform",
      "title": "External settings sources",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "scheduled-settings.md",
        "README.md",
        "local-version-history.md"
      ],
      "body": "# External settings sources\n\nLets a scheduled setting take its value from a local rule, a versioned HTTPS API, or a Home Assistant boolean entity. This article documents the privileged source contract. The renderer integration and user-facing editor remain separate work.\n\n## Behavior\n\nThe control-plane handler accepts the same setting targets as `ScheduleAssignment` in `console/shared/settings-schema.ts`: language, School mode, attention modes, narration, display name, and appearance values. The response is versioned, carries an `active` boolean, and carries only an allowlisted assignment array. Unknown fields, unknown targets, duplicate targets, invalid value ranges, malformed JSON, unsafe object keys, oversized bodies, and deeply nested bodies are rejected before an assignment can be selected.\n\nThe local source performs no network request and uses the rule's own assignments. The HTTPS source performs a bounded `GET` with `redirect: error`. HTTPS is required, while HTTP is accepted only for loopback development addresses. URL credentials, file paths, UNC-style paths, private and link-local IP literals, multicast addresses, local hostnames, and non-HTTP protocols are rejected. The Home Assistant source calls only `/api/states/<entity>` for a validated `binary_sensor.*` or `input_boolean.*` entity and interprets exactly `on` as active and `off` as inactive.\n\nEach non-local source has a refresh interval from 1 to 1440 minutes. A store skips a refresh that arrives before the next permitted time unless the caller explicitly requests a manual refresh. Every refresh has a hard deadline and a generation number. A newer refresh cancels the older one, and a stale result cannot overwrite the newer state.\n\n## Configuration\n\nHome Assistant stores only a bounded credential-vault account reference. The token is read at request time, used in memory for that request, and never placed in settings, history, exports, logs, or renderer state. The handler factory receives the vault reader and fetch implementation as injected seams, so the application can bind them in the privileged process without making the shared contract perform I/O.\n\nRemote assignments are held in memory as the last accepted reading. They are never written into the local settings base. When a source is inactive, the local base assignments remain effective. When a refresh fails, the store uses a still-valid last accepted active reading when one exists; otherwise it uses the local base assignments. The state projection exposes the status, assignment count, timestamps, fallback flag, and safe diagnostic only. It never exposes the endpoint, vault reference, token, response body, or remote payload.\n\n## Failure modes\n\nThe state model distinguishes `offline`, `auth-error`, `rate-limited`, `malformed`, `timeout`, `blocked`, `cancelled`, and `failed`, plus the normal `active`, `inactive`, `refreshing`, `stale`, and `idle` states. HTTP 401 and 403 are authentication failures, HTTP 429 is rate limiting, bounded 408, 504, and 5xx responses are offline, and redirect or URL-policy violations are blocked. Expired API responses are stale and cannot become the effective value. A response body or credential is never included in a diagnostic.\n\n## Security and privacy\n\nThe client is designed for the privileged boundary. It does not read arbitrary files, follow redirects, accept a caller-supplied header, discover tokens from environment variables, or send a token to any host other than the validated Home Assistant base URL. The Home Assistant path is constructed from a validated base URL and entity identifier, with query and fragment removed. Response bytes are capped before parsing, JSON depth and object keys are bounded, and the assignment target list is explicit.\n\n## Current status\n\n**Desktop application:** The shared contract, privileged handler factory, in-memory fallback store, and renderer-safe state projection are implemented. Dispatch and UI wiring are intentionally separate so the source can be reviewed before it is connected to the application lifecycle.\n\n**Documentation website:** The site does not execute privileged source reads. This article records the contract and the browser boundary without claiming that a static page can access an operating-system credential vault.\n\n## Verification boundary\n\nThis lane adds no network requests, runtime interaction, tests, builds, or captures. The next integration lane should bind the handler through the privileged dispatch path, exercise injected fetch and vault seams, and verify the built application states. The source contract is intentionally dispatch-ready but not a claim that the application already exposes the feature.\n\n## Suggested articles\n\n[Scheduled settings](scheduled-settings.md), [Platform feature index](README.md), and [Local version history](local-version-history.md).\n"
    },
    {
      "id": "platform/forge-publishing",
      "category": "platform",
      "title": "Forge publishing",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "external-editor-handoff.md",
        "local-version-history.md",
        "complete-exports.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Forge publishing\n\nThe History screen contains a desktop forge-publishing surface. It publishes a local source through a chosen provider account and owner, with a fork route where the provider supports it and a copy-and-push route that does not depend on forking.\n\n## Behavior\n\nThe surface is backed by the control plane, not by renderer-only state. Refresh discovers signed-in GitHub accounts from the local `gh` sign-in store. Each row shows the provider login, an account id, a provider-supplied vault reference when one is actually returned, active state, refresh, sign-out, and re-authentication status. The renderer never receives a token value. Account activation runs `gh auth switch`, then confirms the provider reports that same login as active.\n\nSelecting an account activates it through `gh auth switch`, then owner discovery reads the personal owner and paginated organization owners through `gh api`. The owner picker contains only values returned by the provider. It never guesses a personal namespace or accepts an arbitrary organization name.\n\nThe two publication routes are intentionally distinct, and both require the owner to have the capability the route needs:\n\n- **Fork** invokes `gh repo fork` against the selected HTTPS source remote, including the selected destination name. Organization forks carry the selected organization explicitly. A personal fork uses the provider account that is active in the local sign-in store.\n- **Copy and push** creates the selected destination with `gh repo create`, checks the local `forge-publish` remote, refuses to overwrite an unrelated remote, sets and rereads exactly one effective push URL, pushes the selected local `HEAD` directly to that validated URL, then verifies that exact commit with `git ls-remote --heads`.\n\nEvery process call uses typed executable and argument arrays, `shell: false`, bounded output, a deadline, and cleared inherited authentication variables. A publication receipt records the provider, account id, owner id, route, destination URL, source commit when available, exact outcome, and timestamp. Failed, partial, and cancelled creation, push, verification, sign-in, and sign-out outcomes remain receipts and are reloaded after restart rather than being replaced by a blank state.\n\n## Configuration\n\nThe durable file is `forge-publishing.json` under the application's private data folder. It contains schema version 1, account metadata, the active account id, and redacted publication receipts. It contains no token, password, cookie, private key, or invented vault key. A provider vault reference is displayed only when the provider actually supplies one. Account mutation and publication receipts are also recorded through the app's local append-only history.\n\nThe packaged desktop contract bundles and verifies the pinned GitHub CLI executable and the ConPTY helper. The helper is the default route. A direct HTTP device flow is permitted only for a client id that is compiled into an explicit immutable allowlist, never for an environment value or renderer input. The helper drives `gh auth login --web` through a native pseudo-terminal with a bounded asynchronous read loop, a no-op browser command, independent deadline, session id, operation id, monotonic revision, atomic state writes, and a truthful expiry. It surfaces only the public verification URL and user code after stripping terminal control bytes, then proves that a newly installed account, not a pre-existing account, is active in keyring storage. Plaintext credential fallback is refused. The exact no-token `gh` keyring-status fixture is pinned at `control-plane/fixtures/gh-keyring-status.json`. The dependency manifest carries separate archive and extracted-file digests, and bootstrap refuses extraction until both are present and verified. The archive digest is pinned to the independently corroborated release hash.\n\n**Desktop application:** Not implemented. The desktop application administers a telephony exchange and has no source-repository publishing feature.\n\n**Documentation website:** Implemented as a browser-mediated flow at `history.html`. The visitor chooses account mode, owner, repository, and copy or fork route; the provider handles authentication and publication, and this page stores no credentials or publication claim.\nThe source-folder field has a native folder picker. The account search is plain text by default and has an adjacent anchored full regex builder with bounded pattern length, flags, guided tokens, validation, and match counts. The provider capability list distinguishes GitHub, which currently supports both routes, from GitLab, which remains visible but unavailable until a local CLI and OS-vault adapter are configured. The active operation exposes busy, progress, cancellation, and completion state.\n\n## Failure modes\n\nNo signed-in provider account returns a re-authentication state beside the account surface. An expired or missing account returns the same state without clearing the retained account metadata. A failed `gh auth switch`, owner read, repository create, remote add, or push carries its exact bounded process reason in the receipt.\n\nIf `forge-publish` already points at a different destination, copy and push stops before changing the remote. If the source commit cannot be read, or the source path is not absolute, publication stops before creating a destination. If fork succeeds but a later provider confirmation is absent, the receipt stays failed or partial and never claims that a complete copy exists.\n\nGitLab is not silently routed through a GitHub command. It remains an explicit unavailable capability until its provider adapter exists.\n\nHosted server mode refuses every `forge.*` action by name and disables the hosted controls because it cannot safely use the desktop's local provider sign-in store or local checkout. The desktop Add account and Re-authenticate actions surface the user code and verification URL in the History screen, poll with bounded deadlines and operation ids, and install the approved credential through the bundled ConPTY route or the explicitly allowlisted direct HTTP route using stdin only. No uncontrolled browser is opened. A timeout, interruption, cancellation, stale state read, or unproven process identity remains partial or unknown-side-effect as appropriate, never a guessed success.\n\n## Security and privacy\n\nThe renderer accepts account names and owner ids, never provider tokens. Durable state stores only provider-supplied vault references when present. `gh` is accepted only after it reports `keyring` storage, while plaintext credential fallback is refused. `git` uses the configured credential helper after inherited auth variables are cleared. No token is placed in arguments, output, logs, renderer state, receipts, local history, exports, or documentation. The executor allowlist contains only the typed `git` and `gh` executables needed by this surface, and all calls use `shell: false`.\n\n## Verification\n\nThis lane did not call provider APIs, run broad checks, lint, build the product, package an installer, launch the desktop surface, or capture a screenshot. Static evidence is the typed action union, the dispatcher branches, the allowlisted executor calls, the pinned dependency records with separate archive and extracted-artifact digest checks, package-resource verification hooks, the asynchronous and overlapped ConPTY helper with exact handle ownership cleanup, inherited-auth clearing path, no-op browser command, exact device URL parser, newly-installed-account proof, same-account provider identity and credential-state proof, active-account confirmation, `git ls-remote` verification path, hosted refusal and disabled controls, generated History-screen route, atomic versioned state store, reloadable receipts, and updated feature registry. The narrow focused validators are `node scripts/check-forge-keyring-fixture.mjs`, `node scripts/check-forge-digest-manifest.mjs`, and the build hook `npm run check:forge-contracts`. Runtime provider verification remains unrun and must be performed by the parent lane through the approved desktop evidence path.\n\n## Suggested articles\n\n[External editor handoff](external-editor-handoff.md), [Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/funny-levels",
      "category": "platform",
      "title": "Funny-level sliders",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "README.md"
      ],
      "body": "# Funny-level sliders\n\nTwo independent sliders, one per language, that control how playful the product's own copy sounds — from fully serious to maximum playfulness.\n\n## Behavior\n\nTwo sliders, English and Cantonese, are meant to each range from level 1 (fully professional wording) to level 5 (maximum playfulness), restyling every message category including warnings and errors without changing the underlying facts they carry.\n\n## Configuration\n\nSliders would live in settings, default to level 5 for both languages, and be changeable and resettable independently of each other.\n\n## Current status\n\n**Desktop application:** Partial. Both sliders exist in the design (`fun_level` for English, `fun_level_yue` for Cantonese, each ranging 1-5 and defaulting to 5) and `App.tsx` persists whichever value is chosen. What does not exist is the restyling itself: `funny-levels.ts` exports `renderMessage()`, the function that would take a message's facts and a chosen level and produce styled text, and nothing in the mounted application ever calls it -- a grep across the renderer finds it only inside its own file and test. Moving either slider today changes a stored number and nothing a person can see. One further wrinkle worth recording: the compiled console also has a long-standing, unrelated 0-4 \"fun mode\" dial (confetti, rainbow fills, motion) that happens to share the exact control id `fun_level` with this feature's slider, so the two systems silently read and write the same stored value without either knowing about the other.\n\n**Documentation website:** Partial, and more real than the desktop application's slider mechanism. `site/app.js` implements a genuine `COPY` table with eight keys, each carrying four real English and four real Cantonese phrasings, and `copyText()`/`copyLevel()` genuinely select and render the phrasing matching the chosen level -- changing the site's funny-level selects visibly changes rendered text. The gap is coverage and range: only eight strings on the whole site are wired to it (three through a `data-copy` attribute, five more used directly in notification code), and the site's selects offer four levels (0-3, defaulting to 0/Plain) rather than the canonical five levels defaulting to 5/Maximum.\n\n## Failure modes\n\nA message's facts (file names, error causes, irreversible-action warnings) are meant to stay exact at every level regardless of tone; if a restyled string ever disagreed with the underlying fact, that would be treated as a defect in the styling layer, not an acceptable trade-off.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop sliders and the site's selects are ordinary native controls reachable by keyboard, but no dedicated accessibility audit of either has been performed. Copy for this feature exists in both English and Cantonese wherever it is actually wired (the site's eight `COPY` keys); the desktop sliders persist correctly but currently style nothing.\n\n## Verification\n\n`tests/ui/funny-levels.test.tsx` exercises the desktop module's own logic (level bounds, storage round-trip, `renderMessage`'s fact-preservation) in isolation, not its absence of wiring into the mounted app. Verifying the wiring gap means opening the built application, moving either slider, and confirming that no rendered message changes tone -- and opening the site's settings page, moving either funny-level select, and confirming that the hero copy and the theme/motion descriptions on that page do change tone across the four available levels.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/guided-forms",
      "category": "platform",
      "title": "Guided forms",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "destructive-action-confirmation.md",
        "README.md"
      ],
      "body": "# Guided forms\n\nFields populated from real data wherever possible, sensible defaults, plain-language inline validation, and named reasons on every disabled control.\n\n## Behavior\n\nWherever a value can be enumerated or defaulted, the form is meant to do so — pickers over blank text boxes, a suggested default instead of an empty field, and inline validation that says what to type rather than only showing a red border.\n\n## Configuration\n\nEvery disabled control would state, in its own tooltip or adjacent text, exactly which condition is unmet and how to satisfy it.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's server and deployment forms mix real pickers for some fields with free-text entry for others; validation messages exist for some fields but not consistently, and not every disabled control names its exact blocking condition.\n\n**Documentation website:** Partial. The site's forms, such as the settings placeholders, are minimal and mostly unvalidated; inline validation guidance is largely absent.\n\n## Failure modes\n\nA field left blank or filled incorrectly is meant to be caught inline, in plain words, before submission is attempted; several forms on both surfaces still rely on submission itself, or a generic error, to reveal that a field was wrong.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/hosted-authentication",
      "category": "platform",
      "title": "Hosted administrator authentication",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Storage and limits",
          "id": "storage-and-limits"
        },
        {
          "title": "Transport policy",
          "id": "transport-policy"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Health and deployment",
          "id": "health-and-deployment"
        },
        {
          "title": "Failure modes and recovery",
          "id": "failure-modes-and-recovery"
        },
        {
          "title": "Security considerations",
          "id": "security-considerations"
        },
        {
          "title": "Verification status",
          "id": "verification-status"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../system/security.md",
        "../app/servers.md",
        "non-blocking-notifications.md",
        "README.md"
      ],
      "body": "# Hosted administrator authentication\n\nThe hosted console uses one local administrator account, memory-hard password hashing, signed server-side sessions, and server-side authorization for every control-plane request. Authentication is an access boundary for the hosted console. It is separate from the desktop application, which does not expose the hosted HTTP routes.\n\n## Behavior\n\nAccount storage has three explicit states:\n\n- **Missing:** first-run setup is available.\n- **Valid:** setup is unavailable and sign-in is available.\n- **Corrupt:** setup and sign-in both fail closed, existing sessions stop authorizing control-plane requests, and the sign-in surface explains the recovery action.\n\nThe server checks this state before serving the application shell. A missing record routes to setup, a valid unauthenticated request routes to sign-in, and a corrupt record routes to the recovery state. A network timeout or unavailable server is never interpreted as a missing account.\n\nSetup and sign-in surfaces report checking, ready, busy, timeout, unavailable, refused, rate-limited, corrupt-account recovery, and retry states. They use bounded requests and leave form controls disabled while the account state is unknown.\n\nSuccessful sign-in creates a random, HMAC-signed session identifier in an `HttpOnly`, `SameSite=Strict` cookie. TLS deployments also set `Secure`. Sign-out revokes the current session. The hosted bridge also exposes a revoke-all-sessions action for the signed-in administrator.\n\n## Configuration\n\nThere is deliberately very little, and none of it can weaken a boundary from outside a\ndevelopment build:\n\n- **The listener and its transport.** Password creation and sign-in are permitted over TLS,\n  or over a plain HTTP listener bound to loopback only. A plain HTTP server bound to a\n  non-loopback address is refused rather than warned about.\n- **`ServerModeOptions.allowInsecureDevelopmentAuth`**, honoured only when `NODE_ENV` is\n  exactly `development`. Production launchers and service definitions must not set it, and\n  setting it in production has no effect rather than a documented risk.\n- **The account record and the signing key**, as files on disk. Both are created with\n  restrictive permissions where the operating system supports them, and both are published\n  without replacing an existing file, so a second concurrent setup cannot overwrite the\n  first completed account.\n\nThe limits below -- the 1,024-character password, the 128-character username, the scrypt\nparameters, the 1,024-session table, the 4,096-address rate table -- are fixed rather than\nconfigurable. That is what stops a modified record asking for unbounded scrypt work, so a\nsetting that raised them would be removing the check rather than tuning it.\n\n## Storage and limits\n\n`admin-account.json` uses schema version 1 and contains only the username, scrypt password hash, and creation time. The reader limits file size, rejects unknown or extra fields, validates exact field bounds, and accepts the original unversioned three-field record as schema version 1 for compatibility. A malformed file is corrupt, never missing.\n\nAccount and signing-key files are created with restrictive permissions where the operating system supports them. Each file is written to a unique same-directory temporary file, flushed, and published without replacing an existing file. This prevents concurrent setup requests from overwriting the first completed account.\n\nPassword input is limited to 1,024 characters and the username to 128 characters. Password hashes must use the supported scrypt parameters, salt size, and derived-key size before password verification runs, so a modified record cannot request unbounded scrypt work.\n\nThe in-memory session table is capped at 1,024 live sessions and removes expired entries before every relevant operation. The login-rate table is capped at 4,096 source addresses, removes expired windows, and never trusts forwarding headers supplied by a client.\n\n## Transport policy\n\nPassword creation and sign-in are allowed over TLS or a loopback-only plain HTTP listener. They are refused when a plain HTTP server is bound to a non-loopback address.\n\n**There is no development override, and an earlier version of this article said there was.** It\ndescribed a `ServerModeOptions.allowInsecureDevelopmentAuth` flag honoured only when `NODE_ENV` is\nexactly `development`. No such field exists on `ServerModeOptions` (`server/http-server.ts:22-37`,\nwhich declares `staticRoot`, `dataDir`, `resourcesDir`, `host`, `port` and `tls` and nothing else),\nand `NODE_ENV` is read nowhere in `server/auth.ts` or `server/http-server.ts`. The correction is\nrecorded here rather than deleted, because a documented escape hatch that does not exist is the kind\nof sentence somebody eventually goes looking for the code behind.\n\nSign-out remains available regardless of transport, so a session can always be revoked even if the\ntransport changes after sign-in.\n\n## Configuration\n\nThe hosted server is configured entirely at launch, by flag or environment variable. There is no\nconfiguration file to edit, and every value below is read once in\n`server/bin/ding-pbx-server.ts:19-25`:\n\n| Flag | Environment variable | Default |\n| --- | --- | --- |\n| `--host` | `DING_HOST` | `127.0.0.1` — loopback, so installing this on a machine never silently exposes a PBX administration surface to the network |\n| `--port` | `DING_PORT` | `8443` |\n| `--data-dir` | `DING_DATA_DIR` | `~/.ding-pbx-console` (`HOME`, or `USERPROFILE` on Windows, falling back to the working directory) |\n| `--cert` | `DING_TLS_CERT` | unset |\n| `--key` | `DING_TLS_KEY` | unset |\n\n`--cert` and `--key` must be supplied together; supplying one alone is refused at startup with that\nexact sentence rather than quietly serving plain HTTP. With neither supplied the server serves plain\nHTTP and says so, in the fixed wording exported as `PLAIN_HTTP_WARNING` and returned from\n`GET /api/session` — read it before deciding plain HTTP is acceptable on your network.\n\n`admin-account.json` and the session signing key both live under the data directory. Neither is\nedited by hand: setup writes the account, and the server refuses to start on a corrupt signing key\nrather than minting a replacement, because replacing it revokes every existing session.\n\nThe bounds in the previous section are compiled-in constants rather than settings, and their exact\nvalues are `MAX_SESSIONS = 1_024`, `MAX_RATE_LIMIT_SOURCES = 4_096`, `MAX_ACCOUNT_FILE_BYTES =\n16 * 1024` and `MAX_PASSWORD_CHARS = 1_024` (`server/auth.ts:28-34`). A deployment that needs\ndifferent ones is changing the program, not its configuration.\n\n## Health and deployment\n\n`GET /api/health` is unauthenticated and returns only the API version, stable service identifier, and `ok` or `degraded`. It contains no username, path, network address, session count, account existence flag, or control-plane data. A corrupt account store returns `503` with the same bounded health shape so a service monitor can distinguish readiness from process liveness without receiving sensitive data.\n\n## Failure modes and recovery\n\n- **Server unavailable or timeout:** retry from the same sign-in or setup surface after confirming service reachability. No setup redirect occurs.\n- **Exposed plain HTTP:** enable TLS or return the listener to loopback, then retry.\n- **Rate limited:** wait for the exact `Retry-After` interval. Correct credentials remain refused during the interval.\n- **Corrupt account storage:** restore `admin-account.json` from a trusted backup, or move the corrupt file aside manually and restart. The server never overwrites or silently resets it.\n- **Corrupt signing key:** the hosted process refuses to start. Restore the key or deliberately replace it, understanding that replacement revokes every existing session.\n\n## Security considerations\n\nPasswords are never logged, returned, or stored in plaintext. Password comparison uses Node's constant-time comparison after fixed, validated scrypt parameters. Session cookies contain only a random identifier and an HMAC. Control-plane requests are authorized by the server immediately before dispatch, including a fresh valid-account check and username match.\n\nThe health route is deliberately narrow. Static assets may be fetched without a session, but the application shell and every control-plane operation remain session-gated.\n\n## Verification status\n\nThis change was implemented under an ultra-speed release lane that explicitly prohibited tests, lint, type checks, builds, packaging, server launch, browser interaction, and screen captures. Those checks remain unrun for this change and must not be inferred from this documentation.\n\n## Suggested articles\n\n[System security](../system/security.md), [Hosted server operation](../app/servers.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n\n"
    },
    {
      "id": "platform/in-context-recovery",
      "category": "platform",
      "title": "In-context failure recovery",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "long-operation-progress.md",
        "personal-vocabulary-upload.md",
        "automatic-updates.md",
        "school-mode.md",
        "README.md"
      ],
      "body": "# In-context failure recovery\n\nWhen an operation fails for a reason the person cannot diagnose from the message alone, the way out is offered at the surface where the failure was discovered, not buried in a menu somewhere else. Somebody whose upload has just been refused is looking at the upload control; a recovery they have to go and find is a recovery they will not find while they are annoyed.\n\n## Behavior\n\nA route has four parts, and each one exists because leaving it out is a way to ship the feature broken while it still looks right.\n\n**Where it goes.** The region is rendered as the *immediate next sibling* of the status line that reported the failure. Not appended to the end of the card, not dropped at the top of the page — both of those look entirely correct in a screenshot and are not what the contract asks for.\n\n**What it offers.** Every action is a capability the page really has. `recoveryFor()` is a pure function that names action ids; `RECOVERY_ACTIONS` holds the real implementations; and a route may only name an id declared there. A button that looks like it retries and does not is the decorative-control defect wearing a helpful face, and this arrangement is what makes it unshippable rather than merely discouraged.\n\n**What it refuses to pretend.** A route with nothing to offer says so, and says why, instead of showing a retry that cannot work.\n\n**What not to reach for.** `RECOVERY_FORBIDDEN` names the remedies that lose work, each with what it would cost, because those are exactly the fixes that look fastest to somebody who is stuck. A route may only warn about a declared remedy, and a declared remedy no route names is refused as dead.\n\n## Configuration\n\nNothing here is configurable, and it is off for nobody: a failure raises its route, a fix takes it down again.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application shows error messages for failed actions but does not consistently offer an inline recovery action at the point of failure; some errors require navigating elsewhere to retry. Nothing in this pass touched it.\n\n**Documentation website:** Implemented, in `site/app.js` and `site/styles.css`. Seven routes, one per failure this page can produce that somebody cannot get out of by reading the message alone.\n\n| Route | Raised when | Offers |\n| --- | --- | --- |\n| `vocabulary-rejected` | a personal-vocabulary file is refused | choose another file; remove the dictionary that is loaded (only when one is) |\n| `logo-rejected` | an image is refused as the mark | choose another image; go back to the shipped mark (only when one is stored) |\n| `update-check-failed` | the published version file cannot be read | check again now; open the downloads page |\n| `page-unbuilt` | this copy of the page carries no build identity | **nothing at all**, and says why |\n| `school-cannot-arm` | the browser gives this page no cryptographic digest | open this page over a secure connection (only when there is one) |\n| `local-storage-refused` | a write to local storage is refused | remove the image; keep only the newest 20 history entries; open the local history |\n| `regex-invalid` | Apply is pressed on a pattern the engine will not compile | empty the pattern; search that field as plain text instead |\n\nThree of those deserve their own paragraph.\n\n**`page-unbuilt` is the route that offers nothing, and it is the most important one in the table.** A page the site build never stamped has no commit to compare against the published one, and no control on the page can create one — so `Try again` there would be a lie somebody could press all day. It renders its reason where the buttons would have been. It also does a second job: the check button beside it is disabled in that state, and the canonical rule is that a disabled control names the unmet condition in adjacent text.\n\n**`local-storage-refused` is the one route not anchored to a control**, and the exception is declared rather than quietly taken. A write can be refused during any setting on any page, so there is no single control it belongs beside; it goes to the top of the page being read. It also names, in characters, what each store is currently using — the history, the image, the dictionary, the settings — so the space can be seen rather than guessed at. Characters and not bytes, in those words: a string's length is not its size on disk, and calling it bytes would be a measurement nobody took.\n\nThat route is the reason `writeLocal()` exists. Every `localStorage.setItem` on this page now goes through it — there is exactly one in the file, and a test refuses a second. Before that, a refused write threw out through whichever setter had just been used: the value stayed in memory and on screen, so the setting *looked* saved, and the next load quietly had the old one back with nothing anywhere saying why.\n\n**`regex-invalid` repairs a real defect rather than decorating one.** `applyRegex` used to `catch{return}` — the dialog stayed open, the Apply button appeared to do nothing whatsoever, and the only explanation was a preview line the person had already read and could not act on.\n\n### What the canon asks for that this surface has no equivalent of\n\nTwo clauses, named here rather than left as silent gaps.\n\n**Re-authentication.** The canonical rule says that where a failure is a refused credential or a missing permission scope, the surface offers re-authentication directly. This site has no account, no session and no credential to refuse: everything it stores is local to the browser reading it. The nearest real thing is `school-cannot-arm`, where a credential cannot be *created* because the browser gives an insecure page no digest, and the route there offers the one honest fix — the same page over https — and explicitly refuses the tempting one, which would be to keep the value somewhere this page could read back.\n\n**Handing the failure to a local coding agent.** A published website cannot launch anything on the reader's computer. There is no equivalent and none is faked.\n\n### Failures deliberately left without a route\n\n`FAILURES_WITHOUT_A_ROUTE` names these, each with its reason, so an absence is a decision somebody made rather than a gap nobody noticed: an export run that found nothing to export, a wrong value offered to the restricted presentation, and a page built with no release history. Each of those already says the whole answer on its own line, and a second copy of it would be this page nagging.\n\n## Failure modes\n\nA route whose surface is not on the current page renders nothing at all, rather than putting the region somewhere it does not belong. A failure with no declared route is refused by name (`no-route-declared`) and renders nothing. Raising the same route twice replaces the region rather than stacking a second one under it. Clearing takes a route id, because two routes share the update card's status line and a successful check must not remove the unbuilt-page route, which it has not solved.\n\nThe engine raises no notification and speaks no line of its own. Both are deliberate: a message box is somewhere else by definition, `notify` writes to storage — which is the very thing that has failed in one of these routes — and every failure routed here already speaks its own line, so a second one would be the narrator reporting one event twice.\n\n## Accessibility and localization\n\nThe region carries `role=\"group\"`, its own heading, and `aria-labelledby` pointing at it, so it names itself. It also carries `aria-live=\"polite\"`, because the failure line above it is a `role=\"status\"` and without that a listener would hear that something failed and never hear that there is a way out. Actions are real `<button type=\"button\">` elements and real `<a>` links; a link whose address resolves to nothing is not rendered as a dead one. Every part is built with `textContent` and never a markup string, which matters here because several of these values are somebody's own file quoted back.\n\nCopy: the region opens with `COPY.recoveryLead`, four English and four Cantonese variants selected by the two funny sliders, wired through `data-copy=\"recoveryLead\"` so it stays in step when a slider moves. The split is the point and it is tested — the lead line carries voice and nothing else, while every fact sits in a sibling of it, so no level can move one. Those facts are English at every level today, which is the honest state rather than a finished one.\n\n## Verification\n\n`console/site/tests/contracts/in-context-recovery.test.mjs` holds 56 tests that run the real extracted block from `site/app.js` over a recording DOM and a fake storage — the route table, the pure decision, the rendering, the guarded writer, and every wiring line anchored to a whole line and separately checked not to be sitting behind a comment. `console/scripts/negative-in-context-recovery-site.mjs` plants 75 breaks, one at a time, and requires each one to turn that file red and green again on restore; it is wired into `npm run test:inventories`.\n\nThree of those 75 stayed green on their first run and are worth recording, because two of them were faults in the checking rather than in the code. One break was inert: `after:null` swapped for `after:undefined`, both of which are falsy at the branch that reads them, so nothing was broken and the pass meant nothing. One assertion was vacuous: a file input starts empty, so \"the picker was emptied\" passed whether or not anything emptied it, and the test seeds a value first now. And one branch was genuinely unreachable — `renderRecovery` used to look a route's facts up in a side map keyed by route id, so a resolved route rendered directly lost every link's address and no route could reach the empty-address guard at all. That map is gone; the facts ride on the resolved route.\n\nNothing here has been driven in a real browser: no file has been refused by a real file picker, no real storage quota has been exhausted, and no screen reader has read one of these regions aloud. It is proved against its own extracted source, a recording page and a fake storage, and no further.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Personal vocabulary upload](personal-vocabulary-upload.md), [Automatic updates](automatic-updates.md), [School mode](school-mode.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/language-modes",
      "category": "platform",
      "title": "Language modes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "funny-levels.md",
        "school-mode.md",
        "../app/customise.md",
        "README.md"
      ],
      "body": "# Language modes\n\nLets a person pick English, playful Cantonese, or a bilingual view of every label the product shows.\n\n## Behavior\n\nA language mode setting is meant to control which language every user-facing string renders in, independent of the operating system's own locale, with three choices: English only, a playful Cantonese variant, and a bilingual mode showing both languages together without crowding the layout.\n\n## Configuration\n\nThe choice would live in application or site settings, persist across sessions, and apply to every screen at once rather than page by page.\n\n## Current status\n\n**Desktop application:** Not implemented. No language selector exists anywhere in the interface; every label is a fixed English string with no translation table behind it.\n\n**Documentation website:** Partial. Every top-level page and composed article now receives the same persisted English, Cantonese, and bilingual control. Shared shell labels and status copy change immediately; authored article prose remains its original source text, and the shell states that limitation.\n\n## Failure modes\n\nWhere a translation is missing for a chosen mode, the intended behavior is to fall back to English for that string rather than showing a blank or broken label; today there is nothing to fall back from, since no second language exists yet.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/local-file-converter",
      "category": "platform",
      "title": "Local file converter",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Privacy",
          "id": "privacy"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "long-operation-progress.md",
        "destructive-action-confirmation.md",
        "non-blocking-notifications.md",
        "regex-builder.md",
        "responsive-sizing.md",
        "README.md"
      ],
      "body": "# Local file converter\n\nThe converter backend and documentation-site equivalent are separate local surfaces. Both keep source bytes local, detect types from bounded bytes rather than extensions, and leave the source unchanged. Neither uses PATH discovery, a remote converter, or guessed output.\n\n## Behavior\n\nThere are two independent implementations here, and the difference between them is the point rather\nthan an accident of history. The desktop side is a **typed contract plus a renderer surface**: a\ncatalog, a queue seam and a set of fixed worker kernels, with no privileged process registered\nagainst it yet. The site side is a **working browser-local converter** whose adapters are limited to\nwhat a browser can honestly do without a bundled runtime. Both keep source bytes local, classify a\nfile from bounded bytes rather than from its extension, leave the source untouched, and refuse to\nenable an adapter through PATH discovery, a remote service, or a guess.\n\nRead the two subsections below as answering different questions: the first is what the desktop side\n*would* do when a privileged backend is registered against the contract, and the second is what the\npublished page does today.\n\n### Desktop backend contract\n\nThe backend defines a bounded, offline conversion catalog and a persistent queue. It always exposes Documents and PDF, Images, Audio, Video, Archives, Structured Data and Spreadsheets, Code and Text, and Binary Encodings, including when every adapter in a category is unavailable. Unavailable adapters remain visible with the exact missing bundled dependency and reason.\n\nThe fixed worker kernels cover strict UTF-8 text to canonical Base64, canonical Base64 to arbitrary binary data, arbitrary binary data to lowercase hexadecimal text, even-length hexadecimal text to arbitrary binary data, and strict UTF-8 line-ending normalization. A caller cannot supply code, a command, an executable, arguments, or environment variables. An adapter becomes enabled only with a packaged-artifact proof containing its absolute path, SHA-256, verification time, offline declaration, and exact runtime identity. Source-tree presence is not proof.\n\nKnown capabilities that remain unavailable until their runtimes are bundled and proven include PDF inspection and editing, office to PDF conversion, image conversion, audio and video transcoding, archive conversion, spreadsheet conversion, and document or markup conversion. The UI must show each missing dependency rather than hiding it.\n\nInput type comes from bounded signature inspection and strict UTF-8 decoding. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits the sniffing limit. Unknown non-text bytes remain arbitrary binary data. Empty files are not converted.\n\nEvery adapter declares input and output formats, packaged proof or an unavailable reason, sandbox boundary, resource limits, output validator, metadata and encoding behavior, lossiness, and required disclosures. The runner performs storage preflight, rejects symbolic-link sources and destination components, writes a unique temporary file, syncs and reopens it, validates the result, and only then replaces the destination atomically. Cancellation removes temporary output and leaves the destination unchanged. Transient Windows rename sharing violations use a short bounded retry; other errors fail immediately.\n\nThe queue consumes an `AsyncIterable` one path at a time and persists each item before requesting the next. It has no artificial total-file cap, uses bounded shards and concurrency from 1 through 8, checks source size and destination capacity before admission, and persists pause, resume, cancellation, per-file results, and crash reconciliation. Outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never becomes a false batch success.\n\nPDF adapters are cataloged but disabled until a packaged offline tool is proven. A valid adapter must reopen its output and verify page count, order, rotations, metadata, and opaque capability limits before replacement. Encrypted, signed, malformed, and unsupported inputs remain explicit facts.\n\n### Documentation site surface\n\nThe site exposes `converter.html` as a browser-local equivalent. Its catalog is categorized as Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Browser-bundled adapters are limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV, and Base64 output. Other entries stay visible as unavailable with their missing-adapter reason.\n\n**The paragraph that used to sit here described behaviour the page did not have, and the correction is recorded rather than written over.** From the commit that added `converter.html` until 2026-08-27 the page shipped a file picker, an adapter catalogue, a target select, a queue, a pager and a cancel button, and not one of those control ids appeared anywhere in `site/app.js`, which is the only script the page loads. Nothing read a file, nothing converted anything, and the classes the markup used had no rules behind them either, so every card rendered as an unstyled block. The old text described a queue with `reading` and `ready` states that had never existed in any source. What follows is what the page actually does.\n\n`initConverter()` in `site/app.js` wires every control. A chosen file is read through its own `File` object and identified by its bytes: a `%PDF-`, PNG, JPEG, GIF, ZIP, gzip, WAV, MP3, Ogg or MP4 signature decides first, then a strict UTF-8 decode that refuses rather than substituting replacement characters, then a classification that parses -- JSON if the whole file parses, JSONL if every line does, CSV or TSV on a consistent quoted field count. Markdown is the one kind decided by the file name, and its own reason says so out loud. A file over the 32 MiB bound is refused before anything reads it, and the refusal names the bound.\n\nThe queue reports queued, converted, skipped, failed or cancelled, five files to a page, with Convert, Download and Remove on each row and one batch button for the files currently listed. Conversion waits for an explicit press: choosing a file only inspects and describes it. What a conversion would lose is stated first, per target, and the row-shaped targets defer to the same `describeLoss()` the exports use, so the converter and an export cannot disagree about the same table and the same format. Cancel is checked between files and a cancelled file says so instead of staying queued; the batch reports converted, skipped and cancelled separately rather than calling itself a success. Two refusals are deliberate: a JSON array of scalars will not become a table, because naming its column would be this page inventing a heading, and a CSV whose header repeats a column is refused because a row read from it would lose one of them. Adapter search is plain text by default with its own adjacent regex builder. No `fetch` and no `XMLHttpRequest` appears anywhere in the block, and the page says in words that nothing was uploaded.\n\n## Configuration\n\nThere is no configuration file and no environment variable. What a caller may vary is what the typed\nseam takes, and the list is deliberately short (`console/shared/converter.ts:247-258`):\n\n| Call | Caller-supplied |\n| --- | --- |\n| `sniff` | `sourcePath`, and an optional `maxBytes` bounding how much of the file is inspected |\n| `createQueue` | a `label` |\n| `enqueueOne` | one `queueId` and one `ConverterRequest` — **one item per call**, so a transport can stream a selection instead of collecting an unlimited path list in memory |\n| `queuePage` | `queueId`, an optional `cursor`, an optional `limit` |\n| `startQueue`, `pauseQueue`, `resumeQueue`, `cancelQueue` | a `queueId` |\n\nThe eight categories are fixed in `CONVERTER_CATEGORIES` (`shared/converter.ts:1`) and are always\nshown whole, including a category in which every adapter is unavailable. That is a contract rather\nthan a default: a category that vanished when it had nothing to offer would read as a converter that\nsupports fewer kinds of file than it does, instead of one whose runtime is not bundled.\n\nWhich adapters are enabled is **not** a setting either. An adapter becomes enabled only with a\npackaged-artifact proof carrying an absolute path, a SHA-256, a verification time, an offline\ndeclaration and an exact runtime identity. Presence in the source tree is not proof, and there is no\nswitch that overrides it.\n\nTwo honest gaps in the section above, recorded here rather than left to be discovered: the\nbounded-shard and 1-to-8 concurrency behaviour it describes has **no counterpart in this\nrepository**. `ConverterBackendHandlers` exposes no concurrency or shard field, and no privileged\nprocess implements it — `shared/converter.ts` is a seam, `app/renderer/src/converter-surface.tsx` is\nits renderer, and nothing else in the tree references either. The site queue, by contrast, is real.\n\n## Failure modes\n\nThe backend and site both report unavailable adapters, malformed encodings, source mismatches,\nmissing disclosures, resource limits, storage shortages, cancellation, output validation mismatches\nand destination conflicts — without writing guessed or partial output. A failed item never becomes a\nfalse batch success, and cancellation removes temporary output and leaves the destination unchanged.\n\n## Privacy\n\nConversion is local-only. Paths must be absolute and null-free, symbolic-link sources and destination\ncomponents are refused, and no adapter is enabled through PATH discovery. Inputs, outputs, memory,\ntime, temporary storage, and concurrency are bounded. Existing destinations require explicit\noverwrite approval.\n\n## Verification boundary\n\nThe desktop backend half of this article is unchanged and carries the boundary it was written with: that lane ran no tests, lint, type checks, builds, packaging, runtime execution, browser sessions, network requests, or captures, so the desktop backend remains implemented but unverified.\n\nThe site half now has a focused contract of its own. `site/tests/contracts/local-file-converter.test.mjs` extracts the real DOM-free converter block out of `site/app.js` and runs it against real bytes -- a `%PDF-` header, a PNG signature, invalid UTF-8, a quoted CSV, a duplicated header column, a nested JSON value, an array of scalars -- and checks the Base64 output against an encoder it did not write. The wiring half is pinned separately by whole-line anchors, because a correct engine nothing calls is precisely the state this page was already in, and a substring needle is satisfied by a commented-out call.\n\n**What that contract does not claim.** Nothing here has been opened in a browser. No real file picker has been operated, no real `File` has been read, no download has been offered by a real browser, and no capture of the working surface exists. It is proved against the real extracted source and against the page's own markup, and no further -- so the registry row for `local-file-converter` records the surface as implemented while the two artifacts that need a running program remain absent.\n\n## Suggested articles\n\n[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Regex builder](regex-builder.md), [Responsive sizing](responsive-sizing.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/local-file-converter-ui",
      "category": "platform",
      "title": "Local file converter surface",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Search and regex builder",
          "id": "search-and-regex-builder"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "PDF commands",
          "id": "pdf-commands"
        },
        {
          "title": "Export and editor handoff",
          "id": "export-and-editor-handoff"
        },
        {
          "title": "Security and privacy boundaries",
          "id": "security-and-privacy-boundaries"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "complete-exports.md",
        "long-operation-progress.md",
        "in-context-recovery.md"
      ],
      "body": "# Local file converter surface\n\nThe desktop renderer exposes the local file converter through `ConverterSurface`. The\nsurface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed\n`ConverterClient` and keeps the privileged file and control-plane operations outside the\nrenderer component.\n\n## Behavior\n\n`ConverterSurface` is a renderer component and nothing more. It reads no path, launches no process\nand converts no bytes; each of those belongs to the typed `ConverterClient` a host registers. What\nthe surface owns is the sequence below, the catalog rendering, the per-category searches, and the\nhonest reporting of whatever the client returns — including the cases where the client returns\nnothing useful, which is most of what the rest of this article is about.\n\n### User flow\n\n1. Choose a local file through the client-provided native picker.\n2. Read the source bytes through the typed `sniff` method. The surface shows the exact\n   format, confidence, inspection method, byte count, and detail returned by the client.\n3. Review the complete adapter catalog. All eight categories remain visible, including\n   adapters that are unavailable because their required bundled dependency has not been\n   proven in the packaged artifact.\n4. Select an enabled adapter, review every loss, metadata, and encoding disclosure, and\n   acknowledge each disclosure.\n5. Provide an absolute destination path. The client may provide a native destination\n   picker, but the text field remains available and is validated again by the privileged\n   boundary.\n6. Request overwrite confirmation from the client. The renderer never assumes that a\n   destination is absent and never sets approval without the client response.\n7. Queue one request through `enqueueOne`. Queue records are loaded in bounded pages and\n   are never collected into an unbounded renderer array by the surface.\n\n## Search and regex builder\n\nEvery category owns a separate search query and an adjacent anchored regex builder. Plain\ntext is the initial mode. The builder exposes guided insertions for literals, character\nclasses, anchors, groups, alternation, and quantifiers, plus a raw JavaScript `RegExp`\npattern, flags, bounded sample text, syntax feedback, matches, capture groups, and copy.\nThe query and pattern stay synchronized when regex mode is selected. Invalid patterns and\noversized samples produce an explicit local error and no match result.\n\n## Configuration\n\nThe surface takes no settings. Everything a host varies is supplied when it registers the client\nthrough `CONVERTER_SURFACE_REGISTRATION`, and the two numbers worth knowing are fixed by the surface\nrather than chosen by the host:\n\n| Value | Set by | Note |\n| --- | --- | --- |\n| Queue page size | the surface | at most 100 records per load, with refresh and next-page controls, so a long queue is never collected whole into renderer state |\n| Client-call deadline | the surface | every call is bounded; a call that never settles becomes visible status copy rather than a spinner |\n| `sniff` inspection bound | the client, via `maxBytes` | the surface displays whatever format, confidence, method, byte count and detail come back |\n| Which adapters are enabled | the client's catalog | the surface renders unavailability with the client's exact reason and never hides a category |\n| Whether PDF execution exists at all | the client | the commands render from `pdfCapabilities`, and execution is offered only when the client exposes `runPdfOperation` *and* reports that capability available |\n| Whether export and editor handoff exist | the client | a missing client method leaves the control disabled with an exact reason rather than absent |\n\n## Failure modes\n\n- **A client method the host did not supply** — the control stays visible and disabled, carrying the\n  reason. This is the case the surface is most careful about, because a host registering a partial\n  client is the expected situation rather than an error.\n- **An unavailable adapter or PDF command** — visible, with the client's exact reason.\n- **A rejected promise or a deadline** — visible renderer error or status copy. No rejected call is\n  turned into a success state.\n- **A missing total on a running item** — rendered as an indeterminate detail. The surface does not\n  compute a percentage it was not given, and shows progress only once the client has reported a real\n  progress event.\n- **An invalid regular expression, or an oversized sample** — an explicit local error and no match\n  result, evaluated in the page.\n- **A destination that already exists** — overwrite approval is requested from the client. The\n  renderer never assumes a destination is absent and never sets approval on its own.\n\n## Verification\n\nSource-level only. The surface and its state machine are covered by the repository's renderer suite\n(`npm run test:renderer`) and its type check; those exercise the component against a supplied client.\n\nNothing here has been driven in the packaged application, and there is a specific reason it would\nprove little if it were: no privileged `ConverterClient` is registered anywhere in this repository,\nso a real launch shows the surface in exactly the unavailable states listed above. That is a truthful\nscreen, and it is not evidence that a conversion works. The inventory row stays\n`implemented-unverified`.\n\n## PDF commands\n\nThe surface renders inspect, split, merge, extract, reorder, rotate, and metadata commands\nfrom the `pdfCapabilities` response. Unavailable commands stay visible with the exact\nreason returned by the client. The operation form accepts absolute sources and the\noperation-specific ranges, pages, rotation, or metadata. Execution is available only when\nthe registered client exposes `runPdfOperation` and reports that capability as available.\n\n## Export and editor handoff\n\nThe surface exports only the queue page currently loaded by the renderer. JSON, CSV, and\nMarkdown descriptors state their media type, extension, scope, and loss note. A separate\nVisual Studio Code handoff descriptor opens the selected destination only through the\nregistered client. Missing client methods leave the controls disabled with an exact reason.\n\n## Security and privacy boundaries\n\nThe renderer does not read arbitrary paths, invoke a shell, discover machine-wide tools,\nor upload a source. The client owns native file selection, byte inspection, destination\nvalidation, bundled-adapter proof, overwrite confirmation, conversion, atomic output\nvalidation, and editor launch. The renderer holds only display metadata and the queue page\nprovided by the client. A consumer integration must keep the client methods local and\nbounded, and must not put credentials or source contents in logs, exports, history, or\ntelemetry.\n\n## Suggested articles\n\n- [Regex builder](regex-builder.md)\n- [Complete exports](complete-exports.md)\n- [Long-operation progress](long-operation-progress.md)\n- [In-context recovery](in-context-recovery.md)\n"
    },
    {
      "id": "platform/local-version-history",
      "category": "platform",
      "title": "Local version history",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "changelog-viewer.md",
        "destructive-action-confirmation.md",
        "../app/history.md",
        "README.md"
      ],
      "body": "# Local version history\n\nA Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.\n\n## Behavior\n\nEvery creation, edit, and deletion of a user-owned record is meant to be recorded as a commit in a local, isolated repository, with a browsing panel offering filtering, diffing, labeling, and non-destructive restore.\n\n## Configuration\n\nRestoring would itself be recorded as a new revision rather than rewriting history, so a restore could itself be undone.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application keeps no local version history of any kind; settings and records are overwritten in place with no way to browse or restore a prior state.\n\n**Documentation website:** Implemented as a browser-local equivalent at `history.html`. Visitor event metadata is append-only, searchable by text or regex, filterable by date and action, restorable only as a new event, and exportable with credentials and private vocabulary explicitly omitted.\n\n## Failure modes\n\nIf the local history repository became unreadable, the intended behavior is to keep the live data intact and report the history failure separately rather than blocking the operation that triggered it; nothing implements the repository today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/logo-conversion-contract",
      "category": "platform",
      "title": "App logo conversion contract",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Inspection and limits",
          "id": "inspection-and-limits"
        },
        {
          "title": "Crop and presentation",
          "id": "crop-and-presentation"
        },
        {
          "title": "Conversion and receipts",
          "id": "conversion-and-receipts"
        },
        {
          "title": "Local cache",
          "id": "local-cache"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "app-logo-customization.md",
        "complete-exports.md",
        "local-version-history.md",
        "responsive-sizing.md"
      ],
      "body": "# App logo conversion contract\n\nThe logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.\n\n## Behavior\n\nA person picks a shipped mark or one local image; the chosen mark is inspected from its bytes,\nconverted into the display sizes the surfaces actually consume, and cached locally. The single most\nimportant behaviour is the one in the sentence above this section, so it is worth restating as a\nrule rather than a remark: **a custom mark changes presentation and nothing else.** The package\nidentifier, the executable name, the installer identity, the update feed and the application-data\ndirectory are all derived from constants, never from the chosen logo — which is what makes changing\nit safe rather than a way to orphan a profile.\n\nThe three stages below are strictly ordered, and each refuses rather than degrading: inspection\nrefuses input it cannot prove is a still image within bounds, conversion refuses to run without an\ninjected isolated decoder, and the cache refuses to load an asset whose recorded signature,\ndimensions, alpha state and byte count no longer agree.\n\n### Inputs and picker\n\nThe renderer registers one semantic local file picker at `logo.custom-file`. Its accepted formats are PNG, JPEG, WebP, and static SVG. The picker is keyboard and screen-reader operable and exposes empty, reading, ready, invalid, replacement, and clear/reset states. A selected filename is UI state only and is not written to the conversion cache, history, exports, logs, telemetry, or captures.\n\n## Inspection and limits\n\nThe shared inspector reads bytes rather than trusting a file extension or declared MIME type. It validates PNG, JPEG, WebP, and SVG signatures, dimensions, frame count, alpha behavior, and decoded-memory estimates. It rejects malformed data, animated images, oversized inputs, dimensions beyond 4096 pixels, decoded buffers above 64 MiB, and SVG script, event-handler, animation, external-resource, or embedded-object content. The input limit is 8 MiB and the converted output set is bounded to 16 MiB.\n\nSVG is accepted only when its root is a static `svg` element with a width and height or a viewBox. No network fetch or remote resource is permitted. A production decoder must run in an isolated process with the same CPU, memory, input, output, and frame limits.\n\n## Crop and presentation\n\nCrop coordinates, focal point, and safe-area insets are numeric proportions between 0 and 1. The fit choices are contain, cover, and fill. The background is either transparent or a validated hexadecimal colour. The surface provides keyboard-editable number fields for all crop and focal values and warns when a solid background may not provide a 4.5:1 contrast ratio for the mark.\n\n## Conversion and receipts\n\nThe control-plane converter accepts an injected isolated decoder. It will not convert when that seam is absent. Every decoder result must contain bytes, a successful reopen or round-trip receipt, and optional loss notes. The converter independently re-inspects every output, verifies the requested format, dimensions, alpha policy, signature, output bounds, memory receipt, and elapsed CPU budget. Any failure returns a redacted reason and leaves the previous logo active.\n\nThe registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear`. They are local-only and are ready for the control-plane dispatcher to mount without granting the renderer filesystem or network access.\n\n## Local cache\n\n`LogoStore` writes only converted assets and a schema-versioned manifest beneath the app's private data directory. Asset names are generated from target metadata and a SHA-256 receipt. Loading rechecks the signature, dimensions, alpha state, and byte count. Missing or invalid cache data is treated as absent. Clear and reset remove the private logo cache; the shipped mark remains the fallback.\n\n## Configuration\n\nNothing here is settable at runtime. Every number in this contract is a bound, and a bound a caller\ncould raise is not a bound, so they are stated here as the fixed values they are:\n\n| Limit | Value |\n| --- | --- |\n| Accepted input formats | PNG, JPEG, WebP, static SVG — decided by signature, never by extension or declared MIME type |\n| Input size | 8 MiB |\n| Converted output set | 16 MiB |\n| Dimensions | 4096 pixels |\n| Decoded buffer | 64 MiB |\n| Frames | one; an animated image is refused rather than flattened |\n\nWhat a *host* supplies, rather than configures, is the isolated decoder. The control-plane converter\ntakes it as an injected seam and **will not convert when it is absent** — it refuses instead of\nfalling back to an in-process decode, which is the whole point of the seam. A production decoder must\nrun in an isolated process under the same CPU, memory, input, output and frame limits.\n\nThe five registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`,\n`logo.cache.write` and `logo.cache.clear`. They are local-only, and mounting them grants the renderer\nno filesystem or network access.\n\nCrop, focal point and safe-area insets are numeric proportions between 0 and 1; fit is `contain`,\n`cover` or `fill`; the background is transparent or a validated hexadecimal colour. Those are user\nchoices carried on the request, not installation settings.\n\n## Failure modes\n\n- **Malformed bytes, an animated image, an oversized input, dimensions past 4096, or a decoded\n  buffer past 64 MiB** — refused at inspection, before any conversion begins.\n- **An SVG carrying script, an event handler, animation, an external resource or an embedded\n  object** — refused. SVG is accepted only when its root is a static `svg` element with a width and\n  height, or a viewBox, and no network fetch is ever permitted.\n- **No injected decoder** — conversion does not run, and says so. It does not decode in-process.\n- **A decoder result without bytes and a reopen or round-trip receipt** — rejected. The converter\n  re-inspects every output independently and verifies the requested format, dimensions, alpha\n  policy, signature, output bounds, memory receipt and CPU budget.\n- **Any conversion failure** — a redacted reason, and the previous logo stays active. A failed\n  attempt never leaves the application with no mark.\n- **Missing or invalid cache data** — treated as absent, so the shipped mark is the fallback. Clear\n  and reset remove the private cache and land in the same place deliberately.\n- **A solid background that may not reach a 4.5:1 contrast ratio for the mark** — a warning on the\n  surface. It is a warning rather than a refusal because the mark's own contrast is the person's\n  design decision; being unaware of it should not be.\n\n## Verification boundary\n\nThis lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.\n\n## Suggested articles\n\n- [Material appearance](material-appearance.md) — the wider appearance model this mark is one part of.\n- [App logo customization](app-logo-customization.md) — the user-facing surface these contracts sit under.\n- [Complete exports](complete-exports.md) — why an export carries logo metadata and never the asset bytes.\n- [Local version history](local-version-history.md) — where a logo change is recorded, like any other settings change.\n- [Responsive sizing](responsive-sizing.md) — the display sizes the converted set has to survive.\n\n"
    },
    {
      "id": "platform/long-operation-progress",
      "category": "platform",
      "title": "Long-operation progress reporting",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Documentation website",
          "id": "documentation-website"
        },
        {
          "title": "Desktop application",
          "id": "desktop-application"
        },
        {
          "title": "Correction to an earlier version of this article",
          "id": "correction-to-an-earlier-version-of-this-article"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Not verified here",
          "id": "not-verified-here"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "destructive-action-confirmation.md",
        "non-blocking-notifications.md",
        "guided-forms.md",
        "README.md"
      ],
      "body": "# Long-operation progress reporting\n\nAn operation started from a dialog reports its own progress inside that dialog, rather than spinning. A spinner and a hang look identical from the outside, so a spinner tells nobody anything at the moment it matters.\n\n## Behavior\n\nThree properties carry this contract, and the second is the one usually shipped half-built.\n\n1. **Real progress inside the originating dialog.** A determinate bar counting real units, and the same counts in words beside it. Not a percentage disconnected from the work, and not an animation that runs whatever is or is not happening.\n2. **Both halves of the duplicate-submission guard.** The submitting control is disabled for the whole run **and** the handler itself refuses a second entry. A disabled button is the visible guard, never the real one: a keyboard submit, a second press landing in the same frame, or anything holding a reference walks straight past `disabled`.\n3. **Expensive optional work is a choice.** Offered where it is relevant, hidden where it is not, and saying plainly what declining leaves undone.\n\n## Documentation website\n\nImplemented, in `site/app.js`, `site/settings.html` and `site/styles.css`. **Settings → Search & actions → Export everything…** opens a dialog that writes one file for every record set the page owns, in the single format chosen.\n\nThe five record sets are **local settings** (the redacted snapshot, flattened to one `setting`/`value` row per leaf), the **destination catalogue**, **notification history**, **local settings history**, and the **changelog**.\n\n`planExportEverything` decides the whole run before it starts, so the plan a person reads and the work that then happens cannot disagree. It is a pure function; the sentence above the bar, the bar's own maximum, and the list of formats offered all come out of it.\n\n**Size, said plainly rather than implied away.** On a browser holding a handful of notifications this finishes in milliseconds. Two things make a real report worth having anyway: the unit count has no upper bound, because the changelog gains a version every time this site is published; and a run stopped halfway has to be able to say which files already exist. A spinner can say neither.\n\n### What the report actually shows\n\nA unit is one record set. The bar's `max` is the number of units this run will write and its `value` is the number written, so a completed run fills the bar exactly. Beside it, in words:\n\n- announcing a record set: `Writing 3 of 5: Notification history (12 rows). 9 of 41 rows done.`\n- between record sets: `3 of 5 written, 21 of 41 rows done.`\n- cancelled: `Cancelled after 1 of 5. Already written: ding-pbx-page-settings.json.`\n- failed: `Stopped after 2 of 5: Notification history could not be written (…). Already written: …`\n- finished: `Finished. 5 of 5 written, 41 rows. Already written: …`\n\n**The index and the name always agree.** A single line carrying both while a record set has just finished says *Writing 3 of 5* beside the name of the one that finished second, which does not read as an off-by-one — it reads as the report naming the wrong thing. Between units there is no unit to name, so it does not name one.\n\n### Why the run pauses twice per record set\n\nThe run announces a record set, yields, then does its work. The other order writes the sentence and overwrites it inside one synchronous block with no paint between, so the name is never seen and the page appears to freeze on whatever the previous line said. That is the same failure as a spinner, with a sentence instead of one.\n\nIt pauses again after the record set lands. Without that second pause the completion render is superseded by the next announcement inside one block, so the count between units never paints and the cancel check at the top of the loop has no window to fire in. Both would read in the source exactly like things somebody sees.\n\n### Cancelling\n\nCancelling lands **between units and never inside one**, because a record set's conversion is a single synchronous call into the shared export engine. That is exactly why a cancelled run can name the files it already wrote rather than claiming nothing happened. There are two windows: while a record set is announced but not yet written, in which case nothing is written for it; and after one lands, in which case it is kept and named. After a cancel the page never announces a further record set.\n\n### The expensive optional phase\n\nThe changelog is the only record set here with no upper bound. Its checkbox is shown **only when it actually has rows** — a choice offered to leave out something that does not exist is a question with one answer — and the sentence beside it names what declining costs: every released version, its date, its categories and its commit ids.\n\n### One format for the whole run\n\nOne format is chosen for all five record sets, so the list offered is the **intersection** of what the shared export engine judges suitable for each. A format that suits four and damages the fifth would damage the fifth silently, since each file is written on its own and nothing afterwards compares them.\n\nWorth being exact about what that buys today: `exportEverythingRows` maps four of the five record sets onto fixed column names of its own, so on ordinary data the intersection narrows nothing. It is a guard against the next record set somebody adds rather than a live difference.\n\n### Local only\n\nEvery record set here is local, `exportRows` produces text, and `download` writes it. No request is made, and the contract test refuses the operation's source if it grows one.\n\n## Desktop application\n\nPartial, and unchanged by this work. Long actions show a generic busy indicator rather than real progress, and only the visible button — not confirmed keyboard re-entry — is guarded against duplicate submission. Nothing in this pass touched the desktop console.\n\n## Correction to an earlier version of this article\n\nThis article previously said, under *Current status*: \"**Documentation website:** Not implemented. The documentation website triggers no long-running operations of its own.\"\n\nThe second sentence was the reasoning behind the first, and it was doing the work of an exemption. It is better read as a description of what had not been built than as a fact about the surface: the site owns five record sets, an export engine with ten formats, and a `download` path, so an operation over all of them was always available to build. Recorded rather than quietly replaced, because a sentence that reads as a reason not to build something is worth knowing was wrong.\n\n## Configuration\n\nNothing here is persisted. The chosen format and the changelog choice belong to one run and are re-derived each time the dialog opens. A freshly opened dialog also reports nothing rather than the tail of a run that ended ten minutes ago, since a leftover *Finished* line reads as this attempt having already succeeded; a run still in flight is left exactly alone.\n\n## Failure modes\n\n- **A record set that cannot be written** stops the run there, names which one and why, and names the files already produced. A report saying only \"the export failed\" would leave somebody deleting good files.\n- **Nothing to write** — every record set empty, or the only non-empty one declined — disables Start with that exact reason, in the page as well as in the tooltip, and refuses the run rather than reporting an empty success.\n- **A second start request** while a run is in flight is refused by the handler, counted, and shown: *1 further start request was refused while an export was already running.*\n- **A page without the dialog** (every page but Settings) is skipped rather than crashed on.\n\n## Accessibility and localization\n\nThe bar carries its own label and the count is a sentence as well as a bar, announced through `role=\"status\"` and `aria-live=\"polite\"` — a bar alone gives a screen reader a percentage and no words. Start and Cancel are `type=\"button\"`; inside `<form method=\"dialog\">` a button with no type is a submit button, and a submit closes the dialog, which would destroy the whole progress report at the instant it began. Every disabled control names the condition that is unmet in the page itself, not only in a tooltip, since a tooltip is pointer-only. The bar has no animation, so a reduced-motion preference costs nothing here.\n\n`COPY.exportEverythingDesc` ships four English and four Cantonese variants wired to the funny sliders through the dialog's `data-copy` hook, and three facts survive every level. The plan sentence, the progress sentence, the decline sentence and the disabled reason are rendered from the run's own numbers rather than from `COPY`, so they are English at every level — they are a factual report of counts and filenames rather than product prose — and every one of them still passes through `applyVocabularyText`.\n\n## Verification\n\n`site/tests/contracts/long-operation-progress.test.mjs` — 41 tests, running the real extracted source against a recording page and controllable timers. The export engine is not faked: the real slice of `site/app.js` is extracted and run, because the format intersection is only meaningful against that engine's real suitability rules.\n\n`scripts/negative-long-operation-progress-site.mjs` plants **63 breaks, one at a time**, each turning that file red and green again on restore. It is wired into `test:inventories`.\n\nThree of those breaks stayed green on their first run, and all three were defects in this implementation rather than gaps in the test:\n\n- the finished record set was left named while the count advanced past it, producing the off-by-one described above — invisible, because the render was superseded before any paint;\n- the count between units never painted, for the same reason, making that branch unreachable;\n- the cancel check at the top of the loop had no window to fire in, making it dead code that looked live.\n\nThe second pause per record set is what makes all three real, and the assertions that now catch them sample the sentence **from the element** across the whole run rather than reading a return value. A run that computed a perfect progress line and never wrote it to the page is exactly the failure a return-value assertion cannot see.\n\n## Not verified here\n\nNothing on this page has been opened in a browser by this work. It is proved against its own extracted source, a recording page, controllable timers and the real export engine, and no further: no real `<progress>` element has been painted, no real download has been written to a disk, and no browser's own multiple-download prompt has been met. The built-artifact interaction record and the capture that the per-surface inventory asks for do not exist for this row.\n\n## Suggested articles\n\n[Complete exports](complete-exports.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Guided forms](guided-forms.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/material-appearance",
      "category": "platform",
      "title": "Material appearance system",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "app-logo-customization.md",
        "browser-style-tabs.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# Material appearance system\n\nRuntime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.\n\n## Behavior\n\nA conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.\n\n## Configuration\n\nColors would be chosen through a continuous picker with bidirectional conversion between common color notations rather than a fixed swatch grid; presets would be exportable and importable as files.\n\n## Current status\n\n**Desktop application:** Partial, and corrected 2026-08-25. The accent colour (hue/saturation/lightness), font family, font weight, and font size controls are genuinely live: changing any of them writes a real inline style onto the console's root element immediately, with no restart, persists across relaunch, and can be exported as a re-importable JSON theme file. There is no import path yet for that same file even though export is real, and the whole system is scoped to one global (wildcard) theme rather than the true per-element appearance editor the contract describes, because the compiled interface exposes no per-element CSS hook for a rule to be read back from. A `Theme: Dark / Light / Follow system` control also exists and persists, but it has no effect: the compiled design bakes literal dark-mode hex colours and pixel paddings rather than CSS custom properties the theme setting could switch, so it is a stored intention with no live consumer, in the same way a density control sits beside it.\n\n**Documentation website:** Partial. Every page exposes persisted dark, light, and high-contrast themes, density, accent, font scale, navigation docking, logo presets, and a broad color translator. These values apply live. Per-element editors and full word-processor typography remain incomplete.\n\n## Failure modes\n\nAn appearance change that fails to persist (for example, a write to a locked settings file) is meant to notify the user and keep the prior appearance in effect rather than silently reverting after the fact.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.\n\n## Verification\n\n`console/tests/contracts/material-appearance.test.mjs` pins which of the six imported appearance symbols write real styles, which one (theme import) is dead, and the wildcard-only scoping, against the source directly. Verifying it by hand means opening the desktop application's appearance panel and dragging the hue control while watching the console's own text colour change live.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/narration",
      "category": "platform",
      "title": "Spoken narration",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "What is not claimed",
          "id": "what-is-not-claimed"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "personal-vocabulary-upload.md",
        "attention-modes.md",
        "README.md"
      ],
      "body": "# Spoken narration\n\nAn optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.\n\n## Behavior\n\nThe narrator speaks application events using the platform's speech synthesis voices, in English, Cantonese, or both in sequence (English first, then Cantonese, strictly serialized -- never overlapping), with independently selectable voice, rate, and pitch per language. It stays off until the user turns it on with the **Narration** switch, and everything else it reads is a real, already-happening console event -- the non-blocking notifications the console shows (`fire`, the title-and-body kind) and the toast messages (the lighter one-line kind), including the ones the compiled console already raises on its own for a settings change (\"… set to true\", \"Nice … switched on.\"). Nothing was invented specifically to be narrated; the narrator reads what the console already says on screen.\n\nNarration is infrequent by design: ordinary (non-error) lines are rate-limited per category (see Configuration), and a line still queued when a newer one in the same category arrives is replaced rather than stacked, so the console never reads a backlog of superseded status lines aloud. A genuine failure -- currently the two boolean-checked daemon failures (\"The phone system did not start\" and daemon start/stop/restart's \"Not done\") -- is passed through as an error and is never dropped by that rate limit, however soon after another notice it arrives.\n\nThe narrator also yields to two things outside its own settings: an active screen reader (detected through Electron's own accessibility-support signal, forwarded from the main process) and the **Low stimulation** attention mode, which doubles as this feature's quiet-hours setting. Either one silences the narrator immediately, live, without needing to turn narration itself off.\n\n## Configuration\n\nSeven controls on the Customise screen (`nar_*`), each persisted independently:\n\n- **Narration** (`nar_enabled`) -- the master off/on switch. Off by default.\n- **Narrated language** (`nar_language`) -- English, Cantonese, or Both.\n- **English voice** / **Cantonese voice** (`nar_en_voice` / `nar_yue_voice`) -- populated from the voices this computer actually reports, defaulting to \"Choose automatically\" rather than a named voice nobody may have installed. The saved value is the voice's stable platform identity, not its display name, because names are not unique and are localized.\n- **Narration rate** / **Narration pitch** (`nar_rate` / `nar_pitch`) -- 0.5-2.0 and 0-2 respectively, matching the platform's own ranges.\n- **Narration status** (`nar_status`, read-only) -- states plainly which voice will actually speak right now, or exactly why nothing can: no voice chosen (using the system default), a chosen voice that isn't installed here (falling back, choice kept), a chosen voice that is network-backed and will go quiet offline, or no voice on this machine that can read the chosen language at all -- including the case where this computer has no speech synthesis whatsoever.\n\nEvery one of the seven applies live: the switch, the language, either voice, and both sliders reach the running narrator the instant they are chosen, not only on the next restart.\n\nThe documentation website ships the same six user-facing controls in its own ACCESSIBILITY card -- `narration-enabled`, `narration-language`, `narration-voice-en`, `narration-voice-zh`, `narration-rate` and `narration-pitch` -- plus one status line per narrated language rather than one combined read-only control, since each picker has its own thing to say. The site's ranges are the same 0.5-2.0 and 0-2, clamped in code as well as offered by the sliders, so a hand-edited settings blob cannot hand the browser a rate of 40. Its categories and their shortest gap between two ordinary lines are declared in one table: `setting`, `export`, `search` and `notification` at four seconds, and `error` at zero. A category no table row declares is refused rather than given a default, because a silent default is how a typo becomes a category of its own with nobody's rate limit on it.\n\n## Current status\n\n**Desktop application: implemented.** `app/renderer/src/narration.ts` holds the pure, injectable `Narrator` (queue, per-category cooldown, \"both\" serialization, error bypass, voice-status resolution -- fully covered by `tests/ui/narration.test.tsx`). `app/renderer/src/narration-engine.ts` is the one real `SpeechEngine` adapter over the platform's Web Speech API, falling back to a null engine that never speaks but still resolves and reports honestly when no `speechSynthesis` exists at all (`tests/ui/narration-engine.test.tsx`). `App.tsx` constructs one `Narrator` for the life of the component, wires the seven controls to it, and narrates through the console's own existing notification paths (`fire`/`toast`) rather than a second, parallel event system -- proven reached from the real mount chain, not merely imported, by `tests/ui/narration-wired.test.tsx`.\n\nScreen-reader ducking is wired through `app/electron/main.ts` (`app.isAccessibilitySupportEnabled()` and its change event) and `app/electron/preload.ts`/`preload.cjs`, exposed to the renderer as `window.dingDesktop.accessibility`. It is optional on the bridge, exactly like `provisioning`: the hosted HTTP surface has no Electron main process behind it and degrades to doing nothing rather than guessing.\n\n**Documentation website: implemented, on 2026-08-26.** The sentence that used to sit here -- \"a static documentation site has no application events of the kind this feature narrates\" -- was wrong, and it is worth saying why rather than quietly replacing it. The site raises the same kind of events the console does and has for some time: it has its own `notify()`, its own toast region and its own notification history, and thirteen call sites reach them (a setting saved, an export written, a regular expression applied, a colour copied, a local revision restored, an idle nudge, and so on). What it had no way to do was read any of them aloud.\n\n`site/settings.html` carries an ACCESSIBILITY card holding the master switch, the narrated-language choice, one voice picker per language with its own live status line, and rate and pitch sliders. `site/app.js` holds `state.narration` (`enabled:false` in `DEFAULTS`, so it is silent for anyone who never switches it on), the `NARRATION_TRACKS` and `NARRATION_CATEGORIES` tables, `narrationGate()` as the single pure decision about whether a line is spoken at all, a serialized queue in `pumpNarration()` so two utterances never overlap and \"Both\" means English and then Cantonese, and `applyNarration()` called from `applyState()`.\n\nFour things the site does differently from the console, each deliberate:\n\n- **Its narrated lines carry their own English and Cantonese wording.** The console reads its English notification text through whichever voice is selected; the site's `notify()` takes an explicit narration descriptor, so a Cantonese voice reads Cantonese words. A descriptor may name a `COPY` key instead, which reads that key at each language's own funny level.\n- **A line is spoken in the language it actually has wording for.** Where a line has no Cantonese text and Cantonese is the narrated language, `narrationTracksFor()` falls back to English rather than handing English words to a Cantonese voice, which is not Cantonese narration but English mispronounced. The status line under the unselected picker says that is what it does.\n- **The Cantonese track prefers a real Cantonese voice.** `zh-CN` is Mandarin, and a Mandarin voice reading Cantonese is a different language rather than an accent, so `yue-*` and `zh-HK` rank ahead of any other `zh-*`. The console matches on the `zh` prefix alone; that has not been changed here and is not claimed to have been.\n- **It cannot duck under a screen reader, and says so.** The console detects one through Electron's own accessibility signal; a browser has no equivalent API. The card states that plainly rather than implying it steps aside, and **Low stimulation** doubles as the site's reduced-sound setting, silencing it live -- errors included, because \"quieter\" that keeps talking is not quieter.\n\n**The privacy boundary is the part worth reading.** A voice whose `localService` is `false` is synthesised on somebody else's server, so the words handed to it leave the computer. Two rules follow. Narrated text never passes through `applyVocabularyText`: `narrationTextFor()` reads `copyLevel()`, the per-language copy *before* the personal vocabulary is substituted, so a private dictionary cannot be spoken through a remote voice. And a rejected personal-vocabulary file is the one rejection on the site whose reason is shown and never spoken, because several of those messages quote the file back -- a duplicate term, an over-long replacement. A rejected logo, by contrast, does speak its reason, because every reason that branch can carry is written by this site or by the browser's own file reader and none of them quotes the image. Both routes go through one writer each (`rejectVocabulary`, `rejectLogo`) so the rule holds for every branch rather than for whichever one somebody remembered.\n\nWhere the effective voice *is* network-backed, the status line says so, in those words, in the automatic and fallback cases as well as the chosen one.\n\n## Failure modes\n\nSpeech synthesis being unavailable is a reported state, not a silent no-op: the **Narration status** control says so plainly (either \"no speech synthesis on this computer\" from the initial enumeration, or \"no voice on this machine can read \\<language\\>\" once a control is touched and the status is recomputed from the same honest voice-resolution logic). Enabling narration and firing an event on a machine with no synthesis does not throw or hang -- there is simply nothing to speak through, and the status line says exactly that. A synthesis error mid-utterance (the adapter's `onerror`) resolves that one utterance and lets the queue continue, rather than blocking every line behind it.\n\n## Accessibility and localization\n\nThe narrator ducks under a real, currently-active screen reader (not a guess -- Electron's own accessibility-support signal) and under the **Low stimulation** attention mode, both live. Its own seven controls follow the console's standing accessibility contract (keyboard reachability, visible focus, correct roles and names) as ordinary compiled console controls. Narrated copy is currently the console's own English notification text; it is not yet independently translated per narrated-language selection beyond the voice/engine actually speaking Cantonese when chosen.\n\n## Verification\n\n`tests/ui/narration.test.tsx` -- the pure `Narrator` logic (queue, cooldown, \"both\" serialization, supersession, voice-status resolution, dispose) against a fake `SpeechEngine`.\n\n`tests/ui/narration-engine.test.tsx` -- the real `SpeechEngine` adapter against a fake `speechSynthesis`/`SpeechSynthesisUtterance` platform, including the no-synthesis-at-all fallback.\n\n`site/tests/contracts/narration.test.mjs` -- the site's narrator, 62 tests. The behavioural half evaluates the real extracted source from `site/app.js` against a recording DOM and a fake speech engine that only finishes an utterance when the test says so, because \"one at a time\" is a claim about what happens while one is still going and an engine that completes instantly can never fail it. It covers off-by-default, the engine really receiving the words, cancelling mid-sentence, serialization, \"Both\" in order and in two voices, supersession, the per-category cooldown, the error bypass, Low stimulation silencing it live (including between the two halves of one bilingual line), an undeclared category being refused rather than defaulted, the vocabulary boundary in both directions, the automatic/kept-choice/fallback/network/no-voice/no-engine status sentences, the late `voiceschanged` list, `pagehide` cancelling and unsubscribing, clamping, and every control being read back and bound. It additionally walks every `notify()` and `narrate()` call site with a hand-written argument splitter -- hand-written because these call sites nest template literals inside template literals and a comma-splitting pattern would miscount in the direction that reads as \"every call passes what it should\" -- and that splitter has a self-check of its own.\n\n`scripts/negative-narration-site.mjs` -- 48 planted breaks, each alone, each turning that contract test red and then green again on restore, wired into `test:inventories`. Two of the 48 survived on their first run and both were gaps in the tests rather than in the code: the error-bypass flag is unobservable through the error category (whose own cooldown is 0, so the two mechanisms say the same thing), and the queue's outer drain guard turned out to be a fast path -- the per-line guard is what actually stops the narrator, and it is only individually observable between the two halves of a bilingual line. Both properties now have assertions that name them.\n\n`tests/ui/narration-wired.test.tsx` -- the real `App`, mounted (`componentDidMount` actually called, not skipped), driven through its real controls (`setVal`, `fire`, `toast`) exactly as a user or the compiled console would: off by default, enabling causes real speech, disabling silences it again, \"Both\" serialization, the cooldown-vs-error distinction at the real daemon-failure call sites, the honest no-synthesis status, late voice enumeration, screen-reader ducking, Low-stimulation quiet-hours ducking, and a source-anchored guard that the wiring itself (the `Narrator` import and the live `.enqueue(` calls) is actually present rather than merely available. Supersession specifically is proven in the pure suite above rather than re-derived at the mount level -- see the comment above the (deliberately absent) mount-level \"burst\" test in that file for why: the real, non-zero default cooldown structurally prevents observing \"replace, don't stack\" through a synchronous burst of same-category events, which is exactly why the pure test isolates that property with a near-zero cooldown.\n\n## What is not claimed\n\nNothing here has been driven in a browser by this pass. The site's narrator is proved against its own extracted source, a recording DOM and a fake speech engine, and no further: no real `speechSynthesis` has spoken a word of it, no real voice list has been enumerated, and the pages-site row for `narration` therefore stays `unverified` -- implementation, documentation, localized copy and a local check now exist, and the two artifacts that need a running program do not. The desktop console was not touched.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Personal vocabulary upload](personal-vocabulary-upload.md), [Attention modes](attention-modes.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/non-blocking-notifications",
      "category": "platform",
      "title": "Non-blocking notifications",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "dialog-emojis.md",
        "status-hub.md",
        "../app/notifications.md",
        "README.md"
      ],
      "body": "# Non-blocking notifications\n\nToast-style status messages anchored in a screen corner, used for anything that only informs rather than something the user must decide on.\n\n## Behavior\n\nInformational, success, progress, and non-decision error messages are meant to appear as auto-dismissing (persistent for warnings and errors) toasts anchored to a screen corner, stacking without overlapping, reserving blocking dialogs strictly for confirmations and destructive-action gates.\n\n## Configuration\n\nNotifications would carry an optional title, body, and action links, and remain reviewable afterward in a notification history rather than vanishing without a trace.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application shows a small number of transient status messages during build and deployment actions, but they are not consistently corner-anchored, do not stack predictably, and there is no notification history panel to review a dismissed one.\n\n**Documentation website:** Implemented. Every top-level and composed article page uses the same corner notifications and persisted history, with search, an adjacent regex builder, real multi-select dismissal, and selected-record export. A filtered no-match state is distinct from a truly empty history.\n\n## Failure modes\n\nA notification that cannot be shown in the corner remains in local history. History is bounded to 30 entries, and destructive bulk dismissal requires a reviewable confirmation before records are removed.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Dialog emoji toggle](dialog-emojis.md), [Status hub](status-hub.md), [Notifications](../app/notifications.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/offline-documentation-browser",
      "category": "platform",
      "title": "Offline documentation browser",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "README.md"
      ],
      "body": "# Offline documentation browser\n\nA fully offline, in-app documentation browser bundling every feature article, with internal links and a search bar, independent of the public documentation website.\n\n## Behavior\n\nEvery article is meant to be bundled into the application at build time, rendered through one shared markdown renderer, with article-to-article links resolving inside the browser and a search bar covering both titles and article bodies.\n\n## Configuration\n\nA completeness guard would fail the build if any article file present in the source tree were missing from the bundle.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no in-app documentation browser; it links out to the public documentation website instead of bundling articles for offline use.\n\n**Documentation website:** Partial. The documentation website itself hosts and renders these same articles online, with in-page section navigation and inter-article links, but it depends on network access and is not the bundled in-app offline browser this feature describes; there is also no full-text search across article bodies yet, only the article list.\n\n## Failure modes\n\nAn article present in the source tree but missing from a build's bundle is meant to fail that build outright; the site's own build script instead simply reflects whatever exists on disk, which is a different and looser guarantee than this feature calls for.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/ollama-local-suite-backend",
      "category": "platform",
      "title": "Local Ollama suite backend",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Dispatch integration",
          "id": "dispatch-integration"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "guided-forms.md",
        "long-operation-progress.md",
        "local-version-history.md",
        "README.md"
      ],
      "body": "# Local Ollama suite backend\n\nProvides the bounded, local service layer for inspecting and operating an Ollama installation through its documented loopback HTTP API. This article covers the backend contract only. The desktop application does not expose these actions until its dispatcher and user interface integrate the handler maps described below.\n\n## Behavior\n\nThe backend provides independent typed handler maps for these areas:\n\n- Runtime health and version, installed models, running models, model details, copy, and deletion.\n- Verified catalogue refresh through an injected paginated source, with source identity, revision, refresh timestamp, page count, completeness, and staleness recorded together.\n- Exact reconciliation between catalogue variants and the models Ollama reports as installed or running. Installed models missing from the catalogue remain visible as installed-only records.\n- Conservative hardware-fit assessment with four results: Runs well, Runs with limits, Unlikely, and Unknown. Every result carries measured evidence, explicit assumptions, and blockers.\n- A durable pull queue with bounded parallelism, per-item byte progress when Ollama supplies it, cancellation, retry, restart recovery, and reconciliation against current installed state.\n- Multi-session streamed chat with model capability checks, validated generation parameters, bounded content and attachments, event delivery, cancellation, retry, and regeneration.\n- Application-owned harness profile preflight, launch, configuration snapshots, one-click restore, and automatic rollback after a failed launch or health check.\n\nEach module exports a typed handler factory. A later integration step may compose those maps into the shared dispatcher without duplicating behavior.\n\n## Configuration\n\nThe Ollama client accepts only an HTTP loopback endpoint. The default is `http://127.0.0.1:11434/`. Credentials, non-loopback hosts, redirects, unrecognized API paths, oversized responses, invalid UTF-8, and malformed JSON are refused.\n\nCatalogue refresh uses an injected `OllamaCatalogPageSource`. This is intentional because Ollama's documented loopback API exposes local tags, not an exhaustive official online catalogue. The source must supply every page and variant, keep one stable source identity and revision throughout a refresh, end with an explicit terminal page, and never substitute a curated subset.\n\nDurable state is written beneath application data through `OllamaStore`. The file has a versioned schema, bounded record counts, a 32 MiB size ceiling, serialized writes, a unique temporary file per mutation, bounded rename retries, and restrictive file permissions where the platform supports them.\n\nHarness execution requires an application-supplied registry of executable policies, fixed argument rules, environment rules, working-directory roots, mutable configuration keys, health checks, a structured process launcher, and a configuration adapter. Profiles identify a registered executable policy. They never contain a command line or shell script.\n\n## Failure modes\n\n- A refused or timed-out loopback endpoint reports a stopped state. A reachable endpoint with an invalid response reports unhealthy. The backend does not claim that Ollama is missing when the loopback observation cannot distinguish missing from stopped.\n- If an official catalogue refresh fails and a verified cache exists, the previous complete snapshot remains available and is marked stale with the exact refresh reason. With no cache, the catalogue is explicitly unavailable and incomplete.\n- Fit becomes Unknown when exact blob size, available RAM, or free destination storage was not measured. Missing measurements never become zero.\n- Pull records retain failed, cancelled, skipped, and completed outcomes independently. One failed item never turns the batch into a complete success or removes another installed model.\n- Chat refuses image attachments unless the selected model reports vision capability. Streams that exceed response limits are cancelled and reported as failed rather than truncated into a success.\n- Harness preflight refuses missing models, unknown policies, shell or script launchers, unrecognized arguments, credential-bearing fields, paths outside allowlisted roots, unknown environment keys, unavailable health checks, and invalid ports.\n- Harness configuration is restored automatically when launch or health verification fails. A successful launch retains its snapshot so the user can restore it explicitly later.\n\n## Security and privacy\n\nThe Ollama transport never calls a cloud model service and never accepts a non-loopback endpoint. It uses explicit API paths, separate structured request fields, bounded response decoding, request deadlines, and cancellation signals.\n\nThe persistent store rejects fields whose names indicate passwords, tokens, credentials, API keys, or private keys. Chat message content stays in memory in this backend contract rather than being written into the plain state file. Product integration must keep operating-system credential storage and redacted export behavior at the application boundary.\n\nHarness launch is application orchestration. Ollama does not launch arbitrary programs. The executable path comes from a reviewed policy, arguments are compiled from typed allowlist rules, and only declared environment keys reach the launcher. Shells, script hosts, script files, free-form commands, and ambient secret-bearing environment fields are refused.\n\n## Dispatch integration\n\nThe handler factories are:\n\n- `createOllamaRuntimeHandlers`\n- `createOllamaCatalogHandlers`\n- `createOllamaFitHandlers`\n- `createOllamaPullHandlers`\n- `createOllamaChatHandlers`\n- `createOllamaHarnessHandlers`\n\nThey use the action names declared in `console/shared/ollama.ts`. This backend lane does not edit `console/control-plane/dispatch.ts`, the Electron bridge, or renderer code. Until those seams are integrated, the installed application cannot call the new actions.\n\n## Verification\n\nNo tests, type checks, lint, build, packaging command, runtime request, or screen capture ran for this ultra-speed implementation lane. The evidence available from this lane is source inspection and its committed diff. Integration must run the repository's local checks, deliberately exercise absent, unhealthy, stale, cancelled, failed, and rollback states, and verify the built application before describing the feature as shipped.\n\n## Suggested articles\n\n[Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Local version history](local-version-history.md), [Platform feature contracts](README.md).\n"
    },
    {
      "id": "platform/ollama-suite-manager",
      "category": "platform",
      "title": "Local Ollama suite manager",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and recovery",
          "id": "failure-modes-and-recovery"
        },
        {
          "title": "Security and privacy",
          "id": "security-and-privacy"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "guided-forms.md",
        "long-operation-progress.md",
        "non-blocking-notifications.md",
        "local-version-history.md",
        "external-settings-sources.md",
        "README.md"
      ],
      "body": "# Local Ollama suite manager\n\nThe desktop console has a mount-ready React surface for a local Ollama installation, and the documentation site has a browser-local equivalent at `ollama.html`. Neither is a cloud model store or an Ollama replacement. The desktop surface accepts an `OllamaSuiteClient`; the site requires an explicitly approved loopback endpoint. Both treat observed backend data as authoritative and never seed sample models, simulated progress, or fake health results.\n\n## Behavior\n\nTwo independent implementations, and the difference is not cosmetic. The desktop surface is a\nmount-ready React surface that delegates every privileged act to an `OllamaSuiteClient` a host\nregisters. The site surface is a browser page that can reach a loopback Ollama directly, but only\nafter a person has explicitly approved one endpoint — and a browser cannot page the official catalog,\nso it says its catalog completeness is **Unknown** rather than inferring one from what happens to be\ninstalled.\n\nWhat both refuse to do is the part worth stating first: neither seeds a sample model, a simulated\nprogress bar, or a fabricated health result. An empty screen here means the backend returned nothing,\nand it says so.\n\n### Desktop behavior\n\nThe desktop surface has four destinations. Model Store presents every model and variant returned by a completed catalog traversal with source identity, revision, refresh time, last successful refresh, page count, completeness, staleness, and offline-cache evidence. Installed tags are reconciled with the catalog without hiding either set.\n\nPull queue schedules local pulls with bounded backend-controlled parallelism, byte progress only when Ollama supplies bytes, durable per-item state, cancellation, retry, and honest completed, skipped, cancelled, and failed outcomes. One failed item does not remove a valid installed model or turn a partial result into success.\n\nLocal chat uses installed variants that report chat capability, streams partial output as partial, supports stop, validated generation settings, local session history, and attachment controls that remain visible but disabled when capability is missing. Harness profiles are bundled or registered through semantic executable and folder pickers and allowlisted argument profiles. Preflight shows the executable, arguments, working directory, redacted environment-key names, required resources, blockers, warnings, and hardware-fit evidence. Launch snapshots the profile and configuration first, and failed launch state includes rollback evidence.\n\nThe central mount must provide `OllamaSuiteClient` from `ollama-suite-model.ts`. It owns local HTTP, catalog pagination, offline cache evidence, bounded regex evaluation, pull persistence, chat streaming, file picking, preflight, process launch, snapshots, rollback, and secret redaction. Search state is separate for the catalog, chat sessions, and harness profiles. Plain text is the default and each search has its own adjacent regex builder with bounded evaluation.\n\nHardware fit is one of **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown**, backed by observed RAM, GPU and VRAM, driver or backend support, free storage, exact blob size, parameter count, quantization, context, and overhead. Missing facts remain missing and produce a conservative verdict.\n\n### Documentation site behavior\n\nThe site asks the user to approve one endpoint before a request can start. It accepts only localhost, `127.0.0.1`, or `[::1]`, rejects credentials, query strings, fragments, and unsupported schemes, and reports mixed-content and browser CORS boundaries distinctly. It offers no shell command, guessed download, cloud fallback, or web hunt.\n\nAfter approval, it reads version, installed tags, and running tags through the documented local API with bounded response sizes and timeouts. The official catalog is not fetched by this browser surface, so catalog completeness remains **Unknown** and is never inferred from installed tags. Pull and chat remain disabled until a real model tag is returned, use bounded newline-delimited streams, and support cancellation and partial output. Capability metadata comes from the selected model and is never guessed.\n\n## Configuration\n\nThere is no settings file on either side, and exactly one thing a person configures at all: the site's\nendpoint.\n\n**On the site.** One endpoint, approved explicitly before any request can start. It is accepted only\nwhen the host is `localhost`, `127.0.0.1` or `[::1]`. Credentials in the URL, a query string, a\nfragment and an unsupported scheme are each rejected by name, and mixed-content and browser CORS\nrefusals are reported as themselves rather than folded into a generic failure — a page served over\nHTTPS being unable to reach `http://localhost` is a browser rule, not a broken Ollama, and telling\nthe reader which one they are looking at is the whole job. There is no shell command to copy, no\nguessed download, no cloud fallback, and no instruction to go and search the web.\n\n**On the desktop.** Nothing is configured; a host registers an `OllamaSuiteClient` from\n`ollama-suite-model.ts` and that client owns local HTTP, catalog pagination, offline-cache evidence,\nbounded pattern evaluation, pull persistence, chat streaming, file picking, preflight, process launch,\nsnapshots, rollback and secret redaction. Pull parallelism is backend-controlled rather than a\nrenderer setting.\n\n**Harness profiles** are the one place a person supplies executables, and they are deliberately not\nfree text: profiles are bundled, or registered through semantic executable and folder pickers with\nallowlisted argument profiles. The renderer accepts no arbitrary command field, so there is no\nconfiguration route that ends in an arbitrary process launch. Secrets stay in the operating-system\ncredential store and never enter arguments, snapshots, logs, history, exports, captures or renderer\nstate.\n\nSearch state is separate for the catalog, chat sessions and harness profiles. Each defaults to plain\ntext and carries its own adjacent regular-expression builder with bounded evaluation; that per-field\nisolation is a contract, not a default, because one shared pattern silently filtering three lists is\nthe failure it exists to prevent.\n\n## Failure modes and recovery\n\nMissing, stopped, unhealthy, offline, timed-out, and malformed runtime states remain visible with backend-provided recovery actions. Stale or partial catalogs are never labeled exhaustive. No local models, insufficient storage, unsupported capability, partial pull failure, chat interruption, blocked preflight, launch failure, and rollback states each keep their exact evidence and next action visible. No local click is treated as launch or restore success without a receipt.\n\n## Security and privacy\n\nThe renderer accepts no arbitrary command field. Harness registration uses backend-owned pickers and allowlisted executable and argument profiles. The backend allowlists loopback endpoints, bounds requests and responses, cancels superseded work, validates every response, and keeps secrets in the operating-system credential store. Credentials and secret environment values never enter arguments, snapshots, logs, history, exports, captures, or renderer state. Pulls disclose network transfer and storage cost; chat data remains local.\n\n## Verification boundary\n\nThis lane did not run tests, lint, type checks, builds, packaging, runtime interaction, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Non-blocking notifications](non-blocking-notifications.md), [Local version history](local-version-history.md), [External settings sources](external-settings-sources.md), [Platform feature contracts](README.md).\n"
    },
    {
      "id": "platform/operation-receipts",
      "category": "platform",
      "title": "Receipt-backed operations and notifications",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Notification history",
          "id": "notification-history"
        },
        {
          "title": "Search, export, and bulk actions",
          "id": "search-export-and-bulk-actions"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Integration status",
          "id": "integration-status"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "non-blocking-notifications.md",
        "long-operation-progress.md",
        "in-context-recovery.md",
        "bulk-actions.md",
        "local-version-history.md"
      ],
      "body": "# Receipt-backed operations and notifications\n\nTyped foundations for long-running console operations and the notification history that reports their real outcomes.\n\n## Behavior\n\nAn operation request identifies one operation type, one exact target, the affected data, a stable idempotency key, a deadline, and whether cancellation and retry are allowed. A capability check distinguishes available, unavailable, and deliberately disabled behavior before any work begins. Unavailable and disabled states carry their exact reason and may point to an explicit recovery or enable action.\n\nThe coordinator refuses duplicate submissions while the same idempotency key is pending. It reports observed progress, supports cancellation only when the request allows it, enforces the deadline, and returns one terminal receipt. A runner choosing an execution path is not success. A successful or partial receipt must include an observation from the component that applied the effect, and the receipt must match the request's operation id, type, idempotency key, and target.\n\nBulk and multi-step work returns per-item outcomes. A partial result names what succeeded, failed, was skipped, or was cancelled. Its retry action exists only when the request provides a distinct idempotency key for the unfinished work, so retry cannot replay or repeat effects that already landed. Failure, cancellation, timeout, refusal, unavailable capability, and disabled capability stay distinct so the interface can offer an accurate next action.\n\n## Configuration\n\nNothing here reads a settings file. Every value is carried on the request or the policy object, and\nnaming them exactly matters because two of them are what make a retry safe:\n\n| Field | Where | Meaning |\n| --- | --- | --- |\n| `deadlineAt` | `OperationRequest` (`shared/operations.ts:82`) | an ISO-8601 instant, not a duration. After it the coordinator stops waiting and returns a timeout receipt |\n| `idempotencyKey` | same interface | while one is pending, a second submission carrying it is refused rather than queued |\n| `retryIdempotencyKey` | same interface | a **distinct** key covering only the unfinished part of a partial result. Without it there is no retry action, because retrying under the original key would replay effects that already landed |\n| `cancellable`, `retryable` | same interface | whether those actions exist at all. A surface offers neither unless the request declared it |\n| `undo` | same interface | an inverse operation reference or a local-history revision. Undo is absent unless one is supplied |\n\nQuiet hours are configured by `NotificationQuietHoursPolicy` (`shared/notifications.ts:130`):\n`enabled`, an IANA `timeZone`, a list of `windows`, and a `mode` that is either\n`suppress-info-success-progress` or `suppress-all-toasts`. Each window carries JavaScript weekday\nnumbers (Sunday 0 through Saturday 6) and local wall-clock `start` and `end` times in `HH:mm` form.\nThe policy governs **presentation only**: a suppressed notification is still recorded, so quiet hours\nnever cost a reader the history of what happened while they were quiet. Note what neither mode does —\nwarning and error records never auto-dismiss regardless of policy.\n\nHistory filtering takes a `NotificationSearchQuery` (`shared/notifications.ts:136`) of optional\n`text`, `severities`, `states` and `sources`. Omitting all four is not an error; it selects\neverything.\n\n## Notification history\n\nNotifications have stable ids and one of five severities: information, progress, success, warning, or error. Active notifications have deterministic stacking order. Dismissing one removes it from the active stack but keeps it in history. Deleting one removes it from history and is a separate command.\n\nQuiet hours suppress presentation according to the configured policy, not recording. Warning and error records never auto-dismiss. Every store mutation returns a receipt from the persistence adapter. An in-memory change whose persistence write was not observed is reported as partial rather than successful.\n\nNotification actions are explicit references. Retry appears only when the operation receipt supplies a retry reference. Undo appears only when the receipt supplies a real inverse operation or a local history revision. Running Undo is another operation and must return its own receipt.\n\n## Search, export, and bulk actions\n\nHistory can be filtered by text, severity, state, and source. Export projection includes factual notification text, source, timestamps, operation receipt reference, and action labels without serializing executable callbacks or operation payloads.\n\nBulk dismissal, deletion, and read-state changes report every changed id and every skipped id with its reason. An empty selection or a selection containing no applicable record fails explicitly.\n\n## Configuration\n\nEverything here is per request rather than per installation, because these are contracts\nrather than a settings screen. One request carries:\n\n- **The operation type and its exact target**, plus a description of the affected data.\n- **A stable idempotency key.** The coordinator refuses a duplicate submission while the\n  same key is pending, so a double click and a programmatic re-entry are both refused\n  rather than replayed. Retry for unfinished work needs a *distinct* key, which is what\n  stops a retry repeating effects that already landed.\n- **A deadline**, after which the runner's signal is aborted and a timeout receipt is\n  returned rather than the request being left open.\n- **Whether cancellation and retry are allowed**, each stated by the request. Cancellation\n  is offered only where the request permits it, so no control appears that cannot act.\n\nThe notification history takes two settings of its own: a **quiet-hours policy**, which\nsuppresses presentation and never suppresses recording, and a **persistence adapter**,\nwhose receipt is what distinguishes a stored change from an in-memory one. Warning and\nerror records are not configurable to auto-dismiss; they never do.\n\n## Failure modes and security\n\n- Missing or malformed request identity, target details, affected-data descriptions, or timestamps are refused before dispatch.\n- Duplicate in-flight idempotency keys are refused by the handler, including keyboard or programmatic re-entry.\n- A runner exception becomes a failure receipt. It is never converted into success because the intended path was selected.\n- A deadline aborts the runner signal and returns a timeout receipt when no terminal receipt arrived in time.\n- Invalid, mismatched, or unobserved success receipts become failure receipts.\n- Persistence receipt mismatch reports a partial notification mutation and keeps the live in-memory state visible.\n- Payloads and affected-data descriptions must remain redacted. Receipts carry references and summaries, not credentials or private configuration values.\n\n## Integration status\n\nThe shared contracts, renderer coordinator, receipt helpers, notification model, and durable store are implemented as integration foundations. They are not yet wired into the product shell, trusted process bridge, or control-plane operation dispatch. No screen should claim these behaviors are active until those seams return and render real receipts.\n\n## Verification\n\nThis ultra-speed implementation did not run tests, type checks, builds, packaging, runtime interaction, or screen captures. Integration must add focused coverage for unavailable and disabled capabilities, duplicate submission, progress, cancellation, timeout, invalid success receipts, partial outcomes, idempotent replay, quiet hours, warning and error persistence, dismissal versus deletion, persistence mismatch, bulk results, retry, and receipt-backed Undo.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [Long-operation progress](long-operation-progress.md), [In-context recovery](in-context-recovery.md), [Bulk actions](bulk-actions.md), and [Local version history](local-version-history.md).\n"
    },
    {
      "id": "platform/per-element-toy-locks",
      "category": "platform",
      "title": "Per-element toy locks",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "support-tickets.md",
        "support-tickets.md",
        "unlock-ladder.md",
        "built-in-authenticator.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Per-element toy locks\n\nA self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.\n\n## Behavior\n\nAny rendered element is meant to be lockable behind a password or a TOTP code entered independently for that one element, with its own credential, unlock duration, and recovery path.\n\n## Configuration\n\nThis is explicitly a user-experience convenience, not a security boundary: it would never claim to protect data from anyone else with access to the device, and recovery is by deleting the application's local data folder.\n\n## Current status\n\n**Desktop application:** Partial, and corrected 2026-08-25. Right-clicking any element offers a real, wired \"Lock this element...\" context-menu command (shortcut hint shown as ^L) that opens a per-element lock-creation wizard with its own credential, independent of every other lock. The wizard genuinely offers six methods, including three one-time-code combinations (PIN + one-time code, Password + one-time code, Password + PIN + one-time code), and a locked element's own unlock dialog verifies a real RFC 6238 code alongside PIN and password. The gap that remains: the PIN, password, and TOTP secret are all stored in plain React component state rather than the operating system's credential vault, so a credential set here lives in memory no more carefully than an ordinary setting does.\n\n**Documentation website:** Not implemented. The documentation website has no user-editable elements to lock.\n\n## Failure modes\n\nA forgotten per-element credential is recoverable only by deleting the local application-data folder, never by a support process (see [Support Tickets recovery flow](support-tickets.md), which points there on purpose).\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.\n\n## Verification\n\n`console/tests/contracts/per-element-toy-locks.test.mjs` pins the wizard's TOTP-including methods, the context-menu command, and the plain-component-state credential gap against the source directly. Verifying it by hand means opening the desktop application, right-clicking any element, and walking the wizard.\n\n## Suggested articles\n\n[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/personal-vocabulary-upload",
      "category": "platform",
      "title": "Personal vocabulary upload",
      "headings": [
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Privacy and security",
          "id": "privacy-and-security"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "school-mode.md",
        "README.md"
      ],
      "body": "# Personal vocabulary upload\n\nThe desktop console and documentation website each provide a local JSON upload control that lets a person replace chosen interface wording without shipping a built-in personal dictionary.\n\n## Configuration\n\nThe only accepted top-level shapes declare exactly one version field and exactly one source field:\n\n```json\n{\"version\":1,\"replacements\":[{\"from\":\"source text\",\"to\":\"preferred text\"}]}\n```\n\n`schemaVersion` is accepted instead of `version`. `replacements` can be the array above or an object map. `terms` is accepted only as an object map. Every accepted form is normalized before caching to `{ \"version\": 1, \"replacements\": [{ \"from\": \"…\", \"to\": \"…\" }] }`.\n\nThe loader accepts at most 64 KiB, four nesting levels, 256 entries, 128 characters in each source term, and 256 characters in each replacement. Root objects and replacement entries reject unknown fields. Duplicate raw JSON keys, duplicate source terms, unsafe object keys, malformed JSON, incorrect version, wrong types, oversized input, and ambiguous aliases are all rejected.\n\n## Behavior\n\nValidation completes before the cache changes. A rejected upload leaves the last valid local cache active. Every cache read is revalidated, and a corrupt or stale cache is removed before original wording is used. Clear removes the cache and restores original wording immediately.\n\nReplacements apply longest source first to user-interface copy and accessible names. They are not applied to commands, URLs, identifiers, code, paths, logs, exports, history, diagnostics, provider-authored records, or elements marked as technical boundaries. The site keeps the same boundary by excluding script, style, code, keyboard, preformatted, form, and `data-no-vocab` content.\n\n## Privacy and security\n\nThe selected file is processed only in local browser or application storage. Neither loader performs a network request. File names, paths, mappings, cache contents, and replacement values are omitted from exports, local history, telemetry, diagnostics, captures, and public records. The ordinary settings export explicitly says that personal vocabulary was omitted.\n\n## Failure modes\n\nThe control states are no file loaded, loaded, invalid or rejected, replaced by a new valid file, clear/reset, and cache-corrupt fallback. Rejection text stays beside the upload control because it can quote private input. The narration path announces only that a rejection happened, not the private reason.\n\n## Verification\n\n`console/app/renderer/src/personal-vocabulary.ts` validates the desktop contract with strict duplicate-key detection and canonical normalization. `console/site/tests/contracts/personal-vocabulary-upload.test.mjs` checks the site control, aliases, canonical cache, bounds, duplicate and unsafe-key refusal, retained-good-cache behavior, corrupt-cache purge, longest-first application, technical-boundary exclusion, export omission, and no-network boundary. `npm run bundle:docs` regenerates the desktop documentation bundle from this article, and the documentation drift check verifies the generated bundle stays current.\n\nThe contract has source and focused test evidence. Real built-artifact interaction and capture evidence remain part of the final headless verification pass.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/provider-markup-rendering",
      "category": "platform",
      "title": "Provider-authored markup rendering",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "changelog-viewer.md",
        "offline-documentation-browser.md",
        "README.md"
      ],
      "body": "# Provider-authored markup rendering\n\nText authored elsewhere — release notes, imported documents — is rendered as real formatted markup rather than printed as raw source characters.\n\n## Behavior\n\nProvider-authored markdown-like text is meant to be rendered through one shared, isolated renderer producing real headings, links, and lists, rather than showing literal hash marks and brackets to the reader.\n\n## Configuration\n\nThe renderer would keep an honest empty state when no content is provided, rather than presenting a blank area that looks like a loading failure.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application does not currently render externally authored markup text in this sense.\n\n**Documentation website:** Implemented. The documentation website's own articles are authored in markdown and rendered through one shared renderer, producing real headings, links, lists, and section navigation rather than raw markdown characters. This is the website's own authored content rather than third-party provider text, but the rendering mechanism itself is the one this feature describes.\n\n## Failure modes\n\nMalformed markdown in a source article is meant to degrade to plain paragraphs rather than break the page layout; the site's renderer has not been separately stress-tested against adversarial input.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[In-app changelog viewer](changelog-viewer.md), [Offline documentation browser](offline-documentation-browser.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/README",
      "category": "platform",
      "title": "Platform feature contracts",
      "headings": [
        {
          "title": "Exemptions",
          "id": "exemptions"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "dialog-emojis.md",
        "school-mode.md",
        "narration.md",
        "scheduled-settings.md",
        "external-settings-sources.md",
        "dim-sum-surprise.md",
        "regex-builder.md",
        "non-blocking-notifications.md",
        "status-hub.md",
        "material-appearance.md",
        "app-logo-customization.md",
        "browser-style-tabs.md",
        "tab-groups-and-searches.md",
        "command-palette.md",
        "destination-deep-links.md",
        "destructive-action-confirmation.md",
        "local-version-history.md",
        "changelog-viewer.md",
        "external-editor-handoff.md",
        "complete-exports.md",
        "bulk-actions.md",
        "accessibility.md",
        "responsive-sizing.md",
        "personal-vocabulary-upload.md",
        "per-element-toy-locks.md",
        "support-tickets.md",
        "unlock-ladder.md",
        "built-in-authenticator.md",
        "attention-modes.md",
        "browser-extension-download-surfaces.md",
        "offline-documentation-browser.md",
        "app-display-name.md",
        "guided-forms.md",
        "bounded-overlays.md",
        "context-menu-shortcuts.md",
        "long-operation-progress.md",
        "in-context-recovery.md",
        "provider-markup-rendering.md",
        "forge-publishing.md",
        "collapsible-filters.md",
        "automatic-updates.md",
        "site-history-and-delivery.md"
      ],
      "body": "# Platform feature contracts\n\nThis category documents the canonical platform feature contracts this product is expected to implement, and states plainly, per surface, which of them are actually built today.\n\nThe two surfaces referenced throughout are the desktop application (the installed Windows console) and the documentation website (this published site).\n\n- [Language modes](language-modes.md)\n- [Funny-level sliders](funny-levels.md)\n- [Dialog emoji toggle](dialog-emojis.md)\n- [School mode](school-mode.md)\n- [Spoken narration](narration.md)\n- [Scheduled settings](scheduled-settings.md)\n- [External settings sources](external-settings-sources.md)\n- [Dim sum surprise](dim-sum-surprise.md)\n- [Regex builder](regex-builder.md)\n- [Non-blocking notifications](non-blocking-notifications.md)\n- [Status hub](status-hub.md)\n- [Material appearance system](material-appearance.md)\n- [App logo customization](app-logo-customization.md)\n- [Browser-style tabbed navigation](browser-style-tabs.md)\n- [Tab groups and tab search](tab-groups-and-searches.md)\n- [Command palette](command-palette.md)\n- [Destination deep links](destination-deep-links.md)\n- [Destructive-action super confirmation](destructive-action-confirmation.md)\n- [Local version history](local-version-history.md)\n- [In-app changelog viewer](changelog-viewer.md)\n- [External editor handoff](external-editor-handoff.md)\n- [Complete data export](complete-exports.md)\n- [Bulk actions](bulk-actions.md)\n- [Accessibility](accessibility.md)\n- [Responsive and high-scale sizing](responsive-sizing.md)\n- [Personal vocabulary upload](personal-vocabulary-upload.md)\n- [Per-element toy locks](per-element-toy-locks.md)\n- [Support Tickets recovery flow](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n- [Built-in authenticator](built-in-authenticator.md)\n- [Attention-support modes](attention-modes.md)\n- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)\n- [Offline documentation browser](offline-documentation-browser.md)\n- [Renameable app display name](app-display-name.md)\n- [Guided forms](guided-forms.md)\n- [Bounded, self-painting overlays](bounded-overlays.md)\n- [Right-click menus show keyboard shortcuts](context-menu-shortcuts.md)\n- [Long-operation progress reporting](long-operation-progress.md)\n- [In-context failure recovery](in-context-recovery.md)\n- [Provider-authored markup rendering](provider-markup-rendering.md)\n- [Forge publishing](forge-publishing.md)\n- [Collapsible filters and statistics](collapsible-filters.md)\n- [Automatic updates](automatic-updates.md)\n- [Site history and delivery workspace](site-history-and-delivery.md)\n\n## Exemptions\n\nThe local file converter and Ollama suite are now present as separate local surfaces. The desktop routes are `desktop://console/#surface=converter` and `desktop://console/#surface=ollama`; the Pages equivalents are `converter.html` and `ollama.html`. Their current evidence is `implemented-unverified`: the converter catalog and PDF capability read are mounted through the control plane, while picker and queue mutations remain explicitly unavailable until their handlers are registered. The Ollama desktop client reports a typed bridge-unregistered state until its privileged dispatcher is mounted. Neither surface invents models, health, conversion output, or sample data.\n\n"
    },
    {
      "id": "platform/regex-builder",
      "category": "platform",
      "title": "Regex builder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "tab-groups-and-searches.md",
        "collapsible-filters.md",
        "README.md"
      ],
      "body": "# Regex builder\n\nA guided pattern-building tool attached to every search field, letting a user construct a regular expression without knowing the syntax by heart.\n\n## Behavior\n\nEvery search bar, dropdown filter field, and context-menu filter is meant to carry an adjacent, anchored regex builder offering guided construction, a raw pattern editor, sample text, and live match feedback, with plain text staying the default search mode.\n\n## Configuration\n\nQuery, pattern, flags, and mode would stay synchronized bidirectionally between the search field and its builder popover; pattern and sample size would be bounded to protect against runaway evaluation.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's filter fields accept plain-text substring queries and have no adjacent builder affordance, raw pattern editor, or guided construction controls.\n\n**Documentation website:** Implemented for the shared shell. Settings, documentation, command-palette, notification, every upgraded dropdown, and page-context searches have their own adjacent builder, bounded raw pattern, guided inserts, i/m/u flags, sample text, live match count, and local JavaScript-engine application. Plain text remains the default.\n\n## Failure modes\n\nPattern and sample input are bounded, but browser-native JavaScript regular expressions do not provide a hard execution deadline. The site identifies that engine and keeps the evaluator local; a worker-isolated timeout remains incomplete.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Tab groups and tab search](tab-groups-and-searches.md), [Collapsible filters and statistics](collapsible-filters.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/responsive-sizing",
      "category": "platform",
      "title": "Responsive and high-scale sizing",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "accessibility.md",
        "material-appearance.md",
        "README.md"
      ],
      "body": "# Responsive and high-scale sizing\n\nNo clipped, truncated, or overlapping text or controls at narrow window widths, high display scales, or with the longest localized strings.\n\n## Behavior\n\nLayouts are meant to hold correctly at supported window widths and at 100/125/150/200% display scale, including the longest strings a bilingual mode would produce.\n\nThe desktop shell (`app/renderer/src/App.tsx`'s compiled console) has no `className` or `data-*` hook on any layout element — every dimension the design compiler emits is a literal pixel value baked into an inline `style` string for the console's own default 1440px window (see `app/renderer/src/dc-runtime.tsx`'s `sty()`). `app/renderer/src/styles.css` is the one place that can still change how that markup renders, because it is loaded after the compiled stylesheet and can target the same inline styles through `[style*=\"…\"]` attribute selectors — the same technique the compiled design's own (currently dead — see below) `[style*=\"display:grid\"] > *` rule already reaches for.\n\nTwo real width breakpoints now live there:\n\n- **1200px** — the 268px section-list column gives back some of its fixed width (220px) once the window has clearly left the 1440px default behind.\n- **1000px**, close to the console's own enforced 920px minimum window width (`app/electron/main.ts`, `minWidth: 920`) — the section list narrows further (176px), the 88px icon rail narrows too (72px), and every multi-column `display:grid` layout in the compiled console (stat tiles, table headers and rows, dialog layouts, the mini-games) collapses to a single flexed column, because CSS Grid never reflows a fixed-pixel or excess-column template on its own and there is no per-screen hook to retune any one of them individually.\n\nAlongside the breakpoints, `styles.css` also restores a fix the compiled design already tried to ship and never actually applied: `[style*=\"display: flex\"] > *, [style*=\"display: grid\"] > * { min-width: 0; }`, letting a flex or grid child shrink below its own content size instead of refusing to and overflowing its row. This is unconditional (not gated to a narrow window) because it only changes anything when a row is genuinely short of room.\n\n## Configuration\n\nThis is verified against the real built interface at each width rather than assumed from source. There is no user-facing setting; the shell responds to its own window width.\n\n## Current status\n\n**Desktop application:** Partial, and meaningfully improved. Real `@media (max-width: …)` breakpoints exist for the first time (previously the only `@media` rule anywhere in the app responded to `prefers-reduced-motion`, a user preference, never window width — `design-styles.css`, the compiled design output, still has zero `@media` rules of its own). Verified live against the real built Electron app (see Verification below) at the console's own enforced 920px floor and down to 700px (below that floor, for defence in depth): the two structural shell columns narrow, every multi-column grid collapses to a single column, and a real, previously-clipped control (the \"+ New …\" button on every `isTableLike` screen's filter row, cut off the right edge of the window at 920px before this change) is now fully on-screen.\n\nNot covered by this pass: 150%/200% Windows display-scale was reasoned about rather than measured on real hardware DPI (Chromium lays out in CSS pixels regardless of the OS scale factor, so a window-width fix in CSS pixels applies identically at every scale — but that reasoning has not been checked against an actual scaled display). Below the console's enforced 920px floor, the title bar's own menu row (a separate, JS-computed overflow mechanism in `App.tsx`, not a CSS layout problem) can still show overlapping menu labels at very narrow widths (observed at 700px); that floor keeps a real user from ever reaching it, so it is recorded here rather than chased through a boundary this fix could not cross.\n\n**Documentation website:** Partial. The site is responsive down to roughly phone width using relative units and wrapping containers, but has not been verified at every display scale or against long bilingual strings, since bilingual mode does not yet exist. Unchanged by this work.\n\n## Failure modes\n\nClipped or overlapping text below the verified range is the specific failure this feature exists to prevent. The desktop shell is now verified clipping-free and overlap-free at and above its own enforced 920px minimum window width; below that floor (unreachable in the shipped app, but a possible target for a future change to `minWidth` or for a test harness) the fix still substantially helps but the separate title-bar overflow mechanism noted above is a known remaining gap.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference — the pre-existing `prefers-reduced-motion` rule in `styles.css` is untouched by this change. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English, and the breakpoints act on layout, not on any string.\n\n## Verification\n\n`console/tests/ui/responsive-breakpoints.test.mjs` asserts, against the real `styles.css` text, that: at least two genuine `max-width` breakpoints exist (not merely a per-control variant); the 1200px and 1000px tiers are both present; the icon rail and section list narrow inside the 1000px tier; every grid collapses to a flexed column inside that same tier; the `min-width: 0` restoration exists unconditionally, outside every `@media` block; and the pre-existing `prefers-reduced-motion` rule is untouched. It strips CSS comments before matching (so a commented-out rule cannot satisfy it) and anchors every `@media` match to the start of a line via brace-depth counting rather than a substring or a lazy cross-block regex. Three negative-regression cases (a mutated selector, a commented-out restoration rule, and a breakpoint condition rewritten to a value that can never match) each turn the check red; a fourth confirms `design-styles.css` — the compiled design output — still ships zero `@media` rules of its own, i.e. the responsive mechanism lives only in the hand-written file.\n\nBeyond the automated check, this was also verified by driving the real built Electron app headlessly (Chrome DevTools Protocol against the packaged renderer) across window widths from 700px to 1440px, on the Dashboard, PJSIP endpoints, Live channels, and Trunks & registrations screens, both before and after this change.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Material appearance system](material-appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/scheduled-settings",
      "category": "platform",
      "title": "Scheduled settings",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "external-settings-sources.md",
        "README.md"
      ],
      "body": "# Scheduled settings\n\nLets a user schedule when a setting — language, theme, density, and the like — takes effect, by date, time, and weekday.\n\n## Behavior\n\nA schedule editor is meant to let a rule pick an optional start and end date, a start and end time, and either every day or specific weekdays, then apply a chosen setting value only during that window, respecting the user's local timezone including daylight-saving behavior.\n\n## Configuration\n\nRules would be stored with stable identifiers and deterministic precedence for when more than one rule could apply at the same moment.\n\n## Current status\n\n**Desktop application:** Not implemented. No schedule editor and no scheduled-value application logic exist anywhere in the product.\n\n**Documentation website:** Implemented for site-owned local settings. Every page exposes one persisted rule with explicit weekdays, start and end times, cross-midnight and equal-time behavior, local-timezone status, and scheduled theme, language, and density values. Base values return when the window ends.\n\n## Failure modes\n\nAn empty weekday selection never matches. Invalid time text never matches. This bounded site implementation has one rule, so overlapping-rule precedence and external sources remain outside the implemented slice.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[External settings sources](external-settings-sources.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/school-mode",
      "category": "platform",
      "title": "School mode",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "The pages-site",
          "id": "the-pages-site"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "dim-sum-surprise.md",
        "../app/customise.md",
        "README.md"
      ],
      "body": "# School mode\n\nA single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.\n\n## Behavior\n\nOne shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.\n\n## Configuration\n\nTurning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.\n\n## Current status\n\n**Desktop application:** Partial. The shared switch, credential-gated deactivation, and rename all exist and are wired: `school-mode.ts`'s `activateSchoolMode`, `deactivateSchoolMode`, `hasCredential`, `renameSchoolMode`, `schoolModeActive` and `setCredential` are all imported and called by `App.tsx`, backed by 32 tests including one that asserts no output leaks the shipped name after a rename. Turning the mode on and off, renaming it, and setting its credential are all real. What is not wired is the mode's actual point: `school-mode.ts` also exports `capabilityVisible()`, `filterVisibleCapabilities()`, `effectiveLanguageMode()` and `effectiveFunnyLevel()` -- the functions that would force English and hide optional capabilities -- and none of them are called anywhere in the mounted application. `schoolModeActive()` itself is read only to build the status control's text. Activating School mode today changes what one status line says and nothing else; it does not force English, does not hide any capability, and no other feature (language mode, funny levels, or any gated control) checks it.\n\n**Documentation website:** Implemented, and implemented as the whole feature rather than as a switch: turning it on really does force plain English and really does take the covered capabilities off the page. The section below describes it in full, including the two places its behaviour deliberately differs from the desktop application's and the reasons for both.\n\n## The pages-site\n\nThe card lives on `settings.html` and is built in `site/app.js` between `const SCHOOL_KEY=` and `const DEFAULT_FAVICON=`; its styles are in `site/styles.css`.\n\n**What it removes, and how.** While it is on, four containers leave the document: the language card (which carries the language mode and both funny selects), the personal-vocabulary card, the narrated-language choice and the Cantonese voice picker. They are *removed*, not disabled and not hidden -- a disabled control is still a control somebody can see and ask about, and the canon asks for the capability to be absent rather than refused. Each removed node is held in `schoolRetained` with an empty comment standing in its place, so turning the mode off puts back the same node, in the same position, with the handlers bound to it at load still attached. Nothing behind those controls is written while the mode is on, so a chosen language, a chosen funny level and an uploaded personal-vocabulary file all survive and return.\n\nTwo further effects are not containers and so are handled in the code paths themselves. `copyText()` renders the plainest English variant, which is the wording this page shipped with, so the funny levels behave as though they were not installed rather than merely being unreachable. And `applyVocabularyText()` returns its input untouched, which matters because the uploaded file is deliberately *kept*: a mode that removed only the upload control would go on substituting from the cached file behind it.\n\n**The value that turns it off is not stored.** What is written to `ding-pbx-pages-school-v1` is a random 16-byte salt and the SHA-256 digest of salt-and-value. A browser that gives the page no cryptographic digest -- an insecure context such as a `file://` load -- refuses to arm at all and says why, rather than falling back to keeping the value under a friendlier name.\n\n**Where the record lives is what makes the lock a lock.** It is in a storage key of its own, beside the local history's, so `performSettingsReset()` and `restoreHistoryEntry()` -- both of which write `state` -- cannot reach it. A \"Reset settings\" button that opened the mode would be a one-click way around it rather than a reset, and the reset dialog says outright that it does not.\n\n**The name.** It ships as `School mode` and is the reader's to change. Live copy always renders the chosen name: the heading, the status line, the removal sentence, the recovery text and the card's own search keywords are all written at run time, so a renamed card is still findable by the name it shows. Persisted text deliberately names the mode nowhere at all -- not in a local-history entry, not in a stored notification -- because history here is append-only and a rename cannot rewrite it, so an entry written before a rename would sit in the record naming the name that was just replaced, which for the first rename is exactly the shipped name the rename existed to remove.\n\n**One switch, across every tab.** The record is watched through the browser's `storage` event, which fires in every other tab of this origin, so turning the mode on in one tab applies it in the rest live rather than at their next load. A `storage` event with a null key is the whole store being cleared, which is the documented recovery happening somewhere else, and it is handled the same way.\n\n**Two deliberate differences from the canon, recorded rather than left as gaps.**\n\n- *No attempt lockout and no waiting period.* A wrong value is counted on screen and recorded in the local history, and nothing else happens. The canon asks for rate-limited feedback, and a timed lockout here would make this a surface that can lock somebody out on a clock -- which would in turn require the unlock ladder, a feature this site has not got. Rather than ship a wait with no ladder behind it, this surface ships no wait: the count is the feedback, and the card says plainly that nothing can lock you out on a clock.\n- *The per-launch startup surprise cannot be suppressed here because this site has not got one.* It is recorded in `SCHOOL_ABSENT_HERE` rather than silently skipped, and the contract test re-derives that absence from the real source every run, so the day somebody builds one the pin stops being true and says so instead of the mode quietly failing to hide it.\n\n**One limitation worth knowing.** The card's heading and search keywords are shipped in `settings.html` carrying the default name and are overwritten by the first render. A renamed card can therefore show the shipped name for the moment between the markup parsing and the script running. The alternative -- shipping the heading empty -- would leave a blank heading for anybody whose script never runs, which is worse.\n\n**Recovery.** The value cannot be recovered, by anybody, because it was never stored. Clearing this site's storage in the browser removes `ding-pbx-pages-school-v1` along with every other local setting the page keeps, and the switch goes with it. This is a self-imposed speed bump rather than a security boundary, it protects nothing from anyone else with the computer, and the card says so in those words.\n\n## Failure modes\n\nIf the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked. The desktop implementation has not been exercised against an unreachable store, so this fallback is untested rather than absent.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop controls (switch, rename field, credential field, unlock switch, status readout) are ordinary native controls reachable by keyboard, but no dedicated accessibility audit has been performed. Copy for this feature is currently fixed English on both surfaces.\n\n## Verification\n\nOn the website, `site/tests/contracts/school-mode.test.mjs` runs the real extracted source over a recording DOM, a fake storage and Node's own Web Crypto: it arms and unlocks the mode, searches the stored bytes for the value to prove it is not there, checks that every covered container leaves the document and comes back as the same node in the same position, that copy renders plain English while the stored Cantonese choice survives, that no persisted string names the mode after a rename, and that neither the reset nor a history restore can reach the record. `scripts/negative-school-mode-site.mjs` plants one break at a time and requires each to turn that file red and green again on restore. Nothing there has been driven in a real browser: no `crypto.subtle` in a page, no real `storage` event between two real tabs, and no capture of the card.\n\nOn the desktop, `tests/ui/school-mode.test.tsx` and `tests/ui/credential-field.test.tsx` (32 tests total) exercise the switch, rename, and credential logic directly, not its lack of effect on the rest of the app. Verifying the capability-hiding gap means activating School mode in the built application and confirming that the language mode, funny levels, and every other optional or playful control remain exactly as visible and functional as before -- they currently do, which is the defect this article now records rather than hides.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/site-history-and-delivery",
      "category": "platform",
      "title": "Site history and delivery workspace",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "local-version-history.md",
        "changelog-viewer.md",
        "external-editor-handoff.md",
        "browser-extension-download-surfaces.md",
        "in-context-recovery.md",
        "provider-markup-rendering.md",
        "forge-publishing.md",
        "automatic-updates.md"
      ],
      "body": "# Site history and delivery workspace\n\nThe published documentation surface now carries a local delivery workspace at `history.html`. It is a browser-mediated equivalent for controls that cannot safely run from a static page. It never presents the page as the installed desktop application or as a PBX runtime.\n\n## Behavior\n\n- Visitor-owned history is append-only in browser storage. Each event has a timestamp, a registered action enum, and bounded allowlisted parameters. Localized sentences are rendered from those parameters, while no free-form summary or content field is persisted. Search, date range, and action filters compose, and a full anchored regex builder is available beside each search field.\n- The history panel has a bounded local JSON picker for the versioned round trip. It rejects from the selected file's declared `file.size` before allocation, reads only a 512 KiB slice, then measures the resulting `ArrayBuffer` before UTF-8 decoding. It rejects invalid UTF-8, eight-level nesting, duplicate keys, unknown or unsafe keys, invalid timestamps, registered actions with unknown parameter keys, safe counts capped at 100,000, or byte values capped at 64 MiB. Valid records are appended, never used to replace live state. A dedicated `history-import` event records retained, refused, existing-live-event truncation, and imported-event truncation counts. Empty, refused-only, duplicate-only, and zero-retained imports are distinguished and preserve every live event. Their separate path-free no-op audit stores the validated export schema and event schema versions without consuming a history slot.\n- Restore does not rewrite an earlier event. It appends a new `restored` event that names the source event identifier. Redacted JSON and Markdown exports state that personal vocabulary, credentials, paths, and file contents were omitted.\n- The changelog viewer shows the 89 product release tags by default. Optional upstream tag history is clearly separated behind an explicit local choice. Every record has a valid full object identifier, date, category, factual summary, and full commit URL. Its filtered view can be copied or exported to Markdown.\n- Provider-authored Markdown is escaped before the small supported subset is rendered. Script, image, raw HTML, and executable links are not interpreted.\n- A local file can be selected for inspection and export. External-editor opening remains explicitly unavailable because a normal browser does not expose a verified local path. The page provides the official Visual Studio Code download route instead, and never requests credentials.\n- The browser-extension download equivalent uses the File System Access API when available. Start opens a real destination picker, progress is measured from actual chunks written, cancellation aborts the writable stream, and completion is reported only after the stream closes. Unsupported browsers remain unavailable rather than receiving a simulated transfer.\n- Forge publishing is a partial generic-provider preview. The visitor reviews source, destination, account, owner, repository, and copy or fork route before opening the provider's own page. No source or destination operation occurs on this page. The provider handles sign-in and publication. No credential is collected, stored, or sent by this page, and the registry records that publication itself is not implemented here.\n- The update surface reads the bundled release-manifest equivalent and reports `unavailable`, `available`, `downloading`, `ready`, or `failed` only when the manifest carries that state and a valid full commit identifier. A static page cannot install an application or claim that an update was applied.\n- The shared delivery rail exposes ordinary persisted route navigation with pinning. Static-host limitations are stated beside it: grouping and reordering are not offered by this route, and the markup does not claim incomplete navigation is a full tab implementation.\n- Every select control receives its own local filter field and adjacent anchored regex builder. Date filters also provide validated ISO ranges and named presets.\n- A bounded local export operation disables re-entry, exposes real cancellation, and reports preparation progress while processing the current event set. Prepared-export editor fields are separate from selected-file transfer fields. Its versioned delivery state distinguishes `preparing`, `prepared`, `handoff-started`, `handoff-unverified`, `handoff-cancelled`, and `handoff-failed`. A browser handoff never becomes a 100 percent completion claim merely because the browser accepted a click.\n\n## Configuration\n\nThe module is `console/site/history-delivery.js`, loaded by the shared `console/site/app.js` registration on the six primary pages and directly by generated documentation pages. State schema version 3 uses the versioned `ding-pbx-site-history-delivery-v1` browser-storage key with a maximum of 250 events. Legacy schema-2 summary/details records are migrated only when their action parameters can be safely mapped to the structured event enum. Both legacy and current normalization require the canonical lowercase event ID pattern, keep a seen-ID set, and require a finite parsed timestamp before normalization. Unsafe or colliding IDs and malformed timestamps are counted as refused records, so the migration and normalization audits show the loss rather than silently sanitizing it. The migration records imported, omitted, refused, and retention-truncated counts, persists immediately, and never reports loss as lossless success. Current schema-3 records are normalized and audited before replacement when malformed records are refused or omitted. The future-version refusal audit is stored separately, disclosed in its own panel, and omitted from ordinary exports; its refusal reason is bounded and redacted. The migration event is marked recorded only after its append result is verified, and a refused append remains in that audit. Structured parameters are localized at render time, and search uses only a bounded projection of the normalized parameters. Export schema version 2 carries the complete structured event records needed for JSON round-trip import, with no free-form event text field. Its local picker validates that exact envelope after rejecting by `file.size` and reading only the bounded slice, then rejects duplicate, unknown, unsafe, malformed, oversized, or out-of-bound data, rejects imported records whose parameter object has any unknown key, and appends accepted records without replacing live state. New `history-import` records carry `imported`, `refused`, `existingTruncated`, and `importTruncated`; older persisted `truncated` records are migrated without dropping their count, while new file imports never normalize unknown keys. Empty, refused-only, duplicate-only, and zero-retained attempts are distinguished and written to a separate path-free no-op audit carrying the validated export and event schema versions. Markdown is explicitly presentation-only and carries the rendered `row.text` table, active filters, row count, and an omission disclosure. `console/site/generate-changelog.mjs` produces `console/site/changelog-data.js` from every local tag, and `console/site/release-manifest.js` records the versioned verified release state. Failed manifests may omit assets when their exact commit and reason are present, while available, downloading, and ready states require validated assets. The module does not make a runtime network request. `console/site/build.mjs` validates changelog completeness, exact tag targets, dates, summaries, the product-release split, and the manifest schema, then copies the module and `history.html` into deterministic published output, adds a real delivery mount host to generated article pages, loads the full builder and command-palette stack, and wires the workspace into those pages.\n\n## Failure modes\n\nBrowser storage may be unavailable, a clipboard request may be refused, a browser may not expose File System Access, a provider may require a new sign-in, or a static page may have no verified release manifest. Each state remains visible beside the action that encountered it and offers retry, settings, or the official editor download route where applicable. None of these conditions is converted into a fake success.\n\n## Verification\n\nThe source inventory names the history workspace, shared module registration, generated-page wiring, redacted export boundary, safe Markdown renderer, download state machine, forge boundary, editor fallback, and update status controls. Manual verification should exercise the real published artifact from a clean browser profile, including reload persistence, filter composition, invalid regex feedback, restore-as-new-event, retention preview and prune event, export omission text, File System Access cancellation and stream-close completion, provider flow refusal recovery, and static update honesty. No browser, build, test, lint, or capture run was performed in this lane.\n\n## Suggested articles\n\n- [Local version history](local-version-history.md)\n- [In-app changelog viewer](changelog-viewer.md)\n- [External editor handoff](external-editor-handoff.md)\n- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)\n- [In-context failure recovery](in-context-recovery.md)\n- [Provider-authored markup rendering](provider-markup-rendering.md)\n- [Forge publishing](forge-publishing.md)\n- [Automatic updates](automatic-updates.md)\n"
    },
    {
      "id": "platform/status-hub",
      "category": "platform",
      "title": "Status hub",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "non-blocking-notifications.md",
        "changelog-viewer.md",
        "../agent/hub.md",
        "README.md"
      ],
      "body": "# Status hub\n\nA shared, live status page reporting what the product's own maintenance work is currently doing, including running, landed, and blocked states.\n\n## Behavior\n\nThe desktop surface uses the typed Status Hub client and store. On first mount it hydrates a validated project id and registration receipt from the durable settings store. If that receipt is missing, it registers the project and persists the returned receipt before loading sessions. It re-registers only when the receipt is missing or an explicit registration action is requested. The surface reads session snapshots, evidence links, questions, and reply inbox from the configured service. A question is only marked answered after the service returns its delivery receipt. Polling is bounded, cancellable, and stale generations are discarded when the route leaves.\n\n## Configuration\n\nThe desktop bridge accepts `STATUS_HUB_URL` as an origin-only configuration value. Credential references remain privileged and are never exposed as credential values to the renderer. If the service is not configured or cannot be reached, the surface shows a typed unavailable, offline, authentication, refusal, stale, partial, or invalid-response state.\n\n## Current status\n\n**Desktop application:** Implemented as a mountable Status Hub surface at `#surface=status`. The renderer reads only observed project and session records, and the privileged control-plane seam exposes registration, project, session, inbox, and receipt-backed answer actions. External service availability remains unverified in this lane.\n\n**Documentation website:** Partial. The site composer embeds one validated build-manifest record into every published page. The status and download surfaces derive their counts, release availability, immutable URL, byte count, and digest only from that record, and show unavailable, invalid, or stale states otherwise. Live maintenance sessions and interactive question delivery are not implemented on this public surface.\n\n## Failure modes\n\nIf no project registration is available, the surface says so. Transport deadlines, redirects, cross-origin responses, malformed JSON, oversized responses, invalid records, authentication refusal, and stale requests are reported as distinct states. No local row, question, answer receipt, or success state is invented when the service has not supplied it.\n\n## Accessibility and localization\n\nThe surface uses semantic headings, status regions, bounded links, keyboard-sized question controls, visible focus, and reduced-motion-safe CSS. This lane was not run through tests, builds, type checks, lint, or UI capture. Copy remains host-localized work for a later lane, while evidence identifiers, timestamps, states, and receipt ids remain factual.\n\n## Verification\n\nVerification remains pending for the configured external service and the built desktop artifact. This lane deliberately did not run tests, builds, runtime interaction, or captures. Implementation paths include `console/control-plane/status-hub-client.ts`, `console/control-plane/status-hub-store.ts`, `console/app/renderer/src/status-hub-state.ts`, `console/app/renderer/src/status-hub-surface.tsx`, `console/app/electron/main.ts`, and `console/app/electron/preload.ts`.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [In-app changelog viewer](changelog-viewer.md), [Agent hub](../agent/hub.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/support-tickets",
      "category": "platform",
      "title": "Support Tickets recovery flow",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "The published website",
          "id": "the-published-website"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "school-mode.md",
        "unlock-ladder.md",
        "local-version-history.md",
        "complete-exports.md",
        "README.md"
      ],
      "body": "# Support Tickets recovery flow\n\nA local, entirely fictional support desk that a person reaches when they have locked themselves out of something, takes their ticket, numbers it, answers it, escalates it as often as they like, and arrives every single time at the one resolution that actually works: clear the local data yourself.\n\nThe comedy is the delivery. The resolution is real, and it is the only thing on either surface that helps somebody who has forgotten a value they chose.\n\n## Behavior\n\nA ticket form takes a category, a severity and a description. Submitting it writes a numbered ticket to local storage and nowhere else, and the desk answers immediately with a canned first response. The ticket can be chased up as many times as its four statuses allow — received, triaged, escalated, resolved — and reopened afterwards. Reaching `resolved` reveals the resolution, which names exactly what to clear and where, and says plainly that the product will not clear it for you.\n\nSeverity is recorded exactly as it is set and changes nothing at all. That is said beside the control rather than left to be discovered, because a control that quietly does nothing is the decorative-UI defect this project refuses everywhere else.\n\n## Configuration\n\nOne unmissable line states plainly that nothing leaves the device, no network request is made, no data is collected and nobody is reading the ticket. It is a fixed constant on both surfaces: not a translatable copy key, not passed through the personal-vocabulary replacement, and unreachable by any funny level or language mode. A disclosure that a slider could rewrite would be decoration rather than a disclosure, and this is the single line standing between a joke and somebody sitting waiting for a reply that was never coming.\n\nEverything else on the surface does move with the sliders, in both languages, exactly as the rest of the product's copy does.\n\n## Current status\n\n**Desktop application:** Implemented, in `app/renderer/src/support-tickets.ts` and the shell that files a ticket from it. It validates and numbers a ticket, advances it through its statuses, and resolves by reaching the folder-open path so the person can delete the application-data folder themselves in their own file manager. It never deletes anything on their behalf, and its contract test asserts the call rather than the absence — an earlier pin there recorded the opposite state, where the resolution text said \"This console will open it for you\" and nothing in the method opened anything, which is worse than no copy because somebody waits for a thing that was never coming.\n\n**Documentation website:** Implemented, in `site/app.js`, `site/settings.html`, `site/documentation.html` and `site/styles.css`. See the section below, which is a genuinely different mechanism rather than the desktop desk running somewhere else.\n\n## The published website\n\nA page has no application-data folder to open and no file manager to open it with, so the canonical flow had to be read for what it is FOR rather than copied step by step: tell somebody who is locked out exactly what to clear, make it easy to get hold of, and get out of the way.\n\n**What the website can lock somebody out of is the restricted presentation.** That is a real self-imposed lock with a value the person chooses, and forgetting it is a normal outcome — which is what makes a recovery route worth building rather than a joke with no job. The desk is therefore reachable from three places: the settings card of its own, the restricted presentation's own `Forgotten the value?` disclosure, and a link from the documentation page that arrives as `settings.html#support-tickets` and is answered by `supportRouteFromHash()`. The lock deliberately does **not** suppress any of them. A mode that hid its own way out would be a lock rather than a speed bump, so the desk is absent from `SCHOOL_SUPPRESSED` on purpose; `copyText()` already renders it in plain English while the mode is on, so it goes quiet without going away.\n\n**The resolution derives the list of keys rather than restating it.** `supportStorageKeys()` returns the seven constants this page actually writes — the settings record, the local history, the restricted-presentation record, the tickets themselves, the built-in authenticator's accounts, the personal-vocabulary cache and the logo cache — and the resolution renders them beside the origin the browser reported, with a control that copies both. The two cache keys were inline string literals until this landed and are named constants now for exactly this reason: a hand-copied list here would be wrong the day an eighth key is added, and nothing would say so. This is the one place a locked-out reader is told what to clear, and the contract test re-derives the same set from every storage call in the file — the direct `localStorage` ones and every key handed to the guarded `writeLocal` — and refuses a mismatch in either direction: a key the page writes that the list omits, and a key on the list that nothing has ever written.\n\n**The seventh key is worth its own paragraph, because it is the one this list did not know about.** The ticket desk and the built-in authenticator were built on the same day on separate branches, so neither could see the other, and `supportStorageKeys()` shipped on its branch naming six keys that were genuinely all there were *on that branch*. Nothing in either branch's own suite had anything to say about it; the omission existed only in the merge, and it surfaced there because this derivation reads the whole file rather than a list somebody maintains. The reader it would have failed is exactly the one this panel is for: told what to clear, clearing all of it, and finding their authenticator accounts still sitting there afterwards with no explanation of why that key was left off the list. It is also the key with the least to fall back on — the authenticator card has no clear button of its own, and `Reset settings` deliberately leaves it alone — so this panel is the only route to it anywhere on the site.\n\n**Every ticket is written through the one guarded writer.** `saveSupport()` goes through `writeLocal`, the same writer every other store on this page uses, so a browser refusing the write is reported to the reader instead of thrown past. It matters more here than anywhere else on the site: this desk is the recorded route back out of a lock, and the thing a full browser would be told to do about it is to clear this site's storage — which is also the thing that takes the tickets with it. A ticket that silently failed to save is a route that is not there at the one moment somebody needs it, and they would not find out until the next visit, by which point the page cannot even say what went wrong because nothing was kept.\n\n**Nothing is deleted, and that is why no gate is needed.** The page names the origin, names the keys, and says in as many words that it does not clear anything for you and that no button here will. Clearing site storage removes every key it just listed, including the tickets themselves, which is either a design flaw or the funniest part of the desk depending on where the funny level is set.\n\n**Nothing is sent anywhere.** There is no request at all, not a same-origin one: the whole block contains no `fetch`, no `XMLHttpRequest`, no `sendBeacon`, no `WebSocket` and no dynamic import, and the contract test runs the real source with all three network primitives wired to throw. A desk that quietly posted the description somewhere would look identical from outside and would be the worst defect this surface could ship, because the copy promises the opposite in so many words.\n\n**A ticket is append-only.** Chasing one appends an update; reopening one appends another and drops nothing; closing a batch appends to each. Nothing is ever removed from a ticket's history, which is what makes closing reversible, which in turn is why the bulk close is declared non-destructive and needs no two-key confirmation. The canned first response is **stored on the ticket** rather than re-rendered, so moving a funny slider later does not go back and rewrite an answer somebody has already read.\n\nTickets live under their own storage key, so `Reset settings` does not touch them — the reset gate says so out loud among the things it deliberately leaves alone, for the same reason it already names the restricted-presentation switch. The list has its own search wired to the anchored regular-expression builder, its own selection and bulk close, and its own export through the same format machinery every other list on the site uses, carrying the readable columns and not the internal id.\n\n**What this does not claim.** Nothing here has been opened in a browser: no dialog has been shown by a real `showModal`, no `localStorage` has been written by a real browser, no page has been served over HTTP, and the markup checks are string assertions over the committed HTML rather than a rendered DOM. The whole feature is proved against its own extracted source, a recording page and a fake storage, and no further. The pages-site inventory row therefore stays `unverified`: the implementation, its documentation, its localized copy and its local check all exist, and the two artifacts that need a running program — a built-artifact interaction record and a capture — do not.\n\n## Failure modes\n\nA corrupt, foreign or unparseable stored value falls back to an empty desk rather than throwing, and a stored ticket in a status this code has never heard of is dropped rather than rendered as a state that does not exist. A refused form writes nothing and consumes no ticket number, and says which field to fix in plain words rather than colouring a border. A description longer than the bound is refused with its real length and the real limit. A refused clipboard is survivable, because the key list is on screen either way and the confirmation says so. On a page with no desk — every page but the settings page loads the same script — every entry point returns without doing anything.\n\n## Accessibility and localization\n\nThe desk is an `overlay-card` dialog, so it inherits the bounded height and internal scrolling every other dialog on the site has. It is named with `aria-labelledby`, its close control has an accessible name, all three form controls carry real labels, a refusal is announced through a `role=\"status\"` line and a new ticket through an `aria-live` list. The disclosure is given a border and a weight of its own rather than the muted note colour every other aside uses, and cannot be hidden. Long unbroken words in a description wrap rather than pushing the row wider than the dialog.\n\n`supportDesc` and `supportFirstResponse` each ship four English and four Cantonese variants. The disclosure and the severity note are fixed constants in both languages and at every level, as above.\n\n## Verification\n\n`site/tests/contracts/support-tickets.test.mjs` runs the real extracted source against a recording page with the network wired to throw. `scripts/negative-support-tickets-site.mjs` plants each break in turn — one at a time, each watched red and then green again on restore — covering the three routes, the network boundary, the deletion boundary, the derived key list, the disclosure, the restricted presentation's refusal to hide its own way out, the whole ticket lifecycle, the rendered list and the registry rows.\n\nOne note worth keeping, because it cost half an hour and is a property of every script of this shape: a `finally` restores a planted break when the script throws and does nothing at all when the script is **killed**. A run cut short by an outer timeout left one planted `setInterval` in `site/app.js`, where it read as an ordinary line of the feature; it was found because the contract assertion it exists to trip went red. The script now traps `SIGINT`, `SIGTERM` and `SIGHUP` and restores before dying, and an already-red baseline names a previous kill as the likeliest cause and lists the files to check.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [School mode](school-mode.md), [Unlock ladder](unlock-ladder.md), [Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/tab-groups-and-searches",
      "category": "platform",
      "title": "Tab groups and tab search",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "browser-style-tabs.md",
        "regex-builder.md",
        "README.md"
      ],
      "body": "# Tab groups and tab search\n\nLets a user organize open tabs into named, colored groups and search across them from four distinct entry points.\n\n## Behavior\n\nTabs are meant to support pinning and named or colored grouping, plus four separate searches: the current strip, inside one group, across group names, and a master search spanning every open tab.\n\n## Configuration\n\nEach search would carry its own adjacent regex builder and reveal a match inside a collapsed group without permanently expanding it.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no concept of multiple open tabs to group or search across.\n\n**Documentation website:** Not implemented. The site has no open-tab concept either.\n\n## Failure modes\n\nN/A — with no tab or group model implemented on either surface, there is no failure path to describe yet.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Browser-style tabbed navigation](browser-style-tabs.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/unbound-controls",
      "category": "platform",
      "title": "Controls that do not write to a file, and why",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Removed rather than bound",
          "id": "removed-rather-than-bound"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/README.md",
        "../platform/README.md"
      ],
      "body": "# Controls that do not write to a file, and why\n\nMost of this console's telephony controls are bound to a real Asterisk key, and the ones\nthat are not have been treated as a backlog of typing. Going through them one at a time,\nmost are not. They are shapes that do not correspond to a single key, and writing a binding\nfor any of them would mean inventing behaviour and calling it configuration.\n\nThis records each remaining one with its actual reason, so nobody re-derives the same\nanswers, and so a decision to change the design is taken deliberately rather than by\nsomebody filling in what looks like a blank.\n\n## Behavior\n\nA binding maps one control to one key inside one section of one file. Two extensions to\nthat shape already exist, and both were added because a real control needed them:\n\n- **Composite.** Two controls share one value that carries two things, such as\n  `tlsbindaddr=address:port`. Each owns its half and leaves the other alone on write.\n- **Section by type.** The section is identified by the `type=` declared inside it rather\n  than by its name, because `pjsip.conf` and `iax.conf` name each section after the object\n  it configures. Several types may be accepted at once, since an IAX peer is written\n  `type=peer` or `type=friend`.\n\nEverything below needs something neither of those provides.\n\n### One control, several keys\n\nThe conference **announce** picker offers off, tone, name and count, and `confbridge.conf`\nspells that across `announce_join_leave` and `announce_user_count` — two independent\nbooleans. A binding that wrote one would leave the other saying something different.\n\n### A control whose values are sections, not a value\n\nThe CDR **backend** picker would offer csv, odbc, pgsql and the rest. `cdr.conf` has no key\nnaming a backend: each is its own `[section]`, and choosing one means writing a section. The\n**active ACL** picker on the security screen is the same shape against `acl.conf`.\n\n**This one never came back as a picker, and it is not going to.** What it got instead, on the\nCDR/CEL screen, is a live `d_status`/`l_status` readout: what cdr.conf/cel_odbc.conf/\ncel_pgsql.conf actually have configured, against what the target's running Asterisk actually\nhas registered (`cdr show status`, and `modules show` for the `cel_*.so` module names) --\nanswering \"which backend\" honestly instead of offering a single control that could never be\none real key. cel_odbc.conf's own per-context `connection`/`table` pair, which IS a plain pair\nof keys once a context section is named, is bound the same way the security screen's PJSIP-\ntransport TLS fields are: `l_octx` names the `[section]`, the same `sectionFrom` mechanism\n`s_permit`'s own removal note documented and the TLS lane above already reused once.\n\n### A control that is a repeated key\n\n**Permitted networks** is a list of CIDRs, and `acl.conf` writes one `permit=` line per\nentry. The writer replaces the first matching key and appends when absent; it has no notion\nof a key appearing many times in one section, and inventing one risks losing entries the\nperson did not touch.\n\n### A control whose unit is not the key's unit\n\nMusic-on-hold **announcement every N seconds** is an interval; `musiconhold.conf`'s\n`announcement=` is a filename. **Volume trim** in decibels has no key at all. The cipher\n**policy** offers Modern, Intermediate and Legacy where Asterisk wants a cipher string, and\nthe mapping between them is a security decision, not a translation table.\n\n### A control on a different file from its screen\n\nLogger **verbosity** is `asterisk.conf`'s `verbose`, or a per-logfile `verbose(<level>)`\nargument. Neither is a key in `logger.conf`, which is the file that screen edits. **Colourise\noutput**, **keep files** and **rotate at** have no key in either.\n\n### A control that needs a key removed rather than written\n\n**Deny by default** is a switch, and its off state means `deny=` should not be there at all.\nThe writer can create and replace an entry; it cannot delete one, and a switch that can be\nturned on and not off is worse than one that is not wired.\n\n### A control that would break the thing that found it\n\nThe IAX **type** picker IS the discriminator the section is matched by. Binding it would let\nsomebody change `type=peer` to `type=user` through the very match that located the section,\nafter which the screen is editing something it can no longer see.\n\n### A control that must never carry its value\n\n**Set a new secret** means exactly that: it is a switch that starts a credential flow, not a\nvalue. A secret must never travel through an ordinary binding, because it would be read into\nrenderer state and from there into exports, local history and screenshots.\n\n### A control that is dialplan logic, not configuration\n\nThe whole IVR screen — digit timeout, retries, invalid action, direct dial, prompt language,\nbarge-in — describes what an IVR does. `extensions.conf` has no keys for these; it has\n`exten =>` lines. Generating dialplan from a form is a real feature and a different one.\n\n### A control whose values cannot be confirmed from this checkout\n\nCaller ID **presentation** offers Allowed, Prohibited and Unavailable, and `pjsip.conf` does\nhave `callerid_privacy`. It needs a value map, and this is the closest to bindable of\nanything here — but the only accepted value evidenced anywhere in the sample files is\n`allowed_not_screened`. The spellings for the prohibited and unavailable cases are not in\nthis checkout to check against, and the difference between `prohib`, `prohibited` and\n`prohib_not_screened` is not a guess worth taking: it changes what a telephone exchange\ntells the far end about who is calling.\n\nBinding it needs the accepted values confirmed against Asterisk itself, not inferred.\n\n### A control whose key does not exist in the file its screen edits\n\nThe **RFC2833 payload** stepper and the **DTLS for WebRTC** switch sit on a screen editing\n`codecs.conf` and `rtp.conf`. `rtp.conf` has no payload key at all — `dtmftimeout` is a\ntimeout, not a payload number — and the DTLS keys are `dtls_verify`, `dtls_rekey` and their\nsiblings in `pjsip.conf`, per endpoint rather than globally. **Global codec order**,\n**transcoding**, **Opus bitrate** and **preferred ptime** have no key in either file: the\none `bitrate` that exists is inside a `[silk24]` section.\n\n## Removed rather than bound\n\nThirteen controls were taken off their screens on 2026-08-24. Each described a setting\nAsterisk does not have in the file its screen edits, and mapping it onto something else would\nhave meant inventing behaviour and calling it configuration. Removing is the same call\nalready made for a window control in a single-window console and for pushing a history whose\nown design says it is never pushed.\n\nAny of them can come back the moment it has a real key. That is the whole reason each reason\nis written down rather than summarised.\n\n| Control | Screen | Why it went |\n| --- | --- | --- |\n| Announcement every N seconds | Music on hold | an interval; `announcement=` is a filename |\n| Volume trim | Music on hold | no volume key in `musiconhold.conf` |\n| Opus bitrate | Codecs | the only `bitrate` is inside a `[silk24]` section |\n| Preferred ptime | Codecs | no ptime key; the matches are `rtptime`, `ftptime`, `httptime` |\n| RFC2833 payload | Codecs | `rtp.conf` has no payload key; `dtmftimeout` is a timeout |\n| DTLS for WebRTC | Codecs | the DTLS keys are per endpoint in `pjsip.conf` |\n| Colourise output | Logger | no colour key in `logger.conf` or `asterisk.conf` |\n| Keep files | Logger | no file-count key; `rotatestrategy` picks a strategy |\n| Rotate at | Logger | no size key |\n| ~~Server certificate~~ | Security | *(came back 2026-08-25 as `ht_tlscert`/`ht_tlskey`/`s_tcert`/`s_tprivkey` -- see below)* |\n| TLS method (translated picker) | Security | the *category* picker; `method=` itself is bound today as the free-text `s_tmethod` -- see below |\n| ~~Verify client certificates~~ | Security | *(came back 2026-08-25 as `s_tverifyclient`/`s_tverifyserver` -- see below)* |\n| Cipher policy (translated picker) | Security | the *category* picker; `cipher=` itself is bound today as the free-text `s_tcipher` -- see below |\n\nThe last four are the ones worth being careful about. Each could be made to write something,\nand each would require this console to decide a security question on somebody's behalf --\nwhich certificates live where, which TLS versions a name implies, which ciphers count as\nmodern. A console must not make those silently.\n\n**Two of the four came back on 2026-08-25, with real keys, as plain paths and a raw string\nrather than the removed picker's translated categories:**\n\n- **Server certificate** is bound today as `ht_tlscert`/`ht_tlskey` on the `httpd` screen\n  (http.conf's `tlscertfile`/`tlsprivatekey`) and as `s_tcert`/`s_tprivkey` on the security\n  screen's new \"TLS\" group (a PJSIP transport's `cert_file`/`priv_key_file`). Both are plain\n  text path fields, exactly the \"a hostname picker; tlscertfile takes a path\" reason this row\n  gave for removal in the first place -- once the control stopped being a hostname picker,\n  the objection stopped applying.\n- **Verify client certificates** is bound as `s_tverifyclient`/`s_tverifyserver` on the same\n  group, against `verify_client`/`verify_server` -- real keys that were simply not being\n  looked for in `pjsip.conf`'s `[transport]` section when this row was written, because the\n  security screen had no PJSIP-transport controls at all yet.\n\n**TLS method and Cipher policy have NOT come back, and the distinction matters.** `s_tmethod`\nand `s_tcipher` also exist now, on the same group, but they are free-text fields that write\nwhatever string is typed straight into `method`/`cipher` -- not the translated picker this\ntable describes (a TLS-version name mapped to `tlsdisablev1`/`v11`/`v12`, or a Modern/\nIntermediate/Legacy label mapped to a cipher string). This console still refuses to make that\ntranslation decision on somebody's behalf; typing the exact string Asterisk wants is a\ndifferent, narrower thing than picking a category and trusting this console's judgment about\nwhat the category means.\n\n## Configuration\n\nNothing here is configurable. The list is a record of design decisions still to be taken.\n\n## Failure modes\n\nThe failure this document exists to prevent is somebody reading \"unbound\" as \"unfinished\"\nand wiring one of these to the nearest plausible key. A wrong key does not fail loudly. It\nwrites a line that looks correct, Asterisk either ignores it or obeys it, and the person who\nset it believes something about their exchange that is not true.\n\n## Verification\n\n`console/tests/contracts/orphan-controls.test.mjs` counts every control that reaches nothing\nand refuses to let the number rise. It is a ratchet, not a target: it may fall freely, and a\nsecond check forces the ceiling down when it does, so the figure cannot drift into permitting\nnew gaps in silence.\n\n## Suggested articles\n\n[Screen inventory and binding](../platform/README.md), [Configuration safety](../platform/README.md).\n"
    },
    {
      "id": "platform/unlock-ladder",
      "category": "platform",
      "title": "Unlock ladder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "built-in-authenticator.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Unlock ladder\n\nA small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.\n\n## Behavior\n\nWinning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.\n\n## Configuration\n\nEvery answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.\n\n## Current status\n\n**Desktop application:** Partial, and wired. `app/renderer/src/unlock-ladder.ts` is imported by `App.tsx` and reached from the per-element lock: three consecutive wrong PIN, passphrase or code attempts on one lock call `ladder.issue()`, and a dish or sums challenge is collected and graded through `ladder.grade()` using the unlock dialog's own keypad. Two rungs of the four are therefore real. The moles rung is declined rather than faked, because the compiled design draws no board for it, and the ladder falls back to waiting it out. The one remaining honesty about the desktop application is worth stating plainly: this per-element lock has no timed lockout of its own, so clearing a challenge here dismisses the ladder and bypasses no wait, because there is no wait to bypass.\n\n**Documentation website:** Not implemented. The documentation website has no lockable credential for a ladder to apply to.\n\n## Failure modes\n\nA ladder submission that replays an already-consumed challenge token is rejected: `unlock-ladder.ts` marks each nonce single-use before grading it, so a wrong answer cannot be retried against the same question and a right one cannot be replayed. The minimum-duration check belongs to the timed moles round, which this build does not draw, so nothing here enforces it yet.\n\nThe rule the whole feature rests on is enforced in `finishLadderGrade`: a cleared challenge closes the ladder and says so, and never touches `state.locks` or the unlock dialog's own PIN, passphrase and code buffers. The credential is still required afterwards.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. It renders inside the unlock dialog and reuses that dialog's existing keypad and method line rather than introducing a surface of its own, so it inherits whatever that dialog offers; none of it is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\n`tests/contracts/unlock-ladder.test.mjs` holds the wiring: that `unlock-ladder.ts` is imported and `issue()` is called after the third wrong attempt, that the moles rung falls back to waiting rather than faking a graded round, and that a cleared challenge never touches the lock record. `tests/ui/unlock-ladder.test.tsx` covers the module's own rules.\n\nBeyond the source tree, the packaged application has been driven and photographed. `scripts/ui-drive/lock-evidence.mjs` locks a screen with a PIN, enters three wrong ones at the real keypad, and records what the running application did:\n`release/evidence/windows-console/unlock-ladder.json` and `release/captures/windows-console/unlock-ladder.png`. That run observed the first two attempts drawing an ordinary refusal, the third offering a real dish challenge with its four choices, and the element still locked after the challenge was graded. `scripts/built-interaction-evidence.mjs` ties the record to the picture by digest, and `scripts/negative-built-interaction-evidence.mjs` proves that guard refuses a record whose capture has been replaced or whose observations have gone missing.\n\nThe three-per-hour skip budget, its refill and challenge expiry are module-level rules with no rendered surface, and are not exercised by that run.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "README",
      "category": "README.md",
      "title": "Material Asterisk documentation",
      "headings": [
        {
          "title": "Rails",
          "id": "rails"
        },
        {
          "title": "Delivery",
          "id": "delivery"
        },
        {
          "title": "Shared behavior",
          "id": "shared-behavior"
        }
      ],
      "links": [
        "pbx/README.md",
        "media/README.md",
        "data/README.md",
        "system/README.md",
        "agent/README.md",
        "app/README.md",
        "installer-iso.md",
        "app/history.md",
        "app/arcade.md"
      ],
      "body": "# Material Asterisk documentation\n\nMaterial Asterisk is a Windows desktop administration experience for Asterisk. The renderer is compiled directly from the design's navigation model, so this documentation follows the same structure: six rails and 32 destinations, one article per destination, grouped and ordered exactly as the app presents them.\n\nThe documentation map contains 32 destinations in six rails. Every article covers behavior, configuration, failure modes and security, verification, and suggested reading.\n\n## Rails\n\n- [PBX](pbx/README.md) — Telephony: endpoints, routing and everything a call touches while it is alive.\n- [Media](media/README.md) — Media & voice: codecs, RTP, recordings, prompts and conferencing.\n- [Data](data/README.md) — Records & APIs: call records, event logging and the machine interfaces.\n- [System](system/README.md) — Runtime & security: modules, logging, certificates and the CLI.\n- [Agent](agent/README.md) — Agent global memory: memory, sync, skills, hub sessions and the emission guard.\n- [App](app/README.md) — Deploy & application: stand up a new server, then appearance, updates and the console itself.\n\n## Delivery\n\n- [The Ding PBX installer ISO](installer-iso.md) — a bootable, unattended-install ISO that turns a bare machine into a working server.\n\n## Shared behavior\n\nConfiguration controls are pickers, switches, sliders and steppers wired to real keys in the owning Asterisk configuration file — never free-text fields that could drift from what Asterisk actually does. Where an article shows a default value or an option list, it is the same default the design and the renderer ship with; nothing here is a simulated call, a sample statistic, or an invented extension. Destructive actions run the full confirmation ceremony described in [History & git](app/history.md) and [Arcade](app/arcade.md).\n"
    },
    {
      "id": "system/cli",
      "category": "system",
      "title": "CLI builder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "modules.md",
        "logger.md",
        "security.md"
      ],
      "body": "# CLI builder\n\n## Behavior\n\nBuild a real Asterisk CLI command by choosing its parts. The raw console beside it is read-only output, shown only in expert mode. It is backed by `asterisk -rx`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\nThere is no settings form here. Commands are assembled from pickers that mirror the real `asterisk -rx` command grammar, so what you build is exactly what will run, never free text.\n\n## Failure modes and security\n\nA command built from invalid picker combinations is rejected before it reaches Asterisk, rather than sent and left to fail on the far side.\n\n## Verification\n\nConfirm every picker combination produces the exact command that would be typed by hand, and that the raw console only appears in expert mode.\n\n## Suggested articles\n\n[Modules](modules.md), [Logger](logger.md), and [Security](security.md).\n"
    },
    {
      "id": "system/logger",
      "category": "system",
      "title": "Logging",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "modules.md",
        "cli.md",
        "../app/history.md"
      ],
      "body": "# Logging\n\n## Behavior\n\nSeverity per destination as a matrix of switches. Rotation is a picker, retention is a slider. It is backed by `logger.conf`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\n### Console\n\nWhat the attached console prints.\n\n- **Console levels** (`g_console`) — a chips control, default `notice`, `warning`, `error`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.\n- **Verbosity** (`g_verbose`) — a slider control, default `3`.\n- **Colourise output** (`g_colour`) — a switch control, default `true`.\n\n### Files & rotation\n\nDisk logging.\n\n- **File levels** (`g_file`) — a chips control, default `notice`, `warning`, `error`, `verbose`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.\n- **Rotation strategy** (`g_rotate`) — a segmented control, default `rotate`, choices `sequential`, `rotate`, `timestamp`, `none`.\n  - *What it is:* How log files are rotated when they reach the size limit.\n  - *Why it exists:* Unrotated logs fill the disk, and a full disk stops Asterisk.\n  - *Choosing a value:* rotate renames sequentially, timestamp appends the date, sequential numbers forever, none disables it.\n  - *Gotcha:* If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.\n- **Keep files** (`g_count`) — a stepper control, default `10`.\n- **Rotate at** (`g_size`) — a slider control, default `50`.\n- **Queue log** (`g_queue`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in logger.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in logger.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Modules](modules.md), [CLI builder](cli.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "system/modules",
      "category": "system",
      "title": "Modules",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "logger.md",
        "security.md",
        "cli.md"
      ],
      "body": "# Modules\n\n## Behavior\n\nEvery loadable module with its live state. Loading and unloading are real actions and run the full confirmation ceremony. It is backed by `modules.conf`. The rail badge on this destination currently reads `214`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\n### Load policy\n\nWhat Asterisk does with modules it was not explicitly told about.\n\n- **autoload** (`mo_auto`) — a switch control, default `true`.\n  - *What it is:* Whether Asterisk loads every module it finds at startup.\n  - *Why it exists:* Convenient, but it means an unused module with a vulnerability is loaded anyway.\n  - *Choosing a value:* On for a lab. Off with an explicit load list for a hardened deployment.\n  - *Gotcha:* Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.\n- **Preload** (`mo_preload`) — a chips control, default `res_odbc.so`, `res_config_odbc.so`, choices `res_odbc.so`, `res_config_odbc.so`, `res_curl.so`, `res_crypto.so`.\n- **Never load** (`mo_noload`) — a chips control, default `chan_sip.so`, choices `chan_sip.so`, `chan_mobile.so`, `app_meetme.so`, `res_snmp.so`.\n- **Fail startup on missing module** (`mo_require`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in modules.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in modules.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Logger](logger.md), [Security](security.md), and [CLI builder](cli.md).\n"
    },
    {
      "id": "system/README",
      "category": "system",
      "title": "System",
      "headings": [],
      "links": [
        "modules.md",
        "logger.md",
        "security.md",
        "cli.md"
      ],
      "body": "# System\n\nRuntime & security: modules, logging, certificates and the CLI.\n\n- [Modules](modules.md)\n- [Logger](logger.md)\n- [Security](security.md)\n- [CLI builder](cli.md)\n"
    },
    {
      "id": "system/security",
      "category": "system",
      "title": "Security",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/endpoints.md",
        "../pbx/trunkauth.md",
        "../data/ami.md"
      ],
      "body": "# Security\n\n## Behavior\n\nNamed access control lists, listed in the exact order Asterisk evaluates them — the last\nmatching rule wins, which is what makes a broad deny followed by a narrow permit work as an\nallowlist. TLS certificate and key paths on this screen are typed, not chosen from a store\nthis console does not have: it can point Asterisk at a certificate and check the wiring looks\nsane, but it cannot install, generate or rotate one. The rail badge on this destination\ncurrently reads `!`. It lives on the System rail, under the Runtime & security group:\nModules, logging, certificates and the CLI.\n\nThis screen edits `acl.conf`, a PJSIP transport's `[section]` in `pjsip.conf`, and the\n`[attestation]`/`[verification]` objects in `stir_shaken.conf` — three files, none of them\nthis screen's own declared `file` (`acl.conf`) for the latter two, so pjsip.conf and\nstir_shaken.conf are read and written through their own dedicated paths in `App.tsx` rather\nthan the generic per-screen read every other configuration screen relies on alone.\n\n## Configuration\n\n### Access control (`acl.conf`)\n\nThe table is one row per `permit=`/`deny=` line, across every named ACL, in file order —\nAsterisk applies the *last* matching rule, so reordering a rule is not cosmetic. Rows resolve\nback to a real rule through `app/renderer/src/acl-editor.ts`, which embeds each rule's own\naction and spec in its row key so a stale context menu can never act on the wrong rule after a\nconcurrent edit shifts positions. Add, edit, remove and reorder all go through the same\n`pbx.plan`/`pbx.apply` transaction (backup, stage, validate, apply, post-read, compare,\nrollback on mismatch) every other write in this console uses.\n\n- **ACL name** (`s_aclname`) — a text control. The named list a new rule joins, e.g.\n  `trusted-nets`. A name that does not already exist creates that ACL with this as its first\n  rule.\n- **Action** (`s_action`) — a segmented control, `permit` or `deny`.\n- **Network / CIDR** (`s_spec`) — a text control. A bare address or address/mask. A hostname\n  is refused: Asterisk resolves an ACL address at load time and this console cannot verify one\n  offline.\n\nNone of the three above carry a config-key binding: they are read straight out of state by\n`App.tsx`'s `onAddAclRule`, the same way the servers screen's `sv_host`/`sv_user` are — the\ncurrent typed value of a form field, not a persisted setting.\n\n- **Auto-ban after failures** (`s_failban`) — a stepper control, default `5`. This console's\n  own behaviour, never written to `acl.conf` or anywhere else on the target.\n- **Ban duration** (`s_bantime`) — a slider control, default `600`. Same as above.\n\n### TLS (a PJSIP transport, in `pjsip.conf`)\n\nA PJSIP transport's own TLS listener. Type the section name of an existing transport (e.g.\n`transport-tls`), press **Load from target** to see what it currently has, edit, then **Save\ntransport TLS settings** — this edits a transport already declared on the target, it does not\ncreate one. Saving refuses outright when the typed name does not resolve to an existing\n`type=transport` section, rather than inventing a bare `[section]` with nothing but TLS keys\nand no `bind=`/`type=` — which would not be a usable transport.\n\n- **Transport name** (`s_transport`) — a text control. The `pjsip.conf` `[section]` these\n  fields read and write. Not itself bound to a key: every field below reads and writes\n  through `sectionFrom: 's_transport'`, so the section is whichever name is currently typed\n  here.\n- **Load from target** (`s_tload`) — a one-shot action button (`security-transport-load`).\n  Reads the named transport's current TLS settings from `pjsip.conf` into the fields below.\n- **Protocol** (`s_tprotocol`) — a segmented control, default `tls`, choices `udp`, `tcp`,\n  `tls`, `ws`, `wss`, `flow` → `protocol`.\n- **Certificate file** (`s_tcert`) — a text control → `cert_file`.\n- **Private key file** (`s_tprivkey`) — a text control → `priv_key_file`.\n- **CA list file** (`s_tcalistfile`) — a text control → `ca_list_file`. Required for either\n  verification switch below — without one, a client or server certificate can never actually\n  be verified.\n- **CA list path** (`s_tcalistpath`) — a text control → `ca_list_path`, an alternative to the\n  file above.\n- **Cipher list** (`s_tcipher`) — a text control → `cipher`.\n- **Method** (`s_tmethod`) — a text control → `method`. The only value the shipped sample\n  documents (`tlsv1`) is free text rather than a segmented choice; PJPROJECT accepts others,\n  and this console does not offer a list it cannot verify against a real build.\n- **Verify client certificate** (`s_tverifyclient`) — a switch control → `verify_client`.\n- **Verify server certificate** (`s_tverifyserver`) — a switch control → `verify_server`.\n- **Require client certificate** (`s_treqclientcert`) — a switch control →\n  `require_client_cert`.\n- **Save transport TLS settings** (`s_tsave`) — a one-shot action button\n  (`security-transport-save`). Writes the ten fields above into the named transport section\n  and nowhere else.\n\n### STIR/SHAKEN (`stir_shaken.conf`)\n\nSigned caller identity for outbound calls. The four switches below are policy, read from and\nwritten to the `[attestation]`/`[verification]` objects; the key material that makes signing\nand verification actually work lives in the group beneath it.\n\n- **Attestation enabled** (`s_stir`) — a switch control, default `true` → `[attestation]`\n  `global_disable` (inverted).\n- **Attestation level** (`s_level`) — a segmented control, default `A`, choices `A`, `B`, `C`\n  → `[attestation]` `attest_level`. A means you know the caller and their right to that\n  number. C means the call just passed through you.\n- **Verify inbound identity** (`s_verifyin`) — a switch control, default `true` →\n  `[verification]` `global_disable` (inverted).\n- **On verification failure** (`s_failaction`) — a segmented control, default `Continue`,\n  choices `Continue`, `Tag`, `Reject` → `[verification]` `failure_action`\n  (`continue`/`continue_return_reason`/`reject_request`).\n\n### STIR/SHAKEN keys (`stir_shaken.conf`)\n\nThe private key Asterisk signs outgoing Identity headers with, and the certificate-authority\nmaterial used to verify incoming ones — a telephone-number issuing authority hands you these;\nthis console only points Asterisk at them.\n\n- **Signing private key file** (`s_privkey`) — a text control → `[attestation]`\n  `private_key_file`. Must not be group- or world-readable; the account the asterisk process\n  runs as must own it.\n- **Signing certificate URL** (`s_certurl`) — a text control → `[attestation]`\n  `public_cert_url`. Published by the issuing authority — make sure whatever this URL serves\n  is the certificate alone, never the private key too.\n- **Trust the system CA store** (`s_loadsyscerts`) — a switch control, default `false` →\n  `[verification]` `load_system_certs`.\n- **Verification CA file** (`s_cafile`) — a text control → `[verification]` `ca_file`. At\n  least one of this and the directory below is required for verification to do anything.\n- **Verification CA directory** (`s_capath`) — a text control → `[verification]` `ca_path`.\n- **Save STIR/SHAKEN settings** (`s_stirsave`) — a one-shot action button\n  (`security-stir-save`). Writes all nine STIR/SHAKEN fields on this screen — the four policy\n  switches above and the five key-material fields — in one write, since both objects live in\n  the one file.\n\n## Failure modes and security\n\nEvery bound control here maps to a real key: `permit=`/`deny=` lines in `acl.conf`; a named\nPJSIP transport section in `pjsip.conf`; the `[attestation]`/`[verification]` objects in\n`stir_shaken.conf`. An unreachable file is shown as unreachable, never backfilled with\nplaceholder values. Saving the TLS group refuses to write when the typed transport name does\nnot resolve to an existing `type=transport` section, rather than creating a half-built\ntransport with no `bind=`. The plan step itself also validates: `verify_client`/\n`verify_server` enabled with no CA list set, a `cert_file` with nothing to pair it, attestation\nleft enabled with no `private_key_file`/`public_cert_url`, or an `attest_level` outside\n`A`/`B`/`C` all block the write with the exact reason, for every declared PJSIP transport in\nthe file — not only the first one that looks like TLS. Combined with a permissive ACL this is\nhow a PBX ends up open to toll fraud overnight. Claiming attestation level A when you cannot\nprove it is worse than honestly claiming C — it is the specific thing enforcement looks for.\nPrivate key material is never logged, captured, or written anywhere but the path the operator\ntyped; this console shows the path, never the key's contents.\n\n## Verification\n\nExercise the ACL editor's add/edit/remove/reorder against a real `acl.conf`, confirm evaluation\norder actually changes when a rule moves. Type an existing transport's name, press Load,\nconfirm the fields match what is really in `pjsip.conf`, edit and Save, and confirm a name that\ndoes not resolve to a `type=transport` section is refused rather than silently accepted. Set\nand clear each STIR/SHAKEN policy switch and key field, Save, and confirm both objects in\n`stir_shaken.conf` land correctly in one write. Confirm the console's own validation blocks a\n`verify_client` with no CA list, and that Asterisk's own load logs agree.\n\n## Suggested articles\n\n[Endpoints](../pbx/endpoints.md), [Trunk authentication](../pbx/trunkauth.md), and [AMI & ARI](../data/ami.md).\n"
    }
  ]
} as const;
