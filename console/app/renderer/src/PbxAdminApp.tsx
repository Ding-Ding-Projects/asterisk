import { App } from './App';
import type { ControlPlaneResponse } from '../../../shared/control-plane';
import type { ConfigValue } from './configuration';
import {
  EXPECTED_CONFIGURABLE_RESOURCES,
  addEntry,
  addSection,
  removeEntry,
  removeSection,
  updateEntry,
  updateSectionName,
  validateConfigValue,
  type PbxFeatureDefinition,
} from './pbx-admin-model';
import { featureForAdvancedScreen, registerPbxAdminScreens } from './pbx-admin-screens';
import { lookupFieldControl } from '../../../control-plane/field-control-catalog';
import { SCREENS } from './generated/console';

registerPbxAdminScreens();

type AdminControl = Record<string, unknown> & { id: string; label: string; kind: string; value: unknown };
type AdminGroup = { title: string; desc: string; ctls: AdminControl[] };
type AdminPlan = {
  summary?: string;
  diffs?: Array<{ resource?: string; changedPaths?: string[] }>;
};
type HistoryEntry = { resource: string; handle: string; takenAt?: string; bytes: number };
type MediaFile = { name: string; path: string; extension: string; bytes: number };
type MediaRoot = 'prompts' | 'musicOnHold';

type StateValues = { screen: string; values: Record<string, unknown> };

const AUDIO_ACCEPT = '.wav,.gsm,.ulaw,.alaw,.g722,.sln,.sln16,.ogg,.opus';

function basename(resource: string): string {
  return resource.slice(resource.lastIndexOf('/') + 1);
}

function configKey(target: string, resource: string): string {
  return `${target}\u0000${resource}`;
}

function mediaKey(target: string, root: MediaRoot): string {
  return `${target}\u0000${root}`;
}

function actionControl(id: string, label: string, action: string, info?: string): AdminControl {
  return {
    id,
    label,
    kind: 'segmented',
    value: label,
    options: [label],
    action,
    ...(info ? { info } : {}),
  };
}

function textControl(id: string, label: string, value: string, info?: string): AdminControl {
  return { id, label, kind: 'text', value, ...(info ? { info } : {}) };
}

/**
 * Asterisk's own boolean spelling is exactly `yes`/`no` throughout these sample
 * files (see `control-keys.ts`'s own `YES_VALUES`/`NO_VALUES` for the same
 * convention used by the typed screens). Restricting the heuristic to that exact
 * pair — rather than also accepting `1`/`0`/`true`/`false`, which are legitimate
 * *numeric* or free-text values elsewhere in these configs — means a value is only
 * ever classified as boolean when it unambiguously already is one. Nothing is
 * guessed: the control kind is derived from the literal text actually read from the
 * target, never invented.
 */
function isAsteriskBoolean(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'yes' || v === 'no';
}

function parseAsteriskBoolean(value: string): boolean {
  return value.trim().toLowerCase() === 'yes';
}

function formatAsteriskBoolean(value: boolean): string {
  return value ? 'yes' : 'no';
}

function switchControl(id: string, label: string, value: boolean, info?: string): AdminControl {
  return { id, label, kind: 'switch', value, ...(info ? { info } : {}) };
}

function selectControl(id: string, label: string, value: string, options: ReadonlyArray<string>, action?: string): AdminControl {
  return { id, label, kind: 'select', value, options: [...options], ...(action ? { action } : {}) };
}

function segmentedControl(id: string, label: string, value: string, options: ReadonlyArray<string>, action?: string): AdminControl {
  return { id, label, kind: 'segmented', value, options: [...options], ...(action ? { action } : {}) };
}

function fileControl(id: string, label: string): AdminControl {
  return { id, label, kind: 'file', value: '', accept: AUDIO_ACCEPT };
}

/**
 * Product-integrated FreePBX-equivalent administration.
 *
 * The existing generated ConsoleShell remains the only shell and M3Control remains the
 * only form-control renderer. This subclass supplies live data and side effects for the
 * PBX Admin screens registered in `pbx-admin-screens.ts`; it never mounts a parallel UI,
 * never invokes a shell, and never accepts a resource path that did not come from the
 * checked-in feature catalogue / 47-resource allowlist.
 */
export class PbxAdminApp extends App {
  /* Base App installs these handlers as instance fields before derived fields run. Cast
   * through the base type so TypeScript does not mistake these captures for reads of the
   * derived overrides declared later in this class. */
  private readonly appControlAction = (this as App).onControlAction;
  private readonly appFilePicked = (this as App).onFilePicked;
  private readonly appFileCleared = (this as App).onFileCleared;
  private readonly appFileControlName = (this as App).fileControlName;
  private readonly appFileControlHasFile = (this as App).fileControlHasFile;

  private adminTargets: string[] = [];
  private adminTargetId = '';
  private adminDiscoveryPending = false;
  private adminReadPending = new Set<string>();
  private adminHistoryPending = new Set<string>();
  private adminMediaPending = new Set<string>();

  private adminLoaded = new Map<string, ConfigValue>();
  private adminDrafts = new Map<string, ConfigValue>();
  private adminPlans = new Map<string, AdminPlan>();
  private adminHistory = new Map<string, HistoryEntry[]>();
  private adminMedia = new Map<string, MediaFile[]>();
  private adminStatus = new Map<string, string>();
  private adminPickedFileNames = new Map<string, string>();
  private publishedDraftCount = -1;

