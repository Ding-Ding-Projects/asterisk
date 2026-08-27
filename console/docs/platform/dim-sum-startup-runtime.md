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

There is deliberately very little, and the absences are the interesting part.

- **No opt-out.** The surprise cannot be disabled. There is no setting for it, and a stored
  preference from an older profile does not resurrect one — an old profile simply rejoins the
  draw. This is a decision recorded here so nobody re-adds the switch as a courtesy.
- **No frequency dial.** The winning interval is exactly ten percent of the uint32 range, from
  one fresh cryptographically secure draw per launch. It is not seeded, not tunable, and cannot
  fire twice in a launch because the attempt flag lives in the component instance rather than in
  module scope, where Strict Mode or a rerender would clear it.
- **The cache reader.** The one real seam. A host supplies `cacheReader`, which returns the
  private JSON text, and `context`, which carries the shared School-mode state. The renderer
  never reaches the public catalogue and never downloads an asset, so the host's cache is the
  only source of a dish.
- **Dismissal interval** is the configured short interval on the registration, and the surface
  dismisses itself; it is non-blocking and takes no focus regardless.

## Failure modes

- A missing or invalid cache produces an unavailable diagnostic and no image. It never falls
  back to a fetch, a bundled sample, or a dish name with no picture.
- Validation fails closed on unknown fields, repeated entry ids, malformed data URLs, oversized
  bytes, a non-published asset URL, missing decode proof, or an unsupported revision. Each local
  image digest is recomputed with Web Crypto before selection, so a cache whose bytes no longer
  match its manifest is rejected rather than shown.
- A suppressed draw — School mode, first run, an active error, an active update, a mid-task
  state — is reported to the mount callback and never names or reveals a hidden dish. Under
  School mode that is load-bearing: a message naming the thing being hidden would defeat the
  mode it is obeying.

## Verification

Nothing here has been run. This article describes a mount-ready contract; the parent surface
still owns the final mount and the packaging step still owns cache production, so there is no
launch in which the draw has actually happened, no validated cache in this tree, and no capture.
The ten-percent figure is the interval the code computes, not a rate anyone has observed.

## Suggested articles

[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).
