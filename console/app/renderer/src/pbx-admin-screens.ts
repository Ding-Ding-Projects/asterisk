import { ORDER, RAIL, SCREENS } from './generated/console';
import { PBX_FEATURES, type PbxFeatureDefinition } from './pbx-admin-model';

export const PBX_ADMIN_RAIL = 'pbx-admin';
export const PBX_ADMIN_SCREEN_PREFIX = 'pbx-admin-';

const GROUP_ICON: Readonly<Record<PbxFeatureDefinition['group'], string>> = {
  Applications: 'apps',
  Connectivity: 'cable',
  Administration: 'admin_panel_settings',
  Reports: 'monitoring',
  Settings: 'tune',
};

export function advancedScreenId(feature: PbxFeatureDefinition): string {
  return `${PBX_ADMIN_SCREEN_PREFIX}${feature.id}`;
}

export function featureForAdvancedScreen(screen: string): PbxFeatureDefinition | undefined {
  if (!screen.startsWith(PBX_ADMIN_SCREEN_PREFIX)) return undefined;
  const id = screen.slice(PBX_ADMIN_SCREEN_PREFIX.length);
  return PBX_FEATURES.find((feature) => feature.id === id);
}

/**
 * Registers the Asterisk-backed FreePBX feature catalogue with the already-compiled
 * console shell. This is intentionally data-only: no generated renderer file is edited,
 * no parallel React shell is mounted, and every control later supplied for these screens
 * is rendered by the exact same `M3Control` path as the original design reference.
 */
export function registerPbxAdminScreens(): void {
  const rails = RAIL as Array<Record<string, unknown>>;
  if (!rails.some((rail) => rail.id === PBX_ADMIN_RAIL)) {
    rails.push({
      id: PBX_ADMIN_RAIL,
      icon: 'admin_panel_settings',
      label: 'PBX Admin',
      groupLabel: 'PBX administration',
      groupDesc: 'Asterisk-backed applications, connectivity, administration, reports and settings.',
    });
  }

  const screens = SCREENS as unknown as Record<string, Record<string, unknown>>;
  const order = ORDER as unknown as string[];

  for (const feature of PBX_FEATURES) {
    const id = advancedScreenId(feature);
    if (!screens[id]) {
      screens[id] = {
        rail: PBX_ADMIN_RAIL,
        icon: GROUP_ICON[feature.group],
        label: feature.label,
        badge: '',
        title: feature.label,
        file: 'PBX Admin',
        kind: 'generic',
        sub: feature.description,
        groups: [],
      };
    }
    if (!order.includes(id)) order.push(id);
  }
}
