import { apiFetch } from '../../core/api.js';

const BASE = '/api/blood-requests';

// POST /api/blood-requests/fulfillment-options
// Read-only planning call — no mutation, no notification (fulfillmentService.js).
// items: [{ blood_type, component, units_requested }]
// latitude/longitude optional. When omitted, fulfillmentService.getDistanceKm
// returns the same Infinity for every branch, so the sort is a no-op and
// branches keep their original branch_name ASC order from the SQL query —
// i.e. alphabetical, per contract.md.
export async function getFulfillmentOptions(items, latitude, longitude) {
  const res  = await apiFetch(`${BASE}/fulfillment-options`, {
    method: 'POST',
    body:   JSON.stringify({ items, latitude, longitude }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load fulfillment options.');
  return body.data;
}

// POST /api/blood-requests — multipart/form-data (request_form file field)
// formData must already contain: hospital_id, branch_id, patient_name, items
// (JSON string), and request_form (file) — assembled by bloodRequestSubmitUI.js.
// fulfillment_type/preferred_branch_id intentionally omitted — see gotchas.md.
export async function submitBloodRequest(formData) {
  const res  = await apiFetch(BASE, {
    method: 'POST',
    body:   formData,
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to submit blood request.');
  return body.data;
}

// GET /api/blood-requests/my-requests
// Server-scoped to the logged-in requestor — no frontend filter needed.
// Fields: request_id, hospital_id, hospital_name, branch_id, branch_name,
// patient_name, urgency_level, fulfillment_type, delivery_address,
// status, denial_reason, created_at (narrower than staff list — no reviewed_by/notes).
export async function getMyRequests() {
  const res  = await apiFetch(`${BASE}/my-requests`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load your requests.');
  return body.data;
}

// PATCH /api/blood-requests/:id/cancel — no body
// Own Pending requests only. Returns the raw blood_requests row (no joins —
// no hospital_name/branch_name). Caller must merge status into the existing
// list item, not replace it with this response.
// Does NOT emit a socket event or notification — see gochas.md #44.
export async function cancelRequest(requestId) {
  const res  = await apiFetch(`${BASE}/${requestId}/cancel`, { method: 'PATCH' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to cancel request.');
  return body.data;
}

// PATCH /api/blood-requests/:id/received — no body
// Waiting → Released only. Same "raw row, no joins" caveat as cancelRequest.
// Does NOT emit a socket event or notification — see gochas.md #44.
export async function markReceived(requestId) {
  const res  = await apiFetch(`${BASE}/${requestId}/received`, { method: 'PATCH' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to confirm receipt.');
  return body.data;
}

// GET /api/blood-requests
// PRC Staff: backend auto-scopes to own branch (getRequestsByBranch) — no
// frontend filter or branch param needed, and no 403 either; contract.md
// confirms it silently returns only that branch's requests.
export async function getAllRequestsStaff() {
  const res  = await apiFetch(BASE);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood requests.');
  return body.data;
}

// GET /api/blood-requests/:id
// Full detail: base fields + items[], reservations[], logs[].
// 403 if this request's branch doesn't match the staff user's own branch —
// backend-enforced, not client-checked.
export async function getRequestById(requestId) {
  const res  = await apiFetch(`${BASE}/${requestId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load request details.');
  return body.data;
}

// PATCH /api/blood-requests/:id/status
// status: 'Approved' | 'Rejected' | 'Waiting' | 'Released'
// denial_reason required only when status is 'Rejected'.
// Valid transitions (contract.md): Pending→Approved/Rejected,
// Approved→Waiting/Rejected, Waiting→Released/Rejected. Cannot set Cancelled.
export async function updateRequestStatus(requestId, status, denialReason = '') {
  const res  = await apiFetch(`${BASE}/${requestId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, denial_reason: denialReason }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update request status.');
  return body.data;
}

// PATCH /api/blood-requests/:id/ready — no body
// Approved → Waiting only. Notifies requestor same as /status.
export async function markReadyForPickup(requestId) {
  const res  = await apiFetch(`${BASE}/${requestId}/ready`, { method: 'PATCH' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to mark request ready.');
  return body.data;
}

// GET /api/blood-requests/estimate/:branch_id  [Requestor]
// Response: { pending_count, estimate, next_open, is_open }. `estimate` is a
// queue-depth-based label computed server-side (WAIT_TIME_ESTIMATES in
// bloodRequestConstant.js on the backend) — never hardcode the label
// strings frontend-side, just display whatever string comes back.
export async function getWaitEstimate(branchId) {
  const res  = await apiFetch(`${BASE}/estimate/${branchId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load wait time estimate.');
  return body.data;
}