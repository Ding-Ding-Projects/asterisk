import { APPEARANCE_PROPERTIES, cssVarFor, resolveAppearanceValue } from './appearance';
import { formatColour, parseColour, rainbowDurationMs, resolveRainbow } from './colour';
import type {
  AppearanceCapabilityRecord,
  AppearanceInteractionState,
  AppearanceModel,
  AppearanceProperty,
  AppearanceValue,
} from './appearance-schema';

export const APPEARANCE_ELEMENT_ATTRIBUTE = 'data-appearance-id';
export const APPEARANCE_STATE_ATTRIBUTE = 'data-appearance-state';
const MOUNTED_PROPERTIES_ATTRIBUTE = 'data-appearance-mounted-properties';
const RAINBOW_ATTRIBUTE = 'data-appearance-rainbow';
const RAINBOW_DURATION_VARIABLE = '--appearance-rainbow-duration';
const GLOBAL_ATTRIBUTES = ['data-appearance-theme', 'data-appearance-density', 'data-appearance-motion', RAINBOW_ATTRIBUTE] as const;
const GLOBAL_VARIABLES = ['--accent', '--appearance-font-scale', '--font-family', RAINBOW_DURATION_VARIABLE] as const;

export const APPEARANCE_RUNTIME_STYLES = `
@property --appearance-rainbow-hue {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}
@keyframes appearance-rainbow-hue-cycle {
  from { --appearance-rainbow-hue: 0deg; }
  to { --appearance-rainbow-hue: 360deg; }
}
[data-appearance-rainbow='true'] {
  animation: appearance-rainbow-hue-cycle var(--appearance-rainbow-duration) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  [data-appearance-rainbow='true'] { animation: none; }
}
`.trim();

export interface AppearanceRuntimeOptions {
  readonly reducedMotion: boolean;
  readonly stateForElement?: (element: HTMLElement) => AppearanceInteractionState;
}

export interface AppearanceRuntimeWarning {
  readonly elementId?: string;
  readonly property?: AppearanceProperty;
  readonly message: string;
}

export interface AppearanceMountResult {
  readonly mountedElementIds: ReadonlyArray<string>;
  readonly unmatchedElementIds: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<AppearanceRuntimeWarning>;
}

function serialiseAppearanceValue(
  model: AppearanceModel,
  value: AppearanceValue,
  reducedMotion: boolean,
): { cssValue?: string; animated: boolean; warning?: string } {
  if (value.kind === 'literal') return { cssValue: value.value, animated: false };
  if (value.kind === 'colour') {
    const parsed = parseColour(value.value);
    if (!parsed) return { animated: false, warning: `Colour '${value.value}' could not be parsed.` };
    return { cssValue: formatColour(parsed, 'hex'), animated: false };
  }
  const resolved = resolveRainbow(value, reducedMotion, model.rainbowLevel);
  return { cssValue: resolved.cssColour, animated: resolved.animated };
}

function currentState(element: HTMLElement, options: AppearanceRuntimeOptions): AppearanceInteractionState {
  if (options.stateForElement) return options.stateForElement(element);
  const value = element.getAttribute(APPEARANCE_STATE_ATTRIBUTE);
  const states: ReadonlyArray<AppearanceInteractionState> = [
    'default', 'hover', 'focus', 'focusVisible', 'active', 'disabled', 'selected', 'checked', 'expanded',
  ];
  return states.includes(value as AppearanceInteractionState) ? value as AppearanceInteractionState : 'default';
}

function appearanceElements(root: ParentNode): HTMLElement[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(`[${APPEARANCE_ELEMENT_ATTRIBUTE}]`));
  if (typeof HTMLElement !== 'undefined'
    && root instanceof HTMLElement
    && root.hasAttribute(APPEARANCE_ELEMENT_ATTRIBUTE)) elements.unshift(root);
  return elements;
}

function appearanceRootElement(root: ParentNode): HTMLElement | undefined {
  if (typeof Document !== 'undefined' && root instanceof Document) return root.documentElement;
  return typeof HTMLElement !== 'undefined' && root instanceof HTMLElement ? root : undefined;
}

