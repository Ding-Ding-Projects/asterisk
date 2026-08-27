/**
 * Turns the target's real prompt library (`MediaLibrary#list`, always the `prompts`
 * root — `/var/lib/asterisk/sounds`) into the row shapes the Sound prompts screen's
 * table renders, and states plainly which of the formats `MediaLibrary` will accept
 * a browser can actually play back.
 *
 * A prompt file's own name is already Asterisk's real identity for it — `usableName`
 * in `control-plane/media-library.ts` refuses anything else before a file ever lands —
 * so, unlike the access-control-rules editor next door (`acl-editor.ts`), a row here
 * needs no synthetic key built from its position: the row's first cell IS the file on
 * disk, and resolving a click back to a real object is just looking that name up in
 * the same list the table was built from.
 */
import type { MediaFile } from '../../../control-plane/media-library';

/**
 * The formats `MediaLibrary#SIGNATURES` validates a real container header for on the
 * way in: a RIFF/WAVE header for `wav`, an OggS page header for `ogg` and `opus` (an
 * uploaded `.opus` is still an Ogg-contained stream — the two extensions share one
 * signature check in `media-library.ts` for exactly that reason). Every one of them is
 * a format the HTML `<audio>` element this console runs in can decode from a data URL
 * with no extra work.
 *
 * The other five accepted extensions — `gsm`, `ulaw`, `alaw`, `g722`, `sln`, `sln16` —
 * are Asterisk's own raw, headerless telephony encodings. `MediaLibrary` accepts them
 * because Asterisk itself plays them straight off disk, but a raw stream carries no
 * sample rate, no channel count and no framing a browser's decoder could recover them
 * from, and nothing in a stock browser understands the encodings themselves. Auditioning
 * one of those in-app would be the wrong control offering something it cannot deliver,
 * exactly the reasoning `musiconhold.conf`'s `custom` mode already uses on the Music on
 * hold screen for not offering an upload button it could not honour either.
 */
export const PLAYABLE_EXTENSIONS: ReadonlySet<string> = new Set(['wav', 'ogg', 'opus']);

/** The `<audio>`-friendly MIME type for a playable extension. Never called for anything
 *  outside {@link PLAYABLE_EXTENSIONS} — the caller checks that first and refuses the
 *  action honestly rather than asking a browser to decode something it cannot. */
export function playbackMimeType(extension: string): string {
  return extension === 'wav' ? 'audio/wav' : 'audio/ogg';
}

/** A human-scale size, matching the units already used throughout this design's own
 *  mock data (`482 KB`, `1.1 MB`) rather than a bare byte count nobody can size up at a
 *  glance. */
export function formatPromptSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

/** One row per prompt, in the order the target's own `find` returned them. Never
 *  throws: `files === undefined` (nothing read yet, or the last read failed) is zero
 *  rows, exactly like {@link import('./acl-editor').aclRuleRows} reports "nothing to
 *  show" rather than crashing the render. */
export function promptRows(files: ReadonlyArray<MediaFile> | undefined): string[][] {
  if (!files) return [];
  return files.map((file) => [
    file.name,
    file.extension,
    formatPromptSize(file.bytes),
    PLAYABLE_EXTENSIONS.has(file.extension) ? 'Playable' : 'Download only',
  ]);
}

/** Resolves a clicked row's own name back to the real {@link MediaFile} it names, from
 *  the SAME list the table was built from — so a row from a stale render (the library
 *  changed underneath a still-open menu, another admin removed the file a moment ago)
 *  resolves to `undefined` rather than acting on whatever now happens to share that
 *  name in a fresher read the caller has not applied yet. */
export function resolvePromptRow(files: ReadonlyArray<MediaFile> | undefined, name: string): MediaFile | undefined {
  return files?.find((file) => file.name === name);
}
