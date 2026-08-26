import { ASTERISK_CATALOG } from "./generated/asterisk-catalog.js";
import { AMI_ACTION_REGISTRY, AMI_EVENT_REGISTRY, ARI_OPERATION_REGISTRY } from "./generated/ami-ari-registry.js";
import type { ModuleSummary } from "./asterisk-readings.js";

export type RuntimeCatalogState = "available" | "unavailable" | "unknown";

export interface RuntimeCatalogInput {
  observedAt: string;
  modules?: ReadonlyArray<ModuleSummary>;
  cliCommands?: ReadonlyArray<string>;
  amiActions?: ReadonlyArray<string>;
  ariResources?: ReadonlyArray<string>;
  ariHttpResources?: ReadonlyArray<string>;
  configResources?: ReadonlyArray<string>;
  configInventoryComplete?: boolean;
  configInventoryReason?: string;
  amiCredentialState?: RuntimeCatalogState;
  amiCredentialReason?: string;
  ariCredentialState?: RuntimeCatalogState;
  ariCredentialReason?: string;
  ariDiscoveryComplete?: boolean;
  ariDiscoveryFailed?: number;
}

export interface RuntimeCatalogRecord {
  id: string;
  kind: "module" | "config" | "api" | "ami-action" | "ami-event" | "ari-operation" | "runtime-module";
  family: string;
  name: string;
  source?: string;
  description: string;
  state: RuntimeCatalogState;
  observedAt: string;
  reason?: string;
  actionBoundary: "supported" | "read-only" | "unverified-installed-module" | "unavailable";
  sourceSurfaces: ReadonlyArray<string>;
  registrations: Readonly<Record<string, ReadonlyArray<{ name: string; evidence: string }>>>;
}

export interface RuntimeCatalogResult {
  schemaVersion: 1;
  catalogRevision: string;
  observedAt: string;
  observations: Readonly<Record<string, RuntimeObservation>>;
  surfaceEntries: Readonly<{ cli: ReadonlyArray<string>; amiActions: ReadonlyArray<string>; amiEvents: ReadonlyArray<string>; ariResources: ReadonlyArray<string>; ariOperations: ReadonlyArray<string>; configResources: ReadonlyArray<string> }>;
  records: ReadonlyArray<RuntimeCatalogRecord>;
  counts: {
    sourceRecords: number;
    available: number;
    unavailable: number;
    unknown: number;
    discoveredOutsideSource: number;
  };
}

export interface RuntimeObservation {
  state: RuntimeCatalogState;
  count?: number;
  reason?: string;
}

type SourceRecord = (typeof ASTERISK_CATALOG.modules)[number] | (typeof ASTERISK_CATALOG.resources)[number] | (typeof ASTERISK_CATALOG.apiResources)[number];

/**
 * Reconciles the generated source inventory with one live observation. Missing
 * observations stay `unknown`, never green. A module returned by Asterisk that
 * was not in the checked-in source inventory is retained as an explicit
 * unverified record, so a new installed module cannot disappear from the UI.
 */
