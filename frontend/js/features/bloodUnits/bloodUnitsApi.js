import { apiFetch } from '../../core/api.js';

const BASE = '/api/blood-units';

// GET /api/blood-units/branch/:branch_id
// Returns ALL units for the branch (every status, including terminal ones) —
// backend computes status: 'Expired' for Available units past expiration_date.
// Section 2 (Main Inventory) + Section 4 (Blood Separation) share this Api file —
// separateUnit() below is used by the Blood Separation page only, per the
// feature-to-feature API reuse precedent set by Inventory Cleaning (Section 3).
export async function getUnitsByBranch(branchId) {
  const res  = await apiFetch(`${BASE}/branch/${branchId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood units.');
  return body.data;
}

// GET /api/blood-units/:id
export async function getUnitById(unitId) {
  const res  = await apiFetch(`${BASE}/${unitId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load unit details.');
  return body.data;
}

// PATCH /api/blood-units/:id/status
// status: 'Disposed' | 'Withdrawn' — reason required for both (backend: REASON_REQUIRED_STATUSES)
// Backend also rejects if unit is terminal OR expired (assertNotTerminal) — same
// rule already mirrored client-side in bloodUnitsUI.js for button visibility,
// backend remains the actual enforcer.
export async function updateUnitStatus(unitId, status, reason) {
  const res  = await apiFetch(`${BASE}/${unitId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, reason }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update unit status.');
  return body.data;
}

// POST /api/blood-units/:id/separate
// No request body — unit_id comes from the URL only (backend: validateSeparate() takes no args).
// Only valid for component='Whole Blood' AND status='Available' (backend: assertSeparable) —
// same rule mirrored client-side in bloodSeparationUI.js for which units are selectable,
// backend remains the actual enforcer.
// Response: { separated_unit, derived_collections: [3 rows] } — both are raw DB rows,
// NOT joined with donor/branch names. UI must pull display fields (donor name, blood type,
// branch) from the unit row already in hand before calling this, not from the response.
export async function separateUnit(unitId) {
  const res  = await apiFetch(`${BASE}/${unitId}/separate`, {
    method: 'POST',
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to separate blood unit.');
  return body.data;
}