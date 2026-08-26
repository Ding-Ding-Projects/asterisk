/**
 * The text "Copy tab list to clipboard" puts on the clipboard.
 *
 * The compiled shell built this from `tabs.map(t => t.label).join('\n')`, but `tabs` is
 * an array of screen keys -- plain strings such as `'dash'` or `'endpoints'` -- never
 * objects with a `label` property. Every entry therefore read `undefined`, and the
 * clipboard ended up holding the literal word "undefined" once per open tab.
 *
 * Every other place this console shows a tab's name resolves it the same way: a
 * custom name from `tabNames` first, the destination's own compiled title second, and
 * the raw key only as a last resort (see the rename control and the tab context menu in
 * generated/console.tsx, which both use exactly this fallback chain). This mirrors that
 * chain rather than inventing a second one, so a renamed tab copies under its real name.
 */
export function tabListText(
  tabs: ReadonlyArray<string>,
  tabNames: Readonly<Record<string, string>>,
  titleFor: (key: string) => string | undefined,
): string {
  return tabs.map((key) => tabNames[key] || titleFor(key) || key).join('\n');
}
