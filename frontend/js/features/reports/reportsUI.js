import { ROUTES } from '../../constants/routes.js';
import { CHART_COLORS } from '../../constants/chartColors.js';
import {
  renderBarChart,
  renderDoughnutChart,
  renderLineChart,
  renderMultiLineChart,
  renderGaugeChart,
} from '../../components/chartHelper.js';

const TABS_ID     = 'report-tabs';
const CONTENT_ID  = 'report-content';
const SKELETON_ID = 'report-skeleton';
const ERROR_ID    = 'report-error';

// Read-only feature, nothing mutates while the page is open — a report is
// fetched once per tab on first click and kept for the rest of the page's
// lifetime rather than refetched on every switch. Cleared on full page reload.
const _cache = {};
let _tabDefs      = null; // { [key]: { label, load, render } } — set by initReportTabs
let _activeKey    = null;
let _activeCharts = [];   // Chart.js instances currently mounted in #report-content

// ---------------------------------------------------------------------------
// Tab wiring
// ---------------------------------------------------------------------------

export function initReportTabs(tabDefs, defaultKey) {
  _tabDefs = tabDefs;

  const tabsWrap = document.getElementById(TABS_ID);
  tabsWrap.textContent = '';

  Object.entries(tabDefs).forEach(([key, def]) => {
    const btn = document.createElement('button');
    btn.type        = 'button';
    btn.className   = 'tab-button';
    btn.dataset.key = key;
    btn.textContent = def.label;
    btn.addEventListener('click', () => switchTab(key));
    tabsWrap.appendChild(btn);
  });

  switchTab(defaultKey);
}

async function switchTab(key) {
  _activeKey = key;
  updateTabState();

  const def = _tabDefs[key];
  if (!def) return;

  showSkeletonState();

  try {
    if (!_cache[key]) {
      _cache[key] = await def.load();
    }
    hideSkeletonState();
    renderInto(def.render(_cache[key]));
  } catch (err) {
    hideSkeletonState();
    showError(err.message);
  }
}

function updateTabState() {
  document.getElementById(TABS_ID).querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('tab-button--active', btn.dataset.key === _activeKey);
  });
}

// def.render(data) returns { node, mount }. `node` is plain DOM (tables,
// stat-rows, empty canvases). `mount` must run AFTER node is attached to the
// live document — Chart.js sizes itself off the canvas's actual laid-out
// dimensions (via the .chart-canvas-wrap height), so creating charts before
// attach would size against a detached, zero-size element.
function renderInto(built) {
  destroyActiveCharts();

  const content = document.getElementById(CONTENT_ID);
  content.textContent = '';
  content.appendChild(built.node);

  _activeCharts = typeof built.mount === 'function' ? (built.mount() || []) : [];
}

// Switching tabs replaces #report-content's children entirely, which
// detaches the previous tab's <canvas> elements from the DOM without ever
// calling Chart.js's own destroy() — that leaves event listeners (resize
// observer, etc.) attached to now-orphaned canvases. Explicitly destroying
// every tracked instance before a tab switch avoids that leak.
function destroyActiveCharts() {
  _activeCharts.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  _activeCharts = [];
}

function showSkeletonState() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(CONTENT_ID).style.display   = 'none';
  document.getElementById(ERROR_ID).textContent       = '';
}

function hideSkeletonState() {
  document.getElementById(SKELETON_ID).style.display = 'none';
  document.getElementById(CONTENT_ID).style.display   = '';
}