export function reconcileAsteriskCatalog(input: RuntimeCatalogInput): RuntimeCatalogResult {
  const modules = input.modules;
  const moduleByName = new Map((modules ?? []).map((module) => [module.name.toLowerCase(), module]));
  const cli = new Set((input.cliCommands ?? []).map(normalize));
  const ami = new Set((input.amiActions ?? []).map(normalize));
  const ari = new Set((input.ariResources ?? []).map(normalize));
  const configs = new Set((input.configResources ?? []).map(normalize));
  const records: RuntimeCatalogRecord[] = [];

  for (const source of [...ASTERISK_CATALOG.modules, ...ASTERISK_CATALOG.resources, ...ASTERISK_CATALOG.apiResources] as ReadonlyArray<SourceRecord>) {
    if (source.kind === "module") {
      const live = moduleByName.get(source.name.toLowerCase());
      const state: RuntimeCatalogState = modules === undefined
        ? "unknown"
        : live ? "available" : "unavailable";
      records.push({
        id: source.id,
        kind: "module",
        family: source.family,
        name: source.name,
        source: source.source,
        description: source.description,
        state,
        observedAt: input.observedAt,
        reason: state === "unknown"
          ? "module show was not read from the target"
          : state === "unavailable"
            ? "The source module is not present in the target's module show result."
            : undefined,
        actionBoundary: state === "available" ? "read-only" : "unavailable",
        sourceSurfaces: source.sourceSurfaces,
        registrations: source.registrations,
      });
      continue;
    }
    if (source.kind === "ari-resource") {
      const state: RuntimeCatalogState = input.ariHttpResources === undefined
        ? "unknown"
        : input.ariHttpResources.some((name) => ariResourceMatches(name, source)) ? "available" : "unavailable";
      records.push({
        id: source.id,
        kind: "api",
        family: source.family,
        name: source.name,
        source: source.source,
        description: source.description,
        state,
        observedAt: input.observedAt,
        reason: state === "unknown" ? "No authenticated ARI HTTP resource inventory was read." : state === "unavailable" ? "The ARI resource was not present in the target inventory." : undefined,
        actionBoundary: state === "available" ? "supported" : "unavailable",
        sourceSurfaces: source.sourceSurfaces,
        registrations: source.registrations,
      });
      continue;
    }
    const configNames = [source.name, ...source.configFiles].map(normalize);
    const state: RuntimeCatalogState = input.configResources === undefined
      ? "unknown"
      : configNames.some((name) => configs.has(name)) ? "available" : "unavailable";
    records.push({
      id: source.id,
      kind: "config",
      family: source.family,
      name: source.name,
      source: source.source,
      description: source.description,
      state,
      observedAt: input.observedAt,
      reason: state === "unknown"
        ? "The target configuration inventory was not read. Checked-in samples are not live values."
        : state === "unavailable"
          ? "The resource was not present in the target configuration inventory."
          : undefined,
      actionBoundary: state === "available" ? "supported" : "unavailable",
      sourceSurfaces: source.sourceSurfaces,
      registrations: source.registrations,
    });
  }

  for (const live of modules ?? []) {
    if ([...ASTERISK_CATALOG.modules].some((source) => source.name.toLowerCase() === live.name.toLowerCase())) continue;
    const slug = live.name.replace(/\.so$/iu, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
    records.push({
      id: `asterisk.runtime-module.${slug}`,
      kind: "runtime-module",
      family: "runtime",
      name: live.name,
      description: live.description,
      state: "unknown",
      observedAt: input.observedAt,
      reason: "Installed on the target but absent from the generated source catalogue; review before enabling actions.",
      actionBoundary: "unverified-installed-module",
      sourceSurfaces: [],
      registrations: { cli: [], amiActions: [], amiEvents: [], ari: [], agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] },
    });
  }

  const amiState = input.amiCredentialState ?? "unknown";
  for (const action of AMI_ACTION_REGISTRY) records.push(operationRecord(action.id, "ami-action", "ami", action.name, action.source, amiState, input.amiCredentialReason ?? "The AMI action was not independently probed.", input.observedAt));
  for (const event of AMI_EVENT_REGISTRY) records.push(operationRecord(event.id, "ami-event", "ami", event.name, event.source, amiState, input.amiCredentialReason ?? "The AMI event capability was not independently probed.", input.observedAt));
  const ariState = input.ariCredentialState ?? "unknown";
  for (const operation of ARI_OPERATION_REGISTRY) {
    const live = input.ariHttpResources?.some((name) => normalize(name) === normalize(operation.path));
    const state: RuntimeCatalogState = input.ariHttpResources === undefined
      ? ariState
      : operation.method === "GET" ? live ? "available" : "unavailable" : "unknown";
    records.push(operationRecord(operation.id, "ari-operation", "ari", `${operation.method} ${operation.path}`, operation.source, state, input.ariCredentialReason ?? (operation.method === "GET" ? "The ARI operation was not independently probed." : "Mutating ARI operations require an explicit action and are not probed during catalogue discovery."), input.observedAt));
  }

  // Keep runtime surface sets in the result as explicit synthetic records. A
  // command not present in the target is unavailable, while an unqueried
  // surface remains unknown, which prevents a blank panel from looking healthy.
  addSurfaceSummary(records, "cli", input.cliCommands, cli, input.observedAt);
  addSurfaceSummary(records, "ami", input.amiActions, ami, input.observedAt);
  addSurfaceSummary(records, "ari", input.ariResources, ari, input.observedAt);

  const counts = {
    sourceRecords: ASTERISK_CATALOG.counts.total,
    available: records.filter((record) => record.state === "available").length,
    unavailable: records.filter((record) => record.state === "unavailable").length,
    unknown: records.filter((record) => record.state === "unknown").length,
    discoveredOutsideSource: records.filter((record) => record.kind === "runtime-module").length,
  };
  return {
    schemaVersion: 1,
    catalogRevision: ASTERISK_CATALOG.catalogRevision,
    observedAt: input.observedAt,
    observations: {
      "module show": observation(modules),
      "core show help": observation(input.cliCommands),
      "manager show commands": observation(input.amiActions),
      "AMI transport": { state: input.amiCredentialState ?? "unknown", reason: input.amiCredentialReason },
      "ari show apps": observation(input.ariResources),
      "ARI transport": { state: input.ariCredentialState ?? "unknown", count: input.ariDiscoveryFailed, reason: input.ariCredentialReason ?? (input.ariDiscoveryComplete === false ? "ARI discovery was partial." : undefined) },
      "target config inventory": input.configResources === undefined
        ? { state: "unknown", reason: input.configInventoryReason ?? "The target configuration inventory was not available." }
        : { state: input.configInventoryComplete === false ? "unknown" : "available", count: input.configResources.length, reason: input.configInventoryComplete === false ? input.configInventoryReason : undefined },
    },
    surfaceEntries: {
      cli: input.cliCommands ?? [],
      amiActions: input.amiActions ?? [],
      amiEvents: AMI_EVENT_REGISTRY.map((entry) => entry.name),
      ariResources: input.ariHttpResources ?? input.ariResources ?? [],
      ariOperations: ARI_OPERATION_REGISTRY.map((entry) => entry.id),
      configResources: input.configResources ?? [],
    },
    records,
    counts,
  };
}

