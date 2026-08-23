import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const workspaceUrl = new URL('../../app/renderer/src/PbxAdminWorkspace.tsx', import.meta.url);
const mainUrl = new URL('../../app/renderer/src/main.tsx', import.meta.url);

test('advanced PBX workspace stays on the bounded control-plane actions', async () => {
  const source = await readFile(workspaceUrl, 'utf8');

  for (const action of [
    'server.list',
    'pbx.config',
    'pbx.plan',
    'pbx.apply',
    'history.list',
    'history.restore',
    'media.list',
    'media.upload',
    'media.remove',
  ]) {
    assert.match(source, new RegExp(`request\\('${action.replace('.', '\\.')}'`), `missing ${action} wiring`);
  }

  assert.doesNotMatch(source, /request\('pbx\.command'/u, 'the structured editor must not grow a raw Asterisk command path');
  assert.doesNotMatch(source, /child_process|exec\(|spawn\(|powershell|cmd\.exe|wsl\.exe/u, 'the renderer must not execute an operating-system shell');
  assert.match(source, /role="alertdialog" aria-label="Confirm configuration apply"/u);
  assert.match(source, /role="alertdialog" aria-label="Confirm media removal"/u);
  assert.match(source, /role="alertdialog" aria-label="Confirm configuration restore"/u);
});

test('advanced PBX is mounted additively rather than replacing the generated console root', async () => {
  const source = await readFile(mainUrl, 'utf8');
  assert.match(source, /createRoot\(document\.getElementById\('root'\)!\)\.render\(<React\.StrictMode><App/u);
  assert.match(source, /adminHost\.id = 'pbx-admin-workspace-host'/u);
  assert.match(source, /createRoot\(adminHost\)\.render\(<React\.StrictMode><PbxAdminWorkspace/u);
});
