#!/usr/bin/env node
/**
 * Downloads the complete web-font set the "Landing C - Blueprint" design export asks
 * for, for the public site only (console/scripts/download-fonts.mjs does the same job
 * for the desktop app's own design reference and is untouched by this script).
 *
 * The export's stylesheet URL answers with one @font-face block per family, per weight
 * and per unicode-range subset. Vendoring only the file a browser happened to fetch
 * would ship a fragment of the font while reading as "bundled", so every block this
 * stylesheet declares is downloaded, digest-recorded and emitted locally, exactly as
 * console/scripts/download-fonts.mjs already does for the app.
 *
 * Only `src` is rewritten. `font-family`, `font-style`, `font-weight`, `font-display`
 * and `unicode-range` are preserved exactly as the source declared them.
 *
 * Outputs (all regenerated, never hand-edited):
 *   assets/site-fonts/*.woff2
 *   assets/site-fonts/fonts.css
 *   assets/site-fonts/manifest.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'assets', 'site-fonts');

/* The exact stylesheet URL declared by "Landing C - Blueprint.dc.html" in the design
 * export at hand (helmet <link href="...">). Recorded here rather than re-read from a
 * design file, because the export is a one-time attachment, not a checked-in design
 * reference this script can re-open on every future run. */
const STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/* Google Fonts serves woff2 to a browser and older, larger formats to anything else,
 * so a plain fetch silently vendors the wrong format. */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/140.0.0.0 Safari/537.36';

async function get(url, asText) {
  const response = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  return asText ? await response.text() : Buffer.from(await response.arrayBuffer());
}

function faceBlocks(css) {
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map((m) => m[1]);
  if (blocks.length === 0) throw new Error('stylesheet declared no @font-face blocks');
  return blocks;
}

const declaration = (block, prop) => {
  for (const piece of block.split(';')) {
    for (const line of piece.split('\n')) {
      const at = line.indexOf(':');
      if (at < 0) continue;
      if (line.slice(0, at).trim().toLowerCase() !== prop) continue;
      const value = line.slice(at + 1).trim();
      if (value.length > 0) return value;
    }
  }
  return null;
};

function localName(family, weight, index) {
  const slug = family.replace(/["']/gu, '').trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-');
  const w = (weight ?? 'normal').replace(/\s+/gu, '-');
  return `${slug}-${w}-${index}.woff2`;
}

process.stdout.write(`site font stylesheet: ${STYLESHEET_URL}\n`);

const sourceCss = await get(STYLESHEET_URL, true);
const blocks = faceBlocks(sourceCss);
process.stdout.write(`@font-face blocks declared: ${blocks.length}\n`);

mkdirSync(outDir, { recursive: true });

const manifest = [];
const emitted = [];

for (const [index, block] of blocks.entries()) {
  const family = declaration(block, 'font-family');
  const style = declaration(block, 'font-style');
  const weight = declaration(block, 'font-weight');
  const display = declaration(block, 'font-display');
  const range = declaration(block, 'unicode-range');
  const src = declaration(block, 'src');
  if (!family || !src) throw new Error(`@font-face block ${index} is missing font-family or src`);

  /* Static webfont weights are single numbers (400, 700, ...), never a range
   * ("100 700"). A range would mean a variable font and would need an fvar check
   * before being declared; Archivo and IBM Plex Mono are served here as static
   * per-weight files, so no block should ever contain a space in its weight. */
  if (weight && /\s/u.test(weight.trim())) {
    throw new Error(`@font-face block ${index} for ${family} declares a variable weight range (${weight}); this script only handles static per-weight files`);
  }

  const fileUrl = src.match(/url\((https:\/\/[^)]+?)\)/u);
  if (!fileUrl) throw new Error(`@font-face block ${index} for ${family} declares no https url`);

  const bytes = await get(fileUrl[1], false);
  if (bytes.length === 0) throw new Error(`downloaded an empty font file from ${fileUrl[1]}`);
  const name = localName(family, weight, index);
  writeFileSync(resolve(outDir, name), bytes);

  const digest = createHash('sha256').update(bytes).digest('hex');
  manifest.push({
    file: name,
    family: family.replace(/["']/gu, ''),
    style: style ?? 'normal',
    weight: weight ?? 'normal',
    unicodeRange: range,
    source: fileUrl[1],
    bytes: bytes.length,
    sha256: digest,
  });

  emitted.push(
    [
      '@font-face {',
      `  font-family: ${family};`,
      `  font-style: ${style ?? 'normal'};`,
      `  font-weight: ${weight ?? 'normal'};`,
      ...(display ? [`  font-display: ${display};`] : []),
      `  src: url("./${name}") format("woff2");`,
      ...(range ? [`  unicode-range: ${range};`] : []),
      '}',
    ].join('\n'),
  );
}

writeFileSync(
  resolve(outDir, 'fonts.css'),
  `/* GENERATED FILE — do not edit.\n * Produced by console/scripts/download-site-fonts.mjs from the "Landing C - Blueprint"\n * design export's own Google Fonts stylesheet URL.\n */\n${emitted.join('\n\n')}\n`,
);
writeFileSync(
  resolve(outDir, 'manifest.json'),
  `${JSON.stringify({ stylesheetUrl: STYLESHEET_URL, faces: manifest.length, files: manifest }, null, 2)}\n`,
);

const families = [...new Set(manifest.map((f) => f.family))];
process.stdout.write(`downloaded ${manifest.length} font files across ${families.length} families\n`);
for (const family of families) {
  const faces = manifest.filter((f) => f.family === family);
  const weights = [...new Set(faces.map((f) => f.weight))].join(', ');
  process.stdout.write(`  ${family}: ${faces.length} files, weights ${weights}\n`);
}
