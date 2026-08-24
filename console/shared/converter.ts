export const CONVERTER_CATEGORIES = [
  "documents-pdf",
  "images",
  "audio",
  "video",
  "archives",
  "structured-data-spreadsheets",
  "code-text",
  "binary-encodings",
] as const;

export type ConverterCategory = (typeof CONVERTER_CATEGORIES)[number];

export interface ConverterCategoryDescriptor {
  id: ConverterCategory;
  label: string;
  description: string;
}

export interface ConverterFormat {
  id: string;
  label: string;
  mediaTypes: ReadonlyArray<string>;
  extensions: ReadonlyArray<string>;
  category: ConverterCategory;
  binary: boolean;
}

export type ConverterKernelId =
  | "builtin:utf8-to-base64"
  | "builtin:base64-to-binary"
  | "builtin:binary-to-hex"
  | "builtin:hex-to-binary"
  | "builtin:normalize-utf8";

export interface ConverterBundleProof {
  proofId: string;
  adapterRuntime: string;
  artifactPath: string;
  artifactSha256: string;
  verifiedAt: string;
  bundled: true;
  offline: true;
  packagedArtifact: true;
}

export interface ConverterResourceLimits {
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  memoryMb: number;
  maxPages?: number;
  maxFrames?: number;
  maxArchiveDepth?: number;
  maxArchiveEntries?: number;
  maxTemporaryBytes: number;
}

export interface ConverterSandboxPolicy {
  kind: "fixed-worker-kernel" | "allowlisted-process";
  network: "disabled";
  shell: false;
  allowedExecutable?: string;
  kernel?: ConverterKernelId;
}

export type ConverterAvailability =
  | { state: "enabled"; proof: ConverterBundleProof }
  | { state: "unavailable"; reason: string; missingDependency: string };

export type ConverterOutputValidation =
  | { kind: "sniffed-format"; expectedFormat: string }
  | { kind: "binary-nonempty" }
  | { kind: "utf8-text" }
  | { kind: "base64-text" }
  | { kind: "hex-text" }
  | { kind: "pdf-reopen" };

export type PdfOperation =
  | "inspect"
  | "split"
  | "merge"
  | "extract"
  | "reorder"
  | "rotate"
  | "metadata";

export interface ConverterAdapter {
  id: string;
  label: string;
  category: ConverterCategory;
  sourceFormats: ReadonlyArray<string>;
  targetFormat: string;
  availability: ConverterAvailability;
  sandbox: ConverterSandboxPolicy;
  limits: ConverterResourceLimits;
  outputValidation: ConverterOutputValidation;
  lossy: boolean;
  disclosureIds: ReadonlyArray<string>;
  disclosures: ReadonlyArray<string>;
  metadataBehavior: string;
  encodingBehavior: string;
  pdfOperations?: ReadonlyArray<PdfOperation>;
}

export type ConverterSniffMethod = "magic" | "validated-text" | "unknown";

export interface ConverterSniffResult {
  formatId?: string;
  candidateFormatIds: ReadonlyArray<string>;
  confidence: "exact" | "probable" | "unknown";
  method: ConverterSniffMethod;
  bytesInspected: number;
  fileBytes: number;
  detail: string;
}

export interface ConverterRequest {
  adapterId: string;
  sourcePath: string;
  destinationPath: string;
  overwriteApproved: boolean;
  acknowledgedDisclosureIds: ReadonlyArray<string>;
}

export type ConverterOutcomeState = "converted" | "skipped" | "cancelled" | "failed";

export interface ConverterProgress {
  phase: "preflight" | "reading" | "converting" | "validating" | "writing" | "complete";
  completedBytes: number;
  totalBytes?: number;
  detail: string;
}

export interface ConverterOutcome {
  state: ConverterOutcomeState;
  adapterId: string;
  sourcePath: string;
  destinationPath?: string;
  inputBytes?: number;
  outputBytes?: number;
  sourceFormat?: string;
  targetFormat?: string;
  detail: string;
  startedAt: string;
  completedAt: string;
}

export type ConverterQueueState = "queued" | "running" | "paused" | "cancelled" | "completed";
export type ConverterQueueItemState =
  | "queued"
  | "running"
  | "converted"
  | "skipped"
  | "cancelled"
  | "failed";

