# Packaged .cjs siblings and delivery token

- Fixed the installed console dying at launch with `ERR_MODULE_NOT_FOUND` for `probe-path.cjs` (seen on `app-0.1.302`). The delivery build script now copies hand-written `.cjs` siblings into `dist-electron/app/electron/` after TypeScript emission and refuses to package when one is missing.
- `package-squirrel.mjs` now lists the packaged `app.asar` and fails when a `.cjs` sibling the compiled main process imports is absent at the exact path the module loader resolves.
- The delivery workflow's build job now carries `GH_TOKEN`, because the delivery-path contract verifies installed `gh release` fields and `gh` exited 4 without a token, which left the last three delivery runs red before packaging.
- `check-delivery-path.mjs` guards all three: the copy step after emission, the check step before packaging, and the build job token.
- `package-squirrel.mjs` now generates `resources/school-mode-provenance.json` from the release identity before its packaging-input preflight. That file was required since the provenance hardening but nothing ever produced it, so the first run that reached the preflight with a token stopped there.
- `build-delivery.ps1` now keeps Node's stderr in the packaging log instead of letting the first stderr line become the only error message.
- `package-squirrel.mjs` runs electron-builder with `--publish never`. With `GH_TOKEN` now present, electron-builder tried to publish on its own after building the setup executable and failed on repository detection; the workflow's single `gh release create` is the only publisher.
