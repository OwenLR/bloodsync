// generate-report.js
// Usage: node generate-report.js <report.json>
// Converts either an Artillery JSON report OR a PT16-18 Socket.IO script
// summary into a simple, self-contained HTML page (no external services,
// no internet connection required to view it).

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node generate-report.js <report.json>');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(raw);

const fmt = (n) => (typeof n === 'number' ? n.toFixed(1) : 'N/A');

const SHARED_STYLE = `<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f7f8fa; color: #1a1a1a; padding: 40px; }
  .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 28px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
  th { color: #666; font-weight: 600; background: #fafafa; }
  .metric-value { font-weight: 600; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .badge-success { background: #dafbe1; color: #1a7f37; }
  .badge-error { background: #ffebe9; color: #cf222e; }
  .section-title { font-size: 15px; font-weight: 600; margin: 24px 0 10px; }
</style>`;

const isSocketFormat = data.test_case !== undefined; // pt16-18-socket-received.js shape

const html = isSocketFormat
  ? buildSocketReport(data, inputFile)
  : buildArtilleryReport(data, inputFile);

const outputFile = inputFile.replace(/\.json$/, '') + '-report.html';
fs.writeFileSync(outputFile, html);
console.log(`Report generated: ${outputFile}`);

// ---------------------------------------------------------------------------
// Artillery-format reports (PT01-15, PT19-24 — anything run via `artillery run`)
// ---------------------------------------------------------------------------
function buildArtilleryReport(data, inputFile) {
  const agg = data.aggregate || {};
  const counters = agg.counters || {};
  const summaries = agg.summaries || {};

  const responseTime = summaries['http.response_time'] || {};
  const totalRequests = counters['http.requests'] || 0;
  const failedVusers = counters['vusers.failed'] || 0;
  const createdVusers = counters['vusers.created'] || 0;
  const completedVusers = counters['vusers.completed'] || 0;

  // Sum ALL 2xx codes as success — was hardcoded to 200 only, which
  // silently under-reported PT07-09/22-24 (expect 201) as 0 successful.
  const successCount = Object.entries(counters)
    .filter(([key]) => /^http\.codes\.2\d\d$/.test(key))
    .reduce((sum, [, value]) => sum + value, 0);

  // Non-2xx codes only, for the error breakdown table
  const errorCodes = Object.entries(counters)
    .filter(([key]) => key.startsWith('http.codes.') && !/^http\.codes\.2\d\d$/.test(key))
    .map(([key, value]) => ({ code: key.replace('http.codes.', ''), count: value }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BloodSync Performance Test Report</title>
${SHARED_STYLE}
</head>
<body>
  <div class="container">
    <h1>BloodSync Performance Test Report</h1>
    <div class="subtitle">Generated from ${path.basename(inputFile)} on ${new Date().toLocaleString()}</div>

    <div class="section-title">Summary</div>
    <table>
      <tr><th>Total Requests</th><td>${totalRequests}</td></tr>
      <tr><th>Successful (2xx)</th><td><span class="badge badge-success">${successCount}</span></td></tr>
      <tr><th>Virtual Users Created</th><td>${createdVusers}</td></tr>
      <tr><th>Virtual Users Completed</th><td>${completedVusers}</td></tr>
      <tr><th>Virtual Users Failed</th><td>${failedVusers > 0 ? `<span class="badge badge-error">${failedVusers}</span>` : `<span class="badge badge-success">0</span>`}</td></tr>
    </table>

    <div class="section-title">Response Time (ms)</div>
    <table>
      <tr><th>Min</th><td class="metric-value">${fmt(responseTime.min)}</td></tr>
      <tr><th>Max</th><td class="metric-value">${fmt(responseTime.max)}</td></tr>
      <tr><th>Mean</th><td class="metric-value">${fmt(responseTime.mean)}</td></tr>
      <tr><th>Median</th><td class="metric-value">${fmt(responseTime.median)}</td></tr>
      <tr><th>p95</th><td class="metric-value">${fmt(responseTime.p95)}</td></tr>
      <tr><th>p99</th><td class="metric-value">${fmt(responseTime.p99)}</td></tr>
    </table>

    ${errorCodes.length > 0 ? `
    <div class="section-title">Error Breakdown</div>
    <table>
      <tr><th>Status Code</th><th>Count</th></tr>
      ${errorCodes.map(e => `<tr><td>${e.code}</td><td>${e.count}</td></tr>`).join('')}
    </table>
    ` : ''}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PT16-18 Socket.IO script format — different shape entirely (no aggregate/
// counters, just the flat summary object pt16-18-socket-received.js writes).
// ---------------------------------------------------------------------------
function buildSocketReport(data, inputFile) {
  const lat = data.latency_ms || {};
  const errorRows = (data.raw || []).filter(r => r.error);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BloodSync Performance Test Report</title>
${SHARED_STYLE}
</head>
<body>
  <div class="container">
    <h1>BloodSync Performance Test Report — ${data.test_case}</h1>
    <div class="subtitle">${data.scenario} · Generated from ${path.basename(inputFile)} on ${new Date().toLocaleString()}</div>

    <div class="section-title">Summary</div>
    <table>
      <tr><th>Load Level</th><td>${data.load_level}</td></tr>
      <tr><th>Concurrent Users</th><td>${data.concurrent_users}</td></tr>
      <tr><th>Total Trials</th><td>${data.total}</td></tr>
      <tr><th>Errors / Timeouts</th><td>${data.errors > 0 ? `<span class="badge badge-error">${data.errors}</span>` : `<span class="badge badge-success">0</span>`}</td></tr>
      <tr><th>Error Rate</th><td>${data.error_rate_pct}%</td></tr>
    </table>

    <div class="section-title">End-to-End Latency (ms) — HTTP submit &rarr; Socket.IO delivery</div>
    <table>
      ${lat.min !== undefined ? `
      <tr><th>Min</th><td class="metric-value">${fmt(lat.min)}</td></tr>
      <tr><th>Max</th><td class="metric-value">${fmt(lat.max)}</td></tr>
      <tr><th>Mean</th><td class="metric-value">${fmt(lat.mean)}</td></tr>
      <tr><th>p95</th><td class="metric-value">${fmt(lat.p95)}</td></tr>
      ` : `<tr><td colspan="2">No successful trials — all timed out or errored.</td></tr>`}
    </table>

    ${errorRows.length > 0 ? `
    <div class="section-title">Error / Timeout Breakdown</div>
    <table>
      <tr><th>Request ID</th><th>Reason</th></tr>
      ${errorRows.map(e => `<tr><td>${e.request_id}</td><td>${e.reason || 'unknown'}</td></tr>`).join('')}
    </table>
    ` : ''}
  </div>
</body>
</html>`;
}