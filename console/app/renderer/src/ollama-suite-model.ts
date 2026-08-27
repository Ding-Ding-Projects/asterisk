export type OllamaRuntimeState =
  | 'checking'
  | 'missing'
  | 'stopped'
  | 'healthy'
  | 'unhealthy'
  | 'offline';

export type CatalogCompleteness = 'complete' | 'partial' | 'unknown';
export type HardwareFit = 'runs-well' | 'runs-with-limits' | 'unlikely' | 'unknown';
export type PullState = 'queued' | 'pulling' | 'paused' | 'cancelled' | 'failed' | 'complete' | 'skipped';
export type ChatStreamState = 'idle' | 'streaming' | 'stopping' | 'failed';
export type HarnessState = 'idle' | 'preflighting' | 'ready' | 'launching' | 'running' | 'failed' | 'rolling-back' | 'restored';

export interface BackendFailure {
  readonly code: string;
  readonly message: string;
  readonly recoveryAction?: string;
  readonly retryable: boolean;
}

export type BackendResponse<T> =
  | { readonly ok: true; readonly requestId: string; readonly observedAt: string; readonly value: T }
  | { readonly ok: false; readonly requestId: string; readonly observedAt: string; readonly error: BackendFailure };

export interface OllamaRuntimeEvidence {
  readonly state: OllamaRuntimeState;
  readonly observedAt?: string;
  readonly endpoint: string;
  readonly version?: string;
  readonly reason?: string;
  readonly nextActions: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly enabled: boolean;
    readonly disabledReason?: string;
  }>;
}

export interface CatalogEvidence {
  readonly sourceIdentity: string;
  readonly revision?: string;
  readonly refreshedAt?: string;
  readonly lastSuccessfulRefreshAt?: string;
  readonly pageCount: number;
  readonly completeness: CatalogCompleteness;
  readonly stale: boolean;
  readonly staleReason?: string;
  readonly offlineCache: boolean;
  readonly nextPageCursor?: string;
}

export interface OllamaCapability {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  readonly reason?: string;
}

export interface FitEvidenceItem {
  readonly label: string;
  readonly observed?: string;
  readonly required?: string;
  readonly source: string;
  readonly verdict: 'sufficient' | 'limited' | 'insufficient' | 'unknown';
}

export interface VariantFitAssessment {
  readonly verdict: HardwareFit;
  readonly assessedAt: string;
  readonly summary: string;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<FitEvidenceItem>;
}

export interface OllamaModelVariant {
  readonly id: string;
  readonly modelId: string;
  readonly family: string;
  readonly displayName: string;
  readonly exactTag: string;
  readonly description?: string;
  readonly publishedAt?: string;
  readonly blobSizeBytes?: number;
  readonly additionalStorageBytes?: number;
  readonly parameterCount?: number;
  readonly quantization?: string;
  readonly contextWindow?: number;
  readonly installed: boolean;
  readonly running: boolean;
  readonly installedDigest?: string;
  readonly capabilities: ReadonlyArray<OllamaCapability>;
  readonly fit: VariantFitAssessment;
  readonly metadataComplete: boolean;
  readonly metadataGaps: ReadonlyArray<string>;
}

export interface GpuEvidence {
  readonly id: string;
  readonly label: string;
  readonly usableVramBytes?: number;
  readonly backend?: string;
  readonly driver?: string;
  readonly supported: boolean;
  readonly reason?: string;
}

export interface HardwareEvidence {
  readonly observedAt?: string;
  readonly architecture?: string;
  readonly totalRamBytes?: number;
  readonly availableRamBytes?: number;
  readonly freeStorageBytes?: number;
  readonly destination?: string;
  readonly gpus: ReadonlyArray<GpuEvidence>;
  readonly gaps: ReadonlyArray<string>;
}

export interface PullQueueItem {
  readonly id: string;
  readonly variantId: string;
  readonly exactTag: string;
  readonly state: PullState;
  readonly completedBytes?: number;
  readonly totalBytes?: number;
  readonly statusText: string;
  readonly error?: BackendFailure;
  readonly startedAt?: string;
  readonly finishedAt?: string;
}

export interface PullQueueEvidence {
  readonly concurrency: number;
  readonly paused: boolean;
  readonly aggregateAdditionalStorageBytes?: number;
  readonly freeStorageBytes?: number;
  readonly networkDisclosure: string;
  readonly items: ReadonlyArray<PullQueueItem>;
}

