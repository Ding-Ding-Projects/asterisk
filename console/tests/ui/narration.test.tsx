import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PITCH,
  DEFAULT_RATE,
  MAX_PITCH,
  MAX_RATE,
  MIN_PITCH,
  MIN_RATE,
  Narrator,
  defaultNarrationSettings,
  resolveVoiceStatus,
} from '../../app/renderer/src/narration.ts';
import type { NarratorClock, SpeechEngine, SpeechSpeakRequest, SpeechVoice } from '../../app/renderer/src/narration.ts';

// ---------------------------------------------------------------- fakes

class FakeClock implements NarratorClock {
  private t = 0;
  now(): number { return this.t; }
  advance(ms: number): void { this.t += ms; }
  set(ms: number): void { this.t = ms; }
}

interface RecordedSpeak extends SpeechSpeakRequest {}

class FakeEngine implements SpeechEngine {
  private voiceList: SpeechVoice[];
  private listeners: Array<() => void> = [];
  calls: RecordedSpeak[] = [];
  activeCount = 0;
  maxConcurrent = 0;
  cancelCount = 0;
  private pending: Array<() => void> = [];

  constructor(voices: SpeechVoice[] = []) {
    this.voiceList = voices;
  }

  voices(): ReadonlyArray<SpeechVoice> { return this.voiceList; }

  setVoices(voices: SpeechVoice[]): void {
    this.voiceList = voices;
    for (const l of this.listeners) l();
  }

  onVoicesChanged(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  listenerCount(): number { return this.listeners.length; }

  speak(request: SpeechSpeakRequest): Promise<void> {
    this.calls.push(request);
    this.activeCount += 1;
    this.maxConcurrent = Math.max(this.maxConcurrent, this.activeCount);
    return new Promise<void>((resolve) => {
      this.pending.push(() => {
        this.activeCount -= 1;
        resolve();
      });
    });
  }

  cancel(): void {
    this.cancelCount += 1;
    this.pending = [];
    this.activeCount = 0;
  }

  /** Resolve the oldest still-pending speak() call. */
  resolveNext(): void {
    const fn = this.pending.shift();
    if (fn) fn();
  }

  pendingCount(): number { return this.pending.length; }
}

function voice(id: string, name: string, lang: string, localService = true): SpeechVoice {
  return { id, name, lang, localService };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Narration persists one independent channel per narrated language. This helper
 * makes each focused assertion update the real persisted shape, rather than the
 * retired flat voice/rate/pitch record.
 */
function applySettings(
  narrator: Narrator,
  patch: {
    enabled?: boolean;
    language?: 'en' | 'zh' | 'both';
    voices?: Partial<Record<'en' | 'zh', string>>;
    rate?: number;
    pitch?: number;
    channels?: Partial<Record<'en' | 'zh', { voiceId?: string; rate?: number; pitch?: number }>>;
  },
): void {
  const current = narrator.getSettings();
  narrator.setSettings({
    enabled: patch.enabled ?? current.enabled,
    language: patch.language ?? current.language,
    channels: {
      en: {
        voiceId: patch.channels?.en?.voiceId ?? patch.voices?.en ?? current.channels.en.voiceId,
        rate: patch.channels?.en?.rate ?? patch.rate ?? current.channels.en.rate,
        pitch: patch.channels?.en?.pitch ?? patch.pitch ?? current.channels.en.pitch,
      },
      zh: {
        voiceId: patch.channels?.zh?.voiceId ?? patch.voices?.zh ?? current.channels.zh.voiceId,
        rate: patch.channels?.zh?.rate ?? patch.rate ?? current.channels.zh.rate,
        pitch: patch.channels?.zh?.pitch ?? patch.pitch ?? current.channels.zh.pitch,
      },
    },
  });
}

// ---------------------------------------------------------------- defaults / off by default

test('narration is disabled by default and nothing is spoken', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  narrator.enqueue('progress', 'hello');
  await flush();
  assert.equal(engine.calls.length, 0);
});

test('defaultNarrationSettings returns disabled, en, empty voices, default rate/pitch', () => {
  const s = defaultNarrationSettings();
  assert.equal(s.enabled, false);
  assert.equal(s.language, 'en');
  assert.equal(s.channels.en.voiceId, undefined);
  assert.equal(s.channels.zh.voiceId, undefined);
  assert.equal(s.channels.en.rate, DEFAULT_RATE);
  assert.equal(s.channels.zh.rate, DEFAULT_RATE);
  assert.equal(s.channels.en.pitch, DEFAULT_PITCH);
  assert.equal(s.channels.zh.pitch, DEFAULT_PITCH);
});

// ---------------------------------------------------------------- enabling then speaking

test('enabling narration lets a queued line actually speak', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.enqueue('progress', 'build finished');
  await flush();
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0]?.text, 'build finished');
  assert.equal(engine.calls[0]?.voiceId, 'en-1');
});

