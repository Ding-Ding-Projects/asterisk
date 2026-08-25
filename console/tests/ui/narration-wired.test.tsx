/**
 * The narrator, genuinely reached.
 *
 * Before this file, `Narrator` existed, was fully tested in isolation
 * (`narration.test.tsx`), and had seven real controls (`nar_*`) persisting settings
 * and reporting status -- but nothing in `App.tsx` ever imported `Narrator` or called
 * `.enqueue(`. The console could not narrate a single line no matter what the user
 * set. Every test in this file goes through the REAL mount chain -- constructing the
 * real `App`, calling its real `componentDidMount`, and driving it the way a user or
 * the compiled UI actually would (`setVal`, `fire`, `toast`) -- and checks that real
 * speech happened on the other end. A test that reached into `Narrator` directly and
 * asserted its queue would repeat the exact mistake this file exists to catch.
 *
 * One thing this file discovered the hard way, worth stating up front: the COMPILED
 * shell's own generic `setVal` (`app/renderer/src/generated/console.tsx`) already
 * calls `this.toast(label + ' set to ' + value)` on every single control change, and
 * `this.fire('Nice', label + ' switched on.')` on every switch flipped to `true` --
 * both now genuinely narrated too, since `toast`/`fire` are wrapped exactly like
 * `setVal` is. So merely toggling `nar_enabled` on is itself a real narrated event
 * before this file's own test code fires anything explicitly, and it starts the real
 * cooldown clock on both the 'toast' and 'notification' categories. Tests below
 * either lean on that (the cooldown test), work around it with baselines rather than
 * assuming a clean slate, or -- for "Both" -- configure everything BEFORE enabling,
 * so the one real narrated event (enabling itself) is the event under test rather
 * than something that has to outrun a cooldown clock it just started. See the long
 * comment above the (deliberately absent) "burst" test further down for why one
 * required-coverage property -- supersession -- is proven in narration.test.tsx's
 * pure suite rather than re-derived here, and cannot be forced through the real
 * mounted `App`, which uses the real clock and the real, non-zero default cooldown
 * exactly as the shipped app does.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// App.tsx reaches for `window`/`crypto` at construction and mount time, and
// `componentDidMount` really does call `window.addEventListener` (the command
// palette's global shortcut) -- none of which exist by default outside a browser.
(globalThis as unknown as { window?: unknown }).window = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

const { App } = await import('../../app/renderer/src/App.tsx');

type ControlRef = { id?: string; label?: string; kind?: string };
interface AppInstance {
  state: Record<string, unknown>;
  componentDidMount(): void;
  componentWillUnmount(): void;
  setVal(control: ControlRef, value: unknown): void;
  fire(title: string, body: string, isError?: boolean): void;
  toast(message: string): void;
  controlActionText(action: string): string;
}

const AppCtor = App as unknown as new (props: Record<string, never>) => AppInstance;

interface FakeVoice { voiceURI: string; name: string; lang: string; localService: boolean }
interface FakeUtterance {
  text: string; rate: number; pitch: number; voice: FakeVoice | null;
  onend: (() => void) | null; onerror: (() => void) | null;
}

/** The same fake-platform shape used by narration-engine.test.tsx, reused here so this
 *  mount test exercises the real adapter rather than a second stand-in for it. */
function installFakeSpeechPlatform(voices: FakeVoice[] = []) {
  const spoken: FakeUtterance[] = [];
  const listeners: Array<() => void> = [];

  class FakeUtteranceCtor implements FakeUtterance {
    text: string;
    rate = 1; pitch = 1; voice: FakeVoice | null = null;
    onend: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }

  const speechSynthesis = {
    getVoices: () => voices,
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      queueMicrotask(() => utterance.onend?.());
    },
    cancel: () => undefined,
    addEventListener: (_t: 'voiceschanged', l: () => void) => { listeners.push(l); },
    removeEventListener: (_t: 'voiceschanged', l: () => void) => {
      const at = listeners.indexOf(l);
      if (at !== -1) listeners.splice(at, 1);
    },
  };

  (globalThis as unknown as { speechSynthesis?: unknown }).speechSynthesis = speechSynthesis;
  (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = FakeUtteranceCtor;

  return {
    spoken,
    setVoices: (next: FakeVoice[]) => { voices = next; },
    fireVoicesChanged: () => { for (const l of [...listeners]) l(); },
  };
}

