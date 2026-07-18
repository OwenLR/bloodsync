/**
 * zipLookupApi.js — Calls our own backend's ZIP code lookup endpoint
 * (GET /api/reference/zip-lookup). This IS our backend, unlike psgcApi.js
 * and fieldGeocodeApi.js, so it goes through apiFetch like every other
 * feature Api file — no raw fetch() here.
 *
 * Best-effort only — see postalCodeService.js (backend) for the full
 * explanation of the data source and its limitations. Never throws for
 * "no match found"; only throws on a genuine network/server failure,
 * which the caller should treat the same way (silently skip pre-fill).
 *
 * Path: frontend/js/features/registration/zipLookupApi.js
 */

import { apiFetch } from '../../core/api.js';

/**
 * @param {{ province: string, municipality: string }} params
 * @returns {Promise<{ post_code: number, matched_municipality: string } | null>}
 */
export async function lookupZip({ province, municipality }) {
  if (!municipality) return null;

  const query = new URLSearchParams({ municipality, ...(province ? { province } : {}) });

  try {
    const res  = await apiFetch(`/api/reference/zip-lookup?${query.toString()}`, { method: 'GET' });
    const body = await res.json();

    if (!res.ok || !body.success || !body.data) return null;
    return body.data;
  } catch {
    return null; // silent — same "never blocks the flow" pattern as geocoding
  }
}