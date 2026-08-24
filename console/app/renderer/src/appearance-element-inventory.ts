/** Handwritten design-authored appearance targets required by the mounted shell. */
export const REQUIRED_APPEARANCE_ELEMENT_IDS = [
  'global-root', 'console-shell', 'window-minimize', 'window-maximize', 'window-close',
  'command-palette-open', 'console-tab-strip', 'console-panel',
] as const;

export type AppearanceMountedState = 'shell' | 'palette' | 'appearance' | 'palette-appearance';

/** Exact static sets are handwritten per mounted state. Dynamic targets are added from
 * the generated model and checked against the declared families below. */
export const EXPECTED_APPEARANCE_IDS_BY_STATE: Readonly<Record<AppearanceMountedState, ReadonlySet<string>>> = {
  shell: new Set(REQUIRED_APPEARANCE_ELEMENT_IDS),
  palette: new Set([...REQUIRED_APPEARANCE_ELEMENT_IDS, 'command-palette']),
  appearance: new Set([...REQUIRED_APPEARANCE_ELEMENT_IDS, 'appearance-editor']),
  'palette-appearance': new Set([...REQUIRED_APPEARANCE_ELEMENT_IDS, 'command-palette', 'appearance-editor']),
};

export const REQUIRED_APPEARANCE_ID_FAMILIES = ['control-', 'tab-', 'tab-group-', 'palette-row-', 'palette-control-', 'window-', 'direct-'] as const;
export const CONDITIONAL_APPEARANCE_ID_FAMILIES = new Set(['palette-row-', 'palette-control-', 'tab-group-']);
export const DIRECT_INTERACTIVE_APPEARANCE_ID_PREFIX = 'direct-';
const DYNAMIC_ID_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['control-', /^control-[A-Za-z0-9._:-]+$/u], ['tab-', /^tab-[A-Za-z0-9._:-]+$/u],
  ['tab-group-', /^tab-group-[A-Za-z0-9._:-]+$/u], ['palette-row-', /^palette-row-[A-Za-z0-9._:-]+$/u],
  ['palette-control-', /^palette-control-[A-Za-z0-9._:-]+$/u],
  ['direct-', /^direct-[A-Za-z0-9._:-]+(?:-[A-Za-z0-9._:-]+)*$/u],
  ['window-', /^window-[A-Za-z0-9._:-]+$/u],
];

export function observedAppearanceElementIds(root: ParentNode): Set<string> {
  const ids = new Set<string>();
  const documentRoot = (root as Document).documentElement;
  const rootId = documentRoot?.getAttribute('data-appearance-id');
  if (rootId) ids.add(rootId);
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-appearance-id]'))) {
    const id = element.getAttribute('data-appearance-id');
    if (id) ids.add(id);
  }
  return ids;
}

function dynamicIdIsDeclared(id: string): boolean { return DYNAMIC_ID_PATTERNS.some(([, pattern]) => pattern.test(id)); }

export function appearanceInventoryDefects(root: ParentNode, state: AppearanceMountedState, expectedDynamicIds: ReadonlySet<string> = new Set()): string[] {
  const expected = EXPECTED_APPEARANCE_IDS_BY_STATE[state];
  const observed = observedAppearanceElementIds(root);
  const defects: string[] = [];
  for (const id of expected) if (!observed.has(id)) defects.push(`Mounted state ${state} is missing expected appearance id ${id}.`);
  for (const id of expectedDynamicIds) if (!observed.has(id)) defects.push(`Mounted state ${state} is missing generated appearance id ${id}.`);
  for (const id of observed) {
    if (expected.has(id) || expectedDynamicIds.has(id)) continue;
    if (dynamicIdIsDeclared(id) && !id.startsWith(DIRECT_INTERACTIVE_APPEARANCE_ID_PREFIX)) defects.push(`Mounted state ${state} rendered an unregistered dynamic appearance id ${id}.`);
    else defects.push(`Mounted state ${state} rendered unexpected appearance id ${id}.`);
  }
  return defects;
}

export function missingAppearanceElementIds(ids: ReadonlySet<string>): string[] {
  return REQUIRED_APPEARANCE_ELEMENT_IDS.filter((id) => !ids.has(id));
}

export function appearanceFamilyDefects(root: ParentNode): string[] {
  const defects: string[] = [];
  for (const prefix of REQUIRED_APPEARANCE_ID_FAMILIES) {
    const matches = root.querySelectorAll(`[data-appearance-id^="${prefix}"]`);
    if (matches.length === 0 && !CONDITIONAL_APPEARANCE_ID_FAMILIES.has(prefix)) defects.push(`No rendered target exposes the required ${prefix} appearance-id family.`);
  }
  const checks: Array<[string, string]> = [
    ['[data-control-kind]:not([data-palette-control="true"])', 'control-'],
    ['[data-control-kind][data-palette-control="true"]', 'palette-control-'],
    ['[data-direct-interactive]', 'direct-'],
    ['[role="tab"]', 'tab-'],
    ['[role="group"]:not([data-control-kind])', 'tab-group-'], ['[data-window-button]', 'window-'],
  ];
  for (const [selector, prefix] of checks) {
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const id = element.getAttribute('data-appearance-id') ?? '';
      if (!id.startsWith(prefix)) defects.push(`${selector} is missing the ${prefix} appearance id: ${id || 'none'}`);
    }
  }
  return defects;
}
