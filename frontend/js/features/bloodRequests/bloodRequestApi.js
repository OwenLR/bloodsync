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