import type { ConfigSection, ConfigValue } from './configuration';

export type PbxFeatureGroup = 'Applications' | 'Connectivity' | 'Administration' | 'Reports' | 'Settings';
export type PbxFeatureTool = 'config' | 'media' | 'history';

export interface PbxFeatureDefinition {
  id: string;
  group: PbxFeatureGroup;
  label: string;
  description: string;
  resources: ReadonlyArray<string>;
  tools?: ReadonlyArray<PbxFeatureTool>;
}

const A = '/etc/asterisk';
const r = (name: string) => `${A}/${name}`;

/**
 * The advanced workspace is additive: it does not replace the generated design or its
 * purpose-built screens. It gives every allowlisted Asterisk subsystem a discoverable
 * home while dedicated controls are filled in over time. Every resource named here is
 * already inside WslConfigTransport.CONFIGURABLE_RESOURCES; a typo is still refused by
 * the main process before anything is read or written.
 *
 * Labels deliberately follow administrator tasks rather than Asterisk filenames. They
 * track the standard FreePBX module vocabulary where Asterisk has a genuine equivalent,
 * but the implementation remains Asterisk-native: dialplan-backed FreePBX modules map
 * to extensions.conf, media-backed modules also expose the bounded media library, and
 * PBX services map only to configuration files this checkout proves Asterisk consumes.
 * A FreePBX-framework-only or commercial service is not invented here just to make a
 * menu item exist.
 */
