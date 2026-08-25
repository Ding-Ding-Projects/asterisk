/**
 * Attention modes -- wired.
 *
 * `attention-modes.ts` was already correct and already fully tested before this lane
 * started: `presentationFor()` computed the right object, `momentumPrompt()` computed
 * the right prompt, and both were imported by `App.tsx` for exactly one purpose --
 * persisting the switch. Nothing ever read the object back. Every test in
 * `attention-modes.test.tsx` passed the whole time, because none of them touch
 * `App.tsx` at all -- which is precisely the gap this file exists to close.
 *
 * Two techniques prove the wiring rather than the helper:
 *
 *  - Rendering the real `App` through `renderToStaticMarkup`, pinned on a screen, with
 *    the durable-storage seam pre-seeded -- the same technique `changelog-wired.test.tsx`
 *    already uses. This proves `render()` itself reads live presentation state and
 *    produces real markup from it.
 *  - Constructing `App` directly and calling its own control-interception method
 *    (`languageAwareSetVal`, the same function every real switch in the console routes
 *    through) with a fake `document` installed first. This proves the *side effect* --
 *    a real style element appearing in a real head -- rather than only the pure
 *    function's return value, which is exactly what a broken wiring would still get
 *    right.
 *
 * `document`/`window` are not available under this project's plain Node test runner
 * (see `changelog-wired.test.tsx`'s own `window` stub), so a minimal fake stands in for
 * both, kept intentionally small: a `createElement`/`head.appendChild` pair, nothing
 * else. The console never needs more than that to inject or remove a style element.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

interface FakeStyleEl {
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
  setAttribute(key: string, value: string): void;
  remove(): void;
}

/** The style elements actually appended to `<head>` by the running App instance --
 *  the real side effect `setReducedMotion` performs, not a description of it. */
function installFakeDocument(): { elements: FakeStyleEl[] } {
  const elements: FakeStyleEl[] = [];
  const fakeDocument = {
    createElement: (tag: string) => {
      const el: FakeStyleEl = {
        tag, attrs: {}, textContent: '',
        setAttribute(key: string, value: string) { this.attrs[key] = value; },
        remove() { const i = elements.indexOf(el); if (i >= 0) elements.splice(i, 1); },
      };
      return el;
    },
    head: { appendChild: (el: unknown) => { elements.push(el as FakeStyleEl); } },
    documentElement: { style: { setProperty() { /* unused by this file's cases */ }, fontSize: '' } },
    // App.tsx also reads document.querySelector for the appearance editor's own DOM
    // lookup, unrelated to attention modes -- stubbed so that unrelated path degrades
    // the same way it already does with no document at all, rather than crashing on a
    // document that exists but is missing a method this file never needed.
    querySelector: () => null,
  };
  (globalThis as { document?: unknown }).document = fakeDocument;
  return { elements };
}

// window is read by App's constructor (bridge()); document by the reduced-motion path.
// Both are installed before the very first import of App.tsx, matching the existing
// precedent in changelog-wired.test.tsx.
(globalThis as { window?: unknown }).window ??= {} as unknown;
const fakeDocument = installFakeDocument();

import { App } from '../../app/renderer/src/App';
import { msSinceSnooze, type PresentationState } from '../../app/renderer/src/attention-modes';

/** The minimal storage seam every helper in attention-modes.ts already expects. */
interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ReactLikeElement {
  props: { children?: unknown; onClick?: () => void; class?: string; onInput?: (event: { target: { value: string } }) => void };
}

/** The exact private surface these tests drive -- the same functions the real console
 *  calls, cast rather than reimplemented, per the house rule against retesting a copy
 *  of the code under test. */
interface AppShape {
  durableStorage: { storage: FakeStorage };
  state: Record<string, unknown>;
  lastChangeAt: number;
  attentionPresentation(): PresentationState;
  attentionOverlay(): ReactLikeElement | null;
  languageAwareSetVal(control: { id: string }, value: unknown): void;
  gatedToast(message: string): void;
  baseToast: (message: string) => void;
}

function buildApp(): AppShape {
  return new (App as unknown as new (props: unknown) => AppShape)({});
}

/** Renders the real `App` (not the bare compiled shell), the same shape
 *  `changelog-wired.test.tsx` uses -- pinned on a screen with the durable-storage seam
 *  pre-seeded, exactly as a real relaunch would leave it. */
