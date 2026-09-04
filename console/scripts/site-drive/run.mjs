#!/usr/bin/env node
/**
 * Builds the site, serves it on loopback, and runs each evidence phase in its own headless
 * browser launch against one shared throwaway profile.
 *
 * One command, because evidence that takes six manual steps to reproduce is evidence nobody
 * reproduces -- and this run has to be reproducible on demand, since
 * `scripts/site-interaction-evidence.mjs` deliberately turns every record red the moment the
 * site's tracked sources change underneath it. If a change to `console/site/app.js` or
 * `console/site/styles.css` makes that guard fail, `npm run captures:site` is the answer, not
 * an edit to the recorded digest.
 *
 * The shared profile is the point of the shape rather than an economy: `localStorage` lives in
 * it, so the phase that reads a setting back is reading what a genuinely previous browser
 * session wrote.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSiteServer } from './server.mjs';
import { findBrowser, withPage } from './browser.mjs';
import { PHASES, makeRecorder } from './evidence.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE_ROOT = resolve(HERE, '..', '..');
const DIST = join(CONSOLE_ROOT, 'site', 'dist');

const browser = findBrowser();

console.log('building the site...');
const build = spawnSync(process.execPath, [join(CONSOLE_ROOT, 'site', 'build.mjs')], {
  stdio: 'inherit', cwd: CONSOLE_ROOT,
});
if (build.status !== 0) throw new Error(`the site build exited ${build.status}`);

const manifest = JSON.parse(readFileSync(join(DIST, 'build-manifest.json'), 'utf8'));
const server = await startSiteServer(DIST);
console.log(`serving ${DIST} at ${server.origin}`);

const scratch = mkdtempSync(join(tmpdir(), 'ding-site-drive-'));
const profile = join(scratch, 'profile');
mkdirSync(profile, { recursive: true });

const written = [];
try {
  for (const phase of PHASES) {
    const url = `${server.origin}/${phase.page}`;
    console.log(`\n[${phase.id}] ${phase.page}`);
    await withPage({ browser, profile, logDirectory: scratch, url }, async (session) => {
      await phase.run(makeRecorder({ session, manifest, written }));
    });
  }
} finally {
  await server.close();
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* the browser may still hold a handle */ }
}

console.log(`\nwrote ${written.length} pages-site record(s): ${written.join(', ')}`);
console.log(`requests served: ${server.requests.length}`);
