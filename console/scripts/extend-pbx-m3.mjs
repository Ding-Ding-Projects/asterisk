import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const consoleRoot = new URL('../', import.meta.url);
const generated = new URL('app/renderer/src/generated/m3-control.tsx', consoleRoot);
const path = fileURLToPath(generated);

let source = await readFile(generated, 'utf8');

const templateMarker = '      (v.isText ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 14px;`) },';
const stateMarker = "      isText: c.kind === 'text',";
const extensionMarker = "isEditableText: c.kind === 'text' && String(c.id || '').startsWith('pbxadm:'),";

if (!source.includes(templateMarker)) {
  if (source.includes("String(c.id || '').startsWith('pbxadm:')")) {
    console.log(`PBX M3 controls are already integrated in the checked-in design component -> ${path}`);
    process.exit(0);
  }
  throw new Error('PBX M3 extension could not find the compiled read-only text-control template marker.');
}
if (!source.includes(stateMarker)) {
  throw new Error('PBX M3 extension could not find the compiled text-control state marker.');
}
if (source.includes(extensionMarker)) {
  throw new Error('PBX M3 extension was applied twice without a fresh design compile.');
}

const editableTemplate = `      (v.isEditableText ? h("div", { style: sty(\`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:8px 12px;\`) },
          h("span", { style: sty(\`font-size:17px; color:#82D9A5; flex:0 0 auto;\`), className: "msym" },
            "edit"
          ),
          h("input", { type: \`text\`, value: v.ctl.value, "aria-label": v.ctl.label, onChange: fn(v.onEditableTextInput), onInput: fn(v.onEditableTextInput), style: sty(\`flex:1; min-width:0; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13.5px; padding:2px;\`) })
        ) : null),
`;

source = source.replace(templateMarker, `${editableTemplate}${templateMarker}`);
source = source.replace(
  stateMarker,
  `      ${extensionMarker}\n      onEditableTextInput: (e) => { if (c.set) c.set(e.target.value); },\n      isText: c.kind === 'text' && !String(c.id || '').startsWith('pbxadm:'),`,
);

await writeFile(path, source, 'utf8');
console.log(`extended compiled M3 controls -> ${path}`);