function renderApp(seed: (storage: FakeStorage) => void, overrides: Record<string, unknown> = {}): string {
  class Pinned extends (App as unknown as new (props: unknown) => AppShape) {
    constructor(props: unknown) {
      super(props);
      seed(this.durableStorage.storage);
      this.state = { ...this.state, screen: 'dash', railId: 'app', onboardOpen: false, ...overrides };
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

/** Depth-first search for the first rendered element carrying a given `class`, so a
 *  handler (onClick, onInput) can be invoked directly without a real DOM. */
function findByClass(node: unknown, className: string): ReactLikeElement | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const el = node as ReactLikeElement;
  if (el.props?.class === className) return el;
  const kids = el.props?.children;
  const list = Array.isArray(kids) ? kids : kids !== undefined ? [kids] : [];
  for (const kid of list) {
    const found = findByClass(kid, className);
    if (found) return found;
  }
  return undefined;
}

const appSource = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/App.tsx'), 'utf8');

/* --- focus: dims live, never hides ------------------------------------------------ */

test('the console renders its own dimming scope on every screen, whether or not focus is on', () => {
  // FOCUS_DIM_CSS is scoped to .attn-content; without this wrapper always present,
  // there would be nothing for the injected stylesheet to ever match.
  const markup = renderApp(() => {});
  assert.match(markup, /class="attn-content"/);
});

test('turning focus off renders no dimming stylesheet at all', () => {
  const markup = renderApp(() => {});
  assert.ok(!markup.includes(':focus-within'), 'expected no focus-dimming style when the mode is off');
});

test('turning focus on renders the real dimming stylesheet, not a placeholder', () => {
  const markup = renderApp((s) => s.setItem('console.attention.focus', 'on'));
  assert.match(markup, /opacity:\s*\.55/);
  assert.match(markup, /:focus-within/);
});

test('toggling att_focus through the real control path changes live presentation, not just storage', () => {
  const instance = buildApp();
  assert.equal(instance.attentionPresentation().dimInactive, false);
  instance.languageAwareSetVal({ id: 'att_focus' }, true);
  assert.equal(instance.attentionPresentation().dimInactive, true);
  instance.languageAwareSetVal({ id: 'att_focus' }, false);
  assert.equal(instance.attentionPresentation().dimInactive, false);
});

/* --- low stimulation: motion composes, notifications quiet down ------------------- */

test('turning on low stimulation actually injects the reduced-motion style element', () => {
  const instance = buildApp();
  const before = fakeDocument.elements.filter((e) => e.attrs['data-console-setting'] === 'p_motion');
  assert.equal(before.length, 0);
  instance.languageAwareSetVal({ id: 'att_low' }, true);
  const after = fakeDocument.elements.filter((e) => e.attrs['data-console-setting'] === 'p_motion');
  assert.equal(after.length, 1, 'expected a real style element in a real head, not only a computed flag');
  assert.match(after[0].textContent, /animation-duration:0\.001ms !important/);
  instance.languageAwareSetVal({ id: 'att_low' }, false);
  const removed = fakeDocument.elements.filter((e) => e.attrs['data-console-setting'] === 'p_motion');
  assert.equal(removed.length, 0, 'expected the element removed once nothing still wants reduced motion');
});

test('the Reduced motion switch and low stimulation share one element rather than fighting over it', () => {
  const instance = buildApp();
  instance.languageAwareSetVal({ id: 'p_motion' }, true);
  instance.languageAwareSetVal({ id: 'att_low' }, true);
  instance.languageAwareSetVal({ id: 'p_motion' }, false);
  // Low stimulation is still on, so motion must still be reduced -- the whole point of
  // "composes with, never overrides" is that turning off one source never turns off
  // a reduction another source still wants.
  const stillOn = fakeDocument.elements.filter((e) => e.attrs['data-console-setting'] === 'p_motion');
  assert.equal(stillOn.length, 1, 'expected reduced motion to remain active while low stimulation is still on');
  instance.languageAwareSetVal({ id: 'att_low' }, false);
  const finallyOff = fakeDocument.elements.filter((e) => e.attrs['data-console-setting'] === 'p_motion');
  assert.equal(finallyOff.length, 0);
});

test('an ambient toast is quieted by low stimulation', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.lowStimulation', 'on');
  let called: string | undefined;
  instance.baseToast = (m: string) => { called = m; };
  instance.gatedToast('Starting the phone system…');
  assert.equal(called, undefined, 'expected the ambient toast to be quieted');
});

test('an ambient toast still shows once low stimulation is off', () => {
  const instance = buildApp();
  let called: string | undefined;
  instance.baseToast = (m: string) => { called = m; };
  instance.gatedToast('Starting the phone system…');
  /* Not an exact-string comparison against the raw message any more. A sibling lane made
   * toast copy pass through the humour-level and emoji styling on its way to baseToast, so
   * equality with the unstyled text broke on a change that was entirely intended. What this
   * test is actually for is that the toast is not quieted, and that whatever styling does to
   * the voice it does not lose the fact -- so it asserts both of those instead. */
  assert.ok(called !== undefined, 'the ambient toast was quieted while low stimulation is off');
  assert.match(called, /Starting the phone system/, 'the toast no longer says what it is reporting');
});

test('low stimulation never dims content -- that is Focus mode\'s field, not this one\'s', () => {
  const instance = buildApp();
  instance.languageAwareSetVal({ id: 'att_low' }, true);
  assert.equal(instance.attentionPresentation().dimInactive, false);
});

/* --- time awareness: a number, where the work happens ----------------------------- */

test('no elapsed-time reading anywhere when the mode is off', () => {
  const markup = renderApp(() => {});
  assert.ok(!markup.includes('Open for'), 'expected no elapsed-time text when time awareness is off');
});

test('time awareness renders where the console itself is, not only on a settings row', () => {
  const markup = renderApp((s) => s.setItem('console.attention.timeAwareness', 'on'));
  assert.match(markup, /Open for /);
  assert.match(markup, /Last change /);
});

test('the elapsed reading uses the real session and change clocks, not a fixed string', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.timeAwareness', 'on');
  instance.lastChangeAt = Date.now() - 45 * 60_000;
  const overlay = instance.attentionOverlay();
  const time = findByClass(overlay, 'attn-rail-time');
  assert.ok(time, 'expected the time-awareness row to render');
  const text = JSON.stringify(time);
  assert.match(text, /45 minutes/);
});

