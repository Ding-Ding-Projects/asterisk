/**
 * The one real `SpeechEngine`: a thin adapter over the platform's Web Speech API.
 *
 * `Narrator` (narration.ts) stays pure and injectable so its queue, cooldown and
 * serialization logic are testable without a browser at all. This is the one module
 * that actually reaches for `speechSynthesis` — deliberately isolated so a test can
 * inject a fake implementing the same three-method surface instead of this one.
 */
import type { SpeechEngine, SpeechSpeakRequest, SpeechVoice } from './narration';

interface PlatformVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
}

interface SpeechSynthesisLike {
  getVoices(): PlatformVoice[];
  speak(utterance: unknown): void;
  cancel(): void;
  addEventListener(type: 'voiceschanged', listener: () => void): void;
  removeEventListener(type: 'voiceschanged', listener: () => void): void;
}

interface UtteranceLike {
  rate: number;
  pitch: number;
  voice: PlatformVoice | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type UtteranceCtor = new (text: string) => UtteranceLike;

function toSpeechVoice(voice: PlatformVoice): SpeechVoice {
  return { id: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService };
}

/**
 * Used only when the platform has no speech synthesis at all — a locked-down build, a
 * machine with no TTS voices installed at the OS level, or this test suite. Voices stay
 * permanently empty and `speak` resolves without producing sound, so a `Narrator` can
 * always be constructed uniformly instead of every caller null-checking it. The honest
 * "cannot speak" state still reaches the user: an empty voice list makes
 * `resolveVoiceStatus` report `no-voice-available` on its own, which is a REPORTED
 * state rather than the silent no-op this whole feature exists to fix.
 */
export const NULL_SPEECH_ENGINE: SpeechEngine = {
  voices: () => [],
  onVoicesChanged: () => () => undefined,
  speak: () => Promise.resolve(),
  cancel: () => undefined,
};

/**
 * Builds the browser-backed engine, or reports its absence by returning `undefined`.
 *
 * Enumeration commonly answers empty on the first call and fills in later behind
 * `voiceschanged` — `onVoicesChanged` exists precisely so a caller can subscribe rather
 * than read once and conclude nothing is installed.
 */
export function createWebSpeechEngine(target: unknown = globalThis): SpeechEngine | undefined {
  const w = target as { speechSynthesis?: SpeechSynthesisLike; SpeechSynthesisUtterance?: UtteranceCtor };
  const speech = w.speechSynthesis;
  const Utterance = w.SpeechSynthesisUtterance;
  if (!speech || !Utterance) return undefined;

  return {
    voices: () => speech.getVoices().map(toSpeechVoice),
    onVoicesChanged: (listener) => {
      const handler = () => listener();
      speech.addEventListener('voiceschanged', handler);
      return () => speech.removeEventListener('voiceschanged', handler);
    },
    speak: (request: SpeechSpeakRequest) => new Promise<void>((resolve) => {
      const utterance = new Utterance(request.text);
      utterance.rate = request.rate;
      utterance.pitch = request.pitch;
      if (request.voiceId) {
        const match = speech.getVoices().find((voice) => voice.voiceURI === request.voiceId);
        if (match) utterance.voice = match;
      }
      /* Resolved on error too: a synthesis failure drops that one line rather than
       * blocking every line queued behind it, matching the documented failure mode. */
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speech.speak(utterance);
    }),
    cancel: () => speech.cancel(),
  };
}
