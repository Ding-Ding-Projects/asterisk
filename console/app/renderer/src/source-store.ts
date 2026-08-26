/**
 * The configured settings sources, and what each one last said.
 *
 * The validation half lives in `external-settings-sources.ts` and the fetch in the
 * privileged process; this is the list in between -- what a person has configured, and
 * the last answer from each, so a source that has stopped working says so rather than
 * quietly ceasing to track.
 *
 * A stored source is treated as untrusted input on the way back IN, not only on the way
 * out. The file is editable by hand and may have been written by an older version, so a
 * malformed entry is dropped rather than loaded: a source with no URL or no allowlist
 * would otherwise sit in the list looking configured and either fail every poll or, far
 * worse, accept every key a response offered.
 */
import { validateSourceUrl, type ExternalSource, type SourceKind } from './external-settings-sources';

export const SOURCES_STORAGE_KEY = 'console.settingsSources';

export interface SourceStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

const KINDS: readonly SourceKind[] = ['https-api', 'home-assistant'];

/** Parses the stored list, dropping anything that is not a usable source. */
export function loadSources(storage: SourceStorage | undefined): ExternalSource[] {
  const raw = storage?.getItem(SOURCES_STORAGE_KEY);
  if (typeof raw !== 'string' || raw === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* A corrupt file yields no sources rather than throwing on mount. Losing the list is
     * recoverable; failing to start is not. */
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isUsableSource);
}

function isUsableSource(candidate: unknown): candidate is ExternalSource {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const source = candidate as Record<string, unknown>;
  if (typeof source.id !== 'string' || source.id === '') return false;
  if (typeof source.url !== 'string' || validateSourceUrl(source.url).length > 0) return false;
  if (typeof source.kind !== 'string' || !KINDS.includes(source.kind as SourceKind)) return false;
  /* An empty allowlist is refused rather than loaded: a source permitted to set nothing
   * is pointless, and one whose allowlist went missing would be indistinguishable from
   * it while behaving completely differently if the check were ever loosened. */
  if (!Array.isArray(source.allowedKeys) || source.allowedKeys.length === 0) return false;
  if (!source.allowedKeys.every((key) => typeof key === 'string' && key !== '')) return false;
  if (source.kind === 'home-assistant' && typeof source.entityId !== 'string') return false;
  return true;
}

export function saveSources(storage: SourceStorage, sources: readonly ExternalSource[]): void {
  storage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(sources));
}

export interface SourceDraft {
  url: string;
  kind: SourceKind;
  entityId?: string;
  /** As typed: comma separated. Split and cleaned here rather than at the call site. */
  allowedKeys: string;
  credentialKey?: string;
}

export interface DraftProblem {
  field: 'url' | 'kind' | 'entityId' | 'allowedKeys';
  message: string;
}

/** Splits the typed key list, dropping blanks so a trailing comma is not a key. */
export function parseAllowedKeys(typed: string): string[] {
  return typed.split(',').map((key) => key.trim()).filter((key) => key !== '');
}

/**
 * Turns what was typed into a source, or every reason it cannot be.
 *
 * The id is supplied rather than generated here so the caller controls it -- generating
 * one internally would make this impure and untestable for no benefit.
 */
export function buildSource(draft: SourceDraft, id: string): ExternalSource | { problems: DraftProblem[] } {
  const problems: DraftProblem[] = [];
  for (const problem of validateSourceUrl(draft.url)) {
    problems.push({ field: 'url', message: problem.message });
  }
  if (!KINDS.includes(draft.kind)) {
    problems.push({ field: 'kind', message: 'Choose whether this is an HTTPS API or a Home Assistant entity.' });
  }
  const allowedKeys = parseAllowedKeys(draft.allowedKeys);
  if (allowedKeys.length === 0) {
    problems.push({
      field: 'allowedKeys',
      message: 'Name at least one setting this source may change. A source permitted to change nothing would poll forever and do nothing.',
    });
  }
  if (draft.kind === 'home-assistant' && (draft.entityId ?? '').trim() === '') {
    problems.push({ field: 'entityId', message: 'A Home Assistant source needs the boolean entity it watches.' });
  }
  if (problems.length > 0) return { problems };

  const source: ExternalSource = {
    id,
    kind: draft.kind,
    url: draft.url.trim(),
    allowedKeys,
  };
  if (draft.kind === 'home-assistant') source.entityId = (draft.entityId ?? '').trim();
  const credential = (draft.credentialKey ?? '').trim();
  if (credential !== '') source.credentialKey = credential;
  return source;
}

export interface SourceReport {
  sourceId: string;
  /** ISO 8601 of the last attempt, successful or not. */
  at: string;
  ok: boolean;
  /** What happened, in words. Never carries a token: the fetcher does not produce one. */
  detail: string;
}

/**
 * A line describing what every source last did.
 *
 * A source that has stopped working is named rather than omitted, because a settings
 * source silently ceasing to track is the failure this whole feature has to avoid -- the
 * values simply stop changing and nothing says why.
 */
export function sourcesStatusLine(
  sources: readonly ExternalSource[],
  reports: readonly SourceReport[],
): string {
  if (sources.length === 0) return 'No sources configured.';
  const parts = sources.map((source) => {
    const report = reports.find((entry) => entry.sourceId === source.id);
    if (!report) return `${source.url}: not polled yet`;
    return `${source.url}: ${report.ok ? 'answering' : `failing -- ${report.detail}`} (${report.at})`;
  });
  return parts.join('; ');
}
