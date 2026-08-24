import { ASTERISK_CATALOG } from "./generated/asterisk-catalog.js";
import type { ModuleSummary } from "./asterisk-readings.js";

export type RuntimeCatalogState = "available" | "unavailable" | "unknown";

export interface RuntimeCatalogInput {
  observedAt: string;
  modules?: ReadonlyArray<ModuleSummary>;
  cliCommands?: ReadonlyArray<string>;
  amiActions?: ReadonlyArray<string>;
  ariResources?: ReadonlyArray<string>;
  configResources?: ReadonlyArray<string>;
}

export interface RuntimeCatalogRecord {
  id: string;
  kind: "module" | "config" | "runtime-module";
  family: string;
  name: string;
  source?: string;
  description: string;
  state: RuntimeCatalogState;
  observedAt: string;
  reason?: string;
  actionBoundary: "supported" | "read-only" | "unverified-installed-module" | "unavailable";
  sourceSurfaces: ReadonlyArray<string>;
}

export interface RuntimeCatalogResult {
  schemaVersion: 1;
  observedAt: string;
  observations: Readonly<Record<string, RuntimeObservation>>;
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

type SourceRecord = (typeof ASTERISK_CATALOG.modules)[number] | (typeof ASTERISK_CATALOG.resources)[number];

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

  for (const source of [...ASTERISK_CATALOG.modules, ...ASTERISK_CATALOG.resources] as ReadonlyArray<SourceRecord>) {
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
      });
      continue;
    }
    const configName = source.name.toLowerCase();
    const state: RuntimeCatalogState = input.configResources === undefined
      ? "unknown"
      : configs.has(configName) ? "available" : "unavailable";
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
    });
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
    observedAt: input.observedAt,
    observations: {
      "module show": observation(modules),
      "core show help": observation(input.cliCommands),
      "manager show commands": observation(input.amiActions),
      "ari show apps": observation(input.ariResources),
    },
    records,
    counts,
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
  });
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
