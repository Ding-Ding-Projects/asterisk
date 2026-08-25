/**
 * The one real `SpeechEngine` adapter.
 *
 * `narration.test.tsx` proves the pure `Narrator` logic against a fake engine.
 * This file proves the adapter that turns a real (or fake-but-realistic)
 * `speechSynthesis` global into that same `SpeechEngine` shape — the seam most
 * likely to silently do nothing, because a synthesis failure and a correct "nothing
 * to say yet" both look like an engine that never called back.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { NULL_SPEECH_ENGINE, createWebSpeechEngine } from '../../app/renderer/src/narration-engine.ts';

interface FakeUtterance {
  text: string;
  rate: number;
  pitch: number;
  voice: { voiceURI: string } | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function fakePlatform(voices: Array<{ voiceURI: string; name: string; lang: string; localService: boolean }> = []) {
  const listeners: Array<() => void> = [];
  const spoken: FakeUtterance[] = [];
  let cancelCount = 0;
  let nextShouldError = false;

  class FakeUtteranceCtor implements FakeUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    voice: { voiceURI: string } | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }

  const speechSynthesis = {
    getVoices: () => voices,
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      queueMicrotask(() => {
        if (nextShouldError) { nextShouldError = false; utterance.onerror?.(); }
        else utterance.onend?.();
      });
    },
    cancel: () => { cancelCount += 1; },
    addEventListener: (_type: 'voiceschanged', listener: () => void) => { listeners.push(listener); },
    removeEventListener: (_type: 'voiceschanged', listener: () => void) => {
      const at = listeners.indexOf(listener);
      if (at !== -1) listeners.splice(at, 1);
    },
  };

  return {
    target: { speechSynthesis, SpeechSynthesisUtterance: FakeUtteranceCtor },
    fireVoicesChanged: () => { for (const l of [...listeners]) l(); },
    listenerCount: () => listeners.length,
    spoken,
    cancelCount: () => cancelCount,
    forceNextError: () => { nextShouldError = true; },
    setVoices: (next: typeof voices) => { voices = next; },
  };
}

test('no speechSynthesis on the platform is reported as absent, not silently swallowed', () => {
  const engine = createWebSpeechEngine({});
  assert.equal(engine, undefined, 'expected no engine when the platform has no speechSynthesis at all');
});

test('no SpeechSynthesisUtterance constructor is also treated as absent', () => {
  const engine = createWebSpeechEngine({ speechSynthesis: { getVoices: () => [] } });
  assert.equal(engine, undefined);
});

test('NULL_SPEECH_ENGINE never speaks, but resolves and reports zero voices honestly', async () => {
  await NULL_SPEECH_ENGINE.speak({ text: 'x', rate: 1, pitch: 1 });
  assert.deepEqual(NULL_SPEECH_ENGINE.voices(), []);
  const unsubscribe = NULL_SPEECH_ENGINE.onVoicesChanged(() => { throw new Error('must never fire'); });
  unsubscribe();
  NULL_SPEECH_ENGINE.cancel();
});

test('voices() maps the platform voice list into the SpeechVoice shape', () => {
  const platform = fakePlatform([{ voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
  const engine = createWebSpeechEngine(platform.target)!;
  assert.deepEqual(engine.voices(), [{ id: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
});

test('an empty first enumeration followed by voiceschanged is observed by the subscriber', () => {
  const platform = fakePlatform([]);
  const engine = createWebSpeechEngine(platform.target)!;
  assert.deepEqual(engine.voices(), []);

  platform.setVoices([{ voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
  let notified = 0;
  const unsubscribe = engine.onVoicesChanged(() => { notified += 1; });
  platform.fireVoicesChanged();
  assert.equal(notified, 1);
  assert.deepEqual(engine.voices(), [{ id: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
  unsubscribe();
});

test('unsubscribing actually stops further voiceschanged notifications', () => {
  const platform = fakePlatform([]);
  const engine = createWebSpeechEngine(platform.target)!;
  assert.equal(platform.listenerCount(), 0);
  const unsubscribe = engine.onVoicesChanged(() => undefined);
  assert.equal(platform.listenerCount(), 1);
  unsubscribe();
  assert.equal(platform.listenerCount(), 0);
});

test('speak() builds a real utterance with the requested rate, pitch and text', async () => {
  const platform = fakePlatform([{ voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
  const engine = createWebSpeechEngine(platform.target)!;
  await engine.speak({ text: 'hello there', rate: 1.4, pitch: 0.6, voiceId: 'v1' });
  assert.equal(platform.spoken.length, 1);
  assert.equal(platform.spoken[0]?.text, 'hello there');
  assert.equal(platform.spoken[0]?.rate, 1.4);
  assert.equal(platform.spoken[0]?.pitch, 0.6);
  assert.equal(platform.spoken[0]?.voice?.voiceURI, 'v1');
});

test('a voiceId that does not resolve on this platform leaves the utterance voice unset rather than throwing', async () => {
  const platform = fakePlatform([{ voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true }]);
  const engine = createWebSpeechEngine(platform.target)!;
  await engine.speak({ text: 'x', rate: 1, pitch: 1, voiceId: 'missing' });
  assert.equal(platform.spoken[0]?.voice, null);
});

test('a synthesis error resolves the promise instead of hanging the caller', async () => {
  const platform = fakePlatform([]);
  const engine = createWebSpeechEngine(platform.target)!;
  platform.forceNextError();
  await engine.speak({ text: 'will fail', rate: 1, pitch: 1 }); // must resolve, not reject or hang
});

test('cancel() reaches the real platform cancel', () => {
  const platform = fakePlatform([]);
  const engine = createWebSpeechEngine(platform.target)!;
  engine.cancel();
  assert.equal(platform.cancelCount(), 1);
});

// ---------------------------------------------------------------- BREAK CHECK

test('BREAK CHECK — a fake engine with no speechSynthesis field really is undefined, proving the guard above is not vacuous', () => {
  assert.equal(createWebSpeechEngine({ speechSynthesis: undefined, SpeechSynthesisUtterance: class {} }), undefined);
  assert.equal(createWebSpeechEngine({ speechSynthesis: { getVoices: () => [] }, SpeechSynthesisUtterance: undefined }), undefined);
});
