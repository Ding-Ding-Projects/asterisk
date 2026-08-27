export const EXPORT_SCHEMA_VERSION = 'ding-pbx-export.v1' as const;

export type ExportFormat =
  | 'json'
  | 'jsonl'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'csv'
  | 'tsv'
  | 'markdown'
  | 'html'
  | 'sql'
  | 'typescript'
  | 'javascript'
  | 'python';

export type ExportValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<ExportValue>
  | { readonly [key: string]: ExportValue };

export type ExportRow = Readonly<Record<string, ExportValue>>;

export type ExportLineEnding = 'lf' | 'crlf';

export interface ExportDisclosure {
  code: string;
  message: string;
  severity: 'information' | 'warning';
}

export interface ExportArtifact {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  format: ExportFormat;
  filename: string;
  mediaType: string;
  encoding: 'utf-8';
  lineEnding: ExportLineEnding;
  content: string;
  byteLength: number;
  rowCount: number;
  disclosures: ReadonlyArray<ExportDisclosure>;
}

export interface ExportSaveRequest {
  artifact: ExportArtifact;
  suggestedDirectory?: string;
}

export interface ExportDownloadRequest {
  artifact: ExportArtifact;
}

export interface ExportClipboardRequest {
  artifact: ExportArtifact;
}

export interface EditorTarget {
  editor: 'vscode';
  kind: 'file' | 'workspace';
  path: string;
}

export interface PlatformConfirmation {
  status: 'confirmed';
  operationId: string;
  completedAt: string;
  bytesWritten?: number;
  path?: string;
  historyRevision?: string;
}

export interface PlatformCancellation {
  status: 'cancelled';
  reason: string;
}

export interface PlatformFailure {
  status: 'failed';
  code: string;
  reason: string;
  retryable: boolean;
}

export type PlatformOperationResult =
  | PlatformConfirmation
  | PlatformCancellation
  | PlatformFailure;

export function platformConfirmationProblem(receipt: PlatformConfirmation): string | undefined {
  if (!receipt.operationId.trim()) return 'The platform confirmation has no operation identifier.';
  if (!receipt.completedAt.trim() || !Number.isFinite(Date.parse(receipt.completedAt))) {
    return 'The platform confirmation has no valid completion time.';
  }
  return undefined;
}

export interface EditorAvailable {
  status: 'available';
  editor: 'vscode';
  executable: string;
  channel: 'stable' | 'insiders' | 'portable' | 'unknown';
}

export interface EditorUnavailable {
  status: 'unavailable';
  editor: 'vscode';
  reason: string;
  downloadUrl?: string;
}

export interface EditorProbeFailure {
  status: 'failed';
  editor: 'vscode';
  code: string;
  reason: string;
  retryable: boolean;
}

export type EditorProbeResult = EditorAvailable | EditorUnavailable | EditorProbeFailure;

/**
 * Renderer-facing platform boundary. Implementations live in a privileged
 * desktop or hosted adapter. A call returning is not success unless it returns
 * a confirmed receipt.
 */
export interface ExportPlatformPort {
  saveFile(request: ExportSaveRequest): Promise<PlatformOperationResult>;
  downloadFile(request: ExportDownloadRequest): Promise<PlatformOperationResult>;
  copyToClipboard(request: ExportClipboardRequest): Promise<PlatformOperationResult>;
  probeEditor(editor: 'vscode'): Promise<EditorProbeResult>;
  openInEditor(target: EditorTarget): Promise<PlatformOperationResult>;
}