export interface ChatAttachmentCapability {
  readonly kind: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly reason?: string;
  readonly modelFilterAction?: {
    readonly label: string;
    readonly capabilityFilter: string;
  };
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
  readonly createdAt: string;
  readonly partial: boolean;
  readonly error?: BackendFailure;
}

export interface ChatSession {
  readonly id: string;
  readonly title: string;
  readonly variantId: string;
  readonly exactTag: string;
  readonly streamState: ChatStreamState;
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly systemPrompt: string;
  readonly temperature: number;
  readonly contextWindow?: number;
  readonly attachmentCapabilities: ReadonlyArray<ChatAttachmentCapability>;
  readonly updatedAt: string;
  readonly error?: BackendFailure;
}

export interface HarnessArgument {
  readonly name: string;
  readonly value: string;
  readonly secret: boolean;
}

export interface HarnessProfile {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: 'bundled' | 'registered';
  readonly executableLabel: string;
  readonly executableAvailable: boolean;
  readonly executableReason?: string;
  readonly allowedArguments: ReadonlyArray<HarnessArgument>;
  readonly environmentKeys: ReadonlyArray<{ readonly key: string; readonly secret: boolean }>;
  readonly workingDirectoryLabel?: string;
  readonly requiredPorts: ReadonlyArray<number>;
  readonly requiredFiles: ReadonlyArray<string>;
  readonly compatibleVariantIds: ReadonlyArray<string>;
}

export interface HarnessPreflight {
  readonly profileId: string;
  readonly variantId: string;
  readonly checkedAt: string;
  readonly ready: boolean;
  readonly executable: string;
  readonly argumentPreview: ReadonlyArray<string>;
  readonly workingDirectory?: string;
  readonly environmentKeys: ReadonlyArray<{ readonly key: string; readonly redacted: boolean }>;
  readonly blockers: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly fit: VariantFitAssessment;
}

export interface HarnessRunEvidence {
  readonly state: HarnessState;
  readonly profileId?: string;
  readonly variantId?: string;
  readonly snapshotId?: string;
  readonly preflight?: HarnessPreflight;
  readonly startedAt?: string;
  readonly readyAt?: string;
  readonly exitedAt?: string;
  readonly statusText?: string;
  readonly error?: BackendFailure;
  readonly rollbackStatus?: 'not-needed' | 'pending' | 'running' | 'restored' | 'failed';
  readonly rollbackReason?: string;
}

export interface RegexSearchRequest {
  readonly scope: 'catalog' | 'chat-sessions' | 'harness-profiles';
  readonly query: string;
  readonly mode: 'plain' | 'regex';
  readonly pattern: string;
  readonly flags: string;
  readonly sample: string;
  readonly limits: {
    readonly maxPatternCharacters: number;
    readonly maxSampleCharacters: number;
    readonly timeoutMs: number;
    readonly maxMatches: number;
  };
  readonly filters?: Readonly<Record<string, string | boolean>>;
}

export interface RegexSearchResult {
  readonly engine: string;
  readonly dialect: string;
  readonly escapingRules: string;
  readonly valid: boolean;
  readonly error?: string;
  readonly matchedIds: ReadonlyArray<string>;
  readonly preview: ReadonlyArray<{
    readonly match: string;
    readonly index: number;
    readonly groups: ReadonlyArray<string>;
  }>;
  readonly truncated: boolean;
  readonly evaluatedAt: string;
}

export interface HarnessRegistrationResult {
  readonly profile: HarnessProfile;
  readonly snapshot: OllamaSuiteSnapshot;
}

export interface OllamaSuiteSnapshot {
  readonly sequence: number;
  readonly receivedAt: string;
  readonly runtime: OllamaRuntimeEvidence;
  readonly catalog?: CatalogEvidence;
  readonly hardware?: HardwareEvidence;
  readonly variants: ReadonlyArray<OllamaModelVariant>;
  readonly pullQueue?: PullQueueEvidence;
  readonly chatSessions: ReadonlyArray<ChatSession>;
  readonly harnessProfiles: ReadonlyArray<HarnessProfile>;
  readonly harnessRun?: HarnessRunEvidence;
}

export type OllamaSuiteEvent =
  | { readonly kind: 'snapshot'; readonly snapshot: OllamaSuiteSnapshot }
  | { readonly kind: 'pull-progress'; readonly queue: PullQueueEvidence; readonly sequence: number }
  | { readonly kind: 'chat-stream'; readonly session: ChatSession; readonly sequence: number }
  | { readonly kind: 'harness-state'; readonly run: HarnessRunEvidence; readonly sequence: number }
  | { readonly kind: 'runtime-state'; readonly runtime: OllamaRuntimeEvidence; readonly sequence: number };

