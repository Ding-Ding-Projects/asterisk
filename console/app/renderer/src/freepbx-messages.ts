export type FreePbxDetailTemplateId =
  | 'select-target'
  | 'select-module-action-backup-revision'
  | 'backup-created'
  | 'catalog-exported'
  | 'module-action-unavailable'
  | 'module-action-result'
  | 'family-action-unavailable'
  | 'family-read-unavailable'
  | 'family-apply-unavailable'
  | 'family-action-result'
  | 'module-state-unavailable'
  | 'capability-state'
  | 'transport-unavailable'
  | 'dependency-state-unknown'
  | 'dependency-version-unsatisfied'
  | 'version-mismatch'
  | 'rollback-verified'
  | 'backup-receipt-unavailable';

const TEMPLATES: Readonly<Record<FreePbxDetailTemplateId, string>> = {
  'select-target': 'Select a discovered target.',
  'select-module-action-backup-revision': 'Select a published module, one module action, an official backup job, and the current catalog revision before creating a receipt.',
  'backup-created': 'The official file and database backup receipt is ready for one module action.',
  'catalog-exported': 'The filtered catalog export completed.',
  'module-action-unavailable': 'Select a discovered target and a published catalog module first.',
  'module-action-result': 'The module action returned a typed result.',
  'family-action-unavailable': 'This family has no executable configuration backend.',
  'family-read-unavailable': 'The family target read did not answer.',
  'family-apply-unavailable': 'Select an official backup job before a family mutation.',
  'family-action-result': 'The family route returned a typed result.',
  'module-state-unavailable': 'Select a module and discovered target first.',
  'capability-state': 'The target capability state is not ready for mutation.',
  'transport-unavailable': 'The selected target has no approved FreePBX transport.',
  'dependency-state-unknown': 'Dependency state is unknown, so mutation is refused.',
  'dependency-version-unsatisfied': 'A published dependency version requirement is not satisfied.',
  'version-mismatch': 'The installed module version does not match the catalog requirement.',
  'rollback-verified': 'The inverse action restored the prior state and readback verified it.',
  'backup-receipt-unavailable': 'A one-time target-bound backup receipt is required before mutation.',
};

export function freePbxDetailTemplate(id: FreePbxDetailTemplateId): string {
  return TEMPLATES[id];
}

export function freePbxDetailTemplateIds(): ReadonlyArray<FreePbxDetailTemplateId> {
  return Object.keys(TEMPLATES) as FreePbxDetailTemplateId[];
}
