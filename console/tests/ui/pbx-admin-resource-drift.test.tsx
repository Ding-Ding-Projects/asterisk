import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXPECTED_CONFIGURABLE_RESOURCES } from '../../app/renderer/src/pbx-admin-model';
import { CONFIGURABLE_RESOURCES } from '../../control-plane/wsl-config-transport.js';

test('PBX Admin renderer resource mirror is byte-for-byte equivalent as a set to the backend allowlist', () => {
  assert.deepEqual(
    [...EXPECTED_CONFIGURABLE_RESOURCES].sort(),
    [...CONFIGURABLE_RESOURCES].sort(),
    'renderer/backend configurable resource lists drifted apart',
  );
  assert.equal(CONFIGURABLE_RESOURCES.length, 47);
});
