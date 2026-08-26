/**
 * Says when the dialplan Asterisk is running and the `extensions.conf` on disk have
 * stopped describing each other.
 *
 * `dialplan show` reads what `pbx_config` has **loaded**, never what a file says. Those
 * two agree only until somebody edits the file without reloading, and nothing in the
 * output marks the difference — so a canvas drawn from that output can show a dialplan
 * no file on the target describes, and read as though it were the file. Measured on a
 * real exchange: `console/docs/evidence/live-readings.md`.
 *
 * Every rule below is taken from this repository's own sources rather than from the
 * shape of a sample file:
 *
 *  - `pbx/pbx_config.c` line 103: `static const char registrar[] = "pbx_config";` — the
 *    registrar name printed in `[ Context 'x' created by 'y' ]`. Contexts created by
 *    anything else (`pbx_ael`, `res_parking`, `func_periodic_hook`) do not come from
 *    this file and are never a divergence. On one real target 21 of 49 loaded contexts
 *    were somebody else's, so comparing without this filter reports 21 defects that are
 *    not defects.
 *  - `pbx/pbx_config.c` lines 1745-1746: *"All categories but "general" or "globals" are
 *    considered contexts"*, compared with `strcasecmp`. Those two sections therefore
 *    never become contexts and must not be looked for in the loaded dialplan.
 *  - `pbx/pbx_config.c` lines 1895-1901: an extension is registered with a
 *    `registrar_file` that is the **basename** of the file that declared it, which is the
 *    `[file:line]` column `dialplan show` prints. That is what tells an `#include`d file's
 *    context apart from one this file has lost.
 *  - `main/config.c` line 228: a category declared `[foo](!)` sets `ignored`, and
 *    `ast_category_browse` (line 1531, through `next_available_category`) skips it — so a
 *    template is not a context and must not be looked for either.
 *  - `main/config.c` lines 2060-2081 for the `[name](options)` header form, and lines
 *    2165-2196 for the `#include` / `#tryinclude` / `#exec` directives.
 *  - `main/config.c` lines 2576-2640 for how comments are stripped before any of that.
 */

/** `pbx/pbx_config.c` line 103. */
export const PBX_CONFIG_REGISTRAR = "pbx_config";

/** The file this module compares against, as `pbx_config` names it and as the transport
 *  allowlists it. Both spellings are needed: `dialplan show` prints the basename, and
 *  `CONFIGURABLE_RESOURCES` identifies a resource by absolute path. */
export const DIALPLAN_FILE_BASENAME = "extensions.conf";
export const DIALPLAN_FILE_RESOURCE = "/etc/asterisk/extensions.conf";

/** `pbx/pbx_config.c` lines 1745-1746, compared with `strcasecmp`. */
const RESERVED_SECTIONS = new Set(["general", "globals"]);

// ---------------------------------------------------------------- comment stripping

/**
 * Removes Asterisk's comments from one configuration line, carrying block-comment nesting
 * across lines through `state`.
 *
 * `main/config.c` lines 2576-2640, in the order that file applies them: an escaped `\;` is
 * not a comment; `;--` opens a block comment unless a fourth `-` follows it; `--;` closes
 * one; a bare `;` ends the line. Asterisk strips comments *before* it looks at the line at
 * all (`char *buffer = ast_strip(process_buf);`, line 2647), so a header written
 * `[from-internal] ; inbound` is a header and must be read as one.
 *
 * Deliberately not faithful in one place, and it is stated rather than hidden: Asterisk
 * decrements its nesting counter on `--;` whether or not a block is open, so an unbalanced
 * `--;` in open text drives the counter negative. This stops at zero, because a negative
 * depth has no meaning for the only question asked here.
 */
