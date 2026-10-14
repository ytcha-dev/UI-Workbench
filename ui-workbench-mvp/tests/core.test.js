import test from 'node:test';
import assert from 'node:assert/strict';
import { createTemplate, makeNode, findNode, moveNode, removeNode, duplicateNode, validateProject, generateHtml, getFields, componentMarkup, isSafeAssetUrl } from '../src/core.js';

test('starter project has editable nested tree and valid profile', () => {
  const p = createTemplate('query');
  assert.equal(validateProject(p), true);
  assert.ok(p.nodes[0].children.length >= 3);
  assert.equal(getFields(p.nodes).billNo, '');
});
test('nested drag/drop cannot move container into descendant', () => {
  const p = createTemplate('blank');
  const outer = makeNode('section'), inner = makeNode('row');
  outer.children.push(inner);p.nodes.push(outer);
  assert.equal(moveNode(p.nodes, outer.id, inner.id, 'inside'),false);
  assert.equal(moveNode(p.nodes, inner.id,null,'inside'),true);
  assert.equal(p.nodes.length,2);
});
test('duplicate creates unique IDs recursively',()=>{
  const p=createTemplate('query');
  const cloned=duplicateNode(p.nodes,p.nodes[0].id);
  assert.notEqual(cloned.id,p.nodes[0].id);
  assert.notEqual(cloned.children[1].id,p.nodes[0].children[1].id);
  assert.equal(validateProject(p),true);
  assert.equal(removeNode(p.nodes,cloned.id),true);
});
test('safe rendering escapes user HTML and dangerous callback names',()=>{
  const p=createTemplate('blank');
  const button=makeNode('button',{props:{text:'<img src=x onerror=alert(1)>',action:'x\" onclick=\"alert(1)'}});
  p.nodes.push(button);
  const html=componentMarkup(p,'vanilla');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('onclick="alert(1)'));
});
test('vanilla output emits data-action and working event delegate',()=>{
  const p=createTemplate('query');
  const out=generateHtml(p,'vanilla');
  assert.match(out,/data-action="onSearch"/);
  assert.match(out,/window.UIWorkbenchCallbacks/);
  assert.match(out,/TomSelect/);
  assert.match(out,/bootstrap@5.3.8/);
});
test('Vue global output has Vue binding and optional Razor escape',()=>{
  const p=createTemplate('query');p.profile.razor=true;
  const html=generateHtml(p,'vue');
  assert.match(html,/vue\.global\.prod\.js/);
  assert.match(html,/v-model="form\.billNo"/);
  assert.match(html,/@@click="emitAction\('onSearch'\)"/);
  assert.doesNotMatch(html,/<template>/);
});
test('URL validation blocks unsafe schemes',()=>{
  assert.equal(isSafeAssetUrl('https://example.com/ui.css'),true);
  assert.equal(isSafeAssetUrl('javascript:alert(1)'),false);
  assert.equal(isSafeAssetUrl('data:text/html;base64,x'),false);
  assert.equal(isSafeAssetUrl('//example.com/ui.css'),false);
});
test('reject invalid imported project',()=>{
  const p=createTemplate('query');
  p.profile.jsUrls=['javascript:alert(1)'];
  assert.throws(()=>validateProject(p));
});
