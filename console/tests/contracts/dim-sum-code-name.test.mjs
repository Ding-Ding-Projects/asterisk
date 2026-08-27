/**
 * Contract: the release code name resolver.
 *
 * Every assertion here runs offline against a fixture served by a loopback server, so
 * the suite never depends on the public catalogue being reachable. The two endpoints
 * are overridable for exactly that reason and for no other; the release path passes no
 * override and always reads the real ones.
 *
 * The property that matters most is the one a release depends on: this script must
 * NEVER fail a release. A code name is decoration with a purpose, so every failure path
 * has to exit 0 and say why. That is asserted directly rather than assumed, including
 * the case where the catalogue is simply not there.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'dim-sum-code-name.mjs');

const CATALOGUE = [
  { id: 'hk-dish-0001', name: { en: 'Classic Har Gow', zhHant: '蝦餃' }, image: { path: 'images/a.png', alt: { en: 'a' } } },
  { id: 'hk-dish-0002', name: { en: 'Siu Mai', zhHant: '燒賣' }, image: { path: 'images/b.png', alt: { en: 'b' } } },
  { id: 'hk-dish-0003', name: { en: 'Char Siu Bao', zhHant: '叉燒包' }, image: { path: 'images/c.png', alt: { en: 'c' } } },
];

/** Serves the fixture catalogue, and answers HEAD for every photo except a named one. */
const withServer = async (missing, body) => {
  const missingAssets = new Set(Array.isArray(missing) ? missing : [missing]);
  const server = createServer((req, res) => {
    if (req.url === '/catalog.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(CATALOGUE)); return; }
    if ([...missingAssets].some((asset) => req.url.endsWith(`/${asset}`))) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-length': '2406444' }); res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await body(base); } finally { server.closeAllConnections(); server.close(); }
};

const run = promisify(execFile);

/* Deliberately asynchronous. A synchronous child-process call blocks this process's own
 * event loop, so the fixture server above could never answer the child's request and the
 * two would deadlock -- which presents as a test timeout rather than as anything that
 * names the cause. Also: rejecting on a non-zero exit means a throw here IS the failure
 * this whole file exists to prevent, so no separate exit-code assertion is needed. */
const runScript = async (env, args = []) => {
  const { stdout } = await run(process.execPath, [script, ...args], {
    env: { ...process.env, ...env }, encoding: 'utf8', timeout: 20000,
  });
  return JSON.parse(stdout);
};

test('resolves the first dish whose photo is actually published', async () => {
  await withServer('none', async (base) => {
    const out = await runScript({ DING_PBX_DIM_SUM_CATALOG: `${base}/catalog.json`, DING_PBX_DIM_SUM_DOWNLOAD_BASE: base });
    assert.equal(out.resolved, true);
    assert.equal(out.id, 'hk-dish-0001');
    assert.equal(out.codeName, 'Classic Har Gow · 蝦餃', 'the code name carries both languages, separated by a middle dot');
    assert.equal(out.catalogueSize, 3);
  });
});

test('skips every name a previous release already spent', async () => {
  await withServer('none', async (base) => {
    const dir = mkdtempSync(join(tmpdir(), 'dimsum-'));
    const used = join(dir, 'used.txt');
    writeFileSync(used, 'release one took hk-dish-0001\nrelease two took hk-dish-0002\n');
    const out = await runScript(
      { DING_PBX_DIM_SUM_CATALOG: `${base}/catalog.json`, DING_PBX_DIM_SUM_DOWNLOAD_BASE: base },
      ['--used-from', used],
    );
    assert.equal(out.resolved, true);
    assert.equal(out.id, 'hk-dish-0003', 'a spent name must never be handed out a second time');
    assert.equal(out.spentBefore, 2);
  });
});

test('walks past a dish whose photo was never published', async () => {
  /* A catalogue record is not a published photo. Picking a dish whose image does not
   * exist would produce a release note pointing at a broken image. */
  await withServer('a.png', async (base) => {
    const out = await runScript({ DING_PBX_DIM_SUM_CATALOG: `${base}/catalog.json`, DING_PBX_DIM_SUM_DOWNLOAD_BASE: base });
    assert.equal(out.resolved, true);
    assert.equal(out.id, 'hk-dish-0002');
  });
});

test('skips both a spent dish and an unpublished dish before selecting a published unused record', async () => {
  await withServer('b.png', async (base) => {
    const dir = mkdtempSync(join(tmpdir(), 'dimsum-'));
    const used = join(dir, 'used.txt');
    writeFileSync(used, 'release one took hk-dish-0001\n');
    const out = await runScript(
      { DING_PBX_DIM_SUM_CATALOG: `${base}/catalog.json`, DING_PBX_DIM_SUM_DOWNLOAD_BASE: base },
      ['--used-from', used],
    );
    assert.equal(out.resolved, true);
    assert.equal(out.id, 'hk-dish-0003');
    assert.equal(out.codeName, 'Char Siu Bao · 叉燒包');
    assert.equal(out.spentBefore, 1, 'the prior-release ledger is read once before selection');
  });
});

test('photo exhaustion stays non-fatal and does not substitute a legacy local copy', async () => {
  await withServer(['a.png', 'b.png', 'c.png'], async (base) => {
    const out = await runScript({
      DING_PBX_DIM_SUM_CATALOG: `${base}/catalog.json`,
      DING_PBX_DIM_SUM_DOWNLOAD_BASE: base,
    });
    assert.equal(out.resolved, false);
    assert.match(out.reason, /no published photo/);
    assert.equal(Object.hasOwn(out, 'asset'), false, 'no local or legacy photo fallback is allowed');
  });
});

test('an unreachable catalogue reports why and still exits successfully', async () => {
  /* The load-bearing case. If this ever exits non-zero, a release stops shipping
   * because a decorative photograph could not be found. */
  const out = await runScript({ DING_PBX_DIM_SUM_CATALOG: 'http://127.0.0.1:1/catalog.json' });
  assert.equal(out.resolved, false);
  assert.ok(typeof out.reason === 'string' && out.reason.length > 0, 'a refusal has to say why');
});

test('a catalogue carrying no dish records is refused rather than half-used', async () => {
  const server = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('[]'); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const out = await runScript({ DING_PBX_DIM_SUM_CATALOG: `http://127.0.0.1:${server.address().port}/c.json` });
    assert.equal(out.resolved, false);
    assert.match(out.reason, /no dish records/);
  } finally { server.closeAllConnections(); server.close(); }
});

test('the release step reads the resolved record as UTF-8 explicitly', () => {
  /* The first release to carry a code name published mojibake where the Traditional
   * Chinese should have been: zero CJK characters and eight Latin-1 supplement ones.
   *
   * The cause was not the resolver, which writes correct UTF-8. It was the reader. That
   * step runs under Windows PowerShell, whose Get-Content defaults to the ANSI code page,
   * so a UTF-8 file comes back double-encoded. Reproduced directly against the real
   * resolver output: Get-Content -Raw returned 0 CJK characters from the same file that
   * an explicit UTF-8 read returned 2 from.
   *
   * Anchored on whole trimmed lines rather than a pattern, and asserting both halves --
   * that the explicit reader is present and that the defaulting one is not -- because
   * either alone would pass while the other quietly did the reading. */
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const workflow = readFileSync(resolve(repoRoot, '.github', 'workflows', 'delivery.yml'), 'utf8')
    .split('\r\n').join('\n').split('\n').map((line) => line.trim());
  assert.ok(workflow.length > 0, 'the workflow read back empty');

  const readsRecord = workflow.filter((line) => line.includes('$dimSumPath') && line.includes('ConvertFrom-Json'));
  assert.equal(readsRecord.length, 1, 'expected exactly one place that parses the resolved record');
  assert.ok(
    readsRecord[0].includes('[System.IO.File]::ReadAllText($dimSumPath, [System.Text.Encoding]::UTF8)'),
    'the record is parsed without naming UTF-8, so a dish name will publish double-encoded',
  );
  assert.ok(
    !readsRecord[0].includes('Get-Content'),
    'Get-Content defaults to the ANSI code page in the edition that runs this step',
  );
});
