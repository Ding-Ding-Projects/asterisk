/**
 * The work behind the controls that used to only announce it.
 *
 * These fourteen menu items each claimed to copy, export, import or save and did none of
 * it. So most of what matters here is the negative half: what happens when there is
 * nothing to copy, when the platform refuses, when the file is not what it claimed. Every
 * one of those used to report success.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fileNameFor, runHostAction, type HostActionEffects } from '../../app/renderer/src/host-actions.ts';

const effects = (over: Partial<HostActionEffects> = {}) => {
  const seen = { clipboard: [] as string[], files: [] as { name: string; contents: string }[], stored: new Map<string, string>() };
  const base: HostActionEffects = {
    writeClipboard: async (text) => { seen.clipboard.push(text); return true; },
    offerFile: async (name, _mime, contents) => { seen.files.push({ name, contents }); return true; },
    requestFile: async () => undefined,
    store: (key, value) => { seen.stored.set(key, value); return true; },
    now: () => '2026-08-24',
  };
  return { seen, effects: { ...base, ...over } };
};

/* --- copying ------------------------------------------------------------------------- */

test('copying puts the real text on the clipboard and says how much', () => {
  return (async () => {
    const { seen, effects: fx } = effects();
    const out = await runHostAction({ kind: 'copy', what: 'diff', text: 'a\nb' }, fx);
    assert.equal(out.ok, true);
    assert.deepEqual(seen.clipboard, ['a\nb']);
    assert.match(out.detail, /3 characters of diff/);
  })();
});

test('copying nothing refuses instead of reporting a copy', async () => {
  /* An empty write reports success and leaves the person pasting nothing, and they would
   * blame their own paste rather than the button. */
  const { seen, effects: fx } = effects();
  for (const text of ['', '   ', undefined]) {
    const out = await runHostAction({ kind: 'copy', what: 'diff', text }, fx);
    assert.equal(out.ok, false, `${JSON.stringify(text)} was reported as copied`);
    assert.match(out.detail, /no diff on screen/);
  }
  assert.deepEqual(seen.clipboard, []);
});

test('a platform with no clipboard is said plainly, not softened', async () => {
  const { effects: fx } = effects({ writeClipboard: async () => false });
  const out = await runHostAction({ kind: 'copy', what: 'the tab list', text: 'one' }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /did not allow a clipboard write/);
});

/* --- exporting ------------------------------------------------------------------------ */

test('exporting writes real JSON under a name a person will recognise', async () => {
  const { seen, effects: fx } = effects();
  const out = await runHostAction({ kind: 'export-json', subject: 'group', name: 'Night shift', data: { tabs: [1, 2] } }, fx);
  assert.equal(out.ok, true);
  assert.equal(seen.files.length, 1);
  assert.equal(seen.files[0].name, 'ding-Night-shift-2026-08-24.json');
  assert.deepEqual(JSON.parse(seen.files[0].contents), { tabs: [1, 2] });
});

test('exporting nothing refuses rather than writing an empty file', async () => {
  /* A file containing the word null is not an export, and calling it one means somebody
   * discovers the emptiness when they try to import it back. */
  const { seen, effects: fx } = effects();
  const out = await runHostAction({ kind: 'export-json', subject: 'group', name: 'x' }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /no group to write out/);
  assert.deepEqual(seen.files, []);
});

test('a platform that will not take a file says so', async () => {
  const { effects: fx } = effects({ offerFile: async () => false });
  const out = await runHostAction({ kind: 'export-json', subject: 'tab', name: 'x', data: { a: 1 } }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /did not allow a file to be offered/);
});

test('a filename survives whatever the thing was called', () => {
  assert.equal(fileNameFor('group', 'Night / shift #2', '2026-08-24'), 'ding-Night-shift-2-2026-08-24.json');
  assert.equal(fileNameFor('tabs and groups', '', '2026-08-24'), 'ding-tabs-and-groups-2026-08-24.json');
  assert.equal(fileNameFor('group', '???', '2026-08-24'), 'ding-group-2026-08-24.json');
  assert.ok(fileNameFor('group', 'x'.repeat(200), '2026-08-24').length < 80);
});

/* --- importing ------------------------------------------------------------------------ */

