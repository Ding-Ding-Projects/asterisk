#!/usr/bin/env node

/*
 * Build a deterministic source catalogue from this checkout's real Asterisk
 * sources.  The catalogue is intentionally source-derived, not a hand-picked
 * list: adding a module or sample resource changes the generated records on the
 * next run.  Runtime availability is kept separate and is reconciled by
 * control-plane/asterisk-runtime-catalog.ts after a target answers.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const families = ['addons', 'apps', 'bridges', 'cdr', 'cel', 'channels', 'codecs', 'formats', 'funcs', 'pbx', 'res', 'main'];
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
  const code = stripComments(source);
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
  for (const [name, pattern] of checks) if (pattern.test(code)) signals.push(name);
  return signals;
}

function stripComments(source) {
  let output = '';
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] ?? '';
    if (lineComment) {
      if (char === '\n') { lineComment = false; output += '\n'; }
      else output += ' ';
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; output += '  '; index += 1; }
      else output += char === '\n' ? '\n' : ' ';
      continue;
    }
    if (quote) {
      output += char === '\n' ? '\n' : ' ';
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; output += '  '; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; output += '  '; index += 1; continue; }
    if (char === '"' || char === "'") { quote = char; output += ' '; continue; }
    output += char;
  }
  return output;
}

function macroCalls(source, names) {
  const code = stripComments(source);
  const calls = [];
  for (const name of names) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${name}\\s*\\(`, 'gu');
    for (const match of code.matchAll(pattern)) {
      const index = (match.index ?? 0) + match[0].lastIndexOf(name);
      calls.push({ name, index, args: macroArguments(source, index) });
    }
  }
  return calls.sort((a, b) => a.index - b.index);
}

function namedRegistrations(source) {
  const registrations = { cli: [], amiActions: [], amiEvents: [], ari: [], agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] };
  const add = (field, name, evidence, description) => {
    const clean = name?.trim();
    if (!clean || clean.length > 120 || /[\r\n]/u.test(clean)) return;
    if (!registrations[field].some((item) => item.name === clean)) registrations[field].push({ name: clean, evidence, ...(description ? { description } : {}) });
  };
  for (const call of macroCalls(source, ['AST_CLI_DEFINE', 'AST_CLI_DEFINE_STATIC'])) {
    const strings = stringLiterals(call.args);
    add('cli', firstArgumentToken(call.args), call.name, strings[0]);
  }
  for (const call of macroCalls(source, ['ast_agi_register', 'ast_agi_register_multiple'])) add('agi', call.args.split(',').slice(1, 2).map(firstArgumentToken)[0], call.name);
  for (const call of macroCalls(source, ['ast_register_application_xml', 'ast_register_application'])) add('applications', firstArgumentToken(call.args), call.name);
  for (const call of macroCalls(source, ['ast_manager_register', 'ast_manager_register_xml', 'ast_manager_register_xml_core'])) add('amiActions', stringLiterals(call.args)[0], call.name);
  for (const call of macroCalls(source, ['manager_event'])) {
    const strings = stringLiterals(call.args);
    add('amiEvents', strings[0], call.name);
  }
  for (const call of macroCalls(source, ['stasis_app_register', 'ari_add_handler'])) add('ari', stringLiterals(call.args)[0], call.name);
  for (const call of macroCalls(source, ['ast_custom_function_register', 'ast_custom_function_register_escalating'])) add('functions', firstArgumentToken(call.args), call.name);
  for (const call of macroCalls(source, ['ast_register_translator'])) add('codecs', firstArgumentToken(call.args), call.name);
  for (const call of macroCalls(source, ['ast_format_def_register'])) add('formats', firstArgumentToken(call.args), call.name);
  for (const call of macroCalls(source, ['ast_bridge_register'])) add('bridges', firstArgumentToken(call.args), call.name);
  for (const call of macroCalls(source, ['ast_channel_register'])) add('channels', firstArgumentToken(call.args), call.name);
  return registrations;
}

function firstArgumentToken(value) {
  const token = value.split(',')[0].trim().replace(/^[(&]*/u, '').replace(/\).*$/u, '');
  return token.replace(/\s+/gu, ' ').trim();
}

