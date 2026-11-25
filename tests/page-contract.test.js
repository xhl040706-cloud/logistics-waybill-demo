import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles, readme] = await Promise.all([
  readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../README.md', import.meta.url), 'utf8'),
]);

test('页面包含冻结的筛选、状态和详情节点', () => {
  for (const id of [
    'filter-form',
    'search-input',
    'status-filter',
    'exception-filter',
    'reset-filter',
    'result-summary',
    'table-container',
    'shipment-rows',
    'empty-state',
    'empty-title',
    'empty-description',
    'empty-reset',
    'page-feedback',
    'shipment-dialog',
    'dialog-title',
    'close-dialog',
    'detail-grid',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="exception-filter" type="checkbox" disabled/);
  assert.match(html, /<span id="result-summary"[^>]*>正在加载…<\/span>/);
  assert.match(html, /id="table-container"[^>]*hidden/);
  assert.match(html, /id="empty-state"[^>]*hidden/);
  assert.match(html, /id="page-feedback"[^>]*hidden/);
});

test('页面消费共享异常判定与原因格式化函数', () => {
  assert.match(app, /import\s*\{[\s\S]*isExceptionShipment[\s\S]*\}\s*from '\.\/lib\/shipment-utils\.js'/);
  assert.match(app, /import\s*\{[\s\S]*formatExceptionReason[\s\S]*\}\s*from '\.\/lib\/shipment-utils\.js'/);
  assert.match(app, /if \(isExceptionShipment\(record\)\) cell\.append\(createExceptionSummary\(record\)\)/);
  assert.match(app, /reason\.textContent = formatExceptionReason\(record\)/);
  assert.match(app, /addDetailItem\([\s\S]*'异常原因',[\s\S]*formatExceptionReason\(record\)/);
  assert.doesNotMatch(app, /exceptionType\.trim\(/);
});

test('动态内容只写入文本节点，不使用 HTML 注入入口', () => {
  assert.doesNotMatch(app, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.match(app, /textContent/);
});

test('七条固定状态文案与交集语义保持唯一', () => {
  assert.match(app, /const DATA_ERROR = '运单数据加载失败，请刷新页面重试'/);
  assert.match(app, /const RESULT_ERROR = '运单结果读取失败，请刷新页面重试'/);
  assert.match(app, /const DETAIL_MISSING = '未找到该运单，请刷新后重试'/);
  assert.match(app, /query: elements\.search\.value/);
  assert.match(app, /status: elements\.status\.value/);
  assert.match(app, /exceptionOnly: elements\.exception\.checked/);
  assert.match(app, /没有符合条件的运单/);
  assert.match(app, /当前没有运单数据/);
});

test('异常原因在列表两行截断，在详情保留全文', () => {
  assert.match(styles, /\.exception-reason\s*\{[\s\S]*-webkit-line-clamp:\s*2/);
  assert.match(styles, /\.detail-grid \.detail-exception-reason dd\s*\{[\s\S]*white-space:\s*pre-wrap/);
  assert.doesNotMatch(
    styles,
    /\.detail-grid \.detail-exception-reason dd\s*\{[^}]*-webkit-line-clamp/,
  );
});

test('README 说明异常入口、交集语义、启动与测试方式', () => {
  assert.match(readme, /仅看异常运单/);
  assert.match(readme, /必须同时满足/);
  assert.match(readme, /npm start/);
  assert.match(readme, /npm test/);
  assert.match(readme, /原因缺失/);
});
