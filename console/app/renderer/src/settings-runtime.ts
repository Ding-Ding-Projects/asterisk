import {
  DEFAULT_SCHOOL_MODE_NAME,
  SHIPPED_DISPLAY_NAME,
  STABLE_APPLICATION_ID,
  type DesktopSettings,
  type ScheduledSettingTarget,
  type ScheduledValue,
} from '../../../shared/settings-schema';
import {
  applyVocabularyTextAtBoundary,
  type VocabularyStorage,
  type VocabularyTextBoundaryInput,
} from './personal-vocabulary';
import {
  Narrator,
  type NarrationQueueStatus,
  type NarrationText,
  type SpeechEngine,
  type SpeechVoice,
  type VoiceStatus,
} from './narration';
import {
  SettingsStore,
  createBrowserSettingsStore,
  probeBrowserSettingsStorage,
  type SettingsUpdateResult,
} from './settings-store';
import {
  evaluateSchedule,
  type ScheduleSourceStates,
} from './settings/schedule';

export type SettingProvenanceKind = 'default' | 'persisted' | 'session-memory' | 'scheduled' | 'school-mode';

export interface SettingProvenance {
  kind: SettingProvenanceKind;
  detail: string;
  ruleId?: string;
}

export interface SchoolModeProjection {
  enabled: boolean;
  displayName: string;
  languageMode: DesktopSettings['language']['mode'];
  funnyControlsAvailable: boolean;
  cantoneseAvailable: boolean;
  personalVocabularyAvailable: boolean;
  dimSumAvailable: boolean;
}

export interface RendererSettingsSnapshot {
  base: DesktopSettings;
  effective: DesktopSettings;
  hydrated: boolean;
  recoveryReason?: string;
  activeScheduleRuleIds: string[];
  scheduledOverrides: Partial<Record<ScheduledSettingTarget, ScheduledValue>>;
  provenance: Record<ScheduledSettingTarget, SettingProvenance>;
  schoolMode: SchoolModeProjection;
  stableApplicationId: typeof STABLE_APPLICATION_ID;
  shippedDisplayName: typeof SHIPPED_DISPLAY_NAME;
}

export type RendererSettingsListener = (snapshot: RendererSettingsSnapshot) => void;

export interface RendererSettingsRuntimeOptions {
  store: SettingsStore;
  vocabularyStorage: VocabularyStorage;
  now?: () => Date;
  sourceStates?: ScheduleSourceStates;
}

const allTargets: ScheduledSettingTarget[] = [
  'language.mode', 'language.englishFunnyLevel', 'language.cantoneseFunnyLevel', 'language.showDialogEmojis',
  'schoolMode.enabled', 'schoolMode.displayName', 'attention.focus', 'attention.lowStimulation',
  'attention.timeAwareness', 'attention.oneThingAtATime', 'attention.nextAction', 'attention.momentum',
  'narration.enabled', 'narration.language', 'narration.channels.en.voiceId', 'narration.channels.en.rate',
  'narration.channels.en.pitch', 'narration.channels.zh.voiceId', 'narration.channels.zh.rate',
  'narration.channels.zh.pitch', 'displayName.value', 'appearance.theme', 'appearance.density',
  'appearance.accentColor', 'appearance.fontFamily', 'appearance.fontScale', 'appearance.fontWeight', 'appearance.motion',
];

function copy(settings: DesktopSettings): DesktopSettings {
  return structuredClone(settings);
}

