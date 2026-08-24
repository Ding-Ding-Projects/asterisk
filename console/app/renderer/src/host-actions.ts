/**
 * The work behind the controls that used to only announce it.
 *
 * Fourteen menu items claimed to copy, export, import or save something and did none of
 * it -- "Diff copied", "Group exported", "Preset saved" -- each a sentence about work that
 * never happened. Every one of them is something the renderer can genuinely do by itself,
 * so none of them had an excuse.
 *
 * They share one implementation rather than fourteen, because the honest version of each
 * needs the same three things: do the work, say what actually happened, and say WHY when
 * it could not. Fourteen copies of that reasoning would disagree within a month, and the
 * copy that disagreed would be the one nobody read.
 *
 * Everything here is pure: the effects arrive as injected functions, so the decisions can
 * be tested without a clipboard, a filesystem or a browser.
 */

export type HostActionKind = 'copy' | 'copy-config' | 'export-config' | 'export-json' | 'import-json' | 'save' | 'pick-colour';

export interface HostActionRequest {
  kind: HostActionKind;
  /** What the person will recognise it as, for the message. */
  what?: string;
  subject?: string;
  name?: string;
  /** Keeps saved kinds apart. Not `kind`: this object already has one. */
  bucket?: string;
  text?: string;
  data?: unknown;
}

export interface HostActionOutcome {
  ok: boolean;
  /** Said out loud either way. A refusal named is worth more than a cheerful lie. */
  title: string;
  detail: string;
}

export interface HostActionEffects {
  /** Resolves false when the platform has no clipboard, rather than throwing. */
  writeClipboard(text: string): Promise<boolean>;
  /** Offers a file to the person. Returns false when the platform will not take it. */
  offerFile(name: string, mimeType: string, contents: string): Promise<boolean>;
  /** Asks for a file. Returns its text, or undefined when the person cancelled. */
  requestFile(accept: string): Promise<{ name: string; text: string } | undefined>;
  /** Local, durable, and never a network call. */
  store(key: string, value: string): boolean;
  /** The platform colour picker. undefined when unavailable or when the person cancelled. */
  pickColour?(): Promise<string | undefined>;
  /** Makes the picked colour the real accent. false when it could not be read as a colour. */
  applyAccent?(hex: string): boolean;
  now(): string;
}

const JSON_MIME = 'application/json';

