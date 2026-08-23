import test from 'node:test';
import assert from 'node:assert/strict';
import { WslProvisioning, MANAGED_DISTRIBUTION } from '../../control-plane/wsl-provisioning.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

/**
 * A recording executor. Every case drives real code paths against scripted results, so
 * the tests exercise the module rather than the machine — nothing here creates,
 * terminates or unregisters an actual distribution.
 */
class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.script(request) };
  }
}

const isList = (r: CommandRequest) => r.args[0] === '--list';
const isImport = (r: CommandRequest) => r.args[0] === '--import';
const isVersion = (r: CommandRequest) => r.args.includes('asterisk');

const build = (script: (request: CommandRequest) => Partial<CommandResult>) => {
  const executor = new FakeExecutor(script);
  const provisioning = new WslProvisioning({
    executor,
    rootfsPath: 'C:/app/resources/asterisk/asterisk-wsl-rootfs.tar',
    installDirectory: 'C:/Users/example/AppData/Local/ding-pbx-console/wsl',
    now: () => new Date('2026-08-23T00:00:00.000Z'),
  });
  return { executor, provisioning };
};

test('reports notProvisioned when the payload is present and the distribution is not', async () => {
  const { provisioning } = build((r) => (isList(r) ? { stdout: 'docker-desktop\n' } : {}));
  const status = await provisioning.status(true);
  assert.equal(status.state, 'notProvisioned');
  assert.equal(status.distribution, MANAGED_DISTRIBUTION);
});

test('reports payloadMissing rather than offering a provision that cannot succeed', async () => {
  const { provisioning } = build((r) => (isList(r) ? { stdout: 'docker-desktop\n' } : {}));
  const status = await provisioning.status(false);
  assert.equal(status.state, 'payloadMissing');
  assert.match(status.reason ?? '', /does not carry/u);
});

test('reports wslUnavailable when WSL itself does not answer', async () => {
  const { provisioning } = build(() => ({ status: 'failed', exitCode: 1, stderr: 'WSL is not installed' }));
  const status = await provisioning.status(true);
  assert.equal(status.state, 'wslUnavailable');
  assert.match(status.reason ?? '', /not installed/u);
});

test('reports ready with the version the distribution actually answered', async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: `docker-desktop\n${MANAGED_DISTRIBUTION}\n` };
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' };
    return {};
  });
  const status = await provisioning.status(true);
  assert.equal(status.state, 'ready');
  assert.equal(status.asteriskVersion, 'Asterisk 23.5.0');
});

test('a distribution that exists but cannot run Asterisk is unusable, not ready', async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: `${MANAGED_DISTRIBUTION}\n` };
    if (isVersion(r)) return { status: 'failed', exitCode: 127, stderr: 'asterisk: command not found' };
    return {};
  });
  const status = await provisioning.status(true);
  /* Not `failed`: nothing was being created here. The distinction is what lets the
   * interface offer the one thing that actually helps — see the state's own note. */
  assert.equal(status.state, 'unusable');
  assert.match(status.reason ?? '', /command not found/u);
});

test('a registered distribution whose disk is gone is unusable and keeps the real reason', async () => {
  /* Reproduced from a real machine. WSL keeps the registration when the virtual disk
   * is deleted underneath it, so the distribution lists normally and nothing can run in
   * it. This is the state that used to be a dead end: importing is refused because the
   * name exists, and the only way out is to unregister it first. */
  const diskGone =
    "Failed to attach disk 'C:\\Users\\someone\\AppData\\Local\\ding-pbx-console\\wsl\\ext4.vhdx' to WSL2: " +
    'The system cannot find the path specified. \nError code: Wsl/Service/CreateInstance/MountDisk/HCS/ERROR_PATH_NOT_FOUND';
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: `${MANAGED_DISTRIBUTION}\n` };
    if (isVersion(r)) return { status: 'failed', exitCode: 127, stdout: diskGone };
    return {};
  });

  const status = await provisioning.status(true);
  assert.equal(status.state, 'unusable');
  assert.ok(
    (status.reason ?? '').includes('ERROR_PATH_NOT_FOUND'),
    'the disk-attach failure was dropped, leaving nothing to diagnose from',
  );
  assert.equal(status.asteriskVersion, undefined, 'an error message was reported as a version');
});

test('provision imports the packaged payload and verifies it end to end', async () => {
  let imported = false;
  const { executor, provisioning } = build((r) => {
    if (isList(r)) return { stdout: 'docker-desktop\n' };
    if (isImport(r)) { imported = true; return {}; }
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' };
    return {};
  });
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, 'ready');
  assert.ok(imported, 'provision never ran the import');
  assert.deepEqual(outcome.steps.map((step) => step.ok), [true, true, true, true, true]);

  const importCall = executor.calls.find(isImport);
  assert.ok(importCall);
  assert.deepEqual([...importCall.args], [
    '--import', MANAGED_DISTRIBUTION,
    'C:/Users/example/AppData/Local/ding-pbx-console/wsl',
    'C:/app/resources/asterisk/asterisk-wsl-rootfs.tar',
    '--version', '2',
  ]);
});

test('provision refuses to import over an existing distribution', async () => {
  const { executor, provisioning } = build((r) => (isList(r) ? { stdout: `${MANAGED_DISTRIBUTION}\n` } : {}));
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /already exists/u);
  assert.equal(executor.calls.filter(isImport).length, 0, 'it imported over an existing distribution');
});

test('provision refuses without the packaged payload and never calls WSL', async () => {
  const { executor, provisioning } = build(() => ({}));
  const outcome = await provisioning.provision(false);
  assert.equal(outcome.status.state, 'failed');
  assert.equal(executor.calls.length, 0, 'it called WSL despite having nothing to import');
});

