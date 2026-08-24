import { FREEPBX_MODULE_CATALOG, type FreePbxModuleCatalogEntry } from './freepbx-module-catalog';

export type FreePbxAdapterKind = 'config' | 'entity' | 'published-api' | 'mixed' | 'metadata-only';

export interface FreePbxAdapterField {
  key: string;
  label: string;
  kind: 'text' | 'select' | 'switch' | 'number' | 'entity-picker' | 'media-picker';
  source: 'target-config' | 'target-entity' | 'published-api' | 'module-metadata';
  required: boolean;
}

export interface FreePbxFamilyAdapter {
  familyId: string;
  kind: FreePbxAdapterKind;
  entityName: string;
  fields: ReadonlyArray<FreePbxAdapterField>;
  readback: 'config-and-entity' | 'published-api' | 'module-state' | 'metadata-only';
  backup: 'files-and-database' | 'files-only' | 'published-api-transaction' | 'none';
  unavailableReason: string;
}

export interface FreePbxModuleAdapter {
  moduleId: string;
  familyId: string;
  name: string;
  version: string;
  resources: ReadonlyArray<string>;
  dependencies: ReadonlyArray<{ moduleId: string; version: string }>;
  commands: ReadonlyArray<{ name: string; class: string }>;
  apiCapabilities: ReadonlyArray<string>;
  entitlementClass: FreePbxModuleCatalogEntry['entitlementClass'];
  adapter: FreePbxFamilyAdapter;
  unavailableReason: string;
}

const CONFIG_FIELDS: ReadonlyArray<FreePbxAdapterField> = [
  { key: 'section', label: 'Configuration section', kind: 'select', source: 'target-config', required: true },
  { key: 'setting', label: 'Configuration setting', kind: 'text', source: 'target-config', required: true },
  { key: 'value', label: 'Current target value', kind: 'text', source: 'target-config', required: false },
];

const ENTITY_FIELDS: ReadonlyArray<FreePbxAdapterField> = [
  { key: 'entityId', label: 'Target entity', kind: 'entity-picker', source: 'target-entity', required: true },
  { key: 'displayName', label: 'Display name', kind: 'text', source: 'target-entity', required: true },
  { key: 'enabled', label: 'Enabled', kind: 'switch', source: 'target-entity', required: true },
];

const API_FIELDS: ReadonlyArray<FreePbxAdapterField> = [
  { key: 'resource', label: 'Published API resource', kind: 'select', source: 'published-api', required: true },
  { key: 'operation', label: 'Published operation', kind: 'select', source: 'published-api', required: true },
  { key: 'payload', label: 'Validated request payload', kind: 'text', source: 'published-api', required: false },
];

const MEDIA_FIELDS: ReadonlyArray<FreePbxAdapterField> = [
  { key: 'mediaFile', label: 'Target media file', kind: 'media-picker', source: 'target-entity', required: true },
  { key: 'enabled', label: 'Enabled', kind: 'switch', source: 'target-entity', required: true },
];

