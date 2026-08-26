/**
 * Contract: narration.
 *
 * The site now carries the canonical spoken narrator. The uninteresting half is that
 * it can say a sentence; the half worth testing is everything it must NOT do, because
 * a narrator is the one surface here that can carry text off the computer. A voice
 * whose `localService` is false is synthesised on somebody else's server, so the words
 * handed to it leave this machine -- and the personal vocabulary is a private
 * dictionary that must never be one of them.
 *
 * So most of this file is about four boundaries, each written so it can be checked
 * rather than promised:
 *
 *   - off until somebody switches it on, and switching it off stops the sentence in
 *     progress rather than letting it finish;
 *   - never a word the personal vocabulary rewrote, which is why the text comes from
 *     `copyLevel` (per-language, before substitution) rather than `copyText`;
 *   - the status line says which voice will really speak, that a chosen voice is not
 *     installed here and has been kept anyway, and that a network-backed one sends the
 *     words away;
 *   - a line is spoken in the language it actually has wording for.
 *
 * The behavioural half runs the real extracted source against a recording DOM and a
 * fake speech engine, in the style `dialog-emojis.test.mjs` and
 * `app-display-name.test.mjs` already established here. That matters especially for
 * this feature: "the setting is stored", "the checkbox reflects it" and "the queue has
 * an item in it" are all true of a narrator that never utters a syllable, and those
 * are exactly what a source-pattern test checks.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern
 * against a CRLF checkout matches nothing, and an assertion that matches nothing
 * passes in the one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const css = read('styles.css');
const settings = pageSource.settings;
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/** Every category a call site is allowed to narrate under. This pin moves by hand. */
const CATEGORIES = ['setting', 'export', 'search', 'notification', 'error'];
/** Every control the card ships. */
const CONTROL_IDS = [
  'narration-enabled',
  'narration-language',
  'narration-voice-en',
  'narration-voice-zh',
  'narration-rate',
  'narration-pitch',
];

/* ------------------------------------------------------------------ *
 * Reading the real source: one declaration, brace-counted.
 * ------------------------------------------------------------------ */

function functionSource(src, name) {
  let start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
  /* Keep an `async` prefix. Dropping it produces a function whose body still awaits,
   * which fails to parse -- and reads as a defect in the source rather than in the
   * reader that mangled it. */
  if (src.slice(start - 6, start) === 'async ') start -= 6;
  const braceStart = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`function ${name} is not brace-balanced in site/app.js`);
}

/** The contiguous run of declarations from `from` to the end of the `to` line. */
function blockSource(src, from, to) {
  const start = src.indexOf(from);
  assert.notEqual(start, -1, `${from} is no longer declared in site/app.js`);
  const end = src.indexOf(to, start);
  assert.notEqual(end, -1, `${to} no longer follows ${from} in site/app.js`);
  return src.slice(start, src.indexOf('\n', end));
}

/**
 * Split one call's arguments at top level.
 *
 * Written by hand rather than pattern-matched because every interesting call site here
 * nests template literals inside template literals, and a comma-splitting regex would
 * report an argument count that is simply wrong -- in the direction that reads as
 * "every call passes what it should".
 */
function callArguments(src, openParenIndex) {
  let depth = 0;
  /* The bracket depths at which a `${` interpolation opened, so the matching `}`
   * returns to reading a template literal rather than looking like one bracket too
   * many. Getting this wrong does not throw, it miscounts -- which is why the
   * self-check below runs the splitter over a sample with a template inside a
   * template. */
  const templates = [];
  let quote = '';
  const args = [];
  let current = '';
  for (let i = openParenIndex; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { current += ch + (src[i + 1] ?? ''); i += 1; continue; }
      if (quote === '`' && ch === '$' && src[i + 1] === '{') {
        current += '${';
        i += 1;
        depth += 1;
        templates.push(depth);
        quote = '';
        continue;
      }
      current += ch;
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      if (!(depth === 1 && i === openParenIndex)) current += ch;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (ch === '}' && templates.length && templates[templates.length - 1] === depth) {
        templates.pop();
        depth -= 1;
        quote = '`';
        current += ch;
        continue;
      }
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return { args: args.map((argument) => argument.trim()), end: i };
      }
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 1) { args.push(current); current = ''; continue; }
    current += ch;
  }
  throw new Error('unbalanced call arguments in site/app.js');
}

/** Every call to `name(` in the source, excluding its own declaration. */
function callSites(src, name) {
  const out = [];
  const needle = `${name}(`;
  let at = src.indexOf(needle);
  while (at !== -1) {
    const before = src.slice(Math.max(0, at - 9), at);
    const isDeclaration = before.endsWith('function ');
    const isIdentifierTail = /[A-Za-z0-9_$.]$/u.test(before);
    if (!isDeclaration && !isIdentifierTail) out.push(callArguments(src, at + name.length).args);
    at = src.indexOf(needle, at + 1);
  }
  return out;
}

test('the argument splitter can actually see a nested template literal, or every count below is wrong', () => {
  /* A self-check, because a splitter that miscounts reports "every call passes what it
   * should" whatever the source really says. */
  const sample = 'x();notify(`a ${b(`${c},${d}`)} e`,g(h,i),{category:\'setting\'});';
  const calls = callSites(sample, 'notify');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['`a ${b(`${c},${d}`)} e`', 'g(h,i)', "{category:'setting'}"]);
  assert.deepEqual(callSites('function notify(a,b){}', 'notify'), [], 'a declaration is counted as a call site');
  assert.deepEqual(callSites('renotify(a);', 'notify'), [], 'an identifier ending in the name is counted as a call site');
});

/* ------------------------------------------------------------------ *
 * A recording DOM, a fake speech engine, and the real source over both.
 * ------------------------------------------------------------------ */

class El {
  constructor(tag) {
    this.tag = tag;
    this.className = '';
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.value = '';
    this.checked = false;
  }

  setAttribute(key, value) { this.attributes[key] = String(value); }

  replaceChildren(...children) { this.children = children; }

  append(child) { this.children.push(child); }
}

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.onend = null;
    this.onerror = null;
  }
}

/**
 * A speech engine that records rather than speaks, and that only finishes an utterance
 * when the test says so -- because "one at a time" is a claim about what happens while
 * one is still going, and an engine that completes instantly can never fail it.
 */
class FakeEngine {
  constructor(voices) {
    this.voiceList = voices;
    this.spoken = [];
    this.cancelled = 0;
    this.listeners = new Map();
    this.pending = [];
  }

  getVoices() { return this.voiceList; }

  speak(utterance) { this.spoken.push(utterance); this.pending.push(utterance); }

