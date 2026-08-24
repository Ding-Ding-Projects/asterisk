(() => {
  'use strict';

  let globalSettingsBridgeState;
  let globalBridgeWrite = false;
  window.addEventListener('ding-global-settings-change', (event) => {
    if (!globalSettingsBridgeState || !event.detail) return;
    if (['en', 'zh', 'both'].includes(event.detail.language)) globalSettingsBridgeState.language = event.detail.language;
    if (['light', 'dark', 'contrast'].includes(event.detail.theme)) globalSettingsBridgeState.theme = event.detail.theme;
    if (['compact', 'comfortable', 'spacious'].includes(event.detail.density)) globalSettingsBridgeState.density = event.detail.density;
    if (Number.isFinite(event.detail.englishFunny)) globalSettingsBridgeState.englishFunny = Math.min(5, Math.max(1, Number(event.detail.englishFunny)));
    if (Number.isFinite(event.detail.cantoneseFunny)) globalSettingsBridgeState.cantoneseFunny = Math.min(5, Math.max(1, Number(event.detail.cantoneseFunny)));
    globalBridgeWrite = true; save(); globalBridgeWrite = false; applyState();
  });
  window.addEventListener('ding-notification-history-change', () => { if (typeof renderNotifications === 'function') renderNotifications($('notification-search')?.value || ''); });
  window.addEventListener('ding-global-notification', (event) => { const detail = event.detail; if (!detail?.eventId || !globalSettingsBridgeState) return; globalSettingsBridgeState.notifications = [...globalSettingsBridgeState.notifications.filter((item) => item.id !== detail.eventId), { id: String(detail.eventId).slice(0, 128), time: Date.now(), source: detail.source }].slice(-100); globalBridgeWrite = true; save(); globalBridgeWrite = false; renderNotifications($('notification-search')?.value || ''); });

  // Register the page-owned global settings surface on every route. The module
  // is local and deliberately independent from this app's existing state key.
  if (!document.querySelector('script[data-global-settings]')) {
    const globalSettingsScript = document.createElement('script');
    globalSettingsScript.src = new URL('global-settings.js', document.baseURI).href;
    globalSettingsScript.dataset.globalSettings = 'true';
    document.head.append(globalSettingsScript);
  }

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
  function linearizeForLuminance(c255){const c=cClamp(c255,0,255)/255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4}
  function relativeLuminance(colour){return 0.2126*linearizeForLuminance(colour.r)+0.7152*linearizeForLuminance(colour.g)+0.0722*linearizeForLuminance(colour.b)}
  function contrastRatio(a,b){const l1=relativeLuminance(a),l2=relativeLuminance(b),lighter=Math.max(l1,l2),darker=Math.min(l1,l2);return (lighter+0.05)/(darker+0.05)}
  function contrastVerdict(ratio,largeText=false){const aaThreshold=largeText?3:4.5,aaaThreshold=largeText?4.5:7;if(ratio>=aaaThreshold)return 'AAA';if(ratio>=aaThreshold)return 'AA';return 'fail'}
  const RAINBOW='__rainbow__';

  const BASE = document.documentElement.dataset.base || './';
  const DEFAULTS = {theme:'dark',language:'en',density:'comfortable',accent:'#82D9A5',fontScale:100,lowMotion:false,englishFunny:5,cantoneseFunny:5,attention:{reduceFlashing:false,simplifiedLanguage:false,extendedTimeouts:false,focus:false,timeAwareness:false,oneThing:false,momentum:false,currentTask:''},scheduleEnabled:false,notifications:[],collapsed:{destinationMap:true,settingsPreview:true,documentationFilters:false,settingsFilters:false}};
  const STORAGE_KEY = 'ding-pbx-pages-v2';
  const regexState = new Map();
  let regexTarget = '';
  let destinationPage = 0;

  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');const canonical=JSON.parse(localStorage.getItem('ding-pbx-site-global-settings-v1')||'{}');const normalFunny=(value)=>{const number=Number(value);if(!Number.isFinite(number))return 5;if(number>=1&&number<=5)return number;return Math.min(5,Math.max(1,Math.round(number*4/3+1)))};const shared={};if(['en','zh','both'].includes(canonical.language))shared.language=canonical.language;if(['light','dark','contrast'].includes(canonical.theme))shared.theme=canonical.theme;if(['compact','comfortable','spacious'].includes(canonical.density))shared.density=canonical.density;if(Number.isFinite(canonical.englishFunny))shared.englishFunny=canonical.englishFunny;if(Number.isFinite(canonical.cantoneseFunny))shared.cantoneseFunny=canonical.cantoneseFunny;return{...DEFAULTS,...saved,...shared,englishFunny:normalFunny(shared.englishFunny??saved.englishFunny),cantoneseFunny:normalFunny(shared.cantoneseFunny??saved.cantoneseFunny),attention:{...DEFAULTS.attention,...(saved.attention||{})},collapsed:{...DEFAULTS.collapsed,...(saved.collapsed||{})}}}catch{return{...DEFAULTS,attention:{...DEFAULTS.attention},collapsed:{...DEFAULTS.collapsed}}}}
  const state=loadState();
  globalSettingsBridgeState = state;
  function save(){const projection={...state};try{const canonical=JSON.parse(localStorage.getItem('ding-pbx-site-global-settings-v1')||'{}');if(['en','zh','both'].includes(canonical.language))projection.language=canonical.language;if(['light','dark','contrast'].includes(canonical.theme))projection.theme=canonical.theme;if(['compact','comfortable','spacious'].includes(canonical.density))projection.density=canonical.density;if(Number.isFinite(canonical.englishFunny))projection.englishFunny=canonical.englishFunny;if(Number.isFinite(canonical.cantoneseFunny))projection.cantoneseFunny=canonical.cantoneseFunny}catch{}localStorage.setItem(STORAGE_KEY,JSON.stringify(projection));if(!globalBridgeWrite)window.dispatchEvent(new CustomEvent('ding-page-state-change',{detail:{language:state.language,englishFunny:state.englishFunny,cantoneseFunny:state.cantoneseFunny,theme:state.theme,density:state.density}}))}
  function eventSource(enTitle,zhTitle,enBody,zhBody){return{enTitle,zhTitle,enBody,zhBody}}
  function update(key,value){state[key]=value;save();applyState();notify(copyText('notifSettingSaved'),applyVocabularyText(`${key} now uses ${value}.`),eventSource(copyLevel('notifSettingSaved','en'),copyLevel('notifSettingSaved','zh'),`${key} now uses ${value}.`,`${key} 而家係 ${value}。`))}
  function applyState(){document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.density=state.density;document.documentElement.style.setProperty('--primary',state.accent);document.documentElement.style.setProperty('--font-scale',String(state.fontScale/100));document.body.classList.toggle('low-stimulation',state.lowMotion);if($('theme-mode'))$('theme-mode').value=state.theme;if($('language-mode'))$('language-mode').value=state.language;if($('density-mode'))$('density-mode').value=state.density;if($('accent-color'))$('accent-color').value=state.accent;if($('font-scale'))$('font-scale').value=state.fontScale;if($('font-scale-output'))$('font-scale-output').textContent=`${state.fontScale}%`;if($('motion-mode'))$('motion-mode').checked=state.lowMotion;if($('english-funny'))$('english-funny').value=String(state.englishFunny);if($('cantonese-funny'))$('cantonese-funny').value=String(state.cantoneseFunny);if($('schedule-enabled'))$('schedule-enabled').checked=state.scheduleEnabled;if($('attention-reduce-flashing'))$('attention-reduce-flashing').checked=state.attention.reduceFlashing;if($('attention-simplified-language'))$('attention-simplified-language').checked=state.attention.simplifiedLanguage;if($('attention-extended-timeouts'))$('attention-extended-timeouts').checked=state.attention.extendedTimeouts;if($('attention-focus'))$('attention-focus').checked=state.attention.focus;if($('attention-time-awareness'))$('attention-time-awareness').checked=state.attention.timeAwareness;if($('attention-one-thing'))$('attention-one-thing').checked=state.attention.oneThing;if($('attention-momentum'))$('attention-momentum').checked=state.attention.momentum;if($('attention-current-task'))$('attention-current-task').value=state.attention.currentTask||'';document.body.classList.toggle('reduce-flashing',state.attention.reduceFlashing);document.body.classList.toggle('extended-timeouts',state.attention.extendedTimeouts);document.body.classList.toggle('attn-focus',state.attention.focus);applyLanguage();applyCopy();applyLogo();applyVocabulary();updateSessionTimer();updateOneThingBanner()}
  function updateAttention(key,value){state.attention={...state.attention,[key]:value};save();applyState();notify(copyText('notifSettingSaved'),applyVocabularyText(`attention.${key} now uses ${value}.`),eventSource(copyLevel('notifSettingSaved','en'),copyLevel('notifSettingSaved','zh'),`attention.${key} now uses ${value}.`,`attention.${key} 而家係 ${value}。`))}
  function applyLanguage(){if(!$('language-preview'))return;document.documentElement.lang=state.language==='zh'?'zh-Hant':'en';$('language-preview').textContent=state.language==='en'?'English presentation active.':state.language==='zh'?'廣東話顯示已啟用。':'Bilingual presentation active. / 雙語顯示已啟用。'}

  // Funny-level copy: voice changes with the slider, facts never do. Each key holds
  // Each language has an independent five-level control. Existing catalog entries
  // with fewer variants reuse their last authored variant for the remaining level.
  const COPY = {
    heroLede:{en:[
      'Ding PBX Console is a planned desktop administration experience for Asterisk. This website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Worth saying plainly: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Friendly reminder: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Ding PBX Console is a planned desktop administration experience for Asterisk. Say it with us: this website is documentation and download infrastructure—not the installed desktop application, and definitely not a PBX runtime.'
    ],zh:[
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。講多句：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。老實講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，更加唔係 PBX 運行環境。',
      'Ding PBX Console係 Asterisk 嘅桌面管理計劃項目。認真同你講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，梗係唔係 PBX 運行環境喇，聽晒未？'
    ]},
    themeDesc:{en:[
      'Applies immediately and persists.',
      'Applies immediately and persists — no reload needed.',
      'Flips instantly and sticks around.',
      'Flips in a blink and stays put, no takebacks.'
    ],zh:[
      '即時套用並會保存。',
      '即時套用並保存，唔使重新載入。',
      '一下就轉咗，仲會記住。',
      '眨吓眼就轉晒色，仲賴死唔走。'
    ]},
    motionDesc:{en:[
      'Stops non-essential site animation. The operating-system preference also applies.',
      'Stops non-essential site animation, on top of your operating-system preference.',
      'Calms down the moving parts. Your OS setting still applies too.',
      'Puts the wiggly bits to bed. Your OS setting still has the final say.'
    ],zh:[
      '停止非必要嘅網站動畫，亦會跟隨作業系統設定。',
      '停止非必要嘅網站動畫，同你部機嘅設定夾埋用。',
      '靜番啲跳動嘅嘢。你部機嘅設定照樣有效。',
      '安撫晒啲郁嚟郁去嘅嘢，你部機話事嗰個仲係話事。'
    ]},
    emptyDestinations:{en:[
      'No destinations match this search.',
      'No destinations match this search — try a shorter term.',
      'Nothing matched. Try loosening the search a little.',
      'Came up empty. Try fewer words and see what turns up.'
    ],zh:[
      '冇符合搜尋嘅目的地。',
      '冇符合搜尋嘅目的地，不如試短啲嘅字。',
      '乜都搵唔到，試吓少啲字。',
      '搵到一場空，少打幾隻字睇下有冇。'
    ]},
    emptyNotifications:{en:[
      'No local notifications.',
      'No local notifications yet.',
      'Nothing here yet — quiet on purpose.',
      'Empty in here. Nothing to report, nothing to fret.'
    ],zh:[
      '冇本地通知。',
      '暫時冇本地通知。',
      '呢度暫時得個空，靜靜哋。',
      '冇嘢，乜都冇發生過。'
    ]},
    notifSettingSaved:{en:[
      'Setting saved',
      'Setting saved.',
      'Saved. Nice and tidy.',
      'Saved! One small win banked.'
    ],zh:[
      '設定已保存',
      '設定已經保存。',
      '搞掂，已經保存咗。',
      '保存咗喇！小小成就一件。'
    ]},
    notifSettingsReset:{en:[
      'Settings reset',
      'Settings reset.',
      'Reset done. Back to the defaults.',
      'Ctrl-Z for life: back to how it shipped.'
    ],zh:[
      '設定已重設',
      '設定已經重設。',
      '重設完成，返晒去原廠設定。',
      '人生都有 Ctrl-Z：返番去出廠設定。'
    ]},
    notifRegexApplied:{en:[
      'Regular expression applied',
      'Regular expression applied.',
      'Pattern applied and live.',
      'Regex locked in and already hunting.'
    ],zh:[
      '已套用正則表達式',
      '正則表達式已經套用。',
      '樣式已經套用緊。',
      '正則已就位，開始搵嘢。'
    ]}
  };

  function copyLevel(key,lang){
    const table=COPY[key];if(!table)return '';
    const arr=table[lang]||table.en;
    const level=lang==='zh'?state.cantoneseFunny:state.englishFunny;
    const index=Math.min(4,Math.max(0,(Number(level)||1)-1));
    const base=arr[Math.min(arr.length-1,index)]||arr[0];
    if(index<arr.length)return base;
    const additions=lang==='zh'?['，再穩陣一步。','，靚靚收尾。','，準備出發。']:[' Nice and tidy.',' One more tidy pass.',' Ready to roll.'];
    return `${base}${additions[index-arr.length]||' Still factual and ready.'}`;
  }
  function copyText(key){
    if(!COPY[key])return '';
    if(state.attention.simplifiedLanguage){
      return applyVocabularyText(COPY[key][state.language==='zh'?'zh':'en'][0]);
    }
    let text;
    if(state.language==='en')text=copyLevel(key,'en');
    else if(state.language==='zh')text=copyLevel(key,'zh');
    else text=`${copyLevel(key,'en')} / ${copyLevel(key,'zh')}`;
    return applyVocabularyText(text);
  }
  function applyCopy(){all('[data-copy]').forEach(el=>{const key=el.dataset.copy;if(COPY[key])el.textContent=copyText(key)})}

  function vocabularyReplacements(){
    try{
      const raw=localStorage.getItem('ding-pbx-vocabulary-cache');
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed.replacements)?parsed.replacements:null;
    }catch{return null}
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
  function applyLogo(){
    let cached=null;
    try{cached=localStorage.getItem('ding-pbx-logo-cache')}catch{cached=null}
    all('.brand-mark').forEach(el=>{
      const img=el.querySelector('img.brand-mark-image');
      if(cached){
        if(img){img.src=cached}
        else{el.innerHTML='';const image=document.createElement('img');image.className='brand-mark-image';image.alt='';image.src=cached;el.appendChild(image)}
      }else if(img){el.innerHTML='D'}
    });
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}
    icon.href=cached||DEFAULT_FAVICON;
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
      notify('Still here','Nothing has changed on this page for a while. No action is needed.',eventSource('Still here','仲喺度','Nothing has changed on this page for a while. No action is needed.','呢頁一陣間冇變化，唔使做任何嘢。'));
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


  function initNavigation(){
    document.addEventListener('keydown',event=>{if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault();openPalette()}});
    const button=$('nav-toggle'),menu=$('site-nav');if(!button||!menu)return;
    const close=()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false')};
    button.onclick=()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('a')?.focus()};
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
    menu.addEventListener('click',close);
  }
  function initReveals(){const items=all('.reveal');if(reduceMotion()||!('IntersectionObserver'in window)){items.forEach(item=>item.classList.add('visible'));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});items.forEach(item=>observer.observe(item))}

  function renderDestinations(query=''){const grid=$('destination-grid');if(!grid)return;const matches=DESTINATIONS.filter(item=>matchText(`${item.name} ${item.group} ${item.description}`,query,'feature-search')),pageSize=8,pageCount=Math.max(1,Math.ceil(matches.length/pageSize));destinationPage=Math.min(destinationPage,pageCount-1);const shown=matches.slice(destinationPage*pageSize,(destinationPage+1)*pageSize);grid.innerHTML=shown.map(item=>`<article class="destination-card reveal" id="destination-${item.id}" tabindex="-1"><span class="destination-icon" aria-hidden="true">${item.icon}</span><span class="card-kicker">${escapeHtml(item.group)}</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><a class="text-button" href="${BASE}docs/${item.article}.html">Read article <span aria-hidden="true">→</span></a></article>`).join('')||`<p class="empty-state">${escapeHtml(copyText('emptyDestinations'))}</p>`;if($('destination-count'))$('destination-count').textContent=`${matches.length} destination${matches.length===1?'':'s'} · page ${destinationPage+1} of ${pageCount}`;if($('destination-pagination'))$('destination-pagination').innerHTML=Array.from({length:pageCount},(_,index)=>`<button type="button" data-page="${index}" ${index===destinationPage?'aria-current="page"':''}>${index+1}</button>`).join('');initReveals();updateDestinationMap(matches);applyVocabulary();updateFilterStatus('documentation-filter-status','feature-search');lastDocumentationMatches=matches;lastDocumentationQuery=query;updateDocumentationExport()}
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
      notify('Destinations exported',applyVocabularyText(`Exported ${rows.length} of ${DESTINATIONS.length} destinations as ${format.toUpperCase()}, covering the current search ("${lastDocumentationQuery||'no filter'}").`),eventSource('Destinations exported','目的地已匯出',`Exported ${rows.length} of ${DESTINATIONS.length} destinations as ${format.toUpperCase()}.`,`已匯出 ${DESTINATIONS.length} 個目的地之中的 ${rows.length} 個，格式係 ${format.toUpperCase()}。`));
    });
  }
  function matchText(text,query,target){if(!query)return true;const config=regexState.get(target);if(config?.enabled){try{return new RegExp(config.pattern,config.flags).test(text)}catch{return false}}return text.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
  function filter(selector,query,target){all(selector).forEach(item=>item.hidden=!matchText(item.dataset.search||item.textContent,query,target))}

  function initSearch(){all('[data-filter-target]').forEach(input=>input.addEventListener('input',()=>filter(input.dataset.filterTarget,input.value,input.id)));if($('feature-search'))$('feature-search').addEventListener('input',event=>{destinationPage=0;renderDestinations(event.target.value)});$('destination-pagination')?.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;destinationPage=Number(button.dataset.page);renderDestinations($('feature-search')?.value||'');$('destination-grid').focus?.()});all('.regex-trigger:not([data-global-settings-owned])').forEach(button=>button.onclick=event=>{event.preventDefault();openRegex(button.dataset.regexFor)})}
  function openRegex(target){regexTarget=target;const dialog=$('regex-dialog');if(!dialog)return;const saved=regexState.get(target)||{pattern:'',flags:'iu'};$('regex-target-label').textContent=`Attached to: ${target}`;$('regex-pattern').value=saved.pattern;$('regex-i').checked=saved.flags.includes('i');$('regex-m').checked=saved.flags.includes('m');$('regex-u').checked=saved.flags.includes('u');dialog.showModal();previewRegex();setTimeout(()=>$('regex-pattern').focus(),0)}
  function regexConfig(){return{pattern:$('regex-pattern').value.slice(0,256),flags:`${$('regex-i').checked?'i':''}${$('regex-m').checked?'m':''}${$('regex-u').checked?'u':''}`}}
  function previewRegex(){if(!$('regex-feedback'))return;const config=regexConfig();if(!config.pattern){$('regex-feedback').textContent='Enter a pattern.';return}try{const re=new RegExp(config.pattern,config.flags),flags=re.flags.includes('g')?re.flags:`${re.flags}g`,matches=[...$('regex-sample').value.matchAll(new RegExp(re.source,flags))];$('regex-feedback').textContent=`Valid JavaScript regular expression · ${matches.length} sample match${matches.length===1?'':'es'}.`}catch(error){$('regex-feedback').textContent=`Invalid pattern: ${error.message}`}}
  function applyRegex(){const config=regexConfig();try{new RegExp(config.pattern,config.flags)}catch{return}regexState.set(regexTarget,{...config,enabled:Boolean(config.pattern)});$('regex-dialog').close();$(regexTarget)?.dispatchEvent(new Event('input'));notify(copyText('notifRegexApplied'),applyVocabularyText(`${regexTarget} now uses the local JavaScript regular expression engine.`),eventSource('Regular expression applied','正則表達式已套用',`${regexTarget} now uses the local JavaScript regular expression engine.`,`${regexTarget} 而家使用本地 JavaScript 正則表達式引擎。`))}
  function initRegex(){if(!$('regex-dialog'))return;$('regex-pattern').addEventListener('input',previewRegex);$('regex-apply').onclick=applyRegex;all('[data-insert]').forEach(button=>button.onclick=()=>{const input=$('regex-pattern'),start=input.selectionStart;input.value=`${input.value.slice(0,start)}${button.dataset.insert}${input.value.slice(input.selectionEnd)}`;input.focus();input.setSelectionRange(start+button.dataset.insert.length,start+button.dataset.insert.length);previewRegex()})}


  function renderPalette(query=''){const list=$('palette-results');if(!list)return;const pages=[['Home','index.html'],['Product','product.html'],['Documentation','documentation.html'],['Downloads','downloads.html'],['Status','status.html'],['Settings','settings.html']],items=[...pages,...DESTINATIONS.map(item=>[item.name,`documentation.html#destination-${item.id}`])].filter(([name])=>matchText(name,query,'palette-search'));list.innerHTML=items.length?items.map(([name,path])=>`<a class="palette-result" role="option" href="${BASE}${path}"><strong>${escapeHtml(name)}</strong><span>Open destination</span></a>`).join(''):'<p>No matching commands.</p>'}
  function openPalette(){const dialog=$('command-palette');if(!dialog)return;dialog.showModal();$('palette-search').value='';renderPalette();applyVocabulary();setTimeout(()=>$('palette-search').focus(),0)}
  let notifSeq=0;
  function fiveTone(text,lang,level){const index=Math.min(5,Math.max(1,Number(level)||1));const variants=lang==='zh'?['', '講清楚啲：', '放心，', '溫馨提示，', '穩陣先：']:['', 'Plainly: ', 'Friendly note: ', 'Heads up: ', 'Steady on: '];return `${variants[index-1]}${text}`}
  function notificationView(item){const source=item.source||{enTitle:item.title||'',zhTitle:item.title||'',enBody:item.body||'',zhBody:item.body||''};const enTitle=fiveTone(source.enTitle,'en',state.englishFunny);const zhTitle=fiveTone(source.zhTitle,'zh',state.cantoneseFunny);const enBody=fiveTone(source.enBody,'en',state.englishFunny);const zhBody=fiveTone(source.zhBody,'zh',state.cantoneseFunny);return{title:state.language==='zh'?zhTitle:state.language==='both'?`${enTitle} / ${zhTitle}`:enTitle,body:state.language==='zh'?zhBody:state.language==='both'?`${enBody} / ${zhBody}`:enBody,source}}
  function notify(title,body,source={enTitle:title,zhTitle:title,enBody:body,zhBody:body}){const id=`n${Date.now()}-${notifSeq++}`;const tracks=title===copyText('notifSettingsReset')?eventSource(copyLevel('notifSettingsReset','en'),copyLevel('notifSettingsReset','zh'),'The local page settings returned to their shipped values.','本地頁面設定已返回出廠值。'):source;const view=notificationView({source:tracks});state.notifications.unshift({id,source:tracks,time:Date.now()});state.notifications=state.notifications.slice(0,30);save();window.dispatchEvent(new CustomEvent('ding-page-event',{detail:{eventId:id,category:'notification',enTitle:tracks.enTitle,zhTitle:tracks.zhTitle,enBody:tracks.enBody,zhBody:tracks.zhBody}}));renderNotifications($('notification-search')?.value||'');const region=$('toast-region');if(!region)return;const toast=document.createElement('div');toast.className='toast';toast.innerHTML=`<strong>${escapeHtml(view.title)}</strong><span>${escapeHtml(view.body)}</span>`;region.append(toast);setTimeout(()=>toast.remove(),state.attention.extendedTimeouts?15000:5000)}

  // ---- Notification centre: real multi-select, bulk dismiss, and export. ----
  let notifSelection={anchor:undefined,selected:new Set()};
  let lastNotificationOrder=[];
  function ensureNotificationIds(){let changed=false;state.notifications.forEach((item,index)=>{if(!item.id){item.id=`n${item.time||Date.now()}-legacy${index}`;changed=true}if(!item.source){item.source={enTitle:item.title||'',zhTitle:item.title||'',enBody:item.body||'',zhBody:item.body||''};item.legacyPresentation=true;changed=true;}});if(changed)save()}
  function notificationMatches(query){ensureNotificationIds();return state.notifications.filter(item=>{const view=notificationView(item);return matchText(`${view.title} ${view.body}`,query,'notification-search')})}
  function renderNotifications(query=''){
    if($('notification-count'))$('notification-count').textContent=state.notifications.length;
    if(!$('notification-history'))return;
    const matches=notificationMatches(query);
    lastNotificationOrder=matches.map(item=>item.id);
    // A selected id that no longer matches (or was dismissed) never lingers as a phantom count.
    notifSelection={anchor:notifSelection.anchor,selected:new Set([...notifSelection.selected].filter(id=>lastNotificationOrder.includes(id)))};
    $('notification-history').innerHTML=matches.length?matches.map(item=>{const view=notificationView(item);return `<article class="notice" data-notif-id="${item.id}"><input type="checkbox" aria-label="${escapeHtml(view.title)}" ${notifSelection.selected.has(item.id)?'checked':''}><div class="notice-body"><strong>${escapeHtml(view.title)}</strong><p>${escapeHtml(view.body)}</p><small>${new Date(item.time).toLocaleString()}</small></div></article>`}).join(''):`<p>${escapeHtml(copyText('emptyNotifications'))}</p>`;
    applyVocabulary();
    updateNotificationSelectionUI();
    updateNotificationExportFormats();
  }
  function updateNotificationSelectionUI(){
    const status=$('notif-selection-status');if(status)status.textContent=`${notifSelection.selected.size} selected of ${lastNotificationOrder.length} shown`;
    all('#notification-history .notice').forEach(row=>{const checkbox=row.querySelector('input[type="checkbox"]');if(checkbox)checkbox.checked=notifSelection.selected.has(row.dataset.notifId)});
  }
  function notificationExportRows(){return state.notifications.filter(item=>notifSelection.selected.has(item.id)).map(item=>{const view=notificationView(item);return{title:view.title,body:view.body,source:item.source,legacyPresentation:item.legacyPresentation===true,time:new Date(item.time).toISOString()}})}
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
      notify('Notifications exported',applyVocabularyText(`Exported ${rows.length} selected notification${rows.length===1?'':'s'} as ${format.toUpperCase()}.`),eventSource('Notifications exported','通知已匯出',`Exported ${rows.length} selected notification${rows.length===1?'':'s'} as ${format.toUpperCase()}.`,`已匯出 ${rows.length} 個已選通知，格式係 ${format.toUpperCase()}。`));
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

  function ensureFunnyLevels(){['english-funny','cantonese-funny'].forEach(id=>{const select=$(id);if(!select)return;select.innerHTML='';for(let level=1;level<=5;level++){const option=document.createElement('option');option.value=String(level);option.textContent=`Level ${level}`;select.append(option)}})}
  function initSettings(){if(!$('theme-mode'))return;ensureFunnyLevels();applyState();$('theme-mode').onchange=event=>update('theme',event.target.value);$('language-mode').onchange=event=>update('language',event.target.value);$('density-mode').onchange=event=>update('density',event.target.value);$('accent-color').oninput=event=>update('accent',event.target.value);$('font-scale').oninput=event=>{state.fontScale=Number(event.target.value);save();applyState()};$('motion-mode').onchange=event=>update('lowMotion',event.target.checked);$('english-funny').onchange=event=>update('englishFunny',Number(event.target.value));$('cantonese-funny').onchange=event=>update('cantoneseFunny',Number(event.target.value));$('schedule-enabled').onchange=event=>update('scheduleEnabled',event.target.checked);$('attention-reduce-flashing').onchange=event=>updateAttention('reduceFlashing',event.target.checked);$('attention-simplified-language').onchange=event=>updateAttention('simplifiedLanguage',event.target.checked);$('attention-extended-timeouts').onchange=event=>updateAttention('extendedTimeouts',event.target.checked);if($('attention-focus'))$('attention-focus').onchange=event=>updateAttention('focus',event.target.checked);if($('attention-time-awareness'))$('attention-time-awareness').onchange=event=>updateAttention('timeAwareness',event.target.checked);if($('attention-one-thing'))$('attention-one-thing').onchange=event=>updateAttention('oneThing',event.target.checked);if($('attention-momentum'))$('attention-momentum').onchange=event=>updateAttention('momentum',event.target.checked);if($('attention-current-task'))$('attention-current-task').onchange=event=>{state.attention={...state.attention,currentTask:event.target.value.slice(0,140)};save();applyState()};$('settings-reset').onclick=()=>{Object.assign(state,DEFAULTS);save();applyState();notify(copyText('notifSettingsReset'),applyVocabularyText('The local page settings returned to their shipped values.'))};$('settings-export').onclick=()=>download('ding-pbx-page-settings.json',JSON.stringify({schemaVersion:1,encoding:'UTF-8',personalVocabulary:'omitted',settings:state},null,2));$('vocabulary-file').onchange=loadVocabulary;$('vocabulary-clear').onclick=()=>{localStorage.removeItem('ding-pbx-vocabulary-cache');$('vocabulary-file').value='';$('vocabulary-status').textContent='No file loaded; original wording is active.';applyVocabulary();applyState()};$('logo-file').onchange=loadLogo;$('logo-clear').onclick=()=>{localStorage.removeItem('ding-pbx-logo-cache');$('logo-file').value='';$('logo-status').textContent='No file loaded; default mark is active.';applyLogo()};if($('settings-search'))$('settings-search').addEventListener('input',()=>updateFilterStatus('settings-filter-status','settings-search'))}
  async function loadVocabulary(event){const file=event.target.files[0];if(!file)return;if(file.size>65536){$('vocabulary-status').textContent=`Rejected: the file is ${Math.round(file.size/1024)} KiB and the limit is 64 KiB.`;return}try{const raw=JSON.parse(await file.text());
    /* Accept the spellings a real file actually uses before judging it.
     *
     * This page exports its own settings with "schemaVersion", and the loader demanded
     * "version" — so a file this very page produced was rejected by this very page. A
     * dictionary is also perfectly naturally written as a plain object mapping each term
     * to its replacement, which is shorter and is what people write by hand.
     *
     * Normalising is not loosening: every bound below still applies to the result. What
     * changes is that a file is refused for being unsafe or malformed, never merely for
     * spelling its version key the other way. */
    const parsed={
      version:raw&&raw.version!==undefined?raw.version:raw&&raw.schemaVersion,
      replacements:Array.isArray(raw&&raw.replacements)?raw.replacements
        :raw&&raw.replacements&&typeof raw.replacements==='object'
          ?Object.entries(raw.replacements).map(([from,to])=>({from,to}))
          :raw&&typeof raw.terms==='object'&&!Array.isArray(raw.terms)
            ?Object.entries(raw.terms).map(([from,to])=>({from,to}))
            :raw&&raw.replacements,
    };
    /* One reason per check. Reporting "expected version 1 and no more than 256
     * replacements" for three different failures leaves the reader unable to tell which
     * of them their file tripped, which is exactly the vagueness an error must not have:
     * it has to say what went wrong and how to fix it. */
    if(parsed.version!==1)throw new Error(`expected schema version 1, but this file declares ${JSON.stringify(parsed.version)}. Set "version": 1 (or "schemaVersion": 1) at the top level.`);
    if(!Array.isArray(parsed.replacements))throw new Error('this file has no replacements. Provide "replacements" as a list of {"from": "...", "to": "..."} objects, or as an object mapping each term to its replacement.');
    if(parsed.replacements.length>256)throw new Error(`this file has ${parsed.replacements.length} replacements and the limit is 256. Remove ${parsed.replacements.length-256}.`);
    const badIndex=parsed.replacements.findIndex(item=>!item||typeof item.from!=='string'||typeof item.to!=='string'||item.from.length>128||item.to.length>256);
    if(badIndex>=0){const bad=parsed.replacements[badIndex];const why=!bad||typeof bad.from!=='string'?'"from" is missing or is not a string':typeof bad.to!=='string'?'"to" is missing or is not a string':bad.from.length>128?`"from" is ${bad.from.length} characters and the limit is 128`:`"to" is ${bad.to.length} characters and the limit is 256`;throw new Error(`replacement ${badIndex+1} is not valid: ${why}. Every replacement needs bounded from and to strings.`)}
    const keys=parsed.replacements.map(item=>item.from);const seen=new Set();const duplicate=keys.find(key=>seen.size===seen.add(key).size);if(new Set(keys).size!==keys.length)throw new Error(`Duplicate keys are not accepted; each from value must appear once. ${JSON.stringify(duplicate)} appears more than once.`);localStorage.setItem('ding-pbx-vocabulary-cache',JSON.stringify(parsed));$('vocabulary-status').textContent=`Loaded ${parsed.replacements.length} local replacement${parsed.replacements.length===1?'':'s'}. No data was transmitted.`;applyVocabulary();applyState()}catch(error){$('vocabulary-status').textContent=`Rejected: ${error.message}`}}
  async function loadLogo(event){const file=event.target.files[0];if(!file)return;if(file.size>131072){$('logo-status').textContent='Rejected: file exceeds 128 KiB.';return}if(!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)){$('logo-status').textContent='Rejected: only PNG, JPEG, or SVG images are accepted.';return}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the file.'));reader.readAsDataURL(file)});localStorage.setItem('ding-pbx-logo-cache',dataUrl);$('logo-status').textContent=`Loaded local logo (${Math.round(file.size/1024)} KiB). No data was transmitted.`;applyLogo()}catch(error){$('logo-status').textContent=`Rejected: ${error.message}`}}
  function download(name,text,mime='application/json'){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:mime}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
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
      const fill=rail.querySelector('.rail-fill');if(fill)fill.style.width=`${total?Math.round((matched/total)*100):0}%`;
      const count=rail.querySelector('.rail-count');if(count)count.textContent=`${matched}/${total}`;
      rail.classList.toggle('rail-empty',matched===0);
    });
  }
  function initDestinationMap(){
    const map=$('destination-map');if(!map)return;
    map.innerHTML=GROUPS.map(group=>{const total=DESTINATIONS.filter(item=>item.group===group).length;return `<div class="rail" data-group="${escapeHtml(group)}"><span class="rail-label">${escapeHtml(group)}</span><span class="rail-track"><span class="rail-fill" style="width:100%"></span></span><span class="rail-count mono">${total}/${total}</span></div>`}).join('');
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
    if(status)status.textContent='';
    grid.innerHTML=COLOUR_FORMATS.map(format=>`<div class="colour-translate-row"><span>${format}</span><output>${escapeHtml(translated[format])}</output><button type="button" class="text-button" data-copy-colour="${escapeHtml(translated[format])}">Copy</button></div>`).join('');
    const colour=parseColour(text),surface=pageSurfaceColour();
    if(colour&&result){
      const ratio=contrastRatio(colour,surface),verdict=contrastVerdict(ratio);
      result.dataset.verdict=verdict;
      const verdictText=verdict==='fail'?'fails WCAG AA and AAA':verdict==='AA'?'passes WCAG AA':'passes WCAG AA and AAA';
      result.textContent=`Contrast against the page surface: ${ratio.toFixed(2)}:1 — ${verdictText}.`;
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
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).catch(()=>{});
      notify('Colour copied',applyVocabularyText(`Copied ${value} to the clipboard.`),eventSource('Colour copied','顏色已複製',`Copied ${value} to the clipboard.`,`已將 ${value} 複製到剪貼簿。`));
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

  function init(){ensureAttentionUI();applyState();initNavigation();initDestinationMap();renderDestinations();initSearch();initDocumentationExport();initRegex();initSettings();initColourTranslator();initCollapsibles();renderNotifications();initNotificationBulk();initReveals();initHeroCanvas();initCounters();initConnectionDiagram();initSettingsPreview();initTimeAwareness();initMomentum();$('palette-open')?.addEventListener('click',openPalette);$('palette-search')?.addEventListener('input',event=>{renderPalette(event.target.value);applyVocabulary()});$('notification-open')?.addEventListener('click',()=>{$('notifications-dialog').showModal();renderNotifications($('notification-search')?.value||'')});$('notification-clear')?.addEventListener('click',()=>{state.notifications=[];notifSelection={anchor:undefined,selected:new Set()};save();renderNotifications()});if($('documentation-filters-panel'))updateFilterStatus('documentation-filter-status','feature-search');if($('settings-filters-panel'))updateFilterStatus('settings-filter-status','settings-search');applyVocabulary()}
  init();
})();
