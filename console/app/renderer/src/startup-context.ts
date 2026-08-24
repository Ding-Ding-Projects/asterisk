import type { DimSumStartupContext } from './dim-sum-surprise-mounted';

export interface StartupContextSnapshot extends DimSumStartupContext {
  readonly ready: boolean;
}

const EVENT_NAME = 'ding-startup-context-changed';
const DATA_KEYS = {
  schoolMode: 'dimSumSchoolMode',
  firstRun: 'dimSumFirstRun',
  errorActive: 'dimSumErrorActive',
  updateActive: 'dimSumUpdateActive',
  taskActive: 'dimSumTaskActive',
  reducedMotion: 'dimSumReducedMotion',
  ready: 'dimSumContextReady',
} as const;

function booleanAttribute(element: HTMLElement, key: string, fallback: boolean): boolean {
  const value = element.dataset[key];
  return value === undefined ? fallback : value === 'true';
}

export function readStartupContext(root?: HTMLElement): StartupContextSnapshot {
  const target = root ?? (typeof document === 'undefined' ? undefined : document.documentElement);
  if (!target) return { ready: false, schoolMode: false, firstRun: true, errorActive: false, updateActive: false, taskActive: false, reducedMotion: false };
  return {
    ready: booleanAttribute(target, DATA_KEYS.ready, false),
    schoolMode: booleanAttribute(target, DATA_KEYS.schoolMode, false),
    firstRun: booleanAttribute(target, DATA_KEYS.firstRun, true),
    errorActive: booleanAttribute(target, DATA_KEYS.errorActive, false),
    updateActive: booleanAttribute(target, DATA_KEYS.updateActive, false),
    taskActive: booleanAttribute(target, DATA_KEYS.taskActive, false),
    reducedMotion: booleanAttribute(target, DATA_KEYS.reducedMotion, false),
  };
}

export function publishStartupContext(context: StartupContextSnapshot): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset[DATA_KEYS.schoolMode] = String(context.schoolMode);
  root.dataset[DATA_KEYS.firstRun] = String(context.firstRun);
  root.dataset[DATA_KEYS.errorActive] = String(context.errorActive);
  root.dataset[DATA_KEYS.updateActive] = String(context.updateActive);
  root.dataset[DATA_KEYS.taskActive] = String(context.taskActive);
  root.dataset[DATA_KEYS.reducedMotion] = String(context.reducedMotion);
  root.dataset[DATA_KEYS.ready] = String(context.ready);
  root.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeStartupContext(listener: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => listener();
  document.documentElement.addEventListener(EVENT_NAME, handler);
  return () => document.documentElement.removeEventListener(EVENT_NAME, handler);
}

export const STARTUP_CONTEXT_EVENT = EVENT_NAME;
