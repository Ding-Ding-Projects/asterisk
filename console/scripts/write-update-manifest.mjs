#!/usr/bin/env node
/**
 * Writes `resources/update-manifest.json`, the one fact the packaged app needs in order
 * to know its own place in the release sequence: the exact release tag the delivery
 * workflow will publish for the run doing the packaging.
 *
 * `.github/workflows/delivery.yml`'s `release` job computes that tag as
 * `ding-pbx-console-v0.0.<run number>-r<run attempt>` from `github.run_number` and
 * `github.run_attempt` — both of which are ordinary Actions environment variables
 * (`GITHUB_RUN_NUMBER`, `GITHUB_RUN_ATTEMPT`) available in the earlier `build-package`
 * job too, so the packaging step can predict the tag the release job will use for the
 * very same run before that job exists. Outside CI (a developer running `npm run build`
 * or `build.bat` locally) those variables are unset; the manifest then records `tag:
 * null`, and the shipped update checker (see `control-plane/updater.ts` and its wiring
 * in `app/electron/main.ts`) treats an unknown current version as "always offer the
 * newest published release" rather than refusing to compare.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const runNumber = process.env.GITHUB_RUN_NUMBER;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const tag = runNumber && runAttempt ? `ding-pbx-console-v0.0.${runNumber}-r${runAttempt}` : null;

const outDir = join(repoRoot, 'resources');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'update-manifest.json'), JSON.stringify({ tag }, null, 2) + '\n', 'utf8');
console.log(`Wrote resources/update-manifest.json with tag ${tag ?? '(none — not a CI run)'}`);