test('a failed import is reported as failed rather than reported as ready', async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: '' };
    if (isImport(r)) return { status: 'failed', exitCode: 1, stderr: 'the disk is full' };
    return {};
  });
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /disk is full/u);
});

test('an import that succeeds but produces a distribution that cannot run Asterisk is failed', async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: '' };
    if (isVersion(r)) return { status: 'failed', exitCode: 127, stderr: 'no asterisk here' };
    return {};
  });
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, 'failed', 'a green exit code was trusted over asking the distribution');
  assert.match(outcome.status.reason ?? '', /no asterisk here/u);
});

test('remove refuses any distribution the console does not own', async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.remove('Ubuntu');
  assert.equal(step.ok, false);
  assert.match(step.detail, /only removes/u);
  assert.equal(executor.calls.length, 0, 'it tried to unregister a distribution it does not own');
});

test('remove unregisters exactly the managed distribution', async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.remove(MANAGED_DISTRIBUTION);
  assert.equal(step.ok, true);
  assert.deepEqual([...executor.calls[0].args], ['--unregister', MANAGED_DISTRIBUTION]);
});

test('stop terminates exactly the managed distribution', async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.stop();
  assert.equal(step.ok, true);
  assert.deepEqual([...executor.calls[0].args], ['--terminate', MANAGED_DISTRIBUTION]);
});

test('every command goes through the allowlisted executable with no shell', async () => {
  const { executor, provisioning } = build((r) => {
    if (isList(r)) return { stdout: '' };
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' };
    return {};
  });
  await provisioning.provision(true);
  await provisioning.stop();
  await provisioning.remove(MANAGED_DISTRIBUTION);
  assert.ok(executor.calls.length > 0);
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) {
      assert.ok(!/[&|;><`$]/u.test(arg), `argument carries shell metacharacters: ${arg}`);
    }
  }
});

/* ---- provisioning from a pinned base image, when no payload was packaged ---- */

const BASE = {
  url: 'https://example.invalid/ubuntu-24.04-wsl-amd64.tar',
  sha256: 'a'.repeat(64),
  downloadPath: 'C:/Users/example/AppData/Local/ding-pbx-console/base.tar',
};

function fromBase(
  script: (request: CommandRequest) => Partial<CommandResult>,
  download: () => Promise<{ bytes: number; sha256: string }>,
) {
  const executor = new FakeExecutor(script);
  const provisioning = new WslProvisioning({
    executor,
    rootfsPath: '',
    installDirectory: 'C:/Users/example/AppData/Local/ding-pbx-console/wsl',
    baseImage: BASE,
    downloader: { download },
    now: () => new Date('2026-08-23T00:00:00.000Z'),
  });
  return { executor, provisioning };
}

const healthy = (r: CommandRequest) => {
  if (isList(r)) return { stdout: 'docker-desktop\n' };
  if (isVersion(r)) return { stdout: 'Asterisk 20.6.0\n' };
  return {};
};

test('base-image provisioning downloads, verifies, imports, installs and verifies', async () => {
  const { executor, provisioning } = fromBase(healthy, async () => ({ bytes: 300, sha256: BASE.sha256 }));
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'ready', outcome.status.reason);
  assert.equal(outcome.status.asteriskVersion, 'Asterisk 20.6.0');
  assert.deepEqual(
    outcome.steps.map((s) => s.name),
    ['base image configured', 'distribution absent', 'download base image', 'verify base image', 'import runtime', 'install Asterisk', 'verify Asterisk'],
  );
  const apt = executor.calls.filter((c) => c.args.includes('apt-get'));
  assert.equal(apt.length, 2, 'it did not run both the update and the install');
  assert.equal(apt[1].environment?.DEBIAN_FRONTEND, 'noninteractive', 'apt could stop to ask a question nobody can answer');
});

test('a digest mismatch stops before the archive is ever imported', async () => {
  const { executor, provisioning } = fromBase(healthy, async () => ({ bytes: 300, sha256: 'b'.repeat(64) }));
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /does not match its expected digest/u);
  assert.equal(executor.calls.filter(isImport).length, 0, 'it imported an archive it could not verify');
});

test('a failed download is reported and nothing is imported', async () => {
  const { executor, provisioning } = fromBase(healthy, async () => { throw new Error('the network is unreachable'); });
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /network is unreachable/u);
  assert.equal(executor.calls.filter(isImport).length, 0);
});

test('a failed package install is failed, not silently ready', async () => {
  const { provisioning } = fromBase((r) => {
    if (isList(r)) return { stdout: '' };
    if (r.args.includes('apt-get')) return { status: 'failed', exitCode: 100, stderr: 'Unable to locate package asterisk' };
    return {};
  }, async () => ({ bytes: 300, sha256: BASE.sha256 }));
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /Unable to locate package/u);
});

test('base-image provisioning refuses to overwrite an existing distribution', async () => {
  const { executor, provisioning } = fromBase(
    (r) => (isList(r) ? { stdout: `${MANAGED_DISTRIBUTION}\n` } : {}),
    async () => ({ bytes: 300, sha256: BASE.sha256 }),
  );
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /already exists/u);
  assert.equal(executor.calls.filter(isImport).length, 0);
});

test('with no base image configured it says so rather than half-trying', async () => {
  const { provisioning } = build(() => ({}));
  const outcome = await provisioning.provisionFromBaseImage();
  assert.equal(outcome.status.state, 'failed');
  assert.match(outcome.status.reason ?? '', /no packaged runtime and no base image/u);
});
