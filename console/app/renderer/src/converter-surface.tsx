import { createRoot, type Root } from 'react-dom/client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type {
  ConverterAdapter,
  ConverterCategory,
  ConverterQueueItem,
  ConverterRequest,
  PdfOperationRequest,
} from '../../../shared/converter.js';
import {
  CONVERTER_EDITOR_HANDOFF,
  CONVERTER_EXPORT_DESCRIPTORS,
  CONVERTER_SURFACE_CATEGORIES,
  adapterText,
  asAbsolutePath,
  categoryAdapters,
  categoryFormats,
  filteredAdapters,
  formatLabel,
  initialSurfaceState,
  mergeQueuePage,
  outcomeLabel,
  progressPercent,
  queueItemsWithOutcomes,
  selectedAdapter,
  updateRegexState,
  withDeadline,
  type ConverterClient,
  type ConverterRegexState,
  type ConverterSurfaceState,
} from './converter-surface-state';
import './converter-surface.css';

const CATEGORY_LABELS: Readonly<Record<ConverterCategory, string>> = {
  'documents-pdf': 'Documents and PDF',
  images: 'Images',
  audio: 'Audio',
  video: 'Video',
  archives: 'Archives',
  'structured-data-spreadsheets': 'Structured data and spreadsheets',
  'code-text': 'Code and text',
  'binary-encodings': 'Binary encodings',
};

const PDF_OPERATIONS: ReadonlyArray<PdfOperationRequest['operation']> = [
  'inspect', 'split', 'merge', 'extract', 'reorder', 'rotate', 'metadata',
];

const DEFAULT_DEADLINE_MS = 15_000;

function callClient<T>(client: ConverterClient, operation: Promise<T>, label: string): Promise<T> {
  return withDeadline(operation, client.deadlineMs ?? DEFAULT_DEADLINE_MS, label);
}

function copyToClipboard(text: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) void navigator.clipboard.writeText(text);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown bytes';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

function updateCategoryRegex(
  current: ConverterSurfaceState,
  category: ConverterCategory,
  patch: Partial<ConverterRegexState>,
): ConverterSurfaceState {
  const nextRegex = updateRegexState(current.regexByCategory[category], patch);
  return {
    ...current,
    regexByCategory: { ...current.regexByCategory, [category]: nextRegex },
    searchByCategory: nextRegex.mode === 'regex' && patch.pattern !== undefined
      ? { ...current.searchByCategory, [category]: patch.pattern }
      : current.searchByCategory,
  };
}

export interface ConverterSurfaceProps {
  client: ConverterClient;
  className?: string;
}

