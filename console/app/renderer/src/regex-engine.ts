/**
 * Bounded search evaluation shared by tabs, menus, dropdowns and the command
 * palette. Plain text is the default. Regex evaluation is accepted only after
 * the complete pattern, flags and workload have passed explicit limits.
 */

export type SearchMode = 'plain' | 'regex';

export interface RegexEvaluationLimits {
  readonly maxPatternLength: number;
  readonly maxCandidateLength: number;
  readonly maxCandidates: number;
  readonly maxMatchesPerCandidate: number;
  readonly maxTotalMatches: number;
  readonly maxEvaluationMilliseconds: number;
}

export const DEFAULT_REGEX_LIMITS: RegexEvaluationLimits = Object.freeze({
  maxPatternLength: 512,
  maxCandidateLength: 16_384,
  maxCandidates: 10_000,
  maxMatchesPerCandidate: 200,
  maxTotalMatches: 5_000,
  maxEvaluationMilliseconds: 75,
});

export interface SearchPatternInput {
  readonly mode: SearchMode;
  readonly query: string;
  readonly flags?: string;
}

export type SearchValidation =
  | { readonly ok: true; readonly normalizedFlags: string }
  | { readonly ok: false; readonly reason: string };

export interface TextMatch {
  readonly index: number;
  readonly length: number;
  readonly text: string;
  readonly groups: ReadonlyArray<string | undefined>;
}

export interface TextEvaluation {
  readonly matched: boolean;
  readonly matches: ReadonlyArray<TextMatch>;
  readonly truncated: boolean;
}

export interface CandidateEvaluation<T> {
  readonly matches: ReadonlyArray<T>;
  readonly evaluated: number;
  readonly totalMatches: number;
  readonly truncated: boolean;
  readonly timedOut: boolean;
}

export interface CompiledSearchPattern {
  readonly input: SearchPatternInput;
  readonly normalizedFlags: string;
  readonly test: (value: string) => boolean;
  readonly evaluate: (value: string) => TextEvaluation;
}

export type CompileSearchResult =
  | { readonly ok: true; readonly pattern: CompiledSearchPattern }
  | { readonly ok: false; readonly reason: string };

const SUPPORTED_FLAGS = 'dgimsuv';
const FLAG_ORDER = 'dgimsuv';

function mergeLimits(overrides: Partial<RegexEvaluationLimits> = {}): RegexEvaluationLimits {
  return {
    maxPatternLength: overrides.maxPatternLength ?? DEFAULT_REGEX_LIMITS.maxPatternLength,
    maxCandidateLength: overrides.maxCandidateLength ?? DEFAULT_REGEX_LIMITS.maxCandidateLength,
    maxCandidates: overrides.maxCandidates ?? DEFAULT_REGEX_LIMITS.maxCandidates,
    maxMatchesPerCandidate: overrides.maxMatchesPerCandidate ?? DEFAULT_REGEX_LIMITS.maxMatchesPerCandidate,
    maxTotalMatches: overrides.maxTotalMatches ?? DEFAULT_REGEX_LIMITS.maxTotalMatches,
    maxEvaluationMilliseconds: overrides.maxEvaluationMilliseconds ?? DEFAULT_REGEX_LIMITS.maxEvaluationMilliseconds,
  };
}

function validPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateRegexLimits(limits: RegexEvaluationLimits): SearchValidation {
  for (const [name, value] of Object.entries(limits)) {
    if (!validPositiveInteger(value)) {
      return { ok: false, reason: `${name} must be a positive safe integer.` };
    }
  }
  return { ok: true, normalizedFlags: '' };
}

export function normalizeRegexFlags(flags = ''): SearchValidation {
  const seen = new Set<string>();
  for (const flag of flags) {
    if (!SUPPORTED_FLAGS.includes(flag)) {
      return { ok: false, reason: `Unsupported regular expression flag: ${flag}` };
    }
    if (seen.has(flag)) {
      return { ok: false, reason: `Duplicate regular expression flag: ${flag}` };
    }
    seen.add(flag);
  }
  if (seen.has('u') && seen.has('v')) {
    return { ok: false, reason: 'Regular expression flags u and v cannot be combined.' };
  }
  return {
    ok: true,
    normalizedFlags: [...seen].sort((a, b) => FLAG_ORDER.indexOf(a) - FLAG_ORDER.indexOf(b)).join(''),
  };
}

/**
 * Reject the compact family of patterns most often responsible for explosive
 * backtracking. This is intentionally conservative: unsupported constructs
 * stay visible as a validation error instead of being run optimistically.
 */
