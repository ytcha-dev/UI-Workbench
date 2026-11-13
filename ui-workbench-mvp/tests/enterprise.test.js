import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModules, validateModules, findPage, filterRequests, initialRequests } from '../styles/enterprise/schema.js';

test('enterprise framework supplies three default modules with nested pages', () => {
  assert.deepEqual(defaultModules.map(m => m.id), ['approval', 'system', 'master']);
  validateModules(defaultModules);
  const found = findPage(defaultModules, 'users');
  assert.equal(found.node.kind, 'users');
  assert.deepEqual(found.parents.map(p => p.id), ['system']);
});

test('menu validation accepts a third-level page and resolves its full hierarchy', () => {
  const modules = structuredClone(defaultModules);
  modules[2].children.push({ id: 'trade', name: '貿易資料', children: [{ id: 'ports', name: '港口資料', kind: 'custom' }] });
  validateModules(modules);
  assert.deepEqual(findPage(modules, 'ports').parents.map(p => p.id), ['master', 'trade']);
});

test('menu validation rejects ambiguous IDs, blank names and excessive depth', () => {
  assert.throws(() => validateModules([{ id: 'one', name: '一', children: [{ id: 'one', name: '重複' }] }]));
  assert.throws(() => validateModules([{ id: 'one', name: ' ' }]));
  assert.throws(() => validateModules([{ id: 'one', name: '一', children: [{ id: 'two', name: '二', children: [{ id: 'three', name: '三', children: [{ id: 'four', name: '四' }] }] }] }]));
});

test('request filters combine status, type and case-insensitive keyword without mutating source', () => {
  assert.equal(filterRequests(initialRequests).length, 8);
  assert.deepEqual(filterRequests(initialRequests, { keyword: 'ap-2026-0086', type: '信用狀作業' }).map(r => r.id), ['AP-2026-0086']);
  assert.equal(filterRequests(initialRequests, { keyword: '不存在' }).length, 0);
  assert.equal(filterRequests(initialRequests, { status: 'approved' }).length, 2);
  assert.equal(initialRequests.length, 11);
});
