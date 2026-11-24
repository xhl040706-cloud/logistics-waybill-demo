import { shipments, shipmentStatuses } from './data/shipments.js';
import {
  DEFAULT_SORT_MODE,
  filterShipments,
  getDashboardStats,
  getShipmentById,
  sortShipmentsByEta,
} from './lib/shipment-utils.js';

const elements = {
  form: document.querySelector('#filter-form'),
  search: document.querySelector('#search-input'),
  status: document.querySelector('#status-filter'),
  sortMode: document.querySelector('#sort-mode'),
  reset: document.querySelector('#reset-filter'),
  emptyReset: document.querySelector('#empty-reset'),
  rows: document.querySelector('#shipment-rows'),
  summary: document.querySelector('#result-summary'),
  table: document.querySelector('#table-container'),
  empty: document.querySelector('#empty-state'),
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
  for (const status of shipmentStatuses) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    elements.status.append(option);
  }
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
  const actions = document.createElement('td');
  actions.append(createDetailButton(record));
  row.append(actions);
  return row;
}

function renderShipments() {
  const filtered = filterShipments(shipments, {
    query: elements.search.value,
    status: elements.status.value,
  });
  const sorted = sortShipmentsByEta(filtered, elements.sortMode.value);

  elements.rows.replaceChildren(...sorted.map(createShipmentRow));
  elements.summary.textContent = `显示 ${sorted.length} / ${shipments.length} 张运单`;
  elements.table.hidden = sorted.length === 0;
  elements.empty.hidden = sorted.length > 0;
}

function resetFilters() {
  elements.search.value = '';
  elements.status.value = '全部状态';
  elements.sortMode.value = DEFAULT_SORT_MODE;
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
  if (!record) return;

  elements.dialogTitle.textContent = record.id;
  elements.detailGrid.replaceChildren();
  addDetailItem('客户', record.customer);
  addDetailItem('运输状态', record.status);
  addDetailItem('运输线路', `${record.origin} → ${record.destination}`);
  addDetailItem('预计送达', record.eta);
  addDetailItem('负责人', record.owner);
  addDetailItem('最近更新', record.updatedAt);
  elements.dialog.showModal();
}

elements.form.addEventListener('submit', (event) => event.preventDefault());
elements.search.addEventListener('input', renderShipments);
elements.status.addEventListener('change', renderShipments);
elements.sortMode.addEventListener('change', renderShipments);
elements.reset.addEventListener('click', resetFilters);
elements.emptyReset.addEventListener('click', resetFilters);
elements.closeDialog.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

renderStats();
renderStatusOptions();
renderShipments();
