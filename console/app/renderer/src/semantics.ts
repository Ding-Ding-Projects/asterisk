/** Semantic descriptors shared by React surfaces without coupling them to React itself. */

export type SemanticAttributeValue = string | number | boolean | undefined;
export type SemanticAttributes = Readonly<Record<string, SemanticAttributeValue>>;

function compact(attributes: Record<string, SemanticAttributeValue>): SemanticAttributes {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined));
}

export interface DialogSemanticsInput {
  id: string;
  labelledBy: string;
  describedBy?: string;
  modal?: boolean;
  busy?: boolean;
}

export function dialogSemantics(input: DialogSemanticsInput): SemanticAttributes {
  return compact({
    id: input.id,
    role: 'dialog',
    'aria-modal': input.modal ?? true,
    'aria-labelledby': input.labelledBy,
    'aria-describedby': input.describedBy,
    'aria-busy': input.busy,
    tabIndex: -1,
  });
}

export interface PopoverSemanticsInput {
  id: string;
  label: string;
  expanded: boolean;
  anchorId: string;
  busy?: boolean;
}

export function popoverSemantics(input: PopoverSemanticsInput): SemanticAttributes {
  return compact({
    id: input.id,
    role: 'region',
    'aria-label': input.label,
    'aria-busy': input.busy,
    'data-anchor-id': input.anchorId,
    'data-expanded': input.expanded,
    tabIndex: -1,
  });
}

export function popoverTriggerSemantics(popoverId: string, expanded: boolean): SemanticAttributes {
  return {
    'aria-haspopup': 'dialog',
    'aria-controls': popoverId,
    'aria-expanded': expanded,
  };
}

export interface MenuSemanticsInput {
  label: string;
  activeItemId?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function menuSemantics(input: MenuSemanticsInput): SemanticAttributes {
  return compact({
    role: 'menu',
    'aria-label': input.label,
    'aria-activedescendant': input.activeItemId,
    'aria-orientation': input.orientation ?? 'vertical',
    tabIndex: 0,
  });
}

export function menuItemSemantics(disabled = false, checked?: boolean): SemanticAttributes {
  return compact({
    role: checked === undefined ? 'menuitem' : 'menuitemcheckbox',
    'aria-disabled': disabled,
    'aria-checked': checked,
    tabIndex: -1,
  });
}

export interface CollectionSemanticsInput {
  label: string;
  busy?: boolean;
  itemCount?: number;
  descriptionId?: string;
}

export function listSemantics(input: CollectionSemanticsInput): SemanticAttributes {
  return compact({
    role: 'list',
    'aria-label': input.label,
    'aria-busy': input.busy,
    'aria-describedby': input.descriptionId,
    'data-item-count': input.itemCount,
  });
}

export interface TableSemanticsInput extends CollectionSemanticsInput {
  rowCount?: number;
  columnCount?: number;
}

export function tableSemantics(input: TableSemanticsInput): SemanticAttributes {
  return compact({
    role: 'table',
    'aria-label': input.label,
    'aria-busy': input.busy,
    'aria-describedby': input.descriptionId,
    'aria-rowcount': input.rowCount,
    'aria-colcount': input.columnCount,
  });
}

export interface DisabledReason {
  code: string;
  message: string;
  descriptionId: string;
  recoveryAction?: string;
}

/** Metadata keeps a disabled control's unmet condition discoverable and actionable. */
export function disabledControlSemantics(reason: DisabledReason | undefined): SemanticAttributes {
  if (!reason) return {};
  return compact({
    disabled: true,
    'aria-disabled': true,
    'aria-describedby': reason.descriptionId,
    'data-disabled-reason': reason.code,
    'data-recovery-action': reason.recoveryAction,
  });
}

export type ValueProvenance = 'read' | 'unread' | 'unavailable' | 'stale';

interface AccessibleValueBase {
  label: string;
  source?: string;
  observedAt?: string;
  reason?: string;
}

export type AccessibleValueInput =
  | (AccessibleValueBase & { provenance: 'read'; value: string | number | boolean })
  | (AccessibleValueBase & { provenance: 'stale'; value: string | number | boolean })
  | (AccessibleValueBase & { provenance: 'unread'; value?: never })
  | (AccessibleValueBase & { provenance: 'unavailable'; value?: never });

export interface AccessibleValueDescriptor {
  /** An unread cell is always shown as an em dash, never as invented data. */
  displayValue: string;
  accessibleName: string;
  provenance: ValueProvenance;
  attributes: SemanticAttributes;
}

/**
 * Describe a table or list value and its source state without making blank, unread, stale, and
 * unavailable cells look equivalent to assistive technology.
 */
export function accessibleValue(input: AccessibleValueInput): AccessibleValueDescriptor {
  const source = input.source ? ` Source: ${input.source}.` : '';
  const observed = input.observedAt ? ` Observed at ${input.observedAt}.` : '';
  const reason = input.reason ? ` ${input.reason}` : '';

  if (input.provenance === 'unread') {
    return {
      displayValue: '—',
      accessibleName: `${input.label}: not read.${reason}${source}`.trim(),
      provenance: input.provenance,
      attributes: { 'data-value-provenance': 'unread', 'aria-label': `${input.label}: not read.${reason}${source}`.trim() },
    };
  }
  if (input.provenance === 'unavailable') {
    const name = `${input.label}: unavailable.${reason}${source}`.trim();
    return {
      displayValue: '—',
      accessibleName: name,
      provenance: input.provenance,
      attributes: { 'data-value-provenance': 'unavailable', 'aria-label': name },
    };
  }
  const literal = String(input.value);
  if (input.provenance === 'stale') {
    const name = `${input.label}: ${literal}. Stale value.${observed}${reason}${source}`.trim();
    return {
      displayValue: literal,
      accessibleName: name,
      provenance: input.provenance,
      attributes: { 'data-value-provenance': 'stale', 'aria-label': name },
    };
  }

  const name = `${input.label}: ${literal}.${observed}${source}`.trim();
  return {
    displayValue: literal,
    accessibleName: name,
    provenance: input.provenance,
    attributes: { 'data-value-provenance': 'read', 'aria-label': name },
  };
}
