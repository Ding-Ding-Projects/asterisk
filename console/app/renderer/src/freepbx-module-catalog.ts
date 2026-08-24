import catalogJson from '../../../catalog/freepbx-module-catalog.json';

export type FreePbxAvailabilityState = 'metadata-only' | 'unavailable';
export type FreePbxEntitlementClass = 'open' | 'commercial' | 'unknown';

export interface FreePbxDependency {
  moduleId: string;
  version: string;
}

export interface FreePbxCommand {
  name: string;
  class: string;
}

export interface FreePbxModuleCatalogEntry {
  moduleId: string;
  rawname: string;
  name: string;
  description: string;
  category: string;
  version: string;
  source: {
    organization: string | null;
    repository: string | null;
    branch: string | null;
    revision: string | null;
    moduleXmlPath: string | null;
    moduleXmlSha: string | null;
    repositoryUrl: string | null;
    moduleXmlUrl: string | null;
  };
  publisher: string;
  license: string;
  entitlementClass: FreePbxEntitlementClass;
  dependencies: FreePbxDependency[];
  configurationResources: string[];
  fwconsoleCommands: FreePbxCommand[];
  apiCapabilities: string[];
  uiFamilies: string[];
  nativeTaskId: string | null;
  nativeAliasOf: string | null;
  menuItems: string[];
  documentation: { repository: string | null; moduleXml: string | null };
  availability: { state: FreePbxAvailabilityState; reason: string };
  localInstalled: boolean;
  localMetadataPath: string | null;
}

export interface FreePbxModuleCatalog {
  schemaVersion: 1;
  generatedBy: string;
  generatedAt: string;
  source: {
    provider: string;
    organization: string;
    branch: string;
    repositoryDiscovery: string;
    moduleMetadata: string;
    repositoryCountInspected: number;
  };
  counts: {
    publicModules: number;
    locallyInstalledModules: number;
    unavailableModules: number;
    total: number;
    exclusions: number;
  };
  exclusions: Array<{ recordId: string; moduleId: string; reason: string; source: string; actionable: false }>;
  modules: FreePbxModuleCatalogEntry[];
}

function isCatalogEntry(value: unknown): value is FreePbxModuleCatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<FreePbxModuleCatalogEntry>;
  return typeof entry.moduleId === 'string'
    && typeof entry.name === 'string'
    && typeof entry.version === 'string'
    && Array.isArray(entry.dependencies)
    && Array.isArray(entry.configurationResources)
    && Array.isArray(entry.uiFamilies)
    && !!entry.availability
    && (entry.availability.state === 'metadata-only' || entry.availability.state === 'unavailable');
}

function validateCatalog(value: unknown): FreePbxModuleCatalog {
  if (!value || typeof value !== 'object') throw new Error('FreePBX module catalog is not an object.');
  const candidate = value as Partial<FreePbxModuleCatalog>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.modules)) {
    throw new Error('FreePBX module catalog schemaVersion 1 is required.');
  }
  const modules = candidate.modules.filter(isCatalogEntry);
  if (modules.length !== candidate.modules.length) throw new Error('FreePBX module catalog contains an invalid module entry.');
  const ids = new Set<string>();
  for (const module of modules) {
    if (ids.has(module.moduleId)) throw new Error(`FreePBX module catalog repeats module id ${module.moduleId}.`);
    ids.add(module.moduleId);
  }
  if (candidate.counts?.total !== modules.length || candidate.counts?.exclusions !== candidate.exclusions?.length) throw new Error('FreePBX module catalog count does not match its entries.');
  return candidate as FreePbxModuleCatalog;
}

export const FREEPBX_MODULE_CATALOG = validateCatalog(catalogJson) as FreePbxModuleCatalog;

export function findFreePbxModule(moduleId: string): FreePbxModuleCatalogEntry | undefined {
  return FREEPBX_MODULE_CATALOG.modules.find((module) => module.moduleId === moduleId);
}

export function modulesForUiFamily(family: string): FreePbxModuleCatalogEntry[] {
  return FREEPBX_MODULE_CATALOG.modules.filter((module) => module.uiFamilies.includes(family));
}
