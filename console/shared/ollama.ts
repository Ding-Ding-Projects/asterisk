/**
 * Shared contracts for the local Ollama suite. These types deliberately do not extend
 * the central control-plane action union. Integration can compose the exported handler
 * maps without making this lane edit the shared dispatcher.
 */

export const OLLAMA_ACTIONS = [
  'ollama.health',
  'ollama.version',
  'ollama.models.installed',
  'ollama.models.running',
  'ollama.model.show',
  'ollama.model.delete',
  'ollama.model.copy',
  'ollama.catalog.get',
  'ollama.catalog.refresh',
  'ollama.catalog.reconcile',
  'ollama.fit.evaluate',
  'ollama.pulls.list',
  'ollama.pulls.enqueue',
  'ollama.pulls.cancel',
  'ollama.pulls.retry',
  'ollama.pulls.reconcile',
  'ollama.chat.sessions',
  'ollama.chat.create',
  'ollama.chat.rename',
  'ollama.chat.delete',
  'ollama.chat.send',
  'ollama.chat.retry',
  'ollama.chat.regenerate',
  'ollama.chat.stop',
  'ollama.harness.profiles',
  'ollama.harness.register',
  'ollama.harness.preflight',
  'ollama.harness.launch',
  'ollama.harness.restore',
] as const;

export type OllamaAction = (typeof OLLAMA_ACTIONS)[number];

export interface OllamaDispatchRequest<TPayload = unknown> {
  requestId: string;
  action: OllamaAction;
  payload?: TPayload;
}

export type OllamaDispatchResponse<T = unknown> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; code: string; message: string; details?: unknown };

export function normalizeOllamaRequestId(value: unknown): string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : 'ollama-request';
}

export function ollamaErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return message.length <= 4_096 ? message : `${message.slice(0, 4_093)}...`;
}

export type OllamaDispatchHandler<TPayload = unknown, TResult = unknown> = (
  request: OllamaDispatchRequest<TPayload>,
) => Promise<OllamaDispatchResponse<TResult>>;

export type OllamaDispatchHandlers = Partial<
  Record<OllamaAction, OllamaDispatchHandler<unknown, unknown>>
>;

export type OllamaAvailability = 'missing' | 'stopped' | 'unhealthy' | 'ready';

export interface OllamaHealth {
  state: OllamaAvailability;
  observedAt: string;
  version?: string;
  reason?: string;
  endpoint: string;
}

export type OllamaCapability =
  | 'chat'
  | 'completion'
  | 'vision'
  | 'tools'
  | 'embedding'
  | 'insert'
  | 'thinking';

export interface OllamaModelDetails {
  family?: string;
  families: readonly string[];
  parameterSize?: string;
  quantizationLevel?: string;
  format?: string;
  parentModel?: string;
}

export interface OllamaInstalledModel {
  name: string;
  model: string;
  modifiedAt?: string;
  sizeBytes: number;
  digest?: string;
  details: OllamaModelDetails;
}

export interface OllamaRunningModel extends OllamaInstalledModel {
  expiresAt?: string;
  sizeVramBytes?: number;
  contextLength?: number;
}

export interface OllamaModelInfo {
  model: string;
  license?: string;
  template?: string;
  system?: string;
  parameters?: string;
  details: OllamaModelDetails;
  capabilities: readonly OllamaCapability[];
  modifiedAt?: string;
  modelInfo: Readonly<Record<string, string | number | boolean>>;
}

