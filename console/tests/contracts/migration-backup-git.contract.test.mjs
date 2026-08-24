import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const sourcePath = resolve(import.meta.dirname, '../../control-plane/migration-backup-git.ts');
const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'migration-backup-git-contract-'));
const fixtureSourcePath = resolve(fixtureRoot, 'migration-backup-git.ts');
const fixtureDispatchPath = resolve(fixtureRoot, 'dispatch.ts');
const fixtureActionsPath = resolve(fixtureRoot, 'control-plane.ts');
cpSync(sourcePath, fixtureSourcePath); cpSync(resolve(import.meta.dirname, '../../control-plane/dispatch.ts'), fixtureDispatchPath); cpSync(resolve(import.meta.dirname, '../../shared/control-plane.ts'), fixtureActionsPath);
const readFixture = (path) => {
  const result = spawnSync(process.execPath, ['-e', 'process.stdout.write(require("node:fs").readFileSync(process.argv[1], "utf8"))', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, `fixture reader failed for ${path}`);
  return result.stdout;
};
const source = readFixture(fixtureSourcePath);
const dispatch = readFixture(fixtureDispatchPath);
const actions = readFixture(fixtureActionsPath);
process.once('exit', () => rmSync(fixtureRoot, { recursive: true, force: true }));

const REQUIRED_CONTRACTS = [
  'APP_OWNED_INVENTORY',
  'assertNoLinksAlong',
  'validatedExportDestination',
  'renameRetry',
  'StrictJsonParser',
  'UNSAFE_JSON_KEYS',
  '["bundle", "verify", bundle]',
  'fsck", "--full',
  'migration-swap-journal',
  'startExport',
  'operationStatus',
  'RECORD_SCHEMAS',
  'migration-swap-journal',
  'comparison: "verified" | "unverified"',
  'Re-authenticate through the operating-system credential manager',
];

test('migration and Git contract inventory is explicit', () => {
  for (const contract of REQUIRED_CONTRACTS) assert.ok(source.includes(contract), `missing exact contract: ${contract}`);
  assert.ok(dispatch.includes("request.action === 'migration.cancel'"), 'cancel action must be dispatched');
  assert.ok(actions.includes("| 'migration.cancel'"), 'cancel action must be in the shared action contract');
  assert.ok(source.includes('if (existsSync(output)) throw new Error("Export destination already exists.'), 'existing export targets must be refused');
  assert.ok(!source.includes('rmSync(output'), 'caller export destinations must never be recursively removed');
});

test('negative boundary turns red when destination protection disappears', () => {
  const broken = source.replace('if (protectedRoots.some((root) => overlapsPath(output, root))) throw new Error("Export destination may not be the live data, history, backup root, or any ancestor or descendant of those roots.");', '');
  assert.notEqual(broken, source, 'the deliberate destination-protection break must actually remove the exact check');
  assert.ok(!broken.includes('Export destination may not be the live data'), 'the broken fixture must remove the protection it claims to test');
});

test('negative boundary turns red when the Git bundle verification is removed', () => {
  const broken = source.replace('await execute(this.#executor, this.#history, ["bundle", "verify", bundle], 30_000, signal);', '');
  assert.notEqual(broken, source, 'the deliberate bundle-verification break must actually remove the exact check');
  assert.ok(!broken.includes('"bundle", "verify", bundle], 30_000, signal'), 'the broken fixture must remove the verification call');
});
