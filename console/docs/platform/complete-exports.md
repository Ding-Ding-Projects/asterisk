# Complete data export

Every record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.

## Behavior

Every list, document, log, and setting is meant to be exportable in an appropriate format — JSON, CSV, Markdown, and others depending on the data's shape — stating encoding and any fields a format cannot carry before the export runs.

## Configuration

Exports would be complete and, where the shape allows it, re-importable, rather than a partial dump of only the currently visible rows.

## Current status

**Desktop application:** Partial but mounted for the real producer inventory. Table bulk exports, appearance JSON, changelog Markdown, tab JSON, group JSON, and all-tabs JSON produce typed latest-export records plus browser files. The external editor surface can open the latest record directly in the selected editor. Visual Studio Code has a separate explicit handoff action.

**Documentation website:** Partial. The site's settings page includes a placeholder export button that is not wired to produce a file yet.

## Failure modes

Where a chosen format cannot carry every field of a record, the export reports that before writing. History bundle export and row configuration export remain visible honest-unavailable controls because their real source data is not mounted. They do not create guessed files or fake latest-export records.

## Export producer inventory

| Producer | Result |
| --- | --- |
| Table bulk export | Typed latest-export record and browser file |
| Appearance JSON export | Typed latest-export record and browser file |
| Changelog Markdown export | Typed latest-export record and browser file |
| Tab JSON export | Typed latest-export record and browser file |
| Group JSON export | Typed latest-export record and browser file |
| All-tabs JSON export | Typed latest-export record and browser file |
| History bundle export | Honest unavailable state until local history data is mounted |
| Row configuration export | Honest unavailable state until completed local read-back exists |
| Wizard result action Export JSON or Export Markdown | Honest unavailable state until wizard result serialization is mounted |
| Allow export and Include appearance overrides in exports | Settings only, not producers |
| Scan surfaces Exports option | Scan scope only, not a producer |

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).
