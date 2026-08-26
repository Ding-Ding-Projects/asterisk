/**
 * Keyboard shortcuts on context-menu items.
 *
 * The lookup tests carry the weight. A shortcut displayed beside a label is a promise
 * that pressing those keys does that thing, and a wrong one trains a person to press a
 * key that does nothing -- worse than showing none, because they stop trusting the column
 * entirely and go back to using the menu for everything.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODIFIER_SEPARATOR, ShortcutRegistry, formatBinding, renderMenu,
  type Binding,
} from '../../app/renderer/src/menu-shortcuts.ts';

const binding = (over: Partial<Binding> = {}): Binding => ({
  command: 'endpoint.delete', context: 'endpoint-row', modifiers: ['Ctrl'], key: 'Delete', ...over,
});

const registryWith = (...bindings: Binding[]) => {
  const registry = new ShortcutRegistry();
  for (const b of bindings) registry.register(b);
  return registry;
};

/* --- formatting ------------------------------------------------------------------ */

test('a chord is written in the platform order, not the order it was declared', () => {
  /* Alt+Ctrl+Shift+K reads as a different shortcut from Ctrl+Shift+Alt+K to anybody
   * scanning a column of them. */
  const chord = formatBinding(binding({ modifiers: ['Alt', 'Shift', 'Ctrl'], key: 'K' }));
  assert.equal(chord, ['Ctrl', 'Shift', 'Alt', 'K'].join(MODIFIER_SEPARATOR));
});

test('a chord with no modifier is just the key', () => {
  assert.equal(formatBinding(binding({ modifiers: [], key: 'F2' })), 'F2');
});

test('a modifier declared twice does not appear twice', () => {
  assert.equal(formatBinding(binding({ modifiers: ['Ctrl', 'Ctrl'], key: 'C' })), 'Ctrl+C');
});

/* --- the lookup, which is the point ----------------------------------------------- */

test('an item shows the shortcut that actually fires it here', () => {
  const registry = registryWith(binding());
  const [item] = renderMenu(registry, 'endpoint-row', [{ label: 'Delete', command: 'endpoint.delete' }]);
  assert.equal(item.shortcut, 'Ctrl+Delete');
});

test('a binding from another context is never displayed', () => {
  /* The specific failure: a shortcut that only fires when a different surface has focus,
   * shown here as though it works. */
  const registry = registryWith(binding({ context: 'trunk-row' }));
  const [item] = renderMenu(registry, 'endpoint-row', [{ label: 'Delete', command: 'endpoint.delete' }]);
  assert.equal(item.shortcut, '');
});

test('a command with no binding shows nothing, not a placeholder', () => {
  /* Padding the column with a dash reads as a shortcut somebody cannot quite make out. */
  const [item] = renderMenu(new ShortcutRegistry(), 'endpoint-row', [{ label: 'Delete', command: 'endpoint.delete' }]);
  assert.equal(item.shortcut, '');
  assert.ok(!/[-–—?]/u.test(item.shortcut));
});

test('a shortcut is never inferred from a similar command', () => {
  /* endpoint.deleteAll is a different command and must not lend its chord to
   * endpoint.delete, however alike the names look. */
  const registry = registryWith(binding({ command: 'endpoint.deleteAll' }));
  const [item] = renderMenu(registry, 'endpoint-row', [{ label: 'Delete', command: 'endpoint.delete' }]);
  assert.equal(item.shortcut, '');
});

test('every item in a menu is resolved independently', () => {
  const registry = registryWith(
    binding({ command: 'endpoint.delete', modifiers: [], key: 'Delete' }),
    binding({ command: 'endpoint.duplicate', modifiers: ['Ctrl'], key: 'D' }),
  );
  const items = renderMenu(registry, 'endpoint-row', [
    { label: 'Delete', command: 'endpoint.delete' },
    { label: 'Duplicate', command: 'endpoint.duplicate' },
    { label: 'Rename', command: 'endpoint.rename' },
  ]);
  assert.deepEqual(items.map((i) => i.shortcut), ['Delete', 'Ctrl+D', '']);
});

/* --- assistive technology ---------------------------------------------------------- */

test('the chord is exposed as a shortcut, not only as text beside the label', () => {
  /* Otherwise a screen reader reads the chord as part of the item name and the user
   * hears "Delete Ctrl Delete" on every item. */
  const [item] = renderMenu(registryWith(binding()), 'endpoint-row', [
    { label: 'Delete', command: 'endpoint.delete' },
  ]);
  assert.equal(item.accessibleShortcut, 'Ctrl+Delete');
  assert.equal(item.label, 'Delete', 'the chord leaked into the label');
});

test('an item with no shortcut exposes none rather than an empty announcement', () => {
  const [item] = renderMenu(new ShortcutRegistry(), 'endpoint-row', [
    { label: 'Delete', command: 'endpoint.delete' },
  ]);
  assert.equal(item.accessibleShortcut, undefined);
});

/* --- the registry ------------------------------------------------------------------ */

test('one command cannot have two bindings in one context', () => {
  /* Two answers to "what fires this here" means the menu picks one, and it will
   * eventually pick the one that does not work. */
  const registry = registryWith(binding());
  assert.throws(() => registry.register(binding({ key: 'Backspace' })), /already has a binding/u);
});

test('the same command may bind differently in different contexts', () => {
  const registry = registryWith(binding(), binding({ context: 'trunk-row', key: 'Backspace' }));
  assert.equal(renderMenu(registry, 'endpoint-row', [{ label: 'x', command: 'endpoint.delete' }])[0].shortcut, 'Ctrl+Delete');
  assert.equal(renderMenu(registry, 'trunk-row', [{ label: 'x', command: 'endpoint.delete' }])[0].shortcut, 'Ctrl+Backspace');
});

test('two commands sharing one chord in one context is reported as a conflict', () => {
  /* Reported rather than resolved: the registry cannot know which the author meant, and
   * silently dropping one is how a shortcut stops working with nothing to explain it. */
  const registry = registryWith(binding(), binding({ command: 'endpoint.remove' }));
  const conflicts = registry.conflicts();
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].chord, 'Ctrl+Delete');
  assert.deepEqual(conflicts[0].commands.sort(), ['endpoint.delete', 'endpoint.remove']);
});

test('the same chord in different contexts is not a conflict', () => {
  /* Ctrl+Delete meaning different things on different surfaces is ordinary, not a bug. */
  const registry = registryWith(binding(), binding({ command: 'trunk.delete', context: 'trunk-row' }));
  assert.deepEqual(registry.conflicts(), []);
});

test('an empty registry has no conflicts and renders nothing', () => {
  assert.deepEqual(new ShortcutRegistry().conflicts(), []);
  assert.deepEqual(renderMenu(new ShortcutRegistry(), 'x', []), []);
});

test('the registry reports every binding, for a cheatsheet', () => {
  const registry = registryWith(binding(), binding({ command: 'endpoint.duplicate', key: 'D' }));
  assert.equal(registry.all().length, 2);
});

test('the reported bindings cannot be mutated through the returned array', () => {
  /* A caller building a cheatsheet must not be able to edit the live registry by
   * accident, which is the kind of defect that surfaces months later somewhere else. */
  const registry = registryWith(binding());
  registry.all().slice().push(binding({ command: 'injected' }));
  (registry.all() as Binding[]).push(binding({ command: 'injected' }));
  assert.equal(registry.all().length, 1);
});
