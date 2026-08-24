import { importAppearanceModel, exportAppearanceModel } from './appearance-export';
import { validateAppearanceOverride, validateAppearanceTarget } from './appearance';
import { rainbowDurationMs, type RainbowSpeedLevel } from './colour';
import {
  MAX_APPEARANCE_NAME_LENGTH,
  MAX_APPEARANCE_PRESETS,
  appearanceOverrideKey,
  emptyAppearanceModel,
  type AppearanceCapabilityRecord,
  type AppearanceDraft,
  type AppearanceGlobalSettings,
  type AppearanceInteractionState,
  type AppearanceModel,
  type AppearanceOverride,
  type AppearanceProperty,
  type AppearanceTarget,
  type AppearanceValue,
  type LogoAppearanceMetadata,
  type NamedAppearancePreset,
} from './appearance-schema';

export const APPEARANCE_STORAGE_KEY = 'ding-pbx-console.appearance.v2';

export interface AppearanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppearanceInverseAction {
  readonly type: 'restore-snapshot';
  readonly expectedRevision: number;
  readonly snapshot: AppearanceModel;
  readonly label: string;
}

export interface AppearanceOperationSuccess {
  readonly ok: true;
  readonly changed: boolean;
  readonly model: AppearanceModel;
  readonly message: string;
  readonly warnings: ReadonlyArray<string>;
  readonly inverse?: AppearanceInverseAction;
}

export interface AppearanceOperationFailure {
  readonly ok: false;
  readonly changed: false;
  readonly model: AppearanceModel;
  readonly reason: string;
}

export type AppearanceOperationResult = AppearanceOperationSuccess | AppearanceOperationFailure;

export interface AppearanceStoreLoadStatus {
  readonly source: 'empty' | 'persisted' | 'rejected';
  readonly message: string;
}

export interface AppearanceStore {
  readonly loadStatus: AppearanceStoreLoadStatus;
  getModel(): AppearanceModel;
  subscribe(listener: (model: AppearanceModel) => void): () => void;
  setDraft(target: AppearanceTarget, state: AppearanceInteractionState, property: AppearanceProperty, value: AppearanceValue): AppearanceOperationResult;
  discardDraft(target: AppearanceTarget, state: AppearanceInteractionState, property: AppearanceProperty): AppearanceOperationResult;
  applyDraft(target: AppearanceTarget, state: AppearanceInteractionState, property: AppearanceProperty): AppearanceOperationResult;
  resetProperty(target: AppearanceTarget, state: AppearanceInteractionState, property: AppearanceProperty): AppearanceOperationResult;
  resetElement(elementId: string, state?: AppearanceInteractionState): AppearanceOperationResult;
  resetGlobal(state?: AppearanceInteractionState): AppearanceOperationResult;
  resetAll(): AppearanceOperationResult;
  saveNamedPreset(id: string, name: string, description: string): AppearanceOperationResult;
  applyNamedPreset(id: string): AppearanceOperationResult;
  deleteNamedPreset(id: string): AppearanceOperationResult;
  setCapabilities(capabilities: ReadonlyArray<AppearanceCapabilityRecord>): AppearanceOperationResult;
  updateGlobals(settings: Partial<AppearanceGlobalSettings>): AppearanceOperationResult;
  setRainbowLevel(level: RainbowSpeedLevel): AppearanceOperationResult;
  setLogoMetadata(logo: LogoAppearanceMetadata | undefined): AppearanceOperationResult;
  replaceFromImport(model: AppearanceModel): AppearanceOperationResult;
  executeInverse(inverse: AppearanceInverseAction): AppearanceOperationResult;
}

function cloneModel(model: AppearanceModel): AppearanceModel {
  return JSON.parse(JSON.stringify(model)) as AppearanceModel;
}

function loadModel(
  storage: AppearanceStorage,
  storageKey: string,
  capabilities: ReadonlyArray<AppearanceCapabilityRecord>,
): { model: AppearanceModel; status: AppearanceStoreLoadStatus } {
  let stored: string | null;
  try {
    stored = storage.getItem(storageKey);
  } catch (error) {
    return {
      model: emptyAppearanceModel(capabilities),
      status: { source: 'rejected', message: `Appearance storage could not be read: ${error instanceof Error ? error.message : String(error)}` },
    };
  }
  if (stored === null) {
    return { model: emptyAppearanceModel(capabilities), status: { source: 'empty', message: 'No saved appearance exists.' } };
  }
  const imported = importAppearanceModel(stored);
  if (!imported.ok) {
    return {
      model: emptyAppearanceModel(capabilities),
      status: { source: 'rejected', message: `Saved appearance was rejected: ${imported.errors.join('; ')}` },
    };
  }
  return {
    model: capabilities.length > 0
      ? { ...imported.model, capabilities: [...capabilities] }
      : imported.model,
    status: { source: 'persisted', message: 'Saved appearance loaded from local storage.' },
  };
}

