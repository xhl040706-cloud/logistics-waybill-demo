import {
  filterShipments,
  formatExceptionReason,
  getDashboardStats,
  getShipmentById,
  isExceptionShipment,
} from './lib/shipment-utils.js';

const DATA_ERROR = '运单数据加载失败，请刷新页面重试';
const RESULT_ERROR = '运单结果读取失败，请刷新页面重试';
const DETAIL_MISSING = '未找到该运单，请刷新后重试';

const elements = {
  form: document.querySelector('#filter-form'),
  search: document.querySelector('#search-input'),
  status: document.querySelector('#status-filter'),
  exception: document.querySelector('#exception-filter'),
  reset: document.querySelector('#reset-filter'),
  emptyReset: document.querySelector('#empty-reset'),
  rows: document.querySelector('#shipment-rows'),
  summary: document.querySelector('#result-summary'),
  table: document.querySelector('#table-container'),
  empty: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyDescription: document.querySelector('#empty-description'),
  feedback: document.querySelector('#page-feedback'),
  dialog: document.querySelector('#shipment-dialog'),
  dialogTitle: document.querySelector('#dialog-title'),
  closeDialog: document.querySelector('#close-dialog'),
  detailGrid: document.querySelector('#detail-grid'),
  statTotal: document.querySelector('#stat-total'),
  statActive: document.querySelector('#stat-active'),
  statDelivered: document.querySelector('#stat-delivered'),
  statCities: document.querySelector('#stat-cities'),
};

const runtime = {
  shipments: [],
  shipmentStatuses: [],
  initialized: false,
  eventsBound: false,
};

const statusClassNames = new Map([
  ['运输中', 'status-transit'],
  ['派送中', 'status-delivering'],
  ['已签收', 'status-delivered'],
  ['待揽收', 'status-pending'],
]);

function setControlsDisabled(disabled) {
  elements.search.disabled = disabled;
  elements.status.disabled = disabled;
  elements.exception.disabled = disabled;
  elements.reset.disabled = disabled;
  elements.emptyReset.disabled = disabled;
}

function renderStats() {
  const stats = getDashboardStats(runtime.shipments);
  elements.statTotal.textContent = stats.total;
  elements.statActive.textContent = stats.active;
  elements.statDelivered.textContent = stats.delivered;
  elements.statCities.textContent = stats.cities;
}

function renderStatusOptions(statuses) {
  const allStatus = document.createElement('option');
  allStatus.value = '全部状态';
  allStatus.textContent = '全部状态';
  const options = statuses.map((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    return option;
  });
  elements.status.replaceChildren(allStatus, ...options);
}

function appendTextCell(row, text, className = '') {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  row.append(cell);
  return cell;
}

function createRouteCell(row, record) {
  const cell = document.createElement('td');
  cell.className = 'route';
  const origin = document.createElement('span');
  origin.textContent = record.origin;
  const arrow = document.createElement('span');
  arrow.className = 'route-arrow';
  arrow.textContent = '→';
  arrow.setAttribute('aria-hidden', 'true');
  const destination = document.createElement('span');
  destination.textContent = record.destination;
  cell.append(origin, arrow, destination);
  row.append(cell);
}

function createExceptionSummary(record) {
  const summary = document.createElement('div');
  summary.className = 'exception-summary';

  const type = document.createElement('span');
  type.className = 'exception-type';
  type.textContent = record.exceptionType;

  const reason = document.createElement('p');
  reason.className = 'exception-reason';
  reason.textContent = formatExceptionReason(record);

  summary.append(type, reason);
  return summary;
}

function createStatusCell(row, record) {
  const cell = document.createElement('td');
  cell.className = 'status-cell';
  const pill = document.createElement('span');
  pill.className = `status-pill ${statusClassNames.get(record.status) ?? 'status-pending'}`;
  pill.textContent = record.status;
  cell.append(pill);
  if (isExceptionShipment(record)) cell.append(createExceptionSummary(record));
  row.append(cell);
}

function createDetailButton(record) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'detail-button';
  button.textContent = '查看';
  button.dataset.shipmentId = record.id;
  button.setAttribute('aria-label', `查看运单 ${record.id}`);
  return button;
}

function createShipmentRow(record) {
  const row = document.createElement('tr');
  row.dataset.shipmentId = record.id;
  appendTextCell(row, record.id, 'shipment-id');
  appendTextCell(row, record.customer, 'customer-name');
  createRouteCell(row, record);
  createStatusCell(row, record);

  const eta = appendTextCell(row, record.eta);
  const time = document.createElement('time');
  time.dateTime = record.eta;
  time.textContent = record.eta;
  eta.replaceChildren(time);

  appendTextCell(row, record.owner, 'owner');
  const actions = document.createElement('td');
  actions.className = 'row-actions';
  actions.append(createDetailButton(record));
  row.append(actions);
  return row;
}

