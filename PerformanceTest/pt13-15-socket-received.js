// pt13-15-socket-received.js
//
// Measures the FULL "blood request received" path: HTTP POST /api/blood-requests
// completing, THEN the blood_request_new Socket.IO event actually arriving at a
// connected Staff client (socketHandler.js emits to branch_{branch_id} room).
// Artillery's http engine only captures the first half — this script covers both.
//
// NOTE: this is PT13-15, not PT16-18 — PT13-15 is already used by the donor
// search Artillery tests (pt13/14/15-results.json). Keep this script's IDs
// as PT13/14/15 so the two don't overwrite each other's output files.
//
// Usage:
//   node pt13-15-socket-received.js low       (10 concurrent -> pt13-results.json)
//   node pt13-15-socket-received.js average   (25 concurrent -> pt14-results.json)
//   node pt13-15-socket-received.js peak      (50 concurrent -> pt15-results.json)
//
// Requires: node >= 18.14 (native fetch, FormData, Blob, Headers.getSetCookie)
//           npm install --save-dev socket.io-client   (matches server's socket.io@^4.8.3)
//
// Run with server started as: DISABLE_RATE_LIMIT=true node server.js
// sample.png must be in the same folder as this script.

const fs = require('fs/promises');
const { io } = require('socket.io-client');

const BASE_URL   = 'http://localhost:3000';
const STAFF      = { email: 'lipa@bloodsync.site', password: 'password123' };
const REQUESTOR  = { email: 'maria@email.com',      password: 'password123' };
const TIMEOUT_MS = 5000; // how long to wait for the socket event before counting it a failure

const LEVELS = {
  low:     { concurrency: 10, ptId: 'PT13', outFile: 'pt13-results.json' },
  average: { concurrency: 25, ptId: 'PT14', outFile: 'pt14-results.json' },
  peak:    { concurrency: 50, ptId: 'PT15', outFile: 'pt15-results.json' },
};

// ---------------------------------------------------------------------------
// Cookie handling — native fetch has no browser-style cookie jar, so we pull
// Set-Cookie manually and forward it on subsequent requests (mirrors what
// api.js's credentials:'include' does automatically in-browser).
// ---------------------------------------------------------------------------
async function loginAndGetSession(creds) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(creds),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Login failed for ${creds.email}: ${body.message || res.status}`);
  }

  if (typeof res.headers.getSetCookie !== 'function') {
    throw new Error(
      'res.headers.getSetCookie() unavailable — requires Node 18.14+. Check your node version.'
    );
  }
  const cookieHeader = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  return { user: body.data.user, cookieHeader };
}

async function submitBloodRequest(cookieHeader) {
  const fileBuffer = await fs.readFile('./sample.png');

  const form = new FormData();
  form.append('hospital_id', '5');
  form.append('branch_id', '1');
  form.append('patient_name', 'Load Test Patient');
  form.append('patient_age', '30');
  form.append('diagnosis', 'Performance test - socket received (PT13-15)');
  form.append('urgency_level', 'Routine');
  form.append('items', JSON.stringify([{ blood_type: 'O+', component: 'Whole Blood', units_requested: 1 }]));
  form.append('request_form', new Blob([fileBuffer], { type: 'image/png' }), 'sample.png');

  const t0  = Date.now();
  const res = await fetch(`${BASE_URL}/api/blood-requests`, {
    method:  'POST',
    headers: { Cookie: cookieHeader },
    body:    form,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Submit failed: ${body.message || res.status}`);
  }
  return { request_id: body.data.request.request_id, t0 };
}

