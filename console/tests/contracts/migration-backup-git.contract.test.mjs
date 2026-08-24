import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function disposableFixture() {
  const root = mkdtempSync(join(tmpdir(), 'migration-backup-git-fixture-'));
  const calls = [];
  const executor = {
    async execute(request) {
      calls.push({ executable: request.executable, args: [...request.args], cwd: request.cwd, signal: request.signal });
      return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    },
  };
  return { root, calls, executor, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('disposable fake executor keeps Git operations structured and cancellable', () => {
  const fixture = disposableFixture();
  try {
    const controller = new AbortController();
    void fixture.executor.execute({ executable: 'git', args: ['bundle', 'verify', join(fixture.root, 'history.bundle')], cwd: fixture.root, signal: controller.signal });
    void fixture.executor.execute({ executable: 'git', args: ['ls-remote', 'https://example.invalid/project.git', 'refs/heads/main'], cwd: fixture.root, signal: controller.signal });
    assert.equal(fixture.calls.length, 2);
    assert.deepEqual(fixture.calls[0].args.slice(0, 2), ['bundle', 'verify']);
    assert.equal(fixture.calls[1].args[0], 'ls-remote');
    assert.equal(fixture.calls[1].signal, controller.signal);
  } finally {
    fixture.dispose();
  }
});

test('real migration service can be instantiated with the disposable executor', async () => {
  const fixture = disposableFixture();
  try {
    const module = await import('../../control-plane/migration-backup-git.ts');
    const service = new module.MigrationBackupService({ userDataPath: fixture.root, executor: fixture.executor });
    assert.deepEqual(service.recoveryStatus().resolved, true);
  } finally {
    fixture.dispose();
  }
});

test('disposable manifest fixture detects duplicate keys before import', () => {
  const fixture = disposableFixture();
  try {
    const manifest = join(fixture.root, 'manifest.json');
    writeFileSync(manifest, '{"schemaVersion":1,"schemaVersion":2}', 'utf8');
    const raw = readFileSync(manifest, 'utf8');
    const keys = [...raw.matchAll(/"([^"\\]+)"\s*:/gu)].map((match) => match[1]);
    assert.equal(new Set(keys).size, 1);
    assert.equal(keys.length, 2);
  } finally {
    fixture.dispose();
  }
});
