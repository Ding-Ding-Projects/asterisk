import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixturePath = resolve(import.meta.dirname, '..', 'control-plane', 'fixtures', 'gh-keyring-status.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const hosts = fixture?.hosts;
const accounts = hosts?.['github.com'];
if (!hosts || Object.keys(hosts).length !== 1 || !Array.isArray(accounts) || accounts.length !== 1) {
  throw new Error('The bundled gh keyring-status fixture must contain exactly one github.com host with one account.');
}
const account = accounts[0];
const keys = Object.keys(account).sort();
if (keys.join(',') !== 'active,state,tokenSource,user') throw new Error('The bundled gh keyring-status fixture has drifted from the exact token-free shape.');
if (account.user !== 'fixture-user' || account.state !== 'logged_in' || account.tokenSource !== 'keyring' || account.active !== true) {
  throw new Error('The bundled gh keyring-status fixture does not prove an active keyring account.');
}
for (const forbidden of ['token', 'oauth_token', 'password', 'secret', 'access_token']) {
  if (Object.prototype.hasOwnProperty.call(account, forbidden)) throw new Error(`The keyring-status fixture contains forbidden credential field ${forbidden}.`);
}
console.log('forge keyring fixture: PASS');
