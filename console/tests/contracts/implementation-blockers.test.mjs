/**
 * Contract: a recorded blocker is a next step, not a comfortable excuse.
 *
 * Seven modules are complete, tested, and consumed by nothing. That is a legitimate state
 * and it is worth writing down -- but "unwired" written once tends to stay written, and a
 * row that explains why it is not done is exactly the row nobody revisits.
 *
 * So these checks hold the explanation to a standard: it has to be specific enough to act
 * on, it has to belong to a row that is genuinely still partial, and it must disappear the
 * moment the feature ships. The last one matters most -- a blocker outliving its truth is
 * how a registry starts describing a codebase that no longer exists.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const json = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const registry = json('app/feature-registry.json');
const blocked = Object.entries(registry.features).filter(([, row]) => row.blockedBy !== undefined);

test('some rows record a blocker, so these checks are not passing vacuously', () => {
  assert.ok(blocked.length > 0, 'no row records a blocker, so every assertion below checks nothing');
});

test('a blocker only ever appears on a row that is genuinely still partial', () => {
  /* An implemented row carrying a reason it is not implemented is a contradiction, and the
   * one most likely to survive because both halves read as true on their own. */
  for (const [id, row] of blocked) {
    assert.equal(row.state, 'partial',
      `${id} is "${row.state}" and still records why it is not done`);
  }
});

test('a blocker names something specific enough to act on', () => {
  /* "Not wired yet" is a status. "Needs the control plane to emit phase events" is a task. */
  const VAGUE = ['todo', 'later', 'not yet done', 'coming soon', 'wip', 'tbd'];
  for (const [id, row] of blocked) {
    assert.ok(row.blockedBy.length > 120,
      `${id}: the blocker is too short to say what would unblock it`);
    for (const phrase of VAGUE) {
      assert.ok(!row.blockedBy.toLowerCase().includes(phrase),
        `${id}: the blocker says "${phrase}", which is a status rather than a next step`);
    }
  }
});

test('a blocker says what real consumption would require, not only that it is absent', () => {
  /* The difference between recording a gap and recording a route through it. */
  for (const [id, row] of blocked) {
    const text = row.blockedBy.toLowerCase();
    assert.ok(
      text.includes('real consumption') || text.includes('needs ') || text.includes('means '),
      `${id}: the blocker names the gap but not what would close it`,
    );
  }
});

test('every blocked module exists on disk, so no row is blocked on nothing', () => {
  /* A blocker for a module that was never written would read as work in progress and be
   * work not started. */
  for (const [id, row] of blocked) {
    assert.ok(Array.isArray(row.files) && row.files.length > 0, `${id} records no files`);
    for (const file of row.files) {
      assert.doesNotThrow(() => readFileSync(resolve(root, file)),
        `${id} is blocked but ${file} does not exist`);
    }
  }
});

test('a blocked row does not also claim a consumer', () => {
  /* The check that makes the blocker expire. If a module named here gains a real import
   * outside its own test, the reason it is unwired has stopped being true and this fails
   * until somebody moves the row rather than leaving a stale explanation behind. */
  const sources = ['app/renderer/src/App.tsx'];
  for (const [id, row] of blocked) {
    const moduleFile = row.files.find((file) => file.startsWith('app/renderer/src/'));
    if (!moduleFile) continue;
    const moduleName = moduleFile.replace('app/renderer/src/', '').replace(/\.ts$/u, '');
    for (const source of sources) {
      const text = readFileSync(resolve(root, source), 'utf8');
      assert.ok(!text.includes(`from './${moduleName}'`),
        `${id} is recorded as having no consumer, but ${source} now imports it -- move the row instead of leaving the blocker`);
    }
  }
});
