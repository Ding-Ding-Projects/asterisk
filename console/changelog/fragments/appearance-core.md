## Appearance runtime core

- Added a versioned local appearance model keyed by stable element identifier, interaction state, and property.
- Added per-property drafts, precise apply and reset scopes, named preset snapshots, strict import and export, and executable inverse actions after successful persistence.
- Added alpha-preserving color translation, continuous picker coordinates, gamut and clipping warnings, fixed contrast evidence, and a non-color rainbow marker with one global speed mapping and reduced-motion hue.
- Added explicit unsupported-capability records and privacy-safe logo rendering metadata that excludes raw assets, filenames, paths, cache keys, and network references.
- Added a mount-ready renderer adapter. Central surface wiring remains separate, so this change does not claim the controls are already mounted in the desktop interface.
- Verification note: this ultra-speed change did not run tests, lint, type checking, builds, packaging, runtime interaction, or screen captures.