function removeFakeSpeechPlatform() {
  delete (globalThis as { speechSynthesis?: unknown }).speechSynthesis;
  delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
}

/** Many small ticks rather than a fixed few -- a queue draining several items each
 *  needing a couple of microtask hops needs more ticks than a queue draining one, and
 *  a microtask tick costs nothing to spend generously. */
async function flush(rounds = 30): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

/** Constructs the real `App`, runs its real `componentDidMount`, and returns a
 *  teardown that runs its real `componentWillUnmount` (clearing every timer the mount
 *  started, and disposing the narrator) so the test process can exit. */
async function mount(): Promise<{ app: AppInstance; unmount: () => void }> {
  const app = new AppCtor({});
  app.componentDidMount();
  await flush(); // let durableStorage.bootstrap().then(...) -- which calls restoreNarration -- settle
  return { app, unmount: () => app.componentWillUnmount() };
}

/** Every test follows the same shape: install a platform, mount, run the scenario,
 *  always unmount (even on assertion failure) so no test's leftover timers keep the
 *  process alive for the ones after it, then tear the platform down. */
async function withMountedApp(
  voices: FakeVoice[],
  run: (app: AppInstance, platform: ReturnType<typeof installFakeSpeechPlatform>) => Promise<void>,
): Promise<void> {
  const platform = installFakeSpeechPlatform(voices);
  try {
    const { app, unmount } = await mount();
    try {
      await run(app, platform);
    } finally {
      unmount();
    }
  } finally {
    removeFakeSpeechPlatform();
  }
}

const EN_VOICE: FakeVoice = { voiceURI: 'en-1', name: 'Alex', lang: 'en-US', localService: true };
const ZH_VOICE: FakeVoice = { voiceURI: 'zh-1', name: 'Sinji', lang: 'zh-HK', localService: true };

// ---------------------------------------------------------------- off by default

test('mounted fresh, with narration never enabled, nothing is ever spoken', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    app.fire('Connected', 'A server answered.');
    app.toast('Starting the phone system…');
    await flush();
    assert.equal(platform.spoken.length, 0, 'narration must stay silent until the user enables it');
  });
});

// ---------------------------------------------------------------- the actual defect: reachability

test('enabling narration through the real nar_enabled control causes a real enqueue that actually speaks', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    assert.equal(platform.spoken.length, 0, 'nothing spoken before the switch is touched');
    // The exact control id the compiled `nar_enabled` switch carries (see
    // app/renderer/src/generated/console.tsx and App.tsx's applyNarrationControl) --
    // this is the real path a user's click takes, never Narrator.enqueue directly.
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    assert.ok(platform.spoken.length > 0, 'expected the real speech platform to have been asked to speak once narration was turned on');
    assert.ok(platform.spoken.some((u) => /switched on/i.test(u.text)), 'expected the narrated text to actually describe the real event, not a placeholder');
  });
});

test('toggling nar_enabled back off silences it again, through the same real control path', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, false);
    await flush();
    const baseline = platform.spoken.length;

    app.fire('Connected', 'A server answered.');
    app.toast('Doing something.');
    await flush();
    assert.equal(platform.spoken.length, baseline, 'nothing further should be spoken once narration is off again');
  });
});

test('an explicit app.toast(...) call reaches real speech on its own, independent of fire()', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    // Enabling itself narrates through BOTH the 'toast' category (the compiled
    // shell's generic "… set to true") and the 'notification' category (its "Nice …
    // switched on." fire), which would make a toast-specific assertion right here
    // ambiguous about which of the two wrappers actually did the work. Waiting the
    // real cooldown out once clears both, so the only thing that can speak next is
    // whatever this test calls directly.
    await new Promise((resolve) => setTimeout(resolve, 3100));
    platform.spoken.length = 0;

    app.toast('a distinctive toast-only message, never passed to fire()');
    await flush();

    assert.equal(platform.spoken.length, 1, 'expected exactly one utterance from the one toast() call');
    assert.equal(platform.spoken[0]!.text, 'a distinctive toast-only message, never passed to fire()');
  });
});