function operationRecord(id: string, kind: RuntimeCatalogRecord["kind"], family: string, name: string, source: string, state: RuntimeCatalogState, reason: string, observedAt: string): RuntimeCatalogRecord {
  return {
    id,
    kind: kind as "ami-action" | "ami-event" | "ari-operation",
    family,
    name,
    source,
    description: `${family.toUpperCase()} capability ${name}.`,
    state,
    observedAt,
    reason: state === "available" ? undefined : reason,
    actionBoundary: state === "available" ? "supported" : "unavailable",
    sourceSurfaces: [family],
    registrations: { cli: [], amiActions: [], amiEvents: [], ari: [], agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] },
  };
}

function observation(values: ReadonlyArray<unknown> | undefined): RuntimeObservation {
  return values === undefined
    ? { state: "unknown", reason: "The target response was not available." }
    : { state: "available", count: values.length };
}

function addSurfaceSummary(
  records: RuntimeCatalogRecord[],
  family: string,
  values: ReadonlyArray<string> | undefined,
  normalized: ReadonlySet<string>,
  observedAt: string,
): void {
  const state: RuntimeCatalogState = values === undefined ? "unknown" : "available";
  records.push({
    id: `asterisk.runtime.${family}`,
    kind: "runtime-module",
    family: "runtime",
    name: `${family.toUpperCase()} surface`,
    description: values === undefined ? `The ${family.toUpperCase()} surface was not read from the target.` : `${normalized.size} ${family.toUpperCase()} entries read from the target.`,
    state,
    observedAt,
    reason: values === undefined ? `No live ${family.toUpperCase()} response was available.` : undefined,
    actionBoundary: state === "available" ? "read-only" : "unavailable",
    sourceSurfaces: [family],
    registrations: { cli: [], amiActions: [], amiEvents: [], ari: [], agi: [], applications: [], functions: [], codecs: [], formats: [], bridges: [], channels: [] },
  });
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function ariResourceMatches(name: string, source: (typeof ASTERISK_CATALOG.apiResources)[number]): boolean {
  // `{format}` is a literal ARI template suffix, not a regular-expression
  // quantifier. Escaping both braces keeps this module parseable with the `u`
  // flag and reconciles `/api-docs/foo.{format}` with `/foo`.
  const normalizePath = (value: string) => normalize(value).replace(/^\/(?:ari|api-docs)\//u, "/").replace(/\.\{format\}$/u, "");
  const candidate = normalizePath(name);
  if (candidate === normalizePath(source.name)) return true;
  return source.apiOperations.some((operation) => candidate === normalizePath(operation.path));
}
