(() => {
  'use strict';

  const DESTINATIONS = [
    {id:'servers',name:'Deploy a server',icon:'▣',group:'App',article:'app/servers',description:'Guided WSL, local container, and approved remote Linux provisioning.'},
    {id:'dash',name:'Dashboard',icon:'⌂',group:'PBX',article:'pbx/dash',description:'System summary, alerts, recent activity, and guided next actions.'},
    {id:'live',name:'Live channels',icon:'◉',group:'PBX',article:'pbx/live',description:'Documented real-time call state, channels, bridges, and privacy boundaries.'},
    {id:'endpoints',name:'PJSIP endpoints',icon:'▣',group:'PBX',article:'pbx/endpoints',description:'Phones and applications registered with the PBX.'},
    {id:'trunks',name:'Trunks & registrations',icon:'⇄',group:'PBX',article:'pbx/trunks',description:'Provider connections, transports, registrations, and failover.'},
    {id:'trunkauth',name:'Trunk authentication',icon:'◇',group:'PBX',article:'pbx/trunkauth',description:'Authentication policy for incoming partner requests.'},
    {id:'canvas',name:'Dialplan canvas',icon:'⌁',group:'PBX',article:'pbx/canvas',description:'Visual call-path composition with validation and reversible publishing.'},
    {id:'ivr',name:'IVR menus',icon:'⌘',group:'PBX',article:'pbx/ivr',description:'Menus, prompts, timeouts, invalid choices, accessibility, and testing.'},
    {id:'queues',name:'Queues & agents',icon:'☷',group:'PBX',article:'pbx/queues',description:'Agents, distribution strategies, wait states, announcements, and reporting.'},

    {id:'voicemail',name:'Voicemail boxes',icon:'▻',group:'Media',article:'media/voicemail',description:'Mailboxes, greetings, delivery, retention, access, and recovery.'},
    {id:'confbridge',name:'ConfBridge rooms',icon:'◌',group:'Media',article:'media/confbridge',description:'Rooms, moderators, access, prompts, recording, and capacity.'},
    {id:'moh',name:'Music on hold',icon:'♬',group:'Media',article:'media/moh',description:'Local media classes, ordering, volume, and fallback behavior.'},
    {id:'codecs',name:'Codecs & RTP',icon:'≋',group:'Media',article:'media/codecs',description:'Codec preferences, media transport, port policy, and compatibility.'},

    {id:'cdr',name:'Call records',icon:'≡',group:'Data',article:'data/cdr',description:'Searchable call records, filters, privacy controls, and redacted export guidance.'},
    {id:'ami',name:'Manager & REST interfaces',icon:'⌁',group:'Data',article:'data/ami',description:'AMI, ARI, and HTTP capabilities with bounded access guidance.'},

    {id:'modules',name:'Modules',icon:'⬡',group:'System',article:'system/modules',description:'Loaded runtime modules, dependencies, and use counts.'},
    {id:'logger',name:'Logging',icon:'▤',group:'System',article:'system/logger',description:'Search, filtering, severity, retention, and diagnostic export guidance.'},
    {id:'security',name:'Security',icon:'◇',group:'System',article:'system/security',description:'Transport protection, credentials, access rules, auditing, and recovery.'},
    {id:'cli',name:'CLI builder',icon:'⌨',group:'System',article:'system/cli',description:'Guided allowlisted diagnostic command construction.'},

    {id:'memory',name:'Memory console',icon:'▣',group:'Agent',article:'agent/memory',description:'Local records, append-only history, and recovery boundaries.'},
    {id:'sync',name:'Sync & attestation',icon:'↻',group:'Agent',article:'agent/sync',description:'Local synchronization history and factual verification state.'},
    {id:'skills',name:'Skills registry',icon:'✣',group:'Agent',article:'agent/skills',description:'Installed local capability packages and their evidence.'},
    {id:'hub',name:'Status hub sessions',icon:'◆',group:'Agent',article:'agent/hub',description:'Active work sessions and factual current states.'},
    {id:'vocab',name:'Vocabulary & emission guard',icon:'▰',group:'Agent',article:'agent/vocab',description:'Private local wording configuration without bundled personal mappings.'},
    {id:'ops',name:'Operations & releases',icon:'▲',group:'Agent',article:'agent/ops',description:'Version, artifact, duration, and release evidence.'},
    {id:'secrets',name:'Secret intake',icon:'◆',group:'Agent',article:'agent/secrets',description:'One-time local intake guidance; values are never displayed.'},

    {id:'arcade',name:'Confirmation credits',icon:'◈',group:'App',article:'app/arcade',description:'Optional local activities that reduce repetitive confirmation steps.'},
    {id:'notifications',name:'Notification centre',icon:'●',group:'App',article:'app/notifications',description:'Reviewable local notifications, filtering, dismissal, and export.'},
    {id:'history',name:'History',icon:'↶',group:'App',article:'app/history',description:'Append-only local configuration revisions, comparison, and restore.'},
    {id:'customise',name:'Customise everything',icon:'✦',group:'App',article:'app/customise',description:'Element-level appearance, layout, behavior, and local reset.'},
    {id:'appearance',name:'Appearance',icon:'◐',group:'App',article:'app/appearance',description:'Theme, density, typography, accent, logo, and element editors.'},
    {id:'about',name:'About',icon:'ⓘ',group:'App',article:'app/about',description:'Version, integration boundaries, project status, and documentation.'}
  ];

  // ============================================================================
  // Export engine — ported from app/renderer/src/export.ts. Kept behaviourally
  // identical (same format list, same suitability/loss rules, same output shape)
  // so the site and the desktop renderer never silently diverge. No filesystem
  // access here either: exportRows returns text, the caller decides what to do
  // with it.
  // ============================================================================
  const EXPORT_FORMATS = ['json','jsonl','yaml','toml','xml','csv','tsv','markdown','html','sql'];
  const EXPORT_EXTENSION = {json:'json',jsonl:'jsonl',yaml:'yaml',toml:'toml',xml:'xml',csv:'csv',tsv:'tsv',markdown:'md',html:'html',sql:'sql'};
  function xUnionColumns(rows){const seen=new Set(),cols=[];for(const row of rows)for(const key of Object.keys(row))if(!seen.has(key)){seen.add(key);cols.push(key)}return cols}
  function xHasRaggedKeys(rows){if(rows.length===0)return false;const first=Object.keys(rows[0]).sort().join(' ');return rows.some(row=>Object.keys(row).sort().join(' ')!==first)}
  function xIsPlainObject(value){return typeof value==='object'&&value!==null&&!Array.isArray(value)&&!(value instanceof Date)}
  function xHasNestedValue(rows){return rows.some(row=>Object.values(row).some(value=>xIsPlainObject(value)||Array.isArray(value)))}
  function xHasNullVsUndefinedAmbiguity(rows){return rows.some(row=>Object.values(row).some(value=>value===null||value===undefined))}
  function xScalarToString(value){if(value===undefined)return '';if(value===null)return '';if(value instanceof Date)return value.toISOString();if(typeof value==='object')return JSON.stringify(value);return String(value)}
  function xIsValidXmlName(name){if(!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name))return false;if(/^xml/i.test(name))return false;return true}
  function xIsPlainSqlIdentifier(name){return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)}
  function xIsBareTomlKey(name){return /^[A-Za-z0-9_-]+$/.test(name)&&name.length>0}

  function suitableFormats(rows){
    const nested=xHasNestedValue(rows),columns=xUnionColumns(rows);
    const invalidXmlColumns=columns.some(c=>!xIsValidXmlName(c)),invalidSqlColumns=columns.some(c=>!xIsPlainSqlIdentifier(c));
    return EXPORT_FORMATS.filter(format=>{
      switch(format){
        case 'csv':case 'tsv':case 'markdown':return !nested;
        case 'xml':return !invalidXmlColumns;
        case 'sql':return !invalidSqlColumns;
        default:return true;
      }
    });
  }

  function describeLoss(rows,format){
    const notes=[],nested=xHasNestedValue(rows),ragged=xHasRaggedKeys(rows),nullish=xHasNullVsUndefinedAmbiguity(rows),columns=xUnionColumns(rows);
    if(ragged&&(format==='csv'||format==='tsv'||format==='markdown'||format==='sql'))notes.push('Rows have differing keys; missing fields are emitted as empty cells with no way to distinguish missing from empty.');
    switch(format){
      case 'csv':case 'tsv':
        if(nested)notes.push('Nested objects and arrays are flattened to their JSON string form; the original structure cannot be recovered by re-importing.');
        if(nullish)notes.push('null and an empty string are indistinguishable once written as an empty cell.');
        break;
      case 'markdown':
        if(nested)notes.push('Nested objects and arrays are rendered as their JSON string form inside the cell.');
        break;
      case 'xml':{
        const invalid=columns.filter(c=>!xIsValidXmlName(c));
        if(invalid.length>0)notes.push(`Column name(s) ${invalid.join(', ')} are not valid XML element names and cannot be represented.`);
        if(nullish)notes.push('null and undefined are both rendered as an empty element with no distinguishing marker.');
        break;
      }
      case 'sql':{
        const invalid=columns.filter(c=>!xIsPlainSqlIdentifier(c));
        if(invalid.length>0)notes.push(`Column name(s) ${invalid.join(', ')} are not plain SQL identifiers and cannot be used as column names.`);
        if(nested)notes.push('Nested objects and arrays are stored as their JSON string literal; the database will not treat them as structured data.');
        break;
      }
      case 'toml':{
        const invalid=columns.filter(c=>!xIsBareTomlKey(c));
        if(invalid.length>0)notes.push(`Column name(s) ${invalid.join(', ')} are not bare TOML keys and are quoted, which some parsers handle inconsistently.`);
        break;
      }
      default:break;
    }
    return notes;
  }

  function xJsonSafe(value){if(value===undefined)return null;if(value instanceof Date)return value.toISOString();return value}
  function xNormalizeRowForJson(row){const out={};for(const[k,v]of Object.entries(row))out[k]=xJsonSafe(v);return out}
  function toJson(rows){return JSON.stringify(rows.map(xNormalizeRowForJson),null,2)}
  function toJsonl(rows){return rows.map(row=>JSON.stringify(xNormalizeRowForJson(row))).join('\n')}

  const YAML_AMBIGUOUS=new Set(['yes','no','on','off','true','false','null','~','y','n']);
  function yamlNeedsQuoting(raw){
    if(raw==='')return true;
    const lower=raw.toLowerCase();
    if(YAML_AMBIGUOUS.has(lower))return true;
    if(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw))return true;
    if(/^\d{4}-\d{2}-\d{2}([Tt].*)?$/.test(raw))return true;
    if(/^\s|\s$/.test(raw))return true;
    if(/^[-?:,[\]{}#&*!|>'"%@`]/.test(raw))return true;
    if(raw.includes(': ')||raw.includes(' #')||raw.includes('\n'))return true;
    return false;
  }
  function yamlQuote(raw){const escaped=raw.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');return `"${escaped}"`}
  function yamlScalar(value){
    if(value===undefined||value===null)return 'null';
    if(typeof value==='boolean')return value?'true':'false';
    if(typeof value==='number')return String(value);
    if(value instanceof Date)return yamlQuote(value.toISOString());
    const raw=String(value);
    return yamlNeedsQuoting(raw)?yamlQuote(raw):raw;
  }
  function yamlValue(value,indent){
    if(xIsPlainObject(value)){
      const entries=Object.entries(value);
      if(entries.length===0)return `${indent}{}`;
      return entries.map(([k,v])=>{
        const key=yamlNeedsQuoting(k)?yamlQuote(k):k;
        if(xIsPlainObject(v)||Array.isArray(v))return `${indent}${key}:\n${yamlValue(v,indent+'  ')}`;
        return `${indent}${key}: ${yamlScalar(v)}`;
      }).join('\n');
    }
    if(Array.isArray(value)){
      if(value.length===0)return `${indent}[]`;
      return value.map(item=>{
        if(xIsPlainObject(item)||Array.isArray(item)){const nested=yamlValue(item,indent+'  ');return `${indent}-\n${nested}`}
        return `${indent}- ${yamlScalar(item)}`;
      }).join('\n');
    }
    return `${indent}${yamlScalar(value)}`;
  }
  function toYaml(rows){
    if(rows.length===0)return '[]\n';
    const lines=rows.map(row=>{
      const entries=Object.entries(row);
      if(entries.length===0)return '- {}';
      return entries.map(([k,v],i)=>{
        const key=yamlNeedsQuoting(k)?yamlQuote(k):k;
        const prefix=i===0?'- ':'  ';
        if(xIsPlainObject(v)||Array.isArray(v))return `${prefix}${key}:\n${yamlValue(v,'    ')}`;
        return `${prefix}${key}: ${yamlScalar(v)}`;
      }).join('\n');
    });
    return lines.join('\n')+'\n';
  }

  function tomlKey(key){return xIsBareTomlKey(key)?key:`"${key.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`}
  function tomlScalar(value){
    if(value===undefined||value===null)return '""';
    if(typeof value==='boolean')return value?'true':'false';
    if(typeof value==='number')return String(value);
    if(value instanceof Date)return `"${value.toISOString()}"`;
    if(Array.isArray(value))return `[${value.map(v=>xIsPlainObject(v)?tomlInlineTable(v):tomlScalar(v)).join(', ')}]`;
    if(xIsPlainObject(value))return tomlInlineTable(value);
    const raw=String(value),escaped=raw.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
    return `"${escaped}"`;
  }
  function tomlInlineTable(obj){const entries=Object.entries(obj).map(([k,v])=>`${tomlKey(k)} = ${tomlScalar(v)}`);return `{ ${entries.join(', ')} }`}
  function toToml(rows,table){
    if(rows.length===0)return '';
    const blocks=rows.map(row=>{const lines=[`[[${table}]]`];for(const[k,v]of Object.entries(row))lines.push(`${tomlKey(k)} = ${tomlScalar(v)}`);return lines.join('\n')});
    return blocks.join('\n\n')+'\n';
  }

  function xmlEscape(raw){return raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
  function xmlValue(value,elementName,indent){
    if(value===undefined||value===null)return `${indent}<${elementName}/>`;
    if(xIsPlainObject(value)){
      const inner=Object.entries(value).map(([k,v])=>{if(!xIsValidXmlName(k))throw new Error(`Invalid XML element name: ${k}`);return xmlValue(v,k,indent+'  ')}).join('\n');
      return `${indent}<${elementName}>\n${inner}\n${indent}</${elementName}>`;
    }
    if(Array.isArray(value)){if(value.length===0)return `${indent}<${elementName}/>`;return value.map(item=>xmlValue(item,elementName,indent)).join('\n')}
    return `${indent}<${elementName}>${xmlEscape(xScalarToString(value))}</${elementName}>`;
  }
  function toXml(rows,table){
    if(!xIsValidXmlName(table))throw new Error(`Invalid XML root element name: ${table}`);
    const columns=xUnionColumns(rows);
    for(const c of columns)if(!xIsValidXmlName(c))throw new Error(`Invalid XML element name for column: ${c}`);
    const rootName=xIsValidXmlName(`${table}s`)?`${table}s`:`${table}_list`,itemName=table;
    const items=rows.map(row=>{const fields=Object.entries(row).map(([k,v])=>xmlValue(v,k,'    ')).join('\n');return `  <${itemName}>\n${fields}\n  </${itemName}>`}).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${items}\n</${rootName}>\n`;
  }

  function delimitedEscape(raw,delimiter){const needsQuoting=raw.includes(delimiter)||raw.includes('"')||raw.includes('\n')||raw.includes('\r');if(!needsQuoting)return raw;return `"${raw.replace(/"/g,'""')}"`}
  function toDelimited(rows,delimiter){
    const columns=xUnionColumns(rows);
    const header=columns.map(c=>delimitedEscape(c,delimiter)).join(delimiter);
    const lines=rows.map(row=>columns.map(c=>delimitedEscape(xScalarToString(row[c]),delimiter)).join(delimiter));
    return [header,...lines].join('\r\n')+(rows.length>0?'\r\n':'');
  }

  function markdownEscapeCell(raw){return raw.replace(/\\/g,'\\\\').replace(/\|/g,'\\|').replace(/\n/g,'<br>')}
  function toMarkdown(rows){
    const columns=xUnionColumns(rows);
    if(columns.length===0)return '';
    const header=`| ${columns.map(c=>markdownEscapeCell(c)).join(' | ')} |`,divider=`| ${columns.map(()=>'---').join(' | ')} |`;
    const lines=rows.map(row=>`| ${columns.map(c=>markdownEscapeCell(xScalarToString(row[c]))).join(' | ')} |`);
    return [header,divider,...lines].join('\n')+'\n';
  }

  function htmlEscape(raw){return raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function toHtml(rows){
    const columns=xUnionColumns(rows);
    const head=`    <tr>${columns.map(c=>`<th>${htmlEscape(c)}</th>`).join('')}</tr>`;
    const body=rows.map(row=>`    <tr>${columns.map(c=>`<td>${htmlEscape(xScalarToString(row[c]))}</td>`).join('')}</tr>`).join('\n');
    return `<table>\n  <thead>\n${head}\n  </thead>\n  <tbody>\n${body}\n  </tbody>\n</table>\n`;
  }

  function sqlEscapeLiteral(raw){return raw.replace(/'/g,"''")}
  function sqlLiteral(value){
    if(value===undefined||value===null)return 'NULL';
    if(typeof value==='boolean')return value?'TRUE':'FALSE';
    if(typeof value==='number')return Number.isFinite(value)?String(value):'NULL';
    if(value instanceof Date)return `'${sqlEscapeLiteral(value.toISOString())}'`;
    const raw=typeof value==='object'?JSON.stringify(value):String(value);
    return `'${sqlEscapeLiteral(raw)}'`;
  }
  function toSql(rows,table){
    if(!xIsPlainSqlIdentifier(table))throw new Error(`Invalid SQL table identifier: ${table}`);
    const columns=xUnionColumns(rows);
    for(const c of columns)if(!xIsPlainSqlIdentifier(c))throw new Error(`Invalid SQL column identifier: ${c}`);
    const comment='-- Generated export for human review. These are literal INSERT statements,\n-- not a substitute for a parameterised query in application code.';
    if(columns.length===0||rows.length===0)return `${comment}\n`;
    const columnList=columns.join(', ');
    const statements=rows.map(row=>{const values=columns.map(c=>sqlLiteral(row[c])).join(', ');return `INSERT INTO ${table} (${columnList}) VALUES (${values});`});
    return [comment,...statements].join('\n')+'\n';
  }

  function exportRows(request){
    const {rows,format}=request;
    switch(format){
      case 'json':return toJson(rows);
      case 'jsonl':return toJsonl(rows);
      case 'yaml':return toYaml(rows);
      case 'toml':return toToml(rows,request.table||'row');
      case 'xml':return toXml(rows,request.table||'row');
      case 'csv':return toDelimited(rows,',');
      case 'tsv':return toDelimited(rows,'\t');
      case 'markdown':return toMarkdown(rows);
      case 'html':return toHtml(rows);
      case 'sql':return toSql(rows,request.table||'export_table');
      default:throw new Error(`Unsupported export format: ${format}`);
    }
  }
  function exportFilename(base,format,range){
    if(base.includes('/')||base.includes('\\'))throw new Error(`Export base name must not contain a path separator: ${base}`);
    const trimmed=base.trim();
    if(trimmed==='')throw new Error('Export base name must not be empty.');
    const suffix=range?`-${range}`:'';
    return `${trimmed}${suffix}.${EXPORT_EXTENSION[format]}`;
  }

  // ============================================================================
  // Selection and bulk-operation model — ported from app/renderer/src/bulk.ts.
  // ============================================================================
  function bulkClick(state,id,modifiers,ordered){
    if(modifiers.shift&&state.anchor!==undefined){
      const from=ordered.indexOf(state.anchor),to=ordered.indexOf(id);
      if(from===-1||to===-1)return {anchor:id,selected:new Set([id])};
      const lo=Math.min(from,to),hi=Math.max(from,to);
      return {anchor:state.anchor,selected:new Set(ordered.slice(lo,hi+1))};
    }
    if(modifiers.ctrl){
      const next=new Set(state.selected);
      if(next.has(id))next.delete(id);else next.add(id);
      return {anchor:id,selected:next};
    }
    return {anchor:id,selected:new Set([id])};
  }
  function bulkSelectAll(state,scope,page,matches){
    const ids=scope==='page'?page:matches,selected=new Set(ids);
    return {state:{anchor:state.anchor,selected},scope,count:selected.size};
  }
  function planBulk(action,selected,canApply,options={}){
    const affected=[],skipped=[];
    for(const item of selected){const verdict=canApply(item);if(verdict===true)affected.push(item);else skipped.push({item,reason:verdict})}
    return {action,selected,affected,skipped,destructive:options.destructive||false};
  }
  function summariseBulk(plan){
    const total=plan.selected.length,affected=plan.affected.length,skipped=plan.skipped.length;
    if(total===0)return `${plan.action}: nothing selected.`;
    const parts=[`${plan.action}: ${affected} of ${total} selected will change`];
    if(skipped>0){
      const reasons=new Set(plan.skipped.map(s=>s.reason));
      parts.push(reasons.size===1?`; ${skipped} skipped (${[...reasons][0]})`:`; ${skipped} skipped for ${reasons.size} different reasons`);
    }
    parts.push(plan.destructive?'. This cannot be undone.':'.');
    return parts.join('');
  }

  // ============================================================================
  // Colour engine — ported from app/renderer/src/colour.ts. Parsing, translation
  // between every listed format, and WCAG contrast maths, kept identical.
  // ============================================================================
  const COLOUR_FORMATS=['hex','rgb','hsl','hsv','hwb','cmyk','lab','lch','oklab','oklch','name'];
  const NAMED_COLOURS={black:[0,0,0],white:[255,255,255],red:[255,0,0],lime:[0,255,0],blue:[0,0,255],green:[0,128,0],yellow:[255,255,0],cyan:[0,255,255],aqua:[0,255,255],magenta:[255,0,255],fuchsia:[255,0,255],silver:[192,192,192],gray:[128,128,128],grey:[128,128,128],maroon:[128,0,0],purple:[128,0,128],olive:[128,128,0],navy:[0,0,128],teal:[0,128,128],orange:[255,165,0],pink:[255,192,203],brown:[165,42,42],gold:[255,215,0],indigo:[75,0,130],violet:[238,130,238],coral:[255,127,80],salmon:[250,128,114],khaki:[240,230,140],crimson:[220,20,60],chocolate:[210,105,30],transparent:[0,0,0]};
  const NAMED_COLOURS_REVERSE=(()=>{const map=new Map();for(const[name,[r,g,b]]of Object.entries(NAMED_COLOURS)){if(name==='transparent')continue;const key=`${r},${g},${b}`;if(!map.has(key))map.set(key,name)}return map})();
  function cClamp(value,lo,hi){return Math.min(hi,Math.max(lo,value))}
  function cRound(value,decimals=0){const f=10**decimals;return Math.round(value*f)/f}
  function cIsFiniteNumber(value){return typeof value==='number'&&Number.isFinite(value)}
  function srgbChannelToLinear(c255){const c=cClamp(c255,0,255)/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4}
  function linearToSrgbChannel(linear){return linear<=0.0031308?linear*12.92:1.055*linear**(1/2.4)-0.055}
  const XN=0.95047,YN=1.0,ZN=1.08883;
  function rgbToXyz(r255,g255,b255){const r=srgbChannelToLinear(r255),g=srgbChannelToLinear(g255),b=srgbChannelToLinear(b255);return [0.4124564*r+0.3575761*g+0.1804375*b,0.2126729*r+0.7151522*g+0.0721750*b,0.0193339*r+0.1191920*g+0.9503041*b]}
  function xyzToRgbRaw(x,y,z){const r=3.2404542*x-1.5371385*y-0.4985314*z,g=-0.9692660*x+1.8760108*y+0.0415560*z,b=0.0556434*x-0.2040259*y+1.0572252*z;return [linearToSrgbChannel(r)*255,linearToSrgbChannel(g)*255,linearToSrgbChannel(b)*255]}
  function labF(t){const eps=216/24389,kappa=24389/27;return t>eps?Math.cbrt(t):(kappa*t+16)/116}
  function labFInv(t){const eps=6/29;return t>eps?t**3:3*eps*eps*(t-4/29)}
  function rgbToLab(r255,g255,b255){const[x,y,z]=rgbToXyz(r255,g255,b255),fx=labF(x/XN),fy=labF(y/YN),fz=labF(z/ZN);return [116*fy-16,500*(fx-fy),200*(fy-fz)]}
  function labToRgbRaw(L,a,b){const fy=(L+16)/116,fx=fy+a/500,fz=fy-b/200;return xyzToRgbRaw(XN*labFInv(fx),YN*labFInv(fy),ZN*labFInv(fz))}
  function rgbToOklab(r255,g255,b255){
    const r=srgbChannelToLinear(r255),g=srgbChannelToLinear(g255),b=srgbChannelToLinear(b255);
    const l=0.4122214708*r+0.5363325363*g+0.0514459929*b,m=0.2119034982*r+0.6806995451*g+0.1073969566*b,s=0.0883024619*r+0.2817188376*g+0.6299787005*b;
    const l_=Math.cbrt(l),m_=Math.cbrt(m),s_=Math.cbrt(s);
    return [0.2104542553*l_+0.7936177850*m_-0.0040720468*s_,1.9779984951*l_-2.4285922050*m_+0.4505937099*s_,0.0259040371*l_+0.7827717662*m_-0.8086757660*s_];
  }
  function oklabToRgbRaw(L,a,b){
    const l_=L+0.3963377774*a+0.2158037573*b,m_=L-0.1055613458*a-0.0638541728*b,s_=L-0.0894841775*a-1.2914855480*b;
    const l=l_**3,m=m_**3,s=s_**3;
    const r=+4.0767416621*l-3.3077115913*m+0.2309699292*s,g=-1.2684380046*l+2.6097574011*m-0.3413193965*s,bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s;
    return [linearToSrgbChannel(r)*255,linearToSrgbChannel(g)*255,linearToSrgbChannel(bb)*255];
  }
  function toPolar(a,b){const C=Math.sqrt(a*a+b*b);let H=(Math.atan2(b,a)*180)/Math.PI;if(H<0)H+=360;return [C,H]}
  function fromPolar(C,H){const rad=(H*Math.PI)/180;return [C*Math.cos(rad),C*Math.sin(rad)]}
  function rgbToHsl(r255,g255,b255){
    const r=r255/255,g=g255/255,b=b255/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
    if(max===min)return [0,0,l*100];
    const d=max-min,s=l>0.5?d/(2-max-min):d/(max+min);
    let h;switch(max){case r:h=((g-b)/d+(g<b?6:0));break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;break}
    h*=60;return [h,s*100,l*100];
  }
  function hslToRgb(h,s,l){
    const H=((h%360)+360)%360,S=cClamp(s,0,100)/100,L=cClamp(l,0,100)/100;
    if(S===0){const v=L*255;return [v,v,v]}
    const q=L<0.5?L*(1+S):L+S-L*S,p=2*L-q;
    const hueToRgb=t0=>{let t=t0;if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};
    const hk=H/360;
    return [hueToRgb(hk+1/3)*255,hueToRgb(hk)*255,hueToRgb(hk-1/3)*255];
  }
  function rgbToHsv(r255,g255,b255){
    const r=r255/255,g=g255/255,b=b255/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0;if(d!==0){switch(max){case r:h=((g-b)/d+(g<b?6:0));break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;break}h*=60}
    const s=max===0?0:d/max,v=max;
    return [h,s*100,v*100];
  }
  function hsvToRgb(h,s,v){
    const H=((h%360)+360)%360,S=cClamp(s,0,100)/100,V=cClamp(v,0,100)/100,c=V*S,x=c*(1-Math.abs(((H/60)%2)-1)),m=V-c;
    let r1=0,g1=0,b1=0;
    if(H<60)[r1,g1,b1]=[c,x,0];else if(H<120)[r1,g1,b1]=[x,c,0];else if(H<180)[r1,g1,b1]=[0,c,x];else if(H<240)[r1,g1,b1]=[0,x,c];else if(H<300)[r1,g1,b1]=[x,0,c];else [r1,g1,b1]=[c,0,x];
    return [(r1+m)*255,(g1+m)*255,(b1+m)*255];
  }
  function rgbToHwb(r255,g255,b255){const[h]=rgbToHsv(r255,g255,b255);return [h,Math.min(r255,g255,b255)/255*100,(1-Math.max(r255,g255,b255)/255)*100]}
  function hwbToRgb(h,w,bl){
    let W=cClamp(w,0,100)/100,BL=cClamp(bl,0,100)/100;
    if(W+BL>=1){const sum=W+BL;W/=sum;BL/=sum;const grey=W*255;return [grey,grey,grey]}
    const [r,g,b]=hsvToRgb(h,100,100),scale=1-W-BL;
    return [r*scale+W*255,g*scale+W*255,b*scale+W*255];
  }
  function rgbToCmyk(r255,g255,b255){
    const r=r255/255,g=g255/255,b=b255/255,k=1-Math.max(r,g,b);
    if(k>=1)return [0,0,0,100];
    return [(1-r-k)/(1-k)*100,(1-g-k)/(1-k)*100,(1-b-k)/(1-k)*100,k*100];
  }
  function cmykToRgb(c,m,y,k){
    const C=cClamp(c,0,100)/100,M=cClamp(m,0,100)/100,Y=cClamp(y,0,100)/100,K=cClamp(k,0,100)/100;
    return [255*(1-C)*(1-K),255*(1-M)*(1-K),255*(1-Y)*(1-K)];
  }
  function hexPairToByte(hex){return parseInt(hex,16)}
  function byteToHexPair(value){return cClamp(Math.round(value),0,255).toString(16).padStart(2,'0')}
  function expandShortHexDigit(d){return d+d}
  function splitComponents(inner){
    const normalized=inner.replace(/\//g,' ').trim();
    if(normalized.includes(','))return normalized.split(',').map(s=>s.trim()).filter(s=>s.length>0);
    return normalized.split(/\s+/).filter(s=>s.length>0);
  }
  function parsePercentOrNumber(token,max=100){const t=token.trim();if(t.endsWith('%'))return (parseFloat(t)/100)*max;return parseFloat(t)}
  function parseAlphaToken(token){if(token===undefined)return 1;const t=token.trim();if(t.endsWith('%'))return cClamp(parseFloat(t)/100,0,1);return cClamp(parseFloat(t),0,1)}
  function parseAngle(token){return parseFloat(token.replace(/deg$/i,''))}

  function parseColour(value){
    if(typeof value!=='string')return undefined;
    const raw=value.trim();
    if(raw.length===0)return undefined;
    if(raw===RAINBOW)return undefined;
    const lower=raw.toLowerCase();
    const hexBody=lower.startsWith('#')?lower.slice(1):(/^[0-9a-f]{3,8}$/.test(lower)?lower:undefined);
    if(hexBody!==undefined&&/^[0-9a-f]+$/.test(hexBody)){
      if(hexBody.length===3||hexBody.length===4){
        const r=hexPairToByte(expandShortHexDigit(hexBody[0])),g=hexPairToByte(expandShortHexDigit(hexBody[1])),b=hexPairToByte(expandShortHexDigit(hexBody[2]));
        const a=hexBody.length===4?hexPairToByte(expandShortHexDigit(hexBody[3]))/255:1;
        return {r,g,b,a};
      }
      if(hexBody.length===6||hexBody.length===8){
        const r=hexPairToByte(hexBody.slice(0,2)),g=hexPairToByte(hexBody.slice(2,4)),b=hexPairToByte(hexBody.slice(4,6));
        const a=hexBody.length===8?hexPairToByte(hexBody.slice(6,8))/255:1;
        return {r,g,b,a};
      }
    }
    const fn=lower.match(/^([a-z]+)\s*\(([^)]*)\)$/);
    if(fn){
      const kind=fn[1],parts=splitComponents(fn[2]);
      if(kind==='rgb'||kind==='rgba'){
        if(parts.length<3)return undefined;
        const r=parsePercentOrNumber(parts[0],255),g=parsePercentOrNumber(parts[1],255),b=parsePercentOrNumber(parts[2],255),a=parseAlphaToken(parts[3]);
        if(![r,g,b].every(cIsFiniteNumber))return undefined;
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='hsl'||kind==='hsla'){
        if(parts.length<3)return undefined;
        const h=parseAngle(parts[0]),s=parsePercentOrNumber(parts[1],100),l=parsePercentOrNumber(parts[2],100),a=parseAlphaToken(parts[3]);
        if(![h,s,l].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=hslToRgb(h,s,l);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='hsv'||kind==='hsb'){
        if(parts.length<3)return undefined;
        const h=parseAngle(parts[0]),s=parsePercentOrNumber(parts[1],100),v=parsePercentOrNumber(parts[2],100),a=parseAlphaToken(parts[3]);
        if(![h,s,v].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=hsvToRgb(h,s,v);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='hwb'){
        if(parts.length<3)return undefined;
        const h=parseAngle(parts[0]),w=parsePercentOrNumber(parts[1],100),bl=parsePercentOrNumber(parts[2],100),a=parseAlphaToken(parts[3]);
        if(![h,w,bl].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=hwbToRgb(h,w,bl);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='cmyk'){
        if(parts.length<4)return undefined;
        const c=parsePercentOrNumber(parts[0],100),m=parsePercentOrNumber(parts[1],100),y=parsePercentOrNumber(parts[2],100),k=parsePercentOrNumber(parts[3],100),a=parseAlphaToken(parts[4]);
        if(![c,m,y,k].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=cmykToRgb(c,m,y,k);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='lab'){
        if(parts.length<3)return undefined;
        const L=parseFloat(parts[0]),a1=parseFloat(parts[1]),b1=parseFloat(parts[2]),a=parseAlphaToken(parts[3]);
        if(![L,a1,b1].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=labToRgbRaw(L,a1,b1);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='lch'){
        if(parts.length<3)return undefined;
        const L=parseFloat(parts[0]),C=parseFloat(parts[1]),H=parseAngle(parts[2]),a=parseAlphaToken(parts[3]);
        if(![L,C,H].every(cIsFiniteNumber))return undefined;
        const [la,lb]=fromPolar(C,H),[r,g,b]=labToRgbRaw(L,la,lb);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='oklab'){
        if(parts.length<3)return undefined;
        const L=parseFloat(parts[0]),a1=parseFloat(parts[1]),b1=parseFloat(parts[2]),a=parseAlphaToken(parts[3]);
        if(![L,a1,b1].every(cIsFiniteNumber))return undefined;
        const [r,g,b]=oklabToRgbRaw(L,a1,b1);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      if(kind==='oklch'){
        if(parts.length<3)return undefined;
        const L=parseFloat(parts[0]),C=parseFloat(parts[1]),H=parseAngle(parts[2]),a=parseAlphaToken(parts[3]);
        if(![L,C,H].every(cIsFiniteNumber))return undefined;
        const [la,lb]=fromPolar(C,H),[r,g,b]=oklabToRgbRaw(L,la,lb);
        return {r:cClamp(r,0,255),g:cClamp(g,0,255),b:cClamp(b,0,255),a};
      }
      return undefined;
    }
    const nameKey=lower.replace(/\s+/g,'');
    if(Object.prototype.hasOwnProperty.call(NAMED_COLOURS,nameKey)){
      const [r,g,b]=NAMED_COLOURS[nameKey],a=nameKey==='transparent'?0:1;
      return {r,g,b,a};
    }
    return undefined;
  }

  function formatColour(colour,format){
    const r=cClamp(cRound(colour.r),0,255),g=cClamp(cRound(colour.g),0,255),b=cClamp(cRound(colour.b),0,255),a=cClamp(colour.a,0,1),hasAlpha=a<1;
    switch(format){
      case 'hex':{const hex=`#${byteToHexPair(r)}${byteToHexPair(g)}${byteToHexPair(b)}`;return hasAlpha?`${hex}${byteToHexPair(Math.round(a*255))}`:hex}
      case 'rgb':return hasAlpha?`rgba(${r}, ${g}, ${b}, ${cRound(a,3)})`:`rgb(${r}, ${g}, ${b})`;
      case 'hsl':{const [h,s,l]=rgbToHsl(r,g,b),body=`${cRound(h,1)}, ${cRound(s,1)}%, ${cRound(l,1)}%`;return hasAlpha?`hsla(${body}, ${cRound(a,3)})`:`hsl(${body})`}
      case 'hsv':{const [h,s,v]=rgbToHsv(r,g,b),body=`${cRound(h,1)}, ${cRound(s,1)}%, ${cRound(v,1)}%`;return hasAlpha?`hsva(${body}, ${cRound(a,3)})`:`hsv(${body})`}
      case 'hwb':{const [h,w,bl]=rgbToHwb(r,g,b),body=`${cRound(h,1)} ${cRound(w,1)}% ${cRound(bl,1)}%`;return hasAlpha?`hwb(${body} / ${cRound(a,3)})`:`hwb(${body})`}
      case 'cmyk':{const [c,m,y,k]=rgbToCmyk(r,g,b);return `cmyk(${cRound(c,1)}%, ${cRound(m,1)}%, ${cRound(y,1)}%, ${cRound(k,1)}%)`}
      case 'lab':{const [L,la,lb]=rgbToLab(r,g,b);return `lab(${cRound(L,3)}, ${cRound(la,3)}, ${cRound(lb,3)})`}
      case 'lch':{const [L,la,lb]=rgbToLab(r,g,b),[C,H]=toPolar(la,lb);return `lch(${cRound(L,3)}, ${cRound(C,3)}, ${cRound(H,2)})`}
      case 'oklab':{const [L,oa,ob]=rgbToOklab(r,g,b);return `oklab(${cRound(L,5)}, ${cRound(oa,5)}, ${cRound(ob,5)})`}
      case 'oklch':{const [L,oa,ob]=rgbToOklab(r,g,b),[C,H]=toPolar(oa,ob);return `oklch(${cRound(L,5)}, ${cRound(C,5)}, ${cRound(H,2)})`}
      case 'name':{const key=`${r},${g},${b}`,named=NAMED_COLOURS_REVERSE.get(key);if(named&&a===1)return named;return formatColour(colour,'hex')}
      default:return formatColour(colour,'hex');
    }
  }
  function translateColour(value){
    const colour=parseColour(value);if(!colour)return undefined;
    const out={};for(const format of COLOUR_FORMATS)out[format]=formatColour(colour,format);
    return out;
  }
  function colourGamutReport(value){const raw=String(value||'').trim().toLowerCase(),hex=raw.startsWith('#')?raw.slice(1):undefined;if(hex&&/^[0-9a-f]{3,8}$/.test(hex))return{space:'sRGB',clipped:false};const match=raw.match(/^([a-z]+)\s*\(([^)]*)\)$/);if(!match&&NAMED_COLOURS[raw])return{space:'named sRGB',clipped:false};if(!match)return{space:'unknown',clipped:false};const kind=match[1],parts=splitComponents(match[2]),numbers=parts.map(part=>parseFloat(part)),space=kind==='rgba'?'rgb':kind==='hsla'?'hsl':kind==='hsva'?'hsv':kind;let clipped=false,rawRgb;const outside=(number,low,high)=>Number.isFinite(number)&&(number<low||number>high);if(kind==='rgb'){clipped=outside(numbers[0],0,255)||outside(numbers[1],0,255)||outside(numbers[2],0,255)}else if(kind==='hsl'||kind==='hsv'){clipped=outside(numbers[1],0,100)||outside(numbers[2],0,100)}else if(kind==='hwb'){clipped=outside(numbers[1],0,100)||outside(numbers[2],0,100)||Number(numbers[1])+Number(numbers[2])>100}else if(kind==='cmyk'){clipped=numbers.slice(0,4).some(number=>outside(number,0,100))}else if(kind==='lab'&&numbers.length>=3){clipped=outside(numbers[0],0,100);rawRgb=labToRgbRaw(numbers[0],numbers[1],numbers[2])}else if(kind==='lch'&&numbers.length>=3){clipped=outside(numbers[0],0,100);const [la,lb]=fromPolar(numbers[1],numbers[2]);rawRgb=labToRgbRaw(numbers[0],la,lb)}else if(kind==='oklab'&&numbers.length>=3){clipped=outside(numbers[0],0,1);rawRgb=oklabToRgbRaw(numbers[0],numbers[1],numbers[2])}else if(kind==='oklch'&&numbers.length>=3){clipped=outside(numbers[0],0,1);const [oa,ob]=fromPolar(numbers[1],numbers[2]);rawRgb=oklabToRgbRaw(numbers[0],oa,ob)}if(rawRgb?.some(number=>number<0||number>255))clipped=true;return{space,clipped}}
  function linearizeForLuminance(c255){const c=cClamp(c255,0,255)/255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4}
  function relativeLuminance(colour){return 0.2126*linearizeForLuminance(colour.r)+0.7152*linearizeForLuminance(colour.g)+0.0722*linearizeForLuminance(colour.b)}
  function contrastRatio(a,b){const l1=relativeLuminance(a),l2=relativeLuminance(b),lighter=Math.max(l1,l2),darker=Math.min(l1,l2);return (lighter+0.05)/(darker+0.05)}
  function contrastVerdict(ratio,largeText=false){const aaThreshold=largeText?3:4.5,aaaThreshold=largeText?4.5:7;if(ratio>=aaaThreshold)return 'AAA';if(ratio>=aaThreshold)return 'AA';return 'fail'}
  const RAINBOW='__rainbow__';

  const BASE = document.documentElement.dataset.base || './';
  const DEFAULTS = {theme:'dark',language:'en',density:'comfortable',accent:'#82D9A5',fontScale:100,lowMotion:false,englishFunny:5,cantoneseFunny:5,tabEdge:'left',logoPreset:'default',logoFit:'contain',attention:{reduceFlashing:false,simplifiedLanguage:false,extendedTimeouts:false,focus:false,timeAwareness:false,oneThing:false,momentum:false,currentTask:''},schedule:{enabled:false,start:'09:00',end:'17:00',weekdays:[1,2,3,4,5],theme:'dark',language:'en',density:'comfortable'},notifications:[],collapsed:{destinationMap:true,settingsPreview:true,documentationFilters:false,settingsFilters:false}};
  const STORAGE_KEY = 'ding-pbx-pages-v2';
  const HISTORY_KEY = 'ding-pbx-pages-history-v1';
  const TAB_STORAGE_KEY = 'ding-pbx-pages-tabs-v1';
  const ELEMENT_STORAGE_KEY = 'ding-pbx-pages-elements-v1';
  let tabState = null;
  let elementState = {version:1,appearance:{},locks:{}};
  let tabHistorySnapshot = null;
  let elementHistorySnapshot = null;
  let ladderHistorySnapshot = null;
  let tabRenderGeneration = 0;
  let contextTabId = '';
  let contextElement = null;
  const regexState = new Map();
  const regexGenerations = new Map();
  const REGEX_WORKER_SOURCE = `
    'use strict';
    const LIMITS={pattern:256,sample:4096,entries:500,text:4096,matches:512,groups:32};
    const fail=error=>self.postMessage({ok:false,error:String(error)});
    self.onmessage=event=>{
      const data=event.data||{},pattern=typeof data.pattern==='string'?data.pattern:'',flags=typeof data.flags==='string'?data.flags:'',sample=typeof data.sample==='string'?data.sample:'';
      const entries=Array.isArray(data.entries)?data.entries:[];
      if(pattern.length>LIMITS.pattern)return fail('Pattern exceeds the 256 character worker limit.');
      if(sample.length>LIMITS.sample)return fail('Sample text exceeds the 4 KiB worker limit.');
      if(entries.length>LIMITS.entries)return fail('Search input exceeds the 500 item worker limit.');
      if(entries.some(item=>!item||typeof item.id!=='string'||item.id.length>128||typeof item.text!=='string'||item.text.length>LIMITS.text))return fail('Search input contains an item outside the bounded worker limits.');
      let expression;
      try{expression=new RegExp(pattern,flags)}catch(error){return fail(error&&error.message?error.message:'Invalid regular expression.');}
      const globalFlags=expression.flags.includes('g')?expression.flags:expression.flags+'g';
      const sampleExpression=new RegExp(expression.source,globalFlags),sampleMatches=[];
      let match;
      while((match=sampleExpression.exec(sample))&&sampleMatches.length<LIMITS.matches){
        sampleMatches.push({full:match[0],index:match.index,groups:Array.from(match).slice(1,1+LIMITS.groups).map(value=>value===undefined?null:value)});
        if(match[0]==='')sampleExpression.lastIndex+=1;
      }
      const matchedIds=[];
      for(const item of entries){
        const tester=new RegExp(expression.source,expression.flags);
        if(tester.test(item.text))matchedIds.push(item.id);
      }
      self.postMessage({ok:true,matchedIds,sampleMatches,sampleMatchCount:sampleMatches.length,captureGroupCount:Math.max(0,...sampleMatches.map(item=>item.groups.length),0)});
    };
  `;
  const regexRuns = new Map();
  function runRegexWorker(key,config,entries=[],sample=''){
    const prior=regexRuns.get(key);if(prior)prior.cancel();
    const generation=(regexGenerations.get(key)||0)+1;regexGenerations.set(key,generation);
    let worker,blobUrl,timer,settled=false,rejectPending;
    const finish=(resolve,reject,value)=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);if(worker)worker.terminate();if(blobUrl)URL.revokeObjectURL(blobUrl);if(regexRuns.get(key)?.generation===generation)regexRuns.delete(key);if(value instanceof Error||value?.ok===false)reject(value instanceof Error?value:new Error(value.error||'The local regex worker rejected the evaluation.'));else resolve(value)};
    const promise=new Promise((resolve,reject)=>{
      rejectPending=reject;
      try{
        blobUrl=URL.createObjectURL(new Blob([REGEX_WORKER_SOURCE],{type:'application/javascript'}));
        worker=new Worker(blobUrl);
        worker.onmessage=event=>finish(resolve,reject,event.data);
        worker.onerror=event=>finish(resolve,reject,new Error(event.message||'The local regex worker failed.'));
        timer=setTimeout(()=>finish(resolve,reject,new Error('The local regex worker timed out and was terminated.')),350);
        worker.postMessage({pattern:config.pattern,flags:config.flags,entries,sample});
      }catch(error){finish(resolve,reject,error)}
    });
    const run={generation,promise,cancel(){if(!settled){settled=true;if(timer)clearTimeout(timer);if(worker)worker.terminate();if(blobUrl)URL.revokeObjectURL(blobUrl);if(regexRuns.get(key)?.generation===generation)regexRuns.delete(key);rejectPending(new Error('The previous local regex evaluation was cancelled.'))}}};
    regexRuns.set(key,run);return run;
  }
  function regexRunCurrent(key,run){return regexGenerations.get(key)===run.generation}
  function regexSearchEnabled(target,query){return Boolean(query&&regexState.get(target)?.enabled)}
  let regexTarget = '';
  let destinationPage = 0;

  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{...DEFAULTS,...saved,attention:{...DEFAULTS.attention,...(saved.attention||{})},schedule:{...DEFAULTS.schedule,...(saved.schedule||{}),weekdays:Array.isArray(saved.schedule?.weekdays)?saved.schedule.weekdays:[...DEFAULTS.schedule.weekdays]},collapsed:{...DEFAULTS.collapsed,...(saved.collapsed||{})}}}catch{return{...DEFAULTS,attention:{...DEFAULTS.attention},schedule:{...DEFAULTS.schedule,weekdays:[...DEFAULTS.schedule.weekdays]},collapsed:{...DEFAULTS.collapsed}}}}
  const state=loadState();
  let historySelection=new Set();
  function historyRows(){try{const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
  function historyRecord(action,target,before,after,label=''){const rows=historyRows(),redact=value=>{try{const clone=JSON.parse(JSON.stringify(value));const scrub=node=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(scrub);return}['secret','ciphertext','password','credential','credentials','passphrase'].forEach(key=>delete node[key]);if(node.locks&&typeof node.locks==='object')node.locks={omitted:'Toy-lock credential digests omitted from local history.'};Object.values(node).forEach(scrub)};scrub(clone);return clone}catch{return null}};rows.push({version:1,id:`rev-${Date.now()}-${Math.random().toString(16).slice(2)}`,time:Date.now(),action,target,label,before:redact(before),after:redact(after)});localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(-500)))}
  function historyDiff(row){return JSON.stringify({before:row.before,after:row.after},null,2)}
  function save(){const before=JSON.parse(JSON.stringify(state));localStorage.setItem(STORAGE_KEY,JSON.stringify(state));historyRecord('settings changed','site-settings',before,state)}
  function update(key,value){state[key]=value;save();applyState();notify(copyText('notifSettingSaved'),applyVocabularyText(`${key} now uses ${value}.`))}
  function scheduleMatches(schedule,date=new Date()){
    if(!schedule?.enabled||!Array.isArray(schedule.weekdays)||!schedule.weekdays.includes(date.getDay()))return false;
    if(!/^\d{2}:\d{2}$/.test(schedule.start||'')||!/^\d{2}:\d{2}$/.test(schedule.end||''))return false;
    const minute=date.getHours()*60+date.getMinutes(),toMinute=value=>{const[h,m]=value.split(':').map(Number);return h*60+m},start=toMinute(schedule.start),end=toMinute(schedule.end);
    if(start===end)return true;
    return start<end?minute>=start&&minute<end:minute>=start||minute<end;
  }
  function effectiveState(){return scheduleMatches(state.schedule)?{...state,theme:state.schedule.theme,language:state.schedule.language,density:state.schedule.density}:state}
  function syncValue(id,value,property='value'){const element=$(id);if(element)element[property]=value}
  function applyState(){
    const effective=effectiveState();
    document.documentElement.dataset.theme=effective.theme;
    document.documentElement.dataset.density=effective.density;
    document.documentElement.dataset.tabEdge=state.tabEdge;
    if($('site-nav'))$('site-nav').dataset.axis=state.tabEdge==='left'||state.tabEdge==='right'?'vertical':'horizontal';
    document.documentElement.style.setProperty('--primary',state.accent);
    document.documentElement.style.setProperty('--font-scale',String(state.fontScale/100));
    document.body.classList.toggle('low-stimulation',state.lowMotion);
    document.body.classList.toggle('reduce-flashing',state.attention.reduceFlashing);
    document.body.classList.toggle('extended-timeouts',state.attention.extendedTimeouts);
    document.body.classList.toggle('attn-focus',state.attention.focus);
    syncValue('theme-mode',state.theme);syncValue('language-mode',state.language);syncValue('density-mode',state.density);syncValue('accent-color',state.accent);syncValue('font-scale',state.fontScale);syncValue('font-scale-output',`${state.fontScale}%`,'textContent');syncValue('motion-mode',state.lowMotion,'checked');syncValue('english-funny',String(state.englishFunny));syncValue('cantonese-funny',String(state.cantoneseFunny));syncValue('schedule-enabled',state.schedule.enabled,'checked');
    syncValue('attention-reduce-flashing',state.attention.reduceFlashing,'checked');syncValue('attention-simplified-language',state.attention.simplifiedLanguage,'checked');syncValue('attention-extended-timeouts',state.attention.extendedTimeouts,'checked');syncValue('attention-focus',state.attention.focus,'checked');syncValue('attention-time-awareness',state.attention.timeAwareness,'checked');syncValue('attention-one-thing',state.attention.oneThing,'checked');syncValue('attention-momentum',state.attention.momentum,'checked');syncValue('attention-current-task',state.attention.currentTask||'');
    syncUniversalControls();
    applyLanguage(effective.language);applyCopy();applyLogo();applyVocabulary();updateSessionTimer();updateOneThingBanner();updateScheduleStatus();
  }
  function updateAttention(key,value){state.attention={...state.attention,[key]:value};save();applyState();notify(copyText('notifSettingSaved'),applyVocabularyText(`attention.${key} now uses ${value}.`))}
  function applyLanguage(language=effectiveState().language){
    document.documentElement.lang=language==='zh'?'zh-Hant':'en';
    if($('language-preview'))$('language-preview').textContent=language==='en'?'English presentation active.':language==='zh'?'廣東話顯示已啟用。':'Bilingual presentation active. / 雙語顯示已啟用。';
    all('[data-en][data-zh]').forEach(element=>{element.textContent=language==='zh'?element.dataset.zh:language==='both'?`${element.dataset.en} / ${element.dataset.zh}`:element.dataset.en});
    const notice=$('language-coverage-note');if(notice)notice.textContent=language==='en'?'Interface controls use English. Article prose remains the authored source text.':language==='zh'?'介面控制使用廣東話；文章正文保留原文。':'Interface controls are bilingual; article prose remains the authored source text. / 介面控制以雙語顯示；文章正文保留原文。';
  }

  // Funny-level copy changes voice and never the facts. Each key has five English
  // and five Cantonese variants selected by independent controls from level 1 to 5.
  const COPY = {
    heroLede:{en:[
      'Ding PBX Console is a planned desktop administration experience for Asterisk. This website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Worth saying plainly: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Friendly reminder: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Say it with us: this website is documentation and download infrastructure—not the installed desktop application, and definitely not a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. This website brings the manuals and the downloads; the installed console does the real work, and this page will not put on a fake moustache and pretend otherwise.'
    ],zh:[
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。講多句：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。老實講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，更加唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。認真同你講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，梗係唔係 PBX 運行環境喇，聽晒未？',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。呢度負責文件同下載，真正做嘢係已安裝嘅程式，網站唔會戴頂假髮扮 PBX，放心。'
    ]},
    themeDesc:{en:[
      'Applies immediately and persists.',
      'Applies immediately and persists — no reload needed.',
      'Flips instantly and sticks around.',
      'Flips in a blink and stays put, no takebacks.',
      'New colours, same facts. The pixels changed clothes and remembered the outfit.'
    ],zh:[
      '即時套用並會保存。',
      '即時套用並保存，唔使重新載入。',
      '一下就轉咗，仲會記住。',
      '眨吓眼就轉晒色，仲賴死唔走。',
      '顏色換咗衫，事實冇走樣，仲會記住套衫。'
    ]},
    motionDesc:{en:[
      'Stops non-essential site animation. The operating-system preference also applies.',
      'Stops non-essential site animation, on top of your operating-system preference.',
      'Calms down the moving parts. Your OS setting still applies too.',
      'Puts the wiggly bits to bed. Your OS setting still has the final say.',
      'Sends the unnecessary wiggles home early. Your operating-system preference remains the boss.'
    ],zh:[
      '停止非必要嘅網站動畫，亦會跟隨作業系統設定。',
      '停止非必要嘅網站動畫，同你部機嘅設定夾埋用。',
      '靜番啲跳動嘅嘢。你部機嘅設定照樣有效。',
      '安撫晒啲郁嚟郁去嘅嘢，你部機話事嗰個仲係話事。',
      '叫啲多餘動畫早收工，你部機嘅設定仍然係大老闆。'
    ]},
    emptyDestinations:{en:[
      'No destinations match this search.',
      'No destinations match this search — try a shorter term.',
      'Nothing matched. Try loosening the search a little.',
      'Came up empty. Try fewer words and see what turns up.',
      'The search cupboard is bare. Use fewer words and open another door.'
    ],zh:[
      '冇符合搜尋嘅目的地。',
      '冇符合搜尋嘅目的地，不如試短啲嘅字。',
      '乜都搵唔到，試吓少啲字。',
      '搵到一場空，少打幾隻字睇下有冇。',
      '搜尋櫃桶空空如也，少打幾隻字再開過。'
    ]},
    emptyNotifications:{en:[
      'No local notifications.',
      'No local notifications yet.',
      'Nothing here yet — quiet on purpose.',
      'Empty in here. Nothing to report, nothing to fret.',
      'Notification cupboard: spotless. Not even one lonely crumb.'
    ],zh:[
      '冇本地通知。',
      '暫時冇本地通知。',
      '呢度暫時得個空，靜靜哋。',
      '冇嘢，乜都冇發生過。',
      '通知櫃桶乾淨到發光，一粒餅碎都冇。'
    ]},
    notifSettingSaved:{en:[
      'Setting saved',
      'Setting saved.',
      'Saved. Nice and tidy.',
      'Saved! One small win banked.',
      'Saved. The setting has found its chair and refuses to wander off.'
    ],zh:[
      '設定已保存',
      '設定已經保存。',
      '搞掂，已經保存咗。',
      '保存咗喇！小小成就一件。',
      '保存好喇，個設定坐定定，唔准佢周圍走。'
    ]},
    notifSettingsReset:{en:[
      'Settings reset',
      'Settings reset.',
      'Reset done. Back to the defaults.',
      'Ctrl-Z for life: back to how it shipped.',
      'Back to the shipped settings. The local experiments have packed their tiny suitcases.'
    ],zh:[
      '設定已重設',
      '設定已經重設。',
      '重設完成，返晒去原廠設定。',
      '人生都有 Ctrl-Z：返番去出廠設定。',
      '返番去出廠設定，本地實驗已經執好迷你行李離場。'
    ]},
    notifRegexApplied:{en:[
      'Regular expression applied',
      'Regular expression applied.',
      'Pattern applied and live.',
      'Regex locked in and already hunting.',
      'Pattern applied. It is now sniffing through the local list with excellent table manners.'
    ],zh:[
      '已套用正則表達式',
      '正則表達式已經套用。',
      '樣式已經套用緊。',
      '正則已就位，開始搵嘢。',
      '樣式已經套用，依家有禮貌咁逐行聞過個本地清單。'
    ]}
  };

  function copyLevel(key,lang){
    const table=COPY[key];if(!table)return '';
    const arr=table[lang]||table.en;
    const level=lang==='zh'?state.cantoneseFunny:state.englishFunny;
    return arr[Math.min(arr.length-1,Math.max(0,(Number(level)||1)-1))]||arr[0];
  }
  function copyText(key){
    if(!COPY[key])return '';
    const language=effectiveState().language;
    if(state.attention.simplifiedLanguage){
      return applyVocabularyText(COPY[key][language==='zh'?'zh':'en'][0]);
    }
    let text;
    if(language==='en')text=copyLevel(key,'en');
    else if(language==='zh')text=copyLevel(key,'zh');
    else text=`${copyLevel(key,'en')} / ${copyLevel(key,'zh')}`;
    return applyVocabularyText(text);
  }
  function applyCopy(){all('[data-copy]').forEach(el=>{const key=el.dataset.copy;if(COPY[key])el.textContent=copyText(key)})}

  const UNSAFE_VOCABULARY_KEYS=new Set(['__proto__','prototype','constructor']);
  function validateVocabularyPayload(parsed){
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('the vocabulary root must be an object');
    const allowed=new Set(['version','replacements']);for(const key of Object.keys(parsed))if(!allowed.has(key))throw new Error(`unexpected field ${key}`);
    if(parsed.version!==1)throw new Error('expected schema version 1');
    if(!Array.isArray(parsed.replacements))throw new Error('replacements must be a list');
    if(parsed.replacements.length>256)throw new Error(`the file has ${parsed.replacements.length} replacements and the limit is 256`);
    const seen=new Set();
    const replacements=parsed.replacements.map((item,index)=>{
      if(!item||typeof item!=='object'||Array.isArray(item))throw new Error(`replacement ${index+1} must be an object`);
      if(Object.keys(item).some(key=>!['from','to'].includes(key)))throw new Error(`replacement ${index+1} contains an unexpected field`);
      if(typeof item.from!=='string'||typeof item.to!=='string')throw new Error(`replacement ${index+1} needs string from and to values`);
      if(item.from.length<1||item.from.length>128||item.to.length>256)throw new Error(`replacement ${index+1} is outside the 1–128 from and 0–256 to character bounds`);
      if(UNSAFE_VOCABULARY_KEYS.has(item.from))throw new Error(`replacement ${index+1} uses an unsafe key`);
      if(seen.has(item.from))throw new Error(`replacement ${index+1} duplicates an earlier from value`);seen.add(item.from);
      return {from:item.from,to:item.to};
    });
    return {version:1,replacements};
  }
  function vocabularyReplacements(){
    try{const raw=localStorage.getItem('ding-pbx-vocabulary-cache');if(!raw)return null;return validateVocabularyPayload(JSON.parse(raw)).replacements}
    catch{localStorage.removeItem('ding-pbx-vocabulary-cache');return null}
  }
  function applyVocabularyText(text){
    const list=vocabularyReplacements();
    if(!list||!list.length)return text;
    let out=String(text);
    for(const item of list){if(!item||typeof item.from!=='string'||!item.from)continue;out=out.split(item.from).join(String(item.to))}
    return out;
  }
  const VOCAB_SKIP_TAGS=new Set(['SCRIPT','STYLE','CODE','KBD','PRE','INPUT','TEXTAREA','SELECT','OPTION']);
  function applyVocabularyToNode(root){
    if(!root||!('createTreeWalker'in document))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const parent=node.parentElement;
      if(!parent)return NodeFilter.FILTER_REJECT;
      if(VOCAB_SKIP_TAGS.has(parent.tagName))return NodeFilter.FILTER_REJECT;
      if(parent.classList&&parent.classList.contains('mono'))return NodeFilter.FILTER_REJECT;
      if(parent.closest('[data-no-vocab]'))return NodeFilter.FILTER_REJECT;
      if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(node=>{
      if(node.__vocabOriginal===undefined)node.__vocabOriginal=node.nodeValue;
      node.nodeValue=applyVocabularyText(node.__vocabOriginal);
    });
    root.querySelectorAll('[aria-label]').forEach(el=>{
      if(VOCAB_SKIP_TAGS.has(el.tagName)||el.closest('[data-no-vocab]'))return;
      if(el.dataset.vocabOriginalLabel===undefined)el.dataset.vocabOriginalLabel=el.getAttribute('aria-label');
      el.setAttribute('aria-label',applyVocabularyText(el.dataset.vocabOriginalLabel));
    });
  }
  function applyVocabulary(){applyVocabularyToNode(document.body)}

  const DEFAULT_FAVICON='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#82D9A5"/><text x="50%" y="58%" font-family="monospace" font-size="22" font-weight="800" text-anchor="middle" fill="#0B0F0C">D</text></svg>');
  function readLogoCache(){
    try{const parsed=JSON.parse(localStorage.getItem('ding-pbx-logo-cache')||'null');if(!parsed||parsed.version!==1||!['image/png','image/jpeg'].includes(parsed.mime)||!Number.isInteger(parsed.bytes)||parsed.bytes<1||parsed.bytes>131072||!Number.isInteger(parsed.width)||!Number.isInteger(parsed.height)||parsed.width<1||parsed.height<1||parsed.width*parsed.height>4194304||typeof parsed.dataUrl!=='string'||!parsed.dataUrl.startsWith(`data:${parsed.mime};base64,`))throw new Error('invalid logo cache');return parsed}catch{localStorage.removeItem('ding-pbx-logo-cache');return null}
  }
  function applyLogo(){
    const cached=readLogoCache();
    all('.brand-mark').forEach(el=>{
      const img=el.querySelector('img.brand-mark-image');
      if(cached){
        if(img){img.src=cached.dataUrl;img.style.objectFit=state.logoFit}
        else{el.innerHTML='';const image=document.createElement('img');image.className='brand-mark-image';image.alt='';image.src=cached.dataUrl;image.style.objectFit=state.logoFit;el.appendChild(image)}
      }else if(img){el.innerHTML='D'}
      el.dataset.logoPreset=state.logoPreset;
    });
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}
    icon.href=cached?.dataUrl||DEFAULT_FAVICON;
  }

  let sessionStart=Date.now();
  function updateSessionTimer(){
    const el=$('session-timer');if(!el)return;
    if(!state.attention.timeAwareness){el.hidden=true;el.textContent='';return}
    el.hidden=false;
    const minutes=Math.floor((Date.now()-sessionStart)/60000);
    el.textContent=minutes<1?'On this page: under a minute':`On this page: ${minutes} minute${minutes===1?'':'s'}`;
  }
  function initTimeAwareness(){updateSessionTimer();setInterval(updateSessionTimer,15000)}
  function updateOneThingBanner(){
    const el=$('one-thing-banner');if(!el)return;
    if(!state.attention.oneThing||!state.attention.currentTask){el.hidden=true;el.textContent='';return}
    el.hidden=false;
    el.textContent=`Current focus: ${applyVocabularyText(state.attention.currentTask)}`;
  }
  let lastInteraction=Date.now(),momentumSnoozeUntil=0;
  function markInteraction(){lastInteraction=Date.now()}
  function checkMomentum(){
    if(!state.attention.momentum)return;
    if(Date.now()<momentumSnoozeUntil)return;
    const idleMinutes=(Date.now()-lastInteraction)/60000;
    if(idleMinutes>=10){
      notify('Still here','Nothing has changed on this page for a while. No action is needed.');
      momentumSnoozeUntil=Date.now()+15*60000;
      lastInteraction=Date.now();
    }
  }
  function initMomentum(){
    ['click','input','keydown','scroll'].forEach(type=>document.addEventListener(type,markInteraction,{passive:true}));
    setInterval(checkMomentum,60000);
  }
  function ensureAttentionUI(){
    const topActions=document.querySelector('.top-actions');
    if(topActions&&!$('session-timer')){
      const timer=document.createElement('span');
      timer.id='session-timer';timer.className='session-timer';timer.hidden=true;timer.setAttribute('aria-live','off');
      topActions.prepend(timer);
    }
    const main=document.querySelector('main');
    if(main&&!$('one-thing-banner')){
      const banner=document.createElement('div');
      banner.id='one-thing-banner';banner.className='one-thing-banner';banner.hidden=true;banner.setAttribute('role','status');
      main.prepend(banner);
    }
  }

  function universalShellMarkup(){return `
    <dialog id="site-controls" class="overlay-card universal-controls" aria-labelledby="site-controls-title"><form method="dialog"><div class="dialog-heading"><h2 id="site-controls-title" data-en="Site controls" data-zh="網站控制">Site controls</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div>
      <p id="language-coverage-note" class="plain-note"></p>
      <div class="search-composite"><label class="sr-only" for="shell-settings-search">Search site controls</label><input id="shell-settings-search" data-filter-target="#site-controls .universal-setting" type="search" placeholder="Search site controls"><button class="regex-trigger" type="button" data-regex-for="shell-settings-search" aria-label="Build a regular expression for site control search">.*</button></div>
      <div class="universal-settings-grid">
        <section class="universal-setting" data-search="language english cantonese bilingual funny humour"><h3 data-en="Language and voice" data-zh="語言同語氣">Language and voice</h3><label>Language<select id="shell-language"><option value="en">English</option><option value="zh">廣東話</option><option value="both">English / 廣東話</option></select></label><label>English funny level<input id="shell-english-funny" type="range" min="1" max="5" step="1"><output id="shell-english-funny-output"></output></label><label>Cantonese funny level<input id="shell-cantonese-funny" type="range" min="1" max="5" step="1"><output id="shell-cantonese-funny-output"></output></label></section>
        <section class="universal-setting" data-search="attention focus low stimulation time awareness one thing momentum"><h3 data-en="Attention modes" data-zh="專注模式">Attention modes</h3><label><input id="shell-attention-focus" type="checkbox"> Focus</label><label><input id="shell-attention-low" type="checkbox"> Low stimulation</label><label><input id="shell-attention-time" type="checkbox"> Time awareness</label><label><input id="shell-attention-one" type="checkbox"> One thing at a time</label><input id="shell-attention-task" type="text" maxlength="140" placeholder="Current next action"><label><input id="shell-attention-momentum" type="checkbox"> Momentum</label></section>
        <section class="universal-setting" data-search="schedule time weekday theme language density"><h3 data-en="Local schedule" data-zh="本地時間表">Local schedule</h3><p id="shell-schedule-status" role="status"></p><label><input id="shell-schedule-enabled" type="checkbox"> Enable this browser schedule</label><div class="schedule-times"><label>Start<input id="shell-schedule-start" type="time"></label><label>End<input id="shell-schedule-end" type="time"></label></div><fieldset><legend>Weekdays</legend><div class="weekday-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label,index)=>`<label><input type="checkbox" data-schedule-day="${index}">${label}</label>`).join('')}</div></fieldset><label>Scheduled theme<select id="shell-schedule-theme"><option value="dark">Dark</option><option value="light">Light</option><option value="contrast">High contrast</option></select></label><label>Scheduled language<select id="shell-schedule-language"><option value="en">English</option><option value="zh">廣東話</option><option value="both">English / 廣東話</option></select></label><label>Scheduled density<select id="shell-schedule-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label></section>
        <section class="universal-setting" data-search="appearance theme density accent font navigation edge"><h3 data-en="Appearance" data-zh="外觀">Appearance</h3><label>Theme<select id="shell-theme"><option value="dark">Dark</option><option value="light">Light</option><option value="contrast">High contrast</option></select></label><label>Density<select id="shell-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label><label>Accent<input id="shell-accent" type="color"></label><label>Text size<input id="shell-font-scale" type="range" min="90" max="130"><output id="shell-font-scale-output"></output></label><label>Navigation edge<select id="shell-tab-edge"><option value="left">Left</option><option value="right">Right</option><option value="top">Top</option><option value="bottom">Bottom</option></select></label></section>
        <section class="universal-setting" data-search="logo preset upload fit local image"><h3 data-en="Local logo" data-zh="本地標誌">Local logo</h3><label>Preset<select id="shell-logo-preset"><option value="default">Default D</option><option value="outline">Outline D</option><option value="solid">Solid D</option></select></label><label>Fit<select id="shell-logo-fit"><option value="contain">Contain</option><option value="cover">Fill</option></select></label><input id="shell-logo-file" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg"><button id="shell-logo-clear" class="text-button" type="button">Clear custom image</button><p id="shell-logo-status" role="status"></p></section>
        <section class="universal-setting" data-search="personal vocabulary json local privacy replace clear"><h3 data-en="Personal vocabulary JSON" data-zh="個人詞彙 JSON">Personal vocabulary JSON</h3><p>Schema version 1, at most 64 KiB and 256 bounded string replacements. Parsing and caching stay in this browser.</p><input id="shell-vocabulary-file" type="file" accept="application/json,.json"><button id="shell-vocabulary-clear" class="text-button" type="button">Clear vocabulary</button><p id="shell-vocabulary-status" role="status"></p></section>
        <section class="universal-setting" data-search="export download settings notifications page"><h3 data-en="Export" data-zh="匯出">Export</h3><p>Exports include every persisted site setting and notification. Custom logo bytes and personal vocabulary are omitted and named in the file.</p><button id="shell-export" class="text-button" type="button">Export site state as JSON</button></section>
      </div>
    </form></dialog>`}

  function commandPaletteMarkup(){return `<dialog id="command-palette" class="overlay-card" aria-labelledby="palette-title"><form method="dialog"><div class="dialog-heading"><h2 id="palette-title">Command palette</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="search-composite"><input id="palette-search" type="search" aria-label="Search pages, articles, and controls"><button type="button" class="regex-trigger" data-regex-for="palette-search">.*</button></div><div id="palette-results" class="palette-results" role="listbox"></div></form></dialog>`}
  function regexMarkup(){return `<dialog id="regex-dialog" class="overlay-card anchored-builder" aria-labelledby="regex-title"><form method="dialog"><div class="dialog-heading"><h2 id="regex-title">Regular expression builder</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><p id="regex-target-label"></p><label>Pattern<input id="regex-pattern"></label><fieldset><legend>Flags</legend><label><input id="regex-i" type="checkbox" checked> Ignore case</label><label><input id="regex-m" type="checkbox"> Multiline</label><label><input id="regex-u" type="checkbox" checked> Unicode</label></fieldset><div class="builder-buttons"><button type="button" data-insert="^">Starts with</button><button type="button" data-insert="$">Ends with</button><button type="button" data-insert="( )">Group</button><button type="button" data-insert="[a-z]">Class</button><button type="button" data-insert="|">Either</button><button type="button" data-insert="+">One or more</button></div><label>Sample text<textarea id="regex-sample">Home\nDocumentation\nSettings</textarea></label><p id="regex-feedback" role="status"></p><button type="button" id="regex-apply" class="primary-button">Apply</button></form></dialog>`}
  function notificationsMarkup(){return `<dialog id="notifications-dialog" class="overlay-card" aria-labelledby="notifications-title"><form method="dialog"><div class="dialog-heading"><h2 id="notifications-title">Local notifications</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="notif-toolbar"><div class="search-composite"><label class="sr-only" for="notification-search">Search notifications</label><input id="notification-search" type="search" placeholder="Search notifications"><button class="regex-trigger" type="button" data-regex-for="notification-search">.*</button></div><div class="notif-bulk-row"><button type="button" id="notif-select-page" class="text-button">Select this page</button><button type="button" id="notif-select-matches" class="text-button">Select every match</button><button type="button" id="notif-select-none" class="text-button">Clear selection</button><span id="notif-selection-status" class="filter-status" role="status"></span></div><div class="notif-bulk-row"><button type="button" id="notif-dismiss-selected" class="danger-button">Dismiss selected</button><select id="notif-export-format" aria-label="Notification export format"></select><button type="button" id="notif-export-selected" class="text-button">Export selected</button></div><p id="notif-export-loss" class="export-loss" role="status"></p><div id="notif-confirm" class="notif-confirm" role="alertdialog" aria-label="Confirm dismissal" hidden><p id="notif-confirm-text"></p><button type="button" id="notif-confirm-yes" class="danger-button">Confirm dismiss</button><button type="button" id="notif-confirm-cancel" class="text-button">Cancel</button></div></div><div id="notification-history"></div><button id="notification-clear" type="button" class="text-button">Clear all history</button></form></dialog>`}
  function menuMarkup(){return `<dialog id="menu-search-dialog" class="overlay-card menu-search-dialog" aria-labelledby="menu-search-title"><form method="dialog"><div class="dialog-heading"><h2 id="menu-search-title">Search choices</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="search-composite"><input id="menu-search" type="search" aria-label="Search this menu"><button class="regex-trigger" type="button" data-regex-for="menu-search">.*</button></div><p id="menu-search-count" role="status"></p><div id="menu-search-results" class="menu-search-results"></div></form></dialog><dialog id="page-context-menu" class="overlay-card context-menu" aria-labelledby="page-context-title"><form method="dialog"><div class="dialog-heading"><h2 id="page-context-title">Page actions</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="search-composite"><input id="context-search" type="search" aria-label="Search page actions"><button class="regex-trigger" type="button" data-regex-for="context-search">.*</button></div><div id="context-results"></div></form></dialog>`}
  function tabSearchMarkup(id,label){return `<div class="search-composite"><label class="sr-only" for="${id}">${label}</label><input id="${id}" type="search" placeholder="${label}"><button class="regex-trigger" type="button" data-regex-for="${id}" aria-label="Build a regular expression for ${label}">.*</button></div>`}
  function tabManagerMarkup(){return `<dialog id="tab-manager-dialog" class="overlay-card tab-manager-dialog" aria-labelledby="tab-manager-title"><form method="dialog"><div class="dialog-heading"><h2 id="tab-manager-title">Tab manager</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><p id="tab-manager-status" class="plain-note"></p><section class="tab-manager-section"><h3>Current tab strip</h3>${tabSearchMarkup('tab-strip-search','Search current tab strip')}<div id="tab-strip-results" class="tab-manager-results"></div></section><section class="tab-manager-section"><h3>Tab group</h3><label>Group<select id="tab-group-select" aria-label="Choose a tab group"></select></label>${tabSearchMarkup('tab-group-search','Search tabs in this group')}<div id="tab-group-results" class="tab-manager-results"></div></section><section class="tab-manager-section"><h3>Groups</h3>${tabSearchMarkup('tab-groups-search','Search tab groups')}<div id="tab-groups-results" class="tab-manager-results"></div><div class="inline-controls"><label for="tab-new-group">New group</label><input id="tab-new-group" type="text" maxlength="48" placeholder="Group name"><button id="tab-new-group-button" type="button" class="text-button">Create group</button></div></section><section class="tab-manager-section"><h3>All open tabs</h3>${tabSearchMarkup('tab-master-search','Search all open tabs')}<div id="tab-master-results" class="tab-manager-results"></div></section><p class="plain-note">Pinned tabs stay at the top of the strip. Reorder, group, appearance, and toy-lock choices are local browser state. Clear this site's browser storage to reset them.</p></form></dialog>`}
  function tabLockMarkup(){return `<dialog id="tab-lock-dialog" class="overlay-card" aria-labelledby="tab-lock-title"><form method="dialog"><div class="dialog-heading"><h2 id="tab-lock-title">Lock tab</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><p id="tab-lock-target"></p><label>Value<input id="tab-lock-password" type="password" autocomplete="new-password"></label><label>Repeat value<input id="tab-lock-password-confirm" type="password" autocomplete="new-password"></label><p class="plain-note">This is a toy lock stored locally in this browser. It is not encryption or a security boundary. Clear this site's browser storage to reset it.</p><p id="tab-lock-message" role="status"></p><p class="plain-note"><a href="${BASE}settings.html#support-tickets">Support Tickets</a> · <a href="${BASE}settings.html#unlock-ladder">Unlock ladder</a></p><div class="builder-buttons"><button id="tab-lock-save" type="button" class="primary-button">Save</button><button id="tab-lock-reset" type="button" class="text-button">Remove this lock after verifying</button></div></form></dialog>`}
  function tabAppearanceMarkup(){return `<dialog id="tab-appearance-dialog" class="overlay-card" aria-labelledby="tab-appearance-title"><form method="dialog"><div class="dialog-heading"><h2 id="tab-appearance-title">Edit tab appearance</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><label>Accent colour<input id="tab-appearance-accent" type="color" value="#82D9A5"></label><label>Text scale<input id="tab-appearance-scale" type="range" min="80" max="140" value="100"><output id="tab-appearance-scale-output">100%</output></label><p class="plain-note">This local editor changes the selected tab only. It does not rename or change the installed console.</p><div class="builder-buttons"><button id="tab-appearance-save" type="button" class="primary-button">Save appearance</button><button id="tab-appearance-reset" type="button" class="text-button">Reset this tab</button></div></form></dialog>`}

  function ensureUniversalShell(){
    const navLinks=$('site-nav');if(navLinks){[['converter.html','Converter'],['ollama.html','Ollama']].forEach(([href,label])=>{if(!navLinks.querySelector(`a[href$="${href}"]`)){const link=document.createElement('a');link.href=`${BASE}${href}`;link.textContent=label;navLinks.append(link)}})}
    const footer=document.querySelector('footer');if(footer&&!footer.querySelector('a[href*="support-tickets"]')){const link=document.createElement('a');link.href=`${BASE}settings.html#support-tickets`;link.textContent='Support Tickets';footer.append(link)}
    const topActions=document.querySelector('.top-actions');
    if(topActions&&!$('site-controls-open'))topActions.insertAdjacentHTML('afterbegin','<button class="icon-button" id="site-controls-open" type="button" aria-label="Open local site controls">⚙</button>');
    if(topActions&&!$('notification-open'))topActions.insertAdjacentHTML('afterbegin','<button class="icon-button" id="notification-open" type="button" aria-label="Open notification history">◉<span id="notification-count" class="badge">0</span></button>');
    const nav=$('site-nav');if(nav){nav.setAttribute('role','navigation');nav.removeAttribute('aria-orientation');all('#site-nav a').forEach(link=>{link.classList.add('site-tab');link.removeAttribute('role');link.removeAttribute('aria-selected');link.removeAttribute('aria-controls')})}
    if(!$('site-controls'))document.body.insertAdjacentHTML('beforeend',universalShellMarkup());
    if(!$('command-palette'))document.body.insertAdjacentHTML('beforeend',commandPaletteMarkup());
    if(!$('regex-dialog'))document.body.insertAdjacentHTML('beforeend',regexMarkup());
    if(!$('notifications-dialog'))document.body.insertAdjacentHTML('beforeend',notificationsMarkup());
    if(!$('menu-search-dialog'))document.body.insertAdjacentHTML('beforeend',menuMarkup());
    if(!$('toast-region'))document.body.insertAdjacentHTML('beforeend','<div id="toast-region" class="toast-region" aria-live="polite"></div>');
  }

  function syncUniversalControls(){
    if(!$('site-controls'))return;
    syncValue('shell-language',state.language);syncValue('shell-english-funny',String(state.englishFunny));syncValue('shell-english-funny-output',String(state.englishFunny),'textContent');syncValue('shell-cantonese-funny',String(state.cantoneseFunny));syncValue('shell-cantonese-funny-output',String(state.cantoneseFunny),'textContent');
    syncValue('shell-attention-focus',state.attention.focus,'checked');syncValue('shell-attention-low',state.lowMotion,'checked');syncValue('shell-attention-time',state.attention.timeAwareness,'checked');syncValue('shell-attention-one',state.attention.oneThing,'checked');syncValue('shell-attention-task',state.attention.currentTask||'');syncValue('shell-attention-momentum',state.attention.momentum,'checked');
    syncValue('shell-schedule-enabled',state.schedule.enabled,'checked');syncValue('shell-schedule-start',state.schedule.start);syncValue('shell-schedule-end',state.schedule.end);syncValue('shell-schedule-theme',state.schedule.theme);syncValue('shell-schedule-language',state.schedule.language);syncValue('shell-schedule-density',state.schedule.density);all('[data-schedule-day]').forEach(input=>{input.checked=state.schedule.weekdays.includes(Number(input.dataset.scheduleDay))});
    syncValue('shell-theme',state.theme);syncValue('shell-density',state.density);syncValue('shell-accent',state.accent);syncValue('shell-font-scale',String(state.fontScale));syncValue('shell-font-scale-output',`${state.fontScale}%`,'textContent');syncValue('shell-tab-edge',state.tabEdge);syncValue('shell-logo-preset',state.logoPreset);syncValue('shell-logo-fit',state.logoFit);
  }
  function updateScheduleStatus(){const status=$('shell-schedule-status');if(!status)return;const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'local timezone';status.textContent=!state.schedule.enabled?`Off. Times use ${zone}.`:scheduleMatches(state.schedule)?`Active now in ${zone}; scheduled values are applied without replacing the base settings.`:`Waiting for the next matching window in ${zone}; base settings remain active.`}
  function saveSchedule(patch){state.schedule={...state.schedule,...patch};save();applyState()}
  const VERIFIED_RECEIPT_SUPPORT=false;
  function validateStatusReceipt(value,current){if(!VERIFIED_RECEIPT_SUPPORT||!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1||value.provenance!=='build-authenticated')return null;const allowed=['schemaVersion','provenance','commit','tag','evidenceHash','evidenceUrl','signature'];if(Object.keys(value).some(key=>!allowed.includes(key)))return null;if(!value.signature||!/^[0-9a-f]{40}$/i.test(value.commit||'')||!/^ding-pbx-console-[a-z0-9._-]+$/i.test(value.tag||'')||!/^[0-9a-f]{64}$/i.test(value.evidenceHash||''))return null;if(typeof value.evidenceUrl!=='string'||!/^https:\/\//i.test(value.evidenceUrl))return null;const release=current?.release;if(!release||release.state!=='available'||current.build?.state!=='validated')return null;if(value.commit.toLowerCase()!==String(release.sourceCommit||'').toLowerCase()||value.tag!==release.tag||value.evidenceUrl!==release.setup.url||value.evidenceHash.toLowerCase()!==release.setup.sha256.toLowerCase())return null;return{schemaVersion:1,provenance:'build-authenticated',commit:value.commit.toLowerCase(),tag:value.tag,evidenceHash:value.evidenceHash.toLowerCase(),evidenceUrl:value.evidenceUrl,signature:value.signature}}
  function readLocalStatusProjection(){try{const parsed=JSON.parse(localStorage.getItem('ding-pbx-site-status-hub-v1')||'null');return parsed&&parsed.version===1?{version:1,session:String(parsed.session||'').slice(0,80),state:String(parsed.state||'waiting'),evidence:String(parsed.evidence||'').slice(0,240),receipt:parsed.receipt&&typeof parsed.receipt==='object'?parsed.receipt:null,time:Number(parsed.time)||0,verified:Boolean(parsed.verified)}:null}catch{return null}}
  function exportSiteState(){const tabExport=tabState?{version:1,order:[...tabState.order],pinned:[...tabState.pinned],activeGroup:tabState.activeGroup,groups:Object.fromEntries(Object.entries(tabState.groups).map(([name,members])=>[name,[...members]])),groupMeta:{...tabState.groupMeta},collapsedGroups:{...(tabState.collapsedGroups||{})},appearance:{...tabState.appearance},locks:Object.keys(tabState.locks).map(id=>({targetId:id,method:'password',duration:'until cleared',locked:true})).concat([{omitted:'Toy-lock credential digests are never exported.'}])}:{version:1,unavailable:'Tab state was not initialized.'};const elementExport={version:1,appearance:{...elementState.appearance},locks:Object.keys(elementState.locks).map(id=>({targetId:id,method:'password',duration:'until cleared',locked:true})).concat([{omitted:'Toy-lock credential digests are never exported.'}])};const status=readLocalStatusProjection();const statusExport=status?{version:1,session:status.session,state:status.state,evidence:status.evidence,receipt:status.receipt||null,time:status.time,verified:status.verified}:{version:1,unavailable:'No local Status Hub projection exists.'};const authEnvelope=localStorage.getItem(AUTH_STORAGE_KEY);const authMetadata=authEntries.length?{version:1,entries:authEntries.map(entry=>({id:entry.id,issuer:entry.issuer,account:entry.account,algorithm:entry.algorithm,digits:entry.digits,period:entry.period,created:entry.created})),secretsOmitted:true}:{version:1,entries:[],entriesUnavailableBecauseLocked:Boolean(authEnvelope),secretsOmitted:true};const tickets=loadJsonList(TICKET_STORAGE_KEY).map(ticket=>({version:ticket.version,number:ticket.number,category:ticket.category,severity:ticket.severity,status:ticket.status,time:ticket.time,description:ticket.description,response:ticket.response,events:Array.isArray(ticket.events)?ticket.events:[]}));let ladderExport=null;try{const saved=JSON.parse(localStorage.getItem(LADDER_STORAGE_KEY)||'null');if(saved)ladderExport={version:1,rung:saved.rung,attempts:saved.attempts,budgetUsed:saved.budgetUsed,budgetWindow:saved.budgetWindow,waitUntil:saved.waitUntil,schoolMode:Boolean(saved.schoolMode),ladderUsed:Boolean(saved.ladderUsed)}}catch{}const payload={schemaVersion:2,encoding:'UTF-8',exported:'site-owned local state',settings:{...state,notifications:state.notifications.map(item=>({...item}))},tabs:tabExport,elements:elementExport,status:statusExport,authenticator:authMetadata,tickets:{version:1,records:tickets},unlockLadder:ladderExport,omitted:{personalVocabulary:'Private mappings and file metadata are omitted.',customLogoImage:'Custom image bytes and file metadata are omitted.',tabLockCredentials:'Tab and element toy-lock credential digests are omitted.',authenticatorSecrets:'Authenticator secrets are omitted from ordinary export.',statusCredentials:'Status Hub credentials and hosted-session data are not supported by this static surface.'},limits:{import:'This redacted JSON is an audit/export record. It is not an import or restore format.',credentials:'No password, OTP secret, or credential digest can be restored from it.'}};download('ding-pbx-site-state.json',JSON.stringify(payload,null,2),'application/json');notify('Site state exported',applyVocabularyText('The versioned redacted local site state download started. Toy-lock credential digests and authenticator secrets remain omitted.'))}

  function initUniversalSettings(){
    $('site-controls-open')?.addEventListener('click',()=>{$('site-controls').showModal();setTimeout(()=>$('shell-settings-search')?.focus(),0)});
    const on=(id,event,handler)=>$(id)?.addEventListener(event,handler);
    on('shell-language','change',event=>update('language',event.target.value));on('shell-english-funny','input',event=>update('englishFunny',Number(event.target.value)));on('shell-cantonese-funny','input',event=>update('cantoneseFunny',Number(event.target.value)));
    on('shell-attention-focus','change',event=>updateAttention('focus',event.target.checked));on('shell-attention-low','change',event=>update('lowMotion',event.target.checked));on('shell-attention-time','change',event=>updateAttention('timeAwareness',event.target.checked));on('shell-attention-one','change',event=>updateAttention('oneThing',event.target.checked));on('shell-attention-task','change',event=>updateAttention('currentTask',event.target.value.slice(0,140)));on('shell-attention-momentum','change',event=>updateAttention('momentum',event.target.checked));
    on('shell-schedule-enabled','change',event=>saveSchedule({enabled:event.target.checked}));on('shell-schedule-start','change',event=>saveSchedule({start:event.target.value}));on('shell-schedule-end','change',event=>saveSchedule({end:event.target.value}));on('shell-schedule-theme','change',event=>saveSchedule({theme:event.target.value}));on('shell-schedule-language','change',event=>saveSchedule({language:event.target.value}));on('shell-schedule-density','change',event=>saveSchedule({density:event.target.value}));all('[data-schedule-day]').forEach(input=>input.addEventListener('change',()=>saveSchedule({weekdays:all('[data-schedule-day]:checked').map(item=>Number(item.dataset.scheduleDay)).sort()})));
    on('shell-theme','change',event=>update('theme',event.target.value));on('shell-density','change',event=>update('density',event.target.value));on('shell-accent','input',event=>update('accent',event.target.value));on('shell-font-scale','input',event=>update('fontScale',Number(event.target.value)));on('shell-tab-edge','change',event=>update('tabEdge',event.target.value));on('shell-logo-preset','change',event=>update('logoPreset',event.target.value));on('shell-logo-fit','change',event=>update('logoFit',event.target.value));
    on('shell-vocabulary-file','change',event=>loadVocabularyFromInput(event,'shell-vocabulary-status'));on('shell-vocabulary-clear','click',()=>clearVocabulary('shell-vocabulary-file','shell-vocabulary-status'));on('shell-logo-file','change',event=>loadLogoFromInput(event,'shell-logo-status'));on('shell-logo-clear','click',()=>clearLogo('shell-logo-file','shell-logo-status'));on('shell-export','click',exportSiteState);
    on('open-schedule-controls','click',()=>{$('site-controls').showModal();setTimeout(()=>$('shell-schedule-enabled')?.focus(),0)});
    syncUniversalControls();syncLocalAssetStatuses();setInterval(()=>applyState(),60000);
  }

  function initCollapsibles(){
    const map={'destination-map-panel':'destinationMap','settings-preview-panel':'settingsPreview','documentation-filters-panel':'documentationFilters','settings-filters-panel':'settingsFilters'};
    Object.entries(map).forEach(([id,key])=>{
      const el=$(id);if(!el)return;
      el.open=!state.collapsed[key];
      el.addEventListener('toggle',()=>{state.collapsed[key]=!el.open;save()});
    });
  }
  function updateFilterStatus(statusId,inputId){
    const el=$(statusId);if(!el)return;
    const value=($(inputId)&&$(inputId).value||'').trim();
    el.textContent=value?' — filtering active':'';
  }

  // Browser-style tab strip --------------------------------------------------
  // The documentation surface is a local site, so its tab model stays in the
  // visitor's browser. It never pretends to manage the installed console.
  function stableElementSlug(value){return String(value||'element').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'element'}
  function ensureStableElementIds(root=document.body){if(!root)return;const page=stableElementSlug(document.body?.dataset.page||'page'),used=new Set();root.querySelectorAll('*').forEach(element=>{if(['SCRIPT','STYLE','LINK','META'].includes(element.tagName))return;let id=element.dataset.elementId;if(!id||used.has(id)){const descriptor=element.id?`id-${element.id}`:element.dataset.tabId?`tab-${element.dataset.tabId}`:element.getAttribute('name')?`name-${element.getAttribute('name')}`:element.getAttribute('aria-label')?`label-${element.getAttribute('aria-label')}`:element.dataset.converterIndex?`converter-${element.dataset.converterIndex}`:`${element.tagName.toLowerCase()}-${[...element.classList].slice(0,2).join('-')}-${element.childElementCount?'container':element.textContent}`;const base=`${page}-${stableElementSlug(descriptor)}`;id=base;let suffix=2;while(used.has(id))id=`${base}-${suffix++}`;element.dataset.elementId=id}used.add(id)});const ids=[...root.querySelectorAll('[data-element-id]')].map(element=>element.dataset.elementId);if(new Set(ids).size!==ids.length)throw new Error('Stable element ID allocation produced a duplicate identifier.')}
  function elementKey(element){ensureStableElementIds();return element?.dataset.elementId||''}
  function elementFromKey(key){if(!key)return null;return [...document.querySelectorAll('[data-element-id]')].find(element=>element.dataset.elementId===key)||null}
  function loadElementState(){try{const parsed=JSON.parse(localStorage.getItem(ELEMENT_STORAGE_KEY)||'null');if(!parsed||parsed.version!==1)return{version:1,appearance:{},locks:{}};const appearance=parsed.appearance&&typeof parsed.appearance==='object'&&!Array.isArray(parsed.appearance)?Object.fromEntries(Object.entries(parsed.appearance).filter(([key,value])=>typeof key==='string'&&key.length<512&&value&&typeof value==='object'&&!Array.isArray(value)&&(/^#[0-9a-f]{6}$/i.test(value.accent||'')||Number.isFinite(Number(value.fontScale))))):{};const locks=parsed.locks&&typeof parsed.locks==='object'&&!Array.isArray(parsed.locks)?Object.fromEntries(Object.entries(parsed.locks).filter(([key,value])=>typeof key==='string'&&key.length<512&&typeof value==='string'&&/^[0-9a-f]{64}$/i.test(value))):{};return{version:1,appearance,locks}}catch{}return{version:1,appearance:{},locks:{}}}
  function saveElementState(){const before=elementHistorySnapshot?JSON.parse(JSON.stringify(elementHistorySnapshot)):null;localStorage.setItem(ELEMENT_STORAGE_KEY,JSON.stringify(elementState));historyRecord('appearance or lock changed','elements',before,elementState);elementHistorySnapshot=JSON.parse(JSON.stringify(elementState))}
  function applyElementPresentation(){ensureStableElementIds();all('[data-local-appearance]').forEach(element=>{element.removeAttribute('data-local-appearance');element.style.removeProperty('--element-accent');element.style.removeProperty('--element-font-scale')});all('[data-locked="true"]').forEach(element=>{element.removeAttribute('data-locked');if(element.dataset.lockOriginalDisabled===undefined)element.removeAttribute('aria-disabled');else{element.setAttribute('aria-disabled',element.dataset.lockOriginalDisabled);delete element.dataset.lockOriginalDisabled}if(element.dataset.lockGeneratedLabel==='true'){element.removeAttribute('aria-label');delete element.dataset.lockGeneratedLabel} else if(element.dataset.lockOriginalLabel!==undefined){element.setAttribute('aria-label',element.dataset.lockOriginalLabel);delete element.dataset.lockOriginalLabel}});Object.entries(elementState.appearance).forEach(([key,value])=>{const element=elementFromKey(key);if(!element)return;const accent=/^#[0-9a-f]{6}$/i.test(value.accent||'')?value.accent:'';const scale=Math.max(80,Math.min(140,Number(value.fontScale)||100))/100;if(accent||value.fontScale){element.dataset.localAppearance='true';if(accent)element.style.setProperty('--element-accent',accent);if(value.fontScale)element.style.setProperty('--element-font-scale',String(scale))}});Object.keys(elementState.locks).forEach(key=>{const element=elementFromKey(key);if(!element)return;element.dataset.locked='true';if(element.dataset.lockOriginalDisabled===undefined&&element.hasAttribute('aria-disabled'))element.dataset.lockOriginalDisabled=element.getAttribute('aria-disabled');element.setAttribute('aria-disabled','true');if(element.dataset.lockOriginalLabel===undefined&&element.hasAttribute('aria-label'))element.dataset.lockOriginalLabel=element.getAttribute('aria-label');const base=element.dataset.lockOriginalLabel||element.getAttribute('aria-label')||element.textContent?.trim().slice(0,80)||'Element';if(!element.hasAttribute('aria-label'))element.dataset.lockGeneratedLabel='true';element.setAttribute('aria-label',`${base}, locked. Use the context menu or keyboard context-menu key to unlock.`)})}
  function openElementAppearance(element){const key=elementKey(element);if(!key)return;if(elementState.locks[key]){openElementLock(element,'element-appearance');return}const dialog=$('tab-appearance-dialog');if(!dialog)return;dialog.dataset.elementKey=key;delete dialog.dataset.tabId;const current=elementState.appearance[key]||{};$('tab-appearance-title').textContent='Edit element appearance';$('tab-appearance-accent').value=/^#[0-9a-f]{6}$/i.test(current.accent||'')?current.accent:'#82D9A5';$('tab-appearance-scale').value=String(current.fontScale||100);$('tab-appearance-scale-output').textContent=`${current.fontScale||100}%`;dialog.showModal()}
  function openElementLock(element,pendingAction=''){const key=elementKey(element);if(!key)return;const dialog=$('tab-lock-dialog');if(!dialog)return;dialog.dataset.elementKey=key;delete dialog.dataset.tabId;dialog.dataset.pendingAction=pendingAction;$('tab-lock-title').textContent=elementState.locks[key]?(pendingAction?'Verify element lock':'Unlock element'):'Lock element';$('tab-lock-target').textContent='This is a local browser toy lock for the selected element. It is not encryption. Clear this site storage to reset it.';$('tab-lock-password').value='';$('tab-lock-password-confirm').value='';$('tab-lock-message').textContent='';dialog.showModal();setTimeout(()=>$('tab-lock-password')?.focus(),0)}
  function lockedElementForNode(node){ensureStableElementIds();let current=node instanceof Element?node:node?.parentElement;while(current&&current!==document.body){const id=current.dataset.elementId;if(id&&elementState.locks[id])return current;current=current.parentElement}return null}
  function lockedTabForNode(node){const link=node instanceof Element?node?.closest('#site-nav a[data-tab-id]'):null;return link&&tabState?.locks?.[link.dataset.tabId]?link:null}
  function initLockedActivationGuard(){const guard=event=>{if(event.defaultPrevented||event.button===2)return;const element=lockedElementForNode(event.target),tab=lockedTabForNode(event.target),keyboard=event.type==='keydown'&&(event.key==='Enter'||event.key===' '||event.key==='Spacebar');if(!element&&!tab)return;if(event.type==='keydown'&&!keyboard)return;if(!['pointerdown','click','beforeinput','input','change','submit','keydown'].includes(event.type))return;event.preventDefault();event.stopPropagation();localStorage.setItem('ding-pbx-lockout-v1',JSON.stringify({version:1,targetId:tab?`tab:${tab.dataset.tabId}`:element.dataset.elementId,attempts:3,created:Date.now(),waitUntil:Date.now()+30000}));if(tab)openTabLock(tab.dataset.tabId);else openElementLock(element,'unlock-only')};['pointerdown','click','beforeinput','input','change','submit','keydown'].forEach(type=>document.addEventListener(type,guard,true))}

  function tabIdForLink(link){
    const raw=(link.getAttribute('href')||'').split('#')[0]||'index.html';
    return raw.replace(/^\.\//,'').toLowerCase();
  }
  function tabLinks(){return all('#site-nav a').map(link=>({id:tabIdForLink(link),link,label:link.dataset.tabLabel||link.textContent.trim(),href:link.getAttribute('href')||'index.html'}))}
  function defaultTabState(items){
    const ids=items.map(item=>item.id),groups={Primary:[...ids]};
    return {version:1,order:[...ids],closed:[],pinned:[],groups,groupMeta:{Primary:{color:'#82D9A5'}},collapsedGroups:{},activeGroup:'Primary',appearance:{},locks:{}};
  }
  function loadTabState(items){
    const fallback=defaultTabState(items);
    try{
      const parsed=JSON.parse(localStorage.getItem(TAB_STORAGE_KEY)||'null');
      if(!parsed||parsed.version!==1||!Array.isArray(parsed.order)||!Array.isArray(parsed.pinned)||!parsed.groups||typeof parsed.groups!=='object')return fallback;
      const valid=new Set(items.map(item=>item.id));
      const closed=[...new Set(Array.isArray(parsed.closed)?parsed.closed.filter(id=>valid.has(id)):[])];const order=[...new Set(parsed.order.filter(id=>valid.has(id)&&!closed.includes(id)))];items.forEach(item=>{if(!order.includes(item.id)&&!closed.includes(item.id))order.push(item.id)});
      const pinned=[...new Set(parsed.pinned.filter(id=>valid.has(id)))];
      const groups={};Object.entries(parsed.groups).forEach(([name,members])=>{if(typeof name==='string'&&name.trim()&&Array.isArray(members))groups[name.trim()]=[...new Set(members.filter(id=>valid.has(id)))];});
      if(!Object.keys(groups).length)Object.assign(groups,fallback.groups);
      const assigned=new Set(Object.values(groups).flat());order.forEach(id=>{if(!assigned.has(id))groups.Primary=(groups.Primary||[]).concat(id)});
      const appearance=parsed.appearance&&typeof parsed.appearance==='object'&&!Array.isArray(parsed.appearance)?Object.fromEntries(Object.entries(parsed.appearance).filter(([key,value])=>typeof key==='string'&&key.length<512&&value&&typeof value==='object'&&!Array.isArray(value)&&(/^#[0-9a-f]{6}$/i.test(value.accent||'')||Number.isFinite(Number(value.fontScale))))):{};
      const locks=parsed.locks&&typeof parsed.locks==='object'&&!Array.isArray(parsed.locks)?Object.fromEntries(Object.entries(parsed.locks).filter(([key,value])=>typeof key==='string'&&key.length<512&&typeof value==='string'&&/^[0-9a-f]{64}$/i.test(value))):{};
      const collapsedGroups=parsed.collapsedGroups&&typeof parsed.collapsedGroups==='object'&&!Array.isArray(parsed.collapsedGroups)?Object.fromEntries(Object.keys(groups).map(name=>[name,Boolean(parsed.collapsedGroups[name])])):{};
      const groupMeta=parsed.groupMeta&&typeof parsed.groupMeta==='object'&&!Array.isArray(parsed.groupMeta)?Object.fromEntries(Object.keys(groups).map(name=>[name,{color:/^#[0-9a-f]{6}$/i.test(parsed.groupMeta[name]?.color||'')?parsed.groupMeta[name].color:'#82D9A5'}])):Object.fromEntries(Object.keys(groups).map(name=>[name,{color:'#82D9A5'}]));
      return {version:1,order,closed,pinned,groups,groupMeta,collapsedGroups,activeGroup:typeof parsed.activeGroup==='string'&&groups[parsed.activeGroup]?parsed.activeGroup:Object.keys(groups)[0],appearance,locks};
    }catch{return fallback}
  }
  function saveTabState(){if(tabState){const before=tabHistorySnapshot?JSON.parse(JSON.stringify(tabHistorySnapshot)):null;localStorage.setItem(TAB_STORAGE_KEY,JSON.stringify(tabState));historyRecord('tabs changed','tabs',before,tabState);tabHistorySnapshot=JSON.parse(JSON.stringify(tabState))}}
  function tabItems(){
    if(!tabState)return tabLinks();
    const links=new Map(tabLinks().map(item=>[item.id,item]));
     const ordered=tabState.order.filter(id=>!(tabState.closed||[]).includes(id)).map(id=>links.get(id)).filter(Boolean);
    return [...ordered.filter(item=>tabState.pinned.includes(item.id)),...ordered.filter(item=>!tabState.pinned.includes(item.id))];
  }
  function tabGroupFor(id){if(!tabState)return 'Primary';for(const [name,members] of Object.entries(tabState.groups))if(members.includes(id))return name;return 'Primary'}
  function setTabGroup(id,name){
    const group=(name||'Primary').trim()||'Primary';if(!tabState.groups[group])tabState.groups[group]=[];if(!tabState.groupMeta[group])tabState.groupMeta[group]={color:'#82D9A5'};
    Object.values(tabState.groups).forEach(members=>{const index=members.indexOf(id);if(index!==-1)members.splice(index,1)});
    tabState.groups[group].push(id);tabState.activeGroup=group;saveTabState();renderTabManager();
  }
  function tabSearchItems(items,inputId,done){
    const query=$(inputId)?.value.trim()||'';
    if(!query){done(items);return}
    if(!regexSearchEnabled(inputId,query)){done(items.filter(item=>plainTextMatches(`${item.label} ${item.id} ${tabGroupFor(item.id)}`,query)));return}
    const key=`tabs:${inputId}`,run=runRegexWorker(key,regexState.get(inputId),items.map(item=>({id:item.id,text:`${item.label} ${item.id} ${tabGroupFor(item.id)}`.slice(0,4096)})));
    done([]);
    run.promise.then(result=>{if(regexRunCurrent(key,run))done(items.filter(item=>result.matchedIds.includes(item.id)))}).catch(()=>{if(regexRunCurrent(key,run))done([])});
  }
  function tabRowMarkup(item,showActions=true){
    const pinned=tabState?.pinned.includes(item.id),locked=Boolean(tabState?.locks?.[item.id]),groups=Object.keys(tabState?.groups||{Primary:[]});
    return `<article class="tab-manager-row" data-tab-id="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.id)} · ${escapeHtml(tabGroupFor(item.id))}${pinned?' · Pinned':''}${locked?' · Locked':''}</small></div>${showActions?`<div class="tab-manager-actions"><button type="button" class="text-button" data-tab-action="move-up" data-tab-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.label)} earlier">↑</button><button type="button" class="text-button" data-tab-action="move-down" data-tab-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.label)} later">↓</button><button type="button" class="text-button" data-tab-action="toggle-pin" data-tab-id="${escapeHtml(item.id)}">${pinned?'Unpin':'Pin'}</button><label class="tab-group-picker">Group<select data-tab-group-for="${escapeHtml(item.id)}" aria-label="Group for ${escapeHtml(item.label)}">${groups.map(group=>`<option value="${escapeHtml(group)}" ${tabGroupFor(item.id)===group?'selected':''}>${escapeHtml(group)}</option>`).join('')}</select></label><button type="button" class="text-button" data-tab-action="appearance" data-tab-id="${escapeHtml(item.id)}">Edit appearance</button><button type="button" class="text-button" data-tab-action="lock" data-tab-id="${escapeHtml(item.id)}">${locked?'Unlock':'Lock'}</button></div>`:''}</article>`;
  }
  function renderTabManager(){
    if(!$('tab-manager-dialog')||!tabState)return;ensureStableElementIds();
    const generation=++tabRenderGeneration,items=tabItems(),groupNames=Object.keys(tabState.groups),active=tabState.activeGroup&&tabState.groups[tabState.activeGroup]?tabState.activeGroup:groupNames[0];tabState.activeGroup=active;
    const renderList=(id,rows,message='No tabs match this search.')=>{const target=$(id);if(target)target.innerHTML=rows.length?rows.map(item=>tabRowMarkup(item)).join(''):`<p class="empty-state">${escapeHtml(message)}</p>`};
    tabSearchItems(items,'tab-strip-search',rows=>{if(generation===tabRenderGeneration)renderList('tab-strip-results',rows)});
    tabSearchItems(items.filter(item=>tabGroupFor(item.id)===active),'tab-group-search',rows=>{if(generation===tabRenderGeneration){const searchOpen=Boolean($('tab-group-search')?.value.trim()),collapsed=Boolean(tabState.collapsedGroups[active]);renderList('tab-group-results',collapsed&&!searchOpen?[]:rows,collapsed&&!searchOpen?'This group is collapsed. Search within it to reveal matching tabs.':'No tabs match this search.')}});
    const groups=groupNames.map(name=>({id:`group:${name}`,label:name}));
    tabSearchItems(groups,'tab-groups-search',rows=>{if(generation!==tabRenderGeneration)return;const target=$('tab-groups-results');if(target)target.innerHTML=rows.length?rows.map(group=>`<article class="tab-manager-row"><div><strong>${escapeHtml(group.label)}</strong><small>${tabState.groups[group.label].length} tab${tabState.groups[group.label].length===1?'':'s'} · ${tabState.collapsedGroups[group.label]?'Collapsed':'Expanded'}</small></div><div class="tab-manager-actions"><button type="button" class="text-button" data-tab-action="select-group" data-group="${escapeHtml(group.label)}">Open group</button><button type="button" class="text-button" data-tab-action="toggle-group" data-group="${escapeHtml(group.label)}" aria-expanded="${String(!tabState.collapsedGroups[group.label])}">${tabState.collapsedGroups[group.label]?'Expand':'Collapse'}</button></div></article>`).join(''):'<p class="empty-state">No groups match this search.</p>'});
    tabSearchItems(items,'tab-master-search',rows=>{if(generation===tabRenderGeneration)renderList('tab-master-results',rows)});
    const select=$('tab-group-select');if(select){select.innerHTML=groupNames.map(name=>`<option value="${escapeHtml(name)}" ${name===active?'selected':''}>${escapeHtml(name)}</option>`).join('');select.value=active}
    const status=$('tab-manager-status');if(status)status.textContent=`${items.length} tabs, ${tabState.pinned.length} pinned, ${groupNames.length} group${groupNames.length===1?'':'s'}. Changes stay in this browser.`;
    initSearchableMenus();
  }
  function applyTabPresentation(){
    const nav=$('site-nav');if(!nav)return;
    const items=tabItems(),links=new Map(tabLinks().map(item=>[item.id,item]));
    items.forEach(item=>{
      const link=links.get(item.id)?.link;if(!link)return;
      if(!link.dataset.tabLabel)link.dataset.tabLabel=item.label;
      const selected=Boolean(link.getAttribute('aria-current'));
      link.innerHTML=`<span class="tab-icon" aria-hidden="true">${item.id==='index.html'?'⌂':'▸'}</span><span class="tab-label">${escapeHtml(item.label)}</span>${tabState.pinned.includes(item.id)?'<span class="tab-pin" aria-label="Pinned">●</span>':''}`;
      link.dataset.tabId=item.id;link.classList.add('site-tab');link.removeAttribute('role');link.removeAttribute('aria-selected');link.removeAttribute('aria-controls');link.setAttribute('aria-label',`${item.label}${tabState.pinned.includes(item.id)?', pinned':''}${tabState.locks[item.id]?', locked':''}`);link.dataset.pinned=String(tabState.pinned.includes(item.id));link.classList.toggle('tab-locked',Boolean(tabState.locks[item.id]));link.dataset.locked=String(Boolean(tabState.locks[item.id]));if(tabState.locks[item.id])link.setAttribute('aria-disabled','true');else link.removeAttribute('aria-disabled');
      const appearance=tabState.appearance[item.id];if(appearance&&/^#[0-9a-f]{6}$/i.test(appearance.accent))link.style.setProperty('--tab-accent',appearance.accent);else link.style.removeProperty('--tab-accent');if(appearance?.fontScale)link.style.fontSize=`${Math.max(80,Math.min(140,Number(appearance.fontScale)||100))/100}em`;else link.style.removeProperty('font-size');
    });
    items.forEach(item=>{const link=links.get(item.id)?.link;if(link)nav.appendChild(link)});
    nav.setAttribute('aria-orientation',state.tabEdge==='left'||state.tabEdge==='right'?'vertical':'horizontal');
  }
  function initGroupEditor(){const anchor=$('tab-new-group-button');if(!anchor||$('tab-group-editor'))return;anchor.insertAdjacentHTML('afterend','<div id="tab-group-editor" class="inline-controls"><label>Active group name<input id="tab-group-name" type="text" maxlength="48"></label><label>Colour<input id="tab-group-color" type="color" value="#82D9A5"></label><button id="tab-group-rename" type="button" class="text-button">Rename</button><button id="tab-group-delete" type="button" class="danger-button">Delete</button><button id="tab-group-up" type="button" class="text-button">Move up</button><button id="tab-group-down" type="button" class="text-button">Move down</button></div>');const sync=()=>{const group=tabState?.activeGroup; if(group){$('tab-group-name').value=group;$('tab-group-color').value=tabState.groupMeta?.[group]?.color||'#82D9A5'}};sync();$('tab-group-rename').addEventListener('click',()=>{const old=tabState.activeGroup,name=$('tab-group-name').value.trim();if(!name||name===old||tabState.groups[name])return;tabState.groups[name]=tabState.groups[old];delete tabState.groups[old];tabState.groupMeta[name]=tabState.groupMeta[old]||{color:'#82D9A5'};delete tabState.groupMeta[old];tabState.collapsedGroups[name]=tabState.collapsedGroups[old]||false;delete tabState.collapsedGroups[old];tabState.activeGroup=name;saveTabState();renderTabManager();sync()});$('tab-group-color').addEventListener('input',()=>{const group=tabState.activeGroup;tabState.groupMeta[group]={color:$('tab-group-color').value};saveTabState()});$('tab-group-delete').addEventListener('click',()=>{const group=tabState.activeGroup;if(!group||Object.keys(tabState.groups).length<2)return;const target=Object.keys(tabState.groups).find(name=>name!==group);tabState.groups[target].push(...tabState.groups[group]);delete tabState.groups[group];delete tabState.groupMeta[group];delete tabState.collapsedGroups[group];tabState.activeGroup=target;saveTabState();renderTabManager();sync()});const moveGroup=direction=>{const names=Object.keys(tabState.groups),index=names.indexOf(tabState.activeGroup),next=index+direction;if(index<0||next<0||next>=names.length)return;const reordered={};[names[index],names[next]]=[names[next],names[index]];names.forEach(name=>reordered[name]=tabState.groups[name]);tabState.groups=reordered;saveTabState();renderTabManager();sync()};$('tab-group-up').addEventListener('click',()=>moveGroup(-1));$('tab-group-down').addEventListener('click',()=>moveGroup(1))}
  function initTabBulkClose(){const dialog=$('tab-manager-dialog');if(!dialog||$('tab-bulk-close'))return;dialog.insertAdjacentHTML('afterbegin','<section id="tab-bulk-close" class="tab-manager-section"><h3>Bulk close visible tab routes</h3><div class="search-composite"><label class="sr-only" for="tab-bulk-close-search">Bulk close search</label><input id="tab-bulk-close-search" type="search" placeholder="Text or regex pattern"><button class="regex-trigger" type="button" data-regex-for="tab-bulk-close-search">.*</button></div><label><input id="tab-bulk-include-protected" type="checkbox"> Include pinned or locked routes</label><p id="tab-bulk-preview" class="plain-note">Enter text to preview affected routes.</p><div class="builder-buttons"><button id="tab-bulk-containing" type="button" class="danger-button">Close containing text</button><button id="tab-bulk-not-containing" type="button" class="danger-button">Close not containing text</button></div></section>');const matches=()=>{const query=$('tab-bulk-close-search').value.trim(),include=$('tab-bulk-include-protected').checked,items=tabItems().filter(item=>include||(!tabState.pinned.includes(item.id)&&!tabState.locks[item.id]));if(!query)return[];if(regexSearchEnabled('tab-bulk-close-search',query)){try{return items.filter(item=>new RegExp(regexState.get('tab-bulk-close-search').pattern,regexState.get('tab-bulk-close-search').flags).test(item.label))}catch{return[]}}return items.filter(item=>item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))};const update=()=>{const count=matches().length;text('tab-bulk-preview',`${count} route${count===1?'':'s'} would close. Pinned and locked routes are protected by default.`)};$('tab-bulk-close-search').addEventListener('input',update);$('tab-bulk-include-protected').addEventListener('change',update);document.addEventListener('click',event=>{const action=event.target.closest('#tab-bulk-containing,#tab-bulk-not-containing')?.id;if(!action)return;const query=$('tab-bulk-close-search').value.trim();if(!query)return;const include=$('tab-bulk-include-protected').checked,items=tabItems().filter(item=>include||(!tabState.pinned.includes(item.id)&&!tabState.locks[item.id])),matched=new Set(matches().map(item=>item.id)),closing=action==='tab-bulk-containing'?items.filter(item=>matched.has(item.id)):items.filter(item=>!matched.has(item.id));if(!closing.length||!window.confirm(`Close ${closing.length} route${closing.length===1?'':'s'}? Protected routes remain unless explicitly included.`))return;tabState.order=tabState.order.filter(id=>!closing.some(item=>item.id===id));Object.values(tabState.groups).forEach(group=>{for(const item of closing){const index=group.indexOf(item.id);if(index>=0)group.splice(index,1)}});saveTabState();applyTabPresentation();renderTabManager();update()})}
  function openTabManager(){const dialog=$('tab-manager-dialog');if(!dialog)return;initGroupEditor();initTabBulkClose();renderTabManager();dialog.showModal();setTimeout(()=>$('tab-strip-search')?.focus(),0)}
  async function tabDigest(value){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
  function openTabLock(id,pendingAction=''){const dialog=$('tab-lock-dialog');if(!dialog)return;dialog.dataset.tabId=id;delete dialog.dataset.elementKey;dialog.dataset.pendingAction=pendingAction;$('tab-lock-title').textContent=tabState.locks[id]?(pendingAction?'Verify tab lock':'Unlock tab'):'Lock tab';$('tab-lock-target').textContent=`This is a local browser lock for ${tabLinks().find(item=>item.id===id)?.label||id}. It is not encryption. Clear this site's browser storage to reset it.`;$('tab-lock-password').value='';$('tab-lock-password-confirm').value='';$('tab-lock-message').textContent='';dialog.showModal();setTimeout(()=>$('tab-lock-password')?.focus(),0)}
  function openTabAppearance(id){if(tabState.locks[id]){openTabLock(id,'tab-appearance');return}const dialog=$('tab-appearance-dialog');if(!dialog)return;dialog.dataset.tabId=id;delete dialog.dataset.elementKey;const current=tabState.appearance[id]||{};$('tab-appearance-title').textContent=`Edit appearance: ${tabLinks().find(item=>item.id===id)?.label||id}`;$('tab-appearance-accent').value=/^#[0-9a-f]{6}$/i.test(current.accent||'')?current.accent:'#82D9A5';$('tab-appearance-scale').value=String(current.fontScale||100);$('tab-appearance-scale-output').textContent=`${current.fontScale||100}%`;dialog.showModal();setTimeout(()=>$('tab-appearance-accent')?.focus(),0)}
  function resetTabAppearance(id){if(tabState.locks[id]){$('tab-appearance-dialog')?.close();openTabLock(id,'tab-appearance-reset');return}delete tabState.appearance[id];saveTabState();applyTabPresentation();renderTabManager()}
  function resetElementAppearance(key){if(elementState.locks[key]){$('tab-appearance-dialog')?.close();openElementLock(elementFromKey(key),'element-appearance-reset');return}delete elementState.appearance[key];saveElementState();applyElementPresentation()}
  function initSiteTabs(){
    const nav=$('site-nav');if(!nav)return;const items=tabLinks();items.forEach(item=>{if(!item.link.dataset.tabLabel)item.link.dataset.tabLabel=item.label});tabState=loadTabState(items);elementState=loadElementState();tabHistorySnapshot=JSON.parse(JSON.stringify(tabState));elementHistorySnapshot=JSON.parse(JSON.stringify(elementState));nav.insertAdjacentHTML('beforebegin','<button id="tab-manager-open" type="button" class="menu-search-trigger" aria-haspopup="dialog">Manage tabs</button>');nav.insertAdjacentHTML('afterend',tabManagerMarkup());document.body.insertAdjacentHTML('beforeend',tabLockMarkup()+tabAppearanceMarkup());ensureStableElementIds();applyTabPresentation();applyElementPresentation();$('tab-manager-open')?.addEventListener('click',openTabManager);
    nav.addEventListener('keydown',event=>{const current=event.target.closest('a[data-tab-id]');if(!current)return;const links=tabItems().map(item=>item.link),vertical=state.tabEdge==='left'||state.tabEdge==='right',forward=vertical?event.key==='ArrowDown':event.key==='ArrowRight',back=vertical?event.key==='ArrowUp':event.key==='ArrowLeft';if(!forward&&!back&&event.key!=='Home'&&event.key!=='End')return;event.preventDefault();const index=links.indexOf(current),next=event.key==='Home'?links[0]:event.key==='End'?links[links.length-1]:links[(index+(forward?1:-1)+links.length)%links.length];next?.focus()});
    nav.addEventListener('click',event=>{const link=event.target.closest('a[data-tab-id]');if(!link)return;const id=link.dataset.tabId;if(tabState.locks[id]){event.preventDefault();openTabLock(id)}});
    ['tab-strip-search','tab-group-search','tab-groups-search','tab-master-search'].forEach(id=>$(id)?.addEventListener('input',renderTabManager));
    $('tab-group-select')?.addEventListener('change',event=>{tabState.activeGroup=event.target.value;saveTabState();renderTabManager()});
    $('tab-new-group-button')?.addEventListener('click',()=>{const name=$('tab-new-group')?.value.trim();if(!name)return;if(!tabState.groups[name])tabState.groups[name]=[];tabState.activeGroup=name;saveTabState();$('tab-new-group').value='';renderTabManager()});
    $('tab-manager-dialog')?.addEventListener('click',event=>{const control=event.target.closest('[data-tab-action]'),action=control?.dataset.tabAction,id=control?.dataset.tabId,group=control?.dataset.group;if(action==='select-group'){tabState.activeGroup=group;saveTabState();renderTabManager();return}if(action==='toggle-group'&&group){tabState.collapsedGroups[group]=!tabState.collapsedGroups[group];saveTabState();renderTabManager();return}if(!action||!id)return;if(action==='toggle-pin'){const index=tabState.pinned.indexOf(id);if(index===-1)tabState.pinned.push(id);else tabState.pinned.splice(index,1)}else if(action==='move-up'||action==='move-down'){const index=tabState.order.indexOf(id),next=action==='move-up'?index-1:index+1;if(index>=0&&next>=0&&next<tabState.order.length)[tabState.order[index],tabState.order[next]]=[tabState.order[next],tabState.order[index]]}else if(action==='appearance'){openTabAppearance(id);return}else if(action==='lock'){openTabLock(id);return}else return;saveTabState();applyTabPresentation();renderTabManager()});
    $('tab-manager-dialog')?.addEventListener('change',event=>{const id=event.target.dataset.tabGroupFor;if(id)setTabGroup(id,event.target.value)});
    $('tab-appearance-scale')?.addEventListener('input',event=>{$('tab-appearance-scale-output').textContent=`${event.target.value}%`});
    $('tab-appearance-save')?.addEventListener('click',()=>{const dialog=$('tab-appearance-dialog'),value={accent:$('tab-appearance-accent').value,fontScale:Number($('tab-appearance-scale').value)};if(dialog.dataset.elementKey){if(elementState.locks[dialog.dataset.elementKey]){dialog.close();openElementLock(elementFromKey(dialog.dataset.elementKey),'element-appearance');return}elementState.appearance[dialog.dataset.elementKey]=value;saveElementState();applyElementPresentation()}else{const id=dialog.dataset.tabId;if(tabState.locks[id]){dialog.close();openTabLock(id,'tab-appearance');return}tabState.appearance[id]=value;saveTabState();applyTabPresentation()}dialog.close();notify('Appearance saved','The selected local surface appearance is stored in this browser.')});
    $('tab-appearance-reset')?.addEventListener('click',()=>{const dialog=$('tab-appearance-dialog');if(dialog.dataset.elementKey){resetElementAppearance(dialog.dataset.elementKey);if(!elementState.locks[dialog.dataset.elementKey])dialog.close()}else{const id=dialog.dataset.tabId;resetTabAppearance(id);if(!tabState.locks[id])dialog.close()}});
    $('tab-lock-save')?.addEventListener('click',async()=>{const dialog=$('tab-lock-dialog'),id=dialog.dataset.tabId,key=dialog.dataset.elementKey,password=$('tab-lock-password').value,confirmPassword=$('tab-lock-password-confirm').value,existing=key?elementState.locks[key]:tabState.locks[id];if(!password){$('tab-lock-message').textContent='Enter a value for this local toy lock.';return}if(!existing&&password!==confirmPassword){$('tab-lock-message').textContent='The two values do not match.';return}if(existing){const digest=await tabDigest(password);if(digest!==existing){$('tab-lock-message').textContent='That value did not match. Clear this site storage to recover the toy lock.';return}if(key)delete elementState.locks[key];else delete tabState.locks[id]}else if(key)elementState.locks[key]=await tabDigest(password);else tabState.locks[id]=await tabDigest(password);const pending=dialog.dataset.pendingAction||'';delete dialog.dataset.pendingAction;saveElementState();saveTabState();applyTabPresentation();applyElementPresentation();renderTabManager();dialog.close();if(pending==='element-appearance')openElementAppearance(elementFromKey(key));if(pending==='tab-appearance')openTabAppearance(id);if(pending==='element-appearance-reset'){delete elementState.appearance[key];saveElementState();applyElementPresentation()}if(pending==='tab-appearance-reset'){delete tabState.appearance[id];saveTabState();applyTabPresentation()}});
    $('tab-lock-reset')?.addEventListener('click',()=>{const dialog=$('tab-lock-dialog'),id=dialog.dataset.tabId,key=dialog.dataset.elementKey,existing=key?elementState.locks[key]:tabState.locks[id];if(!existing){dialog.close();return}dialog.dataset.pendingAction='remove';$('tab-lock-title').textContent=key?'Remove element lock':'Remove tab lock';$('tab-lock-message').textContent='Enter the existing value, then choose Save to remove this lock. Clear this site storage is the recovery route if the value is forgotten.'});initLockedActivationGuard();
  }


  function initNavigation(){
    const button=$('nav-toggle'),menu=$('site-nav');if(!button||!menu)return;
    const close=()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false')};
    button.onclick=()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('a')?.focus()};
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault();openPalette()}});
    menu.addEventListener('click',close);
  }
  function initReveals(){const items=all('.reveal');if(reduceMotion()||!('IntersectionObserver'in window)){items.forEach(item=>item.classList.add('visible'));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});items.forEach(item=>observer.observe(item))}

  function renderDestinationResults(matches,query,message=''){
    const grid=$('destination-grid');if(!grid)return;
    const pageSize=8,pageCount=Math.max(1,Math.ceil(matches.length/pageSize));destinationPage=Math.min(destinationPage,pageCount-1);
    const shown=matches.slice(destinationPage*pageSize,(destinationPage+1)*pageSize);
    grid.innerHTML=shown.map(item=>`<article class="destination-card reveal" id="destination-${item.id}" tabindex="-1"><span class="destination-icon" aria-hidden="true">${item.icon}</span><span class="card-kicker">${escapeHtml(item.group)}</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><a class="text-button" href="${BASE}docs/${item.article}.html">Read article <span aria-hidden="true">→</span></a></article>`).join('')||(message?`<p class="empty-state">${escapeHtml(message)}</p>`:`<p class="empty-state">${escapeHtml(copyText('emptyDestinations'))}</p>`);
    if($('destination-count'))$('destination-count').textContent=message?message:`${matches.length} destination${matches.length===1?'':'s'} · page ${destinationPage+1} of ${pageCount}`;
    if($('destination-pagination'))$('destination-pagination').innerHTML=message?'':Array.from({length:pageCount},(_,index)=>`<button type="button" data-page="${index}" ${index===destinationPage?'aria-current="page"':''}>${index+1}</button>`).join('');
    initReveals();updateDestinationMap(matches);applyVocabulary();updateFilterStatus('documentation-filter-status','feature-search');lastDocumentationMatches=matches;lastDocumentationQuery=query;updateDocumentationExport();
  }
  function renderDestinations(query=''){
    const grid=$('destination-grid');if(!grid)return;
    if(regexSearchEnabled('feature-search',query)){
      grid.innerHTML='<p class="empty-state">Checking this pattern in a bounded local worker…</p>';
      if($('destination-pagination'))$('destination-pagination').innerHTML='';
      if($('destination-count'))$('destination-count').textContent='Checking pattern locally…';
      updateDestinationMap([]);
      lastDocumentationMatches=[];lastDocumentationQuery=query;updateDocumentationExport();
      const run=runRegexWorker('search:feature-search',regexState.get('feature-search'),DESTINATIONS.map(item=>({id:item.id,text:`${item.name} ${item.group} ${item.description}`.slice(0,4096)})));
      run.promise.then(result=>{if(!regexRunCurrent('search:feature-search',run))return;const ids=new Set(result.matchedIds);renderDestinationResults(DESTINATIONS.filter(item=>ids.has(item.id)),query)}).catch(error=>{if(!regexRunCurrent('search:feature-search',run))return;renderDestinationResults([],query,`Pattern evaluation unavailable: ${error.message}`)});
      return;
    }
    renderDestinationResults(DESTINATIONS.filter(item=>!query||`${item.name} ${item.group} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),query);
  }
  let lastDocumentationMatches=[],lastDocumentationQuery='';
  function documentationExportRows(){return lastDocumentationMatches.map(item=>({id:item.id,name:item.name,group:item.group,description:item.description,article:item.article}))}
  function updateDocumentationExport(){
    const select=$('doc-export-format');if(!select)return;
    const rows=documentationExportRows(),formats=suitableFormats(rows),previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    if(formats.includes(previous))select.value=previous;
    const loss=describeLoss(rows,select.value||formats[0]);
    if($('doc-export-loss'))$('doc-export-loss').textContent=loss.join(' ');
  }
  function initDocumentationExport(){
    const select=$('doc-export-format'),button=$('doc-export-button');if(!select||!button)return;
    select.addEventListener('change',()=>{const loss=describeLoss(documentationExportRows(),select.value);if($('doc-export-loss'))$('doc-export-loss').textContent=loss.join(' ')});
    button.addEventListener('click',()=>{
      const rows=documentationExportRows();if(!rows.length)return;
      const format=select.value||'json',text=exportRows({rows,format,table:'destination'});
      const range=`${slugForFilename(lastDocumentationQuery)}-${rows.length}-of-${DESTINATIONS.length}`;
      download(exportFilename('ding-pbx-destinations',format,range),text,EXPORT_MIME[format]);
      notify('Destinations exported',applyVocabularyText(`Exported ${rows.length} of ${DESTINATIONS.length} destinations as ${format.toUpperCase()}, covering the current search ("${lastDocumentationQuery||'no filter'}").`));
    });
  }
  function plainTextMatches(text,query){return !query||String(text).toLocaleLowerCase().includes(String(query).toLocaleLowerCase())}
  function filter(selector,query,target){
    const items=all(selector);if(!regexSearchEnabled(target,query)){items.forEach(item=>{item.hidden=!plainTextMatches(item.dataset.search||item.textContent,query)});return}
    items.forEach((item,index)=>{item.hidden=true;item.dataset.regexStableId=item.dataset.regexStableId||`${target}:${item.id||index}`});
    const key=`search:${target}`,run=runRegexWorker(key,regexState.get(target),items.map(item=>({id:item.dataset.regexStableId,text:(item.dataset.search||item.textContent||'').slice(0,4096)})));
    run.promise.then(result=>{if(!regexRunCurrent(key,run))return;const ids=new Set(result.matchedIds);items.forEach(item=>{item.hidden=!ids.has(item.dataset.regexStableId)});}).catch(error=>{if(!regexRunCurrent(key,run))return;const status=target==='settings-search'?'settings-filter-status':'shell-settings-search'===target?'shell-settings-search-status':undefined;if(status&&$(status))$(status).textContent=`Pattern evaluation unavailable: ${error.message}`});
  }

  function initSearch(){all('[data-filter-target]').forEach(input=>input.addEventListener('input',()=>filter(input.dataset.filterTarget,input.value,input.id)));if($('feature-search'))$('feature-search').addEventListener('input',event=>{destinationPage=0;renderDestinations(event.target.value)});$('destination-pagination')?.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;destinationPage=Number(button.dataset.page);renderDestinations($('feature-search')?.value||'');$('destination-grid').focus?.()});all('.regex-trigger').forEach(button=>button.onclick=event=>{event.preventDefault();openRegex(button.dataset.regexFor)})}
  function openRegex(target){regexTarget=target;const dialog=$('regex-dialog');if(!dialog)return;const saved=regexState.get(target)||{pattern:'',flags:'iu'};$('regex-target-label').textContent=`Attached to: ${target}`;$('regex-pattern').value=saved.pattern;$('regex-i').checked=saved.flags.includes('i');$('regex-m').checked=saved.flags.includes('m');$('regex-u').checked=saved.flags.includes('u');if(dialog.open)dialog.close();dialog.classList.add('anchored-builder');dialog.show();const anchor=document.querySelector(`[data-regex-for="${CSS.escape(target)}"]`)||$(target);if(anchor){const rect=anchor.getBoundingClientRect();dialog.style.left=`${Math.max(8,Math.min(innerWidth-dialog.offsetWidth-8,rect.left))}px`;dialog.style.top=`${Math.max(8,Math.min(innerHeight-dialog.offsetHeight-8,rect.bottom+8))}px`}previewRegex();setTimeout(()=>$('regex-pattern').focus(),0)}
  function regexConfig(){return{pattern:$('regex-pattern').value.slice(0,256),flags:`${$('regex-i').checked?'i':''}${$('regex-m').checked?'m':''}${$('regex-u').checked?'u':''}`}}
  function previewRegex(){
    const feedback=$('regex-feedback');if(!feedback)return;const config=regexConfig();if(!config.pattern){feedback.textContent='Enter a pattern.';return}
    feedback.textContent='Checking the pattern in a bounded local worker…';
    const run=runRegexWorker('preview',config,[],($('regex-sample')?.value||'').slice(0,4096));
    run.promise.then(result=>{if(!regexRunCurrent('preview',run))return;const captures=result.captureGroupCount?` ${result.captureGroupCount} capture group${result.captureGroupCount===1?'':'s'} observed.`:'';feedback.textContent=`Valid JavaScript regular expression · ${result.sampleMatchCount} sample match${result.sampleMatchCount===1?'':'es'}.${captures}`}).catch(error=>{if(regexRunCurrent('preview',run))feedback.textContent=`Pattern unavailable: ${error.message}`});
  }
  function applyRegex(){
    const config=regexConfig(),button=$('regex-apply');if(!config.pattern){regexState.delete(regexTarget);$('regex-dialog').close();$(regexTarget)?.dispatchEvent(new Event('input'));return}
    if(button)button.disabled=true;$('regex-feedback').textContent='Checking the pattern in a bounded local worker…';
    const run=runRegexWorker('apply',config,[],($('regex-sample')?.value||'').slice(0,4096));
    run.promise.then(()=>{if(!regexRunCurrent('apply',run))return;regexState.set(regexTarget,{...config,enabled:true});$('regex-dialog').close();$(regexTarget)?.dispatchEvent(new Event('input'));notify(copyText('notifRegexApplied'),applyVocabularyText(`${regexTarget} now uses the local JavaScript regular expression engine.`))}).catch(error=>{if(regexRunCurrent('apply',run))$('regex-feedback').textContent=`Pattern unavailable: ${error.message}`}).finally(()=>{if(button)button.disabled=false});
  }
  function initRegex(){if(!$('regex-dialog'))return;$('regex-pattern').addEventListener('input',previewRegex);$('regex-apply').onclick=applyRegex;all('[data-insert]').forEach(button=>button.onclick=()=>{const input=$('regex-pattern'),start=input.selectionStart;input.value=`${input.value.slice(0,start)}${button.dataset.insert}${input.value.slice(input.selectionEnd)}`;input.focus();input.setSelectionRange(start+button.dataset.insert.length,start+button.dataset.insert.length);previewRegex()});document.addEventListener('click',event=>{const trigger=event.target.closest('.regex-trigger[data-regex-for]');if(!trigger)return;if(trigger.dataset.regexFor==='tab-bulk-close-search'||trigger.dataset.regexFor==='site-history-search'){event.preventDefault();openRegex(trigger.dataset.regexFor)}})}

  let menuTarget=null;
  function renderMenuChoiceResults(options,query,message=''){
    const list=$('menu-search-results');if(!list||!menuTarget)return;
    list.innerHTML=options.length?options.map(option=>`<button type="button" data-menu-value="${escapeHtml(option.value)}" ${option.disabled?'disabled aria-disabled="true"':''}><strong>${escapeHtml(option.textContent)}</strong><span>${option.disabled?'Unavailable':'Choose'}</span></button>`).join(''):`<p class="empty-state">${escapeHtml(message||'No choices match this menu search.')}</p>`;
    if($('menu-search-count'))$('menu-search-count').textContent=message?message:`${options.length} of ${menuTarget.options.length} choices shown.`;
  }
  function renderMenuChoices(query=''){
    if(!menuTarget)return;const options=[...menuTarget.options];
    if(regexSearchEnabled('menu-search',query)){
      renderMenuChoiceResults([],query,'Checking this pattern in a bounded local worker…');
      const run=runRegexWorker('search:menu-search',regexState.get('menu-search'),options.map((option,index)=>({id:String(index),text:`${option.textContent} ${option.value}`.slice(0,4096)})));
      run.promise.then(result=>{if(!regexRunCurrent('search:menu-search',run))return;const ids=new Set(result.matchedIds);renderMenuChoiceResults(options.filter((_,index)=>ids.has(String(index))),query)}).catch(error=>{if(regexRunCurrent('search:menu-search',run))renderMenuChoiceResults([],query,`Pattern evaluation unavailable: ${error.message}`)});
      return;
    }
    renderMenuChoiceResults(options.filter(option=>plainTextMatches(`${option.textContent} ${option.value}`,query)),query);
  }
  function initSearchableMenus(){all('select').forEach((select,index)=>{if(select.dataset.searchUpgraded)return;select.dataset.searchUpgraded='true';if(!select.id)select.id=`searchable-select-${index}`;const button=document.createElement('button');button.type='button';button.className='menu-search-trigger';button.dataset.menuFor=select.id;button.textContent='Search choices';button.setAttribute('aria-label',`Search choices for ${select.getAttribute('aria-label')||select.closest('label')?.textContent?.trim()||select.id}`);select.insertAdjacentElement('afterend',button);button.addEventListener('click',()=>{menuTarget=select;$('menu-search-title').textContent=`Search choices: ${select.getAttribute('aria-label')||select.id}`;$('menu-search').value='';renderMenuChoices();$('menu-search-dialog').show();setTimeout(()=>$('menu-search').focus(),0)})});$('menu-search')?.addEventListener('input',event=>renderMenuChoices(event.target.value));$('menu-search-results')?.addEventListener('click',event=>{const button=event.target.closest('[data-menu-value]');if(!button||!menuTarget)return;const option=[...menuTarget.options].find(item=>item.value===button.dataset.menuValue);if(!option||option.disabled)return;menuTarget.value=option.value;menuTarget.dispatchEvent(new Event('change',{bubbles:true}));$('menu-search-dialog').close();menuTarget.focus()})}
  const CONTEXT_ACTIONS=[{id:'controls',label:'Open site controls'},{id:'notifications',label:'Open notification history'},{id:'export',label:'Export local site state'},{id:'tab-manager',label:'Open tab manager'}];
  function renderContextActionResults(actions,message=''){
    const list=$('context-results');if(!list)return;list.innerHTML=actions.length?actions.map(action=>`<button type="button" data-context-action="${action.id}">${escapeHtml(action.label)}</button>`).join(''):`<p class="empty-state">${escapeHtml(message||'No page actions match this search.')}</p>`;
  }
  function renderContextActions(query=''){
    const tab=tabState&&contextTabId?tabLinks().find(item=>item.id===contextTabId):null;
    const actions=tab?[{id:'tab-pin',label:tabState.pinned.includes(tab.id)?'Unpin this tab':'Pin this tab'},{id:'tab-appearance',label:'Edit tab appearance'},{id:'tab-lock',label:tabState.locks[tab.id]?'Unlock this tab':'Lock this tab'},...CONTEXT_ACTIONS]:contextElement&&elementKey(contextElement)?[{id:'element-appearance',label:'Edit this element appearance'},{id:'element-lock',label:elementState.locks[elementKey(contextElement)]?'Unlock this element':'Lock this element'},...CONTEXT_ACTIONS]:CONTEXT_ACTIONS;
    if(regexSearchEnabled('context-search',query)){
      renderContextActionResults([], 'Checking this pattern in a bounded local worker…');
      const run=runRegexWorker('search:context-search',regexState.get('context-search'),actions.map(action=>({id:action.id,text:action.label})));
      run.promise.then(result=>{if(!regexRunCurrent('search:context-search',run))return;const ids=new Set(result.matchedIds);renderContextActionResults(actions.filter(action=>ids.has(action.id)))}).catch(error=>{if(regexRunCurrent('search:context-search',run))renderContextActionResults([],`Pattern evaluation unavailable: ${error.message}`)});
      return;
    }
    renderContextActionResults(actions.filter(action=>plainTextMatches(action.label,query)));
  }
  function initContextMenu(){document.addEventListener('contextmenu',event=>{event.preventDefault();contextTabId=event.target.closest('#site-nav a[data-tab-id]')?.dataset.tabId||'';contextElement=event.target instanceof Element?event.target:event.target.parentElement||document.body;const dialog=$('page-context-menu');if(dialog.open)dialog.close();$('context-search').value='';renderContextActions();dialog.show();dialog.style.left=`${Math.max(8,Math.min(innerWidth-dialog.offsetWidth-8,event.clientX))}px`;dialog.style.top=`${Math.max(8,Math.min(innerHeight-dialog.offsetHeight-8,event.clientY))}px`;setTimeout(()=>$('context-search').focus(),0)});document.addEventListener('keydown',event=>{if(event.key!=='ContextMenu'&&!(event.shiftKey&&event.key==='F10'))return;event.preventDefault();const target=document.activeElement||document.body,rect=target.getBoundingClientRect?.()||{left:8,bottom:8};contextTabId=target.closest?.('#site-nav a[data-tab-id]')?.dataset.tabId||'';contextElement=target;$('context-search').value='';renderContextActions();const dialog=$('page-context-menu');dialog.show();dialog.style.left=`${Math.max(8,Math.min(innerWidth-dialog.offsetWidth-8,rect.left))}px`;dialog.style.top=`${Math.max(8,Math.min(innerHeight-dialog.offsetHeight-8,rect.bottom||8))}px`;setTimeout(()=>$('context-search').focus(),0)});$('context-search')?.addEventListener('input',event=>renderContextActions(event.target.value));$('context-results')?.addEventListener('click',event=>{const action=event.target.closest('[data-context-action]')?.dataset.contextAction;if(!action)return;$('page-context-menu').close();if(action==='controls')$('site-controls').showModal();if(action==='notifications'){$('notifications-dialog').showModal();renderNotifications()}if(action==='export')exportSiteState();if(action==='tab-manager')openTabManager();if(action==='element-appearance')openElementAppearance(contextElement);if(action==='element-lock')openElementLock(contextElement);if(action==='tab-pin'&&contextTabId){const index=tabState.pinned.indexOf(contextTabId);if(index===-1)tabState.pinned.push(contextTabId);else tabState.pinned.splice(index,1);saveTabState();applyTabPresentation()}if(action==='tab-appearance'&&contextTabId)openTabAppearance(contextTabId);if(action==='tab-lock'&&contextTabId)openTabLock(contextTabId)})}

  function renderPaletteResults(items,message=''){
    const list=$('palette-results');if(!list)return;list.innerHTML=items.length?items.map(item=>item.control?`<button class="palette-result" role="option" type="button" data-palette-control="${item.control}"><strong>${escapeHtml(item.name)}</strong><span>Open exact site control</span></button>`:`<a class="palette-result" role="option" href="${BASE}${item.path}"><strong>${escapeHtml(item.name)}</strong><span>Open ${item.kind.toLowerCase()}</span></a>`).join(''):`<p class="empty-state">${escapeHtml(message||'No matching pages, articles, or controls.')}</p>`;
  }
  function renderPalette(query=''){
    const pages=[['Home','index.html'],['Product','product.html'],['Documentation','documentation.html'],['Converter','converter.html'],['Ollama manager','ollama.html'],['Downloads','downloads.html'],['Status','status.html'],['Settings','settings.html']],controls=[['Language mode','shell-language'],['English funny level','shell-english-funny'],['Cantonese funny level','shell-cantonese-funny'],['Attention modes','shell-attention-focus'],['Scheduled settings','shell-schedule-enabled'],['Theme','shell-theme'],['Navigation edge','shell-tab-edge'],['Local logo','shell-logo-preset'],['Personal vocabulary JSON','shell-vocabulary-file'],['Export site state','shell-export'],['Tab manager','tab-manager-open'],['Local status projection','status-hub-save']],items=[...pages.map(([name,path])=>({name,path,kind:'Page',id:`page:${path}`})),...DESTINATIONS.map(item=>({name:item.name,path:`docs/${item.article}.html`,kind:'Article',id:`article:${item.id}`})),...controls.map(([name,control])=>({name,control,kind:'Control',id:`control:${control}`}))];
    if(regexSearchEnabled('palette-search',query)){
      renderPaletteResults([], 'Checking this pattern in a bounded local worker…');
      const run=runRegexWorker('search:palette-search',regexState.get('palette-search'),items.map(item=>({id:item.id,text:item.name})));
      run.promise.then(result=>{if(!regexRunCurrent('search:palette-search',run))return;const ids=new Set(result.matchedIds);renderPaletteResults(items.filter(item=>ids.has(item.id)))}).catch(error=>{if(regexRunCurrent('search:palette-search',run))renderPaletteResults([],`Pattern evaluation unavailable: ${error.message}`)});
      return;
    }
    renderPaletteResults(items.filter(item=>plainTextMatches(item.name,query)));
  }
  function openPalette(){const dialog=$('command-palette');if(!dialog)return;dialog.showModal();$('palette-search').value='';renderPalette();applyVocabulary();setTimeout(()=>$('palette-search').focus(),0)}
  let notifSeq=0;
  function notify(title,body){state.notifications.unshift({id:`n${Date.now()}-${notifSeq++}`,title,body,time:Date.now()});state.notifications=state.notifications.slice(0,30);save();renderNotifications($('notification-search')?.value||'');const region=$('toast-region');if(!region)return;const toast=document.createElement('div');toast.className='toast';toast.innerHTML=`<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;region.append(toast);setTimeout(()=>toast.remove(),state.attention.extendedTimeouts?15000:5000)}

  // ---- Notification centre: real multi-select, bulk dismiss, and export. ----
  let notifSelection={anchor:undefined,selected:new Set()};
  let lastNotificationOrder=[];
  function ensureNotificationIds(){let changed=false;state.notifications.forEach((item,index)=>{if(!item.id){item.id=`n${item.time||Date.now()}-legacy${index}`;changed=true}});if(changed)save()}
  function renderNotificationResults(matches,query,message=''){
    if(!$('notification-history'))return;
    lastNotificationOrder=matches.map(item=>item.id);
    // A selected id that no longer matches (or was dismissed) never lingers as a phantom count.
    notifSelection={anchor:notifSelection.anchor,selected:new Set([...notifSelection.selected].filter(id=>lastNotificationOrder.includes(id)))};
    $('notification-history').innerHTML=matches.length?matches.map(item=>`<article class="notice" data-notif-id="${item.id}"><input type="checkbox" aria-label="Select notification: ${escapeHtml(item.title)}" ${notifSelection.selected.has(item.id)?'checked':''}><div class="notice-body"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${new Date(item.time).toLocaleString()}</small></div></article>`).join(''):message?`<p class="empty-state">${escapeHtml(message)}</p>`:state.notifications.length?'<p class="empty-state">No notifications match the active search. Clear or change the filter to see saved history.</p>':`<p class="empty-state">${escapeHtml(copyText('emptyNotifications'))}</p>`;
    applyVocabulary();
    updateNotificationSelectionUI();
    updateNotificationExportFormats();
  }
  function renderNotifications(query=''){
    ensureNotificationIds();if($('notification-count'))$('notification-count').textContent=state.notifications.length;if(!$('notification-history'))return;
    if(regexSearchEnabled('notification-search',query)){
      renderNotificationResults([],query,'Checking this pattern in a bounded local worker…');
      const run=runRegexWorker('search:notification-search',regexState.get('notification-search'),state.notifications.map(item=>({id:item.id,text:`${item.title} ${item.body}`.slice(0,4096)})));
      run.promise.then(result=>{if(!regexRunCurrent('search:notification-search',run))return;const ids=new Set(result.matchedIds);renderNotificationResults(state.notifications.filter(item=>ids.has(item.id)),query)}).catch(error=>{if(regexRunCurrent('search:notification-search',run))renderNotificationResults([],query,`Pattern evaluation unavailable: ${error.message}`)});
      return;
    }
    renderNotificationResults(state.notifications.filter(item=>plainTextMatches(`${item.title} ${item.body}`,query)),query);
  }
  function updateNotificationSelectionUI(){
    const status=$('notif-selection-status');if(status)status.textContent=`${notifSelection.selected.size} selected of ${lastNotificationOrder.length} shown`;
    all('#notification-history .notice').forEach(row=>{const checkbox=row.querySelector('input[type="checkbox"]');if(checkbox)checkbox.checked=notifSelection.selected.has(row.dataset.notifId)});
  }
  function notificationExportRows(){return state.notifications.filter(item=>notifSelection.selected.has(item.id)).map(item=>({title:item.title,body:item.body,time:new Date(item.time).toISOString()}))}
  function updateNotificationExportFormats(){
    const select=$('notif-export-format');if(!select)return;
    const rows=notificationExportRows(),formats=suitableFormats(rows.length?rows:[{title:'',body:'',time:''}]),previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    if(formats.includes(previous))select.value=previous;
    if($('notif-export-loss'))$('notif-export-loss').textContent=rows.length?describeLoss(rows,select.value||formats[0]).join(' '):'Select one or more notifications to export.';
  }
  function initNotificationBulk(){
    if(!$('notification-history'))return;
    $('notification-search')?.addEventListener('input',event=>renderNotifications(event.target.value));
    $('notification-history').addEventListener('click',event=>{
      const row=event.target.closest('.notice[data-notif-id]');if(!row)return;
      const id=row.dataset.notifId,isCheckbox=event.target.matches('input[type="checkbox"]');
      const modifiers={shift:event.shiftKey,ctrl:event.ctrlKey||event.metaKey||isCheckbox};
      notifSelection=bulkClick(notifSelection,id,modifiers,lastNotificationOrder);
      updateNotificationSelectionUI();updateNotificationExportFormats();
    });
    $('notif-select-page')?.addEventListener('click',()=>{
      const result=bulkSelectAll(notifSelection,'page',lastNotificationOrder,lastNotificationOrder);
      notifSelection=result.state;updateNotificationSelectionUI();updateNotificationExportFormats();
      if($('notif-selection-status'))$('notif-selection-status').textContent=`Selected ${result.count} on this page.`;
    });
    $('notif-select-matches')?.addEventListener('click',()=>{
      const result=bulkSelectAll(notifSelection,'matches',lastNotificationOrder,lastNotificationOrder);
      notifSelection=result.state;updateNotificationSelectionUI();updateNotificationExportFormats();
      if($('notif-selection-status'))$('notif-selection-status').textContent=`Selected ${result.count} matching notifications.`;
    });
    $('notif-select-none')?.addEventListener('click',()=>{notifSelection={anchor:notifSelection.anchor,selected:new Set()};updateNotificationSelectionUI();updateNotificationExportFormats()});
    $('notif-export-format')?.addEventListener('change',updateNotificationExportFormats);
    $('notif-export-selected')?.addEventListener('click',()=>{
      const rows=notificationExportRows();if(!rows.length)return;
      const format=$('notif-export-format').value||'json',text=exportRows({rows,format,table:'notification'});
      download(exportFilename('ding-pbx-notifications',format,`${rows.length}-selected`),text,EXPORT_MIME[format]);
      notify('Notifications exported',applyVocabularyText(`Exported ${rows.length} selected notification${rows.length===1?'':'s'} as ${format.toUpperCase()}.`));
    });
    $('notif-dismiss-selected')?.addEventListener('click',()=>{
      const plan=planBulk('Dismiss',[...notifSelection.selected],()=>true,{destructive:true});
      if(!plan.selected.length)return;
      const confirmBox=$('notif-confirm');if(!confirmBox)return;
      $('notif-confirm-text').textContent=summariseBulk(plan);
      confirmBox.hidden=false;
    });
    $('notif-confirm-cancel')?.addEventListener('click',()=>{$('notif-confirm').hidden=true});
    $('notif-confirm-yes')?.addEventListener('click',()=>{
      const ids=new Set(notifSelection.selected);
      state.notifications=state.notifications.filter(item=>!ids.has(item.id));
      save();
      notifSelection={anchor:undefined,selected:new Set()};
      $('notif-confirm').hidden=true;
      renderNotifications($('notification-search')?.value||'');
    });
  }

  function initSettings(){
    if(!$('theme-mode'))return;
    $('theme-mode').onchange=event=>update('theme',event.target.value);$('language-mode').onchange=event=>update('language',event.target.value);$('density-mode').onchange=event=>update('density',event.target.value);$('accent-color').oninput=event=>update('accent',event.target.value);$('font-scale').oninput=event=>update('fontScale',Number(event.target.value));$('motion-mode').onchange=event=>update('lowMotion',event.target.checked);$('english-funny').onchange=event=>update('englishFunny',Number(event.target.value));$('cantonese-funny').onchange=event=>update('cantoneseFunny',Number(event.target.value));$('schedule-enabled').onchange=event=>saveSchedule({enabled:event.target.checked});
    $('attention-reduce-flashing').onchange=event=>updateAttention('reduceFlashing',event.target.checked);$('attention-simplified-language').onchange=event=>updateAttention('simplifiedLanguage',event.target.checked);$('attention-extended-timeouts').onchange=event=>updateAttention('extendedTimeouts',event.target.checked);$('attention-focus').onchange=event=>updateAttention('focus',event.target.checked);$('attention-time-awareness').onchange=event=>updateAttention('timeAwareness',event.target.checked);$('attention-one-thing').onchange=event=>updateAttention('oneThing',event.target.checked);$('attention-momentum').onchange=event=>updateAttention('momentum',event.target.checked);$('attention-current-task').onchange=event=>updateAttention('currentTask',event.target.value.slice(0,140));
    $('settings-reset').onclick=()=>{const fresh=JSON.parse(JSON.stringify(DEFAULTS));for(const key of Object.keys(state))delete state[key];Object.assign(state,fresh);save();applyState();notify(copyText('notifSettingsReset'),applyVocabularyText('The local page settings returned to their shipped values.'))};
    $('settings-export').onclick=exportSiteState;
    $('vocabulary-file').onchange=event=>loadVocabularyFromInput(event,'vocabulary-status');$('vocabulary-clear').onclick=()=>clearVocabulary('vocabulary-file','vocabulary-status');$('logo-file').onchange=event=>loadLogoFromInput(event,'logo-status');$('logo-clear').onclick=()=>clearLogo('logo-file','logo-status');
    $('settings-search').addEventListener('input',()=>updateFilterStatus('settings-filter-status','settings-search'));
  }
  function normaliseVocabularyInput(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
    const allowed=new Set(['version','schemaVersion','replacements','terms']);for(const key of Object.keys(raw))if(!allowed.has(key))throw new Error(`unexpected field ${key}`);
    const replacements=Array.isArray(raw.replacements)?raw.replacements:raw.replacements&&typeof raw.replacements==='object'?Object.entries(raw.replacements).map(([from,to])=>({from,to})):raw.terms&&typeof raw.terms==='object'&&!Array.isArray(raw.terms)?Object.entries(raw.terms).map(([from,to])=>({from,to})):raw.replacements;
    return {version:raw.version??raw.schemaVersion,replacements};
  }
  async function loadVocabularyFromInput(event,statusId){const status=$(statusId),file=event.target.files[0];if(!file)return;if(file.size>65536){if(status)status.textContent=`Rejected: the file is ${Math.round(file.size/1024)} KiB and the limit is 64 KiB.`;return}try{const parsed=validateVocabularyPayload(normaliseVocabularyInput(JSON.parse(await file.text())));localStorage.setItem('ding-pbx-vocabulary-cache',JSON.stringify(parsed));if(status)status.textContent=`Loaded ${parsed.replacements.length} local replacement${parsed.replacements.length===1?'':'s'}. No data was transmitted.`;applyVocabulary();applyState();syncLocalAssetStatuses()}catch(error){if(status)status.textContent=`Rejected: ${error.message}`}}
  function clearVocabulary(inputId,statusId){localStorage.removeItem('ding-pbx-vocabulary-cache');if($(inputId))$(inputId).value='';if($(statusId))$(statusId).textContent='No file loaded; original wording is active.';applyVocabulary();applyState();syncLocalAssetStatuses();notify('Personal vocabulary cleared',applyVocabularyText('Original shipped wording is active again.'))}
  function imageDimensions(dataUrl){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('the browser could not decode the image'));image.src=dataUrl})}
  async function loadLogoFromInput(event,statusId){const status=$(statusId),file=event.target.files[0];if(!file)return;if(file.size>131072){if(status)status.textContent='Rejected: file exceeds 128 KiB.';return}try{const bytes=new Uint8Array(await file.arrayBuffer()),png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value),jpeg=bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!png&&!jpeg)throw new Error('the bytes are not a PNG or JPEG image');const mime=png?'image/png':'image/jpeg',dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('the file could not be read'));reader.readAsDataURL(new Blob([bytes],{type:mime}))}),dimensions=await imageDimensions(dataUrl);if(dimensions.width>4096||dimensions.height>4096||dimensions.width*dimensions.height>4194304)throw new Error('decoded dimensions exceed 4096 per side or 4,194,304 pixels');localStorage.setItem('ding-pbx-logo-cache',JSON.stringify({version:1,mime,bytes:file.size,width:dimensions.width,height:dimensions.height,dataUrl}));if(status)status.textContent=`Loaded ${dimensions.width}×${dimensions.height} local image (${Math.round(file.size/1024)} KiB). No data was transmitted.`;applyLogo();syncLocalAssetStatuses()}catch(error){if(status)status.textContent=`Rejected: ${error.message}`}}
  function clearLogo(inputId,statusId){localStorage.removeItem('ding-pbx-logo-cache');if($(inputId))$(inputId).value='';if($(statusId))$(statusId).textContent='No custom image loaded; the selected preset is active.';applyLogo();syncLocalAssetStatuses();notify('Custom logo cleared',applyVocabularyText('The selected shipped logo preset is active again.'))}
  function syncLocalAssetStatuses(){const replacements=vocabularyReplacements(),logo=readLogoCache(),vocabularyText=replacements?`Validated cache active: ${replacements.length} replacement${replacements.length===1?'':'s'}. No file metadata was retained.`:'No valid cache loaded; original wording is active.',logoText=logo?`Validated cache active: ${logo.width}×${logo.height}, ${Math.round(logo.bytes/1024)} KiB. No source filename was retained.`:'No valid custom image cache loaded; the selected preset is active.';['vocabulary-status','shell-vocabulary-status'].forEach(id=>{if($(id))$(id).textContent=vocabularyText});['logo-status','shell-logo-status'].forEach(id=>{if($(id))$(id).textContent=logoText})}
  function download(name,text,mime='application/json'){if(name==='ding-pbx-site-state.json'){try{const payload=JSON.parse(text),tickets=loadJsonList(TICKET_STORAGE_KEY);if(payload.tickets)payload.tickets.records=tickets.map(ticket=>({version:ticket.version,number:ticket.number,category:ticket.category,severity:ticket.severity,status:ticket.status,description:ticket.description,response:ticket.response,time:ticket.time,events:Array.isArray(ticket.events)?ticket.events:[]}));if(payload.tabs&&tabState){payload.tabs.closed=[...(tabState.closed||[])];payload.tabs.groupMeta=tabState.groupMeta||{};payload.tabs.locks=Object.keys(tabState.locks||{}).map(targetId=>({targetId,method:'password',duration:'until cleared',locked:true})).concat([{omitted:'Toy-lock credential digests are never exported.'}])}text=JSON.stringify(payload,null,2)}catch{}}const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:mime}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const EXPORT_MIME={json:'application/json',jsonl:'application/x-ndjson',yaml:'application/yaml',toml:'application/toml',xml:'application/xml',csv:'text/csv',tsv:'text/tab-separated-values',markdown:'text/markdown',html:'text/html',sql:'application/sql'};
  function slugForFilename(text){const slug=String(text||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);return slug||'all'}
  function reduceMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches||state.lowMotion}


  function initHeroCanvas(){
    const canvas=$('hero-canvas');if(!canvas||!canvas.getContext)return;
    const ctx=canvas.getContext('2d');
    const nodes=[{x:.08,y:.5,label:'Trunk'},{x:.34,y:.22,label:'IVR'},{x:.34,y:.78,label:'Queue'},{x:.62,y:.5,label:'Bridge'},{x:.92,y:.22,label:'Agent'},{x:.92,y:.78,label:'Voicemail'}];
    const edges=[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]];
    const pulses=edges.map((edge,index)=>({edge,t:index/edges.length}));
    let raf=0,running=false,frozen=reduceMotion();
    function size(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));ctx.setTransform(ratio,0,0,ratio,0,0)}
    function point(node,rect){return{x:node.x*rect.width,y:node.y*rect.height}}
    function frame(){
      const rect=canvas.getBoundingClientRect();if(rect.width<2||rect.height<2){if(running)raf=requestAnimationFrame(frame);return}
      ctx.clearRect(0,0,rect.width,rect.height);
      /* Draw in the accent, not the outline colour. The outline token is #333B34 against
         a #0B0F0C surface — a legitimate colour for a hairline border between panels, and
         very close to invisible for a graph drawn on top of that same surface. The whole
         figure rendered correctly and could not be seen, which is the worst way for
         something to be wrong: nothing errors, every test passes, and the page simply
         looks the way it did before. Edges take the accent at reduced alpha so they read
         without shouting; nodes take it solid. */
      const style=getComputedStyle(document.documentElement),accent=style.getPropertyValue('--primary').trim()||'#82D9A5',line=accent;
      ctx.lineWidth=1.5;ctx.strokeStyle=line;
      edges.forEach(([a,b])=>{const p1=point(nodes[a],rect),p2=point(nodes[b],rect);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke()});
      nodes.forEach(node=>{const p=point(node,rect);ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle=line;ctx.fill()});
      if(!frozen){pulses.forEach(pulse=>{pulse.t=(pulse.t+.0035)%1;const[a,b]=pulse.edge,p1=point(nodes[a],rect),p2=point(nodes[b],rect),x=p1.x+(p2.x-p1.x)*pulse.t,y=p1.y+(p2.y-p1.y)*pulse.t;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=accent;ctx.globalAlpha=.9;ctx.fill();ctx.globalAlpha=1})}
      if(running&&!frozen)raf=requestAnimationFrame(frame);
    }
    function start(){if(running)return;running=true;size();frame()}
    function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
    if(frozen){size();frame()}else if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(document.hidden)return;if(entry.isIntersecting)start();else stop()}),{threshold:.05});observer.observe(canvas);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(canvas.getBoundingClientRect().top<innerHeight)start()})}else start();
    window.addEventListener('resize',()=>{size();if(frozen)frame()});
  }

  function initCounters(){
    const targets=all('[data-count]');if(!targets.length)return;
    const animate=el=>{const end=Number(el.dataset.count);if(reduceMotion()||!Number.isFinite(end)){el.textContent=String(end);return}const duration=900,start=performance.now();function step(now){const progress=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-progress,3);el.textContent=String(Math.round(end*eased));if(progress<1)requestAnimationFrame(step)}requestAnimationFrame(step)};
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){animate(entry.target);observer.unobserve(entry.target)}}),{threshold:.4});targets.forEach(el=>observer.observe(el))}else targets.forEach(animate);
  }


  const GROUPS=['App','PBX','Media','Data','System','Agent'];
  function updateDestinationMap(matches){
    const map=$('destination-map');if(!map)return;
    const matchedIds=new Set(matches.map(item=>item.id));
    GROUPS.forEach(group=>{
      const total=DESTINATIONS.filter(item=>item.group===group).length;
      const matched=DESTINATIONS.filter(item=>item.group===group&&matchedIds.has(item.id)).length;
      const rail=map.querySelector(`[data-group="${group}"]`);if(!rail)return;
      const percent=total?Math.round((matched/total)*100):undefined;
      const fill=rail.querySelector('.rail-fill');if(fill){if(percent===undefined)fill.style.removeProperty('--rail-percent');else fill.style.setProperty('--rail-percent',`${percent}%`)}
      const count=rail.querySelector('.rail-count');if(count)count.textContent=percent===undefined?'Unavailable':`${matched} of ${total}`;
      rail.setAttribute('aria-label',percent===undefined?`${group}: current catalogue coverage unavailable`:`${group}: ${matched} of ${total} destinations matched in the current catalogue (${percent} percent)`);
      rail.classList.toggle('rail-empty',matched===0);
    });
  }
  function initDestinationMap(){
    const map=$('destination-map');if(!map)return;
    map.innerHTML=GROUPS.map(group=>{const total=DESTINATIONS.filter(item=>item.group===group).length;const percent=total?100:undefined;return `<div class="rail" data-group="${escapeHtml(group)}" aria-label="${escapeHtml(percent===undefined?`${group}: current catalogue coverage unavailable`:`${group}: ${total} of ${total} destinations in the current catalogue (100 percent)`)}"><span class="rail-label">${escapeHtml(group)}</span><span class="rail-track" aria-label="Current catalogue documentation coverage"><span class="rail-fill"${percent===undefined?'':' style="--rail-percent:100%"'}></span></span><span class="rail-count mono">${percent===undefined?'Unavailable':`${total} of ${total}`}</span></div>`}).join('');
  }

  function initConnectionDiagram(){
    const diagram=$('connection-diagram');if(!diagram)return;
    const kinds=[...new Set(all('[data-path]').map(el=>el.dataset.path))];if(!kinds.length)return;
    let index=0,timer=0,running=false;
    function setActive(kind){all('[data-path]').forEach(el=>el.classList.toggle('active',el.dataset.path===kind))}
    function tick(){index=(index+1)%kinds.length;setActive(kinds[index])}
    function start(){if(running||reduceMotion())return;running=true;timer=setInterval(tick,2600)}
    function stop(){running=false;if(timer)clearInterval(timer);timer=0}
    setActive(kinds[0]);
    if(reduceMotion())return;
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(document.hidden)return;if(entry.isIntersecting)start();else stop()}),{threshold:.2});observer.observe(diagram);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(diagram.getBoundingClientRect().top<innerHeight)start()})}else start();
  }

  // ---- Accent colour translator: parse any format, show every representation,
  // and report real WCAG contrast against the page surface. ----
  function pageSurfaceColour(){
    const hex=getComputedStyle(document.documentElement).getPropertyValue('--surface-1').trim()||'#141A15';
    return parseColour(hex)||{r:20,g:26,b:21,a:1};
  }
  function renderColourTranslate(text){
    const grid=$('colour-translate-grid'),status=$('colour-translate-status'),result=$('colour-contrast-result');
    if(!grid)return;
    const translated=translateColour(text);
    if(!translated){
      grid.innerHTML='';
      if(status)status.textContent=text?`Could not parse "${text}" as a colour.`:'';
      if(result){result.removeAttribute('data-verdict');result.textContent='Paste or type a colour above to check its contrast against the page surface.'}
      return;
    }
    const gamut=colourGamutReport(text);
    if(status)status.textContent=appearanceCopy(`Source colour space: ${gamut.space}. ${gamut.clipped?'Warning: the supplied value exceeds that space or converts outside sRGB and was clipped.':'No source-range clipping was detected.'}`,`來源顏色空間：${gamut.space}。${gamut.clipped?'警告：數值超出顏色空間或轉換超出 sRGB，已經裁切。':'未發現來源範圍裁切。'}`);
    grid.innerHTML=COLOUR_FORMATS.map(format=>`<div class="colour-translate-row"><span>${format}</span><output>${escapeHtml(translated[format])}</output><button type="button" class="text-button" data-copy-colour="${escapeHtml(translated[format])}">Copy</button></div>`).join('');
    const colour=parseColour(text),surface=pageSurfaceColour();
    if(colour&&result){
      const ratio=contrastRatio(colour,surface),verdict=contrastVerdict(ratio);
      result.dataset.verdict=verdict;
      const verdictText=verdict==='fail'?'fails WCAG AA and AAA':verdict==='AA'?'passes WCAG AA':'passes WCAG AA and AAA';
      result.textContent=`Contrast against the page surface: ${ratio.toFixed(2)}:1. ${verdictText}.`;
    }
  }
  function initColourTranslator(){
    const input=$('colour-translate-input'),accent=$('accent-color');if(!input||!accent)return;
    const sync=text=>renderColourTranslate(text);
    input.addEventListener('input',()=>{
      sync(input.value);
      const colour=parseColour(input.value);
      if(colour)accent.value=formatColour(colour,'hex');
    });
    accent.addEventListener('input',()=>{input.value=accent.value;sync(accent.value)});
    $('colour-translate-grid')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-copy-colour]');if(!button)return;
      const value=button.dataset.copyColour;
      if(!navigator.clipboard||!navigator.clipboard.writeText){notify('Copy unavailable',applyVocabularyText('The browser did not provide a clipboard action, so the colour was not copied.'));return}
      navigator.clipboard.writeText(value).then(()=>notify('Colour copied',applyVocabularyText(`Copied ${value} to the clipboard.`))).catch(()=>notify('Copy unavailable',applyVocabularyText('The browser rejected the clipboard action, so the colour was not copied.')));
    });
    input.value=accent.value;
    sync(accent.value);
  }

  function initSettingsPreview(){
    const preview=$('settings-preview');if(!preview)return;
    const sync=()=>{if($('preview-scale'))$('preview-scale').style.width=`${Math.max(0,Math.min(100,(state.fontScale-90)/40*100))}%`;if($('preview-density'))$('preview-density').textContent=state.density};
    ['theme-mode','language-mode','density-mode','accent-color','font-scale','motion-mode'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',sync)});
    sync();
  }

  function readSiteStatusRecord(){
    try{
      const element=$('site-status-record');if(!element)throw new Error('No composed build record is embedded in this source page.');
      const record=JSON.parse(element.textContent);if(record.schemaVersion!==1||!record.build||!record.release)throw new Error('The embedded record has an unsupported schema.');
      if(record.build.state!=='validated'||record.build.source!=='build-manifest.json'||!Number.isSafeInteger(record.build.documentationArticles)||record.build.documentationArticles<0||!Number.isSafeInteger(record.build.runtimeNetworkFetches)||record.build.runtimeNetworkFetches<0)throw new Error('The embedded build-manifest record is incomplete.');
      return record;
    }catch(error){return{schemaVersion:1,build:{state:'unavailable',reason:error.message},release:{state:'unavailable',reason:'No validated release record is available on this page.'}}}
  }
  function text(id,value){if($(id))$(id).textContent=value}
  function openDownloadStart(release){
    let dialog=$('download-start-dialog');
    if(!dialog){document.body.insertAdjacentHTML('beforeend','<dialog id="download-start-dialog" class="overlay-card" aria-labelledby="download-start-title"><form method="dialog"><div class="dialog-heading"><h2 id="download-start-title">Start download</h2><button class="icon-button" value="cancel" aria-label="Cancel">×</button></div><p id="download-start-details"></p><p class="plain-note">Confirming opens the immutable HTTPS asset in the browser download flow. Cancel leaves the queue unchanged.</p><div class="builder-buttons"><button id="download-start-confirm" type="button" class="primary-button">Confirm download</button><button type="submit" class="text-button">Cancel</button></div></form></dialog>');dialog=$('download-start-dialog')}
    $('download-start-details').textContent=`${release.setup.name} · ${release.version} · ${release.setup.bytes} bytes · SHA-256 ${release.setup.sha256}`;dialog.showModal();$('download-start-confirm').onclick=()=>{dialog.close();text('download-status-chip','Handoff started');const chip=$('download-status-chip');if(chip)chip.className='status-chip good-chip';text('download-progress-note','The browser download handoff started. This static page cannot read byte progress, rate, or ETA.');text('download-completion-note','Completion remains with the browser download UI. This page will not claim completion without an event it can observe.');const progress=$('download-progress');if(progress){progress.removeAttribute('value');progress.setAttribute('aria-label','Download progress unavailable after browser handoff')}location.assign(release.setup.url)}
  }
  function initStatusHub(){
    const saveButton=$('status-hub-save');if(!saveButton)return;
    $('status-hub-state')?.querySelector('option[value="verified"]')?.remove();$('status-hub-receipt')?.closest('label')?.remove();const key='ding-pbx-site-status-hub-v1',saved=readLocalStatusProjection(),receipt=readSiteStatusRecord();
    const render=record=>{if(!record)return;text('status-hub-session',record.session);$('status-hub-state').value=record.state||'waiting';$('status-hub-evidence').value=record.evidence||'';if($('status-hub-receipt'))$('status-hub-receipt').value=record.receipt?JSON.stringify(record.receipt,null,2):'';const validReceipt=validateStatusReceipt(record.receipt,receipt),verified=record.verified===true&&Boolean(validReceipt)&&record.evidence===validReceipt.evidenceUrl;text('status-hub-chip',verified?'Verified from validated receipt':'User-declared, unverified');const chip=$('status-hub-chip');if(chip)chip.className=`status-chip ${verified?'good-chip':'warning-chip'}`;text('status-hub-note',`${verified?'Validated evidence receipt accepted.':'User-declared state only. No separately validated receipt was accepted.'} Saved at ${new Date(record.time||Date.now()).toLocaleString()}. No hosted status service was contacted.`)};
    if(saved)render(saved);
    saveButton.addEventListener('click',()=>{const session=$('status-hub-session').value.trim().slice(0,80),stateValue=$('status-hub-state').value,evidence=$('status-hub-evidence').value.trim().slice(0,240);if(!session){text('status-hub-note','Enter a session label before saving the local projection.');return}if(evidence){try{const url=new URL(evidence);if(!['http:','https:'].includes(url.protocol))throw new Error()}catch{text('status-hub-note','Evidence reference must be an HTTP(S) URL or left blank.');return}}const current=readSiteStatusRecord();let receiptValue=null;try{receiptValue=JSON.parse($('status-hub-receipt')?.value||'null')}catch{}const validReceipt=validateStatusReceipt(receiptValue,current),verified=stateValue==='verified'&&Boolean(validReceipt)&&evidence===validReceipt.evidenceUrl,record={version:1,session,state:stateValue,evidence,receipt:validReceipt,time:Date.now(),verified};localStorage.setItem(key,JSON.stringify(record));render(record);notify('Local status projection saved',verified?'A separately validated receipt supports this projection.':'The page stored a user-declared projection without sending it anywhere.')})
  }
  function renderSiteEvidence(){
    const record=readSiteStatusRecord(),build=record.build,release=record.release,buildAvailable=build.state==='validated';
    const destinationCount=DESTINATIONS.length;
    all('[data-destination-count]').forEach(element=>element.textContent=String(destinationCount));
    text('hero-doc-link',`Browse all ${destinationCount} destinations`);text('hero-release-state',release.state==='available'?`Version ${release.version}`:'Download unavailable');text('hero-release-note',release.state==='available'?`Validated release record ${release.tag}.`:release.reason||'No validated release evidence record is available.');
    text('status-build-state',buildAvailable?`${build.documentationArticles} composed articles`:'Build record unavailable');text('status-build-note',buildAvailable?`Read from ${build.source}; ${build.topLevelPages} top-level pages are recorded in this composition.`:build.reason||'No build evidence is available.');
    text('status-network-state',buildAvailable?String(build.runtimeNetworkFetches):'Unavailable');text('status-network-note',buildAvailable?`The ${build.source} record declares ${build.runtimeNetworkFetches} runtime network fetches for the composed static surface.`:'No build record is available, so this page does not claim a request count.');
    text('status-release-state',release.state==='available'?`Available: ${release.version}`:release.state==='stale'?'Stale record':release.state==='invalid'?'Invalid record':'Unavailable');text('status-release-note',release.state==='available'?`${release.tag} identifies ${release.setup.name}, ${release.setup.bytes} bytes, with a full SHA-256.`:release.reason||'No validated release evidence record is available.');
    const timeline=$('status-timeline');if(timeline){const rows=[{state:buildAvailable?'good':'waiting',title:'Build composition record',body:buildAvailable?`${build.documentationArticles} article files and ${build.topLevelPages} top-level pages were recorded.`:build.reason||'Unavailable.'},{state:release.state==='available'?'good':'waiting',title:'Installer release record',body:release.state==='available'?`${release.tag} passed the local record schema checks.`:release.reason||'Unavailable.'}];timeline.innerHTML=rows.map(row=>`<li data-state="${row.state}"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.body)}</p></li>`).join('')}
    const chip=$('download-release-chip'),button=$('download-button');
    if(chip){chip.textContent=release.state==='available'?'Validated release':release.state==='stale'?'Stale record':release.state==='invalid'?'Invalid record':'Unavailable';chip.className=`status-chip ${release.state==='available'?'good-chip':'warning-chip'}`}
    text('download-version',release.state==='available'?release.version:'Unavailable');text('download-artifact',release.state==='available'?`${release.setup.name} (${release.setup.bytes} bytes)`:'Not verified');text('download-sha',release.state==='available'?release.setup.sha256:'Not published');text('installer-status',release.state==='available'?`${release.tag} identifies an unsigned installer through a validated HTTPS asset record.`:release.reason||'No validated release record exists, so this site does not guess a download URL.');
    if(button){if(release.state==='available'){button.disabled=false;button.textContent=`Download ${release.setup.name}`;button.onclick=()=>openDownloadStart(release)}else{button.disabled=true;button.textContent='Download unavailable';button.onclick=null}}
  }

  // ---- Local authenticator, Support Tickets, and unlock-ladder equivalents --
  const AUTH_STORAGE_KEY='ding-pbx-site-auth-v1',TICKET_STORAGE_KEY='ding-pbx-site-tickets-v1',LADDER_STORAGE_KEY='ding-pbx-site-ladder-v1';
  let authEntries=[],authEntriesLastPersisted=[],authActiveId='',authSelected=new Set(),ladderState=null,pendingAuthDelete=null;
  function loadJsonList(key){try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(parsed)?parsed:[]}catch{return[]}}
  function base32Bytes(raw){const clean=String(raw||'').replace(/[ =-]/g,'').toUpperCase(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';if(!/^[A-Z2-7]{8,128}$/.test(clean))throw new Error('Use an 8 to 128 character Base32 secret.');let bitString='',bytes=[];for(const char of clean)bitString+=alphabet.indexOf(char).toString(2).padStart(5,'0');while(bitString.length>=8){bytes.push(Number.parseInt(bitString.slice(0,8),2));bitString=bitString.slice(8)}if(bytes.length<5)throw new Error('The Base32 secret is too short.');return new Uint8Array(bytes)}
  async function totpCode(entry,when=Date.now()){const keyBytes=base32Bytes(entry.secret),counter=Math.floor(when/1000/(entry.period||30)),counterBytes=new ArrayBuffer(8),counterView=new DataView(counterBytes);counterView.setUint32(0,Math.floor(counter/0x100000000));counterView.setUint32(4,counter>>>0);const hash=entry.algorithm||'SHA-1',key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash},false,['sign']),signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,counterBytes)),offset=signature[signature.length-1]&15,binary=((signature[offset]&127)<<24)|(signature[offset+1]<<16)|(signature[offset+2]<<8)|signature[offset+3],digits=Math.max(6,Math.min(8,Number(entry.digits)||6)),code=String(binary%10**digits).padStart(digits,'0');return code}
  const b64Bytes=bytes=>btoa(String.fromCharCode(...bytes)),fromB64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
  async function authKey(passphrase,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),{name:'PBKDF2'},false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
  async function persistAuthEntries(){const candidate=authEntries.map(entry=>({...entry})),protection=$('auth-protection')?.value||'passphrase';try{if(protection==='session'){localStorage.removeItem(AUTH_STORAGE_KEY);authEntriesLastPersisted=candidate;text('auth-status','Entries remain in memory for this page session only. Nothing was persisted or exported.');return true}const pass=$('auth-passphrase')?.value||'';if(pass.length<8){text('auth-status','Use at least 8 characters for local encrypted storage, or choose session-only memory.');authEntries=authEntriesLastPersisted.map(entry=>({...entry}));return false}const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await authKey(pass,salt),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(candidate)));localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify({version:2,algorithm:'AES-GCM',kdf:'PBKDF2-SHA-256',iterations:120000,salt:b64Bytes(salt),iv:b64Bytes(iv),ciphertext:b64Bytes(new Uint8Array(cipher))}));authEntriesLastPersisted=candidate;return true}catch(error){authEntries=authEntriesLastPersisted.map(entry=>({...entry}));text('auth-status',`Authenticator change was not persisted: ${error.message}`);return false}}
  async function unlockAuthEntries(){try{const envelope=JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)||'null');if(!envelope||envelope.version!==2)throw new Error('No encrypted local entries were found.');const pass=$('auth-passphrase')?.value||'';const key=await authKey(pass,fromB64(envelope.salt)),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(envelope.iv)},key,fromB64(envelope.ciphertext));const parsed=JSON.parse(new TextDecoder().decode(plain));if(!Array.isArray(parsed))throw new Error('The encrypted envelope did not contain an entry list.');authEntries=parsed.filter(entry=>entry&&typeof entry.id==='string'&&typeof entry.secret==='string');authEntriesLastPersisted=authEntries.map(entry=>({...entry}));authActiveId=authEntries[0]?.id||'';text('auth-status','Encrypted authenticator entries unlocked for this page session.');renderAuthenticator()}catch(error){text('auth-status',`Encrypted entries remain locked: ${error.message}`)}}
  function authUri(entry){return `otpauth://totp/${encodeURIComponent(`${entry.issuer}:${entry.account}`)}?secret=${encodeURIComponent(entry.secret)}&issuer=${encodeURIComponent(entry.issuer)}&algorithm=${encodeURIComponent((entry.algorithm||'SHA-1').replace('-',''))}&digits=${entry.digits}&period=${entry.period}`}
  function renderAuthQr(entry){const target=$('auth-qr');if(!target||!entry)return;const uri=authUri(entry),render=()=>{try{const generator=window.qrcode(0,'M');generator.addData(uri,'Byte');generator.make();target.innerHTML=generator.createSvgTag({cellSize:4,margin:16,alt:{text:`Authenticator pairing for ${entry.issuer} ${entry.account}`},title:`Authenticator pairing for ${entry.issuer} ${entry.account}`});target.removeAttribute('role');const svg=target.querySelector('svg');if(svg){svg.setAttribute('role','img');svg.removeAttribute('aria-label');const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=`Authenticator pairing for ${entry.issuer} ${entry.account}`;const description=document.createElementNS('http://www.w3.org/2000/svg','desc');description.textContent=`Scannable QR encoding the exact pairing URI for ${entry.issuer} ${entry.account}.`;svg.prepend(description,title);svg.setAttribute('aria-labelledby',`${stableElementSlug(entry.issuer)}-${stableElementSlug(entry.account)}-qr-title`);title.id=`${stableElementSlug(entry.issuer)}-${stableElementSlug(entry.account)}-qr-title`}target.hidden=true}catch(error){target.textContent=`QR rendering unavailable: ${error.message}`}};if(typeof window.qrcode==='function')render();else{const script=document.createElement('script');script.src='qr-encoder.js';script.onload=render;script.onerror=()=>{target.textContent='The bundled QR encoder could not be loaded.'};document.head.appendChild(script)}}
  async function renderAuthenticator(){const list=$('auth-entries');if(!list)return;const query=($('auth-search')?.value||'').trim().toLocaleLowerCase(),shown=authEntries.filter(entry=>`${entry.issuer} ${entry.account} ${entry.group||''}`.toLocaleLowerCase().includes(query));authSelected=new Set([...authSelected].filter(id=>shown.some(entry=>entry.id===id)));list.innerHTML=shown.length?shown.map(entry=>`<div class="record-list-item"><label><input type="checkbox" data-auth-select="${escapeHtml(entry.id)}" ${authSelected.has(entry.id)?'checked':''} aria-label="Select ${escapeHtml(entry.issuer)} ${escapeHtml(entry.account)}"></label><button type="button" class="text-button" data-auth-id="${escapeHtml(entry.id)}" aria-pressed="${String(entry.id===authActiveId)}"><strong>${escapeHtml(entry.issuer)}</strong><small>${escapeHtml(entry.account)} · ${entry.algorithm||'SHA-1'} · TOTP ${entry.digits}/${entry.period}s · Group ${escapeHtml(entry.group||'Unsorted')}</small></button><div class="tab-manager-actions"><button type="button" class="text-button" data-auth-up="${escapeHtml(entry.id)}">↑</button><button type="button" class="text-button" data-auth-down="${escapeHtml(entry.id)}">↓</button></div></div>`).join(''):'<p class="empty-state">No local authenticator entries match this search.</p>';text('auth-selection-status',`${authSelected.size} selected of ${shown.length} shown`);const active=authEntries.find(entry=>entry.id===authActiveId);if(!active){text('auth-code-panel','No code is displayed until an entry is selected.');return}try{const now=Date.now(),current=await totpCode(active,now),next=await totpCode(active,now+(active.period||30)*1000),remaining=(active.period||30)-Math.floor(now/1000)%(active.period||30);$('auth-code-panel').textContent=`${active.issuer} · ${active.account}\nCurrent: ${current}\nNext: ${next}\nSeconds remaining: ${remaining}`;text('auth-status',`Current and next codes are generated locally with Web Crypto. Clock observed at ${new Date(now).toISOString()}. The secret is not exported.`)}catch(error){text('auth-code-panel',`Code unavailable: ${error.message}`)}}
  function initAuthenticator(){const register=$('auth-register');if(!register)return;const secret=$('auth-secret');if(secret&&!$('auth-algorithm'))secret.insertAdjacentHTML('afterend','<button id="auth-reveal" type="button" class="text-button">Reveal manual secret for registration</button><label>Algorithm<select id="auth-algorithm"><option value="SHA-1">SHA-1</option><option value="SHA-256">SHA-256</option><option value="SHA-512">SHA-512</option></select></label><label>Digits<select id="auth-digits"><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></label><label>Period in seconds<input id="auth-period" type="number" min="5" max="300" value="30"></label><label>Confirm current code<input id="auth-confirm-code" type="text" inputmode="numeric" maxlength="8" autocomplete="one-time-code" placeholder="Required before storage"></label><label>Local protection<select id="auth-protection"><option value="passphrase">Passphrase encrypted</option><option value="session">Session-only memory</option></select></label><label>Protection passphrase<input id="auth-passphrase" type="password" maxlength="128" autocomplete="new-password" placeholder="Required for encrypted storage"></label><button id="auth-unlock" class="secondary-button" type="button">Unlock encrypted entries</button>');if(secret&&!$('auth-search'))secret.insertAdjacentHTML('beforebegin','<div class="inline-controls"><label for="auth-search">Search entries</label><input id="auth-search" type="search" placeholder="Search issuer or account"><button id="auth-select-all" type="button" class="text-button">Select all matches</button></div>');if(secret&&!$('auth-import-uri'))secret.insertAdjacentHTML('beforebegin','<div class="inline-controls"><label for="auth-import-uri">Import otpauth URI<input id="auth-import-uri" type="url" placeholder="otpauth://totp/..." autocomplete="off"></label><button id="auth-import" type="button" class="text-button">Load pairing URI</button></div>');const uri=$('auth-otpauth');if(uri&&!$('auth-qr'))uri.insertAdjacentHTML('beforebegin','<div id="auth-qr" class="auth-qr" role="img" aria-label="Scannable QR code for authenticator pairing" hidden></div>');if(uri&&!$('auth-reveal-uri'))uri.insertAdjacentHTML('beforebegin','<button id="auth-reveal-uri" type="button" class="text-button">Reveal pairing URI</button>');$('auth-import')?.addEventListener('click',()=>{try{const parsed=new URL($('auth-import-uri').value.trim());if(parsed.protocol!=='otpauth:'||parsed.hostname!=='totp')throw new Error('Use an otpauth://totp URI.');const params=parsed.searchParams,secretValue=params.get('secret')||'';base32Bytes(secretValue);$('auth-secret').value=secretValue;$('auth-issuer').value=params.get('issuer')||decodeURIComponent(parsed.pathname.slice(1).split(':')[0]||'');$('auth-account').value=decodeURIComponent(parsed.pathname.slice(1).split(':').slice(1).join(':')||'');$('auth-algorithm').value=(params.get('algorithm')||'SHA1').replace(/^SHA(?=\d)/,'SHA-');$('auth-digits').value=params.get('digits')||'6';$('auth-period').value=params.get('period')||'30';text('auth-status','Pairing URI loaded locally. Confirm the current code before storage.')}catch(error){text('auth-status',`Pairing URI rejected: ${error.message}`)}});$('auth-reveal')?.addEventListener('click',()=>{secret.type=secret.type==='password'?'text':'password';$('auth-reveal').textContent=secret.type==='password'?'Reveal manual secret for registration':'Hide manual secret'});$('auth-reveal-uri')?.addEventListener('click',()=>{if(uri.textContent){uri.hidden=!uri.hidden;$('auth-reveal-uri').textContent=uri.hidden?'Reveal pairing URI':'Hide pairing URI';if(!uri.hidden)renderAuthQr(authEntries.find(entry=>entry.id===authActiveId))}});authEntries=[];authActiveId='';if(localStorage.getItem(AUTH_STORAGE_KEY))text('auth-status','Encrypted entries are locked. Choose the passphrase and unlock them, or register a new entry.');renderAuthenticator();$('auth-unlock')?.addEventListener('click',unlockAuthEntries);$('auth-search')?.addEventListener('input',renderAuthenticator);$('auth-select-all')?.addEventListener('click',()=>$('auth-entries')?.querySelectorAll('[data-auth-select]').forEach(input=>input.checked=true));register.addEventListener('click',async()=>{try{const issuer=$('auth-issuer').value.trim().slice(0,80),account=$('auth-account').value.trim().slice(0,120),secretValue=$('auth-secret').value.replace(/\s/g,'').toUpperCase(),period=Math.max(5,Math.min(300,Number($('auth-period')?.value)||30));base32Bytes(secretValue);if(!issuer||!account)throw new Error('Enter an issuer and account before registering.');const entry={id:`auth-${Date.now()}-${Math.random().toString(16).slice(2)}`,issuer,account,secret:secretValue,algorithm:$('auth-algorithm')?.value||'SHA-1',digits:Number($('auth-digits')?.value)||6,period,created:Date.now()},expected=await totpCode(entry);if($('auth-confirm-code')?.value.trim()!==expected)throw new Error('Enter the current code to confirm pairing before storage.');authEntries=[...authEntries,entry];authActiveId=entry.id;if(!(await persistAuthEntries()))return;$('auth-secret').value='';$('auth-confirm-code').value='';uri.hidden=true;uri.textContent=authUri(entry);text('auth-status','Entry registered locally. Reveal the pairing URI explicitly if needed; ordinary exports omit the secret.');renderAuthQr(entry);renderAuthenticator()}catch(error){text('auth-status',`Registration rejected: ${error.message}`)}});$('auth-entries')?.addEventListener('click',event=>{const button=event.target.closest('[data-auth-id]');if(!button)return;authActiveId=button.dataset.authId;renderAuthenticator()});setInterval(()=>{if(authActiveId)renderAuthenticator()},1000)}
  function renderTickets(){const list=$('ticket-list');if(!list)return;const tickets=loadJsonList(TICKET_STORAGE_KEY),stages=['Submitted locally','Acknowledged locally','Resolution ready'];list.innerHTML=tickets.length?tickets.map(ticket=>`<article class="record-list-item"><strong>${escapeHtml(ticket.number)} · ${escapeHtml(ticket.category)} · ${escapeHtml(ticket.severity||'normal')}</strong><small>${escapeHtml(ticket.status)} · ${new Date(ticket.time).toLocaleString()}</small><p>${escapeHtml(ticket.description)}</p><p>${escapeHtml(ticket.response)}</p><details><summary>Status history</summary>${(ticket.events||[]).map(event=>`<p>${escapeHtml(event.status)} · ${new Date(event.time).toLocaleString()}</p>`).join('')}</details>${ticket.status!==stages[stages.length-1]?`<button type="button" class="text-button" data-ticket-advance="${escapeHtml(ticket.number)}">Advance local status</button>`:''}</article>`).join(''):'<p class="empty-state">No local tickets.</p>';text('ticket-status',tickets.length?`${tickets.length} local ticket${tickets.length===1?'':'s'} stored. Nothing was sent.`:'No local ticket exists.')}
  function initSupportTickets(){const create=$('ticket-create');if(!create)return;const category=create.closest('.setting-card')?.querySelector('#ticket-category');if(category&&!$('ticket-severity'))category.insertAdjacentHTML('afterend','<label>Severity<select id="ticket-severity"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option></select></label>');renderTickets();create.addEventListener('click',()=>{const description=$('ticket-description').value.trim().slice(0,1000);if(!description){text('ticket-status','Describe the local issue before creating a ticket.');return}const tickets=loadJsonList(TICKET_STORAGE_KEY),now=Date.now(),ticket={version:1,number:`LOCAL-${now}`,category:$('ticket-category').value,severity:$('ticket-severity')?.value||'normal',description,status:'Submitted locally',response:'First response: this fictional desk can only point you to clear this site storage for recovery.',time:now,events:[{status:'Submitted locally',time:now}]};localStorage.setItem(TICKET_STORAGE_KEY,JSON.stringify([ticket,...tickets].slice(0,100)));historyRecord('ticket created','tickets',null,ticket,`Created ${ticket.number}`);$('ticket-description').value='';renderTickets()});$('ticket-list')?.addEventListener('click',event=>{const button=event.target.closest('[data-ticket-advance]');if(!button)return;const tickets=loadJsonList(TICKET_STORAGE_KEY),stages=['Submitted locally','Acknowledged locally','Resolution ready'],index=tickets.findIndex(ticket=>ticket.number===button.dataset.ticketAdvance);if(index<0)return;const before=JSON.parse(JSON.stringify(tickets[index])),next=Math.min(stages.length-1,Math.max(0,stages.indexOf(tickets[index].status)+1)),time=Date.now();tickets[index].status=stages[next];tickets[index].events=Array.isArray(tickets[index].events)?tickets[index].events:[];tickets[index].events.push({status:stages[next],time});localStorage.setItem(TICKET_STORAGE_KEY,JSON.stringify(tickets));historyRecord('ticket status changed','tickets',before,tickets[index],`Advanced ${tickets[index].number}`);renderTickets()})}
  function openAuthDeleteConfirmation(ids){let dialog=$('auth-delete-confirm');if(!dialog){document.body.insertAdjacentHTML('beforeend','<dialog id="auth-delete-confirm" class="overlay-card" aria-labelledby="auth-delete-title"><form method="dialog"><div class="dialog-heading"><h2 id="auth-delete-title">Delete authenticator entries</h2><button class="icon-button" value="cancel" aria-label="Cancel">×</button></div><p id="auth-delete-target"></p><label>First confirmation key<input id="auth-delete-key-one" type="password"></label><label>Second confirmation key<input id="auth-delete-key-two" type="password"></label><label>Full-range confirmation<input id="auth-delete-slider" type="range" min="0" max="100" value="0"><output id="auth-delete-slider-output">0%</output></label><p class="plain-note">Both keys and the full slider are required. Emergency exit cancels deletion.</p><button id="auth-delete-confirm" class="danger-button" type="button" disabled>Delete exact selected entries</button><button id="auth-delete-cancel" class="text-button" type="button">Emergency exit</button></form></dialog>');dialog=$('auth-delete-confirm');const update=()=>{$('auth-delete-confirm').disabled=!($('auth-delete-key-one').value&&$('auth-delete-key-two').value&&Number($('auth-delete-slider').value)===100);$('auth-delete-slider-output').textContent=`${$('auth-delete-slider').value}%`};dialog.addEventListener('input',update);$('auth-delete-cancel').addEventListener('click',()=>{pendingAuthDelete=null;dialog.close()});$('auth-delete-confirm').addEventListener('click',async()=>{if(!pendingAuthDelete)return;authEntries=authEntries.filter(entry=>!pendingAuthDelete.includes(entry.id));authSelected.clear();await persistAuthEntries();pendingAuthDelete=null;dialog.close();renderAuthenticator()})}pendingAuthDelete=ids;$('auth-delete-target').textContent=`${ids.length} selected authenticator entr${ids.length===1?'y':'ies'} will be deleted from this browser. No other records are affected.`;$('auth-delete-key-one').value='';$('auth-delete-key-two').value='';$('auth-delete-slider').value='0';$('auth-delete-confirm').disabled=true;dialog.showModal()}
  function initAuthBulk(){const search=$('auth-search');if(!search)return;if(!$('auth-selection-status'))search.insertAdjacentHTML('afterend','<span id="auth-selection-status" class="filter-status" role="status"></span><button id="auth-delete-selected" type="button" class="danger-button">Delete selected</button><button id="auth-export-selected" type="button" class="text-button">Export selected metadata</button><input id="auth-group-name" type="text" maxlength="48" placeholder="Group selected"><button id="auth-group-apply" type="button" class="text-button">Apply group</button>');$('auth-select-all')?.addEventListener('click',()=>$('auth-entries')?.querySelectorAll('[data-auth-select]').forEach(input=>{input.checked=true;authSelected.add(input.dataset.authSelect)}));$('auth-entries')?.addEventListener('change',event=>{const input=event.target.closest('[data-auth-select]');if(!input)return;if(input.checked)authSelected.add(input.dataset.authSelect);else authSelected.delete(input.dataset.authSelect);renderAuthenticator()});$('auth-delete-selected')?.addEventListener('click',()=>{const ids=[...authSelected];if(ids.length)openAuthDeleteConfirmation(ids)});$('auth-export-selected')?.addEventListener('click',()=>{const rows=authEntries.filter(entry=>authSelected.has(entry.id)).map(entry=>({id:entry.id,issuer:entry.issuer,account:entry.account,algorithm:entry.algorithm,digits:entry.digits,period:entry.period,group:entry.group||'Unsorted',created:entry.created}));download('authenticator-selected-metadata.json',JSON.stringify({version:1,entries:rows,secretsOmitted:true},null,2),'application/json')});$('auth-group-apply')?.addEventListener('click',async()=>{const group=$('auth-group-name').value.trim().slice(0,48);if(!group)return;authEntries.forEach(entry=>{if(authSelected.has(entry.id))entry.group=group});await persistAuthEntries();renderAuthenticator()});$('auth-entries')?.addEventListener('click',async event=>{const up=event.target.closest('[data-auth-up]')?.dataset.authUp,down=event.target.closest('[data-auth-down]')?.dataset.authDown,id=up||down;if(!id)return;const index=authEntries.findIndex(entry=>entry.id===id),next=up?index-1:index+1;if(index<0||next<0||next>=authEntries.length)return;[authEntries[index],authEntries[next]]=[authEntries[next],authEntries[index]];await persistAuthEntries();renderAuthenticator()})}
  function ladderSave(){const before=ladderHistorySnapshot?JSON.parse(JSON.stringify(ladderHistorySnapshot)):null;localStorage.setItem(LADDER_STORAGE_KEY,JSON.stringify(ladderState));historyRecord('ladder changed','unlock-ladder',before,ladderState);ladderHistorySnapshot=JSON.parse(JSON.stringify(ladderState))}
  function ladderWin(){ladderState.waitUntil=Date.now();ladderState.ladderUsed=true;ladderState.budgetUsed=(ladderState.budgetUsed||0)+1;ladderSave()}
  function renderLadder(){if(!$('ladder-status'))return;const question=$('ladder-question');if(!ladderState){question.textContent='No local wait is active.';$('ladder-submit').disabled=true;$('ladder-answer').disabled=true;text('ladder-status','No local ladder state is saved.');return}const remaining=Math.max(0,ladderState.waitUntil-Date.now()),seconds=Math.ceil(remaining/1000),ready=!remaining&&ladderState.attempts>0;$('ladder-answer').hidden=ladderState.rung!=='sums';$('ladder-submit').hidden=ladderState.rung!=='sums';$('ladder-answer').disabled=!ready;$('ladder-submit').disabled=!ready;let body='';if(ladderState.rung==='dish')body=`<strong>${ready?'Dim sum rung':'Dim sum rung after the local wait'}</strong><div class="ladder-options">${['Har gow','Siu mai','Cheung fun','Egg tart'].map((name,index)=>`<button type="button" class="text-button" data-ladder-dish="${index}" ${ready?'':'disabled'}>${name}</button>`).join('')}</div>`;else if(ladderState.rung==='sums')body=`<strong>${ready?'Ten sums rung':'Ten sums after the local wait'}</strong><p>Question ${ladderState.sumIndex+1} of 10: ${ladderState.a} + ${ladderState.b} = ?</p>`;else if(ladderState.rung==='moles')body=`<strong>Whack-a-mole rung</strong><p>Hit each visible mole once before the timed round ends.</p><div class="mole-grid">${Array.from({length:9},(_,index)=>`<button type="button" class="text-button ${ladderState.moles?.some(mole=>mole.cell===index&&!mole.hit&&Date.now()>=mole.shownAt)?'mole-visible':''}" data-ladder-mole="${index}" ${ready?'':'disabled'}>${ladderState.moles?.some(mole=>mole.cell===index&&!mole.hit&&Date.now()>=mole.shownAt)?'●':'·'}</button>`).join('')}</div>`;else body='<strong>Clock rung</strong><p>The local ladder budget is exhausted. The clock is the only route through this wait.</p>';question.innerHTML=body;text('ladder-status',remaining?`${seconds} seconds remain. Rung: ${ladderState.rung}. Attempts left: ${ladderState.attempts}. No session or cookie is created.`:`Rung: ${ladderState.rung}. Attempts left: ${ladderState.attempts}. Winning clears only this local wait and never refunds attempts.`)}
  const LADDER_WORKER_SOURCE_V2=`const nonces=new Map(),rounds=new Map();self.onmessage=e=>{const d=e.data||{};if(d.type==='issue'){const rung=d.payload?.rung||'clock';let payload;if(rung==='dish'){const seed=d.payload?.challenge||{};payload={rung,answer:Number.isInteger(seed.answer)?seed.answer:Math.floor(Math.random()*4),options:Array.isArray(seed.options)?seed.options:['Har gow','Siu mai','Cheung fun','Egg tart'],expires:Number(seed.expires)||Date.now()+30000}};else if(rung==='sums'){const seed=d.payload?.challenge||{},index=Math.max(0,Number(d.payload?.sumIndex??seed.sumIndex)||0),single=index===0,double=index>0,a=Number.isInteger(seed.a)?seed.a:(single?Math.floor(Math.random()*9)+1:Math.floor(Math.random()*90)+10),b=Number.isInteger(seed.b)?seed.b:(single?Math.floor(Math.random()*9)+1:Math.floor(Math.random()*90)+10);payload={rung,sumIndex:index,a,b,answer:Number.isInteger(seed.answer)?seed.answer:a+b,expires:Number(seed.expires)||Date.now()+30000}}else if(rung==='moles'){const roundId=d.payload?.roundId||crypto.randomUUID(),seed=d.payload?.challenge;payload=rounds.get(roundId)||(seed&&Array.isArray(seed.cells)?{rung,roundId,roundStart:Number(seed.roundStart)||Date.now(),roundEnd:Number(seed.roundEnd)||Date.now()+5000,cells:seed.cells.map(cell=>({...cell,hit:Boolean(cell.hit)}))}:{rung,roundId,roundStart:Date.now(),roundEnd:Date.now()+5000,cells:Array.from({length:5},(_,i)=>({cell:(i*2+1)%9,shownAt:Date.now()+i*500,hit:false}))});rounds.set(roundId,payload)}else payload={rung,expires:Date.now()+30000};const nonce=crypto.randomUUID();nonces.set(nonce,payload);setTimeout(()=>nonces.delete(nonce),30000);self.postMessage({type:'issued',nonce,payload})}if(d.type==='grade'){const payload=nonces.get(d.nonce);nonces.delete(d.nonce);if(!payload){self.postMessage({type:'graded',nonce:d.nonce,ok:false,reason:'nonce'});continue}if(payload.rung==='moles'){const now=Date.now(),target=payload.cells.find(cell=>cell.cell===d.answer&&!cell.hit&&now>=cell.shownAt);if(!target){self.postMessage({type:'graded',nonce:d.nonce,ok:false,reason:now<payload.roundEnd?'early-or-cell':'cell',payload});continue}target.hit=true;const allHit=now>=payload.roundEnd&&payload.cells.every(cell=>cell.hit);self.postMessage({type:'graded',nonce:d.nonce,ok:true,allHit,payload});continue}self.postMessage({type:'graded',nonce:d.nonce,ok:payload.answer===d.answer,payload})}}`;
  let ladderWorkerV2=null,ladderNonceV2='';
  function ladderIssueV2(payload){return new Promise(resolve=>{if(!ladderWorkerV2)ladderWorkerV2=new Worker(URL.createObjectURL(new Blob([LADDER_WORKER_SOURCE_V2],{type:'application/javascript'})));const handler=event=>{if(event.data.type==='issued'){ladderWorkerV2.removeEventListener('message',handler);ladderNonceV2=event.data.nonce;resolve(event.data.payload)}};ladderWorkerV2.addEventListener('message',handler);ladderWorkerV2.postMessage({type:'issue',payload})})}
  async function ladderGradeV2(answer){if(!ladderWorkerV2||!ladderNonceV2)await ladderIssueV2({rung:ladderState.rung,roundId:ladderState.challenge?.roundId,sumIndex:ladderState.sumIndex||0});return new Promise(resolve=>{const nonce=ladderNonceV2,handler=event=>{if(event.data.type==='graded'&&event.data.nonce===nonce){ladderWorkerV2.removeEventListener('message',handler);ladderNonceV2='';resolve(event.data)}};ladderWorkerV2.addEventListener('message',handler);ladderWorkerV2.postMessage({type:'grade',nonce,answer})})}
  function ladderTargetLocked(targetId){if(!targetId)return false;if(targetId.startsWith('tab:'))return Boolean(tabState?.locks?.[targetId.slice(4)]);return Boolean(elementState.locks[targetId])}
  function ladderLockout(){try{return JSON.parse(localStorage.getItem('ding-pbx-lockout-v1')||'null')}catch{return null}}
  function ladderClearWait(){const lockout=ladderLockout();if(lockout){lockout.waitUntil=Date.now();localStorage.setItem('ding-pbx-lockout-v1',JSON.stringify(lockout))}}
  function renderLadder(){if(!$('ladder-status'))return;const state=ladderState,lockout=ladderLockout();if(!state||!lockout){$('ladder-question').textContent='No active local lockout ladder.';$('ladder-submit').disabled=true;$('ladder-answer').disabled=true;text('ladder-status','A real local lockout is required. Settings cannot mint a free wait.');return}const remaining=Math.max(0,lockout.waitUntil-Date.now()),ready=!remaining&&state.attempts>0;$('ladder-answer').hidden=state.rung!=='sums';$('ladder-submit').hidden=state.rung!=='sums';$('ladder-answer').disabled=!ready;$('ladder-submit').disabled=!ready;let body='';if(state.rung==='dish')body=`<strong>${ready?'Dim sum rung':'Dim sum rung after the local wait'}</strong><div class="ladder-options">${(state.challenge?.options||['Har gow','Siu mai','Cheung fun','Egg tart']).map((name,index)=>`<button type="button" class="text-button" data-ladder-dish="${index}" ${ready?'':'disabled'}>${name}</button>`).join('')}</div>`;else if(state.rung==='sums')body=`<strong>Ten sums rung</strong><p>Question ${(state.sumIndex||0)+1} of 10: ${state.challenge?.a||0} + ${state.challenge?.b||0} = ?</p>`;else if(state.rung==='moles')body=`<strong>Whack-a-mole rung</strong><p>Round ends at ${new Date(state.challenge?.roundEnd||Date.now()).toLocaleTimeString()}. Hit each visible cell once.</p><div class="mole-grid">${Array.from({length:9},(_,index)=>`<button type="button" class="text-button ${state.challenge?.cells?.some(cell=>cell.cell===index&&!cell.hit&&Date.now()>=cell.shownAt)?'mole-visible':''}" data-ladder-mole="${index}" ${ready?'':'disabled'}>${state.challenge?.cells?.some(cell=>cell.cell===index&&!cell.hit&&Date.now()>=cell.shownAt)?'●':'·'}</button>`).join('')}</div>`;else body='<strong>Clock rung</strong><p>The local ladder budget is exhausted. The clock is the only route through this wait.</p>';$('ladder-question').innerHTML=body;text('ladder-status',`Target ${lockout.targetId} is locked. ${remaining?`${Math.ceil(remaining/1000)} seconds remain.`:'Wait ready.'} Rung: ${state.rung}. Attempts left: ${state.attempts}.`)}
  function initUnlockLadder(){const start=$('ladder-start');if(!start)return;if(!$('ladder-school-mode'))start.insertAdjacentHTML('beforebegin','<label><input id="ladder-school-mode" type="checkbox"> School mode starts at sums and omits the dim-sum rung on this local surface.</label>');try{ladderState=JSON.parse(localStorage.getItem(LADDER_STORAGE_KEY)||'null')}catch{ladderState=null}renderLadder();start.addEventListener('click',async event=>{const lockout=ladderLockout();if(!lockout||!ladderTargetLocked(lockout.targetId)||Date.now()<lockout.waitUntil){event.preventDefault();event.stopImmediatePropagation();text('ladder-status','The ladder is available only for a still-locked target with an active local wait.');return}const now=Date.now(),school=$('ladder-school-mode')?.checked,budgetWindow=ladderState?.budgetWindow&&now-ladderState.budgetWindow<3600000?ladderState.budgetWindow:now,budgetUsed=budgetWindow===ladderState?.budgetWindow?Number(ladderState.budgetUsed)||0:0;if(budgetUsed>=3){ladderState={version:1,rung:'clock',attempts:ladderState?.attempts||lockout.attempts||3,budgetWindow,budgetUsed,challenge:null};ladderSave();renderLadder();return}const rung=school?'sums':'dish',challenge=await ladderIssueV2({rung});ladderState={version:1,rung,challenge,attempts:ladderState?.attempts||lockout.attempts||3,sumIndex:0,dishWrong:0,budgetWindow,budgetUsed,schoolMode:Boolean(school)};ladderSave();renderLadder()},{capture:true});$('ladder-question')?.addEventListener('click',async event=>{const dish=event.target.closest('[data-ladder-dish]');if(dish&&ladderState?.rung==='dish'){const result=await ladderGradeV2(Number(dish.dataset.ladderDish));if(!result?.ok){ladderState.dishWrong=(ladderState.dishWrong||0)+1;if(ladderState.dishWrong>=5){ladderState.rung='sums';ladderState.challenge=await ladderIssueV2({rung:'sums'});ladderState.sumIndex=0}ladderSave();renderLadder();return}ladderClearWait();ladderState.budgetUsed=(ladderState.budgetUsed||0)+1;ladderSave();renderLadder();return}const mole=event.target.closest('[data-ladder-mole]');if(mole&&ladderState?.rung==='moles'){const result=await ladderGradeV2(Number(mole.dataset.ladderMole));if(result?.payload)ladderState.challenge=result.payload;if(result?.allHit){ladderClearWait();ladderState.budgetUsed=(ladderState.budgetUsed||0)+1}ladderSave();renderLadder()}});$('ladder-submit')?.addEventListener('click',async()=>{if(ladderState?.rung!=='sums')return;const answer=Number($('ladder-answer').value),result=await ladderGradeV2(answer);if(!result?.ok){ladderState.rung='moles';ladderState.challenge=await ladderIssueV2({rung:'moles'});ladderSave();renderLadder();return}ladderState.sumIndex=(ladderState.sumIndex||0)+1;if(ladderState.sumIndex>=10){ladderClearWait();ladderState.budgetUsed=(ladderState.budgetUsed||0)+1}else{ladderState.challenge=await ladderIssueV2({rung:'sums'});ladderSave()}renderLadder()});setInterval(renderLadder,1000)}
  function initLocalRecoverySurfaces(){document.querySelector('[data-search^="support tickets"]')?.setAttribute('id','support-tickets');document.querySelector('[data-search^="unlock ladder"]')?.setAttribute('id','unlock-ladder');document.querySelector('[data-search^="authenticator"]')?.setAttribute('id','authenticator');initAuthenticator();initAuthBulk();let authImportSnapshot=null;$('auth-import')?.addEventListener('click',()=>{authImportSnapshot={issuer:$('auth-issuer').value,account:$('auth-account').value,secret:$('auth-secret').value,algorithm:$('auth-algorithm')?.value,digits:$('auth-digits')?.value,period:$('auth-period')?.value}},true);$('auth-import')?.addEventListener('click',()=>{const algorithm=($('auth-algorithm')?.value||'').replace('-',''),digits=Number($('auth-digits')?.value),period=Number($('auth-period')?.value),valid=['SHA1','SHA256','SHA512'].includes(algorithm)&&[6,7,8].includes(digits)&&Number.isInteger(period)&&period>=5&&period<=300;if(!valid&&authImportSnapshot){$('auth-issuer').value=authImportSnapshot.issuer;$('auth-account').value=authImportSnapshot.account;$('auth-secret').value=authImportSnapshot.secret;$('auth-algorithm').value=authImportSnapshot.algorithm;$('auth-digits').value=authImportSnapshot.digits;$('auth-period').value=authImportSnapshot.period;text('auth-status','Pairing URI rejected atomically: unsupported algorithm, digits, or period. No form value was changed.');}});$('auth-reveal-uri')?.addEventListener('click',()=>{if($('auth-qr'))$('auth-qr').hidden=$('auth-otpauth').hidden});initSupportTickets();initUnlockLadder();$('ladder-start')?.addEventListener('click',event=>{let lockout=null;try{lockout=JSON.parse(localStorage.getItem('ding-pbx-lockout-v1')||'null')}catch{}if(!lockout){event.preventDefault();event.stopImmediatePropagation();text('ladder-status','The ladder is available only for a real local lockout created by an unlock prompt. Settings cannot mint a free wait.');return}text('ladder-status',`Target ${lockout.targetId} is locked. Attempts available: ${lockout.attempts}.`);},true)}
  function historyFilteredRows(){const query=($('site-history-search')?.value||'').toLocaleLowerCase(),from=$('site-history-from')?.value||'',to=$('site-history-to')?.value||'',action=$('site-history-action')?.value||'';return historyRows().filter(row=>(!query||`${row.action} ${row.target} ${row.label}`.toLocaleLowerCase().includes(query))&&(!action||row.action===action)&&(!from||new Date(row.time)>=new Date(`${from}T00:00:00`))&&(!to||new Date(row.time)<=new Date(`${to}T23:59:59`)))}
  function restoreHistoryRow(row){if(row.target==='site-settings'&&row.after){Object.assign(state,row.after);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));applyState();return true}if(row.target==='tabs'&&row.after){tabState=row.after;localStorage.setItem(TAB_STORAGE_KEY,JSON.stringify(tabState));applyTabPresentation();renderTabManager();return true}if(row.target==='elements'&&row.after){elementState=row.after;localStorage.setItem(ELEMENT_STORAGE_KEY,JSON.stringify(elementState));applyElementPresentation();return true}return false}
  function renderHistory(){const list=$('site-history-list');if(!list)return;const rows=historyFilteredRows();historySelection=new Set([...historySelection].filter(id=>historyRows().some(row=>row.id===id)));list.innerHTML=rows.length?rows.map(row=>`<article class="record-list-item"><label><input type="checkbox" aria-label="Select history record ${escapeHtml(row.id)}" data-history-select="${escapeHtml(row.id)}" ${historySelection.has(row.id)?'checked':''}> <strong>${escapeHtml(row.action)}</strong></label><small>${escapeHtml(row.target)} · ${new Date(row.time).toLocaleString()}</small><p>${escapeHtml(row.label||'No label')}</p><button type="button" class="text-button" data-history-diff="${escapeHtml(row.id)}">View diff</button><button type="button" class="text-button" data-history-restore="${escapeHtml(row.id)}">Append restore</button></article>`).join(''):'<p class="empty-state">No history records match these filters.</p>';text('site-history-count',`${rows.length} record${rows.length===1?'':'s'} shown · ${historySelection.size} selected`)}
  function initHistorySurface(){if(!$('settings-search')||$('site-history'))return;const anchor=$('settings-search').closest('main');if(!anchor)return;anchor.insertAdjacentHTML('beforeend','<section id="site-history" class="surface-card" aria-labelledby="site-history-title"><h2 id="site-history-title">Local version history</h2><p>Append-only browser history for settings, tabs, appearance, locks, tickets, ladder, and status metadata. Secret values and credential digests are omitted. Retention is bounded to 500 records.</p><div class="history-filters"><label for="site-history-search">Search history<div class="search-composite"><input id="site-history-search" type="search" placeholder="Search history"><button class="regex-trigger" type="button" data-regex-for="site-history-search" aria-label="Build a regular expression for history search">.*</button></div></label><label for="site-history-from">From<input id="site-history-from" type="date"></label><label for="site-history-to">To<input id="site-history-to" type="date"></label><label for="site-history-action">Action<select id="site-history-action"><option value="">All actions</option></select></label><button id="site-history-select-all" type="button" class="text-button">Select all shown</button><button id="site-history-export" type="button" class="text-button">Export selected history</button></div><p id="site-history-count" class="filter-status" role="status"></p><div id="site-history-list" class="record-list" aria-live="polite"></div></section>');const actions=[...new Set(historyRows().map(row=>row.action))];$('site-history-action').insertAdjacentHTML('beforeend',actions.map(action=>`<option value="${escapeHtml(action)}">${escapeHtml(action)}</option>`).join(''));['site-history-search','site-history-from','site-history-to','site-history-action'].forEach(id=>$(id).addEventListener('input',renderHistory));$('site-history-select-all').addEventListener('click',()=>{historyFilteredRows().forEach(row=>historySelection.add(row.id));renderHistory()});$('site-history-export').addEventListener('click',()=>{const rows=historyRows().filter(row=>historySelection.has(row.id));download('site-history-redacted.json',JSON.stringify({version:1,records:rows,credentialsOmitted:true,retention:'500 records'},null,2),'application/json')});$('site-history-list').addEventListener('change',event=>{const id=event.target.dataset.historySelect;if(!id)return;if(event.target.checked)historySelection.add(id);else historySelection.delete(id);renderHistory()});$('site-history-list').addEventListener('click',event=>{const diff=event.target.dataset.historyDiff,restore=event.target.dataset.historyRestore;if(diff){const row=historyRows().find(item=>item.id===diff);if(row)notify('History diff',historyDiff(row))}if(restore){const row=historyRows().find(item=>item.id===restore);if(row&&restoreHistoryRow(row)){historyRecord('restored',row.target,row.before,row.after,`Restored from ${row.id}`);renderHistory()}}});initSearchableMenus();renderHistory()}

  let authPersistFailure='';
  const renderAuthenticatorBase=renderAuthenticator;
  renderAuthenticator=async function(){const selected=new Set(authSelected);await renderAuthenticatorBase();selected.forEach(id=>authSelected.add(id));if(authPersistFailure)text('auth-status',authPersistFailure)};
  const openAuthDeleteConfirmationBase=openAuthDeleteConfirmation;
  openAuthDeleteConfirmation=function(ids){openAuthDeleteConfirmationBase(ids);const old=$('auth-delete-confirm'),button=$('auth-delete-confirm');if(!old||!button)return;const fresh=button.cloneNode(true);button.replaceWith(fresh);fresh.addEventListener('click',async()=>{const before=authEntriesLastPersisted.map(entry=>({...entry}));authEntries=authEntries.filter(entry=>!ids.includes(entry.id));if(!(await persistAuthEntries())){authEntries=before;renderAuthenticator();return}authSelected.clear();pendingAuthDelete=null;old.close();renderAuthenticator()})};
  let pendingRouteClose=[];
  function initTabBulkClose(){const dialog=$('tab-manager-dialog');if(!dialog||$('tab-bulk-close'))return;dialog.insertAdjacentHTML('afterbegin','<section id="tab-bulk-close" class="tab-manager-section"><h3>Bulk close visible tab routes</h3><div class="search-composite"><label class="sr-only" for="tab-bulk-close-search">Bulk close search</label><input id="tab-bulk-close-search" type="search" placeholder="Text or regex pattern"><button class="regex-trigger" type="button" data-regex-for="tab-bulk-close-search">.*</button></div><label><input id="tab-bulk-include-protected" type="checkbox"> Include pinned or locked routes</label><p id="tab-bulk-preview" class="plain-note">Enter text to preview affected routes.</p><div class="builder-buttons"><button id="tab-bulk-containing" type="button" class="danger-button">Close containing text</button><button id="tab-bulk-not-containing" type="button" class="danger-button">Close not containing text</button><button id="tab-bulk-reopen" type="button" class="text-button">Reopen closed routes</button></div></section><dialog id="tab-close-confirm" class="overlay-card" aria-labelledby="tab-close-confirm-title"><form method="dialog"><h2 id="tab-close-confirm-title">Confirm route close</h2><p id="tab-close-confirm-text"></p><label>First confirmation key<input id="tab-close-key-one" type="password"></label><label>Second confirmation key<input id="tab-close-key-two" type="password"></label><label>Full-range confirmation<input id="tab-close-slider" type="range" min="0" max="100" value="0"><output id="tab-close-slider-output">0%</output></label><button id="tab-close-confirm-button" class="danger-button" type="button" disabled>Close exact routes</button><button id="tab-close-cancel" class="text-button" type="button">Emergency exit</button></form></dialog>');const matches=()=>{const query=$('tab-bulk-close-search').value.trim(),include=$('tab-bulk-include-protected').checked,items=tabItems().filter(item=>include||(!tabState.pinned.includes(item.id)&&!tabState.locks[item.id]));if(!query)return[];if(regexSearchEnabled('tab-bulk-close-search',query)){try{return items.filter(item=>new RegExp(regexState.get('tab-bulk-close-search').pattern,regexState.get('tab-bulk-close-search').flags).test(item.label))}catch{return[]}}return items.filter(item=>item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))};const update=()=>text('tab-bulk-preview',`${matches().length} route${matches().length===1?'':'s'} would close. Protected routes remain unless explicitly included.`);$('tab-bulk-close-search').addEventListener('input',update);$('tab-bulk-include-protected').addEventListener('change',update);$('tab-bulk-reopen').addEventListener('click',()=>{const reopened=tabState.closed||[];tabState.closed=[];const known=tabLinks().map(item=>item.id);known.forEach(id=>{if(!tabState.order.includes(id))tabState.order.push(id);if(!Object.values(tabState.groups).some(group=>group.includes(id)))(tabState.groups.Primary||=[]).push(id)});saveTabState();historyRecord('routes reopened','tabs',reopened,[],'Reopened closed routes');applyTabPresentation();renderTabManager();update()});['tab-bulk-containing','tab-bulk-not-containing'].forEach(id=>$(id).addEventListener('click',()=>{const items=matches(),query=$('tab-bulk-close-search').value.trim();if(!query)return;const include=$('tab-bulk-include-protected').checked,allItems=tabItems().filter(item=>include||(!tabState.pinned.includes(item.id)&&!tabState.locks[item.id])),matched=new Set(items.map(item=>item.id)),closing=id==='tab-bulk-containing'?allItems.filter(item=>matched.has(item.id)):allItems.filter(item=>!matched.has(item.id));if(!closing.length)return;pendingRouteClose=closing;const confirm=$('tab-close-confirm');$('tab-close-confirm-text').textContent=`${closing.length} route${closing.length===1?'':'s'} will be removed from this browser strip.`;$('tab-close-key-one').value='';$('tab-close-key-two').value='';$('tab-close-slider').value='0';$('tab-close-slider-output').textContent='0%';$('tab-close-confirm-button').disabled=true;confirm.showModal()}));const confirm=$('tab-close-confirm'),ready=()=>{const ok=Boolean($('tab-close-key-one').value&&$('tab-close-key-two').value&&Number($('tab-close-slider').value)===100);$('tab-close-confirm-button').disabled=!ok;$('tab-close-slider-output').textContent=`${$('tab-close-slider').value}%`};confirm.addEventListener('input',ready);$('tab-close-cancel').addEventListener('click',()=>{pendingRouteClose=[];confirm.close()});$('tab-close-confirm-button').addEventListener('click',()=>{const ids=pendingRouteClose.map(item=>item.id);tabState.closed=[...new Set([...(tabState.closed||[]),...ids])];tabState.order=tabState.order.filter(id=>!ids.includes(id));Object.values(tabState.groups).forEach(group=>ids.forEach(id=>{const index=group.indexOf(id);if(index>=0)group.splice(index,1)}));saveTabState();historyRecord('routes closed','tabs',ids,[],'Closed routes by text');pendingRouteClose=[];confirm.close();applyTabPresentation();renderTabManager();update()})}
  const persistAuthEntriesBase=persistAuthEntries;
  persistAuthEntries=async function(){const before=authEntriesLastPersisted.map(entry=>({...entry})),ok=await persistAuthEntriesBase();authPersistFailure=ok?'':`Authenticator mutation was not persisted. The previous durable entry set remains active. ${$('auth-status')?.textContent||'Retry after checking local protection.'}`;if(ok)historyRecord('authenticator changed','authenticator',before,authEntries,'Persisted authenticator mutation');return ok};
  const initStatusHubBase=initStatusHub;
  initStatusHub=function(){initStatusHubBase();$('status-hub-save')?.addEventListener('click',()=>historyRecord('status changed','status-hub',null,readLocalStatusProjection(),'Saved local status projection'))};
  const initHistorySurfaceBase=initHistorySurface;
  initHistorySurface=function(){initHistorySurfaceBase();const exportButton=$('site-history-export');if(!exportButton)return;if(!$('site-history-retention')){exportButton.insertAdjacentHTML('afterend','<label for="site-history-retention">Retention<select id="site-history-retention"><option value="500">500 records</option><option value="250">250 records</option><option value="100">100 records</option></select></label><button id="site-history-prune" type="button" class="text-button">Prune history</button>');$('site-history-prune').addEventListener('click',()=>{const limit=Number($('site-history-retention').value)||500,rows=historyRows().slice(-limit);localStorage.setItem(HISTORY_KEY,JSON.stringify(rows));historyRecord('history retention changed','history',{limit:500},{limit},`Pruned to ${limit} records`);renderHistory()})}const actionCounts=historyRows().reduce((counts,row)=>(counts[row.action]=(counts[row.action]||0)+1,counts),{});all('#site-history-action option').forEach(option=>{if(option.value)option.textContent=`${option.value} (${actionCounts[option.value]||0})`});if(!$('site-history-date-preset')){$('site-history-to')?.insertAdjacentHTML('afterend','<label for="site-history-date-preset">Date preset<select id="site-history-date-preset"><option value="">Custom range</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>');$('site-history-date-preset').addEventListener('change',event=>{const value=event.target.value;if(!value){renderHistory();return}const end=new Date(),start=new Date(end);if(value==='today')start.setHours(0,0,0,0);else start.setDate(start.getDate()-Number(value));$('site-history-from').value=start.toISOString().slice(0,10);$('site-history-to').value=end.toISOString().slice(0,10);renderHistory()})}};
  const initGroupEditorBase=initGroupEditor;
  initGroupEditor=function(){initGroupEditorBase();const editor=$('tab-group-editor'),color=$('tab-group-color');if(!editor||!color||$('tab-group-color-reset'))return;color.insertAdjacentHTML('afterend','<button id="tab-group-color-reset" type="button" class="text-button">Reset group colour</button><span id="tab-group-contrast" class="filter-status" role="status"></span>');const sync=()=>{const group=tabState?.activeGroup,parsed=parseColour(color.value),ratio=parsed?contrastRatio(parsed,pageSurfaceColour()):0;text('tab-group-contrast',parsed?`Group colour contrast ${ratio.toFixed(2)}:1 against the page surface.`:'Group colour is unavailable.');applyTabPresentation()};color.addEventListener('input',sync);$('tab-group-color-reset').addEventListener('click',()=>{color.value='#82D9A5';color.dispatchEvent(new Event('input',{bubbles:true}));});sync()};
  const applyTabPresentationBase=applyTabPresentation;
  applyTabPresentation=function(){applyTabPresentationBase();if(!tabState)return;all('#site-nav a.site-tab').forEach(link=>{const group=tabGroupFor(link.dataset.tabId),color=tabState.groupMeta?.[group]?.color;if(/^#[0-9a-f]{6}$/i.test(color||'')){link.style.setProperty('--tab-accent',color);link.dataset.groupColor=color}})};
  const ladderIssueV2Base=ladderIssueV2;
  ladderIssueV2=payload=>ladderIssueV2Base({...payload,...(payload?.rung==='sums'?{sumIndex:Number.isInteger(payload.sumIndex)?payload.sumIndex:Number(ladderState?.sumIndex)||0}:{})});
  const ladderGradeV2Base=ladderGradeV2;
  ladderGradeV2=async function(answer){if(!ladderNonceV2){ladderState.challenge=await ladderIssueV2({rung:ladderState.rung,roundId:ladderState.challenge?.roundId,challenge:ladderState.challenge});ladderSave();}return ladderGradeV2Base(answer)};
  const restoreHistoryRowBase=restoreHistoryRow;
  restoreHistoryRow=function(row){if(row.target==='status-hub'&&row.after){localStorage.setItem('ding-pbx-site-status-hub-v1',JSON.stringify(row.after));initStatusHub();return true}if(row.target==='tickets'&&row.after){localStorage.setItem(TICKET_STORAGE_KEY,JSON.stringify(row.after));renderTickets();return true}if(row.target==='unlock-ladder'&&row.after){localStorage.setItem(LADDER_STORAGE_KEY,JSON.stringify(row.after));ladderState=row.after;renderLadder();return true}return restoreHistoryRowBase(row)};
  const restoreHistoryRowFix=restoreHistoryRow;
  restoreHistoryRow=function(row){if(row.target==='tickets'&&row.after){localStorage.setItem(TICKET_STORAGE_KEY,JSON.stringify(Array.isArray(row.after)?row.after:[row.after]));renderTickets();return true}return restoreHistoryRowFix(row)};
  const restoreHistoryRowFix2=restoreHistoryRow;
  restoreHistoryRow=function(row){if(row.target==='authenticator'){notify('History restore unavailable','Authenticator secrets are omitted, so this revision cannot restore the live entry set.');return false}return restoreHistoryRowFix2(row)};
  const restoreHistoryRowFinal=restoreHistoryRow;
  restoreHistoryRow=function(row){const ok=restoreHistoryRowFinal(row);notify(ok?'History restore applied':'History restore unavailable',ok?`Applied ${row.id} as live state and kept the prior revision in append-only history.`:'This record has no safe local restore path; the live state was not changed.');return ok};
  renderAuthQr=function(entry){const target=$('auth-qr');if(!target||!entry)return;const uri=authUri(entry),render=()=>{try{const generator=window.qrcode(0,'M');generator.addData(uri,'Byte');generator.make();target.innerHTML=generator.createSvgTag({cellSize:4,margin:16});const svg=target.querySelector('svg');if(!svg)return;svg.querySelectorAll('title,desc,description').forEach(node=>node.remove());const suffix=stableElementSlug(entry.id||`${entry.issuer}-${entry.account}`),titleId=`auth-qr-${suffix}-title`,descriptionId=`auth-qr-${suffix}-description`,title=document.createElementNS('http://www.w3.org/2000/svg','title'),description=document.createElementNS('http://www.w3.org/2000/svg','desc');title.id=titleId;description.id=descriptionId;title.textContent=`Authenticator pairing for ${entry.issuer} ${entry.account}`;description.textContent=`Scannable QR encoding the exact pairing URI for ${entry.issuer} ${entry.account}.`;svg.prepend(description,title);svg.setAttribute('role','img');svg.removeAttribute('aria-label');svg.setAttribute('aria-labelledby',`${titleId} ${descriptionId}`);target.hidden=true}catch(error){target.textContent=`QR rendering unavailable: ${error.message}`}};if(typeof window.qrcode==='function')render();else{const script=document.createElement('script');script.src='qr-encoder.js';script.onload=render;script.onerror=()=>{target.textContent='The bundled QR encoder could not be loaded.'};document.head.appendChild(script)}};
  function initChangelogViewer(){if(!$('settings-search')||$('site-changelog-viewer'))return;const anchor=$('settings-search').closest('main');if(!anchor)return;anchor.insertAdjacentHTML('beforeend','<section id="site-changelog-viewer" class="surface-card" aria-labelledby="site-changelog-title"><h2 id="site-changelog-title">Changelog</h2><p>Only release records embedded by the site composer are shown. No version, date, or commit is invented when the record is absent.</p><div class="history-filters"><label for="site-changelog-search">Search changelog<div class="search-composite"><input id="site-changelog-search" type="search" placeholder="Search released changes"><button id="site-changelog-regex" class="regex-trigger" type="button" data-regex-for="site-changelog-search" aria-label="Build a regular expression for changelog search">.*</button></div></label><label for="site-changelog-from">From<input id="site-changelog-from" type="date"></label><label for="site-changelog-to">To<input id="site-changelog-to" type="date"></label><button id="site-changelog-copy" type="button" class="text-button">Copy shown changelog</button><button id="site-changelog-export" type="button" class="text-button">Export shown Markdown</button></div><p id="site-changelog-status" class="filter-status" role="status"></p><div id="site-changelog-list" class="record-list" aria-live="polite"></div></section>');let records=[];try{const statusRecord=(()=>{try{return JSON.parse($('site-status-record')?.textContent||'{}')}catch{return{}}})();const raw=JSON.parse($('site-changelog-record')?.textContent||JSON.stringify(statusRecord.changelog||[]));records=(Array.isArray(raw)?raw:raw.records||[]).filter(row=>row&&typeof row.version==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&/^[0-9a-f]{40}$/i.test(row.commit)&&Array.isArray(row.changes)&&row.changes.every(change=>change&&typeof change.text==='string'&&/^[0-9a-f]{40}$/i.test(change.commit)))}catch{}const filtered=()=>{const query=($('site-changelog-search').value||'').trim(),from=$('site-changelog-from').value,to=$('site-changelog-to').value;return records.filter(row=>{const hay=`${row.version} ${row.date} ${row.changes.map(change=>change.text).join(' ')}`,matches=!query||(regexSearchEnabled('site-changelog-search',query)?(()=>{try{return new RegExp(regexState.get('site-changelog-search').pattern,regexState.get('site-changelog-search').flags).test(hay)}catch{return false}})():hay.toLocaleLowerCase().includes(query.toLocaleLowerCase()));return matches&&(!from||row.date>=from)&&(!to||row.date<=to)})};const markdown=rows=>rows.map(row=>`## ${row.version} · ${row.date}\\n\\n${row.changes.map(change=>`- ${change.text} (${change.commit})`).join('\\n')}\\n`).join('\\n');const render=()=>{const rows=filtered();$('site-changelog-list').innerHTML=rows.length?rows.map(row=>`<article class="record-list-item"><h3>${escapeHtml(row.version)}</h3><small>${escapeHtml(row.date)}</small><ul>${row.changes.map(change=>`<li>${escapeHtml(change.text)} <a href="https://github.com/Ding-Ding-Projects/asterisk/commit/${encodeURIComponent(change.commit)}" target="_blank" rel="noreferrer">${escapeHtml(change.commit.slice(0,7))}</a></li>`).join('')}</ul><a href="https://github.com/Ding-Ding-Projects/asterisk/commit/${encodeURIComponent(row.commit)}" target="_blank" rel="noreferrer">Commit ${escapeHtml(row.commit.slice(0,7))}</a></article>`).join(''):'<p class="empty-state">No validated release records match these filters.</p>';text('site-changelog-status',`${rows.length} validated release record${rows.length===1?'':'s'} shown.`);return rows};['site-changelog-search','site-changelog-from','site-changelog-to'].forEach(id=>$(id).addEventListener('input',render));$('site-changelog-copy').addEventListener('click',()=>{const value=markdown(render());if(!navigator.clipboard?.writeText){notify('Copy unavailable','The browser did not provide a clipboard action.');return}navigator.clipboard.writeText(value).then(()=>notify('Changelog copied','The current filtered changelog was copied as Markdown.')).catch(()=>notify('Copy unavailable','The browser rejected the clipboard action.'))});$('site-changelog-export').addEventListener('click',()=>download('changelog-filtered.md',markdown(render()),'text/markdown'));document.addEventListener('click',event=>{if(event.target.closest('#site-changelog-regex')){event.preventDefault();openRegex('site-changelog-search')}});render()}

  const APPEARANCE_DEPTH_FIELDS=['fontFamily','fontSize','fontWeight','fontStyle','textDecoration','textDecorationStyle','textTransform','fontVariant','verticalAlign','color','highlight','borderRadius','letterSpacing','wordSpacing','lineHeight','direction','textAlign','textShadow','outline','rainbow','rainbowSpeed'];
  const BUNDLED_FONT_FAMILIES=['Roboto','Roboto Mono','system-ui','sans-serif','serif','monospace','CJK-safe fallback'];
  const THEME_PRESETS={"Ding dark":{theme:'dark',density:'comfortable',accent:'#82D9A5',fontScale:100,lowMotion:false},"Paper light":{theme:'light',density:'comfortable',accent:'#006A60',fontScale:100,lowMotion:false},"High contrast":{theme:'contrast',density:'comfortable',accent:'#FFFFFF',fontScale:110,lowMotion:true}};
  function validatedFontFamily(raw){const value=String(raw||'').trim();if(!value||value.length>120||/[{};<>]/.test(value))return '';return value.split(',').map(part=>part.trim()).filter(Boolean).every(part=>/^[\w .\"',-]+$/.test(part))?value:''}
  function fontAvailability(family){const raw=String(family||'').trim();if(!raw)return{state:'empty',message:'Choose a bundled, generic, or typed font family. Browser font enumeration remains local to this page.'};const clean=validatedFontFamily(raw);if(!clean)return{state:'invalid',message:'Typed font family contains unsupported characters.'};if(!document.fonts?.check)return{state:'unknown',message:'This browser does not expose document.fonts.check, so availability is not verified.'};const name=clean.includes(' ')?'\"'+clean+'\"':clean;const available=document.fonts.check('16px '+name);return{state:available?'available':'fallback',message:available?clean+' is available in this browser.':clean+' was not reported as installed; the CJK-safe fallback remains active.'}}
  const RAINBOW_DURATIONS={1:18,2:12,3:8,4:5,5:3};
  function appearanceCopy(english,cantonese){const language=effectiveState().language,level=language==='zh'?state.cantoneseFunny:state.englishFunny,playful=level>=4?`${english} ${level>=5?'The colour wheel is doing a tiny tai chi.':''}`:english,spoken=level>=4?`${cantonese} ${level>=5?'顏色轉緊圈圈，唔使驚。':''}`:cantonese;return language==='zh'?spoken:language==='both'?`${playful} / ${spoken}`:playful}
  function appearanceTarget(){const dialog=$('tab-appearance-dialog');if(!dialog)return null;return dialog.dataset.elementKey?{kind:'element',id:dialog.dataset.elementKey}:dialog.dataset.tabId?{kind:'tab',id:dialog.dataset.tabId}:null}
  function appearanceRecord(target){return target?.kind==='element'?elementState.appearance[target.id]||{}:tabState?.appearance?.[target?.id]||{}}
  function appearanceValueFromControls(){const color=$('appearance-text-color')?.value.trim()||'#82D9A5',highlight=$('appearance-highlight-color')?.value.trim()||'',rainbow=$('appearance-rainbow')?.value==='rainbow';if(!rainbow&&!parseColour(color))throw new Error('Enter a valid colour in any supported colour space or choose the rainbow sentinel.');if(highlight&&!parseColour(highlight))throw new Error('Enter a valid highlight colour in any supported colour space.');const familyInput=$('appearance-font-family')?.value||'',family=validatedFontFamily(familyInput);if(familyInput&&!family)throw new Error('Enter a font family using names, spaces, commas, or hyphens only.');return{accent:rainbow?RAINBOW:formatColour(parseColour(color),'hex'),fontScale:Number($('appearance-font-size')?.value)||100,fontFamily:family,fontSize:Math.max(8,Math.min(96,Number($('appearance-font-size')?.value)||16)),fontWeight:$('appearance-font-weight')?.value||'400',fontStyle:$('appearance-font-style')?.value||'normal',textDecoration:$('appearance-text-decoration')?.value||'none',textDecorationStyle:$('appearance-decoration-style')?.value||'solid',textTransform:$('appearance-text-transform')?.value||'none',fontVariant:$('appearance-font-variant')?.value||'normal',verticalAlign:$('appearance-vertical-align')?.value||'baseline',color:rainbow?RAINBOW:color,highlight,borderRadius:Math.max(0,Math.min(96,Number($('appearance-radius')?.value)||0)),letterSpacing:Math.max(-8,Math.min(32,Number($('appearance-letter-spacing')?.value)||0)),wordSpacing:Math.max(-8,Math.min(64,Number($('appearance-word-spacing')?.value)||0)),lineHeight:Math.max(.8,Math.min(4,Number($('appearance-line-height')?.value)||1.4)),direction:$('appearance-direction')?.value||'inherit',textAlign:$('appearance-align')?.value||'inherit',textShadow:$('appearance-shadow')?.value.trim().slice(0,180)||'',outline:$('appearance-outline')?.value.trim().slice(0,180)||'',rainbow,rainbowSpeed:Math.max(1,Math.min(5,Number($('appearance-rainbow-speed')?.value)||3))}}
  function fillAppearanceControls(value={}){$('appearance-text-color').value=value.color||value.accent||'#82D9A5';$('appearance-highlight-color').value=value.highlight||'';$('appearance-rainbow').value=value.rainbow||value.accent===RAINBOW?'rainbow':'solid';$('appearance-rainbow-speed').value=String(value.rainbowSpeed||3);$('appearance-font-family').value=value.fontFamily||'';$('appearance-font-size').value=String(value.fontSize||value.fontScale||16);$('appearance-font-weight').value=String(value.fontWeight||'400');$('appearance-font-style').value=value.fontStyle||'normal';$('appearance-text-decoration').value=value.textDecoration||'none';$('appearance-decoration-style').value=value.textDecorationStyle||'solid';$('appearance-text-transform').value=value.textTransform||'none';$('appearance-font-variant').value=value.fontVariant||'normal';$('appearance-vertical-align').value=value.verticalAlign||'baseline';$('appearance-radius').value=String(value.borderRadius||0);$('appearance-letter-spacing').value=String(value.letterSpacing||0);$('appearance-word-spacing').value=String(value.wordSpacing||0);$('appearance-line-height').value=String(value.lineHeight||1.4);$('appearance-direction').value=value.direction||'inherit';$('appearance-align').value=value.textAlign||'inherit';$('appearance-shadow').value=value.textShadow||'';$('appearance-outline').value=value.outline||'';const parsed=parseColour(value.color||value.accent||'#82D9A5'),activeFormat=$('appearance-color-space')?.value||'hex';text('appearance-color-status',parsed?appearanceCopy(`${COLOUR_FORMATS.length} colour spaces available. Active: ${formatColour(parsed,activeFormat)}. Contrast: ${contrastRatio(parsed,pageSurfaceColour()).toFixed(2)}:1.`,'顏色空間已準備好，對比度已計算。'):appearanceCopy('Rainbow sentinel active. Reduced motion settles it to one hue.','彩虹標記已啟用，減少動態時固定成一個色調。'))}
  function applyAppearanceDepthStyles(){const apply=(element,value)=>{if(!element||!value)return;const style=element.style;['color','background-color','font-family','font-size','font-weight','font-style','text-decoration','text-decoration-style','text-transform','font-variant','vertical-align','border-radius','letter-spacing','word-spacing','line-height','direction','text-align','text-shadow','outline'].forEach(name=>style.removeProperty(name));element.classList.remove('appearance-rainbow');if(value.color===RAINBOW||value.rainbow){element.classList.add('appearance-rainbow');style.setProperty('--appearance-rainbow-duration',`${RAINBOW_DURATIONS[value.rainbowSpeed]||8}s`);if(reduceMotion())style.setProperty('background-image','linear-gradient(135deg,hsl(160 55% 42%),hsl(160 55% 42%))');else style.removeProperty('background-image')}else{style.removeProperty('background-image');if(parseColour(value.color))style.setProperty('color',value.color);if(parseColour(value.highlight))style.setProperty('background-color',value.highlight)}const family=validatedFontFamily(value.fontFamily);if(family)style.setProperty('font-family',family+', "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif');if(value.fontSize)style.setProperty('font-size',`${Math.max(8,Math.min(96,Number(value.fontSize)||16))}px`);if(value.fontWeight)style.setProperty('font-weight',value.fontWeight);if(value.fontStyle)style.setProperty('font-style',value.fontStyle);if(value.textDecoration)style.setProperty('text-decoration',value.textDecoration);if(value.textDecorationStyle)style.setProperty('text-decoration-style',value.textDecorationStyle);if(value.textTransform)style.setProperty('text-transform',value.textTransform);if(value.fontVariant)style.setProperty('font-variant',value.fontVariant);if(value.verticalAlign)style.setProperty('vertical-align',value.verticalAlign);if(Number.isFinite(Number(value.borderRadius)))style.setProperty('border-radius',`${value.borderRadius}px`);if(Number.isFinite(Number(value.letterSpacing)))style.setProperty('letter-spacing',`${value.letterSpacing}px`);if(Number.isFinite(Number(value.wordSpacing)))style.setProperty('word-spacing',`${value.wordSpacing}px`);if(Number.isFinite(Number(value.lineHeight)))style.setProperty('line-height',String(value.lineHeight));if(value.direction)style.setProperty('direction',value.direction);if(value.textAlign)style.setProperty('text-align',value.textAlign);if(value.textShadow)style.setProperty('text-shadow',value.textShadow);if(value.outline)style.setProperty('outline',value.outline)};if(tabState)Object.entries(tabState.appearance||{}).forEach(([id,value])=>apply(tabLinks().find(item=>item.id===id)?.link,value));Object.entries(elementState.appearance||{}).forEach(([key,value])=>apply(elementFromKey(key),value))}
  function initAppearanceEditorDepth(){const dialog=$('tab-appearance-dialog');if(!dialog)return;if(!$('appearance-depth-fields'))dialog.querySelector('form').insertAdjacentHTML('beforeend','<fieldset id="appearance-depth-fields"><legend data-appearance-en="Word-depth appearance editor" data-appearance-zh="Word 深度外觀編輯器">Word-depth appearance editor</legend><label><span data-appearance-en="Text colour" data-appearance-zh="文字顏色">Text colour</span><input id="appearance-text-color" type="text" value="#82D9A5" maxlength="80"></label><label><span data-appearance-en="Highlight colour" data-appearance-zh="螢光標記顏色">Highlight colour</span><input id="appearance-highlight-color" type="text" maxlength="80" placeholder="Optional"></label><label><span data-appearance-en="Colour space" data-appearance-zh="顏色空間">Colour space</span><select id="appearance-color-space"><option value="hex">hex</option><option value="rgb">rgb</option><option value="hsl">hsl</option><option value="hsv">hsv</option><option value="hwb">hwb</option><option value="cmyk">cmyk</option><option value="lab">lab</option><option value="lch">lch</option><option value="oklab">oklab</option><option value="oklch">oklch</option><option value="name">name</option></select></label><label><span data-appearance-en="Rainbow mode" data-appearance-zh="彩虹模式">Rainbow mode</span><select id="appearance-rainbow"><option value="solid">Solid colour</option><option value="rainbow">Animated rainbow sentinel</option></select></label><label><span data-appearance-en="Rainbow speed level" data-appearance-zh="彩虹速度級別">Rainbow speed level</span><select id="appearance-rainbow-speed"><option value="1">1, slowest</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5, fastest</option></select></label><p id="appearance-color-status" class="filter-status" role="status"></p><label><span data-appearance-en="Font family" data-appearance-zh="字體家族">Font family</span><input id="appearance-font-family" type="text" maxlength="120" placeholder="Installed or bundled family"></label><label><span data-appearance-en="Font size in pixels" data-appearance-zh="像素字體大小">Font size in pixels</span><input id="appearance-font-size" type="number" min="8" max="96" step="1" value="16"></label><label><span data-appearance-en="Weight" data-appearance-zh="字重">Weight</span><select id="appearance-font-weight"><option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option><option value="900">900</option></select></label><label><span data-appearance-en="Style" data-appearance-zh="樣式">Style</span><select id="appearance-font-style"><option value="normal">Normal</option><option value="italic">Italic</option><option value="oblique">Oblique</option></select></label><label><span data-appearance-en="Underline and strike" data-appearance-zh="底線及刪除線">Underline and strike</span><select id="appearance-text-decoration"><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Single strike</option><option value="underline line-through">Underline and strike</option><option value="overline">Overline</option></select></label><label><span data-appearance-en="Capitalization" data-appearance-zh="大小寫">Capitalization</span><select id="appearance-text-transform"><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></label><label><span data-appearance-en="Small caps" data-appearance-zh="小型大寫">Small caps</span><select id="appearance-font-variant"><option value="normal">Normal</option><option value="small-caps">Small caps</option></select></label><label><span data-appearance-en="Superscript or subscript" data-appearance-zh="上標或下標">Superscript or subscript</span><select id="appearance-vertical-align"><option value="baseline">Baseline</option><option value="super">Superscript</option><option value="sub">Subscript</option></select></label><label><span data-appearance-en="Corner radius in pixels" data-appearance-zh="像素圓角半徑">Corner radius in pixels</span><input id="appearance-radius" type="number" min="0" max="96" value="0"></label><label><span data-appearance-en="Character spacing in pixels" data-appearance-zh="像素字元間距">Character spacing in pixels</span><input id="appearance-letter-spacing" type="number" min="-8" max="32" step=".1" value="0"></label><label><span data-appearance-en="Word spacing in pixels" data-appearance-zh="像素字詞間距">Word spacing in pixels</span><input id="appearance-word-spacing" type="number" min="-8" max="64" step=".1" value="0"></label><label><span data-appearance-en="Line height" data-appearance-zh="行高">Line height</span><input id="appearance-line-height" type="number" min=".8" max="4" step=".1" value="1.4"></label><label><span data-appearance-en="Text direction" data-appearance-zh="文字方向">Text direction</span><select id="appearance-direction"><option value="inherit">Inherit</option><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label><label><span data-appearance-en="Alignment" data-appearance-zh="對齊">Alignment</span><select id="appearance-align"><option value="inherit">Inherit</option><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="justify">Justify</option></select></label><label><span data-appearance-en="Shadow CSS" data-appearance-zh="陰影 CSS">Shadow CSS</span><input id="appearance-shadow" type="text" maxlength="180"></label><label><span data-appearance-en="Outline CSS" data-appearance-zh="輪廓 CSS">Outline CSS</span><input id="appearance-outline" type="text" maxlength="180"></label><div class="builder-buttons"><button id="appearance-export" type="button" class="text-button">Export appearance JSON</button><button id="appearance-import-button" type="button" class="text-button">Import appearance JSON</button><input id="appearance-import" type="file" accept="application/json,.json" hidden></div></fieldset>');if(!$('appearance-decoration-style'))$('appearance-text-decoration').insertAdjacentHTML('afterend','<label><span data-appearance-en="Decoration style" data-appearance-zh="裝飾樣式">Decoration style</span><select id="appearance-decoration-style"><option value="solid">Solid</option><option value="double">Double</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="wavy">Wavy</option></select></label>');;const appearanceFont=$('appearance-font-family');if(appearanceFont&&!$('appearance-font-options')){appearanceFont.setAttribute('list','appearance-font-options');appearanceFont.insertAdjacentHTML('afterend','<datalist id="appearance-font-options">'+BUNDLED_FONT_FAMILIES.map(font=>'<option value="'+escapeHtml(font)+'"></option>').join('')+'</datalist><p id="appearance-font-status" class="filter-status" role="status"></p>');const report=()=>{const result=fontAvailability(appearanceFont.value);text('appearance-font-status',result.message+' CJK-safe fallback remains available.');};appearanceFont.addEventListener('input',report);appearanceFont.addEventListener('change',report);report()}const localize=()=>{const language=effectiveState().language;all('#appearance-depth-fields [data-appearance-en]').forEach(node=>node.textContent=language==='zh'?node.dataset.appearanceZh:language==='both'?`${node.dataset.appearanceEn} / ${node.dataset.appearanceZh}`:node.dataset.appearanceEn);const labels={"appearance-export":['Export appearance JSON','匯出外觀 JSON'],"appearance-import-button":['Import appearance JSON','匯入外觀 JSON']};Object.entries(labels).forEach(([id,[en,zh]])=>{if($(id))$(id).textContent=language==='zh'?zh:language==='both'?`${en} / ${zh}`:en});const options={"appearance-rainbow":[['solid','Solid colour','純色'],['rainbow','Animated rainbow sentinel','動畫彩虹標記'],],"appearance-rainbow-speed":[['1','1, slowest','1，最慢'],['5','5, fastest','5，最快']]};Object.entries(options).forEach(([id,items])=>items.forEach(([value,en,zh])=>{const option=$(id)?.querySelector(`option[value="${value}"]`);if(option)option.textContent=language==='zh'?zh:language==='both'?`${en} / ${zh}`:en}))};const fill=()=>fillAppearanceControls(appearanceRecord(appearanceTarget()));const baseElementOpen=openElementAppearance;const baseTabOpen=openTabAppearance;openElementAppearance=element=>{baseElementOpen(element);fill()};openTabAppearance=id=>{baseTabOpen(id);fill()};const saveButton=$('tab-appearance-save'),resetButton=$('tab-appearance-reset'),freshSave=saveButton.cloneNode(true),freshReset=resetButton.cloneNode(true);saveButton.replaceWith(freshSave);resetButton.replaceWith(freshReset);freshSave.addEventListener('click',()=>{try{const target=appearanceTarget(),value=appearanceValueFromControls();if(!target)return;if(target.kind==='element'){if(elementState.locks[target.id])return;elementState.appearance[target.id]=value;saveElementState();applyElementPresentation()}else{if(tabState.locks[target.id])return;tabState.appearance[target.id]=value;saveTabState();applyTabPresentation()}dialog.close();notify('Appearance saved',applyVocabularyText(`Saved ${APPEARANCE_DEPTH_FIELDS.length} local appearance properties. Funny level ${effectiveState().language==='zh'?state.cantoneseFunny:state.englishFunny} styles this message without changing its facts.`))}catch(error){text('appearance-color-status',applyVocabularyText(error.message))}});freshReset.addEventListener('click',()=>{const target=appearanceTarget();if(!target)return;if(target.kind==='element')resetElementAppearance(target.id);else resetTabAppearance(target.id);fill();dialog.close()});$('appearance-color-space').addEventListener('change',()=>fillAppearanceControls(appearanceRecord(appearanceTarget())));$('appearance-text-color').addEventListener('input',()=>fillAppearanceControls({...appearanceRecord(appearanceTarget()),color:$('appearance-text-color').value}));$('appearance-rainbow').addEventListener('change',()=>fillAppearanceControls({...appearanceRecord(appearanceTarget()),rainbow:$('appearance-rainbow').value==='rainbow'}));$('appearance-export').addEventListener('click',()=>{const target=appearanceTarget();if(target)download(`appearance-${target.kind}-${target.id}.json`,JSON.stringify({version:1,target,appearance:appearanceRecord(target)},null,2),'application/json')});$('appearance-import-button').addEventListener('click',()=>$('appearance-import').click());$('appearance-import').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file||file.size>65536){text('appearance-color-status','Import rejected: JSON must be at most 64 KiB.');return}try{const parsed=JSON.parse(await file.text());if(parsed.version!==1||!parsed.appearance||typeof parsed.appearance!=='object')throw new Error('Import rejected: expected an appearance version 1 object.');const target=appearanceTarget();if(!target)throw new Error('Import rejected: no appearance target is selected.');if(target.kind==='element'){elementState.appearance[target.id]=parsed.appearance;saveElementState();applyElementPresentation()}else{tabState.appearance[target.id]=parsed.appearance;saveTabState();applyTabPresentation()}fill();text('appearance-color-status','Appearance import applied locally and recorded in history.')}catch(error){text('appearance-color-status',error.message)}});localize();dialog.addEventListener('close',localize);document.addEventListener('change',event=>{if(event.target.id==='language-mode'||event.target.id==='shell-language')localize()});const applyElementBase=applyElementPresentation;applyElementPresentation=()=>{applyElementBase();applyAppearanceDepthStyles()};const applyTabBase=applyTabPresentation;applyTabPresentation=()=>{applyTabBase();applyAppearanceDepthStyles()};fill()}
  function parseHistoryDateInput(value){const raw=String(value||'').trim();if(!raw)return '';if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw)){const [year,month,day]=raw.split('-').map(Number),candidate=new Date(year,month-1,day);return candidate.getFullYear()===year&&candidate.getMonth()===month-1&&candidate.getDate()===day?raw:''}const numbers=raw.match(/[0-9]+/g)||[];if(numbers.length<3)return '';const order=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(2001,10,22)).filter(part=>['year','month','day'].includes(part.type)).map(part=>part.type),values={};order.forEach((part,index)=>{values[part]=Number(numbers[index])});const year=values.year<100?2000+values.year:values.year,month=values.month,day=values.day,candidate=new Date(year,month-1,day);return Number.isInteger(year)&&Number.isInteger(month)&&Number.isInteger(day)&&candidate.getFullYear()===year&&candidate.getMonth()===month-1&&candidate.getDate()===day?candidate.toISOString().slice(0,10):''}
  function initHistoryCalendar(){const filters=$('site-history')?.querySelector('.history-filters');if(!filters||$('site-history-calendar'))return;filters.insertAdjacentHTML('beforeend','<section id="site-history-calendar" class="history-calendar" aria-labelledby="site-history-calendar-title"><h3 id="site-history-calendar-title">Calendar range</h3><div class="builder-buttons"><button id="site-history-month-prev" type="button" class="text-button" aria-label="Previous month">Previous month</button><label for="site-history-month">Month and year<input id="site-history-month" type="month"></label><button id="site-history-month-next" type="button" class="text-button" aria-label="Next month">Next month</button></div><label for="site-history-date-text">Type a date in local format or ISO<input id="site-history-date-text" type="text" placeholder="2026-08-24"></label><p id="site-history-calendar-status" class="filter-status" role="status"></p><div id="site-history-days" class="history-day-grid" role="grid" aria-label="History date range"></div></section>');const from=$('site-history-from'),to=$('site-history-to'),month=$('site-history-month'),days=$('site-history-days'),status=$('site-history-calendar-status'),today=new Date();const isoDate=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate()).toISOString().slice(0,10);const render=()=>{const selectedMonth=month.value?new Date(`${month.value}-01T00:00:00`):today,year=selectedMonth.getFullYear(),monthIndex=selectedMonth.getMonth(),first=new Date(year,monthIndex,1),start=new Date(year,monthIndex,1-first.getDay()),labels=[0,1,2,3,4,5,6].map(offset=>new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date(2024,0,7+offset)));days.innerHTML=Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);const iso=isoDate(date),outside=date.getMonth()!==monthIndex,active=iso===from.value||iso===to.value||Boolean(from.value&&to.value&&iso>from.value&&iso<to.value),label=`${new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date)}${active?' selected in the current range':''}`;return `<button type="button" role="gridcell" class="history-day${outside?' outside-month':''}${active?' selected-day':''}" data-history-date="${iso}" aria-label="${label}" aria-selected="${String(iso===from.value||iso===to.value)}">${date.getDate()}</button>`}).join('');status.textContent=from.value&&to.value?`Selected range ${from.value} through ${to.value}.`:from.value?`Range starts at ${from.value}; choose an end date.`:'Choose a start date.';};const setMonth=value=>{month.value=value;render()};month.value=from.value?from.value.slice(0,7):`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;const move=delta=>{const date=new Date(`${month.value}-01T00:00:00`);date.setMonth(date.getMonth()+delta);setMonth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`)};$('site-history-month-prev').addEventListener('click',()=>move(-1));$('site-history-month-next').addEventListener('click',()=>move(1));month.addEventListener('change',render);$('site-history-date-text').addEventListener('input',event=>{const raw=String(event.target.value||'').trim(),parsed=parseHistoryDateInput(raw);if((raw.match(/[0-9]+/g)||[]).length<3){status.textContent='Partial date retained. Finish the local date or use YYYY-MM-DD.';return}if(!parsed){status.textContent='The typed date is invalid. Use the local date format or YYYY-MM-DD.';return}if(!from.value||to.value){from.value=parsed;to.value=''}else if(parsed<from.value){to.value=from.value;from.value=parsed}else to.value=parsed;render();renderHistory()});days.addEventListener('click',event=>{const iso=event.target.closest('[data-history-date]')?.dataset.historyDate;if(!iso)return;if(!from.value||to.value){from.value=iso;to.value=''}else if(iso<from.value){to.value=from.value;from.value=iso}else to.value=iso;render();renderHistory()});render()}
  function initThemePresetControls(){const host=document.querySelector('#site-controls .universal-setting[data-search*="appearance"]');if(!host||$('shell-theme-preset'))return;host.insertAdjacentHTML('beforeend','<label><span data-en="Named theme preset" data-zh="命名主題預設">Named theme preset</span><select id="shell-theme-preset"></select></label><div class="builder-buttons"><button id="shell-theme-apply" type="button" class="text-button">Apply preset</button><button id="shell-theme-export" type="button" class="text-button">Export themes</button><button id="shell-theme-import-button" type="button" class="text-button">Import themes</button><button id="shell-theme-reset" type="button" class="text-button">Reset custom themes</button><input id="shell-theme-import" type="file" accept="application/json,.json" hidden></div><p id="shell-theme-status" class="filter-status" role="status"></p>');state.appearancePresets=state.appearancePresets&&typeof state.appearancePresets==='object'?state.appearancePresets:{};const allPresets=()=>({...THEME_PRESETS,...state.appearancePresets}),render=()=>{$('shell-theme-preset').innerHTML=Object.keys(allPresets()).map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join('');text('shell-theme-status',appearanceCopy('Choose a named preset, then apply it. Custom presets are stored locally and recorded in history.','揀一個命名預設再套用，自訂預設只留喺本地並寫入記錄。'))};$('shell-theme-apply').addEventListener('click',()=>{const name=$('shell-theme-preset').value,preset=allPresets()[name];if(!preset)return;Object.assign(state,preset);save();applyState();text('shell-theme-status',appearanceCopy('Preset applied and recorded in local history.','預設已套用，亦已寫入本地記錄。'));notify('Theme preset applied',appearanceCopy('The selected preset changed real appearance settings.','選取嘅預設已改變實際外觀設定。'))});$('shell-theme-export').addEventListener('click',()=>download('theme-presets.json',JSON.stringify({version:1,presets:allPresets()},null,2),'application/json'));$('shell-theme-import-button').addEventListener('click',()=>$('shell-theme-import').click());$('shell-theme-import').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file||file.size>65536){text('shell-theme-status',appearanceCopy('Theme import rejected because the JSON file exceeds 64 KiB.','主題匯入失敗，JSON 檔案超過 64 KiB。'));return}try{const parsed=JSON.parse(await file.text());if(parsed.version!==1||!parsed.presets||typeof parsed.presets!=='object'||Array.isArray(parsed.presets))throw new Error('Expected a version 1 theme preset object.');const imported={};for(const [name,preset] of Object.entries(parsed.presets)){if(!/^[\w .-]{1,64}$/.test(name)||!preset||!['dark','light','contrast'].includes(preset.theme)||!['compact','comfortable','spacious'].includes(preset.density)||!/^#[0-9a-f]{6}$/i.test(preset.accent)||!Number.isFinite(Number(preset.fontScale)))throw new Error('Theme import contains an invalid preset.');imported[name]={theme:preset.theme,density:preset.density,accent:preset.accent,fontScale:Math.max(80,Math.min(160,Number(preset.fontScale))),lowMotion:Boolean(preset.lowMotion)}}state.appearancePresets={...state.appearancePresets,...imported};save();render();text('shell-theme-status',appearanceCopy('Theme presets imported and recorded in local history.','主題預設已匯入並寫入本地記錄。'))}catch(error){text('shell-theme-status',appearanceCopy('Theme import rejected: '+error.message,'主題匯入失敗：'+error.message))}});$('shell-theme-reset').addEventListener('click',()=>{state.appearancePresets={};save();render();text('shell-theme-status',appearanceCopy('Custom theme presets reset. Built-in presets remain available.','自訂主題預設已重設，內置預設仍然可用。'))});render()}
  // ---- Local file converter -------------------------------------------------
  // The browser surface deliberately exposes only adapters that are implemented
  // in this file. Every other known family stays visible and disabled with its
  // exact bundled-adapter boundary. No PATH lookup, upload, or guessed output.
  const CONVERTER_MAX_BYTES=32*1024*1024,CONVERTER_PAGE_SIZE=10;
  const CONVERTER_ADAPTERS=[
    {category:'Documents/PDF',format:'PDF inspect',extensions:['pdf'],signatures:['pdf'],enabled:false,reason:'No bundled PDF parser is present in this browser surface.'},
    {category:'Documents/PDF',format:'PDF split, merge, extract, reorder, rotate, metadata',extensions:['pdf'],signatures:['pdf'],enabled:false,reason:'No bundled PDF write adapter is present in this browser surface.'},
    {category:'Images',format:'PNG',extensions:['png'],signatures:['png'],enabled:false,reason:'No bundled image adapter is present in this browser surface.'},
    {category:'Images',format:'JPEG',extensions:['jpg','jpeg'],signatures:['jpeg'],enabled:false,reason:'No bundled image adapter is present in this browser surface.'},
    {category:'Images',format:'GIF or WebP',extensions:['gif','webp'],signatures:['gif','webp'],enabled:false,reason:'No bundled animated or WebP adapter is present in this browser surface.'},
    {category:'Audio',format:'WAV, MP3, OGG, or FLAC',extensions:['wav','mp3','ogg','flac'],signatures:['wav','mp3','ogg','flac'],enabled:false,reason:'No bundled audio adapter is present in this browser surface.'},
    {category:'Video',format:'MP4, WebM, or Matroska',extensions:['mp4','webm','mkv'],signatures:['mp4','webm','mkv'],enabled:false,reason:'No bundled video adapter is present in this browser surface.'},
    {category:'Archives',format:'ZIP, GZIP, TAR, 7z, or RAR',extensions:['zip','gz','tar','7z','rar'],signatures:['zip','gzip','tar','7z','rar'],enabled:false,reason:'No bundled archive adapter is present in this browser surface.'},
    {category:'Structured Data/Spreadsheets',format:'JSON',extensions:['json'],signatures:['json'],enabled:true,reason:'Browser-bundled JSON parser and serializer.'},
    {category:'Structured Data/Spreadsheets',format:'JSONL',extensions:['jsonl','ndjson'],signatures:['jsonl'],enabled:true,reason:'Browser-bundled line-delimited JSON parser and serializer.'},
    {category:'Structured Data/Spreadsheets',format:'CSV or TSV',extensions:['csv','tsv'],signatures:['csv','tsv'],enabled:true,reason:'Bounded browser-bundled delimited-text adapter.'},
    {category:'Code/Text',format:'UTF-8 text and Markdown',extensions:['txt','md','markdown','log','yaml','yml','toml','xml','html','css','js','ts','py','go','rs'],signatures:['text'],enabled:true,reason:'Bounded browser TextDecoder and Blob output.'},
    {category:'Binary Encodings',format:'Base64',extensions:['*'],signatures:['binary'],enabled:true,reason:'Bounded browser-bundled Base64 encoder.'}
  ];
  let converterFiles=[],converterResults=[],converterPage=0,converterRunning=false,converterCancelled=false,converterDestinationHandle=null,pendingOverwrite=null;
  function openOverwriteConfirmation(handle,filename,blob){let dialog=$('site-overwrite-confirm');if(!dialog){document.body.insertAdjacentHTML('beforeend','<dialog id="site-overwrite-confirm" class="overlay-card" aria-labelledby="site-overwrite-title"><form method="dialog"><div class="dialog-heading"><h2 id="site-overwrite-title">Confirm overwrite</h2><button class="icon-button" value="cancel" aria-label="Cancel">×</button></div><p id="site-overwrite-target"></p><label>First confirmation key<input id="overwrite-key-one" type="password" autocomplete="off"></label><label>Second confirmation key<input id="overwrite-key-two" type="password" autocomplete="off"></label><label>Full-range confirmation<input id="overwrite-slider" type="range" min="0" max="100" value="0"><output id="overwrite-slider-output">0%</output></label><p id="overwrite-message" class="plain-note">Both keys and the full slider are required. Escape or Emergency exit cancels without writing.</p><div class="builder-buttons"><button id="overwrite-confirm" class="danger-button" type="button" disabled>Overwrite exact file</button><button id="overwrite-cancel" class="text-button" type="button">Emergency exit</button></div></form></dialog>');dialog=$('site-overwrite-confirm');const update=()=>{const ready=Boolean($('overwrite-key-one').value&&$('overwrite-key-two').value&&Number($('overwrite-slider').value)===100);$('overwrite-confirm').disabled=!ready;$('overwrite-slider-output').textContent=`${$('overwrite-slider').value}%`};['input','change'].forEach(type=>dialog.addEventListener(type,update));$('overwrite-cancel').addEventListener('click',()=>{pendingOverwrite=null;dialog.close()});$('overwrite-confirm').addEventListener('click',async()=>{if(!pendingOverwrite)return;const current=pendingOverwrite;pendingOverwrite=null;dialog.close();await writeConverterDestination(current.handle,current.filename,current.blob)});dialog.addEventListener('close',()=>{if(dialog.returnValue==='cancel')pendingOverwrite=null})}pendingOverwrite={handle,filename,blob};$('site-overwrite-target').textContent=`The exact existing file ${filename} in the selected writable folder will be replaced. This is irreversible for that file.`;$('overwrite-key-one').value='';$('overwrite-key-two').value='';$('overwrite-slider').value='0';$('overwrite-slider-output').textContent='0%';$('overwrite-confirm').disabled=true;dialog.showModal();setTimeout(()=>$('overwrite-key-one').focus(),0)}
  async function writeConverterDestination(handle,filename,blob){try{const fileHandle=await handle.getFileHandle(filename,{create:true}),writable=await fileHandle.createWritable();await writable.write(blob);await writable.close();notify('Validated result written','The result was written to the selected writable folder.')}catch(error){text('converter-destination-status',`The writable destination could not be used: ${error.message||'unknown browser error'}. Results remain browser downloads.`)}}
  function converterAscii(bytes,count=16){return Array.from(bytes.slice(0,count),value=>value>=32&&value<=126?String.fromCharCode(value):'.').join('')}
  function converterStarts(bytes,values){return values.some(value=>bytes.length>=value.length&&value.every((byte,index)=>bytes[index]===value))}
  function converterText(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return undefined}}
  function detectConverterType(file,bytes){
    const name=file.name.toLowerCase(),extension=name.includes('.')?name.split('.').pop():'';
    if(converterStarts(bytes,[[0x25,0x50,0x44,0x46]]))return {kind:'pdf',label:'PDF'};
    if(converterStarts(bytes,[[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]]))return {kind:'png',label:'PNG'};
    if(converterStarts(bytes,[[0xff,0xd8,0xff]]))return {kind:'jpeg',label:'JPEG'};
    if(converterStarts(bytes,[[0x47,0x49,0x46,0x38]]))return {kind:'gif',label:'GIF'};
    if(converterStarts(bytes,[[0x52,0x49,0x46,0x46]]))return {kind:'wav',label:'WAV'};
    if(converterStarts(bytes,[[0x49,0x44,0x33],[0xff,0xfb],[0xff,0xf3]]))return {kind:'mp3',label:'MP3'};
    if(converterStarts(bytes,[[0x4f,0x67,0x67,0x53]]))return {kind:'ogg',label:'OGG'};
    if(converterStarts(bytes,[[0x66,0x4c,0x61,0x43]]))return {kind:'flac',label:'FLAC'};
    if(converterStarts(bytes,[[0x50,0x4b,0x03,0x04],[0x50,0x4b,0x05,0x06]]))return {kind:'zip',label:'ZIP'};
    if(converterStarts(bytes,[[0x1f,0x8b]]))return {kind:'gzip',label:'GZIP'};
    if(converterStarts(bytes,[[0x37,0x7a,0xbc,0xaf,0x27,0x1c]]))return {kind:'7z',label:'7z'};
    if(converterStarts(bytes,[[0x52,0x61,0x72,0x21,0x1a,0x07]]))return {kind:'rar',label:'RAR'};
    if(converterAscii(bytes,12).includes('ftyp'))return {kind:'mp4',label:'MP4'};
    if(converterStarts(bytes,[[0x1a,0x45,0xdf,0xa3]]))return {kind:'mkv',label:'Matroska'};
    const text=converterText(bytes.slice(0,Math.min(bytes.length,65536)));
    if(text!==undefined){
      if(extension==='json'||extension==='jsonl'||extension==='ndjson')return {kind:extension==='json'?'json':'jsonl',label:extension.toUpperCase()};
      if(extension==='csv')return {kind:'csv',label:'CSV'};
      if(extension==='tsv')return {kind:'tsv',label:'TSV'};
      return {kind:'text',label:'UTF-8 text'};
    }
    return {kind:'binary',label:extension?`Unknown binary (.${extension})`:'Unknown binary'};
  }
  function converterAdapterForType(type){return CONVERTER_ADAPTERS.find(adapter=>adapter.signatures.includes(type.kind)&&adapter.enabled)||CONVERTER_ADAPTERS.find(adapter=>adapter.signatures.includes(type.kind))}
  function converterAdapterMatches(adapter,query){return !query||plainTextMatches(`${adapter.category} ${adapter.format} ${adapter.reason}`,query)}
  function renderConverterAdapters(query=''){
    const target=$('converter-adapters');if(!target)return;
    const render=items=>{target.innerHTML=items.length?items.map(adapter=>`<article class="adapter-card ${adapter.enabled?'adapter-enabled':'adapter-disabled'}"><div><strong>${escapeHtml(adapter.format)}</strong><small>${escapeHtml(adapter.category)}</small></div><span class="status-chip ${adapter.enabled?'good-chip':'warning-chip'}">${adapter.enabled?'Bundled':'Unavailable'}</span><p>${escapeHtml(adapter.reason)}</p></article>`).join(''):'<p class="empty-state">No adapters match this search.</p>';text('converter-format-status',`${items.length} adapter entries shown. Disabled entries are not discovered from this browser or the host.`)};
    const adapters=CONVERTER_ADAPTERS;
    if(regexSearchEnabled('converter-format-search',query)){
      render([]);const run=runRegexWorker('search:converter-format-search',regexState.get('converter-format-search'),adapters.map((item,index)=>({id:String(index),text:`${item.category} ${item.format} ${item.reason}`})));
      run.promise.then(result=>{if(!regexRunCurrent('search:converter-format-search',run))return;const ids=new Set(result.matchedIds);render(adapters.filter((_,index)=>ids.has(String(index))))}).catch(error=>{if(regexRunCurrent('search:converter-format-search',run))text('converter-format-status',`Pattern evaluation unavailable: ${error.message}`)});return;
    }
    render(adapters.filter(adapter=>converterAdapterMatches(adapter,query)));
  }
  function converterParseDelimited(raw,delimiter){const lines=raw.replaceAll('\r\n','\n').replaceAll('\r','\n').split('\n').filter(line=>line.length>0);if(!lines.length)return [];return lines.map(line=>line.split(delimiter).map(cell=>cell.trim()))}
  function converterRowsFromText(raw,type){
    if(type.kind==='json'){const value=JSON.parse(raw);return Array.isArray(value)?value:[value]}
    if(type.kind==='jsonl'){return raw.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line))}
    if(type.kind==='csv'||type.kind==='tsv'){const cells=converterParseDelimited(raw,type.kind==='tsv'?'\t':',');if(!cells.length)return [];const [header,...rows]=cells;return rows.map(row=>Object.fromEntries(header.map((key,index)=>[key||`column_${index+1}`,row[index]??'']))) }
    return undefined;
  }
  function converterRowsToText(rows,format){
    if(format==='json')return JSON.stringify(rows,null,2);
    if(format==='jsonl')return rows.map(row=>JSON.stringify(row)).join('\n');
    if(format==='txt')return rows.map(row=>typeof row==='string'?row:JSON.stringify(row)).join('\n');
    const columns=[...new Set(rows.flatMap(row=>Object.keys(row||{})))],delimiter=format==='tsv'?'\t':',';
    const quote=value=>{const raw=String(value??'');return raw.includes(delimiter)||raw.includes('"')||raw.includes('\n')?`"${raw.replaceAll('"','""')}"`:raw};
    return [columns.map(quote).join(delimiter),...rows.map(row=>columns.map(column=>quote(row?.[column])).join(delimiter))].join('\r\n')+'\r\n';
  }
  async function converterConvertFile(file,index){
    const result={name:file.name,size:file.size,state:'reading',type:'',message:'Reading bounded bytes.',preview:'',blob:null};converterResults[index]=result;renderConverterQueue();
    if(file.size>CONVERTER_MAX_BYTES){result.state='failed';result.message='Rejected before reading: the 32 MiB per-file bound was exceeded.';return}
    const bytes=new Uint8Array(await file.arrayBuffer());if(converterCancelled){result.state='cancelled';result.message='Cancelled before conversion.';return}
    const type=detectConverterType(file,bytes);result.type=type.label;const adapter=converterAdapterForType(type);
    if(!adapter||!adapter.enabled){result.state='skipped';result.message=adapter?.reason||'No verified browser-bundled adapter matches the inspected bytes.';return}
    const format=$('converter-target-format')?.value||'json';let output,mime='text/plain;charset=utf-8';
    try{
      if(format==='base64'){let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.slice(offset,offset+0x8000));output=btoa(binary);mime='text/plain;charset=utf-8'}
      else{const raw=converterText(bytes);if(raw===undefined)throw new Error('The inspected bytes are not valid UTF-8 for this browser-bundled text adapter.');const rows=converterRowsFromText(raw,type);if(!rows&&format!=='txt'&&format!=='json'&&format!=='jsonl')throw new Error(`Target ${format.toUpperCase()} requires a structured text source; no guessed conversion was written.`);output=rows?converterRowsToText(rows,format):format==='txt'?raw:converterRowsToText([raw],format);mime=format==='json'||format==='jsonl'?'application/json':'text/plain;charset=utf-8'}
      result.blob=new Blob([output],{type:mime});result.preview=output.slice(0,8192);result.state='ready';result.message=`${type.label} converted in memory as ${format.toUpperCase()}. ${output.length>8192?'Preview is capped at 8 KiB.':''}`;
    }catch(error){result.state='failed';result.message=`Conversion stopped without writing a destination: ${error.message}`}
  }
  function renderConverterQueue(){
    const target=$('converter-queue');if(!target)return;const start=converterPage*CONVERTER_PAGE_SIZE,page=converterResults.slice(start,start+CONVERTER_PAGE_SIZE);
    target.innerHTML=page.length?page.map((result,localIndex)=>{const index=start+localIndex;const preview=result.preview?`<pre class="converter-preview">${escapeHtml(result.preview)}</pre>`:'';return `<article class="converter-result" data-converter-index="${index}"><div class="card-top"><div><strong>${escapeHtml(result.name)}</strong><small>${escapeHtml(result.type||'Not inspected')} · ${Math.ceil(result.size/1024)} KiB</small></div><span class="status-chip ${result.state==='ready'?'good-chip':result.state==='failed'?'danger-chip':'warning-chip'}">${escapeHtml(result.state)}</span></div><p>${escapeHtml(result.message)}</p>${preview}${result.state==='ready'?'<button class="text-button" type="button" data-converter-download>Download validated result</button>':''}</article>`}).join(''):'<p class="empty-state">Choose one or more local files to create the bounded queue.</p>';
    text('converter-page-status',converterResults.length?`Showing ${start+1}-${Math.min(start+CONVERTER_PAGE_SIZE,converterResults.length)} of ${converterResults.length} files.`:'');if($('converter-prev'))$('converter-prev').disabled=converterPage===0;if($('converter-next'))$('converter-next').disabled=(converterPage+1)*CONVERTER_PAGE_SIZE>=converterResults.length;
  }
  function initConverter(){
    if(!$('converter-files'))return;
    renderConverterAdapters();renderConverterQueue();
    $('converter-destination-folder')?.addEventListener('click',async()=>{if(typeof window.showDirectoryPicker!=='function'){converterDestinationHandle=null;text('converter-destination-status','This browser does not expose a writable folder picker. Results remain browser downloads; no source picker is being mislabelled as a destination.');return}try{converterDestinationHandle=await window.showDirectoryPicker({mode:'readwrite'});text('converter-destination-status','Writable destination folder selected. Each validated result can now be written there after an explicit result action.')}catch(error){converterDestinationHandle=null;text('converter-destination-status',error?.name==='AbortError'?'Destination folder selection cancelled. Results remain browser downloads.':'Writable destination folder unavailable. Results remain browser downloads.')}});
    $('converter-format-search')?.addEventListener('input',event=>renderConverterAdapters(event.target.value));
    $('converter-target-format')?.addEventListener('change',()=>{text('converter-loss','A target change applies only to the next local conversion. Existing in-memory results remain unchanged.');});
    $('converter-files').addEventListener('change',async event=>{converterFiles=[...event.target.files];converterResults=converterFiles.map(file=>({name:file.name,size:file.size,state:'queued',type:'',message:'Waiting for its bounded conversion turn.',preview:'',blob:null}));converterPage=0;converterCancelled=false;text('converter-input-status',`${converterFiles.length} local file${converterFiles.length===1?'':'s'} queued. No bytes have left this page.`);renderConverterQueue();if(converterRunning)return;converterRunning=true;$('converter-cancel').disabled=false;for(let index=0;index<converterFiles.length;index++){if(converterCancelled){converterResults.slice(index).forEach(result=>{result.state='cancelled';result.message='Cancelled before its conversion turn.'});break}await converterConvertFile(converterFiles[index],index);await new Promise(resolve=>setTimeout(resolve,0));renderConverterQueue()}converterRunning=false;$('converter-cancel').disabled=true;notify('Local conversion finished',applyVocabularyText('Each file has its own honest result. No destination was overwritten.'))});
    $('converter-cancel')?.addEventListener('click',()=>{converterCancelled=true;text('converter-input-status','Cancellation requested. The active bounded read will finish or stop at its next safe boundary.')});$('converter-prev')?.addEventListener('click',()=>{converterPage=Math.max(0,converterPage-1);renderConverterQueue()});$('converter-next')?.addEventListener('click',()=>{converterPage=Math.min(Math.max(0,Math.ceil(converterResults.length/CONVERTER_PAGE_SIZE)-1),converterPage+1);renderConverterQueue()});
    $('converter-queue')?.addEventListener('click',async event=>{if(!event.target.closest('[data-converter-download]'))return;const index=Number(event.target.closest('[data-converter-index]')?.dataset.converterIndex),result=converterResults[index];if(!result?.blob)return;const prefix=slugForFilename($('converter-output-name')?.value.trim()||'converted'),extension=$('converter-target-format')?.value||'txt',filename=`${prefix}-${slugForFilename(result.name)}.${extension}`;if(converterDestinationHandle){try{const permission=await converterDestinationHandle.requestPermission({mode:'readwrite'});if(permission==='granted'){let exists=true;try{await converterDestinationHandle.getFileHandle(filename,{create:false})}catch(error){if(error?.name==='NotFoundError')exists=false;else throw error}if(exists){openOverwriteConfirmation(converterDestinationHandle,filename,result.blob);return}await writeConverterDestination(converterDestinationHandle,filename,result.blob);return}text('converter-destination-status','The browser did not grant write permission. Results remain browser downloads.')}catch(error){text('converter-destination-status',`The writable destination could not be used: ${error.message||'unknown browser error'}. Results remain browser downloads.`)}}download(filename,result.blob,'application/octet-stream');notify('Validated result download started',applyVocabularyText(`${result.name} was offered as an in-memory result.`))});
  }

  // ---- Browser-local Ollama manager ----------------------------------------
  // No call is made until the user enters and approves a loopback endpoint.
  let ollama={endpoint:'',models:[],running:[],streamController:null};
  function ollamaSetState(label,detail,kind='warning'){const chip=$('ollama-state-chip');if(chip){chip.textContent=label;chip.className=`status-chip ${kind==='good'?'good-chip':kind==='danger'?'danger-chip':'warning-chip'}`}text('ollama-boundary',detail)}
  function ollamaEndpoint(){const raw=$('ollama-endpoint')?.value.trim()||'';let url;try{url=new URL(raw)}catch{return {error:'Enter a complete endpoint URL such as http://127.0.0.1:11434.'}}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)return {error:'Use an HTTP(S) endpoint without credentials, query data, or a fragment.'};const host=url.hostname.toLowerCase();if(!['localhost','127.0.0.1','[::1]','::1'].includes(host))return {error:'Only localhost, 127.0.0.1, or [::1] is allowed by this browser bridge.'};if(location.protocol==='https:'&&url.protocol==='http:')return {error:'HTTPS mixed-content policy blocks an HTTP loopback request from this page. Use the installed app bridge or an HTTPS local endpoint.'};return {url:url.href.replace(/\/$/,'')};}
  async function ollamaJson(path,options={}){const check=ollamaEndpoint();if(check.error)throw new Error(check.error);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);try{const response=await fetch(`${check.url}${path}`,{...options,signal:controller.signal,credentials:'omit',headers:{Accept:'application/json',...(options.headers||{})}});const length=Number(response.headers.get('content-length')||0);if(length>2*1024*1024)throw new Error('The local response exceeded the 2 MiB browser bound.');const body=await response.text();if(body.length>2*1024*1024)throw new Error('The local response exceeded the 2 MiB browser bound.');if(!response.ok)throw new Error(`Local Ollama returned HTTP ${response.status}.`);try{return JSON.parse(body)}catch{throw new Error('The local response was not valid JSON.')}}finally{clearTimeout(timer)}}
  function ollamaRows(){const query=$('ollama-model-search')?.value||'',models=ollama.models.filter(model=>plainTextMatches(`${model.name||''} ${model.digest||''} ${model.details?.family||''}`,query));const target=$('ollama-models');if(!target)return;target.innerHTML=models.length?models.map(model=>`<article class="model-row"><strong>${escapeHtml(model.name||'Unnamed tag')}</strong><small>${escapeHtml(model.details?.family||'Family metadata not returned')} · ${escapeHtml(model.size?`${model.size} bytes`:'Blob size not returned')}</small><span>${ollama.running.some(item=>item.name===model.name)?'Running':'Installed'}</span></article>`).join(''):'<p class="empty-state">No verified installed model matches this search.</p>';const select=$('ollama-model-select');if(select){const prior=select.value;select.innerHTML=models.length?models.map(model=>`<option value="${escapeHtml(model.name)}">${escapeHtml(model.name)}</option>`).join(''):'<option value="">No verified model</option>';if(models.some(model=>model.name===prior))select.value=prior;select.disabled=!models.length}const has=Boolean(models.length);['ollama-pull','ollama-show','ollama-chat'].forEach(id=>{if($(id))$(id).disabled=!has});if($('ollama-prompt'))$('ollama-prompt').disabled=!has}
  async function ollamaProbe(){
    const check=ollamaEndpoint();if(check.error){ollamaSetState('Blocked',check.error,'danger');return}if(!$('ollama-approve')?.checked){ollamaSetState('Waiting for approval','Check the approval box before any loopback request. No request has been made.');return}ollama.endpoint=check.url;ollamaSetState('Probing','Requesting only /api/version, /api/tags, and /api/ps from the approved local endpoint.');
    try{const version=await ollamaJson('/api/version'),tags=await ollamaJson('/api/tags'),running=await ollamaJson('/api/ps');ollama.models=Array.isArray(tags.models)?tags.models:[];ollama.running=Array.isArray(running.models)?running.models:[];text('ollama-version',version.version?`Version returned by local Ollama: ${version.version}.`:'Version field was not returned.');text('ollama-health',`Installed tags returned: ${ollama.models.length}. Running tags returned: ${ollama.running.length}.`);text('ollama-catalog-state','Catalog completeness: Unknown. Official catalog pages and all tags were not fetched by this browser surface.');ollamaSetState('Verified local response','The approved endpoint returned bounded version, installed-tag, and running-tag responses. Catalog completeness remains Unknown.','good');if($('ollama-refresh'))$('ollama-refresh').disabled=false;ollamaRows();}
    catch(error){const message=error.name==='AbortError'?'The local request timed out. The service may be stopped or unhealthy.':error instanceof TypeError?'The browser refused the loopback request, commonly because the service is offline or CORS denied it. Use the installed-app bridge action, then return here.':error.message;ollamaSetState('Unavailable',message,'danger');text('ollama-version','Unavailable until the approved endpoint responds.');text('ollama-health','No health result was accepted.');}
  }
  async function ollamaStream(path,payload,onLine){const check=ollamaEndpoint();if(check.error)throw new Error(check.error);const controller=new AbortController();ollama.streamController=controller;const timer=setTimeout(()=>controller.abort(),60000);try{const response=await fetch(`${check.url}${path}`,{method:'POST',credentials:'omit',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/x-ndjson, application/json'},body:JSON.stringify(payload)});if(!response.ok)throw new Error(`Local Ollama returned HTTP ${response.status}.`);if(!response.body)throw new Error('The local response did not provide a stream.');const reader=response.body.getReader(),decoder=new TextDecoder(),chunks=[];let total=0,buffer='';while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>10*1024*1024)throw new Error('The local stream exceeded the 10 MiB browser bound.');buffer+=decoder.decode(part.value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';for(const line of lines)if(line.trim()){const parsed=JSON.parse(line);chunks.push(parsed);onLine(parsed)}}if(buffer.trim())onLine(JSON.parse(buffer));return chunks}finally{clearTimeout(timer);ollama.streamController=null}}
  async function ollamaPull(){const model=$('ollama-model-select')?.value;if(!model)return;text('ollama-pull-status',`Pulling verified tag ${model}; progress is from the local API.`);try{await ollamaStream('/api/pull',{model,stream:true},data=>text('ollama-pull-status',data.status?`${model}: ${data.status}${data.completed&&data.total?` (${data.completed}/${data.total} bytes)`:''}`:'Local pull returned an unlabelled progress item.'));notify('Local model pull finished',applyVocabularyText(`${model} returned a terminal local API result. Check the status text for its exact outcome.`))}catch(error){text('ollama-pull-status',error.name==='AbortError'?'Pull cancelled or timed out.':`Pull unavailable: ${error.message}`)}}
  async function ollamaShow(){const model=$('ollama-model-select')?.value;if(!model)return;try{const data=await ollamaJson('/api/show',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:model})});text('ollama-recovery',`Capability metadata returned for ${model}: ${JSON.stringify(data.details||data).slice(0,4000)}. No capability is inferred when the API omits it.`)}catch(error){text('ollama-recovery',`Capability metadata is unavailable for ${model}: ${error.message}`)}}
  async function ollamaChat(){const model=$('ollama-model-select')?.value,prompt=$('ollama-prompt')?.value.trim();if(!model||!prompt)return;const output=$('ollama-chat-output');if(output)output.textContent='';$('ollama-chat').disabled=true;$('ollama-cancel').disabled=false;try{await ollamaStream('/api/chat',{model,messages:[{role:'user',content:prompt}],stream:true},data=>{const content=data.message?.content||data.response||'';if(output)output.textContent+=(content||data.error||'')});}catch(error){if(output)output.textContent=error.name==='AbortError'?'Local chat cancelled or timed out.':`Local chat unavailable: ${error.message}`}finally{$('ollama-chat').disabled=false;$('ollama-cancel').disabled=true}}
  function initOllama(){
    if(!$('ollama-probe'))return;$('ollama-probe').addEventListener('click',ollamaProbe);$('ollama-refresh')?.addEventListener('click',ollamaProbe);$('ollama-model-search')?.addEventListener('input',ollamaRows);$('ollama-pull')?.addEventListener('click',ollamaPull);$('ollama-show')?.addEventListener('click',ollamaShow);$('ollama-chat')?.addEventListener('click',ollamaChat);$('ollama-cancel')?.addEventListener('click',()=>ollama.streamController?.abort());ollamaRows();
  }

  function init(){ensureUniversalShell();ensureAttentionUI();applyState();initNavigation();initSiteTabs();initAppearanceEditorDepth();initDestinationMap();renderDestinations();initSearch();initDocumentationExport();initRegex();initSettings();initUniversalSettings();initThemePresetControls();initColourTranslator();initCollapsibles();renderNotifications();initNotificationBulk();initSearchableMenus();initContextMenu();renderSiteEvidence();initStatusHub();initLocalRecoverySurfaces();initHistorySurface();initHistoryCalendar();initChangelogViewer();document.addEventListener('click',event=>{const trigger=event.target.closest('.regex-trigger[data-regex-for="tab-bulk-close-search"]');if(trigger){event.preventDefault();openRegex('tab-bulk-close-search')}});initReveals();initHeroCanvas();initCounters();initConnectionDiagram();initSettingsPreview();initTimeAwareness();initMomentum();initConverter();initOllama();ensureStableElementIds();applyElementPresentation();if('MutationObserver'in window)new MutationObserver(()=>{ensureStableElementIds();applyElementPresentation()}).observe(document.body,{childList:true,subtree:true});$('palette-open')?.addEventListener('click',openPalette);$('palette-search')?.addEventListener('input',event=>{renderPalette(event.target.value);applyVocabulary()});$('palette-results')?.addEventListener('click',event=>{const control=event.target.closest('[data-palette-control]')?.dataset.paletteControl;if(!control)return;$('command-palette').close();if(control==='tab-manager-open'){openTabManager();return}if(control==='status-hub-save'){const target=$('status-hub-save');target?.scrollIntoView({block:'center'});target?.focus();return}$('site-controls').showModal();setTimeout(()=>$(control)?.focus(),0)});$('notification-open')?.addEventListener('click',()=>{$('notifications-dialog').showModal();renderNotifications($('notification-search')?.value||'')});$('notification-clear')?.addEventListener('click',()=>{state.notifications=[];notifSelection={anchor:undefined,selected:new Set()};save();renderNotifications()});if($('documentation-filters-panel'))updateFilterStatus('documentation-filter-status','feature-search');if($('settings-filters-panel'))updateFilterStatus('settings-filter-status','settings-search');applyVocabulary()}
  init();
})();
