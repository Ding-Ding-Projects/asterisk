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
 * One of the two gaps once found by reading the render position and state shape
 * rather than trusting a summary is now fixed, and one remains:
 *
 *   1. FIXED 2026-08-26: `toast()` used to render at `left:50%; bottom:24px;
 *      transform:translateX(-50%)` -- bottom-CENTRE, not the bottom-left or
 *      bottom-right corner the canonical contract requires. It now renders at
 *      `right:24px; bottom:24px`, the bottom-right corner.
 *   2. STILL OPEN: `toastOpen`/`toastText` are single scalar state fields, not a
 *      list, so a second `toast()` while one is showing replaces it -- no
 *      stacking. Left open rather than attempted alongside the anchor fix
 *      because the shell's `undoToast` is written against exactly one toast at
 *      a time: it reverts "the most recent commit" whenever the toast currently
 *      on screen is the one that commit raised (see `undo-toast.ts`'s own
 *      docstring), and a real stack needs that identity threaded per-toast --
 *      which commit each visible toast's Undo button reverts, not merely which
 *      commit was most recent -- rather than a corner reposition alone.
 *
 * A THIRD finding, FIXED 2026-08-26: a "Notification centre" screen destination
 * genuinely EXISTS in the compiled design (rail 'app', title 'Notification
 * centre', a table of Source/Message/When/State, a 'Mark all read' action, and a
 * Delivery settings group with nt_toast/nt_sound/nt_levels/nt_quiet/nt_keep), and
 * it now has a real live consumer. `narratedFire` and `gatedToast` -- the two
 * chokepoints every `fire()`/`toast()` call in this console already passes
 * through -- each record their message into `this.notificationHistory`, newest
 * first, and `applyRows` overrides the 'notifications' screen's table with
 * `notificationRows()` built from that real history rather than the design's
 * four hardcoded sample rows. "Mark all read" reaches a real handler,
 * `onMarkAllNotificationsRead`, through the same generic table-add dispatch
 * `onAddServer`/`onAddAclRule`/`onAddApiUser` already use for their own screens.
 * `Source` reports honestly which of the two primitives raised each entry --
 * 'notice' for `fire`, 'toast' for `toast` -- rather than inventing a specific
 * subsystem (pjsip, sync, ops...) the way the design's own sample rows did,
 * since neither primitive carries a real per-subsystem tag today. The real
 * records also hold severity and a delivered/suppressed outcome, so low
 * stimulation can suppress only explicit informational notices without hiding
 * warnings or errors.
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
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
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

test('the rendered toast is anchored bottom-RIGHT, matching the canonical corner contract', () => {
  const src = read(GENERATED);
  const toastBlock = src.match(/v\.toastOpen \? h\("div", \{ style: sty\(`([^`]+)`\)/);
  assert.ok(toastBlock, 'expected to find the toast render block by its v.toastOpen guard');
  assert.match(toastBlock[1], /\bright:\s*24px\b/u, 'the toast no longer carries a right-anchored offset -- the corner fix may have regressed');
  assert.match(toastBlock[1], /\bbottom:\s*24px\b/u, 'the toast no longer anchors to the bottom edge');
  assert.doesNotMatch(toastBlock[1], /left:50%/u, 'the toast centres horizontally again -- the anchor fix regressed');
  assert.doesNotMatch(toastBlock[1], /transform:translateX\(-50%\)/u, 'the toast re-centres itself again -- the anchor fix regressed');
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

test('FIXED 2026-08-26: the notification table is real -- App.tsx now overrides the "notifications" screen with its own recorded history', () => {
  const app = read(APP);
  assert.match(app, /id === 'notifications'\s*\n\s*\?\s*this\.notificationRows\(\)/u,
    'App.tsx no longer overrides the notifications screen rows with notificationRows() -- the mock table may have regressed');
  assert.match(app, /private notificationHistory:/u, 'the recorded notification history field is gone');
  assert.match(app, /recordNotification\('toast', message, severity, suppressed \? 'suppressed' : 'delivered'\)/u,
    'gatedToast no longer records structured severity and outcome evidence');
  assert.match(app, /recordNotification\('notice', message, severity, suppressed \? 'suppressed' : 'delivered'\)/u,
    'narratedFire no longer records structured severity and outcome evidence');
});

test('"Mark all read" reaches a real handler, wired through the same generic table-add dispatch onAddServer/onAddAclRule/onAddApiUser already use', () => {
  const generated = read(GENERATED);
  assert.match(generated, /s\.screen === 'notifications' && this\.onMarkAllNotificationsRead \? this\.onMarkAllNotificationsRead\(\)/u,
    'the compiled shell no longer dispatches the notifications screen\'s add button to a real handler');
  const app = read(APP);
  assert.match(app, /onMarkAllNotificationsRead = \(\): void => \{/u, 'App.tsx no longer defines onMarkAllNotificationsRead');
});

test("App.tsx documents remaining notification settings without denying its low-stimulation severity path", () => {
  const app = read(APP);
  assert.match(app, /explicit low-stimulation\s*\n?\s*\* severity filter below/u,
    'the live low-stimulation severity filter is no longer documented');
  assert.match(app, /nt_quiet have no user-configured filter\/window policy/u,
    'the remaining nt_quiet gap is no longer documented honestly');
});

test('nt_toast and nt_sound are the two settings with a genuine live consumer', () => {
  const app = read(APP);
  assert.match(app, /consoleSetting<boolean>\('nt_toast', true\) === false/u,
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
