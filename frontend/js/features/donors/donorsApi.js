import { apiFetch } from '../../core/api.js';

const BASE = '/api/donors';

/**
 * Get all donors.
 * @returns {Promise<Array>}
 */
export async function getAllDonors() {
  const res  = await apiFetch(BASE);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donors.');
  return body.data;
}

/**
 * Search donors by name or ID number.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchDonors(query) {
  const res  = await apiFetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Search failed.');
  return body.data;
}

/**
 * Get a single donor by ID.
 * @param {number} donorId
 * @returns {Promise<Object>}
 */
export async function getDonorById(donorId) {
  const res  = await apiFetch(`${BASE}/${donorId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Donor not found.');
  return body.data;
}

/**
 * Create a new donor.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createDonor(data) {
  const res  = await apiFetch(BASE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err     = new Error(body.message || 'Failed to register donor.');
    err.status    = res.status;
    throw err;
  }
  return body.data;
}

/**
 * Update a donor (Admin + PRC Staff full edit).
 * @param {number} donorId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateDonor(donorId, data) {
  const res  = await apiFetch(`${BASE}/${donorId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update donor.');
  return body.data;
}

/**
 * Delete a donor (Admin only).
 * @param {number} donorId
 * @returns {Promise<void>}
 */
export async function deleteDonor(donorId) {
  const res  = await apiFetch(`${BASE}/${donorId}`, { method: 'DELETE' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to delete donor.');
}