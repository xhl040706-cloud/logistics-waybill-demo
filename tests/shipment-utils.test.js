import test from 'node:test';
import assert from 'node:assert/strict';
import { shipments, shipmentStatuses } from '../public/data/shipments.js';
import {
  filterShipments,
  getDashboardStats,
  getExceptionDisplay,
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

test('仅将以非空字符串异常类型标识的运单判定为异常', () => {
  assert.equal(isExceptionShipment({ exceptionType: '延误' }), true);
  assert.equal(isExceptionShipment({ exceptionType: '  联系不上  ' }), true);

  const invalidRecords = [
    null,
    undefined,
    'BW20261123001',
    {},
    { exceptionType: '' },
    { exceptionType: '   ' },
    { exceptionType: '\t\n' },
    { exceptionType: null },
    { exceptionType: undefined },
    { exceptionType: 1 },
    { exceptionType: {} },
  ];
  for (const record of invalidRecords) {
    assert.equal(isExceptionShipment(record), false);
  }
});

test('异常展示值返回去空白类型与原始原因且不修改记录', () => {
  const record = {
    id: 'TEST-001',
    exceptionType: '  包装破损  ',
    exceptionReason: '  外箱破损，需现场复核  ',
  };
  const snapshot = structuredClone(record);

  assert.deepEqual(getExceptionDisplay(record), {
    type: '包装破损',
    reason: '  外箱破损，需现场复核  ',
  });
  assert.deepEqual(record, snapshot);
  assert.equal(getExceptionDisplay({ exceptionType: '  ' }), null);
});

test('异常原因为非字符串或空白时统一显示原因缺失', () => {
  for (const exceptionReason of ['', '   ', null, undefined, 1, {}]) {
    assert.deepEqual(getExceptionDisplay({ exceptionType: '延误', exceptionReason }), {
      type: '延误',
      reason: '原因缺失',
    });
  }
});

test('仅看异常运单返回固定四条结果并保持基准顺序', () => {
  const result = filterShipments(shipments, { exceptionOnly: true });
  assert.deepEqual(result.map((record) => record.id), [
    'BW20261123001',
    'BW20261123003',
    'BW20261123006',
    'BW20261123008',
  ]);
});

test('异常条件与关键词和运输状态按逻辑与组合', () => {
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, status: '派送中' }).map((record) => record.id),
    ['BW20261123008'],
  );
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, status: '运输中' }).map((record) => record.id),
    ['BW20261123001', 'BW20261123003', 'BW20261123006'],
  );
  assert.deepEqual(
    filterShipments(shipments, {
      exceptionOnly: true,
      query: '林悦',
      status: '运输中',
    }).map((record) => record.id),
    ['BW20261123006'],
  );
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, status: '已签收' }),
    [],
  );
});

test('仅看异常可与关键词独立组合且不误标非异常记录', () => {
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, query: '林悦' }).map((record) => record.id),
    ['BW20261123006'],
  );
  assert.deepEqual(
    filterShipments(shipments, {
      exceptionOnly: true,
      query: '林悦',
      status: '全部状态',
    }).map((record) => record.id),
    ['BW20261123006'],
  );

  const keywordHits = filterShipments(shipments, { query: '林悦' }).map((record) => record.id);
  assert.deepEqual(keywordHits, ['BW20261123002', 'BW20261123006', 'BW20261123012']);
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, query: '云帆' }),
    [],
    '仅命中非异常客户的关键词不应被误标为异常',
  );
  assert.deepEqual(
    filterShipments(shipments, { exceptionOnly: true, query: '陈晨' }).map((record) => record.id),
    ['BW20261123001'],
  );
});

test('异常筛选结果与按 ID 读取的详情异常字段逐字一致', () => {
  const expected = [
    ['BW20261123001', '延误', '枢纽短时拥堵，预计比承诺时间晚 1 天送达。'],
    ['BW20261123003', '包装破损', '到件扫描发现外包装破损，等待网点复核并联系客户。'],
    ['BW20261123006', '地址异常', '收件地址缺少门牌号，需运营联系客户补充后再安排派送。'],
    ['BW20261123008', '联系不上', '两次联系收件人均未接通，等待客户确认方便收件的时间。'],
  ];
  const filtered = filterShipments(shipments, { exceptionOnly: true });

  assert.equal(filtered.length, expected.length);
  assert.deepEqual(filtered.map((record) => record.id), expected.map(([id]) => id));
  for (const [id, type, reason] of expected) {
    const fromList = filtered.find((record) => record.id === id);
    const fromDetail = getShipmentById(shipments, id);
    const fromSource = shipments.find((record) => record.id === id);

    assert.equal(fromList.exceptionType, type);
    assert.equal(fromList.exceptionReason, reason);
    assert.equal(fromDetail.exceptionType, fromList.exceptionType);
    assert.equal(fromDetail.exceptionReason, fromList.exceptionReason);
    assert.equal(fromDetail.exceptionType, fromSource.exceptionType);
    assert.equal(fromDetail.exceptionReason, fromSource.exceptionReason);
    assert.deepEqual(getExceptionDisplay(fromList), getExceptionDisplay(fromDetail));
  }
});

test('异常筛选项默认关闭、兼容旧调用并返回独立数组', () => {
  const expectedIds = shipments.map((record) => record.id);
  const snapshots = structuredClone(shipments);
  const calls = [
    filterShipments(shipments),
    filterShipments(shipments, { exceptionOnly: false }),
    filterShipments(shipments, { exceptionOnly: null }),
    filterShipments(shipments, { exceptionOnly: undefined }),
  ];

  for (const result of calls) {
    assert.notEqual(result, shipments);
    assert.deepEqual(result.map((record) => record.id), expectedIds);
  }
  assert.deepEqual(filterShipments(shipments, { exceptionOnly: true }), filterShipments(shipments, { exceptionOnly: true }));
  assert.deepEqual(shipments, snapshots);
});

test('异常筛选的空数组与非数组边界符合共享契约', () => {
  assert.deepEqual(filterShipments([]), []);
  assert.deepEqual(filterShipments([], { exceptionOnly: true }), []);
  for (const invalidRecords of [null, {}, 'x']) {
    assert.throws(
      () => filterShipments(invalidRecords),
      (error) => error instanceof TypeError && error.message === 'records must be an array',
    );
  }
});