// ---------------------------------------------------------------- per-language voice independence

test('English and Cantonese voice choices are independent', () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US'), voice('zh-1', 'Sinji', 'zh-HK')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { voices: { en: 'en-1' } });
  assert.equal(narrator.getSettings().channels.en.voiceId, 'en-1');
  assert.equal(narrator.getSettings().channels.zh.voiceId, undefined);
  applySettings(narrator, { voices: { zh: 'zh-1' } });
  assert.equal(narrator.getSettings().channels.en.voiceId, 'en-1');
  assert.equal(narrator.getSettings().channels.zh.voiceId, 'zh-1');
});

// ---------------------------------------------------------------- both: order + no overlap

test('"both" speaks English then Cantonese, strictly serialized, never concurrently', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US'), voice('zh-1', 'Sinji', 'zh-HK')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, language: 'both', voices: { en: 'en-1', zh: 'zh-1' } });
  narrator.enqueue('progress', 'saved');
  await flush();

  // Only the first (English) call should have been issued; the second must wait.
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0]?.voiceId, 'en-1');
  assert.equal(engine.activeCount, 1);

  engine.resolveNext();
  await flush();

  assert.equal(engine.calls.length, 2);
  assert.equal(engine.calls[1]?.voiceId, 'zh-1');
  assert.equal(engine.maxConcurrent, 1, 'en and zh utterances must never overlap');

  engine.resolveNext();
  await flush();
});

// ---------------------------------------------------------------- voice enumeration arrives late

test('an empty first voice enumeration followed by a populated one resolves correctly', async () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  assert.equal(narrator.status('en').kind, 'no-voice-available');

  engine.setVoices([voice('en-1', 'Alex', 'en-US')]);
  applySettings(narrator, { voices: { en: 'en-1' } });
  const status = narrator.status('en');
  assert.equal(status.kind, 'ok');
  assert.equal(status.effectiveVoiceId, 'en-1');
});

test('unsubscribing from voice changes actually stops updates', () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  assert.equal(engine.listenerCount(), 1);
  narrator.dispose();
  assert.equal(engine.listenerCount(), 0);
  // Further voice-list changes must not throw or be observed after dispose.
  engine.setVoices([voice('en-1', 'Alex', 'en-US')]);
  assert.equal(narrator.status('en').kind, 'no-voice-available');
});

// ---------------------------------------------------------------- status reporting

test('a chosen-but-absent voice reports fallback while the setting is retained', () => {
  const engine = new FakeEngine([voice('en-2', 'Backup', 'en-GB')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { voices: { en: 'en-missing' } });
  const status = narrator.status('en');
  assert.equal(status.kind, 'fallback');
  assert.equal(status.chosenVoiceId, 'en-missing');
  assert.equal(status.effectiveVoiceId, 'en-2');
  assert.equal(narrator.getSettings().channels.en.voiceId, 'en-missing', 'the choice must not be silently reset');
});

test('a chosen-but-absent voice with nothing else installed for that language reports no-voice-available and keeps the choice', () => {
  const engine = new FakeEngine([voice('zh-1', 'Sinji', 'zh-HK')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { voices: { en: 'en-missing' } });
  const status = narrator.status('en');
  assert.equal(status.kind, 'no-voice-available');
  assert.equal(status.chosenVoiceId, 'en-missing');
  assert.equal(narrator.getSettings().channels.en.voiceId, 'en-missing');
});

test('a network-backed voice is reported as such', () => {
  const engine = new FakeEngine([voice('en-net', 'Cloud Voice', 'en-US', false)]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { voices: { en: 'en-net' } });
  const status = narrator.status('en');
  assert.equal(status.kind, 'network');
  assert.match(status.message, /offline/);
});

test('a language with no voice installed at all is reported honestly', () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  const status = narrator.status('zh');
  assert.equal(status.kind, 'no-voice-available');
  assert.equal(status.effectiveVoiceId, undefined);
});

test('resolveVoiceStatus with no selection but voices available reports no-selection using system default', () => {
  const status = resolveVoiceStatus('en', undefined, [voice('en-1', 'Alex', 'en-US')]);
  assert.equal(status.kind, 'no-selection');
  assert.equal(status.effectiveVoiceId, 'en-1');
});

// ---------------------------------------------------------------- queue serialization

test('rapid enqueues across different categories are spoken one at a time, never overlapping', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.enqueue('a', 'first');
  narrator.enqueue('b', 'second');
  narrator.enqueue('c', 'third');
  await flush();

  assert.equal(engine.calls.length, 1, 'only the first item should have started speaking');
  engine.resolveNext();
  await flush();
  assert.equal(engine.calls.length, 2);
  engine.resolveNext();
  await flush();
  assert.equal(engine.calls.length, 3);
  engine.resolveNext();
  await flush();

  assert.equal(engine.maxConcurrent, 1);
  assert.deepEqual(engine.calls.map((c) => c.text), ['first', 'second', 'third']);
});

