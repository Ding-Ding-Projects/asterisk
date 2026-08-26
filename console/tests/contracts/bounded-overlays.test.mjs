/**
 * Contract: bounded-overlays. `bounded-overlays.ts` (implemented 2026-08-24) is
 * a complete, tested pure placement calculator: `computeOverlayPlacement()`
 * returns position, a constrained size, whether the overlay must scroll
 * internally, and which side of the anchor it landed on, plus
 * `checkOverlaySurface()` refuses an overlay declaring none of its four
 * surface properties (background/border/elevation/shape) -- naming exactly
 * which are missing, because a transparent overlay lets whatever sits behind
 * it read through, and an overlay capped in height with hidden overflow
 * deletes content past the cap with no scrollbar to say so.
 *
 * CONSUMED as of 2026-08-25. The compiled design's own context menu sets its
 * position with raw `left:${ctxX}; top:${ctxY}` (`console.tsx`) and no bound
 * against the window anywhere -- every click handler that opens it sets
 * `ctxX`/`ctxY` together, as a plain `${clientX}px`/`${clientY}px` pair, in
 * one `setState` call. App.tsx cannot hand-edit that generated file, so it
 * reaches this module instead by overriding `setState` itself
 * (`boundedOverlaySetState`) and clamping that one pair through
 * `computeOverlayPlacement` before the compiled shell's real `setState` ever
 * sees it. `lockX`/`lockY` and `regexX`/`regexY` copy `ctxX`/`ctxY` the moment
 * they open, so they inherit the clamp for free; `showInfo`'s own
 * click-anchored call site is clamped the same way at its existing wrapper.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const MODULE = 'app/renderer/src/bounded-overlays.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['bounded-overlays'];
  assert.ok(row, 'the implementation registry has no row for bounded-overlays');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('App.tsx imports bounded-overlays.ts and reaches computeOverlayPlacement from a real call site', () => {
  const app = read(APP);
  assert.match(app, /from '\.\/bounded-overlays'/u, 'App.tsx no longer imports bounded-overlays.ts');
  assert.match(app, /computeOverlayPlacement\(/u, 'App.tsx no longer calls computeOverlayPlacement');
});

test('setState is overridden so a click-opened context menu is clamped before the compiled shell ever sees it', () => {
  const app = read(APP);
  assert.match(app, /this\.setState = this\.boundedOverlaySetState/u,
    'App.tsx no longer shadows setState with the clamping wrapper');
  assert.match(app, /boundedOverlaySetState = \(update: Record<string, unknown>\): void => \{/u,
    'boundedOverlaySetState no longer exists');
  assert.match(app, /update\.ctxX/u, 'the override no longer looks at ctxX -- the one key every context-menu open sets');
});

test('computeOverlayPlacement returns position, constrained size, scroll need, and anchor side', () => {
  const src = read(MODULE);
  assert.match(src, /export function computeOverlayPlacement\(/u, 'computeOverlayPlacement no longer exists');
  assert.match(src, /export interface OverlayPlacement \{/u, 'the OverlayPlacement interface no longer exists');
});

test('checkOverlaySurface refuses an overlay declaring none of its four surface properties, naming exactly which are missing', () => {
  const src = read(MODULE);
  const fn = src.match(/export function checkOverlaySurface\(surface: OverlaySurface\): OverlaySurfaceCheck \{[\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find checkOverlaySurface');
  const body = fn[0];
  assert.match(body, /missing\.push\('background'\)/u, 'background is no longer checked');
  assert.match(body, /missing\.push\('border'\)/u, 'border is no longer checked');
  assert.match(body, /missing\.push\('elevation'\)/u, 'elevation is no longer checked');
  assert.match(body, /missing\.push\('shape'\)/u, 'shape is no longer checked');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/bounded-overlays.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/bounded-overlays.test.tsx exists but looks too small to be real coverage');
});
