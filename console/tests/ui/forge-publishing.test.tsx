/**
 * Publishing to a forge.
 *
 * Two groups carry the weight. No token may reach anything this module returns, since an
 * account list is walked by exports and screenshots like any other. And a route
 * substitution must be reported rather than made silently: a fork and a copy produce
 * different things, and somebody who asked for one and got the other has a repository
 * they cannot explain.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ACTIVE_ACCOUNT_SETTING, MAX_REPOSITORY_NAME_LENGTH, activeAccount, chooseRoute, isRefusal,
  ownersFor, planPublish, setActiveAccount, signOut,
  type AccountStorage, type ForgeAccount, type ForgeOwner,
} from '../../app/renderer/src/forge-publishing.ts';

const memory = (): AccountStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
};

const account = (over: Partial<ForgeAccount> = {}): ForgeAccount => ({
  id: 'a1', login: 'someone', host: 'github.com',
  credentialKey: 'ding-pbx-console/forge/a1',
  capabilities: ['fork', 'create-repository', 'push'],
  ...over,
});

const owner = (over: Partial<ForgeOwner> = {}): ForgeOwner => ({
  accountId: 'a1', name: 'someone', kind: 'user', canCreate: true, ...over,
});

/* --- no token, anywhere ------------------------------------------------------------- */

test('an account carries the vault key and never the token', () => {
  /* An account list is walked by exports and screenshots like any other list, so a token
   * on this object would leave through several doors at once. */
  const fields = Object.keys(account());
  for (const suspect of ['token', 'secret', 'password', 'pat', 'accessToken']) {
    assert.ok(!fields.includes(suspect), `an account exposes "${suspect}"`);
  }
  assert.ok(account().credentialKey.length > 0, 'nothing names where the token lives');
});

test('no value the module returns contains anything token-shaped', () => {
  const plan = planPublish({
    account: account(), owner: owner(), repositoryName: 'ding', preferredRoute: 'fork',
  });
  assert.ok(!('problems' in plan));
  assert.ok(!/gh[pousr]_[A-Za-z0-9]/u.test(JSON.stringify(plan)), 'something token-shaped survived into the plan');
});

/* --- whose account, whose namespace --------------------------------------------------- */

test('with one account signed in, that one is active without being chosen', () => {
  assert.equal(activeAccount(memory(), [account()])?.id, 'a1');
});

test('with several signed in and none chosen, nothing is active', () => {
  /* Guessing between two accounts is how work lands in somebody else's namespace, and it
   * is found out by a colleague not finding it. */
  const accounts = [account(), account({ id: 'a2', login: 'other' })];
  assert.equal(activeAccount(memory(), accounts), undefined);
});

test('a chosen account is active and persists', () => {
  const storage = memory();
  const accounts = [account(), account({ id: 'a2', login: 'other' })];
  setActiveAccount(storage, 'a2');
  assert.equal(activeAccount(storage, accounts)?.id, 'a2');
  assert.equal(storage.map.get(ACTIVE_ACCOUNT_SETTING), 'a2');
});

test('an active account that has been signed out is not resurrected', () => {
  const storage = memory();
  setActiveAccount(storage, 'a2');
  assert.equal(activeAccount(storage, [account()])?.id, 'a1', 'fell back to the only remaining account');
  assert.equal(activeAccount(storage, []), undefined);
});

test('signing out clears the active choice when it was that account', () => {
  const storage = memory();
  const accounts = [account(), account({ id: 'a2', login: 'other' })];
  setActiveAccount(storage, 'a2');
  const remaining = signOut(storage, accounts, 'a2');
  assert.deepEqual(remaining.map((entry) => entry.id), ['a1']);
  assert.equal(storage.map.has(ACTIVE_ACCOUNT_SETTING), false);
});

test('signing out someone else leaves the active choice alone', () => {
  const storage = memory();
  const accounts = [account(), account({ id: 'a2', login: 'other' })];
  setActiveAccount(storage, 'a1');
  signOut(storage, accounts, 'a2');
  assert.equal(storage.map.get(ACTIVE_ACCOUNT_SETTING), 'a1');
});

test('only namespaces this account can create in are offered', () => {
  /* A namespace it can see but not write to would fail late, with a permission error
   * that says nothing about which choice was wrong. */
  const owners = [
    owner(),
    owner({ name: 'read-only-org', kind: 'organization', canCreate: false }),
    owner({ accountId: 'a2', name: 'someone-elses-org', kind: 'organization' }),
  ];
  assert.deepEqual(ownersFor(owners, 'a1').map((entry) => entry.name), ['someone']);
});

test('an organization the account can create in is offered alongside its own namespace', () => {
  const owners = [owner(), owner({ name: 'ding-projects', kind: 'organization' })];
  assert.deepEqual(ownersFor(owners, 'a1').map((entry) => entry.name), ['someone', 'ding-projects']);
});

/* --- fork or copy, and never a silent swap --------------------------------------------- */

test('a forge that can fork honours a fork preference', () => {
  const chosen = chooseRoute(account(), 'fork');
  assert.ok(!isRefusal(chosen));
  assert.equal(chosen.route, 'fork');
  assert.match(chosen.reason, /keeps its link/u);
});

