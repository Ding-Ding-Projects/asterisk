import type { ConfigValue } from './configuration';
import type { PbxFeatureDefinition } from './pbx-admin-model';
import { findFreePbxModule, type FreePbxCommand, type FreePbxModuleCatalogEntry } from './freepbx-module-catalog';
import { lookupFieldControl } from '../../../control-plane/field-control-catalog';

export type FreePbxFieldKind = 'text' | 'select' | 'switch' | 'number';
export type FreePbxModuleAction = 'install' | 'enable' | 'disable' | 'update' | 'remove';

export interface FreePbxModuleField {
  id: string;
  label: string;
  kind: FreePbxFieldKind;
  value: string | boolean;
  options: string[];
  resource: string;
  section: string;
  key: string;
  readOnlyReason?: string;
}

export interface FreePbxModuleFormSchema {
  moduleId: string;
  title: string;
  description: string;
  resources: string[];
  fields: FreePbxModuleField[];
  commands: FreePbxCommand[];
  actions: Array<{ action: FreePbxModuleAction; enabled: boolean; reason: string }>;
  status: { state: 'metadata-only' | 'unavailable'; reason: string };
}

export interface FreePbxModuleActionRequest {
  moduleId: string;
  action: FreePbxModuleAction;
  targetId: string;
  confirmationRequired: boolean;
  expectedRevision: string | null;
}

export interface FreePbxFieldIssue {
  fieldId: string;
  message: string;
}

const booleanValues = new Set(['yes', 'no']);

function fieldKind(value: string): FreePbxFieldKind {
  if (booleanValues.has(value.trim().toLowerCase())) return 'switch';
  if (/^-?\d+(?:\.\d+)?$/u.test(value.trim())) return 'number';
  return 'text';
}

function resourceBasename(resource: string): string {
  return resource.slice(resource.lastIndexOf('/') + 1);
}

function fieldOptions(entries: Array<{ value: string }>, current: string): string[] {
  const values = [...new Set(entries.map((entry) => entry.value).filter((value) => value.length > 0))];
  if (current && !values.includes(current)) values.unshift(current);
  return values;
}

function safeModuleActionState(module: FreePbxModuleCatalogEntry): Array<{ action: FreePbxModuleAction; enabled: boolean; reason: string }> {
  const commercial = module.entitlementClass === 'commercial';
  const unavailable = module.availability.state === 'unavailable';
  const blocked = commercial
    ? 'The published module declares commercial or proprietary entitlement; no vendor license is present.'
    : unavailable
      ? module.availability.reason
      : 'The current target has not provided a verified runtime capability record.';
  return (['install', 'enable', 'disable', 'update', 'remove'] as const).map((action) => ({
    action,
    enabled: false,
    reason: blocked,
  }));
}

/**
 * Build a native form description from the selected module's catalog metadata and
 * the exact configuration value read from the target. No sample value is inserted.
 * Empty live configuration therefore produces an empty field list, not fake defaults.
 */
export function buildFreePbxModuleForm(
  moduleId: string,
  feature: PbxFeatureDefinition | undefined,
  resources: ReadonlyArray<string>,
  liveValue: ConfigValue | undefined,
): FreePbxModuleFormSchema | undefined {
  const module = findFreePbxModule(moduleId);
  if (!module) return undefined;
  const effectiveResources = [...new Set(resources.length > 0 ? resources : module.configurationResources)];
  const fields: FreePbxModuleField[] = [];
  for (const [sectionIndex, section] of (liveValue ?? []).entries()) {
    for (const [entryIndex, entry] of section.entries.entries()) {
      const kind = fieldKind(entry.value);
      const resource = effectiveResources[0] ?? '';
      const enumControl = lookupFieldControl(resourceBasename(resource), entry.key);
      const effectiveKind: FreePbxFieldKind = enumControl ? 'select' : kind;
      fields.push({
        id: `freepbx:${moduleId}:${sectionIndex}:${entryIndex}`,
        label: entry.key || `Setting ${entryIndex + 1}`,
        kind: effectiveKind,
        value: effectiveKind === 'switch' ? entry.value.trim().toLowerCase() === 'yes' : entry.value,
        options: enumControl ? [...enumControl.options] : [],
        resource,
        section: section.name,
        key: entry.key,
        readOnlyReason: module.availability.state === 'unavailable' ? module.availability.reason : undefined,
      });
    }
  }
  return {
    moduleId,
    title: feature?.label ?? module.name,
    description: feature?.description ?? module.description,
    resources: effectiveResources,
    fields,
    commands: module.fwconsoleCommands,
    actions: safeModuleActionState(module),
    status: module.availability,
  };
}

export function validateFreePbxModuleFields(schema: FreePbxModuleFormSchema, values: Record<string, unknown>): FreePbxFieldIssue[] {
  const issues: FreePbxFieldIssue[] = [];
  for (const field of schema.fields) {
    if (!(field.id in values)) continue;
    const value = values[field.id];
    if (field.kind === 'switch' && typeof value !== 'boolean') issues.push({ fieldId: field.id, message: 'Choose enabled or disabled.' });
    if ((field.kind === 'text' || field.kind === 'select') && typeof value !== 'string') issues.push({ fieldId: field.id, message: 'Enter a text value.' });
    if (field.kind === 'number' && (typeof value !== 'string' || value.trim() === '' || !/^-?\d+(?:\.\d+)?$/u.test(value.trim()))) issues.push({ fieldId: field.id, message: 'Enter a valid number.' });
    if (field.kind === 'select' && typeof value === 'string' && field.options.length > 0 && !field.options.includes(value)) issues.push({ fieldId: field.id, message: 'Choose one of the values read from this target.' });
  }
  return issues;
}

export function createFreePbxModuleActionRequest(
  moduleId: string,
  action: FreePbxModuleAction,
  targetId: string,
  expectedRevision: string | null,
): FreePbxModuleActionRequest {
  return {
    moduleId,
    action,
    targetId,
    confirmationRequired: action === 'remove' || action === 'disable',
    expectedRevision,
  };
}
