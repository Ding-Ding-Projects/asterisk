import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LogoMark, presetLogoSource } from '../../app/renderer/src/logo-mark.tsx';
import { withTitleBarName } from '../../app/renderer/src/title-bar-name.ts';

const strip = (markup: string) => markup.replace(/\s+/gu, ' ');

function titleBar() {
  return createElement('div', { 'data-window-drag': '' },
    createElement('div', { className: 'icon-row' },
      createElement('span', { className: 'msym' }, 'deployed_code'),
      createElement('span', {}, 'Material Asterisk'),
    ),
    createElement('div', { className: 'connection-pill' }, 'PBX disconnected'),
  );
}

test('each shipped preset resolves to a local packaged asset', () => {
  const preset = presetLogoSource('ding');
  assert.equal(preset.source, '/assets/logo/ding.svg');
  assert.match(preset.label, /app logo/u);
  assert.equal(/^https?:/iu.test(preset.source), false);
});

test('the logo mark has an accessible name and cannot be dragged', () => {
  const markup = strip(renderToStaticMarkup(createElement(LogoMark, {
    source: '/assets/logo/handset.svg',
    label: 'Handset app logo',
  })));
  assert.match(markup, /<img[^>]*class="app-logo-mark"/u);
  assert.match(markup, /data-app-logo="true"/u);
  assert.match(markup, /alt="Handset app logo"/u);
  assert.match(markup, /draggable="false"/u);
});

test('title-bar consumption replaces the design symbol without touching the connection pill', () => {
  const tree = withTitleBarName(
    titleBar(),
    'Reception',
    8,
    createElement(LogoMark, presetLogoSource('handset')),
  );
  const markup = strip(renderToStaticMarkup(tree));
  assert.match(markup, /data-app-logo="true"/u);
  assert.match(markup, /src="\/assets\/logo\/handset\.svg"/u);
  assert.match(markup, /alt="Handset app logo"/u);
  assert.match(markup, />Reception</u);
  assert.match(markup, /PBX disconnected/u);
  assert.equal(markup.includes('deployed_code'), false);
});

