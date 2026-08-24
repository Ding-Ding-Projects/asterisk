import type {
  BackendFailure,
  ChatSession,
  HarnessPreflight,
  HarnessRunEvidence,
  OllamaRuntimeEvidence,
  OllamaSuiteEvent,
  OllamaSuiteSnapshot,
  PullQueueEvidence,
  RegexSearchResult,
} from './ollama-suite-model';

export type OllamaSuiteView = 'store' | 'pulls' | 'chat' | 'harnesses';
export type SearchScope = 'catalog' | 'chat-sessions' | 'harness-profiles';

export interface RegexBuilderState {
  readonly open: boolean;
  readonly mode: 'plain' | 'regex';
  readonly query: string;
  readonly pattern: string;
  readonly flags: string;
  readonly sample: string;
  readonly result?: RegexSearchResult;
  readonly evaluating: boolean;
}

export interface CatalogFilters {
  readonly family: string;
  readonly capability: string;
  readonly installation: 'all' | 'installed' | 'not-installed';
  readonly running: 'all' | 'running' | 'not-running';
  readonly fit: 'all' | 'runs-well' | 'runs-with-limits' | 'unlikely' | 'unknown';
}

export interface HarnessDraft {
  readonly executableSelectionId?: string;
  readonly executableDisplayPath?: string;
  readonly workingDirectorySelectionId?: string;
  readonly workingDirectoryDisplayPath?: string;
  readonly label: string;
  readonly argumentProfileId?: string;
}

export interface OllamaSuiteState {
  readonly view: OllamaSuiteView;
  readonly loading: boolean;
  readonly snapshot?: OllamaSuiteSnapshot;
  readonly error?: BackendFailure;
  readonly notice?: string;
  readonly selectedVariantIds: ReadonlySet<string>;
  readonly selectedChatId?: string;
  readonly selectedHarnessProfileId?: string;
  readonly selectedHarnessVariantId?: string;
  readonly catalogSearch: RegexBuilderState;
  readonly chatSearch: RegexBuilderState;
  readonly harnessSearch: RegexBuilderState;
  readonly catalogFilters: CatalogFilters;
  readonly pendingOperation?: string;
  readonly chatDraft: string;
  readonly chatSystemPrompt: string;
  readonly chatTemperature: number;
  readonly chatContextWindow: string;
  readonly attachmentIds: ReadonlyArray<string>;
  readonly preflight?: HarnessPreflight;
  readonly harnessDraft: HarnessDraft;
}

const EMPTY_SEARCH: RegexBuilderState = {
  open: false,
  mode: 'plain',
  query: '',
  pattern: '',
  flags: 'iu',
  sample: '',
  evaluating: false,
};

export const INITIAL_OLLAMA_SUITE_STATE: OllamaSuiteState = {
  view: 'store',
  loading: true,
  selectedVariantIds: new Set(),
  catalogSearch: EMPTY_SEARCH,
  chatSearch: EMPTY_SEARCH,
  harnessSearch: EMPTY_SEARCH,
  catalogFilters: {
    family: '',
    capability: '',
    installation: 'all',
    running: 'all',
    fit: 'all',
  },
  chatDraft: '',
  chatSystemPrompt: '',
  chatTemperature: 0.8,
  chatContextWindow: '',
  attachmentIds: [],
  harnessDraft: { label: '' },
};

export type OllamaSuiteAction =
  | { readonly type: 'snapshot-loaded'; readonly snapshot: OllamaSuiteSnapshot }
  | { readonly type: 'snapshot-failed'; readonly error: BackendFailure }
  | { readonly type: 'event'; readonly event: OllamaSuiteEvent }
  | { readonly type: 'set-view'; readonly view: OllamaSuiteView }
  | { readonly type: 'toggle-variant'; readonly variantId: string }
  | { readonly type: 'clear-selection' }
  | { readonly type: 'set-search'; readonly scope: SearchScope; readonly search: Partial<RegexBuilderState> }
  | { readonly type: 'set-catalog-filter'; readonly filter: keyof CatalogFilters; readonly value: string }
  | { readonly type: 'operation-started'; readonly operation: string }
  | { readonly type: 'operation-failed'; readonly error: BackendFailure }
  | { readonly type: 'operation-finished'; readonly notice?: string }
  | { readonly type: 'runtime-updated'; readonly runtime: OllamaRuntimeEvidence }
  | { readonly type: 'queue-updated'; readonly queue: PullQueueEvidence }
  | { readonly type: 'chat-updated'; readonly chat: ChatSession }
  | { readonly type: 'harness-updated'; readonly run: HarnessRunEvidence }
  | { readonly type: 'select-chat'; readonly chatId?: string }
  | { readonly type: 'set-chat-draft'; readonly value: string }
  | { readonly type: 'set-chat-system-prompt'; readonly value: string }
  | { readonly type: 'set-chat-temperature'; readonly value: number }
  | { readonly type: 'set-chat-context-window'; readonly value: string }
  | { readonly type: 'set-attachments'; readonly attachmentIds: ReadonlyArray<string> }
  | { readonly type: 'select-harness-profile'; readonly profileId?: string }
  | { readonly type: 'select-harness-variant'; readonly variantId?: string }
  | { readonly type: 'set-preflight'; readonly preflight?: HarnessPreflight }
  | { readonly type: 'set-harness-draft'; readonly draft: Partial<HarnessDraft> }
  | { readonly type: 'dismiss-message' };

