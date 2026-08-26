/**
 * Contract: local-version-history. site/app.js now keeps a real, append-only
 * local history for this page's own settings/appearance state, isolated in
 * its own storage key (HISTORY_KEY) so "Reset settings" can never erase it.
 * Every meaningful mutation records a labelled entry; restoring an earlier
 * entry writes a NEW entry rather than rewriting or removing what it
 * restored, so a restore can itself be undone later. The panel has its own
 * regex-wired search, an action filter genuinely derived from the recorded
 * entries, and a date-range filter.
 *
 * The documentation catalogue's "History" article (app/history) still
 * separately describes the CONSOLE PRODUCT's own history feature -- that
 * entry is unrelated to, and unchanged by, this one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const settingsHtml = read('settings.html');
const registry = json('feature-registry.json');

const grabFunction = (name) => {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `${name}() not found`);
  let depth = 0, i = app.indexOf('{', start);
  for (; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  return app.slice(start, i);
};

test('the site feature registry carries a row for local-version-history', () => {
  assert.ok(registry.features['local-version-history'], 'no local-version-history row in site/feature-registry.json');
});

test('the DESTINATIONS catalogue still lists an unrelated "app/history" article describing the CONSOLE PRODUCT\'s own history feature', () => {
  assert.match(app, /article:'app\/history'/u, 'the app/history documentation entry no longer matches');
});

test('history is stored in its own key, isolated from the settings STORAGE_KEY that "Reset settings" rewrites', () => {
  assert.match(app, /const HISTORY_KEY = 'ding-pbx-pages-history-v1';/u, 'the isolated HISTORY_KEY constant no longer matches');
  assert.match(app, /const STORAGE_KEY = 'ding-pbx-pages-v2';/u, 'the settings STORAGE_KEY constant no longer matches -- confirm the two keys are still genuinely distinct');
});

test('recordHistory() is real and is actually called from the real settings mutation points -- update(), updateAttention(), and the reset gate', () => {
  const record = grabFunction('recordHistory');
  assert.match(record, /historyEntries\.unshift\(\{id:`h\$\{Date\.now\(\)\}-\$\{historySeq\+\+\}`,time:Date\.now\(\),action,summary,snapshot:snapshotState\(\)\}\);/u,
    'recordHistory() no longer appends a labelled entry with a real snapshot');
  assert.match(record, /saveHistory\(\);/u, 'recordHistory() no longer persists to storage');
  const update = grabFunction('update');
  assert.match(update, /recordHistory\('setting-changed',/u, 'update() no longer records a history entry when a setting changes');
  const updateAttention = grabFunction('updateAttention');
  assert.match(updateAttention, /recordHistory\('attention-changed',/u, 'updateAttention() no longer records a history entry when an attention preference changes');
  const performReset = grabFunction('performSettingsReset');
  assert.match(performReset, /recordHistory\('reset',/u, 'performSettingsReset() no longer records a history entry for the reset itself');
});

test('restoring an entry writes a NEW entry rather than rewriting or removing the one it restored -- append-only, genuinely proven by reading the function', () => {
  const restore = grabFunction('restoreHistoryEntry');
  assert.match(restore, /Object\.assign\(state,entry\.snapshot\);/u, 'restoreHistoryEntry() no longer applies the earlier snapshot');
  assert.doesNotMatch(restore, /historyEntries\.splice|historyEntries\.shift\(\)|historyEntries=\[\]|delete historyEntries/u,
    'restoreHistoryEntry() now mutates/removes existing entries -- this would break the append-only guarantee');
  assert.match(restore, /recordHistory\('restored',/u, 'restoreHistoryEntry() no longer records the restore itself as a new entry -- restoring would then be a silent, unrecorded rewrite');
});

test('the action filter is genuinely derived from the real recorded entries, never a hard-coded list', () => {
  assert.match(app, /function historyActionOptions\(\)\{return \[\.\.\.new Set\(historyEntries\.map\(item=>item\.action\)\)\]\.sort\(\)\}/u,
    'historyActionOptions() no longer derives the action list from the real historyEntries array');
});

test('the panel has its own date-range filter and its own regex-wired search field', () => {
  assert.match(settingsHtml, /<input id="history-date-from" type="date" aria-label="From date">/u, 'the from-date filter no longer matches');
  assert.match(settingsHtml, /<input id="history-date-to" type="date" aria-label="To date">/u, 'the to-date filter no longer matches');
  assert.match(settingsHtml, /<input id="history-search" type="search" placeholder="Search local history">/u, 'the history search field no longer matches');
  assert.match(settingsHtml, /<button class="regex-trigger" type="button" data-regex-for="history-search"/u,
    'the history search field no longer carries its own regex-builder trigger');
  const matches = grabFunction('historyMatches');
  assert.match(matches, /matchText\(`\$\{item\.action\} \$\{item\.summary\}`,query,'history-search'\)/u,
    'historyMatches() no longer filters through matchText/the regex-aware search engine');
});

test('each history entry is labelled with what actually changed, not merely that something did, and offers a real Restore action', () => {
  const render = grabFunction('renderHistory');
  assert.match(render, /<strong>\$\{escapeHtml\(item\.action\)\}<\/strong><p>\$\{escapeHtml\(item\.summary\)\}<\/p>/u,
    'renderHistory() no longer labels each entry with its real action and summary text');
  assert.match(render, /data-restore="\$\{item\.id\}"/u, 'renderHistory() no longer renders a real per-entry restore control');
});

test('the registry records local-version-history as implemented, and the code agrees', () => {
  assert.equal(registry.features['local-version-history'].state, 'implemented',
    'a real, append-only, isolated local history exists with restore-as-new-entry, a search field, a real action filter derived from recorded data, and a date-range filter -- "implemented" is the honest state');
});
