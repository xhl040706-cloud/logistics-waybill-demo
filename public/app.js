let shipments = [];
let shipmentStatuses = [];
let filterShipments;
let getDashboardStats;
let getShipmentById;
let getExceptionView;

const elements = {
  form: document.querySelector('#filter-form'),
  search: document.querySelector('#search-input'),
  status: document.querySelector('#status-filter'),
  exceptionOnly: document.querySelector('#exception-only'),
  reset: document.querySelector('#reset-filter'),
  emptyReset: document.querySelector('#empty-reset'),
  rows: document.querySelector('#shipment-rows'),
  summary: document.querySelector('#result-summary'),
  table: document.querySelector('#table-container'),
  empty: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyDescription: document.querySelector('#empty-description'),
  feedback: document.querySelector('#action-feedback'),
  dialog: document.querySelector('#shipment-dialog'),
  dialogTitle: document.querySelector('#dialog-title'),
  closeDialog: document.querySelector('#close-dialog'),
  detailGrid: document.querySelector('#detail-grid'),
};

const statusClassNames = new Map([
  ['运输中', 'status-transit'],
  ['派送中', 'status-delivering'],
  ['已签收', 'status-delivered'],
  ['待揽收', 'status-pending'],
]);

function renderStats() {
  const stats = getDashboardStats(shipments);
  document.querySelector('#stat-total').textContent = stats.total;
  document.querySelector('#stat-active').textContent = stats.active;
  document.querySelector('#stat-delivered').textContent = stats.delivered;
  document.querySelector('#stat-cities').textContent = stats.cities;
}

function renderStatusOptions() {
  const defaultOption = document.createElement('option');
  defaultOption.value = '全部状态';
  defaultOption.textContent = '全部状态';
  elements.status.replaceChildren(defaultOption);
  for (const status of shipmentStatuses) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    elements.status.append(option);
  }
}

function setFilterDisabled(disabled) {
  for (const control of [elements.search, elements.status, elements.exceptionOnly, elements.reset, elements.emptyReset]) {
    control.disabled = disabled;
  }
}

function setFeedback(message = '') {
  elements.feedback.textContent = message;
  elements.feedback.hidden = !message;
}

function hideResults() {
  elements.rows.replaceChildren();
  elements.table.hidden = true;
  elements.empty.hidden = true;
  elements.emptyReset.hidden = true;
}

function showError(message, disableFilters = false) {
  hideResults();
  elements.summary.textContent = message;
  setFeedback();
  setFilterDisabled(disableFilters);
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

function createStatusCell(row, status) {
  const cell = document.createElement('td');
  const pill = document.createElement('span');
  pill.className = `status-pill ${statusClassNames.get(status) ?? 'status-pending'}`;
  pill.textContent = status;
  cell.append(pill);
  row.append(cell);
}

function createExceptionCell(row, record) {
  const cell = document.createElement('td');
  const exception = getExceptionView(record);
  if (!exception) {
    cell.className = 'row-exception-spacer';
    cell.setAttribute('aria-hidden', 'true');
    row.append(cell);
    return;
  }

  cell.className = 'exception-info';
  const type = document.createElement('span');
  type.className = 'exception-type';
  type.textContent = exception.type;
  const reason = document.createElement('span');
  reason.className = 'exception-reason';
  reason.textContent = exception.reason;
  cell.append(type, reason);
  row.append(cell);
}

function createDetailButton(record) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'detail-button';
  button.textContent = '查看';
  button.setAttribute('aria-label', `查看运单 ${record.id}`);
  button.addEventListener('click', () => openShipmentDetail(record.id));
  return button;
}

function createShipmentRow(record) {
  const row = document.createElement('tr');
  appendTextCell(row, record.id, 'shipment-id');
  appendTextCell(row, record.customer, 'customer-name');
  createRouteCell(row, record);
  createStatusCell(row, record.status);

  const eta = appendTextCell(row, record.eta);
  const time = document.createElement('time');
  time.dateTime = record.eta;
  time.textContent = record.eta;
  eta.replaceChildren(time);

  appendTextCell(row, record.owner, 'owner');
  createExceptionCell(row, record);
  const actions = document.createElement('td');
  actions.append(createDetailButton(record));
  row.append(actions);
  return row;
}

