/**
 * Uploads, lists, and removes media files on the Asterisk exchange — prompts, announcements,
 * voicemail greetings, and music-on-hold classes.
 *
 * Several screens in this console offer a "custom" choice for one of these — a custom
 * music-on-hold class, a custom announcement, a custom voicemail greeting — and until this
 * file existed there was no way to actually supply that file. A "custom" option nobody can
 * use is not an option.
 *
 * This writes arbitrary bytes to a telephone exchange, so the same two boundaries that
 * govern `WslConfigTransport` govern this file, and for the same reasons:
 *
 *  - **The two writable roots are named constants, and nothing else is writable.** Asterisk
 *    keeps prompts under `/var/lib/asterisk/sounds` and music on hold under
 *    `/var/lib/asterisk/moh`; those are the only two roots this class will ever touch.
 *  - **A filename is validated as a bare filename, refused before any command runs.** No
 *    path is accepted, joined, or interpolated from a caller — there is no traversal to
 *    defend against, because a name that is not a bare filename never reaches a command.
 *  - **Every command is an allowlisted executable with separate arguments; content travels
 *    on standard input, never as an argument.**
 */
import type { ProcessExecutor } from "./executor.js";

/** The two directories Asterisk actually reads media from. Nothing else is writable. */
export const MEDIA_ROOTS = {
  prompts: "/var/lib/asterisk/sounds",
  musicOnHold: "/var/lib/asterisk/moh",
} as const;

export type MediaRoot = keyof typeof MEDIA_ROOTS;

/** Formats Asterisk will actually play. Anything else is refused by name. */
const ALLOWED_EXTENSIONS = new Set([
  "wav", "gsm", "ulaw", "alaw", "g722", "sln", "sln16", "ogg", "opus",
]);

/** A bare filename: no separators, no traversal, no hidden dotfile, a printable ASCII set. */
const NAME_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;

const MAX_BYTES = 10 * 1024 * 1024;

export interface MediaFile {
  name: string;
  path: string;
  extension: string;
  bytes: number;
}

/**
 * Validates a bare filename against every rule that matters before any command is built:
 * shape, extension, and length. Returns the extension (lower-cased) so a caller can also
 * validate content against it, or `undefined` if the name is refused outright.
 *
 * Exported so a caller (an upload screen) can check a chosen filename before offering to
 * upload it, without needing an instance of this class.
 */
export function usableName(name: string): string | undefined {
  if (typeof name !== "string") return undefined;
  if (name.length === 0 || name.length > 128) return undefined;
  if (name.includes("\0")) return undefined;
  if (name.includes("/") || name.includes("\\")) return undefined;
  if (name.includes("..")) return undefined;
  if (name.includes(":")) return undefined;
  if (name.startsWith(".")) return undefined;
  if (!NAME_PATTERN.test(name)) return undefined;

  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return undefined;
  const extension = name.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return undefined;
  return extension;
}

/**
 * Formats whose bytes carry a real signature this class can check. The headerless raw
 * formats below (gsm, ulaw, alaw, g722, sln, sln16) have no signature at all — that is
 * stated here explicitly rather than pretending to validate them, and they are instead
 * bounded by size alone, the same as everything else.
 */
const SIGNATURES: ReadonlyArray<{
  extensions: ReadonlyArray<string>;
  check: (bytes: Buffer) => boolean;
  describe: string;
}> = [
  {
    extensions: ["wav"],
    describe: "a RIFF/WAVE header",
    check: (bytes) =>
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WAVE",
  },
  {
    extensions: ["ogg", "opus"],
    describe: "an OggS header",
    check: (bytes) => bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "OggS",
  },
];

/**
 * Formats with no verifiable signature. Every one of them must appear either here or in
 * `SIGNATURES`, or `#validateContent` below will (deliberately) refuse it as unrecognised —
 * see the completeness assertion in the constructor.
 */
const HEADERLESS_EXTENSIONS = new Set(["gsm", "ulaw", "alaw", "g722", "sln", "sln16"]);

export interface MediaLibraryOptions {
  executor: ProcessExecutor;
  distribution: string;
  now?: () => Date;
}

