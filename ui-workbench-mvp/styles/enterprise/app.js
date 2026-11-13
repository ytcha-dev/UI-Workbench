import { style, defaultModules, validateModules, findPage, filterRequests, initialRequests, directoryPages } from './schema.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  stamp: '<path d="M9 13V9a3 3 0 1 1 6 0v4l3 3v3H6v-3l3-3Z"/><path d="M5 22h14M9 3h6"/>',
  settings: '<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6"/>',
  folder: '<path d="M3 6h7l2 3h9v12H3V6Z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', reset: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
  sort: '<path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/>'
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const key = 'aster-enterprise-v1';
function readStored() { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
const stored = readStored();
let modules;
try { modules = validateModules(stored.modules); } catch { modules = structuredClone(defaultModules); }
let requests = structuredClone(initialRequests).map(row => ({ ...row, ...(stored.decisions?.[row.id] && ['approved', 'rejected'].includes(stored.decisions[row.id].status) ? { status: stored.decisions[row.id].status, comment: String(stored.decisions[row.id].comment || '').slice(0, 500) } : {}) }));
const records = {};
for (const [id, config] of Object.entries(directoryPages)) {
  const saved = stored.records?.[id];
  records[id] = Array.isArray(saved) && saved.length < 1000 && saved.every(r => Array.isArray(r.values) && r.values.length === config.columns.length && r.values.every(v => typeof v === 'string' && v.length <= 120))
    ? saved.map(r => ({ values: r.values, enabled: r.enabled !== false })) : config.rows.map(values => ({ values: [...values], enabled: true }));
}
const state = { view: 'pending', expanded: new Set(['approval', 'system']), tab: 'all', keyword: '', type: '', sort: 'desc', page: 1, pageSize: 6, selected: new Set(), tree: 'approval', directoryKeyword: '' };
let toastTimer;
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
function persist() {
  const decisions = Object.fromEntries(requests.filter(r => r.status !== initialRequests.find(i => i.id === r.id)?.status && initialRequests.some(i => i.id === r.id)).map(r => [r.id, { status: r.status, comment: r.comment || '' }]));
  try { localStorage.setItem(key, JSON.stringify({ modules, decisions, records })); } catch { notify('瀏覽器無法儲存；本次操作仍保留在目前頁面。'); }
}
const statusNames = { pending: '待簽核', approved: '已核准', rejected: '已退回' };
const badge = status => `<span class="badge ${status}">${statusNames[status] || (status === 'enabled' ? '啟用中' : '已停用')}</span>`;
function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function navNodes(nodes, depth = 0) {
  return nodes.map(node => node.children ? `<div class="${depth ? 'nav-nested' : ''}"><button class="module-toggle" data-toggle="${esc(node.id)}" aria-expanded="${state.expanded.has(node.id)}">${icon(node.icon || 'folder')}<span>${esc(node.name)}</span>${icon('chevron', 'chevron')}</button>${state.expanded.has(node.id) ? `<div class="nav-children">${navNodes(node.children, depth + 1)}</div>` : ''}</div>` : `<a class="nav-page ${state.view === node.id ? 'active' : ''}" href="#${esc(node.id)}" ${state.view === node.id ? 'aria-current="page"' : ''}>${esc(node.name)}${node.id === 'pending' ? `<span class="nav-count">${requests.filter(r => r.status === 'pending').length}</span>` : ''}</a>`).join('');
}
function renderNav() {
  $('#sidebar').innerHTML = `<a class="brand" href="#pending" aria-label="Aster 首頁"><span class="brand-mark">a</span><span class="brand-name">aster<span style="color:#6e91e9">.</span><small>ENTERPRISE WORKSPACE</small></span></a><div class="workspace-switch">${icon('building')}<span>企業營運工作空間</span>${icon('chevron', 'chevron')}</div><nav class="nav-scroll"><div class="nav-label">WORKSPACE</div><a class="nav-home" href="#pending">${icon('grid')}<span>我的工作台</span></a><div class="nav-label">APPLICATIONS</div>${navNodes(modules)}</nav><div class="sidebar-bottom"><div class="sidebar-note"><strong class="note-head">${icon('layers')}模組化，讓工作更有條理</strong>${modules.length} 個獨立模組，串起日常工作。<br>依組織需求，自由建立功能層級。</div><a class="back-link" href="../../index.html">${icon('back')}前往 UI Workbench ${icon('arrow')}</a></div>`;
}
function heading(title, description, actions = '') {
  return `<div class="page-heading"><div><div class="eyebrow">YOUR WORK, BEAUTIFULLY ORGANIZED</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function getRows() {
  let rows = filterRequests(requests, { keyword: state.keyword, type: state.type, status: state.view === 'history' ? '' : 'pending' });
  if (state.view === 'history') rows = rows.filter(r => r.status !== 'pending');
  if (state.tab === 'urgent') rows = rows.filter(r => r.priority === 'urgent');
  return state.sort === 'asc' ? rows.toReversed() : rows;
}
function stats() {
  const pending = requests.filter(r => r.status === 'pending').length;
  const urgent = requests.filter(r => r.status === 'pending' && r.priority === 'urgent').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  return `<section class="stats" aria-label="簽核摘要"><article class="stat"><div><div class="stat-label">待處理申請</div><div class="stat-number">${String(pending).padStart(2, '0')}<small>件</small></div></div><div class="stat-icon">${icon('file')}</div><div class="stat-bottom"><span class="warning">${urgent} 件急件</span><span>等候你的優先處理</span></div></article><article class="stat"><div><div class="stat-label">已完成核准</div><div class="stat-number">${String(approved).padStart(2, '0')}<small>件</small></div></div><div class="stat-icon green">${icon('check')}</div><div class="stat-bottom"><span class="positive">流程持續前進</span><span>每一次審核都有跡可循</span></div></article><article class="stat"><div><div class="stat-label">啟用中的流程</div><div class="stat-number">03<small>組</small></div></div><div class="stat-icon orange">${icon('layers')}</div><div class="stat-bottom">依表單類型，自動分派簽核層級</div></article></section>`;
}
function renderApprovals() {
  const rows = getRows();
  const pageCount = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);
  const history = state.view === 'history';
  $('#main').innerHTML = heading(history ? '簽核紀錄' : '待我簽核', history ? '每一個決定，都有清楚的軌跡。' : '掌握待辦進度，讓每一份申請順暢前行。', `<button class="button" data-action="export-csv">${icon('download')}匯出清單</button><button class="button primary" data-action="new-request">${icon('plus')}新增申請</button>`) + stats() + `<section class="panel"><div class="panel-top"><h2 class="panel-title">${icon('file')}${history ? '已處理的申請' : '簽核工作清單'}</h2><span class="panel-hint">跨模組集中處理 · 資料為示範內容</span></div><div class="tabs" role="tablist" aria-label="簽核篩選"><button class="tab ${state.tab === 'all' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'all'}" data-tab="all">${history ? '全部紀錄' : '全部待辦'}<b>${requests.filter(r => history ? r.status !== 'pending' : r.status === 'pending').length}</b></button><button class="tab ${state.tab === 'urgent' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'urgent'}" data-tab="urgent">急件優先 ${icon('bolt')}</button><a class="tab" href="#${history ? 'pending' : 'history'}">${history ? '返回待辦' : '已處理紀錄'} ${icon('arrow')}</a></div><form id="filter-form" class="filter-form"><label class="wide">關鍵字搜尋<span class="field-icon">${icon('search')}<input name="keyword" value="${esc(state.keyword)}" placeholder="搜尋單號、客戶或申請人…" maxlength="100"></span></label><label>表單類型<select name="type"><option value="">全部表單類型</option>${['信用狀作業', '出口作業', '費用作業', '主檔異動'].map(type => `<option ${state.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></label><div class="inline-actions"><button class="button ghost" type="button" data-action="clear-filter">重設</button><button class="button primary" type="submit">${icon('search')}查詢</button></div></form>${state.selected.size ? `<div class="selection-bar">已選取 ${state.selected.size} 件申請<button class="button small" data-action="bulk-approve">${icon('check')}批次核准</button><button class="button ghost small" data-action="clear-selection">取消選取</button></div>` : ''}<div class="table-scroll"><table><thead><tr><th class="check-cell"><input type="checkbox" id="select-all" aria-label="選取此頁待簽核申請" ${history || !pageRows.length ? 'disabled' : ''} ${pageRows.filter(r => r.status === 'pending').every(r => state.selected.has(r.id)) && pageRows.length ? 'checked' : ''}></th><th>申請單號 / 表單名稱</th><th>客戶 / 往來對象</th><th>申請人</th><th><button class="sort-button" data-action="sort">送出時間 ${icon('sort')}</button></th><th>簽核狀態</th><th>操作</th></tr></thead><tbody>${pageRows.map(row => `<tr><td class="check-cell"><input type="checkbox" data-select="${esc(row.id)}" aria-label="選取 ${esc(row.id)}" ${row.status !== 'pending' ? 'disabled' : ''} ${state.selected.has(row.id) ? 'checked' : ''}></td><td><button class="doc-title" data-detail="${esc(row.id)}">${esc(row.title)}</button><div class="doc-id">${esc(row.id)} <span class="priority ${row.priority}">${row.priority === 'urgent' ? `${icon('bolt')}急件` : ''}</span></div></td><td class="company">${esc(row.company)}</td><td><div class="person"><span class="avatar small">${esc(row.owner.slice(0, 1))}</span><div>${esc(row.owner)}<small>${esc(row.department)}</small></div></div></td><td class="date-cell">${esc(row.time)}</td><td>${badge(row.status)}</td><td><button class="text-action" data-detail="${esc(row.id)}">${history ? '查看' : '審核'} ${icon('chevron')}</button></td></tr>`).join('') || `<tr><td colspan="7"><div class="empty">${icon('search')}<strong>目前沒有符合的申請</strong><p>調整搜尋條件，或切換其他工作清單。</p></div></td></tr>`}</tbody></table></div><div class="table-footer"><span>顯示 ${rows.length ? start + 1 : 0}–${Math.min(start + state.pageSize, rows.length)} 筆，共 ${rows.length} 筆申請</span><div class="page-controls"><label class="visually-hidden" for="page-size">每頁筆數</label><select id="page-size">${[6, 10, 20].map(n => `<option value="${n}" ${n === state.pageSize ? 'selected' : ''}>${n} 筆 / 頁</option>`).join('')}</select><button data-page="${state.page - 1}" aria-label="上一頁" ${state.page === 1 ? 'disabled' : ''}>${icon('back')}</button>${Array.from({ length: pageCount }, (_, i) => `<button data-page="${i + 1}" ${state.page === i + 1 ? 'aria-current="page" class="current"' : ''}>${i + 1}</button>`).join('')}<button data-page="${state.page + 1}" aria-label="下一頁" ${state.page === pageCount ? 'disabled' : ''}>${icon('chevron')}</button></div></div></section><div class="below-table">${icon('info')}這是可互動的框架範例。簽核操作保存在此瀏覽器，不會送出至正式系統。</div>`;
}
function treeNodes(nodes) {
  return nodes.map(node => `<button class="tree-row ${state.tree === node.id ? 'active' : ''}" data-tree="${esc(node.id)}">${icon(node.children ? (findPage(modules, node.id).parents.length ? 'folder' : node.icon || 'layers') : 'file')}<span>${esc(node.name)}</span><small>${node.children ? `${node.children.length} 項` : '功能頁'}</small></button>${node.children ? `<div class="tree-branch">${treeNodes(node.children)}</div>` : ''}`).join('');
}
function renderMenus() {
  const found = findPage(modules, state.tree) || { node: modules[0], parents: [] };
  const { node, parents } = found;
  $('#main').innerHTML = heading('功能選單', '從模組到功能頁，建立符合團隊的工作層級。', `<button class="button" data-action="export-schema">${icon('download')}匯出框架</button><button class="button primary" data-action="add-menu">${icon('plus')}新增功能</button>`) + `<div class="demo-banner">${icon('layers')}以「模組 → 功能群組 → 功能頁」組織選單。你可以新增層級、調整名稱，變更會同步到左側導覽。</div><div class="menu-layout"><section class="panel"><div class="section-heading"><h2>功能架構</h2><small>${modules.length} 個模組 · 最多三層</small></div><div class="menu-tree">${treeNodes(modules)}</div></section><section class="panel"><div class="section-heading"><h2>功能設定</h2><span class="badge enabled">啟用中</span></div><form id="menu-edit" class="properties-form"><div class="property-kind">${icon(node.children ? 'folder' : 'file')}<div><strong>${node.children ? (parents.length ? '功能群組' : '獨立模組') : '功能頁面'}</strong><small>${esc([...parents.map(p => p.name), node.name].join(' / '))}</small></div></div><input type="hidden" name="id" value="${esc(node.id)}"><label>顯示名稱<input name="name" value="${esc(node.name)}" required maxlength="40"></label><label>功能代碼<input value="${esc(node.id)}" readonly></label><label>上層位置<input value="${esc(parents.at(-1)?.name || '最上層模組')}" readonly></label><p class="helper">功能代碼是固定識別值；顯示名稱可自由調整。<br>目前變更僅保存在此瀏覽器的框架範例中。</p><div class="form-error" role="alert"></div><div class="form-actions">${node.children && parents.length < 2 ? `<button type="button" class="button" data-action="add-menu" data-parent="${esc(node.id)}">${icon('plus')}新增下層</button>` : ''}<button class="button primary" type="submit">儲存變更</button></div></form></section></div>`;
}
function renderDirectory() {
  const found = findPage(modules, state.view);
  const config = directoryPages[found.node.kind];
  if (!config) {
    $('#main').innerHTML = heading(found.node.name, '已建立功能頁，準備接上你的業務內容。') + `<section class="panel"><div class="empty">${icon('layers')}<strong>功能頁已就緒</strong><p>此頁已加入模組架構，後續可在 Workbench 配置畫面內容。</p><a class="button small" style="margin-top:18px" href="#menus">管理功能架構</a></div></section>`;
    return;
  }
  const id = found.node.kind;
  const rows = records[id].map((row, index) => ({ ...row, index })).filter(row => row.values.join(' ').toLowerCase().includes(state.directoryKeyword.toLowerCase()));
  $('#main').innerHTML = heading(found.node.name, found.parents[0]?.id === 'master' ? '讓基本資料一致，讓跨模組協作更順暢。' : '維護系統基礎設定，讓團隊各司其職。', `<button class="button primary" data-action="add-record">${icon('plus')}新增資料</button>`) + `<div class="demo-banner">${icon('info')}示範資料可新增、編輯及切換啟用狀態。此版本尚未串接後端與正式權限控制。</div><section class="panel"><div class="section-heading"><h2>${esc(found.node.name)}清單</h2><small>${records[id].length} 筆資料</small></div><form class="directory-search" id="directory-filter"><span class="field-icon">${icon('search')}<input name="keyword" value="${esc(state.directoryKeyword)}" placeholder="搜尋名稱或代碼…" aria-label="搜尋資料" maxlength="100"></span><button class="button small" type="submit">查詢</button></form><div class="table-scroll"><table><thead><tr>${config.columns.map(c => `<th>${esc(c)}</th>`).join('')}<th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(row => `<tr>${row.values.map((v, i) => `<td>${i === 0 ? `<button class="doc-title" data-edit-record="${row.index}">${esc(v)}</button>` : esc(v)}</td>`).join('')}<td><button class="status-button" data-toggle-record="${row.index}" aria-label="${row.enabled ? '停用' : '啟用'} ${esc(row.values[0])}">${badge(row.enabled ? 'enabled' : 'disabled')}</button></td><td><button class="text-action" data-edit-record="${row.index}">編輯 ${icon('chevron')}</button></td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">${icon('search')}<strong>沒有符合的資料</strong></div></td></tr>`}</tbody></table></div><div class="table-footer">共 ${rows.length} 筆資料<span>點擊狀態標籤可切換啟用狀態</span></div></section>`;
}
const flows = [
  { name: '一般簽核流程', description: '適用於主檔異動與一般申請', steps: ['申請人送出', '部門主管審核', '完成歸檔'], count: '4 種表單' },
  { name: '出口作業簽核', description: '讓每一批出貨都有完整確認', steps: ['業務提出申請', '船務確認資料', '主管核准放行'], count: '3 種表單' },
  { name: '費用簽核流程', description: '從費用確認到財務核准', steps: ['申請人送出', '部門主管審核', '財務覆核'], count: '2 種表單' }
];
function renderFlows() {
  $('#main').innerHTML = heading('簽核流程', '依申請類型，安排清楚的簽核路徑。') + `<div class="demo-banner">${icon('info')}以下為三種預設流程的展示；實際流程引擎、代理人與權限規則將於後續串接。</div><div class="flow-grid">${flows.map((flow, index) => `<article class="panel flow-card"><div class="inline-actions"><div class="stat-icon">${icon('layers')}</div><span class="badge enabled">使用中</span></div><h2>${flow.name}</h2><p>${flow.description}</p>${flow.steps.map((step, i) => `<div class="flow-step"><span>${i + 1}</span><span>${step}</span></div>`).join('')}<button class="button" data-flow="${index}">查看流程 ${icon('arrow')}</button></article>`).join('')}</div>`;
}
function render() {
  const found = findPage(modules, state.view);
  if (!found) { location.hash = 'pending'; return; }
  $('#breadcrumb').innerHTML = `${icon('grid')}<span>${esc(found.parents.map(n => n.name).join(' / '))}</span>${icon('chevron')}<strong>${esc(found.node.name)}</strong>`;
  renderNav();
  if (found.node.kind === 'approvals' || found.node.kind === 'history') renderApprovals();
  else if (found.node.kind === 'menus') renderMenus();
  else if (found.node.kind === 'flows') renderFlows();
  else renderDirectory();
}
function navigate() {
  const id = location.hash.slice(1) || 'pending';
  const found = findPage(modules, id);
  if (!found || found.node.children) { location.hash = 'pending'; return; }
  state.view = id; state.page = 1; state.tab = 'all'; state.keyword = ''; state.type = ''; state.directoryKeyword = ''; state.selected.clear();
  found.parents.forEach(p => state.expanded.add(p.id));
  document.body.classList.remove('nav-open');
  $('#toggle-nav').setAttribute('aria-expanded', String(!matchMedia('(max-width:760px)').matches && !document.body.classList.contains('sidebar-hidden')));
  document.title = `${found.node.name} — Aster · 深藍商務`;
  render();
}
function openModal(title, body, footer = '', formId = '') {
  const modal = $('#modal');
  modal.innerHTML = `${formId ? `<form id="${formId}">` : ''}<div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2></div><button class="icon-button" type="button" data-close="modal" aria-label="關閉">${icon('close')}</button></div><div class="modal-body">${body}<div class="form-error" role="alert"></div></div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}${formId ? '</form>' : ''}`;
  modal.showModal();
}
const modalActions = (label = '儲存資料') => `<button class="button" type="button" data-close="modal">取消</button><button class="button primary" type="submit">${label}</button>`;
function openRequest(id) {
  const row = requests.find(r => r.id === id);
  if (!row) return;
  const pending = row.status === 'pending';
  $('#detail').innerHTML = `<div class="modal-head"><div><div class="eyebrow">APPLICATION DETAILS</div><h2 id="detail-title">${esc(row.title)}</h2><div class="detail-number">${esc(row.id)}</div></div><button class="icon-button" data-close="detail" aria-label="關閉明細">${icon('close')}</button></div><form id="decision-form"><input type="hidden" name="id" value="${esc(row.id)}"><div class="modal-body"><div class="inline-actions">${badge(row.status)}${row.priority === 'urgent' ? `<span class="priority urgent">${icon('bolt')}急件</span>` : ''}</div><div class="detail-grid">${[['申請人', row.owner], ['部門', row.department], ['表單類型', row.type], ['送出時間', `2026-${row.time}`], ['客戶 / 往來對象', row.company]].map(([label, value], i) => `<div class="detail-field ${i === 4 ? 'full' : ''}"><label>${label}</label><strong>${esc(value)}</strong></div>`).join('')}</div><div class="detail-section"><h3>簽核進度</h3><div class="timeline-item"><span class="timeline-dot">${icon('check')}</span><div><strong>申請已送出</strong><p>${esc(row.owner)} · ${esc(row.time)}</p></div></div><div class="timeline-item"><span class="timeline-dot ${pending ? 'waiting' : ''}">${icon(pending ? 'clock' : row.status === 'rejected' ? 'close' : 'check')}</span><div><strong>${pending ? '等候你的審核' : statusNames[row.status]}</strong><p>林怡安 · 營運管理部</p></div></div></div><div class="detail-section">${pending ? '<label>簽核意見<textarea name="comment" maxlength="500" placeholder="補充核准意見，或說明退回原因…"></textarea></label><p class="helper">退回申請時，請填寫原因，讓申請人知道如何調整。</p>' : `<h3>簽核意見</h3><p>${esc(row.comment || '此筆為既有示範紀錄，未附加意見。')}</p>`}</div><div class="form-error" role="alert"></div></div><div class="modal-footer detail-footer">${pending ? `<button class="button danger" name="decision" value="rejected" type="submit">退回申請</button><button class="button primary" name="decision" value="approved" type="submit">${icon('check')}核准申請</button>` : '<button class="button" type="button" data-close="detail">關閉明細</button>'}</div></form>`;
  $('#detail').showModal();
}
function openAddMenu(parentId) {
  const options = [{ id: '', label: '最上層（建立獨立模組）' }];
  function visit(nodes, parents = []) { for (const node of nodes) if (node.children && parents.length < 2) { options.push({ id: node.id, label: [...parents, node.name].join(' / ') }); visit(node.children, [...parents, node.name]); } }
  visit(modules);
  const parent = parentId ?? (findPage(modules, state.tree)?.node.children ? state.tree : findPage(modules, state.tree)?.parents.at(-1)?.id || '');
  openModal('新增模組 / 功能', `<label>上層位置<select name="parent">${options.map(o => `<option value="${esc(o.id)}" ${o.id === parent ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label><label>顯示名稱<input name="name" required maxlength="40" placeholder="例如：運務管理"></label><label>功能代碼<input name="id" required pattern="[a-z][a-z0-9-]{0,59}" maxlength="60" placeholder="例如：shipping"></label><label>功能類型<select name="kind"><option value="page">功能頁面</option><option value="group">功能群組</option></select></label><p>最上層會建立為獨立模組。每個模組可包含功能頁或功能群組，最多支援三層。</p>`, modalActions('建立功能'), 'add-menu-form');
}
function openRecord(index) {
  const node = findPage(modules, state.view).node;
  const config = directoryPages[node.kind];
  const row = Number.isInteger(index) ? records[node.kind][index] : null;
  openModal(`${row ? '編輯' : '新增'}${node.name}`, `<input type="hidden" name="index" value="${row ? index : ''}">${config.columns.map((c, i) => `<label>${esc(c)}<input name="field-${i}" value="${esc(row?.values[i] || '')}" required maxlength="120" placeholder="請輸入${esc(c)}"></label>`).join('')}`, modalActions(), 'record-form');
}
function showSearch() {
  openModal('前往功能', '<p>搜尋模組與功能名稱，快速切換你的工作。</p>');
  $('#modal .modal-body').insertAdjacentHTML('beforeend', '<label class="field-icon">搜尋功能<input id="quick-search" placeholder="例如：角色、客戶、簽核…" autocomplete="off"></label><div class="search-results" id="search-results"></div>');
  updateSearch(''); $('#quick-search').focus();
}
function updateSearch(keyword) {
  const pages = [];
  function visit(nodes, parents = []) { for (const node of nodes) node.children ? visit(node.children, [...parents, node.name]) : pages.push({ ...node, path: parents.join(' / ') }); }
  visit(modules);
  $('#search-results').innerHTML = pages.filter(n => `${n.path} ${n.name}`.includes(keyword.trim())).map(n => `<button class="search-result" data-goto="${esc(n.id)}">${icon('file')}<div><strong>${esc(n.name)}</strong><small>${esc(n.path)}</small></div></button>`).join('') || '<div class="empty">找不到符合的功能</div>';
}
document.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.dataset.close) { $(`#${target.dataset.close}`).close(); return; }
  if (target.dataset.toggle) { const id = target.dataset.toggle; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); renderNav(); }
  if (target.dataset.detail) openRequest(target.dataset.detail);
  if (target.dataset.tab) { state.tab = target.dataset.tab; state.page = 1; state.selected.clear(); renderApprovals(); }
  if (target.dataset.page) { state.page = Number(target.dataset.page); renderApprovals(); }
  if (target.dataset.tree) { state.tree = target.dataset.tree; renderMenus(); }
  if (target.dataset.goto) { $('#modal').close(); if (state.view === target.dataset.goto) navigate(); else location.hash = target.dataset.goto; }
  if (target.hasAttribute('data-edit-record')) openRecord(Number(target.dataset.editRecord));
  if (target.hasAttribute('data-toggle-record')) { const rows = records[findPage(modules, state.view).node.kind]; const row = rows[Number(target.dataset.toggleRecord)]; row.enabled = !row.enabled; persist(); renderDirectory(); notify(`已${row.enabled ? '啟用' : '停用'}這筆範例資料`); }
  if (target.hasAttribute('data-flow')) { const flow = flows[Number(target.dataset.flow)]; openModal(flow.name, `<p>${flow.description}</p>${flow.steps.map((s, i) => `<div class="flow-step"><span>${i + 1}</span><span>${s}</span></div>`).join('')}<p>適用 ${flow.count}。這是流程架構示意，尚未連接實際簽核引擎。</p>`, '<button class="button primary" data-close="modal">我知道了</button>'); }
  const action = target.dataset.action;
  if (action === 'clear-filter') { state.keyword = ''; state.type = ''; state.page = 1; state.selected.clear(); renderApprovals(); }
  if (action === 'clear-selection') { state.selected.clear(); renderApprovals(); }
  if (action === 'sort') { state.sort = state.sort === 'asc' ? 'desc' : 'asc'; state.page = 1; renderApprovals(); }
  if (action === 'add-menu') openAddMenu(target.dataset.parent);
  if (action === 'add-record') openRecord();
  if (action === 'export-schema') { download('aster-enterprise-framework.json', JSON.stringify({ style, modules }, null, 2), 'application/json'); notify('框架設定已匯出'); }
  if (action === 'export-csv') {
    const quote = value => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [['單號', '表單名稱', '類型', '客戶', '申請人', '送出時間', '狀態'], ...getRows().map(r => [r.id, r.title, r.type, r.company, r.owner, r.time, statusNames[r.status]])];
    download('簽核清單.csv', '\uFEFF' + rows.map(r => r.map(quote).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  if (action === 'new-request') openModal('新增示範申請', '<label>表單名稱<input name="title" placeholder="例如：運費請款申請" required maxlength="80"></label><label>表單類型<select name="type"><option>信用狀作業</option><option>出口作業</option><option>費用作業</option><option>主檔異動</option></select></label><label>客戶 / 往來對象<input name="company" placeholder="請輸入客戶名稱" required maxlength="100"></label><label>優先程度<select name="priority"><option value="normal">一般</option><option value="urgent">急件</option></select></label><p>新增資料只保留於本次開啟的頁面，重新整理後會回到範例資料。</p>', modalActions('建立示範申請'), 'request-form');
  if (action === 'bulk-approve') openModal('批次核准申請', `<p>即將核准已選取的 ${state.selected.size} 件示範申請。這項操作只會更新此瀏覽器的範例資料。</p><label>簽核意見<textarea name="comment" maxlength="500" placeholder="補充這次批次核准的意見…"></textarea></label>`, modalActions('確認核准'), 'bulk-form');
  if (action === 'reset-demo') { try { localStorage.removeItem(key); } catch {} location.href = location.pathname; }
});
document.addEventListener('change', event => {
  const target = event.target;
  if (target.dataset.select) { target.checked ? state.selected.add(target.dataset.select) : state.selected.delete(target.dataset.select); renderApprovals(); }
  if (target.id === 'select-all') { const rows = getRows().slice((state.page - 1) * state.pageSize, state.page * state.pageSize).filter(r => r.status === 'pending'); rows.forEach(r => target.checked ? state.selected.add(r.id) : state.selected.delete(r.id)); renderApprovals(); }
  if (target.id === 'page-size') { state.pageSize = Number(target.value); state.page = 1; renderApprovals(); }
});
document.addEventListener('input', event => { if (event.target.id === 'quick-search') updateSearch(event.target.value); });
document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const formId = form.getAttribute('id');
  const values = Object.fromEntries(new FormData(form));
  try {
    if (formId === 'filter-form') { state.keyword = values.keyword; state.type = values.type; state.page = 1; state.selected.clear(); renderApprovals(); }
    if (formId === 'directory-filter') { state.directoryKeyword = values.keyword; renderDirectory(); }
    if (formId === 'decision-form') {
      const decision = event.submitter?.value;
      if (!['approved', 'rejected'].includes(decision)) return;
      if (decision === 'rejected' && !values.comment.trim()) throw new Error('請填寫退回原因，讓申請人知道需要調整的地方。');
      const row = requests.find(r => r.id === values.id);
      if (!row || row.status !== 'pending') throw new Error('這筆申請已處理，請重新整理清單。');
      row.status = decision; row.comment = values.comment.trim(); state.selected.delete(row.id); persist(); $('#detail').close(); render(); notify(`已${decision === 'approved' ? '核准' : '退回'}示範申請 ${row.id}`);
    }
    if (formId === 'bulk-form') { requests.filter(r => state.selected.has(r.id) && r.status === 'pending').forEach(r => { r.status = 'approved'; r.comment = values.comment.trim(); }); state.selected.clear(); persist(); $('#modal').close(); render(); notify('已完成批次核准'); }
    if (formId === 'request-form') {
      if (!values.title.trim() || !values.company.trim()) throw new Error('請填寫表單名稱與往來對象。');
      const time = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      requests.unshift({ ...values, title: values.title.trim(), company: values.company.trim(), id: `AP-DEMO-${Date.now().toString(36).toUpperCase()}`, owner: '林怡安', department: '營運管理部', time, status: 'pending' });
      $('#modal').close(); state.keyword = ''; state.type = ''; state.tab = 'all'; state.page = 1; if (state.view === 'history') location.hash = 'pending'; else render(); notify('已建立示範申請');
    }
    if (formId === 'menu-edit') { const copy = structuredClone(modules); findPage(copy, values.id).node.name = values.name.trim(); modules = validateModules(copy); persist(); render(); notify('功能名稱已更新，左側導覽同步完成'); }
    if (formId === 'add-menu-form') {
      const copy = structuredClone(modules);
      const node = { id: values.id.trim(), name: values.name.trim(), ...(values.kind === 'group' || !values.parent ? { children: [], icon: 'folder' } : { kind: 'custom' }) };
      const parent = values.parent ? findPage(copy, values.parent) : null;
      if (parent) parent.node.children.push(node); else copy.push(node);
      modules = validateModules(copy); state.tree = node.id; if (parent) state.expanded.add(parent.node.id); persist(); $('#modal').close(); render(); notify('已新增功能，左側導覽同步完成');
    }
    if (formId === 'record-form') {
      const kind = findPage(modules, state.view).node.kind;
      const fields = directoryPages[kind].columns.map((_, i) => values[`field-${i}`].trim());
      if (fields.some(v => !v)) throw new Error('請完整填寫各欄位。');
      const duplicate = records[kind].some((r, i) => r.values[1] === fields[1] && String(i) !== values.index);
      if (duplicate) throw new Error('此代碼已存在，請使用不同的代碼。');
      if (values.index === '') records[kind].push({ values: fields, enabled: true }); else records[kind][Number(values.index)].values = fields;
      persist(); $('#modal').close(); renderDirectory(); notify('示範資料已儲存');
    }
  } catch (error) { const target = form.querySelector('.form-error'); if (target) target.textContent = error.message; else notify(error.message); }
});
$('#toggle-nav').innerHTML = icon('menu'); $('#search-icon').innerHTML = icon('search');
$('#toggle-nav').addEventListener('click', () => { const mobile = matchMedia('(max-width:760px)').matches; const cls = mobile ? 'nav-open' : 'sidebar-hidden'; document.body.classList.toggle(cls); $('#toggle-nav').setAttribute('aria-expanded', String(mobile ? document.body.classList.contains(cls) : !document.body.classList.contains(cls))); });
$('#mobile-shade').addEventListener('click', () => { document.body.classList.remove('nav-open'); $('#toggle-nav').setAttribute('aria-expanded', 'false'); });
$('#global-search').addEventListener('click', showSearch);
$('#profile-button').addEventListener('click', () => openModal('目前的示範工作空間', '<div class="person"><span class="avatar">林</span><div>林怡安<small>營運管理部 · 簽核主管</small></div></div><p>深藍商務 · Style 01<br>這是第一階段的系統框架與風格範例。模組、主檔及簽核決定保存在此瀏覽器；不含正式登入、後端或權限判斷。</p><p>還原範例會清除本機的選單調整、資料編輯與簽核決定。</p>', '<button class="button danger" data-action="reset-demo">還原範例資料</button><button class="button primary" data-close="modal">繼續體驗</button>'));
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!$('#modal').open && !$('#detail').open) showSearch(); } if (event.key === 'Escape') { document.body.classList.remove('nav-open'); if (matchMedia('(max-width:760px)').matches) $('#toggle-nav').setAttribute('aria-expanded', 'false'); } });
window.addEventListener('hashchange', navigate);
navigate();
