import {
  CATEGORIES, DEFINITIONS, createTemplate, makeNode, findNode, walkNodes,
  insertNode, moveNode, removeNode, duplicateNode, validateProject,
  componentMarkup, esc, generateHtml, getDependencySummary, isSafeAssetUrl
} from './core.js';

const $ = sel => document.querySelector(sel);
const byId = id => document.getElementById(id);
const saved = localStorage.getItem('uiw-project-v1');
let project;
try {
  const parsed = saved ? JSON.parse(saved) : createTemplate('query');
  validateProject(parsed);
  project = parsed;
} catch { project = createTemplate('query'); }
let selectedId = null;
let preview = false;
let device = 'desktop';
let activeTab = 'catalog';
let exportMode = project.profile.runtime;
const undo = [], redo = [];
let toastTimer;
const MAX_HISTORY = 60;

const snapshot = () => JSON.stringify(project);
function historyPush() { undo.push(snapshot()); if (undo.length > MAX_HISTORY) undo.shift(); redo.length = 0; }
function persist() { try { localStorage.setItem('uiw-project-v1', snapshot()); } catch {} }
function countNodes() { let n = 0; walkNodes(project.nodes, () => n++); return n; }
function changed() { persist(); renderCanvas(); renderInspector(); renderLayers(); renderHeader(); if (preview) refreshPreview(); }
function mutate(fn) { historyPush(); fn(); changed(); }
function getSelected() { return selectedId ? findNode(project.nodes, selectedId) : null; }
function toast(message) { const t = byId('toast'); t.textContent = message; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2600); }
function select(id) { selectedId = id; renderCanvas(); renderInspector(); renderLayers(); }
function renderHeader() {
  byId('project-name').textContent = project.profile.name;
  byId('component-count').textContent = Object.keys(DEFINITIONS).length;
  byId('status-label').textContent = `${countNodes()} 個畫布節點`;
  byId('footer-count').textContent = `${countNodes()} components`;
  byId('footer-runtime').textContent = `${{ bootstrap:'Bootstrap 5', tailwind:'Tailwind CSS', native:'Native CSS' }[project.profile.cssFramework]} · ${project.profile.runtime === 'vue' ? 'Vue 3 Global' : 'Vanilla JS'}`;
  byId('btn-undo').disabled = undo.length === 0;
  byId('btn-redo').disabled = redo.length === 0;
  byId('template-select').value = 'query';
}
function renderCatalog() {
  const keyword = byId('catalog-search').value.trim().toLowerCase();
  byId('catalog-list').innerHTML = CATEGORIES.map(cat => {
    const blocks = Object.entries(DEFINITIONS).filter(([id, def]) => def.category === cat.id && `${id} ${def.name}`.toLowerCase().includes(keyword));
    if (!blocks.length) return '';
    return `<div class="catalog-section"><div class="catalog-heading">${cat.name} <span style="opacity:.6">/ ${blocks.length}</span></div><div class="catalog-items">${blocks.map(([id, def])=>`
      <button type="button" class="catalog-item" draggable="true" data-new-type="${id}" title="點擊加入畫布；也可拖曳到指定位置"><span class="catalog-icon">${esc(def.icon)}</span><span class="catalog-name">${esc(def.name)}</span>${def.dependency?'<span class="dep">選用套件</span>':''}</button>`).join('')}</div></div>`;
  }).join('') || '<div class="inspector-help">找不到元件，試試其他關鍵字。</div>';
}
function renderLayers() {
  const list = [];
  function visit(nodes, depth=0) {
    for (const node of nodes) {
      const def = DEFINITIONS[node.type];
      const value = node.props.title || node.props.label || node.props.text || def.name;
      list.push(`<div class="layer-row ${node.id === selectedId ? 'active' : ''}" data-select-id="${esc(node.id)}" style="padding-left:${9+depth*12}px"><span>${esc(def.icon)}</span><span>${esc(String(value).slice(0,22))}</span></div>`);
      if (node.children) visit(node.children, depth+1);
    }
  }
  visit(project.nodes);
  byId('layer-tree').innerHTML = list.length ? list.join('') : '<div class="inspector-help">尚無圖層，請先加入元件。</div>';
}
function renderEditorNode(node) {
  const def = DEFINITIONS[node.type];
  const selectedClass = node.id === selectedId ? ' selected' : '';
  const attr = `data-id="${esc(node.id)}" draggable="true" class="ed-node${selectedClass}"`;
  if (node.children) {
    const p = node.props;
    const isPlain = ['row','column','columns2'].includes(node.type);
    const contentTitle = p.title ? `<div class="ed-container-title ${node.type === 'card'?'ed-card-title':''}">${esc(p.title)}</div>` : '';
    const typ = {row:'row-layout',columns2:'grid-layout'}[node.type] || '';
    const inlineStyle = `padding:${Math.min(80,Math.max(0,Number(p.padding)||0))}px;gap:${Math.min(90,Math.max(0,Number(p.gap)||0))}px;border-radius:${Math.min(40,Math.max(0,Number(p.radius)||0))}px;${/^#[0-9a-fA-F]{3,8}$/.test(p.background) ? `background:${p.background}` : ''}`;
    return `<div ${attr}><div class="node-label">${esc(def.name)}</div><div class="ed-container ${isPlain?'transparent':''}" style="${inlineStyle}">${contentTitle}<div class="ed-children ${typ}" data-inside="${esc(node.id)}">${node.children.map(renderEditorNode).join('')}</div></div></div>`;
  }
  const markup = componentMarkup({ nodes:[node], profile:project.profile }, 'vanilla');
  return `<div ${attr}><div class="node-label">${esc(def.name)}</div><div class="node-contents ed-leaf">${markup}</div></div>`;
}
function renderCanvas() {
  const parent = byId('editor-canvas');
  parent.innerHTML = project.nodes.length ? project.nodes.map(renderEditorNode).join('') : '<div class="empty-canvas"><strong>從左側拖曳元件到這裡</strong><span>或者直接點選左側元件，就能加入畫布</span></div>';
  parent.insertAdjacentHTML('beforeend','<div class="editor-root-drop" data-root-drop="true">＋ 拖曳至此，新增到頁面底部</div>');
}
function propertyInput(key, label, value, kind='text', hint='') {
  const id = `prop-${key}`;
  const help = hint ? `<small>${esc(hint)}</small>` : '';
  if (kind === 'select:variant') {
    return `<label class="property"><span>${label}</span><select data-prop="${key}">${[['primary','主要（藍）'],['secondary','次要（灰）'],['danger','危險（紅）'],['outline','框線'],['success','成功（綠）'],['warning','警告（黃）'],['info','提示'],['neutral','中性']].map(([v,l])=>`<option value="${v}" ${value === v?'selected':''}>${l}</option>`).join('')}</select>${help}</label>`;
  }
  if (kind === 'select:level') return `<label class="property"><span>${label}</span><select data-prop="${key}">${['h1','h2','h3','h4'].map(v=>`<option value="${v}" ${value===v?'selected':''}>${v}</option>`).join('')}</select></label>`;
  if (kind === 'color') return `<label class="property"><span>${label}</span><div class="color-row"><input data-prop="${key}" type="color" value="${/^#[0-9a-fA-F]{6}$/.test(value)?value:'#ffffff'}" /><span class="color-value">${esc(value)}</span></div></label>`;
  if (kind === 'textarea') return `<label class="property"><span>${label}</span><textarea data-prop="${key}" rows="3">${esc(value)}</textarea>${help}</label>`;
  return `<label class="property"><span>${label}</span><input id="${id}" type="${kind==='number'?'number':'text'}" ${kind==='number'?'min="0" max="100"':''} data-prop="${key}" value="${esc(value)}" />${help}</label>`;
}
const LABELS = { title:'區塊標題',text:'文字內容',label:'欄位標籤',field:'資料鍵 / Binding',placeholder:'Placeholder',options:'選項（逗號分隔）',action:'Callback 名稱',variant:'顯示樣式',columns:'欄位（逗號分隔）',rows:'測試資料（每行一筆，逗號分隔）',level:'標題階層',padding:'內距 Padding (px)',gap:'間距 Gap (px)',radius:'圓角 (px)',background:'背景顏色' };
function renderInspector() {
  const hit = getSelected(), target = byId('inspector-content');
  if (!hit) {
    target.innerHTML = `<div class="inspector-empty"><div class="big-symbol">⚙</div><strong>尚未選取元件</strong><small>從畫布點選任一元件，就可以調整文字、樣式、資料鍵與事件。</small></div><div class="inspector-section"><div class="inspector-section-title">目前專案設定</div><div class="inspector-help"><b>${esc(project.profile.name)}</b><br/>${project.profile.cssFramework} · ${project.profile.runtime}<br/><br/>右上角「專案環境」可設定第三方 CSS / JS。</div></div>`;
    return;
  }
  const n = hit.node, def = DEFINITIONS[n.type];
  const keys = Object.keys(n.props);
  const contentKeys = keys.filter(key => !['padding','gap','radius','background'].includes(key));
  const styleKeys = keys.filter(key => ['padding','gap','radius','background'].includes(key));
  const inputs = (arr) => arr.map(key => {
    let kind='text';
    if (['padding','gap','radius'].includes(key)) kind='number';
    if (key==='background') kind='color';
    if (key==='variant') kind='select:variant';
    if (key==='level') kind='select:level';
    if (['rows','text'].includes(key) && (key==='rows' || n.type==='text'||n.type==='alert')) kind='textarea';
    const hint = key==='action'?'僅輸出 Callback 介面，業務系統自行提供函式。':key==='field'?'英文欄位名稱；Vue 會生成 v-model。':key==='options'?'例如：全部,待處理,已完成':'';
    return propertyInput(key,LABELS[key]||key,n.props[key],kind,hint);
  }).join('');
  target.innerHTML = `<div class="inspector-section"><div class="inspector-identity"><div class="identity-icon">${esc(def.icon)}</div><div><div class="identity-name">${esc(def.name)}</div><div class="identity-type">${esc(n.type)} · ${esc(n.id)}</div></div></div></div>
    ${contentKeys.length?`<div class="inspector-section"><div class="inspector-section-title">內容與行為 / Content & Events</div>${inputs(contentKeys)}</div>`:''}
    ${styleKeys.length?`<div class="inspector-section"><div class="inspector-section-title">樣式 / Styling</div>${inputs(styleKeys)}</div>`:''}
    <div class="inspector-section"><div class="inspector-section-title">元件操作</div><div class="inspector-actions"><button data-node-action="duplicate">▣ 複製</button><button data-node-action="up">↑ 上移</button><button data-node-action="down">↓ 下移</button><button data-node-action="delete" class="danger">♧ 刪除</button></div></div>
    ${def.dependency?`<div class="inspector-section"><div class="inspector-help">這個元件可使用 ${esc(def.dependency)}。若未啟用套件，輸出時會退回原生選單。</div></div>`:''}`;
}
function setPreview(enabled) {
  preview = enabled;
  byId('editor-canvas').classList.toggle('hidden', enabled);
  byId('preview-canvas').classList.toggle('hidden', !enabled);
  byId('btn-preview').classList.toggle('active', enabled);
  byId('btn-preview').textContent = enabled ? '✎ 返回編輯' : '▷ 預覽';
  if (enabled) refreshPreview();
}
function refreshPreview() {
  byId('preview-frame').srcdoc = generateHtml(project, project.profile.runtime, { preview:true });
}
function addType(type, targetId=null, position='inside') {
  let destId = targetId;
  if (!destId) { const hit = getSelected(); if (hit?.node.children) destId = selectedId; }
  const node = makeNode(type);
  mutate(() => { if (!insertNode(project.nodes, node, destId, position)) project.nodes.push(node); selectedId = node.id; });
  toast(`已加入「${DEFINITIONS[type].name}」`);
}
function rootTarget() { return { id:null, position:'inside' }; }
function resolveTarget(ev) {
  const nodeEl = ev.target.closest?.('.ed-node');
  if (!nodeEl) return rootTarget();
  const id = nodeEl.dataset.id, target = findNode(project.nodes,id);
  if (!target) return rootTarget();
  const rect = nodeEl.getBoundingClientRect();
  const fraction = Math.max(0,Math.min(1,(ev.clientY-rect.top)/(rect.height||1)));
  if (target.node.children && fraction >= .16 && fraction <= .84) return { id, position:'inside' };
  return {id,position:fraction < .5?'before':'after'};
}
function markDrop(target) {
  document.querySelectorAll('.drop-before,.drop-after,.drop-inside,.drag-hover').forEach(el=>el.classList.remove('drop-before','drop-after','drop-inside','drag-hover'));
  if (target.id) byId('editor-canvas').querySelector(`[data-id="${CSS.escape(target.id)}"]`)?.classList.add(`drop-${target.position}`);
  else byId('editor-canvas').querySelector('.editor-root-drop')?.classList.add('drag-hover');
}
function download(name, text, type='text/plain') {
  const blob = new Blob([text], {type:`${type};charset=utf-8`});
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function openModal(name) { byId(`${name}-modal`).classList.remove('hidden'); }
function closeModal(name) { byId(`${name}-modal`).classList.add('hidden'); }
function fillSettings() {
  const p=project.profile;
  byId('setting-name').value=p.name||'';
  byId('setting-css').value=p.cssFramework;
  byId('setting-runtime').value=p.runtime;
  byId('setting-tomselect').checked=!!p.tomselect;
  byId('setting-razor').checked=!!p.razor;
  byId('setting-css-urls').value=(p.cssUrls||[]).join('\n');
  byId('setting-js-urls').value=(p.jsUrls||[]).join('\n');
  byId('setting-custom-css').value=p.customCss||'';
}
function settingsApply() {
  const parseUrls = (id) => byId(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const cssUrls=parseUrls('setting-css-urls'), jsUrls=parseUrls('setting-js-urls');
  const invalid=[...cssUrls,...jsUrls].filter(u=>!isSafeAssetUrl(u));
  if (invalid.length) {toast('不合法的網址（僅接受完整 HTTP/HTTPS URL）');return;}
  if(cssUrls.length>10||jsUrls.length>10){toast('每類最多 10 個外部資源 URL');return;}
  const css = byId('setting-custom-css').value;
  if(css.length>15000){toast('自訂 CSS 限制 15,000 字元');return;}
  mutate(()=>{
    Object.assign(project.profile, {name:byId('setting-name').value.trim()||'未命名專案',cssFramework:byId('setting-css').value,runtime:byId('setting-runtime').value,tomselect:byId('setting-tomselect').checked,razor:byId('setting-razor').checked,cssUrls,jsUrls,customCss:css});
  });
  exportMode=project.profile.runtime; closeModal('settings'); toast('專案環境已更新');
}
function exportRefresh() {
  const code = generateHtml(project,exportMode);
  const deps = getDependencySummary(project);
  byId('export-code').value=code;
  byId('export-lines').textContent=`${code.split('\n').length} lines`;
  byId('export-summary').textContent=`${deps.css.length} CSS · ${deps.js.length + (exportMode==='vue'?1:0)} JS references`;
}
function doUndo() {
  if (!undo.length) return;
  redo.push(snapshot());project=JSON.parse(undo.pop());selectedId=null;changed();toast('已復原上一步');
}
function doRedo() {
  if (!redo.length) return;
  undo.push(snapshot());project=JSON.parse(redo.pop());selectedId=null;changed();toast('已重做');
}

byId('catalog-search').addEventListener('input',renderCatalog);
byId('catalog-list').addEventListener('click',ev=>{const el=ev.target.closest('[data-new-type]');if(el)addType(el.dataset.newType);});
byId('catalog-list').addEventListener('dragstart',ev=>{
  const el=ev.target.closest('[data-new-type]');if (!el) return;
  ev.dataTransfer.setData('text/plain',`new:${el.dataset.newType}`); ev.dataTransfer.effectAllowed='copy';
});
byId('editor-canvas').addEventListener('click',ev=>{
  const el=ev.target.closest('.ed-node');
  select(el?.dataset.id||null);
});
byId('editor-canvas').addEventListener('dragstart',ev=>{
  const el=ev.target.closest('.ed-node'); if(!el)return;
  ev.stopPropagation(); ev.dataTransfer.setData('text/plain',`move:${el.dataset.id}`); ev.dataTransfer.effectAllowed='move';
});
byId('editor-canvas').addEventListener('dragover',ev=>{ev.preventDefault();markDrop(resolveTarget(ev));});
byId('editor-canvas').addEventListener('dragleave',ev=>{if(!byId('editor-canvas').contains(ev.relatedTarget)) markDrop(rootTarget());});
byId('editor-canvas').addEventListener('drop',ev=>{
  ev.preventDefault();
  const input=ev.dataTransfer.getData('text/plain');
  const target=resolveTarget(ev);
  if (input.startsWith('new:')) {
    const type=input.slice(4); if(DEFINITIONS[type]) addType(type,target.id,target.position);
  } else if(input.startsWith('move:')) {
    const id=input.slice(5);
    const hit=findNode(project.nodes,id);
    if(hit && (id!==target.id || target.position==='inside')) {
      let ok=false;
      mutate(()=> {ok=moveNode(project.nodes,id,target.id,target.position); if(ok)selectedId=id;});
      if(!ok)toast('無法將容器放入自身或子元件');
    }
  }
  renderCanvas();
});
byId('inspector-content').addEventListener('change',ev=>{
  const el=ev.target.closest('[data-prop]');if(!el)return;
  const hit=getSelected();if(!hit)return;
  let value=el.value;
  if(el.type==='number') value=Math.max(0,Math.min(100,Number(value)||0));
  mutate(()=>{hit.node.props[el.dataset.prop]=value;});
});
byId('inspector-content').addEventListener('click',ev=>{
  const el=ev.target.closest('[data-node-action]');if(!el)return;
  const hit=getSelected();if(!hit)return;
  const id=selectedId;
  const action=el.dataset.nodeAction;
  mutate(()=>{
    if(action==='duplicate')selectedId=duplicateNode(project.nodes,id).id;
    if(action==='delete'){removeNode(project.nodes,id);selectedId=null;}
    if(action==='up'&&hit.index>0){const arr=hit.siblings;[arr[hit.index-1],arr[hit.index]]=[arr[hit.index],arr[hit.index-1]];}
    if(action==='down'&&hit.index<hit.siblings.length-1){const arr=hit.siblings;[arr[hit.index+1],arr[hit.index]]=[arr[hit.index],arr[hit.index+1]];}
  });
});
byId('layer-tree').addEventListener('click',ev=>{const el=ev.target.closest('[data-select-id]');if(el) select(el.dataset.selectId);});
for(const btn of document.querySelectorAll('[data-left-tab]')) btn.addEventListener('click',()=>{
  activeTab=btn.dataset.leftTab;
  document.querySelectorAll('[data-left-tab]').forEach(el=>el.classList.toggle('active',el.dataset.leftTab===activeTab));
  byId('catalog-panel').classList.toggle('hidden',activeTab!=='catalog');
  byId('layers-panel').classList.toggle('hidden',activeTab!=='layers');
});
for(const btn of document.querySelectorAll('[data-size]')) btn.addEventListener('click',()=>{
  device=btn.dataset.size;
  document.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('active',x.dataset.size===device));
  byId('artboard-wrap').classList.remove('tablet','mobile');if(device!=='desktop')byId('artboard-wrap').classList.add(device);
  byId('screen-label').textContent={desktop:'Desktop · Responsive',tablet:'Tablet · 760 px',mobile:'Mobile · 400 px'}[device];
});
byId('btn-undo').addEventListener('click',doUndo);
byId('btn-redo').addEventListener('click',doRedo);
byId('btn-preview').addEventListener('click',()=>setPreview(!preview));
byId('btn-close-selection').addEventListener('click',()=>select(null));
byId('btn-settings').addEventListener('click',()=>{fillSettings();openModal('settings');});
byId('btn-apply-settings').addEventListener('click',settingsApply);
byId('btn-export').addEventListener('click',()=>{exportMode=project.profile.runtime;byId('export-mode').value=exportMode;exportRefresh();openModal('export');});
byId('export-mode').addEventListener('change',ev=>{exportMode=ev.target.value;exportRefresh();});
byId('btn-copy-code').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(byId('export-code').value);toast('程式碼已複製');}
  catch{byId('export-code').select();document.execCommand('copy');toast('已選取並複製程式碼');}
});
byId('btn-download-html').addEventListener('click',()=>{download('ui-workbench-export.html',byId('export-code').value,'text/html');toast('已下載完整 HTML 範例');});
byId('btn-save-json').addEventListener('click',()=>{download('ui-workbench-project.json',JSON.stringify(project,null,2),'application/json');toast('已下載專案 JSON');});
byId('btn-import').addEventListener('click',()=>byId('file-import').click());
byId('file-import').addEventListener('change',async ev=>{
  const file=ev.target.files?.[0];if(!file)return;
  try {const parsed=JSON.parse(await file.text());validateProject(parsed);mutate(()=>{project=parsed;selectedId=null;});setPreview(false);toast('成功載入專案 JSON');}
  catch(err){toast(`匯入失敗：${err.message}`);}
  ev.target.value='';
});
byId('template-select').addEventListener('change',ev=>{
  const name=ev.target.value;
  if(!window.confirm('切換模板會覆蓋目前畫布（可以使用復原）。確定嗎？'))return;
  mutate(()=>{const replacement=createTemplate(name);replacement.profile=structuredClone(project.profile);project=replacement;selectedId=null;});
  setPreview(false);toast('已切換模板');
});
for(const el of document.querySelectorAll('[data-close]')) el.addEventListener('click',()=>closeModal(el.dataset.close));
for(const el of document.querySelectorAll('.modal-backdrop')) el.addEventListener('click',ev=>{if(ev.target===el)el.classList.add('hidden');});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape') {for(const el of document.querySelectorAll('.modal-backdrop'))el.classList.add('hidden');return;}
  if(ev.target.matches('input,textarea,select'))return;
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?doRedo():doUndo();}
});
window.addEventListener('message',ev=>{
  if(ev.source !== byId('preview-frame').contentWindow)return;
  // This PoC doesn't accept commands from the iframe. Logging is intentional.
});
renderCatalog();renderCanvas();renderInspector();renderLayers();renderHeader();