export interface NewChatRequest {
  readonly variantId: string;
  readonly systemPrompt: string;
  readonly temperature: number;
  readonly contextWindow?: number;
}

export interface SendChatRequest {
  readonly sessionId: string;
  readonly content: string;
  readonly attachmentIds: ReadonlyArray<string>;
}

export interface RegisterHarnessRequest {
  readonly executableSelectionId: string;
  readonly label: string;
  readonly argumentProfileId: string;
  readonly workingDirectorySelectionId?: string;
}

export interface OllamaSuiteClient {
  readSnapshot(): Promise<BackendResponse<OllamaSuiteSnapshot>>;
  subscribe(listener: (event: OllamaSuiteEvent) => void): () => void;
  refreshRuntime(): Promise<BackendResponse<OllamaRuntimeEvidence>>;
  runRuntimeAction(actionId: string): Promise<BackendResponse<OllamaRuntimeEvidence>>;
  refreshCatalog(): Promise<BackendResponse<OllamaSuiteSnapshot>>;
  search(request: RegexSearchRequest): Promise<BackendResponse<RegexSearchResult>>;
  queuePulls(variantIds: ReadonlyArray<string>): Promise<BackendResponse<PullQueueEvidence>>;
  startPulls(): Promise<BackendResponse<PullQueueEvidence>>;
  pausePulls(): Promise<BackendResponse<PullQueueEvidence>>;
  resumePulls(): Promise<BackendResponse<PullQueueEvidence>>;
  cancelPull(queueItemId: string): Promise<BackendResponse<PullQueueEvidence>>;
  retryPull(queueItemId: string): Promise<BackendResponse<PullQueueEvidence>>;
  createChat(request: NewChatRequest): Promise<BackendResponse<ChatSession>>;
  sendChat(request: SendChatRequest): Promise<BackendResponse<ChatSession>>;
  stopChat(sessionId: string): Promise<BackendResponse<ChatSession>>;
  chooseAttachments(sessionId: string, kind: string): Promise<BackendResponse<ReadonlyArray<string>>>;
  pickHarnessExecutable(): Promise<BackendResponse<{ readonly selectionId: string; readonly displayPath: string }>>;
  pickHarnessWorkingDirectory(): Promise<BackendResponse<{ readonly selectionId: string; readonly displayPath: string }>>;
  registerHarness(request: RegisterHarnessRequest): Promise<BackendResponse<HarnessRegistrationResult>>;
  preflightHarness(profileId: string, variantId: string): Promise<BackendResponse<HarnessPreflight>>;
  launchHarness(profileId: string, variantId: string): Promise<BackendResponse<HarnessRunEvidence>>;
  restoreHarnessSnapshot(snapshotId: string): Promise<BackendResponse<HarnessRunEvidence>>;
}

export const OLLAMA_SUITE_REGISTRATION = {
  id: 'ollama-suite-manager',
  label: 'Local Ollama suite',
  description: 'Manage the verified local runtime, exhaustive model catalog, pull queue, chats, and allowlisted harnesses.',
  componentExport: 'OllamaSuite',
  module: './ollama-suite.tsx',
  stylesheet: './ollama-suite.css',
  backendContract: 'OllamaSuiteClient',
  documentation: 'platform/ollama-suite-manager.md',
  paletteTerms: ['Ollama', 'model store', 'pull queue', 'local chat', 'harness preflight'],
} as const;

export function formatBytes(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return 'Not reported';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

export function fitLabel(value: HardwareFit): string {
  switch (value) {
    case 'runs-well': return 'Runs well';
    case 'runs-with-limits': return 'Runs with limits';
    case 'unlikely': return 'Unlikely';
    case 'unknown': return 'Unknown';
  }
}

export function runtimeLabel(value: OllamaRuntimeState): string {
  switch (value) {
    case 'checking': return 'Checking local runtime';
    case 'missing': return 'Ollama is not installed';
    case 'stopped': return 'Ollama is installed but stopped';
    case 'healthy': return 'Local Ollama is healthy';
    case 'unhealthy': return 'Local Ollama did not pass its health check';
    case 'offline': return 'The local Ollama endpoint is unavailable';
  }
}