function showError(message) {
  document.getElementById(ERROR_ID).textContent =
    message || 'Could not load this report. Please try again.';
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

let _canvasCounter = 0;
function nextCanvasId(prefix) {
  _canvasCounter += 1;
  return `${prefix}-${_canvasCounter}`;
}

function buildSection(title, ...children) {
  const section = document.createElement('div');
  section.className = 'report-section';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  children.forEach(c => section.appendChild(c));
  return section;
}

function buildScopeNote(branchScoped) {
  const p = document.createElement('p');
  p.className   = 'report-scope-note';
  p.textContent = branchScoped ? 'Showing data for your branch.' : 'Showing data for all branches.';
  return p;
}

// Same .chart-card / .chart-canvas-wrap / canvas structure as
// adminDashboardUI.js — reused as-is (features/dashboard.css) rather than
// re-invented, since Chart.js's maintainAspectRatio:false needs that
// explicit-height wrapper to size correctly.
function buildChartCard(title, canvasId, wide = false) {
  const card = document.createElement('div');
  card.className = 'chart-card' + (wide ? ' chart-card--wide' : '');

  const h2 = document.createElement('h2');
  h2.className   = 'chart-card-title';
  h2.textContent = title;
  card.appendChild(h2);

  const wrap = document.createElement('div');
  wrap.className = 'chart-canvas-wrap';

  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  wrap.appendChild(canvas);

  card.appendChild(wrap);
  return card;
}

// Same empty-state handling as adminDashboardUI.js's toggleChartEmpty —
// hides the canvas and shows dashboard.css's .chart-empty-state text
// instead of leaving a blank/collapsed canvas when a breakdown genuinely
// has zero rows (e.g. a brand-new branch with no units yet).
function mountChartOrEmpty(canvasId, hasData, renderFn) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (!hasData) {
    canvas.style.display = 'none';
    const wrapper = canvas.closest('.chart-canvas-wrap');
    const empty = document.createElement('p');
    empty.className   = 'chart-empty-state';
    empty.textContent = 'No data yet.';
    wrapper.appendChild(empty);
    return null;
  }

  return renderFn();
}

// ---------------------------------------------------------------------------
// Gauge grid — a set of 2-slice "fullness ring" doughnuts (one per status)
// sharing one common denominator, so ring fullness is the at-a-glance
// comparison instead of raw bar heights. Denominator is the highest count
// in the set, rounded UP to the next multiple of 10 (e.g. 19 \u2192 20,
// 9 \u2192 10) — a status at exactly that max won't always read as fully
// closed (19/20 still shows a sliver of track), only an exact multiple of
// 10 closes the ring completely. Center count is an HTML overlay, not a
// canvas plugin — simpler to style reliably.
// ---------------------------------------------------------------------------

function gaugeDenominator(rows, countKey) {
  const rawMax = Math.max(...rows.map(r => Number(r[countKey])), 0);
  if (rawMax <= 0) return 10;
  return Math.ceil(rawMax / 10) * 10;
}

// Returns { node, descriptors }. `node` is the ready-to-attach grid (empty
// canvases + center-text overlays + labels). `descriptors` is consumed by
// mountGauges() AFTER node is attached to the DOM, same two-phase reasoning
// as the rest of this file's chart mounting.
//
// linkResolver(labelValue, row) => href|null — optional. When it returns a
// href for a given row, that gauge card renders as an <a> instead of a
// <div> (same href-or-div pattern as adminDashboardUI.js's renderKpiCard),
// so a specific status (e.g. "Pending") can double as a shortcut link.
function buildGaugeGrid(rows, labelKey, countKey, emptyText, linkResolver) {
  if (!rows.length) {
    const p = document.createElement('p');
    p.className   = 'report-empty-note';
    p.textContent = emptyText || 'No data yet.';
    return { node: p, descriptors: [] };
  }

  const grid = document.createElement('div');
  grid.className = 'gauge-grid';

  const descriptors = rows.map((row, i) => {
    const canvasId = nextCanvasId('chart-gauge');
    const value    = Number(row[countKey]);
    const color    = CHART_COLORS.palette[i % CHART_COLORS.palette.length];
    const href     = linkResolver ? linkResolver(row[labelKey], row) : null;

    const card = document.createElement(href ? 'a' : 'div');
    card.className = 'gauge-card' + (href ? ' gauge-card--clickable' : '');
    if (href) card.href = href;

    const ring = document.createElement('div');
    ring.className = 'gauge-ring';

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    ring.appendChild(canvas);

    const centerText = document.createElement('div');
    centerText.className = 'gauge-center-text';
    centerText.textContent = value;
    ring.appendChild(centerText);

    card.appendChild(ring);

    const labelEl = document.createElement('div');
    labelEl.className = 'gauge-label';
    labelEl.textContent = row[labelKey];
    card.appendChild(labelEl);

    grid.appendChild(card);

    return { canvasId, value, color };
  });

  return { node: grid, descriptors };
}

function mountGauges(descriptors, max) {
  return descriptors.map(d => renderGaugeChart(d.canvasId, { value: d.value, max, color: d.color }));
}

function buildStatRow(items) {
  const wrap = document.createElement('div');
  wrap.className = 'stat-row';

  items.forEach(({ label, value }) => {
    const item = document.createElement('div');
    item.className = 'stat-row-item';

    const val = document.createElement('span');
    val.className   = 'stat-row-value';
    val.textContent = value;

    const lbl = document.createElement('span');
    lbl.className   = 'stat-row-label';
    lbl.textContent = label;

    item.appendChild(val);
    item.appendChild(lbl);
    wrap.appendChild(item);
  });

  return wrap;
}