  private adminRequest = async (action: string, extra: Record<string, unknown> = {}): Promise<ControlPlaneResponse | undefined> => {
    const bridge = window.dingDesktop;
    if (!bridge) return undefined;
    return bridge.controlPlane.request({ requestId: crypto.randomUUID(), action, ...extra } as never);
  };

  private stateValues(): StateValues {
    const state = this.state as unknown as Partial<StateValues>;
    return { screen: state.screen ?? '', values: state.values ?? {} };
  }

  private publishDraftCount(currentKey?: string, currentValue?: ConfigValue): void {
    if (currentKey && currentValue && this.adminLoaded.has(currentKey)) {
      this.adminDrafts.set(currentKey, currentValue);
    }
    let count = 0;
    for (const [key, draft] of this.adminDrafts) {
      const loaded = this.adminLoaded.get(key);
      if (!loaded) continue;
      const value = key === currentKey && currentValue ? currentValue : draft;
      if (JSON.stringify(value) !== JSON.stringify(loaded)) count += 1;
    }
    if (count === this.publishedDraftCount) return;
    this.publishedDraftCount = count;
    window.dingDesktop?.updater.setUnsavedDraftCount(count);
  }

  private featureResources(feature: PbxFeatureDefinition): ReadonlyArray<string> {
    if (feature.id === 'backup') return EXPECTED_CONFIGURABLE_RESOURCES;
    return feature.resources;
  }

  private selectedTarget(screen: string): string {
    const raw = String(this.stateValues().values[this.targetControlId(screen)] ?? this.adminTargetId ?? '');
    if (this.adminTargets.includes(raw)) return raw;
    return this.adminTargets[0] ?? '';
  }

  private selectedResource(screen: string, feature: PbxFeatureDefinition): string {
    const resources = this.featureResources(feature);
    if (resources.length === 0) return '';
    const raw = String(this.stateValues().values[this.resourceControlId(screen)] ?? basename(resources[0]!));
    return resources.find((resource) => basename(resource) === raw) ?? resources[0]!;
  }

  private selectedSectionIndex(screen: string, value: ConfigValue): number {
    if (value.length === 0) return -1;
    const current = String(this.stateValues().values[this.sectionControlId(screen)] ?? value[0]!.name);
    const index = value.findIndex((section) => section.name === current);
    return index >= 0 ? index : 0;
  }

  private selectedEntryIndex(screen: string, value: ConfigValue, sectionIndex: number): number {
    const entries = value[sectionIndex]?.entries ?? [];
    if (entries.length === 0) return -1;
    const options = entries.map((entry, index) => this.entryOption(entry.key, index));
    const current = String(this.stateValues().values[this.entryControlId(screen)] ?? options[0]);
    const index = options.indexOf(current);
    return index >= 0 ? index : 0;
  }

  private entryOption(key: string, index: number): string {
    return `${index + 1} · ${key || '(blank setting)'}`;
  }

  private targetControlId(screen: string) { return `pbxadm:${screen}:target`; }
  private resourceControlId(screen: string) { return `pbxadm:${screen}:resource`; }
  private sectionControlId(screen: string) { return `pbxadm:${screen}:section`; }
  private entryControlId(screen: string) { return `pbxadm:${screen}:entry`; }
  private sectionNameControlId(screen: string) { return `pbxadm:${screen}:section-name`; }
  private newSectionControlId(screen: string) { return `pbxadm:${screen}:new-section`; }
  private settingNameControlId(screen: string) { return `pbxadm:${screen}:setting-name`; }
  private newSettingKeyControlId(screen: string) { return `pbxadm:${screen}:new-key`; }
  private newSettingValueControlId(screen: string) { return `pbxadm:${screen}:new-value`; }
  private entryValueControlId(screen: string, sectionIndex: number, entryIndex: number) {
    return `pbxadm:${screen}:value:${sectionIndex}:${entryIndex}`;
  }
  private historyControlId(screen: string) { return `pbxadm:${screen}:history`; }
  private mediaRootControlId(screen: string) { return `pbxadm:${screen}:media-root`; }
  private mediaFileControlId(screen: string) { return `pbxadm:${screen}:media-file`; }
  private mediaUploadControlId(screen: string) { return `pbxadm:${screen}:media-upload`; }

  private clearAdminEditorValues(screen: string): void {
    const state = this.stateValues();
    const prefix = `pbxadm:${screen}:`;
    const keep = new Set([this.targetControlId(screen), this.resourceControlId(screen), this.mediaRootControlId(screen)]);
    const values = Object.fromEntries(Object.entries(state.values).filter(([key]) => !key.startsWith(prefix) || keep.has(key)));
    this.setState({ values } as never);
  }

  private materializeDraft(screen: string, target: string, resource: string): ConfigValue | undefined {
    const key = configKey(target, resource);
    const seed = this.adminDrafts.get(key) ?? this.adminLoaded.get(key);
    if (!seed) return undefined;
    const values = this.stateValues().values;
    return seed.map((section, sectionIndex) => ({
      name: section.name,
      entries: section.entries.map((entry, entryIndex) => {
        const id = this.entryValueControlId(screen, sectionIndex, entryIndex);
        const raw = values[id];
        if (isAsteriskBoolean(entry.value)) {
          const current = typeof raw === 'boolean' ? raw : parseAsteriskBoolean(entry.value);
          return { key: entry.key, value: formatAsteriskBoolean(current) };
        }
        return { key: entry.key, value: String(raw ?? entry.value) };
      }),
    }));
  }

  private setDraft(screen: string, target: string, resource: string, value: ConfigValue, status: string): void {
    const key = configKey(target, resource);
    this.adminDrafts.set(key, value);
    this.adminPlans.delete(key);
    this.adminStatus.set(screen, status);
    this.clearAdminEditorValues(screen);
    this.forceUpdate();
  }

