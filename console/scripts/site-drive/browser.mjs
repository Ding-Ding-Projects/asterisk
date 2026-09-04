/**
 * Starts one headless browser on one page, hands back a proven connection, and stops it again.
 *
 * **One launch per page, rather than one browser navigated around**, and the reason is measured
 * rather than tidy. Driving this site over a single connection means navigating between
 * documents over the debugging protocol, and on this build that is where every attempt died:
 * `Page.reload` leaves `Runtime.evaluate` unanswered on the same socket; a `Page.navigate` to
 * the address already open does the same; even a cross-document `Page.navigate` sometimes never
 * acknowledges. None of it fails loudly -- the browser stays healthy, the page really does
 * navigate, and the client simply stops getting answers, so a readiness poll spends its entire
 * budget on timeouts and the run looks like it is thinking rather than broken. Four short
 * launches cost a few seconds each and have none of that surface.
 *
 * The profile is shared across launches on purpose. `localStorage` lives in it, so a second
 * launch reads back exactly what the first one stored -- which is a stronger claim than an
 * in-page reload could ever make, and it is the claim the persistence evidence actually wants:
 * the setting survived the browser going away.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { connectToPage } from './cdp.mjs';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

export function findBrowser() {
  const found = BROWSERS.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome or Edge found at any of:\n  ${BROWSERS.join('\n  ')}`);
  return found;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Flags chosen against measured behaviour on this host, not copied hopefully:
 *
 *   - `--headless=new` because a Chromium launched headed onto a bare off-screen Windows
 *     desktop crashes during startup here, leaving a profile containing only a Crashpad
 *     directory while the launcher reports a healthy process id.
 *   - `--remote-debugging-port=0` because a fixed port loses the bind to the previous run's
 *     socket sitting in TIME_WAIT, and the only symptom is a port that never answers.
 *   - deliberately NOT `--guest`, which combined with `--user-data-dir` exits immediately.
 */
const flagsFor = (profile, url) => [
  '--headless=new',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=0',
  '--disable-sync',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1440,1000',
  url,
];

export async function withPage({ browser, profile, logDirectory, url }, body) {
  const logStream = openSync(join(logDirectory, 'browser.log'), 'a');
  const child = spawn(browser, flagsFor(profile, url), { stdio: ['ignore', logStream, logStream] });
  if (!child.pid) throw new Error('the browser process did not start');

  try {
    /* The browser writes its chosen port into the profile once the endpoint is listening, so
     * the file appearing is the readiness signal. It is removed on a clean exit, so a stale one
     * from the previous launch would name a port nobody is on -- hence the removal below. */
    const portFile = join(profile, 'DevToolsActivePort');
    let port = 0;
    for (let attempt = 0; attempt < 200 && port === 0; attempt += 1) {
      await wait(300);
      if (!existsSync(portFile)) continue;
      const first = readFileSync(portFile, 'utf8').split('\n')[0].trim();
      if (/^\d+$/.test(first)) port = Number(first);
    }
    if (port === 0) {
      const log = readFileSync(join(logDirectory, 'browser.log'), 'utf8').slice(-1200);
      throw new Error(`the browser never wrote ${portFile}.\nIts own output:\n${log}`);
    }

    /*
     * Let it finish before connecting. The target list names a page's DESTINATION, so a client
     * that connects the instant the endpoint opens is talking to a document still sitting on
     * `about:blank` -- and nothing on that socket ever answers again. This one wait is what
     * turned an unexplainable class of hangs into a run that works.
     */
    await wait(2500);

    let session = null;
    let lastProblem = 'the debugging port was never asked';
    for (let attempt = 0; attempt < 40 && !session; attempt += 1) {
      try {
        const candidate = await connectToPage(port, url);
        const here = await candidate.evaluate('({ href: location.href, ready: document.readyState })');
        if (here.href !== url || here.ready !== 'complete') {
          throw new Error(`the connected page is at ${JSON.stringify(here.href)} (${here.ready})`);
        }
        session = candidate;
      } catch (error) {
        lastProblem = error.message;
        await wait(300);
      }
    }
    if (!session) throw new Error(`could not attach to a proven page at ${url}: ${lastProblem}`);

    try {
      return await body(session);
    } finally {
      /*
       * Ask the browser to close itself before reaching for the axe.
       *
       * The next launch reuses this profile, and a Chromium that was force-killed leaves it in
       * a state the next start refuses: measured here, the second launch wrote no
       * `DevToolsActivePort` at all and printed nothing, so the only symptom was a readiness
       * poll that timed out on a profile that had worked perfectly a moment earlier. A graceful
       * `Browser.close` lets it write its state out and release the profile. The kill below
       * stays as the fallback for a browser that will not go.
       */
      try { await session.send('Browser.close'); } catch { /* it may go before it answers */ }
      try { session.close(); } catch { /* already gone */ }
      for (let attempt = 0; attempt < 40 && child.exitCode === null; attempt += 1) await wait(150);
    }
  } finally {
    /* By process id and its whole tree, never by executable name: a name-based sweep would
     * close whatever browser windows the person at this machine happens to have open. */
    if (child.exitCode === null) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    /* A leftover lock or stale port file is exactly what makes the launch after a forced kill
     * fail in a way nobody can read. */
    await wait(1500);
    for (const leftover of ['DevToolsActivePort', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      try { rmSync(join(profile, leftover), { force: true, recursive: true }); } catch { /* fine */ }
    }
  }
}