function searchKey(scope: SearchScope): 'catalogSearch' | 'chatSearch' | 'harnessSearch' {
  if (scope === 'catalog') return 'catalogSearch';
  if (scope === 'chat-sessions') return 'chatSearch';
  return 'harnessSearch';
}

function replaceChat(snapshot: OllamaSuiteSnapshot, chat: ChatSession): OllamaSuiteSnapshot {
  const exists = snapshot.chatSessions.some((item) => item.id === chat.id);
  const chatSessions = exists
    ? snapshot.chatSessions.map((item) => item.id === chat.id ? chat : item)
    : [chat, ...snapshot.chatSessions];
  return { ...snapshot, chatSessions };
}

function applyEvent(snapshot: OllamaSuiteSnapshot | undefined, event: OllamaSuiteEvent): OllamaSuiteSnapshot | undefined {
  if (event.kind === 'snapshot') return event.snapshot;
  if (!snapshot || event.sequence < snapshot.sequence) return snapshot;
  switch (event.kind) {
    case 'pull-progress': return { ...snapshot, sequence: event.sequence, pullQueue: event.queue };
    case 'chat-stream': return { ...replaceChat(snapshot, event.session), sequence: event.sequence };
    case 'harness-state': return { ...snapshot, sequence: event.sequence, harnessRun: event.run };
    case 'runtime-state': return { ...snapshot, sequence: event.sequence, runtime: event.runtime };
  }
}

export function ollamaSuiteReducer(state: OllamaSuiteState, action: OllamaSuiteAction): OllamaSuiteState {
  switch (action.type) {
    case 'snapshot-loaded':
      return { ...state, loading: false, snapshot: action.snapshot, error: undefined };
    case 'snapshot-failed':
      return { ...state, loading: false, error: action.error, pendingOperation: undefined };
    case 'event':
      return { ...state, snapshot: applyEvent(state.snapshot, action.event), loading: false };
    case 'set-view':
      return { ...state, view: action.view, notice: undefined };
    case 'toggle-variant': {
      const selectedVariantIds = new Set(state.selectedVariantIds);
      if (selectedVariantIds.has(action.variantId)) selectedVariantIds.delete(action.variantId);
      else selectedVariantIds.add(action.variantId);
      return { ...state, selectedVariantIds };
    }
    case 'clear-selection':
      return { ...state, selectedVariantIds: new Set() };
    case 'set-search': {
      const key = searchKey(action.scope);
      return { ...state, [key]: { ...state[key], ...action.search } };
    }
    case 'set-catalog-filter':
      return { ...state, catalogFilters: { ...state.catalogFilters, [action.filter]: action.value } as CatalogFilters };
    case 'operation-started':
      return { ...state, pendingOperation: action.operation, error: undefined, notice: undefined };
    case 'operation-failed':
      return { ...state, pendingOperation: undefined, error: action.error };
    case 'operation-finished':
      return { ...state, pendingOperation: undefined, notice: action.notice, error: undefined };
    case 'runtime-updated':
      return state.snapshot
        ? { ...state, snapshot: { ...state.snapshot, runtime: action.runtime }, pendingOperation: undefined }
        : state;
    case 'queue-updated':
      return state.snapshot
        ? { ...state, snapshot: { ...state.snapshot, pullQueue: action.queue }, pendingOperation: undefined }
        : state;
    case 'chat-updated':
      return state.snapshot
        ? { ...state, snapshot: replaceChat(state.snapshot, action.chat), selectedChatId: action.chat.id, pendingOperation: undefined }
        : state;
    case 'harness-updated':
      return state.snapshot
        ? { ...state, snapshot: { ...state.snapshot, harnessRun: action.run }, pendingOperation: undefined }
        : state;
    case 'select-chat':
      return { ...state, selectedChatId: action.chatId, attachmentIds: [] };
    case 'set-chat-draft':
      return { ...state, chatDraft: action.value };
    case 'set-chat-system-prompt':
      return { ...state, chatSystemPrompt: action.value };
    case 'set-chat-temperature':
      return { ...state, chatTemperature: action.value };
    case 'set-chat-context-window':
      return { ...state, chatContextWindow: action.value };
    case 'set-attachments':
      return { ...state, attachmentIds: action.attachmentIds };
    case 'select-harness-profile':
      return { ...state, selectedHarnessProfileId: action.profileId, preflight: undefined };
    case 'select-harness-variant':
      return { ...state, selectedHarnessVariantId: action.variantId, preflight: undefined };
    case 'set-preflight':
      return { ...state, preflight: action.preflight, pendingOperation: undefined };
    case 'set-harness-draft':
      return { ...state, harnessDraft: { ...state.harnessDraft, ...action.draft } };
    case 'dismiss-message':
      return { ...state, error: undefined, notice: undefined };
  }
}
