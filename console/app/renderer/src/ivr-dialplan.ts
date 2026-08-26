/**
 * Turning an IVR described on screen into the dialplan Asterisk actually runs.
 *
 * The IVR screen's controls -- digit timeout, retries, what happens on an invalid entry,
 * whether a caller may dial an extension directly, the prompt language, whether they may
 * interrupt the prompt -- were counted as unbound settings for a long time, and they were
 * never going to bind. `extensions.conf` has no key called "retries". It has contexts full
 * of `exten =>` lines, and an IVR is a shape made out of them.
 *
 * So this generates the lines rather than pretending they are settings. That is the same
 * thing FreePBX does, and it is a different feature from writing a value into a key:
 *
 *  - **The output is shown before it is applied.** A person can read the dialplan this
 *    produces, because a form that silently writes call routing is a form nobody should
 *    trust. `renderDialplan` gives the exact text.
 *  - **Only the generated context is ever replaced.** Everything else in the file is left
 *    exactly as it was, including other contexts, comments and ordering. An IVR is one
 *    context; nothing here may touch a neighbour.
 *  - **Nothing is invented.** Every application used here is a standard Asterisk one, and
 *    where a choice cannot be expressed the generator says so rather than approximating.
 */

export type InvalidAction = 'Repeat' | 'Operator' | 'Voicemail' | 'Hang up';

/** What pressing a mapped digit does. The first four are the same four shapes
 *  `InvalidAction` already offers a caller who runs out of retries -- a key map is
 *  the same kind of routing decision, made per digit instead of on exhaustion. */
export type KeyDestination = 'Extension' | 'Queue' | 'Voicemail' | 'Operator' | 'Hang up' | 'Repeat menu';

/** One digit's route out of the menu. `target` names where 'Extension', 'Queue' and
 *  'Voicemail' send the call -- an extension number, a queue name, or a mailbox --
 *  and is ignored for the other three, which need nowhere to be told. */
export interface IvrKeyRoute {
  digit: string;
  destination: KeyDestination;
  target?: string;
}

/** The single characters `WaitExten()` can match a caller's keypress against. */
export const IVR_DIGITS: ReadonlyArray<string> = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'];

export interface IvrDefinition {
  /** The context name. Also what the screen calls this IVR. */
  name: string;
  /** Seconds to wait for a digit. */
  digitTimeout: number;
  /** How many times an invalid entry is retried before the fallback runs. */
  retries: number;
  onInvalid: InvalidAction;
  /** Whether a caller may dial an extension number straight through the menu. */
  allowDirectDial: boolean;
  /** The prompt language, as Asterisk's own two-letter code. */
  language: string;
  /** Whether a keypress interrupts the prompt. */
  allowBargeIn: boolean;
  /**
   * The real prompt file this menu plays, from the same prompt library the Sounds
   * screen manages -- a bare filename such as `welcome-greeting.wav`. `Background`/
   * `Playback` take a base name with no extension, since Asterisk resolves the real
   * file for whichever language and format actually apply, so this is stripped
   * before it reaches the dialplan. Left empty or omitted, the menu falls back to
   * `<name>-menu`, the placeholder this generator used before any screen could name
   * a real prompt at all.
   */
  promptFile?: string;
  /** What each pressed digit does. A menu with none still generates -- direct dial and
   *  the invalid-entry fallback do not depend on having any key mapped -- but a menu
   *  whose table says it has keys and whose dialplan routes none of them is exactly
   *  the gap this exists to close. */
  keys?: ReadonlyArray<IvrKeyRoute>;
}

export interface DialplanLine {
  /** Always `exten`, because that is what the file says. Kept explicit for the writer. */
  key: 'exten';
  value: string;
}

/** A context name Asterisk will accept, and that cannot smuggle anything into the file. */
export function isUsableContextName(name: string): boolean {
  return /^[A-Za-z0-9_-]{1,79}$/u.test(name);
}

