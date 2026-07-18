/**
 * branchesApi.js — PRC branch reference data.
 *
 * GET /api/branches [All authenticated] — SELECT * FROM branches, per
 * branchModel.js. Fields confirmed: branch_id, branch_name, location.
 *
 * FLAG: bloodsync.md's Blood Drive Creation section already implies a
 * branch picker exists elsewhere in the app (item #3) — if a
 * branchesApi.js (or similarly named file) already exists for that
 * feature, import from that one instead of this file, per the
 * feature-to-feature reuse rule in sessionState.md's Permanent Rules.
 * This file was added because no existing branches API file was
 * available to reference at the time this was built.
 *
 * Path: frontend/js/features/branches/branchesApi.js
 */

import { apiFetch } from '../../core/api.js';

export async function getAllBranches() {
  const res  = await apiFetch('/api/branches');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load branches.');
  return body.data;
}