test('importing reads the chosen file and keeps it', async () => {
  const { seen, effects: fx } = effects({ requestFile: async () => ({ name: 'g.json', text: '{"tabs":[]}' }) });
  const out = await runHostAction({ kind: 'import-json', subject: 'group' }, fx);
  assert.equal(out.ok, true);
  assert.equal(seen.stored.get('console.import.group'), '{"tabs":[]}');
});

test('cancelling the picker changes nothing and says nothing changed', async () => {
  const { seen, effects: fx } = effects({ requestFile: async () => undefined });
  const out = await runHostAction({ kind: 'import-json', subject: 'group' }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /No file was chosen/);
  assert.equal(seen.stored.size, 0);
});

test('a file that is not readable JSON leaves everything as it was', async () => {
  /* Nothing partially applied: the previous state is untouched and named as untouched. */
  const { seen, effects: fx } = effects({ requestFile: async () => ({ name: 'g.json', text: '{not json' }) });
  const out = await runHostAction({ kind: 'import-json', subject: 'group' }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /not readable as JSON, so nothing changed/);
  assert.equal(seen.stored.size, 0);
});

test('valid JSON that is not the right shape is refused too', async () => {
  /* A number is valid JSON. Accepting it would store nonsense under the group key. */
  for (const text of ['42', '"a string"', 'null']) {
    const { seen, effects: fx } = effects({ requestFile: async () => ({ name: 'g.json', text }) });
    const out = await runHostAction({ kind: 'import-json', subject: 'group' }, fx);
    assert.equal(out.ok, false, `${text} was accepted as a group`);
    assert.equal(seen.stored.size, 0);
  }
});

/* --- saving --------------------------------------------------------------------------- */

test('saving keeps the value and says it survives a relaunch', async () => {
  const { seen, effects: fx } = effects();
  const out = await runHostAction({ kind: 'save', bucket: 'search', name: 'state=UP' }, fx);
  assert.equal(out.ok, true);
  assert.deepEqual(JSON.parse(seen.stored.get('console.saved.search')), { name: 'state=UP', at: '2026-08-24' });
});

test('each kind of saved thing has its own place', async () => {
  /* Saving a search must not overwrite a saved appearance preset. */
  const { seen, effects: fx } = effects();
  await runHostAction({ kind: 'save', bucket: 'search', name: 'a' }, fx);
  await runHostAction({ kind: 'save', bucket: 'appearance-preset', name: 'b' }, fx);
  assert.deepEqual([...seen.stored.keys()].sort(), ['console.saved.appearance-preset', 'console.saved.search']);
});

test('saving an empty search refuses rather than reporting a saved search', async () => {
  const { seen, effects: fx } = effects();
  for (const name of ['', '   ', undefined]) {
    const out = await runHostAction({ kind: 'save', bucket: 'search', name }, fx);
    assert.equal(out.ok, false, `${JSON.stringify(name)} was reported as saved`);
    assert.match(out.detail, /nothing filled in here yet/);
  }
  assert.equal(seen.stored.size, 0);
});

test('storage refusing the write is reported, not swallowed', async () => {
  const { effects: fx } = effects({ store: () => false });
  const out = await runHostAction({ kind: 'save', bucket: 'search', name: 'a' }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /refused the write/);
});

/* --- the shape of the whole thing ------------------------------------------------------ */

test('an action nobody implemented says so rather than quietly succeeding', async () => {
  const { effects: fx } = effects();
  const out = await runHostAction({ kind: 'not-a-kind' as never }, fx);
  assert.equal(out.ok, false);
  assert.match(out.detail, /knows how to do/);
});

test('every outcome carries a title and a detail, success or not', async () => {
  /* The caller shows one or the other with no branch of its own, so an empty message would
   * render as a blank notification -- which reads as nothing having happened at all. */
  const { effects: fx } = effects();
  const outcomes = [
    await runHostAction({ kind: 'copy', text: 'x' }, fx),
    await runHostAction({ kind: 'copy', text: '' }, fx),
    await runHostAction({ kind: 'save', bucket: 'b', name: 'n' }, fx),
    await runHostAction({ kind: 'import-json', subject: 's' }, fx),
  ];
  for (const outcome of outcomes) {
    assert.ok(outcome.title.length > 0 && outcome.detail.length > 0, JSON.stringify(outcome));
  }
});

