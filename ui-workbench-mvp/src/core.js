/**
 * UI Workbench core (framework-independent).
 * The editable project tree is the source of truth; never store generated HTML as editor state.
 */
export const VERSION = 1;
export const CATEGORIES = [
  { id: 'layout', name: '版面配置' },
  { id: 'text', name: '文字展示' },
  { id: 'form', name: '表單欄位' },
  { id: 'data', name: '資料 / 互動' },
];
export const DEFINITIONS = {
  section: { name: '區塊容器', icon: '▣', category: 'layout', acceptsChildren: true, props: { title: '區塊標題', padding: 20, gap: 12, background: '#ffffff', radius: 12 } },
  row: { name: '水平排列', icon: '▥', category: 'layout', acceptsChildren: true, props: { gap: 12, padding: 8, background: 'transparent', radius: 8 } },
  column: { name: '垂直排列', icon: '▤', category: 'layout', acceptsChildren: true, props: { gap: 12, padding: 8, background: 'transparent', radius: 8 } },
  columns2: { name: '雙欄網格', icon: '▦', category: 'layout', acceptsChildren: true, props: { gap: 12, padding: 8, background: 'transparent', radius: 8 } },
  card: { name: '卡片容器', icon: '▢', category: 'layout', acceptsChildren: true, props: { title: '卡片標題', gap: 12, padding: 18, background: '#ffffff', radius: 12 } },
  heading: { name: '標題', icon: 'H', category: 'text', props: { text: '標題文字', level: 'h3' } },
  text: { name: '段落文字', icon: 'T', category: 'text', props: { text: '請輸入說明文字。' } },
  divider: { name: '分隔線', icon: '—', category: 'text', props: {} },
  badge: { name: '標籤', icon: '◈', category: 'text', props: { text: '已完成', variant: 'success' } },
  alert: { name: '提示訊息', icon: 'ⓘ', category: 'text', props: { text: '這是一則提示訊息。', variant: 'info' } },
  input: { name: '文字輸入', icon: '▭', category: 'form', props: { label: '客戶名稱', field: 'customerName', placeholder: '請輸入客戶名稱' } },
  textarea: { name: '多行文字', icon: '☷', category: 'form', props: { label: '備註', field: 'remark', placeholder: '請輸入備註' } },
  select: { name: '下拉選單', icon: '⌄', category: 'form', props: { label: '狀態', field: 'status', options: '全部,處理中,已完成' } },
  checkbox: { name: '核取方塊', icon: '☑', category: 'form', props: { label: '只顯示有效資料', field: 'active' } },
  button: { name: '按鈕', icon: '▰', category: 'form', props: { text: '送出', variant: 'primary', action: 'onSubmit' } },
  tomselect: { name: 'Tom Select', icon: '⌕', category: 'data', dependency: 'tomselect', props: { label: '選擇項目', field: 'category', options: '國內,國外,其他' } },
  table: { name: '資料表格', icon: '▦', category: 'data', props: { columns: '單號,客戶,金額,狀態', rows: 'REQ-001,遠東貿易,12500,待確認\nREQ-002,世界物流,8800,已完成' } },
  actions: { name: '操作列', icon: '•••', category: 'data', props: { text: '新增,匯出', action: 'onToolbarAction' } },
};

let serial = 0;
export function makeNode(type, override = {}) {
  if (!DEFINITIONS[type]) throw new Error(`未知元件類型: ${type}`);
  return {
    id: `n${Date.now().toString(36)}_${(++serial).toString(36)}`,
    type,
    props: { ...structuredClone(DEFINITIONS[type].props), ...(override.props || {}) },
    ...(DEFINITIONS[type].acceptsChildren ? { children: override.children || [] } : {}),
  };
}