  cancel() { this.cancelled += 1; }

  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }

  removeEventListener(name, listener) {
    this.listeners.set(name, (this.listeners.get(name) || []).filter((entry) => entry !== listener));
  }

  /** Finish every utterance handed over, letting the queue hand over the next one. */
  async finishAll() {
    for (let guard = 0; guard < 50 && this.pending.length; guard += 1) {
      const utterance = this.pending.shift();
      if (utterance.onend) utterance.onend();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }
  }

  setVoices(voices) {
    this.voiceList = voices;
    for (const listener of this.listeners.get('voiceschanged') || []) listener();
  }
}

const voice = (voiceURI, name, lang, localService = true) => ({ voiceURI, name, lang, localService });

const DEFAULT_VOICES = [
  voice('daniel', 'Daniel', 'en-GB'),
  voice('samantha', 'Samantha', 'en-US'),
  voice('sinji', 'Sin-ji', 'zh-HK'),
  voice('tingting', 'Ting-Ting', 'zh-CN'),
];

const FUNCTIONS = [
  'narrationTrack', 'narrationOtherTrack', 'narrationCooldown', 'narrationLangMatches',
  'narrationVoiceMatches', 'narrationVoiceRank', 'narrationVoicesFor', 'narrationRemoteSentence',
  'resolveNarrationVoice', 'narrationSelectionIncludes', 'narrationTracksFor', 'narrationGate',
  'clampNarrationValue', 'narrationTextFor', 'narrationEngine', 'narrationVoices', 'narrationQuiet',
  'narrationChosenVoice', 'narrationSilence', 'narrate', 'pumpNarration', 'speakNarrationLine',
  'narrationTrackStatus', 'applyNarration', 'makeNarrationOption', 'setNarration', 'commitNarration',
  'initNarration',
];

const CONSTANTS_FROM = 'const NARRATION_TRACKS=[';
const CONSTANTS_TO = 'const NARRATION_UTTERANCE_TIMEOUT_MS=';

const CARD_IDS = [...CONTROL_IDS, 'narration-status-en', 'narration-status-zh',
  'narration-rate-output', 'narration-pitch-output'];

/**
 * Build a page and run the real narrator against it.
 *
 * Nothing here is a re-implementation: the constants, every function above and the
 * mutable queue between them are the bytes in site/app.js, evaluated once.
 */
function loadNarration({
  narration = {},
  voices = DEFAULT_VOICES,
  engine = 'fake',
  quiet = false,
  withCard = true,
  copy = {},
  restrictedPresentation = false,
} = {}) {
  const elements = withCard
    ? Object.fromEntries(CARD_IDS.map((id) => [id, new El(id.includes('status') ? 'p' : 'input')]))
    : {};
  const idsAsked = [];
  const $ = (id) => { idsAsked.push(id); return elements[id] ?? null; };
  /* `el()` is app.js's own resolver for a control that may currently be held out of
   * the document by the restricted presentation. Nothing here suppresses anything, so
   * every id is live and it answers exactly as `$` does -- but the narrator binds
   * through it, so the harness has to supply it or every binding test throws. */
  const el = $;
  const document = { createElement: (tag) => new El(tag) };
  const speechEngine = engine === 'fake' ? new FakeEngine(voices) : engine;

  const state = {
    narration: { enabled: false, language: 'en', voiceEn: '', voiceZh: '', rate: 1, pitch: 1, ...narration },
  };
  const saved = [];
  const history = [];
  const notified = [];
  const windowListeners = new Map();
  /* Mutable, because Low stimulation can be switched on while a line is already being
   * spoken, and "it stops" is a claim about exactly that moment. A constant here would
   * make the drain loop's own guard untestable -- which it was, until a planted break
   * survived and said so. */
  const quietState = { on: quiet };
  /* Mutable for the same reason: the restricted presentation is one switch shared
   * across every tab, so it can come on while a bilingual line is half-spoken. */
  const restricted = { on: restrictedPresentation };

  const body = `${blockSource(app, CONSTANTS_FROM, CONSTANTS_TO)}\n`
    + `${FUNCTIONS.map((name) => functionSource(app, name)).join('\n')}\n`
    + 'const narrationQueue=[];const narrationLastSpokenAt=new Map();'
    + 'let narrationSpeaking=false;let narrationVoicesListener=null;\n'
    + `return { ${FUNCTIONS.join(', ')}, NARRATION_TRACKS, NARRATION_CATEGORIES, NARRATION_RATE,`
    + ' NARRATION_PITCH, NARRATION_AUTOMATIC_VOICE, NARRATION_UTTERANCE_TIMEOUT_MS, narrationQueue };';

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    'document', '$', 'el', 'state', 'speechSynthesis', 'SpeechSynthesisUtterance', 'reduceMotion',
    'copyLevel', 'save', 'recordHistory', 'notify', 'addEventListener', 'setTimeout', 'clearTimeout',
    'schoolActive', body,
  )(
    document, $, el, state, speechEngine, FakeUtterance, () => quietState.on,
    (key, lang) => (copy[key] ? copy[key][lang] : ''),
    () => saved.push(JSON.stringify(state.narration)),
    (kind, message) => history.push({ kind, message }),
    (title, message, narrationSource) => notified.push({ title, message, narrationSource }),
    (name, listener) => { windowListeners.set(name, listener); },
    () => 0,
    () => {},
    () => restricted.on,
  );

  return { ...api, state, elements, engine: speechEngine, idsAsked, saved, history, notified, windowListeners, quietState, restricted };
}

/* ------------------------------------------------------------------ *
 * Off is off.
 * ------------------------------------------------------------------ */

test('narration is off in the shipped defaults, so nobody who never asks for it hears anything', () => {
  const line = app.split('\n').find((l) => l.includes('const DEFAULTS = {'));
  assert.ok(line, 'the DEFAULTS object literal line was not found');
  assert.match(line, /narration:\{enabled:false,language:'en',voiceEn:'',voiceZh:'',rate:1,pitch:1\}/u,
    'DEFAULTS no longer ships narration off, with no voice chosen, at normal rate and pitch');
});

test('with the switch off nothing is spoken, and the reason is reported rather than shrugged off', async () => {
  const h = loadNarration();
  assert.deepEqual(h.narrate('notification', { en: 'Something happened.' }), { spoken: false, why: 'off' });
  await h.engine.finishAll();
  assert.equal(h.engine.spoken.length, 0, 'the engine was handed an utterance while narration was off');
});

test('with the switch on the engine really receives the words, at the chosen language and voice', async () => {
  const h = loadNarration({ narration: { enabled: true, voiceEn: 'samantha' } });
  h.narrate('notification', { en: 'Settings saved.' });
  await h.engine.finishAll();
  assert.equal(h.engine.spoken.length, 1, 'nothing reached the engine with narration switched on');
  const [utterance] = h.engine.spoken;
  assert.equal(utterance.text, 'Settings saved.');
  assert.equal(utterance.lang, 'en-US');
  assert.equal(utterance.voice.voiceURI, 'samantha', 'the chosen voice was not the one handed to the engine');
});

