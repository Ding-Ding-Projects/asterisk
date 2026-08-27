/** Contract: the unlock ladder is async, state-store backed, and never authenticates. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const app = () => read('app/renderer/src/App.tsx');
const ladder = () => read('app/renderer/src/unlock-ladder.ts');

test('the application supplies an async durable state store and a cryptographically scoped nonce source', () => {
  const src = app();
  for (const needle of [
    'private readonly ladderStateStore: UnlockLadderStateStore = {',
    'readLockout: async (lockoutId)',
    'writeLockout: async (lockoutId, state)',
    'readClearedWaits: async (budgetScopeId)',
    'writeClearedWaits: async (budgetScopeId, timestamps)',
    'createNonce: () => crypto.randomUUID()',
    'stateStore: this.ladderStateStore,',
  ]) assert.ok(src.includes(needle), `missing privileged ladder boundary: ${needle}`);
});

test('three wrong unlock attempts await a scoped ladder issue and never call a synchronous legacy path', () => {
  const src = app();
  const match = src.match(/const wrong = async \(message: string\): Promise<void> => \{[\s\S]*?\n    \};/);
  assert.ok(match, 'async wrong-attempt helper is missing');
  const body = match[0];
  assert.match(body, /if \(count >= 3\) \{/);
  assert.match(body, /const result = await this\.ladder\.issue\(\{ lockoutId: `element:\$\{s\.unlockKey\}`, budgetScopeId: 'desktop-unlock-ladder', schoolMode: schoolModeActive\(this\.durableStorage\.storage\) \}\);/);
  assert.doesNotMatch(body, /this\.ladder\.issue\(s\.unlockKey\)/);
});

test('a cleared challenge only clears its wait UI, never a credential or attempt budget', () => {
  const src = app();
  const match = src.match(/private async finishLadderGrade\(result: UnlockLadderGradeResult, lockKey: string\): Promise<void> \{[\s\S]*?if \(result\.waitCleared\) \{[\s\S]*?\n      return;[\s\S]*?\n    \}/);
  assert.ok(match, 'cleared wait branch is missing');
  const body = match[0];
  assert.doesNotMatch(body, /state\.locks|s\.locks|delete n\[|wrongUnlockCounts/);
  assert.match(body, /You still need the real PIN, passphrase or code\./);
});

test('the state-store ladder consumes a nonce before grading and returns explicit no-authentication proof fields', () => {
  const src = ladder();
  assert.match(src, /const internal = this\.#challenges\.get\(nonce\);/);
  assert.match(src, /this\.#challenges\.delete\(nonce\);/);
  assert.match(src, /credentialCleared: false,/);
  assert.match(src, /attemptsRestored: false,/);
  assert.match(src, /authenticationGranted: false,/);
});

test('School mode starts at sums, rolling budget is persisted, and state-store failures fall closed to the clock', () => {
  const src = ladder();
  assert.match(src, /request\.schoolMode \? "sums" : "dish"/);
  assert.match(src, /DEFAULT_MAX_CLEARED_WAITS_PER_HOUR = 3/);
  assert.match(src, /async #budgetRemaining\(scopeId: string, atMs: number\): Promise<number>/);
  assert.match(src, /await this\.#stateStore\.readClearedWaits\(scopeId\)/);
  assert.match(src, /reason: "state-store-unavailable"/);
});

test('mole grading requires the full round and credits each visible spawn ID at most once', () => {
  const src = ladder();
  assert.match(src, /if \(atMs - Date\.parse\(challenge\.issuedAt\) < challenge\.payload\.durationMs\)/);
  assert.match(src, /"mole-round-submitted-early",/);
  assert.match(src, /const credited = new Set<number>\(\);/);
  assert.match(src, /credited\.has\(spawn\.spawnId\)/);
  assert.match(src, /spawn\.cell !== hit\.cell/);
  assert.match(src, /hit\.atMs < spawn\.appearsAtMs/);
  assert.match(src, /credited\.add\(spawn\.spawnId\);/);
});

test('the app owns an accessible mole overlay and does not strand a moles challenge inside the immutable shell', () => {
  const src = app();
  assert.match(src, /if \(challenge\.rung === 'dish'\)/);
  assert.match(src, /if \(challenge\.rung === 'sums'\)/);
  assert.match(src, /private moleBoardOverlay\(\): ReactNode \{/);
  assert.match(src, /role: 'dialog', 'aria-modal': 'true'/);
  assert.match(src, /role: 'grid', 'aria-label': 'Mole board'/);
  assert.match(src, /Visible mole in cell/);
  assert.match(src, /event\.key === 'Escape'/);
  assert.match(src, /Emergency exit/);
  assert.match(src, /private startMoleTicker\(/);
  assert.match(src, /private stopMoleTicker\(\): void/);
  assert.match(src, /if \(next\.challenge\.rung === 'moles'\)/);
  assert.match(src, /this\.startMoleTicker\(next\.challenge\);/);
  assert.doesNotMatch(src, /moles never reaches here -- offerLadder\/finishLadderGrade never store one/);
});

test('the registry row remains an honest unresolved inventory task until the central inventory materializer records proof', () => {
  const registry = JSON.parse(read('app/feature-registry.json'));
  const row = registry.features['unlock-ladder'];
  assert.ok(row, 'missing unlock-ladder registry row');
  assert.equal(row.status, 'partial');
  assert.equal(row.note, 'Exact source seams are recorded in this schema-v2 row. Built interaction, current-commit captures, and design-parity evidence remain not-run, so this row makes no verified claim.');
  assert.deepEqual(row.implementation.paths, []);
  assert.equal(row.builtInteraction.state, 'not-run');
});
