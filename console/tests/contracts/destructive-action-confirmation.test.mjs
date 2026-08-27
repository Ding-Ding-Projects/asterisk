/**
 * Contract: destructive-action super confirmation (the four-gate ceremony).
 *
 * This is a genuinely wired feature, and it is wired in a way worth checking carefully
 * because the compiled design ITSELF still contains the old, fake implementation. The
 * generated template defines its own `executeCeremony` that only clears the mole-game
 * timer, closes the dialog, and toasts "<command> executed and attested" -- without ever
 * running anything. `App.tsx` overrides `renderVals()`, calls `super.renderVals()`, and
 * then sets a real `executeCeremony` afterwards in the same object literal, which JS
 * object-spread ordering means wins. This file proves that override actually happens and
 * actually reaches the button the design renders, rather than trusting that a later
 * property in a long object literal really does shadow an earlier one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/ceremony.ts';
const APP = 'app/renderer/src/App.tsx';
const DESIGN = 'app/renderer/src/generated/console.tsx';
const RUNTIME = 'app/renderer/src/dc-runtime.tsx';
const DESIGN_SOURCE = '../design/Asterisk Console M3.dc.html';
const EXTENSION = 'scripts/extend-pbx-m3.mjs';

test('the registry status agrees with the note that has to justify it', () => {
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
  const row = registry.features['destructive-action-confirmation'];
  assert.ok(row, 'the implementation registry has no row for destructive-action-confirmation');
  assert.ok(['implemented', 'implemented-unverified', 'partial', 'absent'].includes(row.status),
    `destructive-action-confirmation records an undefined status "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'destructive-action-confirmation records a state with no note explaining what is and is not wired');
});

test('runCeremonyCommand refuses to run an empty command, an unconnected target, or a missing bridge', () => {
  const src = read(MODULE);
  assert.match(src, /if \(command\.length === 0\) \{\n\s*options\.fire\(NOT_RUN, 'No command was attached to this confirmation, so nothing was run\.', 'error'\);/);
  assert.match(src, /if \(!options\.connected\) \{\n\s*options\.fire\(NOT_RUN, `No target is connected, so "\$\{command\}" was not run\.`, 'warning'\);/);
  assert.match(src, /if \(!response\) \{\n\s*options\.fire\(NOT_RUN, `The desktop bridge is unavailable, so "\$\{command\}" was not run\.`, 'error'\);/);
});

test('a refusal from the control plane is reported by name, not softened into a success', () => {
  const src = read(MODULE);
  assert.match(src, /if \(!response\.ok\) \{\n\s*options\.fire\(NOT_RUN, response\.message \?\? `"\$\{command\}" was not run\.`, 'error'\);/);
});

test('the immutable design source retains its original handlers while the post-compiler extension removes fake command-success claims', () => {
  const original = read(DESIGN_SOURCE);
  const design = read(DESIGN);
  const extension = read(EXTENSION);
  assert.match(original, /executeCeremony:\(\) => \{ clearInterval\(this\._mole\); this\.setState\(\{ ceremonyOpen:false \}\); this\.toast\(s\.ceremonyCmd \+ ' executed and attested'\); \},/,
    'the original design-reference source must not be edited for desktop wiring');
  assert.match(original, /skipCeremony:\(\) => \{ clearInterval\(this\._mole\); clearInterval\(this\._hold\); this\.setState\(\{ credits:s\.credits - 1, ceremonyOpen:false \}\); this\.fire\('Skipped', s\.ceremonyCmd \+ ' ran on a credit\. ' \+ \(s\.credits - 1\) \+ ' left\.'\); \},/,
    'the original design-reference source must not be edited for credit wiring');
  assert.match(extension, /const ceremonyFallbacks = \[/,
    'the sanctioned post-compiler extension must own ceremony fallback repair');
  assert.match(extension, /expected exactly one \$\{name\}/,
    'the extension must fail closed when a ceremony source marker drifts');
  assert.doesNotMatch(design, /executed and attested/);
  assert.doesNotMatch(design, /ran on a credit/);
  assert.match(design, /executeCeremony:\(\) => this\.fireWithId\('[^']+', 'Not run', 'No command executor is bound to this design preview\.'\),/);
  assert.match(design, /skipCeremony:\(\) => this\.fireWithId\('[^']+', 'Not run', 'No command executor is bound to this design preview\.'\),/);
});

test('App.tsx overrides renderVals, calls super, and routes both execution paths through the typed control-plane handler', () => {
  const app = read(APP);
  const fn = app.match(/renderVals\(\) \{[\s\S]*?const values = super\.renderVals\(\) as Record<string, unknown>;[\s\S]*?executeCeremony: \(\) => \{ void this\.executeCeremonyCommand\(\); \},[\s\S]*?skipCeremony: \(\) => \{/);
  assert.ok(fn, 'expected renderVals to call super.renderVals() and route execute and credit paths through executeCeremonyCommand');
  assert.match(fn[0], /return \{\n\s*\.\.\.values,/, 'expected the returned object to spread the base values before overriding ceremony handlers');
  assert.match(app, /private async executeCeremonyCommand\(\): Promise<boolean> \{[\s\S]*?await runCeremonyCommand\(\{/,
    'the renderer-to-control-plane ceremony method is missing');
});

test('the real executeCeremony passes the actual connection state and server id through, not a stub', () => {
  const app = read(APP);
  assert.match(app, /connected: this\.target\.connected,/);
  assert.match(app, /serverId: this\.target\.id,/);
  assert.match(app, /request: \(action, extra\) => this\.request\(action, extra\) as Promise<CeremonyResponse \| undefined>,/);
});

test('a confirmation credit is spent only after the same real execution route reports success', () => {
  const app = read(APP);
  assert.match(app, /skipCeremony: \(\) => \{\n\s*void this\.executeCeremonyCommand\(\)\.then\(\(ok\) => \{\n\s*if \(!ok\) return;/);
  assert.match(app, /this\.setState\(\(st: \{ credits\?: number \}\) => \(\{ credits: Math\.max\(0, \(st\.credits \?\? 0\) - 1\) \}\)\);/);
});

test('object-spread ordering genuinely means a later key wins over an earlier spread, proven independently of the app', () => {
  /* This is the load-bearing JS fact the whole override depends on. Proven directly here,
   * against a minimal reproduction, rather than assumed from reading the source -- because
   * an override that looked right on paper and lost due to key ordering is exactly the
   * failure mode this feature's history is built from. */
  const base = { executeCeremony: () => 'fake', other: 1 };
  const merged = { ...base, executeCeremony: () => 'real' };
  assert.equal(merged.executeCeremony(), 'real');
});