test('turning it off stops the sentence in progress rather than letting it finish', () => {
  const h = loadNarration({ narration: { enabled: true } });
  h.narrate('notification', { en: 'A long line nobody wants to sit through.' });
  assert.equal(h.engine.spoken.length, 1);
  h.setNarration('enabled', false);
  assert.equal(h.engine.cancelled, 1, 'switching narration off did not cancel what was being said');
  assert.equal(h.narrationQueue.length, 0, 'switching narration off left lines waiting in the queue');
});

/* ------------------------------------------------------------------ *
 * One at a time, and not too often.
 * ------------------------------------------------------------------ */

test('two utterances never overlap: the second waits for the first to end', async () => {
  const h = loadNarration({ narration: { enabled: true } });
  h.narrate('setting', { en: 'One.' });
  h.narrate('export', { en: 'Two.' });
  assert.equal(h.engine.spoken.length, 1, 'both lines were handed to the engine at once');
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((u) => u.text), ['One.', 'Two.']);
});

test('"Both" speaks English first and then Cantonese, serialized, each in its own voice', async () => {
  const h = loadNarration({ narration: { enabled: true, language: 'both', voiceEn: 'samantha', voiceZh: 'sinji' } });
  h.narrate('setting', { en: 'Saved.', zh: '儲咗喇。' });
  assert.equal(h.engine.spoken.length, 1, 'both languages were started together');
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((u) => u.text), ['Saved.', '儲咗喇。']);
  assert.deepEqual(h.engine.spoken.map((u) => u.lang), ['en-US', 'zh-HK']);
  assert.deepEqual(h.engine.spoken.map((u) => u.voice.voiceURI), ['samantha', 'sinji']);
});

test('a line still queued is replaced by a newer one of the same category, never stacked behind it', async () => {
  /* Two status lines about the same thing are one answer and a stale one, and reading
   * the stale one first is the version nobody wants. */
  const h = loadNarration({ narration: { enabled: true } });
  h.narrate('setting', { en: 'First.' });
  h.narrate('export', { en: 'Older export line.' });
  h.narrate('export', { en: 'Newer export line.' });
  assert.equal(h.narrationQueue.length, 1, 'the superseded line is still queued behind the newer one');
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((u) => u.text), ['First.', 'Newer export line.']);
});

test('an ordinary category is rate-limited, and its own declared cooldown is what limits it', () => {
  const h = loadNarration();
  const cooldown = h.narrationCooldown('setting');
  assert.ok(cooldown > 0, 'the ordinary cooldown is zero, so the rate limit below would prove nothing');
  const base = { category: 'setting', isError: false, enabled: true, quiet: false };
  assert.deepEqual(h.narrationGate({ ...base, lastSpokenAtMs: null, now: 10_000 }), { speak: true, why: 'speak' });
  assert.deepEqual(h.narrationGate({ ...base, lastSpokenAtMs: 10_000, now: 10_000 + cooldown - 1 }),
    { speak: false, why: 'cooldown' });
  assert.deepEqual(h.narrationGate({ ...base, lastSpokenAtMs: 10_000, now: 10_000 + cooldown }),
    { speak: true, why: 'speak' });
});

test('an error is never dropped for arriving too soon after something else', () => {
  const h = loadNarration();
  assert.equal(h.narrationCooldown('error'), 0, 'the error category now carries a cooldown of its own');
  assert.deepEqual(
    h.narrationGate({ category: 'error', isError: true, enabled: true, quiet: false, lastSpokenAtMs: 10_000, now: 10_001 }),
    { speak: true, why: 'speak' },
  );
});

test('Low stimulation silences the narrator, errors included, because quieter that keeps talking is not quieter', async () => {
  const h = loadNarration({ narration: { enabled: true }, quiet: true });
  assert.deepEqual(h.narrate('error', { en: 'Something failed.' }, { isError: true }), { spoken: false, why: 'quiet' });
  await h.engine.finishAll();
  assert.equal(h.engine.spoken.length, 0);
});

test('Low stimulation switched on mid-queue stops the rest of it, rather than only the next line', async () => {
  /* This one exists because a planted break survived without it. Turning the narrator
   * off goes through setNarration, which cancels and empties the queue, so the drain
   * loop's own guard is never what stops it -- but Low stimulation calls nothing at
   * all, and a queue that keeps draining under it reads out everything already
   * waiting. */
  const h = loadNarration({ narration: { enabled: true } });
  h.narrate('setting', { en: 'First.' });
  h.narrate('export', { en: 'Second.' });
  assert.equal(h.narrationQueue.length, 1, 'nothing was waiting, so this would prove nothing');
  h.quietState.on = true;
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((u) => u.text), ['First.'],
    'the queue carried on reading after Low stimulation was switched on');
  assert.equal(h.narrationQueue.length, 0, 'the silenced queue kept its waiting lines');
});

test('Low stimulation switched on between the two halves of a bilingual line stops the second half', async () => {
  /* The one place the per-line guard is the only thing that can stop the narrator: both
   * halves belong to a single queued item, so the loop that drains the queue never gets
   * a look in between them. Written after a planted break that removed the per-line
   * guard survived, because the queue-level guard happened to catch every case the
   * tests then had. */
  const h = loadNarration({ narration: { enabled: true, language: 'both', voiceEn: 'samantha', voiceZh: 'sinji' } });
  h.narrate('setting', { en: 'Saved.', zh: '儲咗喇。' });
  assert.equal(h.engine.spoken.length, 1, 'the English half was not started, so this would prove nothing');
  h.quietState.on = true;
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((u) => u.text), ['Saved.'],
    'the Cantonese half was read after Low stimulation was switched on');
});

test('an error would survive a rate limit even under a category that has one', () => {
  /* Belt and braces, deliberately, and worth saying plainly: the error category's own
   * cooldown is 0, so today the flag and the cooldown say the same thing and no call
   * site distinguishes them. A planted break that removed the flag survived precisely
   * because of that overlap, so the rule is asserted here directly rather than through
   * a category where it happens to be unobservable. */
  const h = loadNarration();
  const rateLimited = h.NARRATION_CATEGORIES.find((entry) => entry.cooldownMs > 0);
  assert.ok(rateLimited, 'no category carries a cooldown, so this would prove nothing');
  const base = { category: rateLimited.id, enabled: true, quiet: false, lastSpokenAtMs: 10_000, now: 10_001 };
  assert.deepEqual(h.narrationGate({ ...base, isError: false }), { speak: false, why: 'cooldown' });
  assert.deepEqual(h.narrationGate({ ...base, isError: true }), { speak: true, why: 'speak' },
    'an error is dropped for arriving too soon after something else');
});

