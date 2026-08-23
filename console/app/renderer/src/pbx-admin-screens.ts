import { ORDER, RAIL, SCREENS } from './generated/console';
import { PBX_FEATURES, type PbxFeatureDefinition } from './pbx-admin-model';
import { railForFeature } from './pbx-rail-mapping';

/**
 * Legacy fallback rail. Not registered unless a feature genuinely has nowhere else to
 * go — see `registerPbxAdminScreens` below. Kept as a name so a leftover, unmigrated
 * feature has somewhere honest to land rather than silently vanishing from navigation.
 */
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
 * Features that already have a real, live Ding destination (`delegateScreen`) are not
 * registered as a second screen at all — that would be exactly the duplicate-page
 * outcome the migration exists to avoid. Their capability lives entirely on the
 * existing destination; `PbxAdminIntegratedApp` only needs to redirect a screen id
 * that this function actually registered.
 */
function isMerged(feature: PbxFeatureDefinition): boolean {
  return !!feature.delegateScreen;
}

/**
 * Registers the Asterisk-backed FreePBX feature catalogue directly onto the console's
 * real rails. This is intentionally data-only: no generated renderer file is edited,
 * no parallel React shell is mounted, and every control later supplied for these
 * screens is rendered by the exact same `M3Control` path as the original design
 * reference.
 *
 * There is no single "PBX Admin" tab. Every feature that is not already merged into
 * an existing destination is placed on the real rail (`pbx`, `media`, `data`, `sys`)
 * that a person would actually look under — see `pbx-rail-mapping.ts` for the
 * per-feature judgement. `PBX_ADMIN_RAIL` is registered only as a fallback, and only
 * for a feature this pass could not place; if that ever happens the rail exists
 * specifically so the feature stays reachable rather than disappearing.
 */
export function registerPbxAdminScreens(): void {
  const rails = RAIL as Array<Record<string, unknown>>;
  const screens = SCREENS as unknown as Record<string, Record<string, unknown>>;
  const order = ORDER as unknown as string[];

  const knownRailIds = new Set(rails.map((rail) => rail.id));
  let usedFallback = false;

  for (const feature of PBX_FEATURES) {
    if (isMerged(feature)) continue; // real destination already exists — nothing to register

    const id = advancedScreenId(feature);
    const rail = knownRailIds.has(railForFeature(feature)) ? railForFeature(feature) : PBX_ADMIN_RAIL;
    if (rail === PBX_ADMIN_RAIL) usedFallback = true;

    if (!screens[id]) {
      screens[id] = {
        rail,
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

  if (usedFallback && !rails.some((rail) => rail.id === PBX_ADMIN_RAIL)) {
    rails.push({
      id: PBX_ADMIN_RAIL,
      icon: 'admin_panel_settings',
      label: 'PBX Admin',
      groupLabel: 'PBX administration',
      groupDesc: 'Features not yet routed into a real rail. This list should be empty.',
    });
  }
}
