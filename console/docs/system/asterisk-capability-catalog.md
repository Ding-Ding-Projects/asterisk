# Dynamic Asterisk capability catalogue

## Behavior

`console/scripts/generate-asterisk-catalog.mjs` scans the checked-in Asterisk source families `addons/`, `apps/`, `bridges/`, `cdr/`, `cel/`, `channels/`, `codecs/`, `formats/`, `funcs/`, `pbx/`, `res/`, and `main/`. Every source file carrying an Asterisk module registration becomes a stable module record. Every checked-in configuration sample under `configs/` becomes a stable configuration-resource record, and every checked-in ARI document under `rest-api/api-docs/` becomes an API resource with its individual operations. The checked-in generated files are `console/control-plane/generated/asterisk-catalog.json` and `asterisk-catalog.ts`.

Each record names its family, source path, loadable name, description, build-condition signal, configuration files, source-detected CLI/AMI/ARI/AGI and media registrations, individual ARI operations where applicable, documentation source, SHA-256 source provenance, build-graph hash, and exact reasons a build or documentation result is unavailable. The generator strips comments and string literals before token-aware registration parsing, and uses a fixed timestamp so repeated runs are byte-stable.

## Runtime reconciliation

The control-plane action `pbx.catalog` reads the target's real `module show`, `core show help`, `manager show commands`, `ari show apps`, and target configuration filename inventory through bounded allowlisted executable-argument paths. `reconcileAsteriskCatalog` joins those observations to the generated records. An unread or incomplete surface is `unknown`, a missing module is `unavailable`, and an observed module is `available`; no state is inferred from a checked-in sample or from a shipped default. A module present on a target but absent from the source catalogue is retained as an explicit `unverified-installed-module` record with actions outside the supported boundary. `AmiTransport` and `AriTransport` provide named operations, OS-vault credential lookup, cancellation, timeouts, response limits, and redacted typed receipts.

ARI source resource paths may end in the literal template suffix `.{format}`. The reconciliation normalizer removes that literal suffix only after escaping both braces in its Unicode regular expression. This keeps the runtime catalogue importable and lets `/api-docs/channels.{format}` reconcile with the observed `/channels` route. The focused import-boundary test loads the catalogue and dispatcher, checks the Electron IPC registration seam, and deliberately confirms that the former unescaped pattern is rejected.

The catalogue is read-only evidence. Configuration writes continue through the existing typed plan, backup, validation, atomic apply, post-read and rollback transaction. The hand-written `asterisk-action-catalog.ts` publishes typed action IDs and their exact transport, confirmation, destructive, and unavailable boundaries, so the desktop renderer, dispatcher, confirmation flow, readback, history, search, palette, bulk, export, accessibility, and evidence routes share one action contract. `console/app/locales/asterisk-actions.json` and `console/site/asterisk-action-registry.json` carry the same mapping into localization and the documentation site. Runtime values are observed per target and are never committed into the generated source record.

The generated `ami-ari-registry.ts` is the authoritative typed registry for all 122 AMI actions, 11 AMI events, and 109 ARI operations. AMI and ARI family states are independent. An absent AMI credential makes AMI operations unavailable without changing CLI, module, or configuration state. An absent ARI credential makes ARI operations unavailable without changing AMI or module state. GET ARI operations may be read during discovery; mutating operations remain unknown until an explicitly confirmed action runs. The AMI event transport and ARI WebSocket transport each use bounded queues, cancellation, reconnect limits, typed event envelopes, and redacted credentials.

## Failure modes and security

An absent or stopped Asterisk runtime produces a refusal or an `unknown` result with the target's observed reason. It does not produce sample rows, a guessed module count, or a generic success message. Commands remain separate executable arguments, with bounded output and cancellation inherited from `NodeProcessExecutor`; no shell concatenation is used. Runtime output is kept as typed, redacted control-plane data.

## Verification

Run `node console/scripts/generate-asterisk-catalog.mjs` and confirm the reported module, configuration-resource, and ARI-resource counts match the generated JSON. Run `node --check console/scripts/generate-asterisk-catalog.mjs` and `npx tsx --test tests/control-plane/runtime-catalog-load.test.ts` from `console/`. Runtime reconciliation remains implemented-unverified until a final live WSL/container and headless pass reads a real target. No runtime, package, UI, capture, or release claim is made by this source-only check.

## Suggested articles

[Modules](modules.md), [CLI builder](cli.md), [Security](security.md), and [Configuration history](../app/history.md).
