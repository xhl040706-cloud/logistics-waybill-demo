import test from 'node:test';
import assert from 'node:assert/strict';
import { shipments, shipmentStatuses } from '../public/data/shipments.js';
import {
  DEFAULT_SORT_MODE,
  filterShipments,
  getDashboardStats,
  getShipmentById,
  normalizeKeyword,
  sortShipmentsByEta,
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

test('默认排序返回原数据顺序的新数组', () => {
  const result = sortShipmentsByEta(shipments);

  assert.equal(DEFAULT_SORT_MODE, 'default');
  assert.deepEqual(
    result.map((record) => record.id),
    shipments.map((record) => record.id),
  );
  assert.notEqual(result, shipments);
  assert.deepEqual(
    sortShipmentsByEta(shipments, DEFAULT_SORT_MODE).map((record) => record.id),
    shipments.map((record) => record.id),
  );
});

test('预计送达最早优先按 eta 升序排列', () => {
  const result = sortShipmentsByEta(shipments, 'eta-asc');

  assert.deepEqual(result.map((record) => record.id), [
    'BW20261123012',
    'BW20261123007',
    'BW20261123010',
    'BW20261123005',
    'BW20261123002',
    'BW20261123008',
    'BW20261123001',
    'BW20261123006',
    'BW20261123003',
    'BW20261123011',
    'BW20261123009',
    'BW20261123004',
  ]);
});

test('预计送达最晚优先按 eta 降序排列', () => {
  const result = sortShipmentsByEta(shipments, 'eta-desc');

  assert.deepEqual(result.map((record) => record.id), [
    'BW20261123004',
    'BW20261123009',
    'BW20261123003',
    'BW20261123011',
    'BW20261123001',
    'BW20261123006',
    'BW20261123002',
    'BW20261123008',
    'BW20261123005',
    'BW20261123007',
    'BW20261123010',
    'BW20261123012',
  ]);
});

test('相同 eta 在升序和降序中都保持原相对顺序', () => {
  const sameEtaGroups = [
    ['2026-11-21', ['BW20261123007', 'BW20261123010']],
    ['2026-11-23', ['BW20261123002', 'BW20261123008']],
    ['2026-11-24', ['BW20261123001', 'BW20261123006']],
    ['2026-11-25', ['BW20261123003', 'BW20261123011']],
  ];

  for (const sortMode of ['eta-asc', 'eta-desc']) {
    const result = sortShipmentsByEta(shipments, sortMode);
    for (const [eta, expectedIds] of sameEtaGroups) {
      assert.deepEqual(
        result.filter((record) => record.eta === eta).map((record) => record.id),
        expectedIds,
      );
    }
  }
});

test('预计送达排序可与关键词和状态筛选组合使用', () => {
  const linYueAsc = sortShipmentsByEta(
    filterShipments(shipments, { query: '林悦' }),
    'eta-asc',
  );
  const inTransitDesc = sortShipmentsByEta(
    filterShipments(shipments, { status: '运输中' }),
    'eta-desc',
  );
  const chenChenInTransitAsc = sortShipmentsByEta(
    filterShipments(shipments, { query: '陈晨', status: '运输中' }),
    'eta-asc',
  );

  assert.deepEqual(linYueAsc.map((record) => record.id), [
    'BW20261123012',
    'BW20261123002',
    'BW20261123006',
  ]);
  assert.deepEqual(inTransitDesc.map((record) => record.id), [
    'BW20261123003',
    'BW20261123011',
    'BW20261123001',
    'BW20261123006',
  ]);
  assert.deepEqual(chenChenInTransitAsc.map((record) => record.id), [
    'BW20261123001',
    'BW20261123011',
  ]);
  assert.deepEqual(
    sortShipmentsByEta(filterShipments(shipments, { query: '不存在的运单' }), 'eta-asc'),
    [],
  );
});

test('未知、空或缺失排序方式降级为默认顺序', () => {
  const expectedIds = shipments.map((record) => record.id);

  for (const sortMode of ['', 'unknown', null, undefined]) {
    assert.deepEqual(
      sortShipmentsByEta(shipments, sortMode).map((record) => record.id),
      expectedIds,
    );
  }
});

test('预计送达排序不修改输入数组或运单记录', () => {
  const records = [
    shipments.find((record) => record.id === 'BW20261123003'),
    shipments.find((record) => record.id === 'BW20261123001'),
    shipments.find((record) => record.id === 'BW20261123002'),
  ];
  const originalIds = records.map((record) => record.id);
  const originalRecords = records.map((record) => ({ ...record }));

  const firstResult = sortShipmentsByEta(records, 'eta-asc');
  const secondResult = sortShipmentsByEta(records, 'eta-asc');

  assert.deepEqual(records.map((record) => record.id), originalIds);
  assert.deepEqual(records, originalRecords);
  assert.deepEqual(
    firstResult.map((record) => record.id),
    secondResult.map((record) => record.id),
  );
  assert.notEqual(firstResult, records);
  assert.notEqual(firstResult, secondResult);
  assert.ok(firstResult.every((record) => records.includes(record)));
});

test('非数组排序输入返回明确错误', () => {
  assert.throws(
    () => sortShipmentsByEta(null, 'eta-asc'),
    new TypeError('records must be an array'),
  );
  assert.throws(
    () => sortShipmentsByEta(undefined, 'eta-desc'),
    /records must be an array/,
  );
  assert.throws(
    () => sortShipmentsByEta({}),
    /records must be an array/,
  );
});
