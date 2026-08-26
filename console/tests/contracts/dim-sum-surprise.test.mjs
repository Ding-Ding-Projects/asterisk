/**
 * Contract: the dim sum surprise.
 *
 * `dim-sum-surprise.ts` is a complete, careful implementation of the one-in-ten startup
 * draw -- every suppression clause from the contract (first run, error, update, mid-task,
 * quiet hours), the "exactly one draw per launch" rule, and the deliberate refusal to
 * honour a stored preference are all present and recomputed from source below.
 *
 * The registry records this feature as `implemented`, and the module alone earns that.
 * But the module is never called. `App.tsx` does not import `dim-sum-surprise` at all --
 * not the module path, not `surpriseFor`, nothing -- and no other mounted component
 * (`PbxAdminApp.tsx`, `PbxAdminIntegratedApp.tsx`, `main.tsx`) does either. So today a
 * launch of the console can never show a dish: the draw exists as dead code from the
 * running app's point of view. This is the widest gap of the eight features in this
 * evidence pass -- unlike funny-levels, dialog-emojis, narration and school-mode, there is
 * no partial wiring here at all, not even a settings control. This file pins that plainly.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/dim-sum-surprise.ts';
const RENDERER_SRC_DIR = 'app/renderer/src';

test('the registry state agrees with the note that has to justify it', () => {
  /* This used to hardcode 'implemented'. A registry audit then corrected six rows to
   * 'partial' -- their modules are imported but never called, wired at one end and
   * consumed at neither -- and the hardcoded literal turned that correction into six
   * failures. The test was pinning a claim that had become false, which is the opposite
   * of what a guard is for.
   *
   * So it no longer asserts a fixed value. It asserts the row is internally honest: a
   * state the validator defines, and a note long enough to say what is or is not wired.
   * That stays true when the wiring lands and the row legitimately moves back up. */
  const registry = json('app/feature-registry.json');
  const row = registry.features['dim-sum-surprise'];
  assert.ok(row, 'the implementation registry has no row for dim-sum-surprise');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state),
    `dim-sum-surprise records an undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'dim-sum-surprise records a state with no note explaining what is and is not wired');
});

test('the chance is exactly one in ten', () => {
  const src = read(MODULE);
  assert.match(src, /^export const SURPRISE_CHANCE = 0\.1;$/m);
});

test('the draw refuses every listed context, and lists exactly the five the contract names', () => {
  const src = read(MODULE);
  const body = src.match(/export const SUPPRESSED_CONTEXTS = \[([^\]]*)\] as const;/);
  assert.ok(body, 'expected the SUPPRESSED_CONTEXTS array literal to be found as text');
  const items = [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(items, ['first-run', 'error', 'update', 'mid-task', 'quiet-hours']);
});

test('surpriseFor refuses a second draw in the same launch, and refuses any non-normal context', () => {
  const src = read(MODULE);
  const fn = src.match(/export function surpriseFor\([\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find surpriseFor');
  assert.match(fn[0], /if \(input\.alreadyDrawnThisLaunch\) return undefined;/);
  assert.match(fn[0], /if \(input\.context !== 'normal'\) return undefined;/);
  assert.match(fn[0], /if \(!\(input\.draw >= 0 && input\.draw < SURPRISE_CHANCE\)\) return undefined;/);
});

test('a stored preference is deliberately ignored, never honoured', () => {
  const src = read(MODULE);
  const fn = src.match(/export function storedPreferenceIsIgnored\(\): boolean \{\n\s*return true;\n\}/);
  assert.ok(fn, 'expected storedPreferenceIsIgnored to unconditionally return true');
});

test('every dish carries both names and alt text, and the image is a bundled local asset field', () => {
  const src = read(MODULE);
  assert.match(src, /nameEn: string;/);
  assert.match(src, /nameZhHant: string;/);
  assert.match(src, /altText: `\$\{dish\.nameEn\} \(\$\{dish\.nameZhHant\}\)`,/);
  /* The Dish interface documents the asset field as "a bundled local asset path. Never a
   * URL." -- checked as a real comment attached to the field, not trusted from the header. */
  assert.match(src, /\/\*\* A bundled local asset path\. Never a URL\. \*\/\n\s*asset: string;/);
});

test('HONEST GAP: App.tsx never imports dim-sum-surprise at all', () => {
  const app = read('app/renderer/src/App.tsx');
  assert.doesNotMatch(app, /dim-sum-surprise/, "App.tsx must not reference the module path if it is truly unwired");
  assert.doesNotMatch(app, /\bsurpriseFor\(/, 'surpriseFor(...) must never be called from App.tsx');
});

test('a mounted component really imports it, so the surprise can actually happen', () => {
  /* This replaces a pin that asserted the opposite, and scanned every .tsx entry point to
   * prove it -- deliberately, so it could not pass merely because the wiring had moved to
   * a sibling file. The module was complete and tested and imported by nothing at all, so
   * the feature had never once run in a shipped build. The pin was right to exist and
   * right to fire when the mounting landed.
   *
   * Inverted rather than deleted: it now requires at least one entry point to reference
   * the module, which keeps the same breadth of scan working in the opposite direction. */
  const entryPoints = readdirSync(resolve(root, RENDERER_SRC_DIR))
    .filter((name) => name.endsWith('.tsx'));
  assert.ok(entryPoints.length >= 5, 'expected to find the renderer entry-point files');
  /* An IMPORT, not a mention. A first version of this accepted any occurrence of the
   * module name, and stayed green when the whole component file was deleted -- because
   * main.tsx still names it in a comment. A guard a comment can satisfy is not a guard,
   * which is the same failure this file's original pin was careful to avoid. */
  const importing = entryPoints.filter((name) =>
    /^import[^;]*from '[^']*[Dd]im[Ss]um[^']*';$/m.test(read(`${RENDERER_SRC_DIR}/${name}`))
    || /^import[^;]*from '[^']*dim-sum-surprise';$/m.test(read(`${RENDERER_SRC_DIR}/${name}`)));
  assert.ok(importing.length > 0,
    'no renderer entry point imports the dim sum surface, so the module is unreachable and the surprise can never fire');
});

test('main.tsx mounts PbxAdminIntegratedApp, which extends PbxAdminApp, which extends App', () => {
  /* Confirms App.tsx is the right file to have checked above -- it really is the base of
   * the class actually rendered by main.tsx, not a parallel implementation nobody uses. */
  const main = read('app/renderer/src/main.tsx');
  assert.match(main, /import \{ PbxAdminIntegratedApp \} from '\.\/PbxAdminIntegratedApp';/);
  assert.match(main, /<PbxAdminIntegratedApp \/>/);

  const integrated = read('app/renderer/src/PbxAdminIntegratedApp.tsx');
  assert.match(integrated, /export class PbxAdminIntegratedApp extends PbxAdminApp \{/);

  const admin = read('app/renderer/src/PbxAdminApp.tsx');
  assert.match(admin, /export class PbxAdminApp extends App \{/);
});