function applyCoreOverride(settings: DesktopSettings, target: ScheduledSettingTarget, value: ScheduledValue): void {
  switch (target) {
    case 'language.mode': settings.language.mode = value as DesktopSettings['language']['mode']; break;
    case 'language.englishFunnyLevel': settings.language.englishFunnyLevel = value as number; break;
    case 'language.cantoneseFunnyLevel': settings.language.cantoneseFunnyLevel = value as number; break;
    case 'language.showDialogEmojis': settings.language.showDialogEmojis = value as boolean; break;
    case 'schoolMode.enabled': settings.schoolMode.enabled = value as boolean; break;
    case 'schoolMode.displayName': settings.schoolMode.displayName = value as string; break;
    case 'attention.focus': settings.attention.focus = value as boolean; break;
    case 'attention.lowStimulation': settings.attention.lowStimulation = value as boolean; break;
    case 'attention.timeAwareness': settings.attention.timeAwareness = value as boolean; break;
    case 'attention.oneThingAtATime': settings.attention.oneThingAtATime = value as boolean; break;
    case 'attention.nextAction': settings.attention.nextAction = value as string; break;
    case 'attention.momentum': settings.attention.momentum = value as boolean; break;
    case 'narration.enabled': settings.narration.enabled = value as boolean; break;
    case 'narration.language': settings.narration.language = value as DesktopSettings['narration']['language']; break;
    case 'narration.channels.en.voiceId': settings.narration.channels.en.voiceId = value ? value as string : undefined; break;
    case 'narration.channels.en.rate': settings.narration.channels.en.rate = value as number; break;
    case 'narration.channels.en.pitch': settings.narration.channels.en.pitch = value as number; break;
    case 'narration.channels.zh.voiceId': settings.narration.channels.zh.voiceId = value ? value as string : undefined; break;
    case 'narration.channels.zh.rate': settings.narration.channels.zh.rate = value as number; break;
    case 'narration.channels.zh.pitch': settings.narration.channels.zh.pitch = value as number; break;
    case 'displayName.value': settings.displayName.value = value as string; break;
    case 'appearance.theme': settings.appearance.theme = value as DesktopSettings['appearance']['theme']; break;
    case 'appearance.density': settings.appearance.density = value as DesktopSettings['appearance']['density']; break;
    case 'appearance.accentColor': settings.appearance.accentColor = value as string; break;
    case 'appearance.fontFamily': settings.appearance.fontFamily = value as string; break;
    case 'appearance.fontScale': settings.appearance.fontScale = value as number; break;
    case 'appearance.fontWeight': settings.appearance.fontWeight = value as number; break;
    case 'appearance.motion': settings.appearance.motion = value as boolean; break;
  }
}

function schoolProjection(settings: DesktopSettings): SchoolModeProjection {
  const enabled = settings.schoolMode.enabled;
  return {
    enabled,
    displayName: settings.schoolMode.displayName || DEFAULT_SCHOOL_MODE_NAME,
    languageMode: enabled ? 'english' : settings.language.mode,
    funnyControlsAvailable: !enabled,
    cantoneseAvailable: !enabled,
    personalVocabularyAvailable: !enabled,
    dimSumAvailable: !enabled,
  };
}

/**
 * Integration facade for App.tsx. It deliberately owns no React state and no DOM;
 * App.tsx can hydrate once, subscribe on mount, and unsubscribe/dispose on unmount.
 */
export class RendererSettingsRuntime {
  private readonly listeners = new Set<RendererSettingsListener>();
  private sourceStates: ScheduleSourceStates;
  private narrator: Narrator | undefined;
  private screenReaderActive = false;
  private quiet = false;
  private readonly unsubscribeStore: () => void;

  constructor(private readonly options: RendererSettingsRuntimeOptions) {
    this.sourceStates = { ...(options.sourceStates ?? {}) };
    this.unsubscribeStore = options.store.subscribe(() => {
      this.syncNarrator();
      this.emit();
    });
  }

  hydrate(): RendererSettingsSnapshot {
    this.options.store.hydrate();
    this.syncNarrator();
    return this.snapshot();
  }

