export const style = { id: 'enterprise-navy', name: '深藍商務', version: 1 };

// Module → function group → page. Presentation is kept outside this schema.
export const defaultModules = [
  { id: 'approval', name: '簽核管理', icon: 'stamp', description: '集中處理申請與審核流程', children: [
    { id: 'pending', name: '待我簽核', kind: 'approvals' },
    { id: 'history', name: '簽核紀錄', kind: 'history' },
    { id: 'flows', name: '簽核流程', kind: 'flows' }
  ] },
  { id: 'system', name: '系統管理', icon: 'settings', description: '功能、權限與系統設定', children: [
    { id: 'menus', name: '功能選單', kind: 'menus' },
    { id: 'roles', name: '角色管理', kind: 'roles' },
    { id: 'users', name: '使用者管理', kind: 'users' },
    { id: 'categories', name: '系統分類', kind: 'categories' },
    { id: 'codes', name: '系統代碼', kind: 'codes' }
  ] },
  { id: 'master', name: '主檔管理', icon: 'database', description: '維護跨模組共用的基本資料', children: [
    { id: 'customers', name: '客戶主檔', kind: 'customers' },
    { id: 'suppliers', name: '供應商主檔', kind: 'suppliers' },
    { id: 'documents', name: '表單類型', kind: 'documents' }
  ] }
];

export function validateModules(modules) {
  if (!Array.isArray(modules) || !modules.length || modules.length > 30) throw new Error('模組數量必須介於 1 與 30 之間');
  const ids = new Set();
  function visit(nodes, depth) {
    for (const node of nodes) {
      if (!node || !/^[a-z][a-z0-9-]{0,59}$/.test(node.id) || ids.has(node.id)) throw new Error('功能代碼不正確或重複');
      if (typeof node.name !== 'string' || !node.name.trim() || node.name.length > 40) throw new Error('請輸入 1–40 字的名稱');
      ids.add(node.id);
      if (node.children) {
        if (!Array.isArray(node.children) || depth >= 3 || node.children.length > 40) throw new Error('最多支援三層選單');
        visit(node.children, depth + 1);
      }
    }
  }
  visit(modules, 1);
  return modules;
}

export function findPage(modules, id, parents = []) {
  for (const node of modules) {
    if (node.id === id) return { node, parents };
    const found = node.children && findPage(node.children, id, [...parents, node]);
    if (found) return found;
  }
  return null;
}

export function filterRequests(requests, { keyword = '', type = '', status = 'pending' } = {}) {
  const search = keyword.trim().toLowerCase();
  return requests.filter(row => (!status || row.status === status) && (!type || row.type === type) &&
    (!search || [row.id, row.title, row.company, row.owner, row.type].join(' ').toLowerCase().includes(search)));
}

export const initialRequests = [
  ['AP-2026-0086', 'L/C 收文申請', '信用狀作業', '遠辰紡織股份有限公司', '陳柏宇', '國際業務部', '11-13 09:42', 'urgent', 'pending'],
  ['AP-2026-0085', '海運出口指示單', '出口作業', '旭和國際貿易有限公司', '王思涵', '船務部', '11-13 09:18', 'normal', 'pending'],
  ['AP-2026-0084', '電放申請單', '出口作業', '立境實業股份有限公司', '黃子晴', '船務部', '11-13 08:56', 'normal', 'pending'],
  ['AP-2026-0083', '運費請款申請', '費用作業', '澄川物流有限公司', '李承恩', '財務部', '11-12 16:30', 'urgent', 'pending'],
  ['AP-2026-0082', '客戶資料異動', '主檔異動', '森合材料科技有限公司', '張庭瑄', '國際業務部', '11-12 15:48', 'normal', 'pending'],
  ['AP-2026-0081', '空運出口指示單', '出口作業', '兆禾科技股份有限公司', '陳柏宇', '國際業務部', '11-12 14:22', 'normal', 'pending'],
  ['AP-2026-0080', '押匯申請單', '信用狀作業', '遠辰紡織股份有限公司', '王思涵', '財務部', '11-12 11:06', 'normal', 'pending'],
  ['AP-2026-0079', '供應商資料建檔', '主檔異動', '青序包裝有限公司', '黃子晴', '採購部', '11-12 10:15', 'normal', 'pending'],
  ['AP-2026-0078', '運費請款申請', '費用作業', '澄川物流有限公司', '李承恩', '財務部', '11-11 16:18', 'normal', 'approved'],
  ['AP-2026-0077', 'L/C 收文申請', '信用狀作業', '旭和國際貿易有限公司', '張庭瑄', '國際業務部', '11-11 11:20', 'normal', 'approved'],
  ['AP-2026-0076', '電放申請單', '出口作業', '立境實業股份有限公司', '陳柏宇', '船務部', '11-10 14:05', 'normal', 'rejected']
].map(([id, title, type, company, owner, department, time, priority, status]) => ({ id, title, type, company, owner, department, time, priority, status }));