export function stripCommentsFromLine(line: string, state: { depth: number }): string {
  let out = "";
  /* `cursor` is Asterisk's own `new_buf`: where the current unexamined segment starts.
   * Both the escape test and the `--;` test are relative to it rather than to the whole
   * line, which is why `;--;` opens a block comment and does not immediately close it. */
  let cursor = 0;
  let index = 0;
  while (index < line.length) {
    const semi = line.indexOf(";", index);
    if (semi < 0) break;

    if (semi > cursor && line[semi - 1] === "\\") {
      /* Asterisk writes over the backslash and keeps the semicolon. */
      if (state.depth === 0) out += `${line.slice(cursor, semi - 1)};`;
      cursor = semi + 1;
      index = semi + 1;
      continue;
    }
    if (line[semi + 1] === "-" && line[semi + 2] === "-" && line[semi + 3] !== "-") {
      if (state.depth === 0) out += line.slice(cursor, semi);
      state.depth += 1;
      cursor = semi + 3;
      index = semi + 3;
      continue;
    }
    if (semi >= cursor + 2 && line[semi - 1] === "-" && line[semi - 2] === "-") {
      if (state.depth > 0) state.depth -= 1;
      cursor = semi + 1;
      index = semi + 1;
      continue;
    }
    if (state.depth === 0) {
      /* A bare semicolon outside a block: everything after it is a comment. */
      return out + line.slice(cursor, semi);
    }
    cursor = semi + 1;
    index = semi + 1;
  }
  if (state.depth === 0) out += line.slice(cursor);
  return out;
}

/** Every line of a configuration file with its comments removed, in file order. */
export function stripConfigComments(text: string): string[] {
  const state = { depth: 0 };
  return text.split(/\r?\n/u).map((line) => stripCommentsFromLine(line, state));
}

// ---------------------------------------------------------------- the file side

export interface ExtensionsConfSections {
  /** Category names `pbx_config` would turn into contexts, in file order, deduplicated. */
  contexts: string[];
  /** `[name](!)` categories. Templates, so never contexts — recorded so a reader can see
   *  the parser did not simply lose them. */
  templates: string[];
  /** `[general]` / `[globals]`, which are settings rather than contexts. */
  reserved: string[];
  /** Recognised `#include` / `#tryinclude` / `#exec` directives, each as the file wrote it. */
  directives: string[];
}

/** `main/config.c` lines 2072-2081: the name runs to the first `]`, and an option list is
 *  read only when `(` is the *very next* character — `[foo] (!)` is not a template. */
const CATEGORY_HEADER = /^\[([^\]]*)\](\(([^)]*)\))?/u;

/** `main/config.c` lines 2165-2196: `#` then a word ending at the first character `<= 32`. */
const DIRECTIVE = /^#(\S+)(?:\s+(.*))?$/u;
const DIRECTIVE_WORDS = new Set(["include", "tryinclude", "exec"]);

/**
 * Reads the section names out of an `extensions.conf`, classified exactly as `pbx_config`
 * would classify them.
 *
 * `parseConfig` in `wsl-config-transport.ts` cannot answer this. It requires a header line
 * to *end* with `]`, so it loses `[from-internal] ; inbound`; it has no notion of a
 * template; and it drops `#include` entirely, because a directive carries no `=`. Every one
 * of those would show up here as a divergence that is not one.
 */
export function parseExtensionsConfSections(text: string): ExtensionsConfSections {
  const contexts: string[] = [];
  const templates: string[] = [];
  const reserved: string[] = [];
  const directives: string[] = [];
  const seen = new Set<string>();

  for (const stripped of stripConfigComments(text)) {
    const line = stripped.trim();
    if (line.length === 0) continue;

    const directive = DIRECTIVE.exec(line);
    if (directive) {
      if (DIRECTIVE_WORDS.has(directive[1].toLowerCase())) directives.push(line);
      continue;
    }

    const header = CATEGORY_HEADER.exec(line);
    if (!header) continue;
    const name = header[1].trim();
    if (name.length === 0) continue;

    /* `main/config.c` line 2105: `strsep(&c, ",")` then `strcasecmp(cur, "!")`, with no
     * trimming — `[foo]( ! )` is not a template, so neither is it here. */
    const options = (header[3] ?? "").split(",");
    if (options.some((option) => option.toLowerCase() === "!")) {
      if (!templates.includes(name)) templates.push(name);
      continue;
    }

    if (RESERVED_SECTIONS.has(name.toLowerCase())) {
      if (!reserved.includes(name)) reserved.push(name);
      continue;
    }

    /* A repeated `[foo]`, and `[foo](+)`, both land in the one context `pbx_config` creates
     * with `ast_context_find_or_create`, so the name is counted once. */
    if (seen.has(name)) continue;
    seen.add(name);
    contexts.push(name);
  }

  return { contexts, templates, reserved, directives };
}

