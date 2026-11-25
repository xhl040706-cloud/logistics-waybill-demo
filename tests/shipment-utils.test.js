import test from 'node:test';
import assert from 'node:assert/strict';
import { shipments, shipmentStatuses } from '../public/data/shipments.js';
import {
  filterShipments,
  formatExceptionReason,
  getDashboardStats,
  getShipmentById,
  isExceptionShipment,
  normalizeKeyword,
} from '../public/lib/shipment-utils.js';

test('演示数据包含 12 条唯一运单和合法运输状态', () => {
  assert.equal(shipments.length, 12);
  assert.equal(new Set(shipments.map((record) => record.id)).size, 12);
  for (const record of shipments) {
    assert.ok(shipmentStatuses.includes(record.status));
    for (const field of ['id', 'customer', 'origin', 'destination', 'eta', 'owner', 'updatedAt']) {
      assert.equal(typeof record[field], 'string');
      assert.ok(record[field].length > 0, `${record.id} 缺少 ${field}`);
    }
    assert.equal(typeof record.exceptionType, 'string');
    assert.equal(typeof record.exceptionReason, 'string');
  }
});

test('数据基线包含后续演示所需的异常字段', () => {
  const recordsWithExceptions = shipments.filter((record) => record.exceptionType);
  assert.ok(recordsWithExceptions.length >= 4);
  for (const record of recordsWithExceptions) {
    assert.ok(record.exceptionReason.length > 0);
  }
});

test('关键词会去除首尾空白并忽略英文大小写', () => {
  assert.equal(normalizeKeyword('  BW20261123001 '), 'bw20261123001');
  assert.equal(filterShipments(shipments, { query: '  bw20261123001 ' }).length, 1);
});

test('可以按运单号精确搜索', () => {
  const result = filterShipments(shipments, { query: 'BW20261123002' });
  assert.deepEqual(result.map((record) => record.id), ['BW20261123002']);
});

test('可以按客户名称搜索', () => {
  const result = filterShipments(shipments, { query: '云帆医疗' });
  assert.deepEqual(result.map((record) => record.id), ['BW20261123002']);
});

test('可以按客户名称的单个字或连续片段搜索', () => {
  for (const query of ['远', '远川', '川家', '远川家居']) {
    const result = filterShipments(shipments, { query });
    assert.deepEqual(result.map((record) => record.id), ['BW20261123004']);
  }
});

test('可以按目的地搜索', () => {
  const result = filterShipments(shipments, { query: '厦门集美' });
  assert.deepEqual(result.map((record) => record.id), ['BW20261123012']);
  assert.ok(result.every((record) => record.destination === '厦门集美'));
});

test('可以按负责人搜索', () => {
  const result = filterShipments(shipments, { query: '林悦' });
  assert.ok(result.length > 0);
  assert.ok(result.every((record) => record.owner === '林悦'));
});

test('无匹配关键词时返回空列表', () => {
  assert.deepEqual(filterShipments(shipments, { query: '不存在的运单' }), []);
});

test('运输状态筛选只保留匹配运单', () => {
  const result = filterShipments(shipments, { status: '派送中' });
  assert.equal(result.length, 2);
  assert.ok(result.every((record) => record.status === '派送中'));
});

test('全部状态与空关键词返回完整列表且不修改原数组', () => {
  const originalFirstId = shipments[0].id;
  const result = filterShipments(shipments, { query: ' ', status: '全部状态' });
  assert.equal(result.length, shipments.length);
  assert.notEqual(result, shipments);
  assert.equal(shipments[0].id, originalFirstId);
});

test('搜索和运输状态筛选可以组合使用', () => {
  const result = filterShipments(shipments, { query: '林悦', status: '派送中' });
  assert.deepEqual(result.map((record) => record.id), ['BW20261123002']);
});

test('统计卡片返回运单总量、运输中、已签收和目的地数量', () => {
  assert.deepEqual(getDashboardStats(shipments), {
    total: 12,
    active: 8,
    delivered: 4,
    cities: 12,
  });
});

test('空数据返回零值统计', () => {
  assert.deepEqual(getDashboardStats([]), { total: 0, active: 0, delivered: 0, cities: 0 });
});

