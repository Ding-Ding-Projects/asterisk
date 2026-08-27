# Automatic updates

The desktop updater checks the published release feed over HTTPS, validates one complete release identity, downloads the matching unsigned `Setup.exe`, checks its declared size and SHA-256 digest, and stages it for a user-directed restart.

## Behavior

Published releases use a monotonic package version `0.1.<run>`, beginning above `0.1.0`, and one immutable identity record. The public release tag remains `ding-pbx-console-v0.0.<run>-r<attempt>` for compatibility with existing `0.1.0` installations. The updater maps that legacy-compatible tag to package version `0.1.<run>` before comparing versions. A usable release carries exactly one stable `Ding-PBX-Console-Setup.exe`, one `RELEASES`, at least one version-bearing full `.nupkg`, `SHA256SUMS.txt`, and `release-identity.json`. The identity records the package version, candidate commit, release tag, artifact names, sizes, and SHA-256 values. A release is ignored when any record is missing, malformed, unpublished, duplicated, or inconsistent.

The installed version comes from the packaged `update-manifest.json`. Published packaging rejects any run whose bounded positive run number does not map exactly to package version `0.1.<run>`. A release is offered only when its package version is strictly newer. Local unpublished builds remain identifiable by their candidate commit and are never treated as published releases.

The desktop checks once at startup and on a bounded schedule. Only one check or download may be in flight. Metadata, identity, checksum text, and installer streams have finite response and per-read deadlines and bounded sizes. Temporary installer directories are owned by the updater, removed after every failed or superseded operation, and swept when the desktop starts.

## Restart and drafts

The ready banner is non-blocking and offers `Restart to install update` and `Later`. `Later` hides the banner without deleting the staged installer. A manual check or the next scheduled check may reveal the preserved ready state again. A newer ready revision clears an older local spawn-error message, while a current failure remains visible. Restart uses an invoke-based acknowledgement. The main process has one installing latch, launches `Setup.exe` at most once, and quits only after the operating system acknowledges process spawn. A spawn failure stays visible and retryable.

PBX drafts disable restart. The renderer counts every loaded resource whose current draft differs from its last live read, including the resource currently being edited, and publishes that count through the main-process updater revision. The banner states the exact recovery route: review the draft, apply it, or discard it, then retry the restart. The updater never drops a draft to make installation convenient.

## Configuration and safety

Code signing is permanently prohibited. The package and update feed are intentionally unsigned, so the operating system may show an unknown-publisher or SmartScreen warning. Digest checking proves byte integrity only and never claims authenticity or signing.

## Pages-site equivalent

The static delivery workspace at `history.html` reads the versioned release-manifest equivalent. A valid available record needs a full commit identifier, a version and tag, immutable HTTPS asset URLs, positive byte sizes, and SHA-256 hashes. The page reports `unavailable`, `available`, `downloading`, `ready`, or `failed` only when that schema validates. It offers a normal browser reload, but a hosted page cannot install or restart the desktop application, so it never claims that an update was downloaded, staged, or applied.

## Failure modes

Malformed packaged identity, an older or equal package version, incomplete release assets, missing checksum lines, inconsistent artifact sizes or digests, response-header timeout, stream-read timeout, bounded-size overflow, temporary-file failure, and installer-spawn failure remain visible as retryable updater states. A failed or superseded download is removed from its updater-owned temporary directory.

## Accessibility and localization

The banner is a keyboard-operable, screen-reader-named non-blocking status surface with visible focus, a pending state, a disabled restart control while drafts exist, and explicit retry copy after spawn failure. The successful installer spawn is acknowledged to the renderer before application quit is scheduled, while a failure keeps the current session open. It avoids claiming that a download is running while a staged installer is merely ready. The product's language and localization surfaces own the final copy.

## The published website

The documentation website has its own deployed-version watch, and it is a genuinely different mechanism rather than the desktop updater running somewhere else. A page installs nothing, so the contract is read for what it is for: notice that what is published has moved on, say so without interrupting anybody, and let the person take the new one when they choose. Reloading is the whole installation step.