test('a superseded queued line of the same category is replaced, not stacked', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine, { cooldownMs: 0 });
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });

  // First enqueue starts speaking immediately and occupies the engine.
  narrator.enqueue('progress', 'step 1 of 5');
  await flush();
  assert.equal(engine.calls.length, 1);

  // These are queued (not yet spoken) and should collapse to only the last one.
  narrator.enqueue('progress', 'step 2 of 5');
  narrator.enqueue('progress', 'step 3 of 5');
  narrator.enqueue('progress', 'step 4 of 5');

  engine.resolveNext(); // finishes "step 1 of 5"
  await flush();

  assert.equal(engine.calls.length, 2, 'only the latest superseding line should have been spoken next');
  assert.equal(engine.calls[1]?.text, 'step 4 of 5');

  engine.resolveNext();
  await flush();
});

// ---------------------------------------------------------------- rate limiting / cooldown

test('the cooldown suppresses a second ordinary line in the same category', async () => {
  const clock = new FakeClock();
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine, { clock, cooldownMs: 5000 });
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });

  narrator.enqueue('progress', 'first');
  await flush();
  engine.resolveNext();
  await flush();
  assert.equal(engine.calls.length, 1);

  clock.advance(1000); // still inside the cooldown window
  narrator.enqueue('progress', 'second, too soon');
  await flush();
  assert.equal(engine.calls.length, 1, 'a line inside the cooldown window must be suppressed');

  clock.advance(5000); // now past the cooldown
  narrator.enqueue('progress', 'third, allowed');
  await flush();
  assert.equal(engine.calls.length, 2);
  assert.equal(engine.calls[1]?.text, 'third, allowed');
  engine.resolveNext();
  await flush();
});

test('the cooldown never suppresses an error, even immediately after another error', async () => {
  const clock = new FakeClock();
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine, { clock, cooldownMs: 5000 });
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });

  narrator.enqueue('error', 'connection to the trunk failed', { isError: true });
  await flush();
  engine.resolveNext();
  await flush();
  assert.equal(engine.calls.length, 1);

  narrator.enqueue('error', 'registration to the trunk failed', { isError: true });
  await flush();
  assert.equal(engine.calls.length, 2, 'an error must never be dropped by the cooldown');
  assert.equal(engine.calls[1]?.text, 'registration to the trunk failed');
  engine.resolveNext();
  await flush();
});

test('error narration names the actual failure text passed to it', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.enqueue('error', 'the endpoint 1000 is unreachable', { isError: true });
  await flush();
  assert.equal(engine.calls[0]?.text, 'the endpoint 1000 is unreachable');
  engine.resolveNext();
  await flush();
});

// ---------------------------------------------------------------- screen reader / quiet

test('an active screen reader suppresses speech even when narration is enabled', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.setScreenReaderActive(true);
  narrator.enqueue('progress', 'hello');
  await flush();
  assert.equal(engine.calls.length, 0);
});

test('a quiet setting suppresses speech even when narration is enabled', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.setQuiet(true);
  narrator.enqueue('progress', 'hello');
  await flush();
  assert.equal(engine.calls.length, 0);
});

test('turning off quiet mode lets narration resume', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.setQuiet(true);
  narrator.enqueue('progress', 'suppressed');
  await flush();
  assert.equal(engine.calls.length, 0);

  narrator.setQuiet(false);
  narrator.enqueue('progress', 'resumed');
  await flush();
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0]?.text, 'resumed');
  engine.resolveNext();
  await flush();
});

// ---------------------------------------------------------------- rate / pitch bounds