test('可以按运单号读取详情并处理不存在的运单', () => {
  assert.equal(getShipmentById(shipments, 'BW20261123003').customer, '青禾食品');
  assert.equal(getShipmentById(shipments, 'BW00000000000'), undefined);
});

test('非数组输入会返回明确错误而不是静默产生错误统计', () => {
  assert.throws(() => filterShipments(null), /records must be an array/);
  assert.throws(() => getDashboardStats(null), /records must be an array/);
});

test('仅看异常运单返回四个固定 ID', () => {
  const result = filterShipments(shipments, { exceptionOnly: true });
  assert.deepEqual(result.map((record) => record.id), [
    'BW20261123001',
    'BW20261123003',
    'BW20261123006',
    'BW20261123008',
  ]);
});

test('异常条件与关键词、状态按交集组合', () => {
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, query: '林悦' }).map((record) => record.id),
    ['BW20261123006'],
  );
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, status: '派送中' }).map((record) => record.id),
    ['BW20261123008'],
  );
  assert.deepEqual(
    filterShipments(shipments, {
      exceptionOnly: true,
      query: '林悦',
      status: '运输中',
    }).map((record) => record.id),
    ['BW20261123006'],
  );
});

test('异常条件默认关闭且不修改入参与记录', () => {
  const originalIds = shipments.map((record) => record.id);
  const originalFirst = { ...shipments[0] };
  const result = filterShipments(shipments, { query: '', status: '全部状态' });
  assert.equal(result.length, 12);
  assert.notEqual(result, shipments);
  assert.deepEqual(shipments.map((record) => record.id), originalIds);
  assert.deepEqual(shipments[0], originalFirst);
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: false }).map((record) => record.id),
    originalIds,
  );
});

test('异常条件无匹配时返回空数组', () => {
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, query: '不存在的异常运单' }),
    [],
  );
});

test('异常类型仅接受去除首尾空白后非空的字符串', () => {
  assert.equal(isExceptionShipment({ exceptionType: '延误' }), true);
  assert.equal(isExceptionShipment({ exceptionType: '  延误  ' }), true);
  for (const exceptionType of ['', '   ', null, undefined, 1, {}, []]) {
    assert.equal(isExceptionShipment({ exceptionType }), false);
  }
  assert.equal(isExceptionShipment({}), false);
  assert.equal(isExceptionShipment(null), false);
  assert.equal(isExceptionShipment(undefined), false);
});

test('异常判定不修改记录', () => {
  const record = { exceptionType: ' 延误 ', exceptionReason: '原因' };
  isExceptionShipment(record);
  assert.deepEqual(record, { exceptionType: ' 延误 ', exceptionReason: '原因' });
});

test('异常原因保留非空字符串原文并回退缺失文案', () => {
  assert.equal(formatExceptionReason({ exceptionReason: '原因' }), '原因');
  assert.equal(formatExceptionReason({ exceptionReason: '  原因  ' }), '  原因  ');
  for (const exceptionReason of ['', '   ', null, undefined, 1, {}, []]) {
    assert.equal(formatExceptionReason({ exceptionReason }), '原因缺失');
  }
  assert.equal(formatExceptionReason({}), '原因缺失');
  assert.equal(formatExceptionReason(null), '原因缺失');
});

test('恶意异常原因按普通文本返回且不执行', () => {
  const payload = '<img src=x onerror=alert(1)>';
  assert.equal(formatExceptionReason({ exceptionReason: payload }), payload);
});

test('normalizeKeyword 保持旧签名和返回值语义', () => {
  assert.equal(normalizeKeyword(), '');
  assert.equal(normalizeKeyword(''), '');
  assert.equal(normalizeKeyword('   '), '');
  assert.equal(normalizeKeyword('  ABC  '), 'abc');
  assert.equal(typeof normalizeKeyword(123), 'string');
});

test('getShipmentById 返回首个同 ID 对象并拒绝非数组', () => {
  const duplicated = [
    { id: 'BW1', customer: '首个' },
    { id: 'BW1', customer: '第二个' },
  ];
  assert.equal(getShipmentById(duplicated, 'BW1'), duplicated[0]);
  assert.equal(getShipmentById(duplicated, 'missing'), undefined);
  assert.throws(() => getShipmentById(null, 'BW1'), /records must be an array/);
});