function renderShipments() {
  try {
    const filtered = filterShipments(shipments, {
      query: elements.search.value,
      status: elements.status.value,
      abnormalOnly: elements.exceptionOnly.checked,
    });
    if (!Array.isArray(filtered) || !Number.isInteger(shipments.length)) {
      throw new TypeError('invalid shipment result');
    }

    elements.rows.replaceChildren(...filtered.map(createShipmentRow));
    elements.summary.textContent = `显示 ${filtered.length} / ${shipments.length} 张运单`;
    setFeedback();
    if (filtered.length > 0) {
      elements.table.hidden = false;
      elements.empty.hidden = true;
      elements.emptyReset.hidden = true;
      return;
    }

    elements.table.hidden = true;
    elements.empty.hidden = false;
    const hasData = shipments.length > 0;
    elements.emptyTitle.textContent = hasData ? '没有符合条件的运单' : '当前没有运单数据';
    elements.emptyDescription.textContent = hasData
      ? '请调整关键词、运输状态或异常范围后重新查看。'
      : '当前没有可展示的运单数据。';
    elements.emptyReset.hidden = !hasData;
  } catch {
    showError('运单结果读取失败，请刷新页面重试');
  }
}

function resetFilters() {
  elements.search.value = '';
  elements.status.value = '全部状态';
  elements.exceptionOnly.checked = false;
  renderShipments();
  elements.search.focus();
}

function addDetailItem(term, value) {
  const wrapper = document.createElement('div');
  const label = document.createElement('dt');
  const description = document.createElement('dd');
  label.textContent = term;
  description.textContent = value;
  wrapper.append(label, description);
  elements.detailGrid.append(wrapper);
}

function openShipmentDetail(id) {
  const record = getShipmentById(shipments, id);
  elements.detailGrid.replaceChildren();
  if (!record) {
    setFeedback('未找到该运单，请刷新后重试');
    return;
  }

  setFeedback();
  elements.dialogTitle.textContent = record.id;
  addDetailItem('客户', record.customer);
  addDetailItem('运输状态', record.status);
  addDetailItem('运输线路', `${record.origin} → ${record.destination}`);
  addDetailItem('预计送达', record.eta);
  addDetailItem('负责人', record.owner);
  addDetailItem('最近更新', record.updatedAt);
  const exception = getExceptionView(record);
  if (exception) {
    addDetailItem('异常类型', exception.type);
    addDetailItem('异常原因', exception.reason);
  }
  elements.dialog.showModal();
}

elements.form.addEventListener('submit', (event) => event.preventDefault());
elements.search.addEventListener('input', renderShipments);
elements.status.addEventListener('change', renderShipments);
elements.exceptionOnly.addEventListener('change', renderShipments);
elements.reset.addEventListener('click', resetFilters);
elements.emptyReset.addEventListener('click', resetFilters);
elements.closeDialog.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

async function loadPage() {
  elements.summary.textContent = '正在加载…';
  hideResults();
  setFeedback();
  setFilterDisabled(true);

  let dataModule;
  try {
    dataModule = await import('./data/shipments.js');
    if (!Array.isArray(dataModule.shipments) || !Array.isArray(dataModule.shipmentStatuses)) {
      throw new TypeError('invalid shipment data');
    }
  } catch {
    showError('运单数据加载失败，请刷新页面重试', true);
    return;
  }

  shipments = dataModule.shipments;
  shipmentStatuses = dataModule.shipmentStatuses;

  try {
    const utilsModule = await import('./lib/shipment-utils.js');
    ({ filterShipments, getDashboardStats, getShipmentById, getExceptionView } = utilsModule);
    for (const fn of [filterShipments, getDashboardStats, getShipmentById, getExceptionView]) {
      if (typeof fn !== 'function') throw new TypeError('invalid shipment utils');
    }
  } catch {
    setFilterDisabled(false);
    showError('运单结果读取失败，请刷新页面重试');
    return;
  }

  try {
    renderStats();
    renderStatusOptions();
  } catch {
    showError('运单数据加载失败，请刷新页面重试', true);
    return;
  }

  setFilterDisabled(false);
  renderShipments();
}

loadPage();