export function createTemplate(name = 'query') {
  const root = [];
  if (name === 'query') {
    const card = makeNode('section', { props: { title: '請款單查詢', padding: 24, gap: 16 } });
    const grid = makeNode('columns2');
    grid.children.push(makeNode('input', { props: { label: '請款單號', field: 'billNo', placeholder: '請輸入單號' } }));
    grid.children.push(makeNode('select', { props: { label: '請款類別', field: 'feeType', options: '全部,國內費用,國外費用' } }));
    const grid2 = makeNode('columns2');
    grid2.children.push(makeNode('input', { props: { label: '起始日期', field: 'startDate', placeholder: 'YYYY-MM-DD' } }));
    grid2.children.push(makeNode('tomselect', { props: { label: '申請部門', field: 'department', options: '全部部門,業務部,會計部,資訊部' } }));
    const toolbar = makeNode('row');
    toolbar.children.push(makeNode('button', { props: { text: '查詢資料', variant: 'primary', action: 'onSearch' } }));
    toolbar.children.push(makeNode('button', { props: { text: '清除條件', variant: 'secondary', action: 'onReset' } }));
    card.children.push(makeNode('text', { props: { text: '請輸入查詢條件，下方資料為展示用範例。' } }), grid, grid2, toolbar);
    root.push(card, makeNode('table'));
  } else if (name === 'maintenance') {
    const card = makeNode('card', { props: { title: '客戶資料維護', padding: 24 } });
    const grid = makeNode('columns2');
    grid.children.push(makeNode('input', { props: { label: '客戶編號', field: 'customerId', placeholder: 'CUS-001' } }));
    grid.children.push(makeNode('input', { props: { label: '客戶名稱', field: 'customerName', placeholder: '請輸入名稱' } }));
    card.children.push(grid, makeNode('textarea'), makeNode('checkbox'));
    const row = makeNode('row');
    row.children.push(makeNode('button', { props: { text: '儲存', action: 'onSave' } }));
    row.children.push(makeNode('button', { props: { text: '取消', action: 'onCancel', variant: 'secondary' } }));
    card.children.push(row);
    root.push(card);
  }
  return {
    version: VERSION,
    profile: { name: '公司專案 Demo', cssFramework: 'bootstrap', runtime: 'vanilla', razor: false, tomselect: true, cssUrls: [], jsUrls: [], customCss: '' },
    nodes: root,
  };
}