function sameModel(a: AppearanceModel, b: AppearanceModel): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createAppearanceStore(
  storage: AppearanceStorage,
  capabilities: ReadonlyArray<AppearanceCapabilityRecord> = [],
  storageKey = APPEARANCE_STORAGE_KEY,
): AppearanceStore {
  const loaded = loadModel(storage, storageKey, capabilities);
  let model = loaded.model;
  const listeners = new Set<(next: AppearanceModel) => void>();

  function unchanged(message: string): AppearanceOperationSuccess {
    return { ok: true, changed: false, model, message, warnings: [] };
  }

  function failure(reason: string): AppearanceOperationFailure {
    return { ok: false, changed: false, model, reason };
  }

  function commit(
    nextContent: AppearanceModel,
    label: string,
    warnings: ReadonlyArray<string> = [],
  ): AppearanceOperationResult {
    if (sameModel(model, nextContent)) return unchanged(`${label}: nothing changed.`);
    const before = cloneModel(model);
    const next = { ...nextContent, revision: model.revision + 1 };
    const exported = exportAppearanceModel(next);
    if (!exported.ok) return failure(`${label} was not saved: ${exported.errors.join('; ')}`);
    try {
      storage.setItem(storageKey, exported.text);
    } catch (error) {
      return failure(`${label} was not saved: ${error instanceof Error ? error.message : String(error)}`);
    }
    model = next;
    const emittedWarnings = [...warnings];
    for (const listener of listeners) {
      try {
        listener(model);
      } catch (error) {
        emittedWarnings.push(`Appearance listener failed after persistence: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      ok: true,
      changed: true,
      model,
      message: `${label} saved locally.`,
      warnings: emittedWarnings,
      inverse: {
        type: 'restore-snapshot',
        expectedRevision: model.revision,
        snapshot: before,
        label: `Undo ${label.toLowerCase()}`,
      },
    };
  }

  function draftKey(target: AppearanceTarget, state: AppearanceInteractionState, property: AppearanceProperty): string {
    return appearanceOverrideKey(target, state, property);
  }

  function setDraft(
    target: AppearanceTarget,
    state: AppearanceInteractionState,
    property: AppearanceProperty,
    value: AppearanceValue,
  ): AppearanceOperationResult {
    const candidate: AppearanceDraft = { target, state, property, value, baseRevision: model.revision + 1 };
    const checked = validateAppearanceOverride(candidate);
    if (!checked.ok) return failure(`Draft was rejected: ${checked.reason}`);
    const key = draftKey(target, state, property);
    return commit({
      ...model,
      drafts: [...model.drafts.filter((item) => draftKey(item.target, item.state, item.property) !== key), candidate],
    }, 'Appearance draft');
  }

  function discardDraft(
    target: AppearanceTarget,
    state: AppearanceInteractionState,
    property: AppearanceProperty,
  ): AppearanceOperationResult {
    const key = draftKey(target, state, property);
    return commit({
      ...model,
      drafts: model.drafts.filter((item) => draftKey(item.target, item.state, item.property) !== key),
    }, 'Discard appearance draft');
  }

  function applyDraft(
    target: AppearanceTarget,
    state: AppearanceInteractionState,
    property: AppearanceProperty,
  ): AppearanceOperationResult {
    const key = draftKey(target, state, property);
    const draft = model.drafts.find((item) => draftKey(item.target, item.state, item.property) === key);
    if (!draft) return failure(`No draft exists for '${key}'.`);
    const warnings = draft.baseRevision === model.revision
      ? []
      : [`The draft began at revision ${draft.baseRevision}; the current revision is ${model.revision}. Applying it changes only '${key}'.`];
    const override: AppearanceOverride = {
      target: draft.target,
      state: draft.state,
      property: draft.property,
      value: draft.value,
    };
    return commit({
      ...model,
      overrides: [...model.overrides.filter((item) => draftKey(item.target, item.state, item.property) !== key), override],
      drafts: model.drafts.filter((item) => draftKey(item.target, item.state, item.property) !== key),
      activePresetId: undefined,
    }, 'Apply appearance draft', warnings);
  }

  function resetProperty(
    target: AppearanceTarget,
    state: AppearanceInteractionState,
    property: AppearanceProperty,
  ): AppearanceOperationResult {
    const key = draftKey(target, state, property);
    return commit({
      ...model,
      overrides: model.overrides.filter((item) => draftKey(item.target, item.state, item.property) !== key),
      drafts: model.drafts.filter((item) => draftKey(item.target, item.state, item.property) !== key),
      activePresetId: undefined,
    }, `Reset ${key}`);
  }

  function resetTarget(target: AppearanceTarget, state?: AppearanceInteractionState): AppearanceOperationResult {
    const targetCheck = validateAppearanceTarget(target);
    if (!targetCheck.ok) return failure(`Reset target was rejected: ${targetCheck.reason}`);
    const matches = (item: AppearanceOverride): boolean => {
      if (target.scope !== item.target.scope) return false;
      if (target.scope === 'element' && item.target.scope === 'element' && target.elementId !== item.target.elementId) return false;
      return state === undefined || item.state === state;
    };
    const label = `${target.scope === 'global' ? 'global appearance' : `element '${target.elementId}'`}${state ? ` state '${state}'` : ''}`;
    return commit({
      ...model,
      overrides: model.overrides.filter((item) => !matches(item)),
      drafts: model.drafts.filter((item) => !matches(item)),
      activePresetId: undefined,
    }, `Reset ${label}`);
  }

  function saveNamedPreset(id: string, name: string, description: string): AppearanceOperationResult {
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(id) || id.length > MAX_APPEARANCE_NAME_LENGTH) {
      return failure('Preset id must be a bounded stable identifier.');
    }
    if (name.length === 0 || name.length > MAX_APPEARANCE_NAME_LENGTH) {
      return failure(`Preset name must be 1 to ${MAX_APPEARANCE_NAME_LENGTH} characters.`);
    }
    const existing = model.presets.find((preset) => preset.id === id);
    if (!existing && model.presets.length >= MAX_APPEARANCE_PRESETS) {
      return failure(`Preset limit of ${MAX_APPEARANCE_PRESETS} reached.`);
    }
    if (existing?.builtIn) return failure(`Built-in preset '${id}' cannot be overwritten.`);
    const preset: NamedAppearancePreset = {
      id,
      name,
      description,
      builtIn: false,
      rainbowLevel: model.rainbowLevel,
      globals: JSON.parse(JSON.stringify(model.globals)) as AppearanceGlobalSettings,
      overrides: cloneModel(model).overrides,
    };
    return commit({
      ...model,
      presets: [...model.presets.filter((item) => item.id !== id), preset],
      activePresetId: id,
    }, `Save preset '${name}'`);
  }

  function applyNamedPreset(id: string): AppearanceOperationResult {
    const preset = model.presets.find((item) => item.id === id);
    if (!preset) return failure(`Preset '${id}' does not exist.`);
    return commit({
      ...model,
      overrides: preset.overrides.map((item) => ({ ...item })),
      globals: JSON.parse(JSON.stringify(preset.globals)) as AppearanceGlobalSettings,
      rainbowLevel: preset.rainbowLevel,
      drafts: [],
      activePresetId: id,
    }, `Apply preset '${preset.name}'`);
  }

  function deleteNamedPreset(id: string): AppearanceOperationResult {
    const preset = model.presets.find((item) => item.id === id);
    if (!preset) return failure(`Preset '${id}' does not exist.`);
    if (preset.builtIn) return failure(`Built-in preset '${id}' cannot be deleted.`);
    return commit({
      ...model,
      presets: model.presets.filter((item) => item.id !== id),
      activePresetId: model.activePresetId === id ? undefined : model.activePresetId,
    }, `Delete preset '${preset.name}'`);
  }

  return {
    loadStatus: loaded.status,
    getModel: () => model,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setDraft,
    discardDraft,
    applyDraft,
    resetProperty,
    resetElement: (elementId, state) => resetTarget({ scope: 'element', elementId }, state),
    resetGlobal: (state) => resetTarget({ scope: 'global' }, state),
    resetAll: () => commit({ ...model, overrides: [], drafts: [], activePresetId: undefined }, 'Reset all appearance'),
    saveNamedPreset,
    applyNamedPreset,
    deleteNamedPreset,
    setCapabilities: (nextCapabilities) => commit({ ...model, capabilities: [...nextCapabilities] }, 'Update appearance capabilities'),
    updateGlobals: (settings) => commit({
      ...model,
      globals: { ...model.globals, ...settings },
      activePresetId: undefined,
    }, 'Update global appearance settings'),
    setRainbowLevel: (level) => {
      try {
        rainbowDurationMs(level);
      } catch (error) {
        return failure(error instanceof Error ? error.message : String(error));
      }
      return commit({ ...model, rainbowLevel: level }, 'Update global rainbow speed');
    },
    setLogoMetadata: (logo) => commit({ ...model, logo }, 'Update logo appearance metadata'),
    replaceFromImport: (importedModel) => commit({ ...cloneModel(importedModel), revision: model.revision }, 'Import appearance'),
    executeInverse: (inverse) => {
      if (inverse.type !== 'restore-snapshot') return failure('Unsupported inverse action.');
      if (model.revision !== inverse.expectedRevision) {
        return failure(`Inverse action expected revision ${inverse.expectedRevision}, current revision is ${model.revision}.`);
      }
      return commit({ ...cloneModel(inverse.snapshot), revision: model.revision }, inverse.label);
    },
  };
}

export function createMemoryAppearanceStorage(): AppearanceStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}
