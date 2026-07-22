import { apiFetch } from '../../core/api.js';

const BASE = '/api/reports';

// GET /api/reports/inventory. PRC Staff only (backend route-level
// restriction, not just frontend). See contract.md / sessionState.md
// Permanent Rules, Admin has no page for this and never will.
export async function getInventoryReport() {
  const res  = await apiFetch(`${BASE}/inventory`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load inventory report.');
  return body.data;
}

// GET /api/reports/donors. Admin + PRC Staff. Staff: own branch. Admin:
// all branches (donors_registered itself is global regardless, per
// reportModel.js's note).
export async function getDonorsReport() {
  const res  = await apiFetch(`${BASE}/donors`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donors report.');
  return body.data;
}

// GET /api/reports/drives. Admin + PRC Staff. Staff: own branch. Admin: all.
export async function getDrivesReport() {
  const res  = await apiFetch(`${BASE}/drives`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood drives report.');
  return body.data;
}

// GET /api/reports/testing. PRC Staff only.
export async function getTestingReport() {
  const res  = await apiFetch(`${BASE}/testing`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood testing report.');
  return body.data;
}

// GET /api/reports/requests. PRC Staff only.
export async function getRequestsReport() {
  const res  = await apiFetch(`${BASE}/requests`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood requests report.');
  return body.data;
}

// GET /api/reports/users. Admin only. No branch_scoped field on this one,
// inherently global (reportService.js's getUsersReport() takes no user arg).
export async function getUsersReport() {
  const res  = await apiFetch(`${BASE}/users`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load users report.');
  return body.data;
}

// GET /api/reports/my-impact. Volunteer + Phlebotomist only. Personal
// lifetime counts (interviews_conducted, screenings_performed,
// units_extracted), not branch or drive scoped. Used by the Field
// Dashboard's Your Impact section.
export async function getMyImpactReport() {
  const res  = await apiFetch(`${BASE}/my-impact`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load your impact stats.');
  return body.data;
}