export function potentiallyUnsafePattern(pattern: string): boolean {
  const withoutEscapes = pattern.replace(/\\./gu, 'x');
  const nestedQuantifier = /\((?:[^()[\]]|\[[^\]]*\])+[+*}]\)[+*{]/u;
  const repeatedWildcard = /(?:\.\*|\.\+).*(?:\.\*|\.\+)/u;
  const quantifiedAlternation = /\([^)]*\|[^)]*\)[+*{]/u;
  const backReference = /\\[1-9]/u;
  const lookAround = /\(\?[=!<]/u;
  return nestedQuantifier.test(withoutEscapes)
    || repeatedWildcard.test(withoutEscapes)
    || quantifiedAlternation.test(withoutEscapes)
    || backReference.test(pattern)
    || lookAround.test(withoutEscapes);
}

export function validateSearchPattern(
  input: SearchPatternInput,
  overrides: Partial<RegexEvaluationLimits> = {},
): SearchValidation {
  const limits = mergeLimits(overrides);
  const limitCheck = validateRegexLimits(limits);
  if (!limitCheck.ok) return limitCheck;
  if (input.query.length > limits.maxPatternLength) {
    return { ok: false, reason: `Search pattern is limited to ${limits.maxPatternLength} characters.` };
  }
  if (input.mode === 'plain') {
    return { ok: true, normalizedFlags: '' };
  }
  const flags = normalizeRegexFlags(input.flags);
  if (!flags.ok) return flags;
  if (potentiallyUnsafePattern(input.query)) {
    return { ok: false, reason: 'This pattern contains nested or repeated ambiguous quantifiers.' };
  }
  try {
    new RegExp(input.query, flags.normalizedFlags);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Invalid regular expression.' };
  }
  return flags;
}

function escapePlainText(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function advanceIndex(value: string, index: number, unicode: boolean): number {
  if (!unicode || index >= value.length) return index + 1;
  const first = value.charCodeAt(index);
  if (first >= 0xd800 && first <= 0xdbff && index + 1 < value.length) {
    const second = value.charCodeAt(index + 1);
    if (second >= 0xdc00 && second <= 0xdfff) return index + 2;
  }
  return index + 1;
}

function createEvaluationRegex(source: string, flags: string): RegExp {
  const withoutSticky = flags.replace('y', '');
  const withGlobal = withoutSticky.includes('g') ? withoutSticky : `${withoutSticky}g`;
  return new RegExp(source, withGlobal);
}

export function compileSearchPattern(
  input: SearchPatternInput,
  overrides: Partial<RegexEvaluationLimits> = {},
): CompileSearchResult {
  const limits = mergeLimits(overrides);
  const validation = validateSearchPattern(input, limits);
  if (!validation.ok) return validation;

  const source = input.mode === 'plain' ? escapePlainText(input.query) : input.query;
  const normalizedFlags = input.mode === 'plain' ? 'iu' : validation.normalizedFlags;
  const testFlags = normalizedFlags.replace(/[gy]/gu, '');
  const testRegex = new RegExp(source, testFlags);

  const test = (value: string): boolean => {
    if (value.length > limits.maxCandidateLength) return false;
    testRegex.lastIndex = 0;
    return testRegex.test(value);
  };

  const evaluate = (value: string): TextEvaluation => {
    if (value.length > limits.maxCandidateLength) {
      return { matched: false, matches: [], truncated: true };
    }
    const regex = createEvaluationRegex(source, normalizedFlags);
    const matches: TextMatch[] = [];
    let truncated = false;
    for (;;) {
      const match = regex.exec(value);
      if (!match) break;
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        groups: match.slice(1),
      });
      if (matches.length >= limits.maxMatchesPerCandidate) {
        truncated = regex.lastIndex < value.length;
        break;
      }
      if (match[0].length === 0) {
        regex.lastIndex = advanceIndex(value, regex.lastIndex, normalizedFlags.includes('u') || normalizedFlags.includes('v'));
      }
    }
    return { matched: matches.length > 0, matches, truncated };
  };

  return {
    ok: true,
    pattern: Object.freeze({ input, normalizedFlags, test, evaluate }),
  };
}

export function evaluateCandidates<T>(
  pattern: CompiledSearchPattern,
  candidates: ReadonlyArray<T>,
  textOf: (candidate: T) => string,
  overrides: Partial<RegexEvaluationLimits> = {},
  now: () => number = () => performance.now(),
): CandidateEvaluation<T> {
  const limits = mergeLimits(overrides);
  const matches: T[] = [];
  let evaluated = 0;
  let totalMatches = 0;
  let truncated = candidates.length > limits.maxCandidates;
  let timedOut = false;
  const startedAt = now();

  for (const candidate of candidates.slice(0, limits.maxCandidates)) {
    if (now() - startedAt >= limits.maxEvaluationMilliseconds) {
      timedOut = true;
      truncated = true;
      break;
    }
    const result = pattern.evaluate(textOf(candidate));
    evaluated += 1;
    if (now() - startedAt >= limits.maxEvaluationMilliseconds) {
      timedOut = true;
      truncated = true;
    }
    if (!result.matched) continue;
    matches.push(candidate);
    totalMatches += result.matches.length;
    truncated ||= result.truncated;
    if (totalMatches >= limits.maxTotalMatches) {
      truncated = true;
      break;
    }
    if (timedOut) break;
  }

  return { matches, evaluated, totalMatches, truncated, timedOut };
}
