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

  const BASE = document.documentElement.dataset.base || './';
  const DEFAULTS = {theme:'dark',language:'en',density:'comfortable',accent:'#82D9A5',fontScale:100,lowMotion:false,englishFunny:0,cantoneseFunny:0,attention:{reduceFlashing:false,simplifiedLanguage:false,extendedTimeouts:false},scheduleEnabled:false,notifications:[]};
  const STORAGE_KEY = 'ding-pbx-pages-v2';
  const regexState = new Map();
  let regexTarget = '';
  let destinationPage = 0;

  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function loadState(){try{return{...DEFAULTS,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return{...DEFAULTS}}}
  const state=loadState();
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  function update(key,value){state[key]=value;save();applyState();notify('Setting saved',`${key} now uses ${value}.`)}
  function applyState(){document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.density=state.density;document.documentElement.style.setProperty('--primary',state.accent);document.documentElement.style.setProperty('--font-scale',String(state.fontScale/100));document.body.classList.toggle('low-stimulation',state.lowMotion);if($('theme-mode'))$('theme-mode').value=state.theme;if($('language-mode'))$('language-mode').value=state.language;if($('density-mode'))$('density-mode').value=state.density;if($('accent-color'))$('accent-color').value=state.accent;if($('font-scale'))$('font-scale').value=state.fontScale;if($('font-scale-output'))$('font-scale-output').textContent=`${state.fontScale}%`;if($('motion-mode'))$('motion-mode').checked=state.lowMotion;if($('english-funny'))$('english-funny').value=String(state.englishFunny);if($('cantonese-funny'))$('cantonese-funny').value=String(state.cantoneseFunny);if($('schedule-enabled'))$('schedule-enabled').checked=state.scheduleEnabled;if($('attention-reduce-flashing'))$('attention-reduce-flashing').checked=state.attention.reduceFlashing;if($('attention-simplified-language'))$('attention-simplified-language').checked=state.attention.simplifiedLanguage;if($('attention-extended-timeouts'))$('attention-extended-timeouts').checked=state.attention.extendedTimeouts;document.body.classList.toggle('reduce-flashing',state.attention.reduceFlashing);document.body.classList.toggle('extended-timeouts',state.attention.extendedTimeouts);applyLanguage()}
  function updateAttention(key,value){state.attention={...state.attention,[key]:value};save();applyState();notify('Setting saved',`attention.${key} now uses ${value}.`)}
  function applyLanguage(){if(!$('language-preview'))return;document.documentElement.lang=state.language==='zh'?'zh-Hant':'en';$('language-preview').textContent=state.language==='en'?'English presentation active.':state.language==='zh'?'廣東話顯示已啟用。':'Bilingual presentation active. / 雙語顯示已啟用。'}

  function initNavigation(){
    const button=$('nav-toggle'),menu=$('site-nav');if(!button||!menu)return;
    const close=()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false')};
    button.onclick=()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('a')?.focus()};
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault();openPalette()}});
    menu.addEventListener('click',close);
  }
  function initReveals(){const items=all('.reveal');if(reduceMotion()||!('IntersectionObserver'in window)){items.forEach(item=>item.classList.add('visible'));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});items.forEach(item=>observer.observe(item))}

  function renderDestinations(query=''){const grid=$('destination-grid');if(!grid)return;const matches=DESTINATIONS.filter(item=>matchText(`${item.name} ${item.group} ${item.description}`,query,'feature-search')),pageSize=8,pageCount=Math.max(1,Math.ceil(matches.length/pageSize));destinationPage=Math.min(destinationPage,pageCount-1);const shown=matches.slice(destinationPage*pageSize,(destinationPage+1)*pageSize);grid.innerHTML=shown.map(item=>`<article class="destination-card reveal" id="destination-${item.id}" tabindex="-1"><span class="destination-icon" aria-hidden="true">${item.icon}</span><span class="card-kicker">${escapeHtml(item.group)}</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><a class="text-button" href="${BASE}docs/${item.article}.html">Read article <span aria-hidden="true">→</span></a></article>`).join('')||'<p class="empty-state">No destinations match this search.</p>';if($('destination-count'))$('destination-count').textContent=`${matches.length} destination${matches.length===1?'':'s'} · page ${destinationPage+1} of ${pageCount}`;if($('destination-pagination'))$('destination-pagination').innerHTML=Array.from({length:pageCount},(_,index)=>`<button type="button" data-page="${index}" ${index===destinationPage?'aria-current="page"':''}>${index+1}</button>`).join('');initReveals();updateDestinationMap(matches)}
  function matchText(text,query,target){if(!query)return true;const config=regexState.get(target);if(config?.enabled){try{return new RegExp(config.pattern,config.flags).test(text)}catch{return false}}return text.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
  function filter(selector,query,target){all(selector).forEach(item=>item.hidden=!matchText(item.dataset.search||item.textContent,query,target))}

  function initSearch(){all('[data-filter-target]').forEach(input=>input.addEventListener('input',()=>filter(input.dataset.filterTarget,input.value,input.id)));if($('feature-search'))$('feature-search').addEventListener('input',event=>{destinationPage=0;renderDestinations(event.target.value)});$('destination-pagination')?.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;destinationPage=Number(button.dataset.page);renderDestinations($('feature-search')?.value||'');$('destination-grid').focus?.()});all('.regex-trigger').forEach(button=>button.onclick=event=>{event.preventDefault();openRegex(button.dataset.regexFor)})}
  function openRegex(target){regexTarget=target;const dialog=$('regex-dialog');if(!dialog)return;const saved=regexState.get(target)||{pattern:'',flags:'iu'};$('regex-target-label').textContent=`Attached to: ${target}`;$('regex-pattern').value=saved.pattern;$('regex-i').checked=saved.flags.includes('i');$('regex-m').checked=saved.flags.includes('m');$('regex-u').checked=saved.flags.includes('u');dialog.showModal();previewRegex();setTimeout(()=>$('regex-pattern').focus(),0)}
  function regexConfig(){return{pattern:$('regex-pattern').value.slice(0,256),flags:`${$('regex-i').checked?'i':''}${$('regex-m').checked?'m':''}${$('regex-u').checked?'u':''}`}}
  function previewRegex(){if(!$('regex-feedback'))return;const config=regexConfig();if(!config.pattern){$('regex-feedback').textContent='Enter a pattern.';return}try{const re=new RegExp(config.pattern,config.flags),flags=re.flags.includes('g')?re.flags:`${re.flags}g`,matches=[...$('regex-sample').value.matchAll(new RegExp(re.source,flags))];$('regex-feedback').textContent=`Valid JavaScript regular expression · ${matches.length} sample match${matches.length===1?'':'es'}.`}catch(error){$('regex-feedback').textContent=`Invalid pattern: ${error.message}`}}
  function applyRegex(){const config=regexConfig();try{new RegExp(config.pattern,config.flags)}catch{return}regexState.set(regexTarget,{...config,enabled:Boolean(config.pattern)});$('regex-dialog').close();$(regexTarget)?.dispatchEvent(new Event('input'));notify('Regular expression applied',`${regexTarget} now uses the local JavaScript regular expression engine.`)}
  function initRegex(){if(!$('regex-dialog'))return;$('regex-pattern').addEventListener('input',previewRegex);$('regex-apply').onclick=applyRegex;all('[data-insert]').forEach(button=>button.onclick=()=>{const input=$('regex-pattern'),start=input.selectionStart;input.value=`${input.value.slice(0,start)}${button.dataset.insert}${input.value.slice(input.selectionEnd)}`;input.focus();input.setSelectionRange(start+button.dataset.insert.length,start+button.dataset.insert.length);previewRegex()})}


  function renderPalette(query=''){const list=$('palette-results');if(!list)return;const pages=[['Home','index.html'],['Product','product.html'],['Documentation','documentation.html'],['Downloads','downloads.html'],['Status','status.html'],['Settings','settings.html']],items=[...pages,...DESTINATIONS.map(item=>[item.name,`documentation.html#destination-${item.id}`])].filter(([name])=>matchText(name,query,'palette-search'));list.innerHTML=items.length?items.map(([name,path])=>`<a class="palette-result" role="option" href="${BASE}${path}"><strong>${escapeHtml(name)}</strong><span>Open destination</span></a>`).join(''):'<p>No matching commands.</p>'}
  function openPalette(){const dialog=$('command-palette');if(!dialog)return;dialog.showModal();$('palette-search').value='';renderPalette();setTimeout(()=>$('palette-search').focus(),0)}
  function notify(title,body){state.notifications.unshift({title,body,time:Date.now()});state.notifications=state.notifications.slice(0,30);save();renderNotifications();const region=$('toast-region');if(!region)return;const toast=document.createElement('div');toast.className='toast';toast.innerHTML=`<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;region.append(toast);setTimeout(()=>toast.remove(),5000)}
  function renderNotifications(){if($('notification-count'))$('notification-count').textContent=state.notifications.length;if(!$('notification-history'))return;$('notification-history').innerHTML=state.notifications.length?state.notifications.map(item=>`<article class="notice"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${new Date(item.time).toLocaleString()}</small></article>`).join(''):'<p>No local notifications.</p>'}

  function initSettings(){if(!$('theme-mode'))return;$('theme-mode').onchange=event=>update('theme',event.target.value);$('language-mode').onchange=event=>update('language',event.target.value);$('density-mode').onchange=event=>update('density',event.target.value);$('accent-color').oninput=event=>update('accent',event.target.value);$('font-scale').oninput=event=>{state.fontScale=Number(event.target.value);save();applyState()};$('motion-mode').onchange=event=>update('lowMotion',event.target.checked);$('english-funny').onchange=event=>update('englishFunny',Number(event.target.value));$('cantonese-funny').onchange=event=>update('cantoneseFunny',Number(event.target.value));$('schedule-enabled').onchange=event=>update('scheduleEnabled',event.target.checked);$('attention-reduce-flashing').onchange=event=>updateAttention('reduceFlashing',event.target.checked);$('attention-simplified-language').onchange=event=>updateAttention('simplifiedLanguage',event.target.checked);$('attention-extended-timeouts').onchange=event=>updateAttention('extendedTimeouts',event.target.checked);$('settings-reset').onclick=()=>{Object.assign(state,DEFAULTS);save();applyState();notify('Settings reset','The local page settings returned to their shipped values.')};$('settings-export').onclick=()=>download('ding-pbx-page-settings.json',JSON.stringify({schemaVersion:1,encoding:'UTF-8',personalVocabulary:'omitted',settings:state},null,2));$('vocabulary-file').onchange=loadVocabulary;$('vocabulary-clear').onclick=()=>{localStorage.removeItem('ding-pbx-vocabulary-cache');$('vocabulary-file').value='';$('vocabulary-status').textContent='No file loaded; original wording is active.'};$('logo-file').onchange=loadLogo;$('logo-clear').onclick=()=>{localStorage.removeItem('ding-pbx-logo-cache');$('logo-file').value='';$('logo-status').textContent='No file loaded; default mark is active.'}}
  async function loadVocabulary(event){const file=event.target.files[0];if(!file)return;if(file.size>65536){$('vocabulary-status').textContent='Rejected: file exceeds 64 KiB.';return}try{const parsed=JSON.parse(await file.text());if(parsed.version!==1||!Array.isArray(parsed.replacements)||parsed.replacements.length>256)throw new Error('Expected version 1 and no more than 256 replacements.');if(parsed.replacements.some(item=>!item||typeof item.from!=='string'||typeof item.to!=='string'||item.from.length>128||item.to.length>256))throw new Error('Every replacement needs bounded from and to strings.');const keys=parsed.replacements.map(item=>item.from);if(new Set(keys).size!==keys.length)throw new Error('Duplicate keys are not accepted; each from value must appear once.');localStorage.setItem('ding-pbx-vocabulary-cache',JSON.stringify(parsed));$('vocabulary-status').textContent=`Loaded ${parsed.replacements.length} local replacement${parsed.replacements.length===1?'':'s'}. No data was transmitted.`}catch(error){$('vocabulary-status').textContent=`Rejected: ${error.message}`}}
  async function loadLogo(event){const file=event.target.files[0];if(!file)return;if(file.size>131072){$('logo-status').textContent='Rejected: file exceeds 128 KiB.';return}if(!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)){$('logo-status').textContent='Rejected: only PNG, JPEG, or SVG images are accepted.';return}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the file.'));reader.readAsDataURL(file)});localStorage.setItem('ding-pbx-logo-cache',dataUrl);$('logo-status').textContent=`Loaded local logo (${Math.round(file.size/1024)} KiB). No data was transmitted.`}catch(error){$('logo-status').textContent=`Rejected: ${error.message}`}}
  function download(name,text){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
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
      const style=getComputedStyle(document.documentElement),line=style.getPropertyValue('--outline-variant').trim()||'#333',accent=style.getPropertyValue('--primary').trim()||'#82D9A5';
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

  function initSettingsPreview(){
    const preview=$('settings-preview');if(!preview)return;
    const sync=()=>{if($('preview-scale'))$('preview-scale').style.width=`${Math.max(0,Math.min(100,(state.fontScale-90)/40*100))}%`;if($('preview-density'))$('preview-density').textContent=state.density};
    ['theme-mode','language-mode','density-mode','accent-color','font-scale','motion-mode'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',sync)});
    sync();
  }

  function init(){applyState();initNavigation();initDestinationMap();renderDestinations();initSearch();initRegex();initSettings();renderNotifications();initReveals();initHeroCanvas();initCounters();initConnectionDiagram();initSettingsPreview();$('palette-open')?.addEventListener('click',openPalette);$('palette-search')?.addEventListener('input',event=>renderPalette(event.target.value));$('notification-open')?.addEventListener('click',()=>{$('notifications-dialog').showModal();renderNotifications()});$('notification-clear')?.addEventListener('click',()=>{state.notifications=[];save();renderNotifications()})}
  init();
})();
