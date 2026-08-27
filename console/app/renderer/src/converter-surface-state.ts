import type {
  ConverterAdapter,
  ConverterBackendHandlers,
  ConverterCatalogSnapshot,
  ConverterCategory,
  ConverterFormat,
  ConverterOutcome,
  ConverterProgress,
  ConverterQueueCursor,
  ConverterQueueItem,
  ConverterQueuePage,
  ConverterQueueRecord,
  ConverterRequest,
  ConverterSniffResult,
  PdfCapabilitySnapshot,
  PdfOperationRequest,
} from '../../../shared/converter.js';

export const CONVERTER_SURFACE_CATEGORIES: ReadonlyArray<ConverterCategory> = [
  'documents-pdf',
  'images',
  'audio',
  'video',
  'archives',
  'structured-data-spreadsheets',
  'code-text',
  'binary-encodings',
];

export type ConverterSearchMode = 'plain' | 'regex';

export interface ConverterRegexState {
  mode: ConverterSearchMode;
  pattern: string;
  flags: string;
  sample: string;
  error?: string;
  matches: ReadonlyArray<string>;
  captures: ReadonlyArray<ReadonlyArray<string | undefined>>;
}

export interface ConverterPickedFile {
  /** The privileged picker must provide an absolute path. A display-only path is not accepted. */
  sourcePath: string;
  name: string;
  bytes: number;
  lastModified?: string;
  mediaType?: string;
}

export interface ConverterPreview {
  title: string;
  detail: string;
  text?: string;
  imageUrl?: string;
  truncated: boolean;
}

export interface ConverterOverwriteDecision {
  approved: boolean;
  detail: string;
}

export interface ConverterExportDescriptor {
  id: 'queue-json' | 'queue-csv' | 'queue-markdown';
  label: string;
  mediaType: string;
  extension: string;
  scope: 'loaded-queue-page';
  lossNote: string;
}

export interface ConverterEditorHandoffDescriptor {
  id: 'selected-destination';
  label: string;
  editor: 'vscode';
  requires: 'selected-destination-path';
  unavailableReason: string;
}

export interface ConverterPdfRunResult {
  operation: PdfOperationRequest['operation'];
  detail: string;
  outputPath?: string;
}

/**
 * The only renderer-to-privileged seam used by the converter surface. Every method is
 * expected to be backed by the local control plane. The optional methods keep the UI
 * useful while a central mount is being wired, but the surface never invents their result.
 */
export interface ConverterClient extends ConverterBackendHandlers {
  pickLocalFile(): Promise<ConverterPickedFile | undefined>;
  pickDestinationPath?(): Promise<string | undefined>;
  preview?(file: ConverterPickedFile, sniff: ConverterSniffResult): Promise<ConverterPreview>;
  onProgress?(listener: (itemId: string, progress: ConverterProgress) => void): () => void;
  requestOverwriteConfirmation?(request: ConverterRequest): Promise<ConverterOverwriteDecision>;
  export?(descriptor: ConverterExportDescriptor, items: ReadonlyArray<ConverterQueueItem>): Promise<void>;
  openInEditor?(descriptor: ConverterEditorHandoffDescriptor, destinationPath: string): Promise<void>;
  runPdfOperation?(request: PdfOperationRequest, acknowledgedDisclosureIds: ReadonlyArray<string>): Promise<ConverterPdfRunResult>;
  deadlineMs?: number;
}