function buildSignals(family, sourcePath, source, makefile, menuselectTree) {
  const stem = sourcePath.replace(/\.[^.]+$/u, '').replaceAll('/', '_').toUpperCase();
  const sourceName = sourcePath.split('/').at(-1)?.replace(/\.[^.]+$/u, '') ?? '';
  const candidates = [stem, sourceName.toUpperCase(), `${family.toUpperCase()}_${sourceName.toUpperCase()}`];
  const matchedLines = makefile.split(/\r?\n/u).filter((line) => candidates.some((candidate) => line.toUpperCase().includes(candidate)));
  const treeMatchedLines = menuselectTree.split(/\r?\n/u).filter((line) => candidates.some((candidate) => line.toUpperCase().includes(candidate)));
  const conditions = [...new Set([
    ...candidates.flatMap((candidate) => makefile.toUpperCase().match(new RegExp(`MENUSELECT_[A-Z0-9_]*${candidate}[A-Z0-9_]*`, 'gu')) ?? []),
    ...matchedLines.flatMap((line) => [...line.matchAll(/get_menuselect_cflags,\s*([A-Z0-9_]+)/giu)].map((match) => match[1])),
    ...matchedLines.flatMap((line) => [...line.matchAll(/MENUSELECT_[A-Z0-9_]+/gu)].map((match) => match[0])),
    ...treeMatchedLines.flatMap((line) => [...line.matchAll(/<member\s+name="([^"]+)"/gu)].map((match) => `menuselect:${match[1]}`)),
  ])].sort();
  if (conditions.length > 0) return { conditions, matchedLines: [...matchedLines, ...treeMatchedLines], unavailableReasons: [] };
  return {
    conditions: ['menuselect'],
    matchedLines: [...matchedLines, ...treeMatchedLines],
    unavailableReasons: [`No family-specific menuselect symbol was found for ${sourcePath}; configure and menuselect decide whether it is built.`],
  };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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
      const sourceBuffer = await readFile(absolute);
      const source = sourceBuffer.toString('utf8');
      if (!/AST_MODULE_INFO(?:_STANDARD(?:_EXTENDED)?)?\s*\(/u.test(source)) continue;
      const familyMakefile = resolve(root, family, 'Makefile');
      let makefile = '';
      try { makefile = await readFile(familyMakefile, 'utf8'); } catch { /* source-only families may have no Makefile */ }
      const menuselectTreePath = resolve(root, 'menuselect', 'example_menuselect-tree');
      let menuselectTree = '';
      try { menuselectTree = await readFile(menuselectTreePath, 'utf8'); } catch { /* source-only checkouts may omit the example tree */ }
      const sourcePath = relative(root, absolute).replaceAll('\\', '/');
      const name = `${sourcePath.replace(/\.[^.]+$/u, '').split('/').at(-1)}.so`;
      const docs = docsSource(sourcePath, allFiles.filter((file) => file.endsWith('.md')));
      const build = buildSignals(family, sourcePath, source, makefile, menuselectTree);
      modules.push({
        id: moduleId(family, sourcePath),
        kind: 'module',
        family,
        name,
        source: sourcePath,
        description: moduleDescription(source) ?? `Loadable ${family} module from ${sourcePath}.`,
        buildConditions: build.conditions,
        provenance: {
          sourceSha256: sha256(sourceBuffer),
          buildGraph: {
            makefile: normalize(relative(root, familyMakefile)),
            makefileSha256: makefile ? sha256(makefile) : null,
            menuselectTree: normalize(relative(root, menuselectTreePath)),
            menuselectTreeSha256: menuselectTree ? sha256(menuselectTree) : null,
            matchedLines: build.matchedLines,
          },
        },
        sourceBytes: sourceBuffer.byteLength,
        configFiles: [...new Set([...source.matchAll(/(?:[A-Za-z0-9_-]+\.conf(?:\.sample)?)/gu)].map((match) => match[0]))].sort(),
        sourceSurfaces: sourceSignals(source),
        registrations: namedRegistrations(source),
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
    const contentBuffer = await readFile(absolute);
    const content = contentBuffer.toString('utf8');
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
      registrations: { cli: [], amiActions: [], amiEvents: [], ari: [], agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] },
      docsSource: allFiles.includes(resolve(root, 'console', 'docs', 'system', 'modules.md')) ? 'console/docs/system/modules.md' : undefined,
      unavailableReasons: ['A target-specific read is required before this resource can be edited; checked-in samples are not live values.'],
      runtime: { state: 'unverified', reason: 'A live target has not reconciled this source record yet.' },
      bytes: contentBuffer.byteLength,
      provenance: { sourceSha256: sha256(contentBuffer) },
    });
  }
  const apiResources = [];
  for (const absolute of allFiles.filter((file) => normalize(file).includes('rest-api/api-docs/') && file.endsWith('.json'))) {
    const relativePath = normalize(relative(root, absolute));
    const document = JSON.parse(await readFile(absolute, 'utf8'));
    const operations = (document.apis ?? []).flatMap((api) => (api.operations ?? []).map((operation) => ({
      path: api.path,
      method: operation.httpMethod,
      nickname: operation.nickname,
      summary: operation.summary,
      responseClass: operation.responseClass,
    })));
    const sourceBuffer = await readFile(absolute);
    const sourceText = sourceBuffer.toString('utf8');
    apiResources.push({
      id: `asterisk.ari.${relativePath.replace(/^rest-api\/api-docs\//u, '').replace(/\.json$/u, '').replace(/[^A-Za-z0-9]+/gu, '.').toLowerCase()}`,
      kind: 'ari-resource',
      family: 'ari',
      name: document.resourcePath ?? relativePath,
      source: relativePath,
      description: document.apis?.[0]?.description ?? `ARI resource document ${relativePath}.`,
      buildConditions: ['rest-api-generator'],
      configFiles: ['ari.conf', 'http.conf'],
      sourceSurfaces: ['ari', 'http', 'websocket'],
      registrations: { cli: [], amiActions: [], amiEvents: [], ari: operations.map((operation) => ({ name: operation.nickname ?? operation.path, evidence: `${operation.method} ${operation.path}`, description: operation.summary })), agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] },
      apiOperations: operations,
      docsSource: relativePath,
      unavailableReasons: ['The ARI resource requires a live HTTP or WebSocket target and an authenticated transport before it can be used.'],
      runtime: { state: 'unverified', reason: 'A live ARI resource response has not been reconciled yet.' },
      sourceBytes: sourceBuffer.byteLength,
      provenance: { sourceSha256: sha256(sourceBuffer) },
    });
  }
  apiResources.sort((a, b) => a.id.localeCompare(b.id));
  modules.sort((a, b) => a.id.localeCompare(b.id));
  resources.sort((a, b) => a.id.localeCompare(b.id));
  const catalog = {
    schemaVersion: 1,
    generatedFrom: 'Asterisk source checkout',
    generatedAt: '1970-01-01T00:00:00.000Z',
    sourceFamilies: families,
    counts: { modules: modules.length, resources: resources.length, apiResources: apiResources.length, total: modules.length + resources.length + apiResources.length },
    modules,
    resources,
    apiResources,
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
