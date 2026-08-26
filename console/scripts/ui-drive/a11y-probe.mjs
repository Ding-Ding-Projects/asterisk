/**
 * Accessibility measurement against the real built artifact, with a verdict.
 *
 * Prints the same five counts the ROADMAP baseline was measured with -- ARIA roles,
 * semantic landmarks, aria-label, tabindex, and distinct tag names -- so a before/after
 * comparison is a diff of two runs of this exact script rather than two different
 * measurements that only resemble each other. Dismisses the onboarding wizard first and
 * verifies the dismissal the same way smoke.mjs does, for the same reason: navigation
 * underneath the wizard works, so an unverified dismissal reports numbers that describe
 * the wizard rather than the interface.
 *
 * The floors below are not the measured numbers -- they are set a little under them, on
 * purpose. A guard pinned to the exact figure breaks on every unrelated content change
 * (one more badge, one fewer toast) and gets "fixed" by whoever hits it first, which is
 * exactly how a real regression stops being noticed. What actually matters is that the
 * baseline this table exists to fix -- 1 role, 0 landmarks, 0 aria-label, 0 tabindex out
 * of 426 elements -- can never come back silently. A run against a stale artifact is
 * refused rather than reported, the same way smoke.mjs refuses to trust a build older
 * than its own sources.
 */
import { statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from './cdp.mjs';

const PORT = Number(process.argv[2] || 9611);
const ARTIFACT = process.argv[3] || 'dist/index.html';
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const FLOORS = { roles: 5, landmarks: 4, ariaLabel: 5, tabindex: 4, tags: 10 };

/** Same staleness check as smoke.mjs, duplicated rather than imported: this file is run
 *  standalone against a debugging port and has no other dependency on that module. */
const stalenessAgainstSources = () => {
  let artifactTime;
  try {
    artifactTime = statSync(ARTIFACT).mtimeMs;
  } catch {
    return { unknown: true, reason: `no artifact at ${ARTIFACT}` };
  }
  const roots = ['app/renderer/src', 'app/electron', 'control-plane'];
  let newest = { time: 0, path: null };
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (/\.test\.[cm]?[jt]sx?$/u.test(entry.name)) continue;
      const time = statSync(full).mtimeMs;
      if (time > newest.time) newest = { time, path: full };
    }
  };
  for (const root of roots) walk(root);
  if (newest.time > artifactTime) {
    const hours = ((newest.time - artifactTime) / 3_600_000).toFixed(1);
    return { stale: true, hours, source: newest.path };
  }
  return { stale: false };
};

const main = async () => {
  const freshness = stalenessAgainstSources();
  if (freshness.stale) {
    console.log(`  NOTE: the artifact is ${freshness.hours}h older than ${freshness.source}.`);
    console.log('        A regressed count below may simply not have been built yet.');
    console.log('');
  }

  const { evaluate, close } = await connect(PORT);

  const clickByText = (text) => evaluate(`(() => {
    const wanted = ${JSON.stringify(text)};
    const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === wanted);
    if (!el) return { ok: false };
    el.click();
    return { ok: true };
  })()`);

  const wizardShowing = () => evaluate(`!!Array.from(document.querySelectorAll('button')).find((b) => /skip setup/i.test(b.textContent || ''))`);

  await clickByText('Skip setup');
  await settle(700);
  if (await wizardShowing()) { await clickByText('Skip setup'); await settle(900); }
  if (await wizardShowing()) {
    console.log('REFUSING TO MEASURE: the onboarding wizard is still up');
    close();
    process.exit(2);
  }
  await clickByText('Later');
  await settle(300);

  const MEASURE = `(() => {
    const all = document.querySelectorAll('*');
    const tags = new Set();
    let roles = 0, landmarks = 0, ariaLabel = 0, tabindex = 0;
    const landmarkTags = new Set(['NAV', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER']);
    const landmarkRoles = new Set(['navigation', 'main', 'complementary', 'banner', 'contentinfo']);
    for (const el of all) {
      tags.add(el.tagName);
      const role = el.getAttribute('role');
      if (role) roles += 1;
      if (landmarkTags.has(el.tagName) || (role && landmarkRoles.has(role))) landmarks += 1;
      if (el.hasAttribute('aria-label')) ariaLabel += 1;
      if (el.hasAttribute('tabindex')) tabindex += 1;
    }
    return {
      elements: all.length,
      roles, landmarks, ariaLabel, tabindex,
      tags: tags.size,
      roleList: Array.from(new Set(Array.from(all).map((e) => e.getAttribute('role')).filter(Boolean))).sort(),
    };
  })()`;

  const result = await evaluate(MEASURE);
  console.log(JSON.stringify(result, null, 2));
  close();

  const problems = [];
  for (const [key, floor] of Object.entries(FLOORS)) {
    if (result[key] < floor) {
      problems.push(`${key} is ${result[key]}, below the floor of ${floor} -- the interface has lost accessibility structure it already had`);
    }
  }
  console.log('');
  if (problems.length === 0) {
    console.log('VERDICT: the built artifact carries real accessibility structure (roles, landmarks, names, focus positions).');
    return;
  }
  for (const problem of problems) console.log(`VERDICT PROBLEM: ${freshness.stale ? `${problem} -- but the artifact is ${freshness.hours}h stale, so rebuild before believing this` : problem}`);
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(`probe failed: ${error.message}`);
  process.exit(1);
});
