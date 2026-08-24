import type {
  ExportArtifact,
  ExportPlatformPort,
  PlatformConfirmation,
  PlatformOperationResult,
} from '../../../shared/export';
import { platformConfirmationProblem } from '../../../shared/export';
import { openInVsCode, type EditorHandoffResult } from './editor-handoff';
import { prepareExport, type ExportPreparationResult, type ExportRequest } from './export';

export type ExportDestination = 'save' | 'download' | 'clipboard';

export type ExportDeliveryResult =
  | { status: 'saved' | 'downloaded' | 'copied'; artifact: ExportArtifact; receipt: PlatformConfirmation }
  | { status: 'cancelled'; artifact: ExportArtifact; reason: string }
  | { status: 'failed'; artifact: ExportArtifact; code: string; reason: string; retryable: boolean };

export type ExportWorkflowResult =
  | ExportDeliveryResult
  | Extract<ExportPreparationResult, { status: 'unavailable' }>;

export async function deliverExport(
  port: ExportPlatformPort,
  artifact: ExportArtifact,
  destination: ExportDestination,
  suggestedDirectory?: string,
): Promise<ExportDeliveryResult> {
  let result: PlatformOperationResult;
  try {
    result = destination === 'save'
      ? await port.saveFile({ artifact, suggestedDirectory })
      : destination === 'download'
        ? await port.downloadFile({ artifact })
        : await port.copyToClipboard({ artifact });
  } catch {
    return {
      status: 'failed',
      artifact,
      code: 'platform-adapter-rejected',
      reason: 'The platform adapter rejected without a typed failure result. Untyped details were not exposed.',
      retryable: false,
    };
  }

  if (result.status === 'confirmed') {
    const problem = platformConfirmationProblem(result)
      ?? (result.bytesWritten !== artifact.byteLength
        ? `The platform confirmed ${String(result.bytesWritten)} bytes, but the artifact contains ${artifact.byteLength} bytes.`
        : undefined)
      ?? (destination === 'save' && !result.path?.trim()
        ? 'The platform confirmed the save without returning the saved path.'
        : undefined);
    if (problem) {
      return { status: 'failed', artifact, code: 'invalid-confirmation', reason: problem, retryable: false };
    }
    const status = destination === 'save' ? 'saved' : destination === 'download' ? 'downloaded' : 'copied';
    return { status, artifact, receipt: result };
  }
  if (result.status === 'cancelled') return { status: 'cancelled', artifact, reason: result.reason };
  return {
    status: 'failed',
    artifact,
    code: result.code,
    reason: result.reason,
    retryable: result.retryable,
  };
}

export async function prepareAndDeliverExport(
  port: ExportPlatformPort,
  request: ExportRequest,
  destination: ExportDestination,
  suggestedDirectory?: string,
): Promise<ExportWorkflowResult> {
  const prepared = prepareExport(request);
  if (prepared.status === 'unavailable') return prepared;
  return deliverExport(port, prepared.artifact, destination, suggestedDirectory);
}

export type SaveAndOpenResult =
  | { status: 'opened'; artifact: ExportArtifact; saveReceipt: PlatformConfirmation; editorReceipt: PlatformConfirmation }
  | { status: 'unavailable'; reason: string }
  | { status: 'cancelled'; stage: 'save' | 'editor'; reason: string }
  | { status: 'failed'; stage: 'save' | 'editor'; code: string; reason: string; retryable: boolean };

export async function saveAndOpenExportInVsCode(
  port: ExportPlatformPort,
  artifact: ExportArtifact,
  suggestedDirectory?: string,
): Promise<SaveAndOpenResult> {
  const save = await deliverExport(port, artifact, 'save', suggestedDirectory);
  if (save.status === 'cancelled') return { status: 'cancelled', stage: 'save', reason: save.reason };
  if (save.status === 'failed') {
    return { status: 'failed', stage: 'save', code: save.code, reason: save.reason, retryable: save.retryable };
  }
  const path = save.receipt.path;
  if (!path) {
    return {
      status: 'failed',
      stage: 'save',
      code: 'missing-confirmed-path',
      reason: 'The platform confirmed the save but did not return the local path required for editor handoff.',
      retryable: false,
    };
  }

  const editor: EditorHandoffResult = await openInVsCode(port, 'file', path);
  if (editor.status === 'opened') {
    return { status: 'opened', artifact, saveReceipt: save.receipt, editorReceipt: editor.receipt };
  }
  if (editor.status === 'cancelled') return { status: 'cancelled', stage: 'editor', reason: editor.reason };
  if (editor.status === 'disabled') return { status: 'unavailable', reason: editor.reason };
  return { status: 'failed', stage: 'editor', code: editor.code, reason: editor.reason, retryable: editor.retryable };
}