test('rate and pitch within bounds are accepted', () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { rate: MIN_RATE, pitch: MIN_PITCH });
  assert.equal(narrator.getSettings().channels.en.rate, MIN_RATE);
  assert.equal(narrator.getSettings().channels.zh.rate, MIN_RATE);
  applySettings(narrator, { rate: MAX_RATE, pitch: MAX_PITCH });
  assert.equal(narrator.getSettings().channels.en.rate, MAX_RATE);
  assert.equal(narrator.getSettings().channels.zh.pitch, MAX_PITCH);
});

test('English and Cantonese rate and pitch updates are independent', () => {
  const narrator = new Narrator(new FakeEngine([]));
  applySettings(narrator, { channels: { en: { rate: 1.4, pitch: 0.7 } } });
  assert.equal(narrator.getSettings().channels.en.rate, 1.4);
  assert.equal(narrator.getSettings().channels.en.pitch, 0.7);
  assert.equal(narrator.getSettings().channels.zh.rate, DEFAULT_RATE);
  assert.equal(narrator.getSettings().channels.zh.pitch, DEFAULT_PITCH);

  applySettings(narrator, { channels: { zh: { rate: 0.6, pitch: 1.8 } } });
  assert.equal(narrator.getSettings().channels.en.rate, 1.4);
  assert.equal(narrator.getSettings().channels.en.pitch, 0.7);
  assert.equal(narrator.getSettings().channels.zh.rate, 0.6);
  assert.equal(narrator.getSettings().channels.zh.pitch, 1.8);
});

test('bounds apply to each narration channel and a rejected update preserves both records atomically', () => {
  const narrator = new Narrator(new FakeEngine([]));
  applySettings(narrator, {
    channels: {
      en: { voiceId: 'en-1', rate: 1.4, pitch: 0.7 },
      zh: { voiceId: 'zh-1', rate: 0.6, pitch: 1.8 },
    },
  });
  const before = narrator.getSettings();

  assert.throws(
    () => applySettings(narrator, { channels: { zh: { rate: MAX_RATE + 0.1 } } }),
    /zh rate out of bounds/,
  );
  assert.deepEqual(narrator.getSettings().channels, before.channels);

  assert.throws(
    () => applySettings(narrator, { channels: { en: { pitch: MIN_PITCH - 0.1 } } }),
    /en pitch out of bounds/,
  );
  assert.deepEqual(narrator.getSettings().channels, before.channels);
});

test('a rate outside its bound is refused by name', () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  assert.throws(() => applySettings(narrator, { rate: MAX_RATE + 1 }), /rate out of bounds/);
  assert.throws(() => applySettings(narrator, { rate: MIN_RATE - 0.1 }), /rate out of bounds/);
});

test('a pitch outside its bound is refused by name', () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  assert.throws(() => applySettings(narrator, { pitch: MAX_PITCH + 1 }), /pitch out of bounds/);
  assert.throws(() => applySettings(narrator, { pitch: MIN_PITCH - 0.1 }), /pitch out of bounds/);
});

test('a rejected rate/pitch change leaves the previous settings untouched', () => {
  const engine = new FakeEngine([]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { rate: 1.5 });
  assert.throws(() => applySettings(narrator, { rate: 99 }));
  assert.equal(narrator.getSettings().channels.en.rate, 1.5);
});

// ---------------------------------------------------------------- dispose

test('dispose cancels in-flight speech and removes subscriptions', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.enqueue('progress', 'in flight');
  await flush();
  assert.equal(engine.activeCount, 1);

  narrator.dispose();

  assert.equal(engine.cancelCount, 1);
  assert.equal(engine.listenerCount(), 0);
});

test('enqueue after dispose speaks nothing', async () => {
  const engine = new FakeEngine([voice('en-1', 'Alex', 'en-US')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, voices: { en: 'en-1' } });
  narrator.dispose();
  narrator.enqueue('progress', 'too late');
  await flush();
  assert.equal(engine.calls.length, 0);
});

// ---------------------------------------------------------------- language selection at enqueue time

test('enqueue can override the default language per call', async () => {
  const engine = new FakeEngine([voice('zh-1', 'Sinji', 'zh-HK')]);
  const narrator = new Narrator(engine);
  applySettings(narrator, { enabled: true, language: 'en', voices: { zh: 'zh-1' } });
  narrator.enqueue('progress', 'zh only', { language: 'zh' });
  await flush();
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0]?.voiceId, 'zh-1');
  engine.resolveNext();
  await flush();
});
