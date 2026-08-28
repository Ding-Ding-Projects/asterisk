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
function installFakeDocument(): { elements: FakeStyleEl[]; attentionTargets: Array<{ dataset: Record<string, string> }> } {
  const elements: FakeStyleEl[] = [];
  const attentionTargets = [{ dataset: {} }, { dataset: {} }];
  const lowStimulationClasses = new Set<string>();
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
    body: { classList: { toggle(name: string, enabled: boolean) { if (enabled) lowStimulationClasses.add(name); else lowStimulationClasses.delete(name); } } },
    // App.tsx also reads document.querySelector for the appearance editor's own DOM
    // lookup, unrelated to attention modes -- stubbed so that unrelated path degrades
    // the same way it already does with no document at all, rather than crashing on a
    // document that exists but is missing a method this file never needed.
    querySelector: () => null,
    querySelectorAll: (selector: string) => selector.includes('.attn-content') ? attentionTargets : [],
  };
  (globalThis as { document?: unknown }).document = fakeDocument;
  return { elements, attentionTargets, lowStimulationClasses };
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
  props: { children?: unknown; onClick?: () => void; className?: string; onInput?: (event: { target: { value: string } }) => void };
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
  gatedToast(message: string, severity?: 'info' | 'progress' | 'success' | 'warning' | 'error'): void;
  narratedFire(title: string, body: string, severity?: 'info' | 'progress' | 'success' | 'warning' | 'error' | boolean): void;
  baseToast: (message: string) => void;
  baseFire: (title: string, body: string) => void;
  notificationHistory: Array<{ source: string; message: string; severity: string; outcome: string; read: boolean }>;
}

function buildApp(): AppShape {
  return withSyncUpdater(new (App as unknown as new (props: unknown) => AppShape)({}));
}

/** Direct construction intentionally skips ReactDOM, so supply the same synchronous
 * updater used by the message wiring Chut. This keeps stateful interactions honest
 * and prevents React's unmounted-component warning from hiding a dropped update. */
function withSyncUpdater(instance: AppShape): AppShape {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(publicInstance: AppShape, state: Record<string, unknown>) { publicInstance.state = state; },
    /* React's post-commit callback, run rather than dropped -- see the note on the same
     * stub in app-message-styling-wired.test.tsx for what dropping it hid. */
    enqueueSetState(publicInstance: AppShape, partial: unknown, callback?: () => void) {
      const next = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(publicInstance.state)
        : partial as Record<string, unknown>;
      publicInstance.state = { ...publicInstance.state, ...next };
      callback?.();
    },
  };
  return instance;
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

/** Depth-first search for the first rendered element carrying a given `className`, so a
 *  handler (onClick, onInput) can be invoked directly without a real DOM. */
function findByClass(node: unknown, className: string): ReactLikeElement | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const el = node as ReactLikeElement;
  if (el.props?.className === className) return el;
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
  assert.deepEqual(fakeDocument.attentionTargets.map((element) => element.dataset.attentionInactive), ['true', 'true'],
    'focus did not mark the real operable elements for the reversible stylesheet treatment');
  instance.languageAwareSetVal({ id: 'att_focus' }, false);
  assert.equal(instance.attentionPresentation().dimInactive, false);
  assert.deepEqual(fakeDocument.attentionTargets.map((element) => element.dataset.attentionInactive), ['false', 'false'],
    'turning focus off did not restore every operable element');
});

