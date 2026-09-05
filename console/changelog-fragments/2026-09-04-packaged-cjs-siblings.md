# Packaged .cjs siblings and delivery token

- Fixed the installed console dying at launch with `ERR_MODULE_NOT_FOUND` for `probe-path.cjs` (seen on `app-0.1.302`). The delivery build script now copies hand-written `.cjs` siblings into `dist-electron/app/electron/` after TypeScript emission and refuses to package when one is missing.
- `package-squirrel.mjs` now lists the packaged `app.asar` and fails when a `.cjs` sibling the compiled main process imports is absent at the exact path the module loader resolves.
- The delivery workflow's build job now carries `GH_TOKEN`, because the delivery-path contract verifies installed `gh release` fields and `gh` exited 4 without a token, which left the last three delivery runs red before packaging.
- `check-delivery-path.mjs` guards all three: the copy step after emission, the check step before packaging, and the build job token.
