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
  /** Existing Ding destination whose live/runtime UI is the implementation for this task. */
  delegateScreen?: string;
}

const A = '/etc/asterisk';
const r = (name: string) => `${A}/${name}`;

/**
 * Exact renderer-side mirror of WslConfigTransport.CONFIGURABLE_RESOURCES. It is a
 * deliberate drift guard: capability tests prove the backend names exist in Asterisk's
 * own samples, while renderer tests prove every one remains reachable from PBX Admin.
 */
export const EXPECTED_CONFIGURABLE_RESOURCES: ReadonlyArray<string> = [
  'pjsip.conf', 'extensions.conf', 'queues.conf', 'voicemail.conf', 'confbridge.conf', 'musiconhold.conf',
  'cdr.conf', 'manager.conf', 'logger.conf', 'rtp.conf', 'modules.conf', 'acl.conf', 'chan_dahdi.conf', 'iax.conf',
  'res_fax.conf', 'cel.conf', 'cel_odbc.conf', 'cel_pgsql.conf', 'res_odbc.conf', 'extconfig.conf', 'sorcery.conf',
  'res_pgsql.conf', 'res_ldap.conf', 'cdr_odbc.conf', 'cdr_pgsql.conf', 'http.conf', 'ari.conf',
  'stir_shaken.conf', 'geolocation.conf', 'phoneprov.conf', 'features.conf', 'res_parking.conf', 'sla.conf',
  'dundi.conf', 'calendar.conf', 'queuerules.conf', 'udptl.conf', 'res_stun_monitor.conf', 'res_snmp.conf',
  'prometheus.conf', 'xmpp.conf', 'adsi.conf', 'asterisk.conf', 'festival.conf', 'cli_aliases.conf',
  'cli_permissions.conf', 'indications.conf', 'agents.conf', 'followme.conf', 'meetme.conf', 'minivm.conf',
  'extensions_minivm.conf', 'amd.conf', 'alarmreceiver.conf', 'ss7.timers', 'aeap.conf', 'ccss.conf',
  'chan_websocket.conf', 'websocket_client.conf', 'motif.conf', 'unistim.conf', 'pjproject.conf',
  'pjsip_notify.conf', 'pjsip_wizard.conf', 'iaxprov.conf', 'phoneprov_users.conf', 'cdr_adaptive_odbc.conf',
  'cdr_beanstalkd.conf', 'cdr_custom.conf', 'cdr_manager.conf', 'cdr_sqlite3_custom.conf', 'cel_beanstalkd.conf',
  'cel_custom.conf', 'cel_sqlite3_custom.conf', 'res_config_odbc.conf', 'res_config_sqlite3.conf',
  'func_odbc.conf', 'hep.conf', 'res_curl.conf', 'res_http_media_cache.conf', 'cli.conf', 'codecs.conf',
  'dnsmgr.conf', 'dsp.conf', 'enum.conf', 'resolver_unbound.conf', 'res_corosync.conf', 'say.conf', 'smdi.conf',
  'statsd.conf', 'stasis.conf',
].map(r);

const ALL = EXPECTED_CONFIGURABLE_RESOURCES;

/**
 * FreePBX-style task catalogue mapped onto Asterisk/Ding primitives.
 *
 * The five groups mirror Sangoma's current Standard Modules menus. A FreePBX module
 * whose work is ultimately dialplan/configuration maps to the exact Asterisk resources
 * Ding can transact. A module whose live function already exists in Ding delegates to
 * that existing screen. Vendor-branded connectivity modules expose the underlying
 * PJSIP/HTTP/dialplan integration points; they do not claim to reproduce Sangoma's
 * commercial provisioning service or credentials.
 */