export function ConverterSurface({ client, className }: ConverterSurfaceProps) {
  const [state, setState] = useState<ConverterSurfaceState>(initialSurfaceState);

  const run = useCallback(async <T,>(label: string, operation: Promise<T>): Promise<T | undefined> => {
    try {
      return await callClient(client, operation, label);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label} did not complete.`;
      setState((current) => ({ ...current, error: message, queueError: label.includes('queue') ? message : current.queueError }));
      return undefined;
    }
  }, [client]);

  const loadCatalog = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: undefined }));
    try {
      const [catalog, pdfCapabilities] = await Promise.all([
        callClient(client, client.catalog(), 'Loading converter catalog'),
        callClient(client, client.pdfCapabilities(), 'Loading PDF capabilities'),
      ]);
      setState((current) => ({ ...current, status: 'ready', catalog, pdfCapabilities, error: undefined }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : 'The converter catalog did not load.',
      }));
    }
  }, [client]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    if (!client.onProgress) return;
    return client.onProgress((itemId, progress) => {
      setState((current) => ({
        ...current,
        progressByItem: { ...current.progressByItem, [itemId]: progress },
      }));
    });
  }, [client]);

  const loadQueuePage = useCallback(async (queueId: string, cursor?: ConverterSurfaceState['queueCursor']) => {
    setState((current) => ({ ...current, queueLoading: true, queueError: undefined }));
    const page = await run('Loading converter queue page', client.queuePage({ queueId, cursor, limit: 100 }));
    if (!page) {
      setState((current) => ({ ...current, queueLoading: false }));
      return;
    }
    setState((current) => ({
      ...current,
      queueItems: mergeQueuePage(cursor ? current.queueItems : [], page),
      queueCursor: page.nextCursor,
      queueLoading: false,
      queueError: undefined,
    }));
  }, [client, run]);

  const ensureQueue = useCallback(async () => {
    if (state.queue) return state.queue;
    const queue = await run('Creating persistent converter queue', client.createQueue({ label: 'Local converter queue' }));
    if (!queue) return undefined;
    setState((current) => ({ ...current, queue, queueItems: [], queueCursor: undefined }));
    return queue;
  }, [client, run, state.queue]);

  const pickFile = useCallback(async () => {
    setState((current) => ({ ...current, error: undefined, statusMessage: 'Opening the local file picker…' }));
    const picked = await run('Opening local file picker', client.pickLocalFile());
    if (!picked) return;
    const absolute = asAbsolutePath(picked.sourcePath);
    if (!absolute) {
      setState((current) => ({ ...current, error: 'The picker did not provide an absolute source path. The file was not queued.' }));
      return;
    }
    const sniff = await run('Reading source byte signature', client.sniff({ sourcePath: absolute }));
    if (!sniff) return;
    const preview = client.preview ? await run('Loading local preview', client.preview({ ...picked, sourcePath: absolute }, sniff)) : undefined;
    setState((current) => {
      const matching = current.catalog?.adapters.find((adapter) =>
        sniff.formatId !== undefined && adapter.sourceFormats.includes(sniff.formatId) && adapter.availability.state === 'enabled');
      return {
        ...current,
        pickedFile: { ...picked, sourcePath: absolute },
        sniff,
        preview,
        selectedAdapterId: matching?.id,
        statusMessage: 'Source bytes were inspected locally. No output has been written.',
        error: undefined,
      };
    });
  }, [client, run]);

  const pickDestination = useCallback(async () => {
    if (!client.pickDestinationPath) {
      setState((current) => ({ ...current, error: 'The registered client has no destination picker. Enter an absolute destination path instead.' }));
      return;
    }
    const picked = await run('Opening destination picker', client.pickDestinationPath());
    if (picked) setState((current) => ({ ...current, destinationPath: picked }));
  }, [client, run]);

  const enqueue = useCallback(async () => {
    const adapter = selectedAdapter(state.catalog, state.selectedAdapterId);
    const sourcePath = state.pickedFile?.sourcePath;
    const destinationPath = asAbsolutePath(state.destinationPath);
    if (!adapter || adapter.availability.state !== 'enabled') {
      setState((current) => ({ ...current, error: 'Choose an enabled adapter backed by a verified local package.' }));
      return;
    }
    if (!sourcePath || !destinationPath) {
      setState((current) => ({ ...current, error: 'Choose a source file and enter an absolute destination path before queueing.' }));
      return;
    }
    const missing = adapter.disclosureIds.filter((id) => !state.acknowledgements[id]);
    if (missing.length > 0) {
      setState((current) => ({ ...current, error: 'Read and acknowledge every loss, metadata, and encoding disclosure before queueing.' }));
      return;
    }
    const request: ConverterRequest = {
      adapterId: adapter.id,
      sourcePath,
      destinationPath,
      overwriteApproved: false,
      acknowledgedDisclosureIds: adapter.disclosureIds,
    };
    if (!client.requestOverwriteConfirmation) {
      setState((current) => ({ ...current, error: 'The registered client has not exposed overwrite confirmation, so the request was not queued.' }));
      return;
    }
    const decision = await run('Requesting overwrite confirmation', client.requestOverwriteConfirmation(request));
    if (!decision || !decision.approved) {
      setState((current) => ({ ...current, error: decision?.detail ?? 'Overwrite confirmation was not approved; no destination was touched.' }));
      return;
    }
    const approvedRequest = { ...request, overwriteApproved: true };
    const queue = await ensureQueue();
    if (!queue) return;
    const item = await run('Queueing converter item', client.enqueueOne({ queueId: queue.id, item: approvedRequest }));
    if (!item) return;
    setState((current) => ({ ...current, queueItems: mergeQueuePage(current.queueItems, { items: [item] }), statusMessage: 'The real source and destination were queued. Nothing was reported converted yet.', error: undefined }));
  }, [client, ensureQueue, run, state]);

  const updateQueue = useCallback(async (action: 'startQueue' | 'pauseQueue' | 'resumeQueue' | 'cancelQueue') => {
    if (!state.queue) {
      setState((current) => ({ ...current, error: 'Create a queue by adding a real source before changing queue state.' }));
      return;
    }
    const updated = await run(`Updating converter queue (${action})`, client[action]({ queueId: state.queue.id }));
    if (updated) setState((current) => ({ ...current, queue: updated, statusMessage: `Queue state is now ${updated.state}.` }));
  }, [client, run, state.queue]);

  const setSearch = useCallback((category: ConverterCategory, value: string) => {
    setState((current) => ({
      ...current,
      searchByCategory: { ...current.searchByCategory, [category]: value },
      regexByCategory: current.regexByCategory[category].mode === 'regex'
        ? { ...current.regexByCategory, [category]: updateRegexState(current.regexByCategory[category], { pattern: value }) }
        : current.regexByCategory,
    }));
  }, []);

  const setRegex = useCallback((category: ConverterCategory, patch: Partial<ConverterRegexState>) => {
    setState((current) => updateCategoryRegex(current, category, patch));
  }, []);

  const acknowledge = useCallback((id: string, value: boolean) => {
    setState((current) => ({ ...current, acknowledgements: { ...current.acknowledgements, [id]: value } }));
  }, []);

  const pdfRun = useCallback(async (request: PdfOperationRequest) => {
    if (!client.runPdfOperation) {
      setState((current) => ({ ...current, pdfError: 'PDF capability was read, but the registered client has not exposed PDF execution.' }));
      return;
    }
    const adapter = selectedAdapter(state.catalog, state.selectedAdapterId);
    const result = await run('Running PDF operation', client.runPdfOperation(request, adapter?.disclosureIds ?? []));
    if (result) setState((current) => ({ ...current, pdfError: undefined, statusMessage: result.detail }));
  }, [client, run, state.catalog, state.selectedAdapterId]);

  const classNames = ['converter-surface', className].filter(Boolean).join(' ');
  const selected = selectedAdapter(state.catalog, state.selectedAdapterId);
  const visibleOutcomes = queueItemsWithOutcomes(state.queueItems);

  return (
    <main className={classNames} aria-labelledby="converter-surface-title">
      <header className="converter-header">
        <div>
          <p className="converter-eyebrow">Local file converter</p>
          <h1 id="converter-surface-title">Convert files without guessing</h1>
          <p className="converter-lede">Byte signatures, bundled-adapter evidence, bounded work, and honest outcomes stay visible from source selection to destination.</p>
        </div>
        <button type="button" className="converter-primary" onClick={() => void pickFile()}>
          <span aria-hidden="true">＋</span> Choose local file
        </button>
      </header>

      {state.status === 'loading' && <div className="converter-notice" role="status">Loading the real adapter catalog and PDF capabilities…</div>}
      {state.error && <div className="converter-notice converter-notice-error" role="alert">{state.error}</div>}
      {state.statusMessage && <div className="converter-notice" role="status">{state.statusMessage}</div>}

      <section className="converter-grid" aria-label="Source and adapter selection">
        <section className="converter-card converter-source-card" aria-labelledby="converter-source-title">
          <div className="converter-card-heading">
            <div><p className="converter-section-kicker">1. Inspect</p><h2 id="converter-source-title">Source bytes</h2></div>
            <button type="button" className="converter-secondary" onClick={() => void pickFile()}>Choose file</button>
          </div>
          {!state.pickedFile && <p className="converter-empty">No source selected. Choose a real local file to read its bounded signature.</p>}
          {state.pickedFile && (
            <div className="converter-source-summary">
              <strong>{state.pickedFile.name}</strong>
              <span>{formatBytes(state.pickedFile.bytes)} · {state.pickedFile.mediaType ?? 'type not supplied by picker'}</span>
              <code>{state.pickedFile.sourcePath}</code>
              {state.sniff && <div className="converter-sniff" aria-label="Byte signature result"><b>{state.sniff.formatId ? formatLabel(state.catalog, state.sniff.formatId) : 'Unknown format'}</b><span>{state.sniff.confidence} · {state.sniff.method} · {state.sniff.bytesInspected} bytes inspected</span><small>{state.sniff.detail}</small></div>}
            </div>
          )}
          {state.preview && <PreviewPanel preview={state.preview} />}
          {state.pickedFile && !state.preview && <p className="converter-muted">Preview is waiting for the registered client. No file contents are invented in the renderer.</p>}
        </section>

        <section className="converter-card converter-plan-card" aria-labelledby="converter-plan-title">
          <div className="converter-card-heading"><div><p className="converter-section-kicker">2. Plan</p><h2 id="converter-plan-title">Destination and disclosures</h2></div></div>
          <label className="converter-label" htmlFor="converter-destination">Absolute destination path</label>
          <div className="converter-path-row">
            <input id="converter-destination" value={state.destinationPath} onChange={(event) => setState((current) => ({ ...current, destinationPath: event.target.value }))} placeholder="C:\\Users\\you\\Documents\\converted.pdf" />
            <button type="button" className="converter-secondary" onClick={() => void pickDestination()} disabled={!client.pickDestinationPath} title={!client.pickDestinationPath ? 'The registered client does not expose a destination picker.' : 'Choose a destination path'}>Browse</button>
          </div>
          <p className="converter-help">The client validates the path again before writing. A destination is never guessed from a filename.</p>
          {selected && <DisclosureList adapter={selected} acknowledgements={state.acknowledgements} onAcknowledge={acknowledge} />}
          {!selected && <p className="converter-empty">Choose an enabled adapter below to review its loss, metadata, and encoding disclosures.</p>}
          <button type="button" className="converter-primary converter-queue-button" onClick={() => void enqueue()} disabled={!selected || selected.availability.state !== 'enabled'}>Request overwrite approval and queue</button>
        </section>
      </section>

      <section className="converter-card converter-adapters-card" aria-labelledby="converter-adapters-title">
        <div className="converter-card-heading"><div><p className="converter-section-kicker">3. Choose</p><h2 id="converter-adapters-title">Adapter catalog</h2></div><span className="converter-count">{state.catalog?.adapters.length ?? 0} registered adapters</span></div>
        <div className="converter-category-tabs" role="tablist" aria-label="Converter categories">
          {CONVERTER_SURFACE_CATEGORIES.map((category) => (
            <button key={category} type="button" role="tab" aria-selected={state.selectedCategory === category} className={state.selectedCategory === category ? 'is-active' : ''} onClick={() => setState((current) => ({ ...current, selectedCategory: category }))}>{CATEGORY_LABELS[category]}</button>
          ))}
        </div>
        <div className="converter-category-panel" role="tabpanel">
          <CategoryPanel
            category={state.selectedCategory}
            adapters={categoryAdapters(state.catalog, state.selectedCategory)}
            formats={categoryFormats(state.catalog, state.selectedCategory)}
            query={state.searchByCategory[state.selectedCategory]}
            regex={state.regexByCategory[state.selectedCategory]}
            regexOpen={state.openRegexCategory === state.selectedCategory}
            selectedAdapterId={state.selectedAdapterId}
            onSearch={(value) => setSearch(state.selectedCategory, value)}
            onRegex={(patch) => setRegex(state.selectedCategory, patch)}
            onToggleRegex={() => setState((current) => ({ ...current, openRegexCategory: current.openRegexCategory === state.selectedCategory ? undefined : state.selectedCategory }))}
            onSelect={(id) => setState((current) => ({ ...current, selectedAdapterId: id }))}
          />
        </div>
      </section>

      <section className="converter-card converter-queue-card" aria-labelledby="converter-queue-title">
        <div className="converter-card-heading"><div><p className="converter-section-kicker">4. Run</p><h2 id="converter-queue-title">Persistent queue</h2></div><QueueState queue={state.queue} /></div>
        <p className="converter-help">Pages load at most 100 records. The cursor keeps the queue resumable without collecting every path in memory.</p>
        <div className="converter-toolbar">
          <button type="button" className="converter-secondary" onClick={() => void updateQueue('startQueue')} disabled={!state.queue || state.queue.state === 'running'}>Start</button>
          <button type="button" className="converter-secondary" onClick={() => void updateQueue('pauseQueue')} disabled={!state.queue || state.queue.state !== 'running'}>Pause</button>
          <button type="button" className="converter-secondary" onClick={() => void updateQueue('resumeQueue')} disabled={!state.queue || state.queue.state !== 'paused'}>Resume</button>
          <button type="button" className="converter-danger" onClick={() => void updateQueue('cancelQueue')} disabled={!state.queue || state.queue.state === 'cancelled' || state.queue.state === 'completed'}>Cancel queue</button>
          <button type="button" className="converter-secondary" onClick={() => state.queue && void loadQueuePage(state.queue.id)} disabled={!state.queue || state.queueLoading}>Refresh page</button>
          {state.queueCursor && <button type="button" className="converter-secondary" onClick={() => state.queue && void loadQueuePage(state.queue.id, state.queueCursor)} disabled={state.queueLoading}>Load next page</button>}
        </div>
        {state.queueError && <p className="converter-error-text">{state.queueError}</p>}
        {state.queueItems.length === 0 && <p className="converter-empty">No queue records have been loaded. Add a real source above, then the client will persist one item at a time.</p>}
        {state.queueItems.length > 0 && <QueueTable items={state.queueItems} progressByItem={state.progressByItem} formatLabel={(id) => formatLabel(state.catalog, id)} />}
      </section>

      <section className="converter-lower-grid">
        <PdfPanel state={state} onSelectOperation={(operation) => setState((current) => ({ ...current, pdfOperation: operation, pdfError: undefined }))} onRun={pdfRun} />
        <HistoryAndExportPanel items={visibleOutcomes} client={client} onError={(error) => setState((current) => ({ ...current, error }))} />
      </section>
    </main>
  );
}

function PreviewPanel({ preview }: { preview: NonNullable<ConverterSurfaceState['preview']> }) {
  return <div className="converter-preview" aria-label="Local preview"><div className="converter-preview-heading"><b>{preview.title}</b>{preview.truncated && <span>Preview bounded</span>}</div><p>{preview.detail}</p>{preview.imageUrl && <img src={preview.imageUrl} alt={preview.title} />}{preview.text && <pre>{preview.text}</pre>}</div>;
}

function DisclosureList({ adapter, acknowledgements, onAcknowledge }: { adapter: ConverterAdapter; acknowledgements: Readonly<Record<string, boolean>>; onAcknowledge: (id: string, value: boolean) => void }) {
  return <div className="converter-disclosures"><h3>Before queueing</h3>{adapter.disclosureIds.map((id, index) => <label key={id} className="converter-checkbox"><input type="checkbox" checked={Boolean(acknowledgements[id])} onChange={(event) => onAcknowledge(id, event.target.checked)} /><span><b>{adapter.disclosures[index] ?? id}</b><small>{adapter.lossy ? 'This adapter may change content or metadata.' : 'This adapter declares a lossless representation or normalization.'} Metadata: {adapter.metadataBehavior} Encoding: {adapter.encodingBehavior}</small></span></label>)}</div>;
}

function CategoryPanel({ category, adapters, formats, query, regex, regexOpen, selectedAdapterId, onSearch, onRegex, onToggleRegex, onSelect }: { category: ConverterCategory; adapters: ReadonlyArray<ConverterAdapter>; formats: ReadonlyArray<import('../../../shared/converter.js').ConverterFormat>; query: string; regex: ConverterRegexState; regexOpen: boolean; selectedAdapterId?: string; onSearch: (value: string) => void; onRegex: (patch: Partial<ConverterRegexState>) => void; onToggleRegex: () => void; onSelect: (id: string) => void }) {
  const visible = useMemo(() => filteredAdapters(adapters, query, regex), [adapters, query, regex]);
  return <div className="converter-category-content"><p className="converter-category-description">{formats.length > 0 ? `${formats.length} known formats in this category. Formats remain visible even when no bundled adapter can handle them.` : 'The client has not returned formats for this category.'}</p><div className="converter-search-row"><label htmlFor={`converter-search-${category}`}>Search {CATEGORY_LABELS[category]}</label><div className="converter-search-input"><input id={`converter-search-${category}`} value={query} onChange={(event) => onSearch(event.target.value)} placeholder="Plain-text search" /><button type="button" aria-expanded={regexOpen} aria-controls={`converter-regex-${category}`} onClick={onToggleRegex}>Regex builder</button></div></div>{regexOpen && <RegexBuilder id={`converter-regex-${category}`} state={regex} onChange={onRegex} />}{visible.length === 0 && <p className="converter-empty">No adapter matches this search. The catalog did not invent another one.</p>}<div className="converter-adapter-list">{visible.map((adapter) => <AdapterRow key={adapter.id} adapter={adapter} selected={selectedAdapterId === adapter.id} onSelect={onSelect} />)}</div></div>;
}

function RegexBuilder({ id, state, onChange }: { id: string; state: ConverterRegexState; onChange: (patch: Partial<ConverterRegexState>) => void }) {
  const insert = (text: string) => onChange({ pattern: `${state.pattern}${text}` });
  return <aside id={id} className="converter-regex-builder" aria-label="Anchored full regex builder"><div className="converter-regex-heading"><div><b>Regex builder</b><small>JavaScript RegExp, local bounded evaluation, plain text remains the default.</small></div><select value={state.mode} onChange={(event) => onChange({ mode: event.target.value as ConverterRegexState['mode'] })} aria-label="Search mode"><option value="plain">Plain text</option><option value="regex">Regex</option></select></div><div className="converter-regex-guides"><button type="button" onClick={() => insert('literal')}>Literal</button><button type="button" onClick={() => insert('[abc]')}>Character class</button><button type="button" onClick={() => insert('^')}>Anchor</button><button type="button" onClick={() => insert('(group)')}>Group</button><button type="button" onClick={() => insert('|')}>Alternation</button><button type="button" onClick={() => insert('+')}>Quantifier</button></div><label>Pattern<input value={state.pattern} onChange={(event) => onChange({ pattern: event.target.value })} maxLength={256} /></label><label>Flags<input value={state.flags} onChange={(event) => onChange({ flags: event.target.value })} aria-describedby={`${id}-flags-help`} /><small id={`${id}-flags-help`}>Supported JavaScript flags are checked before matching.</small></label><label>Sample text<textarea value={state.sample} onChange={(event) => onChange({ sample: event.target.value })} maxLength={10_000} /></label>{state.error && <p className="converter-error-text" role="alert">{state.error}</p>}<div className="converter-regex-results"><span>{state.matches.length} matches</span><span>{state.captures.length} capture rows</span><button type="button" onClick={() => copyToClipboard(state.pattern)} disabled={!state.pattern}>Copy pattern</button></div>{state.matches.length > 0 && <ol>{state.matches.map((match, index) => <li key={`${match}-${index}`}><code>{match || 'empty match'}</code>{state.captures[index]?.length ? <small>Captures: {state.captures[index].map((capture) => capture ?? 'undefined').join(' · ')}</small> : null}</li>)}</ol>}</aside>;
}

function AdapterRow({ adapter, selected, onSelect }: { adapter: ConverterAdapter; selected: boolean; onSelect: (id: string) => void }) {
  const unavailableAvailability = adapter.availability.state === 'unavailable' ? adapter.availability : undefined;
  const unavailable = unavailableAvailability !== undefined;
  return <article className={`converter-adapter-row ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}`}><div className="converter-adapter-main"><div><h3>{adapter.label}</h3><code>{adapter.id}</code></div><span className={`converter-state-chip ${unavailable ? 'is-unavailable' : 'is-enabled'}`}>{unavailable ? 'Unavailable' : 'Enabled'}</span></div><p>{adapterText(adapter)}</p>{unavailableAvailability ? <div className="converter-disabled-reason" aria-disabled="true"><b>Disabled until bundled proof exists</b><span>Missing dependency: {unavailableAvailability.missingDependency}</span><small>{unavailableAvailability.reason}</small></div> : <button type="button" className="converter-secondary" aria-pressed={selected} onClick={() => onSelect(adapter.id)}>{selected ? 'Selected adapter' : 'Use this adapter'}</button>}</article>;
}

function QueueState({ queue }: { queue?: ConverterSurfaceState['queue'] }) {
  if (!queue) return <span className="converter-state-chip">No queue</span>;
  return <span className={`converter-state-chip queue-${queue.state}`}>{queue.state} · {Object.values(queue.itemCounts).reduce((sum, count) => sum + count, 0)} items</span>;
}

function QueueTable({ items, progressByItem, formatLabel: label }: { items: ReadonlyArray<ConverterQueueItem>; progressByItem: Readonly<Record<string, ConverterSurfaceState['progressByItem'][string]>>; formatLabel: (id: string) => string }) {
  return <div className="converter-table-wrap"><table className="converter-table"><caption>Loaded converter queue page</caption><thead><tr><th scope="col">#</th><th scope="col">Source and target</th><th scope="col">State</th><th scope="col">Progress</th><th scope="col">Outcome</th></tr></thead><tbody>{items.map((item) => <QueueRow key={item.id} item={item} progress={progressByItem[item.id]} formatLabel={label} />)}</tbody></table></div>;
}

function QueueRow({ item, progress, formatLabel: label }: { item: ConverterQueueItem; progress?: ConverterSurfaceState['progressByItem'][string]; formatLabel: (id: string) => string }) {
  const percent = progressPercent(progress);
  return <tr><td>{item.sequence}</td><td><strong>{item.sourcePath}</strong><small>{label(item.adapterId)} → {item.destinationPath}</small></td><td><span className={`converter-state-chip item-${item.state}`}>{item.state}</span></td><td>{progress ? <div className="converter-progress-wrap"><div className="converter-progress-track" role="progressbar" aria-label={`Progress for queue item ${item.sequence}`} aria-valuemin={0} aria-valuemax={progress.totalBytes ?? undefined} aria-valuenow={progress.totalBytes ? progress.completedBytes : undefined}><span style={percent === undefined ? undefined : { width: `${percent}%` }} /></div><small>{percent === undefined ? progress.detail : `${percent}% · ${progress.detail}`}</small></div> : <span className="converter-muted">No progress event yet</span>}</td><td>{outcomeLabel(item.outcome)}</td></tr>;
}

function PdfPanel({ state, onSelectOperation, onRun }: { state: ConverterSurfaceState; onSelectOperation: (operation: PdfOperationRequest['operation']) => void; onRun: (request: PdfOperationRequest) => Promise<void> }) {
  const [sourcePaths, setSourcePaths] = useState('');
  const [pages, setPages] = useState('');
  const [ranges, setRanges] = useState('');
  const [degrees, setDegrees] = useState<'90' | '180' | '270'>('90');
  const [metadata, setMetadata] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = state.pdfOperation;
  const source = state.pickedFile?.sourcePath ?? '';
  const sources = sourcePaths.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
  const parsePages = () => pages.split(/[ ,]+/u).filter(Boolean).map(Number);
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (!operation) return;
    const allSources = sources.length > 0 ? sources : source ? [source] : [];
    let request: PdfOperationRequest;
    try {
      if (operation === 'inspect') request = { operation, sourcePaths: [allSources[0]!] };
      else if (operation === 'merge') request = { operation, sourcePaths: allSources };
      else if (operation === 'split') request = { operation, sourcePaths: [allSources[0]!], ranges: ranges.split(',').map((range) => range.trim().split('-').map(Number) as [number, number]) };
      else if (operation === 'extract') request = { operation, sourcePaths: [allSources[0]!], pages: parsePages() };
      else if (operation === 'reorder') request = { operation, sourcePaths: [allSources[0]!], pageOrder: parsePages() };
      else if (operation === 'rotate') request = { operation, sourcePaths: [allSources[0]!], pages: parsePages(), degrees: Number(degrees) as 90 | 180 | 270 };
      else {
        const entries: Record<string, string | null> = {};
        for (const line of metadata.split(/\r?\n/u)) { const split = line.indexOf('='); if (split > 0) entries[line.slice(0, split).trim()] = line.slice(split + 1); }
        request = { operation, sourcePaths: [allSources[0]!], metadata: entries };
      }
      if (allSources.length === 0 || allSources.some((path) => !asAbsolutePath(path))) throw new Error('Provide one or more absolute PDF source paths.');
      setBusy(true);
      await onRun(request);
    } catch (error) {
      // The parent displays the client error. This local message is only for malformed form values.
      void error;
    } finally { setBusy(false); }
  };
  return <section className="converter-card converter-pdf-card" aria-labelledby="converter-pdf-title"><div className="converter-card-heading"><div><p className="converter-section-kicker">PDF tools</p><h2 id="converter-pdf-title">Inspect and transform PDFs</h2></div><span className="converter-count">{state.pdfCapabilities.length} capability records</span></div><p className="converter-help">Each operation stays visible when unavailable. A disabled command names the missing bundled adapter instead of falling back to a machine-wide tool.</p><div className="converter-pdf-commands">{PDF_OPERATIONS.map((entry) => { const capability = state.pdfCapabilities.find((candidate) => candidate.operation === entry); return <button key={entry} type="button" className={operation === entry ? 'is-active' : ''} onClick={() => onSelectOperation(entry)} aria-pressed={operation === entry}>{entry}<small>{capability?.available ? 'available' : capability?.reason ?? 'not reported'}</small></button>; })}</div>{state.pdfError && <p className="converter-error-text" role="alert">{state.pdfError}</p>}{operation && <form className="converter-pdf-form" onSubmit={(event) => void run(event)}><label>Source paths, one absolute path per line<textarea value={sourcePaths || source} onChange={(event) => setSourcePaths(event.target.value)} /></label>{operation === 'split' && <label>Ranges, for example 1-3,4-5<input value={ranges} onChange={(event) => setRanges(event.target.value)} /></label>}{['extract', 'reorder', 'rotate'].includes(operation) && <label>Page numbers, separated by spaces<input value={pages} onChange={(event) => setPages(event.target.value)} /></label>}{operation === 'rotate' && <label>Degrees<select value={degrees} onChange={(event) => setDegrees(event.target.value as typeof degrees)}><option value="90">90</option><option value="180">180</option><option value="270">270</option></select></label>}{operation === 'metadata' && <label>Metadata, one key=value per line<textarea value={metadata} onChange={(event) => setMetadata(event.target.value)} /></label>}<button type="submit" className="converter-primary" disabled={busy || !state.pdfCapabilities.find((candidate) => candidate.operation === operation)?.available}>{busy ? 'Running…' : `Run ${operation}`}</button></form>}</section>;
}

function HistoryAndExportPanel({ items, client, onError }: { items: ReadonlyArray<ConverterQueueItem>; client: ConverterClient; onError: (error: string) => void }) {
  const exportItems = async (descriptor: (typeof CONVERTER_EXPORT_DESCRIPTORS)[number]) => {
    if (!client.export) { onError('The registered client has not exposed converter export handling. No export was created.'); return; }
    try { await callClient(client, client.export(descriptor, items), `Exporting ${descriptor.label}`); } catch (error) { onError(error instanceof Error ? error.message : 'Converter export did not complete.'); }
  };
  const handoff = async () => {
    const destination = items.at(-1)?.destinationPath;
    if (!destination) { onError('Select a queued destination with a real path before requesting editor handoff.'); return; }
    if (!client.openInEditor) { onError(CONVERTER_EDITOR_HANDOFF.unavailableReason); return; }
    try { await callClient(client, client.openInEditor(CONVERTER_EDITOR_HANDOFF, destination), 'Opening destination in Visual Studio Code'); } catch (error) { onError(error instanceof Error ? error.message : 'Visual Studio Code handoff did not complete.'); }
  };
  return <section className="converter-card converter-history-card" aria-labelledby="converter-history-title"><div className="converter-card-heading"><div><p className="converter-section-kicker">5. Review</p><h2 id="converter-history-title">Outcome history and handoff</h2></div><span className="converter-count">{items.length} loaded outcomes</span></div><p className="converter-help">History reflects only loaded queue records. A page refresh or next-page load is required before an outcome can appear here.</p>{items.length === 0 ? <p className="converter-empty">No completed, skipped, cancelled, or failed outcomes are loaded.</p> : <ol className="converter-history-list">{items.map((item) => <li key={item.id}><strong>{item.sourcePath}</strong><span>{outcomeLabel(item.outcome)}</span></li>)}</ol>}<div className="converter-export-list"><h3>Export descriptors</h3>{CONVERTER_EXPORT_DESCRIPTORS.map((descriptor) => <div key={descriptor.id} className="converter-export-row"><div><b>{descriptor.label}</b><small>{descriptor.mediaType} · {descriptor.extension} · {descriptor.lossNote}</small></div><button type="button" className="converter-secondary" onClick={() => void exportItems(descriptor)} disabled={!client.export || items.length === 0}>Export</button></div>)}</div><button type="button" className="converter-secondary" onClick={() => void handoff()} disabled={!client.openInEditor || items.length === 0}>Open selected destination in Visual Studio Code</button></section>;
}

export interface ConverterSurfaceRegistration {
  id: 'local-file-converter';
  title: string;
  mount(container: HTMLElement, client: ConverterClient): Root;
}

export const CONVERTER_SURFACE_REGISTRATION: ConverterSurfaceRegistration = {
  id: 'local-file-converter',
  title: 'Local file converter',
  mount(container, client) {
    const root = createRoot(container);
    root.render(<ConverterSurface client={client} />);
    return root;
  },
};

export function mountConverterSurface(container: HTMLElement, client: ConverterClient): () => void {
  const root = CONVERTER_SURFACE_REGISTRATION.mount(container, client);
  return () => root.unmount();
}

export type { ConverterClient } from './converter-surface-state';
