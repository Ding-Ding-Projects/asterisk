import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  OLLAMA_SUITE_REGISTRATION,
  fitLabel,
  formatBytes,
  runtimeLabel,
  type BackendFailure,
  type BackendResponse,
  type ChatSession,
  type HarnessProfile,
  type OllamaModelVariant,
  type OllamaSuiteClient,
  type OllamaSuiteSnapshot,
  type PullQueueEvidence,
  type RegexSearchRequest,
} from './ollama-suite-model';
import {
  INITIAL_OLLAMA_SUITE_STATE,
  ollamaSuiteReducer,
  type RegexBuilderState,
  type SearchScope,
} from './ollama-suite-state';
import './ollama-suite.css';

export { OLLAMA_SUITE_REGISTRATION } from './ollama-suite-model';
export type { OllamaSuiteClient, OllamaSuiteSnapshot } from './ollama-suite-model';

export interface OllamaSuiteProps {
  readonly client: OllamaSuiteClient;
  readonly initialSnapshot?: OllamaSuiteSnapshot;
  readonly className?: string;
}

const SEARCH_LIMITS = {
  maxPatternCharacters: 512,
  maxSampleCharacters: 4_096,
  timeoutMs: 75,
  maxMatches: 200,
} as const;

function normalizeClientRejection(error: unknown, operation: string): BackendFailure {
  const cancelled = error instanceof DOMException && error.name === 'AbortError';
  return {
    code: cancelled ? 'client-request-cancelled' : 'client-promise-rejected',
    message: cancelled
      ? `The ${operation} request was cancelled before the backend returned typed evidence.`
      : `The ${operation} request ended before the backend returned a typed response. Rejection details were withheld because untyped errors can contain private data.`,
    recoveryAction: cancelled ? 'Run the action again when ready.' : 'Retry the action. If it continues to fail, inspect the redacted backend diagnostics.',
    retryable: true,
  };
}

function statusClass(value: string): string {
  return `ollama-status ollama-status--${value}`;
}