function clearGlobalAppearance(root: ParentNode): void {
  const host = appearanceRootElement(root);
  if (!host) return;
  GLOBAL_ATTRIBUTES.forEach((attribute) => host.removeAttribute(attribute));
  GLOBAL_VARIABLES.forEach((property) => host.style.removeProperty(property));
}

function clearPreviouslyMounted(element: HTMLElement): void {
  const mounted = element.getAttribute(MOUNTED_PROPERTIES_ATTRIBUTE);
  if (mounted) {
    for (const cssVariable of mounted.split(',').filter(Boolean)) element.style.removeProperty(cssVariable);
  }
  element.removeAttribute(MOUNTED_PROPERTIES_ATTRIBUTE);
  element.removeAttribute(RAINBOW_ATTRIBUTE);
}

export function mountAppearanceModel(
  root: ParentNode,
  model: AppearanceModel,
  options: AppearanceRuntimeOptions,
): AppearanceMountResult {
  const mountedElementIds: string[] = [];
  const warnings: AppearanceRuntimeWarning[] = [];
  const seen = new Set<string>();
  const duration = rainbowDurationMs(model.rainbowLevel);
  const reducedMotion = options.reducedMotion || model.globals.motion === 'reduce';
  const host = appearanceRootElement(root);
  if (host) {
    clearGlobalAppearance(root);
    host.setAttribute('data-appearance-theme', model.globals.theme);
    host.setAttribute('data-appearance-density', model.globals.density);
    host.setAttribute('data-appearance-motion', model.globals.motion);
    host.style.setProperty('--appearance-font-scale', String(model.globals.fontScale));
    if (model.globals.fontFamily) host.style.setProperty('--font-family', model.globals.fontFamily);
    const accent = serialiseAppearanceValue(model, model.globals.accent, reducedMotion);
    if (accent.cssValue) host.style.setProperty('--accent', accent.cssValue);
    else warnings.push({ property: 'colour', message: accent.warning ?? 'Global accent was not mounted.' });
    if (accent.animated) {
      host.style.setProperty(RAINBOW_DURATION_VARIABLE, `${duration}ms`);
      host.setAttribute(RAINBOW_ATTRIBUTE, 'true');
    }
  }

  for (const element of appearanceElements(root)) {
    clearPreviouslyMounted(element);
    const elementId = element.getAttribute(APPEARANCE_ELEMENT_ATTRIBUTE);
    if (!elementId) continue;
    seen.add(elementId);
    mountedElementIds.push(elementId);
    const state = currentState(element, options);
    const mountedVariables: string[] = [];
    let hasAnimatedRainbow = false;

    for (const property of APPEARANCE_PROPERTIES) {
      const resolved = resolveAppearanceValue(model, elementId, state, property);
      if (!resolved) continue;
      const serialised = serialiseAppearanceValue(model, resolved.value, reducedMotion);
      if (!serialised.cssValue) {
        warnings.push({ elementId, property, message: serialised.warning ?? 'Appearance value was not mounted.' });
        continue;
      }
      const cssVariable = cssVarFor(property);
      element.style.setProperty(cssVariable, serialised.cssValue);
      mountedVariables.push(cssVariable);
      hasAnimatedRainbow ||= serialised.animated;
    }

    if (hasAnimatedRainbow) {
      element.style.setProperty(RAINBOW_DURATION_VARIABLE, `${duration}ms`);
      mountedVariables.push(RAINBOW_DURATION_VARIABLE);
      element.setAttribute(RAINBOW_ATTRIBUTE, 'true');
    }
    if (mountedVariables.length > 0) {
      element.setAttribute(MOUNTED_PROPERTIES_ATTRIBUTE, mountedVariables.join(','));
    }
  }

  const targeted = new Set(
    model.overrides
      .filter((override) => override.target.scope === 'element')
      .map((override) => override.target.scope === 'element' ? override.target.elementId : ''),
  );
  const unmatchedElementIds = [...targeted].filter((elementId) => !seen.has(elementId));
  unmatchedElementIds.forEach((elementId) => warnings.push({
    elementId,
    message: `No mounted element exposes ${APPEARANCE_ELEMENT_ATTRIBUTE}='${elementId}'. The override remains stored.`,
  }));
  return { mountedElementIds, unmatchedElementIds, warnings };
}