// ---------------------------------------------------------------- strict serialization, "both"

test('choosing "Both" speaks English then Cantonese, strictly serialized, through the real control path', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE, ZH_VOICE], async (app, platform) => {
    // Configured before enabling: none of these three narrate anything (narration is
    // still off), which is itself worth asserting -- it is the other half of "off by
    // default" (configuring is not the same as enabling).
    app.setVal({ id: 'nar_language', kind: 'segmented' }, 'Both');
    app.setVal({ id: 'nar_en_voice', kind: 'select' }, 'Alex');
    app.setVal({ id: 'nar_yue_voice', kind: 'select' }, 'Sinji');
    await flush();
    assert.equal(platform.spoken.length, 0, 'configuring language/voice must not itself speak while narration is off');

    // Turning it on is now the one real event under test, and it is narrated in
    // "both" -- exactly the language/voice configuration just set above.
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();

    assert.ok(platform.spoken.length >= 2, `expected at least an English and a Cantonese utterance, got ${platform.spoken.length}`);
    const languagesInOrder = platform.spoken.map((u) => (u.voice?.voiceURI === EN_VOICE.voiceURI ? 'en' : u.voice?.voiceURI === ZH_VOICE.voiceURI ? 'zh' : 'other'));
    const firstEn = languagesInOrder.indexOf('en');
    const firstZh = languagesInOrder.indexOf('zh');
    assert.ok(firstEn !== -1 && firstZh !== -1, `expected both an English and a Cantonese utterance, got voices: ${languagesInOrder.join(', ')}`);
    assert.ok(firstEn < firstZh, `expected English to be spoken before Cantonese ("both" order), got: ${languagesInOrder.join(', ')}`);
    // No language pair may ever overlap: for every consecutive (en, zh) pair coming
    // from the same underlying event, en must have fully finished before zh starts --
    // guaranteed structurally by the queue being drained one item at a time, but
    // checked here by confirming there is no third language slipped between an en/zh
    // pair from a different, unrelated queued item interleaving mid-utterance.
    for (let i = 0; i < languagesInOrder.length; i += 1) {
      assert.notEqual(languagesInOrder[i], 'other', `unexpected voice at position ${i}`);
    }
  });
});

// ---------------------------------------------------------------- superseded lines replace, not stack
//
// This property is real and is exhaustively covered -- "a superseded queued line of
// the same category is replaced, not stacked" in narration.test.tsx, exercising the
// exact same unmodified `Narrator` class this file mounts through `App`. It is
// deliberately NOT re-derived here as a mount-level test, and that is worth stating
// rather than silently omitting: `Narrator.enqueue`'s cooldown check runs BEFORE its
// supersession check, keyed on wall-clock time since the category's last item was
// POPPED from the queue (not since it finished playing, and not since it was
// enqueued) -- so with the real, non-zero `DEFAULT_COOLDOWN_MS` that `App` actually
// constructs its one `Narrator` with, a second same-category item arriving within the
// cooldown window is rejected by the cooldown check outright, before the
// replace-don't-stack logic further down ever runs. Supersession-while-queued is only
// OBSERVABLE at a near-zero cooldown, which is exactly why narration.test.tsx
// constructs its `Narrator` with `{ cooldownMs: 0 }` for that one test -- confirmed
// experimentally while writing this file: the equivalent burst fired through the real
// mounted `App` (which offers no way to inject a fake clock or a shorter cooldown)
// spoke only the FIRST toast in a four-toast burst, with the remaining three rejected
// by the cooldown rather than collapsed into the last. That is real, correct,
// currently-shipped behaviour of the unmodified `Narrator` class, not a defect this
// file's wiring introduced -- and forcing an assertion to pretend otherwise would be
// exactly the kind of guard this document is meant to warn against.
//
// The cooldown test below proves the piece that IS reachable and meaningful at the
// mount level: that the shared category actually suppresses a rapid ordinary repeat.