/** An extension, queue name or mailbox a key route can send a caller to -- short
 *  enough to be a real token, and made only of characters that cannot end a line
 *  early or start a second one, the same reasoning `isUsableContextName` already
 *  applies to the context itself. */
export function isUsableRouteTarget(target: string): boolean {
  return /^[A-Za-z0-9_-]{1,40}$/u.test(target);
}

/** A bare prompt filename -- letters, digits, dot, underscore, dash -- matching
 *  `usableName` in `control-plane/media-library.ts`, the same validation the prompt
 *  actually has to pass to exist on the target at all. */
export function isUsablePromptFile(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,128}$/u.test(name);
}

/** `Background`/`Playback` take a base name with no extension; Asterisk resolves the
 *  real file for whichever language and format apply. Strips exactly one trailing
 *  `.<ext>`, so a name with none is returned unchanged rather than truncated. */
function promptBaseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

const BOUNDS = {
  digitTimeout: { min: 1, max: 30 },
  retries: { min: 1, max: 9 },
} as const;

export interface GenerationProblem { message: string }

/**
 * The dialplan for one IVR, or the reasons it cannot be generated.
 *
 * Refuses rather than approximating. A context name with a bracket in it would end the
 * section early and put the rest of the IVR somewhere nobody intended, and a timeout outside
 * Asterisk's own range is a number somebody typed into a file by hand.
 */
