/**
 * chartHelper.js — Shared Chart.js rendering helpers.
 *
 * Chart.js is loaded globally via a plain <script> tag on any page that
 * uses these helpers (same convention as socket.io's CDN script tag):
 *   <script src="https://unpkg.com/chart.js@4.5.1/dist/chart.umd.js"></script>
 * Pinned to an exact version (not a floating @4 tag) so a future Chart.js
 * major/minor bump can't silently change chart behavior on next page load
 * — bump this deliberately, in one place, if you ever want a newer version.
 * This file reads window.Chart — it does NOT import a Chart.js module.
 * Do not call these helpers on a page that hasn't loaded that script tag.
 *
 * components/ may only import from constants/ (import pyramid) — this file
 * has no feature-layer dependencies, so it's safe to reuse from any
 * dashboard (Admin, Staff, and later Vol/Phleb/Requestor if they end up
 * using charts too).
 *
 * Each render function destroys any existing Chart instance on the same
 * canvas first — safe to call repeatedly (e.g. on retry after an error,
 * or a future live-refresh) without leaking chart instances.
 */

import { CHART_COLORS } from '../constants/chartColors.js';

function destroyExisting(canvas) {
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
    canvas._chartInstance = null;
  }
}

// Default entrance animation for every chart below: geometry (position AND
// size — x, y, width, height, radius, etc.) is fixed from the very first
// frame; only backgroundColor/borderColor fade in from transparent.
//
// Chart.js's own default animates geometry and color together from a
// "reset" state, which reads as each bar/line/segment growing in from a
// corner (position and size both interpolating at once) rather than
// appearing in its correct final place with just a color reveal. Splitting
// `animation` (generic — forced to 0 here) from the `animations` (plural,
// named-group) `colors` override is how Chart.js lets one property group
// animate independently of everything else.
const FIXED_GEOMETRY_ANIMATION = { duration: 0 };
const COLOR_FADE_ANIMATIONS = {
  colors: {
    type: 'color',
    duration: 500,
    from: 'transparent',
  },
};

/**
 * renderBarChart(canvasId, { labels, data, horizontal, color })
 * Single-series bar chart. Set horizontal: true for a horizontal bar
 * (Chart.js indexAxis: 'y') — used for branch-comparison style charts.
 */
export function renderBarChart(canvasId, { labels, data, horizontal = false, color = CHART_COLORS.primary }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  destroyExisting(canvas);

  canvas._chartInstance = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: color,
        borderRadius: 4,
        maxBarThickness: 28,
      }],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: FIXED_GEOMETRY_ANIMATION,
      animations: COLOR_FADE_ANIMATIONS,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
  return canvas._chartInstance;
}

/**
 * renderDoughnutChart(canvasId, { labels, data, colors })
 * Multi-series composition chart (e.g. user roles breakdown).
 */
export function renderDoughnutChart(canvasId, { labels, data, colors = CHART_COLORS.palette }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  destroyExisting(canvas);

  canvas._chartInstance = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      animation: FIXED_GEOMETRY_ANIMATION,
      animations: COLOR_FADE_ANIMATIONS,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      },
    },
  });
  return canvas._chartInstance;
}

/**
 * renderLineChart(canvasId, { labels, data, color })
 * Single-series trend chart (e.g. daily donation counts).
 */
export function renderLineChart(canvasId, { labels, data, color = CHART_COLORS.primary }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  destroyExisting(canvas);

  canvas._chartInstance = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: color + '22', // translucent fill under the line
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: FIXED_GEOMETRY_ANIMATION,
      animations: COLOR_FADE_ANIMATIONS,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 8 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
  return canvas._chartInstance;
}

/**
 * renderGaugeChart(canvasId, { value, max, color, trackColor })
 * A single-value "gauge ring" — a 2-slice doughnut (value + remainder)
 * rather than a multi-category breakdown. Intended to be used in a grid of
 * several of these sharing one common `max` (see reportsUI.js's
 * gaugeDenominator), so ring fullness itself is the at-a-glance comparison
 * across a status breakdown, not just the raw numbers.
 * No legend/tooltip — purely visual, the count is rendered as an HTML
 * overlay in the center by the caller (simpler and more reliably styled
 * than a canvas center-text plugin).
 */
export function renderGaugeChart(canvasId, { value, max, color = CHART_COLORS.primary, trackColor = '#e9e9e9' }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  destroyExisting(canvas);

  const remainder = Math.max(max - value, 0);

  canvas._chartInstance = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, remainder],
        backgroundColor: [color, trackColor],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      animation: FIXED_GEOMETRY_ANIMATION,
      animations: COLOR_FADE_ANIMATIONS,
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false }, // purely visual per request — no percentage/number popup
      },
    },
  });
  return canvas._chartInstance;
}
/*
 * Two or more overlapping trend lines on one set of axes, for direct
 * comparison (e.g. Inbound vs Wastage). New — no existing caller uses
 * renderLineChart for this, so it's an additive export rather than a
 * signature change to the single-series function above.
 * datasets: [{ label, data, color }, ...]
 */
export function renderMultiLineChart(canvasId, { labels, datasets }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  destroyExisting(canvas);

  canvas._chartInstance = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.color,
        fill: false, // overlapping fills between 2+ series would just muddy the chart
        tension: 0.3,
        pointRadius: 2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: FIXED_GEOMETRY_ANIMATION,
      animations: COLOR_FADE_ANIMATIONS,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 8 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
  return canvas._chartInstance;
}