export interface ConverterSurfaceState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  catalog?: ConverterCatalogSnapshot;
  selectedCategory: ConverterCategory;
  selectedAdapterId?: string;
  searchByCategory: Readonly<Record<ConverterCategory, string>>;
  regexByCategory: Readonly<Record<ConverterCategory, ConverterRegexState>>;
  openRegexCategory?: ConverterCategory;
  pickedFile?: ConverterPickedFile;
  sniff?: ConverterSniffResult;
  preview?: ConverterPreview;
  destinationPath: string;
  queue?: ConverterQueueRecord;
  queueItems: ReadonlyArray<ConverterQueueItem>;
  queueCursor?: ConverterQueueCursor;
  queueLoading: boolean;
  queueError?: string;
  progressByItem: Readonly<Record<string, ConverterProgress>>;
  acknowledgements: Readonly<Record<string, boolean>>;
  pdfCapabilities: ReadonlyArray<PdfCapabilitySnapshot>;
  pdfOperation?: PdfOperationRequest['operation'];
  pdfError?: string;
  statusMessage?: string;
}

export const CONVERTER_EXPORT_DESCRIPTORS: ReadonlyArray<ConverterExportDescriptor> = [
  {
    id: 'queue-json',
    label: 'Export loaded queue page as JSON',
    mediaType: 'application/json',
    extension: '.json',
    scope: 'loaded-queue-page',
    lossNote: 'No fields are omitted. Only the loaded page is exported, not an unbounded queue.',
  },
  {
    id: 'queue-csv',
    label: 'Export loaded queue page as CSV',
    mediaType: 'text/csv',
    extension: '.csv',
    scope: 'loaded-queue-page',
    lossNote: 'Nested outcome data is serialized as JSON text in a cell. Only the loaded page is exported.',
  },
  {
    id: 'queue-markdown',
    label: 'Export loaded queue page as Markdown',
    mediaType: 'text/markdown',
    extension: '.md',
    scope: 'loaded-queue-page',
    lossNote: 'The page is a human-readable report. Machine fields remain available in the JSON export.',
  },
];

export const CONVERTER_EDITOR_HANDOFF: ConverterEditorHandoffDescriptor = {
  id: 'selected-destination',
  label: 'Open selected destination in Visual Studio Code',
  editor: 'vscode',
  requires: 'selected-destination-path',
  unavailableReason: 'The registered client has not exposed a Visual Studio Code handoff.',
};

export function initialRegexState(): ConverterRegexState {
  return { mode: 'plain', pattern: '', flags: 'giu', sample: '', matches: [], captures: [] };
}

export function initialSurfaceState(): ConverterSurfaceState {
  const searchByCategory = {} as Record<ConverterCategory, string>;
  const regexByCategory = {} as Record<ConverterCategory, ConverterRegexState>;
  for (const category of CONVERTER_SURFACE_CATEGORIES) {
    searchByCategory[category] = '';
    regexByCategory[category] = initialRegexState();
  }
  return {
    status: 'idle',
    selectedCategory: 'documents-pdf',
    searchByCategory,
    regexByCategory,
    destinationPath: '',
    queueItems: [],
    queueLoading: false,
    progressByItem: {},
    acknowledgements: {},
    pdfCapabilities: [],
  };
}

export function categoryAdapters(
  catalog: ConverterCatalogSnapshot | undefined,
  category: ConverterCategory,
): ReadonlyArray<ConverterAdapter> {
  return catalog?.adapters.filter((adapter) => adapter.category === category) ?? [];
}

export function categoryFormats(
  catalog: ConverterCatalogSnapshot | undefined,
  category: ConverterCategory,
): ReadonlyArray<ConverterFormat> {
  return catalog?.formats.filter((format) => format.category === category) ?? [];
}

export function selectedAdapter(
  catalog: ConverterCatalogSnapshot | undefined,
  adapterId: string | undefined,
): ConverterAdapter | undefined {
  return catalog?.adapters.find((adapter) => adapter.id === adapterId);
}

export function formatLabel(
  catalog: ConverterCatalogSnapshot | undefined,
  formatId: string,
): string {
  return catalog?.formats.find((format) => format.id === formatId)?.label ?? formatId;
}