function buildTable(headers, rows, rowMapper, emptyText) {
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead   = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan     = headers.length;
    td.className   = 'report-empty-note';
    td.textContent = emptyText || 'No data yet.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach(row => {
      const tr = document.createElement('tr');
      rowMapper(row).forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  return table;
}

function buildStockTable(rows) {
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead   = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Blood Type', 'Component', 'Units Available'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan     = 3;
    td.className   = 'report-empty-note';
    td.textContent = 'No stock data yet.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach(r => {
      const tr = document.createElement('tr');
      if (r.low_stock) tr.classList.add('report-row--low-stock');

      const bt = document.createElement('td');
      bt.textContent = r.blood_type;
      const comp = document.createElement('td');
      comp.textContent = r.component;
      const units = document.createElement('td');
      units.textContent = r.low_stock ? `${r.units_available} - Low stock` : `${r.units_available}`;

      tr.appendChild(bt);
      tr.appendChild(comp);
      tr.appendChild(units);
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  return table;
}

function buildPeriodTable(rows, labelKey, labelHeader, emptyText) {
  return buildTable(
    [labelHeader, 'Today', 'This Week', 'This Month'],
    rows,
    r => [r[labelKey], r.today, r.this_week, r.this_month],
    emptyText
  );
}

function buildGrid(className, ...children) {
  const wrap = document.createElement('div');
  wrap.className = className;
  children.forEach(c => wrap.appendChild(c));
  return wrap;
}

function wrapReport(...sections) {
  const wrap = document.createElement('div');
  wrap.className = 'report-panel';
  sections.forEach(s => wrap.appendChild(s));
  return wrap;
}

// ---------------------------------------------------------------------------
// Trend helpers — the backend's daily_series queries GROUP BY date and only
// return rows for dates that had activity (no zero-fill for quiet days).
// Building the canonical trailing-N-day window client-side and mapping each
// series onto it (defaulting missing days to 0) keeps the chart's x-axis
// accurate — a sparse dataset shouldn't collapse the range down to just its
// few active days.
// ---------------------------------------------------------------------------