// ---------------------------------------------------------------- cooldown suppresses ordinary, never an error

test('the cooldown suppresses a rapid ordinary fire but never a genuine daemon-failure error, through the real call sites', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    // Turning narration on itself speaks through the 'notification' category (the
    // compiled shell's own "Nice … switched on." fire) -- that IS this test's first
    // ordinary notice and it starts the real cooldown clock, so nothing further needs
    // to be fired to establish the baseline.
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    const afterEnabling = platform.spoken.length;
    assert.ok(afterEnabling >= 1, 'expected enabling itself to have spoken at least once');

    // A second ordinary fire, immediately after, in the same 'notification' category
    // -- still well inside the cooldown window -- must be suppressed.
    app.fire('Also connected', 'A second server answered.');
    await flush();
    assert.equal(platform.spoken.length, afterEnabling, 'an ordinary notice arriving inside the cooldown window must be suppressed');

    // A real error, passed exactly the way daemonAction/ensureDaemon call it (the two
    // places in App.tsx that pass `true` for `fire`'s `isError` argument) -- never
    // suppressed, however soon after the last ordinary notice it arrives.
    app.fire('The phone system did not start', 'Asterisk did not answer.', true);
    await flush();
    assert.equal(platform.spoken.length, afterEnabling + 1, 'an error must never be dropped by the cooldown, even immediately after another notice');
    assert.match(platform.spoken.at(-1)!.text, /did not start/, 'spoken error narration must name the actual failure');
  });
});

// ---------------------------------------------------------------- honest "no speech synthesis" state

test('with no speechSynthesis on the platform at all, the real status control reports it honestly rather than staying silently indistinguishable from the original defect', { timeout: 20_000 }, async () => {
  removeFakeSpeechPlatform(); // no engine at all for this one -- do not install one
  const { app, unmount } = await mount();
  try {
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    const status = app.controlActionText('narration-status');
    // Two honest messages are possible depending on exactly which code path last
    // wrote the status line (see narration-engine.ts's NULL_SPEECH_ENGINE doc comment
    // for why "no voice available" is the deliberately-chosen path once any control
    // is touched): "no speech synthesis" from the initial mount-time enumeration, or
    // "no voice … can read" from resolveVoiceStatus's own honest no-voice-available
    // kind. Either is a real, spoken-aloud-worthy report; neither is a blank line.
    assert.match(status, /no (speech synthesis|voice)/i, `expected an honest reported reason nothing can speak, got: "${status}"`);
    assert.notEqual(status.trim(), '', 'the status must never be silently blank');

    // And, crucially, this must not look like the original defect: enabling
    // narration and firing an event must not throw or hang -- it must simply have
    // nothing to say through, which the status line above already reports honestly.
    app.fire('Connected', 'A server answered.');
    await flush();
  } finally {
    unmount();
  }
});

// ---------------------------------------------------------------- voice enumeration arrives late

