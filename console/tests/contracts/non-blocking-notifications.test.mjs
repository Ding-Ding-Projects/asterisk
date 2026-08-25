/**
 * Contract: non-blocking-notifications.
 *
 * Two real, wired, auto-dismissing primitives exist and are called extensively
 * from App.tsx: `fire()` (a full-screen celebratory overlay, `celebrate:true` for
 * 2600ms) and `toast()` (a single bottom-anchored message, `toastOpen:true` for
 * 4200ms). Both clear their own timers before rescheduling, so neither can leak.
 * `nt_toast`/`nt_sound` are genuine live settings (App.tsx's `gatedToast`/App
 * comment near CONSOLE_SETTINGS): a user can turn toasts or sound off and the
 * console honours it.
 *
 * Two real gaps found by reading the render position and state shape rather than
 * trusting a summary:
 *
 *   1. `toast()` renders at `left:50%; bottom:24px; transform:translateX(-50%)` --
 *      bottom-CENTRE, not the bottom-left or bottom-right corner the canonical
 *      contract requires.
 *   2. `toastOpen`/`toastText` are single scalar state fields, not a list, so a
 *      second `toast()` while one is showing replaces it -- no stacking.
 *
 * A THIRD finding, and the one worth stating loudest because the implementation
 * registry's note gets it backwards: a "Notification centre" screen destination
 * genuinely EXISTS in the compiled design (rail 'app', title 'Notification
 * centre', a table of Source/Message/When/State, a 'Mark all read' action, and a
 * Delivery settings group with nt_toast/nt_sound/nt_levels/nt_quiet/nt_keep).
 * The registry note claims "there is no reviewable notification centre or
 * history for dismissed notifications" -- that is the wrong description of the
 * gap. The screen is real and reachable; what is missing is any live consumer:
 * App.tsx never overrides the 'notifications' screen's data, so the table's four
 * rows are the design's own hardcoded literals, permanently, regardless of what
 * fire()/toast() actually raised. This is the exact "decorative-looking UI must
 * be functional" failure this project has shipped before -- a control that reads
 * as working and changes nothing real. App.tsx's own comment beside
 * CONSOLE_SETTINGS says as much: nt_levels has no per-toast severity to filter
 * by, nt_quiet has no configured quiet-hours window, and nt_keep describes a
 * history this console does not implement yet.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const GENERATED = 'app/renderer/src/generated/console.tsx';
const APP = 'app/renderer/src/App.tsx';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['non-blocking-notifications'];
  assert.ok(row, 'the implementation registry has no row for non-blocking-notifications');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('fire() sets a real, self-clearing timeout rather than a permanent overlay', () => {
  const src = read(GENERATED);
  assert.match(src, /fire = \(title, sub\) => \{\s*this\.setState\(\{ celebrate:true, celebrateTitle:title, celebrateSub:sub \}\);\s*clearTimeout\(this\._cf\);\s*this\._cf = setTimeout\(\(\) => this\.setState\(\{ celebrate:false \}\), 2600\);\s*\};/,
    'fire() no longer matches the expected auto-dismissing shape');
});

test('toast() sets a real, self-clearing timeout, distinct from fire()', () => {
  const src = read(GENERATED);
  assert.match(src, /toast = \(t\) => \{ this\.setState\(\{ toastOpen:true, toastText:t \}\); clearTimeout\(this\._tt\); this\._tt = setTimeout\(\(\) => this\.setState\(\{ toastOpen:false \}\), 4200\); \};/,
    'toast() no longer matches the expected auto-dismissing shape');
});

test('the rendered toast is anchored bottom-CENTRE, not a screen corner -- a real gap against the canonical contract', () => {
  const src = read(GENERATED);
  const toastBlock = src.match(/v\.toastOpen \? h\("div", \{ style: sty\(`([^`]+)`\)/);
  assert.ok(toastBlock, 'expected to find the toast render block by its v.toastOpen guard');
  assert.match(toastBlock[1], /left:50%/u, 'the toast style no longer centres horizontally -- re-check whether the anchor gap is fixed');
  assert.match(toastBlock[1], /transform:translateX\(-50%\)/u, 'the toast style no longer re-centres itself -- re-check the anchor gap');
  assert.doesNotMatch(toastBlock[1], /\bleft:\s*24px\b|\bright:\s*24px\b/u,
    'the toast now carries a corner-anchored left/right offset -- the anchor gap may be fixed, update this row');
});

test('toast state is a single scalar pair, not a list -- there is no stacking of multiple notifications', () => {
  const src = read(GENERATED);
  assert.match(src, /toastOpen:false, toastText:''/u, 'expected the initial state to declare toastOpen/toastText as singular scalars');
  assert.doesNotMatch(src, /toastQueue|toasts:\s*\[/u, 'a toast queue or array now exists -- stacking may have been added, update this row');
});

test('a real "Notification centre" screen destination exists in the compiled design -- the registry note is wrong to claim none does', () => {
  const src = read(GENERATED);
  assert.match(src, /notifications:\{ rail:'app', icon:'notifications', label:'Notifications', badge:'4', title:'Notification centre', file:'console', kind:'table',/u,
    'the Notification centre screen destination no longer matches -- the registry note may now be correct instead');
  assert.match(src, /cols:\['Source','Message','When','State'\]/u, 'the notification table no longer carries the expected columns');
});

test('the notification table is the design\'s own hardcoded rows: App.tsx never overrides the "notifications" screen with real data', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /screen\s*===\s*'notifications'/u,
    'App.tsx now branches on the notifications screen -- a live data feed may have been wired, which would flip this gap');
  assert.doesNotMatch(app, /notifTable|notificationRows/u,
    'App.tsx now names a notification table/rows override -- re-check whether the mock table is now live');
});

test("App.tsx's own comment confirms nt_levels, nt_quiet, and nt_keep are unimplemented intentions, not live filters", () => {
  const app = read(APP);
  assert.match(app, /nt_levels has no\s*\n?\s*\* per-toast severity to filter by/u,
    'the nt_levels gap is no longer documented as unimplemented -- it may have been wired');
  assert.match(app, /nt_quiet has no configured quiet-hours window/u,
    'the nt_quiet gap is no longer documented as unimplemented -- it may have been wired');
});

test('nt_toast and nt_sound are the two settings with a genuine live consumer', () => {
  const app = read(APP);
  assert.match(app, /consoleSetting<boolean>\('nt_toast', true\) === false\) return;/u,
    'gatedToast no longer gates on nt_toast the way the comment describes');
  assert.match(app, /consoleSetting<boolean>\('nt_sound', false\) === true\) this\.playNotificationSound\(\);/u,
    'gatedToast no longer gates the notification sound on nt_sound');
});

test('App.tsx genuinely relies on fire()/toast() at scale, so this is not a dead primitive nobody calls', () => {
  const app = read(APP);
  const fireCalls = [...app.matchAll(/this\.fire\(/gu)];
  const toastCalls = [...app.matchAll(/this\.toast\(/gu)];
  assert.ok(fireCalls.length > 30, `expected many this.fire(...) call sites, found ${fireCalls.length}`);
  assert.ok(toastCalls.length > 20, `expected many this.toast(...) call sites, found ${toastCalls.length}`);
});