export interface ConverterQueueRecord {
  schemaVersion: 1;
  id: string;
  label: string;
  state: ConverterQueueState;
  createdAt: string;
  updatedAt: string;
  nextSequence: number;
  nextClaimSequence: number;
  reservedOutputBytes: number;
  itemCounts: Readonly<Record<ConverterQueueItemState, number>>;
}

export interface ConverterQueueItemInput extends ConverterRequest {
  estimatedOutputBytes: number;
}

export interface ConverterQueueItem extends ConverterQueueItemInput {
  schemaVersion: 1;
  id: string;
  queueId: string;
  sequence: number;
  state: ConverterQueueItemState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  outcome?: ConverterOutcome;
}

export interface ConverterQueueCursor {
  afterSequence: number;
}

export interface ConverterQueuePage {
  items: ReadonlyArray<ConverterQueueItem>;
  nextCursor?: ConverterQueueCursor;
}

export interface PdfInspectResult {
  pageCount: number;
  rotations: ReadonlyArray<number>;
  pageFingerprints: ReadonlyArray<string>;
  metadata: Readonly<Record<string, string>>;
  encrypted: boolean;
  signed: boolean;
  opaqueCapabilities: ReadonlyArray<string>;
}

export type PdfOperationRequest =
  | { operation: "inspect"; sourcePaths: readonly [string] }
  | { operation: "split"; sourcePaths: readonly [string]; ranges: ReadonlyArray<readonly [number, number]> }
  | { operation: "merge"; sourcePaths: ReadonlyArray<string> }
  | { operation: "extract"; sourcePaths: readonly [string]; pages: ReadonlyArray<number> }
  | { operation: "reorder"; sourcePaths: readonly [string]; pageOrder: ReadonlyArray<number> }
  | { operation: "rotate"; sourcePaths: readonly [string]; pages: ReadonlyArray<number>; degrees: 90 | 180 | 270 }
  | { operation: "metadata"; sourcePaths: readonly [string]; metadata: Readonly<Record<string, string | null>> };

export interface PdfValidationExpectation {
  pageCount?: number;
  pageOrder?: ReadonlyArray<number>;
  pageFingerprints?: ReadonlyArray<string>;
  rotations?: ReadonlyArray<number>;
  metadata?: Readonly<Record<string, string>>;
}

export interface PdfOperationPlan {
  adapterId: string;
  request: PdfOperationRequest;
  limits: ConverterResourceLimits;
  disclosures: ReadonlyArray<string>;
}

export interface ConverterCatalogSnapshot {
  categories: ReadonlyArray<ConverterCategoryDescriptor>;
  formats: ReadonlyArray<ConverterFormat>;
  adapters: ReadonlyArray<ConverterAdapter>;
}

export interface PdfCapabilitySnapshot {
  operation: PdfOperation;
  available: boolean;
  adapterId?: string;
  reason?: string;
}

/**
 * Typed service seam for a later privileged-process registration. This module deliberately
 * does not register IPC or mutate the central dispatcher. Queue insertion is one item per
 * call so a transport can stream selections without collecting an unlimited path list.
 */
export interface ConverterBackendHandlers {
  catalog(): Promise<ConverterCatalogSnapshot>;
  sniff(request: { sourcePath: string; maxBytes?: number }): Promise<ConverterSniffResult>;
  createQueue(request: { label: string }): Promise<ConverterQueueRecord>;
  enqueueOne(request: { queueId: string; item: ConverterRequest }): Promise<ConverterQueueItem>;
  queuePage(request: { queueId: string; cursor?: ConverterQueueCursor; limit?: number }): Promise<ConverterQueuePage>;
  startQueue(request: { queueId: string }): Promise<ConverterQueueRecord>;
  pauseQueue(request: { queueId: string }): Promise<ConverterQueueRecord>;
  resumeQueue(request: { queueId: string }): Promise<ConverterQueueRecord>;
  cancelQueue(request: { queueId: string }): Promise<ConverterQueueRecord>;
  pdfCapabilities(): Promise<ReadonlyArray<PdfCapabilitySnapshot>>;
}
