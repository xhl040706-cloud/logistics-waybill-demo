export const DEFAULT_SORT_MODE = 'default';

export function normalizeKeyword(value = '') {
  return String(value).trim().toLocaleLowerCase('zh-CN');
}

export function filterShipments(records, { query = '', status = '全部状态' } = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const keyword = normalizeKeyword(query);
  return records.filter((record) => {
    const matchesStatus = !status || status === '全部状态' || record.status === status;
    if (!matchesStatus) return false;
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

export function sortShipmentsByEta(records, sortMode = DEFAULT_SORT_MODE) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }
  if (sortMode !== 'eta-asc' && sortMode !== 'eta-desc') {
    return records.slice();
  }

  const direction = sortMode === 'eta-asc' ? 1 : -1;
  return records
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      const dateOrder = left.record.eta < right.record.eta
        ? -1
        : left.record.eta > right.record.eta
          ? 1
          : 0;

      return dateOrder === 0
        ? left.index - right.index
        : dateOrder * direction;
    })
    .map(({ record }) => record);
}
