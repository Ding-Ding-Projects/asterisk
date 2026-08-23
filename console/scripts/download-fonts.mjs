#!/usr/bin/env node
/**
 * Downloads the complete web-font set the checked-in design reference asks for.
 *
 * The design reference names one Google Fonts stylesheet URL. That single request
 * answers with one @font-face block per family, per weight and per unicode-range
 * subset. Vendoring only the file a browser happened to fetch would ship a
 * fragment of the font while reading as "bundled", so every block this stylesheet
 * declares is downloaded, digest-recorded and emitted locally.
 *
 * Only `src` is rewritten. `font-family`, `font-style`, `font-weight`,
 * `font-display` and `unicode-range` are preserved exactly as the source declared
 * them: the ranges are what stop a browser downloading every subset for one
 * accented character, and the weights are the design's typographic hierarchy.
 *
 * Outputs (all regenerated, never hand-edited):
 *   assets/fonts/*.woff2
 *   assets/fonts/fonts.css
 *   assets/fonts/manifest.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const designDir = resolve(root, '..', 'design');
const outDir = resolve(root, 'assets', 'fonts');

/* Google Fonts serves woff2 to a browser and older, larger formats to anything
 * else, so a plain fetch silently vendors the wrong format. */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/140.0.0.0 Safari/537.36';

/** Reads the exact stylesheet URL out of the design reference rather than a retyped copy. */
function designFontUrl() {
  const raw = readFileSync(resolve(designDir, 'Asterisk Console M3.dc.html'), 'utf8');
  const match = raw.match(/<link href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/u);
  if (!match) throw new Error('design reference declares no Google Fonts stylesheet link');
  return match[1].replace(/&amp;/gu, '&');
}

async function get(url, asText) {
  const response = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  return asText ? await response.text() : Buffer.from(await response.arrayBuffer());
}

/** Splits the stylesheet into its individual @font-face blocks. */
function faceBlocks(css) {
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map((m) => m[1]);
  if (blocks.length === 0) throw new Error('stylesheet declared no @font-face blocks');
  return blocks;
}

/* Split-based rather than pattern-based on purpose: a declaration name is bounded
 * by a semicolon or a line break, and a regex spelling of that has to survive
 * every quoting layer between here and disk. Splitting cannot be mangled. */
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

/** A stable, collision-free local filename derived from what the face actually is. */
function localName(family, weight, index) {
  const slug = family.replace(/["']/gu, '').trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-');
  const w = (weight ?? 'normal').replace(/\s+/gu, '-');
  return `${slug}-${w}-${index}.woff2`;
}

const url = designFontUrl();
process.stdout.write(`design font stylesheet: ${url}\n`);

const sourceCss = await get(url, true);
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

  /* Rewrite src only. Every other declaration is reproduced verbatim. */
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
  `/* GENERATED FILE — do not edit.\n * Produced by console/scripts/download-fonts.mjs from the design reference's own stylesheet URL.\n */\n${emitted.join('\n\n')}\n`,
);
writeFileSync(
  resolve(outDir, 'manifest.json'),
  `${JSON.stringify({ stylesheetUrl: url, faces: manifest.length, files: manifest }, null, 2)}\n`,
);

const families = [...new Set(manifest.map((f) => f.family))];
process.stdout.write(`downloaded ${manifest.length} font files across ${families.length} families\n`);
for (const family of families) {
  const faces = manifest.filter((f) => f.family === family);
  const weights = [...new Set(faces.map((f) => f.weight))].join(', ');
  process.stdout.write(`  ${family}: ${faces.length} files, weights ${weights}\n`);
}
