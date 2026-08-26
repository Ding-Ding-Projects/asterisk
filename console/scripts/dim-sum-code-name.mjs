#!/usr/bin/env node
/**
 * Resolve this release's dim sum code name and its photo from the public catalogue.
 *
 * Three rules shape this, and each exists because the obvious alternative is worse.
 *
 * Nothing is vendored. The photo is fetched at release time from the public
 * `dim-sum-photos` releases and attached to ours; copying images into this repository
 * is explicitly forbidden, and a second copy of a catalogue is a second authority that
 * will eventually disagree with the first.
 *
 * A name is used once. Prior releases of this repository are read back and every code
 * name already spent is skipped, so the release notes themselves are the ledger and no
 * committed file needs updating -- which matters, because a release workflow that
 * commits is a release workflow that triggers itself.
 *
 * It never blocks a release. Every failure path prints why and exits 0 with no name
 * resolved. A code name is decoration with a purpose; it is not a gate.
 */
import { writeFileSync, readFileSync } from 'node:fs';

const OWNER = 'Ding-Ding-Projects';
const PHOTOS = `${OWNER}/dim-sum-photos`;
/* Both endpoints are overridable so the contract test can run offline against a fixture.
 * The defaults are the real public ones; nothing in the release path passes an override. */
const CATALOG = process.env.DING_PBX_DIM_SUM_CATALOG ?? `https://raw.githubusercontent.com/${PHOTOS}/main/catalog/index.json`;
const DOWNLOAD_BASE = process.env.DING_PBX_DIM_SUM_DOWNLOAD_BASE ?? `https://github.com/${PHOTOS}/releases/download`;
/* The published photo volumes, newest name last. A candidate is looked for in each. */
const VOLUMES = ['catalog-v1', 'catalog-v1-part-002', 'catalog-v1-part-003'];

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const out = (obj) => {
  const target = arg('out');
  const text = JSON.stringify(obj, null, 2);
  if (target) writeFileSync(target, text); else console.log(text);
};

const usedNames = () => {
  /* Read back what previous releases already spent. Supplied by the caller as newline
   * separated release bodies, so this stays a pure function of its input and needs no
   * credentials of its own. */
  const raw = arg('used-from') ? readFileSync(arg('used-from'), 'utf8') : '';
  const ids = new Set();
  for (const m of raw.matchAll(/hk-dish-[0-9]{4,}/g)) ids.add(m[0]);
  return ids;
};

const head = async (url) => {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return r.ok ? Number(r.headers.get('content-length') || 0) : 0;
  } catch { return 0; }
};

try {
  const res = await fetch(CATALOG);
  if (!res.ok) throw new Error(`catalogue responded ${res.status}`);
  const parsed = await res.json();
  const dishes = Array.isArray(parsed) ? parsed : (Object.values(parsed).find(Array.isArray) ?? []);
  if (dishes.length === 0) throw new Error('catalogue carried no dish records');

  const spent = usedNames();
  const candidates = dishes.filter((d) => d?.id && d?.name?.en && d?.name?.zhHant && d?.image?.path && !spent.has(d.id));
  if (candidates.length === 0) throw new Error(`every one of ${dishes.length} dishes is already spent`);

  /* HEAD only the next candidate across the volumes rather than listing thousands of
   * assets: a full enumeration of three releases costs far more than it can ever save. */
  for (const dish of candidates.slice(0, 40)) {
    const file = dish.image.path.split('/').pop();
    for (const volume of VOLUMES) {
      const url = `${DOWNLOAD_BASE}/${volume}/${file}`;
      const bytes = await head(url);
      if (bytes > 0) {
        out({
          resolved: true,
          id: dish.id,
          codeName: `${dish.name.en} · ${dish.name.zhHant}`,
          en: dish.name.en,
          zhHant: dish.name.zhHant,
          alt: dish.image.alt?.en ?? `Photograph of ${dish.name.en}`,
          asset: file,
          url,
          bytes,
          volume,
          spentBefore: spent.size,
          catalogueSize: dishes.length,
        });
        process.exit(0);
      }
    }
  }
  throw new Error('no published photo found for the first 40 unspent dishes');
} catch (error) {
  out({ resolved: false, reason: String(error.message ?? error) });
  process.exit(0);
}