export class MediaLibrary {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;
  readonly #now: () => Date;

  constructor(options: MediaLibraryOptions) {
    this.#executor = options.executor;
    this.#distribution = options.distribution;
    this.#now = options.now ?? (() => new Date());

    /* Every allowed extension must be classified as either signature-checked or
     * explicitly headerless. An extension that is neither would silently pass content
     * validation with no check at all — this fails fast, at construction, rather than
     * letting that gap ship quietly. */
    const classified = new Set<string>(HEADERLESS_EXTENSIONS);
    for (const signature of SIGNATURES) for (const extension of signature.extensions) classified.add(extension);
    for (const extension of ALLOWED_EXTENSIONS) {
      if (!classified.has(extension)) {
        throw new Error(`"${extension}" is allowed but has no content-validation rule.`);
      }
    }
  }

  #root(root: MediaRoot): string {
    const path = MEDIA_ROOTS[root];
    if (!path) throw new Error(`"${root}" is not a media root.`);
    return path;
  }

  async #run(args: ReadonlyArray<string>, input?: string, timeoutMs = 30_000) {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", ...args],
      input,
      timeoutMs,
      maxOutputBytes: 4 * 1024 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `${args[0]} exited with ${result.exitCode}`);
    }
    return result.stdout;
  }

  /**
   * Validates the content bytes against what the extension claims. A file whose bytes
   * contradict its extension is refused. For a headerless format there is nothing to check
   * in the bytes, so only the size bound applies — enforced by the caller before this runs.
   */
  #validateContent(extension: string, bytes: Buffer): void {
    const signature = SIGNATURES.find((entry) => entry.extensions.includes(extension));
    if (!signature) {
      if (HEADERLESS_EXTENSIONS.has(extension)) return;
      throw new Error(`"${extension}" has no content-validation rule.`);
    }
    if (!signature.check(bytes)) {
      throw new Error(`This file's contents do not look like ${signature.describe}, so it was refused.`);
    }
  }

  /**
   * Lists the files under a media root, optionally within a subdirectory of it (music on
   * hold is organised into named classes, one subdirectory each). An absent directory is
   * an empty list, not an error — a music-on-hold class that has never had a file uploaded
   * to it is a normal state, not a fault.
   */
  async list(root: MediaRoot, subdirectory?: string): Promise<ReadonlyArray<MediaFile>> {
    const base = this.#root(root);
    const directory = subdirectory && subdirectory.length > 0
      ? `${base}/${this.#requireBareSegment(subdirectory)}`
      : base;

    /* `ls` on a missing directory exits non-zero; that is an empty listing here, not a
     * failure the caller has to handle specially. */
    const probe = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", "test", "-d", directory],
      timeoutMs: 15_000,
      maxOutputBytes: 4096,
    });
    if (probe.status !== "succeeded") return [];

    /* One line per entry: size, then a tab, then the bare filename. `find -maxdepth 1`
     * rather than `ls` keeps the output free of the ambiguous formatting `ls` can produce
     * for unusual filenames, and it lists only regular files, never subdirectories. */
    const output = await this.#run([
      "find",
      directory,
      "-maxdepth", "1",
      "-type", "f",
      "-printf", "%s\t%f\n",
    ]);

    const files: MediaFile[] = [];
    for (const line of output.split("\n")) {
      if (line.trim().length === 0) continue;
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const bytes = Number.parseInt(line.slice(0, tab), 10);
      const name = line.slice(tab + 1);
      const extension = usableName(name);
      if (extension === undefined || !Number.isFinite(bytes)) continue;
      files.push({ name, path: `${directory}/${name}`, extension, bytes });
    }
    return files;
  }

  /** A subdirectory segment is validated the same as a filename, minus the extension rule. */
  #requireBareSegment(segment: string): string {
    if (typeof segment !== "string" || segment.length === 0 || segment.length > 128) {
      throw new Error(`"${segment}" is not a usable directory name.`);
    }
    if (
      segment.includes("\0") || segment.includes("/") || segment.includes("\\") ||
      segment.includes("..") || segment.includes(":") || segment.startsWith(".") ||
      !/^[A-Za-z0-9._-]+$/u.test(segment)
    ) {
      throw new Error(`"${segment}" is not a usable directory name.`);
    }
    return segment;
  }

  /**
   * Writes a file to a media root and verifies it landed at the expected size. Content
   * travels on standard input, never as an argument.
   */
  async upload(root: MediaRoot, name: string, contentBase64: string): Promise<MediaFile> {
    const extension = usableName(name);
    if (extension === undefined) {
      throw new Error(`"${name}" is not a usable media filename, so nothing was uploaded.`);
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(contentBase64, "base64");
    } catch {
      throw new Error("The file content was not valid base64, so nothing was uploaded.");
    }
    if (bytes.length === 0) {
      throw new Error(`"${name}" is empty, so it was refused.`);
    }
    if (bytes.length > MAX_BYTES) {
      throw new Error(`"${name}" is ${bytes.length} bytes, over the ${MAX_BYTES}-byte limit, so it was refused.`);
    }
    this.#validateContent(extension, bytes);

    const base = this.#root(root);
    await this.#run(["mkdir", "-p", base]);
    const path = `${base}/${name}`;
    /* Base64 travels on standard input rather than as an argument, and `base64 -d -o`
     * decodes straight to the target file with no shell and no redirection operator —
     * there is no metacharacter in this argument list for a shell to ever interpret. */
    await this.#run(["base64", "-d", "-o", path], contentBase64);

    const landed = await this.#stat(path);
    if (landed === undefined) {
      throw new Error(`"${name}" did not land on the target, so the upload was reported as failed.`);
    }
    if (landed !== bytes.length) {
      throw new Error(
        `"${name}" landed as ${landed} bytes but ${bytes.length} were sent, so the upload was reported as failed.`,
      );
    }
    return { name, path, extension, bytes: landed };
  }

  async #stat(path: string): Promise<number | undefined> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", "stat", "-c", "%s", path],
      timeoutMs: 15_000,
      maxOutputBytes: 4096,
    });
    if (result.status !== "succeeded") return undefined;
    const size = Number.parseInt(result.stdout.trim(), 10);
    return Number.isFinite(size) ? size : undefined;
  }

  /**
   * Reads a file's bytes back out of a media root, base64-encoded, so a caller (an
   * "audition" control that plays a prompt back before trusting it) can do something
   * with them without ever touching the target's filesystem itself. Same validation as
   * every other method here: the name is checked before any command runs, and the read
   * is refused outright once it would exceed the same bound `upload` enforces on the
   * way in — a file this class would never have accepted is not read back either.
   */
  async read(root: MediaRoot, name: string): Promise<MediaFile & { contentBase64: string }> {
    const extension = usableName(name);
    if (extension === undefined) {
      throw new Error(`"${name}" is not a usable media filename, so nothing was read.`);
    }
    const path = `${this.#root(root)}/${name}`;
    const bytes = await this.#stat(path);
    if (bytes === undefined) {
      throw new Error(`"${name}" was not found in this media root.`);
    }
    if (bytes > MAX_BYTES) {
      throw new Error(`"${name}" is ${bytes} bytes, over the ${MAX_BYTES}-byte limit, so it was refused.`);
    }
    /* `-w 0` writes the whole encoding on one line with no wrapping, so the caller gets
     * exactly the base64 alphabet back and nothing to strip before decoding it. */
    const encoded = await this.#run(["base64", "-w", "0", path]);
    return { name, path, extension, bytes, contentBase64: encoded.trim() };
  }

  /**
   * Removes a file from a media root. Irreversible — the caller is responsible for gating
   * this behind confirmation before calling it. Refuses any name that fails the same
   * validator `upload` uses, before running anything, so this can never be pointed outside
   * the two media roots.
   */
  async remove(root: MediaRoot, name: string): Promise<{ removed: boolean; detail: string }> {
    if (usableName(name) === undefined) {
      throw new Error(`"${name}" is not a usable media filename, so nothing was removed.`);
    }
    const path = `${this.#root(root)}/${name}`;
    await this.#run(["rm", "-f", "--", path]);
    return { removed: true, detail: `Removed ${path} at ${this.#now().toISOString()}.` };
  }
}