export function unmountAppearanceModel(root: ParentNode): void {
  for (const element of appearanceElements(root)) clearPreviouslyMounted(element);
  clearGlobalAppearance(root);
}

export function setAppearanceInteractionState(
  element: HTMLElement,
  state: AppearanceInteractionState,
): void {
  element.setAttribute(APPEARANCE_STATE_ATTRIBUTE, state);
}

export interface AppearanceRuntimeAdapter {
  mount(model: AppearanceModel, options: AppearanceRuntimeOptions): AppearanceMountResult;
  unmount(): void;
  setInteractionState(element: HTMLElement, state: AppearanceInteractionState): void;
}

export function createAppearanceRuntimeAdapter(root: ParentNode): AppearanceRuntimeAdapter {
  return {
    mount: (model, options) => mountAppearanceModel(root, model, options),
    unmount: () => unmountAppearanceModel(root),
    setInteractionState: setAppearanceInteractionState,
  };
}

export interface AppearanceModelSource {
  getModel(): AppearanceModel;
  subscribe(listener: (model: AppearanceModel) => void): () => void;
}

export interface BoundAppearanceRuntime {
  readonly initialResult: AppearanceMountResult;
  unbind(): void;
}

/** Mount now and remount after each persisted store update. */
export function bindAppearanceRuntime(
  root: ParentNode,
  source: AppearanceModelSource,
  options: () => AppearanceRuntimeOptions,
): BoundAppearanceRuntime {
  const adapter = createAppearanceRuntimeAdapter(root);
  const initialResult = adapter.mount(source.getModel(), options());
  const unsubscribe = source.subscribe((model) => { adapter.mount(model, options()); });
  return {
    initialResult,
    unbind: () => {
      unsubscribe();
      adapter.unmount();
    },
  };
}

function capability(
  id: AppearanceCapabilityRecord['id'],
  supported: boolean,
  reason?: string,
  fallback?: string,
): AppearanceCapabilityRecord {
  return supported ? { id, supported } : { id, supported, reason: reason ?? 'Unavailable in this runtime.', fallback };
}

/** Detect capabilities without invoking permission prompts or claiming an operation succeeded. */
export function detectAppearanceCapabilities(environment: {
  readonly window?: Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown };
  readonly navigator?: Navigator;
  readonly css?: typeof CSS;
  readonly variableFontAxes?: boolean;
  readonly safeLogoDecode?: boolean;
  readonly safeLogoCrop?: boolean;
} = {}): AppearanceCapabilityRecord[] {
  const runtimeWindow = environment.window ?? (typeof window === 'undefined' ? undefined : window as Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown });
  const runtimeNavigator = environment.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator);
  const runtimeCss = environment.css ?? (typeof CSS === 'undefined' ? undefined : CSS);
  const queryLocalFonts = runtimeWindow?.queryLocalFonts;
  const eyeDropper = runtimeWindow?.EyeDropper;
  const clipboardWrite = runtimeNavigator?.clipboard?.writeText;
  const rainbowRegistration = (runtimeCss as unknown as { registerProperty?: unknown } | undefined)?.registerProperty;

  return [
    capability('installedFontEnumeration', typeof queryLocalFonts === 'function',
      'The Local Font Access API is unavailable or not granted.',
      'Keep the current font and expose an explicit capability explanation.'),
    capability('variableFontAxes', environment.variableFontAxes === true,
      'No verified variable-font axis adapter was registered.',
      'Keep saved axis values visible as unsupported rather than dropping them.'),
    capability('eyeDropper', typeof eyeDropper === 'function',
      'The EyeDropper API is unavailable.',
      'Use the continuous picker or numeric colour representations.'),
    capability('clipboardWrite', typeof clipboardWrite === 'function',
      'Clipboard write access is unavailable.',
      'Select the translated value manually; do not report it as copied.'),
    capability('customLogoDecode', environment.safeLogoDecode === true,
      'No resource-bounded local logo decoder was registered.',
      'Keep the prior valid logo active.'),
    capability('customLogoCrop', environment.safeLogoCrop === true,
      'No resource-bounded local logo crop adapter was registered.',
      'Keep safe crop metadata without claiming rendered output.'),
    capability('rainbowAnimation', typeof rainbowRegistration === 'function',
      'CSS custom-property animation registration is unavailable.',
      'Resolve rainbow markers to their reduced-motion hue.'),
    capability('cssOklch', Boolean(runtimeCss?.supports?.('color', 'oklch(0.5 0.1 180)')),
      'The renderer does not support direct OKLCH output.',
      'Use the translated sRGB representation and retain the clipping warning.'),
  ];
}