function buildTrailingDateKeys(days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

// Handles the date field arriving as either an ISO string or an epoch-ms
// number (depends on how pg/numify hand it back) — new Date() parses both.
function toDateKey(dateValue) {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function zeroFillSeries(rawData, dateKeys) {
  const map = new Map();
  (rawData || []).forEach(row => {
    const key = toDateKey(row.date);
    if (key) map.set(key, Number(row.count));
  });
  return dateKeys.map(k => map.get(k) || 0);
}

function formatShortDate(dateKey) {
  const d = new Date(dateKey);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Per-report renderers — each returns { node, mount }.
// ---------------------------------------------------------------------------

// Staff only.
export function renderInventoryReport(data) {
  const flowCanvasId = nextCanvasId('chart-inv-flow');
  const statusGauges = buildGaugeGrid(data.status_breakdown, 'status', 'count');

  const overviewSection = buildSection(
    'Inventory Overview',
    buildScopeNote(data.branch_scoped),
    statusGauges.node,
    buildStatRow([
      { label: 'Expired',     value: data.expiry.expired_count },
      { label: 'Near Expiry', value: data.expiry.near_expiry_count },
    ])
  );

  const stockSection = buildSection(
    'Stock by Blood Type & Component',
    buildStockTable(data.stock_by_type)
  );

  const flowSection = buildSection(
    'Unit Flow - Last 30 Days',
    buildStatRow([
      { label: 'Inbound Today',  value: data.inbound.today },
      { label: 'Inbound Week',   value: data.inbound.this_week },
      { label: 'Inbound Month',  value: data.inbound.this_month },
      { label: 'Wastage Today',  value: data.wastage.today },
      { label: 'Wastage Week',   value: data.wastage.this_week },
      { label: 'Wastage Month',  value: data.wastage.this_month },
    ]),
    buildChartCard('Inbound vs Wastage', flowCanvasId, true)
  );

  const node = wrapReport(overviewSection, stockSection, flowSection);

  const mount = () => {
    const charts = [];

    charts.push(...mountGauges(statusGauges.descriptors, gaugeDenominator(data.status_breakdown, 'count')));

    const dateKeys = buildTrailingDateKeys(30);
    const inboundFilled = zeroFillSeries(data.inbound.daily_series, dateKeys);
    const wastageFilled = zeroFillSeries(data.wastage.daily_series, dateKeys);
    const hasFlowData   = inboundFilled.some(v => v > 0) || wastageFilled.some(v => v > 0);

    charts.push(mountChartOrEmpty(flowCanvasId, hasFlowData, () =>
      renderMultiLineChart(flowCanvasId, {
        labels: dateKeys.map(formatShortDate),
        datasets: [
          { label: 'Inbound', color: '#1a56c4',            data: inboundFilled },
          { label: 'Wastage', color: CHART_COLORS.primary, data: wastageFilled },
        ],
      })
    ));

    return charts;
  };

  return { node, mount };
}

// Admin + Staff.
export function renderDonorsReport(data) {
  const trendCanvasId = nextCanvasId('chart-donors-trend');

  const registeredCol = document.createElement('div');
  registeredCol.className = 'report-flow-col';
  const registeredTitle = document.createElement('h4');
  registeredTitle.textContent = 'Donors Registered';
  registeredCol.appendChild(registeredTitle);
  const globalNote = document.createElement('p');
  globalNote.className   = 'report-scope-note';
  globalNote.textContent = 'All branches - donor registration isn\u2019t branch-scoped.';
  registeredCol.appendChild(globalNote);
  registeredCol.appendChild(buildStatRow([
    { label: 'Today',      value: data.donors_registered.today },
    { label: 'This Week',  value: data.donors_registered.this_week },
    { label: 'This Month', value: data.donors_registered.this_month },
  ]));

  const donationsCol = document.createElement('div');
  donationsCol.className = 'report-flow-col';
  const donationsTitle = document.createElement('h4');
  donationsTitle.textContent = 'Donations';
  donationsCol.appendChild(donationsTitle);
  donationsCol.appendChild(buildScopeNote(data.branch_scoped));
  donationsCol.appendChild(buildStatRow([
    { label: 'Today',            value: data.donations.today },
    { label: 'This Week',        value: data.donations.this_week },
    { label: 'This Month',       value: data.donations.this_month },
    { label: 'QNS (This Month)', value: data.donations.qns_this_month },
  ]));

  const overviewSection = buildSection(
    'Donor Activity Overview',
    buildGrid('report-flow-grid', registeredCol, donationsCol)
  );

  const trendSection = buildSection(
    'Donations Trend - Last 30 Days',
    buildChartCard('Donations', trendCanvasId, true)
  );

  const interviewSection = buildSection(
    'Interviews by Result',
    buildPeriodTable(data.interviews_by_result, 'interview_result', 'Result')
  );

  const screeningSection = buildSection(
    'Screenings by Result',
    buildPeriodTable(data.screenings_by_result, 'screening_result', 'Result')
  );

  const node = wrapReport(overviewSection, trendSection, interviewSection, screeningSection);

  const mount = () => {
    const dateKeys = buildTrailingDateKeys(30);
    const filled   = zeroFillSeries(data.donation_daily_series, dateKeys);
    const hasData  = filled.some(v => v > 0);

    return [mountChartOrEmpty(trendCanvasId, hasData, () =>
      renderLineChart(trendCanvasId, {
        labels: dateKeys.map(formatShortDate),
        data:   filled,
      })
    )];
  };

  return { node, mount };
}

// Admin + Staff.
export function renderDrivesReport(data) {
  const statusGauges = buildGaugeGrid(data.status_breakdown, 'status', 'count');

  const statusSection = buildSection(
    'Blood Drive Status',
    buildScopeNote(data.branch_scoped),
    statusGauges.node
  );

  const createdSection = buildSection(
    'Drives Created',
    buildStatRow([
      { label: 'This Week',  value: data.created.this_week },
      { label: 'This Month', value: data.created.this_month },
    ])
  );

  const node = wrapReport(statusSection, createdSection);

  const mount = () => mountGauges(statusGauges.descriptors, gaugeDenominator(data.status_breakdown, 'count'));

  return { node, mount };
}

// Staff only.
export function renderTestingReport(data) {
  const statusGauges = buildGaugeGrid(data.status_breakdown, 'status', 'count');

  const statusSection = buildSection(
    'Blood Collection Status',
    buildScopeNote(data.branch_scoped),
    statusGauges.node
  );

  const totalsSection = buildSection(
    'Totals',
    buildStatRow([
      { label: 'Today',            value: data.totals.today },
      { label: 'This Week',        value: data.totals.this_week },
      { label: 'This Month',       value: data.totals.this_month },
      { label: 'QNS (This Month)', value: data.totals.qns_this_month },
    ])
  );

  const node = wrapReport(statusSection, totalsSection);

  const mount = () => mountGauges(statusGauges.descriptors, gaugeDenominator(data.status_breakdown, 'count'));

  return { node, mount };
}

// Staff only.
export function renderRequestsReport(data) {
  const urgencyCanvasId = nextCanvasId('chart-requests-urgency');
  const statusGauges    = buildGaugeGrid(data.status_breakdown, 'status', 'count');

  const statusSection = buildSection(
    'Blood Request Status',
    buildScopeNote(data.branch_scoped),
    statusGauges.node
  );

  const urgencySection = buildSection(
    'Urgency - Active Requests Only',
    buildChartCard('Urgency Breakdown', urgencyCanvasId)
  );

  const totalsSection = buildSection(
    'Totals',
    buildStatRow([
      { label: 'Today',      value: data.totals.today },
      { label: 'This Week',  value: data.totals.this_week },
      { label: 'This Month', value: data.totals.this_month },
    ])
  );

  const node = wrapReport(statusSection, urgencySection, totalsSection);

  const mount = () => [
    ...mountGauges(statusGauges.descriptors, gaugeDenominator(data.status_breakdown, 'count')),
    mountChartOrEmpty(urgencyCanvasId, data.urgency_breakdown_active.length > 0, () =>
      renderBarChart(urgencyCanvasId, {
        labels: data.urgency_breakdown_active.map(r => r.urgency_level),
        data:   data.urgency_breakdown_active.map(r => r.count),
      })
    ),
  ];

  return { node, mount };
}

// Admin only.
export function renderUsersReport(data) {
  const roleCanvasId        = nextCanvasId('chart-users-role');
  const staffBranchCanvasId = nextCanvasId('chart-users-staff-branch');

  // The Pending ring itself is the shortcut to Users - replaces the old
  // separate callout card entirely. Note: a status only appears in
  // status_breakdown when its count is > 0 (backend GROUP BY, no zero
  // rows), so if there are zero pending accounts there's simply no
  // "Pending" ring to click - acceptable, since zero pending means
  // nothing needs reviewing anyway.
  const statusGauges = buildGaugeGrid(
    data.status_breakdown, 'status', 'count', undefined,
    (status) => status === 'Pending' ? ROUTES.ADMIN.USERS : null
  );

  const overviewSection = buildSection(
    'User Overview',
    statusGauges.node
  );

  const roleSection = buildSection(
    'Users by Role',
    buildGrid(
      'report-overview-grid',
      buildChartCard('Role Breakdown', roleCanvasId),
      buildTable(
        ['Role', 'Count'],
        data.role_breakdown,
        r => [r.role_name, r.count]
      )
    )
  );

  const registeredSection = buildSection(
    'Users Registered',
    buildStatRow([
      { label: 'Today',      value: data.registered.today },
      { label: 'This Week',  value: data.registered.this_week },
      { label: 'This Month', value: data.registered.this_month },
    ])
  );

  const staffByBranchSection = buildSection(
    'Active Staff by Branch',
    buildChartCard('Active Staff by Branch', staffBranchCanvasId, true),
    buildTable(
      ['Branch', 'Active Staff'],
      data.active_staff_by_branch,
      r => [r.branch_name, r.active_staff_count],
      'No branches found.'
    )
  );

  const node = wrapReport(overviewSection, roleSection, registeredSection, staffByBranchSection);

  const mount = () => [
    ...mountGauges(statusGauges.descriptors, gaugeDenominator(data.status_breakdown, 'count')),
    mountChartOrEmpty(roleCanvasId, data.role_breakdown.length > 0, () =>
      renderDoughnutChart(roleCanvasId, {
        labels: data.role_breakdown.map(r => r.role_name),
        data:   data.role_breakdown.map(r => r.count),
      })
    ),
    mountChartOrEmpty(staffBranchCanvasId, data.active_staff_by_branch.length > 0, () =>
      renderBarChart(staffBranchCanvasId, {
        labels:     data.active_staff_by_branch.map(r => r.branch_name),
        data:       data.active_staff_by_branch.map(r => r.active_staff_count),
        horizontal: true,
      })
    ),
  ];

  return { node, mount };
}