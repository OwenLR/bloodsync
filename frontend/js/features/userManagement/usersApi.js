/**
 * usersApi.js — Unified user list (all roles, all statuses) + Create
 * Staff Account. Supersedes adminStaffApi.js — same file, renamed and
 * expanded since it now backs 4 of the 5 Users page tabs (All, Staff &
 * Admin, Vol/Phleb, Requestor), not just Staff/Admin.
 *
 * GET /api/users with no status query param returns every role and
 * every status in one call (userModel.js's getAllUsers has no role
 * filter, and status defaults to null → no WHERE clause) — tabs filter
 * this single result set client-side rather than making 4 separate
 * network calls.
 *
 * Path: frontend/js/features/userManagement/usersApi.js
 */

import { apiFetch } from '../../core/api.js';
import { ROLES }    from '../../constants/roles.js';

const BASE = '/api/users';

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN,     label: 'Admin' },
  { value: ROLES.PRC_STAFF, label: 'PRC Staff' },
];

// GET /api/users — no status param, returns every role/status.
// Fields: user_id, first_name, last_name, email, status, is_active,
// last_login, created_at, role_name, role_id, branch_name, branch_id
export async function getAllUsersAllStatuses() {
  const res  = await apiFetch(BASE);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load users.');
  return body.data;
}

// POST /api/users [Admin] — no password field; userService.js always
// auto-generates one and emails it via adminWelcomeEmail, ignoring any
// password sent in the body (confirmed via live test).
export async function createStaffAccount(data) {
  const res  = await apiFetch(BASE, {
    method: 'POST',
    body:   JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to create account.');
  return body.data;
}