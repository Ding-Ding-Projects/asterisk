export const MAX_REGEX_PATTERN_LENGTH = 512;
export const MAX_REGEX_INPUT_LENGTH = 8_192;
export const MAX_REGEX_EVALUATION_MS = 25;

export interface BoundedRegexOptions {
  regex: boolean;
  flags?: string;
}

export function compileBoundedRegex(query: string, options: BoundedRegexOptions): { ok: true; matcher: RegExp } | { ok: false; reason: string } {
  const value = query.trim();
  if (value.length > MAX_REGEX_PATTERN_LENGTH) return { ok: false, reason: `Search pattern exceeds ${MAX_REGEX_PATTERN_LENGTH} characters.` };
  if (!options.regex) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return { ok: true, matcher: new RegExp(escaped, options.flags ?? 'iu') };
  }
  if (/\([^)]*[+*][^)]*\)\s*[+*{]/u.test(value) || /\[[^\]]+\]\s*[+*{][^)]*[+*{]/u.test(value)) {
    return { ok: false, reason: 'Search pattern contains nested repetition and was refused to protect the renderer.' };
  }
  const flags = [...new Set((options.flags ?? 'iu').split(''))].filter((flag) => 'imu'.includes(flag)).join('');
  try {
    return { ok: true, matcher: new RegExp(value, flags) };
  } catch {
    return { ok: false, reason: 'Search pattern is not valid for the built-in regular-expression engine.' };
  }
}

export function boundedRegexTest(matcher: RegExp, text: string): boolean {
  const started = typeof performance === 'undefined' ? Date.now() : performance.now();
  matcher.lastIndex = 0;
  const result = matcher.test(text.slice(0, MAX_REGEX_INPUT_LENGTH));
  const elapsed = (typeof performance === 'undefined' ? Date.now() : performance.now()) - started;
  if (elapsed > MAX_REGEX_EVALUATION_MS) throw new Error('Search pattern exceeded the bounded evaluation deadline.');
  return result;
}