test('an empty first voice enumeration followed by a populated one is picked up through the real mount, not just the pure module', { timeout: 20_000 }, async () => {
  await withMountedApp([], async (app, platform) => {
    // The precise phrase resolveVoiceStatus's `no-voice-available` kind uses -- not
    // the broader "no voice" (which also matches the entirely different, and equally
    // honest, "No voice chosen … using the system default" the status can show once a
    // voice DOES exist but has not been explicitly picked yet).
    const NO_VOICE_INSTALLED = /no voice on this machine can read/i;
    const before = app.controlActionText('narration-status');
    assert.match(before, NO_VOICE_INSTALLED, `expected the real status line to report no voice yet, got: "${before}"`);

    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    const beforeVoiceArrival = platform.spoken.length;

    // Simulate the platform's voice list actually arriving, the way it commonly does
    // moments after first asked -- by mutating the installed fake and firing its
    // 'voiceschanged' listeners, exactly as `createWebSpeechEngine`'s
    // `onVoicesChanged` and App's own `startVoiceEnumeration` both subscribe to.
    (platform as unknown as { setVoices(v: FakeVoice[]): void }).setVoices([EN_VOICE]);
    (platform as unknown as { fireVoicesChanged(): void }).fireVoicesChanged();
    await flush();

    const after = app.controlActionText('narration-status');
    assert.doesNotMatch(after, NO_VOICE_INSTALLED, `expected the newly-arrived voice to be reflected in the real status, got: "${after}"`);

    app.setVal({ id: 'nar_en_voice', kind: 'select' }, 'Alex');
    await flush();
    // Enabling narration a few lines above already used up the real 'notification'
    // cooldown slot; `isError: true` here is deliberately used only to see past that
    // leftover cooldown so this assertion is about the newly-arrived voice actually
    // being usable, not a second test of cooldown-vs-error (already covered above).
    app.fire('Connected', 'A server answered.', true);
    await flush();
    assert.ok(platform.spoken.length > beforeVoiceArrival, 'expected the newly-arrived voice to actually be usable to speak');
  });
});

// ---------------------------------------------------------------- coexisting with assistive technology

test('a real active screen reader signal from the desktop bridge ducks the narrator, through the real mount chain', { timeout: 20_000 }, async () => {
  const win = (globalThis as unknown as { window: Record<string, unknown> }).window;
  // The minimum truthy bridge shape App.tsx's own DesktopBridge/DingDesktopApi
  // expects -- `controlPlane.request` must exist and resolve, or the unrelated
  // background calls componentDidMount kicks off (discover(), servers.load()) would
  // throw reading `.request` off `undefined`. `accessibility` is the one real signal
  // under test here: Electron's own `app.isAccessibilitySupportEnabled()`, forwarded
  // through `main.ts`/`preload.ts` exactly as `listenForScreenReader` expects it.
  win.dingDesktop = {
    platform: 'test',
    window: { minimize: () => undefined, toggleMaximize: () => undefined, close: () => undefined },
    controlPlane: { request: () => Promise.resolve(undefined) },
    accessibility: {
      isScreenReaderActive: () => Promise.resolve(true),
      onChange: () => () => undefined,
    },
  };
  try {
    await withMountedApp([EN_VOICE], async (app, platform) => {
      app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
      await flush();
      assert.equal(platform.spoken.length, 0, 'a real active screen reader must suppress narration even though it is enabled');

      app.fire('Connected', 'A server answered.', true); // isError -- proves suppression beats even the never-dropped path
      await flush();
      assert.equal(platform.spoken.length, 0, 'a screen reader duck must not be bypassable by an error either -- it is a hard suppression, not a cooldown');
    });
  } finally {
    delete win.dingDesktop;
  }
});

test('with no accessibility bridge at all (the hosted HTTP surface), the mount degrades quietly rather than throwing', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    assert.ok(platform.spoken.length > 0, 'expected narration to still work normally when no accessibility bridge exists at all');
  });
});

// ---------------------------------------------------------------- quiet hours (Low stimulation)

test('turning on Low stimulation ducks the narrator live, through the real att_low control -- and turning it off resumes narration', { timeout: 20_000 }, async () => {
  await withMountedApp([EN_VOICE], async (app, platform) => {
    app.setVal({ id: 'nar_enabled', kind: 'switch' }, true);
    await flush();
    const baseline = platform.spoken.length;

    // att_ handling applies `setQuiet` before the compiled shell's own generic
    // side-effect toast/fire for this same setVal call, so even THAT side effect
    // must be suppressed -- proving quiet mode really does apply live, not only on
    // the next restart.
    app.setVal({ id: 'att_low', kind: 'switch' }, true);
    await flush();
    assert.equal(platform.spoken.length, baseline, 'turning on Low stimulation must not itself be narrated once quiet mode takes effect');

    // isError deliberately bypasses the cooldown, isolating this assertion to the
    // quiet suppression specifically rather than the already-covered cooldown path.
    app.fire('Connected', 'A server answered.', true);
    await flush();
    assert.equal(platform.spoken.length, baseline, 'an explicit fire (even an error) must still be suppressed while Low stimulation is on');

    app.setVal({ id: 'att_low', kind: 'switch' }, false);
    app.fire('Reconnected', 'Answered again.', true);
    await flush();
    assert.ok(platform.spoken.length > baseline, 'expected narration to resume once Low stimulation is turned back off');
  });
});