test('an undeclared category is refused outright rather than given a default rate limit', () => {
  /* A silent default is how a typo becomes a category of its own with nobody's rate
   * limit on it. */
  const h = loadNarration({ narration: { enabled: true } });
  assert.equal(h.narrationCooldown('setttings'), null);
  assert.deepEqual(h.narrate('setttings', { en: 'Typo.' }), { spoken: false, why: 'unknown-category' });
  assert.equal(h.engine.spoken.length, 0);
});

test('the declared categories are exactly the ones the code reads, and each has a real cooldown', () => {
  const h = loadNarration();
  const ids = h.NARRATION_CATEGORIES.map((entry) => entry.id);
  assert.ok(ids.length > 0, 'the category table is empty, so every assertion above would pass vacuously');
  assert.deepEqual([...ids].sort(), [...CATEGORIES].sort(),
    'the set of narration categories changed -- this pin is the list, and it moves by hand');
  assert.equal(new Set(ids).size, ids.length, 'a category appears twice in the table');
  for (const entry of h.NARRATION_CATEGORIES) {
    assert.equal(typeof entry.cooldownMs, 'number', `${entry.id} has no cooldown`);
    assert.ok(entry.cooldownMs >= 0, `${entry.id} has a negative cooldown`);
  }
});

/* ------------------------------------------------------------------ *
 * Every call site, and every category it uses.
 * ------------------------------------------------------------------ */