export function generateIvr(ivr: IvrDefinition): ReadonlyArray<DialplanLine> | { problems: GenerationProblem[] } {
  const problems: GenerationProblem[] = [];
  if (!isUsableContextName(ivr.name)) {
    problems.push({ message: 'An IVR name may use letters, digits, dashes and underscores only, and cannot be empty.' });
  }
  if (!Number.isInteger(ivr.digitTimeout) || ivr.digitTimeout < BOUNDS.digitTimeout.min || ivr.digitTimeout > BOUNDS.digitTimeout.max) {
    problems.push({ message: `The digit timeout has to be between ${BOUNDS.digitTimeout.min} and ${BOUNDS.digitTimeout.max} seconds.` });
  }
  if (!Number.isInteger(ivr.retries) || ivr.retries < BOUNDS.retries.min || ivr.retries > BOUNDS.retries.max) {
    problems.push({ message: `Retries have to be between ${BOUNDS.retries.min} and ${BOUNDS.retries.max}.` });
  }
  if (!/^[a-z]{2}$/u.test(ivr.language)) {
    problems.push({ message: 'The prompt language has to be a two-letter code.' });
  }
  if (ivr.promptFile !== undefined && ivr.promptFile !== '' && !isUsablePromptFile(ivr.promptFile)) {
    problems.push({ message: 'The prompt file may use letters, digits, dots, dashes and underscores only.' });
  }
  const keys = ivr.keys ?? [];
  const seenDigits = new Set<string>();
  for (const route of keys) {
    if (!IVR_DIGITS.includes(route.digit)) {
      problems.push({ message: `"${route.digit}" is not a digit a caller can press -- 0-9, * or #.` });
      continue;
    }
    if (seenDigits.has(route.digit)) {
      problems.push({ message: `Key ${route.digit} is mapped more than once. A caller who presses it can only go one place.` });
      continue;
    }
    seenDigits.add(route.digit);
    const needsTarget = route.destination === 'Extension' || route.destination === 'Queue' || route.destination === 'Voicemail';
    if (needsTarget && (!route.target || !isUsableRouteTarget(route.target))) {
      problems.push({ message: `Key ${route.digit} (${route.destination}) needs a target -- letters, digits, dashes and underscores only.` });
    }
  }
  if (problems.length > 0) return { problems };

  const lines: DialplanLine[] = [];
  const add = (value: string) => lines.push({ key: 'exten', value });
  const promptName = ivr.promptFile ? promptBaseName(ivr.promptFile) : ivr.name + '-menu';

  /* The entry point. Answer, set the language so every prompt after it is spoken in the
   * right one, then play the menu. */
  add('s,1,NoOp(IVR ' + ivr.name + ')');
  add('s,n,Answer()');
  add('s,n,Set(CHANNEL(language)=' + ivr.language + ')');
  add('s,n,Set(TIMEOUT(digit)=' + String(ivr.digitTimeout) + ')');
  /* The retry counter lives on the channel, so a caller who keeps pressing the wrong thing
   * is counted per call rather than globally. */
  add('s,n,Set(TRIES=0)');
  add('s,n(menu),Set(TRIES=$[${TRIES} + 1])');
  /* Background plays the prompt and listens at the same time, which IS barge-in. Playback
   * does not listen, so an IVR that forbids interruption uses that instead -- the difference
   * is the whole setting, and approximating it with a shorter prompt would be a lie. */
  add(ivr.allowBargeIn
    ? 's,n,Background(' + promptName + ')'
    : 's,n,Playback(' + promptName + ')');
  add('s,n,WaitExten(' + String(ivr.digitTimeout) + ')');

  /* A caller who runs out of retries falls through to whatever the invalid action says. */
  add('i,1,GotoIf($[${TRIES} >= ' + String(ivr.retries) + ']?fallback,1)');
  add('i,n,Goto(s,menu)');
  add('t,1,Goto(i,1)');

  /*
   * Each mapped key is its own extension in this same context: `WaitExten()` above is
   * what makes a plain digit like "1" match the caller's keypress against an `exten =>
   * 1,...` here, the ordinary way a pattern-free extension is reached. One key, one
   * destination, stated the same way the fallback below states one for running out of
   * retries -- this is the depth the table's own "Keys" column always implied and the
   * generator never had until now: previously the only route out of the menu besides
   * the fallback was direct-dialling an arbitrary extension, and every digit the table
   * claimed was mapped did nothing at all if pressed.
   */
  for (const route of keys) {
    switch (route.destination) {
      case 'Extension':
        add(route.digit + ',1,Goto(from-internal,' + route.target + ',1)');
        break;
      case 'Queue':
        add(route.digit + ',1,Queue(' + route.target + ')');
        break;
      case 'Voicemail':
        add(route.digit + ',1,VoiceMail(' + route.target + ',u)');
        add(route.digit + ',n,Hangup()');
        break;
      case 'Operator':
        add(route.digit + ',1,Goto(operator,s,1)');
        break;
      case 'Hang up':
        add(route.digit + ',1,Hangup()');
        break;
      case 'Repeat menu':
        add(route.digit + ',1,Set(TRIES=0)');
        add(route.digit + ',n,Goto(s,menu)');
        break;
      default:
        break;
    }
  }

  switch (ivr.onInvalid) {
    case 'Repeat':
      /* Repeat means the fallback is the menu again. Stated explicitly rather than left to
       * fall off the end of the context, which would hang up without saying so. */
      add('fallback,1,Set(TRIES=0)');
      add('fallback,n,Goto(s,menu)');
      break;
    case 'Operator':
      add('fallback,1,Goto(operator,s,1)');
      break;
    case 'Voicemail':
      add('fallback,1,VoiceMail(${' + ivr.name.toUpperCase().replace(/-/gu, '_') + '_MAILBOX},u)');
      add('fallback,n,Hangup()');
      break;
    default:
      add('fallback,1,Hangup()');
      break;
  }

  if (ivr.allowDirectDial) {
    /* Any extension the caller dials is sent to the internal context. Deliberately a Goto
     * rather than a Dial: routing belongs to the dialplan that owns extensions, and
     * duplicating it here would mean two places to keep in step. */
    add('_X.,1,Goto(from-internal,${EXTEN},1)');
  }

  return lines;
}

/** The exact text this would put in the file, for somebody to read before it is applied. */
export function renderDialplan(name: string, lines: ReadonlyArray<DialplanLine>): string {
  return `[${name}]\n` + lines.map((line) => `exten => ${line.value}`).join('\n') + '\n';
}