// ---------------------------------------------------------------- the comparison

export interface DialplanDivergence {
  /** Contexts the file declares that the running dialplan has not got under any registrar. */
  inFileNotLoaded: string[];
  /** Contexts `pbx_config` loaded that this file does not declare, and whose extensions all
   *  name this file — so no other file can account for them. */
  loadedNotInFile: string[];
  /** Contexts `pbx_config` loaded from a file this one `#include`s. Not a divergence. */
  fromIncludedFiles: Array<{ context: string; file: string }>;
  /** Contexts `pbx_config` loaded that this file does not declare and that carry no
   *  extension at all, so `dialplan show` prints no file for them and which file declared
   *  them cannot be read from this output. */
  unattributed: string[];
  /** Recognised `#include` / `#tryinclude` / `#exec` lines, which are why `unattributed`
   *  cannot be resolved without reading files this console does not read. */
  directives: string[];
  fileContextCount: number;
  loadedFromPbxConfigCount: number;
  /** Contexts some other module created — never compared, counted so the sentence can say
   *  how much of the running dialplan this file was never responsible for. */
  loadedFromOtherRegistrarsCount: number;
  /** How many context headers this parse read. */
  loadedContextsParsed: number;
  /** How many `dialplan show` said it printed, from its own trailer, or absent when the
   *  output carried no trailer. The two disagreeing means a context line was not read, and
   *  every list above is short by that much — which the screen must say rather than
   *  present a comparison it knows is incomplete. */
  loadedContextsReported?: number;
  diverged: boolean;
}

/** One context as `dialplan show` printed it. See `parseDialplanContexts`. */
export interface DialplanContextRecord {
  name: string;
  registrar: string;
  /** Distinct `[file:line]` basenames across this context's extensions, in output order. */
  files: string[];
}

export function compareDialplanToFile(
  loaded: ReadonlyArray<DialplanContextRecord>,
  file: ExtensionsConfSections,
  loadedContextsReported?: number,
): DialplanDivergence {
  const loadedNames = new Set(loaded.map((context) => context.name));
  const fromPbxConfig = loaded.filter((context) => context.registrar === PBX_CONFIG_REGISTRAR);
  const declared = new Set(file.contexts);

  /* Absent from the loaded dialplan under *any* registrar, not only under `pbx_config`. A
   * context another module created first is merged into rather than recreated, and reports
   * that module as its creator, so filtering by registrar here would report a context that
   * is plainly loaded as missing. */
  const inFileNotLoaded = file.contexts.filter((name) => !loadedNames.has(name));

  const loadedNotInFile: string[] = [];
  const fromIncludedFiles: Array<{ context: string; file: string }> = [];
  const unattributed: string[] = [];
  for (const context of fromPbxConfig) {
    if (declared.has(context.name)) continue;
    const elsewhere = context.files.find((name) => name !== DIALPLAN_FILE_BASENAME);
    if (elsewhere) {
      fromIncludedFiles.push({ context: context.name, file: elsewhere });
      continue;
    }
    if (context.files.length === 0) {
      unattributed.push(context.name);
      continue;
    }
    loadedNotInFile.push(context.name);
  }

  return {
    inFileNotLoaded,
    loadedNotInFile,
    fromIncludedFiles,
    unattributed,
    directives: file.directives,
    fileContextCount: file.contexts.length,
    loadedFromPbxConfigCount: fromPbxConfig.length,
    loadedFromOtherRegistrarsCount: loaded.length - fromPbxConfig.length,
    loadedContextsParsed: loaded.length,
    ...(loadedContextsReported === undefined ? {} : { loadedContextsReported }),
    /* An unattributed context is only evidence of divergence when the file has no directive
     * that could have declared it somewhere this console did not read. With one, it is an
     * open question rather than a finding, and the sentence says so instead of counting it. */
    diverged:
      inFileNotLoaded.length > 0 ||
      loadedNotInFile.length > 0 ||
      (file.directives.length === 0 && unattributed.length > 0),
  };
}
