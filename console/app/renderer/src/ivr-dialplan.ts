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
  if (problems.length > 0) return { problems };

  const lines: DialplanLine[] = [];
  const add = (value: string) => lines.push({ key: 'exten', value });

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
    ? 's,n,Background(' + ivr.name + '-menu)'
    : 's,n,Playback(' + ivr.name + '-menu)');
  add('s,n,WaitExten(' + String(ivr.digitTimeout) + ')');

  /* A caller who runs out of retries falls through to whatever the invalid action says. */
  add('i,1,GotoIf($[${TRIES} >= ' + String(ivr.retries) + ']?fallback,1)');
  add('i,n,Goto(s,menu)');
  add('t,1,Goto(i,1)');

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
