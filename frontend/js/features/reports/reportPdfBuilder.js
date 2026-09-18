/**
 * reportPdfBuilder.js
 *
 * Pure data -> jsPDF document builder for the Print Report feature.
 * Takes report detail JSON (as returned by reportPrintApi.js) and returns
 * a jsPDF instance. Depends on jsPDF + jspdf-autotable being loaded
 * globally via <script> tags on the page (same CDN/UMD pattern as
 * Chart.js in chartHelper.js) — NOT imported as an ES module.
 *
 * Should NOT contain:
 * - DOM manipulation (no document.*, no querySelector)
 * - fetch / apiFetch calls
 * - event handlers
 */

const BRAND_TITLE = 'BloodSync';

// ---------------------------------------------------------------------------
// autoTable compatibility shim
// ---------------------------------------------------------------------------
// jspdf-autotable's CDN build has shown two different call shapes across
// versions/forks: doc.autoTable({...}) patched directly onto the jsPDF
// prototype, OR a standalone autoTable(doc, {...}) function exposed on
// window['jspdf-autotable']. This resolves whichever one actually loaded
// rather than assuming — confirm which branch fires in your build, then
// this comment + the unused branch can be deleted.
function renderTable(doc, options) {
  const standalone = window['jspdf-autotable'] && window['jspdf-autotable'].autoTable;
  if (typeof standalone === 'function') {
    standalone(doc, options);
    return;
  }
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
    return;
  }
  throw new Error('jspdf-autotable did not load correctly — check the CDN <script> tags.');
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
// NOTE: assumed no shared dateHelper.js exists elsewhere in the project —
// flag if one does, so these get replaced with imports instead of duplicating.

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function scopeLabel(scope) {
  if (scope.date) return formatDate(scope.date);
  const [year, month] = scope.month.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-PH', { year: 'numeric', month: 'long' });
}

function donorName(row) {
  return [row.donor_first_name, row.donor_last_name].filter(Boolean).join(' ') || '\u2014';
}

function phlebotomistName(row) {
  return [row.phlebotomist_first_name, row.phlebotomist_last_name].filter(Boolean).join(' ') || 'Unassigned';
}

function addSectionHeader(doc, title, scope, branchScoped) {
  doc.setFontSize(16);
  doc.text(BRAND_TITLE, 40, 40);
  doc.setFontSize(12);
  doc.text(title, 40, 60);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Period: ${scopeLabel(scope)} \u2022 ${branchScoped ? 'Branch-scoped' : 'All branches'}`, 40, 76);
  doc.text(`Generated: ${formatDateTime(new Date())}`, 40, 90);
  doc.setTextColor(0);
}

// ---------------------------------------------------------------------------
// Blood Unit ("in") section
// ---------------------------------------------------------------------------

const INVENTORY_HEAD = [[
  'Unit ID', 'Blood Type', 'Component', 'Vol (mL)',
  'Collected', 'Expires', 'Status', 'Branch', 'Donor', 'Phlebotomist',
]];

function inventoryRows(units) {
  return units.map(u => [
    u.unit_id, u.blood_type, u.component, u.volume_ml,
    formatDate(u.collection_date), formatDate(u.expiration_date),
    u.status, u.branch_name || '\u2014', donorName(u), phlebotomistName(u),
  ]);
}

function addInventorySection(doc, data, startNewPage) {
  if (startNewPage) doc.addPage();
  addSectionHeader(doc, 'Blood Unit Report (In)', data.scope, data.branch_scoped);

  renderTable(doc, {
    head: INVENTORY_HEAD,
    body: inventoryRows(data.units),
    startY: 105,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [26, 86, 196] },
    margin: { left: 40, right: 40 },
  });

  if (!data.units.length) {
    doc.setFontSize(10);
    doc.text('No blood units recorded for this period.', 40, 118);
  }
}

// ---------------------------------------------------------------------------
// Blood Request ("out") section
// ---------------------------------------------------------------------------
// ASSUMPTION flagged for your review: a request with multiple items is
// flattened to one PDF row per item (request-level columns repeat), rather
// than joining items into a single cell — better for an audit-style detail
// list, but easy to switch to a joined-cell format if you'd prefer fewer,
// denser rows.

const REQUEST_HEAD = [[
  'Req ID', 'Patient', 'Urgency', 'Status', 'Hospital', 'Branch', 'Requestor',
  'Blood Type', 'Component', 'Units Req.', 'Units Fulfilled', 'Submitted', 'Reviewed',
]];

function requestRows(requests) {
  const rows = [];
  requests.forEach(r => {
    const requestor = [r.requestor_first_name, r.requestor_last_name].filter(Boolean).join(' ') || '\u2014';
    const base = [r.request_id, r.patient_name, r.urgency_level, r.status, r.hospital_name || '\u2014', r.branch_name || '\u2014', requestor];
    const tail = [formatDateTime(r.created_at), formatDateTime(r.reviewed_at)];

    if (!r.items || !r.items.length) {
      rows.push([...base, '\u2014', '\u2014', '\u2014', '\u2014', ...tail]);
      return;
    }
    r.items.forEach(item => {
      rows.push([...base, item.blood_type, item.component, item.units_requested, item.units_fulfilled ?? '\u2014', ...tail]);
    });
  });
  return rows;
}

function addRequestsSection(doc, data, startNewPage) {
  if (startNewPage) doc.addPage();
  addSectionHeader(doc, 'Blood Request Report (Out)', data.scope, data.branch_scoped);

  renderTable(doc, {
    head: REQUEST_HEAD,
    body: requestRows(data.requests),
    startY: 105,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [196, 26, 26] },
    margin: { left: 40, right: 40 },
  });

  if (!data.requests.length) {
    doc.setFontSize(10);
    doc.text('No blood requests recorded for this period.', 40, 118);
  }
}

function addPageNumbers(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 90, doc.internal.pageSize.getHeight() - 20);
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * @param {'all'|'inventory'|'requests'} type
 * @param {object|null} inventoryData - required when type is 'inventory' or 'all'
 * @param {object|null} requestsData  - required when type is 'requests' or 'all'
 * @returns {jsPDF} document instance — caller decides preview vs download
 */
export function buildReportPdf({ type, inventoryData, requestsData }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  let sectionAdded = false;
  if (type === 'inventory' || type === 'all') {
    addInventorySection(doc, inventoryData, false);
    sectionAdded = true;
  }
  if (type === 'requests' || type === 'all') {
    addRequestsSection(doc, requestsData, sectionAdded);
  }

  addPageNumbers(doc);
  return doc;
}