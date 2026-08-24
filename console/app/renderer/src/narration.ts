/**
 * Logic layer for a spoken narrator that reads application events aloud.
 *
 * Pure and injectable: it takes a SpeechEngine as a dependency rather than reaching
 * for `window.speechSynthesis` itself, so every branch here is testable without a
 * real speech engine and without any timer this module does not control.
 *
 * Off by default. Nothing is spoken until a caller explicitly enables narration.
 */

export type NarrationLanguage = 'en' | 'zh' | 'both';

export interface SpeechVoice {
  id: string;
  name: string;
  lang: string;
  /** True when the voice runs locally; false when it depends on a network round-trip. */
  localService: boolean;
}

export interface SpeechSpeakRequest {
  text: string;
  voiceId?: string;
  rate: number;
  pitch: number;
}

export interface SpeechEngine {
  voices(): ReadonlyArray<SpeechVoice>;
  /** Subscribe to voice-list changes. Returns an unsubscribe function. */
  onVoicesChanged(listener: () => void): () => void;
  speak(request: SpeechSpeakRequest): Promise<void>;
  cancel(): void;
}

/** Stable picker value used for the platform-selected voice. */
export const CHOOSE_AUTOMATICALLY = 'auto';

/** A picker option is built from the voices present on this machine at runtime. */
export interface VoiceOption {
  id: string;
  label: string;
  localService?: boolean;
}

export function voiceOptions(engine: SpeechEngine, language: 'en' | 'zh'): VoiceOption[] {
  return [
    { id: CHOOSE_AUTOMATICALLY, label: 'Choose automatically' },
    ...engine.voices()
      .filter((voice) => voiceMatchesLanguage(voice, language))
      .map((voice) => ({ id: voice.id, label: voice.name, localService: voice.localService })),
  ];
}

/** Browser SpeechSynthesis adapter. Voice URI is the stable identity, never display name. */
export function browserSpeechEngine(): SpeechEngine | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return undefined;
  const synthesis = window.speechSynthesis;
  const readVoices = (): SpeechVoice[] => synthesis.getVoices().map((voice) => ({
    id: voice.voiceURI || `${voice.lang}:${voice.name}`,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
  }));
  return {
    voices: readVoices,
    onVoicesChanged(listener) {
      synthesis.addEventListener('voiceschanged', listener);
      return () => synthesis.removeEventListener('voiceschanged', listener);
    },
    speak(request) {
      return new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(request.text);
        const voice = request.voiceId && readVoices().find((candidate) => candidate.id === request.voiceId);
        if (voice) {
          const native = synthesis.getVoices().find((candidate) => (candidate.voiceURI || `${candidate.lang}:${candidate.name}`) === voice.id);
          if (native) utterance.voice = native;
        }
        utterance.rate = request.rate;
        utterance.pitch = request.pitch;
        utterance.onend = () => resolve();
        utterance.onerror = () => reject(new Error('Speech synthesis could not speak this line.'));
        synthesis.speak(utterance);
      });
    },
    cancel: () => synthesis.cancel(),
  };
}

export interface NarrationSettings {
  enabled: boolean;
  language: NarrationLanguage;
  voices: { en?: string; zh?: string };
  rate: number;
  pitch: number;
}

export const MIN_RATE = 0.5;
export const MAX_RATE = 2.0;
export const MIN_PITCH = 0.0;
export const MAX_PITCH = 2.0;
export const DEFAULT_RATE = 1.0;
export const DEFAULT_PITCH = 1.0;

export function defaultNarrationSettings(): NarrationSettings {
  return { enabled: false, language: 'en', voices: {}, rate: DEFAULT_RATE, pitch: DEFAULT_PITCH };
}

export type VoiceStatusKind = 'no-selection' | 'ok' | 'fallback' | 'network' | 'no-voice-available';

export interface VoiceStatus {
  kind: VoiceStatusKind;
  /** The voice id that will actually speak, if any. Undefined when nothing can speak. */
  effectiveVoiceId?: string;
  /** The chosen voice id, retained even when it no longer resolves on this machine. */
  chosenVoiceId?: string;
  message: string;
}

interface QueueItem {
  category: string;
  text: string;
  language: NarrationLanguage;
  isError: boolean;
  enqueuedAtMs: number;
}

export interface NarratorClock {
  now(): number;
}

const realClock: NarratorClock = { now: () => Date.now() };

