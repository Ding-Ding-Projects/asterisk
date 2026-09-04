/**
 * Contract: the README's status block says what the code currently measures.
 *
 * This is the guard for a specific failure, not a general tidiness rule. The section it
 * replaced was hand-written, and every one of its six bullets went false without anyone
 * noticing: it said nothing had ever been written to an exchange, that the desktop interface
 * carried no accessibility attributes at all, and that no built-artifact captures existed.
 * All three had been true when typed. None were true months later.
 *
 * That is worse than having no section. A reader cannot tell a stale claim from a current one
 * — the confident tone is identical — so a stale README actively misleads the person most
 * likely to trust it: someone deciding whether the thing works.
 *
 * The block is therefore generated from the code it describes, and this fails when the two
 * disagree. It does not check that the numbers are good; it checks that they are true.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(consoleRoot, '..');
const script = resolve(consoleRoot, 'scripts', 'status-block.mjs');
/* Normalised: this is a CRLF checkout, and comparing raw text across that boundary reports a
 * drift that is only line endings — which would make this guard cry wolf on every checkout. */
const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8').replace(/\r\n/gu, '\n');

test('the README carries the generated status block', () => {
  assert.ok(readme.includes('<!-- status-block:begin -->'), 'the status block markers are gone from README.md');
  assert.ok(readme.includes('<!-- status-block:end -->'), 'the status block end marker is gone from README.md');
});

test('the block is not empty, so a reader is not told nothing at all', () => {
  const start = readme.indexOf('<!-- status-block:begin -->');
  const end = readme.indexOf('<!-- status-block:end -->');
  const body = readme.slice(start, end);
  assert.ok(body.length > 400, `the status block is only ${body.length} characters; it has been emptied rather than regenerated`);
  assert.match(body, /Controls that do something/u, 'the coverage row is gone');
  assert.match(body, /Written to a real exchange/u, 'the honest-gaps section is gone');
});

test('what the README claims is what the code measures', () => {
  /* The generator exits non-zero and explains itself when they disagree, so this delegates
   * rather than reimplementing the comparison — two copies of the same logic drift, and a
   * guard that drifts from the thing it guards is the failure one layer up. */
  try {
    execFileSync(process.execPath, [script, '--check'], { cwd: repoRoot, encoding: 'utf8' });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    assert.fail(`the README status block no longer matches the measurements.\n${output}`);
  }
});
