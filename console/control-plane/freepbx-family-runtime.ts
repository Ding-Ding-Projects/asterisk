import type { ConfigValue } from './config-transaction.js';
import { ConfigTransaction, StructuredConfigPlanner } from './config-transaction.js';
import { WslConfigTransport, assertConfigurable } from './wsl-config-transport.js';
import type { ProcessExecutor } from './executor.js';
import type { TargetProfile } from './contracts.js';

export interface FreePbxFamilyCatalogModule {
  moduleId: string;
  name: string;
  version: string;
  configurationResources: ReadonlyArray<string>;
  uiFamilies: ReadonlyArray<string>;
  apiCapabilities: ReadonlyArray<string>;
  sourceRevision: string | null;
  entitlementClass: 'open' | 'commercial' | 'unknown';
  availabilityReason: string;
}

export interface FreePbxFamilySchema {
  moduleId: string;
  familyId: string;
  title: string;
  resources: ReadonlyArray<string>;
  backend: 'config-transaction' | 'published-api' | 'metadata-only';
  fields: ReadonlyArray<{ key: string; source: 'target-config' | 'target-entity' | 'published-api' | 'module-metadata'; kind: string }>;
  readback: 'config-and-entity' | 'published-api' | 'module-state' | 'metadata-only';
  unavailableReason?: string;
}

export interface FreePbxFamilyRuntimeOptions {
  executor: ProcessExecutor;
  target: Pick<TargetProfile, 'id' | 'connectionKind' | 'wslDistribution' | 'dockerContext'>;
  catalog: ReadonlyArray<FreePbxFamilyCatalogModule>;
}

const FAMILY_BACKENDS: Readonly<Record<string, { backend: FreePbxFamilySchema['backend']; readback: FreePbxFamilySchema['readback']; fields: ReadonlyArray<{ key: string; source: FreePbxFamilySchema['fields'][number]['source']; kind: string }> }>> = {
  'extensions-users-devices': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'entityId', source: 'target-entity', kind: 'entity-picker' }, { key: 'displayName', source: 'target-entity', kind: 'text' }, { key: 'enabled', source: 'target-entity', kind: 'switch' }] },
  trunks: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'section', source: 'target-config', kind: 'select' }, { key: 'setting', source: 'target-config', kind: 'text' }] },
  'inbound-routes': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'did', source: 'target-entity', kind: 'text' }, { key: 'destination', source: 'target-entity', kind: 'select' }] },
  'outbound-routes': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'dialPattern', source: 'target-entity', kind: 'text' }, { key: 'trunk', source: 'target-entity', kind: 'select' }] },
  'dial-patterns': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'pattern', source: 'target-config', kind: 'text' }] },
  'feature-codes': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'code', source: 'target-config', kind: 'text' }, { key: 'destination', source: 'target-config', kind: 'select' }] },
  ivr: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'menu', source: 'target-entity', kind: 'entity-picker' }, { key: 'prompt', source: 'target-entity', kind: 'media-picker' }] },
  queues: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'queue', source: 'target-entity', kind: 'entity-picker' }, { key: 'member', source: 'target-entity', kind: 'entity-picker' }] },
  'ring-groups': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'group', source: 'target-entity', kind: 'entity-picker' }] },
  announcements: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'recording', source: 'target-entity', kind: 'media-picker' }] },
  recordings: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'file', source: 'target-entity', kind: 'media-picker' }] },
  'music-on-hold': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'class', source: 'target-entity', kind: 'entity-picker' }] },
  'time-groups-conditions': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'start', source: 'target-entity', kind: 'text' }, { key: 'end', source: 'target-entity', kind: 'text' }] },
  'call-flow-day-night': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'mode', source: 'target-entity', kind: 'switch' }] },
  conferences: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'room', source: 'target-entity', kind: 'entity-picker' }] },
  'paging-intercom': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'group', source: 'target-entity', kind: 'entity-picker' }] },
  parking: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'lot', source: 'target-config', kind: 'entity-picker' }] },
  voicemail: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'mailbox', source: 'target-entity', kind: 'entity-picker' }, { key: 'greeting', source: 'target-entity', kind: 'media-picker' }] },
  directory: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'source', source: 'target-entity', kind: 'select' }] },
  'follow-me-find-me': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'number', source: 'target-entity', kind: 'text' }] },
  dnd: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'enabled', source: 'target-entity', kind: 'switch' }] },
  'call-waiting': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'enabled', source: 'target-entity', kind: 'switch' }] },
  'call-forwarding': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'destination', source: 'target-entity', kind: 'text' }] },
  blacklist: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'number', source: 'target-entity', kind: 'text' }] },
  'caller-id': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'source', source: 'published-api', kind: 'select' }] },
  languages: { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'language', source: 'target-config', kind: 'select' }] },
  'misc-apps': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'application', source: 'target-entity', kind: 'entity-picker' }] },
  'misc-destinations': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'destination', source: 'target-entity', kind: 'entity-picker' }] },
  'call-recording': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'policy', source: 'target-config', kind: 'select' }] },
  contacts: { backend: 'published-api', readback: 'published-api', fields: [{ key: 'contact', source: 'published-api', kind: 'entity-picker' }] },
  'calendar-presence': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'calendar', source: 'published-api', kind: 'entity-picker' }] },
  'cdr-cel-reports': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'report', source: 'published-api', kind: 'select' }] },
  'certificates-tls': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'certificate', source: 'published-api', kind: 'entity-picker' }] },
  'firewall-security': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'rule', source: 'target-config', kind: 'text' }] },
  'sip-settings': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'transport', source: 'target-config', kind: 'select' }] },
  'dahdi-iax-pjsip': { backend: 'config-transaction', readback: 'config-and-entity', fields: [{ key: 'channel', source: 'target-config', kind: 'entity-picker' }] },
  'backup-restore': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'job', source: 'published-api', kind: 'select' }] },
  'module-admin': { backend: 'published-api', readback: 'module-state', fields: [{ key: 'module', source: 'module-metadata', kind: 'entity-picker' }] },
  'system-admin': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'setting', source: 'published-api', kind: 'select' }] },
  'ucp-webrtc': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'capability', source: 'published-api', kind: 'select' }] },
  api: { backend: 'published-api', readback: 'published-api', fields: [{ key: 'resource', source: 'published-api', kind: 'select' }] },
  'jobs-scheduler': { backend: 'published-api', readback: 'published-api', fields: [{ key: 'job', source: 'published-api', kind: 'entity-picker' }] },
  notifications: { backend: 'published-api', readback: 'published-api', fields: [{ key: 'channel', source: 'published-api', kind: 'entity-picker' }] },
  diagnostics: { backend: 'published-api', readback: 'published-api', fields: [{ key: 'report', source: 'published-api', kind: 'select' }] },
};

