/**
 * Integration facade for the console's accessibility runtime primitives.
 *
 * These exports do not make the application accessible by themselves. A central renderer must
 * mount the attributes, focus transitions, live regions, geometry, and operation state for each
 * real surface before any end-to-end accessibility claim is valid.
 */

import { stateAnnouncement, type LiveAnnouncement, type SurfaceStatusKind } from './live-regions';
import { captureFocus, type FocusRoot, type FocusSnapshot } from './focus-manager';
import { dialogSemantics, type DialogSemanticsInput, type SemanticAttributes } from './semantics';

export * from './focus-manager';
export * from './live-regions';
export * from './operation-state';
export * from './responsive-layout';
export * from './semantics';

export type DataSurfaceState =
  | { kind: 'loading'; subject: string; detail?: string }
  | { kind: 'verified-empty'; subject: string; detail?: string }
  | { kind: 'unavailable'; subject: string; reason: string }
  | { kind: 'partial'; subject: string; completed: number; total?: number; reason: string }
  | { kind: 'stale'; subject: string; observedAt: string; reason?: string }
  | { kind: 'ready'; subject: string; count?: number }
  | { kind: 'error'; subject: string; error: string; recoveryAction?: string };

export type StatusSeverity = 'progress' | 'neutral' | 'success' | 'warning' | 'error';

export interface DataSurfaceDescriptor {
  kind: SurfaceStatusKind;
  severity: StatusSeverity;
  statusText: string;
  attributes: SemanticAttributes;
  announcement: LiveAnnouncement;
  recoveryAction?: string;
}

export interface ConfirmationOverlayInput extends DialogSemanticsInput {
  focusRoot: FocusRoot;
  initialFocusId?: string;
}

export interface ConfirmationOverlayContract {
  attributes: SemanticAttributes;
  returnFocus: FocusSnapshot;
  initialFocusId?: string;
  dismissOnEscape: true;
  restoreFocusOnClose: true;
}

/** Capture focus before a confirmation mounts and describe its complete focus-return contract. */
export function prepareConfirmationOverlay(input: ConfirmationOverlayInput): ConfirmationOverlayContract {
  return {
    attributes: dialogSemantics(input),
    returnFocus: captureFocus(input.focusRoot),
    initialFocusId: input.initialFocusId,
    dismissOnEscape: true,
    restoreFocusOnClose: true,
  };
}

/**
 * Give visually similar table bodies distinct typed, textual, and live-region states. Error state
 * is always severity `error`, so a renderer cannot legitimately reuse a green success treatment.
 */
export function describeDataSurface(key: string, state: DataSurfaceState): DataSurfaceDescriptor {
  switch (state.kind) {
    case 'loading': {
      const announcement = stateAnnouncement({ key, status: 'loading', subject: state.subject, detail: state.detail });
      return { kind: state.kind, severity: 'progress', statusText: announcement.text, attributes: { 'aria-busy': true, 'data-surface-state': state.kind }, announcement };
    }
    case 'verified-empty': {
      const announcement = stateAnnouncement({ key, status: 'verified-empty', subject: state.subject, detail: state.detail });
      return { kind: state.kind, severity: 'neutral', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': state.kind }, announcement };
    }
    case 'unavailable': {
      const announcement = stateAnnouncement({ key, status: 'unavailable', subject: state.subject, detail: state.reason });
      return { kind: state.kind, severity: 'warning', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': state.kind }, announcement };
    }
    case 'partial': {
      const announcement = stateAnnouncement({ key, status: 'partial', subject: state.subject, detail: state.reason, completed: state.completed, total: state.total });
      return { kind: state.kind, severity: 'warning', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': state.kind }, announcement };
    }
    case 'stale': {
      const announcement = stateAnnouncement({ key, status: 'stale', subject: state.subject, detail: state.reason, observedAt: state.observedAt });
      return { kind: state.kind, severity: 'warning', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': state.kind }, announcement };
    }
    case 'error': {
      const announcement = stateAnnouncement({ key, status: 'error', subject: state.subject, detail: state.error });
      return { kind: state.kind, severity: 'error', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': state.kind }, announcement, recoveryAction: state.recoveryAction };
    }
    case 'ready':
    default: {
      const announcement = stateAnnouncement({ key, status: 'ready', subject: state.subject, completed: state.count });
      return { kind: 'ready', severity: 'success', statusText: announcement.text, attributes: { 'aria-busy': false, 'data-surface-state': 'ready' }, announcement };
    }
  }
}
