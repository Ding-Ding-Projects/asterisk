# App logo customization

Lets a user replace the application's displayed mark with a shipped preset or their own local image.

## Behavior

The shared logo contract defines three shipped presets, a local picker, crop, fit, focal point, safe area, and background metadata. The renderer runtime reads only the validated private cache and keeps the previous active mark when inspection, conversion, or caching fails.

## Configuration

`shared/logo.ts` validates PNG, JPEG, WebP, and static SVG signatures, dimensions, animation, SVG safety, crop ratios, output targets, and byte budgets before conversion. `control-plane/logo-store.ts` persists only independently inspected output bytes and redacted receipts below the private per-installation cache, with strict manifest keys, duplicate-key rejection, bounded manifest bytes, digest checks, crop-policy digests, and exact receipt relationships. No logo action accepts a URL. The declared `sharp` dependency is packaged beside an isolated decoder worker, which applies the focal point and safe-area insets to the encoded bytes, binds the normalized crop policy into every receipt, reopens every output, and only then permits the internal cache write.

## Current status

**Desktop application:** Privileged logo inspection, conversion, decoder-status, cache read/asset-read/clear actions, stored-cache peek, desktop local-file picker, generation-safe single-flight `LogoRuntime`, and the reachable `#surface=settings` route are wired. `sharp` runs in a suspended AppContainer child with no declared capabilities, under a Windows Job Object memory boundary, with monitored working-set, input/output, frame, pixel, target, aggregate, and full-pixel-reopen bounds enforced before cache replacement. Before `READY`, the supervisor and worker open and hash the worker module, launcher, recovery helper, lockfile, manifest, every Sharp JavaScript file, and every declared native file, reporting the first inaccessible path. The launcher requires exact `READY`, worker-PID, worker-exit, Job Object-cleanup, and cleanup-complete frames, passes only an explicit inheritable pipe list, grants read/execute access only to the packaged decoder resource and executable, restores each ACL in its own guarded cleanup attempt, deletes the profile, and reports cleanup failure only after all cleanup attempts. An independent recovery helper receives the per-run ACL and profile record when the supervisor cannot complete its terminal receipt. The baseline working-set sample is tagged to the worker PID and resets on PID change. The worker health status carries its revision, runtime version, native version, exact loaded native-binding digest, format capabilities, active JavaScript and native-file digests, locked-package integrity, and product-identity manifest digest. `npm run write:logo-manifest` fails when the native runtime set is absent, rejects uncommitted product inputs while allowing the known generated outputs, and binds the generated manifest to the source commit before a build can proceed. `npm run verify:logo-package` rejects missing or stale copied resources, placeholder identity, missing or extra runtime paths, a missing product identity, or a manifest digest mismatch. The checked-in registry remains partial until that supported build-time proof runs.

**Documentation website:** Partial. Every page exposes three presets, contain/fill choice, and local PNG/JPEG upload. The loader verifies the byte signature, bounds encoded bytes and decoded pixels, revalidates the cache, applies the mark live, and retains the prior valid mark after rejection. Full local decoder conversion remains unavailable on this surface.

## Failure modes

The desktop decoder startup framing is strict: the supervisor emits WORKER_PID, sends START only after binding the memory baseline to that worker, and accepts READY only after the worker has opened and hashed the complete manifest, lockfile, helper set, and native runtime set. Out-of-order frames are refused. A per-run record binds the supervisor path, command digest, creation and start tokens, worker identity, recovery-helper path and digest, ACL records, and a nonce. Cooperative cancellation precedes identity-bound native recovery, and recovery must return a nonce-matched RECOVERY_COMPLETE receipt proving worker exit, ACL restoration, profile deletion, record removal, and no orphan.

A malformed, spoofed, oversized, or over-dimension image is rejected before storage, with the previous valid logo staying active. Source filenames and file paths are not retained, and image bytes are omitted from site-state export with that omission stated.

## Accessibility and localization

The renderer lifecycle exposes state and recovery text for the UI mount, but this lane did not run tests, build, or capture verification. Copy remains English in the runtime seam until the owning UI lane mounts localization.

## Verification

Verification was not run in this lane. The concrete bridge paths are `logo:pick-file`, `logo.decoder.status`, `logo.inspect`, `logo.convert`, `logo.cache.peek-stored`, `logo.cache.read`, `logo.cache.asset.read`, and `logo.cache.clear`; `logo.cache.write` is internal-only. Narrow static failure fixtures cover malformed startup framing, placeholder identity, missing and extra packaged runtime paths, stale worker PID baselines, incomplete cleanup acknowledgements, and crop-policy digest mismatch. The packaged decoder and built-artifact interaction remain unverified, and conversion stays visibly unavailable until the exact supported package proof is present.

## Suggested articles

[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).
