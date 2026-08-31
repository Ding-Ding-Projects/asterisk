const PNG_ACCEPT = 'image/png,.png';

export const PNG_LOGO_PICKER_ACCEPT = PNG_ACCEPT;

/** Constrain the generated control model to what the packaged decoder can consume. */
export function constrainLogoPickerValues(groups: unknown): unknown {
  if (!Array.isArray(groups)) return groups;
  return groups.map((group) => {
    if (!group || typeof group !== 'object' || !Array.isArray((group as { ctls?: unknown }).ctls)) return group;
    const ctls = (group as { ctls: Array<Record<string, unknown>> }).ctls;
    return { ...group, ctls: ctls.map((control) => control.id === 'logo_pick' ? { ...control, accept: PNG_ACCEPT } : control) };
  });
}