/* --- picking a colour off the screen ------------------------------------------------- */

test('a picked colour becomes the accent and says it is kept', async () => {
  const applied: string[] = [];
  const { effects: fx } = effects({
    pickColour: async () => '#3366ff',
    applyAccent: (hex) => { applied.push(hex); return true; },
  });
  const out = await runHostAction({ kind: 'pick-colour' }, fx);
  assert.equal(out.ok, true);
  assert.deepEqual(applied, ['#3366ff']);
  assert.match(out.detail, /kept when you relaunch/);
});

test('the three ways picking can end are told apart', async () => {
  /* The old control collapsed all of them into one cheerful sentence about an eyedropper
   * it had not armed. */
  const noPicker = await runHostAction({ kind: 'pick-colour' }, effects().effects);
  assert.equal(noPicker.ok, false);
  assert.match(noPicker.detail, /no screen colour picker/);

  const cancelled = await runHostAction({ kind: 'pick-colour' },
    effects({ pickColour: async () => undefined, applyAccent: () => true }).effects);
  assert.equal(cancelled.ok, false);
  assert.match(cancelled.detail, /No colour was chosen, so the accent is unchanged/);

  const unreadable = await runHostAction({ kind: 'pick-colour' },
    effects({ pickColour: async () => 'not a colour', applyAccent: () => false }).effects);
  assert.equal(unreadable.ok, false);
  assert.match(unreadable.detail, /could not be read as a colour, so the accent is unchanged/);
});


/* --- putting a saved session back ------------------------------------------------------ */

test('a saved workspace keeps what was open, and restore puts it back', async () => {
  /* The two used to be a matched pair of claims with no mechanism between them: the save
   * kept a name and a timestamp, so the restore had nothing to read and said it had
   * restored a session anyway. */
  const { seen, effects: base } = effects();
  await runHostAction({ kind: 'save', bucket: 'workspace', name: 'Workspace', data: { tabs: ['dash', 'live'], groups: [] } }, base);
  const kept = JSON.parse(seen.stored.get('console.saved.workspace'));
  assert.deepEqual(kept.data, { tabs: ['dash', 'live'], groups: [] });

  let applied;
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, {
    ...base,
    readSaved: () => kept,
    applySaved: (data) => { applied = data; return { restored: 2, skipped: 0 }; },
  });
  assert.equal(out.ok, true);
  assert.deepEqual(applied, kept);
  assert.match(out.detail, /2 tab\(s\) are back\./);
});

test('restoring with nothing saved says so rather than claiming a restore', async () => {
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, {
    ...effects().effects, readSaved: () => undefined, applySaved: () => ({ restored: 1, skipped: 0 }),
  });
  assert.equal(out.ok, false);
  assert.match(out.detail, /No session has been saved yet/);
});

test('a workspace whose screens have all gone changes nothing on screen', async () => {
  /* Opening tabs for screens that no longer exist renders blanks, which reads as the app
   * breaking rather than as an old file. None of it is applied, and the reason is said. */
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, {
    ...effects().effects, readSaved: () => ({ data: { tabs: ['gone'] } }), applySaved: () => ({ restored: 0, skipped: 1 }),
  });
  assert.equal(out.ok, false);
  assert.match(out.detail, /None of the screens in that saved session exist any more/);
});

test('a partly usable workspace restores what it can and says what it left out', async () => {
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, {
    ...effects().effects, readSaved: () => ({ data: { tabs: ['dash', 'gone'] } }), applySaved: () => ({ restored: 1, skipped: 1 }),
  });
  assert.equal(out.ok, true);
  assert.match(out.detail, /1 screen\(s\) in it no longer exist and were left out\./);
});

test('an unreadable saved value is reported, not applied', async () => {
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, {
    ...effects().effects, readSaved: () => 42, applySaved: () => undefined,
  });
  assert.equal(out.ok, false);
  assert.match(out.detail, /could not be read, so nothing on screen changed/);
});

test('a platform with no session store says so', async () => {
  const out = await runHostAction({ kind: 'restore', bucket: 'workspace' }, effects().effects);
  assert.equal(out.ok, false);
  assert.match(out.detail, /Nothing here can read a saved session back/);
});
