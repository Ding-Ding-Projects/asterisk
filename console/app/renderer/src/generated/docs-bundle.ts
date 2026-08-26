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
  "articleCount": 118,
  "articles": [
    {
      "id": "agent/changelog-status-hub-client",
      "category": "agent",
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
      "id": "agent/hub",
      "category": "agent",
      "title": "Status hub sessions",
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
        "skills.md",
        "memory.md",
        "sync.md"
      ],
      "body": "# Status hub sessions\n\n## Behavior\n\nOpen sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window. It is backed by `status-hub`. The rail badge on this destination currently reads `3`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Session policy\n\nHow the console behaves as a hub client.\n\n- **Reply poll interval** (`b_poll`) — a slider control, default `15`.\n- **Desktop notification on reply** (`b_notify`) — a switch control, default `true`.\n- **Auto-close idle sessions** (`b_close`) — a switch control, default `false`.\n- **Report worktree state each run** (`b_report`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in status-hub; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in status-hub, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Skills registry](skills.md), [Memory console](memory.md), and [Sync & attestation](sync.md).\n"
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
      "body": "# Memory console\n\n## Behavior\n\nSearch the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it. It is backed by `agent global memory`. The rail badge on this destination currently reads `2.4k`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\nThere is no settings form here. A visual regex builder searches the memory corpus directly, and the sync, attestation and emission-guard state are shown alongside it for context.\n\n## Failure modes and security\n\nA failed attestation on the most recent sync blocks further writes until it is acknowledged on the Sync & attestation screen.\n\n## Verification\n\nConfirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Sync & attestation](sync.md), [Vocabulary & guard](vocab.md), and [Status hub](hub.md).\n"
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
      "body": "# Operations & releases\n\n## Behavior\n\nRelease history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification. It is backed by `release`. The rail badge on this destination currently reads `v3.2`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Updates\n\nUnsigned artifacts. The operating system may warn about an unknown publisher — that is expected.\n\n- **Check for updates** (`o_check`) — a segmented control, default `On start + hourly`, choices `On start`, `On start + hourly`, `Manual`.\n- **Stage in background** (`o_stage`) — a switch control, default `true`.\n- **Install on next restart** (`o_restart`) — a switch control, default `true`.\n- **Channel** (`o_channel`) — a segmented control, default `Stable`, choices `Stable`, `Beta`.\n- **Verify package hashes** (`o_hash`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in release; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in release, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[History & git](../app/history.md), [Secret intake](secrets.md), and [About & policy](../app/about.md).\n"
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
      "body": "# Secret intake\n\n## Behavior\n\nCredentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered. It is backed by `templates/secret-intake`. The rail badge on this destination currently reads `6`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Handling\n\nStorage and rotation rules for everything in the intake.\n\n- **Storage** (`x_store`) — a segmented control, default `OS keychain`, choices `OS keychain`, `Encrypted file`.\n- **Rotation reminder** (`x_rotate`) — a slider control, default `90`.\n- **Mask in all surfaces** (`x_mask`) — a switch control, default `true`.\n- **Allow export** (`x_export`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery row reflects a real object in templates/secret-intake; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in templates/secret-intake, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Vocabulary & guard](vocab.md), [AMI & ARI](../data/ami.md), and [Operations](ops.md).\n"
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
      "body": "# Skills registry\n\n## Behavior\n\nInstalled agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here. It is backed by `skills/`. The rail badge on this destination currently reads `26`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Orchestration\n\nMulti-agent orchestration defaults.\n\n- **Maximum parallel lanes** (`u_lanes`) — a stepper control, default `4`.\n- **Isolated worktree per lane** (`u_isolate`) — a switch control, default `true`.\n- **Lane model override** (`u_model`) — a select control, default `gpt-5.6-luna`, choices `gpt-5.6-luna`, `inherit`.\n- **Verification panel for high-risk lanes** (`u_verify`) — a switch control, default `true`.\n- **Keep destructive actions with orchestrator** (`u_destruct`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in skills/; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in skills/, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Status hub](hub.md), and [Operations](ops.md).\n"
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
        }
      ],
      "links": [
        "../platform/status-hub.md",
        "../system/security.md",
        "../platform/in-context-recovery.md"
      ],
      "body": "# Status Hub client\n\n## Behavior\n\nThe client provides a typed, renderer-safe connection to the project's live status service. It can:\n\n- register a project and retain the server's registration receipt;\n- read the project record and its observed checks;\n- read sessions with exact ids, states, commit references, run references and evidence links;\n- read each session's question list and reply inbox; and\n- submit a question answer and expose the server's delivery receipt.\n\nThe client and store are mount-ready but are not mounted by this lane. The later application wiring can use `createStatusHubClient`, `createStatusHubStore`, and `createStatusHubHandlerFactory` without changing the generated design renderer.\n\nThe renderer surface derives rows only from server observations. It has no sample project, sample session, or optimistic delivery state. A question remains without a receipt until the server returns one. Polling is non-blocking, bounded, single-flight, and cancellable.\n\n## Configuration\n\n`StatusHubClient` accepts:\n\n- `baseUrl`, which must be HTTPS or HTTP on `localhost`, `127.0.0.1`, or `::1`;\n- optional `enrollment` and `reply` credential references; and\n- optional request and polling deadlines.\n\nCredential references use the bounded `vault://...` form. The client never accepts a bearer value, password, API key, or other credential value. A privileged host is responsible for resolving the references from its operating-system vault.\n\nThe registration descriptor is exported as `STATUS_HUB_REGISTRATION_DESCRIPTOR` for a later dispatch integration. The current route shape is:\n\n```text\nPOST /api/status-hub/projects\nGET  /api/status-hub/projects/:projectId\nGET  /api/status-hub/projects/:projectId/sessions\nGET  /api/status-hub/sessions/:sessionId\nGET  /api/status-hub/sessions/:sessionId/replies\nPOST /api/status-hub/sessions/:sessionId/questions/:questionId/answers\n```\n\nAll responses are bounded before JSON parsing. Redirects are refused, cross-origin responses are refused, and requests have deadlines. A new mount generation aborts older work and marks its late results stale.\n\n## Failure modes\n\nThe store reports the observed availability state instead of converting a failure into an empty success:\n\n- `unavailable`: the route or service is not reachable;\n- `offline`: a network or deadline failure occurred;\n- `authRequired`: the service requires authentication;\n- `refused`: the service rejected the request, URL, redirect, or response bounds;\n- `stale`: a newer generation superseded the request;\n- `partial`: some project, session, or inbox data arrived while another read did not; and\n- `error`: the response shape or JSON was invalid.\n\nAn answer submission that receives a transport error does not create a receipt. A refusal returned by the server is shown only when it is part of the typed server receipt.\n\n## Security and privacy\n\nThe client does not log request bodies, response bodies, credential references, or credential values. It sends only a vault reference header to the configured origin. URL parsing rejects embedded credentials, fragments, unexpected origins, and non-HTTPS non-loopback transport. Response bodies are limited to 512 KiB, lists are bounded, and all strings are length-checked before entering renderer state.\n\nThe renderer receives project and session evidence links, states and ids, but no enrollment or reply credential material. The client does not follow redirects. A host integration must keep vault resolution in the privileged boundary and must never pass the resolved value through renderer code.\n\n## Verification boundary\n\nThis lane was implemented without launching tests, builds, lint, network requests, runtime interaction, or capture workflows. The decisive verification remains the later integration's typed build and server-contract checks against the exact endpoints recorded above.\n\nSuggested articles: [Status Hub](../platform/status-hub.md), [local security](../system/security.md), and [hosted authentication](../platform/in-context-recovery.md).\n"
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
        "../app/history.md"
      ],
      "body": "# Sync & attestation\n\n## Behavior\n\nEvery sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here. It is backed by `agent-memory-sync`. The rail badge on this destination currently reads `ok`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Schedule\n\nWhen the console pushes memory upstream.\n\n- **Automatic sync** (`y_auto`) — a switch control, default `true`.\n- **Interval** (`y_every`) — a slider control, default `60`.\n- **Backup before write** (`y_backup`) — a switch control, default `true`.\n- **Require attestation** (`y_attest`) — a switch control, default `true`.\n- **Keep backups** (`y_retain`) — a stepper control, default `30`.\n\n## Failure modes and security\n\nEvery row reflects a real object in agent-memory-sync; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in agent-memory-sync, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [History & git](../app/history.md).\n"
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
      "body": "# Vocabulary & emission guard\n\n## Behavior\n\nThe private vocabulary dictionary and the emission guard that blocks a forbidden term before it can leave the process. It is backed by `vocabulary-dictionary.json`. The rail badge on this destination currently reads `lock`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## Configuration\n\n### Emission guard\n\nRuns on every string the app is about to write or display.\n\n- **Guard enabled** (`n_guard`) — a switch control, default `true`.\n- **On violation** (`n_mode`) — a segmented control, default `Block`, choices `Warn`, `Block`, `Rewrite`.\n- **Scan surfaces** (`n_scan`) — a chips control, default `UI text`, `Logs`, `Exports`, choices `UI text`, `Logs`, `Exports`, `Clipboard`, `Telemetry`.\n- **Vocabulary lock** (`n_lock`) — a switch control, default `true`.\n- **Report drift daily** (`n_drift`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in vocabulary-dictionary.json; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in vocabulary-dictionary.json, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [Notifications](../app/notifications.md).\n"
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
        "arcade.md",
        "notifications.md"
      ],
      "body": "# Customise everything\n\n## Behavior\n\nThe global layer. Every one of these reaches across the whole console, and every individual element can still override it from its own right-click menu. It is backed by `console profile`. The rail badge on this destination currently reads `∞`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Fun\n\nHow playful the console is allowed to be. This is a real setting, not a joke — it scales celebrations, copy and randomness together.\n\n- **Fun level** (`fun_level`) — a slider control, default `2`. 0 is a bank. 1 is polite. 2 is the default — celebrations on meaningful wins. 3 adds jokes and bolder motion. 4 is confetti for changing a slider, rainbow fills and an app that will not stop congratulating you.\n  - *What it is:* How playful the console is allowed to be, from 0 to 4.\n  - *Why it exists:* One dial that scales celebrations, copy tone, motion and randomness together.\n  - *Choosing a value:* 0 Bank, 1 Polite, 2 Balanced, 3 Playful, 4 Unhinged.\n  - *Gotcha:* Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2.\n- **Copy tone** (`fun_copy`) — a segmented control, default `Warm`, choices `Terse`, `Neutral`, `Warm`, `Comedian`.\n- **Celebrate on** (`fun_celebrate`) — a chips control, default `Big wins`, `Security improvements`, choices `Every change`, `Big wins`, `Security improvements`, `Minigame wins`, `Nothing`.\n- **Confetti density** (`fun_confetti`) — a slider control, default `90`.\n- **Sound effects** (`fun_sound`) — a switch control, default `false`.\n- **Show the mascot** (`fun_mascot`) — a switch control, default `false`.\n- **Allow hidden surprises** (`fun_easter`) — a switch control, default `true`.\n- **Random appearance for every element** (`fun_random`) — a switch control, default `false`. On, every rendered element is given its OWN randomly generated appearance — its own colour, radius, weight, shadow and entrance. Nothing shares a look. Turn it off and everything snaps back to the design system; your manual per-element overrides survive either way.\n  - *What it is:* Gives every rendered element its own randomly generated appearance.\n  - *Why it exists:* Because you asked, and because it makes a dull configuration screen memorable.\n  - *Choosing a value:* A seed, a scope of properties to randomise, a wildness percentage and an optional reroll on every screen change.\n  - *Gotcha:* At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.\n- **Randomness seed** (`fun_random_seed`) — a stepper control, default `1`.\n- **Randomise** (`fun_random_scope`) — a chips control, default `Colour`, `Radius`, `Shadow`, choices `Colour`, `Radius`, `Shadow`, `Type weight`, `Size`, `Rotation`, `Entrance animation`.\n- **How wild** (`fun_random_strength`) — a slider control, default `40`.\n- **Reroll on every screen change** (`fun_random_reroll`) — a switch control, default `false`.\n\n### Motion\n\nGlobal timing. Individual elements can still set their own.\n\n- **Animation speed** (`mo_speed`) — a slider control, default `100`.\n- **Default easing** (`mo_curve`) — a segmented control, default `Emphasised`, choices `Linear`, `Standard`, `Emphasised`, `Springy`.\n- **Screen transition** (`mo_screen`) — a select control, default `Lift and fade`, choices `Lift and fade`, `Cross fade`, `Slide`, `Zoom`, `None`.\n- **Dialog entrance** (`mo_dialog`) — a select control, default `Per dialog`, choices `Per dialog`, `Uniform rise`, `Uniform zoom`.\n- **Respect reduced motion** (`mo_reduce`) — a switch control, default `true`.\n- **Hover lift** (`mo_hover`) — a switch control, default `true`.\n\n### Layout\n\nStructure of the whole window.\n\n- **Rail position** (`ly_dock`) — a segmented control, default `Left`, choices `Left`, `Right`, `Top`, `Compact`.\n- **Density** (`ly_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.\n- **Corner radius** (`ly_radius`) — a slider control, default `16`.\n- **Card spacing** (`ly_gap`) — a slider control, default `12`.\n- **Tab strip** (`ly_tabs`) — a segmented control, default `Above content`, choices `Above content`, `Below rail`, `Hidden`.\n- **Section list width** (`ly_sidebar`) — a slider control, default `268`.\n- **Monospace numerics everywhere** (`ly_mono`) — a switch control, default `true`.\n\n### Theme\n\nColour across the console. Every colour control in the app uses the same infinite picker.\n\n- **Mode** (`th_mode`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`, `Per screen`.\n- **Accent hue** (`th_hue`) — a slider control, default `148`.\n- **Accent saturation** (`th_sat`) — a slider control, default `60`.\n- **Contrast** (`th_contrast`) — a segmented control, default `Standard`, choices `Standard`, `Medium`, `High`.\n- **Rainbow accent** (`th_rainbow`) — a switch control, default `false`.\n- **Rainbow speed** (`th_rbspeed`) — a slider control, default `8`.\n- **Tint surfaces with the accent** (`th_tint`) — a slider control, default `6`.\n\n### Behaviour\n\nWhat the console does without being asked.\n\n- **Open on launch** (`bh_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`, `Customise everything`.\n- **Confirmation** (`bh_confirm`) — a segmented control, default `Four gates`, choices `Four gates`, `Credits allowed`, `Single confirm`.\n- **Commit every change to git** (`bh_commit`) — a switch control, default `true`.\n- **Default lock method** (`bh_lockdefault`) — a select control, default `PIN`, choices `PIN`, `Password`, `Password + PIN`, `Password + PIN + TOTP`.\n- **Offer the wizard first on every screen** (`bh_wizard`) — a switch control, default `false`.\n- **Show explain buttons** (`bh_explain`) — a switch control, default `true`.\n- **Offer the tour on launch** (`bh_tour`) — a switch control, default `false`.\n\n### Profiles\n\nSave the entire look and behaviour, then move it between machines.\n\n- **Active profile** (`pr_active`) — a select control, default `Default`, choices `Default`, `Night operations`, `Training room`, `Demo`.\n- **Sync profile with agent memory** (`pr_sync`) — a switch control, default `true`.\n- **Allow per-screen overrides** (`pr_perscreen`) — a switch control, default `true`.\n- **Include appearance overrides in exports** (`pr_export`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in console profile; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2. At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console profile, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Appearance](appearance.md), [Arcade](arcade.md), and [Notifications](notifications.md).\n"
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
      "id": "changelog/automatic-updater-reliability",
      "category": "changelog",
      "title": "Automatic updater reliability",
      "headings": [],
      "links": [],
      "body": "# Automatic updater reliability\n\n- Draft-count updates now advance the main-process updater revision before publication, so a stale status read cannot overwrite a newer restart block.\n- PBX draft publication now counts every loaded resource against its last live read, including the currently edited resource, so apply, discard, restore, and field edits converge on one accurate restart block.\n- Installer launch acknowledgement clears its timeout on success and failure, preventing an old timer from changing a later state.\n- Successful installer acknowledgement now returns to the renderer before quit is scheduled, while the installing latch stays held through shutdown and clears only for a failed launch.\n- Release identity validation rejects duplicate artifact records, requires every resolved full and delta package exactly once, and checks version-bearing Squirrel filenames.\n- Published tags retain the legacy-compatible `ding-pbx-console-v0.0.<run>-r<attempt>` shape while the package identity remains monotonic `0.1.<run>`, so existing `0.1.0` installations can see repaired releases.\n- Published packaging now rejects a tag and package-version pair unless the run number maps exactly to `0.1.<run>` within a bounded positive range; local unpublished `tag: null` builds remain valid.\n- Added two byte-preserved built-artifact update captures with source and release SHAs, dimensions, digests, hidden-desktop CDP method, direct installer launch, restart, Later, and draft-block evidence.\n- A newer ready revision now clears a stale local spawn-error message after recovery, while current failure state remains visible.\n"
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
        "ami.md",
        "../pbx/dash.md",
        "../system/logger.md"
      ],
      "body": "# Call records\n\n## Behavior\n\nWhich backend stores records, what counts as an answered call, and which events are logged. Backends are picked, connection secrets come from secret intake. It is backed by `cdr.conf · cel.conf`. It lives on the Data rail, under the Records & APIs group: Call records, event logging and the machine interfaces.\n\n## Configuration\n\n### CDR\n\nOne row per call.\n\n- **CDR enabled** (`d_enable`) — a switch control, default `true`.\n- **Backend** (`d_backend`) — a select control, default `odbc`, choices `csv`, `custom`, `odbc`, `pgsql`, `sqlite3`, `mysql`, `manager`, `radius`.\n  - *What it is:* Where call detail records are written.\n  - *Why it exists:* Billing, reporting and disputes all depend on these records existing.\n  - *Choosing a value:* csv for small sites, odbc or pgsql for anything that needs querying, custom when you have your own schema.\n  - *Gotcha:* If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.\n- **Log unanswered calls** (`d_unanswered`) — a switch control, default `false`.\n- **Log congestion** (`d_congestion`) — a switch control, default `false`.\n- **Batch mode** (`d_batch`) — a switch control, default `true`.\n- **Batch size** (`d_size`) — a stepper control, default `100`.\n\n### CEL\n\nOne row per channel event — far more detail, far more volume.\n\n- **CEL enabled** (`l_enable`) — a switch control, default `true`.\n- **Tracked events** (`l_events`) — a chips control, default `CHAN_START`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, choices `CHAN_START`, `CHAN_END`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, `BRIDGE_EXIT`, `APP_START`, `APP_END`, `PARK_START`, `BLINDTRANSFER`.\n- **Tracked applications** (`l_apps`) — a chips control, default `Dial`, `Queue`, choices `Dial`, `Queue`, `VoiceMail`, `ConfBridge`, `Playback`, `Park`.\n- **Timestamp format** (`l_date`) — a segmented control, default `ISO8601`, choices `ISO8601`, `epoch`, `local`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in cdr.conf · cel.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in cdr.conf · cel.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[AMI & ARI](ami.md), [Dashboard](../pbx/dash.md), and [Logger](../system/logger.md).\n"
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
      "body": "# The Ding PBX installer ISO\n\n## What it is\n\nA bootable, unattended-install ISO that turns a bare machine (or VM) into a working Ding PBX\nserver, the same way a FreePBX distro ISO does. Boot it, walk away, and when it reboots itself\nthere is a running Asterisk and a Ding PBX Console admin surface reachable from a browser on the\nlocal network — with no default password of any kind.\n\nIt is built by `build-iso.bat` at the repository root (`console/scripts/build-iso.ps1`), following\nthe same reproducibility discipline as the WSL Asterisk bundle: a base image pinned by digest,\nAsterisk compiled from the exact repository commit, every download verified against a recorded\nSHA-256 before it is trusted, and a provenance record written beside the finished artifact.\n\n## Architecture\n\nThe build has three stages, each a separate Docker stage or image so a failure in one is easy to\nisolate:\n\n1. **`iso-payload.Dockerfile`** compiles Asterisk from source (the same recipe as\n   `asterisk-wsl-runtime.Dockerfile`), builds the Ding PBX Console server (`npm ci && npm run\n   build` against `console/`), and downloads a portable Linux Node.js runtime verified by SHA-256.\n   These three pieces — Asterisk, the console server, and Node — are assembled into one payload\n   directory with an `install-target.sh` script and systemd units.\n2. **`iso-respin.Dockerfile`** downloads the official Ubuntu 24.04 LTS Server ISO, verified against\n   a pinned SHA-256 before anything touches it, extracts it, drops in the payload plus an\n   `autoinstall` (Subiquity cloud-init) answer file at `/server/`, points the bootloader at\n   `autoinstall ds=nocloud;s=/cdrom/server/`, and repacks a hybrid BIOS+UEFI-bootable ISO with\n   `xorriso`.\n3. **`build-iso.ps1`** orchestrates both stages from Windows (Docker's Linux engine does the actual\n   work, since Windows cannot compile the Linux payload or produce an ISO 9660 image natively),\n   exports and verifies the result, and writes `console/release/iso/ding-pbx-installer.iso.json`\n   with the source commit, base image and Node digests, and the finished ISO's own SHA-256.\n\n## What happens on the target machine\n\nBooting the ISO runs Ubuntu's ordinary Subiquity installer with no prompts: it partitions the\ndisk, installs the base OS, then autoinstall's `late-commands` step runs `install-target.sh`\n(inside the newly installed system, via `curtin in-target`), which:\n\n- installs the bundled Node.js runtime to `/usr/local/lib/ding-pbx-node`\n- installs the compiled Asterisk tree and enables `asterisk.service`\n- installs the Ding PBX Console server under `/opt/ding-pbx-console` (reusing\n  `console/server/deploy/install.sh` unmodified) and enables `ding-pbx-console.service`, bound to\n  `0.0.0.0:8443` so it is reachable from the LAN rather than loopback-only\n- installs a first-boot banner unit that writes the machine's current LAN address into\n  `/etc/issue`, so whoever is at the console sees exactly where to point a browser\n\n## First-boot credential flow\n\n**No credential of any kind is written to the ISO.** The `identity.password` field in the\nautoinstall answer file is the locked sentinel `\"!\"`, which refuses interactive password login for\nthat local Unix account entirely — it exists only so the installer has an account to run under,\nnever as an administrative credential.\n\nThe actual admin account is created by the Ding PBX Console server itself, the first time anyone\nvisits it: `console/server/auth.ts`'s `createAdminAccount` gates every other request behind the\nfirst-run setup screen until an account exists. Whoever reaches the printed LAN address first\ncreates the admin account. Because the service binds to the LAN rather than loopback by default so\nthat an operator can reach it at all, **the operative security boundary during the first-boot\nwindow is the network the machine is plugged into**, not a credential — treat that window (from\nfirst boot until an admin account is created) the way you would treat an unconfigured switch port:\nkeep the machine off an untrusted network, or firewall port 8443 to the operator's own address,\nuntil setup is done.\n\n## Requirements\n\n- A machine or VM with x86-64 hardware, at least 2 vCPU / 2 GiB RAM / 8 GiB disk for a minimal\n  install (Asterisk itself is light; size storage for call recordings and voicemail separately).\n- **Secure Boot must be disabled**, or a custom key enrolled for this ISO. Code signing is\n  permanently out of scope for this project (see the repository's no-signing policy) — the ISO is\n  genuinely unsigned, and a machine enforcing Secure Boot will refuse to boot it. This is stated by\n  the build script's own output and here, rather than left for someone to discover at a boot\n  prompt.\n- Network reachable by DHCP during install (the base OS and package list install from the\n  network unless a local mirror is configured; the Asterisk/Node/console payload itself needs no\n  network, since it is embedded on the ISO).\n\n## How to boot and install it\n\n1. Write `console/release/iso/ding-pbx-installer.iso` to a USB drive (`dd`, Rufus, or Ventoy) or\n   attach it as a VM CD-ROM.\n2. Boot from it. No prompts appear; the machine partitions its disk and installs unattended.\n3. On completion the machine reboots itself into the installed system.\n4. At the console login screen, read the printed address (`Console admin setup: http://<ip>:8443/`)\n   and open it from a browser on the same network.\n5. Create the admin account. From then on the console requires that account's credentials for\n   every request.\n\n## Verifying the download\n\n`console/release/iso/ding-pbx-installer.iso.json` records the exact source commit, the pinned base\nUbuntu ISO URL and SHA-256, the pinned Node.js runtime version and SHA-256, and the finished ISO's\nown SHA-256. Compare that last value against a locally computed digest of the downloaded file\nbefore writing it to a USB drive or booting it in a VM.\n\n## Honest security posture\n\n- The ISO itself is unsigned; Secure Boot refuses it.\n- No credential is embedded anywhere on the ISO or in its build.\n- The admin surface binds to the LAN by default during the first-boot window, before any account\n  exists — see **First-boot credential flow** above for the mitigation.\n- `late-commands`' package list (`packages:` in the autoinstall answer file) is installed from\n  whatever apt sources the target machine reaches at install time; only the Asterisk, Node.js, and\n  Ding PBX Console payload itself is fully offline and reproducible from the ISO's own contents.\n- Building the ISO requires Docker with a working Linux engine; it cannot be produced on a bare\n  Windows host.\n\n## Building it in CI\n\n`.github/workflows/installer-iso.yml` builds this ISO reproducibly on a GitHub-hosted\n`ubuntu-24.04` runner (a Linux Docker engine is required to compile the Linux payload and produce\nan ISO 9660 image, which a Windows host cannot do natively -- Docker ships preinstalled on that\nrunner image, so no separate setup is needed). It runs on `workflow_dispatch`, and automatically\nwhenever a push to `master` touches `console/scripts/iso/**`, `console/scripts/build-iso.ps1`,\n`build-iso.bat`, or the workflow file itself.\n\nIt runs the same three stages as local `build-iso.bat`/`build-iso.ps1` (payload build, ISO respin,\nboot verification), then keeps the same \"not tests, not lint\" discipline as every other workflow in\nthis repository: no test job, no lint job, nothing gates the build. A run either builds, packages,\nand publishes evidence, or it fails outright on the build or verification step itself.\n\n### The 2 GiB release-asset problem\n\nA GitHub release asset is capped at 2 GiB (2,147,483,648 bytes) per file. The ISO this pipeline\nproduces is roughly 3.47 GiB (3,720,878,080 bytes measured against a real build), so it cannot be\nattached to a release as a single file.\n\nThe workflow solves this by splitting the verified ISO into 1900 MiB volumes (`split -b 1900MiB`,\nsafely under the cap) and publishing all of them as release assets, alongside:\n\n- `ding-pbx-installer.iso.sha256` -- the reassembled image's own SHA-256, for a one-line check.\n- `ding-pbx-installer.iso.json` -- full provenance (source commit, base ISO URL/digest, Node\n  runtime version/digest, console build base image digest, ISO byte count and SHA-256, part\n  count, and the same Secure Boot / no-signing statement as the local build).\n- `ding-pbx-installer.iso.REASSEMBLE.md` -- exact reassembly commands for Linux/macOS and Windows,\n  plus the SHA-256 of every individual volume and of the reassembled whole.\n\nTo reassemble and verify a downloaded release:\n\n```sh\ncat ding-pbx-installer.iso.part* > ding-pbx-installer.iso\nsha256sum -c ding-pbx-installer.iso.sha256\n```\n\nOn Windows PowerShell:\n\n```powershell\ncmd /c \"copy /b ding-pbx-installer.iso.part001+ding-pbx-installer.iso.part002+... ding-pbx-installer.iso\"\ncertutil -hashfile ding-pbx-installer.iso SHA256\n```\n\nCompare the resulting digest against the one recorded in `ding-pbx-installer.iso.sha256` and in\n`ding-pbx-installer.iso.json` before writing the ISO to a USB drive or booting it. **Do not boot an\nISO whose reassembled digest does not match.**\n\nThe workflow also uploads the complete, unsplit ISO as an ordinary GitHub Actions workflow\nartifact (a separate, larger size limit than a release asset), for convenience when the run is\nstill fresh -- but workflow artifacts expire (14 days here) and are not a durable distribution\nchannel, so the split release assets are the one to link to for anyone downloading later.\n\n### Boot verification in CI\n\nThe workflow re-checks, on the artifact it actually produced, the exact three properties the local\nbuild and `console/tests/iso/iso-build.test.mjs` already require of the respin recipe: both El\nTorito boot catalog entries present (`BIOS` and `UEFI`), and a real master boot record signature\n(`55aa`) at byte 510, plus the ISO 9660 primary volume descriptor signature (`CD001`) at byte\n32769. These are the properties that distinguish a genuinely bootable image from a valid-looking\nISO 9660 file that cannot boot -- see the long comment above the repack in\n`console/scripts/iso/iso-respin.Dockerfile` for the real incident that made these checks necessary.\n\n### Unsigned, same as the local build\n\nThis ISO is unsigned in CI exactly as it is locally -- code signing is permanently out of scope for\nthis project. The workflow states this in its own release notes and evidence rather than leaving it\nto be discovered at a Secure Boot prompt.\n\n## Verification state\n\nEverything in `console/tests/iso/*.test.mjs` (20 tests) is run without Docker or a real ISO: it\nstatically checks the autoinstall answer file for structural correctness and the absence of any\nembedded credential, checks that `build-iso.ps1` verifies its downloads and the finished artifact\nrather than trusting a green build log, and checks that no code-signing call exists anywhere in the\npipeline. Every one of those checks was proved meaningful by breaking the real file it guards,\nobserving the test go red, and restoring it.\n\n**A full ISO has been built.** 3,720,878,080 bytes, from the packaged Asterisk runtime whose digest\nwas checked against its own manifest first. Its structure was verified rather than assumed: one El\nTorito BIOS entry, one EFI entry, an ISO 9660 primary volume descriptor, and a real master boot\nrecord signature at byte 510. The base Ubuntu image and the Linux Node.js runtime are pinned to\ntheir published SHA-256 values, both verified against the sums their vendors publish, and every\ndownload fails closed rather than accepting a file that does not match.\n\n**Building it found a defect that no other check would have.** The first image produced was a valid\nISO 9660 with entirely correct contents that no machine would boot. The repack followed Ubuntu's own\npublished autoinstall recipe, which names `boot_hybrid.img` for the master boot record; Ubuntu\n24.04.4 does not ship that file. The hybrid repack failed, a fallback repack ran, and the build\nreported success. Every test in the suite passed on that image.\n\nThe fallback is gone — one that quietly drops the single property the artifact exists for is worse\nthan no fallback. The repack now asks the base image to describe its own boot arrangement through\n`xorriso -report_el_torito as_mkisofs` and uses that answer, reading the master boot record and the\nappended EFI partition back out of it by byte interval. That is what the vendor shipped rather than\na reconstruction of it, and it does not go stale when a point release moves a file.\n\n**Still not done: the image has not been booted.** Its structure says it can; only running it proves\nit does. That, and the fact that it is unsigned and Secure Boot will therefore refuse it, are the two\nthings to know before trusting it.\n\nIt was built under WSL rather than a container, because the container engine on the build host would\nnot start. The CI workflow builds it in a container on a Linux runner, which is the reproducible\npath; the local script remains the fallback.\n"
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
      "id": "pbx/canvas",
      "category": "pbx",
      "title": "Dialplan canvas",
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
        "ivr.md",
        "queues.md",
        "endpoints.md"
      ],
      "body": "# Dialplan canvas\n\n## Behavior\n\nOne infinite canvas for the live dialplan, IVR and queue routing graph. Nodes and edges are parsed from the target's `dialplan show` output, and the layout can be moved locally for inspection. The inspector is read-only because this surface has no dialplan write path. The rail badge on this destination is empty until a live graph is read. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\nThere is no settings form here. Adding, deleting, duplicating, or rewiring a node reports that the canvas is read-only rather than claiming a write occurred. An unread or unavailable target produces an empty canvas with the control-plane reason.\n\n## Failure modes and security\n\nA node that references a destination that no longer exists is omitted by the parser and the source reading reports the exact parse or target failure. Local layout changes never alter the target.\n\n## Verification\n\nConfirm the graph contains only nodes and edges from a successful live reading, that local dragging changes layout only, and that every attempted write action reports the read-only boundary without changing the target.\n\n## Suggested articles\n\n[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).\n"
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
      "body": "# PJSIP endpoints\n\n## Behavior\n\nPhones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `12`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Identity\n\nWho this endpoint claims to be on the wire, and what the far end is allowed to present back.\n\n- **Transport** (`e_transport`) — a select control, default `transport-udp`, choices `transport-udp`, `transport-tcp`, `transport-tls`, `transport-wss`. A transport is the road the signalling travels on. UDP is the plain road, TLS is the same road inside an armoured tunnel.\n  - *What it is:* Chooses which configured transport this endpoint signals over: plain UDP, TCP, TLS, or WebSocket for browsers.\n  - *Why it exists:* Signalling carries who is calling whom, the credentials exchange and the media keys. On UDP all of that is readable by anything on the path.\n  - *Choosing a value:* transport-udp is the historic default and fine inside a trusted LAN. transport-tcp helps where packets are large or fragmented. transport-tls is the right answer for anything crossing a network you do not own. transport-wss is required for WebRTC browser clients.\n  - *Gotcha:* The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so.\n- **Dialplan context** (`e_context`) — a select control, default `from-internal`, choices `from-internal`, `from-external`, `from-trunk`, `sip-guest`. When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.\n  - *What it is:* The dialplan context this endpoint enters when it dials.\n  - *Why it exists:* A context is a namespace of extensions. It is the single most important security boundary in Asterisk: an endpoint can only reach what its context lets it reach.\n  - *Choosing a value:* from-internal for staff phones, from-external for anything untrusted, from-trunk for carriers.\n  - *Gotcha:* Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will.\n- **Caller ID presentation** (`e_callerid`) — a segmented control, default `Allowed`, choices `Allowed`, `Prohibited`, `Unavailable`.\n- **Trust inbound identity** (`e_trust`) — a switch control, default `false`. Only turn this on for carriers you control. It tells Asterisk to believe P-Asserted-Identity headers the other side sends.\n\n### Media & NAT\n\nEvery option here came out of pjsip.conf. Toggle, do not type.\n\n- **direct_media** (`e_direct`) — a switch control, default `false`. Off means audio goes through Asterisk. On means the two phones talk to each other directly and Asterisk steps out of the audio path.\n  - *What it is:* Whether the two phones may send audio straight to each other, leaving Asterisk out of the media path.\n  - *Why it exists:* It halves bandwidth at the PBX and removes a hop of latency.\n  - *Choosing a value:* no keeps audio flowing through Asterisk. yes lets the endpoints talk directly once the call is up.\n  - *Gotcha:* With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off.\n- **rtp_symmetric** (`e_symmetric`) — a switch control, default `true`.\n  - *What it is:* Requires that RTP arrives from the same address and port we are sending to.\n  - *Why it exists:* It defeats a class of audio injection where a third party sprays packets at your open RTP port.\n  - *Choosing a value:* yes is strongly recommended. no only for equipment that genuinely cannot comply.\n  - *Gotcha:* Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n- **force_rport** (`e_forcerport`) — a switch control, default `true`.\n  - *What it is:* Sends responses back to the port the request actually came from, rather than the port the phone claimed.\n  - *Why it exists:* A phone behind NAT advertises its private port. Replying there sends the packet nowhere.\n  - *Choosing a value:* yes for anything behind a router, which is nearly everything.\n  - *Gotcha:* Turning it off for a remote phone produces one-way registration that silently expires.\n- **rewrite_contact** (`e_rewrite`) — a switch control, default `true`. Needed when a phone behind a home router announces its private address. Asterisk quietly replaces it with the address the packet really came from.\n  - *What it is:* Replaces the Contact header address with the address the packet actually arrived from.\n  - *Why it exists:* Same NAT problem as force_rport, at the registration layer.\n  - *Choosing a value:* yes for remote and home workers. Not needed on a flat trusted LAN.\n  - *Gotcha:* On a carrier trunk this can be wrong: the carrier may legitimately present a Contact that differs from the source.\n- **ice_support** (`e_ice`) — a switch control, default `false`.\n- **media_encryption** (`e_encryption`) — a segmented control, default `sdes`, choices `no`, `sdes`, `dtls`.\n  - *What it is:* Whether media is encrypted, and with which scheme.\n  - *Why it exists:* TLS protects signalling only. Without media encryption the conversation itself is in the clear.\n  - *Choosing a value:* no is unencrypted. sdes exchanges keys in the SDP and requires TLS to be meaningful. dtls negotiates keys in the media stream itself and is what WebRTC uses.\n  - *Gotcha:* sdes over UDP signalling is theatre — the keys travel in plain text. If you turn on sdes, turn on TLS as well.\n- **dtmf_mode** (`e_dtmf`) — a segmented control, default `rfc4733`, choices `rfc4733`, `inband`, `info`, `auto`.\n  - *What it is:* How keypad presses travel from the phone to Asterisk.\n  - *Why it exists:* IVR menus, voicemail passwords and conference controls all depend on getting this right.\n  - *Choosing a value:* rfc4733 sends them as RTP events and is the modern default. inband sends actual tones in the audio, which compressed codecs mangle. info uses SIP INFO messages. auto tries to work it out.\n  - *Gotcha:* inband with g729 is the single most common cause of an IVR that ignores every key press.\n\n### Registration & AOR\n\nHow many devices may share this identity and how often Asterisk pokes them.\n\n- **max_contacts** (`e_maxcontacts`) — a stepper control, default `2`.\n  - *What it is:* How many devices may register against this one identity at the same time.\n  - *Why it exists:* One identity ringing a desk phone and a mobile app together needs at least two.\n  - *Choosing a value:* 1 for a single desk phone. 2 to 3 for desk plus mobile. 0 means unlimited and should not be used.\n  - *Gotcha:* A stolen credential can quietly add a device. Keep this as low as the deployment allows and watch the contact list.\n- **qualify_frequency** (`e_qualify`) — a slider control, default `60`. Asterisk sends a tiny OPTIONS ping this often to see if the phone is still alive. Zero switches the pings off.\n  - *What it is:* How often Asterisk sends a lightweight OPTIONS request to check the endpoint is still alive.\n  - *Why it exists:* It is how the console knows an endpoint went unreachable before a caller discovers it.\n  - *Choosing a value:* 60 seconds is a sensible default. 30 for critical endpoints. 0 disables the check.\n  - *Gotcha:* Very short intervals across hundreds of endpoints generate real traffic and real CPU. It is a poll, not a subscription.\n- **Registration expiry** (`e_expiry`) — a slider control, default `3600`.\n- **Allowed codecs** (`e_codecs`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`.\n\n## Failure modes and security\n\nEvery row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so. Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will. With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off. Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [Codecs & RTP](../media/codecs.md).\n"
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
        "trunkauth.md",
        "canvas.md",
        "ivr.md",
        "queues.md"
      ],
      "body": "# PBX\n\nTelephony: endpoints, routing and everything a call touches while it is alive.\n\n- [Dashboard](dash.md)\n- [Live channels](live.md)\n- [Endpoints](endpoints.md)\n- [Trunks](trunks.md)\n- [Trunk authentication](trunkauth.md)\n- [Dialplan canvas](canvas.md)\n- [IVR menus](ivr.md)\n- [Queues & agents](queues.md)\n"
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
      "body": "# Trunk authentication\n\n## Behavior\n\nWhen a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do. It is backed by `pjsip.conf · partner requests`. The rail badge on this destination currently reads `2`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Answering policy\n\nHow requests arrive and what may be answered without you.\n\n- **Auto-approve low-risk requests** (`ta_auto`) — a switch control, default `false`. Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.\n- **Requests expire after** (`ta_expire`) — a slider control, default `48`.\n- **Notify on new request** (`ta_notify`) — a switch control, default `true`.\n- **Require mutual confirmation** (`ta_mutual`) — a switch control, default `true`. Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.\n- **Sign my answers** (`ta_sign`) — a switch control, default `true`.\n- **Keep the answer history forever** (`ta_log`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in pjsip.conf · partner requests; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf · partner requests, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [History & git](../app/history.md).\n"
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
        "../system/security.md"
      ],
      "body": "# Trunks & registrations\n\n## Behavior\n\nOutbound carriers and inbound identifies. Registration state is polled live; credentials live in the secret intake, never on this screen. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `3`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Failover\n\nWhat happens when the primary carrier stops answering.\n\n- **Retry interval** (`t_retry`) — a slider control, default `60`.\n- **Forbidden retry** (`t_forbidden`) — a slider control, default `300`.\n- **Fatal retry attempts** (`t_fatal`) — a stepper control, default `5`.\n- **Failover order** (`t_order`) — a order control, default `carrier-primary`, `carrier-backup`, `branch-iax`.\n\n### Outbound identity\n\nHow your calls appear to the carrier.\n\n- **From domain source** (`t_from`) — a segmented control, default `Trunk`, choices `Trunk`, `Endpoint`, `Global`.\n- **Send P-Asserted-Identity** (`t_pai`) — a switch control, default `true`.\n- **Privacy header** (`t_privacy`) — a segmented control, default `none`, choices `none`, `id`, `header`, `critical`.\n- **100rel** (`t_100rel`) — a segmented control, default `yes`, choices `no`, `required`, `yes`.\n\n## Failure modes and security\n\nEvery row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunk authentication](trunkauth.md), [Endpoints](endpoints.md), and [Security](../system/security.md).\n"
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
        "../app/about.md",
        "README.md"
      ],
      "body": "# Renameable app display name\n\nLets a user rename what the application calls itself in its own title bar and About screen, without touching its install identity.\n\n## Behavior\n\nA settings field is meant to let a user set a custom display name shown in the title bar, notifications, and About screen, persisted across restarts and resettable to the shipped name in one action.\n\n## Configuration\n\nRenaming would change display only — the application's data directory, package identifiers, and update feed stay fixed to the shipped constant regardless of what the user renames it to.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application shows a fixed title-bar name with no rename control anywhere in settings.\n\n**Documentation website:** Not implemented. The documentation website is not an installed application with a title bar identity of this kind.\n\n## Failure modes\n\nA rename that accidentally altered the application's data-directory path rather than only its display label is the specific failure this feature is designed to prevent by deriving the two from separate constants; there is no rename control yet to exercise that separation.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [About and policy](../app/about.md), [Platform feature index](README.md).\n"
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
          "title": "Color model",
          "id": "color-model"
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
        "app-logo-customization.md",
        "accessibility.md"
      ],
      "body": "# Appearance runtime core\n\nThe desktop renderer has a local, versioned appearance model that can be mounted by any real surface without routing settings through a preview-only facade.\n\n## Behavior\n\nEvery override is addressed by a stable element identifier, one interaction state, and one property. Interaction states include default, hover, focus, focus-visible, active, disabled, selected, checked, and expanded. Resolution is deterministic: an element's state override wins over its default override, then the matching global state, then the global default.\n\nEditing uses a per-property draft. Creating a draft does not change the mounted value. Apply changes only that property and removes its draft. Discard removes only the draft. Reset can target one property, one state on one element, every state on one element, one global state, all global values, or the complete appearance model. These scopes are separate so resetting one color cannot erase unrelated settings.\n\nNamed presets contain real global settings, rainbow speed, and override snapshots. Applying a preset replaces those values and clears drafts. Saving, applying, deleting, importing, and resetting return executable inverse actions only after local persistence succeeds. A no-op reports that nothing changed, and an unavailable operation reports why it did not run.\n\n## Color model\n\nThe color engine accepts continuous HSL coordinates and translates bidirectionally among named colors, HEX and HEX8, RGB and RGBA, HSL and HSLA, HSV and HSB, HWB, CIELAB and LCH, OKLab and OKLCH, and CMYK. Alpha is retained in every translation, using an alpha-preserving hexadecimal fallback when no exact name exists.\n\nWide-gamut input reports when its displayed sRGB result was clipped. The original input remains available to the calling editor, so a display conversion never pretends the source was already inside the display gamut. Contrast evidence records the exact foreground, background, ratio, and WCAG verdict when both colors are fixed. Animated color reports that a fixed ratio cannot be calculated.\n\nRainbow is a discriminated marker, not a color string and not a palette entry. One global speed level maps to one duration shared by every mounted rainbow surface. Reduced motion resolves the marker to one stable hue and disables the animation.\n\n## Persistence and import\n\nThe local store uses schema version 2 and a caller-provided storage adapter. The browser adapter can use local storage, while tests or non-browser hosts can supply another adapter without changing the model. Reads revalidate the complete stored document. Writes serialize and validate the complete next model before replacing the prior stored value. A rejected import applies nothing.\n\nJSON export includes the complete model, drafts, presets, capability records, and safe logo rendering metadata. It does not include custom-logo bytes, filenames, paths, cache keys, or network references. A custom logo export states that the local asset was omitted.\n\n## Capability records\n\nRuntime support is recorded explicitly for installed-font enumeration, variable font axes, eyedropper access, clipboard writes, local logo decoding and crop, rainbow animation, and direct OKLCH output. An unsupported record carries both the reason and the fallback. The interface must use these records to keep an unavailable control visible and truthful rather than showing a success notification for an operation that never ran.\n\n## Mounting\n\n`appearance-runtime.ts` mounts values onto elements that expose `data-appearance-id`. A host can set `data-appearance-state` as interaction changes and remount the model. The adapter reports element identifiers that are stored but not present in the mounted surface. It also exports the stylesheet needed for hue interpolation. The central renderer must install that stylesheet and mount the adapter before these model changes become visible.\n\n## Failure modes and security\n\n- Storage read failure starts with an empty model and exposes the rejection reason.\n- Storage write failure preserves the previous in-memory and persisted model.\n- A stale inverse action is refused when its expected revision no longer matches.\n- A malformed, oversized, duplicate, unknown-version, or privacy-invalid import is rejected as a whole.\n- A rainbow marker never enters color parsing, translation, contrast, alpha concatenation, or finite palettes.\n- Logo metadata cannot carry a path, URL, raw asset, filename, or cache key.\n- Capability detection never invokes a permission prompt and never claims clipboard, eyedropper, font, or decoder success.\n\n## Verification status\n\nThis ultra-speed implementation did not run unit tests, lint, type checking, a build, packaging, runtime interaction, or screen captures. The API is mount-ready, but the central renderer integration and built-artifact proof belong to the surface-wiring lane.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [App logo customization](app-logo-customization.md), and [Accessibility](accessibility.md).\n"
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
      "body": "# Attention-support modes\n\nA set of independently toggleable, off-by-default interface modes — focus, low stimulation, time awareness, one-thing-at-a-time, and momentum — aimed at attention difficulties.\n\n## Behavior\n\nEach mode is meant to be a separate switch: focus dims everything but the active item without hiding it, low stimulation reduces motion and non-essential notifications, time awareness shows elapsed session time, one-thing-at-a-time pins a single chosen next action, and momentum gently and dismissibly flags long-untouched work.\n\n## Configuration\n\nCopy in these modes would stay plain and factual, never gamified or judgmental, presented as interface accommodations rather than anything medical or diagnostic.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has none of these modes; there is no focus dimming, no stimulation reduction toggle, no elapsed-time indicator, and no momentum prompt.\n\n**Documentation website:** Implemented for the site-owned surface. Every page exposes independently persisted focus, low stimulation, time awareness, one-thing-at-a-time, and momentum controls, all off by default. The current action and elapsed time appear on the page, and the momentum notice uses a bounded local idle interval.\n\n## Failure modes\n\nIf no current action is entered, one-thing-at-a-time stays visually quiet rather than inventing one. Reduced-motion and low-stimulation requests stop non-essential animation; momentum never claims that work changed.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
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
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
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
        "automatic-updates-evidence.md",
        "in-context-recovery.md",
        "non-blocking-notifications.md",
        "app-display-name.md",
        "README.md"
      ],
      "body": "# Automatic updates\n\nThe desktop updater checks the published release feed over HTTPS, validates one complete release identity, downloads the matching unsigned `Setup.exe`, checks its declared size and SHA-256 digest, and stages it for a user-directed restart.\n\n## Behavior\n\nPublished releases use a monotonic package version `0.1.<run>`, beginning above `0.1.0`, and one immutable identity record. The public release tag remains `ding-pbx-console-v0.0.<run>-r<attempt>` for compatibility with existing `0.1.0` installations. The updater maps that legacy-compatible tag to package version `0.1.<run>` before comparing versions. A usable release carries exactly one stable `Ding-PBX-Console-Setup.exe`, one `RELEASES`, at least one version-bearing full `.nupkg`, `SHA256SUMS.txt`, and `release-identity.json`. The identity records the package version, candidate commit, release tag, artifact names, sizes, and SHA-256 values. A release is ignored when any record is missing, malformed, unpublished, duplicated, or inconsistent.\n\nThe installed version comes from the packaged `update-manifest.json`. Published packaging rejects any run whose bounded positive run number does not map exactly to package version `0.1.<run>`. A release is offered only when its package version is strictly newer. Local unpublished builds remain identifiable by their candidate commit and are never treated as published releases.\n\nThe desktop checks once at startup and on a bounded schedule. Only one check or download may be in flight. Metadata, identity, checksum text, and installer streams have finite response and per-read deadlines and bounded sizes. Temporary installer directories are owned by the updater, removed after every failed or superseded operation, and swept when the desktop starts.\n\n## Restart and drafts\n\nThe ready banner is non-blocking and offers `Restart to install update` and `Later`. `Later` hides the banner without deleting the staged installer. A manual check or the next scheduled check may reveal the preserved ready state again. A newer ready revision clears an older local spawn-error message, while a current failure remains visible. Restart uses an invoke-based acknowledgement. The main process has one installing latch, launches `Setup.exe` at most once, and quits only after the operating system acknowledges process spawn. A spawn failure stays visible and retryable.\n\nPBX drafts disable restart. The renderer counts every loaded resource whose current draft differs from its last live read, including the resource currently being edited, and publishes that count through the main-process updater revision. The banner states the exact recovery route: review the draft, apply it, or discard it, then retry the restart. The updater never drops a draft to make installation convenient.\n\n## Configuration and safety\n\nCode signing is permanently prohibited. The package and update feed are intentionally unsigned, so the operating system may show an unknown-publisher or SmartScreen warning. Digest checking proves byte integrity only and never claims authenticity or signing.\n\n## Failure modes\n\nMalformed packaged identity, an older or equal package version, incomplete release assets, missing checksum lines, inconsistent artifact sizes or digests, response-header timeout, stream-read timeout, bounded-size overflow, temporary-file failure, and installer-spawn failure remain visible as retryable updater states. A failed or superseded download is removed from its updater-owned temporary directory.\n\n## Accessibility and localization\n\nThe banner is a keyboard-operable, screen-reader-named non-blocking status surface with visible focus, a pending state, a disabled restart control while drafts exist, and explicit retry copy after spawn failure. The successful installer spawn is acknowledged to the renderer before application quit is scheduled, while a failure keeps the current session open. It avoids claiming that a download is running while a staged installer is merely ready. The product's language and localization surfaces own the final copy.\n\n## Verification boundary\n\nThis lane intentionally did not run tests, lint, type checks, builds, packaging, desktop launch, UI interaction, or screen captures. The final handoff records the exact packaged regression seam that still needs the cheap Lowlevel headless route: a packaged Windows build with a valid unpublished manifest, a complete newer release identity, a mismatched digest, a malformed manifest, a preserved `Later` state, a duplicate restart activation, a spawn failure, and a PBX draft count above zero.\n\n## Suggested articles\n\n[Update evidence](automatic-updates-evidence.md), [In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [App display name](app-display-name.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/automatic-updates-evidence",
      "category": "platform",
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
        "automatic-updates.md",
        "in-context-recovery.md",
        "non-blocking-notifications.md",
        "README.md"
      ],
      "body": "# Automatic update evidence\n\nThis article records the two real off-screen captures committed with the updater repair. The images were supplied by the bounded Lowlevel capture run and copied byte-for-byte. They were not generated, resized, annotated, or edited during this evidence pass.\n\n## Release and source records\n\nThe old baseline was the `ding-pbx-console-v0.0.82-r1` release at source commit `745d7425df791646aef4a6972c96dcf279a6004a`, carrying the old installed package version `0.1.0` and a manifest that recorded only its tag. Its restart button used the old send-only path, so a click could not receive a typed acknowledgement or keep a spawn failure visible.\n\nThe repaired release used for the update-ready capture was source commit `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, package version `0.1.84`, and tag `ding-pbx-console-v0.0.84-r1`. Its release identity recorded the exact `Setup.exe`, `RELEASES`, full package, and SHA-256 values. The installed `0.1.84` capture used that same source and release identity. The follow-up source record merged for the next release is `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, carrying package version `0.1.85` and tag `ding-pbx-console-v0.0.85-r1`.\n\n## Capture records\n\n| State | Source and release | Dimensions | SHA-256 | Evidence |\n| --- | --- | ---: | --- | --- |\n| Update ready from the old installed baseline | `745d7425df791646aef4a6972c96dcf279a6004a`, installed `0.1.0`, candidate `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, release `0.1.84`, tag `ding-pbx-console-v0.0.84-r1` | 1456 x 928 | `3a92900f8fd19a722ece3175567df346d8f272ee24d7ac47e3681b1db5216d99` | ![Update ready banner in the old installed baseline](captures/automatic-updates/baseline-update-ready.png) |\n| Installed `0.1.84` with two PBX drafts blocking restart | `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, installed `0.1.84`, candidate `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, release `0.1.85`, tag `ding-pbx-console-v0.0.85-r1` | 1456 x 928 | `79d4257a806ef31aea22cef34ce490cc980fdd527ce84a5adfe60e6bd197b751` | ![Restart disabled while two PBX drafts need review, apply, or discard](captures/automatic-updates/installed84-draft-blocked.png) |\n\n## Capture method and interaction evidence\n\nThe Windows desktop executable was launched on named hidden desktops through the Lowlevel route, with no visible desktop or pointer interaction. The old baseline used `Lowlevel-Updater-Run84`, port `9346`, and the exact file URL for the extracted baseline renderer. The installed repaired application used `Lowlevel-Installed84-Run85`, port `9347`, and the exact file URL for `C:\\ding-pbx-console\\app-0.1.84\\resources\\app.asar\\dist\\index.html`.\n\nEach capture plan required a task-local CDP endpoint, an exact expected URL, bounded synchronous evaluation, and a single page target before evaluating the renderer. No target was selected by index or by a partial URL match. The setup diagnostic was launched directly from the staged `Ding-PBX-Console-Setup.exe`; the recorded process was `33380`, which proves the direct installer launch path reached the operating system even though the installer does not expose an application page target.\n\nThe old baseline restart plan clicked the first restart control on the old build, exposing the missing acknowledgement and failure-reporting contract. The repaired ready plans reached `Restart to install update`, the direct `Setup.exe` process launch was observed, and the repaired path kept the application open when a forced spawn failure was requested. The `Later` plan hid the banner while preserving the staged candidate, and the draft plan sent a count of `2`, observed the exact review, apply, or discard message, and confirmed that restart was disabled.\n\n## Verification boundary\n\nThese records prove the named built-artifact states and the exact capture method. They do not claim a complete release, installer, or production deployment verdict. The source and release SHAs, package versions, dimensions, and digests above are the evidence identifiers for this pair.\n\n## Suggested articles\n\n[Automatic updates](automatic-updates.md), [In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
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
      "body": "# Browser-extension download capture surfaces\n\nA companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.\n\n## Behavior\n\nA Start-download dialog is meant to name the proposed file, source, and destination before anything transfers; a separate always-on-top Downloading dialog would show live progress, rate, and pause/resume/cancel controls for the real transfer underway.\n\n## Configuration\n\nBoth dialogs would reflect the actual queued and in-flight transfer rather than a simulated progress value.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application is not a browser and has no browser-extension download surface of this kind.\n\n**Documentation website:** Not implemented. The documentation website is not a browser extension and has no download-capture flow of this kind.\n\n## Failure modes\n\nN/A — with no extension or capture flow implemented, there is no failure path to describe.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/browser-extension-download-surfaces-implementation",
      "category": "platform",
      "title": "Browser-extension download transfer surfaces",
      "headings": [
        {
          "title": "Extension handoff contract",
          "id": "extension-handoff-contract"
        },
        {
          "title": "Window and accessibility intent",
          "id": "window-and-accessibility-intent"
        },
        {
          "title": "Failure and verification boundaries",
          "id": "failure-and-verification-boundaries"
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
      "body": "# Browser-extension download transfer surfaces\n\nThis implementation adds three mount-ready renderer surfaces for a browser-extension handoff:\n\n1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.\n2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.\n3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.\n\n## Extension handoff contract\n\n`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.\n\nThe transfer client is intentionally injected. The renderer therefore knows only the typed `start`, `cancelHandoff`, `command`, and `subscribe` operations. Preload or control-plane wiring can implement that client later without changing the three surfaces or making renderer code own file I/O.\n\n## Window and accessibility intent\n\n`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` export platform handoff metadata. Start is a blocking decision and returns focus to its originating control after close. Progress is an always-on-top progress window. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.\n\nLanguage and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.\n\n## Failure and verification boundaries\n\nThe client must provide real snapshots and real command receipts. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success. This lane intentionally contains no test or extension launch wiring; integration owners must connect the exported contract to the preload/control-plane boundary and add built-artifact interaction evidence there.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).\n"
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
      "body": "# Browser-style tabbed navigation\n\nPresents application and settings content as discrete, navigable tabs rather than one long scrolling page.\n\n## Behavior\n\nThe documentation route strip is a navigation surface with browser-style tab presentation. It persists a left default, supports left, right, top, and bottom docking, keeps pinned routes first, scrolls overflow instead of clipping labels, and offers keyboard traversal. Each route keeps a real accessible `main` panel, so the site does not claim that separate HTML documents are one ARIA tabpanel.\n\n## Configuration\n\nThe strip stores its route order, pinned routes, group membership, appearance choices, and toy-lock records in bounded browser storage. Route links use navigation semantics with `aria-current`; the side presentation uses vertical arrow traversal and the top or bottom presentation uses horizontal traversal. At narrow widths the side rail becomes a compact header and every edge keeps an internally scrolling strip.\n\n## Current status\n\n**Desktop application:** Partial. A left navigation rail separates the app's screens, which gives some of the navigational benefit of tabs, but there is no true tab strip with overflow handling, reordering, pinning, or edge-docking choice.\n\n**Documentation website:** Partial, local equivalent implemented and runtime proof unverified. Every top-level route receives the shared route strip with persisted docking, pinned-first ordering, overflow scrolling, keyboard traversal, local groups, local appearance, local toy locks, and a tab manager. The surface is navigation across separate documents, not a single ARIA tablist with hidden panels.\n\n## Failure modes\n\nWhen more routes are present than the strip can show, the strip scrolls internally and keeps pinned routes at the beginning of the ordered list. The browser page owns the actual navigation and reports that it cannot keep a remote panel open across documents.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The registry therefore remains `implemented-unverified` for the route-strip equivalent. The desktop application row remains partial and is not changed by this site lane.\n\n## Suggested articles\n\n[Tab groups and tab search](tab-groups-and-searches.md), [Command palette](command-palette.md), [Material appearance system](material-appearance.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
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
        "README.md"
      ],
      "body": "# Built-in authenticator\n\nAn in-app TOTP authenticator for arbitrary accounts, including QR-code pairing, so a user does not need a separate phone app.\n\n## Behavior\n\nA dedicated authenticator surface is meant to accept pairing by QR code, pasted `otpauth://` URI, or manual entry, then show live rotating codes for every registered account, entirely offline and locally stored.\n\n## Configuration\n\nA new pairing would be confirmed by entering one live code back before the entry is considered armed, so a mis-scanned secret is caught immediately rather than at the next login.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no authenticator surface of any kind.\n\n**Documentation website:** Local browser-storage equivalent implemented, runtime proof unverified. Settings provides issuer, account, manual Base32 registration, URI import, a bundled in-process QR encoder with a four-module quiet zone and fixed black-on-white contrast, encrypted browser-local storage, and current and next TOTP codes generated with Web Crypto. The page has no trusted server or operating-system credential vault, and browser storage is local convenience state rather than a security boundary. Platform credential-vault storage and cloud sync remain unavailable on this static surface.\n\n## Failure modes\n\nA malformed or short Base32 secret is rejected before storage. Secrets are never included in ordinary export. Local QR rendering and local pairing confirmation exist; platform-vault storage, clock-skew diagnostics, trusted server-side pairing confirmation, and trusted server enforcement remain unavailable in this static equivalent.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry is `implemented-unverified` for this local equivalent. Platform credential-vault storage and runtime proof remain unverified. The desktop application row remains not implemented.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Platform feature index](README.md).\n"
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
      "id": "platform/changelog-browser-extension-transfer",
      "category": "platform",
      "title": "Browser-extension transfer surfaces",
      "headings": [
        {
          "title": "Browser-extension transfer surfaces",
          "id": "browser-extension-transfer-surfaces"
        }
      ],
      "links": [],
      "body": "# Browser-extension transfer surfaces\n\n## Browser-extension transfer surfaces\n\n- Added typed extension handoff, transfer snapshot, command receipt, window-intent, and surface-registration contracts.\n- Added distinct Start download, Downloading, and Download complete renderer surfaces with real-client request seams, exact observed progress fields, partial-result reporting, keyboard focus, accessible live regions, reduced-motion behavior, and narrow-layout styling.\n- Added implementation documentation describing the preload/control-plane integration boundary and the deliberate no-simulation rule.\n"
    },
    {
      "id": "platform/changelog-dim-sum-runtime",
      "category": "platform",
      "title": "Runtime contract: dim-sum startup cache",
      "headings": [
        {
          "title": "Runtime contract: dim-sum startup cache",
          "id": "runtime-contract-dim-sum-startup-cache"
        }
      ],
      "links": [],
      "body": "# Runtime contract: dim-sum startup cache\n\n## Runtime contract: dim-sum startup cache\n\nAdded the mount-ready dim-sum startup runtime contract. It performs one cryptographically secure ten-percent draw per launch, suppresses School mode, first run, error, update, and mid-task states, and renders only a local image from a validated private application-data cache. The cache records the public catalog revision, bilingual names, published catalog-v1 asset identity, byte size, digest, and static decode proof. Missing or invalid cache data reports unavailable and never fetches or invents a dish.\n\n"
    },
    {
      "id": "platform/changelog-logo-conversion",
      "category": "platform",
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
        "status-hub.md",
        "../app/history.md",
        "README.md"
      ],
      "body": "# In-app changelog viewer\n\nA browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.\n\n## Behavior\n\nThe viewer is meant to list every released version with categorized changes, a calendar-based date filter, a text search wired to the regex builder, and export to a durable text format, with each entry linked to the exact commit that made the change.\n\n## Configuration\n\nIts tone would follow the funny-level and language settings while every version number, date, and commit link stays exact regardless of tone.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no in-app changelog viewer; release history is not browsable from within the application.\n\n**Documentation website:** Partial, runtime proof unverified. `settings.html` now mounts a local viewer that consumes only the validated release history embedded by `console/site/build.mjs`, filters by text and date, opens the anchored regex builder, copies the filtered Markdown, exports the filtered Markdown, and links each accepted change to its exact 40-character commit. Missing records remain an explicit empty state. The calendar accepts ISO and host-locale date text, month and year jumps, presets, and range selection. Locale-specific parsing polish and runtime proof remain incomplete.\n\n## Failure modes\n\nA referenced commit that no longer exists is rejected by the composer record shape and never rendered as a link. A missing or unavailable tag list leaves the viewer with an explicit empty state rather than a guessed release.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Local version history](local-version-history.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
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
      "body": "# Completeness matrix\n\nThe completeness matrix is the hand-written record of the product contracts that every user-facing surface must carry. It is independent from source discovery, so a feature or page that disappears from the code cannot disappear from the inventory at the same time.\n\n## Behavior\n\n`console/inventories/surface-completeness.json` uses schema version 2. It records 44 canonical features and 143 addressable surfaces: the desktop shell, login and setup routes, 32 desktop destinations, 17 desktop overlay states, six top-level site pages, 82 generated documentation routes, and the three browser-extension download states. Every surface has one row for every canonical feature.\n\nEach row records the status (`absent`, `partial`, `implemented-unverified`, or `verified`), demo state, source provenance, sample-data declaration, implementation paths and symbols, registration paths and symbols, deterministic route, documentation, localization, persistence, focused checks, negative regression evidence, built-artifact interaction evidence, current-commit captures, and the design-parity tuple.\n\n## Configuration\n\nThe canonical feature and requirement arrays are literal data in the matrix generator and checked-in JSON. The generator does not scan source files, infer routes, or infer features. The two surface registries point back to the canonical matrix and preserve exact implementation notes and symbols for the desktop and site surfaces. The Pages localization contract checks the six explicit top-level site rows, not an invented aggregate route, and requires every one to carry all 44 canonical features. Converter and Ollama requirements remain present on every surface. There are no exemptions.\n\n## Failure modes\n\nThe validator fails when a canonical feature, page, route, or row disappears; when a symbol is renamed or commented out; when a verified evidence commit is stale; when a required artifact is missing; when a route is supported only by prose; when a status claims success without all evidence; or when sample data is marked as provenance. Symbol matching uses exact declaration or registration boundaries, not substring presence.\n\n## Security and privacy\n\nThe matrix contains paths, symbols, routes, statuses, and evidence references only. It contains no credentials, private user data, call content, personal vocabulary values, or captured PBX configuration. Evidence references are claims about artifacts, not artifacts themselves. A row cannot become verified by changing its status string.\n\n## Verification\n\nThe focused validator is `console/scripts/verify-inventories.mjs`. The deliberate regression is `console/scripts/negative-surface-completeness.mjs`, with a companion evidence-claim regression in `console/scripts/negative-evidence-claims.mjs`. The symbol checks reject renamed or commented declarations, the completeness regression rejects a missing top-level site route, and the evidence regression rejects an asserted capture or stale commit. The current delivery boundary did not produce built-artifact captures, so all evidence that was not already present remains explicitly unverified. A later verification pass must run the validators against the exact integrated commit, observe every deliberate break turn red, restore the matrix, and observe green before changing any row to `verified`.\n\n## Suggested articles\n\n[Design parity](../../design/inventory.json), [Offline documentation browser](offline-documentation-browser.md), [Changelog viewer](changelog-viewer.md), [Status Hub](status-hub.md), [Platform feature index](README.md).\n"
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
      "body": "# Right-click menus show keyboard shortcuts\n\nEvery context-menu item that has a keyboard shortcut displays it, right-aligned, in the platform's own notation.\n\n## Behavior\n\nA context menu is meant to show each item's real, currently-working keyboard shortcut beside its label, derived from the same source that registers the binding, never a guessed or stale one.\n\n## Configuration\n\nShortcuts would be exposed to assistive technology as shortcuts, not as decorative trailing text.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's right-click menus, where they exist, do not display keyboard shortcuts beside their items.\n\n**Documentation website:** Not implemented. The documentation website has no right-click context menus of its own.\n\n## Failure modes\n\nA displayed shortcut that no longer matches the actual binding (because the binding changed and the label did not) is the specific failure this feature exists to prevent by deriving both from one source; there is nothing implemented yet to exercise that guarantee.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Platform feature index](README.md).\n"
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
          "title": "Current integration state",
          "id": "current-integration-state"
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
      "body": "# Desktop settings runtime\n\nThe desktop settings runtime provides one validated local state contract for language, tone, dialog decoration, renamed School mode, attention-support modes, narration, display naming, and scheduled overrides.\n\n## Behavior\n\nSettings use schema version 1 from `console/shared/settings-schema.ts`. A fresh profile starts with English, both funny levels at 5, dialog emojis enabled, School mode off, every attention-support mode off, narration off, the shipped display name, dark theme, comfortable density, the shipped accent and font, normal scale and weight, and motion enabled. The package identity remains the constant `com.dingdingprojects.ding-pbx-console` regardless of the chosen display name.\n\n`SettingsStore` validates every stored record during hydration and every proposed record before writing. Missing data uses documented defaults. Invalid or stale data is removed and reported through `recoveryReason`; it is never partially applied. Subscribers receive immutable snapshots after hydration, a successful update, a reset, or a storage event from another renderer.\n\n`RendererSettingsRuntime` adds schedule evaluation, School-mode projection, personal-vocabulary application, and narrator mounting. Schedule rules use an IANA timezone, optional date bounds, a local time window, weekdays, deterministic priority, and stable list ordering. Equal start and end times mean a full day. Cross-midnight windows belong to the day on which they begin. External rules remain inactive until the privileged source reader supplies an explicit active state.\n\nWhen School mode is enabled, the effective projection forces English and English narration, reports Cantonese, funny-level controls, personal vocabulary, and dim-sum behavior as unavailable, and leaves the user's stored choices untouched for restoration when the mode is disabled.\n\n## Integration API\n\nThe application integration point is `console/app/renderer/src/settings/index.ts`.\n\n```ts\nconst settings = browserSettingsRuntime()\n\nsettings.hydrate()\nconst unsubscribe = settings.subscribe((snapshot) => render(snapshot))\nsettings.update((draft) => { draft.language.mode = 'bilingual' })\nsettings.applyVocabularyText({ text: label, boundary: 'user-interface-copy' })\nsettings.mountNarration(speechEngine)\nsettings.queueNarration('connection', { en: englishText, zh: cantoneseText })\n```\n\nThe runtime also exposes `snapshot()`, `reset()`, `provenance(target)`, `setScheduleSourceState()`, `tick()`, `narrationVoices()`, `narrationStatus()`, `narrationQueueStatus()`, `setScreenReaderActive()`, `setQuiet()`, `unmountNarration()`, and `dispose()`.\n\nEach scheduled target reports whether its current value came from compiled defaults, validated local storage, a schedule rule, or School-mode suppression. Effective appearance values are part of the snapshot and also remain exposed through `scheduledOverrides` for the separately owned appearance subsystem to consume.\n\n## Personal vocabulary\n\nThe accepted file has one canonical shape: a version of 1 and a `replacements` array containing only `from` and `to` strings. Validation rejects oversized input, excessive nesting, too many entries, unknown fields, unsafe keys, duplicate JSON object keys, duplicate source terms, invalid versions, and bounded-string violations. The cache is revalidated before every application. Invalid uploads never replace the last valid cache, and clearing the cache immediately restores original wording.\n\nReplacement is available only through an explicitly classified private user-interface-copy or accessible-name boundary. Commands, URLs, identifiers, code, paths, logs, exports, history, diagnostics, provider-authored text, and public records must not pass through that API. No mapping, payload, source filename, or source path ships in this repository.\n\n## Failure modes and security\n\n- A storage read or validation failure activates defaults and reports the exact recovery reason.\n- A privacy context that refuses access to browser storage uses one guarded probe, then gives settings and personal vocabulary the same memory-only store. Snapshots report `session-memory` provenance and the reason values will not survive restart.\n- A storage write failure leaves the previous settings active and returns a failed update result.\n- An external schedule source has no effect until its privileged reader reports a current true state.\n- Missing speech support leaves narration unmounted. Voice enumeration then returns an empty list and queue attempts return `false`.\n- A removed selected voice remains selected in stored settings while runtime status reports the actual fallback or lack of a usable voice.\n- Speech failures are retained in queue status and do not block the application or later queued lines.\n- Secrets are not part of the settings schema. Home Assistant rules store only a credential-vault account key, never credential material.\n\n## Current integration state\n\nThe settings core and public integration functions exist, but the desktop shell does not yet construct the store, subscribe to runtime snapshots, route rendered text through the vocabulary boundary, mount a platform speech engine, or apply appearance overrides. Those seams belong to the application wiring change. Until that wiring lands, these settings do not change the visible desktop interface.\n\nThis ultra-speed implementation did not run tests, type checking, builds, packaging, UI interaction, or captures. Its behavior remains unverified until the owning integration work runs the repository's local validation and built-artifact evidence paths.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Spoken narration](narration.md), [Scheduled settings](scheduled-settings.md), and [Personal vocabulary upload](personal-vocabulary-upload.md).\n"
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
        "README.md"
      ],
      "body": "# Dialog emoji toggle\n\nA persisted on/off switch controlling whether dialogs and message boxes show a decorative emoji alongside their factual text.\n\n## Behavior\n\nWhen enabled, dialogs are meant to get a relevant, non-semantic emoji; when disabled, the same factual copy is meant to appear with no emoji. The toggle would never add emoji to buttons, field labels, or other control text — only to descriptive dialog copy.\n\n## Configuration\n\nA single switch in application settings, reachable by keyboard, is meant to control this for every dialog at once.\n\n## Current status\n\n**Desktop application:** Not implemented. No toggle exists and no dialog in the product currently carries an emoji.\n\n**Documentation website:** Not implemented. The site has no application-style message boxes to decorate.\n\n## Failure modes\n\nN/A — a switch with no dialogs to affect has no meaningful failure mode of its own; failure would only arise once dialogs exist to decorate.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
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
          "title": "Mount seam",
          "id": "mount-seam"
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
      "body": "# Dim-sum startup runtime cache\n\nThis article describes the mount-ready runtime contract for the dim-sum startup surprise. The parent surface still owns the final mount and the package step owns cache production.\n\n## Behavior\n\nThe renderer makes one fresh cryptographically secure random draw per launch. The winning interval is exactly ten percent of the uint32 range. A winning draw selects one entry from a validated private application-data cache and shows the cache's local image bytes with the authoritative English and Traditional Chinese names. The surface is non-blocking, does not take focus, respects reduced motion, and dismisses itself after the configured short interval. There is no opt-out control.\n\nThe draw is suppressed during School mode, first run, an active error, an active update, or a mid-task state. Suppression is reported to the mount callback and never names or reveals a hidden dish. The attempt flag is held in the component instance so Strict Mode or a rerender cannot create a second draw in one launch.\n\n## Cache contract\n\n`console/shared/dim-sum.ts` validates the complete JSON envelope before any image bytes render. The envelope must identify the public `Ding-Ding-Projects/dim-sum-photos` catalog URL, an immutable catalog revision, its revision URL, and a published `catalog-v1*` release asset. Every entry carries exact bilingual names, the public asset identity and URL, a local data URL, its byte size and SHA-256 digest, and a static decode proof with MIME type and dimensions. The async validator recomputes each local image digest with Web Crypto before selection. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, non-published asset URLs, missing proof, and unsupported revisions fail closed.\n\nThe renderer reads only through the `DimSumCacheReader` seam. A missing or invalid cache produces an unavailable diagnostic and no image. The renderer never calls the public catalog, never downloads a release asset, and never invents a dish. The package or application-data owner must verify the image digest before publishing the cache and must retain the public catalog revision and asset identity for audit.\n\n## Mount seam\n\n`DIM_SUM_SURPRISE_REGISTRATION` identifies the `startup-overlay` mount, its non-blocking and focus-neutral behavior, its automatic dismissal, its no-opt-out contract, its cache boundary, and its cryptographically secure ten-percent draw. The host supplies `context`, including the shared School-mode state, and a `cacheReader` that returns the private JSON text.\n\n## Suggested articles\n\n[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).\n"
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
      "body": "# Dim sum surprise\n\nA small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.\n\n## Behavior\n\nOn roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.\n\n## Configuration\n\nThere is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.\n\n## Current status\n\n**Desktop application:** Not implemented. No such surprise, no bundled dish imagery, and no random-draw logic exist in the product.\n\n**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.\n\n## Failure modes\n\nIf the bundled image set were ever missing an entry, the intended behavior is to skip that draw rather than show a broken image; nothing implements the draw today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[School mode](school-mode.md), [Platform feature index](README.md).\n"
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
          "title": "Platform integration contract",
          "id": "platform-integration-contract"
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
      "body": "# Export and bulk-operation core\n\nThe renderer includes a domain layer for preparing faithful data exports, scoping collection selections, planning bulk operations, and reporting confirmed platform outcomes.\n\n## Behavior\n\nExport preparation validates input against the versioned `ding-pbx-export.v1` tree schema before encoding it. Supported outputs are JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, SQL, TypeScript, JavaScript, and Python. Every artifact declares UTF-8, its schema version, media type, line-ending convention, byte count, row count, and format-specific disclosures.\n\nFormats fail closed when they cannot preserve a dataset. For example, TOML is unavailable for null values or mixed-type arrays, SQL is unavailable for nested values without a target schema, and XML is unavailable for characters XML 1.0 cannot represent. Source-code forms contain data literals only. Tabular formats use canonical JSON in headers and populated cells, while an empty cell means the field was absent, preserving names, types, and ragged rows.\n\nArchive export and archive encryption are explicitly unavailable because no bundled, verified ZIP or 7z adapter is registered. The core does not accept encryption settings or claim that a renamed or unverified archive is protected.\n\nSelection state belongs to one collection identifier and one query key. Changing either context creates a new empty selection, preventing stale selections from acting on a different result set. Page selection, all-match selection, inverse selection, additive toggles, and inclusive ranges share the same pinned and protected-item exclusion policy.\n\nBulk actions are discriminated as enabled or disabled. An enabled action must provide an execution handler. A disabled action must provide an exact reason and has no callable handler. Plans distinguish selected, affected, and excluded counts before execution. Runs report each item as converted, saved, exported, changed, skipped, cancelled, or failed according to the action and its confirmed result.\n\nEach execute and revert call receives a real `AbortSignal` from its own linked `AbortController` and a finite positive safe-integer per-item deadline. The default is 30 seconds. Caller cancellation actively aborts every in-flight item, while a deadline abort records a distinct timed-out result. Timers and caller-signal listeners are removed on every settle path. Untyped handler or platform-adapter rejections are reduced to fixed public-safe failure copy instead of exposing raw messages that may contain private paths.\n\nUndo is exposed only when a confirmed mutation supplies an inverse token or local-history revision and the surface registers a real inverse handler. A notification action cannot manufacture undo support.\n\n## Platform integration contract\n\nThe renderer does not write files or launch an editor directly. A privileged desktop or hosted adapter must implement the shared `ExportPlatformPort` contract for save, download, clipboard, editor detection, and editor launch. The renderer reports success only after that adapter returns a confirmation receipt with an operation identifier and completion time.\n\nSaving and opening an export in Visual Studio Code is a two-stage operation. The save must first be confirmed with a local path. Editor detection and launch happen afterward, and the overall result remains failed, cancelled, or unavailable unless the launch is separately confirmed.\n\n## Failure modes\n\n- Unsupported values, excessive depth, excessive value count, sparse arrays, cycles, repeated object references, accessors, and class instances make preparation unavailable with an exact path and reason.\n- A platform cancellation remains cancelled. It is never translated into success.\n- A platform failure preserves its code, reason, and retryable state.\n- A confirmed save without a returned local path cannot proceed to editor handoff.\n- Pinned and protected records remain excluded unless the caller explicitly requests their inclusion.\n- Cancellation stops new bulk items from starting and records every unstarted item as cancelled.\n- A never-settling execute or revert handler is aborted at its finite per-item deadline and reported as timed out. Timed-out work is not automatically retryable because an abort-ignoring handler may still complete a side effect later.\n- A thrown action handler becomes a per-item failed outcome and does not turn the remaining batch green.\n\n## Security and privacy\n\nEncoding is local and deterministic. The domain layer performs no network access, filesystem access, clipboard mutation, process launch, clock read, or random generation. External effects exist only behind the injected platform contract. SQL output uses quoted identifiers and escaped literals, but remains review-only because target constraints and column types are not known to the exporter.\n\n## Verification status\n\nThis change provides the pure/domain implementation and platform contracts only. It does not wire a visible export button, file dialog, clipboard bridge, Visual Studio Code launch bridge, or list surface. No tests, type checks, builds, runtime interactions, or captures were run in the ultra-speed lane.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Bulk actions](bulk-actions.md), [External editor handoff](external-editor-handoff.md).\n"
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
      "body": "# External editor handoff\n\nA one-click action to open the current project, file, or export directly in an installed code editor.\n\n## Behavior\n\nThe product is meant to detect installed editors and offer opening the current folder or a selected or exported file directly in one, with the choice persisted.\n\n## Configuration\n\nOpening a folder would open it as a workspace root rather than a single unrooted file, so surrounding project context is usable immediately.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no external editor detection or handoff action anywhere in its interface.\n\n**Documentation website:** Not implemented. The documentation website has no local files of the user's own to hand off to an editor.\n\n## Failure modes\n\nWhen no supported editor is installed, the intended behavior is a clear message naming that and an offer to get one, rather than a silently disabled or missing button; there is no handoff action yet to fail this way.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Operations](../agent/ops.md), [Platform feature index](README.md).\n"
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
        "external-editor-handoff.md",
        "../agent/ops.md",
        "README.md"
      ],
      "body": "# Forge publishing\n\nLets a user publish a repository to a chosen account or organization, with a non-forking fallback for providers that cannot fork.\n\n## Behavior\n\nA publish flow is meant to let the user choose the target account or organization from a real signed-in account list, and to offer copy-and-push as an alternative when the target provider cannot fork.\n\n## Configuration\n\nThe account list would be searchable and support adding further signed-in accounts through the same sign-in flow used for the first one.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application administers a telephony exchange and has no source-repository publishing feature.\n\n**Documentation website:** Not implemented. The documentation website has no repository-publishing feature of its own.\n\n## Failure modes\n\nN/A — with no publishing flow implemented, there is no failure path to describe.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[External editor handoff](external-editor-handoff.md), [Operations](../agent/ops.md), [Platform feature index](README.md).\n"
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
      "body": "# Funny-level sliders\n\nTwo independent sliders, one per language, that control how playful the product's own copy sounds — from fully serious to maximum playfulness.\n\n## Behavior\n\nTwo sliders, English and Cantonese, are meant to each range from level 1 (fully professional wording) to level 5 (maximum playfulness), restyling every message category including warnings and errors without changing the underlying facts they carry.\n\n## Configuration\n\nSliders would live in settings, default to level 5 for both languages, and be changeable and resettable independently of each other.\n\n## Current status\n\n**Desktop application:** Not implemented. No slider exists and all product copy is written at a single fixed tone.\n\n**Documentation website:** Partial. Every page exposes two independent persisted controls from 1 to 5, both defaulting to 5. Shared copy with defined variants changes immediately, but every authored article sentence is not yet represented at all five levels.\n\n## Failure modes\n\nA message's facts (file names, error causes, irreversible-action warnings) are meant to stay exact at every level regardless of tone; if a restyled string ever disagreed with the underlying fact, that would be treated as a defect in the styling layer, not an acceptable trade-off.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
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
      "body": "# Guided forms\n\nFields populated from real data wherever possible, sensible defaults, plain-language inline validation, and named reasons on every disabled control.\n\n## Behavior\n\nWherever a value can be enumerated or defaulted, the form is meant to do so — pickers over blank text boxes, a suggested default instead of an empty field, and inline validation that says what to type rather than only showing a red border.\n\n## Configuration\n\nEvery disabled control would state, in its own tooltip or adjacent text, exactly which condition is unmet and how to satisfy it.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's server and deployment forms mix real pickers for some fields with free-text entry for others; validation messages exist for some fields but not consistently, and not every disabled control names its exact blocking condition.\n\n**Documentation website:** Local equivalent implemented, runtime proof unverified. The converter uses a real target-format picker, bounded local source file picker, output-name field, and a genuine writable folder picker through `showDirectoryPicker` when the browser supports it. If the capability is unavailable or permission is refused, the surface explicitly falls back to browser downloads. It never labels a source upload picker as a destination.\n\n## Failure modes\n\nA field left blank or filled incorrectly is meant to be caught inline, in plain words, before submission is attempted. The converter keeps its adapter catalog honest, limits output names, reports folder-picker capability and permission failures, and leaves source files untouched.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains partial.\n\n## Suggested articles\n\n[Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).\n"
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
          "title": "Storage and limits",
          "id": "storage-and-limits"
        },
        {
          "title": "Transport policy",
          "id": "transport-policy"
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
      "body": "# Hosted administrator authentication\n\nThe hosted console uses one local administrator account, memory-hard password hashing, signed server-side sessions, and server-side authorization for every control-plane request. Authentication is an access boundary for the hosted console. It is separate from the desktop application, which does not expose the hosted HTTP routes.\n\n## Behavior\n\nAccount storage has three explicit states:\n\n- **Missing:** first-run setup is available.\n- **Valid:** setup is unavailable and sign-in is available.\n- **Corrupt:** setup and sign-in both fail closed, existing sessions stop authorizing control-plane requests, and the sign-in surface explains the recovery action.\n\nThe server checks this state before serving the application shell. A missing record routes to setup, a valid unauthenticated request routes to sign-in, and a corrupt record routes to the recovery state. A network timeout or unavailable server is never interpreted as a missing account.\n\nSetup and sign-in surfaces report checking, ready, busy, timeout, unavailable, refused, rate-limited, corrupt-account recovery, and retry states. They use bounded requests and leave form controls disabled while the account state is unknown.\n\nSuccessful sign-in creates a random, HMAC-signed session identifier in an `HttpOnly`, `SameSite=Strict` cookie. TLS deployments also set `Secure`. Sign-out revokes the current session. The hosted bridge also exposes a revoke-all-sessions action for the signed-in administrator.\n\n## Storage and limits\n\n`admin-account.json` uses schema version 1 and contains only the username, scrypt password hash, and creation time. The reader limits file size, rejects unknown or extra fields, validates exact field bounds, and accepts the original unversioned three-field record as schema version 1 for compatibility. A malformed file is corrupt, never missing.\n\nAccount and signing-key files are created with restrictive permissions where the operating system supports them. Each file is written to a unique same-directory temporary file, flushed, and published without replacing an existing file. This prevents concurrent setup requests from overwriting the first completed account.\n\nPassword input is limited to 1,024 characters and the username to 128 characters. Password hashes must use the supported scrypt parameters, salt size, and derived-key size before password verification runs, so a modified record cannot request unbounded scrypt work.\n\nThe in-memory session table is capped at 1,024 live sessions and removes expired entries before every relevant operation. The login-rate table is capped at 4,096 source addresses, removes expired windows, and never trusts forwarding headers supplied by a client.\n\n## Transport policy\n\nPassword creation and sign-in are allowed over TLS or a loopback-only plain HTTP listener. They are refused when a plain HTTP server is bound to a non-loopback address.\n\n`ServerModeOptions.allowInsecureDevelopmentAuth` is an explicit development-only override. It is honored only when `NODE_ENV` is exactly `development`. Production launchers and service definitions must not set it. Sign-out remains available so a user can always revoke a session even if the transport policy changes after sign-in.\n\n## Health and deployment\n\n`GET /api/health` is unauthenticated and returns only the API version, stable service identifier, and `ok` or `degraded`. It contains no username, path, network address, session count, account existence flag, or control-plane data. A corrupt account store returns `503` with the same bounded health shape so a service monitor can distinguish readiness from process liveness without receiving sensitive data.\n\n## Failure modes and recovery\n\n- **Server unavailable or timeout:** retry from the same sign-in or setup surface after confirming service reachability. No setup redirect occurs.\n- **Exposed plain HTTP:** enable TLS or return the listener to loopback, then retry.\n- **Rate limited:** wait for the exact `Retry-After` interval. Correct credentials remain refused during the interval.\n- **Corrupt account storage:** restore `admin-account.json` from a trusted backup, or move the corrupt file aside manually and restart. The server never overwrites or silently resets it.\n- **Corrupt signing key:** the hosted process refuses to start. Restore the key or deliberately replace it, understanding that replacement revokes every existing session.\n\n## Security considerations\n\nPasswords are never logged, returned, or stored in plaintext. Password comparison uses Node's constant-time comparison after fixed, validated scrypt parameters. Session cookies contain only a random identifier and an HMAC. Control-plane requests are authorized by the server immediately before dispatch, including a fresh valid-account check and username match.\n\nThe health route is deliberately narrow. Static assets may be fetched without a session, but the application shell and every control-plane operation remain session-gated.\n\n## Verification status\n\nThis change was implemented under an ultra-speed release lane that explicitly prohibited tests, lint, type checks, builds, packaging, server launch, browser interaction, and screen captures. Those checks remain unrun for this change and must not be inferred from this documentation.\n\n## Suggested articles\n\n[System security](../system/security.md), [Hosted server operation](../app/servers.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n\n"
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
        "README.md"
      ],
      "body": "# In-context failure recovery\n\nWhen an operation fails for a reason the user cannot diagnose alone, the recovery action is offered right at the control that failed, not buried in a menu.\n\n## Behavior\n\nA failed operation is meant to surface its recovery route — retry, re-authenticate, or an equivalent next step — directly beside the control that failed, naming the real cause rather than a generic error.\n\n## Configuration\n\nWhere the underlying cause is a refused credential or missing permission, the recovery route would offer re-authentication directly rather than sending the user hunting for a sign-in screen.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application shows error messages for failed actions but does not consistently offer an inline recovery action at the point of failure; some errors require navigating elsewhere to retry.\n\n**Documentation website:** Not implemented. The documentation website performs no operations that can fail in this sense.\n\n## Failure modes\n\nAn error shown without a concrete next step is exactly the gap this feature exists to close; it is the current state for at least some failures on the desktop application today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).\n"
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
      "body": "# Language modes\n\nLets a person pick English, playful Cantonese, or a bilingual view of every label the product shows.\n\n## Behavior\n\nA language mode setting is meant to control which language every user-facing string renders in, independent of the operating system's own locale, with three choices: English only, a playful Cantonese variant, and a bilingual mode showing both languages together without crowding the layout.\n\n## Configuration\n\nThe choice would live in application or site settings, persist across sessions, and apply to every screen at once rather than page by page.\n\n## Current status\n\n**Desktop application:** Not implemented. No language selector exists anywhere in the interface; every label is a fixed English string with no translation table behind it.\n\n**Documentation website:** Partial, source-boundary proof unverified. Every top-level page and composed article is scanned into a static-copy catalog at runtime, with an English source, a Cantonese source, five independent surrounding-copy levels per language, and bilingual rendering. Technical identifiers, paths, dates, hashes, URLs, code, and product facts remain byte-identical. The catalog reports scanned and missing counts through the handwritten inventory. The Cantonese fallback for prose not yet phrase-translated is explicitly labelled as a generated source boundary rather than silently called a human translation.\n\n## Failure modes\n\nWhere a static text node is missing from the catalog, the inventory reports it and keeps the English source rather than dropping or inventing the string. Technical and factual text intentionally remains exact in every language mode.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. The website static catalog covers text nodes and the accessibility attributes it can scan, with a generated Cantonese source boundary for prose not yet phrase-translated.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/local-file-converter",
      "category": "platform",
      "title": "Local file converter",
      "headings": [
        {
          "title": "Desktop backend contract",
          "id": "desktop-backend-contract"
        },
        {
          "title": "Documentation site surface",
          "id": "documentation-site-surface"
        },
        {
          "title": "Privacy and failure modes",
          "id": "privacy-and-failure-modes"
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
      "body": "# Local file converter\n\nThe converter backend and documentation-site equivalent are separate local surfaces. Both keep source bytes local, detect types from bounded bytes rather than extensions, and leave the source unchanged. Neither uses PATH discovery, a remote converter, or guessed output.\n\n## Desktop backend contract\n\nThe backend defines a bounded, offline conversion catalog and a persistent queue. It always exposes Documents and PDF, Images, Audio, Video, Archives, Structured Data and Spreadsheets, Code and Text, and Binary Encodings, including when every adapter in a category is unavailable. Unavailable adapters remain visible with the exact missing bundled dependency and reason.\n\nThe fixed worker kernels cover strict UTF-8 text to canonical Base64, canonical Base64 to arbitrary binary data, arbitrary binary data to lowercase hexadecimal text, even-length hexadecimal text to arbitrary binary data, and strict UTF-8 line-ending normalization. A caller cannot supply code, a command, an executable, arguments, or environment variables. An adapter becomes enabled only with a packaged-artifact proof containing its absolute path, SHA-256, verification time, offline declaration, and exact runtime identity. Source-tree presence is not proof.\n\nKnown capabilities that remain unavailable until their runtimes are bundled and proven include PDF inspection and editing, office to PDF conversion, image conversion, audio and video transcoding, archive conversion, spreadsheet conversion, and document or markup conversion. The UI must show each missing dependency rather than hiding it.\n\nInput type comes from bounded signature inspection and strict UTF-8 decoding. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits the sniffing limit. Unknown non-text bytes remain arbitrary binary data. Empty files are not converted.\n\nEvery adapter declares input and output formats, packaged proof or an unavailable reason, sandbox boundary, resource limits, output validator, metadata and encoding behavior, lossiness, and required disclosures. The runner performs storage preflight, rejects symbolic-link sources and destination components, writes a unique temporary file, syncs and reopens it, validates the result, and only then replaces the destination atomically. Cancellation removes temporary output and leaves the destination unchanged. Transient Windows rename sharing violations use a short bounded retry; other errors fail immediately.\n\nThe queue consumes an `AsyncIterable` one path at a time and persists each item before requesting the next. It has no artificial total-file cap, uses bounded shards and concurrency from 1 through 8, checks source size and destination capacity before admission, and persists pause, resume, cancellation, per-file results, and crash reconciliation. Outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never becomes a false batch success.\n\nPDF adapters are cataloged but disabled until a packaged offline tool is proven. A valid adapter must reopen its output and verify page count, order, rotations, metadata, and opaque capability limits before replacement. Encrypted, signed, malformed, and unsupported inputs remain explicit facts.\n\n## Documentation site surface\n\nThe site exposes `converter.html` as a browser-local equivalent. Its catalog is categorized as Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Browser-bundled adapters are limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV, and Base64 output. Other entries stay visible as unavailable with their missing-adapter reason.\n\nThe site queue stores file handles and bounded metadata, reads one file at a time, pages visible results, and reports queued, reading, ready, skipped, failed, or cancelled state. A Blob is offered only after conversion succeeds, preview text is capped, cancellation is honored at safe boundaries, and one failed item never marks another successful. Adapter search is plain text by default with its own adjacent regex builder. Pattern evaluation and file bytes stay in the browser.\n\n## Privacy and failure modes\n\nConversion is local-only. Paths must be absolute and null-free, symbolic-link sources and destination components are refused, and no adapter is enabled through PATH discovery. Inputs, outputs, memory, time, temporary storage, and concurrency are bounded. Existing destinations require explicit overwrite approval. The backend and site report unavailable adapters, malformed encodings, source mismatches, missing disclosures, resource limits, storage shortages, cancellation, output validation mismatches, and destination conflicts without writing guessed or partial output.\n\n## Verification boundary\n\nThis lane did not run tests, lint, type checks, builds, packaging, runtime execution, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.\n\n## Suggested articles\n\n[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Regex builder](regex-builder.md), [Responsive sizing](responsive-sizing.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/local-file-converter-ui",
      "category": "platform",
      "title": "Local file converter surface",
      "headings": [
        {
          "title": "User flow",
          "id": "user-flow"
        },
        {
          "title": "Search and regex builder",
          "id": "search-and-regex-builder"
        },
        {
          "title": "Queue and failure states",
          "id": "queue-and-failure-states"
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
      "body": "# Local file converter surface\n\nThe desktop renderer exposes the local file converter through `ConverterSurface`. The\nsurface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed\n`ConverterClient` and keeps the privileged file and control-plane operations outside the\nrenderer component.\n\n## User flow\n\n1. Choose a local file through the client-provided native picker.\n2. Read the source bytes through the typed `sniff` method. The surface shows the exact\n   format, confidence, inspection method, byte count, and detail returned by the client.\n3. Review the complete adapter catalog. All eight categories remain visible, including\n   adapters that are unavailable because their required bundled dependency has not been\n   proven in the packaged artifact.\n4. Select an enabled adapter, review every loss, metadata, and encoding disclosure, and\n   acknowledge each disclosure.\n5. Provide an absolute destination path. The client may provide a native destination\n   picker, but the text field remains available and is validated again by the privileged\n   boundary.\n6. Request overwrite confirmation from the client. The renderer never assumes that a\n   destination is absent and never sets approval without the client response.\n7. Queue one request through `enqueueOne`. Queue records are loaded in bounded pages and\n   are never collected into an unbounded renderer array by the surface.\n\n## Search and regex builder\n\nEvery category owns a separate search query and an adjacent anchored regex builder. Plain\ntext is the initial mode. The builder exposes guided insertions for literals, character\nclasses, anchors, groups, alternation, and quantifiers, plus a raw JavaScript `RegExp`\npattern, flags, bounded sample text, syntax feedback, matches, capture groups, and copy.\nThe query and pattern stay synchronized when regex mode is selected. Invalid patterns and\noversized samples produce an explicit local error and no match result.\n\n## Queue and failure states\n\nThe queue uses the backend cursor contract. The surface loads at most 100 records at a\ntime, offers refresh and next-page controls, and displays every returned item state and\noutcome. Start, pause, resume, and cancel invoke the corresponding typed client method.\nProgress is shown only when the client has reported a real progress event. A missing\ntotal is rendered as an indeterminate detail rather than an invented percentage.\n\nAll client calls use a bounded deadline. Rejected promises and timeouts become visible\nrenderer error or status copy. No rejected call is turned into a success state.\n\n## PDF commands\n\nThe surface renders inspect, split, merge, extract, reorder, rotate, and metadata commands\nfrom the `pdfCapabilities` response. Unavailable commands stay visible with the exact\nreason returned by the client. The operation form accepts absolute sources and the\noperation-specific ranges, pages, rotation, or metadata. Execution is available only when\nthe registered client exposes `runPdfOperation` and reports that capability as available.\n\n## Export and editor handoff\n\nThe surface exports only the queue page currently loaded by the renderer. JSON, CSV, and\nMarkdown descriptors state their media type, extension, scope, and loss note. A separate\nVisual Studio Code handoff descriptor opens the selected destination only through the\nregistered client. Missing client methods leave the controls disabled with an exact reason.\n\n## Security and privacy boundaries\n\nThe renderer does not read arbitrary paths, invoke a shell, discover machine-wide tools,\nor upload a source. The client owns native file selection, byte inspection, destination\nvalidation, bundled-adapter proof, overwrite confirmation, conversion, atomic output\nvalidation, and editor launch. The renderer holds only display metadata and the queue page\nprovided by the client. A consumer integration must keep the client methods local and\nbounded, and must not put credentials or source contents in logs, exports, history, or\ntelemetry.\n\n## Suggested articles\n\n- [Regex builder](regex-builder.md)\n- [Complete exports](complete-exports.md)\n- [Long-operation progress](long-operation-progress.md)\n- [In-context recovery](in-context-recovery.md)\n"
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
      "body": "# Local version history\n\nA Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.\n\n## Behavior\n\nEvery creation, edit, and deletion of a user-owned record is meant to be recorded as a commit in a local, isolated repository, with a browsing panel offering filtering, diffing, labeling, and non-destructive restore.\n\n## Configuration\n\nRestoring would itself be recorded as a new revision rather than rewriting history, so a restore could itself be undone.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application keeps no local version history of any kind; settings and records are overwritten in place with no way to browse or restore a prior state.\n\n**Documentation website:** Partial, runtime proof unverified. Settings mounts a bounded browser timeline with stable revision IDs, text, action and date filters, action counts, date presets, filtered selection, diff output, redacted export, retention controls, append-only restore receipts, and a restore-record route. The date surface also provides month and year jumps, local or ISO typed dates, named presets, range selection, and day buttons with accessible weekday names. Source wiring records settings, tabs, appearance, locks, authenticator persistence, tickets, ladder, and status metadata. Authenticator restore is explicitly unsupported because secrets are omitted, and complete coverage proof remains incomplete. It stores browser metadata rather than a Git repository and omits secrets and credential digests.\n\n## Failure modes\n\nIf browser history storage is unreadable, live settings remain usable and the history surface reports an empty or unavailable state. Retention is explicitly bounded to 500 records rather than described as unlimited.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified`. The desktop application row remains not implemented.\n\n## Suggested articles\n\n[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/logo-conversion-contract",
      "category": "platform",
      "title": "App logo conversion contract",
      "headings": [
        {
          "title": "Inputs and picker",
          "id": "inputs-and-picker"
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
          "title": "Verification boundary",
          "id": "verification-boundary"
        }
      ],
      "links": [
        "material-appearance.md",
        "complete-exports.md",
        "local-version-history.md",
        "responsive-sizing.md"
      ],
      "body": "# App logo conversion contract\n\nThe logo surface lets a person choose one of the shipped marks or select one local image. The selected mark changes presentation only. It never changes the package identifier, executable name, installer identity, update feed, or application-data directory.\n\n## Inputs and picker\n\nThe renderer registers one semantic local file picker at `logo.custom-file`. Its accepted formats are PNG, JPEG, WebP, and static SVG. The picker is keyboard and screen-reader operable and exposes empty, reading, ready, invalid, replacement, and clear/reset states. A selected filename is UI state only and is not written to the conversion cache, history, exports, logs, telemetry, or captures.\n\n## Inspection and limits\n\nThe shared inspector reads bytes rather than trusting a file extension or declared MIME type. It validates PNG, JPEG, WebP, and SVG signatures, dimensions, frame count, alpha behavior, and decoded-memory estimates. It rejects malformed data, animated images, oversized inputs, dimensions beyond 4096 pixels, decoded buffers above 64 MiB, and SVG script, event-handler, animation, external-resource, or embedded-object content. The input limit is 8 MiB and the converted output set is bounded to 16 MiB.\n\nSVG is accepted only when its root is a static `svg` element with a width and height or a viewBox. No network fetch or remote resource is permitted. A production decoder must run in an isolated process with the same CPU, memory, input, output, and frame limits.\n\n## Crop and presentation\n\nCrop coordinates, focal point, and safe-area insets are numeric proportions between 0 and 1. The fit choices are contain, cover, and fill. The background is either transparent or a validated hexadecimal colour. The surface provides keyboard-editable number fields for all crop and focal values and warns when a solid background may not provide a 4.5:1 contrast ratio for the mark.\n\n## Conversion and receipts\n\nThe control-plane converter accepts an injected isolated decoder. It will not convert when that seam is absent. Every decoder result must contain bytes, a successful reopen or round-trip receipt, and optional loss notes. The converter independently re-inspects every output, verifies the requested format, dimensions, alpha policy, signature, output bounds, memory receipt, and elapsed CPU budget. Any failure returns a redacted reason and leaves the previous logo active.\n\nThe registration descriptors are `logo.inspect`, `logo.convert`, `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear`. They are local-only and are ready for the control-plane dispatcher to mount without granting the renderer filesystem or network access.\n\n## Local cache\n\n`LogoStore` writes only converted assets and a schema-versioned manifest beneath the app's private data directory. Asset names are generated from target metadata and a SHA-256 receipt. Loading rechecks the signature, dimensions, alpha state, and byte count. Missing or invalid cache data is treated as absent. Clear and reset remove the private logo cache; the shipped mark remains the fallback.\n\n## Verification boundary\n\nThis lane supplies pure inspection, conversion, cache, state, and renderer contracts. Decoder integration, central dispatcher wiring, packaged artifact interaction, capture evidence, and focused tests belong to the owning integration lane. No user image is included in this source tree.\n\nSuggested articles: [Material appearance](material-appearance.md), [Complete exports](complete-exports.md), [Local version history](local-version-history.md), and [Responsive sizing](responsive-sizing.md).\n\n"
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
        "browser-extension-download-surfaces.md",
        "README.md"
      ],
      "body": "# Long-operation progress reporting\n\nA dialog that starts a slow operation shows that operation's real progress inline, with the triggering control disabled against duplicate submission.\n\n## Behavior\n\nLong-running actions, such as provisioning a server, are meant to show real progress inside the originating dialog rather than a bare spinner, and to disable both the visible submit control and the underlying handler against a second, duplicate trigger.\n\n## Configuration\n\nWhere an operation includes a slow optional phase, the user would be able to decline it and be told plainly what declining leaves undone.\n\n## Current status\n\n**Desktop application:** Partial. Long actions show a generic busy indicator rather than real progress, and only the visible button — not confirmed keyboard re-entry — is guarded against duplicate submission.\n\n**Documentation website:** Not implemented. The documentation website triggers no long-running operations of its own.\n\n## Failure modes\n\nA second, keyboard-triggered submission arriving while an operation is already in flight is meant to be refused by the handler itself, not only by the disabled button; this has not been verified as blocked on the desktop application.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Browser-extension download capture surfaces](browser-extension-download-surfaces.md), [Platform feature index](README.md).\n"
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
      "body": "# Material appearance system\n\nRuntime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.\n\n## Behavior\n\nA conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.\n\n## Configuration\n\nColours are chosen through a continuous translator with bidirectional conversion between HEX, RGB, HSL, HSV, HWB, CMYK, Lab, LCH, OKLab, OKLCH, and named colours rather than a fixed swatch grid. The translator reports its source colour space, clipping risk, and WCAG contrast. Named theme presets are exportable and importable as bounded JSON files.\n\n## Current status\n\n**Desktop application:** Partial. A dark/light theme toggle exists in settings, but accent color, density, typography customization, the continuous color picker, and the per-element appearance editor are all absent.\n\n**Documentation website:** Partial. Every page exposes persisted dark, light, and high-contrast themes, density, accent, font scale, navigation docking, logo presets, and a broad colour translator. These values apply live. Context-menu appearance editors now cover route tabs and stable local element targets, with credential checks before edits and resets when a target is toy-locked. The editor also stores font family, pixel size, weight, style, underline and strike, overline, capitalization, small caps, superscript or subscript, highlight, outline, shadow, spacing, line height, direction, alignment, rainbow sentinel, reduced-motion freeze, JSON import/export, and per-mutation history. Named theme presets have local history, import, export, and reset. Font choices include verified bundled and generic families, typed validation, browser availability checks, and a CJK-safe fallback. The bundled Material Symbols face exposes a bounded weight axis with range controls, numeric entry, persistence, reset, export, import, and local history. Static faces and typed families with no verified metadata explain that boundary.\n\n## Failure modes\n\nAn appearance change that fails to persist keeps the prior value and reports the browser error. A locked target requires its current toy-lock value before appearance edits or reset. A typed family that is unavailable remains selected but reports fallback to the CJK-safe family chain. Out-of-range colour values remain visible in the translator with a clipping warning. Export includes redacted appearance records but never credential digests.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane ran syntax and source Chuts only. It did not run test suites, builds, browser checks, or captures. The site registry remains partial because variable-font axes and runtime proof are incomplete. The desktop application row remains partial.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
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
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "README.md"
      ],
      "body": "# Spoken narration\n\nAn optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.\n\n## Behavior\n\nA narrator is meant to speak application events using platform or bundled natural-sounding voices, in English, Cantonese, or both in sequence, with independently selectable voice, rate, and pitch per language, staying off until the user turns it on.\n\n## Configuration\n\nVoice, rate, pitch, and narrated language would each be independent settings; narration would be rate-limited so lines never overlap.\n\n## Current status\n\n**Desktop application:** Not implemented. No narrator, no voice picker, and no narration queue exist in the product.\n\n**Documentation website:** Not implemented. A static documentation site has no application events of the kind this feature narrates.\n\n## Failure modes\n\nIf narration ever failed mid-line (missing voice, synthesis error), the intended behavior is to drop that one line silently rather than block the interface; there is nothing to fail today because there is no narrator.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
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
          "title": "Desktop behavior",
          "id": "desktop-behavior"
        },
        {
          "title": "Documentation site behavior",
          "id": "documentation-site-behavior"
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
      "body": "# Local Ollama suite manager\n\nThe desktop console has a mount-ready React surface for a local Ollama installation, and the documentation site has a browser-local equivalent at `ollama.html`. Neither is a cloud model store or an Ollama replacement. The desktop surface accepts an `OllamaSuiteClient`; the site requires an explicitly approved loopback endpoint. Both treat observed backend data as authoritative and never seed sample models, simulated progress, or fake health results.\n\n## Desktop behavior\n\nThe desktop surface has four destinations. Model Store presents every model and variant returned by a completed catalog traversal with source identity, revision, refresh time, last successful refresh, page count, completeness, staleness, and offline-cache evidence. Installed tags are reconciled with the catalog without hiding either set.\n\nPull queue schedules local pulls with bounded backend-controlled parallelism, byte progress only when Ollama supplies bytes, durable per-item state, cancellation, retry, and honest completed, skipped, cancelled, and failed outcomes. One failed item does not remove a valid installed model or turn a partial result into success.\n\nLocal chat uses installed variants that report chat capability, streams partial output as partial, supports stop, validated generation settings, local session history, and attachment controls that remain visible but disabled when capability is missing. Harness profiles are bundled or registered through semantic executable and folder pickers and allowlisted argument profiles. Preflight shows the executable, arguments, working directory, redacted environment-key names, required resources, blockers, warnings, and hardware-fit evidence. Launch snapshots the profile and configuration first, and failed launch state includes rollback evidence.\n\nThe central mount must provide `OllamaSuiteClient` from `ollama-suite-model.ts`. It owns local HTTP, catalog pagination, offline cache evidence, bounded regex evaluation, pull persistence, chat streaming, file picking, preflight, process launch, snapshots, rollback, and secret redaction. Search state is separate for the catalog, chat sessions, and harness profiles. Plain text is the default and each search has its own adjacent regex builder with bounded evaluation.\n\nHardware fit is one of **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown**, backed by observed RAM, GPU and VRAM, driver or backend support, free storage, exact blob size, parameter count, quantization, context, and overhead. Missing facts remain missing and produce a conservative verdict.\n\n## Documentation site behavior\n\nThe site asks the user to approve one endpoint before a request can start. It accepts only localhost, `127.0.0.1`, or `[::1]`, rejects credentials, query strings, fragments, and unsupported schemes, and reports mixed-content and browser CORS boundaries distinctly. It offers no shell command, guessed download, cloud fallback, or web hunt.\n\nAfter approval, it reads version, installed tags, and running tags through the documented local API with bounded response sizes and timeouts. The official catalog is not fetched by this browser surface, so catalog completeness remains **Unknown** and is never inferred from installed tags. Pull and chat remain disabled until a real model tag is returned, use bounded newline-delimited streams, and support cancellation and partial output. Capability metadata comes from the selected model and is never guessed.\n\n## Failure modes and recovery\n\nMissing, stopped, unhealthy, offline, timed-out, and malformed runtime states remain visible with backend-provided recovery actions. Stale or partial catalogs are never labeled exhaustive. No local models, insufficient storage, unsupported capability, partial pull failure, chat interruption, blocked preflight, launch failure, and rollback states each keep their exact evidence and next action visible. No local click is treated as launch or restore success without a receipt.\n\n## Security and privacy\n\nThe renderer accepts no arbitrary command field. Harness registration uses backend-owned pickers and allowlisted executable and argument profiles. The backend allowlists loopback endpoints, bounds requests and responses, cancels superseded work, validates every response, and keeps secrets in the operating-system credential store. Credentials and secret environment values never enter arguments, snapshots, logs, history, exports, captures, or renderer state. Pulls disclose network transfer and storage cost; chat data remains local.\n\n## Verification boundary\n\nThis lane did not run tests, lint, type checks, builds, packaging, runtime interaction, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Non-blocking notifications](non-blocking-notifications.md), [Local version history](local-version-history.md), [External settings sources](external-settings-sources.md), [Platform feature contracts](README.md).\n"
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
          "title": "Notification history",
          "id": "notification-history"
        },
        {
          "title": "Search, export, and bulk actions",
          "id": "search-export-and-bulk-actions"
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
      "body": "# Receipt-backed operations and notifications\n\nTyped foundations for long-running console operations and the notification history that reports their real outcomes.\n\n## Behavior\n\nAn operation request identifies one operation type, one exact target, the affected data, a stable idempotency key, a deadline, and whether cancellation and retry are allowed. A capability check distinguishes available, unavailable, and deliberately disabled behavior before any work begins. Unavailable and disabled states carry their exact reason and may point to an explicit recovery or enable action.\n\nThe coordinator refuses duplicate submissions while the same idempotency key is pending. It reports observed progress, supports cancellation only when the request allows it, enforces the deadline, and returns one terminal receipt. A runner choosing an execution path is not success. A successful or partial receipt must include an observation from the component that applied the effect, and the receipt must match the request's operation id, type, idempotency key, and target.\n\nBulk and multi-step work returns per-item outcomes. A partial result names what succeeded, failed, was skipped, or was cancelled. Its retry action exists only when the request provides a distinct idempotency key for the unfinished work, so retry cannot replay or repeat effects that already landed. Failure, cancellation, timeout, refusal, unavailable capability, and disabled capability stay distinct so the interface can offer an accurate next action.\n\n## Notification history\n\nNotifications have stable ids and one of five severities: information, progress, success, warning, or error. Active notifications have deterministic stacking order. Dismissing one removes it from the active stack but keeps it in history. Deleting one removes it from history and is a separate command.\n\nQuiet hours suppress presentation according to the configured policy, not recording. Warning and error records never auto-dismiss. Every store mutation returns a receipt from the persistence adapter. An in-memory change whose persistence write was not observed is reported as partial rather than successful.\n\nNotification actions are explicit references. Retry appears only when the operation receipt supplies a retry reference. Undo appears only when the receipt supplies a real inverse operation or a local history revision. Running Undo is another operation and must return its own receipt.\n\n## Search, export, and bulk actions\n\nHistory can be filtered by text, severity, state, and source. Export projection includes factual notification text, source, timestamps, operation receipt reference, and action labels without serializing executable callbacks or operation payloads.\n\nBulk dismissal, deletion, and read-state changes report every changed id and every skipped id with its reason. An empty selection or a selection containing no applicable record fails explicitly.\n\n## Failure modes and security\n\n- Missing or malformed request identity, target details, affected-data descriptions, or timestamps are refused before dispatch.\n- Duplicate in-flight idempotency keys are refused by the handler, including keyboard or programmatic re-entry.\n- A runner exception becomes a failure receipt. It is never converted into success because the intended path was selected.\n- A deadline aborts the runner signal and returns a timeout receipt when no terminal receipt arrived in time.\n- Invalid, mismatched, or unobserved success receipts become failure receipts.\n- Persistence receipt mismatch reports a partial notification mutation and keeps the live in-memory state visible.\n- Payloads and affected-data descriptions must remain redacted. Receipts carry references and summaries, not credentials or private configuration values.\n\n## Integration status\n\nThe shared contracts, renderer coordinator, receipt helpers, notification model, and durable store are implemented as integration foundations. They are not yet wired into the product shell, trusted process bridge, or control-plane operation dispatch. No screen should claim these behaviors are active until those seams return and render real receipts.\n\n## Verification\n\nThis ultra-speed implementation did not run tests, type checks, builds, packaging, runtime interaction, or screen captures. Integration must add focused coverage for unavailable and disabled capabilities, duplicate submission, progress, cancellation, timeout, invalid success receipts, partial outcomes, idempotent replay, quiet hours, warning and error persistence, dismissal versus deletion, persistence mismatch, bulk results, retry, and receipt-backed Undo.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [Long-operation progress](long-operation-progress.md), [In-context recovery](in-context-recovery.md), [Bulk actions](bulk-actions.md), and [Local version history](local-version-history.md).\n"
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
        "unlock-ladder.md",
        "built-in-authenticator.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Per-element toy locks\n\nA self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.\n\n## Behavior\n\nThe site provides a local browser equivalent for rendered route links, controls, panels, and other context-menu targets. Each selected target gets its own toy-lock record. Lock and appearance actions are available from the context menu and from the keyboard context-menu path (`Shift+F10` or the Context Menu key), including for inputs, selects, textareas, and editable content. Normal editing is not intercepted until an appearance or lock action is chosen.\n\n## Configuration\n\nThis is explicitly a user-experience convenience, not a security boundary. The site stores only a SHA-256 digest for each local toy-lock value, never the value itself. Appearance edits, appearance resets, and lock removal require the current value when that target is locked. Clearing this site's browser storage is the documented recovery route and is not presented as data protection.\n\n## Current status\n\n**Desktop application:** Partial. A single application-wide password lock exists on launch, which is a coarser mechanism than a per-element lock; there is no per-control locking, no independent per-element credentials, and no lock context-menu entry anywhere.\n\n**Documentation website:** Local equivalent implemented, runtime proof unverified. Context-menu actions identify the exact target, use stable `data-element-id` values rather than DOM position selectors, persist appearance and lock state in bounded browser storage, and reapply it after dynamic rendering. The site does not implement TOTP, unlock durations, or server-backed credential recovery.\n\n## Failure modes\n\nA forgotten site toy-lock value is recoverable by clearing this site's browser storage. A wrong value leaves the target locked, and removing a lock without the current value is refused. Credential digests are omitted from exports.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains partial.\n\n## Suggested articles\n\n[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/personal-vocabulary-upload",
      "category": "platform",
      "title": "Personal vocabulary upload",
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
      "body": "# Personal vocabulary upload\n\nLets a user supply a local JSON file that remaps specific words in the interface to their own preferred terms, with no data leaving the device.\n\n## Behavior\n\nA file-upload control is meant to accept a bounded, versioned local JSON file of word replacements, apply it to user-facing text only, and clear back to original wording when the file is removed.\n\n## Configuration\n\nValidation would bound file size, nesting depth, and entry count, and make no network request of any kind when loading, applying, or clearing the file.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no personal-vocabulary upload control anywhere in its settings.\n\n**Documentation website:** Implemented for the shared site shell. Every page exposes upload and clear controls. The loader bounds bytes and entry counts, rejects unsupported versions, unexpected fields, unsafe and duplicate keys, and unbounded strings, applies replacements locally, and revalidates cached data on every load. Reload status describes the cache rather than pretending the original file remains loaded.\n\n## Failure modes\n\nA malformed or oversized file is rejected inline and never partially applied. A corrupt cache is removed and original wording resumes. Personal mappings, source names, and file paths are excluded from export.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
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
        "automatic-updates.md"
      ],
      "body": "# Platform feature contracts\n\nThis category documents the canonical platform feature contracts this product is expected to implement, and states plainly, per surface, which of them are actually built today.\n\nThe two surfaces referenced throughout are the desktop application (the installed Windows console) and the documentation website (this published site).\n\n- [Language modes](language-modes.md)\n- [Funny-level sliders](funny-levels.md)\n- [Dialog emoji toggle](dialog-emojis.md)\n- [School mode](school-mode.md)\n- [Spoken narration](narration.md)\n- [Scheduled settings](scheduled-settings.md)\n- [External settings sources](external-settings-sources.md)\n- [Dim sum surprise](dim-sum-surprise.md)\n- [Regex builder](regex-builder.md)\n- [Non-blocking notifications](non-blocking-notifications.md)\n- [Status hub](status-hub.md)\n- [Material appearance system](material-appearance.md)\n- [App logo customization](app-logo-customization.md)\n- [Browser-style tabbed navigation](browser-style-tabs.md)\n- [Tab groups and tab search](tab-groups-and-searches.md)\n- [Command palette](command-palette.md)\n- [Destructive-action super confirmation](destructive-action-confirmation.md)\n- [Local version history](local-version-history.md)\n- [In-app changelog viewer](changelog-viewer.md)\n- [External editor handoff](external-editor-handoff.md)\n- [Complete data export](complete-exports.md)\n- [Bulk actions](bulk-actions.md)\n- [Accessibility](accessibility.md)\n- [Responsive and high-scale sizing](responsive-sizing.md)\n- [Personal vocabulary upload](personal-vocabulary-upload.md)\n- [Per-element toy locks](per-element-toy-locks.md)\n- [Support Tickets recovery flow](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n- [Built-in authenticator](built-in-authenticator.md)\n- [Attention-support modes](attention-modes.md)\n- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)\n- [Offline documentation browser](offline-documentation-browser.md)\n- [Renameable app display name](app-display-name.md)\n- [Guided forms](guided-forms.md)\n- [Bounded, self-painting overlays](bounded-overlays.md)\n- [Right-click menus show keyboard shortcuts](context-menu-shortcuts.md)\n- [Long-operation progress reporting](long-operation-progress.md)\n- [In-context failure recovery](in-context-recovery.md)\n- [Provider-authored markup rendering](provider-markup-rendering.md)\n- [Forge publishing](forge-publishing.md)\n- [Collapsible filters and statistics](collapsible-filters.md)\n- [Automatic updates](automatic-updates.md)\n\n## Exemptions\n\nThe local file converter and Ollama suite are now present as separate local surfaces. The desktop routes are `desktop://console/#surface=converter` and `desktop://console/#surface=ollama`; the Pages equivalents are `converter.html` and `ollama.html`. Their current evidence is `implemented-unverified`: the converter catalog and PDF capability read are mounted through the control plane, while picker and queue mutations remain explicitly unavailable until their handlers are registered. The Ollama desktop client reports a typed bridge-unregistered state until its privileged dispatcher is mounted. Neither surface invents models, health, conversion output, or sample data.\n\n"
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
      "body": "# Responsive and high-scale sizing\n\nNo clipped, truncated, or overlapping text or controls at narrow window widths, high display scales, or with the longest localized strings.\n\n## Behavior\n\nLayouts are meant to hold correctly at supported window widths and at 100/125/150/200% display scale, including the longest strings a bilingual mode would produce.\n\n## Configuration\n\nThis would be verified against the real built interface at each scale and width rather than assumed from a design file.\n\n## Current status\n\n**Desktop application:** Not implemented (unverified). The desktop application has not been verified across the full display-scale range; behavior at 150% and 200% scale, and at the narrowest supported window width, is unconfirmed.\n\n**Documentation website:** Partial. The site is responsive down to roughly phone width using relative units and wrapping containers, but has not been verified at every display scale or against long bilingual strings, since bilingual mode does not yet exist.\n\n## Failure modes\n\nClipped or overlapping text at an unverified scale is the specific failure this feature exists to prevent; until verification happens on the desktop application, that failure mode should be assumed possible rather than assumed absent.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Material appearance system](material-appearance.md), [Platform feature index](README.md).\n"
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
      "body": "# School mode\n\nA single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.\n\n## Behavior\n\nOne shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.\n\n## Configuration\n\nTurning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.\n\n## Current status\n\n**Desktop application:** Not implemented. No shared switch, no rename path, and no unlock credential exist anywhere in the product.\n\n**Documentation website:** Not implemented. No shared switch exists on the site either.\n\n## Failure modes\n\nIf the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked; nothing currently implements that fallback because nothing implements the mode.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
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
      "body": "# Status hub\n\nA shared, live status page reporting what the product's own maintenance work is currently doing — what is running, what has landed, and what is blocked.\n\n## Behavior\n\nA status surface is meant to show real-time build, verification, and release state with evidence behind every claim, distinct from the product's own PBX operational dashboards.\n\n## Configuration\n\nIt would update one page in place rather than mint a new page per update, and carry emoji-coded states that never claim a check passed before it has actually run.\n\n## Current status\n\n**Desktop application:** Not implemented. No such development-status page exists for this product on the desktop application.\n\n**Documentation website:** Partial. The site composer embeds one validated build-manifest record into every published page. The status and download surfaces derive their counts, release availability, immutable URL, byte count, and digest only from that record, and show unavailable, invalid, or stale states otherwise. A local Status Hub projection now stores a session label, state, optional evidence URL, and optional receipt JSON in browser storage. When a validated release exists, the user can generate or paste an embedded-build receipt, and the verifier requires exact commit, tag, setup URL, and SHA-256 equality before showing the locally verified state. This is local evidence matching, not a cryptographic signature or hosted verdict. Live maintenance sessions, hosted updates, interactive question delivery, and remote reply delivery are not implemented on this public surface.\n\n## Failure modes\n\nIf no composed record exists, the source page says the record is unavailable. If release evidence fails schema checks or describes a different package version, the download remains disabled and the exact invalid or stale reason is shown. A user-declared Status Hub state remains unverified unless the exact current receipt supports it; the form cannot promote a label by itself.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains partial because the local projection is not a hosted live Hub. The desktop application row remains not implemented.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [In-app changelog viewer](changelog-viewer.md), [Agent hub](../agent/hub.md), [Platform feature index](README.md).\n"
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
        "README.md"
      ],
      "body": "# Support Tickets recovery flow\n\nA playful, entirely local, fake support-desk flow that helps a user recover from forgetting a toy-lock credential by pointing them at their own local data folder.\n\n## Behavior\n\nA mock ticket form is meant to lead, after a canned first response, to opening the application's local data folder in the file manager so the user can delete it themselves — nothing sent anywhere and no real ticket created.\n\n## Configuration\n\nOne unmissable, unstyled line would state plainly that nothing leaves the device and nobody is reading the ticket, regardless of the active funny level.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no such recovery flow; there is no per-element locking for it to recover from, and no mock support surface exists.\n\n**Documentation website:** Local equivalent implemented, runtime proof unverified. Settings provides a local fictional ticket form with category, severity, description, ticket number, status progression, canned response, and a plain disclosure that nothing is sent and nobody is reading. The recovery route is clear browser storage, not a hosted support process and not an automated delete action.\n\n## Failure modes\n\nThe static surface does not open an operating-system file manager. It states the exact recovery action, clearing this site's browser storage, and never claims that a ticket or response left the device.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains not implemented.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).\n"
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
      "body": "# Tab groups and tab search\n\nLets a user organize open tabs into named, colored groups and search across them from four distinct entry points.\n\n## Behavior\n\nTabs are meant to support pinning and named or colored grouping, plus four separate searches: the current strip, inside one group, across group names, and a master search spanning every open tab.\n\n## Configuration\n\nThe site tab manager stores named groups, membership, pinned routes, order, and the active group locally. Each of the four searches has its own adjacent regex-builder trigger and keeps the active group collapsed state intact. Reordering and group changes are local browser operations only.\n\nThe shared site export includes a versioned redacted tab and group record, including order, pins, groups, and appearance values. Toy-lock credential digests are omitted, and the file is an audit/export record rather than an import or restore format.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no concept of multiple open tabs to group or search across.\n\n**Documentation website:** Partial, runtime proof unverified. The shared route strip exposes group creation, rename, delete, colour metadata, collapse, pinning, reordering, four independent searches, closed-route persistence, reopen actions, a two-key full-range destructive confirmation, and local bulk-close controls. Group headers and their member routes can target the same deep appearance editor as tabs, including contrast, reset, import, export, and local history. It does not claim that separate HTML documents share one renderer panel.\n\n## Failure modes\n\nThe local model is bounded to the routes present in the current navigation. A route added later is appended to the primary group. Invalid saved groups, unknown route identifiers, malformed appearance records, and malformed lock digests are discarded and the valid local model remains. Regex failures remain local to their search and do not change the route order.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains not implemented.\n\n## Suggested articles\n\n[Browser-style tabbed navigation](browser-style-tabs.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
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
      "body": "# Unlock ladder\n\nA small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.\n\n## Behavior\n\nWinning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.\n\n## Configuration\n\nEvery answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.\n\n## Current status\n\n**Desktop application:** Partial. A lockout timer exists after repeated wrong password attempts on the desktop application's launch gate, but there are no unlock-ladder games, no attempt-budget mechanic, and no server-side challenge grading.\n\n**Documentation website:** Partial, local browser-storage equivalent implemented and runtime proof unverified. Settings provides a lockout-bound local waiting timer, dim-sum choices, ten arithmetic questions with a guaranteed single-digit first pair and double-digit later pairs, a timed mole round, a clock fallback, a rolling local budget, and School-mode sum entry. A correct answer clears only the local timer, never signs in, creates a cookie, or refunds attempts. Reload reissues a worker challenge for the persisted rung and round. This static page has no trusted server, no server nonce, and no server-side enforcement, so its local browser state must never be described as an authentication or abuse-control boundary.\n\n## Failure modes\n\nA submission before the local wait expires is disabled and rejected by the local handler. The local ladder is not an authentication factor and has no server nonce. Browser-storage state can be changed by a person controlling the browser, so the surface explicitly does not claim the trusted server-side protections that a hosted implementation would require.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nThis delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains partial because only the local equivalent is implemented. The desktop application row remains partial.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "README",
      "category": "README.md",
      "title": "Ding PBX Console documentation",
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
      "body": "# Ding PBX Console documentation\n\nDing PBX Console is a Windows desktop administration experience for Asterisk. The renderer is compiled directly from the design's navigation model, so this documentation follows the same structure: six rails and 32 destinations, one article per destination, grouped and ordered exactly as the app presents them.\n\nThe documentation map contains 32 destinations in six rails. Every article covers behavior, configuration, failure modes and security, verification, and suggested reading.\n\n## Rails\n\n- [PBX](pbx/README.md) — Telephony: endpoints, routing and everything a call touches while it is alive.\n- [Media](media/README.md) — Media & voice: codecs, RTP, recordings, prompts and conferencing.\n- [Data](data/README.md) — Records & APIs: call records, event logging and the machine interfaces.\n- [System](system/README.md) — Runtime & security: modules, logging, certificates and the CLI.\n- [Agent](agent/README.md) — Agent global memory: memory, sync, skills, hub sessions and the emission guard.\n- [App](app/README.md) — Deploy & application: stand up a new server, then appearance, updates and the console itself.\n\n## Delivery\n\n- [The Ding PBX installer ISO](installer-iso.md) — a bootable, unattended-install ISO that turns a bare machine into a working server.\n\n## Shared behavior\n\nConfiguration controls are pickers, switches, sliders and steppers wired to real keys in the owning Asterisk configuration file — never free-text fields that could drift from what Asterisk actually does. Where an article shows a default value or an option list, it is the same default the design and the renderer ship with; nothing here is a simulated call, a sample statistic, or an invented extension. Destructive actions run the full confirmation ceremony described in [History & git](app/history.md) and [Arcade](app/arcade.md).\n"
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
      "body": "# Security\n\n## Behavior\n\nAccess control, transport certificates and caller-ID attestation. Certificates are chosen from the machine store — no path is ever typed. It is backed by `acl.conf · stir_shaken.conf`. The rail badge on this destination currently reads `!`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\n### Access control\n\nNamed ACLs applied to transports and endpoints.\n\n- **Active ACL** (`s_acl`) — a select control, default `trusted-nets`, choices `trusted-nets`, `branch-offices`, `carrier-only`, `deny-all`.\n- **Permitted networks** (`s_permit`) — a chips control, default `10.20.0.0/16`, `198.51.100.0/24`, choices `10.20.0.0/16`, `198.51.100.0/24`, `192.0.2.0/24`, `0.0.0.0/0`.\n- **Auto-ban after failures** (`s_failban`) — a stepper control, default `5`.\n- **Ban duration** (`s_bantime`) — a slider control, default `600`.\n- **Allow guest calls** (`s_guest`) — a switch control, default `false`. Off. Always off, unless you run a public conference bridge and know exactly why you turned it on.\n  - *What it is:* Whether calls from unauthenticated sources are accepted.\n  - *Why it exists:* It is the setting that decides whether strangers can use your phone system.\n  - *Choosing a value:* Off. Always off, unless you are running a public conference bridge and know exactly why.\n  - *Gotcha:* Combined with a permissive context this is how a PBX ends up dialling premium numbers overnight.\n\n### TLS\n\nCertificates come from the system store.\n\n- **Server certificate** (`s_cert`) — a select control, default `pbx.example.com`, choices `pbx.example.com`, `wildcard.example.com`, `internal-ca-issued`.\n- **TLS method** (`s_method`) — a segmented control, default `tlsv1_3`, choices `tlsv1_2`, `tlsv1_3`.\n- **Verify client certificates** (`s_verify`) — a switch control, default `false`.\n- **Cipher policy** (`s_ciphers`) — a segmented control, default `Modern`, choices `Modern`, `Intermediate`, `Legacy`.\n\n### STIR/SHAKEN\n\nSigned caller identity for outbound calls.\n\n- **Attestation enabled** (`s_stir`) — a switch control, default `true`.\n  - *What it is:* Whether outbound calls are signed with a STIR/SHAKEN identity token.\n  - *Why it exists:* Carriers increasingly downgrade or label unsigned calls, and regulators increasingly require it.\n  - *Choosing a value:* On for anything reaching the public network.\n  - *Gotcha:* Signing requires a certificate from an authorised provider. Enabling it without one produces calls that fail to sign and log an error per call.\n- **Attestation level** (`s_level`) — a segmented control, default `A`, choices `A`, `B`, `C`. A means you know the caller and their right to that number. C means the call just passed through you.\n  - *What it is:* The attestation level asserted on signed calls.\n  - *Why it exists:* It tells the far end how confident you are that the caller may use that number.\n  - *Choosing a value:* A means you know the caller and their right to the number. B means you know the caller but not the number. C means the call merely passed through you.\n  - *Gotcha:* Claiming A when you cannot prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.\n- **Verify inbound identity** (`s_verifyin`) — a switch control, default `true`.\n- **On verification failure** (`s_failaction`) — a segmented control, default `Continue`, choices `Continue`, `Tag`, `Reject`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in acl.conf · stir_shaken.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Combined with a permissive context this is how a PBX ends up dialling premium numbers overnight. Signing requires a certificate from an authorised provider. Enabling it without one produces calls that fail to sign and log an error per call. Claiming A when you cannot prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in acl.conf · stir_shaken.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Endpoints](../pbx/endpoints.md), [Trunk authentication](../pbx/trunkauth.md), and [AMI & ARI](../data/ami.md).\n"
    }
  ]
} as const;
