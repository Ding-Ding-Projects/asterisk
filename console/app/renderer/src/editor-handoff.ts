import type {
  EditorProbeResult,
  EditorTarget,
  ExportPlatformPort,
  PlatformConfirmation,
  PlatformOperationResult,
} from '../../../shared/export';
import { platformConfirmationProblem } from '../../../shared/export';

export type EditorHandoffAvailability =
  | { status: 'enabled'; executable: string; channel: 'stable' | 'insiders' | 'portable' | 'unknown' }
  | { status: 'disabled'; reason: string; downloadUrl?: string }
  | { status: 'failed'; code: string; reason: string; retryable: boolean };

export type EditorHandoffResult =
  | { status: 'opened'; receipt: PlatformConfirmation }
  | { status: 'cancelled'; reason: string }
  | { status: 'disabled'; reason: string; downloadUrl?: string }
  | { status: 'failed'; code: string; reason: string; retryable: boolean };

function availabilityFromProbe(probe: EditorProbeResult): EditorHandoffAvailability {
  if (probe.status === 'available') {
    return { status: 'enabled', executable: probe.executable, channel: probe.channel };
  }
  if (probe.status === 'unavailable') {
    return { status: 'disabled', reason: probe.reason, downloadUrl: probe.downloadUrl };
  }
  return { status: 'failed', code: probe.code, reason: probe.reason, retryable: probe.retryable };
}

export async function probeVsCode(port: ExportPlatformPort): Promise<EditorHandoffAvailability> {
  try {
    return availabilityFromProbe(await port.probeEditor('vscode'));
  } catch {
    return {
      status: 'failed',
      code: 'editor-probe-rejected',
      reason: 'Editor detection rejected without a typed failure result. Untyped details were not exposed.',
      retryable: false,
    };
  }
}

export async function openInVsCode(
  port: ExportPlatformPort,
  kind: EditorTarget['kind'],
  path: string,
): Promise<EditorHandoffResult> {
  const targetPath = path.trim();
  if (!targetPath) return { status: 'disabled', reason: 'A confirmed local file or workspace path is required.' };

  const availability = await probeVsCode(port);
  if (availability.status === 'disabled') return availability;
  if (availability.status === 'failed') return availability;

  let result: PlatformOperationResult;
  try {
    result = await port.openInEditor({ editor: 'vscode', kind, path: targetPath });
  } catch {
    return {
      status: 'failed',
      code: 'editor-open-rejected',
      reason: 'The editor handoff rejected without a typed failure result. Untyped details were not exposed.',
      retryable: false,
    };
  }
  if (result.status === 'confirmed') {
    const problem = platformConfirmationProblem(result);
    return problem
      ? { status: 'failed', code: 'invalid-confirmation', reason: problem, retryable: false }
      : { status: 'opened', receipt: result };
  }
  if (result.status === 'cancelled') return { status: 'cancelled', reason: result.reason };
  return { status: 'failed', code: result.code, reason: result.reason, retryable: result.retryable };
}

export function vscodeDisabledReason(availability: EditorHandoffAvailability): string | undefined {
  if (availability.status === 'disabled' || availability.status === 'failed') return availability.reason;
  return undefined;
}
