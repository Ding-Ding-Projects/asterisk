# Changelog fragment: bounded app-logo conversion

## Unreleased

- Fixed direct logo conversion so complete packaged-product identity validation runs before the worker starts or conversion reaches the cache handoff. Missing, stale, replaced, and mismatched identity manifests are refused.
- Added shared app-logo contracts for shipped presets, a semantic local image picker, signature-first inspection, safe static SVG handling, bounded crop models, contrast warnings, conversion receipts, and stable package identity.
- Added a control-plane conversion boundary that requires an isolated decoder, independently validates every output, and preserves the previous logo when conversion fails.
- Added a schema-versioned local cache that stores only converted assets and redacted receipts, with clear and reset purge operations.
- Added a mount-ready renderer surface with keyboard-editable crop, focal-point, fit, background, preset, upload, status, and reset controls.

Verification state: implementation contracts are ready for the integration lane. Decoder registration, dispatcher mounting, focused tests, packaged interaction, and captures remain unverified until that lane runs them.