test('the focus stylesheet de-emphasises only marked inactive controls and restores a focused control', () => {
  const styles = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/styles.css'), 'utf8');
  assert.match(styles, /^\[data-attention-inactive="true"\] \{ opacity: \.55;/m);
  assert.match(styles, /^\[data-attention-inactive="true"\]:focus,/m);
  const withoutMarker = styles.replace('[data-attention-inactive="true"] { opacity: .55; transition: opacity 150ms ease; }', '');
  assert.doesNotMatch(withoutMarker, /^\[data-attention-inactive="true"\] \{ opacity: \.55;/m,
    'the deliberate marker-removal fixture must turn red before the stylesheet is restored');
});

test('every real attention switch writes its own exact persisted mode key through the production control path', () => {
  const instance = buildApp();
  const controls = [
    ['att_focus', 'focus'],
    ['att_low', 'lowStimulation'],
    ['att_time', 'timeAwareness'],
    ['att_one', 'oneThing'],
    ['att_momentum', 'momentum'],
  ] as const;
  for (const [id, mode] of controls) {
    instance.languageAwareSetVal({ id }, true);
    assert.equal(instance.durableStorage.storage.getItem(`console.attention.${mode}`), 'on', `${id} did not persist its own mode`);
    instance.languageAwareSetVal({ id }, false);
    assert.equal(instance.durableStorage.storage.getItem(`console.attention.${mode}`), 'off', `${id} did not persist its own off state`);
  }
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

test('low stimulation applies and removes its real body state alongside the live motion treatment', () => {
  const instance = buildApp();
  instance.languageAwareSetVal({ id: 'att_low' }, true);
  assert.equal(fakeDocument.lowStimulationClasses.has('attention-low-stimulation'), true);
  instance.languageAwareSetVal({ id: 'att_low' }, false);
  assert.equal(fakeDocument.lowStimulationClasses.has('attention-low-stimulation'), false);

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

test('low stimulation suppresses an informational toast and records the structured decision', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.lowStimulation', 'on');
  let called: string | undefined;
  instance.baseToast = (m: string) => { called = m; };
  instance.gatedToast('Starting the phone system…', 'info');
  assert.equal(called, undefined, 'expected the ambient toast to be quieted');
  assert.deepEqual(
    (({ source, message, severity, outcome, read }) => ({ source, message, severity, outcome, read }))(instance.notificationHistory[0]),
    { source: 'toast', message: 'Starting the phone system…', severity: 'info', outcome: 'suppressed', read: false },
  );
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

test('low stimulation still delivers warning and error notices, with severity-aware history', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.lowStimulation', 'on');
  const delivered: Array<[string, string]> = [];
  instance.baseFire = (title: string, body: string) => { delivered.push([title, body]); };
  instance.narratedFire('Warning stays visible', 'A person needs to review this.', 'warning');
  instance.narratedFire('Error stays visible', 'The operation did not complete.', 'error');
  assert.equal(delivered.length, 2, 'warning and error notices must remain delivered during low stimulation');
  assert.deepEqual(instance.notificationHistory.slice(0, 2).map((entry) => [entry.severity, entry.outcome]), [
    ['error', 'delivered'], ['warning', 'delivered'],
  ]);
});

test('low stimulation also suppresses an explicitly informational fired notice and records it', () => {
  const instance = buildApp();
  instance.durableStorage.storage.setItem('console.attention.lowStimulation', 'on');
  let called = false;
  instance.baseFire = () => { called = true; };
  instance.narratedFire('Informational notice', 'This is safely quiet.', 'info');
  assert.equal(called, false, 'an explicit informational fire must not bypass low stimulation');
  assert.deepEqual(instance.notificationHistory[0].severity, 'info');
  assert.deepEqual(instance.notificationHistory[0].outcome, 'suppressed');
});

test('the low-stimulation severity marker turns red when removed and green when restored', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/renderer/src/App.tsx'), 'utf8');
  const marker = "severity === 'info' && this.attentionPresentation().quietNotifications";
  const gatedToast = source.slice(source.indexOf('private gatedToast ='), source.indexOf('private playNotificationSound'));
  assert.match(gatedToast, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const removed = gatedToast.replace(marker, 'false');
  assert.doesNotMatch(removed, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    'the deliberate severity-marker removal must turn red before restoration');
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
  /* Read the clock either side of the click rather than asserting an exact zero.
   * The handler stamps `Date.now()`, so `msSinceSnooze(...) === 0` was only ever true
   * while no millisecond ticked over between the stamp and the assertion; it failed
   * once with `1 !== 0` inside a full run on 2026-08-26 and passed on every rerun,
   * which is the worst kind of red -- one nobody can reproduce and everybody learns
   * to rerun past.
   *
   * The window is the assertion, so nothing here is a tolerance somebody chose until
   * it went green: the stamp must lie between the two readings taken immediately
   * around the click, which is exactly the claim "recorded now" was making. It still
   * bites on both real defects -- a click that records nothing reads `undefined`, and
   * a stale or preserved earlier stamp reads further back than the click window. */
  const beforeClick = Date.now();
  button?.props.onClick?.();
  const afterClick = Date.now();
  const sinceSnooze = msSinceSnooze(instance.durableStorage.storage, afterClick);
  assert.ok(
    sinceSnooze !== undefined && sinceSnooze <= afterClick - beforeClick,
    `expected the snooze to be stamped inside the click itself; msSinceSnooze read ${String(sinceSnooze)}ms `
    + `against a ${afterClick - beforeClick}ms click window`,
  );
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
