import { createDurableStorage, type DurableStorageHandle } from './durable-storage';
import { ExternalSettingsRuntime } from './external-settings-runtime';
import { LogoRuntime } from './logo-runtime';
import { RendererSettingsRuntime } from './settings-runtime';
import { SettingsStore } from './settings-store';
import type { SpeechEngine } from './narration';

export interface ApplicationRuntime {
  readonly durable: DurableStorageHandle;
  readonly settings: RendererSettingsRuntime;
  readonly logo: LogoRuntime;
  readonly external: ExternalSettingsRuntime;
}

let singleton: ApplicationRuntime | undefined;
let mounted = false;

function speechEngine(): SpeechEngine | undefined {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synthesis) return undefined;
  return {
    voices: () => synthesis.getVoices().map((voice) => ({ id: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService })),
    onVoicesChanged: (listener) => { synthesis.addEventListener('voiceschanged', listener); return () => synthesis.removeEventListener('voiceschanged', listener); },
    speak: (request) => new Promise((resolve, reject) => { const utterance = new SpeechSynthesisUtterance(request.text); utterance.rate = request.rate; utterance.pitch = request.pitch; const voice = synthesis.getVoices().find((candidate) => candidate.voiceURI === request.voiceId); if (voice) utterance.voice = voice; utterance.onend = () => resolve(); utterance.onerror = () => reject(new Error('Speech synthesis did not complete.')); synthesis.speak(utterance); }),
    cancel: () => synthesis.cancel(),
  };
}

export function getApplicationRuntime(): ApplicationRuntime {
  if (singleton) return singleton;
  const bridge = window.dingDesktop;
  const durable = createDurableStorage(bridge);
  singleton = {
    durable,
    settings: new RendererSettingsRuntime({ store: new SettingsStore(durable.storage), vocabularyStorage: durable.storage }),
    logo: new LogoRuntime({ logo: bridge?.logo, controlPlane: bridge!.controlPlane }),
    external: new ExternalSettingsRuntime({ controlPlane: bridge!.controlPlane }),
  };
  return singleton;
}

function applySettings(snapshot: ReturnType<RendererSettingsRuntime['snapshot']>): void {
  const root = document.documentElement;
  const effective = snapshot.effective;
  root.dataset.languageMode = effective.language.mode;
  root.lang = effective.language.mode === 'cantonese' ? 'zh-Hant-HK' : effective.language.mode === 'bilingual' ? 'en-HK' : 'en';
  root.dataset.appearanceTheme = effective.appearance.theme;
  root.dataset.appearanceDensity = effective.appearance.density;
  root.dataset.appearanceMotion = effective.appearance.motion ? 'full' : 'reduced';
  root.style.setProperty('--accent', effective.appearance.accentColor);
  root.style.setProperty('--appearance-font-scale', String(effective.appearance.fontScale));
  root.style.setProperty('--appearance-font-weight', String(effective.appearance.fontWeight));
  root.style.setProperty('--font-family', effective.appearance.fontFamily);
  root.dataset.attentionFocus = effective.attention.focus ? 'true' : 'false';
  root.dataset.attentionLowStimulation = effective.attention.lowStimulation ? 'true' : 'false';
  root.dataset.attentionTimeAwareness = effective.attention.timeAwareness ? 'true' : 'false';
  root.dataset.attentionOneThing = effective.attention.oneThingAtATime ? 'true' : 'false';
  root.dataset.attentionMomentum = effective.attention.momentum ? 'true' : 'false';
  document.title = effective.displayName.value;
  document.querySelectorAll<HTMLElement>('[data-window-drag], [data-app-title], [data-about-title], [data-notification-title]').forEach((element) => { element.dataset.displayName = effective.displayName.value; });
  const titleLabel = document.querySelector<HTMLElement>('[data-window-drag] > div:first-child > span:nth-child(2)');
  if (titleLabel) { titleLabel.textContent = effective.displayName.value; titleLabel.dataset.displayNameConsumer = 'titlebar'; }
}

export async function mountApplicationRuntime(): Promise<ApplicationRuntime> {
  const runtime = getApplicationRuntime();
  if (mounted) return runtime;
  mounted = true;
  await runtime.durable.bootstrap();
  runtime.settings.hydrate();
  runtime.settings.subscribe(applySettings);
  let scheduleFingerprint = '';
  let cycleGeneration = 0;
  const refreshExternal = async () => {
    const generation = ++cycleGeneration;
    const rules = runtime.settings.snapshot().base.schedule.rules.filter((rule) => rule.source.kind !== 'local');
    const ids = rules.map((rule) => rule.id);
    await runtime.external.readState(ids, generation);
    if (generation !== cycleGeneration) return;
    for (const rule of rules) {
      if (generation !== cycleGeneration) return;
      const state = await runtime.external.refresh(rule.id, rule.source, rule.assignments);
      if (generation !== cycleGeneration) return;
      runtime.settings.setScheduleSourceState(rule.id, state.active);
    }
  };
  const onSettings = () => {
    const fingerprint = JSON.stringify(runtime.settings.snapshot().base.schedule.rules);
    if (fingerprint === scheduleFingerprint) return;
    scheduleFingerprint = fingerprint;
    void refreshExternal();
  };
  runtime.settings.subscribe(onSettings);
  void refreshExternal();
  runtime.logo.mountDocument(document);
  const engine = speechEngine();
  if (engine) runtime.settings.mountNarration(engine);
  window.setTimeout(() => applySettings(runtime.settings.snapshot()), 0);
  window.setInterval(() => { runtime.settings.tick(); void refreshExternal(); }, 60_000);
  void runtime.logo.load();
  return runtime;
}
