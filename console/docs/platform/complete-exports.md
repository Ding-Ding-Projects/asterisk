# Complete data export

Every record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.

## Behavior

Every list, document, log, and setting is meant to be exportable in an appropriate format — JSON, CSV, Markdown, and others depending on the data's shape — stating encoding and any fields a format cannot carry before the export runs.

## Configuration

Exports would be complete and, where the shape allows it, re-importable, rather than a partial dump of only the currently visible rows.

## Current status

**Desktop application:** Not implemented. No list, record, or setting anywhere in the desktop application can currently be exported to a file.

**Documentation website:** Implemented for current site-owned records. Documentation results and selected notifications use every suitable structured or tabular format. Shared site-state export includes every persisted setting and notification in JSON, and explicitly names omitted personal-vocabulary data, source metadata, and custom-logo bytes.

## Failure modes

Formats that cannot faithfully carry nested values are removed from the applicable picker, and remaining loss notes appear before export. Privacy-bound payloads are omitted only with an explicit field in the exported file describing the omission.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).
