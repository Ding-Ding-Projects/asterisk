/** Handwritten design-authored appearance targets required by the mounted shell. */
export const REQUIRED_APPEARANCE_ELEMENT_IDS = [
  'global-root',
  'console-shell',
  'window-minimize',
  'window-maximize',
  'window-close',
  'command-palette-open',
  'console-tab-strip',
  'console-panel',
  'command-palette',
  'appearance-editor',
] as const;

export const CONDITIONAL_APPEARANCE_ELEMENT_IDS = new Set(['command-palette', 'appearance-editor']);

export function missingAppearanceElementIds(ids: ReadonlySet<string>): string[] {
  return REQUIRED_APPEARANCE_ELEMENT_IDS.filter((id) => !CONDITIONAL_APPEARANCE_ELEMENT_IDS.has(id) && !ids.has(id));
}