export const directoryPages = {
  roles: { columns: ['角色名稱', '角色代碼', '權限範圍', '使用人數'], rows: [['系統管理員', 'ADMIN', '全部模組', '2 位'], ['簽核主管', 'APPROVER', '簽核管理、主檔管理', '6 位'], ['一般使用者', 'MEMBER', '申請及個人紀錄', '18 位']] },
  users: { columns: ['使用者', '帳號', '部門', '角色'], rows: [['林怡安', 'yian.lin', '營運管理部', '簽核主管'], ['陳柏宇', 'boyu.chen', '國際業務部', '一般使用者'], ['王思涵', 'sihan.wang', '船務部', '一般使用者'], ['系統管理員', 'admin', '資訊部', '系統管理員']] },
  categories: { columns: ['分類名稱', '分類代碼', '所屬模組', '項目數'], rows: [['申請表單', 'FORM_TYPE', '簽核管理', '8'], ['部門組織', 'DEPARTMENT', '系統管理', '6'], ['交易條件', 'TRADE_TERM', '主檔管理', '5']] },
  codes: { columns: ['代碼名稱', '代碼', '系統分類', '排序'], rows: [['待簽核', 'PENDING', '簽核狀態', '1'], ['已核准', 'APPROVED', '簽核狀態', '2'], ['已退回', 'REJECTED', '簽核狀態', '3'], ['一般', 'NORMAL', '優先順序', '1'], ['急件', 'URGENT', '優先順序', '2']] },
  customers: { columns: ['客戶名稱', '客戶代碼', '聯絡人', '交易條件'], rows: [['遠辰紡織股份有限公司', 'C-0001', '陳小姐', '月結 30 天'], ['旭和國際貿易有限公司', 'C-0002', '李先生', '即期信用狀'], ['立境實業股份有限公司', 'C-0003', '王小姐', '月結 60 天'], ['森合材料科技有限公司', 'C-0004', '周先生', '月結 30 天']] },
  suppliers: { columns: ['供應商名稱', '供應商代碼', '供應類別', '聯絡人'], rows: [['澄川物流有限公司', 'V-0001', '物流運輸', '吳先生'], ['青序包裝有限公司', 'V-0002', '包裝材料', '林小姐'], ['禾映資訊有限公司', 'V-0003', '資訊服務', '張先生']] },
  documents: { columns: ['表單名稱', '表單代碼', '所屬流程', '編號規則'], rows: [['L/C 收文申請', 'LC_RECEIVE', '一般簽核', 'LC-{YYYY}-{0000}'], ['海運出口指示單', 'SEA_EXPORT', '出口作業簽核', 'SE-{YYYY}-{0000}'], ['運費請款申請', 'FREIGHT', '費用簽核', 'FR-{YYYY}-{0000}']] }
};
