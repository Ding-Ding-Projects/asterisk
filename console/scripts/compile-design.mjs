#!/usr/bin/env node
/**
 * Compiles the checked-in original design reference into the renderer sources.
 *
 * The design reference is never edited. It is read as data and translated, so the
 * packaged application renders the authoritative markup, styling and behaviour
 * rather than a hand-written approximation of them.
 *
 * Outputs (all regenerated, never hand-edited):
 *   app/renderer/src/generated/design-styles.css
 *   app/renderer/src/generated/m3-control.tsx
 *   app/renderer/src/generated/console.tsx
 *   app/renderer/src/generated/design-manifest.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const outDir = resolve(root, 'console/app/renderer/src/generated');

/** Branding replacements recorded in console/design/inventory.json under source.sanitization. */
const BRAND = [
  [/Asterisk Console/g, 'Ding PBX Console'],
  [/AsteriskConsole/g, 'DingPbxConsole'],
];

const sanitizeBrand = (text) => BRAND.reduce((acc, [from, to]) => acc.replace(from, to), text);

// ---------------------------------------------------------------- source extraction

function readDesign(name) {
  const raw = readFileSync(resolve(root, 'design', name), 'utf8').replace(/\r\n/g, '\n');
  const markup = between(raw, '<x-dc>', '</x-dc>');
  const scriptOpen = raw.indexOf('<script type="text/x-dc"');
  const scriptStart = raw.indexOf('>', scriptOpen) + 1;
  const script = raw.slice(scriptStart, raw.indexOf('</script>', scriptStart));
  const style = raw.includes('<style>') ? between(raw, '<style>', '</style>') : '';
  return { markup: markup.trim(), script: script.trim(), style: style.trim() };
}

function between(text, open, close) {
  const a = text.indexOf(open);
  if (a < 0) throw new Error(`design source is missing ${open}`);
  const b = text.indexOf(close, a + open.length);
  if (b < 0) throw new Error(`design source is missing ${close}`);
  return text.slice(a + open.length, b);
}

// ---------------------------------------------------------------- markup parsing

const VOID = new Set(['input', 'link', 'meta', 'br', 'img', 'hr', 'source']);
const CONTROL_FLOW = new Set(['sc-if', 'sc-for', 'dc-import']);

function parseMarkup(html) {
  let i = 0;
  const rootNodes = [];
  const stack = [{ children: rootNodes }];
  const top = () => stack[stack.length - 1];

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      pushText(top(), html.slice(i));
      break;
    }
    pushText(top(), html.slice(i, lt));
    if (html.startsWith('<!--', lt)) {
      i = html.indexOf('-->', lt) + 3;
      continue;
    }
    const gt = findTagEnd(html, lt);
    const rawTag = html.slice(lt + 1, gt);
    if (rawTag.startsWith('/')) {
      const name = rawTag.slice(1).trim();
      if (top().tag !== name) throw new Error(`unbalanced </${name}> (open element is ${top().tag})`);
      stack.pop();
      i = gt + 1;
      continue;
    }
    const selfClosing = rawTag.endsWith('/');
    const body = selfClosing ? rawTag.slice(0, -1) : rawTag;
    const nameEnd = body.search(/[\s/]/);
    const tag = (nameEnd < 0 ? body : body.slice(0, nameEnd)).trim();
    const node = { tag, attrs: parseAttrs(nameEnd < 0 ? '' : body.slice(nameEnd)), children: [] };
    top().children.push(node);
    if (!selfClosing && !VOID.has(tag)) stack.push(node);
    i = gt + 1;
  }
  if (stack.length !== 1) throw new Error(`unclosed element <${top().tag}>`);
  return rootNodes;
}

function findTagEnd(html, lt) {
  let quote = null;
  for (let j = lt + 1; j < html.length; j += 1) {
    const ch = html[j];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '>') return j;
  }
  throw new Error('unterminated tag');
}

function parseAttrs(text) {
  const attrs = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"|([A-Za-z_:][-A-Za-z0-9_:.]*)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) attrs[m[1]] = m[2];
    else attrs[m[3]] = '';
  }
  return attrs;
}

function pushText(parent, text) {
  if (!text) return;
  parent.children.push({ text });
}

// ---------------------------------------------------------------- expression translation

/**
 * `{{ a.b }}` binds against renderVals output unless `a` is a loop variable in scope.
 * The design names loop variables with single letters that collide with the runtime
 * helpers (`h`, `v`, `S`, …), so every loop variable is emitted under a `$` alias.
 */
