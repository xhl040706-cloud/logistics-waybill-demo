export function normalizeKeyword(value = '') {
  return String(value).trim().toLocaleLowerCase('zh-CN');
}

export function isExceptionShipment(record) {
  return typeof record?.exceptionType === 'string' && record.exceptionType.trim() !== '';
}

export function formatExceptionReason(record) {
  const reason = record?.exceptionReason;
  if (typeof reason === 'string' && reason.trim() !== '') return reason;
  return '原因缺失';
}

export function filterShipments(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const {
    query = '',
    status = '全部状态',
    exceptionOnly = false,
  } = options ?? {};
  const keyword = normalizeKeyword(query);
  return records.filter((record) => {
    const matchesStatus = !status || status === '全部状态' || record.status === status;
    if (!matchesStatus) return false;
    if (exceptionOnly && !isExceptionShipment(record)) return false;
    if (!keyword) return true;

    const searchableFields = [
      record.id,
      record.customer,
      record.origin,
      record.destination,
      record.owner,
    ];
    return searchableFields.some((value) => normalizeKeyword(value).includes(keyword));
  });
}

export function getDashboardStats(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return {
    total: records.length,
    active: records.filter((record) => record.status !== '已签收').length,
    delivered: records.filter((record) => record.status === '已签收').length,
    cities: new Set(records.map((record) => record.destination)).size,
  };
}

export function getShipmentById(records, id) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }
  return records.find((record) => record.id === id);
}
