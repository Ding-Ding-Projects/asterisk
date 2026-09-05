import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { PROVENANCE_SCHEMA_VERSION } from '../../scripts/asterisk-runtime-provenance.mjs';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * The packaged runtime provenance is written by scripts/asterisk-runtime-provenance.mjs and
 * read back by bundledAsteriskRuntime() in the control plane. The two disagreed for a whole
 * release line: the writer emitted schemaVersion 2 while the reader accepted only 1, so every
 * correctly built payload was reported unavailable and the deploy wizard fell through to a
 * base-image fallback the package does not carry. This pins the reader to the writer's version.
 */
test('the control plane accepts the schema version the provenance generator writes', () => {
  const source = readFileSync(join(consoleRoot, 'control-plane', 'dispatch.ts'), 'utf8');
  const start = source.indexOf('function bundledAsteriskRuntime()');
  assert.ok(start >= 0, 'bundledAsteriskRuntime must remain addressable');
  const body = source.slice(start, source.indexOf('function statusHubUnavailable', start));
  assert.match(body, new RegExp(`record\\.schemaVersion === ${PROVENANCE_SCHEMA_VERSION}\\b`, 'u'), `reader must accept schemaVersion ${PROVENANCE_SCHEMA_VERSION}`);
  assert.match(body, /record\.runtime === 'wsl2-linux-amd64'/u);
  assert.match(body, /statSync\(rootfs\)\.size === record\.bytes/u);
});

test('the generator still writes the version the reader is pinned to', () => {
  assert.equal(PROVENANCE_SCHEMA_VERSION, 2);
});