function expr(source, scope) {
  const trimmed = source.trim();
  const head = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(trimmed);
  if (!head) return trimmed;
  const name = head[0];
  if (scope.has(name)) return `${scope.get(name)}${trimmed.slice(name.length)}`;
  if (/^(true|false|null|undefined)$/.test(name)) return trimmed;
  return `v.${trimmed}`;
}

const BINDING_RE = /\{\{([^}]*)\}\}/g;

/** Whole-value binding (`"{{ x }}"`) becomes the raw expression; mixed text becomes a template literal. */
function attrValue(raw, scope) {
  const whole = /^\s*\{\{([^}]*)\}\}\s*$/.exec(raw);
  if (whole) return expr(whole[1], scope);
  return templateLiteral(raw, scope);
}

function templateLiteral(raw, scope) {
  const body = raw
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(BINDING_RE, (_, inner) => `\${S(${expr(inner, scope)})}`);
  return `\`${body}\``;
}

// ---------------------------------------------------------------- attribute mapping

const ATTR_NAMES = {
  class: 'className',
  for: 'htmlFor',
  spellcheck: 'spellCheck',
  inputmode: 'inputMode',
  maxlength: 'maxLength',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  autocomplete: 'autoComplete',
  readonly: 'readOnly',
  autofocus: 'autoFocus',
  tabindex: 'tabIndex',
};

const DROP_ATTRS = new Set(['list', 'as', 'name', 'ctl', 'family']);
const HINT_PREFIX = 'hint-';

const EVENTS = new Set([
  'onClick', 'onInput', 'onChange', 'onKeyDown', 'onSubmit', 'onContextMenu', 'onMouseDown', 'onMouseUp',
  'onMouseEnter', 'onMouseLeave', 'onDrop', 'onDragStart', 'onDragOver', 'onDragEnd',
]);

// ---------------------------------------------------------------- hover / active styles

class HoverStyles {
  constructor(prefix) {
    this.prefix = prefix;
    this.byKey = new Map();
  }

  classFor(hover, active) {
    const key = `${hover}||${active}`;
    if (!this.byKey.has(key)) this.byKey.set(key, `${this.prefix}${this.byKey.size}`);
    return this.byKey.get(key);
  }

  css() {
    const rules = [];
    for (const [key, cls] of this.byKey) {
      const [hover, active] = key.split('||');
      if (hover) rules.push(`.${cls}:hover{${declarations(hover)}}`);
      if (active) rules.push(`.${cls}:active{${declarations(active)}}`);
    }
    return rules.join('\n');
  }
}

