import { apiFetch } from '../../core/api.js';

const BASE = '/api/blood-collections';

// GET /api/blood-collections/branch/:branch_id
export async function getCollectionsByBranch(branchId) {
  const res  = await apiFetch(`${BASE}/branch/${branchId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood collections.');
  return body.data;
}

// GET /api/blood-collections/:id
export async function getCollectionById(collectionId) {
  const res  = await apiFetch(`${BASE}/${collectionId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load collection details.');
  return body.data;
}

// PATCH /api/blood-collections/:id/status
// status: 'Safe' | 'Rejected' | 'Disposed' | 'Withdrawn'
// reason: required for Rejected, optional/ignored otherwise
export async function updateCollectionStatus(collectionId, status, reason = '') {
  const res  = await apiFetch(`${BASE}/${collectionId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, reason }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update collection status.');
  return body.data;
}