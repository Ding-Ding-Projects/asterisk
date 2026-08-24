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
const exclusions = [
  { moduleId: 'sms-plus', reason: 'Historical parity label is not a published FreePBX module repository; it is retained only as an explicit exclusion record.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'sms-webhook', reason: 'Historical parity label is not a published FreePBX module repository; it is retained only as an explicit exclusion record.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'sms', reason: 'FreePBX publishes SMS as a commercial UCP-dependent module. It is retained as an explicit disposition record, but no license, account, or end-user portal is claimed.', source: 'official FreePBX module metadata and historical parity disposition' },
  { moduleId: 'framework', reason: 'FreePBX framework plumbing has no distinct native Asterisk configuration surface in this console.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'pm2', reason: 'FreePBX process-manager plumbing is not a user-facing Asterisk configuration module.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'phpinfo', reason: 'PHP diagnostic output is not a native Asterisk configuration surface.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'versionupgrade', reason: 'FreePBX updater plumbing is not represented as a native module action without a bounded runtime adapter.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'fw_langpacks', reason: 'Language-pack download plumbing is not an offline native configuration surface.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'digium_phones', reason: 'Vendor cloud provisioning is not claimed as a native local capability.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'digiumaddoninstaller', reason: 'Vendor add-on catalog installation is not claimed without the vendor entitlement service.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'cxpanel', reason: 'Third-party commercial call-center UI is not copied or presented as native functionality.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'synologyabb', reason: 'Vendor-specific backup integration is not claimed; generic backup remains separately cataloged.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'irc', reason: 'Online support chat is not an Asterisk administration capability.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'ucp', reason: 'The separate end-user portal is outside the administrator console boundary.', source: 'historical FreePBX parity disposition' },
  { moduleId: 'webrtc', reason: 'The UCP-embedded browser phone is not claimed without the separate end-user portal.', source: 'historical FreePBX parity disposition' },
].map((entry) => ({ ...entry, recordId: `exclude-${entry.moduleId}`, actionable: false }));

function gh(args) {
  return execFileSync('gh', ['api', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function text(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

const PYTHON_XML_PARSER = String.raw`
import json, re, sys
import xml.etree.ElementTree as ET

def text(node):
    return ''.join(node.itertext()).strip() if node is not None else ''

root = ET.fromstring(sys.stdin.read())
def first(path):
    node = root.find(path)
    return text(node)

depends = root.find('depends')
dependency_versions = [text(node) for node in depends.findall('version')] if depends is not None else []
dependencies = []
for index, node in enumerate(depends.findall('module') if depends is not None else []):
    raw = text(node)
    match = re.match(r'^(\S+)\s+(?:ge|gt|eq|le|lt)\s+(.+)$', raw, re.I)
    dependencies.append({'moduleId': match.group(1) if match else raw, 'version': match.group(2) if match else (dependency_versions[index] if index < len(dependency_versions) else '')})

menu_parent = root.find('menuitems')
menu_items = [text(node) for node in list(menu_parent)] if menu_parent is not None else []
commands = [{'name': first_child.text.strip() if first_child.text else '', 'class': next((text(child) for child in command if child.tag == 'class'), '')} for command in root.findall('.//command') for first_child in [next((child for child in command if child.tag == 'name'), None)] if first_child is not None]
capabilities = [text(node) for tag in ('provides', 'api', 'endpoint') for node in root.findall('.//' + tag) if text(node)]
print(json.dumps({'rawname': first('rawname'), 'name': first('name'), 'version': first('version'), 'license': first('license'), 'category': first('category'), 'publisher': first('publisher'), 'description': first('description'), 'dependencies': dependencies, 'menuItems': sorted(set(menu_items)), 'commands': commands, 'capabilities': sorted(set(capabilities))}))
`;

function parseModuleXml(xml) {
  const executable = process.env.FREEPBX_XML_PARSER ?? (process.platform === 'win32' ? 'py' : 'python3');
  const args = process.platform === 'win32' ? ['-3', '-c', PYTHON_XML_PARSER] : ['-c', PYTHON_XML_PARSER];
  return JSON.parse(execFileSync(executable, args, { input: xml, cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
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
    paging: 'paging', parking: 'parking', phonebook: 'phonebook', pinsets: 'pinsets', presencestate: 'presence-state',
    queues: 'queues', ringgroups: 'ring-groups', sipsettings: 'sip-settings', speeddial: 'speed-dial', timeconditions: 'time-conditions',
    trunks: 'trunks', ttsengines: 'tts-engines', voicemail: 'voicemail-admin', vmblast: 'voicemail-broadcast', xmpp: 'xmpp',
  };
  return ids[rawname] ?? null;
}

function nativeAliasOf(rawname) {
  return rawname === 'pbdirectory' ? 'phonebook' : null;
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

function listRepositories() {
  const pages = ghJson([`orgs/${organization}/repos?per_page=100&type=all`]);
  return pages.filter((repo) => repo && repo.name && String(repo.visibility).toLowerCase() === 'public' && !repo.archived);
}

function readPublishedModule(repo) {
  const branches = [preferredBranch, repo.default_branch, 'master'].filter((value, index, array) => value && array.indexOf(value) === index);
  for (const branch of branches) {
    try {
      const commit = ghJson([`repos/${organization}/${repo.name}/commits/${encodeURIComponent(branch)}`]);
      if (!commit?.sha || !/^[0-9a-f]{40}$/u.test(commit.sha)) continue;
      const file = ghJson([`repos/${organization}/${repo.name}/contents/module.xml?ref=${encodeURIComponent(commit.sha)}`]);
      if (!file || file.type !== 'file' || file.encoding !== 'base64') continue;
      const xml = Buffer.from(file.content.replace(/\s/gu, ''), 'base64').toString('utf8');
      const parsed = parseModuleXml(xml);
      if (!parsed.rawname) continue;
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
    nativeAliasOf: nativeAliasOf(parsed.rawname),
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
    nativeAliasOf: nativeAliasOf(local.parsed.rawname),
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
    exclusions: exclusions.length,
  },
  exclusions,
  modules,
};
mkdirSync(resolve(root, 'console/catalog'), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`generated ${output}`);
console.log(`public modules: ${catalog.counts.publicModules}`);
console.log(`locally installed modules: ${catalog.counts.locallyInstalledModules}`);
console.log(`unavailable modules: ${catalog.counts.unavailableModules}`);
console.log(`total catalog entries: ${catalog.counts.total}`);
