/**
 * The user-chosen name for the application.
 *
 * Every other label an app renders is the user's to change, and leaving the product's
 * own name as the single fixed string is an exemption nobody ever decided on. So this
 * lets somebody rename what the console calls itself in its title bar, its About
 * surface and its notifications.
 *
 * THE ENTIRE SAFETY OF THIS FEATURE IS ONE RULE: a rename changes the DISPLAY name and
 * nothing else. The identity -- the application-data directory, the installer and package
 * identifiers, the update feed, the credential-vault account keys -- must not move
 * because somebody typed a new title. That decoupling is not hypothetical caution: a data
 * directory derived from the product name would orphan every stored profile, credential
 * and history the moment the name changed, and the app would look freshly installed with
 * the old data still on disk under a name nothing reads any more.
 *
 * Hence `IDENTITY`, which is a frozen constant, and `displayName()`, which is a setting.
 * They are deliberately separate exports with no path between them.
 */

/**
 * Everything that must never move. Deriving any of these from the display name is the
 * single mistake this module exists to prevent, so they are constants rather than
 * anything computed.
 */
export const IDENTITY = Object.freeze({
  /** The shipped product name. Used wherever a reader has to know what software this is. */
  productName: 'Material Asterisk',
  /** The application-data directory name. Renaming the app must never change this. */
  dataDirectory: 'ding-pbx-console',
  /** The packaging identifier, as the installer and the update feed know it. */
  applicationId: 'com.dingding.pbx-console',
  /** The credential-vault service key that every stored secret hangs off. */
  credentialService: 'ding-pbx-console',
});

export const DISPLAY_NAME_SETTING = 'console.displayName';
export const MAX_DISPLAY_NAME_LENGTH = 60;

export interface NameStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface NameProblem {
  message: string;
}

/**
 * Validates a proposed name.
 *
 * Deliberately permissive about content -- it is a label, and somebody wanting to call
 * their PBX 電話系統 or "Reception (do not touch)" is entitled to. What is refused is a
 * name that would render as nothing, or one long enough to break the surfaces it appears
 * in. Control characters are refused because a newline in a title bar is a rendering
 * fault rather than a name.
 */
export function validateDisplayName(candidate: string): NameProblem[] {
  const value = candidate.trim();
  if (!value) return [{ message: 'A name cannot be empty. Reset it instead to go back to the shipped name.' }];
  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return [{ message: `A name has to be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer; that one is ${value.length}.` }];
  }
  /* Built from code points rather than written as a regex literal. The first version
   * of this line was authored through a shell heredoc, which ate a backslash layer and
   * left three ACTUAL control characters sitting in the source: it compiled, it worked,
   * and the only symptom was grep calling the file binary. */
  const CONTROL = new RegExp(
    '[' + String.fromCharCode(0) + '-' + String.fromCharCode(31)
      + String.fromCharCode(127) + ']',
    'u',
  );
  if (CONTROL.test(value)) {
    return [{ message: 'A name cannot contain control characters. A newline in a title bar is a rendering fault, not a name.' }];
  }
  return [];
}

/** The name to show. Falls back to the shipped one whenever nothing valid is stored. */
export function displayName(storage: NameStorage | undefined): string {
  const stored = storage?.getItem(DISPLAY_NAME_SETTING);
  if (typeof stored !== 'string') return IDENTITY.productName;
  const value = stored.trim();
  /* A stored value that would not pass validation now -- because it was hand-edited, or
   * written by an older version -- falls back rather than rendering. Refusing to display
   * something the app would refuse to accept keeps the two ends honest. */
  return value && validateDisplayName(value).length === 0 ? value : IDENTITY.productName;
}

export function isRenamed(storage: NameStorage | undefined): boolean {
  return displayName(storage) !== IDENTITY.productName;
}

/** Sets the name. Returns the problems instead of writing when there are any. */
export function setDisplayName(storage: NameStorage, candidate: string): NameProblem[] {
  const problems = validateDisplayName(candidate);
  if (problems.length > 0) return problems;
  storage.setItem(DISPLAY_NAME_SETTING, candidate.trim());
  return [];
}

/** Restores the shipped name in one action. */
export function resetDisplayName(storage: NameStorage): void {
  storage.removeItem(DISPLAY_NAME_SETTING);
}

/**
 * Where the chosen name is used, and where the shipped one is used instead.
 *
 * A diagnostic report, a crash log or an issue somebody files has to say what software
 * it came from. Sending "Reception" to a bug tracker tells the reader nothing, so those
 * surfaces get `IDENTITY.productName` and the rename surface says so.
 */
export type NameSurface =
  | 'titleBar' | 'about' | 'notification' | 'windowTitle'
  | 'diagnosticReport' | 'crashLog' | 'issueReport' | 'updateFeed' | 'installer';

const SHIPPED_NAME_SURFACES: ReadonlySet<NameSurface> = new Set<NameSurface>([
  'diagnosticReport', 'crashLog', 'issueReport', 'updateFeed', 'installer',
]);

export function nameFor(surface: NameSurface, storage: NameStorage | undefined): string {
  return SHIPPED_NAME_SURFACES.has(surface) ? IDENTITY.productName : displayName(storage);
}

/** The line shown beside the rename control, so the boundary is stated where it applies. */
export const RENAME_DISCLOSURE =
  'This changes what the console calls itself on screen. It does not move your data, your '
  + 'saved servers or your credentials, and diagnostics and bug reports still say '
  + `${IDENTITY.productName} so anyone reading one knows what software it came from.`;

/**
 * The sentence the About screen adds under its heading to say what this console calls
 * itself.
 *
 * The name used to live in the About screen's `<h1>`, which read `About Material Asterisk`
 * where the design's own heading reads `About`. That divergence cost more than it looked
 * worth: the parity capture driver settles on the heading to prove it arrived at the right
 * destination, so About was the one destination of thirty-two that could never be captured
 * from the built application at all.
 *
 * Moving the name into the body keeps both halves. The heading is the design's, and the
 * rename still reaches an About surface -- which is the whole claim this module's header
 * comment makes about where a chosen name shows up.
 *
 * It also puts the shipped-name-only boundary on the screen a reader would go to for it:
 * once renamed, the line says outright that a bug report will still name the real product.
 */
export function aboutIdentityLine(storage: NameStorage | undefined): string {
  /* Through `nameFor('about', ...)` rather than `displayName(...)` directly, so the surface
   * table above stays the thing that decides. It resolves identically today, and it means
   * moving 'about' into SHIPPED_NAME_SURFACES would actually change this line rather than
   * leaving a dead entry that says it governs a surface it no longer reaches. */
  const chosen = nameFor('about', storage);
  if (chosen === IDENTITY.productName) return `This console is ${IDENTITY.productName}.`;
  return `This console has been renamed to ${chosen}. Diagnostics and bug reports still say `
    + `${IDENTITY.productName}, so anyone reading one knows what software it came from.`;
}

/**
 * The two confirmations the console shows on its notification surface (a toast) when a
 * rename takes effect. Pulled out as named, independently testable functions rather than
 * inline template literals so the exact wording is pinned in one place -- both by this
 * module's own tests and, for the caller, by giving `App.tsx` one obviously correct thing
 * to pass to `this.toast(...)` instead of reassembling the sentence at the call site.
 */
export function renamedConfirmation(chosenName: string): string {
  return `Renamed to ${chosenName}`;
}

export function resetConfirmation(): string {
  return `Name restored to ${IDENTITY.productName}`;
}