export const PBX_FEATURES: ReadonlyArray<PbxFeatureDefinition> = [
  // ---------------------------------------------------------------- Applications
  { id: 'announcements', group: 'Applications', label: 'Announcements', description: 'Play a target recording and route the caller onward.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'amd', group: 'Applications', label: 'Answering Machine Detection', description: 'AMD dialplan tuning applied to inbound call handling.', resources: [r('amd.conf'), r('extensions.conf')] },
  { id: 'dictate', group: 'Applications', label: 'Dictate', description: 'Dictation dialplan application for recording into a mailbox-style destination.', resources: [r('extensions.conf')] },
  { id: 'dynamic-routes', group: 'Applications', label: 'Dynamic Routes', description: 'Conditional dialplan routing driven by runtime state rather than a fixed schedule.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'calendar-event-groups', group: 'Applications', label: 'Calendar Event Groups', description: 'Calendar-backed groups used by time-aware call flow.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'calendar', group: 'Applications', label: 'Calendar', description: 'Calendar sources and dialplan use of calendar state.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'callback', group: 'Applications', label: 'Callback', description: 'Dialplan callback destinations and outbound call handling.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'call-flow-control', group: 'Applications', label: 'Call Flow Control', description: 'Toggleable dialplan branches for operational/day-night modes.', resources: [r('extensions.conf')] },
  { id: 'call-recording', group: 'Applications', label: 'Call Recording', description: 'Dialplan recording policy and recording feature codes.', resources: [r('extensions.conf'), r('features.conf'), r('logger.conf')] },
  { id: 'conferences', group: 'Applications', label: 'Conferences', description: 'ConfBridge bridge and user profiles.', resources: [r('confbridge.conf'), r('meetme.conf')] },
  { id: 'directory', group: 'Applications', label: 'Directory', description: 'Directory destinations driven by extension and voicemail identity data.', resources: [r('extensions.conf'), r('voicemail.conf')] },
  { id: 'disa', group: 'Applications', label: 'DISA', description: 'Direct Inward System Access dialplan entry points and contexts.', resources: [r('extensions.conf')] },
  { id: 'extensions', group: 'Applications', label: 'Extensions', description: 'PJSIP identities, extension dialplan and voicemail boxes.', resources: [r('pjsip.conf'), r('extensions.conf'), r('voicemail.conf')], delegateScreen: 'endpoints' },
  { id: 'follow-me', group: 'Applications', label: 'Follow Me', description: 'Find-me/follow-me dialplan destinations and endpoint routing.', resources: [r('extensions.conf'), r('pjsip.conf'), r('followme.conf')] },
  { id: 'ivr', group: 'Applications', label: 'IVR', description: 'Menus, digit handling, timeouts, destinations and prompt references.', resources: [r('extensions.conf')], tools: ['config', 'media'] },
  { id: 'languages', group: 'Applications', label: 'Languages', description: 'Language-aware dialplan, core language settings and prompt media.', resources: [r('extensions.conf'), r('asterisk.conf'), r('indications.conf')], tools: ['config', 'media'] },
  { id: 'info-services', group: 'Applications', label: 'Info Services', description: 'Feature-code dialplan applications: company directory, call trace, echo test and speaking clock.', resources: [r('extensions.conf')] },
  { id: 'misc-applications', group: 'Applications', label: 'Misc Applications', description: 'Custom feature codes that send callers to selected destinations.', resources: [r('extensions.conf'), r('features.conf')] },
  { id: 'misc-destinations', group: 'Applications', label: 'Misc Destinations', description: 'Reusable custom call targets referenced by other dialplan features.', resources: [r('extensions.conf')] },
  { id: 'missed-call-notification', group: 'Applications', label: 'MissedCall Notification', description: 'Unanswered-call dialplan and manager integration points.', resources: [r('extensions.conf'), r('manager.conf')] },
  { id: 'paging', group: 'Applications', label: 'Paging and Intercom', description: 'Paging/intercom endpoint and dialplan destinations.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'parking', group: 'Applications', label: 'Parking', description: 'Modern Asterisk parking lots plus in-call park feature mapping.', resources: [r('res_parking.conf'), r('features.conf'), r('extensions.conf')] },
  { id: 'queue-priorities', group: 'Applications', label: 'Queue Priorities', description: 'Queue penalty rules and dialplan priority entry points.', resources: [r('queuerules.conf'), r('queues.conf'), r('extensions.conf')] },
  { id: 'queues', group: 'Applications', label: 'Queues', description: 'Queue strategy, members, announcements, penalties and service levels.', resources: [r('queues.conf'), r('queuerules.conf'), r('agents.conf')], delegateScreen: 'queues' },
  { id: 'ring-groups', group: 'Applications', label: 'Ring Groups', description: 'Ordered hunt/ring destinations expressed in the dialplan.', resources: [r('extensions.conf')] },
  { id: 'set-callerid', group: 'Applications', label: 'Set CallerID', description: 'Dialplan CallerID transforms and PJSIP identity policy.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'text-to-speech', group: 'Applications', label: 'Text to Speech', description: 'Festival TTS service configuration and dialplan Festival application use.', resources: [r('festival.conf'), r('extensions.conf')] },
  { id: 'time-conditions', group: 'Applications', label: 'Time Conditions', description: 'Calendar/dialplan routing by time and date.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'time-groups', group: 'Applications', label: 'Time Groups', description: 'Reusable time schedules for dialplan decisions.', resources: [r('calendar.conf'), r('extensions.conf')] },
  { id: 'voicemail-blasting', group: 'Applications', label: 'Voicemail Blasting', description: 'Dialplan fan-out to multiple voicemail boxes.', resources: [r('extensions.conf'), r('voicemail.conf')] },
  { id: 'wake-up-calls', group: 'Applications', label: 'Wake Up Calls', description: 'Calendar and dialplan scheduled call destinations.', resources: [r('calendar.conf'), r('extensions.conf')] },

  // ---------------------------------------------------------------- Connectivity
  { id: 'api', group: 'Connectivity', label: 'API', description: 'AMI, ARI and embedded HTTP integration configuration.', resources: [r('manager.conf'), r('ari.conf'), r('http.conf')], delegateScreen: 'ami' },
  { id: 'call-forwarding', group: 'Connectivity', label: 'Call Forwarding', description: 'Dialplan forwarding destinations and PJSIP behavior.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'call-waiting', group: 'Connectivity', label: 'Call Waiting', description: 'Endpoint/dialplan behavior for additional inbound calls while busy.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'dahdi-dids', group: 'Connectivity', label: 'DAHDI (Analog) Channel DIDs', description: 'Hardware channel DID routing into the dialplan.', resources: [r('chan_dahdi.conf'), r('extensions.conf')] },
  { id: 'dahdi-configs', group: 'Connectivity', label: 'DAHDI Configs', description: 'Analogue, T1/E1 and PRI Asterisk channel configuration.', resources: [r('chan_dahdi.conf')] },
  { id: 'dnd', group: 'Connectivity', label: 'Do Not Disturb', description: 'Endpoint and dialplan routing behavior for blocked ringing.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'firewall', group: 'Connectivity', label: 'Firewall', description: 'Asterisk named ACL and service-level access policy. Operating-system firewall rules remain outside the no-shell boundary.', resources: [r('acl.conf'), r('manager.conf'), r('http.conf')] },
  { id: 'inbound-routes', group: 'Connectivity', label: 'Inbound Routes', description: 'DID/CID matching and inbound dialplan destinations.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'outbound-routes', group: 'Connectivity', label: 'Outbound Routes', description: 'Dial patterns, trunk selection and outbound caller handling.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'sipstation', group: 'Connectivity', label: 'SIPStation', description: 'Underlying PJSIP trunk/registration and route integration points for a SIPStation service.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'trunks', group: 'Connectivity', label: 'Trunks', description: 'PJSIP, IAX2, DAHDI and DUNDi trunk primitives.', resources: [r('pjsip.conf'), r('iax.conf'), r('chan_dahdi.conf'), r('dundi.conf')], delegateScreen: 'trunks' },
  { id: 'vitelity', group: 'Connectivity', label: 'Vitelity', description: 'Underlying PJSIP registration, routing and HTTP integration points for provider service connectivity.', resources: [r('pjsip.conf'), r('extensions.conf'), r('http.conf')] },
  { id: 'bandwidth', group: 'Connectivity', label: 'Bandwidth', description: 'Underlying PJSIP registration, routing and HTTP integration points for provider service connectivity.', resources: [r('pjsip.conf'), r('extensions.conf'), r('http.conf')] },
  { id: 'voip-innovations', group: 'Connectivity', label: 'Voip Innovations', description: 'Underlying PJSIP registration, routing and HTTP integration points for provider service connectivity.', resources: [r('pjsip.conf'), r('extensions.conf'), r('http.conf')] },
  { id: 'nat', group: 'Connectivity', label: 'NAT & STUN', description: 'PJSIP NAT behavior and STUN monitoring.', resources: [r('pjsip.conf'), r('res_stun_monitor.conf')] },
  { id: 'iax-trunks', group: 'Connectivity', label: 'IAX2 Trunks', description: 'IAX2 peers, users and trunking.', resources: [r('iax.conf')] },
  { id: 'sla', group: 'Connectivity', label: 'Shared Line Appearances', description: 'Shared line trunks and stations.', resources: [r('sla.conf')] },
  { id: 'custom-contexts', group: 'Connectivity', label: 'Custom Contexts', description: 'Restricted dialplan contexts with time, pattern and PIN-protected failover access.', resources: [r('extensions.conf'), r('acl.conf')] },
  { id: 'dundi', group: 'Connectivity', label: 'DUNDi', description: 'Distributed dialplan lookup and peer policy.', resources: [r('dundi.conf')] },

  // ---------------------------------------------------------------- Administration
  { id: 'freepbx-catalog', group: 'Administration', label: 'FreePBX Module Catalog', description: 'Published and locally observed FreePBX modules, dependencies, entitlements and action capabilities.', resources: [] },
  { id: 'administrators', group: 'Administration', label: 'Administrators', description: 'Asterisk console-user permissions; Ding desktop itself remains local-user scoped.', resources: [r('cli_permissions.conf')] },
  { id: 'accountcode-preserve', group: 'Administration', label: 'Account Code Preserve', description: 'Dialplan account-code propagation across transfer and forward, reflected in CDR.', resources: [r('extensions.conf'), r('cdr.conf')] },
  { id: 'allowlist', group: 'Administration', label: 'Allowlist', description: 'Dialplan allow-listing and Asterisk access permission, the counterpart to Blacklist.', resources: [r('extensions.conf'), r('acl.conf')] },
  { id: 'custom-apps-registration', group: 'Administration', label: 'Custom Applications Registration', description: 'Named custom dialplan applications registered for reuse by other routing features.', resources: [r('extensions.conf')] },
  { id: 'outbound-cnam', group: 'Administration', label: 'Outbound CNAM', description: 'PJSIP identity and dialplan CallerID name applied to outbound calls.', resources: [r('pjsip.conf'), r('extensions.conf')] },
  { id: 'asterisk-cli', group: 'Administration', label: 'Asterisk CLI', description: 'Asterisk CLI visibility plus alias/permission configuration.', resources: [r('cli_aliases.conf'), r('cli_permissions.conf')], delegateScreen: 'cli' },
  { id: 'backup', group: 'Administration', label: 'Backup and Restore', description: 'Transactional recovery points across every allowlisted Asterisk configuration resource.', resources: ALL, tools: ['history'] },
  { id: 'blacklist', group: 'Administration', label: 'Blacklist', description: 'Dialplan number blocking and Asterisk access restrictions.', resources: [r('extensions.conf'), r('acl.conf')] },
  { id: 'bulk-config', group: 'Administration', label: 'Bulk Handler', description: 'Structured bulk access to the complete allowlisted Asterisk configuration surface.', resources: ALL },
  { id: 'callerid-lookup', group: 'Administration', label: 'CallerID Lookup Sources', description: 'Dialplan and HTTP integration for caller identity lookups.', resources: [r('extensions.conf'), r('http.conf')] },
  { id: 'certificates', group: 'Administration', label: 'Certificate Management', description: 'HTTP TLS, PJSIP TLS transports and STIR/SHAKEN certificate references.', resources: [r('http.conf'), r('pjsip.conf'), r('stir_shaken.conf')] },
  { id: 'cid-superfecta', group: 'Administration', label: 'CID Superfecta', description: 'Composable caller-ID lookup integration via dialplan and HTTP resources.', resources: [r('extensions.conf'), r('http.conf')] },
  { id: 'config-file-editor', group: 'Administration', label: 'Configuration File Editor', description: 'Structured, allowlisted Asterisk configuration editing with live preview and rollback.', resources: ALL },
  { id: 'contact-manager', group: 'Administration', label: 'Contact Manager', description: 'PJSIP endpoint/contact configuration and the existing live contact view.', resources: [r('pjsip.conf')], delegateScreen: 'endpoints' },
  { id: 'custom-destinations', group: 'Administration', label: 'Custom Destinations', description: 'Named custom dialplan entry points for routing features.', resources: [r('extensions.conf')] },
  { id: 'custom-extensions', group: 'Administration', label: 'Custom Extensions', description: 'Custom extension dialplan entries and endpoint associations.', resources: [r('extensions.conf'), r('pjsip.conf')] },
  { id: 'notifications', group: 'Administration', label: 'Notifications', description: 'System event and log-channel visibility surfaced without inventing a persistent alert store.', resources: [r('logger.conf'), r('manager.conf')] },
  { id: 'feature-codes', group: 'Administration', label: 'Feature Codes', description: 'Transfer, pickup, record and other in-call feature mappings.', resources: [r('features.conf'), r('extensions.conf')] },
  { id: 'module-admin', group: 'Administration', label: 'Module Admin', description: 'Asterisk module load policy and live module state.', resources: [r('modules.conf')], delegateScreen: 'modules' },
  { id: 'phonebook', group: 'Administration', label: 'Phonebook', description: 'A contact list used as the data source for CallerID lookup and speed dial destinations.', resources: [r('extensions.conf')] },
  { id: 'rest-api', group: 'Administration', label: 'REST API', description: 'Embedded HTTP REST endpoint configuration, distinct from the GraphQL API service.', resources: [r('http.conf')] },
  { id: 'presence-state', group: 'Administration', label: 'Presence State', description: 'Dialplan presence/hint state definitions.', resources: [r('extensions.conf')] },
  { id: 'sound-languages', group: 'Administration', label: 'Sound Languages', description: 'Core language/tone configuration plus prompt media.', resources: [r('asterisk.conf'), r('indications.conf')], tools: ['config', 'media'] },
  { id: 'system-admin', group: 'Administration', label: 'System Admin', description: 'Ding deployment/runtime/server controls plus Asterisk process and HTTP settings.', resources: [r('asterisk.conf'), r('http.conf'), r('logger.conf')], delegateScreen: 'servers' },
  { id: 'system-recordings', group: 'Administration', label: 'System Recordings', description: 'Validated Asterisk prompt recordings in the target media library.', resources: [], tools: ['media'] },
  { id: 'user-management', group: 'Administration', label: 'User Management', description: 'Asterisk console-user permission policy and extension identity configuration.', resources: [r('cli_permissions.conf'), r('pjsip.conf'), r('voicemail.conf')] },
  { id: 'admin-voicemail', group: 'Administration', label: 'Voicemail', description: 'Mailbox policy, storage behavior and greetings.', resources: [r('voicemail.conf')], tools: ['config', 'media'], delegateScreen: 'voicemail' },
  { id: 'stir-shaken', group: 'Administration', label: 'STIR/SHAKEN', description: 'Outbound attestation and inbound verification profiles.', resources: [r('stir_shaken.conf')], delegateScreen: 'stirshaken' },
  { id: 'geolocation', group: 'Administration', label: 'Emergency Geolocation', description: 'Emergency-services location profiles.', resources: [r('geolocation.conf')], delegateScreen: 'geolocation' },
  { id: 'phoneprov', group: 'Administration', label: 'Phone Provisioning', description: 'Handset provisioning profiles and files.', resources: [r('phoneprov.conf')], delegateScreen: 'phoneprov' },
  { id: 'realtime', group: 'Administration', label: 'Realtime & Database Backends', description: 'ODBC, PostgreSQL, LDAP, extconfig and Sorcery mappings.', resources: [r('res_odbc.conf'), r('extconfig.conf'), r('sorcery.conf'), r('res_pgsql.conf'), r('res_ldap.conf')] },
  { id: 'monitoring', group: 'Administration', label: 'Monitoring', description: 'Prometheus and SNMP telemetry exports.', resources: [r('prometheus.conf'), r('res_snmp.conf')] },
  { id: 'xmpp', group: 'Administration', label: 'XMPP Messaging', description: 'XMPP client and messaging integration.', resources: [r('xmpp.conf')] },
  { id: 'adsi', group: 'Administration', label: 'Caller Display / ADSI', description: 'ADSI and legacy caller-display service settings.', resources: [r('adsi.conf')] },

  // ---------------------------------------------------------------- Reports
  { id: 'asterisk-info', group: 'Reports', label: 'Asterisk Info', description: 'Live Asterisk system information.', resources: [r('asterisk.conf')], delegateScreen: 'about' },
  { id: 'asterisk-logfiles', group: 'Reports', label: 'Asterisk Logfiles', description: 'Live log-channel visibility and logger configuration.', resources: [r('logger.conf')], delegateScreen: 'logger' },
  { id: 'cel', group: 'Reports', label: 'Call Event Logging', description: 'Detailed channel event logging and database backends.', resources: [r('cel.conf'), r('cel_odbc.conf'), r('cel_pgsql.conf')] },
  { id: 'cdr', group: 'Reports', label: 'CDR Reports', description: 'Call-detail-record policy and database backends.', resources: [r('cdr.conf'), r('cdr_odbc.conf'), r('cdr_pgsql.conf')], delegateScreen: 'cdr' },
  { id: 'system-status', group: 'Reports', label: 'FreePBX System Status', description: 'Ding dashboard/runtime status equivalent using live Asterisk readings.', resources: [], delegateScreen: 'dash' },
  { id: 'print-extensions', group: 'Reports', label: 'Print Extensions', description: 'Live endpoint inventory suitable for extension listing/export workflows.', resources: [r('pjsip.conf')], delegateScreen: 'endpoints' },
  { id: 'weak-password-detection', group: 'Reports', label: 'Weak Password Detection', description: 'Authentication objects exposed for credential-policy review without inventing a score.', resources: [r('pjsip.conf'), r('manager.conf'), r('ari.conf')] },
  { id: 'fax', group: 'Reports', label: 'Fax & T.38', description: 'Fax engine settings and UDPTL transport behavior.', resources: [r('res_fax.conf'), r('udptl.conf')], delegateScreen: 'fax' },

  // ---------------------------------------------------------------- Settings
  { id: 'advanced', group: 'Settings', label: 'Advanced Settings', description: 'Complete allowlisted Asterisk configuration surface.', resources: ALL },
  { id: 'iax-settings', group: 'Settings', label: 'Asterisk IAX Settings', description: 'IAX2 global, peer and user configuration.', resources: [r('iax.conf')] },
  { id: 'logfile-settings', group: 'Settings', label: 'Asterisk Logfile Settings', description: 'Logger channels, rotation and queue logging.', resources: [r('logger.conf')], delegateScreen: 'logger' },
  { id: 'ami-settings', group: 'Settings', label: 'Asterisk Managers Interface', description: 'AMI bind, authentication and privilege configuration.', resources: [r('manager.conf')], delegateScreen: 'ami' },
  { id: 'ari-settings', group: 'Settings', label: 'Asterisk REST Interface Users', description: 'ARI users, CORS and embedded HTTP service settings.', resources: [r('ari.conf'), r('http.conf')], delegateScreen: 'ami' },
  { id: 'sip-settings', group: 'Settings', label: 'Asterisk SIP Settings', description: 'Global PJSIP transports, endpoints and registrations.', resources: [r('pjsip.conf')] },
  { id: 'extension-settings', group: 'Settings', label: 'Extension Settings', description: 'PJSIP endpoint defaults plus extension dialplan and voicemail.', resources: [r('pjsip.conf'), r('extensions.conf'), r('voicemail.conf')] },
  { id: 'fax-settings', group: 'Settings', label: 'Fax Configuration', description: 'Fax engine and UDPTL transport settings.', resources: [r('res_fax.conf'), r('udptl.conf')], delegateScreen: 'fax' },
  { id: 'filestore', group: 'Settings', label: 'Filestore', description: 'Asterisk data/spool/media directory settings and media storage roots.', resources: [r('asterisk.conf')], tools: ['config', 'media'] },
  { id: 'moh-settings', group: 'Settings', label: 'Music on Hold', description: 'Music-on-hold classes and target media.', resources: [r('musiconhold.conf')], tools: ['config', 'media'], delegateScreen: 'moh' },
  { id: 'pin-sets', group: 'Settings', label: 'Pin Sets', description: 'Dialplan PIN/authentication gates for protected destinations.', resources: [r('extensions.conf')] },
  { id: 'route-congestion', group: 'Settings', label: 'Route Congestion Messages', description: 'Dialplan failure routing, indication tones and prompt playback.', resources: [r('extensions.conf'), r('indications.conf')], tools: ['config', 'media'] },
  { id: 'tts-engines', group: 'Settings', label: 'Text to Speech Engines', description: 'Festival text-to-speech engine endpoint, cache and command settings.', resources: [r('festival.conf')] },
  { id: 'voicemail-admin', group: 'Settings', label: 'Voicemail Admin', description: 'Global voicemail policy, mailbox configuration and greetings.', resources: [r('voicemail.conf')], tools: ['config', 'media'], delegateScreen: 'voicemail' },
  { id: 'rtp', group: 'Settings', label: 'RTP & Media', description: 'RTP port range, strict RTP and ICE behavior.', resources: [r('rtp.conf')], delegateScreen: 'codecs' },
];

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
 * The editor is structured rather than a raw text area. These checks do not claim to
 * validate every Asterisk subsystem semantic; they refuse shapes that render into an
 * ambiguous/malformed INI line before a live plan is requested. Typed backend models
 * perform additional semantic validation in StructuredConfigPlanner.
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
