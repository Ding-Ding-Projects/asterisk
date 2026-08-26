import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const serviceModule = await import('../../control-plane/migration-backup-git.ts');
const executorModule = await import('../../control-plane/executor.ts');
const dispatchModule = await import('../../control-plane/dispatch.ts');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function disposableFixture() {
  const root = mkdtempSync(join(tmpdir(), 'migration-backup-git-fixture-'));
  const history = join(root, 'history');
  git(root, 'init', '--initial-branch=main', history);
  git(history, 'config', 'user.name', 'Migration contract');
  git(history, 'config', 'user.email', 'migration-contract@example.invalid');
  writeFileSync(join(history, 'history.txt'), 'real disposable history\n', 'utf8');
  git(history, 'add', 'history.txt');
  git(history, 'commit', '-m', 'Initial disposable history');
  let tick = 0;
  const service = new serviceModule.MigrationBackupService({
    userDataPath: root,
    historyPath: history,
    executor: new executorModule.NodeProcessExecutor({ allowedExecutables: ['git'] }),
    now: () => new Date(Date.UTC(2026, 7, 26, 12, 0, tick++)),
  });
  return { root, history, service, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('pruning requires a nonempty frozen preview and rejects unknown, mismatched, stale, and expired selections before deletion', async () => {
  const fixture = disposableFixture();
  try {
    await fixture.service.createBackup();
    await fixture.service.createBackup();
    const backups = await fixture.service.listBackups();
    const selected = backups.map((entry) => entry.path);

    await assert.rejects(fixture.service.pruneBackups(1, selected), /nonempty prune preview token/i);
    await assert.rejects(fixture.service.pruneBackups(1, selected, 'unknown-preview'), /missing, expired, or stale/i);
    const preview = await fixture.service.previewPrune(1, selected);
    await assert.rejects(fixture.service.pruneBackups(1, selected.slice(0, 1), preview.token), /missing, expired, or stale/i);

    const realNow = Date.now;
    Date.now = () => preview.expiresAt + 1;
    try { await assert.rejects(fixture.service.pruneBackups(1, selected, preview.token), /missing, expired, or stale/i); }
    finally { Date.now = realNow; }

    const current = await fixture.service.previewPrune(1, selected);
    await fixture.service.createBackup();
    await assert.rejects(fixture.service.pruneBackups(1, selected, current.token), /index changed after preview/i);
  } finally { fixture.dispose(); }
});

test('the dispatcher rejects tokenless prune requests before the service can enumerate candidates', async () => {
  const fixture = disposableFixture();
  try {
    const dispatcher = dispatchModule.createControlPlaneDispatcher({ userDataPath: fixture.root, resourcesPath: fixture.root, hosted: false });
    const response = await dispatcher.controlPlaneRequest({ action: 'backup.prune', requestId: 'tokenless-prune', payload: { keep: 1, selectedPaths: [] } });
    assert.equal(response.ok, false);
    assert.equal(response.code, 'PRUNE_PREVIEW_TOKEN_REQUIRED');
  } finally { fixture.dispose(); }
});

test('blank push URL clears an old custom push URL and readback falls back to fetch URL', async () => {
  const fixture = disposableFixture();
  try {
    await fixture.service.setRemote('origin', 'https://example.invalid/fetch.git', 'https://example.invalid/push.git');
    assert.equal(git(fixture.history, 'remote', 'get-url', 'origin'), 'https://example.invalid/fetch.git');
    assert.equal(git(fixture.history, 'remote', 'get-url', '--push', 'origin'), 'https://example.invalid/push.git');

    const status = await fixture.service.setRemote('origin', 'https://example.invalid/replaced-fetch.git', '');
    const remote = status.remotes.find((entry) => entry.name === 'origin');
    assert.equal(remote?.fetchUrl, 'https://example.invalid/replaced-fetch.git');
    assert.equal(remote?.pushUrl, 'https://example.invalid/replaced-fetch.git');
    assert.equal(git(fixture.history, 'remote', 'get-url', 'origin'), 'https://example.invalid/replaced-fetch.git');
    assert.equal(git(fixture.history, 'remote', 'get-url', '--push', 'origin'), 'https://example.invalid/replaced-fetch.git');
    assert.throws(() => git(fixture.history, 'config', '--get-all', 'remote.origin.pushurl'));
  } finally { fixture.dispose(); }
});

test('cancellation keeps the actual service boundary honest for an unknown operation', async () => {
  const fixture = disposableFixture();
  try {
    assert.deepEqual(await fixture.service.cancel('unknown-operation'), { cancelled: false, detail: 'No matching operation is running.' });
  } finally { fixture.dispose(); }
});

test('the actual import boundary rejects strict duplicate JSON keys in a real exported manifest', async () => {
  const fixture = disposableFixture();
  try {
    const result = await fixture.service.exportMigration(join(tmpdir(), `migration-import-${Date.now()}-${Math.random().toString(16).slice(2)}`));
    const manifest = join(result.path, 'manifest.json');
    const source = readFileSync(manifest, 'utf8');
    writeFileSync(manifest, source.replace('"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1'), 'utf8');
    await assert.rejects(fixture.service.validateImport(result.path), /Duplicate JSON key: schemaVersion/i);
    rmSync(result.path, { recursive: true, force: true });
  } finally { fixture.dispose(); }
});
