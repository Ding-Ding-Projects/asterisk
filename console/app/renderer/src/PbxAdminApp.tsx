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
import { FREEPBX_MODULE_CATALOG, type FreePbxModuleCatalogEntry } from './freepbx-module-catalog';
import { buildFreePbxModuleForm } from './freepbx-module-form';
import { moduleAdapterFor } from './freepbx-module-adapters';
import type { FreePbxBackupJob, FreePbxBackupReceipt, FreePbxHandshake, FreePbxRuntimeModule } from '../../../control-plane/freepbx-runtime';
import { boundedRegexWorkerAvailable, evaluateBoundedRegexInWorker } from './bounded-regex-worker';
import { exportFreePbxCatalog as buildFreePbxCatalogExport, type FreePbxExportFormat } from './freepbx-catalog-export';
import { SCREENS } from './generated/console';
import { transformText } from './text-boundary';
import { freePbxDetailTemplate, type FreePbxDetailTemplateId } from './freepbx-messages';

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
type FreePbxCatalogHistoryEntry = { schemaVersion: 1; recordType: 'freepbx-action'; observedAt: string; moduleId: string; action: string; status: string; message: string; result?: unknown; backup?: unknown; before?: unknown; after?: unknown; rollback?: unknown };

const AUDIO_ACCEPT = '.wav,.gsm,.ulaw,.alaw,.g722,.sln,.sln16,.ogg,.opus';
const FREEPBX_FAMILY_ACTIONS = ['freepbx.family.schema', 'freepbx.family.read', 'freepbx.family.plan', 'freepbx.family.apply'] as const;

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

