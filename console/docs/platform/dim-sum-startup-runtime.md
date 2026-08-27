# Dim-sum startup runtime cache

This article describes the mount-ready runtime contract for the dim-sum startup surprise. The parent surface still owns the final mount and the package step owns cache production.

## Behavior

The renderer makes one fresh cryptographically secure random draw per launch. The winning interval is exactly ten percent of the uint32 range. A winning draw selects one entry from a validated private application-data cache and shows the cache's local image bytes with the authoritative English and Traditional Chinese names. The surface is non-blocking, does not take focus, respects reduced motion, and dismisses itself after the configured short interval. There is no opt-out control.

The draw is suppressed during School mode, first run, an active error, an active update, or a mid-task state. Suppression is reported to the mount callback and never names or reveals a hidden dish. The attempt flag is held in the component instance so Strict Mode or a rerender cannot create a second draw in one launch.

## Cache contract

`console/shared/dim-sum.ts` validates the complete JSON envelope before any image bytes render. The envelope must identify the public `Ding-Ding-Projects/dim-sum-photos` catalog URL, an immutable catalog revision, its revision URL, and a published `catalog-v1*` release asset. Every entry carries exact bilingual names, the public asset identity and URL, a local data URL, its byte size and SHA-256 digest, and a static decode proof with MIME type and dimensions. The async validator recomputes each local image digest with Web Crypto before selection. Unknown fields, repeated entry ids, malformed data URLs, oversized bytes, non-published asset URLs, missing proof, and unsupported revisions fail closed.

The renderer reads only through the `DimSumCacheReader` seam. A missing or invalid cache produces an unavailable diagnostic and no image. The renderer never calls the public catalog, never downloads a release asset, and never invents a dish. The package or application-data owner must verify the image digest before publishing the cache and must retain the public catalog revision and asset identity for audit.

## Mount seam

`DIM_SUM_SURPRISE_REGISTRATION` identifies the `startup-overlay` mount, its non-blocking and focus-neutral behavior, its automatic dismissal, its no-opt-out contract, its cache boundary, and its cryptographically secure ten-percent draw. The host supplies `context`, including the shared School-mode state, and a `cacheReader` that returns the private JSON text.

## Configuration

There is no setting here, and that is the contract rather than an omission: the surprise
has no opt-out, so a control that turned it off would contradict the feature it belongs to.
`DIM_SUM_SURPRISE_REGISTRATION` records that no-opt-out boundary explicitly, so a later
surface cannot quietly add one.

What the host supplies at mount, none of it a reader's preference:

- **`context`**, including the shared School-mode state, which is one of the conditions
  that suppresses the draw.
- **`cacheReader`**, returning the private JSON text. The renderer reads only through this
  seam and has no route to the public catalogue of its own.
- **The dismissal interval**, a short fixed period after which the surface removes itself.

The ten-percent winning interval is a constant rather than a tunable. It is exactly ten
percent of the uint32 range, drawn once per launch, so nothing can make the surprise more
frequent than the contract states.

## Failure modes

A missing or invalid cache produces an unavailable diagnostic and no image. It never falls
back to a placeholder, a generated picture, or a dish name with nothing behind it, because
a dish shown without its photograph is exactly the invented content this feature is not
allowed to produce.

The envelope fails closed as a whole on an unknown field, a repeated entry id, a malformed
data URL, oversized bytes, a non-published asset URL, missing decode proof, or an
unsupported revision. Each local image digest is recomputed with Web Crypto before
selection, so an entry whose bytes no longer match its recorded digest is refused rather
than rendered.

Suppression is its own outcome rather than a failure. School mode, first run, an active
error, an active update and a mid-task state each suppress the draw, and the mount callback
is told that it was suppressed without being told which dish was hidden -- naming it would
leak the very capability School mode exists to conceal.

## Verification

Nothing here has been driven in a built artifact. The draw, the suppression conditions, the
envelope validator and the mount seam are described as they are written; no launch has been
observed winning or losing the draw, no cache has been produced by a package step, and no
surface has been photographed. The parent surface still owns the final mount and the package
step still owns cache production, so both halves remain unexercised end to end.

## Suggested articles

[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).