  private discoverAdminTargets = async (): Promise<void> => {
    if (this.adminDiscoveryPending) return;
    this.adminDiscoveryPending = true;
    const response = await this.adminRequest('server.list');
    this.adminDiscoveryPending = false;
    if (!response?.ok) {
      this.adminTargets = [];
      this.adminTargetId = '';
      const message = response?.message ?? 'The desktop control plane did not answer target discovery.';
      this.adminStatus.set(this.stateValues().screen, message);
      this.fire('PBX targets not read', message);
      this.forceUpdate();
      return;
    }
    const data = response.data as { wsl?: string[] | { unavailable?: string } };
    const targets = Array.isArray(data.wsl) ? data.wsl.filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
    this.adminTargets = targets;
    this.adminTargetId = targets.includes(this.adminTargetId) ? this.adminTargetId : targets[0] ?? '';
    const screen = this.stateValues().screen;
    if (targets.length === 0) {
      const reason = Array.isArray(data.wsl) ? 'No local WSL PBX target was discovered.' : data.wsl?.unavailable ?? 'No PBX target was discovered.';
      this.adminStatus.set(screen, reason);
    } else {
      this.adminStatus.set(screen, `${targets.length} PBX target${targets.length === 1 ? '' : 's'} discovered. Nothing has been changed.`);
    }
    this.forceUpdate();
  };

  private loadAdminConfig = async (screen: string, feature: PbxFeatureDefinition, force = false): Promise<void> => {
    const target = this.selectedTarget(screen);
    const resource = this.selectedResource(screen, feature);
    if (!target || !resource) return;
    const key = configKey(target, resource);
    if (!force && this.adminLoaded.has(key)) return;
    if (this.adminReadPending.has(key)) return;
    this.adminReadPending.add(key);
    this.adminStatus.set(screen, `Reading ${basename(resource)} from ${target}…`);
    this.forceUpdate();
    const response = await this.adminRequest('pbx.config', { serverId: target, payload: { resource } });
    this.adminReadPending.delete(key);
    if (!response?.ok) {
      const message = response?.message ?? `${resource} could not be read.`;
      this.adminStatus.set(screen, message);
      this.fire('Configuration not read', message);
      this.forceUpdate();
      return;
    }
    const value = (response.data as { value?: ConfigValue }).value ?? [];
    this.adminLoaded.set(key, value);
    this.adminDrafts.set(key, value);
    this.adminPlans.delete(key);
    this.clearAdminEditorValues(screen);
    this.adminStatus.set(screen, `${resource} was read from ${target}. Edit a control, then preview before applying.`);
    this.forceUpdate();
  };

  private loadAdminHistory = async (screen: string, feature: PbxFeatureDefinition, force = false): Promise<void> => {
    const target = this.selectedTarget(screen);
    const resource = this.selectedResource(screen, feature);
    if (!target || !resource) return;
    const key = configKey(target, resource);
    if (!force && this.adminHistory.has(key)) return;
    if (this.adminHistoryPending.has(key)) return;
    this.adminHistoryPending.add(key);
    const response = await this.adminRequest('history.list', { serverId: target, payload: { resource } });
    this.adminHistoryPending.delete(key);
    if (!response?.ok) {
      const message = response?.message ?? 'Recovery points could not be read.';
      this.adminStatus.set(screen, message);
      this.forceUpdate();
      return;
    }
    this.adminHistory.set(key, (response.data as { entries?: HistoryEntry[] }).entries ?? []);
    this.forceUpdate();
  };

  private mediaRoot(screen: string): MediaRoot {
    const value = String(this.stateValues().values[this.mediaRootControlId(screen)] ?? 'Prompts');
    return value === 'Music on hold' ? 'musicOnHold' : 'prompts';
  }

  private loadAdminMedia = async (screen: string, force = false): Promise<void> => {
    const target = this.selectedTarget(screen);
    if (!target) return;
    const root = this.mediaRoot(screen);
    const key = mediaKey(target, root);
    if (!force && this.adminMedia.has(key)) return;
    if (this.adminMediaPending.has(key)) return;
    this.adminMediaPending.add(key);
    const response = await this.adminRequest('media.list', { serverId: target, payload: { root } });
    this.adminMediaPending.delete(key);
    if (!response?.ok) {
      const message = response?.message ?? 'The target media library could not be read.';
      this.adminStatus.set(screen, message);
      this.forceUpdate();
      return;
    }
    this.adminMedia.set(key, (response.data as { files?: MediaFile[] }).files ?? []);
    this.forceUpdate();
  };

  private refreshAdminScreen = async (screen: string, feature: PbxFeatureDefinition): Promise<void> => {
    if (this.adminTargets.length === 0) {
      await this.discoverAdminTargets();
      if (this.adminTargets.length === 0) return;
    }
    if (this.featureResources(feature).length > 0) {
      await this.loadAdminConfig(screen, feature);
      await this.loadAdminHistory(screen, feature);
    }
    if (feature.tools?.includes('media')) await this.loadAdminMedia(screen);
  };

  componentDidUpdate() {
    super.componentDidUpdate();
    const screen = this.stateValues().screen;
    const feature = featureForAdvancedScreen(screen);
    if (feature) void this.refreshAdminScreen(screen, feature);
  }

