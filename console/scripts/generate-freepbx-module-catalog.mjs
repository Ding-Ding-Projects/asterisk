#!/usr/bin/env node
/**
 * Discover the public FreePBX 17 module repositories through the official GitHub
 * CLI, read each repository's published module.xml, and emit the checked-in
 * metadata catalog used by the native console. This script never fetches a
 * third-party index and never treats a repository name as module metadata.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const output = resolve(root, 'console/catalog/freepbx-module-catalog.json');
const organization = 'FreePBX';
const preferredBranch = 'release/17.0';

function gh(args) {
  return execFileSync('gh', ['api', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function text(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function xmlDecode(value) {
  return text(value)
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function firstTag(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'iu').exec(xml);
  return match ? xmlDecode(match[1]) : '';
}

function allTags(xml, tag) {
  const values = [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'giu');
  let match;
  while ((match = pattern.exec(xml))) values.push(xmlDecode(match[1]));
  return [...new Set(values.filter(Boolean))];
}

function allBlocks(xml, tag) {
  const values = [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'giu');
  let match;
  while ((match = pattern.exec(xml))) values.push(match[1]);
  return values;
}

function directChildren(xml, parent, child) {
  const parentMatch = new RegExp(`<${parent}(?:\\s[^>]*)?>([\\s\\S]*?)</${parent}>`, 'iu').exec(xml);
  return parentMatch ? allTags(parentMatch[1], child) : [];
}

function mapResources(rawname) {
  const resources = {
    announcement: ['/etc/asterisk/extensions.conf'], announcements: ['/etc/asterisk/extensions.conf'],
    amd: ['/etc/asterisk/amd.conf', '/etc/asterisk/extensions.conf'], api: ['/etc/asterisk/http.conf', '/etc/asterisk/ari.conf'],
    asteriskinfo: ['/etc/asterisk/asterisk.conf'], blacklist: ['/etc/asterisk/acl.conf', '/etc/asterisk/extensions.conf'],
    calendar: ['/etc/asterisk/calendar.conf', '/etc/asterisk/extensions.conf'], callforward: ['/etc/asterisk/extensions.conf'],
    callrecording: ['/etc/asterisk/extensions.conf', '/etc/asterisk/features.conf', '/etc/asterisk/logger.conf'],
    callwaiting: ['/etc/asterisk/extensions.conf', '/etc/asterisk/features.conf'], callback: ['/etc/asterisk/extensions.conf', '/etc/asterisk/pjsip.conf'],
    cidlookup: ['/etc/asterisk/extensions.conf'], conferences: ['/etc/asterisk/confbridge.conf', '/etc/asterisk/meetme.conf'],
    customappsreg: ['/etc/asterisk/extensions.conf'], daynight: ['/etc/asterisk/extensions.conf'], dictate: ['/etc/asterisk/extensions.conf'],
    directory: ['/etc/asterisk/extensions.conf'], disa: ['/etc/asterisk/extensions.conf'], donotdisturb: ['/etc/asterisk/extensions.conf'],
    extensionsettings: ['/etc/asterisk/pjsip.conf'], featurecodeadmin: ['/etc/asterisk/features.conf', '/etc/asterisk/extensions.conf'],
    fax: ['/etc/asterisk/res_fax.conf', '/etc/asterisk/udptl.conf'], findmefollow: ['/etc/asterisk/followme.conf', '/etc/asterisk/extensions.conf'],
    firewall: ['/etc/asterisk/acl.conf'], iaxsettings: ['/etc/asterisk/iax.conf'], infoservices: ['/etc/asterisk/extensions.conf'],
    ivr: ['/etc/asterisk/extensions.conf'], languages: ['/etc/asterisk/asterisk.conf'], manager: ['/etc/asterisk/manager.conf'],
    miscapps: ['/etc/asterisk/extensions.conf'], miscdests: ['/etc/asterisk/extensions.conf'], music: ['/etc/asterisk/musiconhold.conf'],
    paging: ['/etc/asterisk/meetme.conf', '/etc/asterisk/extensions.conf'], parking: ['/etc/asterisk/res_parking.conf'],
    pbdirectory: ['/etc/asterisk/extensions.conf'], phonebook: ['/etc/asterisk/extensions.conf'], pinsets: ['/etc/asterisk/extensions.conf'],
    presencestate: ['/etc/asterisk/extensions.conf'], queues: ['/etc/asterisk/queues.conf', '/etc/asterisk/agents.conf'],
    ringgroups: ['/etc/asterisk/extensions.conf'], setcid: ['/etc/asterisk/extensions.conf'], sipsettings: ['/etc/asterisk/pjsip.conf'],
    soundlang: ['/etc/asterisk/asterisk.conf'], speeddial: ['/etc/asterisk/extensions.conf'], timeconditions: ['/etc/asterisk/extensions.conf'],
    trunks: ['/etc/asterisk/pjsip.conf'], tts: ['/etc/asterisk/festival.conf'], ttsengines: ['/etc/asterisk/festival.conf'],
    voicemail: ['/etc/asterisk/voicemail.conf'], vmblast: ['/etc/asterisk/voicemail.conf'], xmpp: ['/etc/asterisk/xmpp.conf'],
  };
  return resources[rawname] ?? [];
}

function uiFamilies(rawname, category) {
  const family = {
    core: 'extensions-users-devices', extensionsettings: 'extensions-users-devices', userman: 'extensions-users-devices',
    sipsettings: 'sip-settings', iaxsettings: 'iax-settings', queues: 'queues', queueprio: 'queues', ringgroups: 'ring-groups',
    announcement: 'announcements', announcements: 'announcements', recordings: 'recordings', music: 'music-on-hold',
    timeconditions: 'time-groups-conditions', daynight: 'call-flow-day-night', conferences: 'conferences', paging: 'paging-intercom',
    parking: 'parking', voicemail: 'voicemail', directory: 'directory', findmefollow: 'follow-me-find-me', donotdisturb: 'dnd',
    callwaiting: 'call-waiting', callforward: 'call-forwarding', blacklist: 'blacklist', languages: 'languages', miscapps: 'misc-apps',
    miscdests: 'misc-destinations', callrecording: 'call-recording', contactmanager: 'contacts', calendar: 'calendar-presence',
    presencestate: 'calendar-presence', cdr: 'cdr-cel-reports', cel: 'cdr-cel-reports', logfiles: 'diagnostics', certman: 'certificates-tls',
    firewall: 'firewall-security', manager: 'ami-api', api: 'api', ucp: 'ucp-webrtc', webrtc: 'ucp-webrtc', backup: 'backup-restore',
    moduleadmin: 'module-admin', sysadmin: 'system-admin', restart: 'jobs-scheduler', notifications: 'notifications',
  };
  return [family[rawname] ?? (category ? category.toLowerCase().replace(/[^a-z0-9]+/gu, '-') : 'other')];
}

function nativeTaskId(rawname) {
  const ids = {
    announcement: 'announcements', amd: 'amd', api: 'rest-api', arimanager: 'ari', asteriskinfo: 'system-status',
    backup: 'backup', blacklist: 'blacklist', calendar: 'calendar', callforward: 'call-forwarding', callrecording: 'call-recording',
    callwaiting: 'call-waiting', callback: 'callback', cidlookup: 'callerid-lookup', conferences: 'conferences', customappsreg: 'custom-apps-registration',
    daynight: 'call-flow-control', dictate: 'dictate', directory: 'directory', disa: 'disa', donotdisturb: 'dnd', extensionsettings: 'extension-settings',
    featurecodeadmin: 'feature-codes', fax: 'fax', findmefollow: 'follow-me', firewall: 'firewall', iaxsettings: 'iax-settings', infoservices: 'info-services',
    ivr: 'ivr', languages: 'sound-languages', manager: 'ami-settings', miscapps: 'misc-apps', miscdests: 'misc-destinations', music: 'music-on-hold',
    paging: 'paging', parking: 'parking', pbdirectory: 'phonebook', phonebook: 'phonebook', pinsets: 'pinsets', presencestate: 'presence-state',
    queues: 'queues', ringgroups: 'ring-groups', sipsettings: 'sip-settings', speeddial: 'speed-dial', timeconditions: 'time-conditions',
    trunks: 'trunks', ttsengines: 'tts-engines', voicemail: 'voicemail-admin', vmblast: 'voicemail-broadcast', xmpp: 'xmpp',
  };
  return ids[rawname] ?? null;
}

function entitlement(license) {
  const value = license.toLowerCase();
  if (value.includes('commercial') || value.includes('proprietary')) return 'commercial';
  if (value.includes('gpl') || value.includes('mit') || value.includes('bsd') || value.includes('apache')) return 'open';
  return 'unknown';
}

function unavailableReason({ license, localInstalled, resources, rawname }) {
  if (entitlement(license) === 'commercial') return 'Module metadata declares Commercial or proprietary entitlement; no vendor license is present, so the console does not claim the module or vendor service is available.';
  if (!localInstalled) return 'Published module metadata is available, but this module is not installed in the discovered local FreePBX runtime; no install or runtime success is claimed.';
  if (resources.length === 0) return `Module ${rawname} publishes no mapped Asterisk configuration resource in this catalog; runtime support remains metadata-only until a bounded adapter is reviewed.`;
  return 'Module metadata and a native resource mapping are present; final FreePBX runtime and built-artifact proof is pending.';
}

function parseModuleXml(xml) {
  const rawname = firstTag(xml, 'rawname');
  const name = firstTag(xml, 'name');
  const version = firstTag(xml, 'version');
  const license = firstTag(xml, 'license');
  const category = firstTag(xml, 'category');
  const publisher = firstTag(xml, 'publisher');
  const description = firstTag(xml, 'description');
  const dependencyVersions = directChildren(xml, 'depends', 'version');
  const dependencies = directChildren(xml, 'depends', 'module').map((raw, index) => {
    const match = /^(\S+)\s+(?:ge|gt|eq|le|lt)\s+(.+)$/iu.exec(raw);
    return { moduleId: match?.[1] ?? raw, version: match?.[2] ?? dependencyVersions[index] ?? '' };
  });
  const menuItems = directChildren(xml, 'menuitems', 'name');
  const commands = [...allBlocks(xml, 'command'), ...allBlocks(xml, 'fwconsole')]
    .map((block) => ({ name: firstTag(block, 'name'), class: firstTag(block, 'class') }))
    .filter((entry) => entry.name || entry.class);
  const capabilities = [...allTags(xml, 'provides'), ...allTags(xml, 'api'), ...allTags(xml, 'endpoint')];
  return { rawname, name, version, license, category, publisher, description, dependencies, menuItems, commands, capabilities };
}

function listRepositories() {
  const pages = ghJson([`orgs/${organization}/repos?per_page=100&type=all`]);
  return pages.filter((repo) => repo && repo.name && String(repo.visibility).toLowerCase() === 'public' && !repo.archived);
}

function readPublishedModule(repo) {
  const branches = [preferredBranch, repo.default_branch, 'master'].filter((value, index, array) => value && array.indexOf(value) === index);
  for (const branch of branches) {
    try {
      const file = ghJson([`repos/${organization}/${repo.name}/contents/module.xml?ref=${encodeURIComponent(branch)}`]);
      if (!file || file.type !== 'file' || file.encoding !== 'base64') continue;
      const xml = Buffer.from(file.content.replace(/\s/gu, ''), 'base64').toString('utf8');
      const parsed = parseModuleXml(xml);
      if (!parsed.rawname) continue;
      const commit = ghJson([`repos/${organization}/${repo.name}/commits/${encodeURIComponent(branch)}`]);
      return { branch, file, xml, parsed, revision: commit.sha };
    } catch {
      // A repository without a module.xml is not a module and is omitted deliberately.
    }
  }
  return undefined;
}

function localModules() {
  const moduleRoot = process.env.FREEPBX_LOCAL_MODULE_ROOT;
  if (!moduleRoot || !existsSync(moduleRoot) || !statSync(moduleRoot).isDirectory()) return [];
  return readdirSync(moduleRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
    const moduleXml = join(moduleRoot, entry.name, 'module.xml');
    if (!existsSync(moduleXml)) return [];
    const xml = readFileSync(moduleXml, 'utf8');
    const parsed = parseModuleXml(xml);
    if (!parsed.rawname) return [];
    return [{ parsed, moduleRoot, path: moduleXml }];
  });
}

const repositories = listRepositories();
const modules = [];
for (const repo of repositories) {
  const found = readPublishedModule(repo);
  if (!found) continue;
  const { parsed } = found;
  const resources = mapResources(parsed.rawname);
  const local = false;
  const reason = unavailableReason({ license: parsed.license, localInstalled: local, resources, rawname: parsed.rawname });
  modules.push({
    moduleId: parsed.rawname,
    rawname: parsed.rawname,
    name: parsed.name || repo.name,
    description: parsed.description || 'Description was not published in module.xml.',
    category: parsed.category || 'Uncategorized',
    version: parsed.version || 'unknown',
    source: {
      organization,
      repository: repo.name,
      branch: found.branch,
      revision: found.revision,
      moduleXmlPath: 'module.xml',
      moduleXmlSha: found.file.sha,
      repositoryUrl: repo.html_url,
      moduleXmlUrl: found.file.html_url,
    },
    publisher: parsed.publisher || 'Not published',
    license: parsed.license || 'Not published',
    entitlementClass: entitlement(parsed.license),
    dependencies: parsed.dependencies,
    configurationResources: resources,
    fwconsoleCommands: parsed.commands,
    apiCapabilities: parsed.capabilities,
    uiFamilies: uiFamilies(parsed.rawname, parsed.category),
    nativeTaskId: nativeTaskId(parsed.rawname),
    menuItems: parsed.menuItems,
    documentation: { repository: repo.html_url, moduleXml: found.file.html_url },
    availability: { state: local && resources.length > 0 ? 'metadata-only' : 'unavailable', reason },
    localInstalled: false,
    localMetadataPath: null,
  });
}

for (const local of localModules()) {
  const existing = modules.find((item) => item.moduleId === local.parsed.rawname);
  const resources = mapResources(local.parsed.rawname);
  if (existing) {
    existing.localInstalled = true;
    existing.localMetadataPath = local.path;
    existing.availability = { state: resources.length > 0 ? 'metadata-only' : 'unavailable', reason: unavailableReason({ license: local.parsed.license, localInstalled: true, resources, rawname: local.parsed.rawname }) };
    continue;
  }
  modules.push({
    moduleId: local.parsed.rawname,
    rawname: local.parsed.rawname,
    name: local.parsed.name || local.parsed.rawname,
    description: local.parsed.description || 'Locally installed module metadata did not publish a description.',
    category: local.parsed.category || 'Uncategorized',
    version: local.parsed.version || 'unknown',
    source: { organization: null, repository: null, branch: null, revision: null, moduleXmlPath: null, moduleXmlSha: null, repositoryUrl: null, moduleXmlUrl: null },
    publisher: local.parsed.publisher || 'Not published',
    license: local.parsed.license || 'Not published',
    entitlementClass: entitlement(local.parsed.license),
    dependencies: local.parsed.dependencies,
    configurationResources: resources,
    fwconsoleCommands: local.parsed.commands,
    apiCapabilities: local.parsed.capabilities,
    uiFamilies: uiFamilies(local.parsed.rawname, local.parsed.category),
    nativeTaskId: nativeTaskId(local.parsed.rawname),
    menuItems: local.parsed.menuItems,
    documentation: { repository: null, moduleXml: null },
    availability: { state: resources.length > 0 ? 'metadata-only' : 'unavailable', reason: unavailableReason({ license: local.parsed.license, localInstalled: true, resources, rawname: local.parsed.rawname }) },
    localInstalled: true,
    localMetadataPath: local.path,
  });
}

modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
const pinnedModuleSnapshot = createHash('sha256')
  .update(modules.map((module) => `${module.moduleId}@${module.source.revision ?? 'local'}:${module.source.moduleXmlSha ?? 'local'}`).join('\n'))
  .digest('hex');
const catalog = {
  schemaVersion: 1,
  generatedBy: 'console/scripts/generate-freepbx-module-catalog.mjs',
  generatedAt: new Date().toISOString(),
  source: {
    provider: 'GitHub CLI gh api',
    organization,
    branch: preferredBranch,
    repositoryDiscovery: `orgs/${organization}/repos?per_page=100&type=all`,
    moduleMetadata: 'module.xml from each public FreePBX module repository',
    repositoryCountInspected: repositories.length,
    pinnedModuleSnapshot: `sha256:${pinnedModuleSnapshot}`,
  },
  counts: {
    publicModules: modules.filter((module) => module.source.repository).length,
    locallyInstalledModules: modules.filter((module) => module.localInstalled).length,
    unavailableModules: modules.filter((module) => module.availability.state === 'unavailable').length,
    total: modules.length,
  },
  modules,
};
mkdirSync(resolve(root, 'console/catalog'), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`generated ${output}`);
console.log(`public modules: ${catalog.counts.publicModules}`);
console.log(`locally installed modules: ${catalog.counts.locallyInstalledModules}`);
console.log(`unavailable modules: ${catalog.counts.unavailableModules}`);
console.log(`total catalog entries: ${catalog.counts.total}`);