  subscribe(listener: RendererSettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(at = this.now()): RendererSettingsSnapshot {
    const stored = this.options.store.snapshot();
    const base = copy(stored.settings);
    const evaluation = evaluateSchedule(base.schedule.rules, base.schedule.timeZone, at, this.sourceStates);
    const effective = copy(base);
    for (const [target, value] of Object.entries(evaluation.overrides) as Array<[ScheduledSettingTarget, ScheduledValue]>) {
      applyCoreOverride(effective, target, value);
    }

    const projection = schoolProjection(effective);
    if (projection.enabled) {
      effective.language.mode = 'english';
      effective.narration.language = 'en';
    }

    const defaultProvenance: SettingProvenance = stored.provenance === 'persisted'
      ? { kind: 'persisted', detail: 'Loaded from the validated local settings record.' }
      : stored.provenance === 'session-memory'
        ? {
            kind: 'session-memory',
            detail: stored.recoveryReason ?? 'Browser storage is unavailable. This value is memory-only for the current session.',
          }
        : { kind: 'default', detail: 'Using the compiled default because no valid local value is stored.' };
    const provenance = Object.fromEntries(allTargets.map((target) => [target, { ...defaultProvenance }])) as Record<ScheduledSettingTarget, SettingProvenance>;
    for (const [target, ruleId] of Object.entries(evaluation.ruleForTarget) as Array<[ScheduledSettingTarget, string]>) {
      provenance[target] = { kind: 'scheduled', ruleId, detail: `Temporarily supplied by schedule rule ${ruleId}.` };
    }
    if (projection.enabled) {
      provenance['language.mode'] = { kind: 'school-mode', detail: `${projection.displayName} currently forces English.` };
      provenance['narration.language'] = { kind: 'school-mode', detail: `${projection.displayName} currently suppresses Cantonese narration.` };
    }

    return {
      base,
      effective,
      hydrated: stored.hydrated,
      ...(stored.recoveryReason ? { recoveryReason: stored.recoveryReason } : {}),
      activeScheduleRuleIds: evaluation.activeRuleIds,
      scheduledOverrides: { ...evaluation.overrides },
      provenance,
      schoolMode: projection,
      stableApplicationId: STABLE_APPLICATION_ID,
      shippedDisplayName: SHIPPED_DISPLAY_NAME,
    };
  }

  update(recipe: (draft: DesktopSettings) => void): SettingsUpdateResult {
    return this.options.store.update(recipe);
  }

  reset(): SettingsUpdateResult {
    return this.options.store.reset();
  }

  provenance(target: ScheduledSettingTarget, at = this.now()): SettingProvenance {
    return this.snapshot(at).provenance[target];
  }

  /** Apply private local replacements only while the suppression projection permits it. */
  applyVocabularyText(input: VocabularyTextBoundaryInput): string {
    if (!this.snapshot().schoolMode.personalVocabularyAvailable) return input.text;
    return applyVocabularyTextAtBoundary(this.options.vocabularyStorage, input);
  }

  setScheduleSourceState(ruleId: string, active: boolean | undefined): void {
    this.sourceStates = { ...this.sourceStates, [ruleId]: active };
    this.syncNarrator();
    this.emit();
  }

  /** Recompute time-window projections without changing persisted values. */
  tick(): void {
    this.syncNarrator();
    this.emit();
  }

  mountNarration(engine: SpeechEngine): void {
    const previous = this.narrator;
    this.narrator = undefined;
    previous?.dispose();
    this.narrator = new Narrator(engine, {
      onVoicesChanged: () => this.emit(),
      onQueueChanged: () => this.emit(),
    });
    this.syncNarrator();
    this.emit();
  }

  unmountNarration(): void {
    const previous = this.narrator;
    this.narrator = undefined;
    previous?.dispose();
    this.emit();
  }

  narrationVoices(language?: 'en' | 'zh'): ReadonlyArray<SpeechVoice> {
    return this.narrator?.voices(language) ?? [];
  }

  narrationStatus(language: 'en' | 'zh'): VoiceStatus | undefined {
    return this.narrator?.status(language);
  }

  narrationQueueStatus(): NarrationQueueStatus {
    return this.narrator?.queueStatus() ?? { speaking: false, queued: 0 };
  }

  queueNarration(category: string, text: NarrationText, options: { isError?: boolean; language?: DesktopSettings['narration']['language'] } = {}): boolean {
    if (!this.narrator) return false;
    return this.narrator.enqueue(category, text, options);
  }

  setScreenReaderActive(active: boolean): void {
    this.screenReaderActive = active;
    this.narrator?.setScreenReaderActive(active);
    this.emit();
  }

  setQuiet(active: boolean): void {
    this.quiet = active;
    this.narrator?.setQuiet(active);
    this.emit();
  }

  dispose(): void {
    this.unsubscribeStore();
    this.unmountNarration();
    this.options.store.dispose();
    this.listeners.clear();
  }

  private syncNarrator(): void {
    if (!this.narrator) return;
    this.narrator.setSettings(this.snapshot().effective.narration);
    this.narrator.setScreenReaderActive(this.screenReaderActive);
    this.narrator.setQuiet(this.quiet);
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function createRendererSettingsRuntime(options: RendererSettingsRuntimeOptions): RendererSettingsRuntime {
  return new RendererSettingsRuntime(options);
}

/** App integration helper for browser storage, with a memory fallback kept explicit. */
export function browserSettingsRuntime(): RendererSettingsRuntime {
  const storageProbe = probeBrowserSettingsStorage();
  return createRendererSettingsRuntime({
    vocabularyStorage: storageProbe.storage,
    store: createBrowserSettingsStore(storageProbe),
  });
}
