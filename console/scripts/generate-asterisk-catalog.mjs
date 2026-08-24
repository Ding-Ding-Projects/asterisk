#!/usr/bin/env node

/*
 * Build a deterministic source catalogue from this checkout's real Asterisk
 * sources.  The catalogue is intentionally source-derived, not a hand-picked
 * list: adding a module or sample resource changes the generated records on the
 * next run.  Runtime availability is kept separate and is reconciled by
 * control-plane/asterisk-runtime-catalog.ts after a target answers.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const families = ['apps', 'bridges', 'cdr', 'cel', 'channels', 'codecs', 'formats', 'funcs', 'pbx', 'res', 'main'];
const sourceExtensions = new Set(['.c', '.cc', '.cpp', '.cxx']);
const outputJson = resolve(root, 'console', 'control-plane', 'generated', 'asterisk-catalog.json');
const outputTs = resolve(root, 'console', 'control-plane', 'generated', 'asterisk-catalog.ts');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function normalize(value) {
  return value.replaceAll('\\', '/');
}

function moduleId(family, relativePath) {
  const localPath = relativePath.startsWith(`${family}/`) ? relativePath.slice(family.length + 1) : relativePath;
  const stem = localPath.replace(/\.[^.]+$/u, '').replaceAll('/', '.');
  return `asterisk.${family}.${stem}`;
}

function unquote(value) {
  return value.replace(/^"|"$/gu, '').replaceAll('\\"', '"').replaceAll('\\\\', '\\');
}

function macroArguments(source, start) {
  const open = source.indexOf('(', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = false;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') quote = true;
    else if (char === '(') depth += 1;
    else if (char === ')' && --depth === 0) return source.slice(open + 1, index);
  }
  return '';
}

function stringLiterals(value) {
  const matches = [];
  const pattern = /"(?:\\.|[^"\\])*"/gu;
  for (const match of value.matchAll(pattern)) matches.push(unquote(match[0]));
  return matches;
}

function moduleDescription(source) {
  const match = /AST_MODULE_INFO(?:_STANDARD(?:_EXTENDED)?)?\s*\(/u.exec(source);
  if (!match) return undefined;
  const values = stringLiterals(macroArguments(source, match.index));
  return values[0];
}

function sourceSignals(source) {
  const signals = [];
  const checks = [
    ['cli', /AST_CLI_DEFINE|ast_cli_register_multiple|ast_cli_entry/u],
    ['ami', /ast_manager_register|manager_event|AST_MANAGER/u],
    ['ari', /ast_ari_|stasis_app_register|ari_add_handler/u],
    ['agi', /ast_agi_register|agi_command|AGI/u],
    ['application', /ast_register_application(?:_xml|_multi)?|__app_register/u],
    ['function', /ast_custom_function_register|__ast_custom_function_register/u],
    ['channel', /ast_channel_register|AST_CHANTECH_SUPPORT/u],
    ['codec', /ast_codec_register|ast_translator_register/u],
    ['format', /ast_format_register|ast_format_def/u],
    ['bridge', /ast_bridge_register|AST_BRIDGE_CAPABILITY/u],
    ['rtp', /ast_rtp_instance|AST_RTP/u],
    ['http', /ast_http_|ast_websocket/u],
    ['tls', /SSL_CTX|ast_tls/u],
  ];
  for (const [name, pattern] of checks) if (pattern.test(source)) signals.push(name);
  return signals;
}

function buildSignals(family, sourcePath, source, makefile) {
  const stem = sourcePath.replace(/\.[^.]+$/u, '').replaceAll('/', '_').toUpperCase();
  const sourceName = sourcePath.split('/').at(-1)?.replace(/\.[^.]+$/u, '') ?? '';
  const candidates = [stem, sourceName.toUpperCase(), `${family.toUpperCase()}_${sourceName.toUpperCase()}`];
  const conditions = [...new Set(candidates.flatMap((candidate) => {
    const matches = makefile.match(new RegExp(`MENUSELECT_[A-Z0-9_]*${candidate}[A-Z0-9_]*`, 'gu')) ?? [];
    return matches;
  }))].sort();
  if (conditions.length > 0) return { conditions, unavailableReasons: [] };
  return {
    conditions: ['menuselect'],
    unavailableReasons: [`No family-specific menuselect symbol was found for ${sourcePath}; configure and menuselect decide whether it is built.`],
  };
}

function docsSource(relativeSource, allDocs) {
  const stem = relativeSource.replace(/\.[^.]+$/u, '').split('/').at(-1) ?? '';
  const exact = allDocs.find((doc) => doc.includes(`/${stem}.`) || doc.endsWith(`/${stem}.md`));
  return exact ? normalize(relative(root, exact)) : undefined;
}

function unavailableDocs(relativeSource) {
  return `No dedicated source article was found for ${relativeSource}; runtime help and the generated module record are the authoritative available documentation.`;
}

async function main() {
  const allFiles = await walk(root);
  const docs = allFiles.filter((file) => file.endsWith('.md'));
  const modules = [];
  for (const family of families) {
    const directory = resolve(root, family);
    for (const absolute of (await walk(directory)).filter((file) => sourceExtensions.has(file.slice(file.lastIndexOf('.'))))) {
      const relativeSource = normalize(relative(root, absolute));
      const source = await readFile(absolute, 'utf8');
      if (!/AST_MODULE_INFO(?:_STANDARD(?:_EXTENDED)?)?\s*\(/u.test(source)) continue;
      const familyMakefile = resolve(root, family, 'Makefile');
      let makefile = '';
      try { makefile = await readFile(familyMakefile, 'utf8'); } catch { /* source-only families may have no Makefile */ }
      const sourcePath = relative(root, absolute).replaceAll('\\', '/');
      const name = `${sourcePath.replace(/\.[^.]+$/u, '').split('/').at(-1)}.so`;
      const docs = docsSource(sourcePath, allFiles.filter((file) => file.endsWith('.md')));
      const build = buildSignals(family, sourcePath, source, makefile);
      modules.push({
        id: moduleId(family, sourcePath),
        kind: 'module',
        family,
        name,
        source: sourcePath,
        description: moduleDescription(source) ?? `Loadable ${family} module from ${sourcePath}.`,
        buildConditions: build.conditions,
        configFiles: [...new Set([...source.matchAll(/(?:[A-Za-z0-9_-]+\.conf(?:\.sample)?)/gu)].map((match) => match[0]))].sort(),
        sourceSurfaces: sourceSignals(source),
        docsSource: docs,
        unavailableReasons: [...build.unavailableReasons, ...(docs ? [] : [unavailableDocs(sourcePath)])],
        runtime: { state: 'unverified', reason: 'A live target has not reconciled this source record yet.' },
      });
    }
  }

  const resources = [];
  for (const absolute of allFiles.filter((file) => file.includes(`${join('configs', '')}`) && !file.endsWith('README'))) {
    const relativePath = normalize(relative(root, absolute));
    if (!relativePath.startsWith('configs/')) continue;
    const content = await readFile(absolute, 'utf8');
    resources.push({
      id: `asterisk.config.${relativePath.slice('configs/'.length).replace(/[^A-Za-z0-9]+/gu, '.').replace(/^\.|\.$/gu, '').toLowerCase()}`,
      kind: 'config',
      family: 'config',
      name: relativePath.slice('configs/'.length),
      source: relativePath,
      description: `Checked-in Asterisk configuration resource ${relativePath}.`,
      buildConditions: ['runtime-config'],
      configFiles: [relativePath.split('/').at(-1).replace(/\.sample$/u, '')],
      sourceSurfaces: ['configuration'],
      docsSource: allFiles.includes(resolve(root, 'console', 'docs', 'system', 'modules.md')) ? 'console/docs/system/modules.md' : undefined,
      unavailableReasons: ['A target-specific read is required before this resource can be edited; checked-in samples are not live values.'],
      runtime: { state: 'unverified', reason: 'A live target has not reconciled this source record yet.' },
      bytes: content.length,
    });
  }
  modules.sort((a, b) => a.id.localeCompare(b.id));
  resources.sort((a, b) => a.id.localeCompare(b.id));
  const catalog = {
    schemaVersion: 1,
    generatedFrom: 'Asterisk source checkout',
    generatedAt: '1970-01-01T00:00:00.000Z',
    sourceFamilies: families,
    counts: { modules: modules.length, resources: resources.length, total: modules.length + resources.length },
    modules,
    resources,
  };
  await mkdir(dirname(outputJson), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  const header = `// GENERATED FILE - do not edit by hand.\n// Produced by console/scripts/generate-asterisk-catalog.mjs.\n\nexport const ASTERISK_CATALOG = `;
  await writeFile(outputTs, `${header}${JSON.stringify(catalog, null, 2)} as const;\n`, 'utf8');
  console.log(`asterisk-catalog: ${modules.length} modules, ${resources.length} resources, ${catalog.counts.total} records`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
