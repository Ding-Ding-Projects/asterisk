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
  // Local file converter engine -- browser-local, bounded, and explicit about
  // every format it cannot read.
  //
  // This block is deliberately free of `document.` and `window.` so the contract
  // test can extract it and run the real source against real bytes, exactly as
  // the export-engine block above is run. The DOM half lives in initConverter().
  //
  // It writes its row-shaped output through exportRows() rather than carrying a
  // second set of format writers, so a CSV produced here and a CSV produced by
  // an export cannot drift apart, and describeLoss() answers for both.
  // ============================================================================
  const CONVERTER_MAX_BYTES = 32*1024*1024;
  const CONVERTER_PAGE_SIZE = 5;
  const CONVERTER_TARGETS = ['json','jsonl','csv','tsv','txt','base64'];
  const CONVERTER_TARGET_LABEL = {json:'JSON',jsonl:'JSONL',csv:'CSV',tsv:'TSV',txt:'Plain text',base64:'Base64'};
  const CONVERTER_TARGET_EXTENSION = {json:'json',jsonl:'jsonl',csv:'csv',tsv:'tsv',txt:'txt',base64:'base64.txt'};

  /**
   * The adapter catalogue.
   *
   * Every category the canonical contract names is present, and a category with
   * nothing bundled behind it still appears -- carrying the exact reason no
   * adapter is available rather than quietly vanishing, because a catalogue that
   * lists only what works reads as "every format is supported".
   *
   * `bundled` means the adapter runs entirely inside this page with nothing
   * fetched: there is no discovery from PATH, no download, and no remote
   * service, so an adapter is either here in the source or it is unavailable.
   */
  const CONVERTER_CATEGORIES = [
    {id:'structured-data',label:'Structured data and spreadsheets',adapters:[
      {id:'json',label:'JSON',bundled:true,reads:'json',writes:['json','jsonl','csv','tsv','txt','base64']},
      {id:'jsonl',label:'JSONL / NDJSON',bundled:true,reads:'jsonl',writes:['json','jsonl','csv','tsv','txt','base64']},
      {id:'csv',label:'CSV',bundled:true,reads:'csv',writes:['json','jsonl','csv','tsv','txt','base64']},
      {id:'tsv',label:'TSV',bundled:true,reads:'tsv',writes:['json','jsonl','csv','tsv','txt','base64']},
      {id:'xlsx',label:'Excel workbook (.xlsx)',bundled:false,
        unavailable:'no spreadsheet decoder is bundled: an .xlsx file is a ZIP container of XML parts, so reading one needs an inflate implementation this page does not carry'}
    ]},
    {id:'code-text',label:'Code and text',adapters:[
      {id:'utf8-text',label:'UTF-8 text',bundled:true,reads:'text',writes:['txt','base64']},
      {id:'markdown',label:'Markdown',bundled:true,reads:'markdown',writes:['txt','base64']},
      {id:'utf16-text',label:'UTF-16 text',bundled:false,
        unavailable:'only UTF-8 is decoded here: a UTF-16 file is rejected as invalid UTF-8 rather than being decoded into wrong characters'}
    ]},
    {id:'binary-encodings',label:'Binary encodings',adapters:[
      {id:'base64',label:'Bytes to Base64',bundled:true,reads:'any',writes:['base64']}
    ]},
    {id:'documents',label:'Documents and PDF',adapters:[
      {id:'pdf',label:'PDF',bundled:false,
        unavailable:'no PDF parser is bundled, so a PDF is recognised by its %PDF- signature and then refused rather than being read as text'}
    ]},
    {id:'images',label:'Images',adapters:[
      {id:'image',label:'PNG, JPEG, GIF',bundled:false,
        unavailable:'no image decoder is bundled; these are recognised by signature and offered only as Base64, which re-encodes the bytes without decoding the picture'}
    ]},
    {id:'audio',label:'Audio',adapters:[
      {id:'audio',label:'WAV, MP3, Ogg',bundled:false,
        unavailable:'no audio decoder or encoder is bundled, and transcoding audio in a page without one would produce a file that is not what it claims to be'}
    ]},
    {id:'video',label:'Video',adapters:[
      {id:'video',label:'MP4',bundled:false,
        unavailable:'no video decoder or encoder is bundled; the same reason as audio, at a size that would also exceed the per-file bound'}
    ]},
    {id:'archives',label:'Archives',adapters:[
      {id:'archive',label:'ZIP, gzip',bundled:false,
        unavailable:'no inflate implementation is bundled, so an archive is recognised by signature and left unopened rather than half-read'}
    ]}
  ];

  /** Every adapter in the catalogue, flattened, each carrying its category. */
  function converterAdapters(){
    return CONVERTER_CATEGORIES.flatMap(category=>category.adapters.map(adapter=>({...adapter,category:category.id,categoryLabel:category.label})));
  }
  /** The bundled adapter that reads this detected kind, or undefined. */
  function converterAdapterFor(kind){
    return converterAdapters().find(adapter=>adapter.bundled&&adapter.reads===kind);
  }

  /**
   * What these bytes actually are, decided by the bytes.
   *
   * The extension is read too, but only as a separate, clearly-labelled hint:
   * a name is what somebody typed and a signature is what is in the file, and
   * when they disagree the signature is what gets acted on.
   */
  function converterSignature(bytes){
    const at=(offset,...sig)=>sig.every((byte,index)=>bytes[offset+index]===byte);
    if(at(0,0x25,0x50,0x44,0x46,0x2D))return{kind:'pdf',signature:'%PDF-'};
    if(at(0,0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A))return{kind:'png',signature:'\\x89PNG'};
    if(at(0,0xFF,0xD8,0xFF))return{kind:'jpeg',signature:'\\xFF\\xD8\\xFF'};
    if(at(0,0x47,0x49,0x46,0x38))return{kind:'gif',signature:'GIF8'};
    if(at(0,0x50,0x4B,0x03,0x04))return{kind:'zip',signature:'PK\\x03\\x04'};
    if(at(0,0x1F,0x8B))return{kind:'gzip',signature:'\\x1F\\x8B'};
    if(at(0,0x52,0x49,0x46,0x46)&&at(8,0x57,0x41,0x56,0x45))return{kind:'wav',signature:'RIFF....WAVE'};
    if(at(0,0x49,0x44,0x33))return{kind:'mp3',signature:'ID3'};
    if(at(0,0x4F,0x67,0x67,0x53))return{kind:'ogg',signature:'OggS'};
    if(at(4,0x66,0x74,0x79,0x70))return{kind:'mp4',signature:'....ftyp'};
    return undefined;
  }

  /** Decode as UTF-8, refusing rather than substituting replacement characters. */
  function converterDecodeUtf8(bytes){
    try{return{ok:true,text:new TextDecoder('utf-8',{fatal:true}).decode(bytes)}}
    catch{return{ok:false,reason:'these bytes are not valid UTF-8'}}
  }

  /** Split one delimited line, honouring RFC 4180 double-quoted fields. */
  function converterSplitDelimited(line,delimiter){
    const fields=[];let field='',quoted=false;
    for(let i=0;i<line.length;i+=1){
      const char=line[i];
      if(quoted){
        if(char==='"'&&line[i+1]==='"'){field+='"';i+=1;continue}
        if(char==='"'){quoted=false;continue}
        field+=char;continue;
      }
      if(char==='"'){quoted=true;continue}
      if(char===delimiter){fields.push(field);field='';continue}
      field+=char;
    }
    fields.push(field);
    return fields;
  }
  function converterDelimitedLines(text){
    return text.split(/\r\n|\n|\r/).filter((line,index,lines)=>line!==''||index<lines.length-1);
  }
  /** True when every line splits into the same number of fields, and there is more than one field. */
  function converterLooksDelimited(text,delimiter){
    const lines=converterDelimitedLines(text);
    if(lines.length<2)return false;
    const width=converterSplitDelimited(lines[0],delimiter).length;
    if(width<2)return false;
    return lines.every(line=>converterSplitDelimited(line,delimiter).length===width);
  }

  /**
   * Classify decoded text. JSON and JSONL are decided by parsing, not by looking
   * at the name; CSV and TSV by a consistent field count; Markdown only by its
   * extension, which is why that one hint is reported as a hint.
   */
  function converterClassifyText(text,name){
    const trimmed=text.trim();
    if(trimmed!==''){
      try{JSON.parse(trimmed);return{kind:'json',why:'the whole file parses as JSON'}}catch{/* not JSON; fall through */}
      const lines=converterDelimitedLines(text).filter(line=>line.trim()!=='');
      if(lines.length>0&&lines.every(line=>{try{JSON.parse(line);return true}catch{return false}}))
        return{kind:'jsonl',why:'every line parses as its own JSON value'};
      if(converterLooksDelimited(text,'\t'))return{kind:'tsv',why:'every line holds the same number of tab-separated fields'};
      if(converterLooksDelimited(text,','))return{kind:'csv',why:'every line holds the same number of comma-separated fields'};
    }
    if(/\.(md|markdown)$/i.test(String(name||'')))
      return{kind:'markdown',why:'the name ends in .md, which is a hint from the name rather than anything in the bytes'};
    return{kind:'text',why:'the bytes decode as UTF-8 and match no structured shape'};
  }

  /**
   * Everything known about one chosen file, before any conversion is asked for.
   * `rows` is present only when the file genuinely holds a table.
   */
  function converterInspect(name,bytes){
    const size=bytes.length;
    if(size>CONVERTER_MAX_BYTES)
      return{name,size,kind:'over-bound',why:`this file is ${size} bytes and the per-file bound is ${CONVERTER_MAX_BYTES} bytes`,readable:false};
    const signature=converterSignature(bytes);
    if(signature)
      return{name,size,kind:signature.kind,why:`the first bytes are ${signature.signature}`,readable:true,binary:true};
    const decoded=converterDecodeUtf8(bytes);
    if(!decoded.ok)return{name,size,kind:'binary',why:decoded.reason,readable:true,binary:true};
    if(decoded.text.includes('\u0000'))
      return{name,size,kind:'binary',why:'the bytes decode as UTF-8 but hold a NUL, so this is not text',readable:true,binary:true};
    const classified=converterClassifyText(decoded.text,name);
    const inspected={name,size,kind:classified.kind,why:classified.why,readable:true,binary:false,text:decoded.text};
    const rows=converterRowsFor(classified.kind,decoded.text);
    if(rows.ok)inspected.rows=rows.rows;
    else inspected.rowsRefused=rows.reason;
    return inspected;
  }

  /**
   * The table inside a file, or the exact reason there is not one.
   *
   * An array of scalars is refused on purpose: a table needs named columns, and
   * inventing one to hold the values would be this page making up a heading.
   */
  function converterRowsFor(kind,text){
    const isPlainRow=value=>typeof value==='object'&&value!==null&&!Array.isArray(value);
    if(kind==='json'){
      const parsed=JSON.parse(text.trim());
      if(Array.isArray(parsed)){
        if(parsed.length===0)return{ok:true,rows:[]};
        if(parsed.every(isPlainRow))return{ok:true,rows:parsed};
        return{ok:false,reason:'this JSON is an array whose entries are not all objects, so it has no named columns to become a table'};
      }
      if(isPlainRow(parsed))return{ok:true,rows:[parsed]};
      return{ok:false,reason:'this JSON is a single scalar value, so it has no named columns to become a table'};
    }
    if(kind==='jsonl'){
      const values=converterDelimitedLines(text).filter(line=>line.trim()!=='').map(line=>JSON.parse(line));
      if(values.every(isPlainRow))return{ok:true,rows:values};
      return{ok:false,reason:'at least one line is not a JSON object, so these lines have no named columns to become a table'};
    }
    if(kind==='csv'||kind==='tsv'){
      const delimiter=kind==='tsv'?'\t':',';
      const lines=converterDelimitedLines(text);
      const header=converterSplitDelimited(lines[0],delimiter);
      const duplicate=header.find((column,index)=>header.indexOf(column)!==index);
      if(duplicate!==undefined)return{ok:false,reason:`the first line repeats the column name "${duplicate}", so a row read from it would lose one of them`};
      const rows=lines.slice(1).map(line=>{
        const fields=converterSplitDelimited(line,delimiter),row={};
        header.forEach((column,index)=>{row[column]=fields[index]??''});
        return row;
      });
      return{ok:true,rows};
    }
    return{ok:false,reason:`a ${kind} file holds no table`};
  }

  /** Base64 of the raw bytes, chunked so a large file cannot exhaust the argument list. */
  function converterBase64(bytes){
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }

  /**
   * Whether this file can become this target, and if not, exactly why.
   * Nothing here converts; this is what the Convert button reads to decide
   * whether it is switched on and what its adjacent text says.
   */
  function converterCan(inspected,target){
    if(!CONVERTER_TARGETS.includes(target))return{ok:false,reason:`${target} is not one of the targets this page writes`};
    if(!inspected.readable)return{ok:false,reason:inspected.why};
    if(target==='base64')return{ok:true};
    if(inspected.binary)return{ok:false,reason:`this file is ${inspected.kind}, and no ${inspected.kind} decoder is bundled, so Base64 is the only target that keeps its bytes honestly`};
    if(target==='txt')return{ok:true};
    if(!inspected.rows)return{ok:false,reason:inspected.rowsRefused||`a ${inspected.kind} file holds no table, and ${CONVERTER_TARGET_LABEL[target]} writes a table`};
    if((target==='csv'||target==='tsv')&&!suitableFormats(inspected.rows).includes(target))
      return{ok:false,reason:`${CONVERTER_TARGET_LABEL[target]} cannot represent this table: ${describeLoss(inspected.rows,target).join(' ')}`};
    return{ok:true};
  }

  /**
   * What this conversion would lose, said before it runs.
   * Row-shaped targets defer to describeLoss(), so the converter and the export
   * pipeline cannot disagree about the same table and the same format.
   */
  function converterLoss(inspected,target){
    if(!inspected.readable)return[inspected.why];
    if(target==='base64')return['Base64 keeps every byte exactly and makes the output about a third larger. The file name, its timestamp and its permissions are not part of the output.'];
    if(inspected.binary)return[`No ${inspected.kind} decoder is bundled, so this file cannot become ${CONVERTER_TARGET_LABEL[target]}.`];
    if(target==='txt')return['Nothing is lost: the decoded UTF-8 text is written back unchanged, including its original line endings.'];
    if(!inspected.rows)return[inspected.rowsRefused||`A ${inspected.kind} file holds no table.`];
    const loss=describeLoss(inspected.rows,target);
    if(target==='csv'||target==='tsv')loss.push('Every value is written as text, so a number and the text of that number become the same field.');
    return loss.length>0?loss:['Nothing is lost: this table can be represented in full.'];
  }

  /** Run the conversion. Returns the output text, or the reason there is none. */
  function converterConvert(inspected,target,bytes){
    const can=converterCan(inspected,target);
    if(!can.ok)return{ok:false,reason:can.reason};
    if(target==='base64')return{ok:true,text:converterBase64(bytes)};
    if(target==='txt')return{ok:true,text:inspected.text};
    return{ok:true,text:exportRows({rows:inspected.rows,format:target,table:'row'})};
  }

  /** The output name, keeping the original stem and never a path separator. */
  function converterOutputName(name,target){
    const stem=String(name).replace(/\.[^./\\]*$/,'').replace(/[/\\]/g,'-').trim();
    return `${stem===''?'converted':stem}.${CONVERTER_TARGET_EXTENSION[target]}`;
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
  // Release notes are provider-authored Markdown -- written by the release
  // process, not by this site. console/scripts/resolve-site-download-manifest.mjs
  // resolves the newest verified non-draft release at build time, and
  // console/site/build.mjs replaces this exact declaration with the real
  // notes as a JSON-escaped string literal. Empty here because this is the
  // honest fallback: no verified release manifest was found, so downloads.html
  // says so plainly instead of rendering literal "#"/"[]()" source text.
  const RELEASE_NOTES_MARKDOWN = '';
  // Changelog. The same arrangement as the release notes above, and for the same
  // reason: this is real release history or it is nothing at all.
  //
  // console/scripts/bundle-changelog.mjs builds the Markdown from this repository's
  // own tags -- every version is a real tag, every change line is a real commit
  // reachable from that tag and not from the one before it, and every id is the real
  // 40-character SHA -- and console/site/build.mjs replaces these two exact
  // declarations with it at build time. Empty here is the honest fallback rather than
  // a placeholder: a page served straight out of the source directory has no release
  // history to show, and says so, instead of showing an invented one.
  //
  // The repository URL is separate and is equally not guessed. `changelogCommitUrl`
  // refuses to build a link without it, so an unresolved build renders the SHA as
  // text; a link that goes nowhere is worse than a fact with no link on it.
  const CHANGELOG_MARKDOWN = '';
  const CHANGELOG_REPOSITORY_URL = '';
  // ---- The deployed-version watch: what "automatic updates" means for a page. ----
  //
  // A page installs nothing, so the canonical updater has to be read for what it is FOR
  // rather than copied clause by clause: notice that what is published has moved on, say
  // so without interrupting anybody, and let the person take the new one when they choose.
  // Reloading is the whole installation step. There is no staged download, no signature,
  // no restart and nothing to roll back, and the card says all four out loud rather than
  // implying machinery this surface does not have.
  //
  // The identity that decides is the COMMIT and never the version label. A label is for a
  // person to read; two different builds of one release carry the same label, so a check
  // resting on it would report "current" about a page that is not.
  //
  // All three are empty here on purpose and are filled in by `site/build.mjs`, exactly as
  // the changelog above is. A page served straight out of the source directory therefore
  // knows it was never built, says so, and never asks for a manifest it could not be
  // judged against -- which is better than a request that fails and reads as a site that
  // is down.
  const SITE_BUILD_VERSION = '';
  const SITE_BUILD_COMMIT = '';
  const SITE_BUILD_AT = '';
  // Same-origin by construction: resolved against this document rather than written as an
  // absolute URL, and refused outright below if it ever resolves somewhere else.
  const VERSION_MANIFEST_NAME = 'version.json';
  const UPDATE_CHECK_INTERVAL_MS = 1800000;
  const UPDATE_MANIFEST_MAX_BYTES = 4096;
  const UPDATE_FETCH_TIMEOUT_MS = 8000;
  const DEFAULTS = {theme:'dark',language:'en',density:'comfortable',accent:'#82D9A5',fontScale:100,lowMotion:false,englishFunny:0,cantoneseFunny:0,displayName:'',dialogEmojis:false,narration:{enabled:false,language:'en',voiceEn:'',voiceZh:'',rate:1,pitch:1},attention:{reduceFlashing:false,simplifiedLanguage:false,extendedTimeouts:false,focus:false,timeAwareness:false,oneThing:false,momentum:false,currentTask:''},scheduleEnabled:false,updateDismissedCommit:'',notifications:[],collapsed:{destinationMap:true,settingsPreview:true,documentationFilters:false,settingsFilters:false,changelogFilters:false}};
  // ---- Display name: the name this site shows the person reading it, which is
  // theirs to change, and the shipped product name, which is not.
  //
  // The two are deliberately different things and are kept apart on purpose. The
  // shipped name identifies the product to anyone outside this browser -- a file
  // exported from this page, a download, the link preview somebody else sees --
  // and to this page's own storage. The display name is a label, and the rule
  // this constant exists to make checkable is that nothing derives identity from
  // it: STORAGE_KEY, HISTORY_KEY, the vocabulary and logo cache keys and the
  // export filename are all literal constants that no rename can reach.
  //
  // Empty means "use the shipped name", rather than storing a copy of it. A copy
  // would silently become a stale rename the day the shipped name changes, and
  // nothing would say so.
  const SHIPPED_PRODUCT_NAME = 'Material Asterisk';
  const DISPLAY_NAME_MAX = 60;
  // Captured once, before any rename can reach it, so a second rename composes
  // against the shipped title rather than against the previous rename's output.
  const SHIPPED_TITLE = document.title;
  const STORAGE_KEY = 'ding-pbx-pages-v2';
  /* The two cache keys are named here as well as written as literals at their one write
   * site each, because the ticket desk's recovery panel derives the list of keys this page
   * writes from these declarations rather than restating it -- and that panel is the only
   * place a locked-out reader is told what to clear.
   *
   * Two spellings of one value, so both halves are pinned in the contracts that own them
   * (app-logo-customization and personal-vocabulary-upload each assert the literal at the
   * write site AND the constant here). Worth saying out loud because these two lines were
   * silently dropped by a merge once: master had edited the region they sat in, so the
   * auto-merge took its side and took the declarations with it, leaving supportStorageKeys
   * referring to two bindings that no longer existed. Nothing in app.js complained -- the
   * reference is inside a function nobody calls until the panel opens. */
  const VOCABULARY_CACHE_KEY = 'ding-pbx-vocabulary-cache';
  const LOGO_CACHE_KEY = 'ding-pbx-logo-cache';
  // ---- Local version history: an append-only record, isolated in its own
  // storage key so "Reset settings" never touches it. Restoring an entry
  // writes a NEW entry rather than rewriting or deleting an earlier one, so
  // a restore can itself be undone later. ----
  const HISTORY_KEY = 'ding-pbx-pages-history-v1';
  const HISTORY_LIMIT = 300;
  let historySeq = 0;
  function loadHistory(){try{const saved=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}}
  let historyEntries = loadHistory();
  function saveHistory(){return reportWrite('the local history',writeLocal(HISTORY_KEY,JSON.stringify(historyEntries.slice(0,HISTORY_LIMIT))))}
  const regexState = new Map();
  let regexTarget = '';
  let destinationPage = 0;

  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  // ============================================================================
  // Provider-authored Markdown rendering -- one shared, safe parser for text
  // written elsewhere (such as release notes) rather than authored by this
  // site. Every character is HTML-escaped BEFORE any markdown syntax
  // is recognised, so raw HTML in untrusted input can never reach the DOM as
  // markup -- only the literal characters this function itself emits do.
  // Links are restricted to an http(s)/mailto scheme allowlist; anything else
  // renders as plain text rather than a clickable link.
  // ============================================================================
  function markdownInlineTokens(text){
    return escapeHtml(text)
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(match,label,url)=>/^(https?:|mailto:)/i.test(url)?`<a href="${url}" rel="noopener noreferrer">${label}</a>`:label);
  }
  function parseMarkdown(source){
    const text=String(source||'').replaceAll('\r\n','\n').trim();
    if(!text)return '';
    return text.split(/\n{2,}/).map(block=>{
      const lines=block.split('\n');
      const heading=lines.length===1&&lines[0].match(/^(#{1,3})\s+(.*)$/);
      if(heading){const level=heading[1].length+2;return `<h${level}>${markdownInlineTokens(heading[2])}</h${level}>`}
      if(lines.every(line=>/^[-*]\s+/.test(line)))return `<ul>${lines.map(line=>`<li>${markdownInlineTokens(line.replace(/^[-*]\s+/,''))}</li>`).join('')}</ul>`;
      if(lines[0].startsWith('```')&&lines[lines.length-1].trim()==='```')return `<pre><code>${escapeHtml(lines.slice(1,-1).join('\n'))}</code></pre>`;
      return `<p>${lines.map(markdownInlineTokens).join('<br>')}</p>`;
    }).join('');
  }
  function renderMarkdownBlock(container,source,emptyMessage){
    if(!container)return;
    const html=parseMarkdown(source);
    container.innerHTML=html||`<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
  }
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{...DEFAULTS,...saved,attention:{...DEFAULTS.attention,...(saved.attention||{})},narration:{...DEFAULTS.narration,...(saved.narration||{})},collapsed:{...DEFAULTS.collapsed,...(saved.collapsed||{})}}}catch{return{...DEFAULTS,attention:{...DEFAULTS.attention},narration:{...DEFAULTS.narration},collapsed:{...DEFAULTS.collapsed}}}}
  const state=loadState();
  function save(){return reportWrite('this page’s settings',writeLocal(STORAGE_KEY,JSON.stringify(state)))}
  function update(key,value){state[key]=value;save();applyState();recordHistory('setting-changed',`${key} changed to ${value}.`);notify(copyText('notifSettingSaved'),applyVocabularyText(`${key} now uses ${value}.`),{category:'setting',copyKey:'notifSettingSaved'})}
  function applyState(){applySchoolMode();document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.density=state.density;document.documentElement.style.setProperty('--primary',state.accent);document.documentElement.style.setProperty('--font-scale',String(state.fontScale/100));document.body.classList.toggle('low-stimulation',state.lowMotion);if($('theme-mode'))$('theme-mode').value=state.theme;if($('language-mode'))$('language-mode').value=state.language;if($('density-mode'))$('density-mode').value=state.density;if($('accent-color'))$('accent-color').value=state.accent;if($('font-scale'))$('font-scale').value=state.fontScale;if($('font-scale-output'))$('font-scale-output').textContent=`${state.fontScale}%`;if($('motion-mode'))$('motion-mode').checked=state.lowMotion;if($('english-funny'))$('english-funny').value=String(state.englishFunny);if($('cantonese-funny'))$('cantonese-funny').value=String(state.cantoneseFunny);if($('schedule-enabled'))$('schedule-enabled').checked=state.scheduleEnabled;if($('attention-reduce-flashing'))$('attention-reduce-flashing').checked=state.attention.reduceFlashing;if($('attention-simplified-language'))$('attention-simplified-language').checked=state.attention.simplifiedLanguage;if($('attention-extended-timeouts'))$('attention-extended-timeouts').checked=state.attention.extendedTimeouts;if($('attention-focus'))$('attention-focus').checked=state.attention.focus;if($('attention-time-awareness'))$('attention-time-awareness').checked=state.attention.timeAwareness;if($('attention-one-thing'))$('attention-one-thing').checked=state.attention.oneThing;if($('attention-momentum'))$('attention-momentum').checked=state.attention.momentum;if($('attention-current-task'))$('attention-current-task').value=state.attention.currentTask||'';document.body.classList.toggle('reduce-flashing',state.attention.reduceFlashing);document.body.classList.toggle('extended-timeouts',state.attention.extendedTimeouts);document.body.classList.toggle('attn-focus',state.attention.focus);applyLanguage();applyCopy();applyLogo();applyDisplayName();applyVocabulary();applyDialogEmojis();applyNarration();updateSessionTimer();updateOneThingBanner();renderAllModeStatuses();renderUpdateState();renderSupportCopy()}
  function updateAttention(key,value){state.attention={...state.attention,[key]:value};save();applyState();recordHistory('attention-changed',`attention.${key} changed to ${value}.`);notify(copyText('notifSettingSaved'),applyVocabularyText(`attention.${key} now uses ${value}.`),{category:'setting',copyKey:'notifSettingSaved'})}
  function applyLanguage(){if(!$('language-preview'))return;document.documentElement.lang=state.language==='zh'?'zh-Hant':'en';$('language-preview').textContent=state.language==='en'?'English presentation active.':state.language==='zh'?'廣東話顯示已啟用。':'Bilingual presentation active. / 雙語顯示已啟用。'}

  // Funny-level copy: voice changes with the slider, facts never do. Each key holds
  // four English variants (Plain..Maximum) and four Cantonese variants at the same
  // levels, selected by the independent per-language funny sliders. Level 0 is the
  // exact wording this page already shipped, so nothing changes for anyone who never
  // touches the sliders.
  const COPY = {
    /* Voice moves with the slider; three facts never do. Every one of the eight
     * variants says that the secrets stay in this browser and nothing is sent
     * anywhere, that every code is computed on this page from the secret the reader
     * registered, and that clearing this site's storage deletes them with no way
     * back. A variant that dropped any of the three would be describing a different,
     * and considerably less careful, feature. */
    authenticatorDesc:{en:[
      'Keeps one-time-code accounts for other services in this browser and shows their codes here. The secrets stay in this browser and nothing is sent anywhere. Every code is computed on this page from the secret you registered. Clearing this site’s storage deletes them, and nothing here can give a secret back.',
      'Keeps one-time-code accounts for other services in this browser and shows their codes here — the secrets stay in this browser and nothing is sent anywhere. Every code is computed on this page from the secret you registered. Clearing this site’s storage deletes them, and nothing here can give a secret back.',
      'Holds the one-time-code accounts other services handed you, right here in this browser, and keeps their codes ticking over. The secrets stay in this browser and nothing is sent anywhere. Every code is worked out on this page from the secret you registered. Clear this site’s storage and they are gone — nothing here can give a secret back.',
      'Your one-time-code accounts, kept in this browser and nowhere else, with their codes turning over on screen. The secrets stay in this browser and nothing is sent anywhere, to anyone, ever. Every code is computed on this page from the secret you registered — no server is consulted, and none is asked politely either. Clear this site’s storage and the lot vanishes: nothing here can give a secret back, and it will not pretend otherwise.'
    ],zh:[
      '將其他服務嘅一次性密碼帳戶存喺呢個瀏覽器，並且喺呢度顯示佢哋嘅驗證碼。密鑰淨係留喺呢個瀏覽器，唔會送去任何地方。每一個驗證碼都係喺呢版用你登記嗰個密鑰計出嚟。清除呢個網站嘅儲存空間就會刪除晒佢哋，而呢度冇任何嘢可以將密鑰還返畀你。',
      '將其他服務嘅一次性密碼帳戶存喺呢個瀏覽器，喺呢度顯示佢哋嘅驗證碼 —— 密鑰淨係留喺呢個瀏覽器，唔會送去任何地方。每個驗證碼都係喺呢版用你登記嗰個密鑰計出嚟。清除呢個網站嘅儲存空間就會刪除晒佢哋，而呢度冇任何嘢可以將密鑰還返畀你。',
      '其他服務畀你嗰啲一次性密碼帳戶，全部收埋喺呢個瀏覽器度，驗證碼就喺呢度跳。密鑰淨係留喺呢個瀏覽器，唔會送去任何地方。每個驗證碼都係喺呢版用你登記嗰個密鑰計出嚟。清咗呢個網站嘅儲存空間就冇晒 —— 呢度冇任何嘢可以將密鑰還返畀你。',
      '你嘅一次性密碼帳戶，淨係收喺呢個瀏覽器，冇第二個地方，驗證碼喺螢幕上面一路跳。密鑰淨係留喺呢個瀏覽器，唔會送去任何地方、畀任何人。每個驗證碼都係喺呢版用你登記嗰個密鑰計出嚟 —— 唔會問任何伺服器，連客氣噉問一句都冇。清咗呢個網站嘅儲存空間就一鋪清袋：呢度冇任何嘢可以將密鑰還返畀你，佢亦都唔會扮嘢話做得到。'
    ]},
    /* Voice moves with the slider; every fact in a recovery region sits in a
     * sibling of this line, so nothing here can carry one. What each level says
     * is the same thing: this is what this page can do about it, from here. */
    recoveryLead:{en:[
      'Here is what this page can do about it, without you going anywhere else.',
      'Here is what this page can actually do about it, from right here.',
      'Right then — here is what this page can do about it without sending you off on a hunt.',
      'Deep breath. Here is what this page can do about it from exactly where you are standing, no expedition required.'
    ],zh:[
      '呢頁可以幫你做嘅嘢喺下面，唔使你走去第二度。',
      '呢頁喺呢度就可以幫你做到嘅嘢，全部列咗喺下面。',
      '好喇 —— 呢頁喺呢度就搞得掂嘅嘢喺下面，唔使你周圍搵。',
      '深呼吸先。企喺呢度就搞得掂嘅嘢全部喺下面，唔使去探險。'
    ]},
    /* Voice moves with the slider; three facts never do. Every level says that one
     * file is written per record set in the single format chosen, that nothing
     * leaves this browser, and that the run names the file it is writing and the
     * count done -- the third one is what separates a progress report from a
     * spinner, so a level that dropped it would be describing a different feature. */
    exportEverythingDesc:{en:[
      'Writes one file for every record set this page holds, all in the single format you choose. Nothing leaves this browser. While it runs it names the file it is writing and how many are done, so a run stopped part-way can tell you exactly which files you already have.',
      'Writes one file for every record set this page holds, all in the one format you choose — and nothing leaves this browser. While it runs it names the file it is writing and how many of them are done, so a run stopped part-way can still tell you exactly which files you already have.',
      'Hands you every record set on this page, one file each, in whichever single format you pick. None of it goes anywhere near a network. It talks while it works too: which file is being written, and how many are done, so stopping half way still leaves you knowing exactly what you got.',
      'Empties the whole page into files, one per record set, in the one format you fancy — and not a byte of it leaves this browser. It narrates as it goes: which file it is on, how many are done. Stop it half way and it tells you precisely which files you already have, rather than shrugging and letting you guess.'
    ],zh:[
      '呢版每一組紀錄都會寫成一個檔案，全部用你揀嗰一種格式。冇任何嘢會離開呢個瀏覽器。運行期間佢會講出而家寫緊邊個檔案、已經寫咗幾多個，所以中途停低都知道自己已經攞到邊幾個檔案。',
      '呢版每一組紀錄都會寫成一個檔案，全部用你揀嗰一種格式 —— 而且冇任何嘢離開呢個瀏覽器。運行期間佢會講出而家寫緊邊個檔案、已經寫咗幾多個，所以中途停低都仲清楚知道自己已經攞到邊幾個。',
      '成版嘅紀錄一組一個檔案交返畀你，用你揀嗰隻格式。全程唔會掂到網絡。做嘢嗰陣仲會出聲：而家寫緊邊個、寫咗幾多個，所以中途叫停都一樣知道自己攞咗啲乜。',
      '成版嘢一次過倒晒出嚟做檔案，一組紀錄一個，用你鍾意嗰隻格式 —— 一個 byte 都唔會離開呢個瀏覽器。佢仲會邊做邊講：而家寫緊邊個、已經寫咗幾多個。中途叫停佢都會老老實實話你知你已經攞到邊幾個檔案，唔會聳聳膊等你自己估。'
    ]},
    /* Voice moves with the slider; four facts never do. Every level says that the
     * comparison is on the build commit, that nothing is installed or downloaded in
     * the background, that reloading is what takes the new page, and that the check
     * asks this same site for one small file and nothing else. */
    updatesDesc:{en:[
      'Checks whether the published site has moved on from the page you are reading, and says so without interrupting you. The comparison is on the build commit this page was made from, not on the version label beside it. Nothing is installed and nothing downloads in the background: reloading is what takes the new page. The check asks this site for one small version file and sends nothing anywhere.',
      'Checks whether the published site has moved on from the page you are reading, and says so without interrupting you — the comparison is on the build commit this page was made from, not the version label beside it. Nothing is installed and nothing downloads in the background: reloading is what takes the new page. The check asks this site for one small version file and sends nothing anywhere.',
      'Keeps half an eye on whether the published site has run ahead of the page in front of you, and mentions it quietly rather than throwing a dialog at you. It compares build commits, not the friendly version label. Nothing installs, nothing downloads in the background, and reloading is the entire upgrade. The check asks this site for one small version file and sends nothing anywhere.',
      'Politely coughs when the published site has left this page behind. It compares build commits, because two builds can wear the same version label and cheerfully lie to you about it. Nothing installs, nothing sneaks down in the background, and reloading is the whole ceremony — there is no restart to sit through. The check asks this site for one small version file and sends nothing anywhere, to anyone.'
    ],zh:[
      '呢個設定會留意已發佈嘅網站有冇行前咗，行前咗就話你知，但唔會打斷你。比較嘅係呢版整出嚟嗰個 build commit，唔係旁邊嗰個版本標籤。冇任何嘢會安裝，亦冇任何嘢喺背景下載：重新載入就係攞新版嘅方法。呢個檢查淨係向呢個網站攞一個細細嘅版本檔案，唔會將任何嘢送去邊度。',
      '呢個設定會留意已發佈嘅網站有冇行前咗，有就話你知，但唔會打斷你 —— 比較嘅係呢版整出嚟嗰個 build commit，唔係旁邊嗰個版本標籤。冇嘢會安裝，亦冇嘢喺背景下載：重新載入就係攞新版嘅方法。個檢查淨係向呢個網站攞一個細版本檔案，唔會送任何嘢出去。',
      '佢會幫你望住已發佈嘅網站有冇跑咗喺你面前呢版前面，有就靜靜雞講一聲，唔會彈個對話框嚇你。佢比較嘅係 build commit，唔係嗰個好聽嘅版本標籤。冇嘢安裝，冇嘢喺背景偷偷落載，重新載入就係成個升級程序。個檢查淨係向呢個網站攞一個細版本檔案，唔會送任何嘢出去。',
      '已發佈嘅網站行咗前，佢就好有禮貌噉咳一聲。佢比較 build commit，因為兩個 build 可以掛住同一個版本標籤，然後理直氣壯噉呃你。冇嘢安裝，冇嘢喺背景偷偷落載，重新載入就係成個儀式 —— 唔使坐喺度等重啟。個檢查淨係向呢個網站攞一個細細嘅版本檔案，唔會送任何嘢去任何地方、畀任何人。'
    ]},
    /* The desk is a joke and the joke is allowed to move with the slider. Two
     * facts never do, at any level and in either language: a ticket stays in
     * this browser, and the only thing that actually clears the restricted
     * presentation is clearing this site's storage yourself. The unmissable
     * line saying so is SUPPORT_DISCLOSURE and is deliberately NOT a COPY key,
     * because a disclosure a funny level can rewrite is a disclosure. */
    supportDesc:{en:[
      'A local ticket desk for the one thing this page can lock you out of. Nothing is sent anywhere: a ticket is written to this browser, given a number, and answered by this page. The resolution is always the same, and it is the only thing that works — clear this site’s storage yourself.',
      'A local ticket desk for the one thing this page can lock you out of. Nothing is sent anywhere — a ticket is written to this browser, given a number, and answered by this page. The resolution is always the same, and it is the only thing that actually works: clear this site’s storage yourself.',
      'File a ticket with a support desk that is entirely inside this page. It will take your category, note your severity, give you a number and answer within milliseconds, because it is a function. Nothing is sent anywhere. The resolution is always the same one, and it is the only thing that works: clear this site’s storage yourself.',
      'A support desk with no staff, no queue, no inbox and remarkable response times, because it is a function in the page you are reading. It will take your ticket, assign it a number, escalate it as many times as you like, and arrive at the same resolution every time — which happens to be the only thing that actually works: clear this site’s storage yourself. Nothing is sent anywhere.'
    ],zh:[
      '呢個係本機嘅客服櫃檯，專門處理呢版唯一鎖得住你嘅嘢。冇任何嘢會送出去：張飛只係寫入呢個瀏覽器、俾個編號你，然後由呢版自己覆你。解決方法永遠都係同一個，亦都係唯一真係有用嗰個 —— 你自己清走呢個網站嘅儲存。',
      '呢個係本機客服櫃檯，處理呢版唯一鎖得住你嘅嘢。冇嘢會送出去 —— 張飛寫入呢個瀏覽器、俾個編號你，然後由呢版自己覆。解決方法永遠一樣，亦都係唯一真係work嗰個：你自己清走呢個網站嘅儲存。',
      '同一個完全喺呢版入面嘅客服櫃檯開飛。佢會收你嘅分類、記低你嘅嚴重程度、派個編號，然後幾毫秒內覆你，因為佢根本就係個函數。冇嘢會送出去。解決方法永遠都係嗰一個，亦都係唯一有用嗰個：你自己清走呢個網站嘅儲存。',
      '一個冇員工、冇排隊、冇收件匣，但回覆速度驚人嘅客服櫃檯 —— 因為佢就係你而家睇緊呢版入面嘅一個函數。佢會收你張飛、派個編號、你想升級幾多次都得，最後每次都去到同一個結論 —— 啱啱好就係唯一真係有用嗰樣：你自己清走呢個網站嘅儲存。冇任何嘢會送出去。'
    ]},
    supportFirstResponse:{en:[
      'Thank you for contacting support. Your ticket has been received and recorded in this browser. A resolution is available now: clear this site’s storage.',
      'Thank you for contacting support. Your ticket has been received and recorded in this browser, which is as far as it goes. A resolution is available right now: clear this site’s storage.',
      'Thank you for contacting support. Your ticket has been received, logged, numbered and filed — all of it in this browser, none of it anywhere else. Good news: a resolution is already available, and it is to clear this site’s storage.',
      'Thank you for contacting support. Your ticket has been received and escalated to the highest tier available, which is this paragraph. Our records show a resolution is already available and has been since before you wrote in: clear this site’s storage.'
    ],zh:[
      '多謝你聯絡客服。你張飛已經收到，並記錄喺呢個瀏覽器入面。而家已經有解決方法：清走呢個網站嘅儲存。',
      '多謝你聯絡客服。你張飛已經收到，記錄喺呢個瀏覽器入面 —— 去到呢度就係盡頭。而家已經有解決方法：清走呢個網站嘅儲存。',
      '多謝你聯絡客服。你張飛已經收到、記錄、派好編號同歸檔 —— 全部喺呢個瀏覽器入面，其他地方一份都冇。好消息：解決方法已經有咗，就係清走呢個網站嘅儲存。',
      '多謝你聯絡客服。你張飛已經收到，並且升級到本櫃檯最高層級 —— 即係你而家睇緊呢段字。根據我哋嘅紀錄，解決方法喺你寫信之前已經存在：清走呢個網站嘅儲存。'
    ]},
    heroLede:{en:[
      'Material Asterisk is a planned desktop administration experience for Asterisk. This website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Material Asterisk is a planned desktop administration experience for Asterisk. Worth saying plainly: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Material Asterisk is a planned desktop administration experience for Asterisk. Friendly reminder: this website is documentation and download infrastructure—not the installed desktop application or a PBX runtime.',
      'Material Asterisk is a planned desktop administration experience for Asterisk. Say it with us: this website is documentation and download infrastructure—not the installed desktop application, and definitely not a PBX runtime.'
    ],zh:[
      'Material Asterisk係 Asterisk 嘅桌面管理計劃項目。呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Material Asterisk係 Asterisk 嘅桌面管理計劃項目。講多句：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，亦唔係 PBX 運行環境。',
      'Material Asterisk係 Asterisk 嘅桌面管理計劃項目。老實講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，更加唔係 PBX 運行環境。',
      'Material Asterisk係 Asterisk 嘅桌面管理計劃項目。認真同你講：呢個網站係文件同下載基建，唔係已安裝嘅桌面應用程式，梗係唔係 PBX 運行環境喇，聽晒未？'
    ]},
    /* Voice moves with the slider; the two facts never do. Every level names the
     * exact surfaces a rename reaches (the brand line and the tab title) and the
     * exact surfaces it does not (downloads, exports, storage, link preview),
     * because somebody choosing a name has to know which one a shared file
     * will carry. */
    displayNameDesc:{en:[
      'Renames what this site calls itself on screen: the brand line at the top and bottom of every page, and this browser tab title. Nothing else moves. Downloads, exported files, this page own local storage and the link preview other people see all keep the shipped name Material Asterisk, so anything you save or share still names the product.',
      'Renames what this site calls itself on screen — the brand line at the top and bottom of every page, and this browser tab title. Nothing else moves: downloads, exported files, this page own local storage and the link preview other people see all keep the shipped name Material Asterisk, so anything you save or share still names the product.',
      'Call this site whatever you like. It changes the brand line top and bottom, and the tab title, and that is the lot. Downloads, exports, local storage and the link preview other people see all stay Material Asterisk, so nothing you share turns up wearing your nickname.',
      'Name it after your cat if you want. The brand line top and bottom changes, the tab title changes, and absolutely nothing else does. Downloads, exports, local storage and the link preview other people see stubbornly stay Material Asterisk — so the file you send a colleague still says what the software actually is, cat or no cat.'
    ],zh:[
      '呢個設定淨係改呢個網站喺畫面上點稱呼自己：每版頂同底嘅品牌名，同埋瀏覽器分頁標題。其他嘢一律唔動。下載檔案、匯出檔案、呢版自己嘅本機儲存，以及其他人見到嘅連結預覽，全部照樣用出廠名 Material Asterisk，所以你儲落或者分享出去嘅嘢，一樣認得返個產品。',
      '呢個設定淨係改網站喺畫面上點稱呼自己 —— 每版頂同底嘅品牌名，同分頁標題。其餘唔動：下載、匯出檔案、本機儲存同人哋見到嘅連結預覽，全部照用出廠名 Material Asterisk，所以你分享出去嗰份嘢一樣認得返個產品。',
      '想叫佢乜名都得。改到嘅係頂同底嘅品牌名，加分頁標題，就咁多。下載、匯出、本機儲存同人哋見到嘅連結預覽照舊係 Material Asterisk，唔會有嘢帶住你個花名走出去。',
      '叫佢做「肥貓」都無問題。頂同底嘅品牌名會變，分頁標題會變，之後就真係一樣都唔變。下載、匯出、本機儲存同人哋見到嘅連結預覽死都咬住 Material Asterisk 唔放 —— 你 send 畀同事嗰份檔案，照樣講得出呢套軟件真名，有貓無貓都一樣。'
    ]},
    /* Voice moves with the slider; the two facts never do. Every level states that the
     * wording is unchanged and that no button, label or screen-reader name carries a
     * glyph, because a decoration whose boundary is only stated at some settings is a
     * boundary nobody can rely on. */
    dialogEmojisDesc:{en:[
      'Adds a decorative emoji beside each dialog and message box heading. The wording is identical either way, and no button, control label or screen-reader name ever carries one.',
      'Adds a decorative emoji beside each dialog and message box heading — the wording is identical either way, and no button, control label or screen-reader name ever carries one.',
      'Puts a small emoji next to each dialog and message box heading. Nothing else moves: the wording stays exactly as it was, and no button, label or screen-reader name gets one.',
      'Sprinkles one emoji beside each dialog and message box heading and then stops, which is the whole trick. The wording does not budge by a single character, and no button, label or screen-reader name ever gets one — decoration you can look at is fine, decoration read aloud at you is not.'
    ],zh:[
      '喺每個對話框同訊息框標題旁邊加一個裝飾用 emoji。字句完全一樣，任何按鈕、控制項標籤或者螢幕閱讀器名稱都唔會有 emoji。',
      '喺每個對話框同訊息框標題旁邊加一個裝飾用 emoji —— 字句完全一樣，任何按鈕、控制項標籤或者螢幕閱讀器名稱都唔會有。',
      '喺對話框同訊息框標題隔籬擺個細細嘅 emoji。其他一律唔郁：字句一個字都唔會變，按鈕、標籤同螢幕閱讀器名稱一律唔會有。',
      '喺每個對話框同訊息框標題隔籬撒一個 emoji，就咁多，冇下文。字句一個字都唔會走位，按鈕、標籤同螢幕閱讀器名稱死都唔會有 —— 睇得到嘅裝飾冇問題，讀出嚟嘈住你嘅就唔得。'
    ]},
    /* Voice moves with the slider; the two facts never do. Every level says the
     * narrator is off until it is switched on, and that everything it reads is already
     * on screen -- the second one is what makes it decoration for one person rather
     * than a private channel of facts a reader cannot get at. */
    narrationDesc:{en:[
      'Reads events aloud through this browser’s own speech voices. It is off until you switch it on, and everything it says is already on screen: it adds no facts of its own. Choose the narrated language, a voice for each language, and the rate and pitch.',
      'Reads events aloud through this browser’s own speech voices — off until you switch it on, and everything it says is already on screen, so it adds no facts of its own. Choose the narrated language, a voice per language, and the rate and pitch.',
      'Lets the page read itself out. It stays off until you switch it on, and it only ever says what is already on screen — no secret extra commentary. Pick the language, a voice for each one, and how fast and how high it talks.',
      'Hands the page a voice. It stays off, mouth firmly shut, until you switch it on, and even then it only reads what is already on screen — nothing gets said aloud that you cannot also see, which is the whole deal. Pick the language, a voice each, and exactly how fast and how squeaky.'
    ],zh:[
      '用呢個瀏覽器自己嘅語音將事件讀出嚟。預設係關咗嘅，要你開先會出聲；佢讀嘅嘢全部已經喺畫面上，唔會多講任何新資料。你可以揀朗讀語言、每種語言用邊把聲，以及語速同音高。',
      '用瀏覽器自己嘅語音讀出事件 —— 預設關咗，要你開先出聲，而且佢讀嘅嘢全部已經喺畫面上，唔會多講新資料。可以揀朗讀語言、每種語言嘅聲，同埋語速同音高。',
      '畀呢版自己讀出嚟。你唔開佢就關住，開咗之後都淨係讀畫面上已經有嘅嘢，唔會偷偷加旁白。揀語言、揀把聲、揀讀得幾快幾尖。',
      '畀呢版一把聲。預設係關住嘅，你唔撳掣佢就死都唔開口；開咗都淨係讀畫面上已經有嘅嘢 —— 讀出嚟嘅嘢你一定睇得到，呢個先係重點。語言、聲線、幾快幾尖，全部你話事。'
    ]},
    /* Voice moves with the slider; four facts never do, and no level names the mode --
     * the name is the reader's to change, so it is written into the card at run time
     * instead. Every level says: plain English only, the listed settings are removed
     * rather than greyed out, the choices behind them survive, and turning it off
     * needs the value chosen now. */
    schoolDesc:{en:[
      'While this is on, the page presents itself in plain English only. The Cantonese and bilingual choices, both funny levels and the personal-vocabulary upload are removed from this page rather than greyed out, and your existing choices stay stored and return when it is turned off. Turning it off needs a value you choose now.',
      'While this is on, the page presents itself in plain English only — the Cantonese and bilingual choices, both funny levels and the personal-vocabulary upload are removed from this page rather than greyed out. Your existing choices stay stored and return when it is turned off, and turning it off needs a value you choose now.',
      'Switch it on and the page goes plain English and stays there. The Cantonese and bilingual choices, both funny levels and the personal-vocabulary upload are taken off this page rather than greyed out, so there is nothing left to poke at. Your choices are still stored and come straight back when it is off, and getting it off needs a value you pick now.',
      'Flip this and the page turns severely sensible: plain English, no second language, no jokes. The Cantonese and bilingual choices, both funny levels and the personal-vocabulary upload are lifted clean off this page rather than sitting there greyed out and tempting. Everything you had chosen is still stored and walks right back in when it is off — and getting it off needs the value you pick now, so pick one you will remember.'
    ],zh:[
      '開咗之後，呢版淨係用簡單英文顯示。廣東話同雙語選項、兩個好笑程度，同埋個人詞彙上載都會由呢版度移走，唔係變灰咁擺喺度；你原本揀過嘅嘢照樣存住，關返佢就會返晒嚟。要關佢就要用你而家揀嘅一個值。',
      '開咗之後，呢版淨係用簡單英文顯示 —— 廣東話同雙語選項、兩個好笑程度，同埋個人詞彙上載會由呢版移走，唔係變灰擺喺度。你揀過嘅嘢照樣存住，關返佢就返晒嚟；要關佢，就要用你而家揀嘅值。',
      '一開咗，成版就淨返簡單英文，唔會走樣。廣東話同雙語、兩個好笑程度、個人詞彙上載全部搬走，唔會變灰喺度引你撳。你揀過嘅設定仲喺度，關返佢就即刻返嚟；想關？要你而家揀嘅個值。',
      '撳落去，呢版就正經到極：淨係簡單英文，冇第二種語言，冇笑話。廣東話同雙語、兩個好笑程度、個人詞彙上載全部搬走晒，唔會變灰咁喺度引你撳。你之前揀嘅嘢一件都冇少，關返佢就大搖大擺行返入嚟 —— 不過想關，就要你而家揀嘅個值，揀個記得住嘅。'
    ]},
    changelogDesc:{en:[
      'Every released version of Material Asterisk, newest first, with the real commit behind each line. Filter by date, search the text, and export exactly what you can see. The entries themselves are the release history and are never restyled.',
      'Every released version of Material Asterisk, newest first, with the real commit behind each line. Filter by date, search the text, and export exactly what you can see — the entries themselves are release history, so they are never restyled.',
      'Every version that actually shipped, newest first, each line carrying the commit that did it. Filter by date, search it, export what you can see. The entries stay exactly as the release wrote them, because that is the point of them.',
      'Every version that ever shipped, newest at the top, and each line hands you the commit that did the deed — no taking anybody word for it. Filter by date, search it, export precisely what is on screen and nothing else. The entries themselves never get restyled at any setting, because a joke about what changed is no longer a record of what changed.'
    ],zh:[
      'Material Asterisk 每一個已發佈版本，最新嘅喺最上面，每一行都附上真正嘅 commit。可以按日期篩選、搜尋內文，亦可以將見到嘅原樣匯出。條目本身係發佈紀錄，唔會改寫語氣。',
      'Material Asterisk 每一個已發佈版本，最新嘅行先，每一行都帶住真正嘅 commit。可以按日期篩選、搜尋、將見到嘅嘢匯出 —— 條目本身係發佈紀錄，所以永遠唔會改寫語氣。',
      '每個真係出過嘅版本，最新嗰個喺頂，每行都揸住做嗰件事嘅 commit。想按日期篩就篩，想搵就搵，見到咩就匯出咩。條目維持發佈時嘅原文，因為咁先有用。',
      '每一個出過街嘅版本，最新嗰個坐喺最頂，每一行都拎住犯案嘅 commit 出嚟 —— 唔使信人講。想按日期篩、想搵、想將畫面上嘅原封不動匯出都得。條目本身喺任何設定下都唔會改寫語氣，因為講笑咁講返改咗乜，就已經唔算係紀錄。'
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
    notifConverted:{en:[
      'Conversion finished',
      'Conversion finished.',
      'Conversion done — counts below.',
      'Converted, and every file that did not make it says why.'
    ],zh:[
      '轉換完成',
      '轉換已經完成。',
      '轉換搞掂，下面有數。',
      '轉換完成，唔得嘅每個都寫低咗點解。'
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
    ]},
    searchModePlain:{en:[
      'Plain text search.',
      'Plain text search — type to filter.',
      'Plain text mode. Type normally; no regex wizardry required.',
      'Plain text mode: just type. The regex gremlins are asleep.'
    ],zh:[
      '純文字搜尋。',
      '純文字搜尋，打字即過濾。',
      '純文字模式，照打就得，唔使識正則。',
      '純文字模式：打字就係，正則小精靈瞓緊覺。'
    ]},
    searchModeRegex:{en:[
      'Regular expression search active.',
      'Regex mode is active for this field.',
      'Regex mode: on. Plain text stays the default everywhere else.',
      'Regex mode engaged — may the backtracking gods be merciful.'
    ],zh:[
      '正則表達式搜尋已啟用。',
      '呢個欄位而家用緊正則模式。',
      '正則模式：開。其他地方照舊用純文字。',
      '正則模式已開機——祝你回溯順利。'
    ]},
    contextMenuHint:{en:[
      'Shift+F10 or the Menu key opens this menu for whatever has focus. Escape clears the filter, then closes.',
      'Shift+F10 or the Menu key opens this for whatever has focus. Escape clears the filter first, then closes.',
      'No mouse? Shift+F10 or the Menu key. Escape wipes the filter, then shuts the whole thing.',
      'Shift+F10, or that lonely Menu key nobody presses. Escape twice: once for the filter, once for the door.'
    ],zh:[
      '按 Shift+F10 或者 Menu 鍵，就會為有焦點嗰件嘢開呢個選單。Escape 先清篩選，再關。',
      '冇滑鼠？撳 Shift+F10 或者 Menu 鍵，Escape 先清走篩選，再撳先關。',
      '唔使滑鼠都得：Shift+F10 或者 Menu 鍵。Escape 第一下清篩選，第二下先閂門。',
      'Shift+F10，或者塊鍵盤上面冇人撳過嗰粒 Menu 鍵。Escape 撳兩下：一下清篩選，一下閂門。'
    ]},
    contextMenuNoMatch:{en:[
      'No action here matches that filter.',
      'Nothing in this menu matches that filter.',
      'Nothing matches. The actions are still all there; the filter just does not like them.',
      'Zero hits. Every action is still sitting right behind that filter, sulking.'
    ],zh:[
      '呢度冇動作符合個篩選。',
      '呢個選單入面冇嘢符合個篩選。',
      '搵唔到。啲動作全部仲喺度，只係個篩選唔鍾意佢哋咋。',
      '零命中。啲動作全部仲匿喺個篩選後面扁嘴。'
    ]}
  };

  function copyLevel(key,lang){
    const table=COPY[key];if(!table)return '';
    const arr=table[lang]||table.en;
    const level=lang==='zh'?state.cantoneseFunny:state.englishFunny;
    return arr[Math.min(arr.length-1,Math.max(0,Number(level)||0))]||arr[0];
  }
  function copyText(key){
    if(!COPY[key])return '';
    /* Two different requests that land on the same wording, and both arrive here
     * rather than in copyLevel: simplified language asks for the plainest variant,
     * and the restricted presentation makes the funny levels behave as though they
     * were not installed, which for copy means the level nobody chose -- the exact
     * wording this page shipped with. `effectiveLanguage()` is already English in
     * the second case, so the branch below picks the English array either way. */
    const lang=effectiveLanguage();
    if(state.attention.simplifiedLanguage||schoolActive()){
      return applyVocabularyText(COPY[key][lang==='zh'?'zh':'en'][0]);
    }
    let text;
    if(lang==='en')text=copyLevel(key,'en');
    else if(lang==='zh')text=copyLevel(key,'zh');
    else text=`${copyLevel(key,'en')} / ${copyLevel(key,'zh')}`;
    return applyVocabularyText(text);
  }
  function applyCopy(){all('[data-copy]').forEach(node=>{const key=node.dataset.copy;if(COPY[key])node.textContent=copyText(key)})}

  function vocabularyReplacements(){
    try{
      const raw=localStorage.getItem('ding-pbx-vocabulary-cache');
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed.replacements)?parsed.replacements:null;
    }catch{return null}
  }
  function applyVocabularyText(text){
    /* The restricted presentation makes this capability behave as though it were not
     * installed, and that has to be here rather than only on the upload control: the
     * cached file is deliberately kept so it returns when the mode is turned off, so
     * a mode that only removed the control would go on substituting from it. Every
     * already-substituted node reverts on the next pass, because the walker replays
     * each node's own original through this function. */
    if(schoolActive())return text;
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

  // ============================================================================
  // In-context recovery -- when something here fails, the way out is offered at
  // the surface where the failure was discovered, not in a menu somewhere else.
  //
  // Four properties carry it, and each is written so it can be checked rather
  // than promised:
  //
  //   - the route is rendered as the immediate next sibling of the status line
  //     that reported the failure. "Beside the control that failed" is the whole
  //     canonical clause: somebody whose upload has just been refused is looking
  //     at the upload control, and a recovery they have to go and find is a
  //     recovery they will not find while they are annoyed;
  //   - every action offered is a capability this page really has. `recoveryFor`
  //     is pure and names action ids, `RECOVERY_ACTIONS` holds the real
  //     implementations, and a route may only name an id declared there. A
  //     button that looks like it retries and does not is the decorative-control
  //     defect wearing a helpful face;
  //   - a route with nothing to offer says so, and says why, instead of showing
  //     a retry that cannot work. `page-unbuilt` is exactly that case -- a page
  //     the site build never produced has no build identity, so there is no
  //     published build to compare it against and nothing whatsoever to try
  //     again. "Try again" there would be a lie somebody could press repeatedly;
  //   - the remedies that would lose work are named, with what each would cost,
  //     because those are precisely the ones that look fastest to somebody who
  //     is stuck.
  //
  // It deliberately does not raise a notification. A message box is somewhere
  // else by definition, and not sending anybody somewhere else is the entire
  // feature -- and, usefully, `notify` writes to storage, which is the exact
  // thing that has failed in one of these routes.
  //
  // It deliberately does not narrate either. Every failure routed here already
  // speaks its own line at the moment it happens, so a second spoken line would
  // be the narrator reporting one event twice; the region is announced instead
  // by carrying `aria-live`, which is what a listener actually needs.
  // ============================================================================

  /**
   * The remedies that lose work, declared once with what each one costs, so a
   * route points at one rather than restating it and no route can warn about a
   * remedy nobody declared.
   */
  const RECOVERY_FORBIDDEN={
    'clear-storage':"Clearing this site's storage in your browser. That removes every local setting this page keeps -- the theme, the language, both funny levels, the attention settings, the name you gave this page, the image you added, the dictionary you loaded and the whole local history -- and none of that is what went wrong here.",
    'reset-settings':'Reset settings. It returns every local setting on this page to its shipped value, so it loses your choices without touching the thing that failed.',
    'reload-the-page':'Reloading this page. A check that could not reach the published version file says nothing at all about the page you already have, and reloading loses anything typed into a field and not yet saved.',
    'store-the-value-in-the-clear':'Keeping the value somewhere this page could read back. A value this page can read is a value anybody with this browser can read, which is the one thing a stored credential must never be.'
  };

  /** How many local-history entries the pruning action keeps. */
  const RECOVERY_HISTORY_KEEP=20;

  /**
   * Every failure this page can produce that somebody cannot get out of by
   * reading the message alone, and what this page can actually do about each.
   *
   * Hand-written, one row per failure, rather than derived from anything. A
   * derived list can only ever hold the failures somebody already routed, so it
   * could never report the one that is missing -- which is the only report worth
   * having here.
   */
  const FAILURE_ROUTES=[
    {
      id:'vocabulary-rejected',
      surface:'vocabulary-status',
      heading:'That dictionary file was not loaded',
      forbidden:['clear-storage','reset-settings'],
      note:context=>context.dictionaryLoaded
        ? 'The dictionary you loaded earlier is still in use: the refused file replaced nothing.'
        : 'No dictionary is loaded, so what you are reading is the original wording.',
      actions:context=>[
        {id:'choose-vocabulary-file',label:'Choose another file'},
        ...(context.dictionaryLoaded?[{id:'clear-vocabulary',label:'Remove the dictionary that is loaded'}]:[])
      ]
    },
    {
      id:'logo-rejected',
      surface:'logo-status',
      heading:'That image was not used as the mark',
      forbidden:['clear-storage','reset-settings'],
      note:context=>context.markLoaded
        ? 'The image you added earlier is still the mark: the refused file replaced nothing.'
        : 'No image is stored, so the shipped mark is what you are seeing.',
      actions:context=>[
        {id:'choose-logo-file',label:'Choose another image'},
        ...(context.markLoaded?[{id:'clear-logo',label:'Go back to the shipped mark'}]:[])
      ]
    },
    {
      id:'update-check-failed',
      surface:'update-status',
      heading:'The published version file could not be read',
      forbidden:['reload-the-page','clear-storage'],
      note:()=>'The page you are reading is unaffected. This check only asks this site for one small file; failing to read it means the check has no answer, not that anything here is wrong.',
      actions:()=>[
        {id:'check-again',label:'Check again now'},
        {id:'open-downloads',label:'Open the downloads page'}
      ]
    },
    {
      id:'page-unbuilt',
      surface:'update-status',
      heading:'This copy of the page was never built',
      forbidden:['reload-the-page'],
      note:()=>'The site build is what stamps a page with the commit it was made from, and this copy carries none. That is why the check button beside this is switched off.',
      actions:()=>[],
      /* The whole reason this route exists. Every other route ends in a button;
       * this one ends in a sentence, because there is genuinely nothing to press
       * and a retry control here would be a lie somebody could press all day. */
      noActionsReason:()=>'There is nothing to try again: with no build identity there is nothing to compare against the published one, and no button on this page can create one. A copy served straight out of the source directory is always in this state.'
    },
    {
      id:'school-cannot-arm',
      surface:'school-status',
      heading:'The restricted presentation could not be switched on',
      forbidden:['store-the-value-in-the-clear'],
      note:()=>'Nothing was changed and nothing was stored. This page keeps only a random salt and a digest of salt-and-value, and it has no digest to make here.',
      actions:context=>(context.secureAddress?[{id:'open-over-https',label:'Open this page over a secure connection'}]:[]),
      noActionsReason:context=>context.secureAddress===''&&context.openedFrom
        ? `This page was opened from ${context.openedFrom}, so there is no secure address of it for this page to send you to. Serving these files over https is what makes the switch available.`
        : 'There is no secure address of this page for this page to send you to. Serving these files over https is what makes the switch available.'
    },
    {
      id:'local-storage-refused',
      /* The one route that is not anchored to a control, and the exception is
       * declared rather than quietly taken: a write can be refused during any
       * setting on any page, so there is no single control it belongs beside.
       * It goes to the top of the page being read, immediately, which is the
       * nearest honest thing to "where it was discovered". */
      surface:'page',
      heading:'This browser refused to save that',
      forbidden:['reset-settings','clear-storage'],
      note:context=>`What this page is keeping here, in characters: the local history ${context.historyCharacters} across ${context.historyEntries} entr${context.historyEntries===1?'y':'ies'}, the image ${context.markCharacters}, the dictionary ${context.dictionaryCharacters}, the settings ${context.settingsCharacters}. The change you just made is still on screen and is not saved, so it will be gone when this page next loads.`,
      actions:context=>[
        ...(context.markCharacters>0&&context.hasLogoControls?[{id:'clear-logo',label:'Remove the image and free that space'}]:[]),
        ...(context.historyEntries>RECOVERY_HISTORY_KEEP?[{id:'prune-local-history',label:`Keep only the newest ${RECOVERY_HISTORY_KEEP} history entries`}]:[]),
        ...(context.hasHistoryDialog?[{id:'open-local-history',label:'Look at the local history first'}]:[])
      ],
      noActionsReason:()=>'Nothing this page stores here is large enough to be worth removing, so the space belongs to something else in this browser. Clearing this site\'s storage would free it and would take every setting on this page with it, which is why it is listed below rather than offered as a button.'
    },
    {
      id:'regex-invalid',
      surface:'regex-feedback',
      heading:'That pattern was not applied',
      forbidden:[],
      note:context=>`The field this builder is attached to (${context.target||'the search field'}) is unchanged, and whatever it was already filtering on is still what it filters on.`,
      actions:()=>[
        {id:'clear-the-pattern',label:'Empty the pattern'},
        {id:'search-plainly',label:'Search this field as plain text instead'}
      ]
    }
  ];

  /**
   * Failures this page can produce that are deliberately left without a route,
   * and why -- so an absence here is a decision somebody made rather than a gap
   * nobody noticed. Each of these already says the whole answer on its own line.
   */
  const FAILURES_WITHOUT_A_ROUTE=[
    {id:'export-run-found-nothing',why:'the report says there is nothing to export, and the way out is to select a record set, which is the control directly above it'},
    {id:'school-value-did-not-match',why:'the card already carries the recovery, permanently, in its own "Forgotten the value?" disclosure -- a second copy of it appearing on a wrong attempt would be this page nagging'},
    {id:'changelog-unavailable',why:'a page built without release history says so where the history would be, and no action on this page can produce one'}
  ];

  /** One route by id, or null. */
  function recoveryRoute(id){return FAILURE_ROUTES.find(route=>route.id===id)||null}

  /**
   * What to offer for one failure, given the facts the caller gathered.
   *
   * Pure: it reads no storage, touches no document and returns a plain
   * description, so every branch is decided by values a caller supplies. The
   * rendering below is the only impure half, and it decides nothing.
   */
  function recoveryFor(failure){
    const id=String(failure&&failure.id||'');
    const route=recoveryRoute(id);
    if(!route)return{ok:false,id,why:'no-route-declared'};
    const context=(failure&&failure.context)||{};
    const actions=(route.actions?route.actions(context):[]).filter(action=>Boolean(RECOVERY_ACTIONS[action.id]));
    const forbidden=(route.forbidden||[])
      .filter(key=>Object.prototype.hasOwnProperty.call(RECOVERY_FORBIDDEN,key))
      .map(key=>({id:key,cost:RECOVERY_FORBIDDEN[key]}));
    return{
      ok:true,
      id:route.id,
      surface:route.surface,
      heading:route.heading,
      /* Carried on the result rather than left in a map beside it. An earlier shape kept
       * the facts in a side map keyed by route id and had `renderRecovery` look them up
       * again, which meant a resolved route rendered directly -- without going through
       * `reportFailure` -- silently lost every link's address. Wired at one end and
       * consumed at neither, in miniature. */
      context,
      detail:String(failure&&failure.detail||'').trim(),
      note:route.note?String(route.note(context)||''):'',
      actions,
      forbidden,
      /* Only when there is nothing to press. A route that CAN be empty must
       * declare this, and the emptiness is then always explained rather than
       * being an inexplicably actionless box. */
      nothingToOffer:actions.length===0&&route.noActionsReason?String(route.noActionsReason(context)||''):''
    };
  }

  /**
   * Every action any route may name, and what it really does.
   *
   * A `link` carries a real address; an `action` carries a real function. Both
   * are capabilities this page already had before this feature existed, which is
   * the point: recovery routes people to what the page can do, and never invents
   * a capability to have something to offer.
   */
  const RECOVERY_ACTIONS={
    'choose-vocabulary-file':{kind:'action',run(){const input=el('vocabulary-file');if(!input)return false;input.value='';input.click();return true}},
    'clear-vocabulary':{kind:'action',run(){clearVocabulary();return true}},
    'choose-logo-file':{kind:'action',run(){const input=el('logo-file');if(!input)return false;input.value='';input.click();return true}},
    'clear-logo':{kind:'action',run(){clearLogo();return true}},
    'check-again':{kind:'action',run(){checkForUpdate({manual:true});return true}},
    'open-downloads':{kind:'link',href(){return `${BASE}downloads.html`}},
    'open-over-https':{kind:'link',href(context){return String(context&&context.secureAddress||'')}},
    'prune-local-history':{kind:'action',run(){pruneLocalHistory(RECOVERY_HISTORY_KEEP);return true}},
    'open-local-history':{kind:'action',run(){const dialog=el('history-dialog');if(!dialog||!dialog.showModal)return false;dialog.showModal();renderHistory(el('history-search')?.value||'');return true}},
    'clear-the-pattern':{kind:'action',run(){const field=el('regex-pattern');if(!field)return false;field.value='';previewRegex();field.focus?.();return true}},
    'search-plainly':{kind:'action',run(){return searchPlainlyInstead()}}
  };

  /**
   * The one address this page would send somebody to for a secure copy of
   * itself, or '' when there is not one.
   *
   * Pure, and deliberately narrow: only an `http:` page with a real host has a
   * secure twin worth naming. A `file:` load has no address to make secure, and
   * a page already on https did not get here.
   */
  function secureAddressOf(location){
    if(!location)return '';
    if(String(location.protocol||'')!=='http:')return '';
    const host=String(location.host||'');
    if(!host)return '';
    return `https://${host}${String(location.pathname||'/')}${String(location.search||'')}`;
  }

  /** Where a page was opened from, in words, for the case above that has no route. */
  function openedFromLabel(location){
    const protocol=String(location&&location.protocol||'');
    if(protocol==='file:')return 'a file on this computer';
    if(protocol==='http:')return 'an address with no host';
    return protocol?`a ${protocol.replace(':','')} address`:'';
  }

  /** How many characters one stored value occupies, or 0 when it is not there. */
  function localCharacters(key){
    try{const raw=localStorage.getItem(key);return raw?raw.length:0}
    catch{return 0}
  }

  /**
   * The facts the storage route needs. Characters rather than bytes, said in
   * those words on screen too: a string's length is not its size on disk, and
   * reporting it as bytes would be a measurement nobody took.
   */
  function storageFailureContext(){
    return{
      historyCharacters:localCharacters(HISTORY_KEY),
      historyEntries:historyEntries.length,
      markCharacters:localCharacters('ding-pbx-logo-cache'),
      dictionaryCharacters:localCharacters('ding-pbx-vocabulary-cache'),
      settingsCharacters:localCharacters(STORAGE_KEY),
      hasHistoryDialog:Boolean(el('history-dialog')),
      hasLogoControls:Boolean(el('logo-clear'))
    };
  }

  /**
   * Every write this page makes to local storage goes through here.
   *
   * `setItem` throws when the browser refuses the write -- a full quota is the
   * usual reason and a browser configured to refuse site storage altogether is
   * the other -- and until this existed that exception escaped through whichever
   * setter had just been used. The value stayed in memory and on screen, so the
   * setting looked saved; it was not, and the next load quietly had the old one
   * back with nothing anywhere saying why.
   */
  function writeLocal(key,value){
    try{localStorage.setItem(key,String(value));return{ok:true,reason:''}}
    catch(error){return{ok:false,reason:storageRefusalReason(error)}}
  }
  function storageRefusalReason(error){
    const name=String(error&&error.name||'');
    if(name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED')return 'this browser has no room left for this site';
    if(name==='SecurityError')return 'this browser is refusing to let this site store anything';
    return String(error&&error.message||'this browser refused the write');
  }
  /**
   * Report the outcome of one write, naming what it was.
   *
   * A refusal raises the route; a write that then succeeds takes the route down
   * again, because a recovery still sitting there for a problem that has gone is
   * worse than none -- it is a page insisting something is broken when it is not.
   */
  function reportWrite(what,result){
    if(result.ok){clearRecovery('page','local-storage-refused');return true}
    reportFailure('local-storage-refused',{detail:`${what} could not be saved: ${result.reason}.`,context:storageFailureContext()});
    return false;
  }

  /** Trim the local history to its newest `keep` entries, then save what is left. */
  function pruneLocalHistory(keep){
    const before=historyEntries.length;
    historyEntries=historyEntries.slice(0,Math.max(0,Number(keep)||0));
    saveHistory();
    renderHistory(el('history-search')?.value||'');
    return before-historyEntries.length;
  }

  /**
   * Turn a compiled pattern off for the field the builder is attached to and
   * leave the plain query in charge, which is the other real way out of an
   * invalid pattern.
   */
  function searchPlainlyInstead(){
    if(!regexTarget)return false;
    regexState.delete(regexTarget);
    const dialog=el('regex-dialog');
    if(dialog&&dialog.close)dialog.close();
    const field=el(regexTarget);
    if(field&&field.dispatchEvent)field.dispatchEvent(new Event('input'));
    renderModeStatus(regexTarget);
    return true;
  }

  /**
   * The element a route's region attaches to.
   *
   * `page` is the declared exception above and goes to the top of `main`.
   * Everything else resolves the status element it belongs beside and returns
   * null when that element is not on this page -- which is what keeps a route
   * from rendering somewhere it does not belong. A failure whose surface is not
   * here is a failure this page cannot show the way out of, and it says nothing
   * rather than putting the region in the wrong place.
   */
  function recoveryHost(surface){
    if(surface==='page'){const main=document.querySelector('main');return main?{parent:main,after:null}:null}
    const anchor=el(surface);
    if(!anchor||!anchor.parentNode)return null;
    return{parent:anchor.parentNode,after:anchor};
  }

  /**
   * Build the region.
   *
   * `textContent` throughout and never a markup string, exactly as the update
   * banner is built: several of these values are somebody's file quoted back,
   * and this way there is no template for the next person to add an unescaped
   * one to.
   */
  function renderRecovery(resolved){
    if(!resolved||!resolved.ok)return false;
    const host=recoveryHost(resolved.surface);
    if(!host)return false;
    const regionId=`${resolved.surface}-recovery`;
    let region=el(regionId);
    if(!region){
      region=document.createElement('section');
      region.id=regionId;
      region.className='recovery';
      region.setAttribute('role','group');
      /* Announced when it appears. The failure line above it is already a
       * `role="status"`, so without this a listener would hear that something
       * failed and never hear that there is a way out of it. */
      region.setAttribute('aria-live','polite');
      region.setAttribute('aria-labelledby',`${regionId}-heading`);
      if(host.after)host.parent.insertBefore(region,host.after.nextSibling);
      else host.parent.prepend(region);
    }
    region.dataset.recoveryFor=resolved.id;
    region.replaceChildren();

    const heading=document.createElement('h3');
    heading.id=`${regionId}-heading`;
    heading.className='recovery-heading';
    heading.textContent=resolved.heading;
    region.append(heading);

    if(resolved.detail){
      const detail=document.createElement('p');
      detail.className='recovery-detail';
      detail.textContent=resolved.detail;
      region.append(detail);
    }

    /* Voice, and only voice. Every fact in this region is in a sibling of this
     * line, so both funny sliders can restyle it without a single figure,
     * reason or consequence moving. */
    const lead=document.createElement('p');
    lead.className='recovery-lead';
    lead.dataset.copy='recoveryLead';
    lead.textContent=copyText('recoveryLead');
    region.append(lead);

    if(resolved.note){
      const note=document.createElement('p');
      note.className='recovery-note';
      note.textContent=resolved.note;
      region.append(note);
    }

    if(resolved.actions.length){
      const actions=document.createElement('div');
      actions.className='recovery-actions';
      for(const action of resolved.actions){
        const implementation=RECOVERY_ACTIONS[action.id];
        if(!implementation)continue;
        if(implementation.kind==='link'){
          const href=implementation.href(resolved.context||{});
          if(!href)continue;
          const link=document.createElement('a');
          link.className='text-button';
          link.dataset.recoveryAction=action.id;
          link.href=href;
          link.textContent=action.label;
          actions.append(link);
          continue;
        }
        const button=document.createElement('button');
        button.type='button';
        button.className='text-button';
        button.dataset.recoveryAction=action.id;
        button.textContent=action.label;
        button.addEventListener('click',()=>{implementation.run()});
        actions.append(button);
      }
      region.append(actions);
    }else if(resolved.nothingToOffer){
      const nothing=document.createElement('p');
      nothing.className='recovery-nothing';
      nothing.textContent=resolved.nothingToOffer;
      region.append(nothing);
    }

    if(resolved.forbidden.length){
      const label=document.createElement('p');
      label.className='recovery-forbidden-label';
      label.textContent='Not this, whatever else you try:';
      const list=document.createElement('ul');
      list.className='recovery-forbidden';
      for(const item of resolved.forbidden){
        const entry=document.createElement('li');
        entry.dataset.recoveryForbidden=item.id;
        entry.textContent=item.cost;
        list.append(entry);
      }
      region.append(label,list);
    }

    applyVocabularyToNode(region);
    return true;
  }

  /**
   * Raise the route for one failure. Returns what `recoveryFor` decided, so a
   * caller can tell a routed failure from one nobody has written a route for.
   */
  function reportFailure(id,failure){
    const resolved=recoveryFor({id,detail:failure&&failure.detail,context:(failure&&failure.context)||{}});
    if(!resolved.ok)return resolved;
    renderRecovery(resolved);
    return resolved;
  }

  /**
   * Take a route down again once the thing it was about has gone.
   *
   * `onlyRouteId` matters: two routes share the update card's status line, and
   * clearing whichever one happens to be showing would let a successful check
   * remove a completely different unresolved failure's way out.
   */
  function clearRecovery(surface,onlyRouteId){
    const region=el(`${surface}-recovery`);
    if(!region)return false;
    if(onlyRouteId&&region.dataset.recoveryFor!==onlyRouteId)return false;
    if(region.parentNode)region.parentNode.removeChild(region);
    return true;
  }

  /**
   * The one caller that has to look at where this page was opened from, kept
   * here rather than in the restricted-presentation block so the two pure
   * address functions above have exactly one reader.
   */
  function reportSchoolCannotArm(detail){
    const here=typeof location==='undefined'?null:location;
    return reportFailure('school-cannot-arm',{
      detail,
      context:{secureAddress:secureAddressOf(here),openedFrom:openedFromLabel(here)}
    });
  }

  // ============================================================================
  // Restricted presentation -- shipped as "School mode", renameable by whoever
  // switches it on.
  //
  // What it does is small; the boundaries around it are the whole feature.
  //
  //   - While it is on this page presents itself in plain English, and the
  //     capabilities the canon names -- the Cantonese and bilingual choices, both
  //     funny levels, the personal-vocabulary upload, the narrated-language choice
  //     and the Cantonese voice picker -- are REMOVED from the document rather
  //     than disabled or visually hidden. A disabled control is still a control
  //     somebody can see and ask about; the point of this mode is that the
  //     capability is not there.
  //   - Nothing is destroyed. Every removed node is retained in `schoolRetained`
  //     with a bare comment standing in its place, and goes back exactly where it
  //     was when the mode is turned off. The settings behind those controls are
  //     never written while it is on, so a chosen language, a chosen funny level
  //     and an uploaded vocabulary all survive the whole time and return.
  //   - Turning it OFF needs the value chosen when it was turned on. That value is
  //     never stored: what is stored is a random salt and the SHA-256 digest of
  //     salt-and-value, so the record on disk cannot be read back into the value.
  //   - It is a speed bump somebody sets for themselves, and the card says so in
  //     those words. It protects nothing from anybody else with this computer, and
  //     clearing this site's storage turns it off without the value. That is the
  //     documented recovery rather than a hole: a toy lock with no way out is a
  //     page somebody has permanently lost.
  //   - There is deliberately NO attempt lockout and no waiting period, so this
  //     page can never lock anybody out on a clock -- which is why it ships no
  //     unlock ladder, there being no wait for one to shorten. Wrong attempts are
  //     counted on screen and recorded in the local history instead.
  //
  // Two rules about the NAME, and the second is the one that is easy to get wrong.
  // Live copy always renders the chosen name. Persisted text -- a local history
  // entry, a stored notification -- never names the mode at all, because the
  // history here is append-only and a rename cannot rewrite it: an entry written
  // before a rename would sit in the record still naming the previous name, which
  // for the first rename is exactly the shipped name this mode exists to stop
  // showing.
  //
  // "Reset settings" deliberately does not reach this record, and neither does
  // restoring a local-history revision: both write `state`, and this lives in its
  // own storage key beside the history's. A reset button that turned the mode off
  // would be a way around the lock rather than a reset.
  const SCHOOL_KEY='ding-pbx-pages-school-v1';
  const SCHOOL_SHIPPED_NAME='School mode';
  const SCHOOL_NAME_MAX=60;
  const SCHOOL_SECRET_MIN=4;
  const SCHOOL_SECRET_MAX=128;
  const SCHOOL_DIGEST='SHA-256';
  /**
   * Every capability this mode removes, by the container that owns it.
   *
   * One entry per container rather than one per control, because a label left
   * behind by a control that went away is a worse surface than either state.
   */
  const SCHOOL_SUPPRESSED=[
    {id:'language-and-funny-levels',selector:'#settings-language-card',what:'the language mode and both funny levels'},
    {id:'personal-vocabulary',selector:'#settings-vocabulary-card',what:'the personal-vocabulary upload'},
    {id:'narrated-language',selector:'#narration-language-controls',what:'the narrated-language choice'},
    {id:'narrated-cantonese-voice',selector:'#narration-cantonese-controls',what:'the Cantonese voice picker'}
  ];
  /**
   * Capabilities the canon says this mode must suppress that this site has not got
   * at all, named here so the absence is a recorded decision rather than a gap.
   *
   * The per-launch startup surprise is the one: it does not exist on this site, so
   * there is nothing here to remove. The contract test re-derives that absence from
   * the real source every run, so the day somebody builds one, this list stops being
   * true and the test says so rather than the mode quietly failing to hide it.
   */
  const SCHOOL_ABSENT_HERE=['startup-surprise'];

  function schoolDefaultRecord(){return{on:false,name:'',secret:null}}
  /**
   * Read the record, refusing anything malformed rather than half-trusting it.
   *
   * A corrupt record falls back to OFF rather than to a locked page nobody can
   * open. That is not a bypass dressed as a fallback: clearing this site's storage
   * is the documented recovery already, and corrupting the record is the same act
   * with more steps.
   */
  function loadSchool(){
    try{
      const raw=JSON.parse(localStorage.getItem(SCHOOL_KEY)||'null');
      if(!raw||typeof raw!=='object')return schoolDefaultRecord();
      const secret=raw.secret&&typeof raw.secret==='object'
        &&typeof raw.secret.saltHex==='string'&&raw.secret.saltHex.length>0
        &&typeof raw.secret.digestHex==='string'&&raw.secret.digestHex.length>0
        ?{algorithm:String(raw.secret.algorithm||SCHOOL_DIGEST),saltHex:raw.secret.saltHex,digestHex:raw.secret.digestHex}
        :null;
      return{on:Boolean(raw.on),name:String(raw.name||'').slice(0,SCHOOL_NAME_MAX),secret};
    }catch{return schoolDefaultRecord()}
  }
  let schoolRecord=loadSchool();
  function saveSchool(){return reportWrite('the restricted-presentation record',writeLocal(SCHOOL_KEY,JSON.stringify(schoolRecord)))}
  function reloadSchool(){schoolRecord=loadSchool()}
  /**
   * On AND holding a credential. A record that says on without one would be a page
   * with no way back, so it is treated as off rather than honoured.
   */
  function schoolActive(){return Boolean(schoolRecord.on&&schoolRecord.secret)}
  function schoolName(){const chosen=String(schoolRecord.name||'').trim();return chosen||SCHOOL_SHIPPED_NAME}
  function schoolIsRenamed(){return schoolName()!==SCHOOL_SHIPPED_NAME}
  /** Keywords the settings search matches this card on -- the chosen name, never the shipped one. */
  function schoolSearchKeywords(){return `${schoolName()} restricted plain english only lock`.toLowerCase()}
  /** The language every surface renders in, which this mode overrides and nothing else does. */
  function effectiveLanguage(){return schoolActive()?'en':state.language}

  function schoolCryptoApi(){
    const api=typeof crypto==='undefined'?null:crypto;
    if(!api||typeof api.getRandomValues!=='function')return null;
    if(!api.subtle||typeof api.subtle.digest!=='function')return null;
    return api;
  }
  function schoolHex(bytes){return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
  function schoolSalt(){
    const api=schoolCryptoApi();
    if(!api)return '';
    return schoolHex(api.getRandomValues(new Uint8Array(16)));
  }
  /**
   * The digest of one value under one salt, or null when this browser gives the page
   * no cryptographic digest at all -- an insecure context such as a `file://` load.
   *
   * Null fails the mode closed: it cannot be armed, and the card says why. The
   * alternative would be storing the value itself under a weaker name, which is the
   * one thing a credential store must never do.
   */
  async function schoolDigestOf(secret,saltHex){
    const api=schoolCryptoApi();
    if(!api||!saltHex)return null;
    const data=new TextEncoder().encode(`${saltHex}:${String(secret)}`);
    return schoolHex(new Uint8Array(await api.subtle.digest(SCHOOL_DIGEST,data)));
  }
  /**
   * Whether one offered digest opens one stored credential, and why when it does not.
   *
   * Pure, and compares every character rather than stopping at the first difference,
   * so the time it takes says nothing about how much of the value was right.
   */
  function schoolUnlockVerdict(stored,digestHex){
    if(!stored||typeof stored.digestHex!=='string'||!stored.digestHex)return{unlock:false,why:'no-credential'};
    if(typeof digestHex!=='string'||!digestHex)return{unlock:false,why:'no-digest'};
    if(digestHex.length!==stored.digestHex.length)return{unlock:false,why:'wrong-value'};
    let difference=0;
    for(let index=0;index<digestHex.length;index+=1){
      difference|=digestHex.charCodeAt(index)^stored.digestHex.charCodeAt(index);
    }
    return difference===0?{unlock:true,why:'match'}:{unlock:false,why:'wrong-value'};
  }
  /** Whether the mode can be armed from what is currently typed, and why not. Pure. */
  function schoolArmVerdict(input){
    if(input&&input.alreadyOn)return{arm:false,why:'already-on'};
    if(!input||!input.hasDigest)return{arm:false,why:'no-digest-available'};
    const secret=String(input.secret||'');
    if(secret.length<SCHOOL_SECRET_MIN)return{arm:false,why:'too-short'};
    if(secret.length>SCHOOL_SECRET_MAX)return{arm:false,why:'too-long'};
    if(secret!==String(input.confirm||''))return{arm:false,why:'mismatch'};
    return{arm:true,why:'ready'};
  }
  const SCHOOL_ARM_REASON={
    'already-on':'It is already on, so there is nothing to turn on.',
    'no-digest-available':`This browser gives this page no cryptographic digest here, which happens when the page is not served over a secure connection. Without one the value could only be kept in the clear, so it cannot be turned on at all rather than being turned on with a value stored as itself.`,
    'too-short':`Choose at least ${SCHOOL_SECRET_MIN} characters.`,
    'too-long':`Choose at most ${SCHOOL_SECRET_MAX} characters.`,
    mismatch:'The two values are not the same. Nothing was changed.'
  };

  /* Removed nodes, held by their entry id, each with the empty comment standing in
   * its place in the document. Held rather than rebuilt, so the handlers bound to
   * them at load are still bound when they come back. */
  const schoolRetained=new Map();
  function schoolSuppress(entry){
    if(schoolRetained.has(entry.id))return;
    const node=document.querySelector(entry.selector);
    if(!node||!node.parentNode)return;
    /* An empty comment: it is not a control, it is not read by anything, and it says
     * nothing about what used to be here -- which matters, because the name of this
     * mode is exactly what it must not leave lying in the document. */
    const marker=document.createComment('');
    node.parentNode.replaceChild(marker,node);
    schoolRetained.set(entry.id,{node,marker});
  }
  function schoolRestore(entry){
    const held=schoolRetained.get(entry.id);
    if(!held)return;
    schoolRetained.delete(entry.id);
    if(held.marker.parentNode)held.marker.parentNode.replaceChild(held.node,held.marker);
  }
  /**
   * An element by id, whether it is in the document or currently held out of it.
   *
   * Every handler on a suppressible control is bound once, through this, so the
   * control works when it comes back instead of returning as a dead one.
   */
  function el(id){
    const live=document.getElementById(id);
    if(live)return live;
    for(const held of schoolRetained.values()){
      if(held.node.id===id)return held.node;
      const found=typeof held.node.querySelector==='function'?held.node.querySelector(`[id="${id}"]`):null;
      if(found)return found;
    }
    return null;
  }

  let schoolWrongAttempts=0;
  function schoolSuppressionSentence(){
    const list=SCHOOL_SUPPRESSED.map(entry=>entry.what).join('; ');
    return schoolActive()
      ? `Removed from this page right now: ${list}. Your choices behind them are still stored and come back when it is turned off.`
      : `Turning it on removes these from this page: ${list}. Your choices behind them stay stored.`;
  }
  function schoolRecoverySentence(){
    return `Nothing here can give the value back to you: it is not stored, only a random salt and the ${SCHOOL_DIGEST} digest of salt-and-value, and this page cannot reverse that. Clearing this site's storage in your browser removes ${SCHOOL_KEY} along with every other local setting this page keeps, and the switch goes with it. There is no waiting period and no attempt limit here, so this page can never lock you out on a clock.`;
  }
  function renderSchoolCard(){
    const card=$('school-card');
    if(!card)return;
    const on=schoolActive();
    const name=schoolName();
    card.dataset.search=schoolSearchKeywords();
    const title=$('school-title');
    if(title)title.textContent=name;
    const nameField=$('school-name');
    if(nameField&&document.activeElement!==nameField)nameField.value=schoolRecord.name||'';
    const armControls=$('school-arm-controls');
    if(armControls)armControls.hidden=on;
    const unlockControls=$('school-unlock-controls');
    if(unlockControls)unlockControls.hidden=!on;
    const suppressed=$('school-suppressed');
    if(suppressed)suppressed.textContent=schoolSuppressionSentence();
    const recovery=$('school-recovery-text');
    if(recovery)recovery.textContent=schoolRecoverySentence();
    const status=$('school-status');
    if(!status)return;
    if(on){
      status.textContent=schoolWrongAttempts>0
        ? `${name} is still on: that value did not match, and nothing was changed. Values tried since this page loaded: ${schoolWrongAttempts}.`
        : `${name} is on. This page is in plain English, and the settings listed below are not on it.`;
      return;
    }
    if(!schoolCryptoApi()){
      status.textContent=`${name} is off, and cannot be turned on here. ${SCHOOL_ARM_REASON['no-digest-available']}`;
      return;
    }
    status.textContent=`${name} is off. Every setting on this page is available.`;
  }
  /**
   * Applied on every state change, so the mode is watched rather than read once at
   * load: a second tab turning it on reaches this through the `storage` event below.
   */
  function applySchoolMode(){
    const on=schoolActive();
    for(const entry of SCHOOL_SUPPRESSED){
      if(on)schoolSuppress(entry);
      else schoolRestore(entry);
    }
    /* Forced here rather than in applyLanguage(), which returns early on every page
     * that has no language preview line -- which is every page but this one, and this
     * one too while the card holding that line is removed. */
    if(on)document.documentElement.lang='en';
    document.body.classList.toggle('school-on',on);
    renderSchoolCard();
  }
  /** What the redacted settings export says about this mode. Never the credential. */
  function schoolExportSummary(){
    return{on:schoolActive(),renamed:schoolIsRenamed(),name:schoolName(),credential:'omitted',storedSeparatelyIn:SCHOOL_KEY};
  }
  function setSchoolName(raw){
    schoolRecord={...schoolRecord,name:String(raw||'').slice(0,SCHOOL_NAME_MAX)};
    saveSchool();
    applyState();
  }
  function commitSchoolName(){
    /* No name in the entry or the notification: both are kept, and a later rename
     * cannot rewrite either, so a name written here would outlive the rename that
     * replaced it. */
    recordHistory('presentation-mode','The restricted presentation on this page was renamed.');
    notify('Page presentation','The restricted presentation on this page has a new name in your browser.',{category:'setting',en:'The restricted presentation on this page was renamed.'});
  }
  async function armSchoolMode(){
    const secretField=$('school-secret');
    const confirmField=$('school-secret-confirm');
    const status=$('school-status');
    const secret=secretField?secretField.value:'';
    const verdict=schoolArmVerdict({alreadyOn:schoolActive(),hasDigest:Boolean(schoolCryptoApi()),secret,confirm:confirmField?confirmField.value:''});
    if(!verdict.arm){
      if(status)status.textContent=`${schoolName()} was not turned on. ${SCHOOL_ARM_REASON[verdict.why]||'That value cannot be used.'}`;
      /* Only the one refusal somebody cannot act on by reading it. A value too
       * short, a confirmation that does not match or a mode already on each say
       * the whole answer in the line above; this one says the browser will not
       * give this page a digest, which is true and is not a thing anybody can do
       * anything about from where they are standing. */
      if(verdict.why==='no-digest-available')reportSchoolCannotArm(SCHOOL_ARM_REASON[verdict.why]);
      return verdict;
    }
    const saltHex=schoolSalt();
    const digestHex=await schoolDigestOf(secret,saltHex);
    if(!digestHex){
      if(status)status.textContent=`${schoolName()} was not turned on. ${SCHOOL_ARM_REASON['no-digest-available']}`;
      reportSchoolCannotArm(SCHOOL_ARM_REASON['no-digest-available']);
      return{arm:false,why:'no-digest-available'};
    }
    schoolRecord={...schoolRecord,on:true,secret:{algorithm:SCHOOL_DIGEST,saltHex,digestHex}};
    clearRecovery('school-status','school-cannot-arm');
    saveSchool();
    /* Cleared the moment the digest exists, so the value is not sitting in a field
     * behind a locked page waiting for the next person to read it. */
    if(secretField)secretField.value='';
    if(confirmField)confirmField.value='';
    schoolWrongAttempts=0;
    applyState();
    recordHistory('presentation-mode','The restricted presentation on this page was turned on.');
    notify('Page presentation','This page is in plain English until the restricted presentation is turned off again.',{category:'setting',en:'The restricted presentation on this page was turned on.'});
    return verdict;
  }
  async function unlockSchoolMode(){
    const field=$('school-unlock');
    const status=$('school-status');
    if(!schoolActive())return{unlock:false,why:'not-on'};
    const offered=field?field.value:'';
    const digestHex=await schoolDigestOf(offered,schoolRecord.secret.saltHex);
    const verdict=schoolUnlockVerdict(schoolRecord.secret,digestHex);
    if(!verdict.unlock){
      schoolWrongAttempts+=1;
      if(field)field.value='';
      renderSchoolCard();
      if(status&&verdict.why==='no-digest')status.textContent=`${schoolName()} is still on. ${SCHOOL_ARM_REASON['no-digest-available']}`;
      recordHistory('presentation-mode','A value that does not match was offered to the restricted presentation on this page; nothing changed.');
      return verdict;
    }
    /* The credential goes with the mode. Keeping it would leave a digest of somebody's
     * value on disk for a lock that is no longer there. */
    schoolRecord={...schoolRecord,on:false,secret:null};
    saveSchool();
    if(field)field.value='';
    schoolWrongAttempts=0;
    applyState();
    recordHistory('presentation-mode','The restricted presentation on this page was turned off.');
    notify('Page presentation','Every setting on this page is available again.',{category:'setting',en:'The restricted presentation on this page was turned off.'});
    return verdict;
  }
  function initSchool(){
    const card=$('school-card');
    if(!card)return;
    const nameField=$('school-name');
    if(nameField){
      nameField.value=schoolRecord.name||'';
      nameField.oninput=event=>setSchoolName(event.target.value);
      nameField.onchange=commitSchoolName;
    }
    const arm=$('school-arm');
    if(arm)arm.onclick=()=>{armSchoolMode()};
    const unlock=$('school-unlock-submit');
    if(unlock)unlock.onclick=()=>{unlockSchoolMode()};
    renderSchoolCard();
  }
  /**
   * A second tab is a second surface, and this mode is one switch across all of them.
   * `storage` fires in every OTHER tab of this origin, so turning it on in one turns
   * it on in the rest live rather than at their next load. A null key is the whole
   * store being cleared, which is the documented recovery happening elsewhere.
   */
  function initSchoolWatch(){
    if(typeof window==='undefined'||typeof window.addEventListener!=='function')return;
    window.addEventListener('storage',event=>{
      if(event&&event.key!==null&&event.key!==SCHOOL_KEY)return;
      reloadSchool();
      schoolWrongAttempts=0;
      applyState();
    });
  }

  // ============================================================================
  // Support Tickets.
  //
  // The recovery route out of the one thing this page can genuinely lock somebody
  // out of -- the restricted presentation above -- dressed as a service desk. The
  // bit is the point, and so is the boundary around it:
  //
  //   - It never deletes anything. The desktop version opens the application-data
  //     folder and stands back; a page cannot open a folder, so this one NAMES the
  //     exact storage keys and origin, offers them to the clipboard, and says in
  //     plain words that clearing them is the reader's own act. Nothing here calls
  //     removeItem, and nothing here needs the destructive-action gate, because
  //     nothing here destroys.
  //   - SUPPORT_DISCLOSURE is a plain constant and never a COPY key. Every other
  //     string on this surface moves with the funny sliders; a disclosure a funny
  //     level could rewrite would be decoration rather than a disclosure, and this
  //     is the one line standing between a joke and somebody waiting for a reply
  //     that was never coming.
  //   - The restricted presentation must NOT remove it. It is the way out, and a
  //     mode that hid its own recovery route would be a lock rather than a speed
  //     bump. It is absent from SCHOOL_SUPPRESSED on purpose; copyText() already
  //     renders it in plain English while the mode is on, so it goes quiet without
  //     going away.
  // ============================================================================
  const SUPPORT_KEY='ding-pbx-pages-support-v1';
  const SUPPORT_LIMIT=200;
  const SUPPORT_DESCRIPTION_MAX=2000;
  /* One exact sentence, rendered verbatim wherever the desk appears. Not a COPY
   * key, not vocabulary-substituted, not styled by any level. */
  const SUPPORT_DISCLOSURE='Nothing here is sent anywhere. No ticket exists outside this browser, no network request is made, no data is collected, and nobody is reading it. This desk is part of the page you are already on, and no one is coming.';
  const SUPPORT_CATEGORIES=[
    {id:'restricted-presentation',label:'I cannot turn the restricted presentation off'},
    {id:'setting',label:'A setting on this page is not doing what it says'},
    {id:'appearance',label:'Something on this page is unreadable, clipped or the wrong size'},
    {id:'other',label:'Something else'}
  ];
  const SUPPORT_SEVERITIES=[
    {id:'low',label:'Low'},
    {id:'normal',label:'Normal'},
    {id:'high',label:'High'},
    {id:'critical',label:'Critical — everything is on fire'}
  ];
  /* Said beside the control rather than left implied: a severity that quietly
   * changed nothing would be the decorative-control defect these pages refuse
   * everywhere else. */
  const SUPPORT_SEVERITY_NOTE='Severity is recorded exactly as you set it and changes nothing whatsoever. There is no queue for it to move you up, because there is no queue.';
  const SUPPORT_STATUSES=['received','triaged','escalated','resolved'];
  const SUPPORT_STATUS_LABEL={
    received:'Received',
    triaged:'Triaged',
    escalated:'Escalated to the resolution team',
    resolved:'Resolved'
  };
  const SUPPORT_STATUS_NOTE={
    received:'Recorded in this browser.',
    triaged:'Reviewed by the same function that recorded it.',
    escalated:'Escalated to the resolution team, which is this paragraph.',
    resolved:'Resolved. The resolution is below, and it is the one that was available before you wrote in.'
  };

  /**
   * Every storage key this page writes, derived from the constants themselves.
   *
   * The recovery panel is the one place a locked-out reader is told what to clear,
   * so a hand-copied list here would be wrong the day an eighth key is added and
   * nothing would say so. `tests/contracts/support-tickets.test.mjs` re-derives the
   * set from every storage call in this file -- both the direct `localStorage.*` ones
   * and every key handed to the guarded `writeLocal` -- and refuses a mismatch.
   *
   * AUTH_KEY was the first key this list did not know about, and it is worth recording
   * why rather than just adding it: the ticket desk and the built-in authenticator were
   * built on the same day on separate branches, so neither could see the other, and the
   * omission arrived at the merge with nothing in either branch's own suite objecting.
   * The reader it would have failed is the exact one this panel exists for -- somebody
   * told what to clear, clearing it, and finding their authenticator accounts still
   * there afterwards with no explanation of why that key was left out.
   */
  function supportStorageKeys(){
    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];
  }
  function supportOrigin(){
    try{return String(location.origin||'')}catch{return ''}
  }
  function supportDefaultStore(){return{schemaVersion:1,sequence:0,tickets:[]}}
  function loadSupport(){
    try{
      const raw=JSON.parse(localStorage.getItem(SUPPORT_KEY)||'null');
      if(!raw||typeof raw!=='object'||!Array.isArray(raw.tickets))return supportDefaultStore();
      const tickets=raw.tickets.filter(item=>item&&typeof item==='object'&&typeof item.id==='string'&&SUPPORT_STATUSES.includes(item.status)).slice(0,SUPPORT_LIMIT);
      const sequence=Number.isInteger(raw.sequence)&&raw.sequence>=0?raw.sequence:tickets.length;
      return{schemaVersion:1,sequence,tickets};
    }catch{return supportDefaultStore()}
  }
  let supportStore=loadSupport();
  let supportSelection={anchor:undefined,selected:new Set()};
  let lastSupportOrder=[];
  /*
   * Through `writeLocal`, the one writer every store on this page goes through, so a
   * browser refusing the write is reported to the reader rather than thrown past.
   *
   * It matters more here than on any other store. This desk is the recorded route back
   * out of a lock somebody has already forgotten the value for, and the thing they would
   * be told to do about a full browser is to clear this site's storage -- which is also
   * the thing that would take the ticket with it. A ticket that silently failed to save
   * is a route that is not there at the one moment it is needed, and the reader would
   * have no way of knowing until they came back and found nothing.
   */
  function saveSupport(){
    return reportWrite('the support ticket',writeLocal(SUPPORT_KEY,JSON.stringify({...supportStore,tickets:supportStore.tickets.slice(0,SUPPORT_LIMIT)})));
  }
  /** `DING-20260826-0001`. Derived from the store's own counter, so it never repeats. */
  function supportTicketNumber(sequence,now){
    const when=new Date(now);
    const stamp=Number.isFinite(when.getTime())
      ?`${when.getUTCFullYear()}${String(when.getUTCMonth()+1).padStart(2,'0')}${String(when.getUTCDate()).padStart(2,'0')}`
      :'00000000';
    return `DING-${stamp}-${String(sequence).padStart(4,'0')}`;
  }
  function supportCategoryLabel(id){const found=SUPPORT_CATEGORIES.find(item=>item.id===id);return found?found.label:id}
  function supportSeverityLabel(id){const found=SUPPORT_SEVERITIES.find(item=>item.id===id);return found?found.label:id}
  /**
   * What is wrong with this form, in words that say what to do next.
   *
   * A bare red border tells somebody that something is wrong and nothing about
   * which thing or what would fix it, which is the guided-forms defect this page
   * refuses everywhere else.
   */
  function supportFormVerdict(form){
    const description=String((form&&form.description)||'').trim();
    if(!SUPPORT_CATEGORIES.some(item=>item.id===(form&&form.category))){
      return{ok:false,field:'support-category',reason:'Choose one of the categories in the list above. Nothing was recorded.'};
    }
    if(!SUPPORT_SEVERITIES.some(item=>item.id===(form&&form.severity))){
      return{ok:false,field:'support-severity',reason:'Choose one of the four severities. Nothing was recorded.'};
    }
    if(description===''){
      return{ok:false,field:'support-description',reason:'Say what happened, in as few or as many words as you like. This box cannot be empty, and nothing was recorded.'};
    }
    if(description.length>SUPPORT_DESCRIPTION_MAX){
      return{ok:false,field:'support-description',reason:`That is ${description.length} characters and the limit is ${SUPPORT_DESCRIPTION_MAX}. Nothing was recorded — shorten it and try again.`};
    }
    return{ok:true,description};
  }
  function openSupportTicket(form,now=Date.now()){
    const verdict=supportFormVerdict(form);
    if(!verdict.ok)return verdict;
    const sequence=supportStore.sequence+1;
    const ticket={
      id:`t${now}-${sequence}`,
      number:supportTicketNumber(sequence,now),
      category:form.category,
      severity:form.severity,
      description:verdict.description,
      openedAt:now,
      status:'received',
      updates:[{status:'received',at:now,note:copyText('supportFirstResponse')}]
    };
    supportStore={schemaVersion:1,sequence,tickets:[ticket,...supportStore.tickets].slice(0,SUPPORT_LIMIT)};
    saveSupport();
    recordHistory('support-ticket-opened',`Support ticket ${ticket.number} was opened in this browser.`);
    notify('Ticket opened',applyVocabularyText(`${ticket.number} was written to this browser and nowhere else.`),{
      category:'setting',
      en:`Ticket ${ticket.number} was written to this browser and nowhere else.`,
      zh:`張飛 ${ticket.number} 淨係寫入咗呢個瀏覽器，冇送去任何地方。`
    });
    return{ok:true,ticket};
  }
  /** One step along SUPPORT_STATUSES. Never a timer -- a status only moves when asked. */
  function advanceSupportTicket(id,now=Date.now()){
    const ticket=supportStore.tickets.find(item=>item.id===id);
    if(!ticket)return{ok:false,reason:'That ticket is not in this browser.'};
    const index=SUPPORT_STATUSES.indexOf(ticket.status);
    if(index===SUPPORT_STATUSES.length-1)return{ok:false,reason:'That ticket is already resolved.'};
    const next=SUPPORT_STATUSES[index+1];
    ticket.status=next;
    ticket.updates=[...ticket.updates,{status:next,at:now,note:SUPPORT_STATUS_NOTE[next]}];
    saveSupport();
    recordHistory('support-ticket-advanced',`Support ticket ${ticket.number} moved to ${SUPPORT_STATUS_LABEL[next]}.`);
    return{ok:true,ticket};
  }
  /**
   * Back to the start, appending rather than rewriting.
   *
   * Closing a ticket is reversible precisely so that it is not a destructive
   * action, which is why the bulk close below needs no two-key gate. The history
   * of statuses is kept in full; nothing is ever removed from `updates`.
   */
  function reopenSupportTicket(id,now=Date.now()){
    const ticket=supportStore.tickets.find(item=>item.id===id);
    if(!ticket)return{ok:false,reason:'That ticket is not in this browser.'};
    if(ticket.status==='received')return{ok:false,reason:'That ticket is already open.'};
    ticket.status='received';
    ticket.updates=[...ticket.updates,{status:'received',at:now,note:'Reopened. Nothing was deleted; every earlier update is still listed.'}];
    saveSupport();
    recordHistory('support-ticket-reopened',`Support ticket ${ticket.number} was reopened.`);
    return{ok:true,ticket};
  }
  /**
   * The resolution: what to clear, where, and the plain statement that this page
   * will not do it for you.
   */
  function supportResolution(){
    const origin=supportOrigin();
    return{
      deletesAnything:false,
      origin:origin||'this page’s own origin, which this browser did not report',
      keys:supportStorageKeys(),
      steps:[
        'Open your browser’s settings for site data, storage, or cookies.',
        `Find the entry for ${origin||'this site'}.`,
        'Clear its storage for this site.',
        'Come back and reload this page.'
      ],
      note:'This page does not clear anything for you, and there is no button here that will. Clearing site storage removes every key listed above — including this ticket and every other one, which is either a design flaw or the funniest part of this desk, depending on where you have set the funny level.'
    };
  }
  function supportTicketText(ticket){
    return `${ticket.number} ${supportCategoryLabel(ticket.category)} ${supportSeverityLabel(ticket.severity)} ${SUPPORT_STATUS_LABEL[ticket.status]} ${ticket.description}`;
  }
  function supportMatches(query){
    return supportStore.tickets.filter(ticket=>matchText(supportTicketText(ticket),query,'support-search'));
  }
  function supportExportRows(){
    return supportStore.tickets.filter(ticket=>supportSelection.selected.has(ticket.id)).map(ticket=>({
      number:ticket.number,
      category:supportCategoryLabel(ticket.category),
      severity:supportSeverityLabel(ticket.severity),
      status:SUPPORT_STATUS_LABEL[ticket.status],
      opened:new Date(ticket.openedAt).toISOString(),
      updates:ticket.updates.length,
      description:ticket.description
    }));
  }
  function updateSupportSelectionUI(){
    const status=$('support-selection-status');
    if(status)status.textContent=`${supportSelection.selected.size} selected of ${lastSupportOrder.length} shown`;
    all('#support-list .support-ticket').forEach(row=>{
      const checkbox=row.querySelector('input[type="checkbox"]');
      if(checkbox)checkbox.checked=supportSelection.selected.has(row.dataset.ticketId);
    });
  }
  function updateSupportExportFormats(){
    const select=$('support-export-format');
    if(!select)return;
    const rows=supportExportRows();
    const formats=suitableFormats(rows.length?rows:[{number:'',category:'',severity:'',status:'',opened:'',updates:0,description:''}]);
    const previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    if(formats.includes(previous))select.value=previous;
    if($('support-export-loss')){
      $('support-export-loss').textContent=rows.length
        ?describeLoss(rows,select.value||formats[0]).join(' ')
        :'Select one or more tickets to export.';
    }
  }
  function supportUpdateMarkup(update){
    return `<li><strong>${escapeHtml(SUPPORT_STATUS_LABEL[update.status]||update.status)}</strong> <small>${escapeHtml(new Date(update.at).toLocaleString())}</small><p>${escapeHtml(update.note)}</p></li>`;
  }
  function supportResolutionMarkup(){
    const resolution=supportResolution();
    return `<div class="support-resolution"><h4>Resolution</h4><p>Clear this site’s storage in your browser. That is the whole fix, and it is the only thing that turns the restricted presentation off without the value you chose.</p><ol>${resolution.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol><p>Origin: <code>${escapeHtml(resolution.origin)}</code></p><p>Keys this page writes:</p><ul class="support-keys">${resolution.keys.map(key=>`<li><code>${escapeHtml(key)}</code></li>`).join('')}</ul><button type="button" class="text-button" data-support-copy-keys="1">Copy the origin and key list</button><p class="support-note">${escapeHtml(resolution.note)}</p></div>`;
  }
  function renderSupport(query=''){
    const list=$('support-list');
    if(!list)return;
    const matches=supportMatches(query);
    lastSupportOrder=matches.map(ticket=>ticket.id);
    supportSelection={anchor:supportSelection.anchor,selected:new Set([...supportSelection.selected].filter(id=>lastSupportOrder.includes(id)))};
    list.innerHTML=matches.length?matches.map(ticket=>`<article class="support-ticket" data-ticket-id="${escapeHtml(ticket.id)}"><input type="checkbox" aria-label="Select ticket ${escapeHtml(ticket.number)}" ${supportSelection.selected.has(ticket.id)?'checked':''}><div class="support-body"><h3>${escapeHtml(ticket.number)}</h3><p class="support-meta">${escapeHtml(supportCategoryLabel(ticket.category))} · severity ${escapeHtml(supportSeverityLabel(ticket.severity))} · <strong>${escapeHtml(SUPPORT_STATUS_LABEL[ticket.status])}</strong></p><p class="support-description">${escapeHtml(ticket.description)}</p><ol class="support-updates">${ticket.updates.map(supportUpdateMarkup).join('')}</ol>${ticket.status==='resolved'?supportResolutionMarkup():''}<div class="support-actions"><button type="button" class="text-button" data-support-advance="${escapeHtml(ticket.id)}"${ticket.status==='resolved'?' disabled title="This ticket is already resolved; reopen it to move it again."':''}>Chase it up</button><button type="button" class="text-button" data-support-reopen="${escapeHtml(ticket.id)}"${ticket.status==='received'?' disabled title="This ticket is already open."':''}>Reopen</button></div></div></article>`).join(''):'<p class="empty-state">No tickets in this browser yet. The form above writes one, and it goes no further than this page.</p>';
    if($('support-count'))$('support-count').textContent=`${matches.length} ticket${matches.length===1?'':'s'} of ${supportStore.tickets.length} in this browser`;
    applyVocabulary();
    updateSupportSelectionUI();
    updateSupportExportFormats();
  }
  /**
   * The desk's own copy, refreshed with every state change so a funny-level move
   * or the restricted presentation reaches it live rather than at the next load.
   */
  function renderSupportCopy(){
    /* The description itself rides `data-copy="supportDesc"` through applyCopy(),
     * like every other card on the settings page. Only the two strings that must
     * NOT move with a level are written here. */
    /* Verbatim, and deliberately not through applyVocabularyText: a personal
     * vocabulary file could otherwise replace "nothing is sent anywhere" with
     * anything at all, and this is the one sentence that has to be true. */
    all('.support-disclosure').forEach(node=>{node.textContent=SUPPORT_DISCLOSURE});
    if($('support-severity-note'))$('support-severity-note').textContent=SUPPORT_SEVERITY_NOTE;
  }
  function openSupportDesk(){
    const dialog=$('support-dialog');
    if(!dialog)return false;
    renderSupportCopy();
    renderSupport($('support-search')?.value||'');
    dialog.showModal();
    setTimeout(()=>$('support-category')?.focus(),0);
    return true;
  }
  /** The Help route: documentation.html links here, and this is what answers it. */
  function supportRouteFromHash(hash){return String(hash||'')==='#support-tickets'}
  function submitSupportForm(){
    const verdict=openSupportTicket({
      category:$('support-category')?.value,
      severity:$('support-severity')?.value,
      description:$('support-description')?.value
    });
    const feedback=$('support-form-status');
    if(!verdict.ok){
      if(feedback)feedback.textContent=verdict.reason;
      $(verdict.field)?.focus?.();
      return verdict;
    }
    if(feedback)feedback.textContent=`${verdict.ticket.number} was recorded in this browser. It is listed below.`;
    if($('support-description'))$('support-description').value='';
    renderSupport($('support-search')?.value||'');
    return verdict;
  }
  function initSupport(){
    if(!$('support-dialog'))return;
    renderSupportCopy();
    const categorySelect=$('support-category');
    if(categorySelect&&!categorySelect.options?.length){
      categorySelect.innerHTML=SUPPORT_CATEGORIES.map(item=>`<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('');
    }
    const severitySelect=$('support-severity');
    if(severitySelect&&!severitySelect.options?.length){
      severitySelect.innerHTML=SUPPORT_SEVERITIES.map(item=>`<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('');
      severitySelect.value='normal';
    }
    $('support-open-settings')?.addEventListener('click',openSupportDesk);
    $('support-open-recovery')?.addEventListener('click',openSupportDesk);
    $('support-submit')?.addEventListener('click',submitSupportForm);
    $('support-search')?.addEventListener('input',event=>renderSupport(event.target.value));
    $('support-list')?.addEventListener('click',event=>{
      const advance=event.target.closest?.('[data-support-advance]');
      if(advance&&!advance.disabled){advanceSupportTicket(advance.dataset.supportAdvance);renderSupport($('support-search')?.value||'');return}
      const reopen=event.target.closest?.('[data-support-reopen]');
      if(reopen&&!reopen.disabled){reopenSupportTicket(reopen.dataset.supportReopen);renderSupport($('support-search')?.value||'');return}
      if(event.target.closest?.('[data-support-copy-keys]')){copySupportKeys();return}
      const row=event.target.closest?.('.support-ticket[data-ticket-id]');
      if(!row)return;
      const isCheckbox=event.target.matches?.('input[type="checkbox"]');
      supportSelection=bulkClick(supportSelection,row.dataset.ticketId,{shift:event.shiftKey,ctrl:event.ctrlKey||event.metaKey||isCheckbox},lastSupportOrder);
      updateSupportSelectionUI();updateSupportExportFormats();
    });
    $('support-select-page')?.addEventListener('click',()=>{
      const result=bulkSelectAll(supportSelection,'page',lastSupportOrder,lastSupportOrder);
      supportSelection=result.state;updateSupportSelectionUI();updateSupportExportFormats();
      if($('support-selection-status'))$('support-selection-status').textContent=`Selected ${result.count} on this page.`;
    });
    $('support-select-matches')?.addEventListener('click',()=>{
      const result=bulkSelectAll(supportSelection,'matches',lastSupportOrder,lastSupportOrder);
      supportSelection=result.state;updateSupportSelectionUI();updateSupportExportFormats();
      if($('support-selection-status'))$('support-selection-status').textContent=`Selected ${result.count} matching tickets.`;
    });
    $('support-select-none')?.addEventListener('click',()=>{
      supportSelection={anchor:supportSelection.anchor,selected:new Set()};
      updateSupportSelectionUI();updateSupportExportFormats();
    });
    $('support-close-selected')?.addEventListener('click',()=>{
      const plan=planBulk('Close',[...supportSelection.selected],id=>{
        const ticket=supportStore.tickets.find(item=>item.id===id);
        if(!ticket)return 'no longer in this browser';
        return ticket.status==='resolved'?'already resolved':true;
      },{destructive:false});
      if($('support-bulk-status'))$('support-bulk-status').textContent=summariseBulk(plan);
      if(!plan.affected.length)return;
      const now=Date.now();
      for(const id of plan.affected){
        const ticket=supportStore.tickets.find(item=>item.id===id);
        if(!ticket)continue;
        ticket.status='resolved';
        ticket.updates=[...ticket.updates,{status:'resolved',at:now,note:SUPPORT_STATUS_NOTE.resolved}];
      }
      saveSupport();
      recordHistory('support-tickets-closed',`${plan.affected.length} support ticket${plan.affected.length===1?'':'s'} closed in this browser.`);
      renderSupport($('support-search')?.value||'');
    });
    $('support-export-format')?.addEventListener('change',updateSupportExportFormats);
    $('support-export-selected')?.addEventListener('click',()=>{
      const rows=supportExportRows();
      if(!rows.length)return;
      const format=$('support-export-format').value||'json';
      download(exportFilename('ding-pbx-support-tickets',format,`${rows.length}-selected`),exportRows({rows,format,table:'support_ticket'}),EXPORT_MIME[format]);
      notify('Tickets exported',applyVocabularyText(`Exported ${rows.length} selected ticket${rows.length===1?'':'s'} as ${format.toUpperCase()}.`),{
        category:'export',
        en:`Exported ${rows.length} selected ticket${rows.length===1?'':'s'} as ${format.toUpperCase()}.`,
        zh:`已經匯出 ${rows.length} 張揀咗嘅飛，格式係 ${format.toUpperCase()}。`
      });
    });
    renderSupport();
    if(supportRouteFromHash(typeof location==='undefined'?'':location.hash))openSupportDesk();
  }
  function copySupportKeys(){
    const resolution=supportResolution();
    const text=`${resolution.origin}\n${resolution.keys.join('\n')}`;
    try{navigator.clipboard?.writeText?.(text)}catch{/* a refused clipboard is not a reason to hide the list, which is on screen anyway */}
    if($('support-copy-status'))$('support-copy-status').textContent=`Copied the origin and ${resolution.keys.length} keys. They are listed above either way.`;
  }

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

  // ---- Display name: applied live, to the site's own chrome and to nothing
  // else. ----
  //
  // Two surfaces, named rather than swept: every `.brand-name` element (the
  // brand line in each page's header and footer) and the browser tab title.
  // Both are this site introducing itself to the person reading it.
  //
  // Deliberately NOT rewritten, because they are not that: the `og:` metadata
  // and the page description, which are what somebody else's chat window and
  // somebody else's search result read; the product prose on the home and
  // product pages, which describes the real product by its real name; and the
  // status page's factual records. A rename that edited those would be a rename
  // that told other people something untrue about which software this is.
  //
  // `textContent` rather than `innerHTML`, so a name is always a name and never
  // markup -- and, usefully, assigning it replaces the child text node, so the
  // personal-vocabulary walker treats the new name as a fresh original and layers
  // replacements on top of it instead of reverting to the one it cached first.
  function currentDisplayName(){
    const chosen=String(state.displayName||'').trim();
    return chosen||SHIPPED_PRODUCT_NAME;
  }
  function displayNameIsChosen(){return currentDisplayName()!==SHIPPED_PRODUCT_NAME}
  function applyDisplayName(){
    const name=currentDisplayName();
    all('.brand-name').forEach(el=>{el.textContent=name});
    // Only the shipped name is substituted, so a title that never carried it is
    // left exactly as it was rather than being guessed at.
    document.title=SHIPPED_TITLE.split(SHIPPED_PRODUCT_NAME).join(name);
    const field=$('display-name');
    if(field&&document.activeElement!==field)field.value=state.displayName||'';
    const status=$('display-name-status');
    if(status){
      status.textContent=displayNameIsChosen()
        ? `This site calls itself “${name}” here. Downloads, exports and the link preview other people see still say ${SHIPPED_PRODUCT_NAME}.`
        : `Using the shipped name, ${SHIPPED_PRODUCT_NAME}.`;
    }
  }

  // Typing applies live, because a rename you cannot see is a rename you cannot
  // judge -- but one history entry and one notification per rename, not one per
  // keystroke, so the local history stays readable. `change` fires once the field
  // is left or Enter is pressed, which is that moment.
  function setDisplayName(raw){
    state.displayName=String(raw||'').slice(0,DISPLAY_NAME_MAX);
    save();
    applyDisplayName();
  }
  function commitDisplayName(){
    const name=currentDisplayName();
    recordHistory('display-name-changed',displayNameIsChosen()
      ? `This page now calls itself “${name}”. The shipped name ${SHIPPED_PRODUCT_NAME} is unchanged.`
      : `The display name returned to the shipped name, ${SHIPPED_PRODUCT_NAME}.`);
    notify(copyText('notifSettingSaved'),applyVocabularyText(displayNameIsChosen()
      ? `This page is called “${name}” in your browser now. Exports and downloads still name ${SHIPPED_PRODUCT_NAME}.`
      : `The display name is back to ${SHIPPED_PRODUCT_NAME}.`),{category:'setting',copyKey:'notifSettingSaved'});
  }
  function initDisplayName(){
    const field=$('display-name');
    if(!field)return;
    field.value=state.displayName||'';
    field.oninput=event=>setDisplayName(event.target.value);
    field.onchange=commitDisplayName;
    const reset=$('display-name-reset');
    if(reset)reset.onclick=()=>{
      if(!displayNameIsChosen()){applyDisplayName();return}
      setDisplayName('');
      field.value='';
      commitDisplayName();
    };
    applyDisplayName();
  }

  // ---- Dialog and message-box emoji: decoration, and only decoration. ----
  //
  // The switch puts one emoji beside a dialog's heading and beside a message box,
  // and changes nothing else. The factual copy is byte-identical either way, which
  // is the property the whole feature rests on: an emoji carrying a fact would be a
  // fact only some people can see, and it would vanish the moment somebody turned
  // the switch off.
  //
  // Three boundaries, each written so it can be checked rather than promised:
  //
  //   - the decoration is a separate element this code creates, never characters
  //     spliced into copy somebody wrote, so switching it off restores the exact
  //     bytes rather than an approximation of them;
  //   - it sits OUTSIDE the heading a dialog is labelled by, and carries
  //     `aria-hidden`, so no accessible name can ever contain it;
  //   - it never reaches a button, a field label, an option, an accessible name or
  //     any other control text. The canonical contract names that boundary and the
  //     reason is plain -- a control is read aloud by its own text, so a decorative
  //     glyph read aloud there is noise the listener cannot switch off.
  //
  // `data-no-vocab` keeps the glyph away from the personal-vocabulary walker, which
  // rewrites copy from a per-node cache of the first text it saw. A decoration is
  // not copy, so it is excluded outright rather than by being applied in a
  // particular order that a later edit could quietly reverse.
  const DIALOG_EMOJI_CLASS='dialog-emoji';
  const DIALOG_EMOJI_DECORATIONS=[
    {id:'command-palette',within:'.dialog-heading',glyph:'🔎'},
    {id:'regex-dialog',within:'.dialog-heading',glyph:'🧩'},
    {id:'notifications-dialog',within:'.dialog-heading',glyph:'🔔'},
    {id:'history-dialog',within:'.dialog-heading',glyph:'🕘'},
    {id:'reset-confirm-dialog',within:'.dialog-heading',glyph:'⚠️'},
    {id:'export-everything-dialog',within:'.dialog-heading',glyph:'📦'},
    {id:'authenticator-dialog',within:'.dialog-heading',glyph:'🔑'},
    {id:'auth-secrets-dialog',within:'.dialog-heading',glyph:'⚠️'},
    {id:'notif-confirm',within:'',glyph:'⚠️'},
    {id:'auth-confirm',within:'',glyph:'⚠️'}
  ];
  // One glyph for every message box, because a message box carries arbitrary text
  // and choosing a glyph from that text would be inventing a meaning for it.
  const MESSAGE_BOX_GLYPH='💬';
  function messageBoxGlyph(){return state.dialogEmojis?MESSAGE_BOX_GLYPH:''}
  /**
   * Puts exactly one decoration at the front of `host`, or removes the one there.
   *
   * An empty glyph means "no decoration", which is a removal rather than an empty
   * span: an empty span still occupies the flex row and still reads as an element
   * to anything walking the DOM, so "off" would not be off.
   */
  function setDialogDecoration(host,glyph){
    if(!host)return;
    const first=host.firstElementChild;
    const existing=first&&first.className===DIALOG_EMOJI_CLASS?first:null;
    if(!glyph){if(existing)existing.remove();return}
    const span=existing||document.createElement('span');
    span.className=DIALOG_EMOJI_CLASS;
    span.setAttribute('aria-hidden','true');
    span.setAttribute('data-no-vocab','');
    span.textContent=glyph;
    if(!existing)host.insertBefore(span,host.firstChild);
  }
  function applyDialogEmojis(){
    const on=Boolean(state.dialogEmojis);
    for(const target of DIALOG_EMOJI_DECORATIONS){
      const element=$(target.id);
      if(!element)continue;
      const host=target.within?element.querySelector(target.within):element;
      setDialogDecoration(host,on?target.glyph:'');
    }
    // Toasts already on screen change with the switch, rather than only the next
    // one to arrive -- a setting whose effect you have to wait for reads as broken.
    all('#toast-region .toast').forEach(toast=>setDialogDecoration(toast,messageBoxGlyph()));
    if($('dialog-emojis'))$('dialog-emojis').checked=on;
    const status=$('dialog-emojis-status');
    if(status)status.textContent=on
      ? `Dialogs and message boxes carry a decorative emoji beside their heading. Every word is exactly as it was, and no button, label or screen-reader name carries one.`
      : `Dialogs and message boxes carry no emoji. Turning this on decorates ${DIALOG_EMOJI_DECORATIONS.length} dialogs and every message box, and changes no wording.`;
  }

  // ---- Spoken narration: an off-by-default narrator that reads real events aloud.
  //
  // Everything it says is something this page has already put on screen. It invents
  // no events of its own, so there is nothing a listener can hear that a reader
  // cannot see -- which is the property that makes it decoration for one person
  // rather than a second, private channel of facts.
  //
  // Four boundaries, each written so it can be checked rather than promised:
  //
  //   - it is OFF until somebody turns it on, and turning it off cancels whatever
  //     is mid-sentence rather than letting the rest of the line finish;
  //   - it never speaks text the personal vocabulary has rewritten. `narrationTextFor`
  //     reads `copyLevel`, which is the per-language copy BEFORE
  //     `applyVocabularyText` runs, and a caller supplying its own words supplies
  //     them directly. This is not tidiness: a voice whose `localService` is false
  //     synthesises on somebody else's server, so the words spoken through it leave
  //     this computer, and a private dictionary must not be one of them;
  //   - the status line says so, in the state where a person is looking at it: which
  //     voice will actually speak, that a chosen voice is not installed here and the
  //     choice has been kept anyway, and that a network-backed voice sends the words
  //     away and goes quiet offline;
  //   - a line is spoken in the languages it actually has wording for. Reading
  //     English words through a Cantonese voice is not Cantonese narration, it is
  //     English mispronounced, so `narrationTracksFor` falls back to the language the
  //     line is really written in and the card says that is what it does.
  //
  // Two things this site deliberately cannot do, said here rather than left to be
  // discovered. A browser cannot detect a running screen reader -- there is no such
  // API -- so the narrator cannot duck under one the way the desktop console does
  // through Electron's own accessibility signal. It is off by default and the card
  // says why that matters. And Low stimulation doubles as this page's reduced-sound
  // setting, so switching it on silences the narrator live, errors included, because
  // "quieter" that keeps talking is not quieter.
  const NARRATION_TRACKS=[
    {key:'en',label:'English',lang:'en-US',field:'voiceEn',select:'narration-voice-en',status:'narration-status-en',prefixes:['en'],preferred:['en']},
    // Cantonese ranks a real Cantonese voice ahead of any other Chinese one rather
    // than taking whatever `zh` turns up first: `zh-CN` is Mandarin, and a Mandarin
    // voice reading Cantonese text is a different language, not an accent.
    {key:'zh',label:'Cantonese',lang:'zh-HK',field:'voiceZh',select:'narration-voice-zh',status:'narration-status-zh',prefixes:['yue','zh'],preferred:['yue','zh-hk']}
  ];
  // Every category a call site may narrate under, with the shortest gap between two
  // ordinary lines of it. An undeclared category is refused rather than given a
  // default, because a silent default is how a typo becomes a category of its own
  // with nobody's rate limit on it.
  const NARRATION_CATEGORIES=[
    {id:'setting',cooldownMs:4000},
    {id:'export',cooldownMs:4000},
    {id:'search',cooldownMs:4000},
    {id:'notification',cooldownMs:4000},
    // Errors skip the rate limit -- a failure arriving straight after a notice is
    // still the thing the person most needs to hear. They do not skip Low
    // stimulation, which is a request for quiet rather than a request for less.
    {id:'error',cooldownMs:0}
  ];
  // The Web Speech API documents rate 0.1-10 and pitch 0-2. These are the usable
  // subset offered here, and every value is clamped into them, so a hand-edited
  // settings blob cannot hand the engine a rate of 40.
  const NARRATION_RATE={min:0.5,max:2,step:0.1,default:1};
  const NARRATION_PITCH={min:0,max:2,step:0.1,default:1};
  // The shipped default, and deliberately not a named voice: nothing can know what
  // is installed on a computer it has not asked.
  const NARRATION_AUTOMATIC_VOICE='';
  // A browser that never fires `end` would leave the queue holding a line forever,
  // and a narrator that has gone silent for no stated reason is worse than one that
  // says something twice.
  const NARRATION_UTTERANCE_TIMEOUT_MS=30000;

  function narrationTrack(key){return NARRATION_TRACKS.find(track=>track.key===key)||null}
  function narrationOtherTrack(key){return NARRATION_TRACKS.find(track=>track.key!==key)||null}
  function narrationCooldown(category){const entry=NARRATION_CATEGORIES.find(item=>item.id===category);return entry?entry.cooldownMs:null}
  function narrationLangMatches(lang,prefix){const value=String(lang||'').toLowerCase();return value===prefix||value.startsWith(`${prefix}-`)}
  function narrationVoiceMatches(voice,track){return track.prefixes.some(prefix=>narrationLangMatches(voice&&voice.lang,prefix))}
  function narrationVoiceRank(voice,track){
    const at=track.preferred.findIndex(prefix=>narrationLangMatches(voice&&voice.lang,prefix));
    return at===-1?track.preferred.length:at;
  }
  /** Every voice on this computer that can read `trackKey`, best match first. */
  function narrationVoicesFor(trackKey,voices){
    const track=narrationTrack(trackKey);
    if(!track||!Array.isArray(voices))return [];
    return voices
      .map((voice,index)=>({voice,index}))
      .filter(entry=>narrationVoiceMatches(entry.voice,track))
      .sort((a,b)=>narrationVoiceRank(a.voice,track)-narrationVoiceRank(b.voice,track)||a.index-b.index)
      .map(entry=>entry.voice);
  }
  function narrationRemoteSentence(voice){
    return voice&&voice.localService===false
      ? ' It is network-backed, so the words are synthesised on that service’s computer rather than this one, and it goes quiet offline.'
      : '';
  }
  /**
   * Which voice will actually read `trackKey` right now, and why.
   *
   * `voices` is null when this browser has no speech synthesis at all, which is a
   * different fact from a browser that has one and reports no voices for a language,
   * and different again from one whose list has not arrived yet. All three are said
   * out loud rather than collapsed into one shrug.
   *
   * A chosen voice that is not installed here is KEPT, never quietly reset: the
   * person chose it on some machine, and the reason it is not speaking is a fact
   * about this machine.
   */
  function resolveNarrationVoice(trackKey,chosenId,voices){
    const track=narrationTrack(trackKey);
    const label=track?track.label:trackKey;
    if(!track)return{kind:'unknown-track',chosenVoiceId:'',effectiveVoiceId:'',message:`No narration track called ${trackKey} exists.`};
    if(voices===null)return{kind:'no-engine',chosenVoiceId:String(chosenId||''),effectiveVoiceId:'',message:'This browser has no speech synthesis, so nothing can be spoken here at all.'};
    const usable=narrationVoicesFor(trackKey,voices);
    const chosen=chosenId?voices.find(voice=>voice&&voice.voiceURI===chosenId)||null:null;
    if(!chosenId){
      if(!usable.length)return{kind:'no-voice-available',chosenVoiceId:'',effectiveVoiceId:'',message:`No voice on this computer can read ${label} yet. Some browsers report their voices a moment after the page loads; this line updates when they do.`};
      return{kind:'automatic',chosenVoiceId:'',effectiveVoiceId:usable[0].voiceURI,message:`Chosen automatically: “${usable[0].name}” will read ${label}.${narrationRemoteSentence(usable[0])}`};
    }
    if(!chosen){
      if(!usable.length)return{kind:'no-voice-available',chosenVoiceId:chosenId,effectiveVoiceId:'',message:`The chosen ${label} voice is not installed on this computer, and no other voice here can read ${label} either. The choice is kept.`};
      return{kind:'fallback',chosenVoiceId:chosenId,effectiveVoiceId:usable[0].voiceURI,message:`The chosen ${label} voice is not installed on this computer. “${usable[0].name}” reads it instead, and the choice is kept.${narrationRemoteSentence(usable[0])}`};
    }
    const kind=chosen.localService===false?'network':'ok';
    return{kind,chosenVoiceId:chosenId,effectiveVoiceId:chosen.voiceURI,message:`“${chosen.name}” will read ${label}.${narrationRemoteSentence(chosen)}`};
  }
  function narrationSelectionIncludes(selection,trackKey){return selection==='both'||selection===trackKey}
  /**
   * The tracks one line is spoken in: the narrated language, narrowed to the
   * languages the line has wording for, and -- when that leaves nothing -- the
   * language the line is actually written in.
   */
  function narrationTracksFor(selection,available){
    const order=NARRATION_TRACKS.map(track=>track.key);
    const has=key=>available.includes(key);
    const wanted=order.filter(key=>narrationSelectionIncludes(selection,key)&&has(key));
    return wanted.length?wanted:order.filter(has);
  }
  /**
   * Whether one line is spoken, and the exact reason when it is not.
   *
   * Pure, and takes the current time as an argument, so every branch is decided by
   * values a caller supplies rather than by what the machine happened to be doing.
   */
  function narrationGate(request){
    const cooldown=narrationCooldown(request.category);
    if(cooldown===null)return{speak:false,why:'unknown-category'};
    if(!request.enabled)return{speak:false,why:'off'};
    if(request.quiet)return{speak:false,why:'quiet'};
    const last=request.lastSpokenAtMs;
    if(!request.isError&&typeof last==='number'&&request.now-last<cooldown)return{speak:false,why:'cooldown'};
    return{speak:true,why:'speak'};
  }
  function clampNarrationValue(value,range){
    const number=Number(value);
    if(!Number.isFinite(number))return range.default;
    return Math.min(range.max,Math.max(range.min,number));
  }
  /**
   * The words for one line, per language.
   *
   * `copyKey` reads `copyLevel`, which is the per-language wording at that language's
   * own funny level and BEFORE the personal vocabulary is applied. That is the whole
   * point of going through it rather than through `copyText`: a network-backed voice
   * would carry a private replacement off this computer.
   */
  function narrationTextFor(source){
    if(source&&source.copyKey)return{en:copyLevel(source.copyKey,'en'),zh:copyLevel(source.copyKey,'zh')};
    return{en:source&&source.en?String(source.en):'',zh:source&&source.zh?String(source.zh):''};
  }

  const narrationQueue=[];
  const narrationLastSpokenAt=new Map();
  let narrationSpeaking=false;
  let narrationVoicesListener=null;
  function narrationEngine(){return typeof speechSynthesis==='undefined'||!speechSynthesis?null:speechSynthesis}
  /** Every voice this browser reports, or null when it has no synthesis at all. */
  function narrationVoices(){
    const engine=narrationEngine();
    if(!engine)return null;
    return typeof engine.getVoices==='function'?[...engine.getVoices()]:[];
  }
  function narrationQuiet(){return reduceMotion()}
  function narrationChosenVoice(trackKey){const track=narrationTrack(trackKey);return track?String(state.narration[track.field]||''):''}
  function narrationSilence(){
    narrationQueue.length=0;
    const engine=narrationEngine();
    if(engine&&typeof engine.cancel==='function')engine.cancel();
  }
  /**
   * Queue one line. Returns why, so a caller -- and a test -- can tell "spoken" from
   * "dropped because the switch is off" from "dropped because it repeated itself".
   *
   * A line still waiting in the same category is REPLACED rather than queued behind:
   * two status lines about the same thing are one answer and a stale one, and reading
   * the stale one first is the version nobody wants.
   */
  function narrate(category,texts,options={}){
    const isError=Boolean(options.isError);
    /* Filtered here rather than at the selection, because `narrationTracksFor` falls
     * back to whichever language a line actually has wording for -- so dropping the
     * Cantonese SELECTION while leaving Cantonese TEXT in place would still speak
     * Cantonese for any line with no English wording. Under the restricted
     * presentation a Cantonese-only line is not spoken at all, which is the same
     * answer the rest of the page gives: that capability is not installed. */
    const spokenTracks=NARRATION_TRACKS.map(track=>track.key).filter(key=>!(schoolActive()&&key!=='en'));
    const available=spokenTracks.filter(key=>String(texts&&texts[key]||'').trim().length>0);
    if(!available.length)return{spoken:false,why:'no-text'};
    const last=narrationLastSpokenAt.has(category)?narrationLastSpokenAt.get(category):null;
    const gate=narrationGate({category,isError,enabled:Boolean(state.narration.enabled),quiet:narrationQuiet(),lastSpokenAtMs:last,now:Date.now()});
    if(!gate.speak)return{spoken:false,why:gate.why};
    for(let index=narrationQueue.length-1;index>=0;index-=1){
      if(narrationQueue[index].category===category)narrationQueue.splice(index,1);
    }
    const tracks=narrationTracksFor(state.narration.language,available);
    narrationQueue.push({category,isError,lines:tracks.map(key=>({track:key,text:String(texts[key])}))});
    pumpNarration();
    return{spoken:true,why:'queued',tracks};
  }
  /** One utterance at a time, in order -- "Both" means English then Cantonese, never together. */
  async function pumpNarration(){
    if(narrationSpeaking)return;
    narrationSpeaking=true;
    try{
      while(narrationQueue.length){
        if(!state.narration.enabled||narrationQuiet()){narrationQueue.length=0;break}
        const item=narrationQueue.shift();
        narrationLastSpokenAt.set(item.category,Date.now());
        for(const line of item.lines){
          if(!state.narration.enabled||narrationQuiet())break;
          /* `continue` rather than `break`: the restricted presentation removes the
           * Cantonese capability, it does not silence the narrator, so the English
           * half of a bilingual line queued a moment earlier is still read. This is
           * checked here as well as at queue time because the switch is shared across
           * tabs and can come on between the two halves of one line. */
          if(schoolActive()&&line.track!=='en')continue;
          await speakNarrationLine(line);
        }
      }
    }finally{narrationSpeaking=false}
  }
  function speakNarrationLine(line){
    const engine=narrationEngine();
    if(!engine||typeof SpeechSynthesisUtterance==='undefined')return Promise.resolve('no-engine');
    const track=narrationTrack(line.track);
    const voices=narrationVoices();
    const status=resolveNarrationVoice(line.track,narrationChosenVoice(line.track),voices);
    const utterance=new SpeechSynthesisUtterance(line.text);
    utterance.lang=track?track.lang:'en-US';
    const voice=status.effectiveVoiceId?(voices||[]).find(item=>item&&item.voiceURI===status.effectiveVoiceId):null;
    if(voice)utterance.voice=voice;
    utterance.rate=clampNarrationValue(state.narration.rate,NARRATION_RATE);
    utterance.pitch=clampNarrationValue(state.narration.pitch,NARRATION_PITCH);
    return new Promise(resolve=>{
      let settled=false;
      let timer=0;
      const finish=why=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);resolve(why)};
      utterance.onend=()=>finish('end');
      utterance.onerror=()=>finish('error');
      timer=setTimeout(()=>finish('timeout'),NARRATION_UTTERANCE_TIMEOUT_MS);
      engine.speak(utterance);
    });
  }
  /** The sentence under one voice picker, in the state somebody is looking at it. */
  function narrationTrackStatus(trackKey){
    const track=narrationTrack(trackKey);
    if(!track)return '';
    const message=resolveNarrationVoice(trackKey,narrationChosenVoice(trackKey),narrationVoices()).message;
    if(narrationSelectionIncludes(state.narration.language,trackKey))return message;
    const other=narrationOtherTrack(trackKey);
    return `${message} The narrated language is ${other?other.label:'the other one'}, so this voice only reads lines this site has no ${other?other.label:'other'} wording for.`;
  }
  function applyNarration(){
    const on=Boolean(state.narration.enabled);
    if($('narration-enabled'))$('narration-enabled').checked=on;
    if($('narration-language'))$('narration-language').value=state.narration.language;
    const rate=clampNarrationValue(state.narration.rate,NARRATION_RATE);
    const pitch=clampNarrationValue(state.narration.pitch,NARRATION_PITCH);
    if($('narration-rate'))$('narration-rate').value=String(rate);
    if($('narration-rate-output'))$('narration-rate-output').textContent=`${rate.toFixed(1)}×`;
    if($('narration-pitch'))$('narration-pitch').value=String(pitch);
    if($('narration-pitch-output'))$('narration-pitch-output').textContent=pitch.toFixed(1);
    const voices=narrationVoices();
    for(const track of NARRATION_TRACKS){
      const select=$(track.select);
      if(select){
        const chosen=narrationChosenVoice(track.key);
        const options=[makeNarrationOption(NARRATION_AUTOMATIC_VOICE,'Choose automatically')];
        for(const voice of narrationVoicesFor(track.key,voices)){
          options.push(makeNarrationOption(voice.voiceURI,`${voice.name} (${voice.lang})`));
        }
        // A chosen voice this computer does not have keeps its own option, so the
        // picker shows the kept choice rather than snapping back to automatic and
        // reading as though nothing was ever chosen.
        if(chosen&&!options.some(option=>option.value===chosen)){
          options.push(makeNarrationOption(chosen,`${chosen} — not installed here`));
        }
        select.replaceChildren(...options);
        select.value=chosen;
      }
      const status=$(track.status);
      if(status)status.textContent=narrationTrackStatus(track.key);
    }
  }
  function makeNarrationOption(value,label){
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label;
    return option;
  }
  function setNarration(field,value){
    const next={...state.narration};
    if(field==='enabled')next.enabled=Boolean(value);
    else if(field==='rate')next.rate=clampNarrationValue(value,NARRATION_RATE);
    else if(field==='pitch')next.pitch=clampNarrationValue(value,NARRATION_PITCH);
    else next[field]=String(value);
    state.narration=next;
    save();
    // Turning it off stops the sentence in progress. Letting the current line finish
    // would mean the switch does not do what its label says until it is convenient.
    if(!next.enabled)narrationSilence();
    applyNarration();
  }
  function commitNarration(field){
    recordHistory('narration-changed',`narration.${field} changed to ${JSON.stringify(state.narration[field])}.`);
    notify('Narration',state.narration.enabled
      ? `Narration is on. ${narrationTrackStatus(state.narration.language==='zh'?'zh':'en')}`
      : 'Narration is off. Nothing is spoken.',{category:'setting',en:'Narration settings changed.',zh:'朗讀設定已經改咗。'});
  }
  function initNarration(){
    const toggle=$('narration-enabled');
    if(!toggle)return;
    toggle.onchange=event=>{setNarration('enabled',event.target.checked);commitNarration('enabled')};
    const language=el('narration-language');
    if(language)language.onchange=event=>{setNarration('language',event.target.value);commitNarration('language')};
    for(const track of NARRATION_TRACKS){
      const select=el(track.select);
      if(select)select.onchange=event=>{setNarration(track.field,event.target.value);commitNarration(track.field)};
    }
    const rate=$('narration-rate');
    if(rate){rate.oninput=event=>setNarration('rate',event.target.value);rate.onchange=()=>commitNarration('rate')}
    const pitch=$('narration-pitch');
    if(pitch){pitch.oninput=event=>setNarration('pitch',event.target.value);pitch.onchange=()=>commitNarration('pitch')}
    const engine=narrationEngine();
    if(engine&&typeof engine.addEventListener==='function'){
      // The list arrives late on most browsers: `getVoices()` answers empty on the
      // first call and fills in a moment afterwards behind this event. A picker read
      // once reports "no voices" on a computer with forty of them.
      narrationVoicesListener=()=>applyNarration();
      engine.addEventListener('voiceschanged',narrationVoicesListener);
    }
    // Speech synthesis is a property of the browser, not of the page, so a narrator
    // left talking carries on across a navigation to the next page of this site.
    // Leaving also drops the subscription rather than accumulating one per page.
    addEventListener('pagehide',()=>{
      narrationSilence();
      if(narrationVoicesListener&&engine&&typeof engine.removeEventListener==='function'){
        engine.removeEventListener('voiceschanged',narrationVoicesListener);
        narrationVoicesListener=null;
      }
    });
    applyNarration();
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
      notify('Still here','Nothing has changed on this page for a while. No action is needed.',{category:'notification',en:'Still here. Nothing has changed on this page for a while, and no action is needed.',zh:'仲喺度。呢版一段時間都冇變過，唔使做嘢。'});
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
    const map={'destination-map-panel':'destinationMap','settings-preview-panel':'settingsPreview','documentation-filters-panel':'documentationFilters','settings-filters-panel':'settingsFilters','changelog-filters-panel':'changelogFilters'};
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
    const button=$('nav-toggle'),menu=$('site-nav');if(!button||!menu)return;
    const close=()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false')};
    button.onclick=()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('a')?.focus()};
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault();openPalette()}});
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
      notify('Destinations exported',applyVocabularyText(`Exported ${rows.length} of ${DESTINATIONS.length} destinations as ${format.toUpperCase()}, covering the current search ("${lastDocumentationQuery||'no filter'}").`),{category:'export',en:`Exported ${rows.length} of ${DESTINATIONS.length} destinations as ${format.toUpperCase()}.`,zh:`已經匯出 ${rows.length} 個目的地，一共 ${DESTINATIONS.length} 個，格式係 ${format.toUpperCase()}。`});
    });
  }
  function matchText(text,query,target){const config=regexState.get(target);if(config?.enabled){try{return new RegExp(config.pattern,config.flags).test(text)}catch{return false}}if(!query)return true;return text.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
  function filter(selector,query,target){all(selector).forEach(item=>item.hidden=!matchText(item.dataset.search||item.textContent,query,target))}

  function initSearch(){all('[data-filter-target]').forEach(input=>input.addEventListener('input',()=>filter(input.dataset.filterTarget,input.value,input.id)));if($('feature-search'))$('feature-search').addEventListener('input',event=>{destinationPage=0;renderDestinations(event.target.value)});$('destination-pagination')?.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;destinationPage=Number(button.dataset.page);renderDestinations($('feature-search')?.value||'');$('destination-grid').focus?.()});all('.regex-trigger').forEach(button=>button.onclick=event=>{event.preventDefault();openRegex(button.dataset.regexFor)})}
  function openRegex(target){regexTarget=target;const dialog=$('regex-dialog');if(!dialog)return;const saved=regexState.get(target)||{pattern:'',flags:'iu'};$('regex-target-label').textContent=`Attached to: ${target}`;$('regex-pattern').value=saved.pattern;$('regex-i').checked=saved.flags.includes('i');$('regex-m').checked=saved.flags.includes('m');$('regex-u').checked=saved.flags.includes('u');dialog.showModal();previewRegex();setTimeout(()=>$('regex-pattern').focus(),0)}
  function regexConfig(){return{pattern:$('regex-pattern').value.slice(0,256),flags:`${$('regex-i').checked?'i':''}${$('regex-m').checked?'m':''}${$('regex-u').checked?'u':''}`}}
  function previewRegex(){if(!$('regex-feedback'))return;const config=regexConfig();if(!config.pattern){$('regex-feedback').textContent='Enter a pattern.';return}try{const re=new RegExp(config.pattern,config.flags),flags=re.flags.includes('g')?re.flags:`${re.flags}g`,matches=[...$('regex-sample').value.matchAll(new RegExp(re.source,flags))];$('regex-feedback').textContent=`Valid JavaScript regular expression · ${matches.length} sample match${matches.length===1?'':'es'}.`}catch(error){$('regex-feedback').textContent=`Invalid pattern: ${error.message}`}}
  /* An invalid pattern used to return here in silence: the dialog stayed open,
   * the Apply button appeared to do nothing at all, and the preview line said
   * why in a sentence somebody had already read and could not act on. It raises
   * the route instead, beside the preview, with the two real ways out. */
  function applyRegex(){const config=regexConfig();try{new RegExp(config.pattern,config.flags)}catch(error){reportFailure('regex-invalid',{detail:error.message,context:{target:regexTarget}});return}clearRecovery('regex-feedback','regex-invalid');regexState.set(regexTarget,{...config,enabled:Boolean(config.pattern)});$('regex-dialog').close();$(regexTarget)?.dispatchEvent(new Event('input'));notify(copyText('notifRegexApplied'),applyVocabularyText(`${regexTarget} now uses the local JavaScript regular expression engine.`),{category:'search',copyKey:'notifRegexApplied'});renderModeStatus(regexTarget)}
  function initRegex(){if(!$('regex-dialog'))return;$('regex-pattern').addEventListener('input',previewRegex);$('regex-apply').onclick=applyRegex;all('[data-insert]').forEach(button=>button.onclick=()=>{const input=$('regex-pattern'),start=input.selectionStart;input.value=`${input.value.slice(0,start)}${button.dataset.insert}${input.value.slice(input.selectionEnd)}`;input.focus();input.setSelectionRange(start+button.dataset.insert.length,start+button.dataset.insert.length);previewRegex()})}
  function renderModeStatus(target){const el=$(`${target}-mode-status`);if(!el)return;const config=regexState.get(target);if(config?.enabled){el.textContent=`${copyText('searchModeRegex')} /${config.pattern}/${config.flags}`;el.classList.add('is-regex')}else{el.textContent=copyText('searchModePlain');el.classList.remove('is-regex')}}
  function renderAllModeStatuses(){all('.mode-status').forEach(el=>renderModeStatus(el.id.replace(/-mode-status$/,'')))}

  // ------------------------------------------------------------------
  // Right-click menus, and the shortcut column that must not lie.
  //
  // The whole feature turns on one property: the chord printed beside an item and the
  // chord that actually fires it are THE SAME OBJECT. A menu is where a person goes to
  // find out what a thing can do, so a label showing a shortcut that no longer works
  // teaches them to press a key that does nothing -- worse than showing none, because
  // they now believe something false and it took a menu to tell them.
  //
  // Everything that decides is a pure function taking values a caller supplies, and the
  // half that touches the page does nothing else. That split matters more than usual
  // here, because "the menu is on the page", "an item is listed" and "a chord is
  // printed" are all true of a menu whose every action is inert.
  //
  // A page cannot claim every chord. The browser gets first refusal on a long list of
  // them -- Ctrl+Shift+N is a private window, Ctrl+Shift+C is the element picker,
  // Ctrl+Shift+R is a hard reload -- and a page that binds one prints a shortcut its
  // own handler never sees. RESERVED_CHORDS below names them with the claimant, and no
  // action may sit on one. That is why the site's own chords are Alt+Shift: the one
  // remaining collision there is Firefox's access keys, which is why this site declares
  // no `accesskey` anywhere and a test says so.
  // ------------------------------------------------------------------

  const CONTEXT_MENU_SEARCH_ID = 'context-menu-search';
  const CONTEXT_MENU_MARGIN = 8;
  const CONTEXT_MENU_MIN_HEIGHT = 120;
  const CONTEXT_MENU_WIDTH = 320;
  const CONTEXT_MENU_LONG_PRESS_MS = 550;
  const CONTEXT_MENU_LONG_PRESS_SLOP = 10;
  /** The tags worth describing in their own right; anything else is described as it is found. */
  const CONTEXT_MENU_TARGETS = 'a[href],img,pre,code,input,textarea,select,h1,h2,h3,h4,h5,h6,button';

  function chord(key,{ctrl=false,shift=false,alt=false,meta=false}={}){return {key:String(key).toLowerCase(),ctrl,shift,alt,meta}}
  function chordEquals(a,b){return Boolean(a)&&Boolean(b)&&a.key===b.key&&a.ctrl===b.ctrl&&a.shift===b.shift&&a.alt===b.alt&&a.meta===b.meta}

  /**
   * Chords the browser answers before the page does, with the claimant named.
   *
   * Not exhaustive across every browser and platform, and deliberately not presented as
   * though it were: it is the set this site refuses, and an action landing on one is a
   * defect rather than a warning, because there is no version of "the shortcut mostly
   * works" that a menu can honestly print.
   */
  const RESERVED_CHORDS = [
    {chord:chord('n',{ctrl:true,shift:true}),claimedBy:'a new private or incognito window'},
    {chord:chord('t',{ctrl:true,shift:true}),claimedBy:'reopening the last closed tab'},
    {chord:chord('w',{ctrl:true,shift:true}),claimedBy:'closing the window'},
    {chord:chord('q',{ctrl:true,shift:true}),claimedBy:'quitting the browser'},
    {chord:chord('i',{ctrl:true,shift:true}),claimedBy:'the developer tools'},
    {chord:chord('j',{ctrl:true,shift:true}),claimedBy:'the developer tools console'},
    {chord:chord('c',{ctrl:true,shift:true}),claimedBy:'the developer tools element picker'},
    {chord:chord('m',{ctrl:true,shift:true}),claimedBy:'the developer tools device toolbar'},
    {chord:chord('p',{ctrl:true,shift:true}),claimedBy:'a private window or the developer command menu'},
    {chord:chord('r',{ctrl:true,shift:true}),claimedBy:'a cache-bypassing reload'},
    {chord:chord('o',{ctrl:true,shift:true}),claimedBy:'the bookmark manager'},
    {chord:chord('b',{ctrl:true,shift:true}),claimedBy:'the bookmarks bar'},
    {chord:chord('delete',{ctrl:true,shift:true}),claimedBy:'the clear-browsing-data dialog'},
  ];
  function reservedChordClaim(candidate){return RESERVED_CHORDS.find(entry=>chordEquals(entry.chord,candidate))||null}

  /** Whether a real keyboard event is this chord. The one reading both halves of the feature use. */
  function chordMatches(candidate,event){
    if(!candidate||!event)return false;
    if(String(event.key||'')==='')return false;
    return String(event.key).toLowerCase()===candidate.key
      &&Boolean(event.ctrlKey)===candidate.ctrl
      &&Boolean(event.shiftKey)===candidate.shift
      &&Boolean(event.altKey)===candidate.alt
      &&Boolean(event.metaKey)===candidate.meta;
  }

  const CHORD_KEY_NAMES = {f10:'F10',contextmenu:'Menu',delete:'Delete',escape:'Esc',enter:'Enter',' ':'Space'};
  function chordKeyLabel(key){return CHORD_KEY_NAMES[key]||(key.length===1?key.toUpperCase():key.replace(/^./,c=>c.toUpperCase()))}
  /** The platform's own notation. Apple keyboards print glyphs; everything else prints words. */
  function chordLabel(candidate,platform){
    if(!candidate)return '';
    const apple=/mac|iphone|ipad|ipod/i.test(String(platform||''));
    if(apple){
      return `${candidate.ctrl?'⌃':''}${candidate.alt?'⌥':''}${candidate.shift?'⇧':''}${candidate.meta?'⌘':''}${chordKeyLabel(candidate.key)}`;
    }
    const parts=[];
    if(candidate.ctrl)parts.push('Ctrl');
    if(candidate.meta)parts.push('Win');
    if(candidate.alt)parts.push('Alt');
    if(candidate.shift)parts.push('Shift');
    parts.push(chordKeyLabel(candidate.key));
    return parts.join('+');
  }
  /** The `aria-keyshortcuts` spelling, which is a fixed grammar rather than the platform's. */
  function chordAriaLabel(candidate){
    if(!candidate)return '';
    const parts=[];
    if(candidate.ctrl)parts.push('Control');
    if(candidate.meta)parts.push('Meta');
    if(candidate.alt)parts.push('Alt');
    if(candidate.shift)parts.push('Shift');
    parts.push(chordKeyLabel(candidate.key));
    return parts.join('+');
  }

  /**
   * The name to call an element, or null when it has none.
   *
   * A leading run of symbols is stripped rather than shown, and an element whose whole
   * name is symbols returns null instead of the glyph. That is a lesson this repository
   * paid for twice: a driver once recorded a control called `backspaceDelete last`
   * because an icon font puts its glyph name in `textContent`, and an empty reading and
   * a glyph reading look identical from outside while meaning opposite things.
   */
  function accessibleName(element){
    if(!element)return null;
    const candidates=[
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('alt'),
      element.getAttribute?.('title'),
      element.textContent,
    ];
    for(const raw of candidates){
      const text=String(raw||'').replace(/\s+/gu,' ').trim();
      if(!text)continue;
      const stripped=text.replace(/^[^\p{L}\p{N}]+/u,'').trim();
      if(!stripped)continue;
      return stripped.length>60?`${stripped.slice(0,59)}…`:stripped;
    }
    return null;
  }

  /** The element a right-click is really about: the nearest thing with actions of its own. */
  function resolveContextTarget(element){
    if(!element)return null;
    return element.closest?.(CONTEXT_MENU_TARGETS)||element;
  }
  function contextTargetKind(element){
    const tag=String(element?.tagName||'').toLowerCase();
    if(!tag)return 'page';
    if(tag==='a'&&element.getAttribute?.('href'))return 'link';
    if(tag==='img')return 'image';
    if(tag==='pre'||tag==='code')return 'code';
    if(tag==='input'||tag==='textarea'||tag==='select')return 'field';
    if(/^h[1-6]$/u.test(tag))return 'heading';
    if(tag==='button')return 'control';
    return 'element';
  }

  /** Everything the item list is decided from, gathered once so the decisions stay pure. */
  function contextMenuContext(element){
    const target=resolveContextTarget(element);
    const name=accessibleName(target);
    const section=target?.closest?.('[id]')||null;
    return {
      element:target,
      kind:contextTargetKind(target),
      name,
      namedOnlyByIcon:Boolean(target)&&name===null&&String(target.textContent||'').trim().length>0,
      href:target?.getAttribute?.('href')||'',
      sectionId:section?.id||'',
      page:{
        palette:Boolean($('command-palette')),
        notifications:Boolean($('notifications-dialog')),
        history:Boolean($('history-dialog')),
        resetGate:Boolean($('reset-confirm-dialog')),
        appearance:Boolean($('theme-mode')),
      },
    };
  }

  /**
   * Every action this menu can offer, declared once.
   *
   * `chord` is the shortcut BOTH the printed label and the live handler read, and
   * `unavailable` returns the exact unmet condition rather than a shrug -- a disabled
   * item with no explanation reads as broken rather than as unavailable for a reason.
   */
  const MENU_ACTIONS = [
    {id:'copy-text',label:'Copy this text',chord:chord('c',{alt:true,shift:true}),kinds:['element','heading','code','link','control','image','page'],
      unavailable:ctx=>ctx.name?null:'this element is named only by an icon, so it has no text to copy',
      run:ctx=>copyToClipboard(ctx.name,'Text copied')},
    {id:'copy-link',label:'Copy link address',chord:null,kinds:['link'],
      unavailable:ctx=>ctx.href?null:'this link carries no address',
      run:ctx=>copyToClipboard(absoluteHref(ctx.href),'Link address copied')},
    {id:'open-link-new',label:'Open link in a new tab',chord:null,kinds:['link'],
      unavailable:ctx=>ctx.href?null:'this link carries no address',
      run:ctx=>{window.open?.(absoluteHref(ctx.href),'_blank','noopener,noreferrer')}},
    {id:'copy-image-description',label:'Copy this image’s description',chord:null,kinds:['image'],
      unavailable:ctx=>ctx.element?.getAttribute?.('alt')?null:'this image carries no description to copy',
      run:ctx=>copyToClipboard(ctx.element.getAttribute('alt'),'Image description copied')},
    {id:'copy-section-link',label:'Copy a link to this section',chord:chord('l',{alt:true,shift:true}),kinds:'any',
      unavailable:ctx=>ctx.sectionId?null:'nothing around this element carries an id, so there is no address to link to',
      run:ctx=>copyToClipboard(`${location.href.split('#')[0]}#${ctx.sectionId}`,'Section link copied')},
    {id:'command-palette',label:'Command palette',chord:chord('f',{ctrl:true,shift:true}),kinds:'any',
      unavailable:ctx=>ctx.page.palette?null:'this page does not carry the command palette',
      run:()=>openPalette()},
    {id:'notification-centre',label:'Notification centre',chord:chord('n',{alt:true,shift:true}),kinds:'any',
      unavailable:ctx=>ctx.page.notifications?null:'this page does not carry the notification centre; it is on the home and settings pages',
      run:()=>$('notification-open')?.click()},
    {id:'local-history',label:'Local history',chord:chord('h',{alt:true,shift:true}),kinds:'any',
      unavailable:ctx=>ctx.page.history?null:'this page does not carry the local history panel; it is on the settings page',
      run:()=>$('history-open')?.click()},
    {id:'appearance-settings',label:'Appearance settings…',chord:chord('a',{alt:true,shift:true}),kinds:'any',
      unavailable:()=>null,
      run:ctx=>{if(ctx.page.appearance){$('theme-mode').focus?.();return}location.href=`${BASE}settings.html#appearance`}},
    /* The two entries below are deliberately, permanently unavailable, and each names the
     * registry row that records why. The canonical contract asks every menu for both; this
     * site has neither mechanism, and an entry that silently did nothing when clicked
     * would be exactly the decorative control the rest of these rules forbid. Naming the
     * row is what keeps them honest -- when either feature stops being what the registry
     * says it is, these sentences stop being true and the tests beside them go red.
     *
     * `unavailable` takes no argument on purpose. There is no page, element or state that
     * could make either one available, so it must not be able to depend on one. */
    {id:'element-appearance',label:'Edit this element’s appearance…',chord:null,kinds:'any',
      unavailable:()=>'this site has no per-element appearance editor: material-appearance is recorded partial in site/feature-registry.json',
      run:()=>{}},
    {id:'lock-element',label:'Lock this element…',chord:null,kinds:'any',
      unavailable:()=>'this site ships no per-element lock: per-element-toy-locks is recorded absent in site/feature-registry.json',
      run:()=>{}},
    /* No chord, and that is not an oversight. A destructive action reached by a chord is
     * a destructive action reached without reading anything, and this one is only ever
     * meant to be reached through the two-key gate below. */
    {id:'reset-settings',label:'Reset this site’s settings…',chord:null,kinds:'any',destructive:true,
      unavailable:ctx=>ctx.page.resetGate?null:'this page does not carry the reset gate; it is on the settings page',
      run:()=>$('settings-reset')?.click()},
  ];

  function absoluteHref(href){try{return new URL(String(href),document.baseURI).href}catch{return String(href||'')}}
  function copyToClipboard(value,title){
    const text=String(value??'');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).catch(()=>{});
    notify(title,applyVocabularyText(`Copied ${text.length} character${text.length===1?'':'s'} to the clipboard.`),
      {category:'export',en:`${title}. ${text.length} characters went to the clipboard.`,zh:`${title}。已經複製咗 ${text.length} 個字元去剪貼簿。`});
  }

  /**
   * The items for one element, in declared order, each carrying its printed shortcut.
   *
   * The shortcut string is derived here from the same `chord` the dispatcher matches
   * against, which is the entire point of the feature. Nothing downstream may re-derive
   * or restate it.
   */
  function menuItemsFor(ctx,platform){
    return MENU_ACTIONS
      .filter(action=>action.kinds==='any'||action.kinds.includes(ctx.kind))
      .map(action=>{
        const reason=action.unavailable(ctx);
        return {
          id:action.id,
          label:action.label,
          chord:action.chord,
          shortcut:chordLabel(action.chord,platform),
          ariaShortcut:chordAriaLabel(action.chord),
          destructive:Boolean(action.destructive),
          enabled:!reason,
          unavailableReason:reason||'',
        };
      });
  }

  /**
   * Filtering narrows; it never reorders, renames, or re-points anything.
   *
   * `filter` preserves source order by construction, and the objects handed back are the
   * same objects -- so a filtered item cannot quietly become a different action, which is
   * the one way a search box over a menu can do real damage.
   */
  function filterMenuItems(items,query,target){
    /* The query is trimmed and then handed to matchText() unconditionally. There is no
     * short-circuit on an empty one, and that is deliberate rather than an oversight:
     * matchText() consults a compiled pattern BEFORE it looks at the query, so a field
     * with an active regular expression filters even with an empty box. A menu that
     * returned everything on an empty query would be the one search on this site that
     * quietly ignored its own builder, which is the exact defect that was found and
     * fixed on the other fields. */
    const trimmed=String(query||'').trim();
    return items.filter(item=>matchText(`${item.label} ${item.shortcut} ${item.unavailableReason}`,trimmed,target));
  }

  function menuResultSummary(shown,total,query){
    const trimmed=String(query||'').trim();
    if(!trimmed)return `${total} action${total===1?'':'s'} for this element.`;
    if(shown===0)return `No action matches “${trimmed}”. ${total} action${total===1?'':'s'} were offered for this element.`;
    return `${shown} of ${total} action${total===1?'':'s'} match “${trimmed}”.`;
  }

  /**
   * Whether a chord may fire this item right now.
   *
   * The second clause is the rule that matters: while the menu is open, an item the
   * filter has hidden is not reachable by its shortcut either. Otherwise typing three
   * letters could leave a destructive action invisible on screen and live on the
   * keyboard, which is the exact shape of an accident nobody can explain afterwards.
   */
  function chordIsLive(item,menuState){
    if(!item||!item.enabled)return false;
    if(!menuState||!menuState.open)return true;
    return (menuState.visibleIds||[]).includes(item.id);
  }

  let contextMenu={open:false,ctx:null,opener:null,items:[],visibleIds:[],active:-1};

  function ensureContextMenuUI(){
    if(!document.body||$('context-menu'))return;
    const menu=document.createElement('div');
    menu.id='context-menu';menu.className='context-menu';menu.hidden=true;
    menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','false');
    menu.setAttribute('aria-labelledby','context-menu-title');

    const title=document.createElement('p');
    title.id='context-menu-title';title.className='context-menu-title';

    const row=document.createElement('div');row.className='context-menu-search-row';
    const input=document.createElement('input');
    input.id=CONTEXT_MENU_SEARCH_ID;input.type='search';input.className='context-menu-search';
    input.setAttribute('placeholder','Filter these actions');
    input.setAttribute('aria-label','Filter the actions in this menu');
    input.setAttribute('aria-controls','context-menu-list');
    /* The same anchored builder every other search field on this site gets, bound to this
     * field's own key so its pattern can never be another field's. */
    const trigger=document.createElement('button');
    trigger.type='button';trigger.className='regex-trigger context-menu-regex';
    trigger.dataset.regexFor=CONTEXT_MENU_SEARCH_ID;
    trigger.textContent='.*';
    trigger.setAttribute('aria-label','Open the regular expression builder for this menu’s filter');
    row.append(input,trigger);

    const status=document.createElement('p');
    status.className='mode-status mono';status.id=`${CONTEXT_MENU_SEARCH_ID}-mode-status`;
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');

    const list=document.createElement('ul');
    list.id='context-menu-list';list.className='context-menu-list';
    list.setAttribute('role','listbox');list.setAttribute('aria-label','Actions for this element');

    const count=document.createElement('p');
    count.id='context-menu-count';count.className='context-menu-count';
    count.setAttribute('role','status');count.setAttribute('aria-live','polite');

    const foot=document.createElement('p');
    foot.id='context-menu-foot';foot.className='context-menu-foot';
    foot.dataset.copy='contextMenuHint';

    menu.append(title,row,status,list,count,foot);
    document.body.append(menu);
  }

  /**
   * Where the menu goes: inside the viewport, scrolling rather than overflowing, and
   * flipped rather than laid over the point it was opened from.
   *
   * Fitting the viewport wins over not covering the anchor when the two disagree, because
   * a menu partly off-screen is unusable while a menu overlapping its own anchor is only
   * untidy. Pure, so both properties can be asked rather than eyeballed.
   */
  function clampMenuPosition({x,y,menuWidth,menuHeight,viewWidth,viewHeight,margin=CONTEXT_MENU_MARGIN}){
    const available=Math.max(CONTEXT_MENU_MIN_HEIGHT,viewHeight-margin*2);
    const height=Math.min(menuHeight,available);
    let left=x,flippedX=false;
    if(x+menuWidth+margin>viewWidth){left=x-menuWidth;flippedX=true}
    if(left+menuWidth>viewWidth-margin)left=viewWidth-margin-menuWidth;
    if(left<margin)left=margin;
    let top=y,flippedY=false;
    if(y+height+margin>viewHeight){top=y-height;flippedY=true}
    if(top+height>viewHeight-margin)top=viewHeight-margin-height;
    if(top<margin)top=margin;
    return {left,top,maxHeight:height,scrolls:height<menuHeight,flippedX,flippedY};
  }

  function renderContextMenuList(){
    const list=$('context-menu-list');if(!list)return;
    const query=$(CONTEXT_MENU_SEARCH_ID)?.value||'';
    const visible=filterMenuItems(contextMenu.items,query,CONTEXT_MENU_SEARCH_ID);
    contextMenu.visibleIds=visible.map(item=>item.id);
    list.replaceChildren();
    visible.forEach((item,index)=>{
      const li=document.createElement('li');
      li.id=`context-menu-item-${item.id}`;
      li.className=`context-menu-item${item.destructive?' is-destructive':''}`;
      li.dataset.actionId=item.id;
      li.setAttribute('role','option');
      li.setAttribute('aria-selected',String(index===contextMenu.active));
      if(!item.enabled)li.setAttribute('aria-disabled','true');
      const label=document.createElement('span');
      label.className='context-menu-label';label.textContent=item.label;
      li.append(label);
      if(item.chord){
        li.setAttribute('aria-keyshortcuts',item.ariaShortcut);
        const keys=document.createElement('span');
        keys.className='context-menu-keys';
        /* Announced once, through aria-keyshortcuts above. The visible copy is decoration
         * of that fact, so it is hidden from the reading rather than repeated into it. */
        keys.setAttribute('aria-hidden','true');
        keys.textContent=item.shortcut;
        li.append(keys);
      }
      if(!item.enabled){
        const reason=document.createElement('span');
        reason.className='context-menu-reason';reason.textContent=item.unavailableReason;
        li.append(reason);
      }
      list.append(li);
    });
    if(visible.length===0){
      const empty=document.createElement('li');
      empty.className='context-menu-empty';empty.textContent=copyText('contextMenuNoMatch')||'Nothing here matches that.';
      list.append(empty);
    }
    if($('context-menu-count'))$('context-menu-count').textContent=menuResultSummary(visible.length,contextMenu.items.length,query);
    /* Written here as well as carrying its `data-copy` hook, and both are load-bearing:
     * the hook is what a language or funny-level change re-renders through applyCopy(),
     * and this call is what puts words in it the first time the menu is ever opened. */
    if($('context-menu-foot'))$('context-menu-foot').textContent=copyText('contextMenuHint');
    syncContextMenuActive();
  }

  function syncContextMenuActive(){
    const list=$('context-menu-list');if(!list)return;
    const options=[...(list.querySelectorAll?.('[data-action-id]')||[])];
    if(contextMenu.active>=options.length)contextMenu.active=options.length-1;
    options.forEach((node,index)=>node.setAttribute('aria-selected',String(index===contextMenu.active)));
    const input=$(CONTEXT_MENU_SEARCH_ID);
    if(!input)return;
    if(contextMenu.active>=0&&options[contextMenu.active])input.setAttribute('aria-activedescendant',options[contextMenu.active].id);
    else input.removeAttribute('aria-activedescendant');
  }

  function openContextMenu({element,x,y,opener}){
    ensureContextMenuUI();
    const menu=$('context-menu');if(!menu)return;
    contextMenu.ctx=contextMenuContext(element);
    contextMenu.items=menuItemsFor(contextMenu.ctx,navigator.platform);
    contextMenu.active=-1;
    contextMenu.opener=opener||element||null;
    contextMenu.open=true;
    const title=$('context-menu-title');
    if(title)title.textContent=contextMenu.ctx.name
      ? `Actions for “${contextMenu.ctx.name}”`
      : `Actions for this ${contextMenu.ctx.kind}`;
    const input=$(CONTEXT_MENU_SEARCH_ID);
    if(input)input.value='';
    menu.hidden=false;
    renderContextMenuList();
    renderModeStatus(CONTEXT_MENU_SEARCH_ID);
    positionContextMenu(x,y);
    applyVocabulary();
    input?.focus?.();
  }

  function positionContextMenu(x,y){
    const menu=$('context-menu');if(!menu||!menu.style)return;
    const box=menu.getBoundingClientRect?.()||{width:CONTEXT_MENU_WIDTH,height:CONTEXT_MENU_MIN_HEIGHT};
    const placed=clampMenuPosition({
      x:Number(x)||0,y:Number(y)||0,
      menuWidth:box.width||CONTEXT_MENU_WIDTH,
      menuHeight:box.height||CONTEXT_MENU_MIN_HEIGHT,
      viewWidth:window.innerWidth||0,viewHeight:window.innerHeight||0,
    });
    menu.style.left=`${placed.left}px`;
    menu.style.top=`${placed.top}px`;
    menu.style.maxHeight=`${placed.maxHeight}px`;
  }

  function closeContextMenu({restoreFocus=true}={}){
    const menu=$('context-menu');
    if(menu)menu.hidden=true;
    const opener=contextMenu.opener;
    contextMenu.open=false;contextMenu.visibleIds=[];contextMenu.active=-1;contextMenu.opener=null;
    if(restoreFocus)opener?.focus?.();
  }

  function activateContextMenuItem(id){
    const item=contextMenu.items.find(entry=>entry.id===id);
    if(!item||!item.enabled)return;
    const action=MENU_ACTIONS.find(entry=>entry.id===id);
    const ctx=contextMenu.ctx;
    closeContextMenu({restoreFocus:false});
    action?.run(ctx);
  }

  function moveContextMenuActive(step){
    const options=[...($('context-menu-list')?.querySelectorAll?.('[data-action-id]')||[])];
    if(options.length===0)return;
    const next=contextMenu.active<0?(step>0?0:options.length-1):contextMenu.active+step;
    contextMenu.active=Math.max(0,Math.min(options.length-1,next));
    syncContextMenuActive();
  }

  function onContextMenuKeydown(event){
    if(!contextMenu.open)return;
    const key=String(event.key||'');
    if(key==='ArrowDown'){event.preventDefault();moveContextMenuActive(1);return}
    if(key==='ArrowUp'){event.preventDefault();moveContextMenuActive(-1);return}
    if(key==='Home'){event.preventDefault();contextMenu.active=0;syncContextMenuActive();return}
    if(key==='End'){event.preventDefault();contextMenu.active=contextMenu.visibleIds.length-1;syncContextMenuActive();return}
    if(key==='Enter'){
      const id=contextMenu.visibleIds[contextMenu.active];
      if(id){event.preventDefault();activateContextMenuItem(id)}
      return;
    }
    if(key==='Escape'){
      event.preventDefault();
      const input=$(CONTEXT_MENU_SEARCH_ID);
      /* Escape clears the filter first and closes only on the second press. Somebody who
       * has typed four letters into the wrong filter wants those four letters gone, not
       * the whole menu -- and the menu is one keystroke away either way. */
      if(input&&input.value){input.value='';renderContextMenuList();return}
      closeContextMenu({restoreFocus:true});
    }
  }

  /** The element a chord is about: whatever the open menu is describing, else what has focus. */
  function chordContextElement(){
    if(contextMenu.open&&contextMenu.ctx)return contextMenu.ctx.element;
    return document.activeElement||document.body;
  }

  /**
   * The one live shortcut handler. It walks the same table the labels came from, so a
   * chord that is printed is a chord that is dispatched, and a chord that is removed
   * disappears from both halves in the same edit.
   */
  function contextMenuChordAction(event,items,menuState){
    for(const item of items){
      if(!item.chord||!chordMatches(item.chord,event))continue;
      if(!chordIsLive(item,menuState))return null;
      return item;
    }
    return null;
  }

  function handleContextMenuChord(event){
    /* Ctrl+Shift+F is bound by initNavigation(), which owns it and is covered by the
     * command-palette contract. Running it a second time here would call showModal() on
     * an already-open dialog, which throws -- so the table prints that chord and this
     * dispatcher does not claim it. A contract test evaluates initNavigation's own
     * literal condition against this chord, so the two cannot drift apart in silence. */
    const items=menuItemsFor(contextMenuContext(chordContextElement()),navigator.platform)
      .filter(item=>item.id!=='command-palette');
    const hit=contextMenuChordAction(event,items,{open:contextMenu.open,visibleIds:contextMenu.visibleIds});
    if(!hit)return false;
    event.preventDefault();
    if(contextMenu.open)activateContextMenuItem(hit.id);
    else MENU_ACTIONS.find(entry=>entry.id===hit.id)?.run(contextMenuContext(chordContextElement()));
    return true;
  }

  function openContextMenuForFocus(){
    const element=document.activeElement||document.body;
    const box=element?.getBoundingClientRect?.()||{left:CONTEXT_MENU_MARGIN,bottom:CONTEXT_MENU_MARGIN};
    openContextMenu({element,x:box.left,y:box.bottom,opener:element});
  }

  function initContextMenu(){
    ensureContextMenuUI();
    const menu=$('context-menu');if(!menu)return;
    $(CONTEXT_MENU_SEARCH_ID)?.addEventListener('input',()=>renderContextMenuList());
    menu.addEventListener('keydown',onContextMenuKeydown);
    $('context-menu-list')?.addEventListener('click',event=>{
      const option=event.target?.closest?.('[data-action-id]');
      if(option)activateContextMenuItem(option.dataset.actionId);
    });
    /* On `document`, so every rendered element genuinely has one -- rather than a list of
     * selectors that is correct on the day it is written and wrong by the next screen. */
    document.addEventListener('contextmenu',event=>{
      /* Shift+right-click keeps the browser's own menu. A page that takes the context
       * menu away entirely has taken away "copy image", "search for this", "view source"
       * and the reader's only escape hatch when ours is the wrong menu. */
      if(event.shiftKey)return;
      event.preventDefault();
      openContextMenu({element:event.target,x:event.clientX,y:event.clientY,opener:event.target});
    });
    document.addEventListener('keydown',event=>{
      if((String(event.key)==='F10'&&event.shiftKey)||String(event.key)==='ContextMenu'){
        event.preventDefault();openContextMenuForFocus();return;
      }
      handleContextMenuChord(event);
    });
    document.addEventListener('pointerdown',event=>{
      if(contextMenu.open){
        if(menu.contains?.(event.target))return;
        /* The regex builder opens as a modal over this menu; a click into it must not be
         * read as a click away from the menu that owns the field it is building for. */
        if($('regex-dialog')?.open)return;
        closeContextMenu({restoreFocus:false});
        return;
      }
      if(event.pointerType==='mouse')return;
      startLongPress(event);
    },true);
    ['pointerup','pointercancel','scroll'].forEach(type=>document.addEventListener(type,cancelLongPress,true));
    document.addEventListener('pointermove',event=>{
      if(!longPress.timer)return;
      if(Math.abs(event.clientX-longPress.x)>CONTEXT_MENU_LONG_PRESS_SLOP||Math.abs(event.clientY-longPress.y)>CONTEXT_MENU_LONG_PRESS_SLOP)cancelLongPress();
    },true);
  }

  /** Touch and pen get the same menu through a long press, because they have no right button. */
  let longPress={timer:null,x:0,y:0};
  function startLongPress(event){
    cancelLongPress();
    const {clientX:x,clientY:y,target}=event;
    longPress.x=x;longPress.y=y;
    longPress.timer=setTimeout(()=>{longPress.timer=null;openContextMenu({element:target,x,y,opener:target})},CONTEXT_MENU_LONG_PRESS_MS);
  }
  function cancelLongPress(){if(longPress.timer){clearTimeout(longPress.timer);longPress.timer=null}}

  function renderPalette(query=''){const list=$('palette-results');if(!list)return;const pages=[['Home','index.html'],['Product','product.html'],['Documentation','documentation.html'],['Converter','converter.html'],['Downloads','downloads.html'],['Status','status.html'],['Settings','settings.html']],items=[...pages,...DESTINATIONS.map(item=>[item.name,`documentation.html#destination-${item.id}`])].filter(([name])=>matchText(name,query,'palette-search'));list.innerHTML=items.length?items.map(([name,path])=>`<a class="palette-result" role="option" href="${BASE}${path}"><strong>${escapeHtml(name)}</strong><span>Open destination</span></a>`).join(''):'<p>No matching commands.</p>'}
  function openPalette(){const dialog=$('command-palette');if(!dialog)return;dialog.showModal();$('palette-search').value='';renderPalette();applyVocabulary();setTimeout(()=>$('palette-search').focus(),0)}
  let notifSeq=0;
  // `narration` is the words to speak, per language, and is deliberately a separate
  // argument rather than the title and body above: those have already been through
  // `applyVocabularyText` at every call site, and a network-backed voice would carry
  // a private replacement off this computer. It is narrated before the toast region
  // is looked for, because a page with no toast region still raised the event.
  function notify(title,body,narration){state.notifications.unshift({id:`n${Date.now()}-${notifSeq++}`,title,body,time:Date.now()});state.notifications=state.notifications.slice(0,30);save();renderNotifications($('notification-search')?.value||'');if(narration)narrate(narration.category||'notification',narrationTextFor(narration),{isError:Boolean(narration.isError)});const region=$('toast-region');if(!region)return;const toast=document.createElement('div');toast.className='toast';toast.innerHTML=`<div class="toast-text"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>`;setDialogDecoration(toast,messageBoxGlyph());region.append(toast);setTimeout(()=>toast.remove(),state.attention.extendedTimeouts?15000:5000)}

  // ---- Notification centre: real multi-select, bulk dismiss, and export. ----
  let notifSelection={anchor:undefined,selected:new Set()};
  let lastNotificationOrder=[];
  function ensureNotificationIds(){let changed=false;state.notifications.forEach((item,index)=>{if(!item.id){item.id=`n${item.time||Date.now()}-legacy${index}`;changed=true}});if(changed)save()}
  function notificationMatches(query){ensureNotificationIds();return state.notifications.filter(item=>matchText(`${item.title} ${item.body}`,query,'notification-search'))}
  function renderNotifications(query=''){
    if($('notification-count'))$('notification-count').textContent=state.notifications.length;
    if(!$('notification-history'))return;
    const matches=notificationMatches(query);
    lastNotificationOrder=matches.map(item=>item.id);
    // A selected id that no longer matches (or was dismissed) never lingers as a phantom count.
    notifSelection={anchor:notifSelection.anchor,selected:new Set([...notifSelection.selected].filter(id=>lastNotificationOrder.includes(id)))};
    $('notification-history').innerHTML=matches.length?matches.map(item=>`<article class="notice" data-notif-id="${item.id}"><input type="checkbox" aria-label="Select notification: ${escapeHtml(item.title)}" ${notifSelection.selected.has(item.id)?'checked':''}><div class="notice-body"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${new Date(item.time).toLocaleString()}</small></div></article>`).join(''):`<p>${escapeHtml(copyText('emptyNotifications'))}</p>`;
    applyVocabulary();
    updateNotificationSelectionUI();
    updateNotificationExportFormats();
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
      notify('Notifications exported',applyVocabularyText(`Exported ${rows.length} selected notification${rows.length===1?'':'s'} as ${format.toUpperCase()}.`),{category:'export',en:`Exported ${rows.length} selected notification${rows.length===1?'':'s'} as ${format.toUpperCase()}.`,zh:`已經匯出 ${rows.length} 條揀咗嘅通知，格式係 ${format.toUpperCase()}。`});
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

  // ============================================================================
  // Changelog viewer.
  //
  // The grammar is the one `app/renderer/src/changelog.ts` already parses, and it is
  // ported rather than reinvented so the site and the desktop renderer cannot come to
  // read the same generated Markdown differently:
  //
  //     ## <version> — <ISO date>
  //     ### <Category>
  //     - <summary> (<40-hex commit>)
  //
  // A line that looks like it belongs to that grammar and does not fully match is
  // COUNTED as skipped rather than thrown away in silence. That count is shown. A
  // viewer that quietly drops half its input looks exactly like one reading a short
  // release history, which is the failure worth saying out loud.
  // ============================================================================
  const CHANGELOG_SHA40 = /^[0-9a-fA-F]{40}$/;
  const CHANGELOG_VERSION_HEADING = /^##\s+(\S+)\s+[—-]\s+(\d{4}-\d{2}-\d{2})\s*$/;
  const CHANGELOG_CATEGORY_HEADING = /^###\s+(.+?)\s*$/;
  const CHANGELOG_CHANGE_ITEM = /^-\s+(.+?)\s+\(([0-9a-fA-F]{40})\)\s*$/;
  const CHANGELOG_DEFAULT_CATEGORY = 'General';
  const CHANGELOG_PRESETS = {all:'Every version',year:'This calendar year',d90:'Last 90 days',d30:'Last 30 days',d7:'Last 7 days'};

  function parseChangelog(markdown){
    const lines=String(markdown||'').split(/\r\n|\n|\r/);
    const entries=[];
    let skipped=0,current=null,category=CHANGELOG_DEFAULT_CATEGORY;
    const flush=()=>{if(current)entries.push(current)};
    for(const raw of lines){
      const line=raw.replace(/\s+$/,'');
      if(line.trim()==='')continue;
      const version=CHANGELOG_VERSION_HEADING.exec(line);
      if(version){flush();current={version:version[1],date:version[2],changes:[]};category=CHANGELOG_DEFAULT_CATEGORY;continue}
      if(line.startsWith('## ')){skipped+=1;continue}
      const heading=CHANGELOG_CATEGORY_HEADING.exec(line);
      if(heading){if(!current){skipped+=1;continue}category=heading[1];continue}
      if(line.startsWith('- ')){
        const change=CHANGELOG_CHANGE_ITEM.exec(line);
        if(!change||!current){skipped+=1;continue}
        current.changes.push({category,summary:change[1],commit:change[2]});
        continue;
      }
      skipped+=1;
    }
    flush();
    return {entries,skipped};
  }

  /**
   * A browsable URL for one commit, or '' when no link can honestly be built.
   *
   * Empty rather than a guess in both refusing cases: an id that is not exactly 40
   * hexadecimal characters, and a build that never resolved the repository. The caller
   * renders the id as plain text instead, because a fact with no link beside it is
   * worth more than a link that goes nowhere.
   */
  function changelogCommitUrl(commit,repository){
    if(!CHANGELOG_SHA40.test(String(commit||'')))return '';
    const base=String(repository||'').trim();
    if(!/^https:\/\/\S+$/.test(base))return '';
    return `${base.replace(/\/+$/,'')}/commit/${commit}`;
  }

  /** Entries whose date falls inside an inclusive ISO range; an absent bound is open. */
  function changelogFilterByDate(entries,from,to){
    return entries.filter(entry=>{
      if(from&&entry.date<from)return false;
      if(to&&entry.date>to)return false;
      return true;
    });
  }

  /**
   * Search a version and every one of its change lines, through the same `matchText`
   * every other search field on this site uses -- so plain text stays the default and
   * the anchored regular-expression builder attached to `changelog-search` applies here
   * exactly as it does everywhere else.
   */
  function changelogSearch(entries,query){
    return entries.filter(entry=>matchText(
      `${entry.version} ${entry.changes.map(change=>`${change.category} ${change.summary}`).join(' ')}`,
      query,'changelog-search'));
  }

  /** "2026-08-24 to 2026-08-26", or the single date, or an honest empty statement. */
  function changelogRangeLabel(entries){
    if(!entries.length)return 'no entries';
    const dates=entries.map(entry=>entry.date).slice().sort();
    const first=dates[0],last=dates[dates.length-1];
    return first===last?first:`${first} to ${last}`;
  }

  /**
   * One flat row per change, for the site's ordinary ten-format export engine.
   *
   * `exportedRange` repeats on every row deliberately. The canonical contract asks the
   * export to state its own range inside the file, and every one of these ten formats
   * is a flat table: a single metadata row carrying different keys would make the whole
   * set ragged, which five of the formats would then correctly report as a real loss.
   * A repeated column costs bytes and says the same thing in CSV, JSON and SQL alike.
   */
  function changelogExportRows(entries){
    const range=changelogRangeLabel(entries);
    const rows=[];
    for(const entry of entries){
      for(const change of entry.changes){
        rows.push({
          version:entry.version,date:entry.date,category:change.category,summary:change.summary,
          commit:change.commit,commitUrl:changelogCommitUrl(change.commit,CHANGELOG_REPOSITORY_URL),
          exportedRange:range,
        });
      }
    }
    return rows;
  }

  /**
   * The two date bounds, plus whatever the fields are refusing to interpret.
   *
   * A native date field answers a half-typed date with an empty `value` and a true
   * `validity.badInput`. Reading only the value would silently widen the filter back to
   * everything while the person is still looking at what they typed, so `badInput` is
   * read and reported and the field is never written to -- the typed characters stay.
   */
  function changelogDateBounds(){
    const read=id=>{
      const field=$(id);
      if(!field)return {value:'',bad:false};
      return {value:field.value||'',bad:Boolean(field.validity&&field.validity.badInput)};
    };
    const from=read('changelog-date-from'),to=read('changelog-date-to');
    const problems=[];
    if(from.bad)problems.push('The “from” date is incomplete, so it is being ignored. What you typed has been left alone.');
    if(to.bad)problems.push('The “to” date is incomplete, so it is being ignored. What you typed has been left alone.');
    if(!from.bad&&!to.bad&&from.value&&to.value&&from.value>to.value){
      problems.push(`The “from” date (${from.value}) is after the “to” date (${to.value}), so no version can fall between them.`);
    }
    return {from:from.value,to:to.value,problems};
  }

  /** Writes the two date fields from a named preset. 'all' clears both. */
  function changelogPresetRange(preset,today){
    const day=86400000;
    const end=today.toISOString().slice(0,10);
    if(preset==='all')return {from:'',to:''};
    if(preset==='year')return {from:`${today.getUTCFullYear()}-01-01`,to:end};
    const days={d7:7,d30:30,d90:90}[preset];
    if(!days)return undefined;
    return {from:new Date(today.getTime()-(days-1)*day).toISOString().slice(0,10),to:end};
  }

  function changelogVisibleEntries(query){
    const parsed=parseChangelog(CHANGELOG_MARKDOWN);
    const bounds=changelogDateBounds();
    const dated=changelogFilterByDate(parsed.entries,bounds.from,bounds.to);
    return {...parsed,bounds,matches:changelogSearch(dated,query)};
  }

  function changelogEntryMarkup(entry){
    const byCategory=new Map();
    for(const change of entry.changes){
      if(!byCategory.has(change.category))byCategory.set(change.category,[]);
      byCategory.get(change.category).push(change);
    }
    const groups=[...byCategory.entries()].map(([category,changes])=>
      `<h4>${escapeHtml(category)}</h4><ul>${changes.map(change=>{
        const url=changelogCommitUrl(change.commit,CHANGELOG_REPOSITORY_URL);
        const short=escapeHtml(change.commit.slice(0,10));
        const link=url
          ?`<a class="changelog-commit mono" href="${escapeHtml(url)}" rel="noopener noreferrer">${short}</a>`
          :`<span class="changelog-commit mono" title="No repository URL was resolved at build time, so this id is shown without a link.">${short}</span>`;
        return `<li>${escapeHtml(change.summary)} ${link}</li>`;
      }).join('')}</ul>`).join('');
    const body=entry.changes.length?groups:'<p class="empty-state">No changes were recorded against this version.</p>';
    return `<article class="changelog-entry" data-version="${escapeHtml(entry.version)}">`
      +`<header><h3>${escapeHtml(entry.version)}</h3><time datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date)}</time></header>`
      +`${body}</article>`;
  }

  function renderChangelog(query=''){
    const list=$('changelog-entries');if(!list)return;
    const {entries,skipped,bounds,matches}=changelogVisibleEntries(query);
    if(!CHANGELOG_MARKDOWN){
      list.innerHTML='<p class="empty-state">No release history was resolved for this build, so none is shown. '
        +'This page carries the changelog its own build injected; a page served straight from the source directory has none.</p>';
    }else{
      list.innerHTML=matches.length
        ?matches.map(changelogEntryMarkup).join('')
        :'<p class="empty-state">No version matches the current search and date range. Widen the dates or clear the search.</p>';
    }
    const changes=matches.reduce((total,entry)=>total+entry.changes.length,0);
    if($('changelog-count')){
      $('changelog-count').textContent=entries.length
        ?`${matches.length} of ${entries.length} version${entries.length===1?'':'s'} · ${changes} change${changes===1?'':'s'} · ${changelogRangeLabel(matches)}`
        :'No versions are available in this build.';
    }
    if($('changelog-problems')){
      const notes=[...bounds.problems];
      if(skipped>0)notes.push(`${skipped} line${skipped===1?'':'s'} of the release history did not match the changelog grammar and ${skipped===1?'was':'were'} not shown.`);
      // Said once, in words, rather than only in a tooltip on each id. A `title` is
      // reachable with a pointer and by nothing else, so on its own it would leave a
      // keyboard or screen-reader reader looking at unlinked ids with no explanation.
      if(CHANGELOG_MARKDOWN&&!changelogCommitUrl('0'.repeat(40),CHANGELOG_REPOSITORY_URL)){
        notes.push('This build resolved no repository, so each commit id is shown as text rather than as a link.');
      }
      $('changelog-problems').textContent=notes.join(' ');
    }
    updateChangelogExport(matches);
    applyVocabulary();
  }

  function updateChangelogExport(matches){
    const select=$('changelog-export-format');if(!select)return;
    const rows=changelogExportRows(matches),formats=suitableFormats(rows),previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    if(formats.includes(previous))select.value=previous;
    if($('changelog-export-loss')){
      $('changelog-export-loss').textContent=rows.length
        ?describeLoss(rows,select.value||formats[0]).join(' ')
        :'Nothing is currently shown, so there is nothing to export.';
    }
  }

  function changelogExportText(){
    const query=$('changelog-search')?.value||'';
    const {matches}=changelogVisibleEntries(query);
    const rows=changelogExportRows(matches);
    if(!rows.length)return undefined;
    const format=$('changelog-export-format')?.value||'json';
    return {rows,format,range:changelogRangeLabel(matches),text:exportRows({rows,format,table:'changelog'})};
  }

  function initChangelog(){
    if(!$('changelog-entries'))return;
    const rerender=()=>renderChangelog($('changelog-search')?.value||'');
    $('changelog-search')?.addEventListener('input',rerender);
    $('changelog-date-from')?.addEventListener('input',rerender);
    $('changelog-date-to')?.addEventListener('input',rerender);
    $('changelog-export-format')?.addEventListener('change',rerender);
    $('changelog-date-preset')?.addEventListener('change',event=>{
      const range=changelogPresetRange(event.target.value,new Date());
      if(!range)return;
      if($('changelog-date-from'))$('changelog-date-from').value=range.from;
      if($('changelog-date-to'))$('changelog-date-to').value=range.to;
      rerender();
    });
    $('changelog-export')?.addEventListener('click',()=>{
      const result=changelogExportText();if(!result)return;
      download(exportFilename('ding-pbx-changelog',result.format,result.range.split(' ').join('-')),result.text,EXPORT_MIME[result.format]);
      notify('Changelog exported',applyVocabularyText(`Exported ${result.rows.length} change${result.rows.length===1?'':'s'} covering ${result.range} as ${result.format.toUpperCase()}.`),{category:'export',en:`Exported ${result.rows.length} change${result.rows.length===1?'':'s'} as ${result.format.toUpperCase()}.`,zh:`已經匯出 ${result.rows.length} 項變更，格式係 ${result.format.toUpperCase()}。`});
    });
    $('changelog-copy')?.addEventListener('click',()=>{
      const result=changelogExportText();if(!result)return;
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(result.text).catch(()=>{});
      notify('Changelog copied',applyVocabularyText(`Copied ${result.rows.length} change${result.rows.length===1?'':'s'} covering ${result.range} as ${result.format.toUpperCase()}.`),{category:'export',en:`Copied ${result.rows.length} change${result.rows.length===1?'':'s'} to the clipboard as ${result.format.toUpperCase()}.`,zh:`已經複製 ${result.rows.length} 項變更去剪貼簿，格式係 ${result.format.toUpperCase()}。`});
    });
    rerender();
  }

  // ---- Local history panel: search, an action filter derived from the real
  // recorded actions (never a hard-coded list), and a date-range filter. ----
  function snapshotState(){const clone=JSON.parse(JSON.stringify(state));delete clone.notifications;return clone}
  function recordHistory(action,summary){
    historyEntries.unshift({id:`h${Date.now()}-${historySeq++}`,time:Date.now(),action,summary,snapshot:snapshotState()});
    historyEntries=historyEntries.slice(0,HISTORY_LIMIT);
    saveHistory();
    renderHistory($('history-search')?.value||'');
  }
  function restoreHistoryEntry(id){
    const entry=historyEntries.find(item=>item.id===id);if(!entry)return;
    Object.assign(state,entry.snapshot);
    state.attention={...DEFAULTS.attention,...(entry.snapshot.attention||{})};
    state.collapsed={...DEFAULTS.collapsed,...(entry.snapshot.collapsed||{})};
    save();applyState();
    // Restoring is itself a NEW entry -- it never rewrites or removes the
    // revision it restored, so this restore can be undone later too.
    recordHistory('restored',`Restored the revision from ${new Date(entry.time).toLocaleString()} (${entry.summary})`);
    notify('Local history restored',applyVocabularyText('This browser’s settings were replaced with an earlier local revision. The restore itself was recorded as a new history entry.'),{category:'setting',en:'Local history restored. This browser’s settings were replaced with an earlier local revision.',zh:'已經還原本機紀錄。呢個瀏覽器嘅設定換咗做早前一個版本。'});
  }
  function historyActionOptions(){return [...new Set(historyEntries.map(item=>item.action))].sort()}
  function historyMatches(query){
    const actionFilter=$('history-action-filter')?.value||'';
    const fromRaw=$('history-date-from')?.value||'';
    const toRaw=$('history-date-to')?.value||'';
    const from=fromRaw?new Date(`${fromRaw}T00:00:00`).getTime():-Infinity;
    const to=toRaw?new Date(`${toRaw}T23:59:59.999`).getTime():Infinity;
    return historyEntries.filter(item=>{
      if(actionFilter&&item.action!==actionFilter)return false;
      if(!Number.isNaN(from)&&item.time<from)return false;
      if(!Number.isNaN(to)&&item.time>to)return false;
      return matchText(`${item.action} ${item.summary}`,query,'history-search');
    });
  }
  function renderHistory(query=''){
    const list=$('history-list');if(!list)return;
    const select=$('history-action-filter');
    if(select){
      const previous=select.value;
      select.innerHTML=`<option value="">All actions</option>${historyActionOptions().map(action=>`<option value="${escapeHtml(action)}">${escapeHtml(action)}</option>`).join('')}`;
      if([...select.options].some(option=>option.value===previous))select.value=previous;
    }
    const matches=historyMatches(query);
    list.innerHTML=matches.length?matches.map(item=>`<article class="history-entry" data-history-id="${item.id}"><div><strong>${escapeHtml(item.action)}</strong><p>${escapeHtml(item.summary)}</p><small>${new Date(item.time).toLocaleString()}</small></div><button type="button" class="text-button" data-restore="${item.id}">Restore</button></article>`).join(''):`<p class="empty-state">No local history entries yet -- change a setting on this page to create the first one.</p>`;
    if($('history-count'))$('history-count').textContent=`${matches.length} of ${historyEntries.length} entr${historyEntries.length===1?'y':'ies'}`;
    applyVocabulary();
  }
  function initHistory(){
    if(!$('history-open'))return;
    $('history-open').addEventListener('click',()=>{const dialog=$('history-dialog');if(!dialog)return;dialog.showModal();renderHistory($('history-search')?.value||'')});
    $('history-search')?.addEventListener('input',event=>renderHistory(event.target.value));
    $('history-action-filter')?.addEventListener('change',()=>renderHistory($('history-search')?.value||''));
    $('history-date-from')?.addEventListener('change',()=>renderHistory($('history-search')?.value||''));
    $('history-date-to')?.addEventListener('change',()=>renderHistory($('history-search')?.value||''));
    $('history-list')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-restore]');if(!button)return;
      restoreHistoryEntry(button.dataset.restore);
    });
  }

  // ---- "Reset settings" destructive gate: two independently operated key
  // controls must both be active before the full-range slider is even
  // enabled, and only completing the slider all the way to the end runs the
  // reset. Cancel is always available (button, ×, and native Escape); every
  // close path -- confirm, cancel, or Escape -- resets the dialog's own
  // fields and returns focus to the control that opened it. ----
  function resetConfirmReady(){return Boolean($('reset-key-1')?.checked&&$('reset-key-2')?.checked)}
  function resetConfirmFields(){
    const dialog=$('reset-confirm-dialog');if(!dialog)return;
    dialog.querySelectorAll('input[type="checkbox"]').forEach(box=>{box.checked=false});
    const slider=$('reset-confirm-slider');
    if(slider){slider.value='0';slider.disabled=true}
    if($('reset-slider-status'))$('reset-slider-status').textContent='0%';
  }
  function updateResetSliderState(){
    const slider=$('reset-confirm-slider');if(!slider)return;
    const ready=resetConfirmReady();
    slider.disabled=!ready;
    if(!ready){slider.value='0';if($('reset-slider-status'))$('reset-slider-status').textContent='0%'}
  }
  function performSettingsReset(){
    Object.assign(state,DEFAULTS);
    save();
    // A reset turns narration off, so it stops speaking now rather than at the end of
    // whichever sentence it happened to be in the middle of.
    narrationSilence();
    applyState();
    recordHistory('reset','Every local setting on this page returned to its shipped default.');
    notify(copyText('notifSettingsReset'),applyVocabularyText('The local page settings returned to their shipped values.'),{category:'setting',copyKey:'notifSettingsReset'});
  }
  function initResetConfirm(){
    const dialog=$('reset-confirm-dialog');if(!dialog)return;
    resetConfirmFields();
    $('reset-key-1')?.addEventListener('change',updateResetSliderState);
    $('reset-key-2')?.addEventListener('change',updateResetSliderState);
    $('reset-confirm-slider')?.addEventListener('input',event=>{
      const value=Number(event.target.value);
      if($('reset-slider-status'))$('reset-slider-status').textContent=`${value}%`;
      if(value>=100&&resetConfirmReady()){performSettingsReset();dialog.close()}
    });
    $('reset-confirm-cancel')?.addEventListener('click',()=>dialog.close('cancel'));
    // Fires for every close path -- the Cancel button, the × control, and the
    // dialog's native Escape handling -- so the gate can never be left
    // half-armed for the next time it opens.
    dialog.addEventListener('close',()=>{resetConfirmFields();$('settings-reset')?.focus()});
  }

  // ============================================================================
  // Long-operation progress -- the export-everything run.
  //
  // The canonical contract is about one shape: an operation started from a dialog
  // reports its own progress inside that dialog rather than spinning, because a
  // spinner and a hang look identical from the outside. Two properties carry it,
  // and both are here rather than one of them. The submitting control is disabled
  // for the whole run AND the handler refuses a second entry, since a keyboard
  // submit walks straight past a disabled button. And expensive optional work is
  // offered as a choice, shown only where it is relevant, saying plainly what
  // declining leaves undone.
  //
  // The operation this site genuinely has is exporting every record set it owns,
  // and being honest about its size matters more than the feature does. On a
  // browser holding four notifications it finishes in milliseconds. What makes the
  // report worth having anyway is that the unit count has no upper bound -- the
  // changelog gains a version every time this site is published -- so a run that is
  // instant today is not instant forever, and a surface that only spun would have
  // no way to say which of its files had already been written when somebody
  // cancelled it halfway.
  //
  // A unit is one record set, and its conversion is a single synchronous call into
  // the shared export engine. Cancelling therefore lands BETWEEN units and never
  // inside one, which is exactly why a cancelled run can name the files it already
  // wrote instead of claiming nothing happened.
  // ============================================================================
  const EXPORT_EVERYTHING_UNITS=[
    {id:'settings',label:'Local settings',base:'ding-pbx-page-settings',table:'setting',optional:false},
    {id:'destinations',label:'Destination catalogue',base:'ding-pbx-destinations',table:'destination',optional:false},
    {id:'notifications',label:'Notification history',base:'ding-pbx-notifications',table:'notification',optional:false},
    {id:'history',label:'Local settings history',base:'ding-pbx-local-history',table:'history',optional:false},
    {id:'changelog',label:'Changelog',base:'ding-pbx-changelog',table:'changelog',optional:true,
      decline:'The changelog is the only record set here with no upper bound: it gains a version every time this site is published, and it is the one that makes this run take measurable time. Leaving it out finishes sooner, and leaves every released version, its date, its categories and its commit ids out of what you take away.'}
  ];

  /**
   * One `{setting, value}` row per leaf, dotted path, scalar value.
   *
   * Flat on purpose. Every one of the ten export formats here is a flat table, and
   * handing the nested settings object straight to them would make five of them
   * correctly report a real loss on data that did not have to be nested at all.
   */
  function flattenSettingRows(value,prefix){
    const rows=[];
    for(const[key,inner]of Object.entries(value||{})){
      const path=prefix?`${prefix}.${key}`:key;
      if(inner&&typeof inner==='object'&&!Array.isArray(inner)){rows.push(...flattenSettingRows(inner,path));continue}
      rows.push({setting:path,value:Array.isArray(inner)?inner.join(', '):String(inner)});
    }
    return rows;
  }

  function exportEverythingRows(id){
    switch(id){
      /* snapshotState() has already dropped the notification array, which is this
       * run's own third unit and would otherwise be exported twice; the uploaded
       * personal vocabulary was never in `state` at all, so neither can arrive here
       * by accident. */
      case 'settings':return flattenSettingRows(snapshotState(),'');
      /* The catalogue's icon glyph is deliberately not a column. It is chrome for a
       * navigation rail rather than a fact about a destination, and a column of
       * glyphs in a CSV is noise a reader has to scroll past. */
      case 'destinations':return DESTINATIONS.map(item=>({id:item.id,name:item.name,group:item.group,article:item.article,description:item.description}));
      case 'notifications':return state.notifications.map(item=>({id:item.id,title:item.title,body:item.body,time:new Date(item.time).toISOString()}));
      case 'history':return historyEntries.map(item=>({id:item.id,time:new Date(item.time).toISOString(),action:item.action,summary:item.summary}));
      case 'changelog':return changelogExportRows(parseChangelog(CHANGELOG_MARKDOWN).entries);
      default:throw new Error(`Unknown export unit: ${id}`);
    }
  }

  /** How many rows each unit would contribute, read before anything is written. */
  function exportEverythingCounts(){
    const counts={};
    for(const unit of EXPORT_EVERYTHING_UNITS)counts[unit.id]=exportEverythingRows(unit.id).length;
    return counts;
  }

  /**
   * What this run would do, decided before it starts and reported before it starts.
   *
   * Pure, and the reason it is pure is that every sentence the dialog shows about
   * the run -- and the bound the progress bar counts against -- comes out of here,
   * so the plan a person reads and the work that then happens cannot disagree.
   */
  function planExportEverything(options){
    const includeChangelog=Boolean(options&&options.includeChangelog);
    const counts=(options&&options.counts)||{};
    const included=[],skipped=[];
    for(const unit of EXPORT_EVERYTHING_UNITS){
      const rows=Number(counts[unit.id])||0;
      if(rows===0){skipped.push({...unit,rows:0,reason:`${unit.label} has no rows in this browser yet, so no file is written for it.`});continue}
      if(unit.optional&&!includeChangelog){skipped.push({...unit,rows,reason:`${unit.label} was declined. Its ${rows} rows are left out of this export.`});continue}
      included.push({...unit,rows});
    }
    return {included,skipped,totalUnits:included.length,totalRows:included.reduce((sum,unit)=>sum+unit.rows,0)};
  }

  /**
   * One format is chosen for the whole run, so the list offered is an intersection.
   *
   * A format that suits four record sets and damages the fifth would damage the
   * fifth silently, since each file is written on its own and nothing afterwards
   * compares them. With nothing included there is nothing to narrow against, so the
   * ordinary full list is offered rather than an empty select nobody can use.
   */
  function exportEverythingFormats(plan){
    if(!plan||!plan.included.length)return EXPORT_FORMATS.slice();
    let allowed=null;
    for(const unit of plan.included){
      const formats=suitableFormats(exportEverythingRows(unit.id));
      allowed=allowed===null?formats:allowed.filter(format=>formats.includes(format));
    }
    return allowed||[];
  }

  function summariseExportEverythingPlan(plan,format){
    const head=plan.totalUnits===0
      ?'Nothing would be written: every record set on this page is either empty or declined.'
      :`${plan.totalUnits} file${plan.totalUnits===1?'':'s'} will be written as ${String(format||'').toUpperCase()}, covering ${plan.totalRows} row${plan.totalRows===1?'':'s'}: ${plan.included.map(unit=>`${unit.label} (${unit.rows})`).join(', ')}.`;
    if(!plan.skipped.length)return head;
    return `${head} ${plan.skipped.map(unit=>unit.reason).join(' ')}`;
  }

  /**
   * The progress sentence. It names the unit running, the count done, and -- when a
   * run stopped early -- the files that were already written.
   *
   * It sits beside the bar rather than instead of it. A bar alone is a status
   * nobody can read out and a screen reader gets only a percentage from, so the two
   * halves of this report say the same thing in two forms.
   */
  function exportEverythingProgressLine(run){
    const written=run.written.length?` Already written: ${run.written.join(', ')}.`:' No file was written.';
    switch(run.state){
      case 'idle':return 'Not started. Nothing has been written.';
      /* Two running lines rather than one, because the index and the name have to
       * agree. A single line carrying both while a unit has just finished says
       * "writing 3 of 5" beside the name of the record set that finished second, which
       * is an off-by-one nobody reads as one -- it simply looks like the report naming
       * the wrong thing. Between units there is no unit to name, so it does not name
       * one. */
      case 'running':return run.current
        ?`Writing ${run.done+1} of ${run.total}: ${run.current} (${run.currentRows} rows). ${run.rowsDone} of ${run.rowsTotal} rows done.`
        :`${run.done} of ${run.total} written, ${run.rowsDone} of ${run.rowsTotal} rows done.`;
      case 'cancelled':return `Cancelled after ${run.done} of ${run.total}.${written}`;
      case 'failed':return `Stopped after ${run.done} of ${run.total}: ${run.reason}.${written}`;
      case 'done':return `Finished. ${run.done} of ${run.total} written, ${run.rowsDone} rows.${written}`;
      default:return '';
    }
  }

  /** Exactly which condition is unmet, or '' when the control is genuinely usable. */
  function exportEverythingStartDisabledReason(run,plan){
    if(run.state==='running')return 'An export is already running. Wait for it to finish, or cancel it.';
    if(!plan||plan.totalUnits===0)return 'Nothing is selected to write: every record set on this page is either empty or declined.';
    return '';
  }

  let exportRun={state:'idle',total:0,done:0,rowsTotal:0,rowsDone:0,current:'',currentRows:0,written:[],reason:'',cancelRequested:false,refusedReentry:0};

  /**
   * One turn of the event loop between units.
   *
   * This is what keeps the page answering while a run is in flight, and it is where
   * a cancel actually lands: without it the whole run would be one synchronous
   * block, the cancel control could never be reached, and the difference between a
   * progress report and a freeze would be decoration.
   */
  function operationYield(){return new Promise(resolve=>{setTimeout(resolve,0)})}

  function renderExportEverything(){
    const start=$('export-everything-start');
    if(!start)return;
    const running=exportRun.state==='running';
    const counts=exportEverythingCounts();
    const optional=$('export-everything-changelog');
    const plan=planExportEverything({includeChangelog:optional?optional.checked:true,counts});
    const format=$('export-everything-format')?.value||'json';

    const planLine=$('export-everything-plan');
    if(planLine)planLine.textContent=applyVocabularyText(summariseExportEverythingPlan(plan,format));

    const bar=$('export-everything-progress');
    if(bar){
      /* Real counts, never an indeterminate bar. `max` is the number of units this
       * run will actually write and `value` is the number it has written; a bar
       * with no maximum is precisely the spinner this contract refuses. */
      bar.max=exportRun.total||plan.totalUnits||1;
      bar.value=exportRun.done;
    }
    const text=$('export-everything-progress-text');
    if(text)text.textContent=applyVocabularyText(exportEverythingProgressLine(exportRun));

    const why=exportEverythingStartDisabledReason(exportRun,plan);
    start.disabled=Boolean(why);
    if(why)start.setAttribute('title',why);else start.removeAttribute('title');
    const reason=$('export-everything-disabled-reason');
    if(reason)reason.textContent=why;

    const cancel=$('export-everything-cancel');
    if(cancel){
      cancel.disabled=!running;
      if(running)cancel.removeAttribute('title');else cancel.setAttribute('title','There is no export running to cancel.');
    }
    const formatSelect=$('export-everything-format');
    if(formatSelect)formatSelect.disabled=running;
    if(optional)optional.disabled=running;

    /* The choice is offered only where it is relevant. On a build carrying no
     * changelog there is nothing expensive to decline, and a checkbox offering to
     * leave out something that does not exist is a question with one answer. */
    const optionalRow=$('export-everything-optional');
    if(optionalRow)optionalRow.hidden=counts.changelog===0;
    const declineLine=$('export-everything-decline');
    if(declineLine)declineLine.textContent=counts.changelog===0
      ?''
      :applyVocabularyText(EXPORT_EVERYTHING_UNITS.find(unit=>unit.id==='changelog').decline);

    const refused=$('export-everything-reentry');
    if(refused)refused.textContent=exportRun.refusedReentry
      ?`${exportRun.refusedReentry} further start request${exportRun.refusedReentry===1?' was':'s were'} refused while an export was already running.`
      :'';
  }

  function updateExportEverythingFormats(){
    const select=$('export-everything-format');if(!select)return;
    const optional=$('export-everything-changelog');
    const plan=planExportEverything({includeChangelog:optional?optional.checked:true,counts:exportEverythingCounts()});
    const formats=exportEverythingFormats(plan),previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    select.value=formats.includes(previous)?previous:(formats[0]||'');
  }

  function cancelExportEverything(){
    if(exportRun.state!=='running')return false;
    exportRun={...exportRun,cancelRequested:true};
    renderExportEverything();
    return true;
  }

  async function runExportEverything(options){
    const format=(options&&options.format)||'json';
    const includeChangelog=Boolean(options&&options.includeChangelog);
    if(exportRun.state==='running'){
      /* The disabled button is the visible guard and never the real one. A keyboard
       * submit, a second click landing in the same frame, or anything calling this
       * directly walks straight past `disabled`, so the refusal is here as well --
       * counted, and shown, rather than swallowed. */
      exportRun={...exportRun,refusedReentry:exportRun.refusedReentry+1};
      renderExportEverything();
      return {started:false,reason:'an export is already running'};
    }
    const plan=planExportEverything({includeChangelog,counts:exportEverythingCounts()});
    if(plan.totalUnits===0){
      exportRun={...exportRun,state:'failed',total:0,done:0,rowsTotal:0,rowsDone:0,current:'',currentRows:0,written:[],reason:'nothing was selected to write',cancelRequested:false};
      renderExportEverything();
      return {started:false,reason:'nothing to write',plan};
    }
    exportRun={state:'running',total:plan.totalUnits,done:0,rowsTotal:plan.totalRows,rowsDone:0,
      current:'',currentRows:0,written:[],reason:'',
      cancelRequested:false,refusedReentry:exportRun.refusedReentry};
    renderExportEverything();
    for(const unit of plan.included){
      if(exportRun.cancelRequested){
        exportRun={...exportRun,state:'cancelled',current:'',currentRows:0};
        renderExportEverything();
        return {started:true,cancelled:true,written:exportRun.written.slice(),plan};
      }
      exportRun={...exportRun,current:unit.label,currentRows:unit.rows};
      renderExportEverything();
      /* Announce the record set, THEN give the browser a turn, THEN do the work. The
       * other order writes the sentence and overwrites it inside one synchronous block
       * with no paint between, so the name is never seen at all and the page appears to
       * freeze on whatever the previous line said -- which is the exact "a spinner and
       * a hang look identical" failure, with a sentence instead of a spinner. */
      await operationYield();
      /* And a cancel pressed while that line was up is honoured before the work rather
       * than after it, since that window is precisely when somebody reads the name and
       * decides they did not want it. */
      if(exportRun.cancelRequested){
        exportRun={...exportRun,state:'cancelled',current:'',currentRows:0};
        renderExportEverything();
        return {started:true,cancelled:true,written:exportRun.written.slice(),plan};
      }
      let name;
      try{
        const rows=exportEverythingRows(unit.id);
        name=exportFilename(unit.base,format,'');
        download(name,exportRows({rows,format,table:unit.table}),EXPORT_MIME[format]);
      }catch(error){
        /* Named, with the already-written files named beside it. A run that stopped
         * on its fourth file has still produced three, and a report saying only
         * "the export failed" would leave somebody deleting three good files. */
        exportRun={...exportRun,state:'failed',current:'',currentRows:0,reason:`${unit.label} could not be written (${error.message})`};
        renderExportEverything();
        return {started:true,failed:true,written:exportRun.written.slice(),plan};
      }
      /* `current` is cleared as the count goes up, so the page never claims to be
       * writing one record set while naming another. */
      exportRun={...exportRun,done:exportRun.done+1,rowsDone:exportRun.rowsDone+unit.rows,
        current:'',currentRows:0,written:[...exportRun.written,name]};
      renderExportEverything();
      /* The second turn of the loop, and it is not spare. Without it this render is
       * superseded by the next unit's announcement inside the same synchronous block,
       * so the count never paints, the between-units line becomes a branch nothing can
       * reach, and the cancel check at the top of the loop has no window to fire in --
       * three things that look present in the source and are unreachable in a browser.
       * Found by planting exactly those three breaks and watching the suite stay green
       * for all of them. */
      await operationYield();
    }
    /* A cancel that arrived after the last unit was written still finishes as done:
     * every file the plan named exists, so nothing was left out, and reporting it
     * as cancelled would understate what the person actually has. */
    exportRun={...exportRun,state:'done',current:'',currentRows:0};
    renderExportEverything();
    notify('Export finished',applyVocabularyText(`Wrote ${exportRun.done} file${exportRun.done===1?'':'s'} covering ${exportRun.rowsDone} row${exportRun.rowsDone===1?'':'s'}. Nothing left this browser.`),
      {category:'export',en:`Export finished. ${exportRun.done} files written, and nothing left this browser.`,zh:`匯出完成，寫咗 ${exportRun.done} 個檔案，冇任何嘢離開過呢個瀏覽器。`});
    return {started:true,written:exportRun.written.slice(),plan};
  }

  function initExportEverything(){
    const open=$('export-everything-open');
    if(!open)return;
    open.addEventListener('click',()=>{
      const dialog=$('export-everything-dialog');if(!dialog)return;
      /* A freshly opened dialog reports nothing rather than the tail of a run that
       * ended ten minutes ago: a leftover "Finished" line reads as this attempt
       * having already succeeded. A run still in flight is left exactly alone. */
      if(exportRun.state!=='running')exportRun={...exportRun,state:'idle',total:0,done:0,rowsTotal:0,rowsDone:0,current:'',currentRows:0,written:[],reason:''};
      updateExportEverythingFormats();
      renderExportEverything();
      dialog.showModal();
    });
    $('export-everything-format')?.addEventListener('change',renderExportEverything);
    $('export-everything-changelog')?.addEventListener('change',()=>{updateExportEverythingFormats();renderExportEverything()});
    $('export-everything-start')?.addEventListener('click',()=>{
      const optional=$('export-everything-changelog');
      runExportEverything({format:$('export-everything-format')?.value||'json',includeChangelog:optional?optional.checked:true});
    });
    $('export-everything-cancel')?.addEventListener('click',cancelExportEverything);
    updateExportEverythingFormats();
    renderExportEverything();
  }

  // ============================================================================
  // Built-in authenticator -- RFC 6238 codes, computed on this page, for accounts
  // the reader registers themselves.
  //
  // Direction is the thing most easily got backwards here, so it is stated first.
  // There are two authenticator-shaped jobs and this surface does exactly one:
  //
  //   pairing OUT -- an application that owns a one-time-code factor of its own
  //     generates a secret and shows a QR code for a phone to scan. This page owns
  //     no such factor: nothing here is protected by a one-time code, so there is
  //     no secret of ours to hand out and no QR of ours to draw. Generating one
  //     would mean inventing a factor nobody can use.
  //   pairing IN -- the reader brings a secret some OTHER service issued and keeps
  //     it here. That is this surface. The routes it owes are the ones that avoid
  //     retyping a base32 string by hand.
  //
  // Reading a QR is therefore a DECODE, and it is done by the browser's own
  // BarcodeDetector rather than by a decoder written here. Where a browser has
  // none -- and several do not -- the control is absent and the reason is named.
  // A scan button that cannot scan is worse than no scan button, because the
  // person who presses it concludes their code is unreadable rather than that
  // their browser is.
  //
  // Everything is local, and three properties hold it that way. No request is made
  // from anywhere in this block. Secrets live in their own storage key, so no
  // settings snapshot, no history entry and no ordinary export can carry one --
  // which is checkable rather than promised, because `state` is what those three
  // serialize and secrets are not in it. And clearing this site's storage removes
  // them for good: nothing here can give a secret back, exactly as nothing here
  // sent one anywhere.
  // ============================================================================
  const AUTH_KEY='ding-pbx-pages-authenticator-v1';
  const AUTH_BASE32_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const AUTH_ALGORITHMS=['SHA-1','SHA-256','SHA-512'];
  const AUTH_ENTRY_LIMIT=64;
  const AUTH_LABEL_MAX=64;
  const AUTH_SECRET_MAX=128;
  const AUTH_PERIOD_MAX=300;
  // One step either side, matching the desktop renderer's own verification window.
  // Wider would accept a code long after the person reading it has moved on;
  // narrower refuses an honest cross-check taken a second before the boundary.
  const AUTH_SKEW_STEPS=1;

  /** The clock every code and countdown is taken from, in one place so a test can hold it still. */
  function authNow(){return Date.now()}

  // ------------------------------------------------------------------ RFC 4648 base32
  //
  // Ported from `app/renderer/src/totp.ts` rather than reinvented, so a secret that
  // works in the desktop application works here and vice versa. Strict on input: an
  // unknown character is refused rather than skipped, because skipping one silently
  // produces a different secret from the one the reader was given and the only
  // symptom is codes that are never accepted anywhere.
  function authDecodeBase32(value){
    const cleaned=String(value||'').replace(/\s+/g,'').replace(/=+$/g,'').toUpperCase();
    if(cleaned.length===0)throw new Error('The secret is empty.');
    let bits='';
    for(const character of cleaned){
      const index=AUTH_BASE32_ALPHABET.indexOf(character);
      if(index===-1)throw new Error(`The secret contains a character that is not base32: ${character}`);
      bits+=index.toString(2).padStart(5,'0');
    }
    const byteCount=Math.floor(bits.length/8);
    if(byteCount===0)throw new Error('The secret is too short to hold a single byte.');
    const bytes=new Uint8Array(byteCount);
    for(let i=0;i<byteCount;i+=1)bytes[i]=parseInt(bits.slice(i*8,i*8+8),2);
    return bytes;
  }
  function authEncodeBase32(bytes){
    let bits='';
    for(const byte of bytes)bits+=byte.toString(2).padStart(8,'0');
    let out='';
    for(let i=0;i<bits.length;i+=5)out+=AUTH_BASE32_ALPHABET[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];
    return out;
  }
  /** Base32 in groups of four, which is how every service prints one and how a person reads one back. */
  function authGroupSecret(secret){return String(secret||'').replace(/\s+/g,'').toUpperCase().replace(/(.{4})(?=.)/g,'$1 ')}

  // ------------------------------------------------------------------ parameters
  //
  // An unsupported value is refused rather than replaced with a default. A pasted
  // link naming an algorithm this page cannot compute is the case that matters:
  // quietly treating it as SHA-1 stores an entry that generates confident, wrong
  // codes forever, and nothing on screen would say why they are refused.
  function authNormaliseAlgorithm(algorithm){
    const raw=String(algorithm==null||algorithm===''?'SHA-1':algorithm).toUpperCase().replace(/[\s_-]/g,'');
    const mapped=raw==='SHA1'?'SHA-1':raw==='SHA256'?'SHA-256':raw==='SHA512'?'SHA-512':'';
    if(!mapped)throw new Error(`This page can compute SHA-1, SHA-256 and SHA-512 codes; the link asks for ${String(algorithm)}.`);
    return mapped;
  }
  function authNormaliseDigits(digits){
    const value=Number(digits==null||digits===''?6:digits);
    if(!Number.isInteger(value)||value<6||value>8)throw new Error(`A code has between 6 and 8 digits; this one asks for ${String(digits)}.`);
    return value;
  }
  function authNormalisePeriod(period){
    const value=Number(period==null||period===''?30:period);
    if(!Number.isInteger(value)||value<1||value>AUTH_PERIOD_MAX)throw new Error(`A code lasts between 1 and ${AUTH_PERIOD_MAX} seconds; this one asks for ${String(period)}.`);
    return value;
  }

  // ------------------------------------------------------------------ HOTP/TOTP
  function authCounterBytes(counter){
    const bytes=new Uint8Array(8);
    let value=counter;
    for(let i=7;i>=0;i-=1){bytes[i]=value%256;value=Math.floor(value/256)}
    return bytes;
  }
  function authRawBuffer(bytes){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}
  async function authHotp(secretBytes,counter,algorithm,digits){
    const key=await crypto.subtle.importKey('raw',authRawBuffer(secretBytes),{name:'HMAC',hash:algorithm},false,['sign']);
    const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,authRawBuffer(authCounterBytes(counter))));
    const offset=signature[signature.length-1]&0x0f;
    const binCode=((signature[offset]&0x7f)<<24)|((signature[offset+1]&0xff)<<16)|((signature[offset+2]&0xff)<<8)|(signature[offset+3]&0xff);
    return String(binCode%10**digits).padStart(digits,'0');
  }
  function authStepFor(atMs,period){return Math.floor(atMs/1000/period)}
  async function authGenerateCode(parameters,atMs){
    const algorithm=authNormaliseAlgorithm(parameters.algorithm);
    const digits=authNormaliseDigits(parameters.digits);
    const period=authNormalisePeriod(parameters.period);
    return authHotp(authDecodeBase32(parameters.secret),authStepFor(atMs,period),algorithm,digits);
  }
  async function authVerifyCode(parameters,code,atMs,skewSteps=0){
    const digits=authNormaliseDigits(parameters.digits);
    if(typeof code!=='string'||code.length!==digits||!/^\d+$/.test(code))return false;
    const period=authNormalisePeriod(parameters.period);
    const current=authStepFor(atMs,period);
    const bound=Math.max(0,Math.floor(skewSteps));
    for(let delta=-bound;delta<=bound;delta+=1){
      // eslint-disable-next-line no-await-in-loop
      const candidate=await authGenerateCode(parameters,(current+delta)*period*1000);
      if(candidate===code)return true;
    }
    return false;
  }
  function authSecondsRemaining(period,atMs){
    const normalised=authNormalisePeriod(period);
    const elapsed=(atMs/1000)%normalised;
    const remaining=normalised-elapsed;
    return remaining===normalised?normalised:Math.ceil(remaining);
  }

  // ------------------------------------------------------------------ otpauth:// links
  function authPairingUri(entry){
    const algorithm=authNormaliseAlgorithm(entry.algorithm);
    const digits=authNormaliseDigits(entry.digits);
    const period=authNormalisePeriod(entry.period);
    const secret=String(entry.secret||'').replace(/\s+/g,'').toUpperCase();
    authDecodeBase32(secret);
    const issuer=String(entry.issuer||'');
    const account=String(entry.account||'');
    const label=issuer?`${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`:encodeURIComponent(account);
    const query=new URLSearchParams({secret,algorithm:algorithm.replace('-',''),digits:String(digits),period:String(period)});
    if(issuer)query.set('issuer',issuer);
    return `otpauth://totp/${label}?${query.toString()}`;
  }
  function authParsePairingUri(uri){
    let parsed;
    try{parsed=new URL(String(uri||'').trim())}catch{throw new Error('That is not a link this page can read. An authenticator link starts with otpauth://totp/.')}
    if(parsed.protocol!=='otpauth:')throw new Error(`An authenticator link uses the otpauth scheme; this one uses ${parsed.protocol.replace(':','')}.`);
    if(parsed.host!=='totp')throw new Error(`This page keeps time-based accounts only; that link is for ${parsed.host}.`);
    const label=decodeURIComponent(parsed.pathname.replace(/^\//,''));
    const colon=label.indexOf(':');
    const issuerFromLabel=colon===-1?'':label.slice(0,colon);
    const account=colon===-1?label:label.slice(colon+1);
    const secret=parsed.searchParams.get('secret');
    if(!secret)throw new Error('That link carries no secret, so there is nothing to compute a code from.');
    return {
      issuer:(parsed.searchParams.get('issuer')??issuerFromLabel).slice(0,AUTH_LABEL_MAX),
      account:account.slice(0,AUTH_LABEL_MAX),
      secret:secret.replace(/\s+/g,'').toUpperCase().slice(0,AUTH_SECRET_MAX),
      algorithm:authNormaliseAlgorithm(parsed.searchParams.get('algorithm')),
      digits:authNormaliseDigits(parsed.searchParams.get('digits')),
      period:authNormalisePeriod(parsed.searchParams.get('period')),
    };
  }

  // ------------------------------------------------------------------ the clock
  //
  // The desktop application can say a machine's clock is skewed far enough that its
  // codes will be refused everywhere. This page cannot, and the reason is worth
  // stating rather than leaving as a silence: knowing the true time needs an outside
  // source, and this feature makes no request at all. So it says what a skewed clock
  // looks like from the reader's side instead of inventing a measurement.
  function authClockNote(){
    return 'Codes come from this computer’s own clock. Nothing here asks the network what the time is, so this page cannot tell you the clock is wrong — if every code from every account is refused, a clock that has drifted is the first thing to check.';
  }

  // ------------------------------------------------------------------ the store
  //
  // Its own storage key, deliberately. `state` is what the settings snapshot, every
  // local-history entry and the redacted settings export all serialize, so keeping
  // secrets out of `state` is what makes "no history entry carries a secret" a fact
  // about the code rather than a promise about future edits.
  function authNormaliseEntry(raw){
    if(!raw||typeof raw!=='object')return null;
    try{
      const secret=String(raw.secret||'').replace(/\s+/g,'').toUpperCase().slice(0,AUTH_SECRET_MAX);
      authDecodeBase32(secret);
      return {
        id:String(raw.id||`a${authNow()}-${authIdSeq++}`),
        issuer:String(raw.issuer||'').slice(0,AUTH_LABEL_MAX),
        account:String(raw.account||'').slice(0,AUTH_LABEL_MAX),
        secret,
        algorithm:authNormaliseAlgorithm(raw.algorithm),
        digits:authNormaliseDigits(raw.digits),
        period:authNormalisePeriod(raw.period),
        added:Number.isFinite(Number(raw.added))?Number(raw.added):0,
      };
    }catch{return null}
  }
  function authLoadEntries(){
    try{
      const raw=JSON.parse(localStorage.getItem(AUTH_KEY)||'[]');
      if(!Array.isArray(raw))return {entries:[],dropped:0};
      const entries=[];
      let dropped=0;
      for(const item of raw.slice(0,AUTH_ENTRY_LIMIT)){
        const entry=authNormaliseEntry(item);
        if(entry)entries.push(entry);else dropped+=1;
      }
      return {entries,dropped:dropped+Math.max(0,raw.length-AUTH_ENTRY_LIMIT)};
    }catch{return {entries:[],dropped:0}}
  }
  let authLoaded=authLoadEntries();
  let authEntries=authLoaded.entries;
  let authDroppedOnLoad=authLoaded.dropped;
  /* Through the one guarded writer, like every other store on this page. A browser
   * out of room refuses the write, and an account the reader just added would
   * otherwise vanish at the next load with nothing having said so. */
  function authSaveEntries(){return reportWrite('your authenticator accounts',writeLocal(AUTH_KEY,JSON.stringify(authEntries)))}
  function authEntryTitle(entry){return entry.issuer&&entry.account?`${entry.issuer} · ${entry.account}`:entry.issuer||entry.account||'Unnamed account'}
  function authEntryMeta(entry){return `${entry.algorithm} · ${entry.digits} digits · ${entry.period}s`}
  /** What a redacted export and the settings export both say about this store. */
  function authExportSummary(){return {accounts:authEntries.length,secrets:'omitted',storedSeparatelyIn:AUTH_KEY}}
  function authExportRows(ids){
    const wanted=ids instanceof Set?ids:new Set(ids||[]);
    return authEntries.filter(entry=>wanted.has(entry.id)).map(entry=>({
      issuer:entry.issuer,account:entry.account,algorithm:entry.algorithm,
      digits:entry.digits,period:entry.period,secret:'omitted',
    }));
  }

  // ------------------------------------------------------------------ the draft
  let authDraft={issuer:'',account:'',secret:'',algorithm:'SHA-1',digits:6,period:30,source:'manual'};
  let authSelection={anchor:undefined,selected:new Set()};
  let authOrder=[];
  let authTickSeq=0;
  let authIdSeq=0;
  let authLastCodes=new Map();
  let authCameraStream=null;

  /**
   * The one refusal reason for a draft, or undefined when it is savable.
   *
   * Pure, so the dialog's status line and the save path cannot come to disagree
   * about whether an entry is acceptable -- both ask this.
   */
  function authDraftProblem(draft){
    if(authEntries.length>=AUTH_ENTRY_LIMIT)return `This page keeps at most ${AUTH_ENTRY_LIMIT} accounts, and it already has that many. Remove one first.`;
    if(!String(draft.issuer||'').trim()&&!String(draft.account||'').trim())return 'Give the account a service name, a user name, or both, so you can tell its code from the others.';
    try{
      authNormaliseAlgorithm(draft.algorithm);
      authNormaliseDigits(draft.digits);
      authNormalisePeriod(draft.period);
    }catch(error){return error.message}
    try{authDecodeBase32(draft.secret)}catch(error){return error.message}
    const secret=String(draft.secret||'').replace(/\s+/g,'').toUpperCase();
    if(authEntries.some(entry=>entry.secret===secret))return 'This page already keeps an account with that exact secret. Adding it twice would show you the same code under two names.';
    return undefined;
  }
  /**
   * Saving is gated on a code this page actually computed from the secret.
   *
   * The canonical contract asks a newly paired factor to be confirmed with one live
   * code, because a mis-scanned secret is otherwise found at the next sign-in. That
   * shape belongs to pairing OUT, where a second device has to prove it received the
   * secret correctly. Pairing IN has no second device, so the equivalent that is
   * genuinely worth having is this: the entry is refused unless this page has
   * successfully produced a code from the secret, which catches a truncated or
   * mistyped base32 string at the moment it is entered rather than at the next login.
   *
   * The optional cross-check is the rest of it, and it is offered rather than
   * required because most people pairing a new account have nothing to check
   * against yet. Where a code IS supplied it must match, and skipping says exactly
   * what was not checked.
   */
  async function authPrepareDraft(draft,crossCheckCode,atMs){
    const problem=authDraftProblem(draft);
    if(problem)return {ok:false,reason:problem};
    let code;
    try{code=await authGenerateCode(draft,atMs)}
    catch(error){return {ok:false,reason:`This page could not compute a code from that secret: ${error.message}`}}
    const supplied=String(crossCheckCode||'').replace(/\s+/g,'');
    if(!supplied)return {ok:true,code,crossChecked:false,note:'Saved without a cross-check. Nothing has confirmed that this secret is the one the service issued — only that a code can be computed from it.'};
    const matches=await authVerifyCode(draft,supplied,atMs,AUTH_SKEW_STEPS);
    if(!matches)return {ok:false,reason:`That code does not match the one this page computes from the secret${supplied.length===authNormaliseDigits(draft.digits)?'':`, and it is ${supplied.length} digits rather than ${authNormaliseDigits(draft.digits)}`}. Check the secret rather than the code.`};
    return {ok:true,code,crossChecked:true,note:'Cross-checked against a code you supplied, so the secret is the one that service is using.'};
  }

  // ------------------------------------------------------------------ reading a QR
  //
  // The browser's own detector, or nothing. `BarcodeDetector` ships in some browsers
  // and not others, and there is no polyfill here that would not be a QR decoder
  // written from a specification this repository has no way to check itself against.
  // So each route reports the exact capability it needs and disappears when the
  // browser lacks it.
  function authDetectorAvailable(){return typeof globalThis.BarcodeDetector==='function'}
  function authCameraAvailable(){return authDetectorAvailable()&&typeof navigator!=='undefined'&&Boolean(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)}
  function authClipboardAvailable(){return authDetectorAvailable()&&typeof navigator!=='undefined'&&Boolean(navigator.clipboard&&navigator.clipboard.read)}
  function authCapabilityNote(){
    if(!authDetectorAvailable())return 'This browser reports no barcode detector, so the three reading routes — an image file, the clipboard, and the camera — are not offered here. Paste the otpauth:// link or type the secret instead. Nothing is missing from the account itself: a typed secret and a scanned one are the same secret.';
    const routes=['an image file'];
    if(authClipboardAvailable())routes.push('the clipboard');
    if(authCameraAvailable())routes.push('the camera');
    const missing=[];
    if(!authClipboardAvailable())missing.push('the clipboard');
    if(!authCameraAvailable())missing.push('the camera');
    return `This browser can read a QR code from ${routes.join(', ')}.${missing.length?` It offers no access to ${missing.join(' or ')}, so ${missing.length===1?'that route is':'those routes are'} not shown.`:''} Every read happens in this browser; the picture is never uploaded.`;
  }
  async function authDetectPairingUri(source){
    if(!authDetectorAvailable())throw new Error('This browser reports no barcode detector.');
    const detector=new globalThis.BarcodeDetector({formats:['qr_code']});
    const found=await detector.detect(source);
    const values=(found||[]).map(item=>String(item&&item.rawValue||'')).filter(Boolean);
    if(!values.length)throw new Error('No QR code was found in that picture.');
    const link=values.find(value=>value.toLowerCase().startsWith('otpauth://'));
    if(!link)throw new Error(`A QR code was read, but it is not an authenticator link: it says ${values[0].slice(0,40)}…`);
    return authParsePairingUri(link);
  }

  // ------------------------------------------------------------------ rendering
  function authMatchingEntries(query){
    return authEntries.filter(entry=>matchText(`${entry.issuer} ${entry.account} ${entry.algorithm}`,query,'authenticator-search'));
  }
  function authStatusLine(){
    if(!authEntries.length)return authDroppedOnLoad?`No accounts are kept in this browser. ${authDroppedOnLoad} stored record${authDroppedOnLoad===1?' was':'s were'} unreadable and left out rather than shown as an account that cannot produce a code.`:'No accounts are kept in this browser yet.';
    const suffix=authDroppedOnLoad?` ${authDroppedOnLoad} stored record${authDroppedOnLoad===1?' was':'s were'} unreadable and left out.`:'';
    return `${authEntries.length} account${authEntries.length===1?'':'s'} kept in this browser only.${suffix}`;
  }
  function authRenderList(query=''){
    const list=$('authenticator-list');
    if(!list)return;
    const matches=authMatchingEntries(query);
    authOrder=matches.map(entry=>entry.id);
    list.innerHTML=matches.length?matches.map(entry=>{
      const selected=authSelection.selected.has(entry.id);
      return `<article class="auth-entry" data-auth-id="${escapeHtml(entry.id)}">`
        +`<label class="auth-select"><input type="checkbox" ${selected?'checked':''} aria-label="Select ${escapeHtml(authEntryTitle(entry))}"></label>`
        +`<div class="auth-entry-main"><strong>${escapeHtml(authEntryTitle(entry))}</strong>`
        +`<output class="auth-code mono" data-auth-code="${escapeHtml(entry.id)}">${'—'}</output>`
        +`<p class="auth-meta mono" data-auth-meta="${escapeHtml(entry.id)}">${escapeHtml(authEntryMeta(entry))}</p></div>`
        +`<div class="auth-entry-actions">`
        +`<button type="button" class="text-button" data-auth-copy="${escapeHtml(entry.id)}">Copy code</button>`
        +`<button type="button" class="text-button" data-auth-move="up" data-auth-id-move="${escapeHtml(entry.id)}">Move up</button>`
        +`<button type="button" class="text-button" data-auth-move="down" data-auth-id-move="${escapeHtml(entry.id)}">Move down</button>`
        +`<button type="button" class="danger-button" data-auth-remove="${escapeHtml(entry.id)}">Remove</button>`
        +`</div></article>`;
    }).join(''):`<p class="empty-state">${escapeHtml(authEntries.length?'No account matches this search.':'No accounts yet. Add one with an otpauth:// link, a QR code, or the secret the service showed you.')}</p>`;
    if($('authenticator-status'))$('authenticator-status').textContent=authStatusLine();
    if($('authenticator-clock-note'))$('authenticator-clock-note').textContent=authClockNote();
    if($('authenticator-capability'))$('authenticator-capability').textContent=authCapabilityNote();
    authUpdateSelectionUI();
    authUpdateExportFormats();
    applyVocabulary();
  }
  /**
   * Codes and countdowns, written into the rows that already exist.
   *
   * Deliberately not a re-render. Rebuilding the list once a second would take the
   * focus ring off whatever the reader had reached with the keyboard, and reset a
   * half-made selection, every single second.
   */
  async function authTick(){
    const list=$('authenticator-list');
    if(!list)return;
    const sequence=++authTickSeq;
    const atMs=authNow();
    const changed=[];
    for(const entry of authEntries){
      const codeCell=list.querySelector(`[data-auth-code="${entry.id}"]`);
      if(!codeCell)continue;
      let code='';
      let next='';
      try{
        // eslint-disable-next-line no-await-in-loop
        code=await authGenerateCode(entry,atMs);
        // eslint-disable-next-line no-await-in-loop
        next=await authGenerateCode(entry,(authStepFor(atMs,entry.period)+1)*entry.period*1000);
      }catch{code='';next=''}
      if(sequence!==authTickSeq)return;
      const metaCell=list.querySelector(`[data-auth-meta="${entry.id}"]`);
      if(code){
        codeCell.textContent=authGroupCode(code);
        if(metaCell)metaCell.textContent=`${authEntryMeta(entry)} · ${authSecondsRemaining(entry.period,atMs)}s left · next ${authGroupCode(next)}`;
        if(authLastCodes.get(entry.id)!==code){changed.push(entry);authLastCodes.set(entry.id,code)}
      }else{
        codeCell.textContent='—';
        if(metaCell)metaCell.textContent=`${authEntryMeta(entry)} · no code: this browser refused the secret`;
      }
    }
    authAnnounce(changed);
  }
  /** A code is read in groups, not as one run of digits. */
  function authGroupCode(code){const text=String(code||'');const half=Math.ceil(text.length/2);return `${text.slice(0,half)} ${text.slice(half)}`.trim()}
  /**
   * Announce a code CHANGE, never the countdown.
   *
   * A live region tied to the seconds would speak once a second forever, which is
   * the fastest way to make a screen reader unusable on this page.
   */
  function authAnnounce(changed){
    const region=$('authenticator-announcer');
    if(!region||!changed.length)return;
    region.textContent=changed.length===1
      ?`New code for ${authEntryTitle(changed[0])}.`
      :`New codes for ${changed.length} accounts.`;
  }
  function authUpdateSelectionUI(){
    const list=$('authenticator-list');
    if(list)for(const row of list.querySelectorAll('.auth-entry')){
      const box=row.querySelector('input[type="checkbox"]');
      if(box)box.checked=authSelection.selected.has(row.dataset.authId);
    }
    if($('auth-selection-status'))$('auth-selection-status').textContent=authSelection.selected.size?`${authSelection.selected.size} selected of ${authEntries.length}.`:'';
  }
  function authUpdateExportFormats(){
    const select=$('auth-export-format');
    if(!select)return;
    const rows=authExportRows(authSelection.selected);
    const formats=suitableFormats(rows.length?rows:[{issuer:'',account:'',algorithm:'',digits:0,period:0,secret:''}]);
    const previous=select.value;
    select.innerHTML=formats.map(format=>`<option value="${format}">${format.toUpperCase()}</option>`).join('');
    if(formats.includes(previous))select.value=previous;
    if($('auth-export-loss')){
      $('auth-export-loss').textContent=rows.length
        ?`${describeLoss(rows,select.value||formats[0]).join(' ')} Secrets are omitted from this file: every row carries the account and its parameters, and the word omitted where the secret would be.`.trim()
        :'Select one or more accounts to export. Whatever is written, the secrets are left out of it.';
    }
  }

  // ------------------------------------------------------------------ the draft dialog
  function authReadDraftFields(){
    return {
      issuer:($('auth-issuer')?.value||'').slice(0,AUTH_LABEL_MAX),
      account:($('auth-account')?.value||'').slice(0,AUTH_LABEL_MAX),
      secret:($('auth-secret')?.value||'').replace(/\s+/g,'').toUpperCase().slice(0,AUTH_SECRET_MAX),
      algorithm:$('auth-algorithm')?.value||'SHA-1',
      digits:Number($('auth-digits')?.value||6),
      period:Number($('auth-period')?.value||30),
      source:authDraft.source,
    };
  }
  function authWriteDraftFields(draft){
    authDraft={...authDraft,...draft};
    if($('auth-issuer'))$('auth-issuer').value=authDraft.issuer;
    if($('auth-account'))$('auth-account').value=authDraft.account;
    if($('auth-secret'))$('auth-secret').value=authDraft.secret;
    if($('auth-algorithm'))$('auth-algorithm').value=authDraft.algorithm;
    if($('auth-digits'))$('auth-digits').value=String(authDraft.digits);
    if($('auth-period'))$('auth-period').value=String(authDraft.period);
    authRenderDraftStatus();
  }
  function authRenderDraftStatus(){
    const status=$('auth-draft-status');
    if(!status)return;
    const draft=authReadDraftFields();
    const problem=authDraftProblem(draft);
    status.textContent=problem
      ?problem
      :`Ready to save ${authEntryTitle(draft)} — ${authEntryMeta(draft)}. It is kept in this browser and nowhere else.`;
    const save=$('auth-save');
    if(save)save.disabled=Boolean(problem);
  }
  /** The secret is hidden until the reader asks for it, on every open. */
  function authResetDraft(){
    authDraft={issuer:'',account:'',secret:'',algorithm:'SHA-1',digits:6,period:30,source:'manual'};
    authWriteDraftFields(authDraft);
    if($('auth-uri'))$('auth-uri').value='';
    if($('auth-cross-check'))$('auth-cross-check').value='';
    if($('auth-secret'))$('auth-secret').type='password';
    if($('auth-secret-reveal'))$('auth-secret-reveal').textContent='Show the secret';
    if($('auth-read-status'))$('auth-read-status').textContent='';
    authStopCamera();
  }
  function authApplyReadResult(parsed,source,described){
    authDraft={...authDraft,source};
    authWriteDraftFields({...parsed,source});
    if($('auth-read-status'))$('auth-read-status').textContent=`${described} The secret is filled in and stays hidden until you ask to see it.`;
  }
  async function authSaveDraft(){
    const draft=authReadDraftFields();
    const verdict=await authPrepareDraft(draft,$('auth-cross-check')?.value||'',authNow());
    const status=$('auth-draft-status');
    if(!verdict.ok){
      if(status)status.textContent=verdict.reason;
      return verdict;
    }
    const entry=authNormaliseEntry({...draft,added:authNow()});
    if(!entry){
      if(status)status.textContent='That account could not be stored in the shape this page keeps.';
      return {ok:false,reason:'normalisation refused the draft'};
    }
    authEntries=[...authEntries,entry];
    authSaveEntries();
    recordHistory('authenticator-account-added',`An authenticator account was added: ${authEntryTitle(entry)} (${authEntryMeta(entry)}). The secret is not in this entry.`);
    notify('Authenticator account added',applyVocabularyText(`${authEntryTitle(entry)} is now kept in this browser. ${verdict.note}`),{category:'setting',en:`${authEntryTitle(entry)} is now kept in this browser.`,zh:`${authEntryTitle(entry)} 而家淨係存喺呢個瀏覽器度。`});
    $('authenticator-dialog')?.close();
    authResetDraft();
    authRenderList($('authenticator-search')?.value||'');
    authTick();
    return verdict;
  }

  // ------------------------------------------------------------------ camera
  async function authStartCamera(){
    const video=$('auth-camera');
    if(!video||!authCameraAvailable())return;
    try{
      authCameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      video.srcObject=authCameraStream;
      video.hidden=false;
      if(video.play)await video.play();
      if($('auth-read-status'))$('auth-read-status').textContent='The camera is on. Hold the QR code in front of it.';
      authScanCamera();
    }catch(error){
      if($('auth-read-status'))$('auth-read-status').textContent=`The camera did not start: ${error&&error.message?error.message:'no reason was given'}. Paste the link or type the secret instead.`;
      authStopCamera();
    }
  }
  async function authScanCamera(){
    const video=$('auth-camera');
    if(!video||!authCameraStream)return;
    try{
      const parsed=await authDetectPairingUri(video);
      authStopCamera();
      authApplyReadResult(parsed,'camera','Read from the camera.');
      return;
    }catch{/* nothing in this frame yet -- keep looking rather than reporting a failure */}
    if(authCameraStream)setTimeout(authScanCamera,400);
  }
  function authStopCamera(){
    const video=$('auth-camera');
    if(authCameraStream){for(const track of authCameraStream.getTracks())track.stop()}
    authCameraStream=null;
    if(video){video.hidden=true;video.srcObject=null}
  }

  // ------------------------------------------------------------------ removal and secrets
  function authRemoveEntries(ids){
    const wanted=new Set(ids);
    const removed=authEntries.filter(entry=>wanted.has(entry.id));
    if(!removed.length)return 0;
    authEntries=authEntries.filter(entry=>!wanted.has(entry.id));
    authSaveEntries();
    for(const entry of removed)authLastCodes.delete(entry.id);
    authSelection={anchor:undefined,selected:new Set()};
    recordHistory('authenticator-account-removed',`${removed.length} authenticator account${removed.length===1?'':'s'} removed from this browser: ${removed.map(authEntryTitle).join(', ')}. Removing one deletes its secret; nothing here can give it back.`);
    notify('Authenticator accounts removed',applyVocabularyText(`${removed.length} account${removed.length===1?'':'s'} removed. Their secrets are gone from this browser and cannot be recovered here.`),{category:'setting',en:`${removed.length} authenticator account${removed.length===1?'':'s'} removed from this browser.`,zh:`已經喺呢個瀏覽器度移除咗 ${removed.length} 個驗證器帳戶。`});
    authRenderList($('authenticator-search')?.value||'');
    return removed.length;
  }
  function authMoveEntry(id,direction){
    const index=authEntries.findIndex(entry=>entry.id===id);
    const target=index+(direction==='up'?-1:1);
    if(index===-1||target<0||target>=authEntries.length)return false;
    const next=[...authEntries];
    [next[index],next[target]]=[next[target],next[index]];
    authEntries=next;
    authSaveEntries();
    authRenderList($('authenticator-search')?.value||'');
    authTick();
    return true;
  }
  /**
   * The only route that writes a usable secret to a file, and it is gated exactly
   * like every other irreversible action on this page: two independent keys and a
   * full-travel slider. The wording says what the file is rather than what it is
   * called, because a person who opens it later has to know it is a credential.
   */
  function authSecretsExportRows(){
    return authEntries.map(entry=>({
      issuer:entry.issuer,account:entry.account,algorithm:entry.algorithm,
      digits:entry.digits,period:entry.period,secret:entry.secret,link:authPairingUri(entry),
    }));
  }
  function authSecretsFields(){
    if($('auth-secrets-key-1'))$('auth-secrets-key-1').checked=false;
    if($('auth-secrets-key-2'))$('auth-secrets-key-2').checked=false;
    const slider=$('auth-secrets-slider');
    if(slider){slider.value='0';slider.disabled=true}
    if($('auth-secrets-slider-status'))$('auth-secrets-slider-status').textContent='0%';
  }
  function authSecretsReady(){return Boolean($('auth-secrets-key-1')?.checked&&$('auth-secrets-key-2')?.checked)}
  function authUpdateSecretsSlider(){
    const slider=$('auth-secrets-slider');
    if(!slider)return;
    slider.disabled=!authSecretsReady();
    if(slider.disabled){slider.value='0';if($('auth-secrets-slider-status'))$('auth-secrets-slider-status').textContent='0%'}
  }
  function authPerformSecretsExport(){
    const rows=authSecretsExportRows();
    if(!rows.length)return 0;
    download('ding-pbx-authenticator-secrets.json',JSON.stringify({schemaVersion:1,encoding:'UTF-8',warning:'Every row below carries a usable authenticator secret in the clear. Anyone holding this file can generate the same codes you can.',accounts:rows},null,2),'application/json');
    recordHistory('authenticator-secrets-exported',`${rows.length} authenticator secret${rows.length===1?'':'s'} were written to a file in the clear. This entry names the count and no secret.`);
    notify('Authenticator secrets exported',applyVocabularyText(`Wrote ${rows.length} usable secret${rows.length===1?'':'s'} to a file. Treat that file as a credential.`),{category:'export',en:`Wrote ${rows.length} usable authenticator secret${rows.length===1?'':'s'} to a file.`,zh:`已經將 ${rows.length} 個可以用嘅驗證器密鑰寫咗入檔案，請當佢係憑證咁保管。`});
    return rows.length;
  }

  function initAuthenticator(){
    const card=$('authenticator-card');
    if(!card)return;
    if($('authenticator-clock-note'))$('authenticator-clock-note').textContent=authClockNote();
    if($('authenticator-capability'))$('authenticator-capability').textContent=authCapabilityNote();
    // Routes the browser cannot perform are removed rather than disabled, so nothing
    // on screen offers a scan it would refuse.
    if(!authDetectorAvailable()&&$('auth-qr-file-row'))$('auth-qr-file-row').hidden=true;
    if(!authClipboardAvailable()&&$('auth-qr-clipboard'))$('auth-qr-clipboard').hidden=true;
    if(!authCameraAvailable()&&$('auth-qr-camera'))$('auth-qr-camera').hidden=true;

    $('authenticator-add')?.addEventListener('click',()=>{
      const dialog=$('authenticator-dialog');
      if(!dialog)return;
      authResetDraft();
      dialog.showModal();
    });
    $('authenticator-dialog')?.addEventListener('close',()=>{authStopCamera();$('authenticator-add')?.focus()});
    for(const id of ['auth-issuer','auth-account','auth-secret','auth-algorithm','auth-digits','auth-period']){
      $(id)?.addEventListener('input',authRenderDraftStatus);
      $(id)?.addEventListener('change',authRenderDraftStatus);
    }
    $('auth-secret-reveal')?.addEventListener('click',()=>{
      const field=$('auth-secret');
      if(!field)return;
      const hidden=field.type==='password';
      field.type=hidden?'text':'password';
      $('auth-secret-reveal').textContent=hidden?'Hide the secret':'Show the secret';
    });
    $('auth-uri-apply')?.addEventListener('click',()=>{
      const raw=$('auth-uri')?.value||'';
      try{authApplyReadResult(authParsePairingUri(raw),'uri','Read from the link you pasted.')}
      catch(error){if($('auth-read-status'))$('auth-read-status').textContent=error.message}
    });
    $('auth-qr-file')?.addEventListener('change',async event=>{
      const file=event.target.files&&event.target.files[0];
      if(!file)return;
      try{
        const bitmap=await createImageBitmap(file);
        authApplyReadResult(await authDetectPairingUri(bitmap),'image','Read from the picture you chose.');
      }catch(error){if($('auth-read-status'))$('auth-read-status').textContent=`That picture could not be read: ${error.message}`}
      event.target.value='';
    });
    $('auth-qr-clipboard')?.addEventListener('click',async()=>{
      try{
        const items=await navigator.clipboard.read();
        for(const item of items){
          const type=item.types.find(candidate=>candidate.startsWith('image/'));
          if(!type)continue;
          const bitmap=await createImageBitmap(await item.getType(type));
          authApplyReadResult(await authDetectPairingUri(bitmap),'clipboard','Read from the picture on your clipboard.');
          return;
        }
        if($('auth-read-status'))$('auth-read-status').textContent='There is no picture on the clipboard to read.';
      }catch(error){if($('auth-read-status'))$('auth-read-status').textContent=`The clipboard could not be read: ${error&&error.message?error.message:'the browser refused'}.`}
    });
    $('auth-qr-camera')?.addEventListener('click',authStartCamera);
    $('auth-camera-stop')?.addEventListener('click',authStopCamera);
    $('auth-save')?.addEventListener('click',()=>{authSaveDraft()});

    $('authenticator-search')?.addEventListener('input',event=>authRenderList(event.target.value));
    $('authenticator-list')?.addEventListener('click',event=>{
      const remove=event.target.closest('[data-auth-remove]');
      if(remove){authRemoveEntries([remove.dataset.authRemove]);return}
      const move=event.target.closest('[data-auth-move]');
      if(move){authMoveEntry(move.dataset.authIdMove,move.dataset.authMove);return}
      const copy=event.target.closest('[data-auth-copy]');
      if(copy){
        const cell=$('authenticator-list')?.querySelector(`[data-auth-code="${copy.dataset.authCopy}"]`);
        const code=(cell?.textContent||'').replace(/\s+/g,'');
        if(code&&code!=='—'&&navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code);
        return;
      }
      const row=event.target.closest('.auth-entry[data-auth-id]');
      if(!row)return;
      const isCheckbox=event.target.matches('input[type="checkbox"]');
      authSelection=bulkClick(authSelection,row.dataset.authId,{shift:event.shiftKey,ctrl:event.ctrlKey||event.metaKey||isCheckbox},authOrder);
      authUpdateSelectionUI();authUpdateExportFormats();
    });
    $('auth-select-page')?.addEventListener('click',()=>{
      const result=bulkSelectAll(authSelection,'page',authOrder,authOrder);
      authSelection=result.state;authUpdateSelectionUI();authUpdateExportFormats();
      if($('auth-selection-status'))$('auth-selection-status').textContent=`Selected ${result.count} on this page.`;
    });
    $('auth-select-matches')?.addEventListener('click',()=>{
      const result=bulkSelectAll(authSelection,'matches',authOrder,authOrder);
      authSelection=result.state;authUpdateSelectionUI();authUpdateExportFormats();
      if($('auth-selection-status'))$('auth-selection-status').textContent=`Selected ${result.count} matching accounts.`;
    });
    $('auth-select-none')?.addEventListener('click',()=>{authSelection={anchor:authSelection.anchor,selected:new Set()};authUpdateSelectionUI();authUpdateExportFormats()});
    $('auth-export-format')?.addEventListener('change',authUpdateExportFormats);
    $('auth-export-selected')?.addEventListener('click',()=>{
      const rows=authExportRows(authSelection.selected);
      if(!rows.length)return;
      const format=$('auth-export-format').value||'json';
      download(exportFilename('ding-pbx-authenticator-accounts',format,`${rows.length}-selected`),exportRows({rows,format,table:'account'}),EXPORT_MIME[format]);
      notify('Authenticator accounts exported',applyVocabularyText(`Exported ${rows.length} account${rows.length===1?'':'s'} as ${format.toUpperCase()}, with every secret left out.`),{category:'export',en:`Exported ${rows.length} authenticator account${rows.length===1?'':'s'} without their secrets.`,zh:`已經匯出 ${rows.length} 個驗證器帳戶，密鑰冇包埋。`});
    });
    $('auth-remove-selected')?.addEventListener('click',()=>{
      const plan=planBulk('Remove',[...authSelection.selected],()=>true,{destructive:true});
      if(!plan.selected.length)return;
      const box=$('auth-confirm');
      if(!box)return;
      if($('auth-confirm-text'))$('auth-confirm-text').textContent=`${summariseBulk(plan)} Each removal deletes that account's secret from this browser, and nothing here can give it back.`;
      box.hidden=false;
    });
    $('auth-confirm-cancel')?.addEventListener('click',()=>{if($('auth-confirm'))$('auth-confirm').hidden=true});
    $('auth-confirm-yes')?.addEventListener('click',()=>{
      authRemoveEntries([...authSelection.selected]);
      if($('auth-confirm'))$('auth-confirm').hidden=true;
    });
    $('auth-export-secrets')?.addEventListener('click',()=>{
      const dialog=$('auth-secrets-dialog');
      if(!dialog||!authEntries.length)return;
      authSecretsFields();
      if($('auth-secrets-count'))$('auth-secrets-count').textContent=`${authEntries.length} account${authEntries.length===1?'':'s'} would be written, each with a usable secret in the clear.`;
      dialog.showModal();
    });
    $('auth-secrets-key-1')?.addEventListener('change',authUpdateSecretsSlider);
    $('auth-secrets-key-2')?.addEventListener('change',authUpdateSecretsSlider);
    $('auth-secrets-slider')?.addEventListener('input',event=>{
      const value=Number(event.target.value);
      if($('auth-secrets-slider-status'))$('auth-secrets-slider-status').textContent=`${value}%`;
      if(value>=100&&authSecretsReady()){authPerformSecretsExport();$('auth-secrets-dialog')?.close()}
    });
    $('auth-secrets-cancel')?.addEventListener('click',()=>$('auth-secrets-dialog')?.close('cancel'));
    $('auth-secrets-dialog')?.addEventListener('close',()=>{authSecretsFields();$('auth-export-secrets')?.focus()});

    authRenderList('');
    authTick();
    setInterval(authTick,1000);
  }

  function initSettings(){if(!$('theme-mode'))return;$('theme-mode').onchange=event=>update('theme',event.target.value);el('language-mode').onchange=event=>update('language',event.target.value);$('density-mode').onchange=event=>update('density',event.target.value);$('accent-color').oninput=event=>update('accent',event.target.value);$('font-scale').oninput=event=>{state.fontScale=Number(event.target.value);save();applyState()};$('motion-mode').onchange=event=>update('lowMotion',event.target.checked);el('english-funny').onchange=event=>update('englishFunny',Number(event.target.value));el('cantonese-funny').onchange=event=>update('cantoneseFunny',Number(event.target.value));$('schedule-enabled').onchange=event=>update('scheduleEnabled',event.target.checked);if($('dialog-emojis'))$('dialog-emojis').onchange=event=>update('dialogEmojis',event.target.checked);$('attention-reduce-flashing').onchange=event=>updateAttention('reduceFlashing',event.target.checked);$('attention-simplified-language').onchange=event=>updateAttention('simplifiedLanguage',event.target.checked);$('attention-extended-timeouts').onchange=event=>updateAttention('extendedTimeouts',event.target.checked);if($('attention-focus'))$('attention-focus').onchange=event=>updateAttention('focus',event.target.checked);if($('attention-time-awareness'))$('attention-time-awareness').onchange=event=>updateAttention('timeAwareness',event.target.checked);if($('attention-one-thing'))$('attention-one-thing').onchange=event=>updateAttention('oneThing',event.target.checked);if($('attention-momentum'))$('attention-momentum').onchange=event=>updateAttention('momentum',event.target.checked);if($('attention-current-task'))$('attention-current-task').onchange=event=>{state.attention={...state.attention,currentTask:event.target.value.slice(0,140)};save();applyState();recordHistory('attention-changed','attention.currentTask changed.')};$('settings-reset').onclick=()=>{const dialog=$('reset-confirm-dialog');if(!dialog)return;resetConfirmFields();dialog.showModal()};$('settings-export').onclick=()=>{download('ding-pbx-page-settings.json',JSON.stringify({schemaVersion:1,encoding:'UTF-8',personalVocabulary:'omitted',settings:state,restrictedPresentation:schoolExportSummary(),authenticator:authExportSummary()},null,2));notify('Settings exported',applyVocabularyText('Exported the local settings on this page as ding-pbx-page-settings.json. Uploaded personal vocabulary was omitted.'),{category:'export',en:'Exported the local settings on this page. Uploaded personal vocabulary was omitted.',zh:'已經匯出呢版嘅本地設定，上載嘅個人詞彙冇包埋。'});};el('vocabulary-file').onchange=loadVocabulary;el('vocabulary-clear').onclick=clearVocabulary;initDisplayName();initNarration();initSchool();$('logo-file').onchange=loadLogo;$('logo-clear').onclick=clearLogo;if($('settings-search'))$('settings-search').addEventListener('input',()=>updateFilterStatus('settings-filter-status','settings-search'));initResetConfirm();initHistory()}
  /* One writer for every vocabulary rejection, so the rule below holds for all of them
   * rather than for whichever branch somebody remembered.
   *
   * The reason is shown and never spoken. Several of these messages quote the file
   * back -- a duplicate term, an over-long replacement -- and this file is the private
   * dictionary. A network-backed voice synthesises on somebody else's computer, so
   * speaking the reason is the one route by which a term in that file would leave this
   * machine. The spoken line says a rejection happened and where to read why. */
  function rejectVocabulary(reason){
    $('vocabulary-status').textContent=`Rejected: ${reason}`;
    narrate('error',{en:'The personal vocabulary file was rejected. The reason is beside the upload control; it is not read aloud, because it can quote the file.',zh:'個人詞彙檔案唔收得。原因寫咗喺上載控制項隔籬，唔會讀出嚟，因為入面可能引用返個檔案嘅內容。'},{isError:true});
    reportFailure('vocabulary-rejected',{detail:reason,context:{dictionaryLoaded:Boolean(vocabularyReplacements())}});
  }
  /* Clearing, as its own writer, because two things do it now: the button on the
   * card, and the recovery route this page raises when a file is refused. Two
   * copies of it would be two answers to the same question the moment one of
   * them was edited. */
  function clearVocabulary(){
    localStorage.removeItem('ding-pbx-vocabulary-cache');
    el('vocabulary-file').value='';
    el('vocabulary-status').textContent='No file loaded; original wording is active.';
    clearRecovery('vocabulary-status','vocabulary-rejected');
    applyVocabulary();
    applyState();
  }
  /* The opposite case, and stated rather than assumed: every reason a logo rejection
   * can carry is written by this file or by the browser's own reader ("only PNG, JPEG,
   * or SVG images are accepted", "Could not read the file."), and none of them quotes
   * the image. So this one speaks the reason itself. */
  function rejectLogo(reason){
    $('logo-status').textContent=`Rejected: ${reason}`;
    narrate('error',{en:`The local logo was rejected. ${reason}`,zh:`本機標誌唔收得。${reason}`},{isError:true});
    reportFailure('logo-rejected',{detail:reason,context:{markLoaded:localCharacters('ding-pbx-logo-cache')>0}});
  }
  /* The same arrangement as the dictionary above, and for the same reason. */
  function clearLogo(){
    localStorage.removeItem('ding-pbx-logo-cache');
    $('logo-file').value='';
    $('logo-status').textContent='No file loaded; default mark is active.';
    clearRecovery('logo-status','logo-rejected');
    applyLogo();
  }
  async function loadVocabulary(event){const file=event.target.files[0];if(!file)return;if(file.size>65536){rejectVocabulary(`the file is ${Math.round(file.size/1024)} KiB and the limit is 64 KiB.`);return}try{const raw=JSON.parse(await file.text());
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
    const keys=parsed.replacements.map(item=>item.from);const seen=new Set();const duplicate=keys.find(key=>seen.size===seen.add(key).size);if(new Set(keys).size!==keys.length)throw new Error(`Duplicate keys are not accepted; each from value must appear once. ${JSON.stringify(duplicate)} appears more than once.`);if(!reportWrite('the dictionary you loaded',writeLocal('ding-pbx-vocabulary-cache',JSON.stringify(parsed))))return;$('vocabulary-status').textContent=`Loaded ${parsed.replacements.length} local replacement${parsed.replacements.length===1?'':'s'}. No data was transmitted.`;clearRecovery('vocabulary-status','vocabulary-rejected');applyVocabulary();applyState()}catch(error){rejectVocabulary(error.message)}}
  async function loadLogo(event){const file=event.target.files[0];if(!file)return;if(file.size>131072){rejectLogo('file exceeds 128 KiB.');return}if(!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)){rejectLogo('only PNG, JPEG, or SVG images are accepted.');return}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the file.'));reader.readAsDataURL(file)});if(!reportWrite('the image you added',writeLocal('ding-pbx-logo-cache',dataUrl)))return;$('logo-status').textContent=`Loaded local logo (${Math.round(file.size/1024)} KiB). No data was transmitted.`;clearRecovery('logo-status','logo-rejected');applyLogo()}catch(error){rejectLogo(error.message)}}
  function download(name,text,mime='application/json'){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:mime}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const EXPORT_MIME={json:'application/json',jsonl:'application/x-ndjson',yaml:'application/yaml',toml:'application/toml',xml:'application/xml',csv:'text/csv',tsv:'text/tab-separated-values',markdown:'text/markdown',html:'text/html',sql:'application/sql'};
  function slugForFilename(text){const slug=String(text||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);return slug||'all'}
  function reduceMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches||state.lowMotion}


  // ------------------------------------------------------------------
  // The converter page.
  //
  // Everything that decides lives in the engine block above and takes values a
  // caller supplies; this half does nothing but read controls, call it, and put
  // the answer on the page. Two properties are worth stating because the page
  // asserts them in words:
  //
  //   - Nothing is uploaded. Every byte is read through the File object the
  //     picker hands over and never leaves this browser, so there is no request
  //     to fail and no server to be down.
  //   - No conversion happens until somebody presses Convert. A file that is
  //     merely chosen is inspected and described; the lossy part waits for the
  //     person who would lose something by it.
  // ------------------------------------------------------------------
  let converterItems=[];
  let converterPage=0;
  let converterSeq=0;
  let converterRunning=false;
  let converterCancelRequested=false;

  function converterTarget(){return $('converter-target-format')?.value||'json'}
  function converterPageCount(){return Math.max(1,Math.ceil(converterItems.length/CONVERTER_PAGE_SIZE))}
  function converterPageItems(){const start=converterPage*CONVERTER_PAGE_SIZE;return converterItems.slice(start,start+CONVERTER_PAGE_SIZE)}
  function converterItemById(id){return converterItems.find(item=>item.id===id)}

  /**
   * The catalogue, filtered by its own search field.
   *
   * An unavailable adapter is listed with its reason rather than removed, and
   * the count beneath says how many the search is hiding, so a short list is
   * never mistaken for a short catalogue.
   */
  function renderConverterAdapters(){
    const host=$('converter-adapters');if(!host)return;
    const query=$('converter-format-search')?.value||'';
    let shown=0,hidden=0;
    const sections=[];
    for(const category of CONVERTER_CATEGORIES){
      const matched=category.adapters.filter(adapter=>matchText(
        `${category.label} ${adapter.label} ${adapter.bundled?`bundled ${(adapter.writes||[]).map(target=>CONVERTER_TARGET_LABEL[target]).join(' ')}`:`unavailable ${adapter.unavailable}`}`,
        query,'converter-format-search'));
      shown+=matched.length;hidden+=category.adapters.length-matched.length;
      if(matched.length===0)continue;
      sections.push(`<section class="adapter-category"><h3>${escapeHtml(category.label)}</h3><ul>${matched.map(adapter=>`<li class="adapter-entry${adapter.bundled?'':' is-unavailable'}"><span class="adapter-name">${escapeHtml(adapter.label)}</span><span class="status-chip ${adapter.bundled?'ok-chip':'warning-chip'}">${adapter.bundled?'Bundled':'Unavailable'}</span><p>${adapter.bundled?`Writes ${escapeHtml((adapter.writes||[]).map(target=>CONVERTER_TARGET_LABEL[target]).join(', '))}.`:escapeHtml(adapter.unavailable)}</p></li>`).join('')}</ul></section>`);
    }
    host.innerHTML=sections.length?sections.join(''):'<p class="empty-state">No category or format matches this search. Clear the search to see the whole catalogue again.</p>';
    const status=$('converter-format-status');
    if(status)status.textContent=`${shown} of ${shown+hidden} formats listed${hidden>0?`, ${hidden} hidden by this search`:''}. ${converterRunning?'Cancel stops the batch before the next file.':'Cancel is switched off because no conversion is running.'}`;
    const cancel=$('converter-cancel');
    if(cancel)cancel.disabled=!converterRunning;
  }

  /**
   * The one writer of the picker's status line.
   *
   * The claim it carries -- that every byte was read here and nothing was uploaded --
   * is the only thing on this page a reader cannot check for themselves, so it lives
   * in exactly one place and travels with every rewrite of the line rather than being
   * copied into each caller and quietly lost from one of them.
   */
  function converterInputStatus(extra){
    const node=$('converter-input-status');if(!node)return;
    node.textContent=`${converterItems.length} file${converterItems.length===1?'':'s'} in the queue. Every byte was read in this browser and nothing was uploaded.${extra?` ${extra}`:''}`;
  }
  /** Read the chosen files here in the browser, and say what was refused. */
  async function converterAddFiles(fileList){
    const files=[...(fileList||[])];
    if(files.length===0)return;
    const refused=[];
    for(const file of files){
      if(file.size>CONVERTER_MAX_BYTES){refused.push(`${file.name} is ${file.size} bytes, over the ${CONVERTER_MAX_BYTES}-byte per-file bound`);continue}
      let bytes;
      try{bytes=new Uint8Array(await file.arrayBuffer())}
      catch(error){refused.push(`${file.name} could not be read: ${String(error&&error.message||'the browser refused it')}`);continue}
      converterSeq+=1;
      converterItems.push({id:`c${converterSeq}`,name:file.name,bytes,inspected:converterInspect(file.name,bytes),state:'queued',reason:'',output:'',outputName:''});
    }
    converterPage=0;
    renderConverterQueue();
    updateConverterLoss();
    converterInputStatus(refused.length>0?`${refused.length} refused: ${refused.join('; ')}.`:'');
  }

  /** One queue row: what the file is, what it can become, and what it became. */
  function converterItemMarkup(item,target){
    const can=converterCan(item.inspected,target);
    const stateLabel={queued:'Queued',converted:'Converted',skipped:'Skipped',failed:'Failed',cancelled:'Cancelled'}[item.state]||item.state;
    const stateChip=item.state==='converted'?'ok-chip':item.state==='queued'?'warning-chip':'warning-chip';
    const reason=item.reason||(can.ok?'':can.reason);
    return `<article class="converter-item" data-item="${escapeHtml(item.id)}">`
      +`<div class="converter-item-head"><strong>${escapeHtml(item.name)}</strong><span class="status-chip ${stateChip}">${escapeHtml(stateLabel)}</span></div>`
      +`<p class="converter-item-facts">${item.inspected.size} bytes · read as <strong>${escapeHtml(item.inspected.kind)}</strong> because ${escapeHtml(item.inspected.why)}.</p>`
      +(reason?`<p class="converter-item-reason">${escapeHtml(reason)}</p>`:'')
      +`<div class="converter-item-actions">`
      +`<button type="button" class="secondary-button" data-convert="${escapeHtml(item.id)}"${can.ok?'':' disabled'}>Convert to ${escapeHtml(CONVERTER_TARGET_LABEL[target])}</button>`
      +(item.state==='converted'?`<button type="button" class="text-button" data-download="${escapeHtml(item.id)}">Download ${escapeHtml(item.outputName)}</button>`:'')
      +`<button type="button" class="text-button" data-remove="${escapeHtml(item.id)}">Remove from queue</button>`
      +`</div>`
      +(item.state==='converted'?`<pre class="converter-preview">${escapeHtml(item.output.slice(0,600))}${item.output.length>600?'\n…':''}</pre>`:'')
      +`</article>`;
  }

  function renderConverterQueue(){
    const host=$('converter-queue');if(!host)return;
    if(converterPage>converterPageCount()-1)converterPage=converterPageCount()-1;
    const target=converterTarget();
    const items=converterPageItems();
    host.innerHTML=items.length>0
      ?items.map(item=>converterItemMarkup(item,target)).join('')
      :'<p class="empty-state">No file has been chosen yet. Nothing is read, and nothing is converted, until you choose one.</p>';
    const first=converterPage*CONVERTER_PAGE_SIZE;
    const status=$('converter-page-status');
    if(status)status.textContent=converterItems.length===0
      ?'The queue is empty, so both page buttons are switched off.'
      :`Showing ${first+1}-${Math.min(first+CONVERTER_PAGE_SIZE,converterItems.length)} of ${converterItems.length}.${converterPage===0?' Previous is switched off because this is the first page.':''}${converterPage>=converterPageCount()-1?' Next is switched off because this is the last page.':''}`;
    if($('converter-prev'))$('converter-prev').disabled=converterPage===0;
    if($('converter-next'))$('converter-next').disabled=converterPage>=converterPageCount()-1;
    const listed=$('converter-convert-listed');
    if(listed){
      const convertible=items.filter(item=>converterCan(item.inspected,target).ok).length;
      listed.disabled=converterRunning||convertible===0;
      listed.textContent=`Convert the ${convertible} convertible file${convertible===1?'':'s'} listed here`;
    }
  }

  /** Everything the current page of the queue would lose, said before Convert. */
  function updateConverterLoss(){
    const node=$('converter-loss');if(!node)return;
    const target=converterTarget();
    const items=converterPageItems();
    node.textContent=items.length===0
      ?'Select a file to see conversion limits and loss disclosure.'
      :items.map(item=>`${item.name} → ${CONVERTER_TARGET_LABEL[target]}: ${converterLoss(item.inspected,target).join(' ')}`).join(' ');
  }

  function converterConvertItem(item){
    const target=converterTarget();
    const result=converterConvert(item.inspected,target,item.bytes);
    if(!result.ok){item.state='skipped';item.reason=result.reason;item.output='';item.outputName='';return false}
    item.state='converted';item.reason='';item.output=result.text;item.outputName=converterOutputName(item.name,target);
    return true;
  }

  /**
   * Convert the files listed on this page, one at a time, checking for a cancel
   * between each. A cancelled file is left saying so rather than silently
   * staying queued, and the count reported at the end distinguishes all three
   * outcomes instead of calling the batch a success.
   */
  async function converterConvertListed(){
    if(converterRunning)return;
    converterRunning=true;converterCancelRequested=false;
    renderConverterAdapters();renderConverterQueue();
    let converted=0,skipped=0,cancelled=0;
    for(const item of converterPageItems()){
      if(converterCancelRequested){item.state='cancelled';item.reason='the batch was cancelled before this file was reached';item.output='';cancelled+=1;continue}
      if(converterConvertItem(item))converted+=1;else skipped+=1;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    converterRunning=false;converterCancelRequested=false;
    renderConverterAdapters();renderConverterQueue();updateConverterLoss();
    const summary=`${converted} converted, ${skipped} skipped, ${cancelled} cancelled.`;
    recordHistory('files-converted',`Converted files to ${CONVERTER_TARGET_LABEL[converterTarget()]}: ${summary}`);
    notify(copyText('notifConverted'),applyVocabularyText(summary),{category:'export',copyKey:'notifConverted'});
  }

  function initConverter(){
    if(!$('converter-files'))return;
    $('converter-files').addEventListener('change',event=>{const chosen=event.target.files;event.target.value='';converterAddFiles(chosen)});
    $('converter-target-format')?.addEventListener('change',()=>{
      for(const item of converterItems){if(item.state!=='queued'){item.state='queued';item.reason='';item.output='';item.outputName=''}}
      renderConverterQueue();updateConverterLoss();
    });
    $('converter-format-search')?.addEventListener('input',renderConverterAdapters);
    $('converter-cancel')?.addEventListener('click',()=>{if(converterRunning)converterCancelRequested=true});
    $('converter-convert-listed')?.addEventListener('click',converterConvertListed);
    $('converter-prev')?.addEventListener('click',()=>{if(converterPage===0)return;converterPage-=1;renderConverterQueue();updateConverterLoss()});
    $('converter-next')?.addEventListener('click',()=>{if(converterPage>=converterPageCount()-1)return;converterPage+=1;renderConverterQueue();updateConverterLoss()});
    $('converter-queue')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-convert],[data-download],[data-remove]');
      if(!button)return;
      if(button.dataset.convert!==undefined){
        const item=converterItemById(button.dataset.convert);
        if(!item)return;
        converterConvertItem(item);renderConverterQueue();updateConverterLoss();
        return;
      }
      if(button.dataset.download!==undefined){
        const item=converterItemById(button.dataset.download);
        if(!item||item.state!=='converted')return;
        download(item.outputName,item.output,'text/plain;charset=utf-8');
        return;
      }
      const item=converterItemById(button.dataset.remove);
      if(!item)return;
      converterItems=converterItems.filter(entry=>entry.id!==item.id);
      renderConverterQueue();updateConverterLoss();
      converterInputStatus('');
    });
    renderConverterAdapters();renderConverterQueue();updateConverterLoss();
  }

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
      notify('Colour copied',applyVocabularyText(`Copied ${value} to the clipboard.`),{category:'export',en:`Copied the colour ${value} to the clipboard.`,zh:`已經將顏色 ${value} 複製去剪貼簿。`});
    });
    input.value=accent.value;
    sync(accent.value);
  }

  // ------------------------------------------------------------------
  // The deployed-version watch.
  //
  // Every decision below is a pure function taking values a caller supplies, and the
  // three that touch the page do nothing else. That split is deliberate: "the value is
  // stored" and "the banner is on the page" are both true of a watch that never notices
  // anything, and only the pure half can be asked what it concludes.
  // ------------------------------------------------------------------

  /** The build identity this page is running. Empty commit means it was never built. */
  function runningBuild(){return {version:SITE_BUILD_VERSION,commit:SITE_BUILD_COMMIT,builtAt:SITE_BUILD_AT}}
  function shortCommit(commit){return String(commit||'').slice(0,7)}

  /**
   * Where the published manifest lives, or null when that is not this origin.
   *
   * The refusal is the point rather than a formality. Everything else on this site is a
   * bundled local asset, and this is its one request, so the property worth being able
   * to check is not "it fetched the right file" but "it could not have fetched somebody
   * else's". A hand-edited `data-base` is enough to move it, and nothing would say so.
   */
  function versionManifestUrl(base,baseUri){
    let here,there;
    try{here=new URL(String(baseUri))}catch{return null}
    try{there=new URL(`${String(base||'')}${VERSION_MANIFEST_NAME}`,here)}catch{return null}
    if(there.origin!==here.origin)return null;
    return there.href;
  }

  /**
   * Reads the published manifest, refusing everything it cannot vouch for.
   *
   * Bounded first, because the size check is the only one that holds whatever the body
   * turns out to be -- a proxy error page, an HTML 404, a truncated write.
   */
  function parseVersionManifest(text){
    if(typeof text!=='string')return {ok:false,reason:'the published version manifest was not text'};
    if(text.length>UPDATE_MANIFEST_MAX_BYTES)return {ok:false,reason:`the published version manifest is larger than the ${UPDATE_MANIFEST_MAX_BYTES}-byte bound this page will read`};
    let parsed;
    try{parsed=JSON.parse(text)}catch{return {ok:false,reason:'the published version manifest is not valid JSON'}}
    if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed))return {ok:false,reason:'the published version manifest is not a JSON object'};
    if(parsed.schemaVersion!==1)return {ok:false,reason:`the published version manifest declares schema version ${JSON.stringify(parsed.schemaVersion)}, which this page cannot read`};
    const version=parsed.version;
    if(typeof version!=='string'||version.length===0||version.length>40||!/^[0-9A-Za-z][0-9A-Za-z.+-]*$/.test(version))return {ok:false,reason:'the published version manifest carries no readable version label'};
    const commit=parsed.commit;
    if(typeof commit!=='string'||!/^[0-9a-f]{40}$/.test(commit))return {ok:false,reason:'the published version manifest carries no full 40-character commit'};
    const builtAt=parsed.builtAt;
    if(typeof builtAt!=='string'||!Number.isFinite(Date.parse(builtAt)))return {ok:false,reason:'the published version manifest carries no readable build time'};
    return {ok:true,manifest:{version,commit,builtAt}};
  }

  /**
   * -1, 0 or 1 for two `v0.1.N`-shaped labels, and null for anything else.
   *
   * Null rather than a guess, because ordering two arbitrary strings is exactly how a
   * roll-back gets announced to somebody as an update.
   */
  function compareBuildVersions(left,right){
    const parse=label=>{const match=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(label==null?'':label));return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null};
    const a=parse(left),b=parse(right);
    if(!a||!b)return null;
    for(let i=0;i<3;i+=1)if(a[i]!==b[i])return a[i]<b[i]?-1:1;
    return 0;
  }

  /**
   * What the two identities mean together. `direction` exists so the wording can stay
   * honest when the published site moved BACKWARDS, which "an update is available" would
   * describe wrongly.
   */
  function updateVerdict(running,deployed){
    if(!running||!running.commit)return {state:'unbuilt',direction:'unknown'};
    if(!deployed||!deployed.commit)return {state:'unknown',direction:'unknown'};
    if(deployed.commit===running.commit)return {state:'current',direction:'same'};
    const order=compareBuildVersions(running.version,deployed.version);
    if(order===-1)return {state:'available',direction:'newer'};
    if(order===1)return {state:'available',direction:'older'};
    if(order===0)return {state:'available',direction:'rebuilt'};
    return {state:'available',direction:'unknown'};
  }

  /** The headline the banner and the card both use, phrased by direction. */
  function updateHeadline(watch){
    const deployed=watch&&watch.deployed;
    if(!deployed)return '';
    const named=`${deployed.version} (${shortCommit(deployed.commit)})`;
    if(watch.direction==='newer')return `A newer version of this page has been published: ${named}.`;
    if(watch.direction==='older')return `The published page has been rolled back to ${named}.`;
    if(watch.direction==='rebuilt')return `This page has been rebuilt and republished at the same version, ${named}.`;
    return `The published page is now ${named}, which is not the build you are reading.`;
  }

  /** The identity line under the card: what this page actually is. */
  function runningBuildLine(running){
    if(!running||!running.commit)return 'This page was served straight out of the source directory, so it carries no build identity and cannot be compared with anything.';
    return `You are reading ${running.version} (${shortCommit(running.commit)}), built ${running.builtAt}.`;
  }

  /** The status line under the card, for every state the watch can be in. */
  function updateStatusLine(watch,running){
    switch(watch&&watch.state){
      case 'unbuilt':return 'Not checked: an unbuilt page has nothing to compare.';
      case 'checking':return 'Checking the published version…';
      case 'failed':return `Could not check: ${watch.reason}`;
      case 'current':return 'This is the published version.';
      case 'available':return `${updateHeadline(watch)} Reload to take it.`;
      default:return 'Not checked yet.';
    }
  }

  /**
   * Why the check button is disabled, or '' when it is not. A disabled control that says
   * nothing reads as broken rather than as waiting for a condition.
   */
  function updateCheckDisabledReason(watch,running){
    if(!running||!running.commit)return 'This page was not produced by the site build, so there is no build identity to compare against the published one.';
    if(watch&&watch.inFlight)return 'A check is already running.';
    return '';
  }

  let updateWatch={state:'idle',direction:'unknown',reason:'',deployed:null,checkedAt:0,inFlight:false};
  let updateTimer=null;

  function ensureUpdateUI(){
    const main=document.querySelector('main');
    if(!main||$('update-banner'))return;
    const banner=document.createElement('div');
    banner.id='update-banner';banner.className='update-banner';banner.hidden=true;
    banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
    main.prepend(banner);
  }

  /**
   * The banner is built with `textContent` throughout rather than a markup string. The
   * values are validated above and would survive either way; what would not is the next
   * person adding an unvalidated one to the same template.
   */
  function renderUpdateBanner(){
    const banner=$('update-banner');if(!banner)return;
    const deployed=updateWatch.deployed;
    const show=updateWatch.state==='available'&&Boolean(deployed)&&state.updateDismissedCommit!==deployed.commit;
    banner.hidden=!show;
    banner.replaceChildren();
    if(!show)return;
    const headline=document.createElement('strong');
    headline.textContent=applyVocabularyText(updateHeadline(updateWatch));
    const note=document.createElement('p');
    note.textContent=applyVocabularyText('Reloading fetches the published page. Your settings are saved as you change them, but anything typed into a field and not yet saved is lost.');
    const actions=document.createElement('div');
    actions.className='update-banner-actions';
    const reload=document.createElement('button');
    reload.type='button';reload.id='update-reload';reload.className='primary-button';
    reload.textContent='Reload to update';
    reload.addEventListener('click',()=>{location.reload()});
    const later=document.createElement('button');
    later.type='button';later.id='update-later';later.className='text-button';
    later.textContent='Later';
    later.addEventListener('click',dismissUpdateBanner);
    const changes=document.createElement('a');
    changes.className='text-button';changes.id='update-changes';
    changes.href=`${BASE}downloads.html#changelog`;
    changes.textContent='What changed';
    actions.append(reload,later,changes);
    banner.append(headline,note,actions);
  }

  /**
   * `Later` is remembered against the exact commit it was said about, and persisted, so
   * it survives moving to another page of this site. A newly published build is a
   * different answer to a different question and raises the banner again.
   */
  function dismissUpdateBanner(){
    if(!updateWatch.deployed)return;
    state.updateDismissedCommit=updateWatch.deployed.commit;
    save();
    renderUpdateState();
  }

  function renderUpdateState(){
    const running=runningBuild();
    if($('update-status'))$('update-status').textContent=applyVocabularyText(updateStatusLine(updateWatch,running));
    if($('update-identity'))$('update-identity').textContent=applyVocabularyText(runningBuildLine(running));
    const button=$('update-check');
    if(button){
      const why=updateCheckDisabledReason(updateWatch,running);
      button.disabled=why!=='';
      if(why)button.title=why;else button.removeAttribute('title');
    }
    renderUpdateBanner();
  }

  /**
   * One check. Re-entrant calls are refused rather than queued, because two checks in
   * flight can settle in either order and the loser would overwrite the winner.
   */
  async function checkForUpdate(options){
    const manual=Boolean(options&&options.manual);
    const running=runningBuild();
    if(!running.commit){
      updateWatch={...updateWatch,state:'unbuilt',direction:'unknown',reason:'',inFlight:false};
      renderUpdateState();
      /* Raised whether or not anybody asked, because on this one the check
       * button is switched off -- so nobody CAN ask, and a disabled control has
       * to say in adjacent text which condition is unmet. It renders only where
       * `update-status` is, which is the card that owns that button. */
      reportFailure('page-unbuilt',{});
      return updateWatch;
    }
    if(updateWatch.inFlight)return updateWatch;
    /* Held before the state moves to `checking`, because that move is what the
     * "have we already announced this build" question is asked against. Reading it
     * afterwards always answers no, and the watch notifies on every poll. */
    const previous=updateWatch;
    const url=versionManifestUrl(BASE,document.baseURI);
    if(!url){
      updateWatch={...updateWatch,state:'failed',reason:'the published version manifest does not resolve to an address on this site',inFlight:false};
      renderUpdateState();
      reportFailure('update-check-failed',{detail:updateWatch.reason,context:{}});
      return updateWatch;
    }
    updateWatch={...updateWatch,inFlight:true,state:'checking',reason:''};
    renderUpdateState();
    let text=null,failure='';
    const controller=new AbortController();
    const timer=setTimeout(()=>{controller.abort()},UPDATE_FETCH_TIMEOUT_MS);
    try{
      const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal});
      if(!response.ok)failure=`the published version manifest answered HTTP ${response.status}`;
      else text=await response.text();
    }catch{
      failure=controller.signal.aborted
        ? `the published version manifest did not answer within ${UPDATE_FETCH_TIMEOUT_MS/1000} seconds`
        : 'this browser could not reach the published version manifest';
    }finally{clearTimeout(timer)}
    if(!failure){
      const parsed=parseVersionManifest(text);
      if(!parsed.ok)failure=parsed.reason;
      else{
        const verdict=updateVerdict(running,parsed.manifest);
        const repeat=previous.state==='available'&&Boolean(previous.deployed)&&previous.deployed.commit===parsed.manifest.commit;
        updateWatch={...updateWatch,inFlight:false,state:verdict.state,direction:verdict.direction,deployed:parsed.manifest,reason:'',checkedAt:Date.now()};
        renderUpdateState();
        /* The check answered, so the way out of a check that did not is no
         * longer wanted. Named, so a successful check cannot take down the
         * unbuilt-page route that shares this status line. */
        clearRecovery('update-status','update-check-failed');
        /* Told once per published build, and again on a check the person asked for. A
         * banner that raises a notification on every poll is the nagging this site is
         * not allowed to do. */
        if(verdict.state==='available'&&!repeat){
          const headline=updateHeadline(updateWatch);
          notify('A new version is published',applyVocabularyText(`${headline} Reload to take it.`),
            {category:'notification',en:`${headline} Reload to take it.`,zh:`網站已經發佈咗新版本 ${updateWatch.deployed.version}，重新載入就攞到。`});
        }else if(manual&&verdict.state==='current'){
          notify('This page is up to date',applyVocabularyText('This is the published version.'),
            {category:'notification',en:'This page is already the published version.',zh:'呢版已經係已發佈嘅版本。'});
        }
        return updateWatch;
      }
    }
    updateWatch={...updateWatch,inFlight:false,state:'failed',reason:failure,checkedAt:Date.now()};
    renderUpdateState();
    reportFailure('update-check-failed',{detail:failure,context:{}});
    if(manual)notify('Update check failed',applyVocabularyText(`Could not check: ${failure}`),
      {category:'error',isError:true,en:`The update check failed: ${failure}.`,zh:`更新檢查失敗：${failure}。`});
    return updateWatch;
  }

  function startUpdateWatch(){
    stopUpdateWatch();
    if(!runningBuild().commit)return;
    updateTimer=setInterval(()=>{checkForUpdate({manual:false})},UPDATE_CHECK_INTERVAL_MS);
  }
  function stopUpdateWatch(){if(updateTimer!==null){clearInterval(updateTimer);updateTimer=null}}

  function initUpdates(){
    ensureUpdateUI();
    if($('update-check'))$('update-check').onclick=()=>{checkForUpdate({manual:true})};
    renderUpdateState();
    checkForUpdate({manual:false});
    startUpdateWatch();
  }

  function initReleaseNotes(){renderMarkdownBlock($('release-notes'),RELEASE_NOTES_MARKDOWN,'No release notes were provided yet -- no verified release manifest exists.')}

  function initSettingsPreview(){
    const preview=$('settings-preview');if(!preview)return;
    const sync=()=>{if($('preview-scale'))$('preview-scale').style.width=`${Math.max(0,Math.min(100,(state.fontScale-90)/40*100))}%`;if($('preview-density'))$('preview-density').textContent=state.density};
    ['theme-mode','language-mode','density-mode','accent-color','font-scale','motion-mode'].forEach(id=>{const control=el(id);if(control)control.addEventListener('input',sync)});
    sync();
  }

  function init(){ensureAttentionUI();initSchoolWatch();ensureContextMenuUI();applyState();initContextMenu();initNavigation();initDestinationMap();renderDestinations();initSearch();initDocumentationExport();initRegex();initSettings();initColourTranslator();initCollapsibles();renderNotifications();initNotificationBulk();initReveals();initHeroCanvas();initCounters();initConnectionDiagram();initSettingsPreview();initReleaseNotes();initChangelog();initUpdates();initSupport();initExportEverything();initTimeAwareness();initMomentum();initAuthenticator();initConverter();$('palette-open')?.addEventListener('click',openPalette);$('palette-search')?.addEventListener('input',event=>{renderPalette(event.target.value);applyVocabulary()});$('notification-open')?.addEventListener('click',()=>{$('notifications-dialog').showModal();renderNotifications($('notification-search')?.value||'')});$('notification-clear')?.addEventListener('click',()=>{state.notifications=[];notifSelection={anchor:undefined,selected:new Set()};save();renderNotifications()});if($('documentation-filters-panel'))updateFilterStatus('documentation-filter-status','feature-search');if($('settings-filters-panel'))updateFilterStatus('settings-filter-status','settings-search');applyVocabulary()}
  init();
})();
