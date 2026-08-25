/**
 * Contract: automatic updates behave the way the shipped banner claims, and the
 * recorded built-artifact evidence describes the code that actually exists.
 *
 * The point of this file is the last clause. A capture is only evidence while the
 * thing it photographed is still true, and a screenshot cannot notice that the
 * sentence in it was reworded a month later. So the recorded evidence and the
 * component are compared against each other here: change either one alone and this
 * goes red.
 *
 * Plain `.mjs` on purpose: this is the `localCheck` evidence column, which must run
 * without the renderer's TypeScript pipeline and without `node_modules`. It reads
 * sources as text.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF is present in parts of this checkout. A newline-only pattern silently matches
 * nothing, which turns every assertion below into a vacuous pass with no error. */
const read = (p) => readFileSync(resolve(root, p), 'utf8').split('\r\n').join('\n');
const json = (p) => JSON.parse(read(p));

const BANNER = 'app/renderer/src/UpdateBanner.tsx';
const EVIDENCE = 'release/evidence/windows-console/automatic-updates.json';

const banner = read(BANNER);

test('the banner source parsed as real content, so nothing below passes vacuously', () => {
  assert.ok(banner.length > 2000, `${BANNER} read as ${banner.length} chars, too small to be the component`);
  assert.match(banner, /^export function UpdateBanner\(\)/mu, 'the component export is not where this test thinks it is');
});

test('the banner renders nothing at all when there is nothing to say', () => {
  /* The house rule is that informational surfaces never block. The strongest form of
   * that is rendering no node whatsoever rather than an empty container that still
   * occupies space and can still trap focus. */
  assert.match(banner, /^ {2}if \(!bridge\) return null;$/mu, 'the banner no longer bails out when the bridge is absent');
  assert.match(
    banner,
    /^ {2}if \(status\.state === 'idle' \|\| status\.state === 'checking' \|\| status\.dismissed\) return null;$/mu,
    'the idle/checking/dismissed early return changed shape, so the banner may now render with nothing to report',
  );
});

test('the banner is announced to assistive technology without stealing focus', () => {
  assert.match(banner, /role="status"/u, 'the banner is no longer a status region');
  assert.match(banner, /aria-live="polite"/u, 'polite announcement was dropped; assertive would interrupt the user');
  assert.doesNotMatch(banner, /role="(alertdialog|dialog)"/u, 'the banner became a dialog, which would block the interface');
});

test('restart is blocked by unsaved work in the handler, not only by disabling the button', () => {
  /* A disabled button is the visible guard, never the real one: a keyboard submit or a
   * programmatic click walks straight past it. Both are required, and this asserts both
   * exist rather than trusting either. */
  assert.match(
    banner,
    /^ {4}if \(restartPending \|\| drafts > 0\) return;$/mu,
    'the restart handler no longer refuses while a restart is pending or drafts are unsaved',
  );
  assert.match(
    banner,
    /disabled=\{restartPending \|\| drafts > 0\}/u,
    'the restart button is no longer disabled while a restart is pending or drafts are unsaved',
  );
});

test('a stale status can never overwrite a newer one', () => {
  /* Two sources push status at this component: a subscription and a one-shot get. A slow
   * answer from the older of the two arriving second would otherwise roll the banner
   * backwards, which reads as an update that un-readied itself. */
  assert.match(
    banner,
    /^ {4}if \(revision < acceptedRevision\.current\) return;$/mu,
    'the monotonic revision guard is gone, so a late status can move the banner backwards',
  );
});

test('the ready message names the version and refuses to imply the build is signed', () => {
  /* Integrity, not authenticity. Artifacts are unsigned by policy, so the banner has to
   * say so where the person deciding whether to run an installer will read it. */
  assert.ok(
    banner.includes('is ready to install. This build is unsigned, so Windows may show an unknown-publisher warning during install.'),
    'the unsigned disclosure was reworded or removed from the ready message',
  );
  assert.match(banner, /^ {2}const versionText = status\.latestVersion/mu, 'the banner no longer derives the version it names');
  for (const claim of ['verified publisher', 'signed by', 'digitally signed']) {
    assert.ok(!banner.toLowerCase().includes(claim), `the banner claims "${claim}", which is false under the no-signing policy`);
  }
});

