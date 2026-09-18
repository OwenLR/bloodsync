import { openModal, closeModal } from '../../components/modal.js';
import {
  getInventoryDetailReport,
  getInventoryAvailableDates,
  getRequestsDetailReport,
  getRequestsAvailableDates,
} from './reportPrintApi.js';
import { buildReportPdf } from './reportPdfBuilder.js';

const PRINT_BTN_ID = 'report-print-btn';

let _objectUrl = null; // tracked so the previous blob URL is revoked before a new one is created

export function initReportPrint() {
  const btn = document.getElementById(PRINT_BTN_ID);
  if (!btn) return;
  btn.addEventListener('click', openPrintModal);
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function openPrintModal() {
  openModal('Print Report', buildFormBody(), [
    { label: 'Cancel',   className: 'btn-secondary', onClick: closeModal },
    { label: 'Generate', className: 'btn-primary',   onClick: handleGenerate },
  ]);
  refreshDayOptions();
}

function buildFormBody() {
  const wrap = document.createElement('div');
  wrap.className = 'print-form';
  wrap.appendChild(buildField('print-type', 'Report Type', buildTypeSelect()));
  wrap.appendChild(buildField('print-month', 'Month', buildMonthInput()));
  wrap.appendChild(buildField('print-day', 'Specific Day (optional)', buildDaySelect()));

  const errorEl = document.createElement('p');
  errorEl.id = 'print-error';
  errorEl.className = 'field-error';
  wrap.appendChild(errorEl);
  return wrap;
}

function buildField(id, labelText, controlEl) {
  const field = document.createElement('div');
  field.className = 'print-field';
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(controlEl);
  return field;
}

function buildTypeSelect() {
  const select = document.createElement('select');
  select.id = 'print-type';
  [
    { value: 'all',       label: 'All (Blood Unit + Blood Request)' },
    { value: 'inventory', label: 'Blood Unit' },
    { value: 'requests',  label: 'Blood Request' },
  ].forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.addEventListener('change', refreshDayOptions);
  return select;
}

function buildMonthInput() {
  const input = document.createElement('input');
  input.type  = 'month';
  input.id    = 'print-month';
  input.value = currentMonthValue();
  input.addEventListener('change', refreshDayOptions);
  return input;
}

function buildDaySelect() {
  const select = document.createElement('select');
  select.id = 'print-day';
  const opt = document.createElement('option');
  opt.value = '';
  opt.textContent = 'Whole month';
  select.appendChild(opt);
  return select;
}

function formatDayLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

// 'all' unions both endpoints' dates — a day is selectable if EITHER
// report has data on it, since 'all' bundles both sections regardless.
async function refreshDayOptions() {
  const typeEl  = document.getElementById('print-type');
  const monthEl = document.getElementById('print-month');
  const dayEl   = document.getElementById('print-day');
  const errorEl = document.getElementById('print-error');
  if (!typeEl || !monthEl || !dayEl) return;

  const type  = typeEl.value;
  const month = monthEl.value;
  errorEl.textContent = '';
  dayEl.disabled = true;

  try {
    const calls = [];
    if (type === 'inventory' || type === 'all') calls.push(getInventoryAvailableDates(month));
    if (type === 'requests'  || type === 'all') calls.push(getRequestsAvailableDates(month));
    const results = await Promise.all(calls);

    const dateSet = new Set();
    results.forEach(r => r.dates.forEach(d => dateSet.add(d)));
    const dates = [...dateSet].sort();

    const previousValue = dayEl.value;
    dayEl.textContent = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Whole month';
    dayEl.appendChild(defaultOpt);
    dates.forEach(dateStr => {
      const opt = document.createElement('option');
      opt.value = dateStr;
      opt.textContent = formatDayLabel(dateStr);
      dayEl.appendChild(opt);
    });
    dayEl.value = dates.includes(previousValue) ? previousValue : '';
  } catch (err) {
    errorEl.textContent = err.message || 'Could not load available dates.';
  } finally {
    dayEl.disabled = false;
  }
}

// modal.js's action buttons don't carry a stable id/ref — this grabs the
// footer button by its label text to toggle its disabled/loading state
// without touching modal.js itself. Fragile if labels change; see note below.
function getFooterButton(label) {
  return [...document.querySelectorAll('.modal-footer button')].find(b => b.textContent === label) || null;
}

function setGeneratingState(isGenerating) {
  const btn = getFooterButton(isGenerating ? 'Generate' : 'Generating\u2026');
  if (!btn) return;
  btn.disabled    = isGenerating;
  btn.textContent = isGenerating ? 'Generating\u2026' : 'Generate';
}

async function handleGenerate() {
  const type  = document.getElementById('print-type').value;
  const month = document.getElementById('print-month').value;
  const date  = document.getElementById('print-day').value || null;
  const errorEl = document.getElementById('print-error');

  errorEl.textContent = '';
  setGeneratingState(true);

  try {
    const [inventoryData, requestsData] = await Promise.all([
      (type === 'inventory' || type === 'all') ? getInventoryDetailReport(month, date) : null,
      (type === 'requests'  || type === 'all') ? getRequestsDetailReport(month, date)  : null,
    ]);
    const doc  = buildReportPdf({ type, inventoryData, requestsData });
    showResult(doc.output('blob'), buildFilename(type, month, date));
  } catch (err) {
    errorEl.textContent = err.message || 'Could not generate the report. Please try again.';
    setGeneratingState(false);
  }
}

function buildFilename(type, month, date) {
  return `bloodsync-${type}-report-${date || month}.pdf`;
}

function showResult(blob, filename) {
  if (_objectUrl) URL.revokeObjectURL(_objectUrl);
  _objectUrl = URL.createObjectURL(blob);

  const wrap = document.createElement('div');
  wrap.className = 'print-result';

  const iframe = document.createElement('iframe');
  iframe.className = 'print-preview-frame';
  iframe.src   = _objectUrl;
  iframe.title = 'Report preview';
  wrap.appendChild(iframe);

  const note = document.createElement('p');
  note.className = 'print-fallback-note';
  note.textContent = 'If the preview doesn\u2019t display, use Download below.';
  wrap.appendChild(note);

  openModal('Report Ready', wrap, [
    { label: 'Close', className: 'btn-secondary', onClick: handleCloseResult },
    { label: 'Download PDF', className: 'btn-primary', onClick: () => downloadBlob(_objectUrl, filename) },
  ]);
}

function downloadBlob(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function handleCloseResult() {
  if (_objectUrl) { URL.revokeObjectURL(_objectUrl); _objectUrl = null; }
  closeModal();
}