export type AppearanceRuntimeActionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

/** Success is returned only after the platform clipboard promise resolves. */
export async function writeAppearanceClipboard(
  text: string,
  runtimeNavigator: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): Promise<AppearanceRuntimeActionResult<void>> {
  const writeText = runtimeNavigator?.clipboard?.writeText;
  if (typeof writeText !== 'function') return { ok: false, reason: 'Clipboard write is unavailable in this runtime.' };
  try {
    const clipboard = runtimeNavigator?.clipboard;
    if (!clipboard) return { ok: false, reason: 'Clipboard write is unavailable in this runtime.' };
    await writeText.call(clipboard, text);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

interface EyeDropperLike {
  open(): Promise<{ sRGBHex: string }>;
}

interface EyeDropperConstructorLike {
  new(): EyeDropperLike;
}

/** Success is returned only with the actual value supplied by the platform eyedropper. */
export async function pickAppearanceColour(
  runtimeWindow: (Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown }) | undefined = typeof window === 'undefined'
    ? undefined
    : window as Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown },
): Promise<AppearanceRuntimeActionResult<string>> {
  const Constructor = runtimeWindow?.EyeDropper as EyeDropperConstructorLike | undefined;
  if (typeof Constructor !== 'function') return { ok: false, reason: 'The EyeDropper API is unavailable in this runtime.' };
  try {
    const result = await new Constructor().open();
    return parseColour(result.sRGBHex)
      ? { ok: true, value: result.sRGBHex }
      : { ok: false, reason: 'The eyedropper returned an invalid colour.' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

interface LocalFontLike {
  readonly family?: string;
  readonly fullName?: string;
  readonly postscriptName?: string;
  readonly style?: string;
}

type QueryLocalFontsLike = () => Promise<ReadonlyArray<LocalFontLike>>;

export interface InstalledFontRecord {
  readonly family: string;
  readonly fullName: string;
  readonly postscriptName?: string;
  readonly style?: string;
}

/** Returns only real platform records and reports refusal or absence explicitly. */
export async function enumerateInstalledFonts(
  runtimeWindow: (Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown }) | undefined = typeof window === 'undefined'
    ? undefined
    : window as Window & typeof globalThis & { queryLocalFonts?: unknown; EyeDropper?: unknown },
): Promise<AppearanceRuntimeActionResult<ReadonlyArray<InstalledFontRecord>>> {
  const queryLocalFonts = runtimeWindow?.queryLocalFonts as QueryLocalFontsLike | undefined;
  if (typeof queryLocalFonts !== 'function') {
    return { ok: false, reason: 'Installed-font enumeration is unavailable in this runtime.' };
  }
  try {
    const fonts = await queryLocalFonts.call(runtimeWindow);
    const records = fonts
      .filter((font) => typeof font.family === 'string' && typeof font.fullName === 'string')
      .map((font) => ({
        family: font.family!,
        fullName: font.fullName!,
        postscriptName: font.postscriptName,
        style: font.style,
      }));
    return { ok: true, value: records };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