export const PBX_FEATURES: ReadonlyArray<PbxFeatureDefinition> = [
  // Applications — task names mirror the standard FreePBX applications catalogue where
  // there is a real Asterisk/dialplan/media implementation surface.
  { id: 'extensions', group: 'Applications', label: 'Extensions & users', description: 'Endpoint identities, dialplan entries, voicemail boxes and per-extension behaviour.', resources: [r('pjsip.conf'), r('extensions.conf'), r('voicemail.conf')] },
  { id: 'announcements', group: 'Applications', label: 'Announcements', description: 'Dialplan announcement destinations backed by target prompt recordings.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'calendar-event-groups', group: 'Applications', label: 'Calendar event groups', description: 'Calendar-backed groups that feed time-aware dialplan decisions.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'callback', group: 'Applications', label: 'Callback', description: 'Dialplan callback destinations and outbound call handling.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'call-flow-control', group: 'Applications', label: 'Call flow control', description: 'Toggleable dialplan branches and destinations for day/night or operational modes.', resources: [r('extensions.conf')] },
  { id: 'call-recording', group: 'Applications', label: 'Call recording', description: 'Dialplan recording policy and logger integration for recorded calls.', resources: [r('extensions.conf'), r('logger.conf')] },
  { id: 'conferences', group: 'Applications', label: 'Conferences', description: 'ConfBridge bridge and user profiles.', resources: [r('confbridge.conf')] },
  { id: 'directory', group: 'Applications', label: 'Directory', description: 'Dialplan directory destinations using extension and voicemail identity data.', resources: [r('extensions.conf'), r('voicemail.conf')] },
  { id: 'disa', group: 'Applications', label: 'DISA', description: 'Direct Inward System Access dialplan destinations and outbound routing context.', resources: [r('extensions.conf')] },
  { id: 'follow-me', group: 'Applications', label: 'Follow me', description: 'Dialplan destinations that ring additional endpoints or external numbers.', resources: [r('extensions.conf')] },
  { id: 'ivr', group: 'Applications', label: 'IVR', description: 'Menus, digit handling, timeouts, destinations and prompt references.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'languages', group: 'Applications', label: 'Languages', description: 'Language-aware dialplan and target prompt media selection.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'misc-applications', group: 'Applications', label: 'Misc applications', description: 'Custom feature codes that send callers to a chosen dialplan destination.', resources: [r('extensions.conf'), r('features.conf')] },
  { id: 'misc-destinations', group: 'Applications', label: 'Misc destinations', description: 'Reusable custom call targets referenced by other dialplan features.', resources: [r('extensions.conf')] },
  { id: 'missed-call-notification', group: 'Applications', label: 'Missed-call notification', description: 'Dialplan and manager-facing hooks used to observe unanswered call outcomes.', resources: [r('extensions.conf'), r('manager.conf')] },
  { id: 'paging', group: 'Applications', label: 'Paging & intercom', description: 'Endpoint and dialplan settings used for paging and intercom destinations.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'parking', group: 'Applications', label: 'Parking', description: 'Parking lots, transfer keys, pickup and in-call feature codes.', resources: [r('features.conf'), r('extensions.conf')] },
  { id: 'queue-priorities', group: 'Applications', label: 'Queue priorities', description: 'Queue penalty rules and dialplan entry points that change caller priority.', resources: [r('queuerules.conf'), r('queues.conf'), r('extensions.conf')] },
  { id: 'queues', group: 'Applications', label: 'Queues', description: 'Queue strategy, members, announcements, penalty rules and service levels.', resources: [r('queues.conf'), r('queuerules.conf')] },
  { id: 'ring-groups', group: 'Applications', label: 'Ring groups', description: 'Ordered destinations and hunt behaviour expressed in the dialplan.', resources: [r('extensions.conf')] },
  { id: 'set-callerid', group: 'Applications', label: 'Set CallerID', description: 'Dialplan caller-ID transforms and endpoint identity policy.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'time-conditions', group: 'Applications', label: 'Time conditions', description: 'Calendar and dialplan-driven routing by time and date.', resources: [r('extensions.conf'), r('calendar.conf')] },
  { id: 'time-groups', group: 'Applications', label: 'Time groups', description: 'Reusable schedules for time-based dialplan decisions.', resources: [r('extensions.conf'), r('calendar.conf')] },
  { id: 'voicemail-blasting', group: 'Applications', label: 'Voicemail blasting', description: 'Dialplan fan-out to multiple voicemail boxes and mailbox policy.', resources: [r('extensions.conf'), r('voicemail.conf')] },
  { id: 'wake-up-calls', group: 'Applications', label: 'Wake-up calls', description: 'Calendar- and dialplan-driven scheduled call destinations.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'voicemail', group: 'Applications', label: 'Voicemail', description: 'Mailbox policy, storage behaviour, greetings and notification settings.', resources: [r('voicemail.conf')], tools: ['config', 'media'] },
  { id: 'recordings', group: 'Applications', label: 'System recordings', description: 'Prompt files used by IVR, voicemail, queues and announcement destinations.', resources: [], tools: ['media'] },
  { id: 'moh', group: 'Applications', label: 'Music on hold', description: 'Music-on-hold classes and their media files.', resources: [r('musiconhold.conf')], tools: ['config', 'media'] },

  // Connectivity — provider-branded FreePBX modules collapse to the same underlying
  // Asterisk trunk/API/dialplan primitives instead of embedding one vendor's service.
  { id: 'api', group: 'Connectivity', label: 'API services', description: 'AMI, ARI and embedded HTTP service configuration used by external integrations.', resources: [r('manager.conf'), r('http.conf')] },
  { id: 'call-forwarding', group: 'Connectivity', label: 'Call forwarding', description: 'Dialplan forwarding destinations and endpoint routing behaviour.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'call-waiting', group: 'Connectivity', label: 'Call waiting', description: 'Endpoint and dialplan policy that controls additional inbound calls while busy.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'dnd', group: 'Connectivity', label: 'Do not disturb', description: 'Endpoint and dialplan routing behaviour for blocked inbound ringing.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'pjsip-trunks', group: 'Connectivity', label: 'PJSIP trunks', description: 'PJSIP endpoint, AOR, auth, registration and transport objects.', resources: [r('pjsip.conf')] },
  { id: 'iax-trunks', group: 'Connectivity', label: 'IAX2 trunks', description: 'IAX2 peers, users and trunking settings.', resources: [r('iax.conf')] },
  { id: 'dahdi', group: 'Connectivity', label: 'DAHDI channels & DIDs', description: 'Hardware channels plus dialplan DID routing for analogue, T1/E1 and PRI connectivity.', resources: [r('chan_dahdi.conf'), r('extensions.conf')] },
  { id: 'inbound-routes', group: 'Connectivity', label: 'Inbound routes', description: 'DID and caller-based inbound destinations in the dialplan.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'outbound-routes', group: 'Connectivity', label: 'Outbound routes', description: 'Dial patterns, trunk selection and outbound caller handling.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'firewall', group: 'Connectivity', label: 'Firewall / ACL policy', description: 'Asterisk named ACLs and service access restrictions. This does not pretend to be an operating-system firewall.', resources: [r('acl.conf'), r('manager.conf'), r('http.conf')] },
  { id: 'nat', group: 'Connectivity', label: 'NAT & STUN', description: 'PJSIP transport NAT behaviour and STUN monitoring.', resources: [r('pjsip.conf'), r('res_stun_monitor.conf')] },
  { id: 'sms-routing', group: 'Connectivity', label: 'SIP messaging / SMS routing', description: 'PJSIP MESSAGE handling and dialplan/HTTP integration points for provider messaging.', resources: [r('pjsip.conf'), r('extensions.conf'), r('http.conf')] },
  { id: 'sla', group: 'Connectivity', label: 'Shared line appearances', description: 'Shared line trunks and stations.', resources: [r('sla.conf')] },
  { id: 'dundi', group: 'Connectivity', label: 'DUNDi', description: 'Distributed dialplan lookup and peer policy.', resources: [r('dundi.conf')] },

  // Administration.
  { id: 'acl', group: 'Administration', label: 'Access control', description: 'Named Asterisk ACLs used by transports, endpoints and services.', resources: [r('acl.conf')] },
  { id: 'blacklist', group: 'Administration', label: 'Blacklist', description: 'Dialplan-level number blocking and access restrictions.', resources: [r('extensions.conf'), r('acl.conf')] },
  { id: 'bulk-config', group: 'Administration', label: 'Bulk configuration', description: 'Structured access to every allowlisted Asterisk resource for large administrative edits.', resources: [
    r('pjsip.conf'), r('extensions.conf'), r('queues.conf'), r('voicemail.conf'), r('confbridge.conf'), r('musiconhold.conf'),
  ] },
  { id: 'callerid-lookup', group: 'Administration', label: 'CallerID lookup routing', description: 'Dialplan hooks and HTTP service settings for caller identity enrichment.', resources: [r('extensions.conf'), r('http.conf')] },
  { id: 'certificates', group: 'Administration', label: 'Certificate management / TLS', description: 'HTTP TLS, PJSIP transport certificate references and verification policy.', resources: [r('http.conf'), r('pjsip.conf'), r('stir_shaken.conf')] },
  { id: 'custom-destinations', group: 'Administration', label: 'Custom destinations', description: 'Named custom dialplan entry points for other routing features.', resources: [r('extensions.conf')] },
  { id: 'custom-extensions', group: 'Administration', label: 'Custom extensions', description: 'Manually defined extension dialplan entries and endpoint associations.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'feature-codes', group: 'Administration', label: 'Feature codes', description: 'Transfer, pickup, parking and other in-call feature mappings.', resources: [r('features.conf'), r('extensions.conf')] },
  { id: 'stir-shaken', group: 'Administration', label: 'STIR/SHAKEN', description: 'Outbound attestation, inbound verification, profiles and certificate references.', resources: [r('stir_shaken.conf')] },
  { id: 'geolocation', group: 'Administration', label: 'Emergency geolocation', description: 'Location profiles and emergency-services routing metadata.', resources: [r('geolocation.conf')] },
  { id: 'backup', group: 'Administration', label: 'Transactional recovery', description: 'Per-resource recovery points created by the verified configuration transaction engine.', resources: [], tools: ['history'] },
  { id: 'phoneprov', group: 'Administration', label: 'Phone provisioning', description: 'Handset templates and provisioning profiles.', resources: [r('phoneprov.conf')] },
  { id: 'manager', group: 'Administration', label: 'AMI, ARI & HTTP services', description: 'Manager users, embedded HTTP service and REST-facing settings.', resources: [r('manager.conf'), r('http.conf')] },
  { id: 'modules', group: 'Administration', label: 'Module administration', description: 'Autoload, preload, noload and required Asterisk modules.', resources: [r('modules.conf')] },
  { id: 'logger', group: 'Administration', label: 'Logging', description: 'Log channels, rotation and queue logging.', resources: [r('logger.conf')] },
  { id: 'core', group: 'Administration', label: 'Asterisk core settings', description: 'Core directories, run-as identity and process-level settings.', resources: [r('asterisk.conf')] },
  { id: 'realtime', group: 'Administration', label: 'Realtime & database backends', description: 'ODBC, PostgreSQL, LDAP, extconfig and Sorcery object mappings.', resources: [r('res_odbc.conf'), r('extconfig.conf'), r('sorcery.conf'), r('res_pgsql.conf'), r('res_ldap.conf')] },
  { id: 'monitoring', group: 'Administration', label: 'Monitoring', description: 'Prometheus and SNMP telemetry exports.', resources: [r('prometheus.conf'), r('res_snmp.conf')] },
  { id: 'calendar', group: 'Administration', label: 'Calendars', description: 'Calendar sources used by dialplan and time-aware routing.', resources: [r('calendar.conf')] },
  { id: 'xmpp', group: 'Administration', label: 'XMPP messaging', description: 'XMPP client and messaging integration settings.', resources: [r('xmpp.conf')] },
  { id: 'adsi', group: 'Administration', label: 'Caller display / ADSI', description: 'ADSI and legacy caller-display service settings.', resources: [r('adsi.conf')] },

  // Reports.
  { id: 'cdr', group: 'Reports', label: 'CDR reports backend', description: 'Call Detail Record policy and ODBC/PostgreSQL backends.', resources: [r('cdr.conf'), r('cdr_odbc.conf'), r('cdr_pgsql.conf')] },
  { id: 'cel', group: 'Reports', label: 'Call event logging', description: 'Detailed Channel Event Logging and database backends.', resources: [r('cel.conf'), r('cel_odbc.conf'), r('cel_pgsql.conf')] },
  { id: 'fax', group: 'Reports', label: 'Fax & T.38', description: 'Fax engine settings plus UDPTL transport behaviour.', resources: [r('res_fax.conf'), r('udptl.conf')] },
  { id: 'report-logging', group: 'Reports', label: 'Asterisk logfiles', description: 'Logger channels and queue log policy consumed by the existing live log surfaces.', resources: [r('logger.conf')] },
  { id: 'weak-password-policy', group: 'Reports', label: 'Credential review surface', description: 'PJSIP authentication objects and manager credentials exposed for administrator review without fabricating a security score.', resources: [r('pjsip.conf'), r('manager.conf')] },

  // Settings.
  { id: 'advanced', group: 'Settings', label: 'Advanced settings', description: 'The allowlisted Asterisk configuration resources that underpin the desktop console.', resources: [
    r('asterisk.conf'), r('pjsip.conf'), r('extensions.conf'), r('queues.conf'), r('voicemail.conf'), r('confbridge.conf'),
    r('musiconhold.conf'), r('cdr.conf'), r('manager.conf'), r('logger.conf'), r('rtp.conf'), r('modules.conf'), r('acl.conf'),
  ] },
  { id: 'iax-settings', group: 'Settings', label: 'Asterisk IAX settings', description: 'IAX2 global, peer and user configuration.', resources: [r('iax.conf')] },
  { id: 'logfile-settings', group: 'Settings', label: 'Asterisk logfile settings', description: 'Logger channels, rotation and queue logging.', resources: [r('logger.conf')] },
  { id: 'ami-settings', group: 'Settings', label: 'Asterisk Manager Interface', description: 'AMI bind, authentication and privilege configuration.', resources: [r('manager.conf')] },
  { id: 'ari-settings', group: 'Settings', label: 'Asterisk REST Interface', description: 'ARI-facing HTTP service and authentication surface.', resources: [r('http.conf'), r('manager.conf')] },
  { id: 'sip', group: 'Settings', label: 'Asterisk SIP settings', description: 'Global PJSIP transports, endpoints and registrations.', resources: [r('pjsip.conf')] },
  { id: 'extension-settings', group: 'Settings', label: 'Extension settings', description: 'PJSIP endpoint defaults plus extension dialplan and voicemail settings.', resources: [r('pjsip.conf'), r('extensions.conf'), r('voicemail.conf')] },
  { id: 'fax-settings', group: 'Settings', label: 'Fax configuration', description: 'Fax engine and UDPTL transport settings.', resources: [r('res_fax.conf'), r('udptl.conf')] },
  { id: 'moh-settings', group: 'Settings', label: 'Music on hold settings', description: 'Music-on-hold class configuration and media.', resources: [r('musiconhold.conf')], tools: ['config', 'media'] },
  { id: 'pin-sets', group: 'Settings', label: 'PIN sets', description: 'Dialplan authentication/PIN gates for protected destinations.', resources: [r('extensions.conf')] },
  { id: 'route-congestion', group: 'Settings', label: 'Route congestion messages', description: 'Dialplan failure routing and prompt playback for unavailable outbound routes.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'rtp', group: 'Settings', label: 'RTP & media', description: 'RTP port ranges, strict RTP, ICE and media transport behaviour.', resources: [r('rtp.conf')] },
  { id: 'voicemail-admin', group: 'Settings', label: 'Voicemail admin', description: 'Global voicemail policy and mailbox configuration.', resources: [r('voicemail.conf')], tools: ['config', 'media'] },

  // Capability-only Asterisk surfaces with no direct FreePBX standard-module analogue.
  { id: 'sla', group: 'Settings', label: 'Shared line appearances', description: 'Shared line trunks and stations.', resources: [r('sla.conf')] },
  { id: 'dundi', group: 'Settings', label: 'DUNDi', description: 'Distributed dialplan lookup and peer policy.', resources: [r('dundi.conf')] },
];

/** Exact renderer-side mirror of the main process allowlist. Kept only as a drift guard. */
export const EXPECTED_CONFIGURABLE_RESOURCES: ReadonlyArray<string> = [
  'pjsip.conf', 'extensions.conf', 'queues.conf', 'voicemail.conf', 'confbridge.conf', 'musiconhold.conf',
  'cdr.conf', 'manager.conf', 'logger.conf', 'rtp.conf', 'modules.conf', 'acl.conf', 'chan_dahdi.conf', 'iax.conf',
  'res_fax.conf', 'cel.conf', 'cel_odbc.conf', 'cel_pgsql.conf', 'res_odbc.conf', 'extconfig.conf', 'sorcery.conf',
  'res_pgsql.conf', 'res_ldap.conf', 'cdr_odbc.conf', 'cdr_pgsql.conf', 'http.conf', 'stir_shaken.conf',
  'geolocation.conf', 'phoneprov.conf', 'features.conf', 'sla.conf', 'dundi.conf', 'calendar.conf', 'queuerules.conf',
  'udptl.conf', 'res_stun_monitor.conf', 'res_snmp.conf', 'prometheus.conf', 'xmpp.conf', 'adsi.conf', 'asterisk.conf',
].map(r);

export function coveredConfigResources(features: ReadonlyArray<PbxFeatureDefinition> = PBX_FEATURES): ReadonlyArray<string> {
  return [...new Set(features.flatMap((feature) => feature.resources))].sort();
}

export function missingConfigResources(features: ReadonlyArray<PbxFeatureDefinition> = PBX_FEATURES): ReadonlyArray<string> {
  const covered = new Set(coveredConfigResources(features));
  return EXPECTED_CONFIGURABLE_RESOURCES.filter((resource) => !covered.has(resource)).sort();
}

export interface ConfigValidationIssue {
  section: number;
  entry?: number;
  message: string;
}

/**
 * The editor is intentionally structured rather than a raw text area. These checks do
 * not claim to validate Asterisk semantics; they only refuse shapes that render into an
 * ambiguous or malformed INI line before a plan is even requested.
 */
export function validateConfigValue(value: ConfigValue): ReadonlyArray<ConfigValidationIssue> {
  const issues: ConfigValidationIssue[] = [];
  value.forEach((section, sectionIndex) => {
    if (/[\r\n\[\]]/u.test(section.name)) {
      issues.push({ section: sectionIndex, message: 'Section names cannot contain brackets or line breaks.' });
    }
    section.entries.forEach((entry, entryIndex) => {
      if (entry.key.trim().length === 0) {
        issues.push({ section: sectionIndex, entry: entryIndex, message: 'Setting names cannot be empty.' });
      } else if (/[=\r\n]/u.test(entry.key)) {
        issues.push({ section: sectionIndex, entry: entryIndex, message: 'Setting names cannot contain = or line breaks.' });
      }
      if (/\r|\n/u.test(entry.value)) {
        issues.push({ section: sectionIndex, entry: entryIndex, message: 'Setting values cannot contain line breaks in this editor.' });
      }
    });
  });
  return issues;
}

function clone(value: ConfigValue): ConfigSection[] {
  return value.map((section) => ({ name: section.name, entries: section.entries.map((entry) => ({ ...entry })) }));
}

export function updateSectionName(value: ConfigValue, sectionIndex: number, name: string): ConfigValue {
  const next = clone(value);
  if (!next[sectionIndex]) return value;
  next[sectionIndex] = { ...next[sectionIndex]!, name };
  return next;
}

export function addSection(value: ConfigValue, name: string): ConfigValue {
  const clean = name.trim();
  if (clean.length === 0 || /[\r\n\[\]]/u.test(clean)) return value;
  if (value.some((section) => section.name === clean)) return value;
  return [...clone(value), { name: clean, entries: [] }];
}

export function removeSection(value: ConfigValue, sectionIndex: number): ConfigValue {
  return clone(value).filter((_, index) => index !== sectionIndex);
}

export function updateEntry(
  value: ConfigValue,
  sectionIndex: number,
  entryIndex: number,
  patch: Partial<{ key: string; value: string }>,
): ConfigValue {
  const next = clone(value);
  const section = next[sectionIndex];
  const entry = section?.entries[entryIndex];
  if (!section || !entry) return value;
  const entries = [...section.entries];
  entries[entryIndex] = { ...entry, ...patch };
  next[sectionIndex] = { ...section, entries };
  return next;
}

export function addEntry(value: ConfigValue, sectionIndex: number): ConfigValue {
  const next = clone(value);
  const section = next[sectionIndex];
  if (!section) return value;
  next[sectionIndex] = { ...section, entries: [...section.entries, { key: '', value: '' }] };
  return next;
}

export function removeEntry(value: ConfigValue, sectionIndex: number, entryIndex: number): ConfigValue {
  const next = clone(value);
  const section = next[sectionIndex];
  if (!section) return value;
  next[sectionIndex] = { ...section, entries: section.entries.filter((_, index) => index !== entryIndex) };
  return next;
}

export function featureGroups(features: ReadonlyArray<PbxFeatureDefinition> = PBX_FEATURES): ReadonlyArray<PbxFeatureGroup> {
  return ['Applications', 'Connectivity', 'Administration', 'Reports', 'Settings'].filter((group) =>
    features.some((feature) => feature.group === group),
  ) as PbxFeatureGroup[];
}