function textControl(id: string, label: string, value: string, info?: string, readOnly = false): AdminControl {
  return { id, label, kind: 'text', value, ...(info ? { info } : {}), ...(readOnly ? { readOnly: true } : {}) };
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
  private freePbxRuntimeModules = new Map<string, FreePbxRuntimeModule>();
  private freePbxHandshake: FreePbxHandshake | undefined;
  private freePbxCatalogStatus = 'Runtime module state has not been read.';
  private freePbxCatalogStateLoaded = false;
  private freePbxCatalogPersisted = '';
  private freePbxCatalogHistory: FreePbxCatalogHistoryEntry[] = [];
  private freePbxBackupJobs: FreePbxBackupJob[] = [];
  private freePbxBackupReceipt: FreePbxBackupReceipt | undefined;
  private freePbxBackupJobId = 'freepbx-catalog:backup-job';
  private freePbxBackupActionId = 'freepbx-catalog:backup-action';
  private freePbxFamilySchemas = new Map<string, { backend: string; fields: Array<{ key: string; source: string; kind: string }>; unavailableReason?: string }>();
  private freePbxFamilyValues = new Map<string, Record<string, ConfigValue>>();
  private freePbxWorkerSearchKey = '';
  private freePbxWorkerMatchIds = new Set<string>();
  private freePbxWorkerMatchRecordIds = new Set<string>();
  private freePbxWorkerPending = false;
  private freePbxWorkerUnavailable = false;

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

  private freePbxModuleForFeature(feature: PbxFeatureDefinition): FreePbxModuleCatalogEntry | undefined {
    return FREEPBX_MODULE_CATALOG.modules.find((module) => module.nativeTaskId === feature.id);
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

  private freePbxFamilySchemaKey(moduleId: string, target: string): string {
    const revision = FREEPBX_MODULE_CATALOG.modules.find((module) => module.moduleId === moduleId)?.source.revision ?? '';
    return `${target}\u0000${moduleId}\u0000${revision}`;
  }

  private freePbxFamilyCurrentValue(moduleId: string, target: string, key: string): string {
    const values = this.freePbxFamilyValues.get(this.freePbxFamilySchemaKey(moduleId, target));
    for (const resource of Object.values(values ?? {})) for (const section of resource) for (const entry of section.entries) if (entry.key === key) return entry.value;
    return '';
  }

  private freePbxFamilyFieldControl(moduleId: string, target: string, field: { key: string; label?: string; source: string; kind: string }, reason: string): AdminControl {
    const id = `freepbx-family:${moduleId}:${field.key}`;
    const value = this.freePbxFamilyCurrentValue(moduleId, target, field.key);
    const info = `${field.source}; target-backed value. ${reason}`;
    const label = field.label ?? field.key;
    if (field.kind === 'switch') return { ...switchControl(id, label, value.toLowerCase() === 'yes', info), readOnly: true };
    if (field.kind === 'select') return { ...selectControl(id, label, value, value ? [value] : ['No verified target value'], undefined), readOnly: true };
    return textControl(id, label, value, info, true);
  }

  private freePbxFamilyEntryControlId(moduleId: string, resource: string, sectionIndex: number, entryIndex: number): string {
    return `freepbx-family-entry:${moduleId}:${resource}:${sectionIndex}:${entryIndex}`;
  }

  private freePbxFamilyConfigControls(moduleId: string, target: string): AdminControl[] {
    const values = this.freePbxFamilyValues.get(this.freePbxFamilySchemaKey(moduleId, target)) ?? {};
    const controls: AdminControl[] = [];
    for (const [resource, value] of Object.entries(values)) for (const [sectionIndex, section] of value.entries()) for (const [entryIndex, entry] of section.entries.entries()) {
      const id = this.freePbxFamilyEntryControlId(moduleId, resource, sectionIndex, entryIndex);
      const current = this.stateValues().values[id] ?? entry.value;
      const info = `${resource} · [${section.name || 'global'}] · target-backed family value.`;
      if (isAsteriskBoolean(entry.value)) controls.push(switchControl(id, entry.key || `Setting ${entryIndex + 1}`, current === true || String(current).toLowerCase() === 'yes', info));
      else controls.push(textControl(id, entry.key || `Setting ${entryIndex + 1}`, String(current), info));
    }
    return controls;
  }

  private freePbxFamilyEditedDocuments(moduleId: string, target: string): Array<{ resource: string; value: ConfigValue }> {
    const stored = this.freePbxFamilyValues.get(this.freePbxFamilySchemaKey(moduleId, target)) ?? {};
    return Object.entries(stored).map(([resource, value]) => ({
      resource,
      value: value.map((section, sectionIndex) => ({
        name: section.name,
        entries: section.entries.map((entry, entryIndex) => {
          const raw = this.stateValues().values[this.freePbxFamilyEntryControlId(moduleId, resource, sectionIndex, entryIndex)];
          if (raw === undefined) return entry;
          return { key: entry.key, value: typeof raw === 'boolean' ? formatAsteriskBoolean(raw) : String(raw) };
        }),
      })),
    }));
  }
  private freePbxCatalogQueryId = 'freepbx-catalog:query';
  private freePbxCatalogRegexId = 'freepbx-catalog:regex';
  private freePbxCatalogInstalledId = 'freepbx-catalog:installed';
  private freePbxCatalogCommercialId = 'freepbx-catalog:commercial';
  private freePbxCatalogExclusionsId = 'freepbx-catalog:exclusions';
  private freePbxCatalogRecordId = 'freepbx-catalog:record';
  private freePbxCatalogFormatId = 'freepbx-catalog:format';
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
    const [response, inventoryResponse] = await Promise.all([
      this.adminRequest('server.list'),
      this.adminRequest('server.inventory.list'),
    ]);
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
    const discoveredWsl = Array.isArray(data.wsl) ? data.wsl.filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
    const registeredTargets = inventoryResponse?.ok ? ((inventoryResponse.data as { servers?: Array<{ id?: string }> }).servers ?? []).map((server) => server.id).filter((id): id is string => typeof id === 'string' && id.trim().length > 0) : [];
    const targets = [...new Set([...registeredTargets, ...discoveredWsl])];
    this.adminTargets = targets;
    this.adminTargetId = targets.includes(this.adminTargetId) ? this.adminTargetId : targets[0] ?? '';
    const screen = this.stateValues().screen;
    if (targets.length === 0) {
      const reason = Array.isArray(data.wsl) ? 'No registered or discovered PBX target was found.' : data.wsl?.unavailable ?? 'No PBX target was discovered.';
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

  private freePbxFire(title: string, detail: string): void {
    this.fire(transformText(title), `${transformText('FreePBX detail')}: ${detail}`);
  }

  private freePbxFireKnown(title: string, templateId: FreePbxDetailTemplateId, factual = ''): void {
    const template = transformText(freePbxDetailTemplate(templateId));
    this.fire(transformText(title), `${transformText('FreePBX known detail')}: ${template}${factual ? ` ${factual}` : ''}`);
  }

  private freePbxFireServer(title: string, serverDetail: string): void {
    this.fire(transformText(title), `${transformText('FreePBX server detail')}: ${serverDetail}`);
  }

  private selectedFreePbxCatalogRecord(): { recordId: string; moduleId: string; excluded: boolean; module?: FreePbxModuleCatalogEntry } | undefined {
    const recordId = String(this.stateValues().values[this.freePbxCatalogRecordId] ?? '').split(' · ')[0]!.trim();
    return this.freePbxCatalogRecords().find((record) => record.id === recordId);
  }

  private freePbxCatalogRecords(): Array<{ id: string; moduleId: string; label: string; excluded: boolean; module?: FreePbxModuleCatalogEntry }> {
    const values = this.stateValues().values;
    const query = String(values[this.freePbxCatalogQueryId] ?? '');
    const regex = values[this.freePbxCatalogRegexId] === true;
    const installedOnly = values[this.freePbxCatalogInstalledId] === true;
    const commercialOnly = values[this.freePbxCatalogCommercialId] === true;
    const includeExclusions = values[this.freePbxCatalogExclusionsId] === true;
    const workerKey = `${query}\u0000${regex ? 'regex' : 'text'}`;
    const searchModules = !query ? [...FREEPBX_MODULE_CATALOG.modules] : this.freePbxWorkerUnavailable ? [] : this.freePbxWorkerSearchKey === workerKey ? FREEPBX_MODULE_CATALOG.modules.filter((module) => this.freePbxWorkerMatchIds.has(module.moduleId)) : [];
    const modules = searchModules.filter((module) => {
      if (installedOnly && !this.freePbxRuntimeModules.get(module.moduleId)?.installed) return false;
      if (commercialOnly && module.entitlementClass !== 'commercial') return false;
      return true;
    }).map((module) => ({ id: module.moduleId, moduleId: module.moduleId, label: `${module.moduleId} · ${module.name} · ${module.version}`, excluded: false, module }));
    if (!includeExclusions) return modules;
    const exclusions = FREEPBX_MODULE_CATALOG.exclusions
      .filter((entry) => !query || this.freePbxWorkerMatchRecordIds.has(entry.recordId))
      .map((entry) => ({ id: entry.recordId, moduleId: entry.moduleId, label: `[excluded] ${entry.moduleId} · ${entry.reason}`, excluded: true }));
    return [...modules, ...exclusions];
  }

  private refreshFreePbxWorkerSearch = async (): Promise<void> => {
    const values = this.stateValues().values;
    const query = String(values[this.freePbxCatalogQueryId] ?? '');
    const regex = values[this.freePbxCatalogRegexId] === true;
    const key = `${query}\u0000${regex ? 'regex' : 'text'}`;
    if (this.freePbxWorkerPending || this.freePbxWorkerSearchKey === key) return;
    if (!boundedRegexWorkerAvailable()) {
      this.freePbxWorkerUnavailable = true;
      this.freePbxWorkerSearchKey = '';
      this.freePbxCatalogStatus = `${transformText('FreePBX search unavailable')}: the bounded worker is not available, so no query was evaluated.`;
      this.forceUpdate();
      return;
    }
    this.freePbxWorkerUnavailable = false;
    this.freePbxWorkerPending = true;
    const moduleTexts = FREEPBX_MODULE_CATALOG.modules.map((module) => `${module.moduleId} ${module.name} ${module.category} ${module.description}`);
    const exclusionTexts = FREEPBX_MODULE_CATALOG.exclusions.map((entry) => `${entry.moduleId} ${entry.reason}`);
    const moduleMatches = await evaluateBoundedRegexInWorker({ query, regex, flags: 'i', texts: moduleTexts });
    const exclusionMatches = await evaluateBoundedRegexInWorker({ query, regex, flags: 'i', texts: exclusionTexts });
    this.freePbxWorkerMatchIds = new Set(FREEPBX_MODULE_CATALOG.modules.filter((_, index) => moduleMatches[index] === true).map((module) => module.moduleId));
    this.freePbxWorkerMatchRecordIds = new Set(FREEPBX_MODULE_CATALOG.exclusions.filter((_, index) => exclusionMatches[index] === true).map((entry) => entry.recordId));
    this.freePbxWorkerSearchKey = key;
    this.freePbxWorkerPending = false;
    this.forceUpdate();
  };

  private refreshFreePbxCatalog = async (): Promise<void> => {
    const screen = this.stateValues().screen;
    const target = this.selectedTarget(screen);
    if (!target) {
      this.freePbxCatalogStatus = 'No discovered PBX target is available for module state.';
      this.forceUpdate();
      return;
    }
    this.freePbxCatalogStatus = 'Reading the FreePBX capability handshake and installed module state from fwconsole…';
    this.forceUpdate();
    const handshakeResponse = await this.adminRequest('freepbx.handshake', { serverId: target });
    if (!handshakeResponse?.ok) {
      this.freePbxHandshake = undefined;
      this.freePbxCatalogStatus = handshakeResponse?.message ?? 'The FreePBX capability handshake did not answer.';
      this.forceUpdate();
      return;
    }
    this.freePbxHandshake = handshakeResponse.data as FreePbxHandshake;
    if (this.freePbxHandshake.moduleAdmin !== 'available' || this.freePbxHandshake.backup !== 'available') {
      this.freePbxCatalogStatus = `FreePBX capability state is not ready: module admin ${this.freePbxHandshake.moduleAdmin}, backup ${this.freePbxHandshake.backup}, database ${this.freePbxHandshake.database}, web service ${this.freePbxHandshake.webService}.`;
      this.forceUpdate();
      return;
    }
    const response = await this.adminRequest('freepbx.modules', { serverId: target });
    if (!response?.ok) {
      this.freePbxCatalogStatus = response?.message ?? 'The FreePBX runtime did not answer module discovery.';
      this.forceUpdate();
      return;
    }
    const modules = (response.data as { modules?: FreePbxRuntimeModule[] }).modules ?? [];
    this.freePbxRuntimeModules = new Map(modules.map((module) => [module.moduleId, module]));
    this.freePbxCatalogStatus = `${modules.filter((module) => module.installed).length} installed module record${modules.filter((module) => module.installed).length === 1 ? '' : 's'} read from fwconsole. Nothing was changed.`;
    this.forceUpdate();
  };

  private readFreePbxBackupJobs = async (): Promise<void> => {
    const target = this.selectedTarget(this.stateValues().screen);
    if (!target) { this.freePbxFireKnown('FreePBX backup jobs unavailable', 'select-target'); return; }
    const response = await this.adminRequest('freepbx.backup.list', { serverId: target });
    if (!response?.ok) { this.freePbxFireServer('FreePBX backup jobs unavailable', response?.message ?? 'The target backup catalog did not answer.'); return; }
    this.freePbxBackupJobs = (response.data as { jobs?: FreePbxBackupJob[] }).jobs ?? [];
    this.freePbxCatalogStatus = `${this.freePbxBackupJobs.length} official backup job${this.freePbxBackupJobs.length === 1 ? '' : 's'} read from the target.`;
    this.forceUpdate();
  };

  private loadFreePbxFamilySchema = async (feature: PbxFeatureDefinition, target: string, selectedModule?: FreePbxModuleCatalogEntry): Promise<void> => {
    const module = selectedModule ?? this.freePbxModuleForFeature(feature);
    if (!module || this.freePbxFamilySchemas.has(this.freePbxFamilySchemaKey(module.moduleId, target))) return;
    const response = await this.adminRequest('freepbx.family.schema', { serverId: target, payload: { moduleId: module.moduleId } });
    if (response?.ok) {
      const schema = response.data as { backend: string; fields: Array<{ key: string; source: string; kind: string }>; unavailableReason?: string };
      this.freePbxFamilySchemas.set(this.freePbxFamilySchemaKey(module.moduleId, target), schema);
      if (schema.backend === 'config-transaction') {
        const values = await this.adminRequest('freepbx.family.read', { serverId: target, payload: { moduleId: module.moduleId } });
        if (values?.ok) this.freePbxFamilyValues.set(this.freePbxFamilySchemaKey(module.moduleId, target), (values.data as { values?: Record<string, ConfigValue> }).values ?? {});
      }
    }
  };

  private createFreePbxBackup = async (): Promise<void> => {
    const target = this.selectedTarget(this.stateValues().screen);
    const jobId = String(this.stateValues().values[this.freePbxBackupJobId] ?? '').split(' · ')[0]!.trim();
    const selected = this.selectedFreePbxCatalogRecord();
    const action = String(this.stateValues().values[this.freePbxBackupActionId] ?? 'update');
    const module = selected && !selected.excluded ? selected.module : undefined;
    if (!target || !jobId || !module || !['install', 'enable', 'disable', 'update', 'remove'].includes(action)) { this.freePbxFireKnown('FreePBX backup unavailable', 'select-module-action-backup-revision'); return; }
    const response = await this.adminRequest('freepbx.backup', { serverId: target, payload: { jobId, moduleId: module.moduleId, action, catalogRevision: module.source.revision } });
    if (!response?.ok) { this.freePbxFireServer('FreePBX backup unavailable', response?.message ?? 'The official backup did not confirm both file and database coverage.'); return; }
    this.freePbxBackupReceipt = response.data as FreePbxBackupReceipt;
    this.freePbxCatalogStatus = 'Official file and database backup receipt is ready for one module action.';
    this.forceUpdate();
  };

  private freePbxCatalogSelectionSnapshot(): string {
    const values = this.stateValues().values;
    return JSON.stringify({
      query: String(values[this.freePbxCatalogQueryId] ?? ''),
      regex: values[this.freePbxCatalogRegexId] === true,
      installed: values[this.freePbxCatalogInstalledId] === true,
      commercial: values[this.freePbxCatalogCommercialId] === true,
      exclusions: values[this.freePbxCatalogExclusionsId] === true,
      record: String(values[this.freePbxCatalogRecordId] ?? ''),
      format: String(values[this.freePbxCatalogFormatId] ?? 'json'),
      backupJob: String(values[this.freePbxBackupJobId] ?? ''),
      backupAction: String(values[this.freePbxBackupActionId] ?? 'update'),
    });
  }

  private persistFreePbxCatalogSelection(): void {
    if (!this.freePbxCatalogStateLoaded) return;
    const snapshot = this.freePbxCatalogSelectionSnapshot();
    if (snapshot === this.freePbxCatalogPersisted) return;
    this.freePbxCatalogPersisted = snapshot;
    void this.adminRequest('settings.write', { payload: { key: 'freepbx.catalog.selection', value: snapshot } });
  }

  private loadFreePbxCatalogSelection = async (): Promise<void> => {
    const response = await this.adminRequest('settings.snapshot');
    const savedValues = response?.ok ? (response.data as { values?: Record<string, string> }).values : undefined;
    const raw = savedValues?.['freepbx.catalog.selection'];
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        this.setState((state: { values: Record<string, unknown> }) => ({ values: {
          ...state.values,
          [this.freePbxCatalogQueryId]: typeof saved.query === 'string' ? saved.query : '',
          [this.freePbxCatalogRegexId]: saved.regex === true,
          [this.freePbxCatalogInstalledId]: saved.installed === true,
          [this.freePbxCatalogCommercialId]: saved.commercial === true,
          [this.freePbxCatalogExclusionsId]: saved.exclusions === true,
          [this.freePbxCatalogRecordId]: typeof saved.record === 'string' ? saved.record : '',
          [this.freePbxCatalogFormatId]: typeof saved.format === 'string' ? saved.format : 'json',
          [this.freePbxBackupJobId]: typeof saved.backupJob === 'string' ? saved.backupJob : '',
          [this.freePbxBackupActionId]: typeof saved.backupAction === 'string' ? saved.backupAction : 'update',
        } }));
      } catch {
        this.freePbxCatalogStatus = 'Saved catalog filters were invalid and were ignored.';
      }
    }
    this.freePbxCatalogStateLoaded = true;
    this.freePbxCatalogPersisted = this.freePbxCatalogSelectionSnapshot();
    const historyResponse = await this.adminRequest('local-history.list', { payload: { action: 'updated', limit: 200 } });
    if (historyResponse?.ok) {
      const entries = (historyResponse.data as { entries?: Array<{ timestamp?: string; action?: string; subject?: string; payload?: unknown }> }).entries ?? [];
      this.freePbxCatalogHistory = entries
        .filter((entry) => typeof entry.subject === 'string' && entry.subject.startsWith('FreePBX module '))
        .map((entry) => {
          const parts = entry.subject!.slice('FreePBX module '.length).split(' ');
          const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload as { typedResult?: Record<string, unknown>; result?: Record<string, unknown> } : undefined;
          const rawResult = payload?.typedResult ?? payload?.result;
          const result = rawResult?.result && typeof rawResult.result === 'object' ? rawResult.result as Record<string, unknown> : rawResult;
          return { schemaVersion: 1, recordType: 'freepbx-action', observedAt: entry.timestamp ?? '', moduleId: String(result?.moduleId ?? parts.shift() ?? ''), action: String(result?.action ?? parts.join(' ')), status: String(result?.status ?? 'recorded'), message: String(result?.message ?? entry.subject), result, backup: result?.backup ?? rawResult?.backup, before: result?.before, after: result?.after, rollback: result?.rollback };
        });
    }
  };

  private exportFreePbxCatalog = (): void => {
    const records = this.freePbxCatalogRecords().map((record) => ({
      recordType: record.excluded ? 'exclusion' : 'module',
      recordId: record.id,
      moduleId: record.moduleId,
      label: record.label,
      catalog: record.module ?? FREEPBX_MODULE_CATALOG.exclusions.find((entry) => entry.recordId === record.id) ?? null,
      runtime: this.freePbxRuntimeModules.get(record.moduleId) ?? null,
      history: this.freePbxCatalogHistory.filter((entry) => entry.moduleId === record.moduleId),
    }));
    const rawFormat = String(this.stateValues().values[this.freePbxCatalogFormatId] ?? 'json');
    const format = (['json', 'jsonl', 'yaml', 'toml', 'xml', 'csv', 'tsv', 'markdown', 'html'] as const).includes(rawFormat as FreePbxExportFormat) ? rawFormat as FreePbxExportFormat : 'json';
    const exported = buildFreePbxCatalogExport(records, format);
    const blob = new Blob([exported.body], { type: exported.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exported.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    this.freePbxFireKnown('FreePBX catalog exported', 'catalog-exported', `records=${records.length}; format=${format}; ${exported.omitted.join(' ')}`);
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
    if (this.adminTargets[0]) {
      const selectedCatalogModule = feature.id === 'freepbx-catalog' ? this.selectedFreePbxCatalogRecord()?.module : undefined;
      await this.loadFreePbxFamilySchema(feature, this.selectedTarget(screen), selectedCatalogModule);
    }
    if (feature.id === 'freepbx-catalog' && this.freePbxRuntimeModules.size === 0) await this.refreshFreePbxCatalog();
    if (feature.id === 'freepbx-catalog') void this.refreshFreePbxWorkerSearch();
  };

  componentDidUpdate() {
    super.componentDidUpdate();
    this.persistFreePbxCatalogSelection();
    const screen = this.stateValues().screen;
    const feature = featureForAdvancedScreen(screen);
    if (feature) void this.refreshAdminScreen(screen, feature);
  }

  componentDidMount() {
    super.componentDidMount();
    void this.loadFreePbxCatalogSelection();
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
    const freePbxModule = this.freePbxModuleForFeature(feature);
    const liveValuesByResource = Object.fromEntries(resources.map((candidate) => {
      const candidateKey = target ? configKey(target, candidate) : '';
      return [candidate, candidate === resource && draft ? draft : this.adminDrafts.get(candidateKey) ?? []];
    }));

    const targetCtls: AdminControl[] = [];
    if (this.adminTargets.length > 0) {
      targetCtls.push(selectControl(this.targetControlId(screen), 'PBX target', target || this.adminTargets[0]!, this.adminTargets, 'pbxadmin-target'));
    }
    targetCtls.push(actionControl(`pbxadm:${screen}:discover`, 'Discover PBX targets', 'pbxadmin-discover'));
    groups.push({ title: 'Target', desc: status, ctls: targetCtls });

    if (feature.id === 'freepbx-catalog') {
      const records = this.freePbxCatalogRecords();
      const options = records.map((record) => record.label);
      const selectedRecord = this.selectedFreePbxCatalogRecord();
      const selected = selectedRecord ? `${selectedRecord.id} · ${selectedRecord.label}` : records[0] ? `${records[0].id} · ${records[0].label}` : 'No catalog record matches the current filters.';
      groups.push({
        title: 'FreePBX module catalog',
        desc: `${records.length} catalog record${records.length === 1 ? '' : 's'} match. ${transformText('FreePBX detail')}: ${this.freePbxCatalogStatus}`,
        ctls: [
          textControl(this.freePbxCatalogQueryId, 'Search module catalog', String(this.stateValues().values[this.freePbxCatalogQueryId] ?? ''), 'Plain text is the default. Enable Regex mode to use the shared bounded regex evaluator.'),
          switchControl(this.freePbxCatalogRegexId, 'Regex mode', this.stateValues().values[this.freePbxCatalogRegexId] === true),
          switchControl(this.freePbxCatalogInstalledId, 'Installed only', this.stateValues().values[this.freePbxCatalogInstalledId] === true),
          switchControl(this.freePbxCatalogCommercialId, 'Commercial entitlement only', this.stateValues().values[this.freePbxCatalogCommercialId] === true),
          switchControl(this.freePbxCatalogExclusionsId, 'Include explicit exclusions', this.stateValues().values[this.freePbxCatalogExclusionsId] === true),
          selectControl(this.freePbxCatalogRecordId, 'Catalog record', selected, records.length > 0 ? records.map((record) => `${record.id} · ${record.label}`) : [selected], 'freepbx-catalog-record'),
          selectControl(this.freePbxCatalogFormatId, 'Export format', String(this.stateValues().values[this.freePbxCatalogFormatId] ?? 'json'), ['json', 'jsonl', 'yaml', 'toml', 'xml', 'csv', 'tsv', 'markdown', 'html']),
          selectControl(this.freePbxBackupJobId, 'Official backup job', String(this.stateValues().values[this.freePbxBackupJobId] ?? this.freePbxBackupJobs[0]?.jobId ?? ''), this.freePbxBackupJobs.length > 0 ? this.freePbxBackupJobs.map((job) => `${job.jobId} · ${job.label}`) : ['No backup job has been read']),
          selectControl(this.freePbxBackupActionId, 'Backup for module action', String(this.stateValues().values[this.freePbxBackupActionId] ?? 'update'), ['install', 'enable', 'disable', 'update', 'remove']),
          actionControl('freepbx-catalog:backup-list', 'Read official backup jobs', 'freepbx-catalog-backup-list', 'The target must publish the backup job list before a receipt can be created.'),
          actionControl('freepbx-catalog:backup-create', 'Create bound file and database receipt', 'freepbx-catalog-backup-create', 'The receipt binds the selected module, action, catalog revision, target, job, nonce, and expiry.'),
          actionControl('freepbx-catalog:refresh', 'Read installed module state', 'freepbx-catalog-refresh', 'Reads the target through fwconsole and does not change it.'),
          actionControl('freepbx-catalog:export', 'Export filtered catalog records', 'freepbx-catalog-export', 'Exports catalog metadata and readback state only. Credentials and private paths are omitted.'),
          actionControl('freepbx-catalog:bulk-export', `Export all ${records.length} visible records`, 'freepbx-catalog-bulk-export', 'Bulk export uses the current filters and includes exclusions when selected.'),
        ],
      });
      const selectedModule = selectedRecord?.excluded ? undefined : selectedRecord?.module;
      if (selectedModule) {
        const runtime = this.freePbxRuntimeModules.get(selectedModule.moduleId);
        const adapter = moduleAdapterFor(selectedModule);
        groups.push({
          title: 'Selected module state and actions',
          desc: runtime?.reason ?? selectedModule.availability.reason,
          ctls: [
            actionControl(`freepbx:${selectedModule.moduleId}:state`, 'Read selected module state', 'freepbx-catalog-state', 'Reads module state and dependencies through fwconsole.'),
            actionControl(`freepbx:${selectedModule.moduleId}:install`, 'Install selected module', 'freepbx-catalog-install', 'Structured action. The target and entitlement state are checked before sending.'),
            actionControl(`freepbx:${selectedModule.moduleId}:enable`, 'Enable selected module', 'freepbx-catalog-enable', 'Structured action. The target and entitlement state are checked before sending.'),
            actionControl(`freepbx:${selectedModule.moduleId}:disable`, 'Disable selected module', 'freepbx-catalog-disable', 'Requires confirmation and readback.'),
            actionControl(`freepbx:${selectedModule.moduleId}:update`, 'Update selected module', 'freepbx-catalog-update', 'Structured action. Readback verifies the resulting version.'),
            actionControl(`freepbx:${selectedModule.moduleId}:remove`, 'Remove selected module', 'freepbx-catalog-remove', 'Requires confirmation and readback with inverse rollback when safe.'),
          ],
        });
        groups.push({
          title: 'Family form schema',
          desc: adapter.unavailableReason,
          ctls: [
            ...this.freePbxFamilyConfigControls(selectedModule.moduleId, target),
            ...adapter.adapter.fields.map((field) => this.freePbxFamilyFieldControl(selectedModule.moduleId, target, field, `${field.required ? 'Required' : 'Optional'}. ${adapter.unavailableReason}`)),
            ...(adapter.adapter.fields.length === 0 ? [actionControl(`freepbx-family:${selectedModule.moduleId}:unavailable`, 'No executable family fields', 'freepbx-family-unavailable', adapter.unavailableReason)] : []),
          ],
        });
        const catalogFamilySchema = this.freePbxFamilySchemas.get(this.freePbxFamilySchemaKey(selectedModule.moduleId, target));
        if (catalogFamilySchema) {
          groups.push({
            title: 'Selected family operations',
            desc: catalogFamilySchema.unavailableReason ?? `Backend ${catalogFamilySchema.backend} is selected.`,
            ctls: [
              actionControl(`freepbx-family:${selectedModule.moduleId}:read`, 'Read family values', 'freepbx-family-read', 'Reads target-backed values for this selected module.'),
              actionControl(`freepbx-family:${selectedModule.moduleId}:plan`, 'Preview family change', 'freepbx-family-plan', 'Plans against the target before a write.'),
              actionControl(`freepbx-family:${selectedModule.moduleId}:apply`, 'Apply family change', 'freepbx-family-apply', 'Requires handshake, backup receipt, confirmation, and readback.'),
            ],
          });
        }
      }
    }

    if (freePbxModule) {
      const moduleForm = buildFreePbxModuleForm(freePbxModule.moduleId, feature, resources, liveValuesByResource);
      const actionInfo = freePbxModule.availability.reason;
      const familySchema = this.freePbxFamilySchemas.get(this.freePbxFamilySchemaKey(freePbxModule.moduleId, target));
        groups.push({
          title: 'FreePBX module metadata',
        desc: `${freePbxModule.name} ${freePbxModule.version} · ${freePbxModule.license}. ${familySchema ? `Backend ${familySchema.backend}, ${familySchema.fields.length} module-specific schema fields. ${familySchema.unavailableReason ?? ''}` : ''} ${actionInfo}`,
        ctls: [
          actionControl(`freepbx:${freePbxModule.moduleId}:install`, 'Install module', 'freepbx-module-install', actionInfo),
          actionControl(`freepbx:${freePbxModule.moduleId}:enable`, 'Enable module', 'freepbx-module-enable', actionInfo),
          actionControl(`freepbx:${freePbxModule.moduleId}:disable`, 'Disable module', 'freepbx-module-disable', actionInfo),
          actionControl(`freepbx:${freePbxModule.moduleId}:update`, 'Update module', 'freepbx-module-update', actionInfo),
          actionControl(`freepbx:${freePbxModule.moduleId}:remove`, 'Remove module', 'freepbx-module-remove', actionInfo),
          actionControl(`freepbx:${freePbxModule.moduleId}:catalog`, `${moduleForm?.fields.length ?? 0} target-backed fields`, 'freepbx-module-catalog', 'The field count is derived from the selected target read; no sample values are inserted.'),
          ],
        });
        if (familySchema) {
          if (familySchema.backend === 'config-transaction') groups.push({ title: 'Target-backed family fields', desc: 'These fields are read from the target and feed the family plan and apply routes.', ctls: this.freePbxFamilyConfigControls(freePbxModule.moduleId, target) });
          groups.push({
            title: 'Family operations',
            desc: familySchema.unavailableReason ?? `The ${familySchema.backend} schema is target-backed and must be read before planning.`,
            ctls: [
              actionControl(`freepbx-family:${freePbxModule.moduleId}:read`, 'Read family values', 'freepbx-family-read', 'Reads the selected family through its typed target route.'),
              actionControl(`freepbx-family:${freePbxModule.moduleId}:plan`, 'Preview family change', 'freepbx-family-plan', 'Plans against the current target values before a write.'),
              actionControl(`freepbx-family:${freePbxModule.moduleId}:apply`, 'Apply family change', 'freepbx-family-apply', 'Requires the capability handshake, official backup receipt, confirmation, and post-read verification.'),
            ],
          });
        }
      }

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

  private runFreePbxModuleAction = (moduleId: string, action: 'install' | 'enable' | 'disable' | 'update' | 'remove'): void => {
    const context = this.currentAdminContext();
    const target = context?.target || this.selectedTarget(this.stateValues().screen);
    const module = FREEPBX_MODULE_CATALOG.modules.find((candidate) => candidate.moduleId === moduleId);
    if (!module || !target) {
      this.freePbxFireKnown('FreePBX module action unavailable', 'module-action-unavailable');
      return;
    }
    const execute = async (confirmed: boolean): Promise<void> => {
      if (!this.freePbxBackupReceipt) {
        const jobId = String(this.stateValues().values[this.freePbxBackupJobId] ?? '').split(' · ')[0]!.trim();
        if (!jobId) {
          const message = 'Create an official file and database backup receipt before this module action.';
          this.freePbxCatalogHistory = [...this.freePbxCatalogHistory, { schemaVersion: 1, recordType: 'freepbx-action', observedAt: new Date().toISOString(), moduleId, action, status: 'refused', message }].slice(-200);
          this.freePbxFireServer('FreePBX module action refused', message);
          return;
        }
        const backupResponse = await this.adminRequest('freepbx.backup', { serverId: target, payload: { jobId, moduleId, action, catalogRevision: module.source.revision } });
        if (!backupResponse?.ok) {
          const message = backupResponse?.message ?? 'The official backup did not confirm both file and database coverage.';
          this.freePbxFireServer('FreePBX module action refused', message);
          return;
        }
        this.freePbxBackupReceipt = backupResponse.data as FreePbxBackupReceipt;
      }
      const response = await this.adminRequest('freepbx.module.action', {
        serverId: target,
        payload: { moduleId, action, confirmed, expectedRevision: module.source.revision, backup: this.freePbxBackupReceipt },
      });
      this.freePbxBackupReceipt = undefined;
      if (!response?.ok) {
        const message = response?.message ?? 'The FreePBX runtime did not confirm the action.';
        this.freePbxCatalogHistory = [...this.freePbxCatalogHistory, { schemaVersion: 1, recordType: 'freepbx-action', observedAt: new Date().toISOString(), moduleId, action, status: 'refused', message }].slice(-200);
        this.freePbxFireServer('FreePBX module action refused', message);
        return;
      }
      const result = response.data as { moduleId?: string; action?: string; after?: FreePbxRuntimeModule; before?: FreePbxRuntimeModule; status?: string; message?: string; backup?: FreePbxBackupReceipt; rollback?: unknown };
      if (result.after) this.freePbxRuntimeModules.set(moduleId, result.after);
      this.freePbxCatalogStatus = result.message ?? `fwconsole returned ${result.status ?? 'an unknown result'}.`;
      this.freePbxCatalogHistory = [...this.freePbxCatalogHistory, { schemaVersion: 1, recordType: 'freepbx-action', observedAt: new Date().toISOString(), moduleId, action, status: result.status ?? 'unknown', message: this.freePbxCatalogStatus, result, backup: result.backup, before: result.before, after: result.after, rollback: result.rollback }].slice(-200);
      this.freePbxFireServer('FreePBX module action result', this.freePbxCatalogStatus);
      this.forceUpdate();
    };
    if (action === 'remove' || action === 'disable') {
      this.areYouSure(`${action === 'remove' ? 'Remove' : 'Disable'} ${module.name}`, `This structured fwconsole action changes the selected target. The module, version, entitlement and readback state will be checked, and rollback will be attempted when the inverse action is safe.`, 3, () => { void execute(true); });
      return;
    }
    void execute(false);
  };

  private runFreePbxFamilyAction = (moduleId: string, action: 'read' | 'plan' | 'apply', target: string): void => {
    const schema = this.freePbxFamilySchemas.get(this.freePbxFamilySchemaKey(moduleId, target));
    if (!schema || schema.backend !== 'config-transaction') {
      this.freePbxFireKnown('FreePBX family action unavailable', 'family-action-unavailable', schema?.unavailableReason ?? '');
      return;
    }
    const execute = async (): Promise<void> => {
      const module = FREEPBX_MODULE_CATALOG.modules.find((candidate) => candidate.moduleId === moduleId);
      const storedValues = this.freePbxFamilyValues.get(this.freePbxFamilySchemaKey(moduleId, target)) ?? {};
      const documents = this.freePbxFamilyEditedDocuments(moduleId, target).length > 0
        ? this.freePbxFamilyEditedDocuments(moduleId, target)
        : Object.entries(Object.fromEntries((module?.configurationResources ?? Object.keys(storedValues)).map((resource) => [resource, this.adminDrafts.get(configKey(target, resource)) ?? storedValues[resource] ?? []]))).map(([resource, value]) => ({ resource, value }));
      let backup: FreePbxBackupReceipt | undefined;
      if (action === 'apply') {
        const jobId = String(this.stateValues().values[this.freePbxBackupJobId] ?? '').split(' · ')[0]!.trim();
        if (!module || !jobId) { this.freePbxFireKnown('FreePBX family apply unavailable', 'family-apply-unavailable'); return; }
        const backupResponse = await this.adminRequest('freepbx.backup', { serverId: target, payload: { jobId, moduleId, action: 'update', catalogRevision: module.source.revision } });
        if (!backupResponse?.ok) { this.freePbxFireServer('FreePBX family apply unavailable', backupResponse?.message ?? 'The official backup did not return a receipt.'); return; }
        backup = backupResponse.data as FreePbxBackupReceipt;
      }
      if (action === 'read') {
        const response = await this.adminRequest('freepbx.family.read', { serverId: target, payload: { moduleId } });
        if (response?.ok) { this.freePbxFamilyValues.set(this.freePbxFamilySchemaKey(moduleId, target), (response.data as { values?: Record<string, ConfigValue> }).values ?? {}); this.forceUpdate(); }
        else this.freePbxFireServer('FreePBX family read unavailable', response?.message ?? 'The family target read did not answer.');
        return;
      }
      const route = action === 'read' ? FREEPBX_FAMILY_ACTIONS[1] : action === 'plan' ? FREEPBX_FAMILY_ACTIONS[2] : FREEPBX_FAMILY_ACTIONS[3];
      const response = await this.adminRequest(route, { serverId: target, payload: { moduleId, documents, backup } });
      if (!response?.ok) this.freePbxFireServer(`FreePBX family ${action} unavailable`, response?.message ?? 'The family route refused the request.');
      else this.freePbxFireServer(`FreePBX family ${action}`, 'The target returned a structured family result.');
    };
    if (action === 'apply') this.areYouSure(`Apply ${moduleId} family changes`, 'The target must pass its FreePBX handshake and one-time backup receipt before a family mutation is sent.', 3, () => { void execute(); });
    else void execute();
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
    if (action === 'freepbx-catalog-refresh') { void this.refreshFreePbxCatalog(); return; }
    if (action === 'freepbx-catalog-backup-list') { void this.readFreePbxBackupJobs(); return; }
    if (action === 'freepbx-catalog-backup-create') { void this.createFreePbxBackup(); return; }
    if (action === 'freepbx-catalog-export' || action === 'freepbx-catalog-bulk-export') { this.exportFreePbxCatalog(); return; }
    if (action === 'freepbx-catalog-record') { this.forceUpdate(); return; }
    if (action === 'freepbx-catalog-state') {
      const selected = this.selectedFreePbxCatalogRecord();
      const moduleId = selected && !selected.excluded ? selected.moduleId : '';
      const target = this.selectedTarget(context.screen);
      if (!moduleId || !target) { this.freePbxFireKnown('FreePBX module state unavailable', 'module-state-unavailable', selected?.excluded ? 'Excluded catalog records are non-actionable dispositions.' : ''); return; }
      void this.adminRequest('freepbx.module.state', { serverId: target, payload: { moduleId } }).then((response) => {
        if (!response?.ok) { this.freePbxFireServer('FreePBX module state unavailable', response?.message ?? 'The target did not answer module state.'); return; }
        const module = response.data as FreePbxRuntimeModule;
        this.freePbxRuntimeModules.set(module.moduleId, module);
        this.freePbxCatalogStatus = `Read ${module.moduleId} from fwconsole.`;
        this.forceUpdate();
      });
      return;
    }
    if (action.startsWith('freepbx-catalog-')) {
      const match = /^freepbx-catalog-(install|enable|disable|update|remove)$/u.exec(action);
      const selected = this.selectedFreePbxCatalogRecord();
      if (match && selected && !selected.excluded) { this.runFreePbxModuleAction(selected.moduleId, match[1] as 'install' | 'enable' | 'disable' | 'update' | 'remove'); return; }
      if (selected?.excluded) { this.freePbxFireKnown('FreePBX module action unavailable', 'module-action-unavailable', 'Excluded catalog records are non-actionable dispositions.'); return; }
    }
    if (action.startsWith('freepbx-family-')) {
      const match = /^freepbx-family-(read|plan|apply)$/u.exec(action);
      const feature = context.feature;
      const selectedCatalog = feature.id === 'freepbx-catalog' ? this.selectedFreePbxCatalogRecord() : undefined;
      const module = selectedCatalog && !selectedCatalog.excluded ? selectedCatalog.module : this.freePbxModuleForFeature(feature);
      const target = this.selectedTarget(context.screen);
      if (match && module && target) { void this.runFreePbxFamilyAction(module.moduleId, match[1] as 'read' | 'plan' | 'apply', target); return; }
      this.freePbxFireKnown('FreePBX family action unavailable', 'family-action-unavailable', 'Select a mapped module and a registered target first.');
      return;
    }
    if (action.startsWith('freepbx-module-')) {
      const module = this.freePbxModuleForFeature(context.feature);
      const mapped = /freepbx-module-(install|enable|disable|update|remove)$/u.exec(action);
      if (mapped && module) { this.runFreePbxModuleAction(module.moduleId, mapped[1] as 'install' | 'enable' | 'disable' | 'update' | 'remove'); return; }
      this.freePbxFireKnown('FreePBX module action unavailable', 'module-action-unavailable', module?.availability.reason ?? '');
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