function readFilterOptions() {
  return {
    query: elements.search.value,
    status: elements.status.value,
    exceptionOnly: elements.exception.checked,
  };
}

function renderEmptyState(total, sourceIsEmpty) {
  elements.summary.textContent = `显示 0 / ${total} 张运单`;
  elements.rows.replaceChildren();
  elements.table.hidden = true;
  elements.empty.hidden = false;
  elements.feedback.hidden = true;
  elements.emptyTitle.textContent = sourceIsEmpty
    ? '当前没有运单数据'
    : '没有符合条件的运单';
  elements.emptyDescription.textContent = sourceIsEmpty
    ? '当前数据源为空，请稍后刷新页面重试。'
    : '请调整关键词、运输状态或异常条件后重新查看。';
}

function renderError(message) {
  elements.summary.textContent = message;
  elements.rows.replaceChildren();
  elements.table.hidden = true;
  elements.empty.hidden = true;
  elements.feedback.hidden = true;
  setControlsDisabled(true);
}

function renderShipments() {
  try {
    const filtered = filterShipments(runtime.shipments, readFilterOptions());
    if (!Array.isArray(filtered) || !Number.isInteger(filtered.length)) {
      renderError(RESULT_ERROR);
      return;
    }

    if (filtered.length === 0) {
      renderEmptyState(runtime.shipments.length, runtime.shipments.length === 0);
      return;
    }

    elements.rows.replaceChildren(...filtered.map(createShipmentRow));
    elements.summary.textContent = `显示 ${filtered.length} / ${runtime.shipments.length} 张运单`;
    elements.table.hidden = false;
    elements.empty.hidden = true;
    elements.feedback.hidden = true;
  } catch (_) {
    renderError(RESULT_ERROR);
  }
}

function resetFilters() {
  elements.search.value = '';
  elements.status.value = '全部状态';
  elements.exception.checked = false;
  renderShipments();
  elements.search.focus();
}

function addDetailItem(term, value, className = '') {
  const wrapper = document.createElement('div');
  if (className) wrapper.className = className;
  const label = document.createElement('dt');
  const description = document.createElement('dd');
  label.textContent = term;
  description.textContent = value;
  wrapper.append(label, description);
  elements.detailGrid.append(wrapper);
}

function openShipmentDetail(id) {
  const record = getShipmentById(runtime.shipments, id);
  if (!record) {
    elements.feedback.textContent = DETAIL_MISSING;
    elements.feedback.hidden = false;
    return;
  }

  elements.feedback.hidden = true;
  elements.dialogTitle.textContent = record.id;
  elements.detailGrid.replaceChildren();
  addDetailItem('客户', record.customer);
  addDetailItem('运输状态', record.status);
  addDetailItem('运输线路', `${record.origin} → ${record.destination}`);
  addDetailItem('预计送达', record.eta);
  addDetailItem('负责人', record.owner);
  addDetailItem('最近更新', record.updatedAt);
  if (isExceptionShipment(record)) {
    addDetailItem('异常类型', record.exceptionType, 'detail-exception');
    addDetailItem(
      '异常原因',
      formatExceptionReason(record),
      'detail-exception detail-exception-reason',
    );
  }
  elements.dialog.showModal();
}

function bindEvents() {
  if (runtime.eventsBound) return;
  runtime.eventsBound = true;
  elements.form.addEventListener('submit', (event) => event.preventDefault());
  elements.search.addEventListener('input', renderShipments);
  elements.status.addEventListener('change', renderShipments);
  elements.exception.addEventListener('change', renderShipments);
  elements.rows.addEventListener('click', (event) => {
    const button = event.target.closest('.detail-button');
    if (button) openShipmentDetail(button.dataset.shipmentId);
  });
  elements.reset.addEventListener('click', resetFilters);
  elements.emptyReset.addEventListener('click', resetFilters);
  elements.closeDialog.addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
}

async function initialize() {
  try {
    const data = await import('./data/shipments.js');
    if (!Array.isArray(data.shipments) || !Array.isArray(data.shipmentStatuses)) {
      throw new TypeError('invalid shipments data');
    }
    runtime.shipments = data.shipments;
    runtime.shipmentStatuses = data.shipmentStatuses;
    runtime.initialized = true;
    renderStats();
    renderStatusOptions(runtime.shipmentStatuses);
    bindEvents();
    setControlsDisabled(false);
    renderShipments();
  } catch (_) {
    renderError(DATA_ERROR);
  }
}

initialize();