**Four canonical clauses have no equivalent on a page and are stated on the settings card rather than faked: there is no staged download, no signature to verify, no restart, and nothing to roll back.** Saying so is the point. A silent gap reads as an oversight to the next person and as a decision to nobody.

`site/build.mjs` resolves one build identity per deploy: the commit from `git rev-parse HEAD`, the verified release label this site documents (or `unversioned` when no release manifest resolved), and the build time. It bakes those three values into `SITE_BUILD_VERSION`, `SITE_BUILD_COMMIT` and `SITE_BUILD_AT` in the published `app.js`, and publishes the same three as `version.json` beside the pages. A build that cannot name its own commit writes **neither** — no baked identity and no manifest — so a page served straight out of the source directory reports itself unbuilt and never asks for a file nobody published. A request that fails reads as a site that is down; an honest "this page was not built" does not.

**The comparison is on the build commit and never on the version label.** Two builds of one release wear the same label, so a check resting on it reports `current` about a page that is not. The label is displayed and is otherwise used for one thing only: `compareBuildVersions` orders two `v0.1.N` labels so the wording can say `newer`, `older` or `rebuilt`, and returns `null` for anything else rather than guessing — because guessing an order is how a roll-back gets announced to somebody as an update.

`checkForUpdate()` runs once at startup and every thirty minutes. The address comes from `versionManifestUrl()`, which resolves `version.json` against the document and **refuses any result whose origin is not this document's own**. Everything else on this site is a bundled local asset, so the property worth being able to check is not that it asked for the right file but that it could not have asked somebody else's server. The request is `cache: 'no-store'` with `credentials: 'omit'`, bounded at 4096 bytes and abandoned after eight seconds. A second check while one is in flight is refused rather than queued. `parseVersionManifest()` refuses a body it cannot vouch for and says which check refused it — over the byte bound (applied before parsing, so it holds whatever the body turns out to be), unparseable, not an object, an unreadable schema version, an unusable version label, a commit that is not forty lowercase hex characters, or a build time that is not a readable instant.

The banner is persistent and non-blocking, carries `role="status"` and `aria-live="polite"`, and states what reloading costs: settings are saved as they change, but anything typed into a field and not yet saved is lost. That is the whole unsaved-work protection a page can offer, and it is said rather than implied. `Later` is remembered against the exact commit it was said about and is persisted, so it survives moving to another page of the site; a newly published build is a different answer to a different question and raises the banner again. A newly available build is announced once however many times it is polled, and a background check that fails does so quietly — only a check somebody asked for reports back.

Nothing the manifest returns is ever written into a setting. `updatesDesc` carries four English and four Cantonese variants; the banner and status wording is rendered from the watch's own state rather than from `COPY`, because it is a factual report of two build identities rather than product prose, and every string in it still passes through the personal-vocabulary replacement.

**What this does not claim.** Nothing here has been driven in a real browser: no `fetch` has been made by a browser, no deploy has been observed raising the banner on a loaded page, and the whole feature is proved against its own extracted source, a recording page and a fake network, and no further. The pages-site inventory row therefore stays `unverified`: the implementation, its documentation, its localized copy and its local check all exist, and the two artifacts that need a running program — a built-artifact interaction record and a capture — do not.

## Verification boundary (desktop)

The website's own boundary is stated at the end of the section above; this one is about the desktop updater and nothing else. That lane intentionally did not run tests, lint, type checks, builds, packaging, desktop launch, UI interaction, or screen captures. The final handoff records the exact packaged regression seam that still needs the cheap Lowlevel headless route: a packaged Windows build with a valid unpublished manifest, a complete newer release identity, a mismatched digest, a malformed manifest, a preserved `Later` state, a duplicate restart activation, a spawn failure, and a PBX draft count above zero.

## Suggested articles

[Update evidence](../evidence/automatic-updates.md), [In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [App display name](app-display-name.md), [Platform feature index](README.md).
