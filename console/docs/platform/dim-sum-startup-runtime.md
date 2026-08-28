# Dim-sum startup runtime cache

This article describes the mount-ready runtime contract for the dim-sum startup surprise. The parent surface still owns the final mount and the package step owns cache production.

## Behavior

The renderer makes one fresh cryptographically secure random draw per launch. The winning interval is exactly ten percent of the uint32 range. A winning draw selects one entry from a validated private application-data cache and shows the cache's local image bytes with the authoritative English and Traditional Chinese names. The surface is non-blocking, does not take focus, respects reduced motion, and dismisses itself after the configured short interval. There is no opt-out control.

The draw is suppressed during School mode, first run, an active error, an active update, or a mid-task state. Suppression is reported to the mount callback and never names or reveals a hidden dish. The attempt flag is held in the component instance so Strict Mode or a rerender cannot create a second draw in one launch.

## Cache contract

`console/shared/dim-sum.ts` validates the complete JSON envelope before any image bytes render. The envelope must identify the public `Ding-Ding-Projects/dim-sum-photos` catalog URL, an immutable catalog revision, its revision URL, and a published `catalog-v1*` release asset. Every entry carries exact bilingual names, the public asset identity and URL, a local data URL, its byte size and SHA-256 digest, and a static decode proof with MIME type and dimensions. The async validator recomputes each local image digest with Web Crypto before selection. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, non-published asset URLs, missing proof, and unsupported revisions fail closed.

The renderer reads only through the `DimSumCacheReader` seam. A missing or invalid cache produces an unavailable diagnostic and no image. The renderer never calls the public catalog, never downloads a release asset, and never invents a dish. The package or application-data owner must verify the image digest before publishing the cache and must retain the public catalog revision and asset identity for audit.

## Configuration

There is deliberately almost nothing to configure, and the thing a reader looks for first is the thing that does not exist: there is no opt-out control, because the canonical contract says the surprise cannot be switched off. The ten-percent interval, the automatic dismissal, and the non-blocking behavior are fixed by the contract rather than by a preference.

What the host supplies at the mount seam is a `context` carrying the shared School-mode state and a `cacheReader` returning the private JSON text. The cache itself is produced by the package step, not by a setting, and it names its own catalog revision and published asset identity.

## Failure modes

A missing or invalid cache produces an unavailable diagnostic and no image; it never falls back to a dish chosen some other way. The validator fails closed on unknown fields, repeated entry ids, malformed data URLs, oversized bytes, a non-published asset URL, missing decode proof, and an unsupported revision, and it recomputes every local image digest before selection rather than trusting the recorded one.

A suppressed draw -- School mode, first run, an active error, an active update, a mid-task state -- is reported to the mount callback and never names or reveals a hidden dish, because saying which dish was withheld would defeat School mode's own contract.

## Verification

Nothing here has been observed at a real launch. The draw, the suppression rules, and the cache validator are proved against the shared module's own tests and no further: no packaged build has run the ten-percent draw, and no capture of the overlay exists.

## Mount seam

`DIM_SUM_SURPRISE_REGISTRATION` identifies the `startup-overlay` mount, its non-blocking and focus-neutral behavior, its automatic dismissal, its no-opt-out contract, its cache boundary, and its cryptographically secure ten-percent draw. The host supplies `context`, including the shared School-mode state, and a `cacheReader` that returns the private JSON text.

## Configuration

The one thing a host may vary is how long the surface stays up. `DimSumSurprise` takes
`autoDismissMs`, defaulting to `8_000` (`app/renderer/src/dim-sum-surprise.tsx:70`); the same timer
clears a diagnostic as well as a dish, so an unavailable cache does not leave a message on screen
forever.

Everything else is fixed on purpose, because each value is a promise the surface makes:

| Constant | Value | Why it is not a setting |
| --- | --- | --- |
| `DIM_SUM_DRAW_THRESHOLD` (`dim-sum-surprise.tsx:36`) | `floor(0x100000000 / 10)` | the stated ten percent, expressed over the exact uint32 range the draw comes from, so the published frequency and the code agree by construction |
| `DIM_SUM_CACHE_SCHEMA_VERSION` (`shared/dim-sum.ts:10`) | `1` | any other version fails closed rather than being read partly |
| `DIM_SUM_SOURCE_REPOSITORY`, `DIM_SUM_CATALOG_URL`, `DIM_SUM_PUBLISHED_ASSET_PREFIX` | the public photo repository, its raw catalog URL, and `catalog-v1` | a configurable source is a route to an unverified image |
| `DIM_SUM_CACHE_MAX_BYTES`, `…_MAX_ENTRIES`, `…_MAX_IMAGE_BYTES`, `…_MAX_IMAGE_DIMENSION` | 12 MiB, 256, 8 MiB, 8192 | bounds a malicious or corrupt cache must not be able to raise |

There is deliberately **no opt-out setting**, and adding one would be a regression rather than a
feature. The politeness is delivered by the surface never gating startup, never taking focus and
dismissing itself, not by a switch.

The cache itself is not configuration either: it is produced by the packaging or application-data
owner, digest-verified before publication, and read through `DimSumCacheReader`. The renderer has no
route that reaches the network.

## Failure modes

- **No cache, or a cache the validator refuses** — an unavailable diagnostic, no image, and nothing
  invented. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, a
  non-published asset URL, a missing decode proof and an unsupported revision all land here.
- **A digest that does not recompute** — the async validator hashes each local image with Web Crypto
  before selection, so an entry whose bytes no longer match its recorded SHA-256 is not shown.
- **A suppressed launch** — School mode, first run, an active error, an active update or a mid-task
  state. The mount callback is told it was suppressed, and is deliberately not told which dish it
  would have been: naming a hidden dish would defeat School mode's rule that dim-sum behaves as
  though it is not installed.
- **A rerender, or React Strict Mode's double invoke** — the attempt flag lives in the component
  instance, so a launch still gets exactly one draw rather than two.
- **A losing draw** — nine launches in ten. Nothing renders and nothing is reported as wrong.

## Verification

Source-level only, and the boundary is worth stating plainly because this surface is defined by a
random event.

- `shared/dim-sum.ts` and the renderer contract are covered by the repository's renderer suite
  (`npm run test:renderer`) and its type check, both of which drive the draw with a supplied value
  rather than a real random one — which is the only way a ten-percent branch is testable at all.
- No packaged launch has been observed winning the draw, so there is no built-artifact interaction
  record and no capture of the surface on screen. The inventory row stays `implemented-unverified`
  until one exists.
- The published cache has not been produced or verified here; that belongs to the packaging owner
  named above.

## Suggested articles

[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).