export function findNode(nodes, id, parent = null) {
  for (const node of nodes) {
    if (node.id === id) return { node, parent, siblings: nodes, index: nodes.indexOf(node) };
    if (node.children) {
      const hit = findNode(node.children, id, node);
      if (hit) return hit;
    }
  }
  return null;
}
export function walkNodes(nodes, fn) {
  for (const node of nodes) { fn(node); if (node.children) walkNodes(node.children, fn); }
}
export function insertNode(nodes, incoming, destId = null, position = 'inside') {
  if (!destId) { nodes.push(incoming); return true; }
  const dest = findNode(nodes, destId);
  if (!dest) return false;
  if (incoming.id === destId || (incoming.children && findNode(incoming.children, destId))) return false;
  if (position === 'inside') {
    if (!dest.node.children) return false;
    dest.node.children.push(incoming);
    return true;
  }
  const i = dest.siblings.indexOf(dest.node);
  dest.siblings.splice(i + (position === 'after' ? 1 : 0), 0, incoming);
  return true;
}
export function moveNode(nodes, id, destId, position = 'inside') {
  const source = findNode(nodes, id);
  if (!source || id === destId) return false;
  if (source.node.children && destId && findNode(source.node.children, destId)) return false;
  const [node] = source.siblings.splice(source.index, 1);
  if (!insertNode(nodes, node, destId, position)) {
    source.siblings.splice(source.index, 0, node);
    return false;
  }
  return true;
}
export function removeNode(nodes, id) {
  const hit = findNode(nodes, id);
  if (!hit) return false;
  hit.siblings.splice(hit.index, 1);
  return true;
}
export function duplicateNode(nodes, id) {
  const hit = findNode(nodes, id);
  if (!hit) return null;
  const clone = structuredClone(hit.node);
  walkNodes([clone], n => { n.id = `n${Date.now().toString(36)}_${(++serial).toString(36)}`; });
  hit.siblings.splice(hit.index + 1, 0, clone);
  return clone;
}
export function validateProject(input) {
  if (!input || !Array.isArray(input.nodes) || typeof input.profile !== 'object') throw new Error('無效的專案格式');
  let count = 0;
  const ids = new Set();
  function check(items, depth = 0) {
    if (depth > 30) throw new Error('元件巢狀層級過深');
    for (const n of items) {
      if (++count > 500) throw new Error('元件數量超過上限 500');
      if (!DEFINITIONS[n.type] || typeof n.id !== 'string' || ids.has(n.id) || !n.props || typeof n.props !== 'object') throw new Error('不支援的元件資料');
      ids.add(n.id);
      if (n.children) {
        if (!DEFINITIONS[n.type].acceptsChildren || !Array.isArray(n.children)) throw new Error('容器資料不正確');
        check(n.children, depth + 1);
      }
    }
  }
  check(input.nodes);
  const p = input.profile;
  if (!['bootstrap', 'tailwind', 'native'].includes(p.cssFramework) || !['vanilla', 'vue'].includes(p.runtime)) throw new Error('不支援的專案環境');
  for (const key of ['cssUrls', 'jsUrls']) {
    if (!Array.isArray(p[key]) || p[key].length > 10 || p[key].some(url => !isSafeAssetUrl(url))) throw new Error(`不合法的 ${key}`);
  }
  return true;
}
export function isSafeAssetUrl(url) {
  try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function safeToken(s) { return String(s || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50) || 'field'; }
function cssValue(v, fallback = '') { return /^(transparent|#[0-9a-fA-F]{3,8}|rgb\([\d\s,.%]+\)|rgba\([\d\s,.%]+\))$/.test(String(v)) ? String(v) : fallback; }
function num(v, fallback, max = 100) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback; }
function sty(node) {
  const p = node.props;
  const css = [];
  if (p.padding !== undefined) css.push(`padding:${num(p.padding, 12)}px`);
  if (p.gap !== undefined) css.push(`gap:${num(p.gap, 12)}px`);
  if (p.radius !== undefined) css.push(`border-radius:${num(p.radius, 8)}px`);
  if (p.background !== undefined) css.push(`background:${cssValue(p.background, 'transparent')}`);
  return css.join(';');
}
function optionList(value) { return String(value || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 60); }
function rowsList(value) { return String(value || '').split('\n').slice(0, 50).map(x => x.split(',').slice(0, 20)); }
export function getFields(nodes) {
  const fields = {};
  walkNodes(nodes, n => { if (['input', 'textarea', 'select', 'tomselect', 'checkbox'].includes(n.type)) fields[safeToken(n.props.field)] = n.type === 'checkbox' ? false : ''; });
  return fields;
}
const block = (node, code, cls = '') => `<div class="uiw-component ${cls}" data-component="${esc(node.type)}">${code}</div>`;
function renderNode(node, mode = 'vanilla', profile = {}) {
  const p = node.props, id = esc(node.id), cls = (name = '') => `uiw-${node.type}${name ? ` ${name}` : ''}`;
  const bs = profile.cssFramework === 'bootstrap';
  const tw = profile.cssFramework === 'tailwind';
  const controlClass = `uiw-control${bs ? ' form-control' : ''}${tw ? ' w-full rounded-md border border-slate-300 bg-white px-3 py-2' : ''}`;
  const vb = mode === 'vue', razor = profile.razor && vb;
  const attrBind = (name) => vb ? `v-model${node.type === 'checkbox' ? '' : ''}="form.${safeToken(name)}"` : `name="${safeToken(name)}"`;
  const child = () => (node.children || []).map(n => renderNode(n, mode, profile)).join('\n');
  const style = sty(node), styleAttr = style ? ` style="${esc(style)}"` : '';
  const options = optionList(p.options).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  const eventName = String(p.action || 'onAction').replace(/[^\w]/g, '').slice(0, 50) || 'onAction';
  const click = vb ? `${razor ? '@@' : '@'}click="emitAction('${eventName}')"` : `data-action="${esc(eventName)}"`;
  switch (node.type) {
    case 'section': return `<section data-uiw-id="${id}" class="uiw-section${bs ? ' card' : ''}"${styleAttr}>${p.title ? `<h2 class="uiw-section-title">${esc(p.title)}</h2>` : ''}${child()}</section>`;
    case 'card': return `<div data-uiw-id="${id}" class="uiw-card${bs ? ' card' : ''}"${styleAttr}>${p.title ? `<h3 class="uiw-card-title">${esc(p.title)}</h3>` : ''}${child()}</div>`;
    case 'row': case 'column': case 'columns2': return `<div data-uiw-id="${id}" class="${cls()}"${styleAttr}>${child()}</div>`;
    case 'heading': { const tag = ['h1','h2','h3','h4'].includes(p.level) ? p.level : 'h3'; return `<${tag} data-uiw-id="${id}" class="uiw-heading">${esc(p.text)}</${tag}>`; }
    case 'text': return `<p data-uiw-id="${id}" class="uiw-text">${esc(p.text)}</p>`;
    case 'divider': return `<hr data-uiw-id="${id}" class="uiw-divider" />`;
    case 'badge': return `<span data-uiw-id="${id}" class="uiw-badge uiw-${['success','warning','danger','info','neutral'].includes(p.variant)?p.variant:'neutral'}">${esc(p.text)}</span>`;
    case 'alert': return `<div data-uiw-id="${id}" class="uiw-alert uiw-${['success','warning','danger','info','neutral'].includes(p.variant)?p.variant:'neutral'}" role="status">ⓘ ${esc(p.text)}</div>`;
    case 'input': return `<label data-uiw-id="${id}" class="uiw-field"><span>${esc(p.label)}</span><input class="${controlClass}" ${attrBind(p.field)} placeholder="${esc(p.placeholder)}" /></label>`;
    case 'textarea': return `<label data-uiw-id="${id}" class="uiw-field"><span>${esc(p.label)}</span><textarea class="${controlClass}" ${attrBind(p.field)} rows="3" placeholder="${esc(p.placeholder)}"></textarea></label>`;
    case 'select': case 'tomselect': return `<label data-uiw-id="${id}" class="uiw-field"><span>${esc(p.label)}</span><select class="${controlClass}${node.type==='tomselect' && profile.tomselect?' uiw-tom-select':''}${bs ? ' form-select' : ''}" ${attrBind(p.field)}><option value="">請選擇</option>${options}</select></label>`;
    case 'checkbox': return `<label data-uiw-id="${id}" class="uiw-check"><input type="checkbox" ${attrBind(p.field)} /><span>${esc(p.label)}</span></label>`;
    case 'button': return `<button data-uiw-id="${id}" type="button" class="uiw-btn uiw-btn-${['primary','secondary','danger','outline'].includes(p.variant)?p.variant:'primary'}${bs ? ` btn btn-${p.variant === 'outline' ? 'outline-primary' : ['primary','secondary','danger'].includes(p.variant) ? p.variant : 'primary'}` : ''}${tw ? ' rounded-lg px-4 py-2 font-semibold' : ''}" ${click}>${esc(p.text)}</button>`;
    case 'table': { const cols = optionList(p.columns); const rows = rowsList(p.rows); return `<div data-uiw-id="${id}" class="uiw-table-wrap"><table class="uiw-table${bs ? ' table' : ''}"><thead><tr>${cols.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map((_,i)=>`<td>${esc(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
    case 'actions': return `<div data-uiw-id="${id}" class="uiw-actions">${optionList(p.text).map(label => `<button type="button" class="uiw-btn uiw-btn-outline" ${click} data-value="${esc(label)}">${esc(label)}</button>`).join('')}</div>`;
    default: return '';
  }
}
export function componentMarkup(project, mode = project.profile.runtime) {
  return project.nodes.map(n => renderNode(n, mode, project.profile)).join('\n');
}
export const BASE_CSS = `
:root{--uiw-accent:#2563eb;--uiw-ink:#243047;--uiw-border:#dce3ed;--uiw-muted:#758299;--uiw-back:#f4f7fb}
*{box-sizing:border-box} body{margin:0;background:var(--uiw-back);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--uiw-ink)}
.uiw-root{max-width:1080px;margin:0 auto;padding:28px 22px;display:flex;flex-direction:column;gap:16px}
.uiw-section,.uiw-card{display:flex;flex-direction:column;gap:14px;background:#fff;border:1px solid var(--uiw-border);border-radius:12px;padding:22px;box-shadow:0 3px 14px rgba(41,66,100,.035)}
.uiw-section-title,.uiw-card-title{margin:0 0 4px;font-size:18px;font-weight:700;letter-spacing:-.3px}.uiw-card-title{font-size:16px}
.uiw-row{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-items:end}.uiw-column{display:flex;flex-direction:column;gap:12px;min-width:0;flex:1}.uiw-columns2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.uiw-heading{margin:4px 0 0}.uiw-text{color:#76839a;font-size:13px;margin:0}.uiw-divider{border:0;border-top:1px solid var(--uiw-border);width:100%}
.uiw-field{display:flex;flex-direction:column;gap:7px;flex:1;min-width:0;font-size:12.5px;font-weight:650;color:#3c4b63}
.uiw-control{font:inherit;font-weight:400;min-width:0;width:100%;height:38px;padding:8px 10px;background:#fff;border:1px solid #ccd5e2;border-radius:7px;color:var(--uiw-ink);outline:none}.uiw-control:focus{border-color:var(--uiw-accent);box-shadow:0 0 0 3px rgba(37,99,235,.09)}
textarea.uiw-control{height:auto;min-height:90px}.uiw-check{display:inline-flex;gap:9px;align-items:center;font-size:13px;cursor:pointer}
.uiw-btn{border:1px solid transparent;border-radius:7px;padding:9px 16px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}.uiw-btn-primary{background:var(--uiw-accent);color:white}.uiw-btn-secondary{background:#e8edf4;color:#334155}.uiw-btn-danger{background:#dc3545;color:#fff}.uiw-btn-outline{background:#fff;color:var(--uiw-accent);border-color:#c5d6fa}.uiw-btn:hover{filter:brightness(.97)}
.uiw-actions{display:flex;gap:10px;flex-wrap:wrap}.uiw-badge{display:inline-block;align-self:flex-start;border-radius:99px;padding:3px 10px;background:#eff3f8;color:#576379;font-size:12px;font-weight:650}.uiw-alert{padding:11px 14px;border-radius:7px;background:#eaf4ff;color:#275b87;font-size:13px}
.uiw-badge.uiw-success{background:#dbf6e6;color:#167548}.uiw-badge.uiw-warning{background:#fff1d0;color:#936307}.uiw-badge.uiw-danger{background:#ffe4e5;color:#b33343}.uiw-badge.uiw-info{background:#e2f1ff;color:#26618b}.uiw-alert.uiw-success{background:#e5f8ed;color:#167548}.uiw-alert.uiw-warning{background:#fff6dd;color:#936307}.uiw-alert.uiw-danger{background:#ffe9e8;color:#aa3240}
.uiw-table-wrap{overflow:auto;border:1px solid var(--uiw-border);border-radius:10px;background:#fff}.uiw-table{border-collapse:collapse;width:100%;font-size:13px;text-align:left}.uiw-table th{background:#f5f7fb;color:#69768c;font-weight:700}.uiw-table td,.uiw-table th{padding:12px 15px;border-bottom:1px solid #edf0f6}.uiw-table tr:last-child td{border:0}
.uiw-root[data-theme="tailwind"]{--uiw-accent:#0f766e}.uiw-root[data-theme="native"]{--uiw-accent:#6d5efc}
@media(max-width:620px){.uiw-columns2{grid-template-columns:1fr}.uiw-root{padding:12px}.uiw-section,.uiw-card{padding:15px}}
`;
function safeStyleText(s) { return String(s || '').replace(/<\/style/gi, '<\\/style').slice(0, 15000); }
function scriptStr(s) { return String(s || '').replace(/<\/script/gi, '<\\/script'); }
function dependencies(project) {
  const p = project.profile, css = [], js = [];
  if (p.cssFramework === 'bootstrap') css.push('https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css');
  // Tailwind v4 browser compiler is for prototyping, not production builds.
  if (p.cssFramework === 'tailwind') js.push('https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4');
  if (p.tomselect) {
    const usesTom = project.nodes.some(n => n.type === 'tomselect' || (n.children && includesType(n.children, 'tomselect')));
    if (usesTom) { css.push('https://cdn.jsdelivr.net/npm/tom-select@2.6.2/dist/css/tom-select.css'); js.push('https://cdn.jsdelivr.net/npm/tom-select@2.6.2/dist/js/tom-select.complete.min.js'); }
  }
  for (const url of p.cssUrls || []) if (isSafeAssetUrl(url)) css.push(url);
  for (const url of p.jsUrls || []) if (isSafeAssetUrl(url)) js.push(url);
  return { css: [...new Set(css)], js: [...new Set(js)] };
}
function includesType(nodes, type) { return nodes.some(n => n.type === type || (n.children && includesType(n.children,type))); }
function bodyScript(project, mode = 'vanilla', preview = false) {
  const tom = `if (window.TomSelect) document.querySelectorAll('.uiw-tom-select').forEach(el => { if (!el.tomselect) new TomSelect(el, { create: false }); });`;
  const callback = `window.UIWorkbenchCallbacks = window.UIWorkbenchCallbacks || {};
  function runCallback(name, payload){
    const fn = window.UIWorkbenchCallbacks[name];
    if (typeof fn === 'function') fn(payload);
    else console.info('[UIWorkbench] callback:', name, payload);
  }`;
  if (mode === 'vue') {
    const fields = JSON.stringify(getFields(project.nodes));
    return `const { createApp } = Vue;
  ${callback}
  createApp({
    data() { return { form: ${fields} }; },
    methods: {
      emitAction(name) { runCallback(name, { ...this.form }); }
    },
    mounted() { ${tom} }
  }).mount('#uiw-app');`;
  }
  return `${callback}
  document.querySelector('#uiw-app').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const values = Object.fromEntries(new FormData(document.querySelector('#uiw-form')).entries());
    document.querySelectorAll('#uiw-form input[type=checkbox]').forEach(x => { values[x.name] = x.checked; });
    runCallback(button.dataset.action, { ...values, actionValue: button.dataset.value || null });
  });
  ${tom}`;
}
export function generateHtml(project, mode = project.profile.runtime, { preview = false } = {}) {
  const deps = dependencies(project);
  const vueUrl = 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js';
  const head = deps.css.map(u => `<link rel="stylesheet" href="${esc(u)}">`).join('\n');
  const scripts = [...deps.js, ...(mode === 'vue' ? [vueUrl] : [])].map(u => `<script src="${esc(u)}"></script>`).join('\n');
  const markup = componentMarkup(project, mode);
  const fullScript = bodyScript(project, mode, preview);
  const style = `${BASE_CSS}\n${safeStyleText(project.profile.customCss)}`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.profile.name || 'UI Workbench Export')}</title>
${head}
<style>${style}</style>
</head>
<body>
<div id="uiw-app" class="uiw-root" data-theme="${esc(project.profile.cssFramework)}">
${mode === 'vanilla' ? `<form id="uiw-form" onsubmit="return false" style="display:contents">${markup}</form>` : markup}
</div>
${scripts}
<script>
${scriptStr(fullScript)}
</script>
</body>
</html>`;
}
export function getDependencySummary(project) { return dependencies(project); }
