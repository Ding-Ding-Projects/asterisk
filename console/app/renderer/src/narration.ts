/**
 * Logic layer for a spoken narrator that reads application events aloud.
 *
 * Pure and injectable: it takes a SpeechEngine as a dependency rather than reaching
 * for `window.speechSynthesis` itself, so every branch here is testable without a
 * real speech engine and without any timer this module does not control.
 *
 * Off by default. Nothing is spoken until a caller explicitly enables narration.
 */

import type {
  NarrationLanguage,
  NarrationSettings,
} from '../../../shared/settings-schema';

export type { NarrationLanguage, NarrationSettings } from '../../../shared/settings-schema';

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

export const MIN_RATE = 0.5;
export const MAX_RATE = 2.0;
export const MIN_PITCH = 0.0;
export const MAX_PITCH = 2.0;
export const DEFAULT_RATE = 1.0;
export const DEFAULT_PITCH = 1.0;

export function defaultNarrationSettings(): NarrationSettings {
  return {
    enabled: false,
    language: 'en',
    channels: {
      en: { rate: DEFAULT_RATE, pitch: DEFAULT_PITCH },
      zh: { rate: DEFAULT_RATE, pitch: DEFAULT_PITCH },
    },
  };
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

export type NarrationText = string | { en: string; zh: string };

export interface NarrationQueueStatus {
  speaking: boolean;
  queued: number;
  lastError?: string;
}

interface QueueItem {
  category: string;
  text: NarrationText;
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
  onVoicesChanged?: () => void;
  onQueueChanged?: (status: NarrationQueueStatus) => void;
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
    const automatic = langVoices[0]!;
    return {
      kind: automatic.localService ? 'no-selection' : 'network',
      effectiveVoiceId: automatic.id,
      message: automatic.localService
        ? `Choose automatically is using "${automatic.name}" for ${languageName(language)}.`
        : `Choose automatically is using network-backed "${automatic.name}" for ${languageName(language)} and will go quiet offline.`,
    };
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
  private readonly onQueueChanged: ((status: NarrationQueueStatus) => void) | undefined;

  private settings: NarrationSettings = defaultNarrationSettings();
  private screenReaderActive = false;
  private quiet = false;

  private queue: QueueItem[] = [];
  private speaking = false;
  private disposed = false;
  private lastError: string | undefined;

  private readonly lastSpokenAtMs = new Map<string, number>();
  private readonly voicesUnsubscribe: () => void;
  private cachedVoices: ReadonlyArray<SpeechVoice>;

  constructor(engine: SpeechEngine, options: NarratorOptions = {}) {
    this.engine = engine;
    this.clock = options.clock ?? realClock;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.onQueueChanged = options.onQueueChanged;
    this.cachedVoices = engine.voices();
    this.voicesUnsubscribe = engine.onVoicesChanged(() => {
      this.cachedVoices = this.engine.voices();
      options.onVoicesChanged?.();
    });
  }

  setSettings(next: NarrationSettings): void {
    for (const language of ['en', 'zh'] as const) {
      const { rate, pitch } = next.channels[language];
      if (rate < MIN_RATE || rate > MAX_RATE) {
        throw new Error(`${language} rate out of bounds: must be between ${MIN_RATE} and ${MAX_RATE}`);
      }
      if (pitch < MIN_PITCH || pitch > MAX_PITCH) {
        throw new Error(`${language} pitch out of bounds: must be between ${MIN_PITCH} and ${MAX_PITCH}`);
      }
    }
    this.settings = {
      enabled: next.enabled,
      language: next.language,
      channels: {
        en: { ...next.channels.en },
        zh: { ...next.channels.zh },
      },
    };
  }

  getSettings(): NarrationSettings {
    return {
      ...this.settings,
      channels: {
        en: { ...this.settings.channels.en },
        zh: { ...this.settings.channels.zh },
      },
    };
  }

  setScreenReaderActive(active: boolean): void {
    this.screenReaderActive = active;
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /** Status of the voice that will actually speak a given language right now. */
  status(language: 'en' | 'zh'): VoiceStatus {
    return resolveVoiceStatus(language, this.settings.channels[language].voiceId, this.cachedVoices);
  }

  /** Current runtime voice inventory, optionally restricted to one narrated language. */
  voices(language?: 'en' | 'zh'): ReadonlyArray<SpeechVoice> {
    return language
      ? this.cachedVoices.filter((voice) => voiceMatchesLanguage(voice, language)).map((voice) => ({ ...voice }))
      : this.cachedVoices.map((voice) => ({ ...voice }));
  }

  queueStatus(): NarrationQueueStatus {
    return {
      speaking: this.speaking,
      queued: this.queue.length,
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
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
  enqueue(category: string, text: NarrationText, options: { isError?: boolean; language?: NarrationLanguage } = {}): boolean {
    if (this.suppressed()) return false;

    const isError = options.isError ?? false;
    const language = options.language ?? this.settings.language;
    const now = this.clock.now();

    if (!isError) {
      const last = this.lastSpokenAtMs.get(category);
      if (last !== undefined && now - last < this.cooldownMs) {
        return false;
      }
    }

    // Replace any queued (not-yet-spoken) item of the same category rather than stacking.
    this.queue = this.queue.filter((item) => item.category !== category);
    this.queue.push({ category, text, language, isError, enqueuedAtMs: now });
    this.notifyQueueChanged();

    void this.pump();
    return true;
  }

  private async pump(): Promise<void> {
    if (this.speaking || this.disposed) return;
    this.speaking = true;
    this.notifyQueueChanged();
    try {
      while (this.queue.length > 0) {
        if (this.suppressed()) {
          this.queue = [];
          break;
        }
        const item = this.queue.shift()!;
        this.lastSpokenAtMs.set(item.category, this.clock.now());
        try {
          await this.speakItem(item);
          this.lastError = undefined;
        } catch (error) {
          // A speech-engine failure never blocks the application or the remaining queue.
          this.lastError = error instanceof Error ? error.message : String(error);
        }
        this.notifyQueueChanged();
      }
    } finally {
      this.speaking = false;
      this.notifyQueueChanged();
    }
  }

  private async speakItem(item: QueueItem): Promise<void> {
    const langs: Array<'en' | 'zh'> =
      item.language === 'both' ? ['en', 'zh'] : [item.language];

    for (const lang of langs) {
      if (this.suppressed()) return;
      const status = this.status(lang);
      const channel = this.settings.channels[lang];
      const text = typeof item.text === 'string' ? item.text : item.text[lang];
      await this.engine.speak({
        text,
        voiceId: status.effectiveVoiceId,
        rate: channel.rate,
        pitch: channel.pitch,
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.queue = [];
    this.engine.cancel();
    this.voicesUnsubscribe();
    this.notifyQueueChanged();
  }

  private notifyQueueChanged(): void {
    this.onQueueChanged?.(this.queueStatus());
  }
}