/** Filenames a person will recognise a week later, and that no filesystem will refuse. */
export function fileNameFor(subject: string, name: string, stamp: string): string {
  const cleaned = `${name}`.trim().replace(/[^\w.-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48);
  const stem = cleaned === '' ? subject.replace(/\s+/gu, '-') : cleaned;
  /* The stamp is passed in rather than read here: a filename that changes with the clock
   * makes a test that asserts it either flaky or a re-implementation of the clock. */
  return `ding-${stem}-${stamp}.json`;
}

export async function runHostAction(
  request: HostActionRequest,
  effects: HostActionEffects,
): Promise<HostActionOutcome> {
  switch (request.kind) {
    case 'copy':
    case 'copy-config':
      return copy(request, effects);
    case 'export-config':
    case 'export-json':
      return exportFile(request, effects);
    case 'import-json':
      return importFile(request, effects);
    case 'save':
      return save(request, effects);
    case 'pick-colour':
      return pickColour(effects);
    default:
      /* Named rather than swallowed: a control wired to an action nobody implemented
       * should say so, not quietly succeed. */
      return { ok: false, title: 'Not done', detail: `Nothing here knows how to do "${String(request.kind)}".` };
  }
}

/**
 * Picks a colour off the screen and makes it the accent.
 *
 * Three outcomes worth telling apart, because the old control collapsed all of them into
 * one cheerful sentence: the platform cannot do this at all, the person changed their mind,
 * and it worked.
 */
async function pickColour(effects: HostActionEffects): Promise<HostActionOutcome> {
  if (!effects.pickColour || !effects.applyAccent) {
    return { ok: false, title: 'Not available', detail: 'This runtime has no screen colour picker, so nothing was picked.' };
  }
  const hex = await effects.pickColour();
  if (hex === undefined) {
    return { ok: false, title: 'Nothing picked', detail: 'No colour was chosen, so the accent is unchanged.' };
  }
  return effects.applyAccent(hex)
    ? { ok: true, title: 'Accent changed', detail: hex + ' is the accent now, and it is kept when you relaunch.' }
    : { ok: false, title: 'Not applied', detail: hex + ' could not be read as a colour, so the accent is unchanged.' };
}

async function copy(request: HostActionRequest, effects: HostActionEffects): Promise<HostActionOutcome> {
  const what = request.what ?? 'that';
  const text = request.text ?? '';
  if (text.trim() === '') {
    /* An empty clipboard write would report success and leave the person pasting nothing,
     * which is worse than the refusal because they would blame their own paste. */
    return { ok: false, title: 'Nothing to copy', detail: `There is no ${what} on screen to copy yet.` };
  }
  const ok = await effects.writeClipboard(text);
  return ok
    ? { ok: true, title: 'Copied', detail: `${text.length} characters of ${what} are on the clipboard.` }
    : { ok: false, title: 'Not copied', detail: 'This platform did not allow a clipboard write, so nothing was copied.' };
}

async function exportFile(request: HostActionRequest, effects: HostActionEffects): Promise<HostActionOutcome> {
  const subject = request.subject ?? 'export';
  const contents = request.kind === 'export-config'
    ? (request.text ?? '')
    : JSON.stringify(request.data ?? null, null, 2);
  if (contents.trim() === '' || contents === 'null') {
    return { ok: false, title: 'Nothing to export', detail: `There is no ${subject} to write out yet.` };
  }
  const name = fileNameFor(subject, request.name ?? subject, effects.now());
  const ok = await effects.offerFile(name, request.kind === 'export-config' ? 'text/plain' : JSON_MIME, contents);
  return ok
    ? { ok: true, title: 'Exported', detail: `${name} was offered for download, ${contents.length} characters of ${subject}.` }
    : { ok: false, title: 'Not exported', detail: 'This platform did not allow a file to be offered, so nothing was written.' };
}

async function importFile(request: HostActionRequest, effects: HostActionEffects): Promise<HostActionOutcome> {
  const subject = request.subject ?? 'file';
  const picked = await effects.requestFile(JSON_MIME);
  if (!picked) return { ok: false, title: 'Nothing imported', detail: 'No file was chosen, so nothing changed.' };
  try {
    const parsed: unknown = JSON.parse(picked.text);
    if (parsed === null || typeof parsed !== 'object') {
      return { ok: false, title: 'Not imported', detail: `${picked.name} is valid JSON but not a ${subject}, so nothing changed.` };
    }
    const stored = effects.store(`console.import.${subject}`, picked.text);
    return stored
      ? { ok: true, title: 'Imported', detail: `${picked.name} was read as a ${subject} and kept.` }
      : { ok: false, title: 'Not imported', detail: `${picked.name} was read but could not be kept, so nothing changed.` };
  } catch {
    /* Named by what it is not. Nothing is partially applied: a file that fails leaves what
     * was there exactly as it was. */
    return { ok: false, title: 'Not imported', detail: `${picked.name} is not readable as JSON, so nothing changed.` };
  }
}

function save(request: HostActionRequest, effects: HostActionEffects): HostActionOutcome {
  const name = request.name?.trim() ?? '';
  if (name === '') {
    /* "Save this search" on an empty search used to report a saved search. There was
     * nothing to save, and it said it had saved it. */
    return { ok: false, title: 'Nothing to save', detail: 'There is nothing filled in here yet, so nothing was saved.' };
  }
  /* The bucket keeps the four kinds apart, so saving a search cannot overwrite a saved
   * appearance preset. It is named `bucket` rather than `kind` because the request already
   * has a kind, and one object with two fields called kind is a collision waiting to
   * happen -- the design passes this one, and it would have shadowed the action itself. */
  const bucket = request.bucket ?? 'item';
  const ok = effects.store(`console.saved.${bucket}`, JSON.stringify({ name, at: effects.now() }));
  return ok
    ? { ok: true, title: 'Saved', detail: `"${name}" is kept on this computer and survives a relaunch.` }
    : { ok: false, title: 'Not saved', detail: 'Local storage refused the write, so nothing was kept.' };
}