export function filteredAdapters(
  adapters: ReadonlyArray<ConverterAdapter>,
  query: string,
  regex: ConverterRegexState,
): ReadonlyArray<ConverterAdapter> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return adapters;
  if (regex.mode === 'regex') {
    const compiled = compileRegex(regex.pattern || trimmed, regex.flags);
    if (compiled.error) return [];
    const pattern = compiled.value;
    if (!pattern) return [];
    return adapters.filter((adapter) => pattern.test(adapterText(adapter)));
  }
  const needle = trimmed.toLocaleLowerCase();
  return adapters.filter((adapter) => adapterText(adapter).toLocaleLowerCase().includes(needle));
}

export function adapterText(adapter: ConverterAdapter): string {
  return [
    adapter.id,
    adapter.label,
    adapter.category,
    adapter.targetFormat,
    ...adapter.sourceFormats,
    adapter.metadataBehavior,
    adapter.encodingBehavior,
    adapter.availability.state === 'unavailable' ? adapter.availability.reason : '',
  ].join(' ');
}

export function compileRegex(
  pattern: string,
  flags: string,
): { value?: RegExp; error?: string } {
  if (pattern.length > 256) return { error: 'Regex patterns are limited to 256 characters.' };
  const normalizedFlags = [...new Set(flags.split(''))].join('');
  if (!/^[dgimsuvy]*$/u.test(normalizedFlags)) return { error: 'Use only supported JavaScript regex flags.' };
  try {
    return { value: new RegExp(pattern, normalizedFlags) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The regex pattern is invalid.' };
  }
}

export function evaluateRegex(state: ConverterRegexState): ConverterRegexState {
  if (state.mode !== 'regex' || state.pattern.trim().length === 0) {
    return { ...state, error: undefined, matches: [], captures: [] };
  }
  if (state.sample.length > 10_000) {
    return { ...state, error: 'Sample text is limited to 10,000 characters.', matches: [], captures: [] };
  }
  const compiled = compileRegex(state.pattern, state.flags);
  if (!compiled.value) return { ...state, error: compiled.error, matches: [], captures: [] };
  const matches: string[] = [];
  const captures: Array<ReadonlyArray<string | undefined>> = [];
  let match: RegExpExecArray | null;
  let guard = 0;
  while ((match = compiled.value.exec(state.sample)) && guard < 500) {
    matches.push(match[0]);
    captures.push(match.slice(1));
    guard += 1;
    if (!compiled.value.global) break;
    if (match[0] === '') compiled.value.lastIndex += 1;
  }
  return { ...state, error: undefined, matches, captures };
}

export function updateRegexState(
  state: ConverterRegexState,
  patch: Partial<ConverterRegexState>,
): ConverterRegexState {
  return evaluateRegex({ ...state, ...patch });
}

export function queueItemsWithOutcomes(items: ReadonlyArray<ConverterQueueItem>): ReadonlyArray<ConverterQueueItem> {
  return items.filter((item) => Boolean(item.outcome));
}

export function outcomeLabel(outcome: ConverterOutcome | undefined): string {
  if (!outcome) return 'No outcome yet';
  return `${outcome.state}: ${outcome.detail}`;
}

export function mergeQueuePage(
  existing: ReadonlyArray<ConverterQueueItem>,
  page: ConverterQueuePage,
): ReadonlyArray<ConverterQueueItem> {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of page.items) byId.set(item.id, item);
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence);
}

export async function withDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new Error('Converter client deadline must be between 100 and 120,000 milliseconds.');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} did not settle within ${timeoutMs} milliseconds.`)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function asAbsolutePath(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.includes('\0')) return undefined;
  if (/^[A-Za-z]:[\\/]/u.test(trimmed) || trimmed.startsWith('\\\\') || trimmed.startsWith('/')) return trimmed;
  return undefined;
}

export function progressPercent(progress: ConverterProgress | undefined): number | undefined {
  if (!progress || progress.totalBytes === undefined || progress.totalBytes <= 0) return undefined;
  return Math.min(100, Math.max(0, Math.round((progress.completedBytes / progress.totalBytes) * 100)));
}
