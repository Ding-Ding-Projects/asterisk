import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateInteractiveIdentity } from './compile-design.mjs';

function designMarkup(path) {
  const source = readFileSync(path, 'utf8');
  const root = source.indexOf('<x-dc');
  const start = source.indexOf('>', root) + 1;
  return source.slice(start, source.indexOf('</x-dc>', start)).trim();
}

function removeIdentity(markup, needle) {
  const target = `${needle} data-identity="{{ `;
  const at = markup.indexOf(target);
  assert.notEqual(at, -1, `fixture target was not found: ${needle}`);
  return markup.slice(0, at) + markup.slice(at).replace(/ data-identity="\{\{ [^}]+ \}\}"/u, '');
}

const consolePath = new URL('../../design/Asterisk Console M3.dc.html', import.meta.url);
const m3Path = new URL('../../design/M3 Control.dc.html', import.meta.url);
const consoleSource = readFileSync(consolePath, 'utf8');
const m3Source = readFileSync(m3Path, 'utf8');
const appSource = readFileSync(new URL('../app/renderer/src/App.tsx', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../app/renderer/src/dc-runtime.tsx', import.meta.url), 'utf8');
const generatedConsoleSource = readFileSync(new URL('../app/renderer/src/generated/console.tsx', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../app/renderer/src/generated/design-manifest.json', import.meta.url), 'utf8'));
const consoleMarkup = designMarkup(consolePath);
const m3Markup = designMarkup(m3Path);

assert.equal(validateInteractiveIdentity(consoleMarkup), 73, 'console interactive loop inventory drifted');
assert.equal(validateInteractiveIdentity(m3Markup), 8, 'M3 Control interactive loop inventory drifted');

const fixtures = [
  ['ordinary-choice-without-id-or-key', m3Markup, '<sc-for list="{{ choices }}" as="o"'],
  ['ordinary-order-item-without-id-or-key', m3Markup, '<sc-for list="{{ dragItems }}" as="i"'],
  ['ordinary-pool-item-without-id-or-key', m3Markup, '<sc-for list="{{ poolItems }}" as="p"'],
  ['paletteNodes-without-id-or-key', consoleMarkup, '<sc-for list="{{ paletteNodes }}" as="p"'],
  ['console-loop-without-source-identity', consoleMarkup, '<sc-for list="{{ modeOpts }}" as="o"'],
];

for (const [name, markup, needle] of fixtures) {
  assert.throws(() => validateInteractiveIdentity(removeIdentity(markup, needle)), /Interactive identity validation failed/u, `${name} did not turn red`);
  assert.equal(validateInteractiveIdentity(markup), name.startsWith('ordinary-') ? 8 : 73, `${name} did not restore green`);
}

assert.match(consoleSource, /data-stable-identity-contract="id,key"/u);
assert.match(m3Source, /data-stable-identity-contract="id,key"/u);
const mounted = manifest.directAppearanceIds.mountedStates;
assert.notDeepEqual(mounted.shell, mounted.palette, 'shell and palette direct-ID sets must differ');
assert.notDeepEqual(mounted.shell, mounted.appearance, 'shell and appearance direct-ID sets must differ');
assert.notDeepEqual(mounted.palette, mounted.appearance, 'palette and appearance direct-ID sets must differ');
assert.ok(mounted['palette-appearance'].length >= mounted.palette.length, 'combined state must include palette IDs');
assert.ok(mounted['palette-appearance'].length >= mounted.appearance.length, 'combined state must include appearance IDs');
assert.match(appSource, /const refusal = this\.recordControlActionHistory[\s\S]*?operation\.cancelRefusalPending = refusal[\s\S]*?await refusal/u, 'cancel-refused history is not awaited before the refusal outcome');
assert.match(appSource, /if \(operation\?\.cancelRefusalPending\) await operation\.cancelRefusalPending/u, 'terminal outcome is not ordered after cancellation refusal history');
assert.match(runtimeSource, /primitive producer without explicit id\/key/u, 'primitive identity fallback remains');
assert.doesNotMatch(runtimeSource, /record\.value/u, 'value fallback identity remains');
assert.match(generatedConsoleSource, /requireChoice/u, 'generated controls do not fail closed on producer identity');
assert.doesNotMatch(generatedConsoleSource, /id:String\(x\)/u, 'generated controls still synthesize identity with String(x)');
console.log('PASS: five identity fixtures red and restored green; console=73, m3Control=8, total=81');