  private prepareAdminScreen(screen: string, feature: PbxFeatureDefinition): void {
    const screens = SCREENS as unknown as Record<string, { groups?: AdminGroup[] }>;
    const target = this.selectedTarget(screen);
    const resources = this.featureResources(feature);
    const resource = this.selectedResource(screen, feature);
    const key = target && resource ? configKey(target, resource) : '';
    const draft = target && resource ? this.materializeDraft(screen, target, resource) : undefined;
    const plan = key ? this.adminPlans.get(key) : undefined;
    const history = key ? this.adminHistory.get(key) ?? [] : [];
    const status = this.adminStatus.get(screen) ?? 'Nothing has been changed.';
    const groups: AdminGroup[] = [];

    const targetCtls: AdminControl[] = [];
    if (this.adminTargets.length > 0) {
      targetCtls.push(selectControl(this.targetControlId(screen), 'PBX target', target || this.adminTargets[0]!, this.adminTargets, 'pbxadmin-target'));
    }
    targetCtls.push(actionControl(`pbxadm:${screen}:discover`, 'Discover PBX targets', 'pbxadmin-discover'));
    groups.push({ title: 'Target', desc: status, ctls: targetCtls });

    if (resources.length > 0) {
      const resourceOptions = resources.map(basename);
      const configCtls: AdminControl[] = [
        selectControl(this.resourceControlId(screen), 'Asterisk resource', resource ? basename(resource) : resourceOptions[0] ?? '', resourceOptions, 'pbxadmin-resource'),
        actionControl(`pbxadm:${screen}:read`, 'Read target configuration', 'pbxadmin-read'),
      ];
      groups.push({
        title: 'Configuration source',
        desc: resource ? `${resource}. Values below come only from the selected target; no sample configuration is inserted.` : 'This feature is not backed by a configuration resource.',
        ctls: configCtls,
      });
    }

    if (draft) {
      draft.forEach((section, sectionIndex) => {
        const ctls = section.entries.map((entry, entryIndex) => {
          const id = this.entryValueControlId(screen, sectionIndex, entryIndex);
          const label = entry.key || '(blank setting name)';
          const info = `${resource} · [${section.name || 'global'}] · occurrence ${entryIndex + 1}`;
          // Asterisk's own yes/no spelling is an unambiguous boolean — render it as a
          // real switch instead of a free-text box for "yes"/"no".
          if (isAsteriskBoolean(entry.value)) {
            return switchControl(id, label, parseAsteriskBoolean(entry.value), info);
          }
          // Beyond booleans, `field-control-catalog.ts` carries every closed, single-value
          // set that the resource's own sample file documents for this exact key (an IAX2
          // `amaflags`, a fax `maxrate`, ...). When one exists, offer exactly those values
          // as a real select rather than a text box — and when the value currently on disk
          // is not among them (an old/foreign edit), fall through to text so nothing is
          // silently coerced into an option that was never actually there.
          const enumField = resource ? lookupFieldControl(basename(resource), entry.key) : undefined;
          if (enumField && (entry.value.length === 0 || enumField.options.includes(entry.value))) {
            const control = selectControl(id, label, entry.value || enumField.options[0]!, enumField.options);
            return { ...control, info };
          }
          return textControl(id, label, entry.value, info);
        });
        groups.push({
          title: section.name ? `[${section.name}]` : 'Global settings',
          desc: `${section.entries.length} setting${section.entries.length === 1 ? '' : 's'} read in file order. Repeated keys stay repeated and ordered.`,
          ctls: ctls.length > 0 ? ctls : [actionControl(`pbxadm:${screen}:empty-add`, 'Add a setting to this section', 'pbxadmin-add-setting')],
        });
      });

      const structureCtls: AdminControl[] = [];
      const sectionIndex = this.selectedSectionIndex(screen, draft);
      if (draft.length > 0 && sectionIndex >= 0) {
        const section = draft[sectionIndex]!;
        const sectionOptions = draft.map((candidate) => candidate.name);
        structureCtls.push(selectControl(this.sectionControlId(screen), 'Selected section', section.name, sectionOptions, 'pbxadmin-select-section'));
        structureCtls.push(textControl(this.sectionNameControlId(screen), 'Section name', section.name));
        structureCtls.push(actionControl(`pbxadm:${screen}:rename-section`, 'Rename selected section', 'pbxadmin-rename-section'));
        structureCtls.push(actionControl(`pbxadm:${screen}:remove-section`, 'Remove selected section', 'pbxadmin-remove-section'));

        const entries = section.entries;
        if (entries.length > 0) {
          const entryIndex = this.selectedEntryIndex(screen, draft, sectionIndex);
          const entry = entries[entryIndex]!;
          const options = entries.map((candidate, index) => this.entryOption(candidate.key, index));
          structureCtls.push(selectControl(this.entryControlId(screen), 'Selected setting', this.entryOption(entry.key, entryIndex), options, 'pbxadmin-select-setting'));
          structureCtls.push(textControl(this.settingNameControlId(screen), 'Setting name', entry.key));
          structureCtls.push(actionControl(`pbxadm:${screen}:rename-setting`, 'Rename selected setting', 'pbxadmin-rename-setting'));
          structureCtls.push(actionControl(`pbxadm:${screen}:remove-setting`, 'Remove selected setting', 'pbxadmin-remove-setting'));
        }

        structureCtls.push(textControl(this.newSettingKeyControlId(screen), 'New setting name', ''));
        structureCtls.push(textControl(this.newSettingValueControlId(screen), 'New setting value', ''));
        structureCtls.push(actionControl(`pbxadm:${screen}:add-setting`, 'Add setting', 'pbxadmin-add-setting'));
      }
      structureCtls.push(textControl(this.newSectionControlId(screen), 'New section name', ''));
      structureCtls.push(actionControl(`pbxadm:${screen}:add-section`, 'Add section', 'pbxadmin-add-section'));
      groups.push({
        title: 'Structure',
        desc: 'Section and setting creation/removal use the same structured ConfigValue model as the transaction engine; no raw file editor or shell is exposed.',
        ctls: structureCtls,
      });

      const changed = Boolean(key && draft && this.adminLoaded.has(key) && JSON.stringify(draft) !== JSON.stringify(this.adminLoaded.get(key)));
      this.publishDraftCount(typeof key === 'string' ? key : undefined, draft);
      const planDiffs = plan?.diffs?.length ?? 0;
      groups.push({
        title: 'Review & apply',
        desc: plan
          ? (planDiffs === 0 ? 'The latest live preview found no difference.' : `${plan.summary ?? 'Change plan'} · ${planDiffs} resource difference${planDiffs === 1 ? '' : 's'}.`)
          : (changed ? 'Unsaved edits exist. Preview them against the live target before Apply is allowed.' : 'No unsaved difference is present.'),
        ctls: [
          actionControl(`pbxadm:${screen}:preview`, 'Preview live diff', 'pbxadmin-preview'),
          actionControl(`pbxadm:${screen}:apply`, 'Apply previewed change', 'pbxadmin-apply', 'Apply is gated by the console confirmation flow and the control plane re-plans against the live target before writing.'),
          actionControl(`pbxadm:${screen}:reset`, 'Discard local edits', 'pbxadmin-reset'),
        ],
      });

      const recoveryCtls: AdminControl[] = [actionControl(`pbxadm:${screen}:history-refresh`, 'Refresh recovery points', 'pbxadmin-history-refresh')];
      if (history.length > 0) {
        const options = history.map((entry, index) => this.historyOption(entry, index));
        recoveryCtls.unshift(selectControl(this.historyControlId(screen), 'Recovery point', options[0]!, options, 'pbxadmin-select-history'));
        recoveryCtls.push(actionControl(`pbxadm:${screen}:restore`, 'Restore selected recovery point', 'pbxadmin-restore'));
      }
      groups.push({
        title: 'Recovery',
        desc: history.length === 0
          ? 'No recovery point has been read for this resource.'
          : `${history.length} transaction backup${history.length === 1 ? '' : 's'} read for ${basename(resource)}.`,
        ctls: recoveryCtls,
      });
    }

    if (feature.tools?.includes('media')) {
      const root = this.mediaRoot(screen);
      const files = target ? this.adminMedia.get(mediaKey(target, root)) ?? [] : [];
      const mediaCtls: AdminControl[] = [
        segmentedControl(this.mediaRootControlId(screen), 'Media library', root === 'prompts' ? 'Prompts' : 'Music on hold', ['Prompts', 'Music on hold'], 'pbxadmin-media-root'),
        fileControl(this.mediaUploadControlId(screen), 'Upload media file'),
        actionControl(`pbxadm:${screen}:media-refresh`, 'Refresh media library', 'pbxadmin-media-refresh'),
      ];
      if (files.length > 0) {
        const names = files.map((file) => file.name);
        mediaCtls.push(selectControl(this.mediaFileControlId(screen), 'Target media file', names[0]!, names, 'pbxadmin-select-media'));
        mediaCtls.push(actionControl(`pbxadm:${screen}:media-remove`, 'Remove selected media file', 'pbxadmin-media-remove'));
      }
      groups.push({
        title: 'Media',
        desc: files.length === 0
          ? 'No media file has been read from this target library. Upload accepts only the formats and bounded roots enforced by MediaLibrary.'
          : `${files.length} media file${files.length === 1 ? '' : 's'} read from the selected target library.`,
        ctls: mediaCtls,
      });
    }

    screens[screen]!.groups = groups;
  }