/* --- one thing at a time: chosen, not inferred, and it survives a context switch -- */

test('no next-action field anywhere when the mode is off', () => {
  const markup = renderApp(() => {});
  assert.ok(!markup.includes('attn-rail-next'));
});

test('the chosen next action renders and reflects what was actually stored', () => {
  const markup = renderApp((s) => {
    s.setItem('console.attention.oneThing', 'on');
    s.setItem('console.attention.nextAction', 'Reload the trunk after the codec change');
  });
  assert.ok(markup.includes('Reload the trunk after the codec change'));
});

test('the chosen next action is the same value on every screen -- surviving a context switch', () => {
  const seed = (s: FakeStorage) => {
    s.setItem('console.attention.oneThing', 'on');
    s.setItem('console.attention.nextAction', 'Finish the endpoint wizard');
  };
  const onDash = renderApp(seed, { screen: 'dash' });
  const onEndpoints = renderApp(seed, { screen: 'endpoints' });
  assert.ok(onDash.includes('Finish the endpoint wizard'));
  assert.ok(onEndpoints.includes('Finish the endpoint wizard'));
});

test('editing the field persists the new choice for the next render', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.oneThing', 'on');
  const overlay = instance.attentionOverlay();
  const input = findByClass(overlay, 'attn-rail-next-input');
  assert.ok(input, 'expected the next-action input to render');
  input?.props.onInput?.({ target: { value: 'Renew the ACL for the new site' } });
  assert.equal(
    instance.durableStorage.storage.getItem('console.attention.nextAction'),
    'Renew the ACL for the new site',
  );
});

/* --- momentum: declined means declined, in the real console --------------------- */

test('no prompt anywhere when the mode is off, however long it has been', () => {
  const instance = buildApp();
  instance.lastChangeAt = Date.now() - 10 * 60 * 60 * 1000;
  const overlay = instance.attentionOverlay();
  assert.equal(findByClass(overlay, 'attn-rail-momentum'), undefined);
});

test('no prompt before the idle threshold, in the real console', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.momentum', 'on');
  instance.lastChangeAt = Date.now();
  const overlay = instance.attentionOverlay();
  assert.equal(findByClass(overlay, 'attn-rail-momentum'), undefined);
});

test('a due prompt renders in the real console, stating the fact and nothing more', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.momentum', 'on');
  instance.lastChangeAt = Date.now() - 40 * 60_000;
  const overlay = instance.attentionOverlay();
  const prompt = findByClass(overlay, 'attn-rail-momentum');
  assert.ok(prompt, 'expected a due momentum prompt to render');
  assert.match(JSON.stringify(prompt), /Nothing has changed here for 40 minutes\./);
});

test('the Not now button snoozes immediately, through the real storage seam', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.momentum', 'on');
  instance.lastChangeAt = Date.now() - 45 * 60_000;
  const overlay = instance.attentionOverlay();
  const button = findByClass(overlay, 'attn-rail-momentum-dismiss');
  assert.ok(button, 'expected a Not now button to render alongside a due prompt');
  button?.props.onClick?.();
  assert.equal(msSinceSnooze(instance.durableStorage.storage), 0, 'expected the snooze to be recorded now');
  const overlayAfter = instance.attentionOverlay();
  assert.equal(findByClass(overlayAfter, 'attn-rail-momentum'), undefined, 'expected the prompt gone immediately after Not now');
});

