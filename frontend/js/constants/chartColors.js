/**
 * chartColors.js — Shared color palette for Chart.js dashboards.
 *
 * Lives in constants/ (not components/) so components/chartHelper.js can
 * import it while still only importing from constants/, per the project's
 * import pyramid (components/ ← constants/ only).
 */

export const CHART_COLORS = Object.freeze({
  // Matches --color-primary used elsewhere (e.g. navbar avatar placeholder)
  primary: '#c0392b',

  // Multi-series palette (doughnut/pie charts) — brand red first, then
  // distinct hues for readability at a glance.
  palette: [
    '#c0392b', // brand red
    '#2196f3', // blue
    '#4caf50', // green
    '#ff9800', // orange
    '#9c27b0', // purple
    '#607d8b', // slate
  ],
});