  private historyOption(entry: HistoryEntry, index: number): string {
    const stamp = entry.takenAt ?? 'timestamp unavailable';
    return `${index + 1} · ${stamp} · ${entry.bytes} B`;
  }

  private selectedHistory(screen: string, entries: HistoryEntry[]): HistoryEntry | undefined {
    if (entries.length === 0) return undefined;
    const options = entries.map((entry, index) => this.historyOption(entry, index));
    const selected = String(this.stateValues().values[this.historyControlId(screen)] ?? options[0]);
    const index = options.indexOf(selected);
    return entries[index >= 0 ? index : 0];
  }

  renderVals(): ReturnType<App['renderVals']> {
    const screen = this.stateValues().screen;
    const feature = featureForAdvancedScreen(screen);
    if (feature) this.prepareAdminScreen(screen, feature);
    const values = super.renderVals();
    if (!feature) return values;
    const status = this.adminStatus.get(screen) ?? 'Nothing has been changed.';
    return {
      ...values,
      screenSub: `${feature.description}\n\n${status}`,
    };
  }

  private currentAdminContext(): { screen: string; feature: PbxFeatureDefinition; target: string; resource: string; value?: ConfigValue; key: string } | undefined {
    const screen = this.stateValues().screen;
    const feature = featureForAdvancedScreen(screen);
    if (!feature) return undefined;
    const target = this.selectedTarget(screen);
    const resource = this.selectedResource(screen, feature);
    const value = target && resource ? this.materializeDraft(screen, target, resource) : undefined;
    return { screen, feature, target, resource, value, key: target && resource ? configKey(target, resource) : '' };
  }