export interface OllamaCatalogVariant {
  id: string;
  model: string;
  tag: string;
  displayName: string;
  description?: string;
  capabilities: readonly OllamaCapability[];
  sizeBytes?: number;
  parameterCount?: number;
  quantization?: string;
  contextLength?: number;
  publishedAt?: string;
  metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface OllamaCatalogSnapshot {
  schemaVersion: 1;
  sourceId: string;
  sourceRevision?: string;
  refreshedAt: string;
  pageCount: number;
  complete: boolean;
  stale: boolean;
  variants: readonly OllamaCatalogVariant[];
  unavailableReason?: string;
}

export interface OllamaReconciledVariant extends OllamaCatalogVariant {
  installed: boolean;
  running: boolean;
  installedModel?: OllamaInstalledModel;
  runningModel?: OllamaRunningModel;
}

export interface OllamaCatalogReconciliation {
  observedAt: string;
  catalog: OllamaCatalogSnapshot;
  variants: readonly OllamaReconciledVariant[];
  installedOnly: readonly OllamaInstalledModel[];
}

export type OllamaFitVerdict = 'runs-well' | 'runs-with-limits' | 'unlikely' | 'unknown';

export interface OllamaGpuEvidence {
  model: string;
  usableVramBytes?: number;
  driver?: string;
  backend?: string;
  supported?: boolean;
}

export interface OllamaHardwareEvidence {
  observedAt: string;
  architecture: string;
  totalRamBytes?: number;
  availableRamBytes?: number;
  freeDiskBytes?: number;
  gpus: readonly OllamaGpuEvidence[];
}

export interface OllamaVariantResourceEvidence {
  model: string;
  blobSizeBytes?: number;
  parameterCount?: number;
  quantization?: string;
  contextLength?: number;
  contextOverheadBytes?: number;
  runtimeOverheadBytes?: number;
}

export interface OllamaFitAssessment {
  verdict: OllamaFitVerdict;
  observedAt: string;
  model: string;
  summary: string;
  requiredRamBytes?: number;
  requiredDiskBytes?: number;
  evidence: readonly string[];
  assumptions: readonly string[];
  blockers: readonly string[];
}

export type OllamaPullState =
  | 'queued'
  | 'pulling'
  | 'pulled'
  | 'skipped'
  | 'cancelled'
  | 'failed';

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  totalBytes?: number;
  completedBytes?: number;
}

export interface OllamaPullRecord {
  id: string;
  model: string;
  state: OllamaPullState;
  createdAt: string;
  updatedAt: string;
  progress?: OllamaPullProgress;
  estimatedBytes?: number;
  networkTransferRequired: boolean;
  fitVerdict?: OllamaFitVerdict;
  error?: string;
  attempt: number;
}

export interface OllamaPullEnqueueItem {
  model: string;
  estimatedBytes?: number;
  fitVerdict?: OllamaFitVerdict;
}

export type OllamaChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OllamaChatAttachment {
  type: 'image';
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  dataBase64: string;
}

export interface OllamaChatMessage {
  id: string;
  role: OllamaChatRole;
  content: string;
  createdAt: string;
  attachments?: readonly OllamaChatAttachment[];
  toolName?: string;
}

export interface OllamaChatOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  seed?: number;
  numCtx?: number;
  repeatPenalty?: number;
  stop?: readonly string[];
}

export interface OllamaChatSessionSummary {
  id: string;
  name: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  streaming: boolean;
}

export interface OllamaChatChunk {
  sessionId: string;
  messageId: string;
  content: string;
  done: boolean;
  doneReason?: string;
  promptEvalCount?: number;
  evalCount?: number;
}

export interface OllamaChatEvent {
  type: 'chunk' | 'completed' | 'failed' | 'cancelled';
  chunk: OllamaChatChunk;
  error?: string;
}

export interface OllamaHarnessProfile {
  id: string;
  name: string;
  executableId: string;
  arguments: Readonly<Record<string, string | number | boolean>>;
  workingDirectory?: string;
  environment: Readonly<Record<string, string>>;
  configuration: Readonly<Record<string, string | number | boolean | null>>;
  model: string;
  requiredPorts: readonly number[];
  healthCheckId: string;
}

export interface OllamaHarnessPreflight {
  profileId: string;
  allowed: boolean;
  executable: string;
  argv: readonly string[];
  workingDirectory?: string;
  environmentKeys: readonly string[];
  model: string;
  requiredPorts: readonly number[];
  blockers: readonly string[];
  warnings: readonly string[];
  fit?: OllamaFitAssessment;
}

export interface OllamaHarnessSnapshot {
  id: string;
  profileId: string;
  createdAt: string;
  configuration: Readonly<Record<string, string | number | boolean | null>>;
}

export interface OllamaHarnessLaunchResult {
  profileId: string;
  snapshotId: string;
  state: 'ready' | 'failed' | 'timed-out' | 'exited';
  processId?: number;
  reason?: string;
  rolledBack: boolean;
}