test('a forge that cannot fork substitutes a copy and says what is lost', () => {
  /* A fork has an upstream link and a copy does not. Somebody who asked for one and got
   * the other silently has a repository they cannot explain. */
  const chosen = chooseRoute(account({ capabilities: ['create-repository', 'push'] }), 'fork');
  assert.ok(!isRefusal(chosen));
  assert.equal(chosen.route, 'copy-and-push');
  assert.match(chosen.reason, /cannot fork/u);
  assert.match(chosen.reason, /no link back/u);
});

test('a forge that can do neither refuses rather than offering a route that will fail', () => {
  const chosen = chooseRoute(account({ capabilities: [] }), 'fork');
  assert.ok(isRefusal(chosen));
  assert.match(chosen.reason, /neither fork nor create/u);
});

test('a copy preference never becomes a fork', () => {
  /* The substitution is only ever in the one direction, because a fork does something a
   * copy does not and nobody asked for it. */
  const chosen = chooseRoute(account(), 'copy-and-push');
  assert.ok(!isRefusal(chosen));
  assert.equal(chosen.route, 'copy-and-push');
});

test('pushing without being able to create a repository is refused', () => {
  const chosen = chooseRoute(account({ capabilities: ['push'] }), 'copy-and-push');
  assert.ok(isRefusal(chosen));
});

/* --- the plan ---------------------------------------------------------------------------- */

test('a complete plan summarises the account, the namespace and the route', () => {
  const plan = planPublish({
    account: account(), owner: owner({ name: 'ding-projects', kind: 'organization' }),
    repositoryName: 'asterisk', preferredRoute: 'fork',
  });
  assert.ok(!('problems' in plan));
  assert.ok(plan.summary.includes('ding-projects/asterisk'));
  assert.ok(plan.summary.includes('github.com'));
  assert.ok(plan.summary.includes('someone'));
});

test('a namespace belonging to another account is refused before anything is attempted', () => {
  const result = planPublish({
    account: account(), owner: owner({ accountId: 'a2', name: 'elsewhere' }),
    repositoryName: 'x', preferredRoute: 'fork',
  });
  assert.ok('problems' in result);
  assert.ok(result.problems.some((problem) => problem.field === 'owner'));
});

test('every problem is reported at once rather than one per attempt', () => {
  const result = planPublish({ repositoryName: '', preferredRoute: 'fork' });
  assert.ok('problems' in result);
  assert.deepEqual(result.problems.map((problem) => problem.field).sort(), ['account', 'name', 'owner']);
});

test('an unusable repository name is refused and the message says what is allowed', () => {
  const result = planPublish({
    account: account(), owner: owner(), repositoryName: 'not a name!', preferredRoute: 'fork',
  });
  assert.ok('problems' in result);
  assert.match(result.problems[0].message, /Letters, digits, dots, hyphens/u);
});

test('a name at the limit is accepted and one over it is not', () => {
  const at = planPublish({
    account: account(), owner: owner(),
    repositoryName: 'a'.repeat(MAX_REPOSITORY_NAME_LENGTH), preferredRoute: 'fork',
  });
  assert.ok(!('problems' in at));
  const over = planPublish({
    account: account(), owner: owner(),
    repositoryName: 'a'.repeat(MAX_REPOSITORY_NAME_LENGTH + 1), preferredRoute: 'fork',
  });
  assert.ok('problems' in over);
});

test('the name is trimmed rather than refused for surrounding whitespace', () => {
  const plan = planPublish({
    account: account(), owner: owner(), repositoryName: '  asterisk  ', preferredRoute: 'fork',
  });
  assert.ok(!('problems' in plan));
  assert.equal(plan.repositoryName, 'asterisk');
});

test('a plan on a forge that cannot fork records the copy route it actually got', () => {
  const plan = planPublish({
    account: account({ capabilities: ['create-repository', 'push'] }), owner: owner(),
    repositoryName: 'asterisk', preferredRoute: 'fork',
  });
  assert.ok(!('problems' in plan));
  assert.equal(plan.route, 'copy-and-push');
  assert.ok(plan.summary.startsWith('Copy'), 'the summary still claims a fork');
});

test('the account type itself declares no token-like field', () => {
  /* The fixture-based check above reads Object.keys of an object I construct, so adding
   * an OPTIONAL token to the interface never reaches it -- proven by trying exactly that
   * and watching the suite stay green. This reads the declaration instead, which is where
   * such a field would actually be added. */
  const source = readFileSync(
    fileURLToPath(new URL('../../app/renderer/src/forge-publishing.ts', import.meta.url)),
    'utf8',
  );
  const start = source.indexOf('export interface ForgeAccount {');
  const end = source.indexOf('\n}', start);
  assert.ok(start > 0 && end > start, 'ForgeAccount could not be located, so this checks nothing');
  /* Field names are found by splitting rather than by a regular expression. A pattern
   * here has to carry its escapes through every layer between the editor and the file,
   * and the first version of this line arrived with its backslashes eaten -- which threw
   * on an invalid pattern rather than checking anything. Splitting needs no escapes. */
  const fieldNames = source
    .slice(start, end)
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('*') && !line.startsWith('/') && line.includes(':'))
    .map((line) => line.slice(0, line.indexOf(':')).replace('?', '').trim().toLowerCase());

  assert.ok(fieldNames.includes('credentialkey'), 'no field names were found, so this checks nothing');
  for (const suspect of ['token', 'secret', 'password', 'pat', 'bearer']) {
    for (const field of fieldNames) {
      assert.ok(!field.includes(suspect),
        `ForgeAccount declares "${field}", which contains "${suspect}"`);
    }
  }
});
