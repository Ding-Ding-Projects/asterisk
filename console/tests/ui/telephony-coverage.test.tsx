/**
 * How much of the telephony interface actually does something.
 *
 * This exists because measuring it wrongly is easy, and I did it twice in one afternoon. The
 * first attempt looked for a control id anywhere in the renderer sources and reported 100%.
 * The second restricted that to modules the app imports and still reported 100%. Both were
 * artefacts of the measurement: SCREEN_CONTROL_IDS in control-keys.ts lists every control id
 * on every screen, so scanning it counts an inventory as a consumer.
 *
 * A 100% that comes from the measurement rather than the code is worse than a low number,
 * because it ends the work.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { unmappedControls, isUninventoried } from '../../app/renderer/src/control-keys.ts';
import { ORDER, SCREENS } from '../../app/renderer/src/generated/console.tsx';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'renderer', 'src');

/** The share on 2026-08-24, measured. It may rise freely and may not fall. */
const WORKING_FLOOR = 168;
const TELEPHONY_TOTAL = 191;

function measure() {
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const raw = (f: string) => readFileSync(join(srcDir, f), 'utf8');
  /* The inventory is cut out before scanning: it names every control on every screen, so
   * counting it makes every control look consumed. */
  const withoutInventory = (f: string) => {
    const text = raw(f);
    const at = text.indexOf('SCREEN_CONTROL_IDS');
    return at === -1 ? text : text.slice(0, at);
  };
  /* And modules nothing imports are excluded: an orphaned module naming a control proves
   * somebody thought about it, not that anything reads it. Four such modules turned up in
   * this repository in one week. */
  const reachable = new Set<string>(['App.tsx', 'PbxAdminApp.tsx']);
  for (let hop = 0; hop < 3; hop += 1) {
    for (const f of [...reachable]) {
      for (const m of raw(f).matchAll(/from '\.\/([\w-]+)'/g)) {
        const hit = files.find((c) => c === `${m[1]}.ts` || c === `${m[1]}.tsx`);
        if (hit) reachable.add(hit);
      }
    }
  }
  const source = [...reachable].map(withoutInventory).join('\n');

  const screens = SCREENS as unknown as Record<string, { groups?: { ctls?: unknown[] }[]; file?: string }>;
  let working = 0; const dead: string[] = [];
  for (const id of ORDER as unknown as string[]) {
    const n = (screens[id]?.groups ?? []).reduce((a, g) => a + (g.ctls?.length ?? 0), 0);
    if (!n || !(screens[id]?.file ?? '').includes('.conf')) continue;
    const u = unmappedControls(id);
    const unbound = isUninventoried(u) ? [] : [...u];
    working += n - unbound.length;
    for (const c of unbound) { if (source.includes(`'${c}'`)) working += 1; else dead.push(`${id}:${c}`); }
  }
  return { working, dead, total: working + dead.length, source, reachable, files };
}

test('the measurement cannot count an inventory as a consumer', () => {
  /* The exact way both earlier attempts reported a false 100%. */
  const { source } = measure();
  assert.ok(!source.includes('SCREEN_CONTROL_IDS'), 'the inventory list is scanned as though it were code');
  assert.ok(!source.includes("'e_callerid'"),
    'e_callerid appears only in the inventory, so finding it means the cut failed');
});

test('the measurement ignores modules nothing imports', () => {
  const { reachable, files } = measure();
  assert.ok(reachable.size < files.length, 'every module counts as reachable, so an orphan would look consumed');
  assert.ok(reachable.has('App.tsx') && reachable.has('control-keys.ts'), 'the reachable set is not built');
});

test('the number of telephony controls that work does not fall', () => {
  /* A ratchet, like the orphan count. Wiring one is always welcome; a change that quietly
   * unwires one has to be a decision somebody takes on purpose. */
  const { working, dead, total } = measure();
  assert.equal(total, TELEPHONY_TOTAL, `the screen inventory moved: ${total} controls, not ${TELEPHONY_TOTAL}`);
  assert.ok(working >= WORKING_FLOOR,
    `${working} of ${total} work, down from ${WORKING_FLOOR}. Newly dead: ${dead.join(' ')}`);
});

test('the floor is raised when the number rises, so it cannot go stale', () => {
  const { working } = measure();
  assert.ok(working <= WORKING_FLOOR + 6,
    `${working} controls work, well above the ${WORKING_FLOOR} floor. Raise WORKING_FLOOR in the change that earned it.`);
});
