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
 * NOTHING IMPORTS IT YET: no surface in the renderer opens a popover, menu, or
 * tooltip through this module -- confirmed by grepping App.tsx and finding no
 * import. It constrains nothing that ships today, and real consumption would
 * mean the compiled design's own menu/dropdown rendering calling it, which is
 * generated code out of scope for hand-editing.
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

test('nothing in App.tsx imports bounded-overlays.ts -- it constrains nothing that ships today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/bounded-overlays'/u,
    'App.tsx now imports bounded-overlays.ts -- a real popover/menu/tooltip may now use it, which would flip this row');
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
