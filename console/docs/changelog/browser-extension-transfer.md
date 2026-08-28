# Browser-extension transfer surfaces

## Browser-extension transfer surfaces

- Added typed extension handoff, transfer snapshot, command receipt, window-intent, and surface-registration contracts.
- Added distinct Start download, Downloading, and Download complete renderer surfaces with real-client request seams, exact observed progress fields, partial-result reporting, keyboard focus, accessible live regions, reduced-motion behavior, and narrow-layout styling.
- Added implementation documentation describing the preload/control-plane integration boundary and the deliberate no-simulation rule.

Verification for this fragment: this lane intentionally ran no tests, builds, runtime interaction, or captures, as its implementation article records under [Browser-extension download transfer surfaces](browser-extension-download-surfaces-implementation.md). No extension has submitted a handoff, and none of the three surfaces has been photographed.
