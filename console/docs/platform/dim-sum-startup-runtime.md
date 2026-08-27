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

**There is no setting for this, and its absence is the contract rather than an oversight.** There is no opt-out control, no frequency preference, and no way to raise or lower the ten percent. A reader who never wants to see it is not offered a switch; what protects them instead is that the surface blocks nothing, takes no focus, and dismisses itself.

What a host supplies at the mount seam: `context`, including the shared School-mode state, and a `cacheReader` returning the private JSON text. What a packaging step supplies: the cache itself, produced and digest-verified before publication.

The two figures the surface uses are fixed in code and stated here so a changed one is visible in a diff: the winning interval is exactly ten percent of the uint32 range, and one draw is made per launch.

## Failure modes

A missing cache, malformed JSON, an unknown field, a repeated entry id, a malformed data URL, an oversized entry, an asset URL that is not a published `catalog-v1*` release asset, a missing decode proof, an unsupported catalogue revision, or a local image whose recomputed SHA-256 does not match its recorded digest all produce the same outcome: an unavailable diagnostic and no image. Nothing partial renders, and nothing is fetched to repair it — the renderer never calls the public catalogue and never downloads a release asset, so an invalid cache simply means no dish this launch.

Suppression is a separate thing from failure and must not be read as one. During School mode, first run, an active error, an active update or a mid-task state the draw does not happen at all, and what is reported to the mount callback says so **without naming or revealing a dish**, because a suppression message that named the hidden dim sum would defeat School mode's requirement that the whole capability behave as though it is not installed.

The attempt flag lives in the component instance, so a Strict Mode double-render or any other rerender cannot produce a second draw in one launch. Two draws in one launch would make the surface appear more often than the ten percent this article states.

## Verification

This is a mount-ready contract, and the honest boundary is that nothing here has been observed running. The parent surface still owns the final mount and the packaging step still owns cache production, so no launch of a built application has been watched to see a draw win, a dish render, or a suppression reported. There is no committed capture of this surface.

What does exist, stated exactly rather than generously: `console/tests/contracts/dim-sum-surprise.test.mjs` reads `app/renderer/src/dim-sum-surprise.ts` as source text and asserts the rules above appear in it. That is a source contract, not an execution — it can prove the ten-percent interval and the suppression list are written down, and it cannot prove either one runs.

The envelope validator itself lives in `console/shared/dim-sum.ts` and **no test in this tree reads it**. The one module that imports it is `app/renderer/src/dim-sum-surprise.tsx`, which is a second, larger file sitting beside the `.ts` the contract test guards; the two arrived from different lanes and neither has been reconciled with the other. Until that is settled, a reader should treat "the validator refuses X" above as a statement about code nobody has run and nothing has checked.

The separate release code-name half of this feature is genuinely exercised: `console/tests/contracts/dim-sum-code-name.test.mjs` runs `scripts/dim-sum-code-name.mjs` against a loopback fixture server. That covers picking a dish name for a release, which is a different job from drawing one at startup.

## Suggested articles

[Dim sum surprise](dim-sum-surprise.md), [School mode](school-mode.md), and [Non-blocking notifications](non-blocking-notifications.md).
