import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * server.connect decides "Asterisk is running" from the CLI's answer to `core show version`.
 * The pattern used to demand `Asterisk <digits>`, which refused a live daemon whose identity
 * is `Asterisk UNKNOWN__and_probably_unsupported` (a source checkout with no .version file).
 * The pattern is extracted from the real source and executed, so a rename cannot satisfy it.
 */
function connectIdentityPattern(): RegExp {
  const source = readFileSync(join(consoleRoot, 'control-plane', 'dispatch.ts'), 'utf8');
  const line = source.split(String.fromCharCode(10)).find((l) => l.includes('const asteriskAvailable = asterisk.status'));
  assert.ok(line, 'the asteriskAvailable decision line must remain addressable');
  const match = line.match(/\/(\^Asterisk[^/]*)\/([a-z]*)\.test\(/u);
  assert.ok(match, 'asteriskAvailable must test a regex literal that starts with ^Asterisk');
  return new RegExp(match[1], match[2]);
}

test('a live daemon is connected whatever identity it prints', () => {
  const pattern = connectIdentityPattern();
  for (const answer of [
    'Asterisk 22.4.1 built by root @ host on a x86_64 running Linux on 2026-01-01',
    'Asterisk UNKNOWN__and_probably_unsupported built by root @ buildkitsandbox on a x86_64 running Linux on 2026-08-23 02:38:35 UTC',
    'Asterisk master-gbb3d7aeb7cb7 built by root @ buildkitsandbox on a x86_64 running Linux',
  ]) {
    assert.equal(pattern.test(answer), true, answer);
  }
});

test('an error or empty answer is still not a connection', () => {
  const pattern = connectIdentityPattern();
  for (const answer of ['', 'Asterisk', '/bin/bash: line 1: asterisk: command not found', 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)']) {
    assert.equal(pattern.test(answer), false, answer || '(empty)');
  }
});