/** Design hover/active declarations must win over the element's inline style. */
function declarations(text) {
  return text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part} !important`)
    .join('; ');
}

// ---------------------------------------------------------------- code generation

function generate(nodes, scope, hovers, indent = '  ') {
  const parts = nodes.map((node) => emit(node, scope, hovers, indent)).filter(Boolean);
  return parts;
}

function emitChildren(node, scope, hovers, indent) {
  const parts = generate(node.children, scope, hovers, `${indent}  `);
  return parts;
}

function emit(node, scope, hovers, indent) {
  if (node.text !== undefined) {
    const text = node.text;
    if (!text.trim()) return null;
    if (!BINDING_RE.test(text)) {
      BINDING_RE.lastIndex = 0;
      return JSON.stringify(collapse(text));
    }
    BINDING_RE.lastIndex = 0;
    const whole = /^\s*\{\{([^}]*)\}\}\s*$/.exec(text);
    if (whole) return `S(${expr(whole[1], scope)})`;
    return templateLiteral(collapse(text), scope);
  }

  if (node.tag === 'sc-if') {
    const condition = attrValue(node.attrs.value ?? '', scope);
    const children = emitChildren(node, scope, hovers, indent);
    return `(${condition} ? ${wrapFragment(children, indent)} : null)`;
  }

  if (node.tag === 'sc-for') {
    const list = attrValue(node.attrs.list ?? '', scope);
    const item = node.attrs.as || 'item';
    const alias = `$${item}`;
    const index = `${alias}$i`;
    const inner = new Map(scope);
    inner.set(item, alias);
    const children = emitChildren(node, inner, hovers, indent);
    return `A(${list}).map((${alias}, ${index}) => R(${index}, ${wrapFragment(children, indent)}))`;
  }

  if (node.tag === 'dc-import') {
    const ctl = attrValue(node.attrs.ctl ?? '', scope);
    return `h(M3Control, { ctl: ${ctl} })`;
  }

  const props = [];
  let className = null;
  for (const [name, raw] of Object.entries(node.attrs)) {
    if (name.startsWith(HINT_PREFIX) || DROP_ATTRS.has(name)) continue;
    if (name === 'style-hover' || name === 'style-active') continue;
    if (name === 'style') {
      props.push(`style: sty(${templateLiteral(raw, scope)})`);
      continue;
    }
    if (name === 'class') {
      className = raw;
      continue;
    }
    if (EVENTS.has(name)) {
      props.push(`${name}: fn(${attrValue(raw, scope)})`);
      continue;
    }
    const mapped = ATTR_NAMES[name] || name;
    const value = mapped === 'autoFocus' && raw === 'true' ? 'true' : attrValue(raw, scope);
    props.push(`${propKey(mapped)}: ${value}`);
  }

  const hover = node.attrs['style-hover'];
  const active = node.attrs['style-active'];
  if (hover || active) {
    const cls = hovers.classFor(hover || '', active || '');
    className = className ? `${className} ${cls}` : cls;
  }
  if (className !== null) props.push(`className: ${JSON.stringify(className)}`);

  const children = emitChildren(node, scope, hovers, indent);
  const propsText = props.length ? `{ ${props.join(', ')} }` : 'null';
  if (!children.length) return `h(${JSON.stringify(node.tag)}, ${propsText})`;
  const body = children.map((child) => `\n${indent}  ${child}`).join(',');
  return `h(${JSON.stringify(node.tag)}, ${propsText},${body}\n${indent})`;
}

function wrapFragment(children, indent) {
  if (!children.length) return 'null';
  if (children.length === 1) return children[0];
  const body = children.map((child) => `\n${indent}  ${child}`).join(',');
  return `F(${body}\n${indent})`;
}

const collapse = (text) => text.replace(/\s+/g, ' ');

function annotateEventCalls(code, sourceId) {
  const occurrences = new Map();
  return code.replace(/this\.(toast|fire)\(/g, (match, kind, offset) => {
    const line = code.slice(0, offset).split('\n').length;
    const slot = `${sourceId}:${line}:${kind}`;
    const occurrence = occurrences.get(slot) ?? 0;
    occurrences.set(slot, occurrence + 1);
    return `this.${kind}WithId('event-${sourceId}-${line}-${kind}-${occurrence}', `;
  });
}

/** `data-*` and other hyphenated attribute names are not valid bare object keys. */
const propKey = (name) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name));

// ---------------------------------------------------------------- module emission

/**
 * The design reference is a mockup, so its frameless-window chrome carries no
 * behaviour. These two rules attach the real behaviour without changing layout.
 * Both assert their match count so a design change cannot silently drop them.
 */
const WINDOW_BUTTONS = {
  remove: { action: 'minimize', title: 'Minimize' },
  crop_square: { action: 'toggleMaximize', title: 'Maximize' },
  close: { action: 'close', title: 'Close' },
};

function attachWindowChrome(nodes) {
  let dragRegions = 0;
  let buttons = 0;

  const visit = (node) => {
    if (!node.children) return;
    const style = node.attrs?.style ?? '';
    if (node.tag === 'div' && style.startsWith('height:40px; flex:0 0 40px')) {
      node.attrs['data-window-drag'] = '';
      dragRegions += 1;
    }
    const icon = soleIconName(node);
    if (node.tag === 'div' && icon && WINDOW_BUTTONS[icon] && !node.attrs.onClick) {
      node.attrs.onClick = `{{ __window?.${WINDOW_BUTTONS[icon].action} }}`;
      node.attrs['data-window-button'] = '';
      node.attrs.title = WINDOW_BUTTONS[icon].title;
      buttons += 1;
    }
    node.children.forEach(visit);
  };
  nodes.forEach(visit);

  if (dragRegions !== 1) throw new Error(`expected 1 window drag region, found ${dragRegions}`);
  if (buttons !== 3) throw new Error(`expected 3 window control buttons, found ${buttons}`);
  return nodes;
}

/** A window control is a wrapper whose only content is one Material Symbol. */
function soleIconName(node) {
  const elements = node.children.filter((child) => child.tag);
  const text = node.children.filter((child) => child.text && child.text.trim());
  if (elements.length !== 1 || text.length) return null;
  const only = elements[0];
  if (only.tag !== 'span' || only.attrs.class !== 'msym') return null;
  const inner = only.children.filter((child) => child.text !== undefined);
  if (inner.length !== 1) return null;
  const value = inner[0].text.trim();
  return /^[a-z_]+$/.test(value) ? value : null;
}

function compileComponent({ name, source, componentName, extraImports = '', exports: exportNames = [], windowChrome = false }) {
  const hovers = new HoverStyles(`${name}-h`);
  // `<helmet>` carries the font-CDN links and the global stylesheet. Both are emitted
  // into design-styles.css instead, so the rendered tree drops the element entirely.
  let nodes = parseMarkup(sanitizeBrand(source.markup)).filter((node) => node.tag !== 'helmet');
  if (windowChrome) nodes = attachWindowChrome(nodes);
  const body = generate(nodes, new Map(), hovers, '    ');
  const template = `function Template(v: any) {\n  return F(${body.map((part) => `\n    ${part}`).join(',')}\n  );\n}`;

  const script = sanitizeBrand(source.script)
    .replace(/^class Component extends DCLogic \{/m, `class ${componentName} extends DCLogic {`);

  const exportLine = exportNames.length ? `\nexport { ${exportNames.join(', ')} };\n` : '\n';

  return {
    hoverCss: hovers.css(),
    code: [
      '// @ts-nocheck',
      '/* GENERATED FILE — do not edit.',
      ' * Produced by console/scripts/compile-design.mjs from the checked-in design reference.',
      ' * Edit the design reference and recompile instead. */',
      "import { DCLogic, h, F, A, R, S, fn, sty } from '../dc-runtime';",
      extraImports,
      '',
      template,
      '',
      script,
      '',
      `${componentName}.prototype.template = Template;`,
      `export default ${componentName};`,
      exportLine,
    ].filter((part) => part !== '').join('\n'),
  };
}

// ---------------------------------------------------------------- run

const controlSource = readDesign('M3 Control.dc.html');
const consoleSource = readDesign('Asterisk Console M3.dc.html');

const control = compileComponent({
  name: 'c',
  source: controlSource,
  componentName: 'M3Control',
});

const consoleModule = compileComponent({
  name: 'k',
  source: consoleSource,
  componentName: 'ConsoleShell',
  windowChrome: true,
  extraImports: "import M3Control from './m3-control';",
  exports: ['RAIL', 'SCREENS', 'ORDER', 'DOCS', 'GAMES', 'NODES', 'EDGES', 'WIZARDS', 'ONBOARD', 'TOUR', 'CLI_STEPS', 'APPEAR_GROUPS', 'ADVANCED'],
});
consoleModule.code = annotateEventCalls(consoleModule.code, 'generated-event-source');

/** The design loads Roboto, Roboto Mono and Material Symbols from a font CDN.
 *  The packaged application must not fetch at runtime, so the exact faces that
 *  stylesheet declares are downloaded by console/scripts/download-fonts.mjs and
 *  imported from here instead. That download keeps every one of the 49 declared
 *  @font-face blocks with its original font-weight and unicode-range, so the
 *  typographic hierarchy and the per-subset ranges survive; the earlier package
 *  substitutes covered only a fraction of them and gave Material Symbols a face
 *  whose variation axes the design's .msym rule could not actually drive. */
const baseCss = [
  '/* GENERATED FILE — do not edit. Produced by console/scripts/compile-design.mjs. */',
  "@import '../../../../assets/fonts/fonts.css';",
  '',
  sanitizeBrand(consoleSource.style),
  '',
  '.msym { font-family:"Material Symbols Outlined"; font-weight:400; font-style:normal; font-size:24px; line-height:1; letter-spacing:normal; text-transform:none; display:inline-block; white-space:nowrap; direction:ltr; font-variation-settings:"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; -webkit-font-feature-settings:"liga"; -webkit-font-smoothing:antialiased; }',
  '',
  '/* The window is frameless, so the design title bar drags it and its controls do not. */',
  '[data-window-drag] { -webkit-app-region: drag; }',
  '[data-window-drag] button, [data-window-drag] input, [data-window-drag] [data-window-button] { -webkit-app-region: no-drag; cursor: pointer; }',
  '',
  '/* style-hover and style-active from the design reference. */',
  control.hoverCss,
  consoleModule.hoverCss,
  '',
].join('\n');

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'm3-control.tsx'), `${control.code}\n`);
writeFileSync(resolve(outDir, 'console.tsx'), `${consoleModule.code}\n`);
writeFileSync(resolve(outDir, 'design-styles.css'), baseCss);

const manifest = {
  schemaVersion: 1,
  generatedBy: 'console/scripts/compile-design.mjs',
  sources: ['design/Asterisk Console M3.dc.html', 'design/M3 Control.dc.html'],
  sanitization: ['product branding replaced', 'runtime font CDN links replaced with bundled families'],
  hoverRules: control.hoverCss.split('\n').filter(Boolean).length + consoleModule.hoverCss.split('\n').filter(Boolean).length,
};
writeFileSync(resolve(outDir, 'design-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`compiled design reference -> ${outDir}`);
console.log(`hover/active rules: ${manifest.hoverRules}`);
