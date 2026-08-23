import assert from 'node:assert/strict';
import test from 'node:test';

import { SCREENS } from '../../app/renderer/src/generated/console';

type Control = {
  id: string;
  kind: string;
  options?: string[];
  showWhen?: { control: string; is: string };
};
type Group = { title: string; ctls: Control[] };
type Screen = { groups?: Group[] };

const controlsOf = (screen: string): Control[] =>
  ((SCREENS as unknown as Record<string, Screen>)[screen].groups ?? []).flatMap((group) => group.ctls);

const byId = (screen: string, id: string): Control | undefined =>
  controlsOf(screen).find((control) => control.id === id);

/**
 * A choice that needs a value must reveal the control that accepts it.
 *
 * Found by using the application: the hold-music screen offered a Mode of files,
 * quietmp3, ringing or custom, and choosing any of them revealed nothing further. The
 * two modes that require a value — a directory to play from, or a command to read audio
 * from — had nowhere to supply it, so the choice could be made and never completed. The
 * screen looked finished and could not do its job.
 *
 * These assert the reveal exists in the compiled design, which is the only place it can
 * come from: the renderer is generated from that reference and never hand-edited.
 */
test('choosing a hold mode that needs a value reveals the control for it', () => {
  const mode = byId('moh', 'h_mode');
  assert.ok(mode, 'the hold-music screen has no mode control at all');
  assert.deepEqual(mode.options, ['files', 'quietmp3', 'ringing', 'custom']);

  /* `files` plays from a directory, so it must ask which one. */
  const directory = byId('moh', 'h_directory');
  assert.ok(directory, 'the files mode asks for no directory, so the choice cannot be completed');
  assert.deepEqual(directory.showWhen, { control: 'h_mode', is: 'files' });

  /* And it must be possible to put audio into that directory from here. */
  const upload = byId('moh', 'h_upload');
  assert.ok(upload, 'there is no way to add an audio file');
  assert.equal(upload.kind, 'file', 'adding audio must be a real file control, not a box to type a path into');
  assert.deepEqual(upload.showWhen, { control: 'h_mode', is: 'files' });

  /* `custom` runs a program and reads its output, so it needs a command rather than a
   * file. Offering an upload here would be the wrong control for the mode, however much
   * it looks like the helpful one. */
  const application = byId('moh', 'h_application');
  assert.ok(application, 'the custom mode asks for no command, so it can never play anything');
  assert.deepEqual(application.showWhen, { control: 'h_mode', is: 'custom' });
  assert.notEqual(application.kind, 'file', 'the custom mode runs a command; a file picker misdescribes it');
});

test('a control that only applies to one mode is not shown for the others', () => {
  /* Playback order is meaningless for a single stream or a built-in tone. */
  const order = byId('moh', 'h_sort');
  assert.ok(order);
  assert.deepEqual(order.showWhen, { control: 'h_mode', is: 'files' });
});

test('every conditional control names a real sibling and a value that sibling offers', () => {
  /* A condition pointing at a control that does not exist, or at a value it never takes,
   * hides the control forever — which looks exactly like the control being missing. */
  for (const screen of Object.keys(SCREENS as unknown as Record<string, Screen>)) {
    const controls = controlsOf(screen);
    for (const control of controls) {
      if (!control.showWhen) continue;
      const target = controls.find((candidate) => candidate.id === control.showWhen!.control);
      assert.ok(target, `${screen}.${control.id} depends on ${control.showWhen.control}, which is not on that screen`);
      if (target.options) {
        assert.ok(
          target.options.includes(control.showWhen.is),
          `${screen}.${control.id} waits for ${target.id} to be "${control.showWhen.is}", which it never offers`,
        );
      }
    }
  }
});