const FAMILY_POLICIES: Readonly<Record<string, { kind: FreePbxAdapterKind; entity: string; fields: ReadonlyArray<FreePbxAdapterField>; readback: FreePbxFamilyAdapter['readback']; backup: FreePbxFamilyAdapter['backup'] }>> = {
  'extensions-users-devices': { kind: 'mixed', entity: 'extension', fields: [...ENTITY_FIELDS, ...CONFIG_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  trunks: { kind: 'config', entity: 'trunk', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'inbound-routes': { kind: 'config', entity: 'inbound-route', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'outbound-routes': { kind: 'config', entity: 'outbound-route', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'dial-patterns': { kind: 'config', entity: 'dial-pattern', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'feature-codes': { kind: 'config', entity: 'feature-code', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  ivr: { kind: 'mixed', entity: 'ivr', fields: [...ENTITY_FIELDS, ...MEDIA_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  queues: { kind: 'mixed', entity: 'queue', fields: [...ENTITY_FIELDS, ...CONFIG_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  'ring-groups': { kind: 'entity', entity: 'ring-group', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  announcements: { kind: 'mixed', entity: 'announcement', fields: [...CONFIG_FIELDS, ...MEDIA_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  recordings: { kind: 'entity', entity: 'recording', fields: MEDIA_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'music-on-hold': { kind: 'entity', entity: 'music-class', fields: MEDIA_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'time-groups-conditions': { kind: 'config', entity: 'time-condition', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'call-flow-day-night': { kind: 'entity', entity: 'call-flow', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  conferences: { kind: 'mixed', entity: 'conference', fields: [...ENTITY_FIELDS, ...CONFIG_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  'paging-intercom': { kind: 'entity', entity: 'paging-group', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  parking: { kind: 'config', entity: 'parking-lot', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  voicemail: { kind: 'mixed', entity: 'mailbox', fields: [...ENTITY_FIELDS, ...MEDIA_FIELDS], readback: 'config-and-entity', backup: 'files-and-database' },
  directory: { kind: 'entity', entity: 'directory', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'follow-me-find-me': { kind: 'entity', entity: 'follow-me', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  dnd: { kind: 'entity', entity: 'dnd', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'call-waiting': { kind: 'entity', entity: 'call-waiting', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'call-forwarding': { kind: 'entity', entity: 'call-forwarding', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  blacklist: { kind: 'entity', entity: 'blacklist-entry', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'caller-id': { kind: 'mixed', entity: 'caller-id-source', fields: [...ENTITY_FIELDS, ...API_FIELDS], readback: 'published-api', backup: 'published-api-transaction' },
  languages: { kind: 'config', entity: 'language', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'misc-apps': { kind: 'entity', entity: 'misc-application', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'misc-destinations': { kind: 'entity', entity: 'misc-destination', fields: ENTITY_FIELDS, readback: 'config-and-entity', backup: 'files-and-database' },
  'call-recording': { kind: 'config', entity: 'recording-policy', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  contacts: { kind: 'entity', entity: 'contact', fields: ENTITY_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  'calendar-presence': { kind: 'mixed', entity: 'calendar-event', fields: [...ENTITY_FIELDS, ...API_FIELDS], readback: 'published-api', backup: 'published-api-transaction' },
  'cdr-cel-reports': { kind: 'published-api', entity: 'report', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  'certificates-tls': { kind: 'mixed', entity: 'certificate', fields: [...CONFIG_FIELDS, ...API_FIELDS], readback: 'published-api', backup: 'published-api-transaction' },
  'firewall-security': { kind: 'config', entity: 'acl-rule', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'sip-settings': { kind: 'config', entity: 'sip-setting', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'dahdi-iax-pjsip': { kind: 'config', entity: 'channel-setting', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  'backup-restore': { kind: 'published-api', entity: 'recovery-point', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  'module-admin': { kind: 'published-api', entity: 'module', fields: API_FIELDS, readback: 'module-state', backup: 'files-and-database' },
  'system-admin': { kind: 'mixed', entity: 'system-setting', fields: [...CONFIG_FIELDS, ...API_FIELDS], readback: 'published-api', backup: 'published-api-transaction' },
  'ucp-webrtc': { kind: 'published-api', entity: 'portal-capability', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  api: { kind: 'published-api', entity: 'api-resource', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  'jobs-scheduler': { kind: 'published-api', entity: 'job', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  notifications: { kind: 'published-api', entity: 'notification-channel', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  diagnostics: { kind: 'published-api', entity: 'diagnostic-report', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  admin: { kind: 'metadata-only', entity: 'administration-module', fields: [], readback: 'metadata-only', backup: 'none' },
  'ami-api': { kind: 'published-api', entity: 'ami-resource', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  applications: { kind: 'config', entity: 'application-module', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  connectivity: { kind: 'config', entity: 'connectivity-module', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  dashboard: { kind: 'published-api', entity: 'dashboard-reading', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  development: { kind: 'metadata-only', entity: 'development-module', fields: [], readback: 'metadata-only', backup: 'none' },
  'iax-settings': { kind: 'config', entity: 'iax-setting', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  reports: { kind: 'published-api', entity: 'report', fields: API_FIELDS, readback: 'published-api', backup: 'published-api-transaction' },
  settings: { kind: 'config', entity: 'setting-module', fields: CONFIG_FIELDS, readback: 'config-and-entity', backup: 'files-only' },
  uncategorized: { kind: 'metadata-only', entity: 'uncategorized-module', fields: [], readback: 'metadata-only', backup: 'none' },
  other: { kind: 'metadata-only', entity: 'unmapped-module', fields: [], readback: 'metadata-only', backup: 'none' },
};

const FALLBACK: FreePbxFamilyAdapter = {
  familyId: 'other', kind: 'metadata-only', entityName: 'unmapped-module', fields: [], readback: 'metadata-only', backup: 'none',
  unavailableReason: 'No native family adapter is published for this module, so it remains metadata-only until a bounded adapter is reviewed.',
};

export const FREEPBX_FAMILY_ADAPTERS: Readonly<Record<string, FreePbxFamilyAdapter>> = Object.fromEntries(
  Object.entries(FAMILY_POLICIES).map(([familyId, policy]) => [familyId, { ...policy, familyId, unavailableReason: policy.kind === 'metadata-only' ? 'This family has no writable native resource or published API in the current console.' : 'Target values and the selected module capability must be read before this adapter can write.' }]),
);

export function moduleAdapterFor(module: FreePbxModuleCatalogEntry): FreePbxModuleAdapter {
  const familyId = module.uiFamilies[0] ?? 'other';
  const adapter = FREEPBX_FAMILY_ADAPTERS[familyId] ?? FALLBACK;
  return {
    moduleId: module.moduleId,
    familyId: adapter.familyId,
    name: module.name,
    version: module.version,
    resources: module.configurationResources,
    dependencies: module.dependencies,
    commands: module.fwconsoleCommands,
    apiCapabilities: module.apiCapabilities,
    entitlementClass: module.entitlementClass,
    adapter,
    unavailableReason: module.entitlementClass === 'commercial'
      ? 'Commercial entitlement requires the vendor license and is not claimed by this console.'
      : module.availability.reason,
  };
}

export const FREEPBX_MODULE_ADAPTERS: ReadonlyArray<FreePbxModuleAdapter> = FREEPBX_MODULE_CATALOG.modules.map(moduleAdapterFor);

export function adapterForModuleId(moduleId: string): FreePbxModuleAdapter | undefined {
  return FREEPBX_MODULE_ADAPTERS.find((adapter) => adapter.moduleId === moduleId);
}