// ---------------------------------------------------------------------------
async function runTrial(levelKey) {
  const level = LEVELS[levelKey];
  if (!level) {
    console.error('Usage: node pt13-15-socket-received.js <low|average|peak>');
    process.exit(1);
  }

  console.log(`\n${level.ptId} — Blood request received — ${levelKey} (${level.concurrency} concurrent)\n`);

  // 1. Staff logs in, connects socket using its REAL user_id/role_id/branch_id.
  console.log('Logging in Staff + connecting socket...');
  const { user: staffUser } = await loginAndGetSession(STAFF);

  const socket = io(BASE_URL, {
    auth: {
      user_id:   staffUser.user_id,
      role_id:   staffUser.role_id,
      branch_id: staffUser.branch_id,
    },
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Socket connect timed out')), 5000);
    socket.once('connect', () => { clearTimeout(t); resolve(); });
    socket.once('connect_error', (err) => { clearTimeout(t); reject(err); });
  });
  console.log('Socket connected:', socket.id);

  // 2. Correlation state.
  //    `pending`  — request_ids we're actively waiting on (waiter registered
  //                 before the event arrived).
  //    `arrived`  — events that showed up BEFORE we had a chance to register
  //                 a waiter for them. This is the actual fix for the bug in
  //                 the previous version: that version waited for ALL
  //                 submissions to finish (Promise.all) before registering
  //                 ANY waiters — so a fast submission's event could arrive
  //                 and be silently dropped while we were still waiting on
  //                 the slowest submission in the batch. Buffering here means
  //                 no event is ever dropped regardless of arrival order.
  const pending = new Map(); // request_id -> { t0, resolve }
  const arrived = new Map(); // request_id -> receivedAt timestamp
  const results = [];

  socket.on('blood_request_new', (payload) => {
    const receivedAt = Date.now();
    const waiter = pending.get(payload.request_id);
    if (waiter) {
      results.push({ request_id: payload.request_id, latency_ms: receivedAt - waiter.t0, error: false });
      pending.delete(payload.request_id);
      waiter.resolve();
    } else {
      arrived.set(payload.request_id, receivedAt);
    }
  });

  // 3. Requestor logs in once, reused for every submission in this trial.
  console.log('Logging in Requestor...');
  const { cookieHeader: requestorCookie } = await loginAndGetSession(REQUESTOR);

  // 4. Fire all N submissions concurrently — but each one now registers its
  //    own wait immediately after ITS OWN POST resolves, not after the whole
  //    batch finishes. This is the structural fix: submit + correlate is one
  //    combined per-item task, run concurrently via Promise.all, instead of
  //    two sequential Promise.all stages.
  console.log(`Firing ${level.concurrency} concurrent submissions...`);

  const tasks = Array.from({ length: level.concurrency }, () =>
    submitBloodRequest(requestorCookie).then(({ request_id, t0 }) => {
      return new Promise((resolve) => {
        // Event may have already arrived in the brief window between the
        // POST resolving and this line running — check the buffer first.
        if (arrived.has(request_id)) {
          const receivedAt = arrived.get(request_id);
          results.push({ request_id, latency_ms: receivedAt - t0, error: false });
          arrived.delete(request_id);
          resolve();
          return;
        }

        pending.set(request_id, { t0, resolve });
        setTimeout(() => {
          if (pending.has(request_id)) {
            results.push({ request_id, latency_ms: null, error: true, reason: 'timeout waiting for blood_request_new' });
            pending.delete(request_id);
            resolve();
          }
        }, TIMEOUT_MS);
      });
    })
  );

  await Promise.all(tasks);

  socket.disconnect();

  // 5. Aggregate + write JSON.
  const ok         = results.filter(r => !r.error);
  const latencies  = ok.map(r => r.latency_ms).sort((a, b) => a - b);
  const errorCount = results.length - ok.length;

  const summary = {
    test_case:      level.ptId,
    scenario:       'Blood request received (Socket.IO end-to-end)',
    load_level:     levelKey,
    concurrent_users: level.concurrency,
    total:          results.length,
    errors:         errorCount,
    error_rate_pct: results.length > 0 ? ((errorCount / results.length) * 100).toFixed(1) : 'N/A',
    latency_ms: latencies.length > 0 ? {
      min:  latencies[0],
      max:  latencies[latencies.length - 1],
      mean: +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1),
      p95:  latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1],
    } : null,
    raw: results,
  };

  await fs.writeFile(level.outFile, JSON.stringify(summary, null, 2));

  console.log(`\n${level.ptId} complete → ${level.outFile}`);
  console.log(`  Total: ${summary.total} | Errors: ${summary.errors} (${summary.error_rate_pct}%)`);
  if (summary.latency_ms) {
    console.log(`  Mean: ${summary.latency_ms.mean}ms | p95: ${summary.latency_ms.p95}ms | Max: ${summary.latency_ms.max}ms`);
  }
}

const levelArg = process.argv[2];
runTrial(levelArg).catch((err) => {
  console.error('\nTrial failed:', err.message);
  process.exit(1);
});