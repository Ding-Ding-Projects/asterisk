import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYABLE_EXTENSIONS,
  formatPromptSize,
  playbackMimeType,
  promptRows,
  resolvePromptRow,
} from '../../app/renderer/src/prompt-library.ts';
import type { MediaFile } from '../../control-plane/media-library.ts';

const file = (over: Partial<MediaFile>): MediaFile => ({
  name: 'welcome-greeting.wav', path: '/var/lib/asterisk/sounds/welcome-greeting.wav', extension: 'wav', bytes: 493568, ...over,
});

// ---------------------------------------------------------------- PLAYABLE_EXTENSIONS

test('exactly the container formats MediaLibrary validates a real header for are playable', () => {
  assert.deepEqual([...PLAYABLE_EXTENSIONS].sort(), ['ogg', 'opus', 'wav']);
});

test('the raw telephony formats MediaLibrary accepts on trust are not claimed as playable', () => {
  for (const raw of ['gsm', 'ulaw', 'alaw', 'g722', 'sln', 'sln16']) {
    assert.equal(PLAYABLE_EXTENSIONS.has(raw), false, `${raw} should not be reported playable`);
  }
});

test('playbackMimeType answers audio/wav for wav and audio/ogg for both ogg-family extensions', () => {
  assert.equal(playbackMimeType('wav'), 'audio/wav');
  assert.equal(playbackMimeType('ogg'), 'audio/ogg');
  assert.equal(playbackMimeType('opus'), 'audio/ogg');
});

// ---------------------------------------------------------------- formatPromptSize

test('formatPromptSize renders bytes, kilobytes and megabytes at the scale a person reads', () => {
  assert.equal(formatPromptSize(0), '0 B');
  assert.equal(formatPromptSize(512), '512 B');
  assert.equal(formatPromptSize(1024), '1.0 KB');
  assert.equal(formatPromptSize(493568), '482 KB');
  assert.equal(formatPromptSize(150 * 1024), '150 KB');
  assert.equal(formatPromptSize(1024 * 1024), '1.0 MB');
  assert.equal(formatPromptSize(1153434), '1.1 MB');
});

test('formatPromptSize answers honestly for a value it cannot size', () => {
  assert.equal(formatPromptSize(-1), '—');
  assert.equal(formatPromptSize(Number.NaN), '—');
});

// ---------------------------------------------------------------- promptRows

test('promptRows is empty for a library that has not been read yet', () => {
  assert.deepEqual(promptRows(undefined), []);
});

test('promptRows is empty for a library that really has nothing in it', () => {
  assert.deepEqual(promptRows([]), []);
});

test('promptRows keeps the target\'s own order and marks each row Playable or Download only', () => {
  const files: MediaFile[] = [
    file({ name: 'welcome-greeting.wav', extension: 'wav', bytes: 1024 }),
    file({ name: 'hold-loop.ogg', extension: 'ogg', bytes: 2048 }),
    file({ name: 'closed-message.gsm', extension: 'gsm', bytes: 512 }),
  ];
  assert.deepEqual(promptRows(files), [
    ['welcome-greeting.wav', 'wav', '1.0 KB', 'Playable'],
    ['hold-loop.ogg', 'ogg', '2.0 KB', 'Playable'],
    ['closed-message.gsm', 'gsm', '512 B', 'Download only'],
  ]);
});

// ---------------------------------------------------------------- resolvePromptRow

test('resolvePromptRow finds the exact file a row names', () => {
  const files = [file({ name: 'a.wav' }), file({ name: 'b.wav' })];
  assert.equal(resolvePromptRow(files, 'b.wav'), files[1]);
});

test('resolvePromptRow answers undefined for a name no longer in the list', () => {
  const files = [file({ name: 'a.wav' })];
  assert.equal(resolvePromptRow(files, 'gone.wav'), undefined);
});

test('resolvePromptRow answers undefined when nothing has been read yet', () => {
  assert.equal(resolvePromptRow(undefined, 'a.wav'), undefined);
});