// ---------------------------------------------------------------- BREAK CHECK

test('BREAK CHECK — App.tsx genuinely imports Narrator and calls .enqueue(, anchored so a comment or a rename cannot satisfy it', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = (await readFile(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

  // Anchored to an actual named import from './narration', not a bare substring --
  // this is exactly the original defect: every OTHER symbol from narration.ts was
  // already imported, so a substring check for "Narrator" alone would have passed
  // even before this fix, matching inside `NarratorClock`/`NarratorOptions` types
  // that narration.ts itself exports.
  const narrationImport = source.match(/^import\s*\{([^}]*)\}\s*from\s*'\.\/narration';/m);
  assert.ok(narrationImport, 'expected a named import block from ./narration');
  const importedNames = narrationImport![1].split(',').map((n) => n.trim());
  assert.ok(importedNames.includes('Narrator'), 'expected the Narrator class itself to be imported, not only its types/helpers');

  // Anchored to a real call, not commented out -- `//` before it would still contain
  // this exact substring, which is precisely how a sibling lane's first attempt at a
  // guard like this one passed against a commented-out line.
  const enqueueCallLines = source.split('\n').filter((line) => /\.enqueue\(/.test(line) && !/^\s*\/\//.test(line.trim()));
  assert.ok(enqueueCallLines.length > 0, 'expected at least one live (non-commented) call to narrator.enqueue(');
  assert.ok(enqueueCallLines.some((line) => /this\.narrator\.enqueue\(/.test(line)), "expected the call to be on the mounted App's own narrator field");
});

test('BREAK CHECK PROOF — the anchored import check actually rejects a substring-only match', () => {
  const fakeSourceWithOnlyTypesImported = "import {\n  NarratorClock, NarratorOptions, defaultNarrationSettings,\n} from './narration';\n";
  const narrationImport = fakeSourceWithOnlyTypesImported.match(/^import\s*\{([^}]*)\}\s*from\s*'\.\/narration';/m);
  const importedNames = narrationImport![1].split(',').map((n) => n.trim());
  assert.equal(importedNames.includes('Narrator'), false, 'a fake source importing only NarratorClock/NarratorOptions must not read as importing Narrator');
});

test('BREAK CHECK PROOF — the anchored enqueue check actually rejects a commented-out call', () => {
  const fakeSourceWithCommentedCall = "    // this.narrator.enqueue('x', 'y');\n";
  const enqueueCallLines = fakeSourceWithCommentedCall.split('\n').filter((line) => /\.enqueue\(/.test(line) && !/^\s*\/\//.test(line.trim()));
  assert.equal(enqueueCallLines.length, 0, 'a commented-out call must not count as a live one');
});

test('the two genuine boolean-checked daemon failures actually pass isError=true to the real fire() call, not just the mechanism in isolation', async () => {
  // The cooldown test above proves the MECHANISM: fire(..., true) is never dropped by
  // the cooldown. This proves the two real call sites this whole feature exists for
  // -- ensureDaemon's "did not start" and daemonAction's "Not done" -- actually reach
  // for it, anchored to the literal title strings so a future edit that changes the
  // wording without preserving the trailing `, true)` is caught rather than silently
  // matched by a looser pattern.
  const { readFile } = await import('node:fs/promises');
  const source = (await readFile(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  for (const title of ['The phone system did not start', 'Not done']) {
    const pattern = new RegExp(`this\\.fire\\('${title}',\\s*\\S+,\\s*true\\)`);
    assert.ok(pattern.test(source), `expected this.fire('${title}', …, true) -- a real, boolean-checked daemon failure that must never be dropped by the cooldown`);
  }
});