test('both actions the capture shows are really offered, and installing needs a deliberate one', () => {
  assert.ok(banner.includes('Restart to install update'), 'the restart action is gone');
  assert.ok(banner.includes('>Later<'), 'the dismiss action is gone, so the banner would be undismissable');
  assert.match(banner, /onClick=\{\(\) => bridge\.updater\.dismiss\(\)\}/u, 'Later no longer dismisses anything');
});

/* --- the evidence record and the code must agree ---------------------------- */

test('the recorded built-artifact evidence exists and is well formed', () => {
  assert.ok(existsSync(resolve(root, EVIDENCE)), `${EVIDENCE} is missing`);
  const e = json(EVIDENCE);
  for (const key of ['commit', 'artifact', 'capture', 'captureSha256', 'captureBytes', 'interaction', 'verification']) {
    assert.ok(e[key] !== undefined, `the evidence record has no ${key}`);
  }
  assert.match(e.commit, /^[0-9a-f]{40}$/u, 'the evidence commit is not a full object name');
  assert.match(e.captureSha256, /^[0-9a-f]{64}$/u, 'the capture digest is not a SHA-256');
  assert.ok(e.captureBytes > 50000, 'the capture is too small to be a rendered window; a blank frame compresses to almost nothing');
});

test('the capture named by the evidence is present and matches its recorded digest and size', async () => {
  /* Without this, the record could name a capture that was never taken, or one that has
   * since been replaced by a different picture. */
  const e = json(EVIDENCE);
  const capturePath = resolve(root, '..', e.capture);
  assert.ok(existsSync(capturePath), `the evidence names ${e.capture}, which is not on disk`);
  const bytes = readFileSync(capturePath);
  assert.equal(bytes.length, e.captureBytes, 'the capture on disk is not the size the evidence records');
  const { createHash } = await import('node:crypto');
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    e.captureSha256,
    'the capture on disk is not the image the evidence recorded; it has been replaced or edited',
  );
});

test('the sentence the capture shows is the sentence the component still renders', () => {
  /* This is the assertion the whole file exists for. A screenshot cannot notice that its
   * own subject was reworded afterwards, so the recorded banner text is required to be a
   * literal substring of the component. Reword the banner without retaking the capture and
   * this goes red, which is exactly when the evidence stopped being true. */
  const e = json(EVIDENCE);
  const recorded = e.interaction.bannerText;
  assert.ok(typeof recorded === 'string' && recorded.length > 40, 'no banner text was recorded in the evidence');
  const marker = 'is ready to install';
  const at = recorded.indexOf(marker);
  assert.ok(at > 0, 'the recorded banner text does not look like the ready-state message');
  const tail = recorded.slice(at);
  assert.ok(
    banner.includes(tail),
    `the evidence records a banner sentence the component no longer renders:\n  recorded: ${tail}`,
  );
});

test('every action the evidence claims to have observed is one the component offers', () => {
  const e = json(EVIDENCE);
  assert.ok(
    Array.isArray(e.interaction.observedActions) && e.interaction.observedActions.length > 0,
    'the evidence observed no actions, so the loop below would prove nothing',
  );
  for (const action of e.interaction.observedActions) {
    assert.ok(banner.includes(action), `the evidence claims it saw "${action}", which the component does not render`);
  }
});

test('the evidence is honest about what it did not exercise', () => {
  /* A capture of one state must not read as coverage of the whole feature. The download,
   * verification and restart paths are not exercised by looking at a banner. */
  const e = json(EVIDENCE);
  assert.ok(
    Array.isArray(e.notInterrogatedHere) && e.notInterrogatedHere.length >= 2,
    'the evidence does not say what it left unexercised, so it overstates itself',
  );
  assert.equal(e.interaction.unsignedDisclosureShown, true);
  assert.equal(e.interaction.restartRequiresUserAction, true);
});
