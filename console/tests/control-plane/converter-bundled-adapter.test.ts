import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConverterRegistry } from '../../control-plane/converter-registry.js';
import { ConverterRunner } from '../../control-plane/converter-runner.js';

test('a proved fixed worker adapter converts UTF-8 locally and validates the destination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-converter-'));
  const proofPath = join(root, 'fixed-worker-runtime.js');
  const sourcePath = join(root, 'source.txt');
  const destinationPath = join(root, 'destination.txt');
  try {
    const proofBytes = Buffer.from('fixed worker runtime proof');
    await writeFile(proofPath, proofBytes);
    await writeFile(sourcePath, 'alpha\r\nbeta', 'utf8');
    const registry = await ConverterRegistry.create({ fixedWorkerKernel: {
      proofId: 'test-fixed-worker',
      adapterRuntime: 'fixed-worker-kernel-v1',
      artifactPath: proofPath,
      artifactSha256: createHash('sha256').update(proofBytes).digest('hex'),
      verifiedAt: new Date().toISOString(),
      bundled: true,
      offline: true,
      packagedArtifact: true,
    } });
    const adapter = registry.adapter('normalize-utf8');
    assert.equal(adapter?.availability.state, 'enabled');
    const outcome = await new ConverterRunner({ registry }).convert({
      adapterId: 'normalize-utf8',
      sourcePath,
      destinationPath,
      overwriteApproved: false,
      acknowledgedDisclosureIds: ['normalize-utf8:representation-change'],
    });
    assert.equal(outcome.state, 'converted');
    assert.equal(await readFile(destinationPath, 'utf8'), 'alpha\nbeta\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