function unique(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function readableTime(value: string | undefined): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function percentage(completed: number | undefined, total: number | undefined): number | undefined {
  if (completed === undefined || total === undefined || total <= 0) return undefined;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function EmptyState({ title, body, action }: { readonly title: string; readonly body: string; readonly action?: ReactNode }) {
  return (
    <section className="ollama-empty" aria-live="polite">
      <span className="material-symbols-rounded" aria-hidden="true">inventory_2</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </section>
  );
}

function RegexBuilder({
  label,
  scope,
  value,
  onChange,
}: {
  readonly label: string;
  readonly scope: SearchScope;
  readonly value: RegexBuilderState;
  readonly onChange: (patch: Partial<RegexBuilderState>) => void;
}) {
  const insert = (text: string) => onChange({ pattern: `${value.pattern}${text}`, mode: 'regex' });
  return (
    <div className="ollama-search-block" data-search-scope={scope}>
      <div className="ollama-search-row">
        <label>
          <span>{label}</span>
          <input
            type="search"
            value={value.mode === 'plain' ? value.query : value.pattern}
            onChange={(event) => value.mode === 'plain'
              ? onChange({ query: event.target.value })
              : onChange({ pattern: event.target.value })}
            placeholder={value.mode === 'plain' ? 'Search by visible name or tag' : 'Enter a regular expression'}
          />
        </label>
        <button
          type="button"
          className="ollama-icon-button"
          aria-expanded={value.open}
          aria-label={`${value.open ? 'Close' : 'Open'} regex builder for ${label}`}
          onClick={() => onChange({ open: !value.open })}
        >
          <span className="material-symbols-rounded" aria-hidden="true">regular_expression</span>
        </button>
      </div>
      {value.open && (
        <section className="ollama-regex-builder" aria-label={`Regex builder for ${label}`}>
          <div className="ollama-segmented" aria-label="Search mode">
            <button type="button" aria-pressed={value.mode === 'plain'} onClick={() => onChange({ mode: 'plain' })}>Plain text</button>
            <button type="button" aria-pressed={value.mode === 'regex'} onClick={() => onChange({ mode: 'regex' })}>Regular expression</button>
          </div>
          <p className="ollama-helper">The backend evaluates patterns with explicit size, match, and time bounds. The UI does not execute untrusted patterns.</p>
          <div className="ollama-builder-grid">
            <label>
              <span>Pattern</span>
              <textarea
                value={value.pattern}
                maxLength={SEARCH_LIMITS.maxPatternCharacters}
                onChange={(event) => onChange({ pattern: event.target.value, mode: 'regex' })}
              />
            </label>
            <label>
              <span>Sample text</span>
              <textarea
                value={value.sample}
                maxLength={SEARCH_LIMITS.maxSampleCharacters}
                onChange={(event) => onChange({ sample: event.target.value })}
              />
            </label>
          </div>
          <div className="ollama-builder-tools" aria-label="Guided pattern parts">
            <button type="button" onClick={() => insert('\\.')}>Escaped literal</button>
            <button type="button" onClick={() => insert('[A-Za-z]')}>Character class</button>
            <button type="button" onClick={() => insert('^$')}>Anchors</button>
            <button type="button" onClick={() => insert('()')}>Group</button>
            <button type="button" onClick={() => insert('|')}>Alternation</button>
            <button type="button" onClick={() => insert('{1,3}')}>Quantifier</button>
          </div>
          <fieldset className="ollama-flags">
            <legend>Flags</legend>
            {['i', 'm', 's', 'u'].map((flag) => (
              <label key={flag}>
                <input
                  type="checkbox"
                  checked={value.flags.includes(flag)}
                  onChange={() => onChange({
                    flags: value.flags.includes(flag)
                      ? value.flags.replace(flag, '')
                      : `${value.flags}${flag}`,
                  })}
                />
                {flag}
              </label>
            ))}
          </fieldset>
          <div className={statusClass(value.result?.valid === false ? 'failed' : value.evaluating ? 'running' : 'neutral')} role="status">
            {value.evaluating && 'Evaluating with backend limits...'}
            {!value.evaluating && value.result?.valid === false && `Invalid pattern: ${value.result.error ?? 'The backend rejected the pattern.'}`}
            {!value.evaluating && value.result?.valid && `${value.result.matchedIds.length} result${value.result.matchedIds.length === 1 ? '' : 's'} matched.`}
            {!value.evaluating && !value.result && 'No evaluation has run yet.'}
          </div>
          {value.result && (
            <p className="ollama-helper">
              Engine: {value.result.engine}. Dialect: {value.result.dialect}. Escaping: {value.result.escapingRules}
            </p>
          )}
          {value.result?.preview.length ? (
            <details>
              <summary>Live matches and capture groups</summary>
              <ol className="ollama-preview-list">
                {value.result.preview.map((match, index) => (
                  <li key={`${match.index}-${index}`}>
                    <code>{match.match}</code> at {match.index}
                    {match.groups.length > 0 && <span> - groups: {match.groups.map((group) => `“${group}”`).join(', ')}</span>}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </section>
      )}
    </div>
  );
}

function RuntimeCard({
  snapshot,
  pending,
  onRefresh,
  onAction,
}: {
  readonly snapshot: OllamaSuiteSnapshot;
  readonly pending?: string;
  readonly onRefresh: () => void;
  readonly onAction: (id: string) => void;
}) {
  const runtime = snapshot.runtime;
  return (
    <section className={`ollama-runtime-card ollama-runtime-card--${runtime.state}`} aria-labelledby="ollama-runtime-title">
      <div>
        <span className="ollama-eyebrow">Local HTTP API</span>
        <h2 id="ollama-runtime-title">{runtimeLabel(runtime.state)}</h2>
        <p>{runtime.reason ?? 'The backend did not report a problem.'}</p>
      </div>
      <dl className="ollama-evidence-grid">
        <div><dt>Endpoint</dt><dd>{runtime.endpoint}</dd></div>
        <div><dt>Version</dt><dd>{runtime.version ?? 'Not reported'}</dd></div>
        <div><dt>Checked</dt><dd>{readableTime(runtime.observedAt)}</dd></div>
      </dl>
      <div className="ollama-actions">
        <button type="button" disabled={Boolean(pending)} onClick={onRefresh}>Check again</button>
        {runtime.nextActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={Boolean(pending) || !action.enabled}
            title={!action.enabled ? action.disabledReason : action.description}
            onClick={() => onAction(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
      {runtime.nextActions.some((action) => !action.enabled) && (
        <ul className="ollama-blockers">
          {runtime.nextActions.filter((action) => !action.enabled).map((action) => (
            <li key={action.id}><strong>{action.label}:</strong> {action.disabledReason ?? 'The backend did not provide the required condition.'}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FitEvidence({ variant }: { readonly variant: OllamaModelVariant }) {
  return (
    <details className="ollama-fit-evidence">
      <summary>{fitLabel(variant.fit.verdict)}: {variant.fit.summary}</summary>
      <p>Assessed {readableTime(variant.fit.assessedAt)}. This is conservative evidence, not a promise that the model will run.</p>
      <div className="ollama-table-wrap">
        <table>
          <thead><tr><th>Evidence</th><th>Observed</th><th>Required</th><th>Verdict</th><th>Source</th></tr></thead>
          <tbody>
            {variant.fit.evidence.map((item, index) => (
              <tr key={`${item.label}-${index}`}>
                <th scope="row">{item.label}</th>
                <td>{item.observed ?? 'Unknown'}</td>
                <td>{item.required ?? 'Not reported'}</td>
                <td>{item.verdict}</td>
                <td>{item.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {variant.fit.assumptions.length > 0 && <p><strong>Assumptions:</strong> {variant.fit.assumptions.join('; ')}</p>}
    </details>
  );
}

function ModelStore({
  snapshot,
  visibleVariants,
  selected,
  filters,
  pending,
  onToggle,
  onFilter,
  onRefresh,
  onQueue,
}: {
  readonly snapshot: OllamaSuiteSnapshot;
  readonly visibleVariants: ReadonlyArray<OllamaModelVariant>;
  readonly selected: ReadonlySet<string>;
  readonly filters: { readonly family: string; readonly capability: string; readonly installation: string; readonly running: string; readonly fit: string };
  readonly pending?: string;
  readonly onToggle: (id: string) => void;
  readonly onFilter: (filter: 'family' | 'capability' | 'installation' | 'running' | 'fit', value: string) => void;
  readonly onRefresh: () => void;
  readonly onQueue: () => void;
}) {
  const catalog = snapshot.catalog;
  const families = unique(snapshot.variants.map((variant) => variant.family));
  const capabilities = unique(snapshot.variants.flatMap((variant) => variant.capabilities.map((capability) => capability.label)));
  const selectedVariants = snapshot.variants.filter((variant) => selected.has(variant.id));
  const additionalBytes = selectedVariants.reduce<number | undefined>((total, variant) => {
    if (total === undefined || variant.additionalStorageBytes === undefined) return undefined;
    return total + variant.additionalStorageBytes;
  }, 0);
  const freeBytes = snapshot.hardware?.freeStorageBytes ?? snapshot.pullQueue?.freeStorageBytes;
  const insufficientStorage = additionalBytes !== undefined && freeBytes !== undefined && additionalBytes > freeBytes;
  const noInstalledModels = snapshot.variants.every((variant) => !variant.installed);

  return (
    <section className="ollama-view" aria-labelledby="ollama-store-title">
      <header className="ollama-section-heading">
        <div><span className="ollama-eyebrow">Exhaustive official inventory</span><h2 id="ollama-store-title">Model Store</h2></div>
        <button type="button" disabled={Boolean(pending)} onClick={onRefresh}>Refresh every page</button>
      </header>
      {!catalog ? (
        <EmptyState title="No catalog response" body="The backend has not supplied an official catalog snapshot or a verified offline cache." />
      ) : (
        <section className={`ollama-catalog-evidence ${catalog.stale || catalog.offlineCache ? 'ollama-catalog-evidence--warning' : ''}`} aria-label="Catalog evidence">
          <div><strong>{catalog.completeness === 'complete' ? 'Complete refresh' : catalog.completeness === 'partial' ? 'Partial refresh' : 'Completeness unknown'}</strong></div>
          <div>Source: {catalog.sourceIdentity}</div>
          <div>Revision: {catalog.revision ?? 'Not reported'}</div>
          <div>Pages: {catalog.pageCount}</div>
          <div>Refreshed: {readableTime(catalog.refreshedAt)}</div>
          <div>Last verified: {readableTime(catalog.lastSuccessfulRefreshAt)}</div>
          {catalog.offlineCache && <div className="ollama-warning">Catalog is offline. Showing the last verified catalog together with current installed state.</div>}
          {catalog.stale && <div className="ollama-warning">Catalog is stale: {catalog.staleReason ?? 'The backend did not report why.'}</div>}
          {catalog.completeness !== 'complete' && <div className="ollama-warning">The inventory is not proven exhaustive. Missing pages or variants remain visible as an incomplete result.</div>}
        </section>
      )}
      {noInstalledModels && <div className={statusClass('warning')}>No local models are installed. Catalog entries remain available for review and batch pull.</div>}
      <div className="ollama-filter-panel">
        <fieldset><legend>Installed state</legend>{['all', 'installed', 'not-installed'].map((value) => <button key={value} type="button" aria-pressed={filters.installation === value} onClick={() => onFilter('installation', value)}>{value.replace('-', ' ')}</button>)}</fieldset>
        <fieldset><legend>Running state</legend>{['all', 'running', 'not-running'].map((value) => <button key={value} type="button" aria-pressed={filters.running === value} onClick={() => onFilter('running', value)}>{value.replace('-', ' ')}</button>)}</fieldset>
        <fieldset><legend>Hardware fit</legend>{['all', 'runs-well', 'runs-with-limits', 'unlikely', 'unknown'].map((value) => <button key={value} type="button" aria-pressed={filters.fit === value} onClick={() => onFilter('fit', value)}>{value === 'all' ? 'all' : fitLabel(value as OllamaModelVariant['fit']['verdict'])}</button>)}</fieldset>
        <div className="ollama-filter-chips" aria-label="Model families">
          <strong>Families</strong>
          <button type="button" aria-pressed={!filters.family} onClick={() => onFilter('family', '')}>All</button>
          {families.map((family) => <button key={family} type="button" aria-pressed={filters.family === family} onClick={() => onFilter('family', family)}>{family}</button>)}
        </div>
        <div className="ollama-filter-chips" aria-label="Capabilities">
          <strong>Capabilities</strong>
          <button type="button" aria-pressed={!filters.capability} onClick={() => onFilter('capability', '')}>All</button>
          {capabilities.map((capability) => <button key={capability} type="button" aria-pressed={filters.capability === capability} onClick={() => onFilter('capability', capability)}>{capability}</button>)}
        </div>
      </div>
      <aside className="ollama-pull-plan" aria-label="Batch pull plan">
        <div><strong>{selected.size}</strong> variant{selected.size === 1 ? '' : 's'} selected</div>
        <div>Additional storage: {formatBytes(additionalBytes)}</div>
        <div>Free destination storage: {formatBytes(freeBytes)}</div>
        <div>Pulling transfers model data over the network into the local Ollama store.</div>
        <button type="button" disabled={Boolean(pending) || selected.size === 0 || insufficientStorage} onClick={onQueue}>Add selected variants to pull queue</button>
        {insufficientStorage && <p className="ollama-error">Insufficient storage. The selected variants require {formatBytes(additionalBytes)}, but the destination reports {formatBytes(freeBytes)} free.</p>}
      </aside>
      {visibleVariants.length === 0 ? (
        <EmptyState title="No model variants match" body="No backend-provided variant matches the current search and filter criteria. Clear a filter or refresh the complete catalog." />
      ) : (
        <div className="ollama-model-grid">
          {visibleVariants.map((variant) => (
            <article key={variant.id} className="ollama-model-card">
              <header>
                <label className="ollama-select-model">
                  <input type="checkbox" checked={selected.has(variant.id)} onChange={() => onToggle(variant.id)} />
                  <span className="sr-only">Select {variant.exactTag} for the pull queue</span>
                </label>
                <div><h3>{variant.displayName}</h3><code>{variant.exactTag}</code></div>
                <span className={statusClass(variant.fit.verdict)}>{fitLabel(variant.fit.verdict)}</span>
              </header>
              <p>{variant.description ?? 'No description was supplied by the catalog.'}</p>
              <dl className="ollama-model-facts">
                <div><dt>Family</dt><dd>{variant.family}</dd></div>
                <div><dt>Blob size</dt><dd>{formatBytes(variant.blobSizeBytes)}</dd></div>
                <div><dt>Parameters</dt><dd>{variant.parameterCount?.toLocaleString() ?? 'Not reported'}</dd></div>
                <div><dt>Quantization</dt><dd>{variant.quantization ?? 'Not reported'}</dd></div>
                <div><dt>Context</dt><dd>{variant.contextWindow?.toLocaleString() ?? 'Not reported'}</dd></div>
                <div><dt>Local state</dt><dd>{variant.running ? 'Running' : variant.installed ? 'Installed' : 'Not installed'}</dd></div>
              </dl>
              <div className="ollama-capabilities" aria-label={`Capabilities for ${variant.exactTag}`}>
                {variant.capabilities.map((capability) => <span key={capability.id} className={capability.available ? 'ollama-chip' : 'ollama-chip ollama-chip--disabled'} title={capability.reason}>{capability.label}</span>)}
              </div>
              {!variant.metadataComplete && <p className="ollama-warning">Metadata is incomplete: {variant.metadataGaps.join(', ') || 'the backend did not name the gaps'}.</p>}
              <FitEvidence variant={variant} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PullQueue({ queue, pending, onStart, onPause, onResume, onCancel, onRetry }: {
  readonly queue?: PullQueueEvidence;
  readonly pending?: string;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onCancel: (id: string) => void;
  readonly onRetry: (id: string) => void;
}) {
  if (!queue) return <EmptyState title="Pull queue has not been read" body="The backend has not supplied durable queue state. No transfer state is inferred locally." />;
  const failed = queue.items.filter((item) => item.state === 'failed');
  const complete = queue.items.filter((item) => item.state === 'complete');
  const partial = failed.length > 0 && complete.length > 0;
  return (
    <section className="ollama-view" aria-labelledby="ollama-pulls-title">
      <header className="ollama-section-heading"><div><span className="ollama-eyebrow">Local batch transfer</span><h2 id="ollama-pulls-title">Pull queue</h2></div></header>
      <div className="ollama-queue-summary">
        <span>Bounded parallelism: {queue.concurrency}</span>
        <span>Additional storage: {formatBytes(queue.aggregateAdditionalStorageBytes)}</span>
        <span>Free storage: {formatBytes(queue.freeStorageBytes)}</span>
        <span>{queue.networkDisclosure}</span>
      </div>
      {partial && <div className={statusClass('failed')}>Partial outcome: {complete.length} completed and {failed.length} failed. Completed models remain installed; failed items can be retried individually.</div>}
      <div className="ollama-actions">
        <button type="button" disabled={Boolean(pending) || queue.items.length === 0 || queue.paused} onClick={onStart}>Start queued pulls</button>
        <button type="button" disabled={Boolean(pending) || queue.paused} onClick={onPause}>Pause queue</button>
        <button type="button" disabled={Boolean(pending) || !queue.paused} onClick={onResume}>Resume queue</button>
      </div>
      {queue.items.length === 0 ? <EmptyState title="Pull queue is empty" body="Choose exact variants in Model Store, then add them to this queue." /> : (
        <ol className="ollama-queue-list">
          {queue.items.map((item) => {
            const progress = percentage(item.completedBytes, item.totalBytes);
            return (
              <li key={item.id}>
                <div className="ollama-queue-item-heading"><code>{item.exactTag}</code><span className={statusClass(item.state)}>{item.state}</span></div>
                <p>{item.statusText}</p>
                <div className="ollama-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`Pull progress for ${item.exactTag}`}>
                  {progress === undefined ? <span className="ollama-progress--unknown">Byte progress not reported</span> : <span style={{ width: `${progress}%` }}>{progress}%</span>}
                </div>
                <p>{formatBytes(item.completedBytes)} of {formatBytes(item.totalBytes)}</p>
                {item.error && <p className="ollama-error">{item.error.message}{item.error.recoveryAction ? ` ${item.error.recoveryAction}` : ''}</p>}
                <div className="ollama-actions">
                  <button type="button" disabled={Boolean(pending) || !['queued', 'pulling', 'paused'].includes(item.state)} onClick={() => onCancel(item.id)}>Cancel</button>
                  <button type="button" disabled={Boolean(pending) || item.state !== 'failed' || !item.error?.retryable} onClick={() => onRetry(item.id)}>Retry</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ChatSurface({
  snapshot,
  visibleSessions,
  selectedSession,
  pending,
  draft,
  systemPrompt,
  temperature,
  contextWindow,
  attachmentIds,
  onSelectSession,
  onNewSession,
  onDraft,
  onSystemPrompt,
  onTemperature,
  onContextWindow,
  onSend,
  onStop,
  onChooseAttachments,
  onOpenStore,
  onModelFilter,
}: {
  readonly snapshot: OllamaSuiteSnapshot;
  readonly visibleSessions: ReadonlyArray<ChatSession>;
  readonly selectedSession?: ChatSession;
  readonly pending?: string;
  readonly draft: string;
  readonly systemPrompt: string;
  readonly temperature: number;
  readonly contextWindow: string;
  readonly attachmentIds: ReadonlyArray<string>;
  readonly onSelectSession: (id: string) => void;
  readonly onNewSession: (variantId: string) => void;
  readonly onDraft: (value: string) => void;
  readonly onSystemPrompt: (value: string) => void;
  readonly onTemperature: (value: number) => void;
  readonly onContextWindow: (value: string) => void;
  readonly onSend: () => void;
  readonly onStop: () => void;
  readonly onChooseAttachments: (kind: string) => void;
  readonly onOpenStore: () => void;
  readonly onModelFilter: (capability: string) => void;
}) {
  const chatVariants = snapshot.variants.filter((variant) => variant.installed && variant.capabilities.some((capability) => capability.id === 'chat' && capability.available));
  return (
    <section className="ollama-view ollama-chat-layout" aria-labelledby="ollama-chat-title">
      <header className="ollama-section-heading"><div><span className="ollama-eyebrow">Local streamed responses</span><h2 id="ollama-chat-title">Chat sessions</h2></div></header>
      <aside className="ollama-chat-sidebar">
        <h3>Start with an installed chat model</h3>
        {chatVariants.length === 0 ? <div className="ollama-warning"><p>No installed variant reports chat capability.</p><button type="button" onClick={onOpenStore}>Open Model Store</button></div> : (
          <div className="ollama-choice-list">
            {chatVariants.map((variant) => <button key={variant.id} type="button" disabled={Boolean(pending)} onClick={() => onNewSession(variant.id)}><strong>{variant.displayName}</strong><code>{variant.exactTag}</code><span>{fitLabel(variant.fit.verdict)}</span></button>)}
          </div>
        )}
        <label><span>System prompt</span><textarea value={systemPrompt} onChange={(event) => onSystemPrompt(event.target.value)} /></label>
        <label><span>Temperature: {temperature.toFixed(1)}</span><input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(event) => onTemperature(Number(event.target.value))} /></label>
        <label><span>Context window</span><input type="number" min="128" step="128" value={contextWindow} placeholder="Use model default" onChange={(event) => onContextWindow(event.target.value)} /></label>
        <h3>Saved sessions</h3>
        {visibleSessions.length === 0 ? <p>No sessions match the current search.</p> : visibleSessions.map((session) => <button key={session.id} type="button" className="ollama-session-button" aria-pressed={selectedSession?.id === session.id} onClick={() => onSelectSession(session.id)}><strong>{session.title}</strong><span>{session.exactTag}</span><span>{readableTime(session.updatedAt)}</span></button>)}
      </aside>
      <main className="ollama-chat-main">
        {!selectedSession ? <EmptyState title="Choose or create a local chat" body="Messages appear only after the backend creates a session with a real installed model." /> : (
          <>
            <header><div><h3>{selectedSession.title}</h3><code>{selectedSession.exactTag}</code></div><span className={statusClass(selectedSession.streamState)}>{selectedSession.streamState}</span></header>
            {selectedSession.error && <div className={statusClass('failed')}>Chat interruption: {selectedSession.error.message}{selectedSession.error.recoveryAction ? ` ${selectedSession.error.recoveryAction}` : ''}</div>}
            <ol className="ollama-message-list" aria-live="polite">
              {selectedSession.messages.map((message) => <li key={message.id} className={`ollama-message ollama-message--${message.role}`}><span>{message.role}</span><p>{message.content}</p>{message.partial && <small>Streaming response, not complete</small>}{message.error && <small className="ollama-error">{message.error.message}</small>}</li>)}
            </ol>
            <div className="ollama-attachments">
              <strong>Attachments</strong>
              {selectedSession.attachmentCapabilities.map((capability) => <button key={capability.kind} type="button" disabled={Boolean(pending) || !capability.enabled} title={!capability.enabled ? capability.reason : undefined} onClick={() => onChooseAttachments(capability.kind)}>{capability.label}</button>)}
              {selectedSession.attachmentCapabilities.filter((capability) => !capability.enabled).map((capability) => <div key={`${capability.kind}-reason`} className="ollama-helper"><p><strong>{capability.label} unavailable:</strong> {capability.reason ?? 'The selected model did not report support.'}</p>{capability.modelFilterAction && <button type="button" onClick={() => onModelFilter(capability.modelFilterAction!.capabilityFilter)}>{capability.modelFilterAction.label}</button>}</div>)}
              {attachmentIds.length > 0 && <p>{attachmentIds.length} backend-approved attachment{attachmentIds.length === 1 ? '' : 's'} selected.</p>}
            </div>
            <label className="ollama-compose"><span>Message</span><textarea value={draft} onChange={(event) => onDraft(event.target.value)} /></label>
            <div className="ollama-actions">
              <button type="button" disabled={Boolean(pending) || !draft.trim() || selectedSession.streamState === 'streaming'} onClick={onSend}>Send to local model</button>
              <button type="button" disabled={Boolean(pending) || selectedSession.streamState !== 'streaming'} onClick={onStop}>Stop response</button>
            </div>
          </>
        )}
      </main>
    </section>
  );
}

function HarnessSurface({
  snapshot,
  visibleProfiles,
  selectedProfile,
  selectedVariant,
  preflight,
  pending,
  draft,
  onSelectProfile,
  onSelectVariant,
  onPickExecutable,
  onPickDirectory,
  onDraft,
  onRegister,
  onPreflight,
  onLaunch,
  onRestore,
}: {
  readonly snapshot: OllamaSuiteSnapshot;
  readonly visibleProfiles: ReadonlyArray<HarnessProfile>;
  readonly selectedProfile?: HarnessProfile;
  readonly selectedVariant?: OllamaModelVariant;
  readonly preflight?: import('./ollama-suite-model').HarnessPreflight;
  readonly pending?: string;
  readonly draft: import('./ollama-suite-state').HarnessDraft;
  readonly onSelectProfile: (id: string) => void;
  readonly onSelectVariant: (id: string) => void;
  readonly onPickExecutable: () => void;
  readonly onPickDirectory: () => void;
  readonly onDraft: (value: Partial<import('./ollama-suite-state').HarnessDraft>) => void;
  readonly onRegister: () => void;
  readonly onPreflight: () => void;
  readonly onLaunch: () => void;
  readonly onRestore: (id: string) => void;
}) {
  const run = snapshot.harnessRun;
  const compatibleVariants = selectedProfile
    ? snapshot.variants.filter((variant) => selectedProfile.compatibleVariantIds.includes(variant.id))
    : [];
  return (
    <section className="ollama-view" aria-labelledby="ollama-harness-title">
      <header className="ollama-section-heading"><div><span className="ollama-eyebrow">Allowlisted local orchestration</span><h2 id="ollama-harness-title">Harness profiles</h2></div></header>
      <div className="ollama-harness-grid">
        <section>
          <h3>Verified profiles</h3>
          {visibleProfiles.length === 0 ? <EmptyState title="No harness profile matches" body="Refresh backend state or clear the current profile search." /> : (
            <div className="ollama-choice-list">{visibleProfiles.map((profile) => <button key={profile.id} type="button" aria-pressed={selectedProfile?.id === profile.id} onClick={() => onSelectProfile(profile.id)}><strong>{profile.label}</strong><span>{profile.description}</span><span>{profile.source}</span>{!profile.executableAvailable && <small>{profile.executableReason ?? 'Executable unavailable'}</small>}</button>)}</div>
          )}
        </section>
        <section>
          <h3>Register through guided pickers</h3>
          <p className="ollama-helper">Registration accepts a selected executable and an existing allowlisted argument profile. It never accepts shell text or command concatenation.</p>
          <label><span>Profile name</span><input value={draft.label} onChange={(event) => onDraft({ label: event.target.value })} /></label>
          <div className="ollama-picker-result"><strong>Executable</strong><span>{draft.executableDisplayPath ?? 'No executable selected'}</span><button type="button" onClick={onPickExecutable}>Browse for executable</button></div>
          <div className="ollama-picker-result"><strong>Working directory</strong><span>{draft.workingDirectoryDisplayPath ?? 'Use the allowlisted profile default'}</span><button type="button" onClick={onPickDirectory}>Browse for folder</button></div>
          <div className="ollama-choice-list">
            <strong>Argument profile</strong>
            {snapshot.harnessProfiles.filter((profile) => profile.source === 'bundled').map((profile) => <button key={profile.id} type="button" aria-pressed={draft.argumentProfileId === profile.id} onClick={() => onDraft({ argumentProfileId: profile.id })}>{profile.label}</button>)}
          </div>
          <button type="button" disabled={Boolean(pending) || !draft.label.trim() || !draft.executableSelectionId || !draft.argumentProfileId} onClick={onRegister}>Register allowlisted profile</button>
        </section>
      </div>
      {selectedProfile && (
        <section className="ollama-preflight-panel">
          <h3>Preflight: {selectedProfile.label}</h3>
          <dl className="ollama-model-facts"><div><dt>Executable</dt><dd>{selectedProfile.executableLabel}</dd></div><div><dt>Working directory</dt><dd>{selectedProfile.workingDirectoryLabel ?? 'Profile default'}</dd></div><div><dt>Required ports</dt><dd>{selectedProfile.requiredPorts.join(', ') || 'None'}</dd></div><div><dt>Required files</dt><dd>{selectedProfile.requiredFiles.join(', ') || 'None'}</dd></div></dl>
          <h4>Choose a backend-approved compatible model</h4>
          {compatibleVariants.length === 0 ? <p className="ollama-warning">This profile reports no compatible model variants. Launch remains disabled.</p> : <div className="ollama-choice-list ollama-choice-list--horizontal">{compatibleVariants.map((variant) => <button key={variant.id} type="button" aria-pressed={selectedVariant?.id === variant.id} onClick={() => onSelectVariant(variant.id)}><code>{variant.exactTag}</code><span>{fitLabel(variant.fit.verdict)}</span></button>)}</div>}
          <div className="ollama-actions"><button type="button" disabled={Boolean(pending) || !selectedVariant || !selectedProfile.executableAvailable} onClick={onPreflight}>Run visible preflight</button><button type="button" disabled={Boolean(pending) || !preflight?.ready || preflight.profileId !== selectedProfile.id || preflight.variantId !== selectedVariant?.id} onClick={onLaunch}>Snapshot configuration and launch</button></div>
          {preflight && <section className={preflight.ready ? statusClass('ready') : statusClass('failed')}><strong>{preflight.ready ? 'Preflight ready' : 'Preflight blocked'}</strong><p>Executable: {preflight.executable}</p><p>Arguments: {preflight.argumentPreview.join(' ') || 'None'}</p><p>Environment keys: {preflight.environmentKeys.map((item) => `${item.key}${item.redacted ? ' (redacted)' : ''}`).join(', ') || 'None'}</p>{preflight.blockers.length > 0 && <p>Blockers: {preflight.blockers.join('; ')}</p>}{preflight.warnings.length > 0 && <p>Warnings: {preflight.warnings.join('; ')}</p>}</section>}
        </section>
      )}
      <section className="ollama-run-state" aria-label="Harness launch and rollback status">
        <h3>Launch, snapshot, and rollback</h3>
        {!run ? <p>The backend has not reported a harness run. No launch state is inferred.</p> : <><span className={statusClass(run.state)}>{run.state}</span><p>{run.statusText ?? 'No additional status was reported.'}</p><p>Configuration snapshot: {run.snapshotId ?? 'Not reported'}</p><p>Rollback: {run.rollbackStatus ?? 'Not reported'}{run.rollbackReason ? ` - ${run.rollbackReason}` : ''}</p>{run.error && <p className="ollama-error">{run.error.message}</p>}{run.snapshotId && <button type="button" disabled={Boolean(pending) || run.rollbackStatus === 'running'} onClick={() => onRestore(run.snapshotId!)}>Restore this snapshot</button>}</>}
      </section>
    </section>
  );
}

export function OllamaSuite({ client, initialSnapshot, className = '' }: OllamaSuiteProps) {
  const [state, dispatch] = useReducer(ollamaSuiteReducer, {
    ...INITIAL_OLLAMA_SUITE_STATE,
    loading: !initialSnapshot,
    snapshot: initialSnapshot,
  });
  const [newChatVariantId, setNewChatVariantId] = useState<string>();
  const searchGeneration = useRef<Record<SearchScope, number>>({
    catalog: 0,
    'chat-sessions': 0,
    'harness-profiles': 0,
  });

  useEffect(() => {
    let active = true;
    if (!initialSnapshot) {
      void client.readSnapshot().then((response) => {
        if (!active) return;
        if (response.ok) dispatch({ type: 'snapshot-loaded', snapshot: response.value });
        else dispatch({ type: 'snapshot-failed', error: response.error });
      }).catch((error: unknown) => {
        if (!active) return;
        dispatch({ type: 'snapshot-failed', error: normalizeClientRejection(error, 'initial snapshot') });
      });
    }
    const unsubscribe = client.subscribe((event) => active && dispatch({ type: 'event', event }));
    return () => { active = false; unsubscribe(); };
  }, [client, initialSnapshot]);

  useEffect(() => {
    if (state.view !== 'pulls') return undefined;
    /* The local service exposes durable pull records rather than a renderer event
     * stream. Poll only while the pull view is open, so byte progress, cancellation,
     * and mixed terminal outcomes become visible without inventing a background
     * websocket or keeping the service busy when the user is elsewhere. */
    const timer = window.setInterval(() => {
      void client.readSnapshot().then((response) => {
        if (response.ok) dispatch({ type: 'snapshot-loaded', snapshot: response.value });
      });
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [client, state.view]);

  const filters = state.catalogFilters;
  const evaluateSearch = useCallback((scope: SearchScope, search: RegexBuilderState) => {
    const generation = searchGeneration.current[scope] + 1;
    searchGeneration.current[scope] = generation;
    const filterRecord = scope === 'catalog' ? {
      family: filters.family,
      capability: filters.capability,
      installation: filters.installation,
      running: filters.running,
      fit: filters.fit,
    } : undefined;
    const request: RegexSearchRequest = {
      scope,
      query: search.query,
      mode: search.mode,
      pattern: search.pattern,
      flags: search.flags,
      sample: search.sample,
      limits: SEARCH_LIMITS,
      filters: filterRecord,
    };
    dispatch({ type: 'set-search', scope, search: { evaluating: true, result: undefined } });
    void client.search(request).then((response) => {
      if (searchGeneration.current[scope] !== generation) return;
      if (response.ok) dispatch({ type: 'set-search', scope, search: { evaluating: false, result: response.value } });
      else {
        dispatch({ type: 'set-search', scope, search: { evaluating: false, result: undefined } });
        dispatch({ type: 'operation-failed', error: response.error });
      }
    }).catch((error: unknown) => {
      if (searchGeneration.current[scope] !== generation) return;
      dispatch({ type: 'set-search', scope, search: { evaluating: false, result: undefined } });
      dispatch({ type: 'operation-failed', error: normalizeClientRejection(error, `${scope} search`) });
    });
  }, [client, filters]);

  useEffect(() => {
    const handle = window.setTimeout(() => evaluateSearch('catalog', state.catalogSearch), 240);
    return () => window.clearTimeout(handle);
  }, [evaluateSearch, state.catalogSearch.query, state.catalogSearch.pattern, state.catalogSearch.flags, state.catalogSearch.mode, state.catalogSearch.sample]);
  useEffect(() => {
    const handle = window.setTimeout(() => evaluateSearch('chat-sessions', state.chatSearch), 240);
    return () => window.clearTimeout(handle);
  }, [evaluateSearch, state.chatSearch.query, state.chatSearch.pattern, state.chatSearch.flags, state.chatSearch.mode, state.chatSearch.sample]);
  useEffect(() => {
    const handle = window.setTimeout(() => evaluateSearch('harness-profiles', state.harnessSearch), 240);
    return () => window.clearTimeout(handle);
  }, [evaluateSearch, state.harnessSearch.query, state.harnessSearch.pattern, state.harnessSearch.flags, state.harnessSearch.mode, state.harnessSearch.sample]);

  const perform = useCallback(async <T,>(name: string, work: () => Promise<BackendResponse<T>>, accept?: (value: T) => void, notice?: string) => {
    dispatch({ type: 'operation-started', operation: name });
    let response: BackendResponse<T>;
    try {
      response = await work();
    } catch (error: unknown) {
      dispatch({ type: 'operation-failed', error: normalizeClientRejection(error, name) });
      return;
    }
    if (!response.ok) {
      dispatch({ type: 'operation-failed', error: response.error });
      return;
    }
    accept?.(response.value);
    dispatch({ type: 'operation-finished', notice });
  }, []);

  const snapshot = state.snapshot;
  const visibleVariants = useMemo(() => {
    if (!snapshot) return [];
    const ids = state.catalogSearch.result?.valid ? new Set(state.catalogSearch.result.matchedIds) : undefined;
    return ids ? snapshot.variants.filter((variant) => ids.has(variant.id)) : snapshot.variants;
  }, [snapshot, state.catalogSearch.result]);
  const visibleSessions = useMemo(() => {
    if (!snapshot) return [];
    const ids = state.chatSearch.result?.valid ? new Set(state.chatSearch.result.matchedIds) : undefined;
    return ids ? snapshot.chatSessions.filter((session) => ids.has(session.id)) : snapshot.chatSessions;
  }, [snapshot, state.chatSearch.result]);
  const visibleProfiles = useMemo(() => {
    if (!snapshot) return [];
    const ids = state.harnessSearch.result?.valid ? new Set(state.harnessSearch.result.matchedIds) : undefined;
    return ids ? snapshot.harnessProfiles.filter((profile) => ids.has(profile.id)) : snapshot.harnessProfiles;
  }, [snapshot, state.harnessSearch.result]);
  const selectedSession = snapshot?.chatSessions.find((session) => session.id === state.selectedChatId);
  const selectedProfile = snapshot?.harnessProfiles.find((profile) => profile.id === state.selectedHarnessProfileId);
  const selectedHarnessVariant = snapshot?.variants.find((variant) => variant.id === state.selectedHarnessVariantId);

  if (state.loading && !snapshot) {
    return <section className={`ollama-suite ${className}`} aria-busy="true"><EmptyState title="Reading local Ollama state" body="Waiting for a typed backend snapshot. No model, progress, or health state is assumed while the request is pending." /></section>;
  }
  if (!snapshot) {
    return <section className={`ollama-suite ${className}`}><EmptyState title="Ollama state unavailable" body={state.error?.message ?? 'The backend did not return a snapshot.'} action={<button type="button" onClick={() => window.location.reload()}>Reload this surface</button>} /></section>;
  }

  const setSearch = (scope: SearchScope, search: Partial<RegexBuilderState>) => dispatch({ type: 'set-search', scope, search });
  const updateQueue = (queue: PullQueueEvidence) => dispatch({ type: 'queue-updated', queue });

  return (
    <section className={`ollama-suite ${className}`} aria-label="Local Ollama suite manager">
      <header className="ollama-hero">
        <div><span className="ollama-eyebrow">Local models, evidence first</span><h1>Ollama suite manager</h1><p>Inspect the verified runtime, every catalog variant, conservative hardware fit, local pulls, streamed chats, and allowlisted harness launches.</p></div>
        <span className="material-symbols-rounded ollama-hero-icon" aria-hidden="true">deployed_code</span>
      </header>
      <RuntimeCard
        snapshot={snapshot}
        pending={state.pendingOperation}
        onRefresh={() => void perform('refresh-runtime', () => client.refreshRuntime(), (runtime) => dispatch({ type: 'runtime-updated', runtime }), 'Runtime evidence refreshed.')}
        onAction={(id) => void perform(`runtime-action:${id}`, () => client.runRuntimeAction(id), (runtime) => dispatch({ type: 'runtime-updated', runtime }), 'Runtime action completed and evidence was refreshed.')}
      />
      {(state.error || state.notice) && <div className={statusClass(state.error ? 'failed' : 'ready')} role="status"><span>{state.error?.message ?? state.notice}</span>{state.error?.recoveryAction && <span>{state.error.recoveryAction}</span>}<button type="button" onClick={() => dispatch({ type: 'dismiss-message' })}>Dismiss</button></div>}
      <nav className="ollama-tabs" aria-label="Ollama suite sections">
        {([
          ['store', 'Model Store', 'view_list'],
          ['pulls', 'Pull queue', 'download'],
          ['chat', 'Local chat', 'forum'],
          ['harnesses', 'Harnesses', 'terminal'],
        ] as const).map(([view, label, icon]) => <button key={view} type="button" aria-current={state.view === view ? 'page' : undefined} onClick={() => dispatch({ type: 'set-view', view })}><span className="material-symbols-rounded" aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>
      {state.view === 'store' && <RegexBuilder label="Search all model variants" scope="catalog" value={state.catalogSearch} onChange={(search) => setSearch('catalog', search)} />}
      {state.view === 'chat' && <RegexBuilder label="Search chat sessions" scope="chat-sessions" value={state.chatSearch} onChange={(search) => setSearch('chat-sessions', search)} />}
      {state.view === 'harnesses' && <RegexBuilder label="Search harness profiles" scope="harness-profiles" value={state.harnessSearch} onChange={(search) => setSearch('harness-profiles', search)} />}
      {state.view === 'store' && (
        <ModelStore
          snapshot={snapshot}
          visibleVariants={visibleVariants}
          selected={state.selectedVariantIds}
          filters={state.catalogFilters}
          pending={state.pendingOperation}
          onToggle={(variantId) => dispatch({ type: 'toggle-variant', variantId })}
          onFilter={(filter, value) => dispatch({ type: 'set-catalog-filter', filter, value })}
          onRefresh={() => void perform('refresh-catalog', () => client.refreshCatalog(), (value) => dispatch({ type: 'snapshot-loaded', snapshot: value }), 'Catalog refresh finished. Check completeness evidence before relying on the inventory.')}
          onQueue={() => void perform('queue-pulls', () => client.queuePulls([...state.selectedVariantIds]), updateQueue, 'Selected variants were added to the durable pull queue.')}
        />
      )}
      {state.view === 'pulls' && (
        <PullQueue
          queue={snapshot.pullQueue}
          pending={state.pendingOperation}
          onStart={() => void perform('start-pulls', () => client.startPulls(), updateQueue)}
          onPause={() => void perform('pause-pulls', () => client.pausePulls(), updateQueue, 'Pull queue paused at backend-confirmed boundaries.')}
          onResume={() => void perform('resume-pulls', () => client.resumePulls(), updateQueue)}
          onCancel={(id) => void perform(`cancel-pull:${id}`, () => client.cancelPull(id), updateQueue)}
          onRetry={(id) => void perform(`retry-pull:${id}`, () => client.retryPull(id), updateQueue)}
        />
      )}
      {state.view === 'chat' && (
        <ChatSurface
          snapshot={snapshot}
          visibleSessions={visibleSessions}
          selectedSession={selectedSession}
          pending={state.pendingOperation}
          draft={state.chatDraft}
          systemPrompt={state.chatSystemPrompt}
          temperature={state.chatTemperature}
          contextWindow={state.chatContextWindow}
          attachmentIds={state.attachmentIds}
          onSelectSession={(chatId) => dispatch({ type: 'select-chat', chatId })}
          onNewSession={(variantId) => {
            setNewChatVariantId(variantId);
            const parsed = state.chatContextWindow ? Number(state.chatContextWindow) : undefined;
            void perform('create-chat', () => client.createChat({ variantId, systemPrompt: state.chatSystemPrompt, temperature: state.chatTemperature, contextWindow: Number.isFinite(parsed) ? parsed : undefined }), (chat) => dispatch({ type: 'chat-updated', chat }));
          }}
          onDraft={(value) => dispatch({ type: 'set-chat-draft', value })}
          onSystemPrompt={(value) => dispatch({ type: 'set-chat-system-prompt', value })}
          onTemperature={(value) => dispatch({ type: 'set-chat-temperature', value })}
          onContextWindow={(value) => dispatch({ type: 'set-chat-context-window', value })}
          onSend={() => selectedSession && void perform('send-chat', () => client.sendChat({ sessionId: selectedSession.id, content: state.chatDraft, attachmentIds: state.attachmentIds }), (chat) => { dispatch({ type: 'chat-updated', chat }); dispatch({ type: 'set-chat-draft', value: '' }); dispatch({ type: 'set-attachments', attachmentIds: [] }); })}
          onStop={() => selectedSession && void perform('stop-chat', () => client.stopChat(selectedSession.id), (chat) => dispatch({ type: 'chat-updated', chat }))}
          onChooseAttachments={(kind) => selectedSession && void perform('choose-attachments', () => client.chooseAttachments(selectedSession.id, kind), (attachmentIds) => dispatch({ type: 'set-attachments', attachmentIds }))}
          onOpenStore={() => dispatch({ type: 'set-view', view: 'store' })}
          onModelFilter={(capability) => { dispatch({ type: 'set-catalog-filter', filter: 'capability', value: capability }); dispatch({ type: 'set-view', view: 'store' }); }}
        />
      )}
      {state.view === 'harnesses' && (
        <HarnessSurface
          snapshot={snapshot}
          visibleProfiles={visibleProfiles}
          selectedProfile={selectedProfile}
          selectedVariant={selectedHarnessVariant}
          preflight={state.preflight}
          pending={state.pendingOperation}
          draft={state.harnessDraft}
          onSelectProfile={(profileId) => dispatch({ type: 'select-harness-profile', profileId })}
          onSelectVariant={(variantId) => dispatch({ type: 'select-harness-variant', variantId })}
          onPickExecutable={() => void perform('pick-harness-executable', () => client.pickHarnessExecutable(), (value) => dispatch({ type: 'set-harness-draft', draft: { executableSelectionId: value.selectionId, executableDisplayPath: value.displayPath } }))}
          onPickDirectory={() => void perform('pick-harness-directory', () => client.pickHarnessWorkingDirectory(), (value) => dispatch({ type: 'set-harness-draft', draft: { workingDirectorySelectionId: value.selectionId, workingDirectoryDisplayPath: value.displayPath } }))}
          onDraft={(draft) => dispatch({ type: 'set-harness-draft', draft })}
          onRegister={() => void perform('register-harness', () => client.registerHarness({ executableSelectionId: state.harnessDraft.executableSelectionId!, label: state.harnessDraft.label, argumentProfileId: state.harnessDraft.argumentProfileId!, workingDirectorySelectionId: state.harnessDraft.workingDirectorySelectionId }), (value) => { dispatch({ type: 'snapshot-loaded', snapshot: value.snapshot }); dispatch({ type: 'select-harness-profile', profileId: value.profile.id }); }, 'Harness profile registered through the backend allowlist.')}
          onPreflight={() => selectedProfile && selectedHarnessVariant && void perform('preflight-harness', () => client.preflightHarness(selectedProfile.id, selectedHarnessVariant.id), (preflight) => dispatch({ type: 'set-preflight', preflight }))}
          onLaunch={() => selectedProfile && selectedHarnessVariant && void perform('launch-harness', () => client.launchHarness(selectedProfile.id, selectedHarnessVariant.id), (run) => dispatch({ type: 'harness-updated', run }))}
          onRestore={(snapshotId) => void perform('restore-harness-snapshot', () => client.restoreHarnessSnapshot(snapshotId), (run) => dispatch({ type: 'harness-updated', run }))}
        />
      )}
      <footer className="ollama-suite-footer">
        <span>Snapshot sequence {snapshot.sequence}</span>
        <span>Received {readableTime(snapshot.receivedAt)}</span>
        <span>{snapshot.variants.length} backend-provided variants</span>
        {newChatVariantId && <span>Most recently requested chat model: {snapshot.variants.find((variant) => variant.id === newChatVariantId)?.exactTag ?? 'No longer present in the snapshot'}</span>}
      </footer>
    </section>
  );
}