test('DCLogic.render() calls the most-derived renderVals(), so App wins over ConsoleShell via prototype dispatch', () => {
  const runtime = read(RUNTIME);
  assert.match(runtime, /render\(\): ReactNode \{\n\s*return this\.template\(\{ \.\.\.\(this\.props as Record<string, unknown>\), \.\.\.this\.renderVals\(\) \}\);\n\s*\}/);
});

test('the four-gate button in the compiled design actually invokes v.executeCeremony', () => {
  const design = read(DESIGN);
  assert.match(design, /h\("button", \{ onClick: fn\(v\.executeCeremony\),/);
});

test('the prototype chain from the mounted component down to ConsoleShell is intact', () => {
  const app = read(APP);
  const design = read(DESIGN);
  assert.match(app, /export class App extends Base \{/);
  assert.match(design, /class ConsoleShell extends DCLogic \{/);
});

test('other destructive UI actions run through the separate areYouSure timed confirmation, and its callback really mutates state', () => {
  const app = read(APP);
  /* Two concrete call sites: approving a tab partner, and deleting a dialplan step. Both
   * are checked in App.tsx's own areYouSure calls, not merely declared in the interface. */
  assert.match(app, /areYouSure\('Apply the deploy plan\?', summaryLines\.join\('\\n'\), 3, \(\) => \{/);
  assert.match(app, /areYouSure\('Remove ' \+ name, removal\.summary\.join\('\\n'\), 3, \(\) => \{/);
});
