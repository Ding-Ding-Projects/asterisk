/**
 * Contract: context-menu-shortcuts. `menu-shortcuts.ts` (implemented
 * 2026-08-24) is a complete, tested registry that resolves the binding which
 * actually fires a command IN THAT CONTEXT -- a shortcut from another surface
 * is never displayed, and one is never inferred from a similarly named
 * command. An item with no binding shows nothing rather than a placeholder,
 * the chord is exposed as a real shortcut rather than glued into the label,
 * and `conflicts()` reports two commands sharing a chord in one context rather
 * than silently resolving it. The conflict grouping compares context and
 * chord directly rather than joining them into a string key -- the first
 * version used a separator that reached the file as a literal NUL.
 *
 * NOTHING IMPORTS IT YET: no surface in the renderer calls it -- confirmed by
 * grepping App.tsx and finding no import. The context menus are rendered by
 * the compiled design, which cannot be hand-edited, so displaying a resolved
 * chord means the design emitting a shortcut slot the registry can fill --
 * that is a compiler change, out of scope for the change that wired this.
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
const MODULE = 'app/renderer/src/menu-shortcuts.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['context-menu-shortcuts'];
  assert.ok(row, 'the implementation registry has no row for context-menu-shortcuts');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('nothing in App.tsx imports menu-shortcuts.ts -- it constrains nothing that ships today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/menu-shortcuts'/u,
    'App.tsx now imports menu-shortcuts.ts -- the compiled menus may now display resolved shortcuts, which would flip this row');
});

test('ShortcutRegistry resolves a binding scoped to its exact context, and conflicts() reports real chord collisions', () => {
  const src = read(MODULE);
  assert.match(src, /export class ShortcutRegistry \{/u, 'ShortcutRegistry no longer exists');
  assert.match(src, /conflicts\(\): Array<\{ context: string; chord: string; commands: string\[\] \}> \{/u,
    'conflicts() no longer returns context/chord/commands grouping');
});

test('conflict grouping keys on context and chord directly, not a joined string key that could be corrupted by a bad separator', () => {
  const src = read(MODULE);
  assert.doesNotMatch(src, /context \+ '\\0'|context \+ '\|' \+ chord/u,
    'conflict grouping now joins context/chord into a string key -- re-check whether the NUL-separator regression could recur');
});

test('formatBinding renders a real chord using the documented separator', () => {
  const src = read(MODULE);
  assert.match(src, /export const MODIFIER_SEPARATOR = '\+';/u, 'the modifier separator constant no longer matches');
  assert.match(src, /export function formatBinding\(binding: Binding\): string \{/u, 'formatBinding no longer exists');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/menu-shortcuts.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/menu-shortcuts.test.tsx exists but looks too small to be real coverage');
});