test('every notify() call site says what to narrate, so a new notification cannot be silently mute', () => {
  const calls = callSites(app, 'notify');
  assert.ok(calls.length >= 12, `expected the site's notify call sites, found ${calls.length}`);
  for (const args of calls) {
    assert.equal(args.length, 3,
      `a notify() call passes ${args.length} arguments rather than title, body and narration: ${args[0]?.slice(0, 60)}`);
    assert.match(args[2], /^\{/u, `a notify() call's narration argument is not an object literal: ${args[2].slice(0, 60)}`);
  }
});

test('every narrate() call site names a declared category, spelled as a literal', () => {
  /* notify's own dispatcher is excluded and pinned separately below: it forwards
   * whatever descriptor its caller passed, so it is the one place the category is
   * legitimately an expression rather than a literal. */
  const calls = callSites(app.replace(functionSource(app, 'notify'), ''), 'narrate');
  assert.ok(calls.length > 0, 'no narrate() call sites found at all, so this would pass vacuously');
  for (const args of calls) {
    const match = args[0].match(/^'([a-z]+)'$/u);
    assert.ok(match, `a narrate() call names its category by expression rather than literal: ${args[0].slice(0, 60)}`);
    assert.ok(CATEGORIES.includes(match[1]), `a narrate() call uses the undeclared category ${match[1]}`);
  }
});

test('every notify() narration descriptor names a declared category or leans on the declared default', () => {
  for (const args of callSites(app, 'notify')) {
    const match = args[2].match(/category:'([a-z]+)'/u);
    if (match) assert.ok(CATEGORIES.includes(match[1]), `a notify() call uses the undeclared category ${match[1]}`);
  }
  assert.match(functionSource(app, 'notify'), /narrate\(narration\.category\|\|'notification',/u,
    'notify no longer falls back to the declared notification category for a descriptor that names none');
});

/* ------------------------------------------------------------------ *
 * The privacy boundary: what may be spoken, and what may not.
 * ------------------------------------------------------------------ */

test('narrated copy is read before the personal vocabulary is applied, not after', () => {
  /* This is the load-bearing one. A voice whose localService is false synthesises on a
   * remote service, so the words spoken through it leave this computer -- and the
   * vocabulary is a private dictionary. copyText applies it; copyLevel does not. */
  const source = functionSource(app, 'narrationTextFor');
  assert.match(source, /copyLevel\(source\.copyKey,'en'\)/u, 'narrationTextFor no longer reads the English copy from copyLevel');
  assert.match(source, /copyLevel\(source\.copyKey,'zh'\)/u, 'narrationTextFor no longer reads the Cantonese copy from copyLevel');
  assert.doesNotMatch(source, /applyVocabularyText|copyText/u,
    'narrationTextFor now routes narrated words through the personal vocabulary, which a network-backed voice would carry off this computer');
});

test('narrationTextFor really returns the per-language copy rather than one language twice', () => {
  const h = loadNarration({ copy: { notifSettingSaved: { en: 'Saved.', zh: '儲咗。' } } });
  assert.deepEqual(h.narrationTextFor({ copyKey: 'notifSettingSaved' }), { en: 'Saved.', zh: '儲咗。' });
  assert.deepEqual(h.narrationTextFor({ en: 'Only English.' }), { en: 'Only English.', zh: '' });
  assert.deepEqual(h.narrationTextFor(undefined), { en: '', zh: '' });
});

test('no narration path anywhere reaches the vocabulary substitution', () => {
  for (const name of ['narrate', 'speakNarrationLine', 'narrationTrackStatus', 'pumpNarration']) {
    assert.doesNotMatch(functionSource(app, name), /applyVocabularyText/u,
      `${name} now passes narrated text through the personal vocabulary`);
  }
});

test('a rejected personal-vocabulary file is the one rejection whose reason is shown and never spoken', () => {
  /* Several of those messages quote the file back -- a duplicate term, an over-long
   * replacement -- and that file is the private dictionary. */
  const source = functionSource(app, 'rejectVocabulary');
  assert.match(source, /\$\('vocabulary-status'\)\.textContent=`Rejected: \$\{reason\}`/u,
    'the vocabulary rejection reason is no longer shown beside the control');
  assert.doesNotMatch(source, /narrate\([^;]*\$\{reason\}/u,
    'the vocabulary rejection reason is now spoken, which a network-backed voice would carry off this computer');
  assert.match(source, /narrate\('error',\{en:'The personal vocabulary file was rejected\./u,
    'a rejected vocabulary file no longer narrates anything at all');
});

test('every vocabulary rejection goes through that one writer, so the rule holds for all of them', () => {
  const loader = functionSource(app, 'loadVocabulary');
  assert.doesNotMatch(loader, /\$\('vocabulary-status'\)\.textContent=`Rejected/u,
    'a vocabulary rejection writes its status line directly again, bypassing the one place the spoken/shown split is decided');
  assert.ok(callSites(loader, 'rejectVocabulary').length >= 2,
    'the vocabulary loader no longer routes each of its rejections through rejectVocabulary');
});

test('the logo rejection does speak its reason, and the asymmetry is deliberate rather than an oversight', () => {
  /* Every reason that branch can carry is written by this file or by the browser's own
   * reader, and none of them quotes the image. */
  assert.match(functionSource(app, 'rejectLogo'), /narrate\('error',\{en:`The local logo was rejected\. \$\{reason\}`/u,
    'the logo rejection no longer speaks the reason it shows');
  assert.equal(callSites(functionSource(app, 'loadLogo'), 'rejectLogo').length, 3,
    'the logo loader no longer routes all three of its rejections through rejectLogo');
});

/* ------------------------------------------------------------------ *
 * Voices: which one speaks, and what the status line says about it.
 * ------------------------------------------------------------------ */

test('the picker offers the voices this computer really has for that language, best match first', () => {
  const h = loadNarration();
  assert.deepEqual(h.narrationVoicesFor('en', DEFAULT_VOICES).map((v) => v.voiceURI), ['daniel', 'samantha']);
  /* zh-CN is Mandarin. A Mandarin voice reading Cantonese text is a different
   * language, not an accent, so a real Cantonese voice ranks ahead of it. */
  assert.deepEqual(h.narrationVoicesFor('zh', DEFAULT_VOICES).map((v) => v.voiceURI), ['sinji', 'tingting']);
  const withYue = [
    voice('tingting', 'Ting-Ting', 'zh-CN'),
    voice('sinji', 'Sin-ji', 'zh-HK'),
    voice('aasing', 'Aa Sing', 'yue-Hant-HK'),
  ];
  assert.deepEqual(h.narrationVoicesFor('zh', withYue).map((v) => v.voiceURI), ['aasing', 'sinji', 'tingting']);
});

test('a language prefix matches its own subtags and nothing that merely starts with the letters', () => {
  const h = loadNarration();
  assert.equal(h.narrationLangMatches('en-GB', 'en'), true);
  assert.equal(h.narrationLangMatches('EN', 'en'), true);
  assert.equal(h.narrationLangMatches('eng', 'en'), false, '"eng" is not a subtag of "en" and must not match it');
  assert.equal(h.narrationVoicesFor('en', [voice('x', 'X', 'enm')]).length, 0);
});

test('the shipped default is "Choose automatically", and it names the voice it actually chose', () => {
  const h = loadNarration();
  assert.equal(h.NARRATION_AUTOMATIC_VOICE, '', 'the automatic choice is no longer the empty stored value');
  const status = h.resolveNarrationVoice('en', '', DEFAULT_VOICES);
  assert.equal(status.kind, 'automatic');
  assert.equal(status.effectiveVoiceId, 'daniel');
  assert.match(status.message, /Chosen automatically: “Daniel” will read English\./u);
});

test('a chosen voice that is not installed here is kept, and the status line says what is speaking instead', () => {
  const h = loadNarration();
  const status = h.resolveNarrationVoice('en', 'a-voice-from-another-computer', DEFAULT_VOICES);
  assert.equal(status.kind, 'fallback');
  assert.equal(status.chosenVoiceId, 'a-voice-from-another-computer', 'the choice was thrown away rather than kept');
  assert.equal(status.effectiveVoiceId, 'daniel');
  assert.match(status.message, /not installed on this computer/u);
  assert.match(status.message, /the choice is kept/u);
});

test('a network-backed voice is named as one, because the words spoken through it leave this computer', () => {
  const h = loadNarration();
  const remote = [voice('cloud', 'Cloud Voice', 'en-US', false)];
  const status = h.resolveNarrationVoice('en', 'cloud', remote);
  assert.equal(status.kind, 'network');
  assert.match(status.message, /network-backed/u);
  assert.match(status.message, /goes quiet offline/u);
  assert.match(status.message, /rather than this one/u, 'the status no longer says where the words are synthesised');
  /* The warning has to survive the automatic and fallback routes too, which is where a
   * remote voice is most likely to be used without anybody choosing it. */
  assert.match(h.resolveNarrationVoice('en', '', remote).message, /network-backed/u);
  assert.match(h.resolveNarrationVoice('en', 'missing', remote).message, /network-backed/u);
});

test('a local voice is not described as network-backed', () => {
  const h = loadNarration();
  assert.doesNotMatch(h.resolveNarrationVoice('en', 'daniel', DEFAULT_VOICES).message, /network-backed/u);
  assert.equal(h.resolveNarrationVoice('en', 'daniel', DEFAULT_VOICES).kind, 'ok');
});

test('no voice for a language, and no speech synthesis at all, are two different sentences', () => {
  const h = loadNarration();
  const noVoice = h.resolveNarrationVoice('zh', '', [voice('daniel', 'Daniel', 'en-GB')]);
  assert.equal(noVoice.kind, 'no-voice-available');
  assert.match(noVoice.message, /No voice on this computer can read Cantonese yet\./u);
  assert.match(noVoice.message, /report their voices a moment after the page loads/u,
    'the empty-list sentence no longer allows for a list that simply has not arrived yet');
  const noEngine = h.resolveNarrationVoice('en', '', null);
  assert.equal(noEngine.kind, 'no-engine');
  assert.match(noEngine.message, /no speech synthesis/u);
  assert.notEqual(noEngine.message, noVoice.message,
    'a browser with no synthesis reads the same as one with no voice for a language');
});

test('a browser with no speech synthesis is reported rather than crashed on, and speaks nothing', () => {
  const h = loadNarration({ narration: { enabled: true }, engine: null });
  assert.equal(h.narrationVoices(), null);
  assert.deepEqual(h.narrate('notification', { en: 'Anything.' }), { spoken: true, why: 'queued', tracks: ['en'] });
  h.applyNarration();
  assert.match(h.elements['narration-status-en'].textContent, /no speech synthesis/u);
});

/* ------------------------------------------------------------------ *
 * Which language a line is actually read in.
 * ------------------------------------------------------------------ */

test('a line is spoken in the languages it has wording for, narrowed by the narrated language', () => {
  const h = loadNarration();
  assert.deepEqual(h.narrationTracksFor('en', ['en', 'zh']), ['en']);
  assert.deepEqual(h.narrationTracksFor('zh', ['en', 'zh']), ['zh']);
  assert.deepEqual(h.narrationTracksFor('both', ['en', 'zh']), ['en', 'zh']);
  assert.deepEqual(h.narrationTracksFor('both', ['zh']), ['zh']);
});

test('a line the site has no Cantonese wording for is read in English rather than mispronounced by a Cantonese voice', () => {
  /* Reading English words through a Cantonese voice is not Cantonese narration, it is
   * English badly pronounced. */
  const h = loadNarration({ narration: { enabled: true, language: 'zh', voiceZh: 'sinji' } });
  assert.deepEqual(h.narrationTracksFor('zh', ['en']), ['en']);
  assert.deepEqual(h.narrate('notification', { en: 'English only.' }).tracks, ['en']);
  assert.equal(h.engine.spoken[0].lang, 'en-US');
});

test('a line with no wording at all is not spoken, and says so', () => {
  const h = loadNarration({ narration: { enabled: true } });
  assert.deepEqual(h.narrate('notification', { en: '   ', zh: '' }), { spoken: false, why: 'no-text' });
  assert.equal(h.engine.spoken.length, 0);
});

test('the status line under a voice picker explains the fallback where somebody is looking at it', () => {
  const h = loadNarration({ narration: { enabled: true, language: 'en' } });
  assert.match(h.narrationTrackStatus('zh'),
    /The narrated language is English, so this voice only reads lines this site has no English wording for\./u);
  assert.doesNotMatch(h.narrationTrackStatus('en'), /The narrated language is/u,
    'the selected track carries the sentence meant for the unselected one');
});

/* ------------------------------------------------------------------ *
 * Rate, pitch, and values a hand-edited settings blob might carry.
 * ------------------------------------------------------------------ */

test('rate and pitch are clamped into the offered range, whatever the stored value says', () => {
  const h = loadNarration();
  assert.equal(h.clampNarrationValue(40, h.NARRATION_RATE), h.NARRATION_RATE.max);
  assert.equal(h.clampNarrationValue(-3, h.NARRATION_RATE), h.NARRATION_RATE.min);
  assert.equal(h.clampNarrationValue('not a number', h.NARRATION_RATE), h.NARRATION_RATE.default);
  assert.equal(h.clampNarrationValue(NaN, h.NARRATION_PITCH), h.NARRATION_PITCH.default);
  assert.equal(h.clampNarrationValue(1.4, h.NARRATION_RATE), 1.4);
});

test('the clamped value is what the engine is handed, not the stored one', async () => {
  const h = loadNarration({ narration: { enabled: true, rate: 99, pitch: -5 } });
  h.narrate('notification', { en: 'Bounded.' });
  await h.engine.finishAll();
  assert.equal(h.engine.spoken[0].rate, h.NARRATION_RATE.max);
  assert.equal(h.engine.spoken[0].pitch, h.NARRATION_PITCH.min);
});

test('the offered ranges sit inside the ones the Web Speech API documents', () => {
  const h = loadNarration();
  assert.ok(h.NARRATION_RATE.min >= 0.1 && h.NARRATION_RATE.max <= 10, 'the rate range left the documented 0.1-10');
  assert.ok(h.NARRATION_PITCH.min >= 0 && h.NARRATION_PITCH.max <= 2, 'the pitch range left the documented 0-2');
  assert.equal(h.NARRATION_RATE.default, 1, 'the default rate is no longer the voice’s own normal delivery');
  assert.equal(h.NARRATION_PITCH.default, 1, 'the default pitch is no longer the voice’s own normal delivery');
});

test('the sliders on the page offer exactly the range the code clamps to', () => {
  const h = loadNarration();
  const attributes = (id) => {
    const match = settings.match(new RegExp(`<input id="${id}"[^>]*>`, 'u'));
    assert.ok(match, `#${id} is not on the settings page`);
    return match[0];
  };
  assert.match(attributes('narration-rate'), new RegExp(`min="${h.NARRATION_RATE.min}"`, 'u'));
  assert.match(attributes('narration-rate'), new RegExp(`max="${h.NARRATION_RATE.max}"`, 'u'));
  assert.match(attributes('narration-pitch'), new RegExp(`min="${h.NARRATION_PITCH.min}"`, 'u'));
  assert.match(attributes('narration-pitch'), new RegExp(`max="${h.NARRATION_PITCH.max}"`, 'u'));
});

/* ------------------------------------------------------------------ *
 * The card: populated, reflected, and honest about what it kept.
 * ------------------------------------------------------------------ */

test('the voice pickers are filled from the machine, with the automatic choice first', () => {
  const h = loadNarration();
  h.applyNarration();
  const options = h.elements['narration-voice-en'].children;
  assert.equal(options[0].value, '', 'the first option is no longer the automatic choice');
  assert.equal(options[0].textContent, 'Choose automatically');
  assert.deepEqual(options.slice(1).map((o) => o.value), ['daniel', 'samantha']);
  assert.equal(options[1].textContent, 'Daniel (en-GB)', 'a voice option no longer names the language it reads');
});

test('a chosen voice this computer does not have keeps its own option rather than snapping back to automatic', () => {
  /* Without this the picker reads as though nothing was ever chosen, which is a
   * different fact from "chosen, and not installed here". */
  const h = loadNarration({ narration: { voiceEn: 'a-voice-from-another-computer' } });
  h.applyNarration();
  const options = h.elements['narration-voice-en'].children;
  assert.ok(options.some((o) => o.value === 'a-voice-from-another-computer'), 'the kept choice has no option to be selected');
  assert.equal(h.elements['narration-voice-en'].value, 'a-voice-from-another-computer');
  assert.match(options.find((o) => o.value === 'a-voice-from-another-computer').textContent, /not installed here/u);
});

test('the stored value is the platform’s stable voice identity, never the display name', () => {
  /* Display names are not unique -- one machine can carry several voices called
   * "Daniel" from different engines -- and platforms localize them, so a profile
   * written on one install silently stops matching on another. */
  const h = loadNarration();
  h.applyNarration();
  assert.ok(h.elements['narration-voice-en'].children.every((o) => o.value === '' || DEFAULT_VOICES.some((v) => v.voiceURI === o.value)),
    'a voice option stores something other than the platform voice identity');
  assert.match(functionSource(app, 'resolveNarrationVoice'), /voice\.voiceURI===chosenId/u,
    'the chosen voice is no longer looked up by its stable identity');
  assert.doesNotMatch(functionSource(app, 'resolveNarrationVoice'), /voice\.name===chosenId/u);
});

test('every control on the card is read back from the stored setting after a reload', () => {
  const h = loadNarration({ narration: { enabled: true, language: 'both', voiceZh: 'sinji', rate: 1.5, pitch: 0.7 } });
  h.applyNarration();
  assert.equal(h.elements['narration-enabled'].checked, true);
  assert.equal(h.elements['narration-language'].value, 'both');
  assert.equal(h.elements['narration-voice-zh'].value, 'sinji');
  assert.equal(h.elements['narration-rate'].value, '1.5');
  assert.equal(h.elements['narration-pitch'].value, '0.7');
  assert.equal(h.elements['narration-rate-output'].textContent, '1.5×');
  assert.equal(h.elements['narration-pitch-output'].textContent, '0.7');
});

test('applyNarration reaches only its own card', () => {
  const h = loadNarration();
  h.applyNarration();
  assert.deepEqual([...new Set(h.idsAsked)].sort(), [...CARD_IDS].sort(),
    'applyNarration reached an element outside the narration card');
});

test('a page without the card is skipped rather than crashed on', () => {
  /* Only the settings page carries it; every other page loads the same app.js and
   * calls applyState, and one throw takes applyState down with it. */
  const h = loadNarration({ withCard: false });
  h.applyNarration();
  h.initNarration();
  assert.equal(h.engine.spoken.length, 0);
});

/* ------------------------------------------------------------------ *
 * The late voice list, and leaving the page.
 * ------------------------------------------------------------------ */

test('the voice list is re-read when the browser reports it late, rather than once at load', () => {
  /* getVoices() answers empty on the first call in most browsers and fills in a moment
   * afterwards behind this event. A picker read once reports "no voices" on a computer
   * with forty of them. */
  const h = loadNarration({ voices: [] });
  h.initNarration();
  assert.deepEqual(h.elements['narration-voice-en'].children.map((o) => o.value), ['']);
  assert.match(h.elements['narration-status-en'].textContent, /No voice on this computer can read English yet/u);
  h.engine.setVoices(DEFAULT_VOICES);
  assert.deepEqual(h.elements['narration-voice-en'].children.map((o) => o.value), ['', 'daniel', 'samantha']);
  assert.match(h.elements['narration-status-en'].textContent, /“Daniel” will read English/u);
});

test('leaving the page stops the narrator and drops the subscription rather than accumulating one per page', () => {
  /* Speech synthesis belongs to the browser, not the page, so a narrator left talking
   * carries on across a navigation to the next page of this six-page site. */
  const h = loadNarration({ narration: { enabled: true } });
  h.initNarration();
  assert.equal((h.engine.listeners.get('voiceschanged') || []).length, 1);
  h.narrate('notification', { en: 'Mid-sentence.' });
  const leave = h.windowListeners.get('pagehide');
  assert.ok(leave, 'nothing is registered for the page being left');
  leave();
  assert.equal(h.engine.cancelled, 1, 'the narrator kept talking after the page was left');
  assert.equal((h.engine.listeners.get('voiceschanged') || []).length, 0, 'the voice-list subscription outlived the page');
});

/* ------------------------------------------------------------------ *
 * Wiring: the switch is connected to something.
 * ------------------------------------------------------------------ */

test('the card is wired, on statement boundaries rather than behind comments', () => {
  /* A bare `narration-enabled` needle is satisfied by a commented-out line, which is
   * how a wiring line usually dies. initSettings is one long line, so a line anchor
   * cannot help here; the call must sit at a statement boundary with no comment marker
   * ahead of it on its own line. */
  const initSettingsSource = functionSource(app, 'initSettings');
  const at = initSettingsSource.indexOf('initNarration();');
  assert.notEqual(at, -1, 'initSettings no longer starts the narrator');
  const ahead = initSettingsSource.slice(0, at);
  assert.match(ahead.slice(-1), /[;{]/u, 'the initNarration() call is not a statement');
  assert.doesNotMatch(ahead.slice(ahead.lastIndexOf('\n') + 1), /\/\//u, 'the initNarration() call sits behind a line comment');
  assert.match(app, /^\s*function applyState\(\)\{[^\n]*applyNarration\(\);/mu,
    'applyState no longer applies the narration settings, so the card would not survive a reload');
});

test('every control on the card is bound to something that changes the stored setting', () => {
  const h = loadNarration();
  h.initNarration();
  const changes = [
    ['narration-enabled', { target: { checked: true } }, () => h.state.narration.enabled === true],
    ['narration-language', { target: { value: 'both' } }, () => h.state.narration.language === 'both'],
    ['narration-voice-en', { target: { value: 'samantha' } }, () => h.state.narration.voiceEn === 'samantha'],
    ['narration-voice-zh', { target: { value: 'sinji' } }, () => h.state.narration.voiceZh === 'sinji'],
  ];
  for (const [id, event, held] of changes) {
    const element = h.elements[id];
    assert.equal(typeof element.onchange, 'function', `#${id} has no change handler`);
    element.onchange(event);
    assert.ok(held(), `changing #${id} did not reach the stored setting`);
  }
  assert.equal(typeof h.elements['narration-rate'].oninput, 'function', '#narration-rate has no input handler');
  h.elements['narration-rate'].oninput({ target: { value: '1.8' } });
  assert.equal(h.state.narration.rate, 1.8, 'moving the rate slider did not reach the stored setting');
  h.elements['narration-pitch'].oninput({ target: { value: '0.4' } });
  assert.equal(h.state.narration.pitch, 0.4);
  assert.ok(h.saved.length >= 6, 'a change to the card was applied but never persisted');
});

test('the sliders record one history entry when they are let go, not one per pixel dragged', () => {
  const h = loadNarration();
  h.initNarration();
  for (const value of ['1.1', '1.2', '1.3']) h.elements['narration-rate'].oninput({ target: { value } });
  assert.equal(h.history.length, 0, 'dragging the slider wrote a history entry per step');
  h.elements['narration-rate'].onchange();
  assert.equal(h.history.length, 1);
  assert.equal(h.history[0].kind, 'narration-changed');
});

/* ------------------------------------------------------------------ *
 * The surface: reachable, described, and honest about what it cannot do.
 * ------------------------------------------------------------------ */

test('the settings page carries every control, each with a visible label', () => {
  assert.match(settings, /<label><input id="narration-enabled" type="checkbox"> Speak page events aloud<\/label>/u,
    'the master switch is missing, or its visible label changed');
  for (const id of ['narration-language', 'narration-voice-en', 'narration-voice-zh', 'narration-rate', 'narration-pitch']) {
    assert.match(settings, new RegExp(`<label for="${id}">[^<]+</label>`, 'u'), `#${id} has no visible label of its own`);
    assert.ok(settings.includes(`id="${id}"`), `#${id} is not on the settings page`);
  }
  for (const id of ['narration-status-en', 'narration-status-zh']) {
    assert.match(settings, new RegExp(`<p id="${id}" role="status">`, 'u'), `#${id} is not a live status region`);
  }
});

test('the narrated-language choices are exactly the three the code can act on', () => {
  const open = settings.indexOf('<select id="narration-language">');
  assert.notEqual(open, -1, 'the narrated-language select is gone');
  const block = settings.slice(open, settings.indexOf('</select>', open));
  const values = [...block.matchAll(/<option value="([^"]*)">/gu)].map((m) => m[1]);
  assert.deepEqual(values, ['en', 'zh', 'both'],
    'the narrated-language options drifted from the selections narrationTracksFor understands');
  const h = loadNarration();
  for (const value of values) {
    assert.ok(h.narrationTracksFor(value, ['en', 'zh']).length > 0, `the option ${value} would narrate in no language at all`);
  }
});

test('the card says out loud the thing this site cannot do, rather than implying it does', () => {
  /* There is no browser API that reports a running screen reader, so this narrator
   * cannot step aside for one the way the desktop console does. */
  assert.match(settings, /<p class="setting-note">A browser cannot tell whether a screen reader is running[^<]*<\/p>/u,
    'the card no longer states that it cannot detect a screen reader');
  assert.match(settings, /Low stimulation silences it live, errors included\./u,
    'the card no longer states which setting does silence it');
});

test('the card describes itself at every funny level in both languages, and every level keeps both facts', () => {
  const start = app.indexOf('narrationDesc:{en:[');
  assert.notEqual(start, -1, 'the narration card has no funny-level copy of its own');
  const block = app.slice(start, app.indexOf(']},', app.indexOf('],zh:[', start)) + 3);
  const english = block.slice(0, block.indexOf('],zh:['));
  const cantonese = block.slice(block.indexOf('],zh:['));
  const levels = (chunk) => chunk.split('\n').filter((l) => /^\s+'/u.test(l));
  assert.equal(levels(english).length, 4, 'the English copy does not carry all four funny levels');
  assert.equal(levels(cantonese).length, 4, 'the Cantonese copy does not carry all four funny levels');
  for (const level of levels(english)) {
    assert.ok(/\boff\b/u.test(level), `an English funny level stopped saying it is off until switched on: ${level.trim().slice(0, 60)}`);
    assert.ok(level.includes('on screen'), `an English funny level stopped saying it only reads what is on screen: ${level.trim().slice(0, 60)}`);
  }
  for (const level of levels(cantonese)) {
    assert.ok(level.includes('關'), `a Cantonese funny level stopped saying it is off until switched on: ${level.trim().slice(0, 40)}`);
    assert.ok(level.includes('畫面'), `a Cantonese funny level stopped saying it only reads what is on screen: ${level.trim().slice(0, 40)}`);
  }
  assert.match(settings, /<p id="narration-desc" data-copy="narrationDesc">/u,
    'the card description is not wired to the funny-level copy');
});

test('the card is findable from the settings search', () => {
  assert.match(settings, /data-search="narration narrator speech speak voice tts spoken read aloud rate pitch"/u);
});

test('the reset gate names the narrator among the things it clears, and clearing it silences it', () => {
  const dialog = settings.match(/<p id="reset-confirm-text">([^<]*)<\/p>/u);
  assert.ok(dialog, 'settings.html no longer carries the reset confirmation text');
  assert.match(dialog[1], /spoken-narration switch/iu, 'Reset settings now clears the narration switch without saying so');
  assert.match(functionSource(app, 'performSettingsReset'), /narrationSilence\(\);/u,
    'a reset turns narration off without stopping the sentence it was in the middle of');
});

test('the card has stylesheet rules of its own, so its labels read as labels', () => {
  assert.match(css, /^\.setting-card-stack label\[for\^="narration-"\]\{/mu, 'the narration labels have no rule of their own');
  assert.match(css, /^\.setting-card-stack \.range-row input\[type="range"\]\{flex:1 1 auto/mu,
    'a narration slider sharing its row with a label would collapse');
  assert.match(css, /^\.setting-note\{/mu, 'the honest note under the card has no rule');
});

/* ------------------------------------------------------------------ *
 * The registries say what the code does.
 * ------------------------------------------------------------------ */

test('the site feature registry carries a row for narration', () => {
  assert.ok(registry.features['narration'], 'no narration row in site/feature-registry.json');
});

test('the registry records narration as implemented, and names the files it lives in', () => {
  const row = registry.features['narration'];
  assert.equal(row.state, 'implemented');
  assert.deepEqual([...row.files].sort(), ['site/app.js', 'site/settings.html', 'site/styles.css'].sort());
  assert.match(row.note, /copyLevel\(\)/u, 'the registry note does not record the vocabulary boundary');
  assert.match(row.note, /voiceschanged/u, 'the registry note does not record the late voice list');
});

test('the localization registry records the card copy rather than claiming untranslated coverage', () => {
  const row = locales.features['narration'];
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['narrationDesc']);
  assert.ok(locales.knownCopyKeys.includes('narrationDesc'), 'narrationDesc is missing from the recorded COPY keys');
});

/* ------------------------------------------------------------------ *
 * The restricted presentation, which removes Cantonese from this page.
 *
 * The narrator is the one surface where "removed" needs saying twice, because a
 * missing control does not silence a voice. `narrate` drops the track when the line
 * is queued, and the drain loop drops it again per line -- the switch is shared
 * across tabs, so it can arrive between the two halves of one bilingual line.
 * ------------------------------------------------------------------ */

test('under the restricted presentation a bilingual line is read in English only', async () => {
  const h = loadNarration({ narration: { enabled: true, language: 'both' }, restrictedPresentation: true });
  const result = h.narrate('notification', { en: 'Something happened.', zh: 'Cantonese wording.' });
  assert.deepEqual(result.tracks, ['en'], 'the Cantonese track was queued while the restricted presentation was on');
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((utterance) => utterance.text), ['Something happened.']);
});

test('under it a line with only Cantonese wording is not spoken at all, and says why', async () => {
  const h = loadNarration({ narration: { enabled: true, language: 'both' }, restrictedPresentation: true });
  assert.deepEqual(h.narrate('notification', { zh: 'Cantonese wording.' }), { spoken: false, why: 'no-text' },
    'a Cantonese-only line was queued anyway -- narrationTracksFor falls back to whatever wording exists, so filtering the SELECTION alone is not enough');
  await h.engine.finishAll();
  assert.equal(h.engine.spoken.length, 0);
});

test('switched on between the two halves of a bilingual line, the second half is dropped and the first is not', async () => {
  /* Same shape as the Low-stimulation mid-line test above, and here for the same
   * reason: both halves belong to one queued item, so the queue-level filter in
   * narrate() never sees this case at all. */
  const h = loadNarration({ narration: { enabled: true, language: 'both' } });
  h.narrate('notification', { en: 'English half.', zh: 'Cantonese half.' });
  assert.equal(h.engine.spoken.length, 1, 'the English half was not started, so this would prove nothing');
  h.restricted.on = true;
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((utterance) => utterance.text), ['English half.'],
    'the Cantonese half was spoken after the restricted presentation came on');
});

test('with it off nothing changes: both halves are still spoken', async () => {
  const h = loadNarration({ narration: { enabled: true, language: 'both' } });
  h.narrate('notification', { en: 'English half.', zh: 'Cantonese half.' });
  await h.engine.finishAll();
  assert.deepEqual(h.engine.spoken.map((utterance) => utterance.text), ['English half.', 'Cantonese half.'],
    'the previous test would pass vacuously if this one did not');
});