export interface NarratorOptions {
  clock?: NarratorClock;
  /** Ordinary (non-error) categories get at most one utterance per this many ms. */
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 3000;

/**
 * Resolve which voice (if any) will actually speak a given language, and why.
 * Exported standalone so the status logic is testable without constructing a Narrator.
 */
export function resolveVoiceStatus(
  language: 'en' | 'zh',
  chosenVoiceId: string | undefined,
  availableVoices: ReadonlyArray<SpeechVoice>,
): VoiceStatus {
  const langVoices = availableVoices.filter((v) => voiceMatchesLanguage(v, language));

  if (!chosenVoiceId) {
    if (langVoices.length === 0) {
      return { kind: 'no-voice-available', message: `No voice on this machine can read ${languageName(language)}.` };
    }
    return { kind: 'no-selection', effectiveVoiceId: undefined, message: `No voice chosen for ${languageName(language)}; using the system default.` };
  }

  const chosen = availableVoices.find((v) => v.id === chosenVoiceId);
  if (!chosen) {
    if (langVoices.length === 0) {
      return {
        kind: 'no-voice-available',
        chosenVoiceId,
        message: `The chosen ${languageName(language)} voice is not installed on this machine, and no other voice can read ${languageName(language)} either. The choice is kept.`,
      };
    }
    const fallback = langVoices[0]!;
    return {
      kind: 'fallback',
      chosenVoiceId,
      effectiveVoiceId: fallback.id,
      message: `The chosen voice is not installed on this machine. Falling back to "${fallback.name}" while keeping the choice.`,
    };
  }

  if (!chosen.localService) {
    return {
      kind: 'network',
      chosenVoiceId,
      effectiveVoiceId: chosen.id,
      message: `"${chosen.name}" is network-backed and will go quiet offline.`,
    };
  }

  return { kind: 'ok', chosenVoiceId, effectiveVoiceId: chosen.id, message: `"${chosen.name}" will speak.` };
}

function voiceMatchesLanguage(voice: SpeechVoice, language: 'en' | 'zh'): boolean {
  const prefix = language === 'en' ? 'en' : 'zh';
  return voice.lang.toLowerCase().startsWith(prefix);
}

function languageName(language: 'en' | 'zh'): string {
  return language === 'en' ? 'English' : 'Cantonese';
}

export class Narrator {
  private readonly engine: SpeechEngine;
  private readonly clock: NarratorClock;
  private readonly cooldownMs: number;

  private settings: NarrationSettings = defaultNarrationSettings();
  private screenReaderActive = false;
  private quiet = false;

  private queue: QueueItem[] = [];
  private speaking = false;
  private disposed = false;

  private readonly lastSpokenAtMs = new Map<string, number>();
  private readonly voicesUnsubscribe: () => void;
  private cachedVoices: ReadonlyArray<SpeechVoice>;

  constructor(engine: SpeechEngine, options: NarratorOptions = {}) {
    this.engine = engine;
    this.clock = options.clock ?? realClock;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.cachedVoices = engine.voices();
    this.voicesUnsubscribe = engine.onVoicesChanged(() => {
      this.cachedVoices = this.engine.voices();
    });
  }

  setSettings(next: Partial<NarrationSettings>): void {
    const rate = next.rate ?? this.settings.rate;
    const pitch = next.pitch ?? this.settings.pitch;
    if (rate < MIN_RATE || rate > MAX_RATE) {
      throw new Error(`rate out of bounds: must be between ${MIN_RATE} and ${MAX_RATE}`);
    }
    if (pitch < MIN_PITCH || pitch > MAX_PITCH) {
      throw new Error(`pitch out of bounds: must be between ${MIN_PITCH} and ${MAX_PITCH}`);
    }
    this.settings = {
      enabled: next.enabled ?? this.settings.enabled,
      language: next.language ?? this.settings.language,
      voices: next.voices ? { ...this.settings.voices, ...next.voices } : this.settings.voices,
      rate,
      pitch,
    };
  }

  getSettings(): NarrationSettings {
    return { ...this.settings, voices: { ...this.settings.voices } };
  }

  setScreenReaderActive(active: boolean): void {
    this.screenReaderActive = active;
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /** Status of the voice that will actually speak a given language right now. */
  status(language: 'en' | 'zh'): VoiceStatus {
    return resolveVoiceStatus(language, this.settings.voices[language], this.cachedVoices);
  }

  private suppressed(): boolean {
    return this.disposed || !this.settings.enabled || this.screenReaderActive || this.quiet;
  }

  /**
   * Queue an utterance. `category` groups utterances for cooldown and supersession:
   * a new item in the same category replaces any still-queued item of that category
   * rather than stacking behind it. Errors are exempt from the cooldown suppression
   * (though they still coalesce within the same category) and are never dropped
   * purely for rate-limiting reasons.
   */
  enqueue(category: string, text: string, options: { isError?: boolean; language?: NarrationLanguage } = {}): void {
    if (this.suppressed()) return;

    const isError = options.isError ?? false;
    const language = options.language ?? this.settings.language;
    const now = this.clock.now();

    if (!isError) {
      const last = this.lastSpokenAtMs.get(category);
      if (last !== undefined && now - last < this.cooldownMs) {
        return;
      }
    }

    // Replace any queued (not-yet-spoken) item of the same category rather than stacking.
    this.queue = this.queue.filter((item) => item.category !== category);
    this.queue.push({ category, text, language, isError, enqueuedAtMs: now });

    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.speaking || this.disposed) return;
    this.speaking = true;
    try {
      while (this.queue.length > 0) {
        if (this.suppressed()) {
          this.queue = [];
          break;
        }
        const item = this.queue.shift()!;
        this.lastSpokenAtMs.set(item.category, this.clock.now());
        await this.speakItem(item);
      }
    } finally {
      this.speaking = false;
    }
  }

  private async speakItem(item: QueueItem): Promise<void> {
    const langs: Array<'en' | 'zh'> =
      item.language === 'both' ? ['en', 'zh'] : [item.language];

    for (const lang of langs) {
      if (this.suppressed()) return;
      const status = this.status(lang);
      await this.engine.speak({
        text: item.text,
        voiceId: status.effectiveVoiceId,
        rate: this.settings.rate,
        pitch: this.settings.pitch,
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.queue = [];
    this.engine.cancel();
    this.voicesUnsubscribe();
  }
}
