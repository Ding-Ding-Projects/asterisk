# Dynamic Asterisk capability catalogue

## Behavior

`console/scripts/generate-asterisk-catalog.mjs` scans the checked-in Asterisk source families `apps/`, `bridges/`, `cdr/`, `cel/`, `channels/`, `codecs/`, `formats/`, `funcs/`, `pbx/`, `res/`, and `main/`. Every source file carrying an Asterisk module registration becomes a stable module record. Every checked-in configuration sample under `configs/` becomes a stable configuration-resource record. The checked-in generated files are `console/control-plane/generated/asterisk-catalog.json` and `asterisk-catalog.ts`.

Each record names its family, source path, loadable name, description, build-condition signal, configuration files, source-detected CLI/AMI/ARI/AGI and media surfaces, documentation source, and exact reasons a build or documentation result is unavailable. The generator uses a fixed timestamp so repeated runs are byte-stable.

## Runtime reconciliation

The control-plane action `pbx.catalog` reads the target's real `module show`, `core show help`, `manager show commands`, and `ari show apps` output through the allowlisted executable-argument path. `reconcileAsteriskCatalog` joins those observations to the generated records. An unread surface is `unknown`, a missing module is `unavailable`, and an observed module is `available`; no state is inferred from a checked-in sample or from a shipped default. A module present on a target but absent from the source catalogue is retained as an explicit `unverified-installed-module` record with actions outside the supported boundary.

The catalogue is read-only evidence. Configuration writes continue through the existing typed plan, backup, validation, atomic apply, post-read and rollback transaction. Runtime values are observed per target and are never committed into the generated source record.

## Failure modes and security

An absent or stopped Asterisk runtime produces a refusal or an `unknown` result with the target's observed reason. It does not produce sample rows, a guessed module count, or a generic success message. Commands remain separate executable arguments, with bounded output and cancellation inherited from `NodeProcessExecutor`; no shell concatenation is used. Runtime output is kept as typed, redacted control-plane data.

## Verification

Run `node console/scripts/generate-asterisk-catalog.mjs` and confirm the reported module and resource counts match the generated JSON. Run `node --check console/scripts/generate-asterisk-catalog.mjs`. Runtime reconciliation remains implemented-unverified until a final live WSL/container and headless pass reads a real target. No runtime, package, UI, capture, or release claim is made by this source-only check.

## Suggested articles

[Modules](modules.md), [CLI builder](cli.md), [Security](security.md), and [Configuration history](../app/history.md).