export class FreePbxFamilyRuntime {
  readonly #executor: ProcessExecutor;
  readonly #target: FreePbxFamilyRuntimeOptions['target'];
  readonly #catalog: ReadonlyArray<FreePbxFamilyCatalogModule>;

  constructor(options: FreePbxFamilyRuntimeOptions) {
    this.#executor = options.executor;
    this.#target = options.target;
    this.#catalog = options.catalog;
  }

  schema(moduleId: string): FreePbxFamilySchema {
    const module = this.#catalog.find((entry) => entry.moduleId === moduleId);
    if (!module) throw new Error('The module is not present in the pinned catalog.');
    const familyId = module.uiFamilies[0] ?? 'other';
    const policy = FAMILY_BACKENDS[familyId];
    if (!policy) return { moduleId, familyId, title: module.name, resources: module.configurationResources, backend: 'metadata-only', fields: [], readback: 'metadata-only', unavailableReason: 'This module family has no bounded entity or published API backend.' };
    if (policy.backend === 'published-api' && module.apiCapabilities.length === 0) return { moduleId, familyId, title: module.name, resources: module.configurationResources, backend: 'metadata-only', fields: policy.fields, readback: 'metadata-only', unavailableReason: 'The family requires a published API, but this module publishes no API capability.' };
    if (policy.backend === 'published-api') return { moduleId, familyId, title: module.name, resources: module.configurationResources, backend: 'published-api', fields: policy.fields, readback: policy.readback, unavailableReason: 'The module publishes an API capability label, but no endpoint, method, and authentication contract is present in the official metadata. No invented API request is enabled.' };
    if (policy.fields.some((field) => field.source !== 'target-config')) return { moduleId, familyId, title: module.name, resources: module.configurationResources, backend: 'metadata-only', fields: policy.fields, readback: 'metadata-only', unavailableReason: 'This family mixes entity fields with configuration fields, but no approved entity route is available. The fields are shown for provenance and remain non-actionable.' };
    return { moduleId, familyId, title: module.name, resources: module.configurationResources, backend: policy.backend, fields: policy.fields, readback: policy.readback };
  }

  async read(moduleId: string): Promise<{ schema: FreePbxFamilySchema; values: Record<string, ConfigValue>; observedAt: string }> {
    const schema = this.schema(moduleId);
    if (schema.backend !== 'config-transaction') return { schema, values: {}, observedAt: new Date().toISOString() };
    const transport = new WslConfigTransport({ executor: this.#executor, target: this.#target });
    const values: Record<string, ConfigValue> = {};
    for (const resource of schema.resources) values[resource] = await transport.read(assertConfigurable(resource));
    return { schema, values, observedAt: new Date().toISOString() };
  }

  async plan(moduleId: string, targetId: string, documents: ReadonlyArray<{ resource: string; value: ConfigValue }>): Promise<unknown> {
    const schema = this.schema(moduleId);
    if (schema.backend !== 'config-transaction') throw new Error(schema.unavailableReason ?? 'This family has no configuration transaction backend.');
    const transport = new WslConfigTransport({ executor: this.#executor, target: this.#target });
    const checked = documents.map((document) => ({ resource: assertConfigurable(document.resource), value: document.value }));
    return new StructuredConfigPlanner().createPlan(`freepbx-family-${moduleId}-${Date.now()}`, targetId, checked, transport);
  }

  async apply(moduleId: string, targetId: string, documents: ReadonlyArray<{ resource: string; value: ConfigValue }>): Promise<unknown> {
    const schema = this.schema(moduleId);
    if (schema.backend !== 'config-transaction') throw new Error(schema.unavailableReason ?? 'This family has no configuration transaction backend.');
    const transport = new WslConfigTransport({ executor: this.#executor, target: this.#target });
    const checked = documents.map((document) => ({ resource: assertConfigurable(document.resource), value: document.value }));
    const plan = await new StructuredConfigPlanner().createPlan(`freepbx-family-${moduleId}-${Date.now()}`, targetId, checked, transport);
    return new ConfigTransaction(transport).apply(plan);
  }
}