test('a recent Not now keeps the prompt away even though the idle threshold is long past', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.momentum', 'on');
  instance.lastChangeAt = Date.now() - 60 * 60_000;
  instance.durableStorage.storage.setItem('console.attention.snoozedAt', String(Date.now() - 60_000));
  const overlay = instance.attentionOverlay();
  assert.equal(findByClass(overlay, 'attn-rail-momentum'), undefined, 'expected "not now" to still be respected');
});

test('any real control change resets the "since anything changed" clock momentum reads', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.momentum', 'on');
  instance.lastChangeAt = Date.now() - 60 * 60_000;
  assert.ok(findByClass(instance.attentionOverlay(), 'attn-rail-momentum'), 'expected a due prompt before any change');
  instance.languageAwareSetVal({ id: 'p_mono' }, true);
  assert.equal(
    findByClass(instance.attentionOverlay(), 'attn-rail-momentum'),
    undefined,
    'expected the prompt to clear itself once a real control changed, without touching momentum directly',
  );
});

/* --- independence, at the App level, not only inside the pure module ------------- */

test('turning on every mode except momentum renders no momentum prompt, however long it has been', () => {
  const instance = buildApp();
  for (const id of ['att_focus', 'att_low', 'att_time', 'att_one']) instance.languageAwareSetVal({ id }, true);
  instance.lastChangeAt = Date.now() - 60 * 60_000;
  const overlay = instance.attentionOverlay();
  assert.equal(findByClass(overlay, 'attn-rail-momentum'), undefined);
});

test('turning on time awareness alone renders no next-action field and no dimming stylesheet', () => {
  const markup = renderApp((s) => s.setItem('console.attention.timeAwareness', 'on'));
  assert.ok(!markup.includes('attn-rail-next'));
  assert.ok(!markup.includes(':focus-within'));
});

/* --- the copy on the rail itself: same rules as the settings screen --------------- */

test('the rendered rail carries no medical, judgemental or gamified language', () => {
  const markup = renderApp((s) => {
    s.setItem('console.attention.timeAwareness', 'on');
    s.setItem('console.attention.oneThing', 'on');
    s.setItem('console.attention.momentum', 'on');
  }, {});
  const rail = markup.match(/<div class="attn-rail"[\s\S]*?<\/div><\/div><\/div>/)?.[0] ?? markup;
  for (const term of ['adhd', 'disorder', 'diagnos', 'streak', 'score', 'congratulat', 'you should']) {
    assert.ok(!rail.toLowerCase().includes(term), `rail markup contains "${term}"`);
  }
});

/* --- restore on relaunch: reachable, source-verified ------------------------------ */

test('App.tsx restores each attention switch\'s own position, not just the mode\'s behaviour', () => {
  assert.match(appSource, /restoreAttentionModes\(\)/, 'expected a restore step for the switches\' own state.values');
  assert.match(appSource, /modeEnabled\(this\.durableStorage\.storage, mode as AttentionMode\)/);
});

test('the restore step and the live-apply step both run from the real bootstrap chain', () => {
  const mountBlock = appSource.slice(appSource.indexOf('componentDidMount()'), appSource.indexOf('componentWillUnmount()'));
  assert.match(mountBlock, /applyRestoredLiveConsoleSettings\(\)/, 'expected applyRestoredLiveConsoleSettings() called from componentDidMount\'s bootstrap chain');
  const restoreFn = appSource.slice(
    appSource.indexOf('private applyRestoredLiveConsoleSettings()'),
    appSource.indexOf('private applyStartScreen()'),
  );
  assert.match(restoreFn, /this\.restoreAttentionModes\(\);/);
  assert.match(restoreFn, /this\.applyLiveAttentionSetting\(\);/);
});

test('BREAK CHECK -- a renamed restore call is what the two guards above actually catch', () => {
  const withoutRestore = appSource.replace(/this\.restoreAttentionModes\(\);/, 'this.restoreAttentionModesRENAMED();');
  const mountBlock = withoutRestore.slice(
    withoutRestore.indexOf('private applyRestoredLiveConsoleSettings()'),
    withoutRestore.indexOf('private applyStartScreen()'),
  );
  assert.doesNotMatch(mountBlock, /(?<!RENAMED)this\.restoreAttentionModes\(\);/);
});
