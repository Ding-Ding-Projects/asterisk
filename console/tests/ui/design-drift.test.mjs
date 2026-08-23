import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const consoleRoot = new URL('../../', import.meta.url);
const generated = new URL('app/renderer/src/generated/', consoleRoot);
const compiler = fileURLToPath(new URL('scripts/compile-design.mjs', consoleRoot));

const snapshot = async () => {
  const names = (await readdir(generated)).sort();
  const files = await Promise.all(names.map((name) => readFile(new URL(name, generated), 'utf8')));
  return Object.fromEntries(names.map((name, index) => [name, files[index]]));
};

/**
 * The shipped interface must be exactly what the design reference compiles to. If anyone
 * hand-edits the generated renderer, or edits the design without recompiling, this fails.
 */
test('the shipped renderer is byte-identical to a fresh compile of the design reference', async () => {
  const before = await snapshot();
  assert.ok(Object.keys(before).length > 0, 'no compiled design output is checked in');

  execFileSync(process.execPath, [compiler], { stdio: 'pipe' });

  const after = await snapshot();
  assert.deepEqual(Object.keys(after), Object.keys(before), 'recompiling changed the set of generated files');
  for (const name of Object.keys(before)) {
    assert.equal(after[name], before[name], `${name} drifted from the design reference`);
  }
});

/**
 * The independently audited design carries 265 declarative bindings. The compiler must
 * reproduce every one, plus exactly the three window controls the design leaves inert
 * because it is a mockup of a frameless window.
 */
test('the compiled renderer reproduces every audited design binding', async () => {
  const sources = await Promise.all(
    ['console.tsx', 'm3-control.tsx'].map((name) => readFile(new URL(name, generated), 'utf8')),
  );
  const counts = {};
  for (const [, event] of sources.join('\n').matchAll(/\b(on[A-Z][A-Za-z]*): fn\(/gu)) {
    counts[event] = (counts[event] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    onClick: 212 + 3,
    onChange: 10,
    onInput: 10,
    onContextMenu: 9,
    onDragStart: 4,
    onDragOver: 4,
    onDrop: 4,
    onDragEnd: 4,
    onMouseDown: 5,
    onMouseEnter: 1,
    onMouseLeave: 1,
    onMouseUp: 1,
  });

  const windowControls = sources[0].match(/"data-window-button": ``/gu) ?? [];
  assert.equal(windowControls.length, 3, 'the frameless window controls were not wired');
});

test('the generated renderer declares the design reference as its only source', async () => {
  const manifest = JSON.parse(await readFile(new URL('design-manifest.json', generated), 'utf8'));
  assert.deepEqual(manifest.sources, ['design/Asterisk Console M3.dc.html', 'design/M3 Control.dc.html']);
  assert.match(manifest.generatedBy, /compile-design\.mjs$/u);
});
