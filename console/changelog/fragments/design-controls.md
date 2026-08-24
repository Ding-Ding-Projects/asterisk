## Shared control accessibility and action integrity

- Associate every shared control with an explicit label and expose current switch, segmented choice, picker, chip, numeric, text, file, and ordered-list state to assistive technology.
- Drive text and path editability from explicit control metadata, provide real text and file inputs, and describe browse capabilities or their exact unavailable reason.
- Require target-backed controls to identify their source provenance and explain why an unavailable value is disabled.
- Run action controls only through their supplied action handler, without changing a stored value first or reporting a decorative success.
- Give each select and picker its own local filter plus an adjacent anchored regex builder with synchronized pattern, flags, validation, and plain-text default behavior.
- Keep native keyboard focus visible, use 48-pixel minimum interactive targets, wrap safely at narrow widths, and preserve honest unsupported capability states at high display scales.