  private previewAdmin = async (): Promise<void> => {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) {
      this.fire('Nothing to preview', 'Read a target configuration resource first.');
      return;
    }
    const issues = validateConfigValue(context.value);
    if (issues.length > 0) {
      this.fire('Configuration needs correction', issues.map((issue) => issue.message).join('\n'));
      return;
    }
    const response = await this.adminRequest('pbx.plan', {
      serverId: context.target,
      payload: { documents: [{ resource: context.resource, value: context.value }] },
    });
    if (!response?.ok) {
      this.fire('Preview not built', response?.message ?? 'The control plane did not answer.');
      return;
    }
    const plan = (response.data as { plan?: AdminPlan }).plan ?? {};
    this.adminDrafts.set(context.key, context.value);
    this.adminPlans.set(context.key, plan);
    const count = plan.diffs?.length ?? 0;
    this.adminStatus.set(context.screen, count === 0 ? 'Live preview complete: the target already matches these controls.' : `Live preview complete: ${count} configuration resource difference${count === 1 ? '' : 's'}.`);
    this.toast(count === 0 ? 'No live configuration difference' : 'Live configuration preview ready');
    this.forceUpdate();
  };

  private applyAdmin = async (): Promise<void> => {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const plan = this.adminPlans.get(context.key);
    if (!plan) {
      this.fire('Preview required', 'Preview the live diff first. Apply stays locked until a current preview exists.');
      return;
    }
    if ((plan.diffs?.length ?? 0) === 0) {
      this.fire('Nothing to apply', 'The preview found no live difference.');
      return;
    }
    const confirmed = {
      screen: context.screen,
      target: context.target,
      resource: context.resource,
      value: context.value,
      key: context.key,
    };
    this.areYouSure(
      `Apply ${basename(context.resource)}`,
      'The control plane will back up, stage, validate, apply, post-read and compare this resource. A post-read mismatch triggers rollback.',
      3,
      () => { void this.applyAdminConfirmed(confirmed); },
    );
  };

  private applyAdminConfirmed = async (context: { screen: string; target: string; resource: string; value: ConfigValue; key: string }): Promise<void> => {
    const response = await this.adminRequest('pbx.apply', {
      serverId: context.target,
      payload: { documents: [{ resource: context.resource, value: context.value }] },
    });
    if (!response?.ok) {
      this.fire('Configuration not applied', response?.message ?? 'The control plane did not answer.');
      return;
    }
    const result = (response.data as { result?: { status?: string; message?: string } }).result;
    if (result?.status !== 'applied') {
      this.fire('Configuration not applied', result?.message ?? `The transaction ended with ${result?.status ?? 'an unknown status'}.`);
      return;
    }
    this.adminLoaded.delete(context.key);
    this.adminDrafts.delete(context.key);
    this.adminPlans.delete(context.key);
    this.adminHistory.delete(context.key);
    this.adminStatus.set(context.screen, result.message ?? `${context.resource} was applied and verified.`);
    this.fire('Configuration applied', result.message ?? `${context.resource} was applied and verified by post-read.`);
    const feature = featureForAdvancedScreen(context.screen);
    if (feature) {
      await this.loadAdminConfig(context.screen, feature, true);
      await this.loadAdminHistory(context.screen, feature, true);
    }
  };

  private addAdminSection(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const name = String(this.stateValues().values[this.newSectionControlId(context.screen)] ?? '').trim();
    const next = addSection(context.value, name);
    if (next === context.value) {
      this.fire('Section not added', 'Enter a non-empty, unique section name without brackets or line breaks.');
      return;
    }
    this.setDraft(context.screen, context.target, context.resource, next, `Section [${name}] added locally. Preview before applying.`);
  }

  private renameAdminSection(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const sectionIndex = this.selectedSectionIndex(context.screen, context.value);
    if (sectionIndex < 0) return;
    const name = String(this.stateValues().values[this.sectionNameControlId(context.screen)] ?? '').trim();
    const next = updateSectionName(context.value, sectionIndex, name);
    const issues = validateConfigValue(next);
    if (issues.some((issue) => issue.section === sectionIndex && issue.entry === undefined)) {
      this.fire('Section not renamed', 'Section names cannot contain brackets or line breaks.');
      return;
    }
    this.setDraft(context.screen, context.target, context.resource, next, `Section renamed locally to [${name}]. Preview before applying.`);
  }

  private removeAdminSection(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const sectionIndex = this.selectedSectionIndex(context.screen, context.value);
    const section = context.value[sectionIndex];
    if (!section) return;
    this.areYouSure(`Remove [${section.name}]`, 'Every setting in this section will be removed from the staged configuration if you later apply it.', 3, () => {
      const next = removeSection(context.value!, sectionIndex);
      this.setDraft(context.screen, context.target, context.resource, next, `Section [${section.name}] removed locally. Preview before applying.`);
    });
  }

  private addAdminSetting(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const sectionIndex = this.selectedSectionIndex(context.screen, context.value);
    if (sectionIndex < 0) {
      this.fire('Setting not added', 'Add a section first.');
      return;
    }
    const key = String(this.stateValues().values[this.newSettingKeyControlId(context.screen)] ?? '').trim();
    const value = String(this.stateValues().values[this.newSettingValueControlId(context.screen)] ?? '');
    let next = addEntry(context.value, sectionIndex);
    next = updateEntry(next, sectionIndex, next[sectionIndex]!.entries.length - 1, { key, value });
    const issues = validateConfigValue(next);
    if (issues.some((issue) => issue.section === sectionIndex && issue.entry === next[sectionIndex]!.entries.length - 1)) {
      this.fire('Setting not added', 'Setting names cannot be empty or contain = or line breaks, and values cannot contain line breaks.');
      return;
    }
    this.setDraft(context.screen, context.target, context.resource, next, `${key} added locally to [${context.value[sectionIndex]!.name}]. Preview before applying.`);
  }

  private renameAdminSetting(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const sectionIndex = this.selectedSectionIndex(context.screen, context.value);
    const entryIndex = this.selectedEntryIndex(context.screen, context.value, sectionIndex);
    if (sectionIndex < 0 || entryIndex < 0) return;
    const key = String(this.stateValues().values[this.settingNameControlId(context.screen)] ?? '').trim();
    const next = updateEntry(context.value, sectionIndex, entryIndex, { key });
    const issue = validateConfigValue(next).find((candidate) => candidate.section === sectionIndex && candidate.entry === entryIndex);
    if (issue) {
      this.fire('Setting not renamed', issue.message);
      return;
    }
    this.setDraft(context.screen, context.target, context.resource, next, `Setting renamed locally to ${key}. Preview before applying.`);
  }

  private removeAdminSetting(): void {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource || !context.value) return;
    const sectionIndex = this.selectedSectionIndex(context.screen, context.value);
    const entryIndex = this.selectedEntryIndex(context.screen, context.value, sectionIndex);
    const entry = context.value[sectionIndex]?.entries[entryIndex];
    if (!entry) return;
    this.areYouSure(`Remove ${entry.key}`, `This occurrence of ${entry.key} will be removed from [${context.value[sectionIndex]!.name}] if you later apply the preview.`, 3, () => {
      const next = removeEntry(context.value!, sectionIndex, entryIndex);
      this.setDraft(context.screen, context.target, context.resource, next, `${entry.key} removed locally. Preview before applying.`);
    });
  }

  private resetAdmin(): void {
    const context = this.currentAdminContext();
    if (!context?.key) return;
    const loaded = this.adminLoaded.get(context.key);
    if (!loaded) return;
    this.adminDrafts.set(context.key, loaded);
    this.adminPlans.delete(context.key);
    this.clearAdminEditorValues(context.screen);
    this.adminStatus.set(context.screen, 'Local edits discarded. The controls again match the last target read.');
    this.toast('Local PBX Admin edits discarded');
    this.forceUpdate();
  }

  private restoreAdmin = async (): Promise<void> => {
    const context = this.currentAdminContext();
    if (!context?.target || !context.resource) return;
    const entries = this.adminHistory.get(context.key) ?? [];
    const selected = this.selectedHistory(context.screen, entries);
    if (!selected) {
      this.fire('No recovery point selected', 'Refresh recovery points first.');
      return;
    }
    this.areYouSure(`Restore ${basename(context.resource)}`, `Restore the backup from ${selected.takenAt ?? selected.handle}. The target is read back after the copy to verify it landed.`, 3, () => {
      void this.restoreAdminConfirmed(context.screen, context.feature, context.target, context.resource, context.key, selected);
    });
  };

  private restoreAdminConfirmed = async (screen: string, feature: PbxFeatureDefinition, target: string, resource: string, key: string, selected: HistoryEntry): Promise<void> => {
    const response = await this.adminRequest('history.restore', { serverId: target, payload: { handle: selected.handle } });
    if (!response?.ok) {
      this.fire('Recovery point not restored', response?.message ?? 'The control plane did not answer.');
      return;
    }
    const result = response.data as { ok?: boolean; detail?: string };
    if (!result.ok) {
      this.fire('Recovery point not restored', result.detail ?? 'The target did not verify the restore.');
      return;
    }
    this.adminLoaded.delete(key);
    this.adminDrafts.delete(key);
    this.adminPlans.delete(key);
    this.adminHistory.delete(key);
    this.fire('Recovery point restored', result.detail ?? `${resource} was restored and verified.`);
    await this.loadAdminConfig(screen, feature, true);
    await this.loadAdminHistory(screen, feature, true);
  };

  private removeAdminMedia = async (): Promise<void> => {
    const context = this.currentAdminContext();
    if (!context?.target) return;
    const root = this.mediaRoot(context.screen);
    const files = this.adminMedia.get(mediaKey(context.target, root)) ?? [];
    const selectedName = String(this.stateValues().values[this.mediaFileControlId(context.screen)] ?? files[0]?.name ?? '');
    const selected = files.find((file) => file.name === selectedName);
    if (!selected) {
      this.fire('No media file selected', 'Refresh the target media library first.');
      return;
    }
    this.areYouSure(`Remove ${selected.name}`, 'Media removal is irreversible. The control plane will only accept this validated bare filename inside the selected Asterisk media root.', 3, () => {
      void this.removeAdminMediaConfirmed(context.screen, context.target, root, selected);
    });
  };

  private removeAdminMediaConfirmed = async (screen: string, target: string, root: MediaRoot, selected: MediaFile): Promise<void> => {
    const response = await this.adminRequest('media.remove', { serverId: target, payload: { root, name: selected.name } });
    if (!response?.ok) {
      this.fire('Media file not removed', response?.message ?? 'The control plane did not answer.');
      return;
    }
    const result = response.data as { removed?: boolean; detail?: string };
    if (!result.removed) {
      this.fire('Media file not removed', result.detail ?? 'The target did not confirm removal.');
      return;
    }
    this.adminMedia.delete(mediaKey(target, root));
    this.fire('Media file removed', result.detail ?? `${selected.name} was removed.`);
    await this.loadAdminMedia(screen, true);
  };

  onControlAction = (action: string, _control?: { id?: string }, selected?: string): void => {
    const context = this.currentAdminContext();
    if (!context) {
      // Forwards all three arguments -- not just `action` -- so a base-class action
      // reached from a non-PBX-Admin screen (the servers/local-history runtime and
      // history controls added in `App.tsx`) still receives the picked option's label.
      // Dropping `selected` here silently reintroduces the exact "wired at one end"
      // shape this module's own commit history has repeatedly had to fix elsewhere.
      this.appControlAction(action, _control, selected);
      return;
    }
    switch (action) {
      case 'pbxadmin-discover': void this.discoverAdminTargets(); return;
      case 'pbxadmin-target': {
        if (!selected || !this.adminTargets.includes(selected)) return;
        this.adminTargetId = selected;
        const state = this.stateValues();
        this.setState({ values: { ...state.values, [this.targetControlId(context.screen)]: selected } } as never, () => {
          this.adminStatus.set(context.screen, `PBX target changed to ${selected}.`);
          void this.refreshAdminScreen(context.screen, context.feature);
        });
        return;
      }
      case 'pbxadmin-resource': {
        if (!selected) return;
        const state = this.stateValues();
        this.setState({ values: { ...state.values, [this.resourceControlId(context.screen)]: selected } } as never, () => {
          this.clearAdminEditorValues(context.screen);
          void this.loadAdminConfig(context.screen, context.feature, true);
          void this.loadAdminHistory(context.screen, context.feature, true);
        });
        return;
      }
      case 'pbxadmin-read': void this.loadAdminConfig(context.screen, context.feature, true); return;
      case 'pbxadmin-preview': void this.previewAdmin(); return;
      case 'pbxadmin-apply': void this.applyAdmin(); return;
      case 'pbxadmin-reset': this.resetAdmin(); return;
      case 'pbxadmin-add-section': this.addAdminSection(); return;
      case 'pbxadmin-rename-section': this.renameAdminSection(); return;
      case 'pbxadmin-remove-section': this.removeAdminSection(); return;
      case 'pbxadmin-add-setting': this.addAdminSetting(); return;
      case 'pbxadmin-rename-setting': this.renameAdminSetting(); return;
      case 'pbxadmin-remove-setting': this.removeAdminSetting(); return;
      case 'pbxadmin-select-section':
      case 'pbxadmin-select-setting':
      case 'pbxadmin-select-history':
      case 'pbxadmin-select-media':
        return;
      case 'pbxadmin-history-refresh': void this.loadAdminHistory(context.screen, context.feature, true); return;
      case 'pbxadmin-restore': void this.restoreAdmin(); return;
      case 'pbxadmin-media-root': {
        if (!selected) return;
        const state = this.stateValues();
        this.setState({ values: { ...state.values, [this.mediaRootControlId(context.screen)]: selected } } as never, () => {
          void this.loadAdminMedia(context.screen, true);
        });
        return;
      }
      case 'pbxadmin-media-refresh': void this.loadAdminMedia(context.screen, true); return;
      case 'pbxadmin-media-remove': void this.removeAdminMedia(); return;
      default: this.appControlAction(action, _control, selected);
    }
  };

  fileControlName = (control: { id: string }): string => {
    if (control.id.startsWith('pbxadm:') && control.id.endsWith(':media-upload')) {
      return this.adminPickedFileNames.get(control.id) ?? 'No media file chosen';
    }
    return this.appFileControlName(control);
  };

  fileControlHasFile = (control?: { id: string }): boolean => {
    if (control?.id.startsWith('pbxadm:') && control.id.endsWith(':media-upload')) return false;
    /* Forwarded WITH the control, because the answer now differs per control -- the console
     * mark and the vocabulary file are two different files, and a bare call would have
     * answered about whichever one the base class happened to check. */
    return control !== undefined && this.appFileControlHasFile(control);
  };

  onFileCleared = (control: { id: string }): void => {
    if (control.id.startsWith('pbxadm:') && control.id.endsWith(':media-upload')) {
      this.adminPickedFileNames.delete(control.id);
      this.forceUpdate();
      return;
    }
    this.appFileCleared(control);
  };

  onFilePicked = (control: { id: string }, file: File): void => {
    if (!(control.id.startsWith('pbxadm:') && control.id.endsWith(':media-upload'))) {
      this.appFilePicked(control, file);
      return;
    }
    const context = this.currentAdminContext();
    if (!context?.target) {
      this.fire('No PBX target selected', 'Discover and select a target before uploading media.');
      return;
    }
    const root = this.mediaRoot(context.screen);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const comma = dataUrl.indexOf(',');
      if (comma < 0) {
        this.fire('Media file not read', 'The selected file could not be encoded for the bounded media upload.');
        return;
      }
      const contentBase64 = dataUrl.slice(comma + 1);
      void this.adminRequest('media.upload', {
        serverId: context.target,
        payload: { root, name: file.name, contentBase64 },
      }).then(async (response) => {
        if (!response?.ok) {
          this.adminPickedFileNames.set(control.id, `${file.name} — rejected`);
          this.fire('Media file not uploaded', response?.message ?? 'The control plane did not answer.');
          this.forceUpdate();
          return;
        }
        const landed = response.data as MediaFile;
        this.adminPickedFileNames.set(control.id, landed.name);
        this.adminMedia.delete(mediaKey(context.target, root));
        this.fire('Media file uploaded', `${landed.name} landed as ${landed.bytes} bytes and was confirmed by the target.`);
        await this.loadAdminMedia(context.screen, true);
      });
    };
    reader.onerror = () => this.fire('Media file not read', 'The selected file could not be read from disk.');
    reader.readAsDataURL(file);
  };
}
