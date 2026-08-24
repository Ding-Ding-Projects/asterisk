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

export function appearanceFamilyDefects(root: ParentNode): string[] {
  const defects: string[] = [];
  const checks: Array<[string, string]> = [
    ['[data-control-kind]', 'control-'],
    ['[role="tab"]', 'tab-'],
    ['[role="group"]:not([data-control-kind])', 'tab-group-'],
    ['[data-window-button]', 'window-'],
  ];
  for (const [selector, prefix] of checks) {
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const id = element.getAttribute('data-appearance-id') ?? '';
      if (!id.startsWith(prefix)) defects.push(`${selector} is missing the ${prefix} appearance id: ${id || 'none'}`);
    }
  }
  return defects;
}
